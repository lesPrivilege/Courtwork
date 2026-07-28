/**
 * PI-SIDECAR-DIST-1R · 实验公共件。
 *
 * 只放「各支都要用」的机械动作：路径、跑外部命令、量文件、算 SHA、起 NDJSON 子进程。
 * **判定一律不住这里**——判定只住 `lib/probe-verdict.mjs`，四支探针共用同一份；
 * 本件连 `NODE_VERSION`/`TARGETS` 也改为从那里转出，免得两谱各抄一份字面量后各自漂移。
 */

import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  ASSEMBLY_DIR_NAME,
  INVENTORY,
  NODE_VERSION,
  ROUTE_DIR_NAMES,
  SIDECAR_BASENAME,
  TARGETS,
} from './probe-verdict.mjs';

/** `fixtures/sidecar-dist/`。 */
export const FIXTURE_DIR = path.resolve(import.meta.dirname, '..', '..');
export const DIST_DIR = path.join(FIXTURE_DIR, 'dist');
export const RUNTIME_DIR = path.join(DIST_DIR, 'runtime');
export const REPO_ROOT = path.resolve(FIXTURE_DIR, '..', '..', '..', '..');

/**
 * **唯一随包目录**。只装十件可随包制品，别的一律不许进来。
 * 构建中间件、runtime、corpus、JSON 读数与反例留档各有其位，全部住 assembly 之外——
 * 否则「多一件」的判据会被自己的 scratch 误伤，那等于没判。
 */
export const ASSEMBLY_DIR = path.join(DIST_DIR, ASSEMBLY_DIR_NAME);
/** 构建 scratch：中间 bundle、sea-config、blob、staging。**不随包**。 */
export const BUILD_DIR = path.join(DIST_DIR, 'build');
/** 反例红证留档。同样在 assembly 之外。 */
export const COUNTEREXAMPLE_DIR = path.join(DIST_DIR, 'counterexamples');

export const assemblyRouteDir = (route) => path.join(ASSEMBLY_DIR, ROUTE_DIR_NAMES[route]);

export { NODE_VERSION, SIDECAR_BASENAME, TARGETS };

/**
 * assembly 的**实物**枚举：逐层 `readdir` 取名、逐项 `lstat` 定类型。
 *
 * 两处刻意为之：
 * - 用 `readdir(名字)` + `lstat`，**不用** `withFileTypes` 的便利——`lstat` 不跟随
 *   symlink，符号链接会如实报成 `symlink` 而不是它指向的那个类型；
 * - 只对 `type==='dir'` 递归，故 symlink 指向的目录树不会被走进去。
 *
 * 判据不从这里取，也不从 `INVENTORY` 反推：本函数只交实物，比对住 `verdictAssembly`。
 */
export function observeAssembly(root = ASSEMBLY_DIR) {
  // **根自身也要 lstat**。只做 `existsSync` 时，一个指向合格树的 symlink 根会被
  // 直接 `readdirSync` 跟随进去，整棵树看起来完全合格——那是「随包根被换成链接」
  // 这一类形状的结构性盲区。故先定根的类型，非真目录一律不递归。
  let rootStat;
  try {
    rootStat = fs.lstatSync(root);
  } catch {
    return { root, exists: false, rootType: null, entries: [] };
  }
  const rootType = classifyStat(rootStat);
  if (rootType !== 'dir') return { root, exists: true, rootType, entries: [] };

  const entries = [];
  const walk = (absolute, relative) => {
    for (const name of fs.readdirSync(absolute)) {
      const childAbsolute = path.join(absolute, name);
      const childRelative = relative ? `${relative}/${name}` : name;
      const type = classifyStat(fs.lstatSync(childAbsolute));
      const record = { path: childRelative, type };
      if (type === 'file') record.bytes = fs.statSync(childAbsolute).size;
      entries.push(record);
      if (type === 'dir') walk(childAbsolute, childRelative);
    }
  };
  walk(root, '');
  entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return { root, exists: true, rootType, entries };
}

/** `lstat` 结果 → 类型名。symlink 优先判定，故永远不会被它指向的类型顶替。 */
function classifyStat(stat) {
  if (stat.isSymbolicLink()) return 'symlink';
  if (stat.isDirectory()) return 'dir';
  if (stat.isFile()) return 'file';
  if (stat.isSocket()) return 'socket';
  if (stat.isFIFO()) return 'fifo';
  if (stat.isBlockDevice() || stat.isCharacterDevice()) return 'device';
  return 'other';
}

/**
 * cleanup 的唯一窄接缝：杀掉子进程、**确认它真的走了**，确认不了就把 `kill-confirm`
 * 记进该 termination 的结构化 `timeouts`。
 *
 * 之所以要这么一个 helper：`measure.mjs` 里有四处 cleanup，其中三处（initial ready 超时、
 * respawn-ready 超时、respawn 后 EOF 超时）调了 `killAndConfirm()` 却把返回值丢掉，
 * 于是「杀完还确认不了」这件事只有主 exit-timeout 那一条登记得上，另外三条静默。
 * 收进一处之后，四个调用点共用同一套登记，且这条语义本身可被定向测试直接打。
 */
export async function killAndConfirmInto(proc, timeoutMs, timeouts) {
  const exit = await proc.killAndConfirm(timeoutMs);
  // 返回值必须被**消费**：确认不了就是一条真实的超时，追加登记（不顶替既有超时）。
  if (exit === null || exit === undefined) timeouts.push('kill-confirm');
  return exit ?? null;
}

