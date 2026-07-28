/**
 * workspace 写面虚拟容器 + 极薄 binder（ADR-022 决定六，能力阶梯 A0.5）。
 *
 * 这一层只做**提案**：把上游 `createWriteTool()` 的一次 `writeFile` 转成一枚
 * host request，物理 effect 由受信 Rust 宿主在 app-data workspace 兑现。故本文件
 * 与本包其余生产码一样**零 Node fs 写、零 child_process**（ADR-018 门 R3 静态锁死），
 * 也不引入第二份工具 schema——工具定义直接实例化上游那一件，不 fork、不复制 execute。
 *
 * 三条边界写在这里，不散落到调用点：
 * - **路径**：逻辑根固定 `/workspace`，采用 ADR-022 六-B.2 的跨平台 segment grammar；
 * - **文件型**：最终 basename 按 ASCII 大小写不敏感只收 `.md`，在分配 operation 前拒绝；
 * - **容量与良构**：UTF-8 上限 131,072 bytes，hash/byteLength 一律在良构门之后从原 content 算。
 *
 * 本文件只到 package/headless proof：没有 Rust host、没有 loop journal、没有授权账本，
 * 因此不构成「写面已放行」，也不更新 `docs/status/current.md`。
 */

import {
  createWriteTool,
  ExecutionError,
  FileError,
  err,
  ok,
  type AgentTool,
  type ExecutionEnv,
  type FileError as FileErrorType,
  type Result,
  type WriteToolInput,
} from '@earendil-works/pi-agent-core';

/** 模型可见的可写逻辑根。wire 上的 `logicalPath` 不带这个前缀（ADR-022 六-B.2）。 */
export const WORKSPACE_LOGICAL_ROOT = '/workspace';
export const MAX_WORKSPACE_PATH_BYTES = 1024;
export const MAX_WORKSPACE_SEGMENT_BYTES = 255;
export const MAX_WORKSPACE_CONTENT_BYTES = 131_072;
export const WORKSPACE_WRITE_PROPOSAL_DOMAIN = 'courtwork.pi.workspace_write.v1';

const WORKSPACE_PREFIX = `${WORKSPACE_LOGICAL_ROOT}/`;
const MARKDOWN_SUFFIX = '.md';

