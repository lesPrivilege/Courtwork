// The release identity of the page (evidence contract: source_sha vs site_sha).
//
// source_sha is the product commit every screenshot, specimen and benchmark
// record was taken from. site_sha is the commit of the page sources, which
// moves with each edit here. They are allowed to differ, but the relationship
// has to be provable: the product paths must be byte-identical between them,
// or the evidence on the page would describe bytes that are no longer there.
import { readFile, readdir } from "node:fs/promises";
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
const SOURCE_TREE = ["build.mjs", "release.json", "src", "scripts", "specimen", "media"];

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

export async function release() {
  const declared = JSON.parse(await readFile(path.join(SITE, "release.json"), "utf8"));

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
  files.push(["README.md", createHash("sha256").update(await readFile(path.join(ROOT, "README.md"))).digest("hex")]);
  const siteSha = createHash("sha256")
    .update(files.map(([name, hash]) => `${hash}  ${name}`).join("\n"))
    .digest("hex");
  const drift = git("diff", "--name-only", declared.source_sha, "HEAD", "--", ...declared.verified_paths);
  if (drift) {
    throw new Error(
      `product paths differ between source_sha ${declared.source_sha.slice(0, 7)} and HEAD:\n${drift}\n` +
        "The page's evidence is taken from source_sha; either revert those paths or capture the evidence again.",
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
