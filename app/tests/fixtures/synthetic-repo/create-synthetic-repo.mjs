// Synthetic coding repository for the 2026-09-16 Claude packet scenario:
// a small Node package with Git history, one deterministic failing test and
// no personal data. Slices 01–11 bind, read, write a candidate and run the
// Host check recipe against this same fixture. It is generated on demand in a
// caller-owned directory; nothing here touches the user's own repositories.
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

const FILES = {
  "package.json": JSON.stringify({
    name: "synthetic-parcel", version: "0.1.0", private: true, type: "module",
    scripts: { test: "node --test" },
  }, null, 2) + "\n",
  "README.md": "# synthetic-parcel\n\nPagination helpers used by the Courtwork synthetic coding scenario.\n",
  "src/parcel.mjs": [
    "// Split `count` items into pages of `perPage` items each.",
    "export function pageCount(count, perPage) {",
    "  if (!Number.isInteger(count) || count < 0) throw new RangeError(\"count must be a non-negative integer\");",
    "  if (!Number.isInteger(perPage) || perPage <= 0) throw new RangeError(\"perPage must be a positive integer\");",
    "  return Math.floor(count / perPage);",
    "}",
    "",
    "export function pageOf(index, perPage) {",
    "  return Math.floor(index / perPage) + 1;",
    "}",
    "",
  ].join("\n"),
  "test/parcel.test.mjs": [
    "import assert from \"node:assert/strict\";",
    "import { test } from \"node:test\";",
    "import { pageCount, pageOf } from \"../src/parcel.mjs\";",
    "",
    "test(\"a partial last page still counts\", () => {",
    "  assert.equal(pageCount(11, 5), 3);",
    "  assert.equal(pageCount(10, 5), 2);",
    "  assert.equal(pageCount(0, 5), 0);",
    "});",
    "",
    "test(\"item index maps to its page\", () => {",
    "  assert.equal(pageOf(0, 5), 1);",
    "  assert.equal(pageOf(10, 5), 3);",
    "});",
    "",
  ].join("\n"),
};

/** The line the fix must replace, and its replacement; exported so tests can
 * assert the exact write instead of guessing. */
export const KNOWN_BUG = {
  path: "src/parcel.mjs",
  broken: "  return Math.floor(count / perPage);",
  fixed: "  return Math.ceil(count / perPage);",
};

function gitEnv(home) {
  return { PATH: "/usr/bin:/bin:/usr/local/bin", HOME: home, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null", GIT_TERMINAL_PROMPT: "0" };
}

async function git(dir, args, env) {
  const { stdout } = await run("git", ["-c", "user.name=Synthetic", "-c", "user.email=synthetic@example.invalid", "-c", "commit.gpgsign=false", ...args], { cwd: dir, env });
  return stdout.trim();
}

/** Create the fixture under `dir` (must not already contain a repository).
 * Returns the head commit so callers can create a candidate from it. */
export async function createSyntheticRepository(dir) {
  await mkdir(dir, { recursive: true });
  const env = gitEnv(dir);
  await git(dir, ["init", "-q", "-b", "main"], env);
  for (const [relativePath, text] of Object.entries(FILES)) {
    if (relativePath === "src/parcel.mjs") continue;
    await mkdir(path.dirname(path.join(dir, relativePath)), { recursive: true });
    await writeFile(path.join(dir, relativePath), text);
  }
  await git(dir, ["add", "-A"], env);
  await git(dir, ["commit", "-q", "-m", "scaffold synthetic-parcel"], env);
  await mkdir(path.join(dir, "src"), { recursive: true });
  await writeFile(path.join(dir, "src/parcel.mjs"), FILES["src/parcel.mjs"]);
  await git(dir, ["add", "-A"], env);
  await git(dir, ["commit", "-q", "-m", "add pagination helpers"], env);
  const head = await git(dir, ["rev-parse", "HEAD"], env);
  return { dir, head, files: Object.keys(FILES), bug: KNOWN_BUG };
}
