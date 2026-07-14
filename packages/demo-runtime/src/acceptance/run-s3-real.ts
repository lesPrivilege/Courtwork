import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { basename, join } from 'node:path';
import { tmpdir } from 'node:os';
import type { RiskList } from '@courtwork/legal/schemas';
import { LEGAL_PACKAGE } from '@courtwork/legal/package';
import { admitPackages, buildPackageRegistries, type PackageRegistries } from '@courtwork/registry';
import { convertToReadingView } from '@courtwork/reading-view';
import { createPartyVerifyTool, createQccPartyVerifyAdapter, createToolExecutor } from '@courtwork/tools';
import {
  createEvidenceLedger,
  createFileConfirmationStore,
  createFileEventLog,
  createFileRevisionEventStore,
  createFileTurnStore,
  createToolRegistry,
  runScenario,
  type MaterialInput,
  type ScenarioExecutorDeps,
  type SessionEvent,
  type ToolRegistry,
} from '@courtwork/core';
import type { Provider } from '@courtwork/provider/types';
import { composeRuntimeTurnRunner, materialFromReadingView } from '../composition/demo-assembly.js';

/**
 * LEGAL-REAL 真跑通道（S3 真卷宗真跑收官）：上传真卷宗 → ReadingView → 六段组装 →
 * 真 provider → RiskList 真锚 → 引用闭环校验 → 门禁暂停。
 * 与 demo 通道物理分离：本文件不 import demo 装配点、不挂 ScriptedProvider、
 * 不挂 demo-fixture 工具适配器——防 Demo 污染由 assertNoDemoInReal 机器断言。
 */

export interface RealS3Runtime {
  tools: ToolRegistry;
  registries: PackageRegistries;
}

/** 真跑装配：party-verify 挂真实 QCC 适配器（无凭证即诚实降级 verified:false，不冒充）。 */
export function buildRealS3Runtime(qccApiKey?: string): RealS3Runtime {
  const tools = createToolRegistry();
  tools.register('party-verify', {
    tool: createPartyVerifyTool(createQccPartyVerifyAdapter(qccApiKey !== undefined ? { apiKey: qccApiKey } : undefined)),
    grade: 'A',
    sideEffect: 'pure_read',
  });
  const admission = admitPackages([LEGAL_PACKAGE]);
  if (admission.rejected.length > 0) {
    const detail = admission.rejected.map((r) => `${r.packageId}: ${r.issues.join('；')}`).join('\n');
    throw new Error(`legal 包未通过 ABI 准入：\n${detail}`);
  }
  return { tools, registries: buildPackageRegistries(admission.admitted) };
}

export interface NoDemoAuditInput {
  providerId: string;
  events: readonly SessionEvent[];
  materials: readonly MaterialInput[];
  realMaterialFileIds: readonly string[];
}

/**
 * assert-no-demo-in-real（用户点名，LEGAL-REAL 章程）：真跑模式下——
 * ① demo 装配点未挂载（provider 非 scripted）；② 证据来源非 demo-fixture；
 * ③ 材料集合恰为真卷宗文件（无 demo 素材混入）；④ 产出锚点全部指向真材料。
 * 违规返回清单（空=洁净）；真跑脚本以非零退出强制。
 */
export function assertNoDemoInReal(input: NoDemoAuditInput): string[] {
  const violations: string[] = [];
  if (input.providerId.includes('scripted') || input.providerId.includes('demo')) {
    violations.push(`provider "${input.providerId}" 是演示实现——真跑必须真 provider`);
  }
  for (const event of input.events) {
    const serialized = JSON.stringify(event);
    if (serialized.includes('demo-fixture')) {
      violations.push(`事件流第 ${event.seq} 条含 demo-fixture 来源标记`);
    }
  }
  const realSet = new Set(input.realMaterialFileIds);
  for (const material of input.materials) {
    if (!realSet.has(material.fileId)) {
      violations.push(`材料 ${material.fileId} 不在真卷宗清单内（demo 素材混入）`);
    }
  }
  for (const event of input.events) {
    if (event.type !== 'artifact_produced') continue;
    const artifact = event.artifact as RiskList | undefined;
    if (!artifact?.risks) continue;
    for (const risk of artifact.risks) {
      for (const basis of risk.basis) {
        for (const anchor of basis.sourceAnchors) {
          if (!realSet.has(anchor.fileId)) {
            violations.push(`锚点指向非真材料文件 ${anchor.fileId}（risk ${risk.id}）`);
          }
        }
      }
    }
  }
  return violations;
}

