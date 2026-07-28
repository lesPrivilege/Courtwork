import { describe, expect, it } from 'vitest';

import {
  MAX_DELTA_BYTES,
  MAX_LIST_ENTRIES,
  MAX_PACKET_BYTES,
  MAX_TEXT_BYTES,
  decodeHostPacketLine,
  decodeSidecarPacketLine,
  encodePacketLine,
  isSafeToken,
  isWireString,
  utf8ByteLength,
  type BootstrapPacket,
  type HostResultPacket,
  type ProductPacket,
  type PromptPacket,
  type WorkspaceCapability,
  type WorkspaceListEntry,
} from './product-protocol.js';

/**
 * ADR-022 六-B.1 / 六-B.2 的 codec 反例册。
 *
 * 判据只有一条：**任何一条不满足契约的字节序列都必须在 decode 处停住**，
 * 并给出闭集内的 `protocol_error.code`；宽松兼容、静默 coercion 与 U+FFFD 替换都是红。
 */

const encoder = new TextEncoder();
const raw = (text: string): Uint8Array => encoder.encode(text);
const json = (value: unknown): Uint8Array => raw(JSON.stringify(value));

/** 深拷贝后就地改一处，避免各用例互相污染。 */
function mutate<T>(base: T, patch: (draft: Record<string, unknown>) => void): Record<string, unknown> {
  const draft = JSON.parse(JSON.stringify(base)) as Record<string, unknown>;
  patch(draft);
  return draft;
}

function expectRejected(result: { ok: boolean }, code: string): void {
  expect(result).toMatchObject({ ok: false, code });
}

// ── 基准正例 ──────────────────────────────────────────────────────────────────

const SESSION = 'sess-1';
const REQUEST = 'req-1';
const HASH = 'a'.repeat(64);

const BOOTSTRAP: BootstrapPacket = {
  protocolVersion: 1,
  seq: 1,
  sessionId: SESSION,
  requestId: null,
  type: 'bootstrap',
  payload: {
    containerId: 'ctn-1',
    grantId: 'grant-1',
    caseRoot: '/Users/canary/案卷',
    provider: { id: 'deepseek', modelId: 'deepseek-v4-pro', apiKey: 'sk-canary-0001' },
    limits: { maxTurns: 12, maxUsd: 0.5 },
    resume: { kind: 'fresh', leg: 1, priorObservedTurns: 0, priorTurns: 0, priorUsd: 0 },
  },
};

const PROMPT: PromptPacket = {
  protocolVersion: 1,
  seq: 2,
  sessionId: SESSION,
  requestId: REQUEST,
  type: 'prompt',
  payload: { text: '把 会议纪要.md 概括成三条' },
};

const WRITE_RESULT: HostResultPacket = {
  protocolVersion: 1,
  seq: 3,
  sessionId: SESSION,
  requestId: REQUEST,
  type: 'host_result',
  payload: {
    operationId: 'op_1_1',
    capability: 'workspace_write',
    operation: 'write',
    status: 'ok',
    value: { logicalPath: 'notes/纪要.md', disposition: 'created', contentSha256: HASH, byteLength: 12 },
  },
};

/** 编码为**不含**结尾 LF 的一行内容——decode 收到的正是这个切片。 */
function body(packet: ProductPacket): Uint8Array {
  const encoded = encodePacketLine(packet);
  if (!encoded.ok) throw new Error(`fixture 编码失败：${encoded.code}／${encoded.reason}`);
  return encoded.line.subarray(0, encoded.line.length - 1);
}

// ── 标量小件 ──────────────────────────────────────────────────────────────────

describe('标量门', () => {
  it('utf8ByteLength 数字节不数码元', () => {
    expect(utf8ByteLength('abc')).toBe(3);
    expect(utf8ByteLength('备忘😀')).toBe(10);
  });

  it('SafeToken 闭集：首字符必须字母数字，长度 1..128', () => {
    expect(isSafeToken('a')).toBe(true);
    expect(isSafeToken('A0-_z')).toBe(true);
    expect(isSafeToken('0'.repeat(128))).toBe(true);
    expect(isSafeToken('')).toBe(false);
    expect(isSafeToken('_a')).toBe(false);
    expect(isSafeToken('-a')).toBe(false);
    expect(isSafeToken('a b')).toBe(false);
    expect(isSafeToken('a.b')).toBe(false);
    expect(isSafeToken('0'.repeat(129))).toBe(false);
    expect(isSafeToken(1)).toBe(false);
  });

  it('isWireString 与内核 String.prototype.isWellFormed 同义（NUL 另拒）', () => {
    const wellFormed = (value: string): boolean =>
      (value as unknown as { isWellFormed(): boolean }).isWellFormed();
    for (const sample of ['', 'abc', '备忘😀', '\ud83d\ude00', '\ud800', '\udc00', 'a\ud800b']) {
      expect(isWireString(sample)).toBe(wellFormed(sample));
    }
    // NUL 是 wire 侧另加的一条：JSON 合法、well-formed 也真，但 wire 不收。
    expect(wellFormed('a\u0000b')).toBe(true);
    expect(isWireString('a\u0000b')).toBe(false);
  });
});

// ── A · 字节 framing 与解码 ───────────────────────────────────────────────────

