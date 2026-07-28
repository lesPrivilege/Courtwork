/**
 * 产品 stdio wire 的 v1 strict codec（ADR-022 六-B.1 / 六-B.2 逐字段实现）。
 *
 * 边界（`PI-CODE-STDIO-1` 票面）：
 * - 本文件只做 **codec**：framing、严格 JSON、闭集形状、标量门与 hash **格式**。
 * - 逻辑路径 grammar（segment 字符集、`.`/`..`、Windows 保留名、`.md` 后缀）**不在此处复制**，
 *   由 `workspace-write-env` 与未来 Rust host 双验；本文件只锁与 framing 相关的字节上限
 *   （总长 1024、单 name 255、list 2000 条），因为那三条直接决定整包能否装进 1 MiB。
 * - 跨 leg requestId 去重、`previous+1`、历史预算 fold 与 model/limits/grant/container/capability
 *   漂移由持有 durable journal 的 Rust 宿主独占；本文件与 `product-stdio.ts` 都不伪造历史。
 *
 * 三条不肯让步的实现选择：
 * 1. 自研严格 JSON 扫描器。`JSON.parse` 无法拒绝任一层重复 member，也拿不到 number 的原始
 *    lexeme——而 ADR 两条都要。见 {@link scanJson}。
 * 2. 字节先于字符。framing 与 UTF-8 fatal 解码都在 parse 之前，`Buffer.toString()` 那种
 *    U+FFFD 替换路径根本不出现。
 * 3. encoder 走「序列化 → 按编码后字节复核 → 回灌本 decoder」三步；对端能不能收得下，
 *    由同一份 decoder 当场作证，不靠第二份校验器的善意。
 *
 * `reason` 字段只由本文件的字面量与契约字段名拼成。任何入参值——包括未知 type、未知 member
 * 名、secret 与物理路径——都不得进入 `reason`，否则 `protocol_error.message` 就成了回显面。
 */

// ── 契约常量（全部出自 ADR-022 六-B，不得就地放宽）───────────────────────────

/** wire 协议版本；未知版本一律 `unsupported_version`，不做宽松兼容。 */
export const PROTOCOL_VERSION = 1;
/** 单 packet **连结尾 LF 在内**的字节上限。 */
export const MAX_PACKET_BYTES = 1_048_576;
/** wire delimiter 只收单字节 LF。 */
export const LINE_DELIMITER = 0x0a;
/** prompt text 与 workspace content 的 raw UTF-8 上限。 */
export const MAX_TEXT_BYTES = 131_072;
/** 单枚 delta 的 UTF-8 上限。 */
export const MAX_DELTA_BYTES = 65_536;
/** `list` 结果的条目上限；超限由宿主回 `limit_exceeded`，不得静默截断。 */
export const MAX_LIST_ENTRIES = 2_000;
/** 单 segment / list entry name 的 UTF-8 上限。 */
export const MAX_SEGMENT_BYTES = 255;
/** 逻辑路径总 UTF-8 上限。 */
export const MAX_LOGICAL_PATH_BYTES = 1_024;
/** bootstrap `caseRoot` 的 UTF-8 上限。 */
export const MAX_CASE_ROOT_BYTES = 4_096;
/** bootstrap `provider.modelId` 的 UTF-8 上限。 */
export const MAX_MODEL_ID_BYTES = 256;
/** bootstrap `provider.apiKey` 的 UTF-8 上限。 */
export const MAX_API_KEY_BYTES = 8_192;
/** terminal / protocol_error 的 message UTF-8 上限。 */
export const MAX_TERMINAL_MESSAGE_BYTES = 1_024;
/** host_result error message 的 UTF-8 上限。 */
export const MAX_HOST_ERROR_MESSAGE_BYTES = 4_096;
/** `limits.maxTurns` 闭区间上限（下限 1）。 */
export const MAX_TURNS_LIMIT = 12;
/** `limits.maxUsd` 的上限（`0 < n <= 100000`）。 */
export const MAX_USD_LIMIT = 100_000;
/** 严格 JSON 的嵌套深度上限：1 MiB 的 `[[[[…` 不得把扫描器打穿栈。 */
export const MAX_JSON_DEPTH = 32;

/** `^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$`——全部 wire ID 共用。 */
export const SAFE_TOKEN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
/** 小写 64 位 hex；`contentSha256` 与 `proposalHash` 共用。 */
export const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/;
/** 声明为 integer 的 JSON number lexeme 闭集。 */
export const INTEGER_LEXEME_PATTERN = /^(?:0|[1-9][0-9]*)$/;

// ── 标量与闭集 ────────────────────────────────────────────────────────────────

export type SafeToken = string;

export type ProtocolErrorCode =
  | 'invalid_json'
  | 'packet_too_large'
  | 'invalid_schema'
  | 'unsupported_version'
  | 'unknown_type'
  | 'seq_mismatch'
  | 'session_mismatch'
  | 'request_mismatch'
  | 'state_violation'
  | 'duplicate_id';

export type WorkspaceCapability = 'case_read' | 'workspace_read' | 'workspace_write';
export type ProductToolName = 'read' | 'glob' | 'grep' | 'write';
export type ToolOutcome = 'succeeded' | 'denied' | 'failed' | 'uncertain';
export type TurnStopReason = 'stop' | 'length' | 'tool' | 'aborted' | 'error' | 'unknown';
export type CancelReason = 'user' | 'host';
export type HostResultStatus = 'ok' | 'denied' | 'failed' | 'uncertain';
export type WorkspaceOperation = 'write' | 'exists' | 'read_file' | 'list';
export type ResumeKind = 'fresh' | 'after_interruption';

export type HostDeniedCode = 'user_denied' | 'policy_denied';
export type HostFailureCode =
  | 'invalid_path'
  | 'not_found'
  | 'not_directory'
  | 'is_directory'
  | 'symlink_forbidden'
  | 'limit_exceeded'
  | 'hash_mismatch'
  | 'state_changed'
  | 'unsupported_file_type'
  | 'unsupported_filesystem'
  | 'io'
  | 'aborted'
  | 'interrupted';

export type TerminalFailureCode =
  | 'provider_error'
  | 'host_error'
  | 'budget_unknown'
  | 'effect_uncertain'
  | 'upstream_event_unsupported'
  | 'invalid_state'
  | 'unknown';

const CAPABILITIES: readonly WorkspaceCapability[] = ['case_read', 'workspace_read', 'workspace_write'];
const TOOL_NAMES: readonly ProductToolName[] = ['read', 'glob', 'grep', 'write'];
const TOOL_OUTCOMES: readonly ToolOutcome[] = ['succeeded', 'denied', 'failed', 'uncertain'];
const TURN_STOP_REASONS: readonly TurnStopReason[] = ['stop', 'length', 'tool', 'aborted', 'error', 'unknown'];
const CANCEL_REASONS: readonly CancelReason[] = ['user', 'host'];
const HOST_RESULT_STATUSES: readonly HostResultStatus[] = ['ok', 'denied', 'failed', 'uncertain'];
const WORKSPACE_OPERATIONS: readonly WorkspaceOperation[] = ['write', 'exists', 'read_file', 'list'];
const RESUME_KINDS: readonly ResumeKind[] = ['fresh', 'after_interruption'];
const HOST_DENIED_CODES: readonly HostDeniedCode[] = ['user_denied', 'policy_denied'];
const HOST_FAILURE_CODES: readonly HostFailureCode[] = [
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
];
const TERMINAL_FAILURE_CODES: readonly TerminalFailureCode[] = [
  'provider_error',
  'host_error',
  'budget_unknown',
  'effect_uncertain',
  'upstream_event_unsupported',
  'invalid_state',
  'unknown',
];
const PROTOCOL_ERROR_CODES: readonly ProtocolErrorCode[] = [
  'invalid_json',
  'packet_too_large',
  'invalid_schema',
  'unsupported_version',
  'unknown_type',
  'seq_mismatch',
  'session_mismatch',
  'request_mismatch',
  'state_violation',
  'duplicate_id',
];

