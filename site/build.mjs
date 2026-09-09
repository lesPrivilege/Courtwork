#!/usr/bin/env node
// CourtWork publishing surface — build.
//
// Everything under site/dist/ is generated from three sources and nothing else:
// the product's own stylesheet (tokens), the page sources under site/src/, and
// the recorded evidence (specimen JSON, media, benchmark record). The build is
// deterministic: given the same repository bytes it writes the same output
// bytes, so two runs can be compared by hash.
//
//   node site/build.mjs
//
import { readFile, writeFile, mkdir, rm, readdir, copyFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractTokens } from "./scripts/tokens.mjs";

const SITE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(SITE);
const DIST = path.join(SITE, "dist");

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

function git(...args) {
  return execFileSync("git", ["-C", ROOT, ...args], { encoding: "utf8" }).trim();
}

async function emit(relative, contents) {
  const target = path.join(DIST, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, contents);
  const bytes = Buffer.isBuffer(contents) ? contents : Buffer.from(contents);
  return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
}

async function main() {
  const written = [];

  // The release SHA is the commit the page describes. HEAD is used rather than
  // a hard-coded constant so the manifest can never claim a version the working
  // tree is not actually on.
  const sourceSha = git("rev-parse", "HEAD");

  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  // ---- tokens ------------------------------------------------------------
  const tokens = await extractTokens(path.join(ROOT, "app", "web", "styles.css"));
  written.push(await emit("tokens.css", tokens.css));

  const manifest = {
    source_sha: sourceSha,
    tokens: {
      source: "app/web/styles.css",
      source_sha256: tokens.sourceSha256,
      blocks: tokens.blocks,
    },
    files: written,
  };
  await writeFile(
    path.join(DIST, "build-manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );

  for (const file of written) console.log(`${file.sha256.slice(0, 12)}  ${file.bytes.toString().padStart(8)}  ${file.path}`);
}

await main();
