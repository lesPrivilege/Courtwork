/**
 * `PI-WRITE-PROOF-1` 定向证据（ADR-022 决定六 / 能力阶梯 A0.5）。
 *
 * 本组只证 **package/headless** 事实，不证产品底座：没有 Rust host、没有 journal、
 * 没有逐次授权账本。凡「上游怎么表现」的断言都标为 characterization——它们锁的是
 * `@earendil-works/pi-agent-core@0.82.1` 的**现状**，升版触红即须回 ADR-022 决定五复核。
 *
 * 落 fs 的 host 适配器只活在本文件（`.test.` 被 ADR-018 门 R3 的 pi-lane 扫描面跳过），
 * 不进生产，也不代表产品写面已放行。
 */

import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { Agent, createWriteTool } from '@earendil-works/pi-agent-core';
import {
  createModels,
  fauxAssistantMessage,
  fauxProvider,
  fauxText,
  fauxToolCall,
  validateToolArguments,
  type Model,
  type MutableModels,
  type ToolCall,
} from '@earendil-works/pi-ai';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  bindWorkspaceWriteTool,
  createWorkspaceWriteEnv,
  gateWorkspaceWrite,
  MAX_WORKSPACE_CONTENT_BYTES,
  resolveWorkspaceLogicalPath,
  WORKSPACE_WRITE_PROPOSAL_DOMAIN,
  type WorkspaceWritePort,
  type WorkspaceWritePortOutcome,
  type WorkspaceWriteRegistry,
  type WorkspaceWriteRequest,
  type WorkspaceWriteTool,
} from './workspace-write-env.js';

const SESSION_ID = 'ses_proof_1';
const REQUEST_ID = 'req_proof_1';

// ---------------------------------------------------------------------------
// 测试替身
// ---------------------------------------------------------------------------

interface RecordingPort extends WorkspaceWritePort {
  readonly requests: WorkspaceWriteRequest[];
  /** 单条有序轨迹：`enter:<path>` / `exit:<path>`。交错与否只能由它判定。 */
  readonly trace: string[];
}

function recordingPort(
  handler: (request: WorkspaceWriteRequest) => Promise<WorkspaceWritePortOutcome> | WorkspaceWritePortOutcome = () => ({
    status: 'ok',
  }),
): RecordingPort {
  const requests: WorkspaceWriteRequest[] = [];
  const trace: string[] = [];
  return {
    requests,
    trace,
    async write(request) {
      requests.push(request);
      trace.push(`enter:${request.logicalPath}`);
      try {
        return await handler(request);
      } finally {
        trace.push(`exit:${request.logicalPath}`);
      }
    },
  };
}

interface SeededRegistry extends WorkspaceWriteRegistry {
  readonly allocations: string[];
  seed(rawToolCallId: string, publicToolCallId: string): void;
}

/**
 * 预种 registry：public tc 的首分配属于未来 product event projector
 * （上游 `tool_execution_start` 早于 validate/`beforeToolCall`/execute），
 * 本票只查表，查不到即拒。op 只在真发 host request 时铸。
 */
function seededRegistry(seed: Record<string, string> = {}): SeededRegistry {
  const mapping = new Map(Object.entries(seed));
  const allocations: string[] = [];
  return {
    allocations,
    seed(rawToolCallId, publicToolCallId) {
      mapping.set(rawToolCallId, publicToolCallId);
    },
    publicToolCallId: (rawToolCallId) => mapping.get(rawToolCallId),
    allocateOperationId(publicToolCallId) {
      const operationId = `op_1_${allocations.length + 1}`;
      allocations.push(`${publicToolCallId}→${operationId}`);
      return operationId;
    },
  };
}

interface CallOutcome {
  readonly ok: boolean;
  readonly text: string;
}

/**
 * 复刻 `agent-loop.js` 的 `prepareToolCall` 调用序：
 * `prepareArguments`（raw）→ `validateToolArguments`（上游 coercion）→ `execute`。
 * 中段直接调上游那一份 `validateToolArguments`，不自写校验；调用序另有真 Agent 组复核。
 */
async function callAsLoop(
  tool: WorkspaceWriteTool,
  rawToolCallId: string,
  rawArguments: unknown,
  signal?: AbortSignal,
): Promise<CallOutcome> {
  try {
    const prepared = tool.prepareArguments ? tool.prepareArguments(rawArguments) : rawArguments;
    const validated = validateToolArguments(tool, asToolCall(tool.name, prepared, rawToolCallId));
    const result = await tool.execute(rawToolCallId, validated, signal, undefined);
    return { ok: true, text: result.content.map((part) => ('text' in part ? part.text : '')).join('') };
  } catch (error) {
    return { ok: false, text: error instanceof Error ? error.message : String(error) };
  }
}

const bind = (port: WorkspaceWritePort, registry: WorkspaceWriteRegistry): WorkspaceWriteTool =>
  bindWorkspaceWriteTool({ sessionId: SESSION_ID, requestId: REQUEST_ID, registry, port });

/** `validateToolArguments` 要一枚完整 `ToolCall`；raw arguments 刻意保持 unknown 以便喂反例。 */
const asToolCall = (name: string, args: unknown, id = 'raw_probe'): ToolCall => ({
  type: 'toolCall',
  id,
  name,
  arguments: args as Record<string, unknown>,
});

