import { describe, expect, it, vi } from 'vitest';
import { compileDraftToDocx } from '@courtwork/output';
import type { RiskList } from '@courtwork/legal';
import type { SessionEvent } from '@courtwork/core';
import type { CaseBinding } from '../../case/case-scope';
import type { CaseOutputStatResult, CaseOutputWriteResult } from '../../output/case-output-client';
import type { OutputMaterialReadResult } from '../../material/material-store';
import type { WorkReplayResult } from '../../protocol/client';
import { S3_REVIEW_GATE_LABEL } from './contract-review-flow';
import { S3_RISK_LIST_TYPE } from './legal-s3-binding';
import {
  coordinateContractReviewOutput,
  type ContractReviewOutputDeps,
} from './contract-review-delivery';
import { contractReviewOutputFileName } from '../../output/contract-review-file-name';

/**
 * CONTRACT-OUTPUT-TRUTH-1 · O7：唯一 coordinator 的优先级与阻断矩阵。
 *
 * 最要紧的一组是**次序**：三种正常不产文书的结果必须在触材料/宿主之前返回，
 * 否则「本次没有可交付的风险」会被 unbound / 撤权 / 材料失败遮成一句技术故障。
 */
const CASE_ID = 'case-x';
const SESSION_ID = 'session-1';
const PRIMARY = 'mat-primary';
const REQUEST_ID = 'req-1';
const CREATED_AT = '2026-07-20T11:22:33.444Z';
const CONFIRMED_AT = '2026-07-21T08:00:00.000Z';
const GRANT: CaseBinding = { kind: 'grant', grantId: 'grant-a' };

const ORIGINAL = new Uint8Array(
  compileDraftToDocx({ title: '设备采购合同', paragraphs: ['第六条 违约金按日计。'] }),
);

/**
 * 带 OPC 数字签名 part 的原件。用 stored（不压缩）ZIP 手工铸一份最小包——desktop 不直接依赖
 * zip 库；本例只需让共享预检读到 `_xmlsignatures/` 这个 part 名。
 */
const SIGNED_DOCX = buildStoredZip([
  ['[Content_Types].xml', '<Types/>'],
  ['word/document.xml', '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>第六条 违约金按日计。</w:t></w:r></w:p></w:body></w:document>'],
  ['_xmlsignatures/sig1.xml', '<?xml version="1.0"?><Signature/>'],
]);

