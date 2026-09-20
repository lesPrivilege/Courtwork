import assert from "node:assert/strict";
import test from "node:test";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { createPreparation, inspectPreparation, MANIFEST_NAME, shellCommand, shellQuote } from "../scripts/prepare-coding-dogfood.mjs";
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

/* DF11-R1 · the repository boundary is a filesystem fact, not a string
 * prefix. `path.relative` answers `..name` for an ordinary child called
 * `..name`, and `path.resolve` cannot see through a symbolic link. */

test("an in-repository child whose name merely begins with .. is still inside", async () => {
  // `path.relative(repo, repo/..name)` is "..name": a prefix test reads that
  // as "outside" and lets an in-repository destination through.
  const repoRoot = path.resolve(APP_DIR, "..");
  const inside = path.join(repoRoot, "..name");
  assert.equal(path.relative(repoRoot, inside), "..name");
  assert.equal(path.relative(repoRoot, inside).startsWith(".."), true,
    "the lexical prefix test really does mis-read this path");
  await assert.rejects(createPreparation(inside), /outside the product repository/);
  await assert.rejects(createPreparation(path.join(repoRoot, "..quarantine", "deeper")), /outside the product repository/);
  assert.equal(existsSync(inside), false, "a rejected root creates nothing");
});

test("a symlink ancestor cannot smuggle the destination back into the repository", async () => {
  const base = await scratch();
  const repoRoot = path.resolve(APP_DIR, "..");
  try {
    // A link that looks outside the repository and resolves inside it.
    const alias = path.join(base, "alias");
    await symlink(repoRoot, alias, "dir");

    // The link itself, and a leaf that does not exist yet below it.
    await assert.rejects(createPreparation(alias), /outside the product repository/);
    const leaf = path.join(alias, "dogfood-instance");
    await assert.rejects(createPreparation(leaf), /outside the product repository/);

    // A rejected root creates nothing -- least of all inside the repository.
    assert.equal(existsSync(path.join(repoRoot, "dogfood-instance")), false);
    assert.equal(existsSync(path.join(repoRoot, "..name")), false);

    // The control: a link that really does point outside is still usable.
    const elsewhere = path.join(base, "elsewhere");
    await mkdir(elsewhere, { recursive: true });
    const outward = path.join(base, "outward");
    await symlink(elsewhere, outward, "dir");
    const manifest = await createPreparation(path.join(outward, "instance"));
    assert.match(manifest.sourceRepository.head, /^[0-9a-f]{40}$/);
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});

/* DF11-R2 · the printed command is pasted into a shell, so it has to survive
 * one. JSON encoding is not shell escaping: inside JSON's double quotes a
 * POSIX shell still expands $(...), backticks and $VAR. */

test("the printed command survives a POSIX shell with its argv intact", async () => {
  const awkward = [
    "/tmp/cw safe/instance",
    "/tmp/$(touch /tmp/cw-should-not-exist)/x",
    "/tmp/`id`/x",
    "$HOME/x",
    "it's",
    'say "hi"',
    "line\nbreak",
    "semi;colon && and | pipe",
    "glob*?[a-z]",
    "back\\slash",
    "",
  ];
  // Synthetic arguments only, handed to `printf` -- never a command read from
  // a manifest. NUL-separated so an embedded newline is unambiguous.
  const { stdout } = await run("/bin/sh", ["-c", `printf '%s\\0' ${shellCommand(awkward)}`],
    { encoding: "buffer" });
  const seen = stdout.toString("utf8").split("\0").slice(0, -1);
  assert.deepEqual(seen, awkward, "every argument must come back exactly as it went in");
  assert.equal(existsSync("/tmp/cw-should-not-exist"), false, "no substitution may have run");

  // Ordinary paths stay readable; anything else is quoted.
  assert.equal(shellQuote("/usr/local/bin/node"), "/usr/local/bin/node");
  assert.equal(shellQuote("a b"), "'a b'");
  assert.equal(shellQuote("it's"), `'it'\\''s'`);
});

test("a real preparation prints a command whose argv round-trips", async () => {
  const base = await scratch();
  try {
    const manifest = await createPreparation(path.join(base, "instance"));
    const { command, args } = manifest.host.startup;
    const { stdout } = await run("/bin/sh", ["-c", `printf '%s\\0' ${shellCommand([command, ...args])}`],
      { encoding: "buffer" });
    assert.deepEqual(stdout.toString("utf8").split("\0").slice(0, -1), [command, ...args]);
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});

/* DF11-R3 · a manifest is a file anything can rewrite. `--reuse` may treat it
 * as a description of the instance at that root, never as instructions. */

async function tamper(root, mutate) {
  const file = path.join(root, MANIFEST_NAME);
  const manifest = JSON.parse(await readFile(file, "utf8"));
  mutate(manifest);
  await writeFile(file, JSON.stringify(manifest, null, 2) + "\n");
}

test("--reuse refuses a manifest that has been pointed somewhere else", async () => {
  const base = await scratch();
  try {
    const first = path.join(base, "first");
    const second = path.join(base, "second");
    await createPreparation(first);
    const other = await createPreparation(second);

    for (const [why, mutate] of [
      ["a redirected source", (m) => { m.sourcePath = other.sourcePath; }],
      ["a redirected data directory", (m) => { m.dataDir = other.dataDir; }],
      ["a redirected root", (m) => { m.root = second; }],
      ["a different scenario", (m) => { m.scenario = "something-else"; }],
      ["a bumped schema", (m) => { m.schemaVersion = 2; }],
      ["no recorded commit", (m) => { m.sourceRepository.head = "not-a-commit"; }],
    ]) {
      await tamper(first, mutate);
      await assert.rejects(inspectPreparation(first), /does not describe this instance|is not/, why);
    }

    // Refusing never resets the operator's data.
    assert.equal(existsSync(path.join(first, "source", KNOWN_BUG.path)), true);
    assert.equal(existsSync(path.join(second, "source", KNOWN_BUG.path)), true);
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});

test("--reuse prints this checkout's launch command, not the manifest's", async () => {
  const base = await scratch();
  try {
    const root = path.join(base, "instance");
    const manifest = await createPreparation(root);

    await tamper(root, (m) => {
      m.host.startup = { command: "/synthetic/marker", args: ["$(touch /tmp/cw-manifest-should-not-run)"] };
      m.host.appDir = "/synthetic/elsewhere";
    });

    const report = await inspectPreparation(root);
    assert.equal(report.launch.command, process.execPath, "the executable comes from this process");
    assert.equal(report.launch.args[0], path.join(APP_DIR, "server", "index.mjs"), "and the entry from this checkout");
    assert.deepEqual(report.launch.args.slice(1, 3), ["--data-dir", manifest.dataDir]);
    assert.ok(!report.launch.args.some((arg) => arg.includes("touch")), "nothing from the manifest is carried into it");

    // Provenance is reported, not enforced: an instance stays usable after
    // this checkout moves, so a different appDir is information, not a fault.
    assert.equal(report.preparedByThisCheckout, false);
    assert.equal(report.preparedByAppDir, "/synthetic/elsewhere");
    assert.equal(report.sourceHeadMatchesManifest, true, "the instance itself is still fine");
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});