describe('framing 与字节解码', () => {
  it('行内容 + LF 恰为 1 MiB 时框内放行（随后按 schema 判）', () => {
    const shell = '{"pad":""}';
    const padding = 'a'.repeat(MAX_PACKET_BYTES - 1 - shell.length);
    const line = raw(`{"pad":"${padding}"}`);
    expect(line.length).toBe(MAX_PACKET_BYTES - 1);
    // 框内，故不是 packet_too_large；它死在 schema 上。
    expectRejected(decodeHostPacketLine(line), 'invalid_schema');
  });

  it('行内容 + LF 超 1 MiB 即 packet_too_large，且不进 parse', () => {
    const shell = '{"pad":""}';
    const padding = 'a'.repeat(MAX_PACKET_BYTES - shell.length);
    const line = raw(`{"pad":"${padding}"}`);
    expect(line.length).toBe(MAX_PACKET_BYTES);
    expectRejected(decodeHostPacketLine(line), 'packet_too_large');
  });

  it('空行拒绝', () => {
    expectRejected(decodeHostPacketLine(new Uint8Array(0)), 'invalid_json');
  });

  it('CRLF 残留的结尾 CR 拒绝', () => {
    const line = new Uint8Array([...body(BOOTSTRAP), 0x0d]);
    expectRejected(decodeHostPacketLine(line), 'invalid_json');
  });

  it('行内裸 LF 拒绝（delimiter 只能出现在行外）', () => {
    const line = raw('{"a":1}\n{"b":2}');
    expectRejected(decodeHostPacketLine(line), 'invalid_json');
  });

  it('UTF-8 BOM 前缀拒绝，不静默剥离', () => {
    const line = new Uint8Array([0xef, 0xbb, 0xbf, ...body(BOOTSTRAP)]);
    expectRejected(decodeHostPacketLine(line), 'invalid_json');
  });

  it('非法 UTF-8 字节拒绝，不得替换成 U+FFFD 后继续', () => {
    // 把一枚合法包里的 ASCII `t` 换成孤立 continuation byte：若走 U+FFFD 替换路径，
    // 这一行只会「字段名怪一点」，仍可能被后续放行；fatal 解码必须在此停住。
    const broken = Uint8Array.from(body(PROMPT));
    const position = broken.indexOf(0x74);
    expect(position).toBeGreaterThan(0);
    broken[position] = 0x80;
    expectRejected(decodeHostPacketLine(broken), 'invalid_json');
  });

  it('UTF-8 编码的 surrogate（CESU-8 形）拒绝', () => {
    // ED A0 80 = U+D800 的非法 UTF-8 编码；fatal decoder 必须直接失败。
    const line = new Uint8Array([...raw('{"a":"'), 0xed, 0xa0, 0x80, ...raw('"}')]);
    expectRejected(decodeHostPacketLine(line), 'invalid_json');
  });

  it('顶层非 object 拒绝', () => {
    for (const text of ['[]', '"x"', '1', 'null', 'true']) {
      expectRejected(decodeHostPacketLine(raw(text)), 'invalid_schema');
    }
  });
});

// ── B · 严格 JSON ────────────────────────────────────────────────────────────

describe('严格 JSON 扫描', () => {
  it('顶层重复 member 拒绝', () => {
    const line = raw(
      '{"protocolVersion":1,"seq":1,"seq":2,"sessionId":"sess-1","requestId":null,"type":"shutdown","payload":{"reason":"host_shutdown"}}',
    );
    expectRejected(decodeHostPacketLine(line), 'invalid_json');
  });

  it('嵌套层重复 member 同样拒绝', () => {
    const line = raw(
      '{"protocolVersion":1,"seq":1,"sessionId":"sess-1","requestId":"req-1","type":"prompt","payload":{"text":"a","text":"b"}}',
    );
    expectRejected(decodeHostPacketLine(line), 'invalid_json');
  });

  it('重复 member 即使值相同也拒绝', () => {
    const line = raw(
      '{"protocolVersion":1,"seq":1,"seq":1,"sessionId":"sess-1","requestId":null,"type":"shutdown","payload":{"reason":"host_shutdown"}}',
    );
    expectRejected(decodeHostPacketLine(line), 'invalid_json');
  });

  it('JSON 语法反例族全部 invalid_json', () => {
    const samples = [
      '{',
      '{}extra',
      "{'a':1}",
      '{"a":1,}',
      '{"a":01}',
      '{a:1}',
      '{"a":+1}',
      '{"a":.5}',
      '{"a":1.}',
      '{"a":NaN}',
      '{"a":Infinity}',
      '{"a":undefined}',
      '{"a":"unterminated}',
      '{"a":"\\x41"}',
      '{"a":"\\u00"}',
      '{"a" 1}',
      '[1,2]',
    ];
    for (const text of samples) {
      const result = decodeHostPacketLine(raw(text));
      expect(result.ok, `应拒绝：${text}`).toBe(false);
      if (!result.ok) expect(['invalid_json', 'invalid_schema']).toContain(result.code);
    }
  });

  it('字符串内裸控制字符拒绝', () => {
    const line = new Uint8Array([...raw('{"a":"'), 0x01, ...raw('"}')]);
    expectRejected(decodeHostPacketLine(line), 'invalid_json');
  });

  it('\\u0000 拒绝（NUL 不入 wire）', () => {
    const line = raw('{"a":"\\u0000"}');
    expectRejected(decodeHostPacketLine(line), 'invalid_schema');
  });

  it('lone surrogate 拒绝，成对 surrogate 放行', () => {
    expectRejected(decodeHostPacketLine(raw('{"a":"\\ud800"}')), 'invalid_schema');
    expectRejected(decodeHostPacketLine(raw('{"a":"\\udc00"}')), 'invalid_schema');
    // 成对：只该死在 schema（多余字段），不该死在字符串门。
    expectRejected(decodeHostPacketLine(raw('{"a":"\\ud83d\\ude00"}')), 'invalid_schema');
  });

  it('object key 同样受 NUL / lone surrogate 门', () => {
    expectRejected(decodeHostPacketLine(raw('{"\\ud800":1}')), 'invalid_schema');
  });

  it('嵌套过深拒绝，不打穿栈', () => {
    const depth = 200;
    const line = raw(`{"a":${'['.repeat(depth)}${']'.repeat(depth)}}`);
    expectRejected(decodeHostPacketLine(line), 'invalid_json');
  });
});

// ── C · integer lexical gate ─────────────────────────────────────────────────

