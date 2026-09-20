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
import { mkdir, readFile, readdir, realpath, writeFile } from "node:fs/promises";
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

const REPO_ROOT = path.resolve(APP_DIR, "..");

/**
 * Is `candidate` the same path as `parent`, or below it?
 *
 * Compared by path COMPONENT, never by string prefix: `path.relative` returns
 * `..name` for an ordinary repository child called `..name`, and a
 * `startsWith("..")` test reads that as "outside" and lets it through. Only a
 * leading `..` component means the path actually leaves `parent`.
 */
function isWithin(parent, candidate) {
  const relative = path.relative(parent, candidate);
  if (relative === "") return true;
  if (path.isAbsolute(relative)) return false;
  return relative.split(path.sep)[0] !== "..";
}

/**
 * The nearest ancestor of `target` that exists, with every symbolic link
 * already resolved, plus the part of `target` still to be created below it.
 * `path.resolve` alone cannot answer the containment question: it is lexical,
 * so a symlink pointing into the repository resolves to a path that merely
 * looks outside it.
 */
async function canonicalAncestor(target) {
  let existing = target;
  const pending = [];
  for (;;) {
    try { return { real: await realpath(existing), pending }; }
    catch (error) {
      if (error.code !== "ENOENT" && error.code !== "ENOTDIR") throw error;
      const parent = path.dirname(existing);
      if (parent === existing) throw new Error(`no existing ancestor for ${target}`);
      pending.unshift(path.basename(existing));
      existing = parent;
    }
  }
}

/**
 * Resolve `--root` and prove the destination really is outside the product
 * repository -- after symbolic links, not before them. Called before anything
 * is created, so a rejected root leaves no preparation files behind.
 */
async function resolveRoot(value) {
  if (typeof value !== "string" || !value.trim()) throw new Error("--root must be a path");
  const root = path.resolve(value);
  const repoReal = await realpath(REPO_ROOT);
  const { real, pending } = await canonicalAncestor(root);
  const canonical = path.join(real, ...pending);
  if (isWithin(repoReal, canonical) || isWithin(canonical, repoReal)) {
    throw new Error(`--root must be outside the product repository (${REPO_ROOT}); `
      + `${root} resolves to ${canonical}`);
  }
  return { root, canonical };
}

/**
 * One argument, quoted for a POSIX shell (`sh`, `bash`, `zsh`).
 *
 * `JSON.stringify` is JSON encoding, not shell escaping: inside JSON's double
 * quotes a POSIX shell still expands `$(...)`, backticks and `$VAR`. Single
 * quotes suppress every expansion, and the one character they cannot carry --
 * a single quote -- is spliced in as `'\''`.
 */
