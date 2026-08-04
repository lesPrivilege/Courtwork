import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, realpath, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  createModels,
  fauxAssistantMessage,
  fauxProvider,
  fauxText,
  fauxToolCall,
  type Context,
  type SimpleStreamOptions,
} from '@earendil-works/pi-ai';
import { beforeEach, describe, expect, it } from 'vitest';

import { CASE_LOGICAL_ROOT } from './product-case-env.js';
import {
  decodeHostPacketLine,
  decodeSidecarPacketLine,
  encodePacketLine,
  type HostPacket,
  type ProductPacket,
} from './product-protocol.js';
import {
  PRODUCT_CAPABILITIES,
  PRODUCT_PROMPT_ID,
  createProductRuntime,
  withExplicitApiKey,
  type ProductProviderBinding,
} from './product-runtime.js';
import { createProductSidecarSession } from './product-stdio.js';
import { WORKSPACE_LOGICAL_ROOT, resolveWorkspaceLogicalPath } from './workspace-write-env.js';

/**
 * 双端 golden（`PI-WRITE-HOST-1` ⑥）。
 *
 * 两枚 tracked fixture 描述**同一枚逻辑会话**的两端字节谱，任一侧都不得生成它再验证自己：
 *
 * - `write-session-wire-v1.jsonl`：sidecar→host 段由**本侧**真跑产出，Rust 侧独立复验
 *   （自家 codec 双向唯一、`proposalHash` 本侧重算、真件落盘回读）；host→sidecar 段由
 *   **Rust 侧**产出，本文件原样喂给状态机消费。bootstrap 行不入 golden——它携带机器本地
 *   案件根与内存 key，两者都不许冻进 tracked 文件。
 * - `write-session-journal-v1.jsonl`：由 Rust 侧产出，本文件复验其中的**跨端常量**
 *   （`promptId`／`capabilities`／逻辑路径形态）。
 *
 * 跨端钉子因此在两侧合拢：`PRODUCT_PROMPT_ID`／`PRODUCT_CAPABILITIES`／提案 hash 的域串
 * 与 Rust 侧的 `CURRENT_PROMPT_ID`／`EXPECTED_CAPABILITIES`／`WORKSPACE_WRITE_PROPOSAL_DOMAIN`
 * 是同物的两份，任一侧单独漂移都会让对端的判据当场红。
 *
 * **本文件里不出现 `turn_finished` 的 token 读数与 delta 切分之外的豁免**：那两样都在
 * golden 里逐字节固定（实测三轮同字节），故本会话的正文与最终短语刻意取到一枚 chunk 之内。
 */

const WIRE_GOLDEN_PATH = new URL('../fixtures/write-session-wire-v1.jsonl', import.meta.url);
const JOURNAL_GOLDEN_PATH = new URL('../fixtures/write-session-journal-v1.jsonl', import.meta.url);

/** golden 的会话身份。写死在此、不从 golden 反推——反推等于让被测数据自证。 */
const SESSION_ID = 'sess-1';
const REQUEST_ID = 'req-1';
const CONTAINER_ID = 'cnt-1';
const PROMPT_TEXT = '写一份纪要';
const FINAL_TEXT = '好';
const PROPOSAL_DOMAIN = 'courtwork.pi.workspace_write.v1';

const CONTROL_KEY = 'sk-dummy-in-memory-key';
const MODEL_ID = 'faux-1';

let caseRoot: string;
let faux: ReturnType<typeof fauxProvider>;
let models: ReturnType<typeof createModels>;
let wireLines: Uint8Array[];
let journalLines: string[];

/** 按字节切行；末行必须以 LF 结束。 */
function splitLines(bytes: Uint8Array): Uint8Array[] {
  const lines: Uint8Array[] = [];
  let start = 0;
  for (let index = 0; index < bytes.byteLength; index += 1) {
    if (bytes[index] !== 0x0a) continue;
    lines.push(bytes.subarray(start, index));
    start = index + 1;
  }
  if (start !== bytes.byteLength) throw new Error('golden 最后一行没有以 LF 结束');
  return lines;
}

const text = (line: Uint8Array): string => Buffer.from(line).toString('utf8');