describe('integer lexical gate', () => {
  const withSeq = (lexeme: string): Uint8Array =>
    raw(
      `{"protocolVersion":1,"seq":${lexeme},"sessionId":"sess-1","requestId":null,"type":"shutdown","payload":{"reason":"host_shutdown"}}`,
    );

  it('规范 lexeme 放行', () => {
    const result = decodeHostPacketLine(withSeq('1'));
    expect(result.ok).toBe(true);
  });

  it('非规范 integer lexeme 一律拒绝，不先 parse 后 coerce', () => {
    for (const lexeme of ['1.0', '1e0', '1E0', '0.1e1', '01', '+1', '-1', '-0', '0', '1e-0']) {
      const result = decodeHostPacketLine(withSeq(lexeme));
      expect(result.ok, `seq=${lexeme} 应拒`).toBe(false);
    }
  });

  it('超安全整数的 integer 拒绝', () => {
    expectRejected(decodeHostPacketLine(withSeq('9007199254740992')), 'invalid_schema');
    expect(decodeHostPacketLine(withSeq('9007199254740991')).ok).toBe(true);
  });

  it('非负 number 字段拒绝 negative zero 与非有限值', () => {
    const withUsd = (lexeme: string): Uint8Array =>
      raw(JSON.stringify(BOOTSTRAP).replace('"maxUsd":0.5', `"maxUsd":${lexeme}`));
    expect(decodeHostPacketLine(withUsd('0.5')).ok).toBe(true);
    for (const lexeme of ['-0', '-0.0', '-1', '1e400']) {
      expect(decodeHostPacketLine(withUsd(lexeme)).ok, `maxUsd=${lexeme} 应拒`).toBe(false);
    }
  });
});

// ── D · 公共头 ───────────────────────────────────────────────────────────────

describe('公共头闭集', () => {
  it('基准正例通过并逐字回值', () => {
    const result = decodeHostPacketLine(body(BOOTSTRAP));
    expect(result).toEqual({ ok: true, packet: BOOTSTRAP });
  });

  it('缺字段 / 多字段均 invalid_schema', () => {
    expectRejected(
      decodeHostPacketLine(json(mutate(BOOTSTRAP, (d) => delete d.requestId))),
      'invalid_schema',
    );
    expectRejected(
      decodeHostPacketLine(json(mutate(BOOTSTRAP, (d) => void (d.extra = 1)))),
      'invalid_schema',
    );
  });

  it('未知版本 unsupported_version；版本类型错是 schema', () => {
    expectRejected(
      decodeHostPacketLine(json(mutate(BOOTSTRAP, (d) => void (d.protocolVersion = 2)))),
      'unsupported_version',
    );
    expectRejected(
      decodeHostPacketLine(json(mutate(BOOTSTRAP, (d) => void (d.protocolVersion = '1')))),
      'invalid_schema',
    );
  });

  it('方向闭集外的 type 是 unknown_type', () => {
    expectRejected(
      decodeHostPacketLine(json(mutate(BOOTSTRAP, (d) => void (d.type = 'ready')))),
      'unknown_type',
    );
    expectRejected(
      decodeHostPacketLine(json(mutate(BOOTSTRAP, (d) => void (d.type = 'nope')))),
      'unknown_type',
    );
    expectRejected(
      decodeSidecarPacketLine(json(mutate(BOOTSTRAP, (d) => void (d.type = 'bootstrap')))),
      'unknown_type',
    );
  });

  it('sessionId 必须是 SafeToken；host 方向不接受 null', () => {
    for (const value of ['', '_x', 'a'.repeat(129), 'a b', 1, null]) {
      expectRejected(
        decodeHostPacketLine(json(mutate(BOOTSTRAP, (d) => void (d.sessionId = value)))),
        'invalid_schema',
      );
    }
  });

  it('requestId 的 null 面按 type 固定', () => {
    expectRejected(
      decodeHostPacketLine(json(mutate(BOOTSTRAP, (d) => void (d.requestId = 'req-1')))),
      'invalid_schema',
    );
    expectRejected(
      decodeHostPacketLine(json(mutate(PROMPT, (d) => void (d.requestId = null)))),
      'invalid_schema',
    );
  });

  it('seq 从 1 起的正整数', () => {
    expectRejected(
      decodeHostPacketLine(json(mutate(BOOTSTRAP, (d) => void (d.seq = 0)))),
      'invalid_schema',
    );
  });
});

// ── E · host→sidecar 逐包 payload ────────────────────────────────────────────

