import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { createRuntime } from "../server/runtime.mjs";
import { PI_EXECUTOR_ID } from "../server/executor-choice-state.mjs";
import { createAgentsLoopback } from "./fixtures/agents-api-loopback.mjs";
import { agentsPort } from "./fixtures/agents-host-harness.mjs";

test("R1-R3 a constructed wrong-ID managed port and the Pi port each dispose once on rejection", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "cw-executor-construction-"));
  let piClosed = 0, managedClosed = 0;
  try {
    await assert.rejects(createRuntime({
      dataDir: dir, logger: () => {},
      runtimePort: () => ({ id: PI_EXECUTOR_ID, close() { piClosed++; } }),
      managedRuntimePort: () => ({ id: "wrong-executor", close() { managedClosed++; } }),
    }), /only the reviewed managed Agents adapter is eligible/);
    assert.deepEqual([piClosed, managedClosed], [1, 1]);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("R1-R3 a factory throw before return closes only the port already constructed", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "cw-executor-construction-throw-"));
  let piClosed = 0;
  try {
    await assert.rejects(createRuntime({
      dataDir: dir, logger: () => {},
      runtimePort: () => ({ id: PI_EXECUTOR_ID, close() { piClosed++; } }),
      managedRuntimePort: () => { throw new Error("managed factory failed before returning"); },
    }), /managed factory failed before returning/);
    assert.equal(piClosed, 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("R1-R3 a valid configured managed port closes once across repeated Host close", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "cw-executor-construction-valid-"));
  const loopback = await createAgentsLoopback();
  let runtime, managedClosed = 0;
  try {
    const factory = agentsPort(loopback);
    runtime = await createRuntime({
      dataDir: dir, logger: () => {},
      managedRuntimePort: () => ({ ...factory(), close() { managedClosed++; } }),
    });
    await runtime.close();
    await runtime.close();
    assert.equal(managedClosed, 1);
  } finally {
    await runtime?.close();
    await loopback.close();
    await rm(dir, { recursive: true, force: true });
  }
});