// ── payload 类型 ──────────────────────────────────────────────────────────────

export type BootstrapPayload = {
  containerId: SafeToken;
  grantId: SafeToken;
  caseRoot: string;
  provider: { id: 'deepseek'; modelId: string; apiKey: string };
  limits: { maxTurns: number; maxUsd: number | null };
  resume: {
    kind: ResumeKind;
    leg: number;
    priorObservedTurns: number;
    priorTurns: number;
    priorUsd: number | null;
  };
};

export type PromptPayload = { text: string };
export type CancelPayload = { reason: CancelReason };
export type ShutdownPayload = { reason: 'host_shutdown' };
export type ReadyPayload = { capabilities: WorkspaceCapability[] };
export type ProtocolErrorPayload = { code: ProtocolErrorCode; message: string; fatal: true };

export type WorkspaceWriteArguments = {
  logicalPath: string;
  content: string;
  contentSha256: string;
  byteLength: number;
};

export type WorkspaceReadArguments =
  | { operation: 'exists' | 'read_file'; logicalPath: string }
  | { operation: 'list'; logicalPath: string };

export type WorkspaceRequestArguments = WorkspaceWriteArguments | WorkspaceReadArguments;

export type WorkspaceHostRequest =
  | {
      operationId: SafeToken;
      proposalHash: string;
      capability: 'workspace_write';
      arguments: WorkspaceWriteArguments;
    }
  | {
      operationId: SafeToken;
      proposalHash: string;
      capability: 'workspace_read';
      arguments: WorkspaceReadArguments;
    };

export type WorkspaceWriteOk = {
  logicalPath: string;
  disposition: 'created' | 'overwritten';
  contentSha256: string;
  byteLength: number;
};
export type WorkspaceExistsOk = { logicalPath: string; exists: boolean };
export type WorkspaceReadFileOk = {
  logicalPath: string;
  content: string;
  contentSha256: string;
  byteLength: number;
};
export type WorkspaceListEntry = {
  name: string;
  kind: 'file' | 'directory' | 'symlink';
  byteLength: number | null;
  mtimeMs: number | null;
};
export type WorkspaceListOk = { logicalPath: string; entries: WorkspaceListEntry[] };

export type HostDeniedError = { code: HostDeniedCode; message: string };
export type HostFailedError = { code: HostFailureCode; message: string };
export type HostUncertainError = { code: 'durability_unknown'; message: string };

/** `ok` 只带 value，其他状态只带 error；`uncertain` 只允许 workspace write（由类型锁死）。 */
export type HostResultOutcome =
  | { capability: 'workspace_write'; operation: 'write'; status: 'ok'; value: WorkspaceWriteOk }
  | { capability: 'workspace_write'; operation: 'write'; status: 'denied'; error: HostDeniedError }
  | { capability: 'workspace_write'; operation: 'write'; status: 'failed'; error: HostFailedError }
  | {
      capability: 'workspace_write';
      operation: 'write';
      status: 'uncertain';
      error: HostUncertainError;
    }
  | { capability: 'workspace_read'; operation: 'exists'; status: 'ok'; value: WorkspaceExistsOk }
  | {
      capability: 'workspace_read';
      operation: 'read_file';
      status: 'ok';
      value: WorkspaceReadFileOk;
    }
  | { capability: 'workspace_read'; operation: 'list'; status: 'ok'; value: WorkspaceListOk }
  | {
      capability: 'workspace_read';
      operation: 'exists' | 'read_file' | 'list';
      status: 'denied';
      error: HostDeniedError;
    }
  | {
      capability: 'workspace_read';
      operation: 'exists' | 'read_file' | 'list';
      status: 'failed';
      error: HostFailedError;
    };

export type HostResultPayload = { operationId: SafeToken } & HostResultOutcome;

export type TurnUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  cacheReadTokens: number | null;
  cacheWriteTokens: number | null;
  costUsd: number | null;
};

export type AgentProjectionEvent =
  | { kind: 'assistant_text_delta'; delta: string }
  | { kind: 'assistant_reasoning_delta'; delta: string }
  | { kind: 'tool_started' | 'tool_progress'; toolCallId: SafeToken; toolName: ProductToolName }
  | {
      kind: 'tool_finished';
      toolCallId: SafeToken;
      toolName: ProductToolName;
      outcome: ToolOutcome;
    }
  | {
      kind: 'turn_finished';
      turn: number;
      countedTowardTurnLimit: boolean;
      usage: TurnUsage;
      stopReason: TurnStopReason;
    };

export type BudgetView = {
  turns: number;
  usd: number | null;
  turnLimit: 'open' | 'reached';
  usdLimit: 'disabled' | 'open' | 'reached' | 'unknown';
  stopReason: 'turns' | 'usd' | null;
};

export type Terminal =
  | { status: 'completed' | 'budget_stopped'; budget: BudgetView }
  | { status: 'canceled'; reason: CancelReason; budget: BudgetView }
  | {
      status: 'failed';
      error: { code: TerminalFailureCode; message: string; retryable: boolean };
      budget: BudgetView;
    }
  | { status: 'shutdown' };

// ── packet 类型 ───────────────────────────────────────────────────────────────

export type BootstrapPacket = {
  protocolVersion: 1;
  seq: number;
  sessionId: SafeToken;
  requestId: null;
  type: 'bootstrap';
  payload: BootstrapPayload;
};
export type PromptPacket = {
  protocolVersion: 1;
  seq: number;
  sessionId: SafeToken;
  requestId: SafeToken;
  type: 'prompt';
  payload: PromptPayload;
};
export type CancelPacket = {
  protocolVersion: 1;
  seq: number;
  sessionId: SafeToken;
  requestId: SafeToken;
  type: 'cancel';
  payload: CancelPayload;
};
export type HostResultPacket = {
  protocolVersion: 1;
  seq: number;
  sessionId: SafeToken;
  requestId: SafeToken;
  type: 'host_result';
  payload: HostResultPayload;
};
export type ShutdownPacket = {
  protocolVersion: 1;
  seq: number;
  sessionId: SafeToken;
  requestId: null;
  type: 'shutdown';
  payload: ShutdownPayload;
};

export type ReadyPacket = {
  protocolVersion: 1;
  seq: number;
  sessionId: SafeToken;
  requestId: null;
  type: 'ready';
  payload: ReadyPayload;
};
export type AgentEventPacket = {
  protocolVersion: 1;
  seq: number;
  sessionId: SafeToken;
  requestId: SafeToken;
  type: 'agent_event';
  payload: AgentProjectionEvent;
};
export type HostRequestPacket = {
  protocolVersion: 1;
  seq: number;
  sessionId: SafeToken;
  requestId: SafeToken;
  type: 'host_request';
  payload: WorkspaceHostRequest;
};
export type TerminalPacket = {
  protocolVersion: 1;
  seq: number;
  sessionId: SafeToken;
  requestId: SafeToken | null;
  type: 'terminal';
  payload: Terminal;
};
export type ProtocolErrorPacket = {
  protocolVersion: 1;
  seq: number;
  sessionId: SafeToken | null;
  requestId: SafeToken | null;
  type: 'protocol_error';
  payload: ProtocolErrorPayload;
};

export type HostPacket =
  | BootstrapPacket
  | PromptPacket
  | CancelPacket
  | HostResultPacket
  | ShutdownPacket;