describe('bootstrap payload', () => {
  const withPayload = (patch: (payload: Record<string, unknown>) => void): Uint8Array =>
    json(mutate(BOOTSTRAP, (d) => patch(d.payload as Record<string, unknown>)));

  it('limits.maxTurns 是 1..12 的整数', () => {
    expect(decodeHostPacketLine(withPayload((p) => void ((p.limits as Record<string, unknown>).maxTurns = 1))).ok).toBe(true);
    for (const value of [0, 13, 1.5, -1, '3']) {
      expect(
        decodeHostPacketLine(withPayload((p) => void ((p.limits as Record<string, unknown>).maxTurns = value))).ok,
        `maxTurns=${String(value)} 应拒`,
      ).toBe(false);
    }
  });

  it('limits.maxUsd 是 null 或 0<n<=100000', () => {
    expect(decodeHostPacketLine(withPayload((p) => void ((p.limits as Record<string, unknown>).maxUsd = null))).ok).toBe(true);
    expect(decodeHostPacketLine(withPayload((p) => void ((p.limits as Record<string, unknown>).maxUsd = 100000))).ok).toBe(true);
    for (const value of [0, 100001, -1]) {
      expect(
        decodeHostPacketLine(withPayload((p) => void ((p.limits as Record<string, unknown>).maxUsd = value))).ok,
        `maxUsd=${String(value)} 应拒`,
      ).toBe(false);
    }
  });

  it('caseRoot 必须非空绝对路径且不超 4096 bytes', () => {
    expect(decodeHostPacketLine(withPayload((p) => void (p.caseRoot = 'C:\\案卷'))).ok).toBe(true);
    expect(decodeHostPacketLine(withPayload((p) => void (p.caseRoot = '\\\\srv\\share'))).ok).toBe(true);
    for (const value of ['', '案卷', './案卷', `/${'a'.repeat(4096)}`]) {
      expect(decodeHostPacketLine(withPayload((p) => void (p.caseRoot = value))).ok, `caseRoot 应拒`).toBe(false);
    }
  });

  it('provider 是闭集三字段，不容 endpoint 之类自由配置', () => {
    expectRejected(
      withDecoded(withPayload((p) => void ((p.provider as Record<string, unknown>).endpoint = 'https://x'))),
      'invalid_schema',
    );
    expectRejected(
      withDecoded(withPayload((p) => void ((p.provider as Record<string, unknown>).id = 'openai'))),
      'invalid_schema',
    );
    expectRejected(
      withDecoded(withPayload((p) => void ((p.provider as Record<string, unknown>).modelId = '   '))),
      'invalid_schema',
    );
    expectRejected(
      withDecoded(withPayload((p) => void ((p.provider as Record<string, unknown>).apiKey = ''))),
      'invalid_schema',
    );
    expectRejected(
      withDecoded(withPayload((p) => void ((p.provider as Record<string, unknown>).modelId = 'm'.repeat(257)))),
      'invalid_schema',
    );
  });

  it('fresh 必须 leg=1 且 prior 全零', () => {
    for (const patch of [
      (r: Record<string, unknown>) => void (r.leg = 2),
      (r: Record<string, unknown>) => void (r.priorObservedTurns = 1),
      (r: Record<string, unknown>) => void (r.priorTurns = 1),
      (r: Record<string, unknown>) => void (r.priorUsd = 1),
      (r: Record<string, unknown>) => void (r.priorUsd = null),
    ]) {
      expect(
        decodeHostPacketLine(withPayload((p) => patch(p.resume as Record<string, unknown>))).ok,
      ).toBe(false);
    }
  });

  it('after_interruption 的自洽门：leg>=2、observed>=counted', () => {
    const resumed = (patch: (r: Record<string, unknown>) => void): Uint8Array =>
      withPayload((p) => {
        const resume = p.resume as Record<string, unknown>;
        resume.kind = 'after_interruption';
        resume.leg = 2;
        resume.priorObservedTurns = 5;
        resume.priorTurns = 3;
        resume.priorUsd = 0.25;
        patch(resume);
      });
    expect(decodeHostPacketLine(resumed(() => {})).ok).toBe(true);
    expect(decodeHostPacketLine(resumed((r) => void (r.leg = 1))).ok).toBe(false);
    expect(decodeHostPacketLine(resumed((r) => void (r.priorObservedTurns = 2))).ok).toBe(false);
  });

  it('单包即可判定的矛盾同样由 sidecar 拒：maxUsd 有值而 priorUsd 未知、或历史已越限', () => {
    const resumed = (patch: (payload: Record<string, unknown>) => void): Uint8Array =>
      withPayload((p) => {
        const resume = p.resume as Record<string, unknown>;
        resume.kind = 'after_interruption';
        resume.leg = 2;
        resume.priorObservedTurns = 3;
        resume.priorTurns = 3;
        resume.priorUsd = 0.1;
        patch(p);
      });
    expect(decodeHostPacketLine(resumed(() => {})).ok).toBe(true);
    // maxUsd 非 null 而 priorUsd 为 null。
    expect(
      decodeHostPacketLine(resumed((p) => void ((p.resume as Record<string, unknown>).priorUsd = null))).ok,
    ).toBe(false);
    // 历史 counted turns 已达 maxTurns。
    expect(
      decodeHostPacketLine(
        resumed((p) => {
          (p.limits as Record<string, unknown>).maxTurns = 3;
        }),
      ).ok,
    ).toBe(false);
    // 历史费用已达 maxUsd。
    expect(
      decodeHostPacketLine(
        resumed((p) => {
          (p.limits as Record<string, unknown>).maxUsd = 0.1;
        }),
      ).ok,
    ).toBe(false);
    // maxUsd 本就为 null 时，priorUsd 未知是合法历史。
    expect(
      decodeHostPacketLine(
        resumed((p) => {
          (p.limits as Record<string, unknown>).maxUsd = null;
          (p.resume as Record<string, unknown>).priorUsd = null;
        }),
      ).ok,
    ).toBe(true);
  });
});

function withDecoded(line: Uint8Array): { ok: boolean } {
  return decodeHostPacketLine(line);
}

describe('prompt / cancel / shutdown payload', () => {
  it('prompt text trim 后非空且不超 131072 bytes', () => {
    const withText = (text: string): Uint8Array => json(mutate(PROMPT, (d) => void ((d.payload as Record<string, unknown>).text = text)));
    expect(decodeHostPacketLine(withText('a')).ok).toBe(true);
    expect(decodeHostPacketLine(withText('\u0001'.repeat(MAX_TEXT_BYTES))).ok).toBe(true);
    expect(decodeHostPacketLine(withText('')).ok).toBe(false);
    expect(decodeHostPacketLine(withText('  \n\t ')).ok).toBe(false);
    expect(decodeHostPacketLine(withText('a'.repeat(MAX_TEXT_BYTES + 1))).ok).toBe(false);
    expect(decodeHostPacketLine(withText('😀'.repeat(MAX_TEXT_BYTES / 4))).ok).toBe(true);
    expect(decodeHostPacketLine(withText(`${'😀'.repeat(MAX_TEXT_BYTES / 4)}a`)).ok).toBe(false);
  });

  it('cancel reason 闭集', () => {
    const cancel = (reason: unknown): Uint8Array =>
      json({
        protocolVersion: 1,
        seq: 3,
        sessionId: SESSION,
        requestId: REQUEST,
        type: 'cancel',
        payload: { reason },
      });
    expect(decodeHostPacketLine(cancel('user')).ok).toBe(true);
    expect(decodeHostPacketLine(cancel('host')).ok).toBe(true);
    expect(decodeHostPacketLine(cancel('timeout')).ok).toBe(false);
  });

  it('shutdown reason 固定且 requestId 必须 null', () => {
    const shutdown = (patch: Record<string, unknown>): Uint8Array =>
      json({
        protocolVersion: 1,
        seq: 4,
        sessionId: SESSION,
        requestId: null,
        type: 'shutdown',
        payload: { reason: 'host_shutdown' },
        ...patch,
      });
    expect(decodeHostPacketLine(shutdown({})).ok).toBe(true);
    expect(decodeHostPacketLine(shutdown({ requestId: REQUEST })).ok).toBe(false);
    expect(decodeHostPacketLine(shutdown({ payload: { reason: 'crash' } })).ok).toBe(false);
  });
});

