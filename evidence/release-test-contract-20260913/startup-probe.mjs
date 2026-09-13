// Synthetic ready/close observation; does not change production or fixture deadlines.
import { CoreClient } from '../../app/core/client.mjs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir, availableParallelism, cpus, platform, release } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
const python = fileURLToPath(new URL('../../app/tests/fixtures/review-core-client/worker.py', import.meta.url));
const rows = [];
for (const concurrency of [1, 2, 4, 8]) {
  for (let wave = 0; wave < 3; wave++) {
    await Promise.all(Array.from({ length: concurrency }, async (_, slot) => {
      const dataDir = await mkdtemp(path.join(tmpdir(), 'cw-release-ready-'));
      const client = new CoreClient({ dataDir, dbPath:path.join(dataDir, 'concurrent-starts.db'), python,
        readyTimeoutMs:2000, requestTimeoutMs:100, closeTimeoutMs:40 });
      const began = performance.now(); let child; let readyMs = null; let error = null;
      try { await client.start(); readyMs = performance.now() - began; child = client.process; }
      catch (failure) { child = client.process; error = {code:failure.code, message:failure.message}; }
      finally {
        await client.close();
        const reaped = !child || child.exitCode !== null || child.signalCode !== null;
        rows.push({ concurrency, wave, slot, readyMs, error, reaped });
        await rm(dataDir, { recursive:true, force:true });
      }
    }));
  }
}
const passed = rows.every(row => !row.error && row.reaped);
console.log(JSON.stringify({node:process.version, platform:platform(), release:release(), cpus:cpus().length,
  availableParallelism:availableParallelism(), passed, scope:'Synthetic startup/close only; not a full-suite contention reproduction', rows}, null, 2));
if (!passed) process.exitCode = 1;