export type SidecarPacket =
  | ReadyPacket
  | AgentEventPacket
  | HostRequestPacket
  | TerminalPacket
  | ProtocolErrorPacket;

export type ProductPacket = HostPacket | SidecarPacket;

export const HOST_PACKET_TYPES = ['bootstrap', 'prompt', 'cancel', 'host_result', 'shutdown'] as const;
export const SIDECAR_PACKET_TYPES = [
  'ready',
  'agent_event',
  'host_request',
  'terminal',
  'protocol_error',
] as const;

type Direction = 'host' | 'sidecar';

// ── codec 结果 ────────────────────────────────────────────────────────────────

/** 拒收理由：`reason` 只由本文件的字面量与字段名拼成，永不回显 raw line / payload / secret / 物理路径。 */
export type PacketRejection = { code: ProtocolErrorCode; reason: string };

export type DecodeResult<T> = { ok: true; packet: T } | ({ ok: false } & PacketRejection);
export type EncodeResult = { ok: true; line: Uint8Array } | ({ ok: false } & PacketRejection);

// ── 标量门 ────────────────────────────────────────────────────────────────────

const textEncoder = new TextEncoder();
const fatalDecoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

/** 数 UTF-8 字节，不分配缓冲；lone surrogate 按替换字符的 3 bytes 计（另有 {@link isWireString} 拦住）。 */
export function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x80) {
      bytes += 1;
      continue;
    }
    if (code < 0x800) {
      bytes += 2;
      continue;
    }
    if (code >= 0xd800 && code <= 0xdbff && index + 1 < value.length) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4;
        index += 1;
        continue;
      }
    }
    bytes += 3;
  }
  return bytes;
}

export function isSafeToken(value: unknown): boolean {
  return typeof value === 'string' && SAFE_TOKEN_PATTERN.test(value);
}

/**
 * wire 字符串门：Unicode scalar sequence 且不含 NUL。
 *
 * 与内核 `String.prototype.isWellFormed()` 同义（lib 目标为 ES2023，故不直接引其类型），
 * 另加 NUL 一条；`product-protocol.test.ts` 对二者做逐样本 parity 断言。
 */
export function isWireString(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code === 0) return false;
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = index + 1 < value.length ? value.charCodeAt(index + 1) : 0;
      if (next < 0xdc00 || next > 0xdfff) return false;
      index += 1;
      continue;
    }
    if (code >= 0xdc00 && code <= 0xdfff) return false;
  }
  return true;
}

/** 只做形状判定：POSIX 绝对、Windows drive 或 UNC。真实存在性与规范化归宿主。 */
const WINDOWS_DRIVE_PATTERN = /^[A-Za-z]:[\\/]/;
function isAbsolutePathShape(value: string): boolean {
  return value.startsWith('/') || value.startsWith('\\\\') || WINDOWS_DRIVE_PATTERN.test(value);
}

// ── 严格 JSON 扫描器 ─────────────────────────────────────────────────────────

class Rejection extends Error {
  readonly code: ProtocolErrorCode;
  readonly reason: string;

  constructor(code: ProtocolErrorCode, reason: string) {
    super(reason);
    this.name = 'Rejection';
    this.code = code;
    this.reason = reason;
  }
}

function fail(code: ProtocolErrorCode, reason: string): never {
  throw new Rejection(code, reason);
}

type JsonNode =
  | { kind: 'object'; members: Map<string, JsonNode> }
  | { kind: 'array'; items: JsonNode[] }
  | { kind: 'string'; value: string }
  | { kind: 'number'; lexeme: string; value: number }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'null' };

function isDigit(char: string | undefined): boolean {
  return char !== undefined && char >= '0' && char <= '9';
}

/**
 * RFC 8259 子集扫描器，三点严于 `JSON.parse`：
 * - 任一层重复 member 直接拒（`JSON.parse` 会静默取最后一个）；
 * - number 保留原始 lexeme，供 integer lexical gate 判定；
 * - 仅收 SP/TAB 作 token 间空白。CR 与 LF 都不放行：LF 是 delimiter，而放行裸 CR 等于
 *   接受一段作为行终止符时被明令拒绝的字节。
 */
function scanJson(text: string): JsonNode {
  let index = 0;
  let depth = 0;

  function skipWhitespace(): void {
    while (index < text.length) {
      const code = text.charCodeAt(index);
      if (code === 0x20 || code === 0x09) index += 1;
      else break;
    }
  }

  function scanEscape(): string {
    index += 1; // 跳过反斜杠
    const char = text[index];
    index += 1;
    switch (char) {
      case '"':
        return '"';
      case '\\':
        return '\\';
      case '/':
        return '/';
      case 'b':
        return '\b';
      case 'f':
        return '\f';
      case 'n':
        return '\n';
      case 'r':
        return '\r';
      case 't':
        return '\t';
      case 'u': {
        const hex = text.slice(index, index + 4);
        if (hex.length < 4 || !/^[0-9a-fA-F]{4}$/.test(hex)) {
          fail('invalid_json', 'JSON `\\u` 转义必须是四位 hex');
        }
        index += 4;
        return String.fromCharCode(Number.parseInt(hex, 16));
      }
      default:
        return fail('invalid_json', 'JSON 字符串含契约外转义');
    }
  }

  function scanString(): string {
    index += 1; // 跳过起始引号
    let out = '';
    let runStart = index;
    for (;;) {
      if (index >= text.length) fail('invalid_json', 'JSON 字符串未闭合');
      const code = text.charCodeAt(index);
      if (code === 0x22) {
        out += text.slice(runStart, index);
        index += 1;
        break;
      }
      if (code === 0x5c) {
        out += text.slice(runStart, index);
        out += scanEscape();
        runStart = index;
        continue;
      }
      if (code < 0x20) fail('invalid_json', 'JSON 字符串含未转义控制字符');
      index += 1;
    }
    if (!isWireString(out)) {
      fail('invalid_schema', 'wire 字符串必须是不含 NUL 与 lone surrogate 的 Unicode scalar 序列');
    }
    return out;
  }

  function scanNumber(): JsonNode {
    const start = index;
    if (text[index] === '-') index += 1;
    const first = text[index];
    if (first === '0') {
      index += 1;
    } else if (isDigit(first)) {
      while (isDigit(text[index])) index += 1;
    } else {
      fail('invalid_json', 'JSON number 不合语法');
    }
    if (text[index] === '.') {
      index += 1;
      if (!isDigit(text[index])) fail('invalid_json', 'JSON number 的小数部分缺数字');
      while (isDigit(text[index])) index += 1;
    }
    if (text[index] === 'e' || text[index] === 'E') {
      index += 1;
      if (text[index] === '+' || text[index] === '-') index += 1;
      if (!isDigit(text[index])) fail('invalid_json', 'JSON number 的指数部分缺数字');
      while (isDigit(text[index])) index += 1;
    }
    const lexeme = text.slice(start, index);
    return { kind: 'number', lexeme, value: Number(lexeme) };
  }

  function scanLiteral(literal: string, node: JsonNode): JsonNode {
    if (text.slice(index, index + literal.length) !== literal) {
      fail('invalid_json', 'JSON 字面量不合语法');
    }
    index += literal.length;
    return node;
  }

  function scanObject(): JsonNode {
    depth += 1;
    if (depth > MAX_JSON_DEPTH) fail('invalid_json', 'JSON 嵌套超过深度上限');
    index += 1; // '{'
    const members = new Map<string, JsonNode>();
    skipWhitespace();
    if (text[index] === '}') {
      index += 1;
      depth -= 1;
      return { kind: 'object', members };
    }
    for (;;) {
      skipWhitespace();
      if (text[index] !== '"') fail('invalid_json', 'JSON object 的 member 名必须是字符串');
      const key = scanString();
      if (members.has(key)) fail('invalid_json', 'JSON object 出现重复 member（任一层皆拒）');
      skipWhitespace();
      if (text[index] !== ':') fail('invalid_json', 'JSON object 的 member 缺少冒号');
      index += 1;
      members.set(key, scanValue());
      skipWhitespace();
      const char = text[index];
      if (char === ',') {
        index += 1;
        continue;
      }
      if (char === '}') {
        index += 1;
        depth -= 1;
        return { kind: 'object', members };
      }
      fail('invalid_json', 'JSON object 未正确闭合');
    }
  }

  function scanArray(): JsonNode {
    depth += 1;
    if (depth > MAX_JSON_DEPTH) fail('invalid_json', 'JSON 嵌套超过深度上限');
    index += 1; // '['
    const items: JsonNode[] = [];
    skipWhitespace();
    if (text[index] === ']') {
      index += 1;
      depth -= 1;
      return { kind: 'array', items };
    }
    for (;;) {
      items.push(scanValue());
      skipWhitespace();
      const char = text[index];
      if (char === ',') {
        index += 1;
        continue;
      }
      if (char === ']') {
        index += 1;
        depth -= 1;
        return { kind: 'array', items };
      }
      fail('invalid_json', 'JSON array 未正确闭合');
    }
  }

  function scanValue(): JsonNode {
    skipWhitespace();
    if (index >= text.length) fail('invalid_json', 'JSON 在期待值的位置提前结束');
    switch (text[index]) {
      case '{':
        return scanObject();
      case '[':
        return scanArray();
      case '"':
        return { kind: 'string', value: scanString() };
      case 't':
        return scanLiteral('true', { kind: 'boolean', value: true });
      case 'f':
        return scanLiteral('false', { kind: 'boolean', value: false });
      case 'n':
        return scanLiteral('null', { kind: 'null' });
      default:
        return scanNumber();
    }
  }

  const value = scanValue();
  skipWhitespace();
  if (index !== text.length) fail('invalid_json', '一行只允许一个 JSON 值，行内出现多余内容');
  return value;
}