/** 控制字符、DEL 与 Windows/POSIX 双向不安全字符。`/` 是分隔符，不会出现在段内。 */
// eslint-disable-next-line no-control-regex
const FORBIDDEN_SEGMENT_CHARS = /[\u0000-\u001F\u007F<>:"\\|?*]/;
const WINDOWS_RESERVED_STEM = /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;

/**
 * 上游 `resolveToolPath` 会静默折叠的 Unicode 空格（`path-utils.js` 实测）。
 * 落在这里的路径会被改写成另一个真实目标，故必须在调上游**之前**拒绝。
 */
const UPSTREAM_FOLDED_SPACES = /[\u00A0\u2000-\u200A\u202F\u205F\u3000]/;

const READ_DENIED = 'workspace 写面容器不实现读取：`/workspace` 回读走 read 工具的双根路由（PI-WORKSPACE-READ-1）';
const MUTATION_DENIED = 'workspace 只允许覆盖式 write：append/remove/rename/临时文件均未授权（ADR-022 决定六）';
const SHELL_DENIED = 'bash 面未授权：pi lane 的 shell 面锁隔离升档，与 workspace 写面无关';

// ---------------------------------------------------------------------------
// 逻辑路径
// ---------------------------------------------------------------------------

export type WorkspacePathResolution =
  | { readonly ok: true; readonly logicalPath: string; readonly virtualPath: string }
  | { readonly ok: false; readonly code: 'invalid_path'; readonly reason: string };

const utf8ByteLength = (value: string): number => new TextEncoder().encode(value).byteLength;

const rejectPath = (reason: string): WorkspacePathResolution => ({ ok: false, code: 'invalid_path', reason });

/**
 * 把模型给出的路径归一到 workspace 逻辑路径。
 *
 * 接受两形：workspace 相对路径，或虚拟绝对 `/workspace/<safe-relative-path>`；
 * 二者归一到同一 `logicalPath`。`/workspace` 根本身、`/case` 与其他绝对路径一律拒绝。
 * 跨 session/容器不靠这里判定——logicalPath 永远相对本 session 的 workspace，
 * 物理根只在 Rust 侧，`..` 段在此已被拒。
 */
export function resolveWorkspaceLogicalPath(input: string): WorkspacePathResolution {
  if (typeof input !== 'string' || input.length === 0) return rejectPath('路径为空');
  if (input === WORKSPACE_LOGICAL_ROOT) return rejectPath('`/workspace` 根本身不是可写目标');

  let relative: string;
  if (input.startsWith(WORKSPACE_PREFIX)) relative = input.slice(WORKSPACE_PREFIX.length);
  else if (input.startsWith('/')) return rejectPath('只接受 workspace 相对路径或 `/workspace/` 下的虚拟绝对路径');
  else relative = input;

  if (relative.length === 0) return rejectPath('`/workspace/` 未指向具体文件');

  const segments = relative.split('/');
  for (const segment of segments) {
    if (segment.length === 0) return rejectPath('路径含空段');
    if (segment === '.' || segment === '..') return rejectPath('路径含 `.` 或 `..` 段');
    if (FORBIDDEN_SEGMENT_CHARS.test(segment)) return rejectPath('路径段含控制字符、DEL 或跨平台不安全字符');
    if (segment.endsWith(' ') || segment.endsWith('.')) return rejectPath('路径段不得以空格或 `.` 结尾');
    if (WINDOWS_RESERVED_STEM.test(segment.split('.')[0])) return rejectPath('路径段命中 Windows 保留设备名');
    if (utf8ByteLength(segment) > MAX_WORKSPACE_SEGMENT_BYTES) {
      return rejectPath(`单个路径段超过 ${MAX_WORKSPACE_SEGMENT_BYTES} UTF-8 bytes`);
    }
  }

  const logicalPath = segments.join('/');
  if (utf8ByteLength(logicalPath) > MAX_WORKSPACE_PATH_BYTES) {
    return rejectPath(`逻辑路径超过 ${MAX_WORKSPACE_PATH_BYTES} UTF-8 bytes`);
  }
  return { ok: true, logicalPath, virtualPath: `${WORKSPACE_LOGICAL_ROOT}/${logicalPath}` };
}

/** 只按 ASCII 折大小写：`.ｍｄ` 等全角同形不是 Markdown 扩展名。 */
const asciiLower = (value: string): string => value.replace(/[A-Z]/g, (char) => char.toLowerCase());

function isMarkdownBasename(logicalPath: string): boolean {
  const basename = logicalPath.slice(logicalPath.lastIndexOf('/') + 1);
  // `.md` 本身没有 artifact stem；ADR-022 要求扩展名前至少一个字符。
  if (basename.length <= MARKDOWN_SUFFIX.length) return false;
  return asciiLower(basename.slice(-MARKDOWN_SUFFIX.length)) === MARKDOWN_SUFFIX;
}

// ---------------------------------------------------------------------------
// hash（ADR-022 六-B.2；不引入自研 canonical JSON）
// ---------------------------------------------------------------------------

/**
 * 走 web 标准 `crypto.subtle`，不引 `node:crypto`——本包生产码刻意不新增 Node 侧原语，
 * 让「零 fs 写/ 零 exec」这条静态判据不必逐个原语解释例外。
 */
async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes.slice().buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** `frame(x) = u32be(UTF8(x).byteLength) || UTF8(x)`。 */
function frame(value: string): Uint8Array {
  const body = new TextEncoder().encode(value);
  const framed = new Uint8Array(4 + body.byteLength);
  new DataView(framed.buffer).setUint32(0, body.byteLength, false);
  framed.set(body, 4);
  return framed;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const joined = new Uint8Array(parts.reduce((sum, part) => sum + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    joined.set(part, offset);
    offset += part.byteLength;
  }
  return joined;
}

async function workspaceWriteProposalHash(fields: {
  readonly sessionId: string;
  readonly requestId: string;
  readonly operationId: string;
  readonly logicalPath: string;
  readonly byteLength: number;
  readonly contentSha256: string;
}): Promise<string> {
  return sha256Hex(
    concat(
      [
        WORKSPACE_WRITE_PROPOSAL_DOMAIN,
        fields.sessionId,
        fields.requestId,
        fields.operationId,
        fields.logicalPath,
        String(fields.byteLength),
        fields.contentSha256,
      ].map(frame),
    ),
  );
}

// ---------------------------------------------------------------------------
// 写面门
// ---------------------------------------------------------------------------

/**
 * Node 侧门的拒绝分型。`invalid_path`/`unsupported_file_type`/`limit_exceeded` 与
 * ADR-022 六-B.2 的 `host_result.failed` 同名；`invalid_content` 没有 wire 对应项——
 * 它按构造不可能上 wire（良构门在 hash/byteLength 与 operation 分配之前）。
 */
export type WorkspaceWriteRejectionCode =
  | 'invalid_path'
  | 'unsupported_file_type'
  | 'invalid_content'
  | 'limit_exceeded';

export interface WorkspaceWriteProposal {
  readonly logicalPath: string;
  readonly content: string;
  readonly contentSha256: string;
  readonly byteLength: number;
}

export type WorkspaceWriteGateResult =
  | { readonly ok: true; readonly proposal: WorkspaceWriteProposal }
  | { readonly ok: false; readonly code: WorkspaceWriteRejectionCode; readonly reason: string };

/**
 * ES2023 lib 没有 ADR-022 六-B.1 指名的 `String.prototype.isWellFormed()`（ES2024），
 * 故在此做同义判定，不做「有就用、没有就跳过」的静默降级：
 * 任何未配对的代理项都不是 Unicode scalar sequence，编码成 UTF-8 会变 U+FFFD，
 * 那样 hash 与 byteLength 就不再是原 content 的事实。
 */
function isUnicodeScalarSequence(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit < 0xd800 || unit > 0xdfff) continue;
    if (unit > 0xdbff) return false;
    const next = value.charCodeAt(index + 1);
    if (Number.isNaN(next) || next < 0xdc00 || next > 0xdfff) return false;
    index += 1;
  }
  return true;
}

