import { spawn } from 'node:child_process';
import { closeSync, mkdtempSync, openSync, readFileSync, renameSync, rmSync, writeFileSync, writeSync, fsyncSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * WORK-STORE-MEASURE · 度量三：kill -9 崩溃注入下的 whole-envelope 恢复窗口。
 *
 * 不实现 WORK-STORE-1；只用真实 SIGKILL 证明 ADR-010 原子替换的崩溃语义：
 *   arm=atomic ：写临时文件 → fsync（macOS 上 Node fsyncSync = F_FULLFSYNC）→ rename → fsync 目录。
 *                target 只由 rename 原子切换，任何时刻都是某个完整版本。
 *   arm=direct ：直接 O_TRUNC 覆写 target（分块慢写模拟非原子写窗口）——对照组。
 * 每轮：先把 target 播种为完整 v0；spawn 子 writer 猛写；随机 3–30ms 后 kill -9；
 * 读回 target 判定「完整/撕裂」。原子替换应恒为完整（恢复窗口 = 至多 1 次在途 CAS）；
 * 直接覆写会撕裂并连旧版本一起丢失（这正是为何 whole-envelope 必须走原子替换，而非就地改写）。
 *
 * 运行：node crash-inject.mjs [trials]
 * 子进程模式（内部自 spawn）：node crash-inject.mjs --writer <atomic|direct> <dir>
 */

const PAYLOAD_TARGET_BYTES = 36 * 1024; // 与实测峰值同量级

function makePayload(version) {
  const head = { storageVersion: 1, revision: version, sentinelBegin: true };
  const filler = 'E'.repeat(Math.max(0, PAYLOAD_TARGET_BYTES - 200));
  // __complete 在最后：只有整份 JSON 写全并可 parse，且末字段在场，才算完整。
  return JSON.stringify({ ...head, filler, __complete: true });
}

function spin(microseconds) {
  const end = process.hrtime.bigint() + BigInt(microseconds) * 1000n;
  while (process.hrtime.bigint() < end) { /* busy wait to widen the partial-write window */ }
}

/* ── 子进程：writer 猛写循环，直到被 kill -9 ── */
function runWriter(arm, dir) {
  const target = join(dir, 'envelope.json');
  const tmp = join(dir, 'envelope.json.tmp');
  process.stdout.write('ready\n'); // 通知父进程可以开始计时
  let version = 1;
  // 无限循环；正常情况下永不返回（被 SIGKILL 终止）。
  for (;;) {
    const json = makePayload(version);
    if (arm === 'atomic') {
      writeFileSync(tmp, json);
      const fd = openSync(tmp, 'r+');
      fsyncSync(fd);
      closeSync(fd);
      renameSync(tmp, target);
      const dfd = openSync(dir, 'r');
      fsyncSync(dfd);
      closeSync(dfd);
    } else {
      // 直接就地覆写：O_TRUNC 先清空 target，再分块慢写——制造可被 kill 命中的部分写窗口。
      const fd = openSync(target, 'w');
      const buf = Buffer.from(json, 'utf-8');
      const chunk = Math.ceil(buf.length / 4);
      for (let off = 0; off < buf.length; off += chunk) {
        writeSync(fd, buf, off, Math.min(chunk, buf.length - off), off);
        spin(250); // 每块间停留，拉宽撕裂窗口
      }
      fsyncSync(fd);
      closeSync(fd);
    }
    version += 1;
  }
}

/* ── 判定 target 是否完整 whole-envelope ── */
function inspect(target) {
  let raw;
  try {
    raw = readFileSync(target, 'utf-8');
  } catch {
    return { complete: false, why: 'ENOENT/read-fail' };
  }
  if (raw.length === 0) return { complete: false, why: 'empty(truncated)' };
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { complete: false, why: 'unparseable(torn)', bytes: raw.length };
  }
  if (parsed.__complete !== true || parsed.storageVersion !== 1 || typeof parsed.revision !== 'number') {
    return { complete: false, why: 'missing-sentinel(torn)', bytes: raw.length };
  }
  return { complete: true, revision: parsed.revision, bytes: raw.length };
}