// ── record / 标量读取器 ──────────────────────────────────────────────────────

function requireObject(node: JsonNode, label: string): Map<string, JsonNode> {
  if (node.kind !== 'object') fail('invalid_schema', `${label} 必须是 JSON object`);
  return node.members;
}

/** `additionalProperties:false` 的落地：字段集必须与契约**逐字相同**，多一个少一个都拒。 */
function closedRecord(node: JsonNode, label: string, keys: readonly string[]): Map<string, JsonNode> {
  const members = requireObject(node, label);
  if (members.size !== keys.length) {
    fail('invalid_schema', `${label} 的字段集必须与契约逐字相同（additionalProperties:false）`);
  }
  for (const key of keys) {
    if (!members.has(key)) {
      fail('invalid_schema', `${label} 缺少契约字段或含契约外字段`);
    }
  }
  return members;
}

function pick(members: Map<string, JsonNode>, key: string, label: string): JsonNode {
  const node = members.get(key);
  if (node === undefined) fail('invalid_schema', `${label} 缺少字段 \`${key}\``);
  return node;
}

function readString(node: JsonNode, label: string, maxBytes: number): string {
  if (node.kind !== 'string') fail('invalid_schema', `${label} 必须是字符串`);
  if (utf8ByteLength(node.value) > maxBytes) fail('invalid_schema', `${label} 超过 UTF-8 字节上限`);
  return node.value;
}

function readNonEmptyString(node: JsonNode, label: string, maxBytes: number): string {
  const value = readString(node, label, maxBytes);
  if (value.length === 0) fail('invalid_schema', `${label} 不得为空`);
  return value;
}

function readEnum<T extends string>(node: JsonNode, label: string, values: readonly T[]): T {
  if (node.kind !== 'string') fail('invalid_schema', `${label} 必须是字符串`);
  const found = values.find((candidate) => candidate === node.value);
  if (found === undefined) fail('invalid_schema', `${label} 不在契约闭集内`);
  return found;
}

function readSafeToken(node: JsonNode, label: string): SafeToken {
  if (node.kind !== 'string') fail('invalid_schema', `${label} 必须是 SafeToken 字符串`);
  if (!SAFE_TOKEN_PATTERN.test(node.value)) fail('invalid_schema', `${label} 不满足 SafeToken 形状`);
  return node.value;
}

function readSha256Hex(node: JsonNode, label: string): string {
  if (node.kind !== 'string') fail('invalid_schema', `${label} 必须是字符串`);
  if (!SHA256_HEX_PATTERN.test(node.value)) fail('invalid_schema', `${label} 必须是小写 64 位 hex`);
  return node.value;
}

function readBoolean(node: JsonNode, label: string): boolean {
  if (node.kind !== 'boolean') fail('invalid_schema', `${label} 必须是 boolean`);
  return node.value;
}

/** integer lexical gate：只收 `0|[1-9][0-9]*`，再按字段范围收口；不先 parse 后 coerce。 */
function readInteger(node: JsonNode, label: string, min: number, max = Number.MAX_SAFE_INTEGER): number {
  if (node.kind !== 'number') fail('invalid_schema', `${label} 必须是整数`);
  if (!INTEGER_LEXEME_PATTERN.test(node.lexeme)) {
    fail('invalid_schema', `${label} 的 JSON number lexeme 不是规范非负整数`);
  }
  if (!Number.isSafeInteger(node.value) || String(node.value) !== node.lexeme) {
    fail('invalid_schema', `${label} 超出安全整数范围`);
  }
  if (node.value < min || node.value > max) fail('invalid_schema', `${label} 超出契约范围`);
  return node.value;
}

function readNullableInteger(node: JsonNode, label: string, min: number): number | null {
  return node.kind === 'null' ? null : readInteger(node, label, min);
}

/** 非负有限数：lexeme 带负号（含 `-0`）一律拒，指数溢出到 Infinity 也拒。 */
function readNonNegativeNumber(
  node: JsonNode,
  label: string,
  options: { exclusiveMin?: boolean; max?: number } = {},
): number {
  if (node.kind !== 'number') fail('invalid_schema', `${label} 必须是数值`);
  if (node.lexeme.startsWith('-')) fail('invalid_schema', `${label} 不得为负数或 negative zero`);
  if (!Number.isFinite(node.value)) fail('invalid_schema', `${label} 必须是有限数`);
  if (options.exclusiveMin === true && node.value <= 0) fail('invalid_schema', `${label} 必须大于 0`);
  if (options.max !== undefined && node.value > options.max) fail('invalid_schema', `${label} 超出契约上限`);
  return node.value;
}

function readNullableNonNegativeNumber(node: JsonNode, label: string): number | null {
  return node.kind === 'null' ? null : readNonNegativeNumber(node, label);
}

function readArray(node: JsonNode, label: string, maxItems: number): JsonNode[] {
  if (node.kind !== 'array') fail('invalid_schema', `${label} 必须是 array`);
  if (node.items.length > maxItems) fail('invalid_schema', `${label} 超过条目上限`);
  return node.items;
}

/**
 * 逻辑路径只验**形状**（非空字符串 + 与 framing 相关的字节上限）。
 * segment 字符集、`.`/`..`、Windows 保留名与 `.md` 后缀归 `workspace-write-env` 与 Rust host。
 */
function readLogicalPath(node: JsonNode, label: string): string {
  return readNonEmptyString(node, label, MAX_LOGICAL_PATH_BYTES);
}

// ── payload 校验 ──────────────────────────────────────────────────────────────