/** 路径 → `.md` → content 良构 → 容量。全部通过才算出一份提案；任一失败都不分配 operation。 */
export async function gateWorkspaceWrite(rawPath: string, content: unknown): Promise<WorkspaceWriteGateResult> {
  const resolved = resolveWorkspaceLogicalPath(rawPath);
  if (!resolved.ok) return { ok: false, code: 'invalid_path', reason: resolved.reason };

  if (!isMarkdownBasename(resolved.logicalPath)) {
    return { ok: false, code: 'unsupported_file_type', reason: 'workspace 只承载 UTF-8 Markdown：最终 basename 必须以 `.md` 结尾' };
  }
  if (typeof content !== 'string') {
    return { ok: false, code: 'invalid_content', reason: 'content 必须是字符串：workspace 写面不收二进制' };
  }
  if (content.includes('\u0000') || !isUnicodeScalarSequence(content)) {
    return { ok: false, code: 'invalid_content', reason: 'content 含裸 NUL 或未配对代理项，不是合法 Unicode scalar sequence' };
  }

  const bytes = new TextEncoder().encode(content);
  if (bytes.byteLength > MAX_WORKSPACE_CONTENT_BYTES) {
    return {
      ok: false,
      code: 'limit_exceeded',
      reason: `content 为 ${bytes.byteLength} UTF-8 bytes，超过上限 ${MAX_WORKSPACE_CONTENT_BYTES}`,
    };
  }

  return {
    ok: true,
    proposal: {
      logicalPath: resolved.logicalPath,
      content,
      contentSha256: await sha256Hex(bytes),
      byteLength: bytes.byteLength,
    },
  };
}

// ---------------------------------------------------------------------------
// host port
// ---------------------------------------------------------------------------

/** 逐字段等同 ADR-022 六-B.2 的 `workspace_write` host request（外加会话相关三枚 id）。 */
export interface WorkspaceWriteRequest {
  readonly sessionId: string;
  readonly requestId: string;
  readonly operationId: string;
  readonly logicalPath: string;
  readonly content: string;
  readonly contentSha256: string;
  readonly byteLength: number;
  readonly proposalHash: string;
}

/**
 * 只区分「effect 已确认」与「未确认」。精确 code 闭集属 wire（`PI-CODE-STDIO-1`）
 * 与 Rust 宿主（`PI-WRITE-HOST-1`），本层不复制第二份判定。
 */
export type WorkspaceWritePortOutcome =
  | { readonly status: 'ok' }
  | { readonly status: 'denied' | 'failed' | 'uncertain'; readonly code: string; readonly message: string };

export interface WorkspaceWritePort {
  write(request: WorkspaceWriteRequest, signal?: AbortSignal): Promise<WorkspaceWritePortOutcome>;
}