describe('host_result payload', () => {
  const result = (payload: unknown): Uint8Array =>
    json({ ...WRITE_RESULT, payload });

  it('write ok 正例', () => {
    expect(decodeHostPacketLine(body(WRITE_RESULT)).ok).toBe(true);
  });

  it('ok 只带 value，其他状态只带 error', () => {
    expect(
      decodeHostPacketLine(
        result({
          operationId: 'op_1_1',
          capability: 'workspace_write',
          operation: 'write',
          status: 'ok',
          value: { logicalPath: 'a.md', disposition: 'created', contentSha256: HASH, byteLength: 1 },
          error: { code: 'io', message: 'x' },
        }),
      ).ok,
    ).toBe(false);
    expect(
      decodeHostPacketLine(
        result({
          operationId: 'op_1_1',
          capability: 'workspace_write',
          operation: 'write',
          status: 'denied',
          value: { logicalPath: 'a.md', disposition: 'created', contentSha256: HASH, byteLength: 1 },
        }),
      ).ok,
    ).toBe(false);
  });

  it('failed code 闭集含 unsupported_file_type，未知 code 拒', () => {
    const failed = (code: string): Uint8Array =>
      result({
        operationId: 'op_1_1',
        capability: 'workspace_write',
        operation: 'write',
        status: 'failed',
        error: { code, message: '非 Markdown' },
      });
    for (const code of [
      'invalid_path',
      'not_found',
      'not_directory',
      'is_directory',
      'symlink_forbidden',
      'limit_exceeded',
      'hash_mismatch',
      'state_changed',
      'unsupported_file_type',
      'unsupported_filesystem',
      'io',
      'aborted',
      'interrupted',
    ]) {
      expect(decodeHostPacketLine(failed(code)).ok, `failed code ${code} 应放行`).toBe(true);
    }
    expect(decodeHostPacketLine(failed('durability_unknown')).ok).toBe(false);
    expect(decodeHostPacketLine(failed('user_denied')).ok).toBe(false);
    expect(decodeHostPacketLine(failed('nope')).ok).toBe(false);
  });

  it('uncertain 只允许 workspace write 且 code 固定', () => {
    expect(
      decodeHostPacketLine(
        result({
          operationId: 'op_1_1',
          capability: 'workspace_write',
          operation: 'write',
          status: 'uncertain',
          error: { code: 'durability_unknown', message: '屏障未确认' },
        }),
      ).ok,
    ).toBe(true);
    expect(
      decodeHostPacketLine(
        result({
          operationId: 'op_1_1',
          capability: 'workspace_read',
          operation: 'read_file',
          status: 'uncertain',
          error: { code: 'durability_unknown', message: 'x' },
        }),
      ).ok,
    ).toBe(false);
  });

  it('capability 与 operation 必须互洽', () => {
    expect(
      decodeHostPacketLine(
        result({
          operationId: 'op_1_1',
          capability: 'workspace_write',
          operation: 'read_file',
          status: 'ok',
          value: { logicalPath: 'a.md', exists: true },
        }),
      ).ok,
    ).toBe(false);
    expect(
      decodeHostPacketLine(
        result({
          operationId: 'op_1_1',
          capability: 'workspace_read',
          operation: 'write',
          status: 'ok',
          value: { logicalPath: 'a.md', disposition: 'created', contentSha256: HASH, byteLength: 1 },
        }),
      ).ok,
    ).toBe(false);
  });

  it('read_file ok 的 byteLength 必须等于 content 的 UTF-8 实长，hash 必须小写 64 hex', () => {
    const readFile = (value: unknown): Uint8Array =>
      result({
        operationId: 'op_1_1',
        capability: 'workspace_read',
        operation: 'read_file',
        status: 'ok',
        value,
      });
    expect(
      decodeHostPacketLine(readFile({ logicalPath: 'a.md', content: '备忘😀', contentSha256: HASH, byteLength: 10 })).ok,
    ).toBe(true);
    expect(
      decodeHostPacketLine(readFile({ logicalPath: 'a.md', content: '备忘😀', contentSha256: HASH, byteLength: 4 })).ok,
    ).toBe(false);
    expect(
      decodeHostPacketLine(
        readFile({ logicalPath: 'a.md', content: 'a', contentSha256: HASH.toUpperCase(), byteLength: 1 }),
      ).ok,
    ).toBe(false);
    expect(
      decodeHostPacketLine(
        readFile({ logicalPath: 'a.md', content: 'a'.repeat(MAX_TEXT_BYTES + 1), contentSha256: HASH, byteLength: MAX_TEXT_BYTES + 1 }),
      ).ok,
    ).toBe(false);
  });

  it('list ok：2000×255 bytes 的极大正例整包仍在 1 MiB 内', () => {
    const entries: WorkspaceListEntry[] = Array.from({ length: MAX_LIST_ENTRIES }, (_, index) => ({
      name: `e${String(index).padStart(4, '0')}`.padEnd(255, 'x'),
      kind: 'file',
      byteLength: Number.MAX_SAFE_INTEGER,
      mtimeMs: Number.MAX_SAFE_INTEGER,
    }));
    expect(utf8ByteLength(entries[0].name)).toBe(255);

    const packet = {
      ...WRITE_RESULT,
      payload: {
        operationId: 'op_1_1',
        capability: 'workspace_read' as const,
        operation: 'list' as const,
        status: 'ok' as const,
        value: { logicalPath: '.', entries },
      },
    };
    const encoded = encodePacketLine(packet as ProductPacket);
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) return;
    expect(encoded.line.length).toBeLessThanOrEqual(MAX_PACKET_BYTES);
    expect(decodeHostPacketLine(encoded.line.subarray(0, encoded.line.length - 1)).ok).toBe(true);
  });

  it('list 条目上限、name 字节上限与 kind/byteLength 互洽', () => {
    const list = (entries: unknown[]): Uint8Array =>
      result({
        operationId: 'op_1_1',
        capability: 'workspace_read',
        operation: 'list',
        status: 'ok',
        value: { logicalPath: '.', entries },
      });
    expect(decodeHostPacketLine(list([{ name: 'a.md', kind: 'file', byteLength: 3, mtimeMs: 1 }])).ok).toBe(true);
    expect(decodeHostPacketLine(list([{ name: 'sub', kind: 'directory', byteLength: null, mtimeMs: null }])).ok).toBe(true);
    expect(decodeHostPacketLine(list([{ name: 'ln', kind: 'symlink', byteLength: null, mtimeMs: 1 }])).ok).toBe(true);
    // file 必须给出字节数；directory/symlink 必须为 null。
    expect(decodeHostPacketLine(list([{ name: 'a.md', kind: 'file', byteLength: null, mtimeMs: 1 }])).ok).toBe(false);
    expect(decodeHostPacketLine(list([{ name: 'sub', kind: 'directory', byteLength: 0, mtimeMs: 1 }])).ok).toBe(false);
    expect(decodeHostPacketLine(list([{ name: 'a'.repeat(256), kind: 'file', byteLength: 1, mtimeMs: 1 }])).ok).toBe(false);
    expect(
      decodeHostPacketLine(
        list(Array.from({ length: MAX_LIST_ENTRIES + 1 }, () => ({ name: 'a', kind: 'file', byteLength: 1, mtimeMs: 1 }))),
      ).ok,
    ).toBe(false);
  });

  it('error message 上限 4096 bytes', () => {
    const failed = (message: string): Uint8Array =>
      result({
        operationId: 'op_1_1',
        capability: 'workspace_write',
        operation: 'write',
        status: 'failed',
        error: { code: 'io', message },
      });
    expect(decodeHostPacketLine(failed('a'.repeat(4096))).ok).toBe(true);
    expect(decodeHostPacketLine(failed('a'.repeat(4097))).ok).toBe(false);
  });
});