/** 一份文件的双 cycle 读数格：先自证存在/regular/字节，再谈 SHA。 */
export function fileFingerprint(absolute) {
  if (!fs.existsSync(absolute)) return { exists: false, regularFile: false, bytes: null, sha256: null };
  const stat = fs.lstatSync(absolute);
  if (!stat.isFile()) return { exists: true, regularFile: false, bytes: null, sha256: null };
  return { exists: true, regularFile: true, bytes: stat.size, sha256: sha256File(absolute) };
}

export function sha256File(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

export function byteSize(file) {
  return fs.statSync(file).size;
}

/** 目录递归实占字节（apparent size 之和，不含目录 inode）。 */
export function treeSize(directory) {
  let total = 0;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) total += treeSize(absolute);
    else if (entry.isFile()) total += fs.statSync(absolute).size;
  }
  return total;
}

/** 同步跑一条命令，逐条回报退出码与输出——实验里失败本身也是数据，不吞。 */
export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    ...options,
  });
  return {
    command: [command, ...args].join(' '),
    status: result.status,
    signal: result.signal,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    error: result.error ? String(result.error.message) : null,
  };
}

export function mustRun(command, args, options = {}) {
  const result = run(command, args, options);
  if (result.status !== 0) {
    throw new Error(
      `命令失败（exit ${result.status}${result.signal ? `, signal ${result.signal}` : ''}）：${result.command}\n${result.stderr || result.stdout}`,
    );
  }
  return result;
}

export function rmrf(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

export function ensureDir(target) {
  fs.mkdirSync(target, { recursive: true });
}

/**
 * 起一个 NDJSON 子进程，返回收发句柄。
 * `onLine` 收到的是**已按 LF 切分**的完整行——分发实验里 stdout 分片是常态。
 */
export function spawnNdjson(command, args, options = {}) {
  const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'], ...options });
  const listeners = new Set();
  const stderrChunks = [];
  let pending = Buffer.alloc(0);

  child.stdout.on('data', (chunk) => {
    pending = pending.length === 0 ? chunk : Buffer.concat([pending, chunk]);
    for (;;) {
      const index = pending.indexOf(0x0a);
      if (index < 0) return;
      const line = pending.subarray(0, index).toString('utf8');
      pending = pending.subarray(index + 1);
      if (line.length === 0) continue;
      for (const listener of listeners) listener(line);
    }
  });
  child.stderr.on('data', (chunk) => stderrChunks.push(chunk));

  const exited = new Promise((resolve) => {
    child.on('exit', (code, signal) => resolve({ code, signal }));
  });

  return {
    child,
    stderr: () => Buffer.concat(stderrChunks).toString('utf8'),
    send: (packet) => child.stdin.write(`${JSON.stringify(packet)}\n`),
    /** 等到第一条满足 `predicate` 的包；超时按 null 收束，由调用方判红。 */
    waitFor(predicate, timeoutMs = 15_000) {
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          listeners.delete(listener);
          resolve(null);
        }, timeoutMs);
        const listener = (line) => {
          let packet;
          try {
            packet = JSON.parse(line);
          } catch {
            return;
          }
          if (!predicate(packet)) return;
          clearTimeout(timer);
          listeners.delete(listener);
          resolve(packet);
        };
        listeners.add(listener);
      });
    },
    exited,
    /**
     * 有上界的退出等待：超时回 `null`，由调用方写结构化 failure 并收拾子进程。
     * 裸 `await exited` 在「既不 ack 也不退出」的子进程上会永久挂起——
     * `f261347` 点名的正是这一处，故本件此后不再提供无上界的等法。
     */
    waitForExit(timeoutMs) {
      return new Promise((resolve) => {
        const timer = setTimeout(() => resolve(null), timeoutMs);
        exited.then((value) => {
          clearTimeout(timer);
          resolve(value);
        });
      });
    },
    /** SIGKILL 后仍要确认它真的走了；确认本身也有上界。 */
    async killAndConfirm(timeoutMs, signal = 'SIGKILL') {
      if (child.exitCode === null && child.signalCode === null) child.kill(signal);
      return this.waitForExit(timeoutMs);
    },
  };
}

/**
 * 由库存闭集推出磁盘坐标。**不做存在性跳过**——缺件必须以「解析得出但文件不在」
 * 的形态交给判定层，这正是 `9b8142f` 拒绝的「静默 continue」的反面。
 */
export function resolveArtifact(entry) {
  const dir = path.join(assemblyRouteDir(entry.route), `${entry.triple}--${entry.variant}`);
  const executable = path.join(dir, `${SIDECAR_BASENAME}-${entry.triple}`);
  if (entry.carriedBasename) {
    const carried = path.join(dir, entry.carriedBasename);
    return { ...entry, dir, command: executable, args: [carried], files: [executable, carried] };
  }
  return { ...entry, dir, command: executable, args: [], files: [executable] };
}

export const resolveInventory = () => INVENTORY.map(resolveArtifact);

export const artifactPresent = (artifact) => artifact.files.every((file) => fs.existsSync(file));

/** Fisher–Yates。冷启逐轮打乱取样次序，把「机器越跑越热」摊到各候选上。 */
export function shuffled(list) {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

export const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

export const round = (value, digits = 1) => Number(value.toFixed(digits));
