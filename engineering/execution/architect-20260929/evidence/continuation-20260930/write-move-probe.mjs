import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

// Source-pinned reproduction for Courtwork merge 0664387. All filesystem
// fixtures are synthetic and created under the OS temporary directory.
const source = process.argv[2];
assert.ok(source, "usage: node write-move-probe.mjs /path/to/reviewed/checkout");
const sourceHead = execFileSync("git", ["-C", source, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const { createWsWriteTool } = await import(path.join(source, "app/runtime/workspace-tools.mjs"));
const root = await mkdtemp(path.join(tmpdir(), "cw-write-move-race-"));
const workspace = path.join(root, "workspace");
const admittedParent = path.join(workspace, "out");
const outside = path.join(root, "outside");
const movedParent = path.join(outside, "moved-out");
const outsideControl = path.join(outside, "unrelated.txt");
const hook = path.join(root, "hook.py");
const wrapper = path.join(root, "python-hook");
const previousPython = process.env.WORK_AGENT_PYTHON;

try {
  await mkdir(admittedParent, { recursive: true });
  await mkdir(outside);
  await writeFile(outsideControl, "unrelated control remains unchanged\n");

  // The helper's commit calls os.rename with src_dir_fd/dst_dir_fd. Move the
  // already-open parent out of the workspace immediately before forwarding
  // that exact descriptor-relative rename.
  await writeFile(hook, `import os, runpy, sys
real_rename = os.rename
fired = False
def hooked_rename(src, dst, *, src_dir_fd=None, dst_dir_fd=None):
    global fired
    if not fired and src_dir_fd is not None and src.endswith(".tmp"):
        fired = True
        real_rename(${JSON.stringify(admittedParent)}, ${JSON.stringify(movedParent)})
    return real_rename(src, dst, src_dir_fd=src_dir_fd, dst_dir_fd=dst_dir_fd)
os.rename = hooked_rename
sys.argv = sys.argv[1:]
runpy.run_path(sys.argv[0], run_name="__main__")
`);
  await writeFile(wrapper, `#!/bin/sh\nexec python3 ${JSON.stringify(hook)} "$@"\n`);
  await chmod(wrapper, 0o755);
  process.env.WORK_AGENT_PYTHON = wrapper;

  const result = await createWsWriteTool({
    workspaceDir: workspace,
    permissionMode: "draft",
    saveHistory: async () => {},
  }).execute("synthetic-call", { path: "out/memo.md", text: "synthetic authorized bytes\n" });

  const escapedBytes = await readFile(path.join(movedParent, "memo.md"), "utf8");
  const unchangedControl = await readFile(outsideControl, "utf8");
  const workspaceParentExists = await stat(admittedParent).then(() => true, () => false);
  assert.equal(result.details.path, "out/memo.md");
  assert.equal(escapedBytes, "synthetic authorized bytes\n");
  assert.equal(unchangedControl, "unrelated control remains unchanged\n");
  assert.equal(workspaceParentExists, false);

  console.log(JSON.stringify({
    sourceHead,
    hook: "move admitted workspace/out to synthetic outside/moved-out immediately before helper descriptor-relative commit rename",
    toolReportedPath: result.details.path,
    toolReportedSuccess: true,
    bytesAtMovedAdmittedDirectory: escapedBytes.trimEnd(),
    unrelatedOutsideControlUnchanged: unchangedControl.trimEnd(),
    originalWorkspaceParentStillPresent: workspaceParentExists,
  }));
} finally {
  if (previousPython === undefined) delete process.env.WORK_AGENT_PYTHON;
  else process.env.WORK_AGENT_PYTHON = previousPython;
  await rm(root, { recursive: true, force: true });
}