function killAfterReady(child, delayMs) {
  return new Promise((resolve) => {
    let killed = false;
    let stdoutBuf = '';
    const doKill = () => {
      if (killed) return;
      killed = true;
      const killedAt = process.hrtime.bigint();
      let delivered;
      try {
        delivered = process.kill(child.pid, 'SIGKILL');
      } catch {
        delivered = false;
      }
      resolve({ killedAt, delivered });
    };
    child.stdout.on('data', (d) => {
      stdoutBuf += d.toString();
      if (stdoutBuf.includes('ready')) setTimeout(doKill, delayMs);
    });
    // 兜底：即便没收到 ready 也在 200ms 后开杀，避免挂死
    setTimeout(doKill, 200 + delayMs);
  });
}

async function oneTrial(arm, selfPath, dir, delayMs) {
  const target = join(dir, 'envelope.json');
  writeFileSync(target, makePayload(0)); // 播种完整 v0
  const child = spawn(process.execPath, [selfPath, '--writer', arm, dir], { stdio: ['ignore', 'pipe', 'ignore'] });
  const pid = child.pid;
  const { delivered } = await killAfterReady(child, delayMs);
  const exit = await new Promise((resolve) => {
    child.on('exit', (code, signal) => resolve({ code, signal }));
  });
  const state = inspect(target);
  return { pid, delayMs, killDelivered: delivered, exitSignal: exit.signal, exitCode: exit.code, state };
}

async function runArm(arm, selfPath, trials) {
  const dir = mkdtempSync(join(tmpdir(), `courtwork-crash-${arm}-`));
  const records = [];
  for (let t = 0; t < trials; t += 1) {
    const delayMs = 3 + Math.floor(Math.random() * 28); // 3–30ms
    records.push(await oneTrial(arm, selfPath, dir, delayMs));
  }
  rmSync(dir, { recursive: true, force: true });
  return records;
}

function summarize(arm, records) {
  const killedBySig = records.filter((r) => r.exitSignal === 'SIGKILL').length;
  const torn = records.filter((r) => !r.state.complete);
  const complete = records.filter((r) => r.state.complete);
  console.log(`— arm=${arm}（${records.length} 轮）—`);
  console.log(`  实际 SIGKILL 终止：${killedBySig}/${records.length}（exitSignal=SIGKILL）`);
  console.log(`  崩溃后 target 完整：${complete.length}/${records.length}`);
  console.log(`  崩溃后 target 撕裂：${torn.length}/${records.length}`);
  if (torn.length > 0) {
    const reasons = {};
    for (const r of torn) reasons[r.state.why] = (reasons[r.state.why] ?? 0) + 1;
    console.log(`    撕裂类型：${JSON.stringify(reasons)}`);
  }
  // 抽样打印前 5 条真实 kill 记录（pid + 信号 + 延迟 + 落点版本/状态）
  console.log('  样本 kill 记录（前 5 条）：');
  for (const r of records.slice(0, 5)) {
    const st = r.state.complete ? `完整 v${r.state.revision}` : `撕裂(${r.state.why})`;
    console.log(`    pid=${r.pid} sig=${r.exitSignal} delay=${r.delayMs}ms → ${st}`);
  }
  return { arm, trials: records.length, killedBySig, complete: complete.length, torn: torn.length };
}

async function main() {
  const selfPath = fileURLToPath(import.meta.url);
  const trials = process.argv[2] ? Math.max(5, parseInt(process.argv[2], 10)) : 40;

  console.log('==== WORK-STORE-MEASURE · 度量三：kill -9 崩溃注入 → whole-envelope 恢复窗口 ====');
  console.log(`payload≈${(PAYLOAD_TARGET_BYTES / 1024).toFixed(0)}KiB（同实测峰值量级）；每 arm ${trials} 轮真实 SIGKILL\n`);

  const atomic = summarize('atomic', await runArm('atomic', selfPath, trials));
  console.log('');
  const direct = summarize('direct', await runArm('direct', selfPath, trials));
  console.log('');
  console.log('— 结论 —');
  console.log(`  原子替换：撕裂 ${atomic.torn}/${atomic.trials}。target 恒为某个完整版本 → 恢复窗口 = 至多 1 次在途 CAS，无需 WAL 重放。`);
  console.log(`  直接覆写：撕裂 ${direct.torn}/${direct.trials}。O_TRUNC 先毁旧版本，crash 落窗即撕裂且旧版本一并丢失 → 反证必须走原子替换。`);
  if (atomic.torn !== 0) {
    console.error('  [异常] 原子替换出现撕裂——与 APFS rename 原子性预期不符，需复查。');
    process.exitCode = 1;
  }
}

// 分派：子进程 writer 模式 vs 父进程 orchestrator 模式
if (process.argv[2] === '--writer') {
  runWriter(process.argv[3], process.argv[4]);
} else {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
