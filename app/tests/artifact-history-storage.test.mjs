import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ArtifactHistory } from "../runtime/artifact-history.mjs";
const exec = promisify(execFile);
const digest = (value) => createHash("sha256").update(value).digest("hex");

test("history refs keep exact UTF-8 blobs reachable through Git GC; another session cannot read them", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "se-history-gc-"));
  const history = new ArtifactHistory(dir);
  try {
    const v1 = Buffer.from("第一版\n"); const v2 = Buffer.from("second version\n");
    await history.save("one", v1, digest(v1));
    await history.save("one", v2, digest(v2));
    const repo = history.repository("one");
    const { stdout: objectId } = await exec("git", ["--git-dir", repo, "rev-parse", `refs/content-sha256/${digest(v1)}`]);
    assert.notEqual(objectId.trim(), digest(v1), "Git SHA-256 object ID includes its header");
    await exec("git", ["--git-dir", repo, "gc", "--prune=now"]);
    assert.deepEqual(await history.read("one", digest(v1), v1.length), v1);
    assert.deepEqual(await history.read("one", digest(v2), v2.length), v2);
    await assert.rejects(history.read("two", digest(v1), v1.length), { code: "history_unavailable" });
    await assert.rejects(history.read("one", digest(v1), v1.length + 1), { code: "artifact_integrity_failed" });
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("history cancellation waits for the Git process to exit and the next save repairs interrupted init", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "se-history-cancel-"));
  const bin = path.join(dir, "bin"); await mkdir(bin);
  const pidPath = path.join(dir, "git.pid");
  await writeFile(path.join(bin, "git"), `#!${process.execPath}\nimport fs from 'node:fs';\nif(process.argv.includes('--version')) { console.log('git version 2.50.1'); process.exit(0); }\nfs.writeFileSync(${JSON.stringify(pidPath)}, String(process.pid));\nsetTimeout(()=>{},30000);\n`, { mode: 0o700 });
  const priorPath = process.env.PATH;
  const controller = new AbortController();
  const history = new ArtifactHistory(dir);
  const value = Buffer.from("cancelled init can be retried");
  let outcome;
  try {
    process.env.PATH = bin + path.delimiter + priorPath;
    const task = history.save("session", value, digest(value), { signal: controller.signal });
    outcome = task.then(() => null, (error) => error);
    let pid;
    const deadline = Date.now() + 5000;
    while (!pid && Date.now() < deadline) {
      pid = Number(await readFile(pidPath, "utf8").catch(() => ""));
      if (!pid) await new Promise((r) => setTimeout(r, 10));
    }
    assert(pid, "the injected Git process must have started");
    controller.abort();
    assert.equal((await outcome)?.name, "AbortError");
    assert.throws(() => process.kill(pid, 0), { code: "ESRCH" }, "cancel settles after process exit");
    process.env.PATH = priorPath;
    await history.save("session", value, digest(value));
    assert.deepEqual(await history.read("session", digest(value), value.length), value);
  } finally {
    controller.abort(); await outcome;
    process.env.PATH = priorPath;
    await rm(dir, { recursive: true, force: true });
  }
});

 test("existing non-blob history object is an integrity failure", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "se-history-type-"));
  const history = new ArtifactHistory(dir);
  try {
    const value = Buffer.alloc(0); const hash = digest(value);
    await history.save("one", value, hash);
    const repo = history.repository("one");
    const { stdout: oid } = await exec("git", ["--git-dir", repo, "hash-object", "-w", "-t", "tree", "/dev/null"]);
    await exec("git", ["--git-dir", repo, "update-ref", `refs/content-sha256/${hash}`, oid.trim()]);
    await assert.rejects(history.read("one", hash, 0), { code: "artifact_integrity_failed" });
  } finally { await rm(dir, { recursive: true, force: true }); }
});
