import assert from "node:assert/strict";
import { test } from "node:test";
import { spawn, execFileSync } from "node:child_process";
import fs, { chmod, mkdir, mkdtemp, readFile, readdir, realpath, rm, stat, symlink, writeFile } from "node:fs/promises";
import { existsSync, renameSync, symlinkSync, writeFileSync } from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { createWsReadTool, createWsWriteTool } from "../runtime/workspace-tools.mjs";
import { governTools } from "../runtime/control-tools.mjs";

// ws_read and ws_write establish the identity of the file they read or write
// descriptor-relative from the workspace root. Every fixture here is synthetic
// and lives under os.tmpdir().

async function fixture(t) {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), "cw-ws-file-identity-")));
  t.after(() => rm(root, { recursive: true, force: true }));
  const workspace = path.join(root, "workspace");
  const outside = path.join(root, "outside");
  await mkdir(path.join(workspace, "materials"), { recursive: true });
  await mkdir(path.join(workspace, "out"));
  await mkdir(outside);
  await writeFile(path.join(workspace, "materials", "open.txt"), "SENTINEL inside\n");
  await writeFile(path.join(outside, "open.txt"), "SENTINEL outside\n");
  await writeFile(path.join(outside, "memo.md"), "outside original\n");
  return { root, workspace, outside };
}

async function outsideState(outside) {
  const names = (await readdir(outside)).sort();
  return Object.fromEntries(await Promise.all(names.map(async (name) => [name, await readFile(path.join(outside, name), "utf8")])));
}

/** One swap of workspace/<dir> for a symlink to `outside`, at the boundary
 * each implementation has: in the fixed helper, just before it opens <dir> as
 * a directory relative to a descriptor; in a path-based Node implementation,
 * just before `nodeCall` (fs.stat or fs.mkdir) reaches `nodeTarget`. Whichever
 * comes first performs the swap; the marker file records that it happened. */
async function installSwap(t, { root, workspace, outside }, { dir, nodeCall, nodeTarget }) {
  const marker = path.join(root, "swapped");
  const from = path.join(workspace, dir);
  const swap = () => {
    if (existsSync(marker)) return;
    renameSync(from, from + ".saved");
    symlinkSync(outside, from);
    writeFileSync(marker, "");
  };
  const hook = path.join(root, "hook.py");
  await writeFile(hook, `import os, runpy, sys
real_open = os.open
def hooked(file, flags, mode=0o777, *, dir_fd=None):
    if file == ${JSON.stringify(dir)} and dir_fd is not None and flags & os.O_DIRECTORY and not os.path.exists(${JSON.stringify(marker)}):
        os.rename(${JSON.stringify(from)}, ${JSON.stringify(from + ".saved")})
        os.symlink(${JSON.stringify(outside)}, ${JSON.stringify(from)})
        open(${JSON.stringify(marker)}, "w").close()
    return real_open(file, flags, mode, dir_fd=dir_fd)
os.open = hooked
os.supports_dir_fd.add(hooked)
sys.argv = sys.argv[1:]
runpy.run_path(sys.argv[0], run_name="__main__")
`);
  const wrapper = path.join(root, "python-hook");
  await writeFile(wrapper, `#!/bin/sh\nexec ${JSON.stringify(process.env.WORK_AGENT_PYTHON ?? "python3")} ${JSON.stringify(hook)} "$@"\n`);
  await chmod(wrapper, 0o755);
  const previousPython = process.env.WORK_AGENT_PYTHON;
  process.env.WORK_AGENT_PYTHON = wrapper;
  const original = fs[nodeCall];
  fs[nodeCall] = async function (file, ...rest) {
    if (String(file) === nodeTarget) swap();
    return original.call(this, file, ...rest);
  };
  syncBuiltinESMExports();
  t.after(() => {
    fs[nodeCall] = original;
    syncBuiltinESMExports();
    if (previousPython === undefined) delete process.env.WORK_AGENT_PYTHON; else process.env.WORK_AGENT_PYTHON = previousPython;
  });
  return marker;
}