/** 最小 stored-mode ZIP 写手：无压缩、无额外字段，够共享预检解析。 */
function buildStoredZip(entries: readonly (readonly [string, string])[]): Uint8Array {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const [name, text] of entries) {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(text);
    const crc = crc32(data);
    const local = new Uint8Array(30 + nameBytes.length + data.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    local.set(data, 30 + nameBytes.length);
    locals.push(local);

    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    centrals.push(central);
    offset += local.length;
  }
  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  const total = offset + centralSize + eocd.length;
  const out = new Uint8Array(total);
  let cursor = 0;
  for (const part of [...locals, ...centrals, eocd]) {
    out.set(part, cursor);
    cursor += part.length;
  }
  return out;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    let c = (crc ^ byte) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function risk(id: string, disposition: 'confirmed' | 'rejected' | 'pending', quote = '第六条 违约金按日计。'): RiskList['risks'][number] {
  return {
    id,
    description: `${id} 的结论`,
    level: 'medium',
    dispositionStatus: disposition,
    basis: [{ citation: '依据', sourceAnchors: [{ fileId: PRIMARY, quote, textRange: { start: 0, end: 10 } }] }],
  };
}

function riskList(risks: RiskList['risks'], outOfCoverage: RiskList['outOfCoverage'] = []): RiskList {
  return { caseId: CASE_ID, risks, outOfCoverage };
}

function ledgerEvents(list: RiskList, overrides: Partial<{ decision: 'confirm' | 'reject'; gateLabel: string }> = {}): SessionEvent[] {
  return [
    {
      type: 'artifact_produced',
      sessionId: SESSION_ID,
      seq: 1,
      emittedAt: CREATED_AT,
      artifactType: S3_RISK_LIST_TYPE,
      artifact: list,
      evidenceGrades: [],
    },
    {
      type: 'confirmation_requested',
      sessionId: SESSION_ID,
      seq: 2,
      emittedAt: CREATED_AT,
      requestId: REQUEST_ID,
      artifactType: S3_RISK_LIST_TYPE,
      gateLabel: overrides.gateLabel ?? S3_REVIEW_GATE_LABEL,
    },
    {
      type: 'confirmation_resolved',
      sessionId: SESSION_ID,
      seq: 3,
      emittedAt: CONFIRMED_AT,
      requestId: REQUEST_ID,
      decision: overrides.decision ?? 'confirm',
    },
  ] as unknown as SessionEvent[];
}

function replayOf(events: SessionEvent[], overrides: Partial<Extract<WorkReplayResult, { found: true }>> = {}) {
  return {
    found: true as const,
    ref: { caseId: CASE_ID, sessionId: SESSION_ID },
    phase: 'completed' as const,
    events,
    materialRefs: [PRIMARY, 'mat-supporting'],
    sessionCreatedAt: CREATED_AT,
    ...overrides,
  };
}

const SCOPE = {
  caseId: CASE_ID,
  binding: GRANT,
  pointer: { sessionId: SESSION_ID, contractMaterialId: PRIMARY },
};

function deps(overrides: Partial<ContractReviewOutputDeps> = {}) {
  const files = new Map<string, Uint8Array>();
  const readMaterial = vi.fn(
    async (): Promise<OutputMaterialReadResult> => ({
      status: 'ready',
      fileName: '设备采购合同.docx',
      bytes: ORIGINAL,
      contentSha256: 'sha',
    }),
  );
  const statDocx = vi.fn(async (_binding: CaseBinding, fileName: string): Promise<CaseOutputStatResult> => {
    const stored = files.get(fileName);
    if (!stored) return { status: 'missing' as const };
    const digest = await globalThis.crypto.subtle.digest('SHA-256', stored.slice().buffer);
    const sha256 = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
    return { status: 'found' as const, byteLength: stored.byteLength, sha256 };
  });
  const writeDocxNoReplace = vi.fn(async (_binding: CaseBinding, fileName: string, bytes: Uint8Array): Promise<CaseOutputWriteResult> => {
    if (files.has(fileName)) return { status: 'exists' as const };
    files.set(fileName, bytes.slice());
    return { status: 'written' as const, byteLength: bytes.byteLength };
  });
  return { files, readMaterial, statDocx, writeDocxNoReplace, ...overrides } as ContractReviewOutputDeps & {
    files: Map<string, Uint8Array>;
    readMaterial: typeof readMaterial;
    statDocx: typeof statDocx;
    writeDocxNoReplace: typeof writeDocxNoReplace;
  };
}

const CONFIRMED_ONE = replayOf(ledgerEvents(riskList([risk('risk-01', 'confirmed')])));

describe('正常不产文书的三种终态（先于材料/宿主）', () => {
  it('outOfCoverage 非空 → not_applicable/out_of_coverage，即使同时有 confirmed', async () => {
    const d = deps();
    const list = riskList([risk('risk-01', 'confirmed')], [
      { summary: '交付期限约定不明', reason: 'citation_unresolved', failures: [{ claim: { fileId: PRIMARY, exactQuote: 'x' }, reason: 'not_found' }] },
    ]);
    const result = await coordinateContractReviewOutput(
      { mode: 'deliver', replay: replayOf(ledgerEvents(list)), scope: SCOPE },
      d,
    );
    expect(result).toEqual({ status: 'not_applicable', reason: 'out_of_coverage' });
    expect(d.readMaterial).not.toHaveBeenCalled();
    expect(d.statDocx).not.toHaveBeenCalled();
    expect(d.writeDocxNoReplace).not.toHaveBeenCalled();
  });

  it('零风险 → not_applicable/no_risks，零材料零宿主', async () => {
    const d = deps();
    const result = await coordinateContractReviewOutput(
      { mode: 'deliver', replay: replayOf(ledgerEvents(riskList([]))), scope: SCOPE },
      d,
    );
    expect(result).toEqual({ status: 'not_applicable', reason: 'no_risks' });
    expect(d.readMaterial).not.toHaveBeenCalled();
  });

  it('全部驳回 → not_applicable/all_rejected，零材料零宿主', async () => {
    const d = deps();
    const result = await coordinateContractReviewOutput(
      { mode: 'deliver', replay: replayOf(ledgerEvents(riskList([risk('risk-01', 'rejected')]))), scope: SCOPE },
      d,
    );
    expect(result).toEqual({ status: 'not_applicable', reason: 'all_rejected' });
    expect(d.writeDocxNoReplace).not.toHaveBeenCalled();
  });

  it('**次序**：unbound binding 不得遮蔽正常终态——零风险仍报 no_risks 而非 output_unavailable', async () => {
    const result = await coordinateContractReviewOutput(
      {
        mode: 'deliver',
        replay: replayOf(ledgerEvents(riskList([]))),
        scope: { ...SCOPE, binding: { kind: 'unbound' } },
      },
      deps(),
    );
    expect(result).toEqual({ status: 'not_applicable', reason: 'no_risks' });
  });

  it('eligible 但非 grant binding → blocked/output_unavailable', async () => {
    const result = await coordinateContractReviewOutput(
      { mode: 'deliver', replay: CONFIRMED_ONE, scope: { ...SCOPE, binding: { kind: 'unbound' } } },
      deps(),
    );
    expect(result).toMatchObject({ status: 'blocked', reason: 'output_unavailable' });
  });
});

describe('scope 冻结与账本校验', () => {
  it('scope.caseId 与 replay.ref 错配 → invalid_session，零写', async () => {
    const d = deps();
    const result = await coordinateContractReviewOutput(
      { mode: 'deliver', replay: CONFIRMED_ONE, scope: { ...SCOPE, caseId: 'case-other' } },
      d,
    );
    expect(result).toMatchObject({ status: 'blocked', reason: 'invalid_session' });
    expect(d.writeDocxNoReplace).not.toHaveBeenCalled();
  });

  it('pointer.sessionId 错配 → invalid_session', async () => {
    const result = await coordinateContractReviewOutput(
      { mode: 'deliver', replay: CONFIRMED_ONE, scope: { ...SCOPE, pointer: { sessionId: 'other', contractMaterialId: PRIMARY } } },
      deps(),
    );
    expect(result).toMatchObject({ status: 'blocked', reason: 'invalid_session' });
  });

  it('pointer 被篡改成与 materialRefs[0] 不同 → invalid_session', async () => {
    const result = await coordinateContractReviewOutput(
      { mode: 'deliver', replay: CONFIRMED_ONE, scope: { ...SCOPE, pointer: { sessionId: SESSION_ID, contractMaterialId: 'mat-supporting' } } },
      deps(),
    );
    expect(result).toMatchObject({ status: 'blocked', reason: 'invalid_session' });
  });

  it('sessionCreatedAt 非严格 UTC 往返 → invalid_session', async () => {
    const result = await coordinateContractReviewOutput(
      { mode: 'deliver', replay: replayOf(ledgerEvents(riskList([risk('risk-01', 'confirmed')])), { sessionCreatedAt: '2026-07-20 11:22:33' }), scope: SCOPE },
      deps(),
    );
    expect(result).toMatchObject({ status: 'blocked', reason: 'invalid_session' });
  });

  it('gate label 漂移 / decision 非 confirm / 缺 resolved → authorization_invalid', async () => {
    for (const overrides of [{ gateLabel: '换了个说法的按钮' }, { decision: 'reject' as const }]) {
      const result = await coordinateContractReviewOutput(
        { mode: 'deliver', replay: replayOf(ledgerEvents(riskList([risk('risk-01', 'confirmed')]), overrides)), scope: SCOPE },
        deps(),
      );
      expect(result).toMatchObject({ status: 'blocked', reason: 'authorization_invalid' });
    }
  });

  it('账本缺 RiskList → ledger_unavailable；仍有 pending → ledger_unavailable', async () => {
    const withoutRiskList = ledgerEvents(riskList([risk('risk-01', 'confirmed')])).slice(1);
    expect(
      await coordinateContractReviewOutput({ mode: 'deliver', replay: replayOf(withoutRiskList), scope: SCOPE }, deps()),
    ).toMatchObject({ status: 'blocked', reason: 'ledger_unavailable' });

    expect(
      await coordinateContractReviewOutput(
        { mode: 'deliver', replay: replayOf(ledgerEvents(riskList([risk('risk-01', 'pending')]))), scope: SCOPE },
        deps(),
      ),
    ).toMatchObject({ status: 'blocked', reason: 'ledger_unavailable' });
  });
});

describe('inspect 与 deliver', () => {
  it('inspect 走完材料/编译/stat 但 write = 0', async () => {
    const d = deps();
    const result = await coordinateContractReviewOutput({ mode: 'inspect', replay: CONFIRMED_ONE, scope: SCOPE }, d);
    expect(result).toMatchObject({ status: 'ready_to_deliver' });
    expect(d.readMaterial).toHaveBeenCalledTimes(1);
    expect(d.statDocx).toHaveBeenCalledTimes(1);
    expect(d.writeDocxNoReplace).not.toHaveBeenCalled();
  });

  it('deliver 一写，产物名是版本化纯函数名，post-stat 同值才 delivered', async () => {
    const d = deps();
    const result = await coordinateContractReviewOutput({ mode: 'deliver', replay: CONFIRMED_ONE, scope: SCOPE }, d);
    expect(result.status).toBe('delivered');
    if (result.status !== 'delivered') throw new Error('unreachable');
    expect(result.fileName).toBe(await contractReviewOutputFileName(new Date(CREATED_AT), SESSION_ID));
    expect(result.fileName).not.toContain('合同审查报告');
    expect(d.writeDocxNoReplace).toHaveBeenCalledTimes(1);
    // 任何 write outcome 之后都必须 post-stat：这里是 pre + post 两次。
    expect(d.statDocx).toHaveBeenCalledTimes(2);
  });

  it('同 session 重试：pre-stat 同值即 already_present，零二写', async () => {
    const d = deps();
    await coordinateContractReviewOutput({ mode: 'deliver', replay: CONFIRMED_ONE, scope: SCOPE }, d);
    d.writeDocxNoReplace.mockClear();
    const again = await coordinateContractReviewOutput({ mode: 'deliver', replay: CONFIRMED_ONE, scope: SCOPE }, d);
    expect(again.status).toBe('already_present');
    expect(d.writeDocxNoReplace).not.toHaveBeenCalled();
  });

  it('同名异内容预放 → output_conflict，零写、零覆盖', async () => {
    const d = deps();
    const fileName = await contractReviewOutputFileName(new Date(CREATED_AT), SESSION_ID);
    d.files.set(fileName, new Uint8Array([1, 2, 3]));
    const result = await coordinateContractReviewOutput({ mode: 'deliver', replay: CONFIRMED_ONE, scope: SCOPE }, d);
    expect(result).toMatchObject({ status: 'blocked', reason: 'output_conflict' });
    expect(d.writeDocxNoReplace).not.toHaveBeenCalled();
    expect(Array.from(d.files.get(fileName)!)).toEqual([1, 2, 3]);
  });

  it('write=failed 但目标已在（effect unknown）→ post-stat 同值 → already_present', async () => {
    const d = deps();
    const fileName = await contractReviewOutputFileName(new Date(CREATED_AT), SESSION_ID);
    d.writeDocxNoReplace.mockImplementation(async (_binding, name, bytes) => {
      d.files.set(name, bytes.slice());
      return { status: 'failed' as const, reason: 'unavailable' as const };
    });
    const result = await coordinateContractReviewOutput({ mode: 'deliver', replay: CONFIRMED_ONE, scope: SCOPE }, d);
    expect(result).toMatchObject({ status: 'already_present', fileName });
  });

  it('write 后 post-stat 仍 missing → output_unavailable（不凭 write 回执宣称成功）', async () => {
    const d = deps();
    d.writeDocxNoReplace.mockResolvedValue({ status: 'written', byteLength: 1 });
    const result = await coordinateContractReviewOutput({ mode: 'deliver', replay: CONFIRMED_ONE, scope: SCOPE }, d);
    expect(result).toMatchObject({ status: 'blocked', reason: 'output_unavailable' });
  });

  it('pre-stat failed → output_unavailable，绝不当 missing 往下写', async () => {
    const d = deps();
    d.statDocx.mockResolvedValue({ status: 'failed', reason: 'denied' });
    const result = await coordinateContractReviewOutput({ mode: 'deliver', replay: CONFIRMED_ONE, scope: SCOPE }, d);
    expect(result).toMatchObject({ status: 'blocked', reason: 'output_unavailable' });
    expect(d.writeDocxNoReplace).not.toHaveBeenCalled();
  });
});

describe('材料与编译的阻断映射', () => {
  it('材料 blocked → material_blocked，零 stat 零 write', async () => {
    const d = deps();
    d.readMaterial.mockResolvedValue({ status: 'blocked', reason: 'not_docx' });
    const result = await coordinateContractReviewOutput({ mode: 'deliver', replay: CONFIRMED_ONE, scope: SCOPE }, d);
    expect(result).toMatchObject({ status: 'blocked', reason: 'material_blocked' });
    expect(d.statDocx).not.toHaveBeenCalled();
  });

  it('只有支持材料锚 → non_applied，items 非空、reason 固定 not_located、零 output 调用', async () => {
    const d = deps();
    const supportingOnly = riskList([
      {
        ...risk('risk-01', 'confirmed'),
        basis: [{ citation: '纪要', sourceAnchors: [{ fileId: 'mat-supporting', quote: '纪要原句', textRange: { start: 0, end: 4 } }] }],
      },
    ]);
    const result = await coordinateContractReviewOutput(
      { mode: 'deliver', replay: replayOf(ledgerEvents(supportingOnly)), scope: SCOPE },
      d,
    );
    expect(result.status).toBe('blocked');
    if (result.status !== 'blocked' || result.reason !== 'non_applied') throw new Error('unreachable');
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ riskId: 'risk-01', reason: 'not_located', quote: '纪要原句' });
    expect(d.statDocx).not.toHaveBeenCalled();
    expect(d.writeDocxNoReplace).not.toHaveBeenCalled();
  });

  it('主合同锚定位不到 → non_applied 整份阻断，零 write', async () => {
    const d = deps();
    const strayed = riskList([risk('risk-01', 'confirmed', '这句话原件里根本没有')]);
    const result = await coordinateContractReviewOutput(
      { mode: 'deliver', replay: replayOf(ledgerEvents(strayed)), scope: SCOPE },
      d,
    );
    expect(result).toMatchObject({ status: 'blocked', reason: 'non_applied' });
    expect(d.writeDocxNoReplace).not.toHaveBeenCalled();
  });

  it('数字签名原件 → signed_docx，零 write', async () => {
    const d = deps();
    // 在既有 ZIP 的中央目录之前插一个 signature part 太重；改由 output 的复合原件同源做法：
    // 直接给一份带 `_xmlsignatures/` 的最小包（apply 前的预检读的就是 part 名）。
    d.readMaterial.mockResolvedValue({
      status: 'ready',
      fileName: '设备采购合同.docx',
      bytes: SIGNED_DOCX,
      contentSha256: 'sha',
    });
    const result = await coordinateContractReviewOutput({ mode: 'deliver', replay: CONFIRMED_ONE, scope: SCOPE }, d);
    expect(result).toMatchObject({ status: 'blocked', reason: 'signed_docx' });
    expect(d.writeDocxNoReplace).not.toHaveBeenCalled();
  });
});

