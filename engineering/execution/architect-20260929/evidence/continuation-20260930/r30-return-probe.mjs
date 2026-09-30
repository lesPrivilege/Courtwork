import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

// Source-pinned synthetic probes for R30-1 on the architect integration
// worktree. Each case uses a fresh temporary root and removes it afterward.
const source = process.argv[2];
assert.ok(source, "usage: node r30-return-probe.mjs /path/to/reviewed/checkout");
const { createWsWriteTool } = await import(path.join(source, "app/runtime/workspace-tools.mjs"));
const sourceHead = execFileSync("git", ["-C", source, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const expectFixed = process.argv.includes("--expect-fixed");
const previousPython = process.env.WORK_AGENT_PYTHON;

async function runCase(kind) {
  const root = await mkdtemp(path.join(tmpdir(), `cw-r30-${kind}-`));
  const workspace = path.join(root, "workspace");
  const outside = path.join(root, "outside");
  const helperMove = kind === "parent"
    ? [path.join(workspace, "out"), path.join(outside, "moved-parent")]
    : [workspace, path.join(outside, "moved-root")];
  const movedParent = kind === "parent"
    ? helperMove[1]
    : path.join(helperMove[1], "out");
  const hook = path.join(root, "hook.py");
  const wrapper = path.join(root, "python-hook");
  const unrelated = path.join(outside, "unrelated.txt");

  try {
    await mkdir(path.join(workspace, "out"), { recursive: true });
    await mkdir(outside);
    await writeFile(unrelated, "unrelated outside control\n");
    await writeFile(hook, `import os, runpy, sys
real_rename = os.rename
fired = False
def hooked_rename(src, dst, *, src_dir_fd=None, dst_dir_fd=None):
    global fired
    if not fired and src_dir_fd is not None and src.endswith(".tmp"):
        fired = True
        real_rename(${JSON.stringify(helperMove[0])}, ${JSON.stringify(helperMove[1])})
    return real_rename(src, dst, src_dir_fd=src_dir_fd, dst_dir_fd=dst_dir_fd)
os.rename = hooked_rename
sys.argv = sys.argv[1:]
runpy.run_path(sys.argv[0], run_name="__main__")
`);
    await writeFile(wrapper, `#!/bin/sh\nexec python3 ${JSON.stringify(hook)} "$@"\n`);
    await chmod(wrapper, 0o755);
    process.env.WORK_AGENT_PYTHON = wrapper;

    const written = [];
    const result = await createWsWriteTool({
      workspaceDir: workspace,
      permissionMode: "draft",
      saveHistory: async () => {},
      onWritten: async (artifact) => written.push(artifact),
    }).execute(`synthetic-${kind}`, { path: "out/memo.md", text: `synthetic ${kind} bytes\n` });
    const bytesAtMovedParent = await readFile(path.join(movedParent, "memo.md"), "utf8");
    const unrelatedAfter = await readFile(unrelated, "utf8");
    const originalWorkspaceExists = await stat(workspace).then(() => true, () => false);
    return {
      kind,
      resultDetails: result.details,
      resultText: result.content?.[0]?.text,
      onWrittenRecords: written,
      bytesAtMovedParent: bytesAtMovedParent.trimEnd(),
      unrelatedOutsideControlUnchanged: unrelatedAfter === "unrelated outside control\n",
      originalWorkspacePathExists: originalWorkspaceExists,
    };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

try {
  const parent = await runCase("parent");
  assert.equal(parent.resultDetails.placement, expectFixed ? "unconfirmed" : "moved");
  assert.deepEqual(parent.onWrittenRecords, []);
  assert.equal(parent.bytesAtMovedParent, "synthetic parent bytes");
  const root = await runCase("root");
  // This is the residual under review: the descriptor-relative postcheck
  // follows the held root descriptor and does not verify rootPath placement.
  assert.equal(root.resultDetails.placement, expectFixed ? "unconfirmed" : undefined);
  assert.equal(root.onWrittenRecords.length, expectFixed ? 0 : 1);
  assert.equal(root.bytesAtMovedParent, "synthetic root bytes");
  assert.equal(root.originalWorkspacePathExists, false);
  console.log(JSON.stringify({ sourceHead, expectFixed, parent, root }));
} finally {
  if (previousPython === undefined) delete process.env.WORK_AGENT_PYTHON;
  else process.env.WORK_AGENT_PYTHON = previousPython;
}