async function settle(promise) {
  try { return { result: await promise }; } catch (error) { return { error }; }
}

/** A child process that swaps workspace/<dir> with a symlink to `outside` as
 * fast as it can until told to stop; it reports how many swaps it made. */
async function startSwapper(t, { root, workspace, outside }, dir) {
  const stopFile = path.join(root, "stop");
  const countFile = path.join(root, "swaps");
  const readyFile = path.join(root, "swapping");
  const script = path.join(root, "swapper.mjs");
  writeFileSync(script, `import { renameSync, symlinkSync, unlinkSync, existsSync, writeFileSync } from "node:fs";
const dir = ${JSON.stringify(path.join(workspace, dir))};
const real = dir + ".real";
let swaps = 0;
for (;;) {
  renameSync(dir, real); symlinkSync(${JSON.stringify(outside)}, dir);
  unlinkSync(dir); renameSync(real, dir);
  swaps += 1;
  if (swaps === 64) writeFileSync(${JSON.stringify(readyFile)}, "");
  if (swaps % 64 === 0 && existsSync(${JSON.stringify(stopFile)})) break;
}
writeFileSync(${JSON.stringify(countFile)}, String(swaps));
`);
  const child = spawn(process.execPath, [script], { stdio: "ignore" });
  t.after(() => child.kill("SIGKILL"));
  const deadline = Date.now() + 10_000;
  while (!existsSync(readyFile)) {
    if (Date.now() > deadline) throw new Error("the swapping process did not start");
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  const exited = new Promise((resolve) => child.once("exit", (code) => resolve(code)));
  return async () => {
    writeFileSync(stopFile, "");
    // A swapper that stopped early (for example because a directory it
    // expected to move was recreated) exits non-zero without a count.
    const code = await exited;
    return { code, swaps: code === 0 ? Number(await readFile(countFile, "utf8")) : 0 };
  };
}

async function aliasesCase(dir) {
  try { await stat(path.join(dir, "MATERIALS", "OPEN.TXT")); return true; } catch { return false; }
}

// ws_read

test("ws_read: a parent directory swapped for an outside symlink after the path was checked is not followed", async (t) => {
  const paths = await fixture(t);
  const marker = await installSwap(t, paths, { dir: "materials", nodeCall: "stat", nodeTarget: path.join(paths.workspace, "materials", "open.txt") });
  const outcome = await settle(createWsReadTool({ workspaceDir: paths.workspace }).execute("call", { path: "materials/open.txt" }));
  assert.ok(existsSync(marker), "the swap must happen");
  assert.ok(!JSON.stringify(outcome.result ?? {}).includes("outside"), "no outside text is returned");
  assert.match(outcome.error?.message ?? "", /symlink/);
});

// Evidence, not proof: a passing loop shows only that the interleavings this
// machine produced in these iterations did not leak.
test("ws_read: a real concurrent process swapping materials never makes 200 reads return outside text", { timeout: 120_000 }, async (t) => {
  const paths = await fixture(t);
  const stop = await startSwapper(t, paths, "materials");
  const tool = createWsReadTool({ workspaceDir: paths.workspace });
  let iterations = 0, inside = 0, failed = 0;
  const leaks = [];
  for (; iterations < 200; iterations += 1) {
    const outcome = await settle(tool.execute("call", { path: "materials/open.txt" }));
    const text = outcome.result?.content?.[0]?.text ?? "";
    if (text.includes("outside")) leaks.push(text);
    if (text.includes("inside")) inside += 1;
    if (outcome.error) { failed += 1; assert.ok(!outcome.error.message.includes("outside")); }
  }
  const { code, swaps } = await stop();
  t.diagnostic(`iterations=${iterations} swaps=${swaps} inside=${inside} failed=${failed} leaks=${leaks.length}`);
  assert.deepEqual(leaks, []);
  assert.equal(code, 0, "the swapping process ran until it was told to stop");
  assert.ok(swaps > 0, "the concurrent process must actually swap");
});

test("ws_read: an alias-spelled path reads the file and reports its on-disk spelling", async (t) => {
  const { workspace } = await fixture(t);
  if (!await aliasesCase(workspace)) return t.skip("this volume does not alias upper and lower case names");
  const result = await createWsReadTool({ workspaceDir: workspace }).execute("call", { path: "MATERIALS/OPEN.TXT" });
  assert.equal(result.content[0].text, "SENTINEL inside\n");
  assert.deepEqual(result.details, { path: "materials/open.txt", bytes: 16 });
});

// ws_write

function writeTool(workspace, record = []) {
  return createWsWriteTool({
    workspaceDir: workspace, permissionMode: "draft",
    saveHistory: async (content, digest) => { record.push(["history", content.toString("utf8"), digest]); },
    onWritten: async (artifact) => { record.push(["written", artifact]); },
  });
}

test("ws_write: a parent directory swapped for an outside symlink after the path was checked creates and changes nothing outside", async (t) => {
  const paths = await fixture(t);
  const before = await outsideState(paths.outside);
  const marker = await installSwap(t, paths, { dir: "out", nodeCall: "mkdir", nodeTarget: path.join(paths.workspace, "out") });
  const outcome = await settle(writeTool(paths.workspace).execute("call", { path: "out/memo.md", text: "written by ws_write\n" }));
  assert.ok(existsSync(marker), "the swap must happen");
  assert.deepEqual(await outsideState(paths.outside), before, "the outside directory is unchanged");
  assert.match(outcome.error?.message ?? "", /symlink/);
  assert.deepEqual(await readdir(path.join(paths.workspace, "out.saved")), [], "nothing is left in the real directory");
});

test("ws_write: a parent swapped between staging and publishing publishes nothing, inside or outside", async (t) => {
  const paths = await fixture(t);
  const before = await outsideState(paths.outside);
  const tool = createWsWriteTool({
    workspaceDir: paths.workspace, permissionMode: "draft",
    // History runs after the bytes are staged and before they are published.
    saveHistory: async () => {
      renameSync(path.join(paths.workspace, "out"), path.join(paths.workspace, "out.saved"));
      symlinkSync(paths.outside, path.join(paths.workspace, "out"));
    },
    onWritten: async () => { throw new Error("must not record a write that did not land"); },
  });
  const outcome = await settle(tool.execute("call", { path: "out/memo.md", text: "written by ws_write\n" }));
  assert.match(outcome.error?.message ?? "", /symlink/);
  assert.deepEqual(await outsideState(paths.outside), before);
  assert.ok(!(await readdir(path.join(paths.workspace, "out.saved"))).includes("memo.md"), "the target was not published");
});

test("ws_write: a real concurrent process swapping out/ never makes 200 writes change anything outside", { timeout: 120_000 }, async (t) => {
  const paths = await fixture(t);
  const before = await outsideState(paths.outside);
  const stop = await startSwapper(t, paths, "out");
  const tool = writeTool(paths.workspace);
  let iterations = 0, written = 0, failed = 0;
  for (; iterations < 200; iterations += 1) {
    const outcome = await settle(tool.execute("call", { path: "out/memo.md", text: `write ${iterations}\n` }));
    if (outcome.error) failed += 1; else written += 1;
  }
  const { code, swaps } = await stop();
  t.diagnostic(`iterations=${iterations} swaps=${swaps} written=${written} failed=${failed}`);
  assert.deepEqual(await outsideState(paths.outside), before, "the outside directory is unchanged");
  assert.equal(code, 0, "the swapping process ran until it was told to stop; a write must not recreate the directory it moves");
  assert.ok(swaps > 0, "the concurrent process must actually swap");
});

test("ws_write: a symlink, a directory or a FIFO at the target is refused and left in place", async (t) => {
  const { workspace, outside } = await fixture(t);
  await symlink(path.join(outside, "memo.md"), path.join(workspace, "out", "link.md"));
  await mkdir(path.join(workspace, "out", "adir"));
  execFileSync("mkfifo", [path.join(workspace, "out", "fifo")]);
  const tool = writeTool(workspace);
  await assert.rejects(tool.execute("call", { path: "out/link.md", text: "x\n" }), /symlink/);
  await assert.rejects(tool.execute("call", { path: "out/adir", text: "x\n" }), /path is not a file/);
  await assert.rejects(tool.execute("call", { path: "out/fifo", text: "x\n" }), /path is not a file/);
  assert.ok((await fs.lstat(path.join(workspace, "out", "link.md"))).isSymbolicLink());
  assert.ok((await fs.lstat(path.join(workspace, "out", "adir"))).isDirectory());
  assert.ok((await fs.lstat(path.join(workspace, "out", "fifo"))).isFIFO());
  assert.equal(await readFile(path.join(outside, "memo.md"), "utf8"), "outside original\n");
  assert.deepEqual((await readdir(path.join(workspace, "out"))).sort(), ["adir", "fifo", "link.md"], "no staged file is left behind");
});

test("ws_write: a write, an overwrite and a new subdirectory behave as before; history precedes publishing and the record follows it", async (t) => {
  const { workspace } = await fixture(t);
  const record = [];
  const target = path.join(workspace, "out", "memo.md");
  const tool = createWsWriteTool({
    workspaceDir: workspace, permissionMode: "draft",
    saveHistory: async (content, digest) => { record.push(["history", content.toString("utf8"), digest, existsSync(target) ? await readFile(target, "utf8") : null]); },
    onWritten: async (artifact) => { record.push(["written", artifact, await readFile(target, "utf8")]); },
  });
  const first = await tool.execute("call", { path: "out/memo.md", text: "first\n" });
  const second = await tool.execute("call", { path: "out/memo.md", text: "second\n" });
  assert.equal(first.content[0].text, "wrote out/memo.md (6 bytes)");
  assert.equal(second.details.path, "out/memo.md");
  assert.equal(await readFile(target, "utf8"), "second\n");
  const digest = (text) => createHash("sha256").update(text).digest("hex");
  assert.deepEqual(record, [
    ["history", "first\n", digest("first\n"), null],
    ["written", { path: "out/memo.md", bytes: 6, sha256: digest("first\n") }, "first\n"],
    ["history", "second\n", digest("second\n"), "first\n"],
    ["written", { path: "out/memo.md", bytes: 7, sha256: digest("second\n") }, "second\n"],
  ]);
  await assert.rejects(tool.execute("call", { path: "out/newdir/file.md", text: "x\n" }), /parent directory does not exist/);
  assert.deepEqual((await readdir(path.join(workspace, "out"))).sort(), ["memo.md"], "no staged file is left behind");
});

test("ws_write: an alias-spelled path writes the existing file and the approval and record name it on disk", async (t) => {
  const { workspace } = await fixture(t);
  await writeFile(path.join(workspace, "out", "memo.md"), "old\n");
  if (!await aliasesCase(workspace)) return t.skip("this volume does not alias upper and lower case names");
  const record = [];
  const asked = [];
  const binding = {
    resources: [{ id: "tool:ws_write", kind: "tool", action: "ws_write", exposed: true }],
    policies: [{ scope: { type: "user", id: "local" }, rules: [{ action: "ws_write", resource: "out/*", effect: "ask" }] }],
  };
  const [tool] = governTools([writeTool(workspace, record)], {
    binding, permissionMode: "draft", workspaceDir: workspace, isOpen: () => true,
    requestPermission: async (request) => { asked.push(request.path); return "allow"; },
  });
  const result = await tool.execute("call", { path: "OUT/MEMO.md", text: "new\n" });
  assert.deepEqual(asked, ["out/memo.md"], "the approval names the file as it is on disk");
  assert.equal(result.details.path, "out/memo.md");
  assert.deepEqual(record.find(([kind]) => kind === "written")[1].path, "out/memo.md");
  assert.equal(await readFile(path.join(workspace, "out", "memo.md"), "utf8"), "new\n");
  assert.deepEqual((await readdir(path.join(workspace, "out"))).sort(), ["memo.md"]);
});