function readBootstrapPayload(node: JsonNode): BootstrapPayload {
  const members = closedRecord(node, 'bootstrap payload', [
    'containerId',
    'grantId',
    'caseRoot',
    'provider',
    'limits',
    'resume',
  ]);
  const containerId = readSafeToken(pick(members, 'containerId', 'bootstrap'), 'containerId');
  const grantId = readSafeToken(pick(members, 'grantId', 'bootstrap'), 'grantId');
  const caseRoot = readNonEmptyString(pick(members, 'caseRoot', 'bootstrap'), 'caseRoot', MAX_CASE_ROOT_BYTES);
  if (!isAbsolutePathShape(caseRoot)) fail('invalid_schema', 'caseRoot 必须是平台绝对路径');

  const providerMembers = closedRecord(pick(members, 'provider', 'bootstrap'), 'provider', [
    'id',
    'modelId',
    'apiKey',
  ]);
  const providerId = readEnum(pick(providerMembers, 'id', 'provider'), 'provider.id', ['deepseek'] as const);
  const modelId = readString(pick(providerMembers, 'modelId', 'provider'), 'provider.modelId', MAX_MODEL_ID_BYTES);
  if (modelId.trim().length === 0) fail('invalid_schema', 'provider.modelId trim 后不得为空');
  const apiKey = readNonEmptyString(pick(providerMembers, 'apiKey', 'provider'), 'provider.apiKey', MAX_API_KEY_BYTES);

  const limitMembers = closedRecord(pick(members, 'limits', 'bootstrap'), 'limits', ['maxTurns', 'maxUsd']);
  const maxTurns = readInteger(pick(limitMembers, 'maxTurns', 'limits'), 'limits.maxTurns', 1, MAX_TURNS_LIMIT);
  const maxUsdNode = pick(limitMembers, 'maxUsd', 'limits');
  const maxUsd =
    maxUsdNode.kind === 'null'
      ? null
      : readNonNegativeNumber(maxUsdNode, 'limits.maxUsd', { exclusiveMin: true, max: MAX_USD_LIMIT });

  const resumeMembers = closedRecord(pick(members, 'resume', 'bootstrap'), 'resume', [
    'kind',
    'leg',
    'priorObservedTurns',
    'priorTurns',
    'priorUsd',
  ]);
  const kind = readEnum(pick(resumeMembers, 'kind', 'resume'), 'resume.kind', RESUME_KINDS);
  const leg = readInteger(pick(resumeMembers, 'leg', 'resume'), 'resume.leg', 1);
  const priorObservedTurns = readInteger(
    pick(resumeMembers, 'priorObservedTurns', 'resume'),
    'resume.priorObservedTurns',
    0,
  );
  const priorTurns = readInteger(pick(resumeMembers, 'priorTurns', 'resume'), 'resume.priorTurns', 0);
  const priorUsd = readNullableNonNegativeNumber(pick(resumeMembers, 'priorUsd', 'resume'), 'resume.priorUsd');

  // 以下四条是「单包即可判定」的自洽门。跨 leg 的精确 fold 与 previous+1 归 Rust journal。
  if (kind === 'fresh') {
    if (leg !== 1 || priorObservedTurns !== 0 || priorTurns !== 0 || priorUsd !== 0) {
      fail('invalid_schema', 'fresh 必须是 leg:1 且 prior 三项全零');
    }
  } else {
    if (leg < 2) fail('invalid_schema', 'after_interruption 的 leg 至少为 2');
    if (priorObservedTurns < priorTurns) {
      fail('invalid_schema', 'priorObservedTurns 不得小于 priorTurns');
    }
  }
  if (maxUsd !== null && priorUsd === null) {
    fail('invalid_schema', 'maxUsd 已启用时 priorUsd 不得为未知');
  }
  if (priorTurns >= maxTurns) {
    fail('invalid_schema', '历史 counted turns 已达 maxTurns，不得启动新 leg');
  }
  if (maxUsd !== null && priorUsd !== null && priorUsd >= maxUsd) {
    fail('invalid_schema', '历史费用已达 maxUsd，不得启动新 leg');
  }

  return {
    containerId,
    grantId,
    caseRoot,
    provider: { id: providerId, modelId, apiKey },
    limits: { maxTurns, maxUsd },
    resume: { kind, leg, priorObservedTurns, priorTurns, priorUsd },
  };
}

function readPromptPayload(node: JsonNode): PromptPayload {
  const members = closedRecord(node, 'prompt payload', ['text']);
  const text = readString(pick(members, 'text', 'prompt'), 'prompt.text', MAX_TEXT_BYTES);
  if (text.trim().length === 0) fail('invalid_schema', 'prompt.text trim 后不得为空');
  return { text };
}

function readCancelPayload(node: JsonNode): CancelPayload {
  const members = closedRecord(node, 'cancel payload', ['reason']);
  return { reason: readEnum(pick(members, 'reason', 'cancel'), 'cancel.reason', CANCEL_REASONS) };
}

function readShutdownPayload(node: JsonNode): ShutdownPayload {
  const members = closedRecord(node, 'shutdown payload', ['reason']);
  return {
    reason: readEnum(pick(members, 'reason', 'shutdown'), 'shutdown.reason', ['host_shutdown'] as const),
  };
}

function readWriteArguments(node: JsonNode): WorkspaceWriteArguments {
  const members = closedRecord(node, 'workspace_write arguments', [
    'logicalPath',
    'content',
    'contentSha256',
    'byteLength',
  ]);
  const logicalPath = readLogicalPath(pick(members, 'logicalPath', 'arguments'), 'arguments.logicalPath');
  const content = readString(pick(members, 'content', 'arguments'), 'arguments.content', MAX_TEXT_BYTES);
  const contentSha256 = readSha256Hex(pick(members, 'contentSha256', 'arguments'), 'arguments.contentSha256');
  const byteLength = readInteger(pick(members, 'byteLength', 'arguments'), 'arguments.byteLength', 0, MAX_TEXT_BYTES);
  if (byteLength !== utf8ByteLength(content)) {
    fail('invalid_schema', 'arguments.byteLength 必须等于 content 的 UTF-8 实长');
  }
  return { logicalPath, content, contentSha256, byteLength };
}

function readReadArguments(node: JsonNode): WorkspaceReadArguments {
  const members = closedRecord(node, 'workspace_read arguments', ['operation', 'logicalPath']);
  const operation = readEnum(pick(members, 'operation', 'arguments'), 'arguments.operation', [
    'exists',
    'read_file',
    'list',
  ] as const);
  const logicalPath = readLogicalPath(pick(members, 'logicalPath', 'arguments'), 'arguments.logicalPath');
  return operation === 'list' ? { operation, logicalPath } : { operation, logicalPath };
}

function readHostRequestPayload(node: JsonNode): WorkspaceHostRequest {
  const members = closedRecord(node, 'host_request payload', [
    'operationId',
    'proposalHash',
    'capability',
    'arguments',
  ]);
  const operationId = readSafeToken(pick(members, 'operationId', 'host_request'), 'operationId');
  const proposalHash = readSha256Hex(pick(members, 'proposalHash', 'host_request'), 'proposalHash');
  const capability = readEnum(pick(members, 'capability', 'host_request'), 'host_request.capability', [
    'workspace_write',
    'workspace_read',
  ] as const);
  const argumentsNode = pick(members, 'arguments', 'host_request');
  return capability === 'workspace_write'
    ? { operationId, proposalHash, capability, arguments: readWriteArguments(argumentsNode) }
    : { operationId, proposalHash, capability, arguments: readReadArguments(argumentsNode) };
}