/** 独立重算：production 走 `crypto.subtle`，本文件走 `node:crypto`，避免同源假绿。 */
const sha256Hex = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

function frame(value: string): Uint8Array {
  const body = new TextEncoder().encode(value);
  const framed = new Uint8Array(4 + body.byteLength);
  new DataView(framed.buffer).setUint32(0, body.byteLength, false);
  framed.set(body, 4);
  return framed;
}

function expectedProposalHash(request: Omit<WorkspaceWriteRequest, 'proposalHash' | 'content'>): string {
  const parts = [
    WORKSPACE_WRITE_PROPOSAL_DOMAIN,
    request.sessionId,
    request.requestId,
    request.operationId,
    request.logicalPath,
    String(request.byteLength),
    request.contentSha256,
  ].map(frame);
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const joined = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    joined.set(part, offset);
    offset += part.byteLength;
  }
  return sha256Hex(joined);
}

const utf8 = (value: string): Uint8Array => new TextEncoder().encode(value);

// ---------------------------------------------------------------------------
// 一 · 上游 characterization（0.82.1，不 fork）
// ---------------------------------------------------------------------------

describe('上游 characterization：createWriteTool 的现状', () => {
  it('参数表面只有 {path,content}，但 TypeBox object 非闭集——额外字段照过', () => {
    const upstream = createWriteTool();
    expect(Object.keys(upstream.parameters.properties)).toEqual(['path', 'content']);
    const validated = validateToolArguments(
      upstream,
      asToolCall('write', { path: 'a.md', content: 'x', mode: 'append' }),
    );
    expect(validated).toEqual({ path: 'a.md', content: 'x', mode: 'append' });
  });

  it('validator 真做 primitive→string coercion，连 null 都被写成字符串 "null"', () => {
    const upstream = createWriteTool();
    const coerce = (args: unknown) => validateToolArguments(upstream, asToolCall('write', args));
    expect(coerce({ path: 'a.md', content: 123 })).toEqual({ path: 'a.md', content: '123' });
    expect(coerce({ path: 'a.md', content: true })).toEqual({ path: 'a.md', content: 'true' });
    expect(coerce({ path: 'a.md', content: null })).toEqual({ path: 'a.md', content: 'null' });
    expect(coerce({ path: 7, content: 'x' })).toEqual({ path: '7', content: 'x' });
    // 空串同样过——「参数看起来只有两项」不等于 strict schema。
    expect(coerce({ path: '', content: '' })).toEqual({ path: '', content: '' });
  });

  it('两次实例化共用同一 parameters 对象；binder 必须保留该同一性（validator 缓存按 schema 身份）', () => {
    expect(createWriteTool().parameters).toBe(createWriteTool().parameters);
    const tool = bind(recordingPort(), seededRegistry());
    expect(tool.parameters).toBe(createWriteTool().parameters);
  });

  it('binder 保留上游 name/label/description，且上游自身不声明 executionMode', () => {
    const upstream = createWriteTool();
    expect(upstream.executionMode).toBeUndefined();
    const tool = bind(recordingPort(), seededRegistry());
    expect(tool.name).toBe(upstream.name);
    expect(tool.label).toBe(upstream.label);
    expect(tool.description).toBe(upstream.description);
    // 上游描述自称「自动创建父目录」——那只是 `ExecutionEnv.writeFile` 的契约，
    // 上游代码本身零 mkdir；父目录由 host 兑现。
    expect(upstream.description).toContain('Automatically creates parent directories');
  });

  it('binder 固定 executionMode:sequential；Agent 缺省仍是 parallel（双锁须分别声明）', () => {
    const tool = bind(recordingPort(), seededRegistry());
    expect(tool.executionMode).toBe('sequential');

    const faux = fauxProvider({ provider: 'faux', models: [{ id: 'faux-1' }] });
    const models = createModels();
    models.setProvider(faux.provider);
    const relaxed = new Agent({
      streamFn: (target, context, options) => models.streamSimple(target, context, options),
      initialState: { systemPrompt: '', model: faux.getModel(), tools: [] },
    });
    expect(relaxed.toolExecution).toBe('parallel');
    const locked = new Agent({
      streamFn: (target, context, options) => models.streamSimple(target, context, options),
      toolExecution: 'sequential',
      initialState: { systemPrompt: '', model: faux.getModel(), tools: [] },
    });
    expect(locked.toolExecution).toBe('sequential');
  });

  it('成功文案的 bytes 是 UTF-16 code units；产品事实只能从原 content 独立算 UTF-8', async () => {
    const port = recordingPort();
    const tool = bind(port, seededRegistry({ raw_1: 'tc_1_1' }));
    const content = '备忘😀';

    const outcome = await callAsLoop(tool, 'raw_1', { path: '备忘.md', content });

    expect(outcome.ok).toBe(true);
    // 上游 bug 如实锁住：4 个 UTF-16 code unit 被称作 4 bytes。
    expect(content.length).toBe(4);
    expect(outcome.text).toContain('4 bytes');
    // 真源：UTF-8 实长 10，hash 从原 content 独立算。
    expect(port.requests[0].byteLength).toBe(10);
    expect(port.requests[0].contentSha256).toBe(sha256Hex(utf8(content)));
    expect(outcome.text).not.toContain('10 bytes');
  });
});