beforeEach(async () => {
  const sandbox = await realpath(await mkdtemp(path.join(tmpdir(), 'pi-write-golden-')));
  caseRoot = path.join(sandbox, '案卷');
  await mkdir(caseRoot);
  await writeFile(path.join(caseRoot, '备忘.md'), '# 备忘\n合同编号 HT-2024-081\n');

  faux = fauxProvider({ provider: 'faux', models: [{ id: MODEL_ID }] });
  models = createModels();
  models.setProvider(faux.provider);

  wireLines = splitLines(await readFile(WIRE_GOLDEN_PATH));
  journalLines = splitLines(await readFile(JOURNAL_GOLDEN_PATH)).map(text);
});

type Direction = 'inbound' | 'outbound';

/** inbound＝本侧**消费**（host→sidecar），outbound＝本侧**产出**（sidecar→host）。 */
function classify(line: Uint8Array): { direction: Direction; packet: ProductPacket } {
  const host = decodeHostPacketLine(line);
  const sidecar = decodeSidecarPacketLine(line);
  if (host.ok && sidecar.ok) throw new Error(`两个方向都解成功：${text(line)}`);
  if (host.ok) return { direction: 'inbound', packet: host.packet };
  if (sidecar.ok) return { direction: 'outbound', packet: sidecar.packet };
  throw new Error(`两个方向都解失败：${text(line)}`);
}

function goldenWriteRequest(): {
  operationId: string;
  proposalHash: string;
  logicalPath: string;
  content: string;
  contentSha256: string;
  byteLength: number;
} {
  for (const line of wireLines) {
    const { packet } = classify(line);
    if (packet.type !== 'host_request') continue;
    if (packet.payload.capability !== 'workspace_write') continue;
    return {
      operationId: packet.payload.operationId,
      proposalHash: packet.payload.proposalHash,
      ...packet.payload.arguments,
    };
  }
  throw new Error('golden 必须含一枚 workspace_write host_request');
}

/**
 * 真跑一遍 golden 描述的那枚会话：模型出恰一次 write，宿主答复直接取 golden 的
 * `host_result` **原字节**——本侧因此是真的在消费对端产出的那一行。
 */
async function replayGoldenSession(): Promise<{ emitted: Uint8Array[]; transcript: string }> {
  const request = goldenWriteRequest();
  const emitted: Uint8Array[] = [];

  const runtime = createProductRuntime({
    createProvider: ({ modelId, apiKey }): ProductProviderBinding => {
      const target = faux.getModel(modelId);
      if (!target) throw new Error(`scripted catalog 里没有 ${modelId}`);
      return {
        model: target,
        streamSimple: withExplicitApiKey(
          (currentModel, context: Context, options?: SimpleStreamOptions) =>
            models.streamSimple(currentModel, context, options),
          apiKey,
        ),
      };
    },
  });

  const inbound = wireLines.filter((line) => classify(line).direction === 'inbound');
  const hostResultLine = inbound.find((line) => classify(line).packet.type === 'host_result');
  const promptLine = inbound.find((line) => classify(line).packet.type === 'prompt');
  if (!hostResultLine || !promptLine) throw new Error('golden 必须含 prompt 与 host_result 两行');

  const session = createProductSidecarSession({
    transport: {
      write(line) {
        emitted.push(Uint8Array.from(line));
        const decoded = decodeSidecarPacketLine(line.subarray(0, line.byteLength - 1));
        if (!decoded.ok) throw new Error(`出包不合契约：${decoded.reason}`);
        if (decoded.packet.type === 'host_request') {
          queueMicrotask(() => feed(hostResultLine));
        }
      },
      exit() {
        /* golden 会话不走 shutdown 分支 */
      },
    },
    runtime,
  });
  runtime.bind(session);

  const feed = (line: Uint8Array) => {
    const withLf = new Uint8Array(line.byteLength + 1);
    withLf.set(line);
    withLf[line.byteLength] = 0x0a;
    session.receive(withLf);
  };
  const send = (packet: HostPacket) => {
    const encoded = encodePacketLine(packet);
    if (!encoded.ok) throw new Error(`入包不合契约：${encoded.reason}`);
    session.receive(encoded.line);
  };

  faux.setResponses([
    fauxAssistantMessage([fauxToolCall('write', { path: request.logicalPath, content: request.content })], {
      stopReason: 'toolUse',
    }),
    fauxAssistantMessage([fauxText(FINAL_TEXT)]),
  ]);

  // bootstrap 不入 golden（携带机器本地案件根与内存 key），故在此本地构造。
  send({
    protocolVersion: 1,
    seq: 1,
    sessionId: SESSION_ID,
    requestId: null,
    type: 'bootstrap',
    payload: {
      containerId: CONTAINER_ID,
      grantId: 'grant-1',
      caseRoot,
      provider: { id: 'deepseek', modelId: MODEL_ID, apiKey: CONTROL_KEY },
      limits: { maxTurns: 12, maxUsd: null },
      resume: { kind: 'fresh', leg: 1, priorObservedTurns: 0, priorTurns: 0, priorUsd: 0 },
    },
  });
  feed(promptLine);
  await runtime.settled();

  return { emitted, transcript: JSON.stringify(runtime.messages()) };
}