// ── F · sidecar→host 逐包 payload ────────────────────────────────────────────

const READY = {
  protocolVersion: 1 as const,
  seq: 1,
  sessionId: SESSION,
  requestId: null,
  type: 'ready' as const,
  payload: { capabilities: ['case_read', 'workspace_read', 'workspace_write'] as WorkspaceCapability[] },
};

describe('ready payload', () => {
  const ready = (capabilities: unknown): Uint8Array => json({ ...READY, payload: { capabilities } });

  it('闭集、去重、字典序', () => {
    expect(decodeSidecarPacketLine(ready(['case_read', 'workspace_read'])).ok).toBe(true);
    expect(decodeSidecarPacketLine(ready([])).ok).toBe(true);
    expect(decodeSidecarPacketLine(ready(['workspace_read', 'case_read'])).ok).toBe(false);
    expect(decodeSidecarPacketLine(ready(['case_read', 'case_read'])).ok).toBe(false);
    expect(decodeSidecarPacketLine(ready(['bash'])).ok).toBe(false);
  });
});

describe('agent_event payload', () => {
  const event = (payload: unknown): Uint8Array =>
    json({
      protocolVersion: 1,
      seq: 2,
      sessionId: SESSION,
      requestId: REQUEST,
      type: 'agent_event',
      payload,
    });

  it('delta 非空且不超 65536 bytes', () => {
    expect(decodeSidecarPacketLine(event({ kind: 'assistant_text_delta', delta: 'a' })).ok).toBe(true);
    expect(
      decodeSidecarPacketLine(event({ kind: 'assistant_reasoning_delta', delta: '\u0001'.repeat(MAX_DELTA_BYTES) })).ok,
    ).toBe(true);
    expect(decodeSidecarPacketLine(event({ kind: 'assistant_text_delta', delta: '' })).ok).toBe(false);
    expect(
      decodeSidecarPacketLine(event({ kind: 'assistant_text_delta', delta: 'a'.repeat(MAX_DELTA_BYTES + 1) })).ok,
    ).toBe(false);
  });

  it('tool 事件闭集', () => {
    expect(decodeSidecarPacketLine(event({ kind: 'tool_started', toolCallId: 'tc_1_1', toolName: 'write' })).ok).toBe(true);
    expect(
      decodeSidecarPacketLine(event({ kind: 'tool_finished', toolCallId: 'tc_1_1', toolName: 'grep', outcome: 'uncertain' })).ok,
    ).toBe(true);
    expect(decodeSidecarPacketLine(event({ kind: 'tool_started', toolCallId: 'tc_1_1', toolName: 'bash' })).ok).toBe(false);
    expect(
      decodeSidecarPacketLine(event({ kind: 'tool_finished', toolCallId: 'tc_1_1', toolName: 'read', outcome: 'ok' })).ok,
    ).toBe(false);
    // tool_started 不带 outcome。
    expect(
      decodeSidecarPacketLine(event({ kind: 'tool_started', toolCallId: 'tc_1_1', toolName: 'read', outcome: 'succeeded' })).ok,
    ).toBe(false);
  });

  it('turn_finished 的 aborted/error 必须 counted=false 且 usage 全 null', () => {
    const nullUsage = { inputTokens: null, outputTokens: null, cacheReadTokens: null, cacheWriteTokens: null, costUsd: null };
    const turn = (patch: Record<string, unknown>): Uint8Array =>
      event({
        kind: 'turn_finished',
        turn: 1,
        countedTowardTurnLimit: true,
        usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0, costUsd: 0.01 },
        stopReason: 'stop',
        ...patch,
      });
    expect(decodeSidecarPacketLine(turn({})).ok).toBe(true);
    expect(decodeSidecarPacketLine(turn({ stopReason: 'aborted', countedTowardTurnLimit: false, usage: nullUsage })).ok).toBe(true);
    expect(decodeSidecarPacketLine(turn({ stopReason: 'aborted', usage: nullUsage })).ok).toBe(false);
    expect(decodeSidecarPacketLine(turn({ stopReason: 'error', countedTowardTurnLimit: false })).ok).toBe(false);
    expect(decodeSidecarPacketLine(turn({ countedTowardTurnLimit: false })).ok).toBe(false);
    expect(decodeSidecarPacketLine(turn({ turn: 0 })).ok).toBe(false);
  });

  it('usage 的 negative zero 只能从原始 lexeme 看出来，必须拒', () => {
    // `JSON.stringify(-0)` 会写成 `0`，所以这条只能走文本注入——正是 integer/number
    // 门必须看 lexeme、不能看 parse 后数值的理由。
    const text = JSON.stringify({
      protocolVersion: 1,
      seq: 2,
      sessionId: SESSION,
      requestId: REQUEST,
      type: 'agent_event',
      payload: {
        kind: 'turn_finished',
        turn: 1,
        countedTowardTurnLimit: true,
        usage: { inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0, costUsd: 0.5 },
        stopReason: 'stop',
      },
    });
    expect(decodeSidecarPacketLine(raw(text)).ok).toBe(true);
    expect(decodeSidecarPacketLine(raw(text.replace('"costUsd":0.5', '"costUsd":-0'))).ok).toBe(false);
    expect(decodeSidecarPacketLine(raw(text.replace('"cacheReadTokens":0', '"cacheReadTokens":-0'))).ok).toBe(false);
  });
});

