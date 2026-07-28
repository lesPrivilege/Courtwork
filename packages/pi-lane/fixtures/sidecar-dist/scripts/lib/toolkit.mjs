/**
 * PI-SIDECAR-DIST-1 · 实验公共件。
 *
 * 只放「两条路线都要用」的机械动作：路径、跑外部命令、量文件、算 SHA。
 * 任何判定都不住这里——判定住各自的 build/measure 脚本，便于逐条追到实测出处。
 */

import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/** `fixtures/sidecar-dist/`。 */
export const FIXTURE_DIR = path.resolve(import.meta.dirname, '..', '..');
export const DIST_DIR = path.join(FIXTURE_DIR, 'dist');
export const RUNTIME_DIR = path.join(DIST_DIR, 'runtime');
export const REPO_ROOT = path.resolve(FIXTURE_DIR, '..', '..', '..', '..');

export const NODE_VERSION = 'v22.23.1';

/** Tauri `bundle.externalBin` 的 target triple ↔ Node 官方发行包的架构名。 */
export const TARGETS = [
  { triple: 'aarch64-apple-darwin', nodeArch: 'arm64', native: true },
  { triple: 'x86_64-apple-darwin', nodeArch: 'x64', native: false },
];

export const SIDECAR_BASENAME = 'pi-sidecar';

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

export const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

export const round = (value, digits = 1) => Number(value.toFixed(digits));
