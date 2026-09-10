// The release identity of the page (evidence contract: source_sha vs site_sha).
//
// source_sha pins the product evidence, including the rendering modules and
// tokens. Builds read those bytes from Git, even after the product advances.
// Capture commands additionally require matching working-tree product bytes.
import { readFile, readdir, lstat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SITE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const ROOT = path.dirname(SITE);

export function git(...args) {
  return execFileSync("git", ["-C", ROOT, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim();
}

// The page's own sources. site/dist is the output and site/verification holds
// screenshots of it, so neither is part of the version being identified.
const SOURCE_TREE = ["build.mjs", "release.json", "src", "scripts", "media",
  "specimen/shell.mjs", "specimen/recorded-source.mjs", "specimen/specimen.css", "specimen/capture.json"];

export function productBytes(sourceSha, relativePath) {
  if (!/^[0-9a-f]{40}$/.test(sourceSha) || !/^(?:app|brand|docs|benchmarks)\//.test(relativePath) || relativePath.split("/").includes("..")) {
    throw new Error("expected a full product SHA and a repository-relative source path");
  }
  return execFileSync("git", ["-C", ROOT, "show", `${sourceSha}:${relativePath}`], { maxBuffer: 64 * 1024 * 1024 });
}

async function captureDrift(declared) {
  // Inspect actual bytes: git diff can hide edits behind assume-unchanged or
  // skip-worktree flags, which must not stamp a changed capture as source_sha.
  const tree = git("ls-tree", "-rz", "--full-tree", declared.source_sha, "--", ...declared.verified_paths);
  const entries = tree.split("\0").filter(Boolean).map(row => {
    const [meta, file] = row.split("\t");
    const [mode, type, hash] = meta.split(" ");
    return {mode, type, hash, file};
  });
  const expected = new Set(entries.map(row => row.file));
  const drift = [];
  for (const row of entries) {
    try {
      const file = path.join(ROOT, row.file);
      const info = await lstat(file);
      if (row.type !== "blob" || row.mode === "120000" || !info.isFile() || info.isSymbolicLink()) {
        drift.push(row.file); continue;
      }
      const bytes = await readFile(file);
      const hash = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
      if (hash !== row.hash) drift.push(row.file);
    } catch { drift.push(row.file); }
  }
  const actual = git("ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", ...declared.verified_paths);
  for (const file of actual.split("\0").filter(Boolean)) if (!expected.has(file)) drift.push(file);
  return [...new Set(drift)].sort().join("\n");
}

async function digestOf(target) {
  const entries = [];
  async function walk(absolute, relative) {
    let listing;
    try {
      listing = await readdir(absolute, { withFileTypes: true });
    } catch {
      entries.push([relative, createHash("sha256").update(await readFile(absolute)).digest("hex")]);
      return;
    }
    for (const entry of listing.sort((a, b) => (a.name < b.name ? -1 : 1)))
      await walk(path.join(absolute, entry.name), path.posix.join(relative, entry.name));
  }
  await walk(target.absolute, target.relative);
  return entries;
}

export async function release({ capture = false } = {}) {
  const declared = JSON.parse(await readFile(path.join(SITE, "release.json"), "utf8"));
  if (!/^[0-9a-f]{40}$/.test(declared.source_sha)) throw new Error("release source_sha must be a full commit SHA");
  git("cat-file", "-e", `${declared.source_sha}^{commit}`);

  /* The version the page prints for itself is a digest of the page's own
   * sources, not the git commit it happens to sit on. A commit hash cannot
   * work here: building writes site/dist, committing that changes the hash,
   * and the committed output would then disagree with every rebuild of it.
   * A content digest closes that loop — and it is also the more truthful
   * answer to "which version of the page is this", which is what the evidence
   * contract asks site_sha for. */
  const files = [];
  for (const name of SOURCE_TREE)
    files.push(...(await digestOf({ absolute: path.join(SITE, name), relative: name })));
  const captureReceipt = JSON.parse(await readFile(path.join(SITE, "specimen", "capture.json"), "utf8"));
  const recording = path.relative(SITE, path.resolve(ROOT, captureReceipt.file));
  if (!/^specimen\/[a-f0-9]{7}\.json$/.test(recording)) throw new Error("unexpected specimen recording path");
  files.push(...await digestOf({ absolute: path.join(SITE, recording), relative: recording }));
  files.push(...await digestOf({ absolute: path.join(ROOT, "evidence/publishing-surface-2026-09-09"), relative: "evidence/publishing-surface-2026-09-09" }));
  for (const name of ["benchmarks/SPEC.md", "engineering/execution/2026-09-10-benchmark-series"])
    files.push(...await digestOf({ absolute: path.join(ROOT, name), relative: name }));
  const siteSha = createHash("sha256")
    .update(files.map(([name, hash]) => `${hash}  ${name}`).join("\n"))
    .digest("hex");
  // Capture imports product modules from disk: include staged and unstaged
  // changes in this check, not merely differences between committed heads.
  const drift = capture ? await captureDrift(declared) : "";
  if (drift) {
    throw new Error(
      `capture product paths differ from source_sha ${declared.source_sha.slice(0, 7)}:\n${drift}\n` +
        "Capture in an isolated checkout of the declared source SHA. Builds replay its pinned Git bytes.",
    );
  }
  return {
    source_sha: declared.source_sha,
    sha7: declared.source_sha.slice(0, 7),
    site_sha: siteSha,
    site_sha7: siteSha.slice(0, 7),
    site_source_files: files.length,
    // The newest input the build had. Not a wall clock: a build that stamps
    // the time it ran cannot be compared with the one before it.
    built_at: git("show", "-s", "--format=%cI", declared.source_sha),
  };
}