/**
 * per-leg 的 tc/op 登记。public tc 的**首分配**属未来 product event projector——
 * 上游 `tool_execution_start` 早于 validate/`beforeToolCall`/execute，binder 只查表；
 * 查不到即拒，绝不代分配。op 只在真正要发 host request 时铸，一次 tool call 可有多次。
 */
export interface WorkspaceWriteRegistry {
  publicToolCallId(rawToolCallId: string): string | undefined;
  allocateOperationId(publicToolCallId: string): string;
}

// ---------------------------------------------------------------------------
// invocation-scoped 虚拟 env
// ---------------------------------------------------------------------------

export interface WorkspaceWriteEnvOptions {
  readonly sessionId: string;
  readonly requestId: string;
  readonly publicToolCallId: string;
  readonly registry: WorkspaceWriteRegistry;
  readonly port: WorkspaceWritePort;
}

/** 门的拒绝分型落到 pi 的 `FileErrorCode` 闭集时必然压扁——这正是不能从工具错误反推 outcome 的原因。 */
const GATE_ERROR_CODE: Record<WorkspaceWriteRejectionCode, FileErrorType['code']> = {
  invalid_path: 'invalid',
  unsupported_file_type: 'not_supported',
  invalid_content: 'invalid',
  limit_exceeded: 'invalid',
};

/**
 * 每次 tool call 一只，绝不跨调用复用。
 *
 * 上游 `withFileMutationQueue` 的串行队列挂在 **env 对象身份**上（`WeakMap`），
 * 所以 invocation-scoped env 天然**不共享**那条队列。产品的串行真源是
 * Agent `toolExecution:'sequential'` 与后续 Rust 的 container/session 串行 effect，
 * 不得拿上游队列冒充跨调用串行或持久化并发控制。
 */
export function createWorkspaceWriteEnv(options: WorkspaceWriteEnvOptions): ExecutionEnv {
  const deny = <T>(code: FileErrorType['code'], message: string): Result<T, FileError> =>
    err(new FileError(code, message));
  const denyRead = <T>(): Result<T, FileError> => deny<T>('not_supported', READ_DENIED);
  const denyMutation = <T>(): Result<T, FileError> => deny<T>('not_supported', MUTATION_DENIED);

  return {
    cwd: WORKSPACE_LOGICAL_ROOT,

    async absolutePath(input) {
      const resolved = resolveWorkspaceLogicalPath(input);
      // 幂等：上游先用相对路径求一次，再拿返回值求第二次（`withFileMutationQueue`）。
      return resolved.ok ? ok(resolved.virtualPath) : deny('invalid', resolved.reason);
    },

    /**
     * 固定 `not_supported`。上游据此把 mutation queue 的键退回 absolutePath
     * （`file-mutation-queue.js` 对 `not_found`/`not_supported` 的分支），
     * 我方也因此不必在 Node 侧假造一份 canonical 语义。
     */
    async canonicalPath() {
      return deny('not_supported', '虚拟 workspace 不解析 canonical path：物理根只在受信宿主侧');
    },

    async writeFile(input, content, signal) {
      const gate = await gateWorkspaceWrite(input, content);
      if (!gate.ok) return deny(GATE_ERROR_CODE[gate.code], gate.reason);

      // 到这里才铸 operation：门失败一律 op 零分配、port 零调用。
      const operationId = options.registry.allocateOperationId(options.publicToolCallId);
      const { logicalPath, contentSha256, byteLength } = gate.proposal;
      const request: WorkspaceWriteRequest = {
        sessionId: options.sessionId,
        requestId: options.requestId,
        operationId,
        logicalPath,
        content: gate.proposal.content,
        contentSha256,
        byteLength,
        proposalHash: await workspaceWriteProposalHash({
          sessionId: options.sessionId,
          requestId: options.requestId,
          operationId,
          logicalPath,
          byteLength,
          contentSha256,
        }),
      };

      const outcome = await options.port.write(request, signal);
      if (outcome.status === 'ok') return ok(undefined);
      return deny(
        outcome.status === 'denied' ? 'permission_denied' : 'unknown',
        `workspace write 未确认成功（${outcome.status}/${outcome.code}）：${outcome.message}`,
      );
    },

    // 读面不在本容器：`/workspace` 回读由 read 工具的双根路由承担。
    async readTextFile() {
      return denyRead();
    },
    async readTextLines() {
      return denyRead();
    },
    async readBinaryFile() {
      return denyRead();
    },
    async fileInfo() {
      return denyRead();
    },
    async listDir() {
      return denyRead();
    },
    async exists() {
      return denyRead();
    },
    async joinPath() {
      return denyRead();
    },

    async appendFile() {
      return denyMutation();
    },
    async remove() {
      return denyMutation();
    },
    async createDir() {
      return denyMutation();
    },
    async createTempDir() {
      return denyMutation();
    },
    async createTempFile() {
      return denyMutation();
    },

    // 形参一概不取：命令与选项都不参与判定。
    async exec() {
      return err(new ExecutionError('shell_unavailable', SHELL_DENIED));
    },

    async cleanup() {
      // 虚拟容器不持有需要释放的资源。
    },
  };
}