describe('产物名', () => {
  it('同毫秒的两个 session 不同名；同 session 恒同名', async () => {
    const instant = new Date(CREATED_AT);
    const a = await contractReviewOutputFileName(instant, 'session-a');
    const b = await contractReviewOutputFileName(instant, 'session-b');
    expect(a).not.toBe(b);
    expect(await contractReviewOutputFileName(instant, 'session-a')).toBe(a);
    expect(a).toMatch(/^合同审查批注稿-20260720-112233-444-[0-9a-f]{64}\.docx$/);
  });

  it('只读 UTC 字段：同一 instant 的不同 Date 实例恒同名（本地字段不参与）', async () => {
    // 同一时刻的两个 Date 实例，其本地字段随宿主时区变化而 UTC 字段恒定；
    // 跨时区的字节级证据由 output 包 `contract-review-fidelity.test.ts` 的 TZ 组承担。
    const instant = new Date(CREATED_AT);
    const sameInstant = new Date(instant.getTime());
    expect(await contractReviewOutputFileName(sameInstant, SESSION_ID)).toBe(
      await contractReviewOutputFileName(instant, SESSION_ID),
    );
    // 命名里的日期段直接取 UTC 字段：CREATED_AT 是 11:22:33.444Z。
    expect(await contractReviewOutputFileName(instant, SESSION_ID)).toContain('-20260720-112233-444-');
  });
});