function readListEntry(node: JsonNode): WorkspaceListEntry {
  const members = closedRecord(node, 'list entry', ['name', 'kind', 'byteLength', 'mtimeMs']);
  const name = readNonEmptyString(pick(members, 'name', 'entry'), 'entry.name', MAX_SEGMENT_BYTES);
  const kind = readEnum(pick(members, 'kind', 'entry'), 'entry.kind', ['file', 'directory', 'symlink'] as const);
  const byteLength = readNullableInteger(pick(members, 'byteLength', 'entry'), 'entry.byteLength', 0);
  const mtimeMs = readNullableInteger(pick(members, 'mtimeMs', 'entry'), 'entry.mtimeMs', 0);
  if (kind === 'file' && byteLength === null) fail('invalid_schema', 'file 条目必须给出 byteLength');
  if (kind !== 'file' && byteLength !== null) fail('invalid_schema', 'directory/symlink 条目的 byteLength 必须为 null');
  return { name, kind, byteLength, mtimeMs };
}

function readHostResultPayload(node: JsonNode): HostResultPayload {
  const probe = requireObject(node, 'host_result payload');
  const status = readEnum(pick(probe, 'status', 'host_result'), 'host_result.status', HOST_RESULT_STATUSES);
  const members = closedRecord(node, 'host_result payload', [
    'operationId',
    'capability',
    'operation',
    'status',
    status === 'ok' ? 'value' : 'error',
  ]);

  const operationId = readSafeToken(pick(members, 'operationId', 'host_result'), 'operationId');
  const capability = readEnum(pick(members, 'capability', 'host_result'), 'host_result.capability', [
    'workspace_write',
    'workspace_read',
  ] as const);
  const operation = readEnum(pick(members, 'operation', 'host_result'), 'host_result.operation', WORKSPACE_OPERATIONS);

  if (capability === 'workspace_write' && operation !== 'write') {
    fail('invalid_schema', 'workspace_write 的 operation 固定为 write');
  }
  if (capability === 'workspace_read' && operation === 'write') {
    fail('invalid_schema', 'workspace_read 的 operation 不得为 write');
  }
  if (status === 'uncertain' && capability !== 'workspace_write') {
    fail('invalid_schema', 'uncertain 只允许 workspace write');
  }

  if (status !== 'ok') {
    const errorNode = pick(members, 'error', 'host_result');
    const errorMembers = closedRecord(errorNode, 'host_result error', ['code', 'message']);
    const message = readString(pick(errorMembers, 'message', 'error'), 'error.message', MAX_HOST_ERROR_MESSAGE_BYTES);
    if (status === 'denied') {
      const code = readEnum(pick(errorMembers, 'code', 'error'), 'error.code', HOST_DENIED_CODES);
      return capability === 'workspace_write'
        ? { operationId, capability, operation: 'write', status, error: { code, message } }
        : { operationId, capability, operation: operation as 'exists' | 'read_file' | 'list', status, error: { code, message } };
    }
    if (status === 'failed') {
      const code = readEnum(pick(errorMembers, 'code', 'error'), 'error.code', HOST_FAILURE_CODES);
      return capability === 'workspace_write'
        ? { operationId, capability, operation: 'write', status, error: { code, message } }
        : { operationId, capability, operation: operation as 'exists' | 'read_file' | 'list', status, error: { code, message } };
    }
    const code = readEnum(pick(errorMembers, 'code', 'error'), 'error.code', ['durability_unknown'] as const);
    return { operationId, capability: 'workspace_write', operation: 'write', status, error: { code, message } };
  }

  const valueNode = pick(members, 'value', 'host_result');
  if (capability === 'workspace_write') {
    const valueMembers = closedRecord(valueNode, 'write ok value', [
      'logicalPath',
      'disposition',
      'contentSha256',
      'byteLength',
    ]);
    return {
      operationId,
      capability,
      operation: 'write',
      status,
      value: {
        logicalPath: readLogicalPath(pick(valueMembers, 'logicalPath', 'value'), 'value.logicalPath'),
        disposition: readEnum(pick(valueMembers, 'disposition', 'value'), 'value.disposition', [
          'created',
          'overwritten',
        ] as const),
        contentSha256: readSha256Hex(pick(valueMembers, 'contentSha256', 'value'), 'value.contentSha256'),
        byteLength: readInteger(pick(valueMembers, 'byteLength', 'value'), 'value.byteLength', 0, MAX_TEXT_BYTES),
      },
    };
  }

  if (operation === 'exists') {
    const valueMembers = closedRecord(valueNode, 'exists ok value', ['logicalPath', 'exists']);
    return {
      operationId,
      capability,
      operation,
      status,
      value: {
        logicalPath: readLogicalPath(pick(valueMembers, 'logicalPath', 'value'), 'value.logicalPath'),
        exists: readBoolean(pick(valueMembers, 'exists', 'value'), 'value.exists'),
      },
    };
  }

  if (operation === 'read_file') {
    const valueMembers = closedRecord(valueNode, 'read_file ok value', [
      'logicalPath',
      'content',
      'contentSha256',
      'byteLength',
    ]);
    const content = readString(pick(valueMembers, 'content', 'value'), 'value.content', MAX_TEXT_BYTES);
    const byteLength = readInteger(pick(valueMembers, 'byteLength', 'value'), 'value.byteLength', 0, MAX_TEXT_BYTES);
    if (byteLength !== utf8ByteLength(content)) {
      fail('invalid_schema', 'value.byteLength 必须等于 content 的 UTF-8 实长');
    }
    return {
      operationId,
      capability,
      operation,
      status,
      value: {
        logicalPath: readLogicalPath(pick(valueMembers, 'logicalPath', 'value'), 'value.logicalPath'),
        content,
        contentSha256: readSha256Hex(pick(valueMembers, 'contentSha256', 'value'), 'value.contentSha256'),
        byteLength,
      },
    };
  }

  const valueMembers = closedRecord(valueNode, 'list ok value', ['logicalPath', 'entries']);
  return {
    operationId,
    capability,
    operation: 'list',
    status,
    value: {
      logicalPath: readLogicalPath(pick(valueMembers, 'logicalPath', 'value'), 'value.logicalPath'),
      entries: readArray(pick(valueMembers, 'entries', 'value'), 'value.entries', MAX_LIST_ENTRIES).map(readListEntry),
    },
  };
}

function readReadyPayload(node: JsonNode): ReadyPayload {
  const members = closedRecord(node, 'ready payload', ['capabilities']);
  const items = readArray(pick(members, 'capabilities', 'ready'), 'ready.capabilities', CAPABILITIES.length);
  const capabilities = items.map((item) => readEnum(item, 'ready.capabilities[]', CAPABILITIES));
  for (let index = 1; index < capabilities.length; index += 1) {
    if (capabilities[index - 1] >= capabilities[index]) {
      fail('invalid_schema', 'ready.capabilities 必须去重并按字典序升序');
    }
  }
  return { capabilities };
}

function readUsage(node: JsonNode): TurnUsage {
  const members = closedRecord(node, 'turn usage', [
    'inputTokens',
    'outputTokens',
    'cacheReadTokens',
    'cacheWriteTokens',
    'costUsd',
  ]);
  return {
    inputTokens: readNullableInteger(pick(members, 'inputTokens', 'usage'), 'usage.inputTokens', 0),
    outputTokens: readNullableInteger(pick(members, 'outputTokens', 'usage'), 'usage.outputTokens', 0),
    cacheReadTokens: readNullableInteger(pick(members, 'cacheReadTokens', 'usage'), 'usage.cacheReadTokens', 0),
    cacheWriteTokens: readNullableInteger(pick(members, 'cacheWriteTokens', 'usage'), 'usage.cacheWriteTokens', 0),
    costUsd: readNullableNonNegativeNumber(pick(members, 'costUsd', 'usage'), 'usage.costUsd'),
  };
}