export interface RealS3RunResult {
  status: 'paused' | 'completed';
  requestId?: string;
  workDir: string;
  /** 真机证据七项载体（docs/decisions/ADR-003-evidence-and-anchors.md）。 */
  evidence: {
    materialSha256: Record<string, string>;
    promptSha256: string;
    versionTriple: { corePackage: string; legalPackage: string; legalSchemaVersion: number };
    modelEvents: { providerId: string; modelId: string };
    citationStats?: unknown;
    gatePaused: boolean;
    noDemoViolations: string[];
  };
}

/**
 * S3 真卷宗真跑：无 key 无全文——provider 缺席时在读材料之前拒跑（材料全文
 * 永不为一次不会发生的请求而离开磁盘）。
 */
export async function runS3Real(input: {
  contractPath: string;
  provider: Provider | undefined;
  qccApiKey?: string;
  workDir?: string;
}): Promise<RealS3RunResult> {
  if (!input.provider) {
    // 证据七项之「无 key 无全文」：拒跑发生在任何材料读取之前。
    throw new Error('未配置真实 provider（缺 API key）——真跑拒绝启动，材料全文未被读取');
  }
  const workDir = input.workDir ?? mkdtempSync(join(tmpdir(), 'courtwork-s3-real-'));
  const runtime = buildRealS3Runtime(input.qccApiKey);
  const scenario = runtime.registries.scenarios.get('legal.S3');
  if (!scenario) throw new Error('legal.S3 未注册');

  const bytes = new Uint8Array(readFileSync(input.contractPath));
  const fileId = basename(input.contractPath);
  const outcome = await convertToReadingView({ fileId, fileName: fileId, data: bytes });
  const material = materialFromReadingView(outcome, bytes);

  const sessionId = `real-s3-${Date.now()}`;
  const eventLog = createFileEventLog(sessionId, join(workDir, 'events.jsonl'));
  const deps: ScenarioExecutorDeps = {
    tools: runtime.tools,
    toolExecutor: createToolExecutor(),
    turnRunner: composeRuntimeTurnRunner(input.provider, createFileTurnStore(join(workDir, 'turns.jsonl'))),
    eventLog,
    confirmationStore: createFileConfirmationStore(join(workDir, 'pending')),
    revisionStore: createFileRevisionEventStore(join(workDir, 'revision-events.jsonl')),
    ledger: createEvidenceLedger(),
    artifacts: runtime.registries.artifactSchemas,
    projections: runtime.registries.projections,
  };

  const caseFile = {
    caseId: `real-${fileId}`,
    files: [{ fileId, fileName: fileId, documentType: '合同', ingestStatus: 'done' as const }],
  };

  const result = await runScenario(
    scenario,
    {
      inputArtifacts: { 'legal.CaseFile': caseFile },
      toolInputs: { 'party-verify': { name: '（真跑：以卷宗抬头主体为准）' } },
      materials: [material],
    },
    deps,
  );

  const events = eventLog.list();
  const produced = events.find((event) => event.type === 'artifact_produced');
  const citationStats = produced?.type === 'artifact_produced' ? produced.citationStats : undefined;
  // 真请求 hash 入账本（进程边界内的最后一笔：prompt 组装确定性 → hash 可复算复核）。
  const promptSha256 = createHash('sha256')
    .update(JSON.stringify({ scenario: scenario.id, material: material.sha256 }))
    .digest('hex');
  eventLog.append({ type: 'progress', message: `真请求登记 promptSha256=${promptSha256}` });

  const noDemoViolations = assertNoDemoInReal({
    providerId: input.provider.id,
    events: eventLog.list(),
    materials: [material],
    realMaterialFileIds: [fileId],
  });

  const evidence: RealS3RunResult['evidence'] = {
    materialSha256: { [fileId]: material.sha256 },
    promptSha256,
    versionTriple: {
      corePackage: '0.1.0',
      legalPackage: LEGAL_PACKAGE.identity.version,
      legalSchemaVersion: LEGAL_PACKAGE.identity.schemaVersion,
    },
    modelEvents: { providerId: input.provider.id, modelId: input.provider.modelId },
    citationStats,
    gatePaused: result.status === 'paused',
    noDemoViolations,
  };
  writeFileSync(join(workDir, 'real-run-evidence.json'), JSON.stringify(evidence, null, 2));

  return {
    status: result.status,
    requestId: result.status === 'paused' ? result.requestId : undefined,
    workDir,
    evidence,
  };
}
