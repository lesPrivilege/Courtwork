/**
 * workspace 读面虚拟容器（ADR-022 六-B.2／六-C，`PI-WORKSPACE-READ-1`）。
 *
 * 与 `product-case-env.ts` 的本质差别只有一条：**这一层没有文件系统**。`/case` 由 Node 直读
 * 物理案件根；`/workspace` 的物理根只在受信 Rust 宿主侧，故本容器的每一次读都是一枚
 * host request（`exists|read_file|list`），Node 侧一个 fs 调用都不发——本包生产码继续零 fs。
 *
 * 三条本模块红线：
 *
 * 1. **物理坐标零进入**。请求出的是 wire 逻辑路径（不带 `/workspace/` 前缀，list 根为 `.`），
 *    回来的是逻辑路径与正文；模型面一律 `/workspace/...` 虚拟绝对路径。
 * 2. **回读双验**。`read_file` 的正文在本层按 UTF-8 重新编码，重算 hash 与 byteLength，
 *    与宿主自报值逐一比对，并复核 `logicalPath` 就是本次请求的那一枚。三项任一不符即读失败
 *    ——「宿主说它成功了」不是「回读到的就是那份字节」的证据（核心不变量 1）。
 * 3. **门先于铸号**。grammar 不过一律在 `allocateOperationId` 之前拒绝：非法路径 op 零分配、
 *    port 零调用，与写面 `gateWorkspaceWrite` 同一口径。
 *
 * 明确不承诺：本层不判定并发。两次读之间宿主侧文件可能已变，故「读到什么」只是**那一刻**的
 * 事实；`openWorkspaceMarkdown` 的当前 hash 与已落账 hash 可能不同，正是同一条性质的外显。
 */

import {
  ExecutionError,
  FileError,
  err,
  ok,
  type ExecutionEnv,
  type FileInfo,
  type Result,
} from '@earendil-works/pi-agent-core';

import { WORKSPACE_LOGICAL_ROOT } from './workspace-write-env.js';

/** ADR-022 六-B.2 read 行的域分隔串。与写面域串不同值，故两族提案 hash 结构性不可互冒。 */
export const WORKSPACE_READ_PROPOSAL_DOMAIN = 'courtwork.pi.workspace_read.v1';

/** ADR-022 六-B.2：「除 `list` 的根 `"."` 外」——根在 wire 上的唯一合法写法。 */
export const WORKSPACE_LIST_ROOT = '.';

/** ADR-022 六-B.2：`list` 只列直接子项、最多 2,000 项；超限是 `limit_exceeded`，不静默少列。 */
export const MAX_WORKSPACE_LIST_ENTRIES = 2000;

const MAX_WORKSPACE_PATH_BYTES = 1024;
const MAX_WORKSPACE_SEGMENT_BYTES = 255;
const MAX_WORKSPACE_CONTENT_BYTES = 131_072;

const WORKSPACE_PREFIX = `${WORKSPACE_LOGICAL_ROOT}/`;