describe('write-session-v1 双端 golden', () => {
  it('文件卫生：无 BOM / CR / 空行 / 重复行，且每行恰一个方向解得开并 canonical 往返', () => {
    const bytes = Buffer.concat(wireLines.map((line) => Buffer.from(line)));
    expect(bytes[0]).not.toBe(0xef);
    expect(bytes.includes(0x0d)).toBe(false);
    const texts = wireLines.map(text);
    expect(new Set(texts).size).toBe(texts.length);
    for (const line of wireLines) {
      expect(line.byteLength).toBeGreaterThan(0);
      const { packet } = classify(line);
      const encoded = encodePacketLine(packet);
      expect(encoded.ok).toBe(true);
      if (!encoded.ok) return;
      const expected = Buffer.concat([Buffer.from(line), Buffer.from([0x0a])]);
      expect(Buffer.compare(Buffer.from(encoded.line), expected)).toBe(0);
    }
  });

  it('本侧产出的每一枚 sidecar→host 帧与 golden 逐字节相同', async () => {
    const { emitted } = await replayGoldenSession();
    const expectedOutbound = wireLines.filter((line) => classify(line).direction === 'outbound');
    expect(emitted.map((line) => text(line.subarray(0, line.byteLength - 1)))).toEqual(
      expectedOutbound.map(text),
    );
    // 末字节必须是 LF：framing 也在 golden 的判据里。
    for (const line of emitted) expect(line[line.byteLength - 1]).toBe(0x0a);
  });

  it('proposalHash：按 ADR-022 六-B.2 在本文件独立重算，逐值等于 golden', () => {
    const request = goldenWriteRequest();
    const frame = (value: string): Buffer => {
      const body = Buffer.from(value, 'utf8');
      const header = Buffer.alloc(4);
      header.writeUInt32BE(body.byteLength, 0);
      return Buffer.concat([header, body]);
    };
    const recomputed = createHash('sha256')
      .update(
        Buffer.concat(
          [
            PROPOSAL_DOMAIN,
            SESSION_ID,
            REQUEST_ID,
            request.operationId,
            request.logicalPath,
            String(request.byteLength),
            request.contentSha256,
          ].map(frame),
        ),
      )
      .digest('hex');
    expect(request.proposalHash).toBe(recomputed);
    expect(request.contentSha256).toBe(createHash('sha256').update(request.content, 'utf8').digest('hex'));
    expect(request.byteLength).toBe(Buffer.byteLength(request.content, 'utf8'));
  });

  it('跨端常量：journal golden 的 promptId / capabilities 就是本侧在跑的那两样', () => {
    const started = journalLines.filter((line) => line.includes('"type":"session_started"'));
    expect(started).toHaveLength(1);
    const payload = JSON.parse(started[0]) as {
      payload: { promptId: string; capabilities: string[]; caseRoot: string };
    };
    expect(payload.payload.promptId).toBe(PRODUCT_PROMPT_ID);
    expect(payload.payload.capabilities).toEqual([...PRODUCT_CAPABILITIES]);
    expect(payload.payload.caseRoot).toBe(CASE_LOGICAL_ROOT);
  });

  it('journal golden 的四段账序在场，逻辑路径与 wire 上的那一枚同源且是裸路径', () => {
    expect(journalLines.map((line) => (JSON.parse(line) as { type: string }).type)).toEqual([
      'session_started',
      'tool_proposed',
      'authorization_decided',
      'effect_started',
      'effect_succeeded',
    ]);
    const request = goldenWriteRequest();
    for (const line of journalLines.slice(1)) {
      const record = JSON.parse(line) as { payload: { logicalPath?: string } };
      if (record.payload.logicalPath === undefined) continue;
      expect(record.payload.logicalPath).toBe(request.logicalPath);
    }
    expect(request.logicalPath.startsWith('/')).toBe(false);
  });

  it('双根：模型看到 /case 与 /workspace 两个逻辑根，wire 与 journal 上恒是裸路径', async () => {
    const request = goldenWriteRequest();
    // 逻辑根 → 裸路径的映射在两端同源。
    const resolved = resolveWorkspaceLogicalPath(request.logicalPath);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.virtualPath).toBe(`${WORKSPACE_LOGICAL_ROOT}/${request.logicalPath}`);
    expect(resolved.logicalPath).toBe(request.logicalPath);
    // 反向：带 /case 前缀的同名路径不是 workspace 目标。
    expect(resolveWorkspaceLogicalPath(`${CASE_LOGICAL_ROOT}/${request.logicalPath}`).ok).toBe(false);

    // 两枚 golden 的**每一行**都不许出现根前缀（模型可见的展示路径不上 wire、不进 journal）。
    for (const line of [...wireLines.map(text), ...journalLines]) {
      expect(line.includes(`${CASE_LOGICAL_ROOT}/`), line).toBe(false);
      // 唯一例外是模型自己说的那句话：它是**模型输出**，不是路径字段。
      const inAssistantText = line.includes('assistant_text_delta');
      expect(line.includes(`${WORKSPACE_LOGICAL_ROOT}/`) && !inAssistantText, line).toBe(false);
    }

    // 真跑一遍读＋写：模型侧看到的恰是两个逻辑根，物理案件根一次都不出现。
    faux.setResponses([
      // 取 glob 并**显式给 `/case` 起点**：本枚只看模型可见的投影面，故刻意把范围限在
      // Node 直读那一根——不给起点会连 `/workspace` 一起检索，那要真宿主答 `list`
      // （`PI-WORKSPACE-READ-1`），而本枚的 transport 是空实现。
      fauxAssistantMessage([fauxToolCall('glob', { pattern: '**/*.md', path: CASE_LOGICAL_ROOT })], { stopReason: 'toolUse' }),
      fauxAssistantMessage([fauxText(`已写入 ${WORKSPACE_LOGICAL_ROOT}/${request.logicalPath}。`)]),
    ]);
    const runtime = createProductRuntime({
      createProvider: ({ modelId, apiKey }): ProductProviderBinding => {
        const target = faux.getModel(modelId);
        if (!target) throw new Error('no model');
        return {
          model: target,
          streamSimple: withExplicitApiKey(
            (currentModel, context: Context, options?: SimpleStreamOptions) =>
              models.streamSimple(currentModel, context, options),
            apiKey,
          ),
        };
      },
    });
    const session = createProductSidecarSession({
      transport: {
        write() {
          /* 本枚只看模型可见面 */
        },
        exit() {
          /* 同上 */
        },
      },
      runtime,
    });
    runtime.bind(session);
    const send = (packet: HostPacket) => {
      const encoded = encodePacketLine(packet);
      if (!encoded.ok) throw new Error(encoded.reason);
      session.receive(encoded.line);
    };
    send({
      protocolVersion: 1,
      seq: 1,
      sessionId: SESSION_ID,
      requestId: null,
      type: 'bootstrap',
      payload: {
        containerId: CONTAINER_ID,
        grantId: 'grant-1',
        caseRoot,
        provider: { id: 'deepseek', modelId: MODEL_ID, apiKey: CONTROL_KEY },
        limits: { maxTurns: 12, maxUsd: null },
        resume: { kind: 'fresh', leg: 1, priorObservedTurns: 0, priorTurns: 0, priorUsd: 0 },
      },
    });
    send({
      protocolVersion: 1,
      seq: 2,
      sessionId: SESSION_ID,
      requestId: REQUEST_ID,
      type: 'prompt',
      payload: { text: PROMPT_TEXT },
    });
    await runtime.settled();
    const transcript = JSON.stringify(runtime.messages());
    expect(transcript).toContain(`${CASE_LOGICAL_ROOT}/备忘.md`);
    expect(transcript).toContain(`${WORKSPACE_LOGICAL_ROOT}/${request.logicalPath}`);
    expect(transcript).not.toContain(caseRoot);
  });
});