// ---------------------------------------------------------------------------
// 极薄 binder
// ---------------------------------------------------------------------------

type UpstreamWriteTool = ReturnType<typeof createWriteTool>;

export type WorkspaceWriteTool = AgentTool<UpstreamWriteTool['parameters'], undefined>;

export interface BindWorkspaceWriteToolOptions {
  readonly sessionId: string;
  readonly requestId: string;
  readonly registry: WorkspaceWriteRegistry;
  readonly port: WorkspaceWritePort;
}

/**
 * raw exact-key/type gate，挂在上游 coercion **之前**的那一枚接缝上。
 *
 * 之所以必须是 `prepareArguments`：`agent-loop.js` 的 `prepareToolCall` 先调它，
 * 再调 `validateToolArguments`。而上游 schema 是开放 object——额外字段照过，
 * 且 `Value.Convert` 会把 `123`/`true`/`null` 一律 coerce 成字符串。等到
 * `beforeToolCall` 才看就已经晚了一步：那时 `args` 已是 coerce 后的形状。
 */
function gateRawWriteArguments(args: unknown): WriteToolInput {
  if (typeof args !== 'object' || args === null || Array.isArray(args)) {
    throw new Error('write 参数必须是恰含 `path` 与 `content` 的 object');
  }
  const keys = Object.keys(args);
  if (keys.length !== 2 || !keys.includes('path') || !keys.includes('content')) {
    throw new Error(`write 参数只接受 \`path\` 与 \`content\` 两项，收到：${keys.join('、') || '（空）'}`);
  }
  const { path, content } = args as Record<string, unknown>;
  if (typeof path !== 'string' || typeof content !== 'string') {
    throw new Error('write 的 `path` 与 `content` 必须是字符串，不做类型转换');
  }
  if (path.startsWith('@')) {
    throw new Error('`path` 不得以 `@` 开头：上游会把它剥掉，改写成另一个真实目标');
  }
  if (UPSTREAM_FOLDED_SPACES.test(path)) {
    throw new Error('`path` 含会被上游折叠成普通空格的 Unicode 空格，目标有歧义');
  }
  return args as WriteToolInput;
}

/**
 * 保留上游 `name/label/description/parameters`（`parameters` 是同一对象引用——
 * 上游 validator 缓存按 schema 身份取，换对象即换一份编译产物），
 * 只把五参 `execute` 适配成 `Agent` 的四参，并原样 delegate 恰一次。
 * 不复制 schema，不复制 execute，不用共享可变的 current-operation。
 */
export function bindWorkspaceWriteTool(options: BindWorkspaceWriteToolOptions): WorkspaceWriteTool {
  const upstream = createWriteTool();

  return {
    name: upstream.name,
    label: upstream.label,
    description: upstream.description,
    parameters: upstream.parameters,
    executionMode: 'sequential',
    prepareArguments: gateRawWriteArguments,

    async execute(rawToolCallId, params, signal, onUpdate) {
      const publicToolCallId = options.registry.publicToolCallId(rawToolCallId);
      if (publicToolCallId === undefined) {
        throw new Error('本次 tool call 没有已登记的公开 toolCallId，拒绝执行（不代分配、不发 host request）');
      }
      const env = createWorkspaceWriteEnv({
        sessionId: options.sessionId,
        requestId: options.requestId,
        publicToolCallId,
        registry: options.registry,
        port: options.port,
      });
      return upstream.execute(rawToolCallId, params, signal, onUpdate, { env });
    },
  };
}
