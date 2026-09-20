import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { startHost } from "../scripts/coding-dogfood-rehearsal.mjs";

for (const phase of ["headers", "body"]) {
  test(`bootstrap ${phase} stall times out and releases the real Host data lock`, async (t) => {
    const dataDir = await mkdtemp(path.join(tmpdir(), "cw-dogfood-startup-"));
    let observedSignal;
    const stall = (signal) => new Promise((resolve, reject) => {
      if (signal.aborted) return reject(signal.reason);
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    });
    const mock = t.mock.method(globalThis, "fetch", async (url, options) => {
      assert.match(String(url), /127\.0\.0\.1:\d+\/api\/v5\/bootstrap$/);
      observedSignal = options?.signal;
      assert.ok(observedSignal, "bootstrap must receive the startup deadline");
      if (phase === "headers") return stall(observedSignal);
      return { json: () => stall(observedSignal) };
    });
    try {
      await assert.rejects(startHost(dataDir, `stalled-${phase}`, { readinessMs: 5000 }),
        (error) => error.name === "TimeoutError");
      assert.equal(observedSignal?.aborted, true);
      mock.mock.restore();
      // Successful reopen proves the previous real child released this lock.
      const reopened = await startHost(dataDir, `after-${phase}`);
      const exit = await reopened.stop();
      assert.equal(exit.code, 0);
      assert.equal(exit.escalated, false);
    } finally {
      mock.mock.restore();
      await rm(dataDir, { recursive: true, force: true });
    }
  });
}
