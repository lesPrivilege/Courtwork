import assert from "node:assert/strict";
import test from "node:test";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { createPreparation, inspectPreparation, MANIFEST_NAME } from "../scripts/prepare-coding-dogfood.mjs";
import { KNOWN_BUG } from "./fixtures/synthetic-repo/create-synthetic-repo.mjs";

const run = promisify(execFile);
const APP_DIR = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

async function scratch() {
  return mkdtemp(path.join(tmpdir(), "cw-dogfood-prep-"));
}

/* The operator preparation is the one entry the WebUI handoff tells a person
 * to run. Its guards are the contract: it never resets a destination, never
 * writes inside the product repository, and never puts a key or the answer
 * into a durable file someone may read beside the real-model prompt. */

test("a fresh root gets a synthetic source, an empty Host data directory and a manifest", async () => {
  const base = await scratch();
  try {
    const root = path.join(base, "instance");
    const manifest = await createPreparation(root);

    assert.equal(manifest.schemaVersion, 1);
    assert.equal(manifest.root, root);
    assert.equal(manifest.sourcePath, path.join(root, "source"));
    assert.equal(manifest.dataDir, path.join(root, "runtime-data"));
    assert.match(manifest.sourceRepository.head, /^[0-9a-f]{40}$/);
    assert.equal(manifest.sourceRepository.failingCheck.expectedExitCode, 1);

    // The source is a real repository at exactly the commit the manifest names.
    const head = (await run("git", ["rev-parse", "HEAD"], { cwd: manifest.sourcePath })).stdout.trim();
    assert.equal(head, manifest.sourceRepository.head);
    const status = (await run("git", ["status", "--porcelain"], { cwd: manifest.sourcePath })).stdout.trim();
    assert.equal(status, "", "the prepared source starts clean");
    const defect = await readFile(path.join(manifest.sourcePath, KNOWN_BUG.path), "utf8");
    assert.ok(defect.includes(KNOWN_BUG.broken), "the prepared source still carries the defect");

    // The startup command is derived from this checkout, not hard-coded.
    assert.equal(manifest.host.appDir, APP_DIR);
    assert.deepEqual(manifest.host.startup.args.slice(0, 3), [path.join(APP_DIR, "server", "index.mjs"), "--data-dir", manifest.dataDir]);
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});

test("the durable manifest carries neither a credential nor the fix", async () => {
  const base = await scratch();
  try {
    const root = path.join(base, "instance");
    await createPreparation(root);
    const text = await readFile(path.join(root, MANIFEST_NAME), "utf8");
    assert.ok(!text.includes(KNOWN_BUG.fixed.trim()),
      "a manifest read beside the real-model prompt must not hand over the answer");
    for (const marker of ["apiKey", "api_key", "sk-", "token", "SECRET", "PASSWORD"]) {
      assert.ok(!text.includes(marker), `the manifest must not carry ${marker}`);
    }
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});

test("an already-prepared root is reported, never reset", async () => {
  const base = await scratch();
  try {
    const root = path.join(base, "instance");
    const first = await createPreparation(root);
    await assert.rejects(createPreparation(root), /already holds a prepared instance/);

    // The refusal left the first instance exactly as it was.
    const again = JSON.parse(await readFile(path.join(root, MANIFEST_NAME), "utf8"));
    assert.deepEqual(again, first);
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});

test("a non-empty destination that is not a prepared instance is refused", async () => {
  const base = await scratch();
  try {
    const root = path.join(base, "occupied");
    await mkdir(root, { recursive: true });
    await writeFile(path.join(root, "notes.txt"), "someone else's file\n");
    await assert.rejects(createPreparation(root), /is not empty/);
    assert.equal(await readFile(path.join(root, "notes.txt"), "utf8"), "someone else's file\n");
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});

test("a root inside the product repository is refused", async () => {
  await assert.rejects(createPreparation(path.join(APP_DIR, "dogfood-instance")), /outside the product repository/);
  await assert.rejects(createPreparation(path.resolve(APP_DIR, "..")), /outside the product repository/);
});

test("--reuse inspects an instance and says whether anything has run against it", async () => {
  const base = await scratch();
  try {
    const root = path.join(base, "instance");
    const manifest = await createPreparation(root);

    const fresh = await inspectPreparation(root);
    assert.equal(fresh.sourceHeadMatchesManifest, true);
    assert.equal(fresh.sourceWorktreeClean, true);
    assert.equal(fresh.hostDataDirUsed, false, "nothing has run against a just-prepared instance");

    // A Host that has opened this data directory leaves state behind; the
    // reuse report must say so rather than implying a blank start.
    await writeFile(path.join(manifest.dataDir, "runtime-state.json"), "{}\n");
    const used = await inspectPreparation(root);
    assert.equal(used.hostDataDirUsed, true);

    await assert.rejects(inspectPreparation(path.join(base, "nothing-here")), /not a prepared instance/);
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});