// ---------------------------------------------------------------------------
// 二 · raw exact-key/type gate（必须早于上游 coercion）
// ---------------------------------------------------------------------------

describe('raw gate 在上游 coercion 之前拒绝', () => {
  const rejected: [string, unknown][] = [
    ['额外字段', { path: 'a.md', content: 'x', mode: 'append' }],
    ['缺 content', { path: 'a.md' }],
    ['缺 path', { content: 'x' }],
    ['content 非 string（number）', { path: 'a.md', content: 1 }],
    ['content 非 string（null）', { path: 'a.md', content: null }],
    ['content 非 string（boolean）', { path: 'a.md', content: false }],
    ['path 非 string（number）', { path: 7, content: 'x' }],
    ['arguments 非 object', 'a.md'],
    ['arguments 为 null', null],
    ['arguments 为 array', [{ path: 'a.md', content: 'x' }]],
    ['raw leading @（上游会静默改写目标）', { path: '@a.md', content: 'x' }],
    ['NBSP alias（上游会折叠成普通空格）', { path: '备\u00A0忘.md', content: 'x' }],
    ['U+2009 alias', { path: '备\u2009忘.md', content: 'x' }],
    ['U+3000 alias', { path: '备\u3000忘.md', content: 'x' }],
  ];

  it.each(rejected)('%s → 拒绝，port 零调用、op 零分配', async (_label, rawArguments) => {
    const port = recordingPort();
    const registry = seededRegistry({ raw_1: 'tc_1_1' });
    const tool = bind(port, registry);

    const outcome = await callAsLoop(tool, 'raw_1', rawArguments);

    expect(outcome.ok).toBe(false);
    expect(port.requests).toHaveLength(0);
    expect(registry.allocations).toHaveLength(0);
  });

  it('对照：不设 gate 时上游确实会吃掉 alias——`@a.md` 被改写成 `a.md`', async () => {
    const port = recordingPort();
    const registry = seededRegistry({ raw_1: 'tc_1_1' });
    const env = createWorkspaceWriteEnv({
      sessionId: SESSION_ID,
      requestId: REQUEST_ID,
      publicToolCallId: 'tc_1_1',
      registry,
      port,
    });
    // 绕开 binder 直调上游：这正是没有 raw gate 时会发生的事。
    await createWriteTool().execute('raw_1', { path: '@a.md', content: 'x' }, undefined, undefined, { env });
    expect(port.requests[0].logicalPath).toBe('a.md');
  });

  it('通过时 prepareArguments 原样返回同一对象，不改写模型给的参数', () => {
    const tool = bind(recordingPort(), seededRegistry());
    const raw = { path: 'a.md', content: 'x' };
    expect(tool.prepareArguments?.(raw)).toBe(raw);
  });
});

// ---------------------------------------------------------------------------
// 三 · tc 映射缺失即拒
// ---------------------------------------------------------------------------

describe('public toolCall 映射', () => {
  it('raw toolCallId 未预种 → 拒绝，port 零调用、op 零分配', async () => {
    const port = recordingPort();
    const registry = seededRegistry({ raw_1: 'tc_1_1' });
    const tool = bind(port, registry);

    const outcome = await callAsLoop(tool, 'raw_unknown', { path: 'a.md', content: 'x' });

    expect(outcome.ok).toBe(false);
    expect(port.requests).toHaveLength(0);
    expect(registry.allocations).toHaveLength(0);
  });

  it('binder 不预分配 tc/op：只有真发 port 时才铸一枚 op', async () => {
    const port = recordingPort();
    const registry = seededRegistry({ raw_1: 'tc_1_1' });
    const tool = bind(port, registry);

    await callAsLoop(tool, 'raw_1', { path: 'a.md', content: 'x' });

    expect(registry.allocations).toEqual(['tc_1_1→op_1_1']);
    expect(port.requests[0].operationId).toBe('op_1_1');
  });
});

// ---------------------------------------------------------------------------
// 四 · 路径 grammar（ADR-022 六-B.2）
// ---------------------------------------------------------------------------