describe('host_request payload', () => {
  const request = (payload: unknown): Uint8Array =>
    json({
      protocolVersion: 1,
      seq: 3,
      sessionId: SESSION,
      requestId: REQUEST,
      type: 'host_request',
      payload,
    });

  const writeArgs = { logicalPath: 'notes/纪要.md', content: '备忘😀', contentSha256: HASH, byteLength: 10 };

  it('write / read 两种 capability 正例', () => {
    expect(
      decodeSidecarPacketLine(
        request({ operationId: 'op_1_1', proposalHash: HASH, capability: 'workspace_write', arguments: writeArgs }),
      ).ok,
    ).toBe(true);
    for (const operation of ['exists', 'read_file', 'list']) {
      expect(
        decodeSidecarPacketLine(
          request({
            operationId: 'op_1_2',
            proposalHash: HASH,
            capability: 'workspace_read',
            arguments: { operation, logicalPath: '.' },
          }),
        ).ok,
      ).toBe(true);
    }
  });

  it('proposalHash 只收小写 64 hex', () => {
    for (const hash of [HASH.toUpperCase(), 'a'.repeat(63), 'a'.repeat(65), 'z'.repeat(64), '']) {
      expect(
        decodeSidecarPacketLine(
          request({ operationId: 'op_1_1', proposalHash: hash, capability: 'workspace_write', arguments: writeArgs }),
        ).ok,
        `proposalHash 应拒`,
      ).toBe(false);
    }
  });

  it('write arguments 是闭集：byteLength 必须等于实长，content 不超 131072', () => {
    expect(
      decodeSidecarPacketLine(
        request({
          operationId: 'op_1_1',
          proposalHash: HASH,
          capability: 'workspace_write',
          arguments: { ...writeArgs, byteLength: 4 },
        }),
      ).ok,
    ).toBe(false);
    expect(
      decodeSidecarPacketLine(
        request({
          operationId: 'op_1_1',
          proposalHash: HASH,
          capability: 'workspace_write',
          arguments: { ...writeArgs, extra: 1 },
        }),
      ).ok,
    ).toBe(false);
    expect(
      decodeSidecarPacketLine(
        request({
          operationId: 'op_1_1',
          proposalHash: HASH,
          capability: 'workspace_write',
          arguments: {
            logicalPath: 'a.md',
            content: 'a'.repeat(MAX_TEXT_BYTES + 1),
            contentSha256: HASH,
            byteLength: MAX_TEXT_BYTES + 1,
          },
        }),
      ).ok,
    ).toBe(false);
  });

  it('workspace_read 的 arguments 不接受 write 字段', () => {
    expect(
      decodeSidecarPacketLine(
        request({
          operationId: 'op_1_1',
          proposalHash: HASH,
          capability: 'workspace_read',
          arguments: { operation: 'read_file', logicalPath: 'a.md', content: 'x' },
        }),
      ).ok,
    ).toBe(false);
  });
});

describe('terminal / protocol_error payload', () => {
  const openBudget = { turns: 1, usd: 0.01, turnLimit: 'open', usdLimit: 'open', stopReason: null };
  const terminal = (payload: unknown, requestId: string | null = REQUEST): Uint8Array =>
    json({ protocolVersion: 1, seq: 9, sessionId: SESSION, requestId, type: 'terminal', payload });

  it('completed / canceled / failed 正例', () => {
    expect(decodeSidecarPacketLine(terminal({ status: 'completed', budget: openBudget })).ok).toBe(true);
    expect(decodeSidecarPacketLine(terminal({ status: 'canceled', reason: 'user', budget: openBudget })).ok).toBe(true);
    expect(
      decodeSidecarPacketLine(
        terminal({
          status: 'failed',
          error: { code: 'effect_uncertain', message: '落盘未确认', retryable: false },
          budget: openBudget,
        }),
      ).ok,
    ).toBe(true);
  });

  it('budget_stopped 必须给 stopReason，其他 terminal 必须 null', () => {
    expect(
      decodeSidecarPacketLine(
        terminal({ status: 'budget_stopped', budget: { ...openBudget, turnLimit: 'reached', stopReason: 'turns' } }),
      ).ok,
    ).toBe(true);
    expect(decodeSidecarPacketLine(terminal({ status: 'budget_stopped', budget: openBudget })).ok).toBe(false);
    expect(
      decodeSidecarPacketLine(terminal({ status: 'completed', budget: { ...openBudget, stopReason: 'usd' } })).ok,
    ).toBe(false);
  });

  it('shutdown terminal 只带 status 且 requestId 必须 null', () => {
    expect(decodeSidecarPacketLine(terminal({ status: 'shutdown' }, null)).ok).toBe(true);
    expect(decodeSidecarPacketLine(terminal({ status: 'shutdown' }, REQUEST)).ok).toBe(false);
    expect(decodeSidecarPacketLine(terminal({ status: 'shutdown', budget: openBudget }, null)).ok).toBe(false);
    expect(decodeSidecarPacketLine(terminal({ status: 'completed', budget: openBudget }, null)).ok).toBe(false);
  });

  it('BudgetView 闭集与 message 上限', () => {
    expect(decodeSidecarPacketLine(terminal({ status: 'completed', budget: { ...openBudget, usdLimit: 'nope' } })).ok).toBe(false);
    expect(decodeSidecarPacketLine(terminal({ status: 'completed', budget: { ...openBudget, usd: null, usdLimit: 'unknown' } })).ok).toBe(false);
    expect(
      decodeSidecarPacketLine(
        terminal({
          status: 'failed',
          error: { code: 'provider_error', message: 'a'.repeat(1025), retryable: true },
          budget: openBudget,
        }),
      ).ok,
    ).toBe(false);
  });

  it('拒绝与终态优先级相矛盾的 budget 组合', () => {
    const reachedTurns = { ...openBudget, turnLimit: 'reached' as const };
    const reachedUsd = { ...openBudget, usdLimit: 'reached' as const };
    const unknownUsd = { ...openBudget, usd: null, usdLimit: 'unknown' as const };

    // budget_stopped 必须可由一个已知限额解释，且 stopReason 必须与该限额一致。
    expect(
      decodeSidecarPacketLine(
        terminal({ status: 'budget_stopped', budget: { ...openBudget, stopReason: 'turns' } }),
      ).ok,
    ).toBe(false);
    expect(
      decodeSidecarPacketLine(
        terminal({ status: 'budget_stopped', budget: { ...reachedTurns, stopReason: 'usd' } }),
      ).ok,
    ).toBe(false);
    expect(
      decodeSidecarPacketLine(
        terminal({ status: 'budget_stopped', budget: { ...reachedUsd, stopReason: 'turns' } }),
      ).ok,
    ).toBe(false);

    // 非最高优先级失败与正常终态不能吞掉 known reached / unknown amount。
    for (const payload of [
      { status: 'completed', budget: reachedTurns },
      { status: 'canceled', reason: 'user', budget: reachedUsd },
      {
        status: 'failed',
        error: { code: 'provider_error', message: 'provider failed', retryable: true },
        budget: reachedTurns,
      },
      { status: 'completed', budget: unknownUsd },
    ]) {
      expect(decodeSidecarPacketLine(terminal(payload)).ok).toBe(false);
    }

    expect(
      decodeSidecarPacketLine(
        terminal({
          status: 'failed',
          error: { code: 'budget_unknown', message: 'unknown cost', retryable: false },
          budget: openBudget,
        }),
      ).ok,
    ).toBe(false);
    expect(
      decodeSidecarPacketLine(
        terminal({
          status: 'failed',
          error: { code: 'effect_uncertain', message: 'uncertain write', retryable: false },
          budget: reachedTurns,
        }),
      ).ok,
    ).toBe(true);
    expect(
      decodeSidecarPacketLine(
        terminal({
          status: 'completed',
          budget: { ...openBudget, usd: null, usdLimit: 'open' },
        }),
      ).ok,
    ).toBe(false);
  });

  it('protocol_error fatal 恒真、code 闭集、message 上限', () => {
    const error = (payload: unknown, sessionId: string | null = null): Uint8Array =>
      json({ protocolVersion: 1, seq: 1, sessionId, requestId: null, type: 'protocol_error', payload });
    expect(decodeSidecarPacketLine(error({ code: 'invalid_json', message: '行不是 JSON object', fatal: true })).ok).toBe(true);
    expect(decodeSidecarPacketLine(error({ code: 'invalid_json', message: 'x', fatal: false })).ok).toBe(false);
    expect(decodeSidecarPacketLine(error({ code: 'nope', message: 'x', fatal: true })).ok).toBe(false);
    expect(decodeSidecarPacketLine(error({ code: 'invalid_json', message: 'a'.repeat(1025), fatal: true })).ok).toBe(false);
    // sessionId:null 只对 protocol_error 开放。
    expect(decodeSidecarPacketLine(json({ ...READY, sessionId: null })).ok).toBe(false);
  });
});

