import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  writeSync,
} from 'node:fs';
import { join } from 'node:path';

import type { WorkStateHostPort } from './work-state-store.js';
import type { WorkSessionRef } from './envelope.js';

/**
 * WORK-STORE-1 · Node-only Work state host adapter（ADR-010 决定二的 opaque blob 参考实现）。
 *
 * 原子替换（同目录临时文件 → F_FULLFSYNC → rename → F_FULLFSYNC 目录项）是唯一耐久原语，
 * measurement 已实证 100 次真实 kill -9 零撕裂、恢复窗口 = 至多 1 次在途 CAS，无需 WAL。
 * macOS 上 Node `fsyncSync` 经 libuv 映射为 `fcntl(F_FULLFSYNC)`（见 REPORT.md §4 注）。
 *
 * 落盘格式：`<generation>\n<envelope-bytes>`。generation 是 host 铸造的不透明、单调递增 version，
 * 与信封内 `revision` 相互独立，随文件持久，跨进程重启仍单调。version 只做等值比较，调用方不解析。
 *
 * 生产宿主由 Tauri/Rust 实现同一 port，并在目标卷另证 F_FULLFSYNC 实际发生、强制 app-data scope /
 * id 形状 / 路径穿越隔离 / 大小上限（ADR-010 第 193–196 行）；本 adapter 供 core 测试与 dev/验收装配。
 *
 * v1 单机单写者：generation 比较拒绝陈旧 expectedVersion（真实 resume 场景）。同 generation 的真并发
 * 写者严格冲突检测由 store 契约与 in-memory host 反例守护；多写者是就绪图明确拒绝项，本 adapter 不设 OS 级锁。
 */

let tmpCounter = 0;

/** 编码 case/session id 为无路径分隔符的文件名段，阻断符号链接/路径穿越（encodeURIComponent 编码 / 与 \）。 */
function encodeSegment(id: string): string {
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error('Work state host ref 段必须是非空字符串');
  }
  return encodeURIComponent(id);
}

interface FramedBlob {
  version: string;
  bytes: Uint8Array;
}

function readFramed(target: string): FramedBlob | null {
  if (!existsSync(target)) return null;
  const buf = readFileSync(target);
  const nl = buf.indexOf(0x0a);
  if (nl < 0) {
    throw new Error(`Work state host 文件缺少 generation 分隔符：${target}`);
  }
  return {
    version: buf.subarray(0, nl).toString('utf-8'),
    bytes: new Uint8Array(buf.subarray(nl + 1)),
  };
}

/** writeSync 可能短写；循环补齐整份 buffer。 */
function writeAll(fd: number, buffer: Buffer): void {
  let offset = 0;
  while (offset < buffer.length) {
    offset += writeSync(fd, buffer, offset, buffer.length - offset);
  }
}

export function createFileWorkStateHost(dir: string): WorkStateHostPort {
  mkdirSync(dir, { recursive: true });
  const pathFor = (ref: WorkSessionRef): string =>
    join(dir, `${encodeSegment(ref.caseId)}__${encodeSegment(ref.sessionId)}.env`);

  const atomicWrite = (target: string, version: string, payload: Uint8Array): void => {
    const tmp = `${target}.${process.pid}.${(tmpCounter += 1)}.tmp`;
    const framed = Buffer.concat([Buffer.from(`${version}\n`, 'utf-8'), Buffer.from(payload)]);
    let fd = openSync(tmp, 'w');
    try {
      // 写全 → 文件级 F_FULLFSYNC（介质刷盘），保证 rename 前临时文件已耐久落盘。
      writeAll(fd, framed);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    // rename 原子切换 target（全有全无）；随后 F_FULLFSYNC 目录项，保证新名字本身耐久。
    renameSync(tmp, target);
    fd = openSync(dir, 'r');
    try {
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
  };

  return {
    async read(ref) {
      const framed = readFramed(pathFor(ref));
      if (!framed) return { found: false };
      return { found: true, version: framed.version, bytes: framed.bytes };
    },
    async compareAndSwap({ ref, expectedVersion, bytes }) {
      const target = pathFor(ref);
      const current = readFramed(target);
      const currentVersion = current?.version ?? null;
      if (currentVersion !== expectedVersion) {
        return { applied: false, version: currentVersion ?? '' };
      }
      const nextGeneration = (current ? Number.parseInt(current.version, 10) : 0) + 1;
      const version = String(nextGeneration);
      atomicWrite(target, version, bytes);
      return { applied: true, version };
    },
  };
}