describe('workspace 逻辑路径 grammar', () => {
  it.each([
    ['brief.md', 'brief.md'],
    ['notes/会议纪要.md', 'notes/会议纪要.md'],
    ['/workspace/brief.md', 'brief.md'],
    ['/workspace/notes/会议纪要.md', 'notes/会议纪要.md'],
    ['a/b/c/d.md', 'a/b/c/d.md'],
  ])('正例 %s → logicalPath %s', (input, logicalPath) => {
    const resolved = resolveWorkspaceLogicalPath(input);
    expect(resolved.ok && resolved.logicalPath).toBe(logicalPath);
    expect(resolved.ok && resolved.virtualPath).toBe(`/workspace/${logicalPath}`);
  });

  it('相对形与虚拟绝对形归一到同一 logicalPath', () => {
    const relative = resolveWorkspaceLogicalPath('notes/会议纪要.md');
    const absolute = resolveWorkspaceLogicalPath('/workspace/notes/会议纪要.md');
    expect(relative.ok && absolute.ok && relative.logicalPath === absolute.logicalPath).toBe(true);
  });

  it.each([
    ['空串', ''],
    ['纯空白', '   '],
    ['/workspace 根本身', '/workspace'],
    ['/workspace 根带斜杠', '/workspace/'],
    ['/case 绝对路径', '/case/备忘.md'],
    ['其他绝对路径', '/etc/passwd.md'],
    ['上跳', '../外面.md'],
    ['内嵌上跳', 'notes/../../外面.md'],
    ['当前目录段', './a.md'],
    ['空段', 'a//b.md'],
    ['尾斜杠', 'notes/'],
    ['backslash', 'notes\\会议.md'],
    ['Windows drive', 'C:/notes/a.md'],
    ['UNC', '\\\\server\\share\\a.md'],
    ['控制字符', 'a\u0001b.md'],
    ['NUL', 'a\u0000b.md'],
    ['DEL', 'a\u007Fb.md'],
    ['冒号', 'a:b.md'],
    ['星号', 'a*b.md'],
    ['问号', 'a?b.md'],
    ['尖括号', 'a<b>.md'],
    ['竖线', 'a|b.md'],
    ['双引号', 'a"b.md'],
    ['段尾空格', 'a /b.md'],
    ['段尾点', 'a./b.md'],
    ['Windows 保留名 CON', 'CON.md'],
    ['Windows 保留名小写 nul', 'nul.md'],
    ['Windows 保留名 COM1', 'com1.md'],
    ['Windows 保留名 LPT9 裸名', 'LPT9'],
    ['单段超 255 bytes', `${'ä'.repeat(128)}.md`],
    ['总长超 1024 bytes', `${Array.from({ length: 40 }, (_, i) => `目录${i}${'x'.repeat(20)}`).join('/')}/a.md`],
  ])('反例 %s → invalid_path', (_label, input) => {
    const resolved = resolveWorkspaceLogicalPath(input);
    expect(resolved.ok).toBe(false);
    expect(resolved.ok === false && resolved.code).toBe('invalid_path');
  });

  it('单段恰好 255 bytes 与总长恰好 1024 bytes 均通过（边界不误杀）', () => {
    const segment = `${'a'.repeat(252)}.md`;
    expect(utf8(segment).byteLength).toBe(255);
    expect(resolveWorkspaceLogicalPath(segment).ok).toBe(true);

    const directories = Array.from({ length: 4 }, () => 'd'.repeat(254)).join('/');
    const tail = `${'t'.repeat(1024 - directories.length - 1 - 3)}.md`;
    const full = `${directories}/${tail}`;
    expect(utf8(full).byteLength).toBe(1024);
    expect(resolveWorkspaceLogicalPath(full).ok).toBe(true);
  });

  it('路径反例一律 port 零调用、op 零分配', async () => {
    const port = recordingPort();
    const registry = seededRegistry({ raw_1: 'tc_1_1' });
    const tool = bind(port, registry);

    for (const bad of ['/case/备忘.md', '../外面.md', '/workspace', 'notes/', 'CON.md']) {
      const outcome = await callAsLoop(tool, 'raw_1', { path: bad, content: 'x' });
      expect(outcome.ok).toBe(false);
    }
    expect(port.requests).toHaveLength(0);
    expect(registry.allocations).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 五 · 最终 basename 只收 .md
// ---------------------------------------------------------------------------

describe('最终 basename 按 ASCII 大小写不敏感只允许 .md', () => {
  it.each(['brief.md', 'brief.MD', 'brief.Md', 'notes/会议纪要.mD'])('%s 通过', async (input) => {
    const gate = await gateWorkspaceWrite(input, 'x');
    expect(gate.ok).toBe(true);
  });

  it.each(['.md', 'brief.txt', 'brief', 'brief.md.txt', 'brief.markdown', '备忘.ｍｄ'])(
    '%s → unsupported_file_type',
    async (input) => {
      const gate = await gateWorkspaceWrite(input, 'x');
      expect(gate.ok).toBe(false);
      expect(gate.ok === false && gate.code).toBe('unsupported_file_type');
    },
  );

  it('非 .md → port 零调用、op 零分配（拒绝发生在分配 operation 之前）', async () => {
    const port = recordingPort();
    const registry = seededRegistry({ raw_1: 'tc_1_1' });
    const tool = bind(port, registry);

    const outcome = await callAsLoop(tool, 'raw_1', { path: 'notes/纪要.txt', content: 'x' });

    expect(outcome.ok).toBe(false);
    expect(port.requests).toHaveLength(0);
    expect(registry.allocations).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 六 · content 容量与良构
// ---------------------------------------------------------------------------

describe('content 门', () => {
  it('恰好 131072 UTF-8 bytes 通过，131073 拒绝', async () => {
    const exact = 'a'.repeat(MAX_WORKSPACE_CONTENT_BYTES);
    expect(utf8(exact).byteLength).toBe(131_072);
    expect((await gateWorkspaceWrite('a.md', exact)).ok).toBe(true);

    const over = `${exact}a`;
    const gate = await gateWorkspaceWrite('a.md', over);
    expect(gate.ok).toBe(false);
    expect(gate.ok === false && gate.code).toBe('limit_exceeded');
  });

  it('按 UTF-8 实长而非 UTF-16 长度计量：32768 个四字节 emoji 恰好压线', async () => {
    const emoji = '😀'.repeat(32_768);
    expect(emoji.length).toBe(65_536);
    expect(utf8(emoji).byteLength).toBe(131_072);
    expect((await gateWorkspaceWrite('a.md', emoji)).ok).toBe(true);
    expect((await gateWorkspaceWrite('a.md', `${emoji}a`)).ok).toBe(false);
  });

  it('lone surrogate 与裸 NUL 拒绝——hash/byteLength 必须在良构门之后算', async () => {
    for (const bad of ['\uD800', 'a\uDC00b', 'a\u0000b']) {
      const gate = await gateWorkspaceWrite('a.md', bad);
      expect(gate.ok).toBe(false);
      expect(gate.ok === false && gate.code).toBe('invalid_content');
    }
  });

  it('空 content 允许（覆盖式写空文件是合法工作稿动作）', async () => {
    const gate = await gateWorkspaceWrite('a.md', '');
    expect(gate.ok).toBe(true);
    expect(gate.ok && gate.proposal.byteLength).toBe(0);
  });

  it('raw cap 以内的最坏 JSON 转义不撞破 1 MiB framing', () => {
    // 权威 envelope 属 PI-CODE-STDIO-1；此处只锁「raw cap 内不可能编码越限」这条界。
    for (const filler of ['\u0001', '"', '\\']) {
      const content = filler.repeat(MAX_WORKSPACE_CONTENT_BYTES);
      expect(utf8(content).byteLength).toBe(MAX_WORKSPACE_CONTENT_BYTES);
      const packet = {
        protocolVersion: 1,
        seq: 1,
        sessionId: SESSION_ID,
        requestId: REQUEST_ID,
        type: 'host_request',
        operationId: 'op_1_1',
        capability: 'workspace_write',
        proposalHash: 'f'.repeat(64),
        arguments: {
          logicalPath: 'notes/会议纪要.md',
          content,
          contentSha256: 'f'.repeat(64),
          byteLength: MAX_WORKSPACE_CONTENT_BYTES,
        },
      };
      const line = utf8(`${JSON.stringify(packet)}\n`).byteLength;
      expect(line).toBeLessThanOrEqual(1_048_576);
    }
  });
});

// ---------------------------------------------------------------------------
// 七 · port request 精确形状与 proposal hash
// ---------------------------------------------------------------------------

describe('port request', () => {
  it('恰为八字段，且 hash/byteLength 与独立重算一致', async () => {
    const port = recordingPort();
    const tool = bind(port, seededRegistry({ raw_1: 'tc_1_1' }));
    const content = '# 摘要\n合同编号 HT-2024-081\n';

    await callAsLoop(tool, 'raw_1', { path: '/workspace/notes/摘要.md', content });

    const request = port.requests[0];
    expect(Object.keys(request).sort()).toEqual(
      [
        'byteLength',
        'content',
        'contentSha256',
        'logicalPath',
        'operationId',
        'proposalHash',
        'requestId',
        'sessionId',
      ].sort(),
    );
    expect(request.sessionId).toBe(SESSION_ID);
    expect(request.requestId).toBe(REQUEST_ID);
    expect(request.logicalPath).toBe('notes/摘要.md');
    expect(request.content).toBe(content);
    expect(request.byteLength).toBe(utf8(content).byteLength);
    expect(request.contentSha256).toBe(sha256Hex(utf8(content)));
    expect(request.contentSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(request.proposalHash).toBe(expectedProposalHash(request));
    expect(request.proposalHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('proposal hash 绑定 operationId：同内容同路径的两次 operation hash 不同', async () => {
    const port = recordingPort();
    const tool = bind(port, seededRegistry({ raw_1: 'tc_1_1', raw_2: 'tc_1_2' }));

    await callAsLoop(tool, 'raw_1', { path: 'a.md', content: 'same' });
    await callAsLoop(tool, 'raw_2', { path: 'a.md', content: 'same' });

    expect(port.requests[0].contentSha256).toBe(port.requests[1].contentSha256);
    expect(port.requests[0].operationId).not.toBe(port.requests[1].operationId);
    expect(port.requests[0].proposalHash).not.toBe(port.requests[1].proposalHash);
  });

  it('port 非 ok 时工具报错，但 pi 的 FileError 闭集表达不出我方 outcome 分型', async () => {
    for (const outcome of [
      { status: 'denied', code: 'user_denied', message: '用户拒绝' },
      { status: 'failed', code: 'io', message: '写盘失败' },
      { status: 'uncertain', code: 'durability_unknown', message: '屏障未确认' },
    ] as const) {
      const port = recordingPort(() => outcome);
      const tool = bind(port, seededRegistry({ raw_1: 'tc_1_1' }));
      const result = await callAsLoop(tool, 'raw_1', { path: 'a.md', content: 'x' });
      expect(result.ok).toBe(false);
      expect(port.requests).toHaveLength(1);
    }
  });
});

// ---------------------------------------------------------------------------
// 八 · env 只开写面
// ---------------------------------------------------------------------------

describe('write 专用虚拟 env', () => {
  const env = () =>
    createWorkspaceWriteEnv({
      sessionId: SESSION_ID,
      requestId: REQUEST_ID,
      publicToolCallId: 'tc_1_1',
      registry: seededRegistry(),
      port: recordingPort(),
    });

  it('cwd 固定 /workspace，canonicalPath 固定 not_supported', async () => {
    const target = env();
    expect(target.cwd).toBe('/workspace');
    const canonical = await target.canonicalPath('/workspace/a.md');
    expect(canonical.ok).toBe(false);
    expect(canonical.ok === false && canonical.error.code).toBe('not_supported');
  });

  it('absolutePath 幂等：虚拟绝对形再归一仍是同一路径（上游会调两次）', async () => {
    const target = env();
    const first = await target.absolutePath('notes/a.md');
    expect(first.ok && first.value).toBe('/workspace/notes/a.md');
    const second = await target.absolutePath('/workspace/notes/a.md');
    expect(second.ok && second.value).toBe('/workspace/notes/a.md');
  });

  it('读面、append/remove/temp/createDir 一律 not_supported，exec 一律 shell_unavailable', async () => {
    const target = env();
    const denied = [
      await target.readTextFile('a.md'),
      await target.readTextLines('a.md'),
      await target.readBinaryFile('a.md'),
      await target.fileInfo('a.md'),
      await target.listDir('.'),
      await target.exists('a.md'),
      await target.joinPath(['a', 'b.md']),
      await target.appendFile('a.md', 'x'),
      await target.remove('a.md'),
      await target.createDir('notes'),
      await target.createTempDir(),
      await target.createTempFile(),
    ];
    for (const result of denied) {
      expect(result.ok).toBe(false);
      expect(result.ok === false && result.error.code).toBe('not_supported');
    }
    const exec = await target.exec('ls');
    expect(exec.ok).toBe(false);
    expect(exec.ok === false && exec.error.code).toBe('shell_unavailable');
  });

  it('writeFile 拒绝非 string content（Uint8Array 不是工作稿写面）', async () => {
    const port = recordingPort();
    const target = createWorkspaceWriteEnv({
      sessionId: SESSION_ID,
      requestId: REQUEST_ID,
      publicToolCallId: 'tc_1_1',
      registry: seededRegistry(),
      port,
    });
    const result = await target.writeFile('/workspace/a.md', new TextEncoder().encode('x'));
    expect(result.ok).toBe(false);
    expect(port.requests).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 九 · mutation queue 与防串线
// ---------------------------------------------------------------------------

describe('串行化真源', () => {
  const deferred = () => {
    let release = () => {};
    const promise = new Promise<void>((resolve) => {
      release = resolve;
    });
    return { promise, release };
  };
  const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

  it('characterization：共享同一 env 对象时，上游 mutation queue 按 canonical path 串行', async () => {
    const gateOne = deferred();
    const port = recordingPort(async (request) => {
      if (request.logicalPath === 'a.md' && port.requests.length === 1) await gateOne.promise;
      return { status: 'ok' };
    });
    const shared = createWorkspaceWriteEnv({
      sessionId: SESSION_ID,
      requestId: REQUEST_ID,
      publicToolCallId: 'tc_1_1',
      registry: seededRegistry(),
      port,
    });
    const upstream = createWriteTool();

    const first = upstream.execute('raw_1', { path: 'a.md', content: '1' }, undefined, undefined, { env: shared });
    const second = upstream.execute('raw_2', { path: 'a.md', content: '2' }, undefined, undefined, { env: shared });
    await settle();

    // 第二件被队列挡在门外：只有一条 enter，且尚未 exit。
    expect(port.trace).toEqual(['enter:a.md']);
    gateOne.release();
    await Promise.all([first, second]);
    expect(port.trace).toEqual(['enter:a.md', 'exit:a.md', 'enter:a.md', 'exit:a.md']);
  });

  it('invocation-scoped env 不共享该 queue——同路径两次调用真会并进（故产品不能拿它冒充串行）', async () => {
    const gateOne = deferred();
    const port = recordingPort(async () => {
      if (port.requests.length === 1) await gateOne.promise;
      return { status: 'ok' };
    });
    const makeEnv = (tc: string) =>
      createWorkspaceWriteEnv({
        sessionId: SESSION_ID,
        requestId: REQUEST_ID,
        publicToolCallId: tc,
        registry: seededRegistry(),
        port,
      });
    const upstream = createWriteTool();

    const first = upstream.execute('raw_1', { path: 'a.md', content: '1' }, undefined, undefined, {
      env: makeEnv('tc_1_1'),
    });
    const second = upstream.execute('raw_2', { path: 'a.md', content: '2' }, undefined, undefined, {
      env: makeEnv('tc_1_2'),
    });
    await settle();

    // 第一件还卡在 port 里，第二件已经整趟跑完：跨调用零串行保证。
    expect(port.trace).toEqual(['enter:a.md', 'enter:a.md', 'exit:a.md']);
    gateOne.release();
    await Promise.all([first, second]);
    expect(port.trace).toEqual(['enter:a.md', 'enter:a.md', 'exit:a.md', 'exit:a.md']);
  });

  it('经 binder 的同路径并发调用同样不被串起来——串行真源在 Agent，不在上游 queue', async () => {
    const gateOne = deferred();
    const port = recordingPort(async () => {
      if (port.requests.length === 1) await gateOne.promise;
      return { status: 'ok' };
    });
    const tool = bind(port, seededRegistry({ raw_1: 'tc_1_1', raw_2: 'tc_1_2' }));

    const first = callAsLoop(tool, 'raw_1', { path: 'a.md', content: '1' });
    const second = callAsLoop(tool, 'raw_2', { path: 'a.md', content: '2' });
    await settle();

    expect(port.trace).toEqual(['enter:a.md', 'enter:a.md', 'exit:a.md']);
    gateOne.release();
    await Promise.all([first, second]);
  });

  it('binder 每次 tool call 各自建 env：两次真 port 调用的 operation 不串', async () => {
    const port = recordingPort();
    const registry = seededRegistry({ raw_1: 'tc_1_1', raw_2: 'tc_1_2' });
    const tool = bind(port, registry);

    await callAsLoop(tool, 'raw_1', { path: 'one.md', content: '1' });
    await callAsLoop(tool, 'raw_2', { path: 'two.md', content: '2' });

    expect(registry.allocations).toEqual(['tc_1_1→op_1_1', 'tc_1_2→op_1_2']);
    expect(port.requests.map((request) => [request.logicalPath, request.operationId])).toEqual([
      ['one.md', 'op_1_1'],
      ['two.md', 'op_1_2'],
    ]);
  });
});

// ---------------------------------------------------------------------------
// 十 · abort 时序：上游 error ≠ effect 未发生
// ---------------------------------------------------------------------------

describe('abort 与 effect 的关系', () => {
  it('pre-write abort：port 零调用、op 零分配', async () => {
    const port = recordingPort();
    const registry = seededRegistry({ raw_1: 'tc_1_1' });
    const tool = bind(port, registry);
    const controller = new AbortController();
    controller.abort();

    const outcome = await callAsLoop(tool, 'raw_1', { path: 'a.md', content: 'x' }, controller.signal);

    expect(outcome.ok).toBe(false);
    expect(outcome.text).toContain('Operation aborted');
    expect(port.requests).toHaveLength(0);
    expect(registry.allocations).toHaveLength(0);
  });

  it('post-write abort：上游照样抛 Operation aborted，但 port 已被调用一次——effect 可能已发生', async () => {
    const controller = new AbortController();
    const port = recordingPort(() => {
      controller.abort();
      return { status: 'ok' };
    });
    const registry = seededRegistry({ raw_1: 'tc_1_1' });
    const tool = bind(port, registry);

    const outcome = await callAsLoop(tool, 'raw_1', { path: 'a.md', content: 'x' }, controller.signal);

    expect(outcome.ok).toBe(false);
    expect(outcome.text).toContain('Operation aborted');
    // 关键：工具报错，但 host 已收到一次 write request。产品 outcome 只认 host_result/journal。
    expect(port.requests).toHaveLength(1);
    expect(registry.allocations).toEqual(['tc_1_1→op_1_1']);
  });
});

// ---------------------------------------------------------------------------
// 十一 · 真 Agent 装配（faux provider，不触网）
// ---------------------------------------------------------------------------

describe('真 Agent 里的调用序与串行', () => {
  let faux: ReturnType<typeof fauxProvider>;
  let models: MutableModels;
  let model: Model<string>;

  beforeEach(() => {
    faux = fauxProvider({ provider: 'faux', models: [{ id: 'faux-1' }] });
    models = createModels();
    models.setProvider(faux.provider);
    model = faux.getModel();
  });

  const newAgent = (tool: WorkspaceWriteTool) =>
    new Agent({
      streamFn: (target, context, options) => models.streamSimple(target, context, options),
      toolExecution: 'sequential',
      initialState: { systemPrompt: '', model, tools: [tool] },
    });

  it('characterization：tool_execution_start 早于 validate/execute，故 tc 首分配属 event projector', async () => {
    const port = recordingPort();
    const registry = seededRegistry();
    const tool = bind(port, registry);
    const agent = newAgent(tool);
    const order: string[] = [];
    // 这就是未来 event projector 的位置：首见 raw id 即登记公开 tc。
    agent.subscribe((event) => {
      if (event.type === 'tool_execution_start') {
        order.push('start');
        registry.seed(event.toolCallId, 'tc_1_1');
      }
    });
    faux.setResponses([
      fauxAssistantMessage([fauxToolCall('write', { path: 'brief.md', content: '# 摘要' }, { id: 'call_a' })], {
        stopReason: 'toolUse',
      }),
      fauxAssistantMessage([fauxText('已写入 /workspace/brief.md。')]),
    ]);

    await agent.prompt('写一份摘要');

    expect(order).toEqual(['start']);
    expect(port.requests.map((request) => request.logicalPath)).toEqual(['brief.md']);
    expect(registry.allocations).toEqual(['tc_1_1→op_1_1']);
  });

  it('未预种 tc 时，Agent 里表现为 isError 的 toolResult 且 port 零调用', async () => {
    const port = recordingPort();
    const registry = seededRegistry();
    const agent = newAgent(bind(port, registry));
    faux.setResponses([
      fauxAssistantMessage([fauxToolCall('write', { path: 'brief.md', content: 'x' }, { id: 'call_a' })], {
        stopReason: 'toolUse',
      }),
      fauxAssistantMessage([fauxText('停手。')]),
    ]);

    await agent.prompt('写一份摘要');

    const toolResult = agent.state.messages.find((message) => message.role === 'toolResult');
    expect((toolResult as { isError: boolean }).isError).toBe(true);
    expect(port.requests).toHaveLength(0);
    expect(registry.allocations).toHaveLength(0);
  });

  it('raw gate 失败在 Agent 里同样是 isError，且 execute 从未进入', async () => {
    const port = recordingPort();
    const registry = seededRegistry({ call_a: 'tc_1_1' });
    const agent = newAgent(bind(port, registry));
    faux.setResponses([
      fauxAssistantMessage(
        [fauxToolCall('write', { path: 'brief.md', content: 'x', mode: 'append' }, { id: 'call_a' })],
        { stopReason: 'toolUse' },
      ),
      fauxAssistantMessage([fauxText('停手。')]),
    ]);

    await agent.prompt('追加一段');

    const toolResult = agent.state.messages.find((message) => message.role === 'toolResult');
    expect((toolResult as { isError: boolean }).isError).toBe(true);
    expect(port.requests).toHaveLength(0);
  });

  it('同一回合两枚 write：顺序执行、两枚独立 operation、无交错', async () => {
    const port = recordingPort(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return { status: 'ok' };
    });
    const registry = seededRegistry({ call_a: 'tc_1_1', call_b: 'tc_1_2' });
    const agent = newAgent(bind(port, registry));
    faux.setResponses([
      fauxAssistantMessage(
        [
          fauxToolCall('write', { path: 'one.md', content: '1' }, { id: 'call_a' }),
          fauxToolCall('write', { path: 'two.md', content: '2' }, { id: 'call_b' }),
        ],
        { stopReason: 'toolUse' },
      ),
      fauxAssistantMessage([fauxText('两份都写好了。')]),
    ]);

    await agent.prompt('写两份');

    // 无交错：第一件 exit 之后第二件才 enter。并行执行会得到两条相邻的 enter。
    expect(port.trace).toEqual(['enter:one.md', 'exit:one.md', 'enter:two.md', 'exit:two.md']);
    expect(registry.allocations).toEqual(['tc_1_1→op_1_1', 'tc_1_2→op_1_2']);
  });
});

// ---------------------------------------------------------------------------
// 十二 · 临时目录 host 适配器（仅测试面；不进生产）
// ---------------------------------------------------------------------------

describe('注入临时目录 host：nested 创建、覆盖与逐字节回读', () => {
  let workspaceRoot: string;
  let host: RecordingPort;

  beforeEach(async () => {
    workspaceRoot = await mkdtemp(path.join(tmpdir(), 'pi-workspace-'));
    host = recordingPort(async (request) => {
      const target = path.join(workspaceRoot, ...request.logicalPath.split('/'));
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, request.content, 'utf8');
      return { status: 'ok' };
    });
  });

  const readBytes = (logicalPath: string) => readFile(path.join(workspaceRoot, ...logicalPath.split('/')));

  it('nested .md 创建：父目录由 host 建，回读逐字节一致', async () => {
    const tool = bind(host, seededRegistry({ raw_1: 'tc_1_1' }));
    const content = '# 会议纪要\n\n- 甲方：某某\n- 结论：😀\n';

    const outcome = await callAsLoop(tool, 'raw_1', { path: 'notes/2026/会议纪要.md', content });

    expect(outcome.ok).toBe(true);
    const bytes = await readBytes('notes/2026/会议纪要.md');
    expect(new Uint8Array(bytes)).toEqual(utf8(content));
    expect(sha256Hex(new Uint8Array(bytes))).toBe(host.requests[0].contentSha256);
    expect(bytes.byteLength).toBe(host.requests[0].byteLength);
  });

  it('已存在即整体覆盖，且第二次是独立 operation', async () => {
    const tool = bind(host, seededRegistry({ raw_1: 'tc_1_1', raw_2: 'tc_1_2' }));
    await callAsLoop(tool, 'raw_1', { path: 'brief.md', content: '第一版' });
    await callAsLoop(tool, 'raw_2', { path: 'brief.md', content: '第二版（更长的整体改写）' });

    const bytes = await readBytes('brief.md');
    expect(new TextDecoder().decode(bytes)).toBe('第二版（更长的整体改写）');
    expect(host.requests.map((request) => request.operationId)).toEqual(['op_1_1', 'op_1_2']);
  });

  it('非 .md 与路径反例：文件系统零变化', async () => {
    const registry = seededRegistry({ raw_1: 'tc_1_1' });
    const tool = bind(host, registry);

    for (const bad of ['notes.txt', '/case/备忘.md', '../外面.md', 'CON.md']) {
      expect((await callAsLoop(tool, 'raw_1', { path: bad, content: 'x' })).ok).toBe(false);
    }

    expect(await readdir(workspaceRoot)).toEqual([]);
    expect(host.requests).toHaveLength(0);
    expect(registry.allocations).toHaveLength(0);
  });
});