function readAgentEventPayload(node: JsonNode): AgentProjectionEvent {
  const probe = requireObject(node, 'agent_event payload');
  const kind = readEnum(pick(probe, 'kind', 'agent_event'), 'agent_event.kind', [
    'assistant_text_delta',
    'assistant_reasoning_delta',
    'tool_started',
    'tool_progress',
    'tool_finished',
    'turn_finished',
  ] as const);

  if (kind === 'assistant_text_delta' || kind === 'assistant_reasoning_delta') {
    const members = closedRecord(node, 'delta event', ['kind', 'delta']);
    const delta = readNonEmptyString(pick(members, 'delta', 'event'), 'event.delta', MAX_DELTA_BYTES);
    return { kind, delta };
  }

  if (kind === 'tool_started' || kind === 'tool_progress') {
    const members = closedRecord(node, 'tool event', ['kind', 'toolCallId', 'toolName']);
    return {
      kind,
      toolCallId: readSafeToken(pick(members, 'toolCallId', 'event'), 'event.toolCallId'),
      toolName: readEnum(pick(members, 'toolName', 'event'), 'event.toolName', TOOL_NAMES),
    };
  }

  if (kind === 'tool_finished') {
    const members = closedRecord(node, 'tool_finished event', ['kind', 'toolCallId', 'toolName', 'outcome']);
    return {
      kind,
      toolCallId: readSafeToken(pick(members, 'toolCallId', 'event'), 'event.toolCallId'),
      toolName: readEnum(pick(members, 'toolName', 'event'), 'event.toolName', TOOL_NAMES),
      outcome: readEnum(pick(members, 'outcome', 'event'), 'event.outcome', TOOL_OUTCOMES),
    };
  }

  const members = closedRecord(node, 'turn_finished event', [
    'kind',
    'turn',
    'countedTowardTurnLimit',
    'usage',
    'stopReason',
  ]);
  const turn = readInteger(pick(members, 'turn', 'event'), 'event.turn', 1);
  const countedTowardTurnLimit = readBoolean(
    pick(members, 'countedTowardTurnLimit', 'event'),
    'event.countedTowardTurnLimit',
  );
  const usage = readUsage(pick(members, 'usage', 'event'));
  const stopReason = readEnum(pick(members, 'stopReason', 'event'), 'event.stopReason', TURN_STOP_REASONS);

  // 上游合成的零不采信：aborted/error 的回合既不计入限额，usage 也必须全 null。
  const interrupted = stopReason === 'aborted' || stopReason === 'error';
  if (countedTowardTurnLimit === interrupted) {
    fail('invalid_schema', 'aborted/error 回合固定不计入 turn 限额，其余 stopReason 固定计入');
  }
  if (
    interrupted &&
    (usage.inputTokens !== null ||
      usage.outputTokens !== null ||
      usage.cacheReadTokens !== null ||
      usage.cacheWriteTokens !== null ||
      usage.costUsd !== null)
  ) {
    fail('invalid_schema', 'aborted/error 回合的 usage 字段必须全部为 null');
  }

  return { kind, turn, countedTowardTurnLimit, usage, stopReason };
}

function readBudgetView(node: JsonNode): BudgetView {
  const members = closedRecord(node, 'budget', ['turns', 'usd', 'turnLimit', 'usdLimit', 'stopReason']);
  const stopReasonNode = pick(members, 'stopReason', 'budget');
  return {
    turns: readInteger(pick(members, 'turns', 'budget'), 'budget.turns', 0),
    usd: readNullableNonNegativeNumber(pick(members, 'usd', 'budget'), 'budget.usd'),
    turnLimit: readEnum(pick(members, 'turnLimit', 'budget'), 'budget.turnLimit', ['open', 'reached'] as const),
    usdLimit: readEnum(pick(members, 'usdLimit', 'budget'), 'budget.usdLimit', [
      'disabled',
      'open',
      'reached',
      'unknown',
    ] as const),
    stopReason:
      stopReasonNode.kind === 'null'
        ? null
        : readEnum(stopReasonNode, 'budget.stopReason', ['turns', 'usd'] as const),
  };
}

function readTerminalPayload(node: JsonNode): Terminal {
  const probe = requireObject(node, 'terminal payload');
  const status = readEnum(pick(probe, 'status', 'terminal'), 'terminal.status', [
    'completed',
    'budget_stopped',
    'canceled',
    'failed',
    'shutdown',
  ] as const);

  if (status === 'shutdown') {
    closedRecord(node, 'shutdown terminal', ['status']);
    return { status };
  }

  if (status === 'canceled') {
    const members = closedRecord(node, 'canceled terminal', ['status', 'reason', 'budget']);
    const budget = readBudgetView(pick(members, 'budget', 'terminal'));
    if (budget.stopReason !== null) fail('invalid_schema', '非 budget terminal 的 budget.stopReason 必须为 null');
    return {
      status,
      reason: readEnum(pick(members, 'reason', 'terminal'), 'terminal.reason', CANCEL_REASONS),
      budget,
    };
  }

  if (status === 'failed') {
    const members = closedRecord(node, 'failed terminal', ['status', 'error', 'budget']);
    const errorMembers = closedRecord(pick(members, 'error', 'terminal'), 'terminal error', [
      'code',
      'message',
      'retryable',
    ]);
    const budget = readBudgetView(pick(members, 'budget', 'terminal'));
    if (budget.stopReason !== null) fail('invalid_schema', '非 budget terminal 的 budget.stopReason 必须为 null');
    return {
      status,
      error: {
        code: readEnum(pick(errorMembers, 'code', 'error'), 'error.code', TERMINAL_FAILURE_CODES),
        message: readString(pick(errorMembers, 'message', 'error'), 'error.message', MAX_TERMINAL_MESSAGE_BYTES),
        retryable: readBoolean(pick(errorMembers, 'retryable', 'error'), 'error.retryable'),
      },
      budget,
    };
  }

  const members = closedRecord(node, 'terminal', ['status', 'budget']);
  const budget = readBudgetView(pick(members, 'budget', 'terminal'));
  if (status === 'budget_stopped') {
    if (budget.stopReason === null) fail('invalid_schema', 'budget_stopped 必须给出 budget.stopReason');
  } else if (budget.stopReason !== null) {
    fail('invalid_schema', '非 budget terminal 的 budget.stopReason 必须为 null');
  }
  return { status, budget };
}

function readProtocolErrorPayload(node: JsonNode): ProtocolErrorPayload {
  const members = closedRecord(node, 'protocol_error payload', ['code', 'message', 'fatal']);
  const fatal = readBoolean(pick(members, 'fatal', 'protocol_error'), 'protocol_error.fatal');
  if (!fatal) fail('invalid_schema', 'protocol_error.fatal 恒为 true');
  return {
    code: readEnum(pick(members, 'code', 'protocol_error'), 'protocol_error.code', PROTOCOL_ERROR_CODES),
    message: readString(pick(members, 'message', 'protocol_error'), 'protocol_error.message', MAX_TERMINAL_MESSAGE_BYTES),
    fatal: true,
  };
}

// ── packet 组装 ──────────────────────────────────────────────────────────────

/** `requestId` 恒为 null 的 type；terminal 视 status 而定，protocol_error 两可。 */
const NULL_REQUEST_TYPES: readonly string[] = ['bootstrap', 'ready', 'shutdown'];

