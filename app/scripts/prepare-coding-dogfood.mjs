// Operator preparation for the coding dogfood scenario (slice 11).
//
// Creates ONE self-contained, recoverable rehearsal instance outside this
// repository: an independent synthetic Git source with a known pagination
// defect, an empty Host data directory, and a manifest naming the exact
// commit, paths and startup command. It never touches the operator's own
// repositories, never copies or discovers credentials, and never deletes or
// resets an existing destination -- a rerun either creates a fresh root or
// explicitly inspects an identified one with --reuse.
//
// The Host itself is started separately (see the printed startup command);
// this entry only lays down durable state the Host and the browser then use.
import { execFile } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { promisify } from "node:util";
import { createSyntheticRepository } from "../tests/fixtures/synthetic-repo/create-synthetic-repo.mjs";

const run = promisify(execFile);

export const MANIFEST_NAME = "manifest.json";
const SCHEMA_VERSION = 1;

const APP_DIR = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const SERVER_ENTRY = path.join(APP_DIR, "server", "index.mjs");

const HELP = `Usage: node scripts/prepare-coding-dogfood.mjs --root PATH [--reuse]

  --root PATH   Destination for one rehearsal instance. Required. Must be
                outside this repository and must not already hold unrelated
                files. Nothing here is ever deleted or reset.
  --reuse       Inspect and re-print an instance this script already created
                at --root instead of creating one. Fails if none is there.
  --json        Print only the manifest JSON (no operator instructions).
  --help        Show this help.

Creates <root>/source (synthetic Git repository with a known failing test),
<root>/runtime-data (the Host's SE_RUNTIME_DATA_DIR) and <root>/manifest.json.
No credential, API key or personal configuration is read or written.
`;

/** Absolute, no trailing separator, and never inside this repository. */
function resolveRoot(value) {
  const root = path.resolve(value);
  const repoRoot = path.resolve(APP_DIR, "..");
  const relative = path.relative(repoRoot, root);
  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    throw new Error(`--root must be outside the product repository (${repoRoot})`);
  }
  return root;
}

