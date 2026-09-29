import assert from "node:assert/strict";
import { test } from "node:test";
import { spawn } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, realpath, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createWsGrepTool, createWsListTool } from "../runtime/workspace-tools.mjs";

// AR2 / D6: the identity of every file ws_grep and ws_list report is
// established descriptor-relative from one workspace root descriptor. Every
// fixture here is synthetic and lives under os.tmpdir().

async function fixture(t) {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), "cw-ws-identity-")));
  t.after(() => rm(root, { recursive: true, force: true }));
  const workspace = path.join(root, "workspace");
  const outside = path.join(root, "outside");
  await mkdir(path.join(workspace, "materials"), { recursive: true });
  await mkdir(outside);
  await writeFile(path.join(workspace, "materials", "open.txt"), "SENTINEL inside\n");
  await writeFile(path.join(outside, "open.txt"), "SENTINEL outside\n");
  return { root, workspace, outside };
}

/** Runs the real helper under a wrapper that injects one scheduling step: the
 * first time the helper opens `materials` as a directory relative to a
 * descriptor, the wrapper first replaces it with a symlink to `outside`. This
 * is the walk's equivalent of the lstat/opendir boundary. */
async function withSwapHook(t, { root, workspace, outside }, extra = "") {
  const marker = path.join(root, "swapped");
  const hook = path.join(root, "hook.py");
  await writeFile(hook, `import os, runpy, sys, time
real_open = os.open
state = {"swapped": False}
def hooked(file, flags, mode=0o777, *, dir_fd=None):
    if not state["swapped"] and file == "materials" and dir_fd is not None and flags & os.O_DIRECTORY:
        state["swapped"] = True
        os.rename(${JSON.stringify(path.join(workspace, "materials"))}, ${JSON.stringify(path.join(workspace, "materials.saved"))})
        os.symlink(${JSON.stringify(outside)}, ${JSON.stringify(path.join(workspace, "materials"))})
        open(${JSON.stringify(marker)}, "w").close()
    return real_open(file, flags, mode, dir_fd=dir_fd)
os.open = hooked
os.supports_dir_fd.add(hooked)
${extra}
sys.argv = sys.argv[1:]
runpy.run_path(sys.argv[0], run_name="__main__")
`);
  const wrapper = path.join(root, "python-hook");
  await writeFile(wrapper, `#!/bin/sh\nexec ${JSON.stringify(process.env.WORK_AGENT_PYTHON ?? "python3")} ${JSON.stringify(hook)} "$@"\n`);
  await chmod(wrapper, 0o755);
  const previous = process.env.WORK_AGENT_PYTHON;
  process.env.WORK_AGENT_PYTHON = wrapper;
  t.after(() => { if (previous === undefined) delete process.env.WORK_AGENT_PYTHON; else process.env.WORK_AGENT_PYTHON = previous; });
  return marker;
}

test("AR2: a directory swapped for an outside symlink between naming and opening it during the walk is not followed (ws_grep)", async (t) => {
  const paths = await fixture(t);
  const marker = await withSwapHook(t, paths);
  const result = await createWsGrepTool({ workspaceDir: paths.workspace }).execute("call", { pattern: "SENTINEL" });
  assert.ok(existsSync(marker), "the swap must happen at the traversal boundary");
  assert.ok(!JSON.stringify(result).includes("outside"), "nothing from outside the workspace is returned");
  assert.deepEqual(result.details.matches, []);
});

test("AR2: the same swap during ws_list lists and hashes nothing from outside", async (t) => {
  const paths = await fixture(t);
  await writeFile(path.join(paths.outside, "outside-only.txt"), "SENTINEL outside\n");
  const marker = await withSwapHook(t, paths);
  const result = await createWsListTool({ workspaceDir: paths.workspace }).execute("call", {});
  assert.ok(existsSync(marker), "the swap must happen at the traversal boundary");
  assert.ok(!result.details.files.some((file) => file.path.includes("outside-only")));
  assert.deepEqual(result.details.files, []);
});

