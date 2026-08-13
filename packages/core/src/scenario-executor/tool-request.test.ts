// TOOL-READ-1 裁定二/四/九：白名单准入判定、请求闭集、轮次上界与字节上界的单元谱。
import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import type { ScenarioRuntime } from '@courtwork/registry';
import { createToolRegistry } from '../tools/tool-registry.js';
import { defineTool } from '@courtwork/tools';
import {
  MODEL_TOOL_RESULT_MAX_BYTES,
  MODEL_TOOL_RESULT_TRUNCATION_MARK,
  REQUEST_TOOL_MAX_ROUNDS,
  RequestableToolPolicyError,
  buildRequestToolClosedSet,
  foldToolResult,
  resolveRequestableTools,
} from './tool-request.js';
import { UnknownToolError } from './executor.js';

function scenario(requestableToolIds: string[]): ScenarioRuntime {
  return {
    id: 'demo.T1',
    packageId: 'demo',
    name: '工具请求樁',
    trigger: { fileTypes: [], userActions: ['start'], classifierTags: [] },
    inputArtifacts: [],
    toolIds: [],
    requestableToolIds,
    outputArtifacts: [],
    uiTemplateId: 'demo.panel',
    confirmationPolicy: { mode: 'none' },
    promptBody: '正文',
    steps: [],
  } as unknown as ScenarioRuntime;
}

function stubTool(id: string) {
  return defineTool(
    { id, inputSchema: z.object({}), dataSchema: z.object({}), timeoutMs: 1000 },
    { sourceId: 'stub', async run() { return {}; } },
  );
}

describe('resolveRequestableTools（TOOL-READ-1 裁定二 · 场景执行准入侧）', () => {
  it('引用必解析：白名单点名了未注册工具即拒绝开跑', () => {
    const tools = createToolRegistry();
    expect(() => resolveRequestableTools(scenario(['material-read']), tools)).toThrow(UnknownToolError);
  });

  it('仅 pure_read：白名单出现非 pure_read 工具即拒绝开跑', () => {
    const tools = createToolRegistry();
    tools.register('writer', { tool: stubTool('writer'), grade: 'A', sideEffect: 'file_write' });
    expect(() => resolveRequestableTools(scenario(['writer']), tools)).toThrow(RequestableToolPolicyError);
  });

  it('比 confirmationPolicy 前置门更严：copy-file/mkdir 的无损例外在可请求白名单里不适用', () => {
    const tools = createToolRegistry();
    tools.register('copy-file', { tool: stubTool('copy-file'), grade: 'A', sideEffect: 'file_write' });
    expect(() => resolveRequestableTools(scenario(['copy-file']), tools)).toThrow(RequestableToolPolicyError);
  });

  it('缺省 sideEffect 视同 pure_read，正常解析', () => {
    const tools = createToolRegistry();
    tools.register('dossier-list', { tool: stubTool('dossier-list'), grade: 'B' });
    const resolved = resolveRequestableTools(scenario(['dossier-list']), tools);
    expect([...resolved.keys()]).toEqual(['dossier-list']);
  });

  it('空白名单解析成空表（既有场景零行为变化）', () => {
    expect(resolveRequestableTools(scenario([]), createToolRegistry()).size).toBe(0);
  });
});

describe('buildRequestToolClosedSet（ADR-011 修订二条件 1 · z.literal 闭集）', () => {
  it('空白名单不产出请求分支——模型 schema 里根本没有这个通道', () => {
    expect(buildRequestToolClosedSet([])).toBeUndefined();
  });

  it('闭集内 toolId 收，闭集外 toolId 拒——闭集外取值是普通不可信文本', () => {
    const schema = buildRequestToolClosedSet(['material-read', 'dossier-list']);
    expect(schema).toBeDefined();
    expect(schema!.safeParse({ toolId: 'material-read', input: { materialId: 'm-1' } }).success).toBe(true);
    expect(schema!.safeParse({ toolId: 'party-verify' }).success).toBe(false);
    expect(schema!.safeParse({ toolId: 'system-open' }).success).toBe(false);
  });

  it('单枚白名单也是闭集（zod 单元素联合的退化形不得放行任意串）', () => {
    const schema = buildRequestToolClosedSet(['dossier-list']);
    expect(schema!.safeParse({ toolId: 'dossier-list' }).success).toBe(true);
    expect(schema!.safeParse({ toolId: 'material-read' }).success).toBe(false);
  });

  it('请求对象严封：夹带未声明键即拒收', () => {
    const schema = buildRequestToolClosedSet(['dossier-list']);
    expect(schema!.safeParse({ toolId: 'dossier-list', goto: 'produce-x' }).success).toBe(false);
  });
});

/** UTF-8 字节数（测试与实现同口径——TextEncoder 是 web 平台标准 API，browser-safe）。 */
const utf8Bytes = (text: string): number => new TextEncoder().encode(text).byteLength;