// ── G · encoder ──────────────────────────────────────────────────────────────

describe('encoder', () => {
  it('每种 packet round-trip 等价，行以单个 LF 收尾且行内无 LF', () => {
    const packets: ProductPacket[] = [BOOTSTRAP, PROMPT, WRITE_RESULT, READY as ProductPacket];
    for (const packet of packets) {
      const encoded = encodePacketLine(packet);
      expect(encoded.ok, `${packet.type} 应可编码`).toBe(true);
      if (!encoded.ok) continue;
      expect(encoded.line[encoded.line.length - 1]).toBe(0x0a);
      expect(encoded.line.subarray(0, encoded.line.length - 1).includes(0x0a)).toBe(false);
      const decoded =
        packet.type === 'ready'
          ? decodeSidecarPacketLine(encoded.line.subarray(0, encoded.line.length - 1))
          : decodeHostPacketLine(encoded.line.subarray(0, encoded.line.length - 1));
      expect(decoded).toEqual({ ok: true, packet });
    }
  });

  it('编码后超 1 MiB 在写流前失败，且先于 schema 判定', () => {
    const oversized = {
      ...PROMPT,
      payload: { text: 'a'.repeat(MAX_PACKET_BYTES + 16) },
    };
    expectRejected(encodePacketLine(oversized as ProductPacket), 'packet_too_large');
  });

  it('raw cap 内的最坏编码膨胀仍在 framing 内：C0 / 引号 / 反斜杠 / 多字节', () => {
    const worst = [
      '\u0001'.repeat(MAX_TEXT_BYTES),
      '"'.repeat(MAX_TEXT_BYTES),
      '\\'.repeat(MAX_TEXT_BYTES),
      '😀'.repeat(MAX_TEXT_BYTES / 4),
    ];
    for (const text of worst) {
      expect(utf8ByteLength(text)).toBe(MAX_TEXT_BYTES);
      const encoded = encodePacketLine({ ...PROMPT, payload: { text } });
      expect(encoded.ok, 'raw cap 内必须可发').toBe(true);
      if (!encoded.ok) continue;
      expect(encoded.line.length).toBeLessThanOrEqual(MAX_PACKET_BYTES);
    }
    // U+0001 是最坏的六字节转义：主体应逼近 786432 bytes，仍给 envelope 留足余量。
    const c0 = encodePacketLine({ ...PROMPT, payload: { text: '\u0001'.repeat(MAX_TEXT_BYTES) } });
    expect(c0.ok).toBe(true);
    if (c0.ok) expect(c0.line.length).toBeGreaterThan(786_432);
  });

  it('超 raw cap 在写流前失败', () => {
    expectRejected(
      encodePacketLine({ ...PROMPT, payload: { text: 'a'.repeat(MAX_TEXT_BYTES + 1) } }),
      'invalid_schema',
    );
  });

  it('自身产物过不了本 decoder 就不许写出：lone surrogate 兜住', () => {
    expectRejected(encodePacketLine({ ...PROMPT, payload: { text: '\ud800' } }), 'invalid_schema');
  });

  it('方向闭集外的 type 拒绝编码', () => {
    expectRejected(encodePacketLine({ ...PROMPT, type: 'nope' } as unknown as ProductPacket), 'unknown_type');
  });
});