async function entries(dir) {
  try { return await readdir(dir); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

async function readManifest(root) {
  try { return JSON.parse(await readFile(path.join(root, MANIFEST_NAME), "utf8")); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

async function gitFact(dir, args) {
  const { stdout } = await run("git", args, {
    cwd: dir,
    env: { PATH: "/usr/bin:/bin:/usr/local/bin", HOME: dir, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null", GIT_TERMINAL_PROMPT: "0" },
  });
  return stdout.trim();
}

/**
 * Inspect an instance this script created. Reports the manifest together with
 * the source repository's CURRENT head and worktree cleanliness, so a rerun
 * can tell an untouched preparation from one a rehearsal or a browser pass has
 * already moved on from. Nothing is modified.
 */
export async function inspectPreparation(rootValue) {
  const root = resolveRoot(rootValue);
  const manifest = await readManifest(root);
  if (!manifest) throw new Error(`no ${MANIFEST_NAME} at ${root}: this is not a prepared instance`);
  if (manifest.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`${MANIFEST_NAME} schemaVersion ${manifest.schemaVersion} is not ${SCHEMA_VERSION}`);
  }
  const currentHead = await gitFact(manifest.sourcePath, ["rev-parse", "HEAD"]);
  const status = await gitFact(manifest.sourcePath, ["status", "--porcelain"]);
  const dataEntries = (await entries(manifest.dataDir)) ?? [];
  return {
    manifest,
    sourceHeadMatchesManifest: currentHead === manifest.sourceRepository.head,
    currentSourceHead: currentHead,
    sourceWorktreeClean: status === "",
    hostDataDirUsed: dataEntries.length > 0,
  };
}

/**
 * Create one instance under `root`. Refuses a non-empty destination outright;
 * an already-prepared root is reported as such so the caller can choose
 * --reuse or a different root rather than having its candidate reset.
 */
export async function createPreparation(rootValue) {
  const root = resolveRoot(rootValue);
  const existing = await entries(root);
  if (existing && existing.length) {
    const prepared = await readManifest(root);
    throw new Error(prepared
      ? `${root} already holds a prepared instance (created ${prepared.createdAt}). Pass --reuse to inspect it, or choose a different --root for a fresh one.`
      : `${root} is not empty. Choose an empty or new --root; this script never overwrites a destination.`);
  }

  const sourcePath = path.join(root, "source");
  const dataDir = path.join(root, "runtime-data");
  await mkdir(sourcePath, { recursive: true });
  await mkdir(dataDir, { recursive: true });
  const { head, files } = await createSyntheticRepository(sourcePath);

  const manifest = {
    schemaVersion: SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    scenario: "coding-dogfood",
    root,
    sourcePath,
    dataDir,
    sourceRepository: {
      name: "synthetic-parcel",
      branch: await gitFact(sourcePath, ["rev-parse", "--abbrev-ref", "HEAD"]),
      head,
      files,
      // Where the defect shows, NOT how to fix it: this file is durable and
      // may be read next to the real-model prompt.
      failingCheck: { recipeId: "node-test", expectedExitCode: 1, reportedBy: "test/parcel.test.mjs" },
    },
    host: {
      appDir: APP_DIR,
      startup: { command: process.execPath, args: [SERVER_ENTRY, "--data-dir", dataDir, "--port", "8787"] },
      env: { SE_RUNTIME_DATA_DIR: dataDir },
      defaultProvider: "fake-openai-loopback (Local test provider; no credential required)",
    },
    toolchain: { node: process.version, git: await gitFact(sourcePath, ["--version"]) },
  };
  await writeFile(path.join(root, MANIFEST_NAME), JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}

function instructions(manifest) {
  const { startup } = manifest.host;
  const quoted = [startup.command, ...startup.args].map(part => /[\s"']/.test(part) ? JSON.stringify(part) : part).join(" ");
  return [
    "",
    "Prepared one coding dogfood instance.",
    "",
    `  source repository   ${manifest.sourcePath}`,
    `  source commit       ${manifest.sourceRepository.head}`,
    `  Host data directory ${manifest.dataDir}`,
    `  manifest            ${path.join(manifest.root, MANIFEST_NAME)}`,
    "",
    "Start the Host (foreground; Ctrl-C stops it and keeps the data):",
    "",
    `  ${quoted}`,
    "",
    "It prints the URL it is listening on. Open that URL in a browser.",
    "Port 8787 is the product default; if it is already taken, rerun the same",
    "command with `--port 0` and open the URL the Host prints instead.",
    "",
    "In the browser: connect this Chat to the source repository above, start a",
    "private candidate, then give the agent the task. The model connection is",
    "the Local test provider unless you choose another one in Settings.",
    "",
    "Stopping the Host never deletes this directory. To discard the instance",
    `later, remove ${manifest.root} yourself.`,
    "",
  ].join("\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  // An operator entry reports a refusal as one sentence it can act on; a
  // stack trace here would only say where the guard lives.
  try {
    const { values } = parseArgs({ options: {
      root: { type: "string" }, reuse: { type: "boolean" }, json: { type: "boolean" }, help: { type: "boolean" },
    } });
    if (values.help || !values.root) {
      console.log(HELP);
      process.exitCode = values.help ? 0 : 1;
    } else if (values.reuse) {
      const report = await inspectPreparation(values.root);
      if (values.json) console.log(JSON.stringify(report, null, 2));
      else {
        console.log(instructions(report.manifest));
        console.log([
          "Reusing an existing instance. Current state:",
          `  source head matches manifest     ${report.sourceHeadMatchesManifest}`,
          `  source worktree clean            ${report.sourceWorktreeClean}`,
          `  Host data directory already used ${report.hostDataDirUsed}`,
          report.hostDataDirUsed
            ? "  (a Chat, candidate or history may already exist here; open it rather than expecting a blank start)"
            : "  (nothing has run against this instance yet)",
          "",
        ].join("\n"));
      }
    } else {
      const manifest = await createPreparation(values.root);
      if (values.json) console.log(JSON.stringify(manifest, null, 2));
      else console.log(instructions(manifest));
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