/** 可调正文长的信封：空白 text 的 JSON 字节数即开销，ASCII 填充每加一字符恰加一字节。 */
const envelopeWithText = (text: string) => ({ verified: true, data: { text }, source: 'stub', checkedAt: 't' });
const envelopeBaseBytes = utf8Bytes(JSON.stringify(envelopeWithText('')));
/** 恰令 JSON.stringify(envelope) 的 UTF-8 总字节数等于上界的 ASCII 正文。 */
const asciiExactFit = 'x'.repeat(MODEL_TOOL_RESULT_MAX_BYTES - envelopeBaseBytes);

/** 孤立 surrogate 检测：成对的合法 surrogate 不算，只剩半边才算。 */
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

describe('foldToolResult（TOOL-READ-1 裁定九 · R1-2 统一 UTF-8 字节上界）', () => {
  it('上界内原样折叠，不标截断', () => {
    const folded = foldToolResult({ verified: true, data: { a: 1 }, source: 'stub', checkedAt: 't' });
    expect(folded.truncated).toBe(false);
    expect(folded.content).toContain('"a":1');
    expect(folded.content).not.toContain(MODEL_TOOL_RESULT_TRUNCATION_MARK);
  });

  it('ASCII：总字节恰等上界不截', () => {
    const raw = JSON.stringify(envelopeWithText(asciiExactFit));
    expect(utf8Bytes(raw)).toBe(MODEL_TOOL_RESULT_MAX_BYTES);
    const folded = foldToolResult(envelopeWithText(asciiExactFit));
    expect(folded.truncated).toBe(false);
    expect(folded.content).toBe(raw);
    expect(folded.content).not.toContain(MODEL_TOOL_RESULT_TRUNCATION_MARK);
  });

  it('ASCII：越界即截，truncated:true 与标记必须同时在场', () => {
    const folded = foldToolResult(envelopeWithText('x'.repeat(MODEL_TOOL_RESULT_MAX_BYTES * 2)));
    expect(folded.truncated).toBe(true);
    expect(folded.content.endsWith(MODEL_TOOL_RESULT_TRUNCATION_MARK)).toBe(true);
  });

  it('CJK：多字节内容越界必须截——UTF-16 长度口径在此假绿', () => {
    // '汉' 一枚 3 UTF-8 字节；7000 枚 ≈ 21000 字节 > 20000，而 UTF-16 长度只有 7000。
    const folded = foldToolResult(envelopeWithText('汉'.repeat(7000)));
    expect(folded.truncated).toBe(true);
    expect(folded.content.endsWith(MODEL_TOOL_RESULT_TRUNCATION_MARK)).toBe(true);
  });

  it('emoji：不得从 surrogate pair 中间截断，输出不含 U+FFFD 或孤立 surrogate', () => {
    // '😀' 一枚 4 UTF-8 字节；5000 枚 ≈ 20000 字节 + 信封开销 > 上界，必截。
    const raw = JSON.stringify(envelopeWithText('😀'.repeat(5000)));
    const folded = foldToolResult(envelopeWithText('😀'.repeat(5000)));
    expect(folded.truncated).toBe(true);
    const kept = folded.content.slice(0, -MODEL_TOOL_RESULT_TRUNCATION_MARK.length);
    // 保留正文必须是原文的 code point 对齐前缀——从 surrogate pair 中间截断会在此失守。
    expect(raw.startsWith(kept)).toBe(true);
    expect(folded.content).not.toContain('\uFFFD');
    expect(LONE_SURROGATE.test(folded.content)).toBe(false);
  });

  it('截断后「保留正文 + 标记」的 UTF-8 总字节数仍 ≤ 上界（标记自身计入上界）', () => {
    for (const text of ['x'.repeat(MODEL_TOOL_RESULT_MAX_BYTES * 2), '汉'.repeat(7000), '😀'.repeat(5000)]) {
      const folded = foldToolResult(envelopeWithText(text));
      expect(folded.truncated).toBe(true);
      expect(utf8Bytes(folded.content)).toBeLessThanOrEqual(MODEL_TOOL_RESULT_MAX_BYTES);
      expect(folded.content.endsWith(MODEL_TOOL_RESULT_TRUNCATION_MARK)).toBe(true);
    }
  });

  it('失败信封原样透出为工具失败，不降级成空结果', () => {
    const folded = foldToolResult({ verified: false, reason: 'out_of_coverage', message: '材料 m-1 当前不可用：content_drift', checkedAt: 't' });
    expect(folded.content).toContain('out_of_coverage');
    expect(folded.content).toContain('content_drift');
  });
});

describe('轮次上界常量（TOOL-READ-1 裁定四）', () => {
  it('上界是系统裁决，写死为 3', () => {
    expect(REQUEST_TOOL_MAX_ROUNDS).toBe(3);
  });
});
