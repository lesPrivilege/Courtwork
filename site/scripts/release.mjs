// The release identity of the page (evidence contract: source_sha vs site_sha).
//
// source_sha is the product commit every screenshot, specimen and benchmark
// record was taken from. site_sha is the commit of the page sources, which
// moves with each edit here. They are allowed to differ, but the relationship
// has to be provable: the product paths must be byte-identical between them,
// or the evidence on the page would describe bytes that are no longer there.
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SITE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const ROOT = path.dirname(SITE);

export function git(...args) {
  return execFileSync("git", ["-C", ROOT, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim();
}

export async function release() {
  const declared = JSON.parse(await readFile(path.join(SITE, "release.json"), "utf8"));
  const siteSha = git("rev-parse", "HEAD");
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
  };
}
