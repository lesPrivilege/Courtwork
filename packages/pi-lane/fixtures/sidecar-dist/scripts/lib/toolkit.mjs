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

import { INVENTORY, NODE_VERSION, SEALED_VARIANTS, SIDECAR_BASENAME, TARGETS } from './probe-verdict.mjs';

/** `fixtures/sidecar-dist/`。 */
export const FIXTURE_DIR = path.resolve(import.meta.dirname, '..', '..');
export const DIST_DIR = path.join(FIXTURE_DIR, 'dist');
export const RUNTIME_DIR = path.join(DIST_DIR, 'runtime');
export const REPO_ROOT = path.resolve(FIXTURE_DIR, '..', '..', '..', '..');

export { NODE_VERSION, SIDECAR_BASENAME, TARGETS };

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
    exited: new Promise((resolve) => {
      child.on('exit', (code, signal) => resolve({ code, signal }));
    }),
  };
}

/**
 * 由库存闭集推出磁盘坐标。**不做存在性跳过**——缺件必须以「解析得出但文件不在」
 * 的形态交给判定层，这正是 `9b8142f` 拒绝的「静默 continue」的反面。
 */
export function resolveArtifact(entry) {
  if (entry.route === 'a-sealed-bundle') {
    const variant = SEALED_VARIANTS.find((candidate) => candidate.name === entry.variant);
    const dir = path.join(DIST_DIR, 'route-a', `${entry.triple}--${entry.variant}`);
    const executable = path.join(dir, `${SIDECAR_BASENAME}-${entry.triple}`);
    const carried = path.join(dir, `sidecar.${variant.extension}`);
    return { ...entry, dir, command: executable, args: [carried], files: [executable, carried] };
  }
  const dir = path.join(DIST_DIR, 'route-b', `${entry.triple}--${entry.variant}`);
  const executable = path.join(dir, `${SIDECAR_BASENAME}-${entry.triple}`);
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