export function shellQuote(argument) {
  const text = String(argument);
  if (text !== "" && /^[A-Za-z0-9_@%+=:,./-]+$/.test(text)) return text;
  return `'${text.replaceAll("'", `'\\''`)}'`;
}

/** A whole argv, quoted so a POSIX shell reproduces it verbatim. */
export function shellCommand(parts) {
  return parts.map(shellQuote).join(" ");
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
 * The launch contract, always built from THIS checkout.
 *
 * A manifest is a file on disk that anything can rewrite, so its recorded
 * executable and argv are provenance, never instructions: printing them back
 * would turn "reprint the command I created" into "run whatever this file now
 * says". The command below is derived from `process.execPath` and the server
 * entry resolved from `import.meta.url`; only the data directory comes from
 * the instance, and it has already been proved to sit inside it.
 */
function launchContract(dataDir) {
  return { command: process.execPath, args: [SERVER_ENTRY, "--data-dir", dataDir, "--port", "8787"] };
}

/**
 * Accept a manifest only as a description of the instance at `root`.
 *
 * Every path it names must be the one this script would have created there,
 * so a redirected `sourcePath`/`dataDir` cannot make `--reuse` read or report
 * another instance. Mismatches fail closed and touch nothing: refusing is
 * always safe, resetting the operator's data never is.
 */
function validateManifest(manifest, root) {
  const fail = (why) => { throw new Error(`${path.join(root, MANIFEST_NAME)} does not describe this instance: ${why}`); };
  if (!manifest || typeof manifest !== "object") fail("it is not an object");
  if (manifest.schemaVersion !== SCHEMA_VERSION) fail(`schemaVersion ${manifest.schemaVersion} is not ${SCHEMA_VERSION}`);
  if (manifest.scenario !== "coding-dogfood") fail(`scenario ${JSON.stringify(manifest.scenario)} is not "coding-dogfood"`);
  if (path.resolve(manifest.root ?? "") !== root) fail("its root is a different directory");
  if (path.resolve(manifest.sourcePath ?? "") !== path.join(root, "source")) fail("its sourcePath is not <root>/source");
  if (path.resolve(manifest.dataDir ?? "") !== path.join(root, "runtime-data")) fail("its dataDir is not <root>/runtime-data");
  if (!/^[0-9a-f]{40}$/.test(manifest.sourceRepository?.head ?? "")) fail("it records no source commit");
  return manifest;
}

/**
 * Inspect an instance this script created. Reports the manifest together with
 * the source repository's CURRENT head and worktree cleanliness, so a rerun
 * can tell an untouched preparation from one a rehearsal or a browser pass has
 * already moved on from. Nothing is modified.
 */
export async function inspectPreparation(rootValue) {
  const { root, canonical } = await resolveRoot(rootValue);
  const stored = await readManifest(root);
  if (!stored) throw new Error(`no ${MANIFEST_NAME} at ${root}: this is not a prepared instance`);
  const manifest = validateManifest(stored, root);

  // The instance must still be where it says it is, links included.
  const sourceReal = await realpath(manifest.sourcePath);
  if (!isWithin(canonical, sourceReal)) {
    throw new Error(`${manifest.sourcePath} now resolves outside ${root}; refusing to read it`);
  }

  // The launch path is as sensitive as the source read: a redirected data
  // directory would make the printed Host command open somebody else's state.
  const dataReal = await realpath(manifest.dataDir);
  if (!isWithin(canonical, dataReal) || dataReal === canonical || isWithin(sourceReal, dataReal)) {
    throw new Error(`${manifest.dataDir} now resolves outside the instance data boundary; refusing to read or launch it`);
  }

  const currentHead = await gitFact(manifest.sourcePath, ["rev-parse", "HEAD"]);
  const status = await gitFact(manifest.sourcePath, ["status", "--porcelain"]);
  const dataEntries = (await entries(manifest.dataDir)) ?? [];
  return {
    manifest,
    // Provenance, reported rather than trusted: an instance stays usable after
    // this checkout moves, so a different appDir is information, not a fault.
    preparedByAppDir: manifest.host?.appDir ?? null,
    preparedByThisCheckout: manifest.host?.appDir === APP_DIR,
    launch: launchContract(manifest.dataDir),
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
  const { root } = await resolveRoot(rootValue);
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

  // Recheck after creating: the boundary was proved against the destination as
  // it was, and between then and now a link on the way could have changed.
  // Nothing has been written into these directories yet.
  const repoReal = await realpath(REPO_ROOT);
  for (const created of [sourcePath, dataDir]) {
    if (isWithin(repoReal, await realpath(created))) {
      throw new Error(`${created} resolved inside the product repository after creation; refusing to prepare`);
    }
  }

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
      // Provenance: what this checkout would run when the instance was made.
      // `--reuse` derives the command it prints from the checked-out source
      // instead of reading this back (see `launchContract`).
      startup: launchContract(dataDir),
      env: { SE_RUNTIME_DATA_DIR: dataDir },
      defaultProvider: "fake-openai-loopback (Local test provider; no credential required)",
    },
    toolchain: { node: process.version, git: await gitFact(sourcePath, ["--version"]) },
  };
  await writeFile(path.join(root, MANIFEST_NAME), JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}

function instructions(manifest, launch = launchContract(manifest.dataDir)) {
  const quoted = shellCommand([launch.command, ...launch.args]);
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
        console.log(instructions(report.manifest, report.launch));
        console.log([
          "Reusing an existing instance. Current state:",
          `  source head matches manifest     ${report.sourceHeadMatchesManifest}`,
          `  source worktree clean            ${report.sourceWorktreeClean}`,
          `  Host data directory already used ${report.hostDataDirUsed}`,
          report.hostDataDirUsed
            ? "  (a Chat, candidate or history may already exist here; open it rather than expecting a blank start)"
            : "  (nothing has run against this instance yet)",
          `  prepared by this checkout        ${report.preparedByThisCheckout}`,
          report.preparedByThisCheckout
            ? ""
            : `  (it was prepared from ${report.preparedByAppDir}; the command above is this checkout's, which is the one that will run)`,
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