test("AR2: cancelling ws_grep while the helper runs settles only after the helper process has exited", async (t) => {
  const paths = await fixture(t);
  const pidFile = path.join(paths.root, "helper.pid");
  await withSwapHook(t, paths, `open(${JSON.stringify(pidFile)}, "w").write(str(os.getpid()))\ntime.sleep(5)`);
  const controller = new AbortController();
  const tool = createWsGrepTool({ workspaceDir: paths.workspace });
  const pending = tool.execute("call", { pattern: "SENTINEL" }, controller.signal);
  pending.catch(() => {});
  const deadline = Date.now() + 5000;
  while (!existsSync(pidFile) || !(await readFile(pidFile, "utf8"))) {
    assert.ok(Date.now() < deadline, "ws_grep must run the workspace helper");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  const pid = Number(await readFile(pidFile, "utf8"));
  controller.abort();
  await assert.rejects(pending, /cancelled/);
  assert.throws(() => process.kill(pid, 0), { code: "ESRCH" }, "the helper process has stopped before the tool settles");
});

// Evidence, not proof: a passing loop shows that no interleaving this machine
// produced in these iterations leaked; it cannot enumerate every schedule.
test("AR2: a real concurrent process swapping materials for an outside symlink never leaks outside text into 200 ws_grep runs", { timeout: 120_000 }, async (t) => {
  const { root, workspace } = await fixture(t);
  const stopFile = path.join(root, "stop");
  const countFile = path.join(root, "swaps");
  const swapper = path.join(root, "swapper.mjs");
  await writeFile(swapper, `import { renameSync, symlinkSync, unlinkSync, existsSync, writeFileSync } from "node:fs";
const dir = ${JSON.stringify(path.join(workspace, "materials"))};
const real = dir + ".real";
const outside = ${JSON.stringify(path.join(root, "outside"))};
let swaps = 0;
for (;;) {
  renameSync(dir, real); symlinkSync(outside, dir);
  unlinkSync(dir); renameSync(real, dir);
  swaps += 1;
  if (swaps % 64 === 0 && existsSync(${JSON.stringify(stopFile)})) break;
}
writeFileSync(${JSON.stringify(countFile)}, String(swaps));
`);
  const child = spawn(process.execPath, [swapper], { stdio: "ignore" });
  t.after(() => child.kill("SIGKILL"));
  const tool = createWsGrepTool({ workspaceDir: workspace });
  let iterations = 0;
  let sawInside = 0;
  let failed = 0;
  const leaks = [];
  for (; iterations < 200; iterations += 1) {
    try {
      const result = await tool.execute("call", { pattern: "SENTINEL" });
      if (result.details.matches.some((match) => match.text.includes("outside"))) leaks.push(result.details.matches);
      if (result.details.matches.some((match) => match.text.includes("inside"))) sawInside += 1;
    } catch (error) {
      // A walk that meets the symlink at the scope may fail; it must not leak.
      assert.ok(!String(error.message).includes("outside"));
      failed += 1;
    }
  }
  await writeFile(stopFile, "");
  await new Promise((resolve) => child.once("exit", resolve));
  const swaps = Number(await readFile(countFile, "utf8"));
  t.diagnostic(`iterations=${iterations} swaps=${swaps} sawInside=${sawInside} failed=${failed} leaks=${leaks.length}`);
  assert.ok(swaps > 0, "the concurrent process must actually swap");
  assert.deepEqual(leaks, []);
});

async function aliasesCase(dir) {
  try { await stat(path.join(dir, "MATERIALS", "SECRET.TXT")); return true; } catch { return false; }
}

test("F3 / D6: an alias-spelled scope is admitted in the on-disk spelling", async (t) => {
  const { workspace } = await fixture(t);
  await writeFile(path.join(workspace, "materials", "secret.txt"), "SENTINEL secret\n");
  if (!await aliasesCase(workspace)) return t.skip("this volume does not alias upper and lower case names");
  const admitPath = (tool, resource) => tool === "ws_read" && resource === "materials/secret.txt" ? "deny" : "allow";
  const tool = createWsGrepTool({ workspaceDir: workspace, admitPath });
  const scoped = await tool.execute("call", { pattern: "SENTINEL", path: "MATERIALS" });
  assert.deepEqual(scoped.details.matches, [{ path: "materials/open.txt", line: 1, text: "SENTINEL inside" }]);
  assert.equal(scoped.details.excludedByPolicy, 1);
  assert.ok(!JSON.stringify(scoped).includes("secret"));
  const single = await tool.execute("call", { pattern: "SENTINEL", path: "MATERIALS/SECRET.TXT" });
  assert.deepEqual(single.details.matches, []);
  assert.equal(single.details.excludedByPolicy, 1);
});