function decodePacketNode(node: JsonNode, direction: Direction): ProductPacket {
  const members = closedRecord(node, 'packet', [
    'protocolVersion',
    'seq',
    'sessionId',
    'requestId',
    'type',
    'payload',
  ]);

  const versionNode = pick(members, 'protocolVersion', 'packet');
  if (versionNode.kind !== 'number' || !INTEGER_LEXEME_PATTERN.test(versionNode.lexeme)) {
    fail('invalid_schema', 'protocolVersion 必须是规范整数');
  }
  if (versionNode.value !== PROTOCOL_VERSION) {
    fail('unsupported_version', 'protocolVersion 不是本协议版本');
  }

  const seq = readInteger(pick(members, 'seq', 'packet'), 'seq', 1);

  const typeNode = pick(members, 'type', 'packet');
  if (typeNode.kind !== 'string') fail('invalid_schema', 'type 必须是字符串');
  const allowed: readonly string[] = direction === 'host' ? HOST_PACKET_TYPES : SIDECAR_PACKET_TYPES;
  if (!allowed.includes(typeNode.value)) fail('unknown_type', 'type 不在本方向的闭集内');
  const type = typeNode.value;

  const sessionNode = pick(members, 'sessionId', 'packet');
  const sessionId = sessionNode.kind === 'null' ? null : readSafeToken(sessionNode, 'sessionId');
  if (sessionId === null && type !== 'protocol_error') {
    fail('invalid_schema', 'sessionId:null 只允许 bootstrap 未成立时的 protocol_error');
  }

  const requestNode = pick(members, 'requestId', 'packet');
  const requestId = requestNode.kind === 'null' ? null : readSafeToken(requestNode, 'requestId');

  const payloadNode = pick(members, 'payload', 'packet');
  const base = { protocolVersion: PROTOCOL_VERSION as 1, seq };

  function requireRequestId(): SafeToken {
    if (requestId === null) fail('invalid_schema', '本 type 的 requestId 不得为 null');
    return requestId;
  }
  function requireNullRequestId(): void {
    if (requestId !== null) fail('invalid_schema', '本 type 的 requestId 必须为 null');
  }
  function requireSessionId(): SafeToken {
    if (sessionId === null) fail('invalid_schema', 'sessionId 不得为 null');
    return sessionId;
  }

  if (NULL_REQUEST_TYPES.includes(type)) requireNullRequestId();

  switch (type) {
    case 'bootstrap':
      return {
        ...base,
        sessionId: requireSessionId(),
        requestId: null,
        type,
        payload: readBootstrapPayload(payloadNode),
      };
    case 'prompt':
      return {
        ...base,
        sessionId: requireSessionId(),
        requestId: requireRequestId(),
        type,
        payload: readPromptPayload(payloadNode),
      };
    case 'cancel':
      return {
        ...base,
        sessionId: requireSessionId(),
        requestId: requireRequestId(),
        type,
        payload: readCancelPayload(payloadNode),
      };
    case 'host_result':
      return {
        ...base,
        sessionId: requireSessionId(),
        requestId: requireRequestId(),
        type,
        payload: readHostResultPayload(payloadNode),
      };
    case 'shutdown':
      return {
        ...base,
        sessionId: requireSessionId(),
        requestId: null,
        type,
        payload: readShutdownPayload(payloadNode),
      };
    case 'ready':
      return {
        ...base,
        sessionId: requireSessionId(),
        requestId: null,
        type,
        payload: readReadyPayload(payloadNode),
      };
    case 'agent_event':
      return {
        ...base,
        sessionId: requireSessionId(),
        requestId: requireRequestId(),
        type,
        payload: readAgentEventPayload(payloadNode),
      };
    case 'host_request':
      return {
        ...base,
        sessionId: requireSessionId(),
        requestId: requireRequestId(),
        type,
        payload: readHostRequestPayload(payloadNode),
      };
    case 'terminal': {
      const payload = readTerminalPayload(payloadNode);
      if (payload.status === 'shutdown') requireNullRequestId();
      else requireRequestId();
      return { ...base, sessionId: requireSessionId(), requestId, type, payload };
    }
    default:
      return {
        ...base,
        sessionId,
        requestId,
        type: 'protocol_error',
        payload: readProtocolErrorPayload(payloadNode),
      };
  }
}

// ── 入口 ─────────────────────────────────────────────────────────────────────

function decodeUtf8Strict(line: Uint8Array): string {
  try {
    return fatalDecoder.decode(line);
  } catch {
    fail('invalid_json', '行不是合法 UTF-8（fatal 解码，不做 U+FFFD 替换）');
  }
}

/**
 * 解一行 packet。`line` 是**不含**结尾 LF 的行内容；framing 预算按 `line + LF` 计。
 * 顺序固定：字节 framing → 行形状 → fatal UTF-8 → 严格 JSON → 闭集校验。
 */
function decodePacketLine(line: Uint8Array, direction: Direction): DecodeResult<ProductPacket> {
  try {
    if (line.byteLength + 1 > MAX_PACKET_BYTES) {
      fail('packet_too_large', '单 packet 连结尾 LF 超过字节上限');
    }
    if (line.byteLength === 0) fail('invalid_json', '空行不是 packet');
    if (line[line.byteLength - 1] === 0x0d) {
      fail('invalid_json', '行以 CR 结尾：delimiter 只收单字节 LF，CRLF 不放行');
    }
    if (line.byteLength >= 3 && line[0] === 0xef && line[1] === 0xbb && line[2] === 0xbf) {
      fail('invalid_json', '行带 UTF-8 BOM');
    }
    if (line.includes(LINE_DELIMITER)) fail('invalid_json', '行内出现 LF');
    const packet = decodePacketNode(scanJson(decodeUtf8Strict(line)), direction);
    return { ok: true, packet };
  } catch (error) {
    if (error instanceof Rejection) return { ok: false, code: error.code, reason: error.reason };
    throw error;
  }
}

export function decodeHostPacketLine(line: Uint8Array): DecodeResult<HostPacket> {
  return decodePacketLine(line, 'host') as DecodeResult<HostPacket>;
}

export function decodeSidecarPacketLine(line: Uint8Array): DecodeResult<SidecarPacket> {
  return decodePacketLine(line, 'sidecar') as DecodeResult<SidecarPacket>;
}

/**
 * 编一行 packet：序列化 → **按编码后实际字节**复核 framing → 回灌本 decoder 自检 → 补 LF。
 *
 * 尺寸门放在 schema 自检之前，正是 ADR「不能只检查 raw payload」的落点：
 * 写流之前先知道这一行装不装得下，再谈它是不是合法。
 */
export function encodePacketLine(packet: ProductPacket): EncodeResult {
  const type: unknown = (packet as { type?: unknown }).type;
  const isHost = typeof type === 'string' && (HOST_PACKET_TYPES as readonly string[]).includes(type);
  const isSidecar = typeof type === 'string' && (SIDECAR_PACKET_TYPES as readonly string[]).includes(type);
  if (!isHost && !isSidecar) {
    return { ok: false, code: 'unknown_type', reason: 'type 不在任一方向的闭集内' };
  }

  let text: string;
  try {
    text = JSON.stringify(packet);
  } catch {
    return { ok: false, code: 'invalid_schema', reason: 'packet 不可 JSON 序列化' };
  }
  if (typeof text !== 'string') {
    return { ok: false, code: 'invalid_schema', reason: 'packet 序列化结果不是 JSON 文本' };
  }

  const body = textEncoder.encode(text);
  if (body.byteLength + 1 > MAX_PACKET_BYTES) {
    return { ok: false, code: 'packet_too_large', reason: '编码后字节连结尾 LF 超过单 packet 上限' };
  }

  const verified = decodePacketLine(body, isHost ? 'host' : 'sidecar');
  if (!verified.ok) return verified;

  const line = new Uint8Array(body.byteLength + 1);
  line.set(body);
  line[body.byteLength] = LINE_DELIMITER;
  return { ok: true, line };
}