// eslint-disable-next-line no-control-regex
const FORBIDDEN_SEGMENT_CHARS = /[\u0000-\u001F\u007F<>:"\\|?*]/;
const WINDOWS_RESERVED_STEM = /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;

const WRITE_DENIED = 'workspace 读面容器不实现写入：写只走 write 工具的提案与宿主逐次授权（ADR-022 六-C）';
const SHELL_DENIED = 'bash 面未授权：pi lane 无命令执行能力';

export type WorkspaceReadOperation = 'exists' | 'read_file' | 'list';

export type WorkspaceReadPathResolution =
  | { readonly ok: true; readonly logicalPath: string; readonly virtualPath: string }
  | { readonly ok: false; readonly reason: string };

const utf8ByteLength = (value: string): number => new TextEncoder().encode(value).byteLength;

const rejectPath = (reason: string): WorkspaceReadPathResolution => ({ ok: false, reason });

/**
 * 模型给出的路径 → wire 逻辑路径。**纯函数**：不碰 port，不认识物理根。
 *
 * 与写面 {@link import('./workspace-write-env.js').resolveWorkspaceLogicalPath} 共用同一套
 * segment 闭集，两处差别恰两条，都由 ADR-022 六-B.2 直接拉动：
 * - 读面**不要求** `.md`（要 list 目录、要 exists 任意条目）；
 * - 读面认根：`/workspace`、`.` 与空串都归一到 wire 的 `.`，且**只对 `list` 合法**。
 */
export function resolveWorkspaceReadPath(
  input: unknown,
  operation: WorkspaceReadOperation,
): WorkspaceReadPathResolution {
  if (typeof input !== 'string') return rejectPath('路径必须是字符串');

  let relative: string;
  if (input === WORKSPACE_LOGICAL_ROOT || input === WORKSPACE_LIST_ROOT || input === '') {
    relative = '';
  } else if (input.startsWith(WORKSPACE_PREFIX)) {
    relative = input.slice(WORKSPACE_PREFIX.length);
  } else if (input.startsWith('/')) {
    return rejectPath('只接受 workspace 相对路径或 `/workspace/` 下的虚拟绝对路径');
  } else {
    relative = input;
  }

  if (relative === '') {
    // 根只服务 `list`：ADR-022 六-B.2 的例外恰给了 list 一枚，不外扩。
    if (operation !== 'list') return rejectPath('`/workspace` 根本身不是可读文件');
    return { ok: true, logicalPath: WORKSPACE_LIST_ROOT, virtualPath: WORKSPACE_LOGICAL_ROOT };
  }

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

// ---------------------------------------------------------------------------
// proposal hash（ADR-022 六-B.2 read 行；协调 2026-08-05 裁定「换域串同 frame」）
// ---------------------------------------------------------------------------

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes.slice().buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** `frame(x) = u32be(UTF8(x).byteLength) || UTF8(x)`——与写面同一机制，不另写一套。 */
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

/**
 * 六枚 frame 顺序拼接取 SHA-256：domain、sessionId、requestId、operationId、operation、logicalPath。
 *
 * `operation` 在拼接里**不可省**：省掉它，同一路径上的 `exists` 与 `read_file` 会得到同一枚
 * proposalHash，宿主也就无从判定「请求被改成了另一种操作」。
 */
export async function workspaceReadProposalHash(fields: {
  readonly sessionId: string;
  readonly requestId: string;
  readonly operationId: string;
  readonly operation: WorkspaceReadOperation;
  readonly logicalPath: string;
}): Promise<string> {
  return sha256Hex(
    concat(
      [
        WORKSPACE_READ_PROPOSAL_DOMAIN,
        fields.sessionId,
        fields.requestId,
        fields.operationId,
        fields.operation,
        fields.logicalPath,
      ].map(frame),
    ),
  );
}

// ---------------------------------------------------------------------------
// host port
// ---------------------------------------------------------------------------

/** 逐字段等同 ADR-022 六-B.2 的 `workspace_read` host request（外加会话相关三枚 id）。 */
export interface WorkspaceReadRequest {
  readonly sessionId: string;
  readonly requestId: string;
  readonly operationId: string;
  readonly operation: WorkspaceReadOperation;
  readonly logicalPath: string;
  readonly proposalHash: string;
}

export interface WorkspaceListEntry {
  readonly name: string;
  readonly kind: 'file' | 'directory' | 'symlink';
  readonly byteLength: number | null;
  readonly mtimeMs: number | null;
}

/**
 * `uncertain` 不在闭集内：它只属 write（ADR-022 六-B.2 已在 codec 层锁死
 * 「`uncertain` 只许 `workspace_write`」）。读没有 effect，故没有「可能已发生」这一态。
 */
export type WorkspaceReadPortOutcome =
  | { readonly status: 'ok'; readonly operation: 'exists'; readonly logicalPath: string; readonly exists: boolean }
  | {
      readonly status: 'ok';
      readonly operation: 'read_file';
      readonly logicalPath: string;
      readonly content: string;
      readonly contentSha256: string;
      readonly byteLength: number;
    }
  | {
      readonly status: 'ok';
      readonly operation: 'list';
      readonly logicalPath: string;
      readonly entries: readonly WorkspaceListEntry[];
    }
  | { readonly status: 'denied' | 'failed'; readonly code: string; readonly message: string };

export interface WorkspaceReadPort {
  read(request: WorkspaceReadRequest, signal?: AbortSignal): Promise<WorkspaceReadPortOutcome>;
}

/** 与写面同形：public tc 的首分配属状态机，本层只查表与铸 op，查不到即拒。 */
export interface WorkspaceReadRegistry {
  publicToolCallId(rawToolCallId: string): string | undefined;
  allocateOperationId(publicToolCallId: string): string;
}

export interface WorkspaceReadEnvOptions {
  readonly sessionId: string;
  readonly requestId: string;
  /**
   * 上游给的**原始** toolCallId。公开 tc 在**每次真要发请求时**才查表：查表若排在容器构造期，
   * 一次纯 `/case` 的读也会被迫要求一枚已登记的 tc——那是把读面的前置条件安在了另一个根上。
   */
  readonly rawToolCallId: string;
  readonly registry: WorkspaceReadRegistry;
  readonly port: WorkspaceReadPort;
}

// ---------------------------------------------------------------------------
// 容器
// ---------------------------------------------------------------------------

/**
 * 每次 tool call 一只。read/glob/grep 一次调用可发**多枚** host operation（glob 逐层 list），
 * 这一点与 write 的「一 tc 一 op」相反，且已由状态机侧显式支持——`host_result` 收束后
 * read 系工具的 tool call 回到 `started`，保留同一 tc 内的多 operation 子循环。
 */
export function createWorkspaceReadEnv(options: WorkspaceReadEnvOptions): ExecutionEnv {
  const deny = <T>(code: FileError['code'], message: string): Result<T, FileError> =>
    err(new FileError(code, message));
  const denyWrite = <T>(): Result<T, FileError> => deny<T>('not_supported', WRITE_DENIED);

  /** 宿主非 ok 一律成为具名读失败：拒读不是「没有内容」，更不是「不存在」。 */
  const outcomeError = (
    outcome: Extract<WorkspaceReadPortOutcome, { status: 'denied' | 'failed' }>,
    virtualPath: string,
  ): FileError =>
    new FileError(
      outcome.status === 'denied' ? 'permission_denied' : 'unknown',
      `workspace 读未成功（${outcome.status}/${outcome.code}）：${outcome.message}`,
      virtualPath,
    );

  /** grammar → 铸 op → 算 hash → 发 port。门在铸号之前，非法路径 op 零分配。 */
  async function request(
    input: unknown,
    operation: WorkspaceReadOperation,
    signal?: AbortSignal,
  ): Promise<Result<{ outcome: WorkspaceReadPortOutcome; logicalPath: string; virtualPath: string }, FileError>> {
    const resolved = resolveWorkspaceReadPath(input, operation);
    if (!resolved.ok) return deny('invalid', `拒绝访问：${resolved.reason}`);

    const publicToolCallId = options.registry.publicToolCallId(options.rawToolCallId);
    if (publicToolCallId === undefined) {
      // 与 write binder 同口径：不代分配、不发 host request。
      return deny('not_supported', '本次 tool call 没有已登记的公开 toolCallId，拒绝申请 workspace 读');
    }
    const operationId = options.registry.allocateOperationId(publicToolCallId);
    const outcome = await options.port.read(
      {
        sessionId: options.sessionId,
        requestId: options.requestId,
        operationId,
        operation,
        logicalPath: resolved.logicalPath,
        proposalHash: await workspaceReadProposalHash({
          sessionId: options.sessionId,
          requestId: options.requestId,
          operationId,
          operation,
          logicalPath: resolved.logicalPath,
        }),
      },
      signal,
    );

    if (outcome.status !== 'ok') return err(outcomeError(outcome, resolved.virtualPath));
    // 宿主复述的目标必须就是本次请求的那一枚——被掉包的回执不是回读。
    if (outcome.logicalPath !== resolved.logicalPath) {
      return deny('unknown', `拒绝采信：宿主回执的逻辑路径与本次请求不符（${resolved.virtualPath}）`);
    }
    if (outcome.operation !== operation) {
      return deny('unknown', `拒绝采信：宿主回执的操作与本次请求不符（${resolved.virtualPath}）`);
    }
    return ok({ outcome, logicalPath: resolved.logicalPath, virtualPath: resolved.virtualPath });
  }

  /** 回读双验：正文重编码后的字节数与 hash 都必须复现宿主自报值。 */
  async function readBytes(input: unknown, signal?: AbortSignal): Promise<Result<Uint8Array, FileError>> {
    const answered = await request(input, 'read_file', signal);
    if (!answered.ok) return answered;
    const { outcome, virtualPath } = answered.value;
    if (outcome.status !== 'ok' || outcome.operation !== 'read_file') {
      return deny('unknown', `拒绝采信：${virtualPath} 的回执不是 read_file`);
    }
    const bytes = new TextEncoder().encode(outcome.content);
    if (bytes.byteLength !== outcome.byteLength) {
      return deny('unknown', `拒绝采信：${virtualPath} 的正文长度与宿主自报的 byteLength 不符`);
    }
    if (bytes.byteLength > MAX_WORKSPACE_CONTENT_BYTES) {
      return deny('invalid', `${virtualPath} 超过 ${MAX_WORKSPACE_CONTENT_BYTES} UTF-8 bytes 上限`);
    }
    if ((await sha256Hex(bytes)) !== outcome.contentSha256) {
      return deny('unknown', `拒绝采信：${virtualPath} 的正文与宿主自报的 contentSha256 不符`);
    }
    return ok(bytes);
  }

  async function readText(input: unknown, signal?: AbortSignal): Promise<Result<string, FileError>> {
    const bytes = await readBytes(input, signal);
    return bytes.ok ? ok(new TextDecoder().decode(bytes.value)) : bytes;
  }

  return {
    cwd: WORKSPACE_LOGICAL_ROOT,

    async absolutePath(input) {
      // 归一不发 host request：它只是 grammar。`list` 口径最宽（认根），故用它归一；
      // 具体操作各自再按自己的口径判一次根（`readBinaryFile` 拿到根仍会被拒）。
      const resolved = resolveWorkspaceReadPath(input, 'list');
      return resolved.ok ? ok(resolved.virtualPath) : deny('invalid', `拒绝访问：${resolved.reason}`);
    },

    async joinPath(parts) {
      if (!Array.isArray(parts) || parts.some((part) => typeof part !== 'string')) {
        return deny('invalid', '拒绝访问：joinPath 只接受字符串数组');
      }
      const resolved = resolveWorkspaceReadPath(parts.join('/'), 'list');
      return resolved.ok ? ok(resolved.virtualPath) : deny('invalid', `拒绝访问：${resolved.reason}`);
    },

    async canonicalPath() {
      return deny('not_supported', '虚拟 workspace 不解析 canonical path：物理根只在受信宿主侧');
    },

    async readBinaryFile(input, signal) {
      return readBytes(input, signal);
    },

    async readTextFile(input, signal) {
      return readText(input, signal);
    },

    async readTextLines(input, options_) {
      const text = await readText(input);
      if (!text.ok) return text;
      const lines = text.value.split('\n');
      if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
      const maxLines = options_?.maxLines;
      return ok(typeof maxLines === 'number' ? lines.slice(0, maxLines) : lines);
    },

    async exists(input, signal) {
      const answered = await request(input, 'exists', signal);
      if (!answered.ok) return answered;
      const { outcome } = answered.value;
      if (outcome.status !== 'ok' || outcome.operation !== 'exists') {
        return deny('unknown', '拒绝采信：回执不是 exists');
      }
      return ok(outcome.exists);
    },

    async fileInfo(input, signal) {
      // 单件 stat 没有独立 host operation（wire 闭集恰三枚），故按 exists 回答在场性，
      // 尺寸与 mtime 只在 `listDir` 的目录项里有真值——不在这里编造。
      const answered = await request(input, 'exists', signal);
      if (!answered.ok) return answered;
      const { outcome, virtualPath } = answered.value;
      if (outcome.status !== 'ok' || outcome.operation !== 'exists' || !outcome.exists) {
        return deny('not_found', `${virtualPath} 不存在`);
      }
      return ok({
        name: virtualPath.slice(virtualPath.lastIndexOf('/') + 1),
        path: virtualPath,
        kind: 'file' as const,
        size: 0,
        mtimeMs: 0,
      });
    },

    async listDir(input, signal) {
      const answered = await request(input, 'list', signal);
      if (!answered.ok) return answered;
      const { outcome, virtualPath } = answered.value;
      if (outcome.status !== 'ok' || outcome.operation !== 'list') {
        return deny('unknown', `拒绝采信：${virtualPath} 的回执不是 list`);
      }
      if (outcome.entries.length > MAX_WORKSPACE_LIST_ENTRIES) {
        return deny('invalid', `${virtualPath} 的目录项超过 ${MAX_WORKSPACE_LIST_ENTRIES} 上限`);
      }
      const entries: FileInfo[] = [];
      for (const entry of outcome.entries) {
        const child = virtualPath === WORKSPACE_LOGICAL_ROOT ? entry.name : `${answered.value.logicalPath}/${entry.name}`;
        const resolved = resolveWorkspaceReadPath(child, 'exists');
        // 宿主给的 name 仍过一次本层 grammar，但**不合规不是「跳过」而是协议漂移**：
        // Rust 侧列目录时已按同一套 segment 闭集筛过，故此处出现不合规的名字只可能是两端
        // grammar 分叉。静默 `continue` 会让分叉表现成「那个文件不存在」——正是
        // `PI-TOOLS-HONESTY-1` 交出的容器层三处边界的同一种形状。本容器**不加入那一族**：
        // 整次 listing fail-closed，理由具名。
        if (!resolved.ok) {
          return deny(
            'unknown',
            `拒绝采信：${virtualPath} 的目录项含不合本层 grammar 的名字（两端 grammar 分叉，非「该项不存在」）`,
          );
        }
        entries.push({
          name: entry.name,
          path: resolved.virtualPath,
          kind: entry.kind,
          size: entry.byteLength ?? 0,
          mtimeMs: entry.mtimeMs ?? 0,
        });
      }
      return ok(entries);
    },

    async writeFile() {
      return denyWrite();
    },
    async appendFile() {
      return denyWrite();
    },
    async createDir() {
      return denyWrite();
    },
    async remove() {
      return denyWrite();
    },
    async createTempDir() {
      return denyWrite();
    },
    async createTempFile() {
      return denyWrite();
    },

    async exec() {
      return err(new ExecutionError('shell_unavailable', SHELL_DENIED));
    },

    async cleanup() {
      // 虚拟容器不持有需要释放的资源。
    },
  };
}
