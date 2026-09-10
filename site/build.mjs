#!/usr/bin/env node
import { checkPagesSemantics } from '../tools/check-pages-semantics.mjs';
// CourtWork publishing surface — build.
//
// site/dist/ is generated from three sources and nothing else: the product's
// own stylesheet and rendering modules, the page sources under site/src/, and
// the recorded evidence (specimen, media, benchmark record). The build is
// deterministic — given the same repository bytes it writes the same output
// bytes — so two runs can be compared by hash.
//
//   node site/build.mjs
//
import { readFile, writeFile, mkdir, rm, readdir, stat } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { extractTokens } from "./scripts/tokens.mjs";
import { copyProductModules } from "./scripts/vendor-product.mjs";
import { release, ROOT, SITE, productBytes } from "./scripts/release.mjs";
import { renderProductPages } from "./src/product-pages.mjs";
import { renderPage, brandIcon } from "./src/page.mjs";
import { renderSpecimenPage } from "./src/specimen-page.mjs";
import { assertPublicTree } from "./scripts/public-data.mjs";
import { renderReadme } from "./src/readme.mjs";

const DIST = path.join(SITE, "dist");
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

// Preserve native screenshot encoding; the connected browser returns JPEG.
function imageSize(bytes) {
  if (bytes.toString("hex", 0, 8) === "89504e470d0a1a0a") return `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`;
  if (bytes.readUInt16BE(0) !== 0xffd8) throw new Error("Unsupported screenshot encoding");
  for (let offset = 2; offset + 9 < bytes.length;) {
    if (bytes[offset++] !== 0xff) throw new Error("Invalid JPEG marker");
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    const length = bytes.readUInt16BE(offset);
    if ([0xc0, 0xc1, 0xc2].includes(marker)) return `${bytes.readUInt16BE(offset + 5)}x${bytes.readUInt16BE(offset + 3)}`;
    if (length < 2) throw new Error("Invalid JPEG segment");
    offset += length;
  }
  throw new Error("Screenshot dimensions missing");
}

const written = [];
async function emit(relative, contents) {
  const target = path.join(DIST, relative);
  await mkdir(path.dirname(target), { recursive: true });
  const bytes = Buffer.isBuffer(contents) ? contents : Buffer.from(contents);
  await writeFile(target, bytes);
  written.push({ path: relative, bytes: bytes.length, sha256: sha256(bytes) });
}

/** Copy a directory into dist verbatim, in a stable order. */
async function emitTree(from, into) {
  for (const entry of (await readdir(from, { withFileTypes: true })).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const source = path.join(from, entry.name);
    const relative = path.posix.join(into, entry.name);
    if (into === "specimen" && /^[0-9a-f]{7}\.json$/.test(entry.name) && entry.name !== `${identity.sha7}.json`) continue;
    if (entry.isDirectory()) await emitTree(source, relative);
    else await emit(relative, await readFile(source));
  }
}

await checkPagesSemantics();
const identity = await release();

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });

// ---- material: the product's tokens, not the site's ------------------------
const tokens = await extractTokens("app/web/styles.css", productBytes(identity.source_sha, "app/web/styles.css"));
await emit("tokens.css", tokens.css);

// ---- the specimen's copy of the product's rendering modules -----------------
const vendorDestination = path.join(SITE, "specimen", "vendor-product");
const vendor = await copyProductModules({ root: ROOT, destination: vendorDestination,
  readSource: (from) => productBytes(identity.source_sha, from) });

// ---- the specimen recording and its receipt ---------------------------------
const capture = JSON.parse(await readFile(path.join(SITE, "specimen", "capture.json"), "utf8"));
const specimenBytes = await readFile(path.join(ROOT, capture.file));
if (sha256(specimenBytes) !== capture.sha256) {
  throw new Error(`${capture.file} does not match the sha256 its capture receipt records; re-run site/scripts/capture-specimen.mjs`);
}
if (capture.source_sha !== identity.source_sha) {
  throw new Error(`the specimen was captured at ${capture.source_sha.slice(0, 7)} but release.json declares ${identity.sha7}`);
}

const specimenManifest = {
  id: "specimen",
  kind: "interactive-fixture",
  source_sha: capture.source_sha,
  capture_date: capture.capture_date,
  capture_command: capture.capture_command,
  data_kind: capture.data_kind,
  provider_mode: capture.provider_mode,
  dataClass: capture.dataClass,
  recording: { path: path.posix.join("specimen", path.basename(capture.file)), bytes: capture.bytes, sha256: capture.sha256 },
  vendor_product: vendor.files,
  rewritten_references: vendor.references,
};
await writeFile(path.join(SITE, "specimen", "manifest.json"), JSON.stringify(specimenManifest, null, 2) + "\n");

// The eight sentences exist once, in site/src/steps.mjs. The specimen gets a
// copy so the iframe can import them, and its document is generated from the
// same source so the no-script list cannot drift from the interactive one.
await writeFile(path.join(SITE, "specimen", "copy.mjs"), await readFile(path.join(SITE, "src", "steps.mjs")));

// ---- the recorded evidence the page is allowed to state as numbers ---------
const { readEvidence } = await import("./scripts/evidence.mjs");
const evidence = await readEvidence({ root: ROOT, identity });
const media = JSON.parse(await readFile(path.join(SITE, "media", "manifest.json"), "utf8"));
if (media.source_sha !== identity.source_sha) {
  throw new Error(`the media were captured at ${String(media.source_sha).slice(0, 7)}, not at ${identity.sha7}`);
}
const pageMedia = JSON.parse(await readFile(path.join(SITE, "media", "main", "manifest.json"), "utf8"));
const validateMedia = async (manifest, label) => {
  if (!/^[0-9a-f]{40}$/.test(manifest.source_sha)) throw new Error(`${label} source_sha is not a full commit SHA`);
  for (const entry of manifest.media) {
    if (entry.source_sha !== manifest.source_sha) throw new Error(`${label} mixes source snapshots`);
    const bytes = await readFile(path.join(ROOT, entry.asset_path));
    if (entry.bytes !== bytes.length) throw new Error(`${entry.asset_path} byte count disagrees with capture`);
    if (imageSize(bytes) !== entry.viewport) throw new Error(`${entry.asset_path} dimensions disagree with capture`);
    if (sha256(bytes) !== entry.sha256) throw new Error(`${entry.asset_path} does not match its manifest sha256`);
  }
};
await validateMedia(media, "published media");
await validateMedia(pageMedia, "current-main page media");

await writeFile(path.join(SITE, "specimen", "index.html"), renderSpecimenPage({ identity, media }));

await emitTree(path.join(SITE, "specimen"), "specimen");
for (const file of evidence.files) await emit(`evidence/${path.basename(file.path)}`, await readFile(path.join(ROOT, file.path)));

// ---- the page ---------------------------------------------------------------
const recording = JSON.parse(specimenBytes.toString("utf8"));
const diagram = await readFile(path.join(SITE, "src", "assets", "diagram.svg"), "utf8");
await emit("icon.svg", brandIcon().replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ').replace('fill="currentColor"', 'fill="#282b2d"').replaceAll('<rect x="28"', '<rect fill="#8b9298" x="28"'));
// Method identity is independent of the older product replay identity.
const publishingSourceSha = "b9122180dd0c75fe68ba783c4b70dcb4e3835263";
async function emitMethod(from, to) {
  const frozen = execFileSync("git", ["show", `${publishingSourceSha}:${from}`], { cwd: ROOT, encoding: "utf8" });
  if (frozen !== await readFile(path.join(ROOT, from), "utf8")) throw new Error(`Method source drift: ${from}`);
  const markdown = frozen.replace(/\]\(([^)]+)\)/g, (match, href) => {
    if (/^(?:https?:|#)/.test(href)) return match;
    return `](https://github.com/lesPrivilege/Courtwork/blob/${publishingSourceSha}/${path.posix.normalize(path.posix.join(path.posix.dirname(from), href))})`;
  });
  await emit(to, markdown);
}
await emitMethod("benchmarks/SPEC.md", "benchmark-contract.md");
await emitMethod("engineering/execution/2026-09-10-benchmark-series/README.md", "benchmark-series.md");
await emit("index.html", renderPage({ identity, evidence, recording, diagram, media, pageMedia }));
const packageVersion = JSON.parse(productBytes(pageMedia.source_sha, "app/package.json").toString("utf8")).version;
const productPages = renderProductPages({identity, media: pageMedia, recording, packageVersion});
for (const [name, html] of Object.entries(productPages)) await emit(name, html);
await emit("product-pages.css", await readFile(path.join(SITE, "src", "product-pages.css")));
await emit("product-pages.mjs", await readFile(path.join(SITE, "src", "product-interactions.mjs")));
await emit("site.css", await readFile(path.join(SITE, "src", "site.css")));
await emit("pricing.css", await readFile(path.join(SITE, "src", "pricing.css")));
await emit("site.mjs", await readFile(path.join(SITE, "src", "site.mjs")));
if (await exists(path.join(SITE, "media"))) await emitTree(path.join(SITE, "media"), "media");

// ---- the README --------------------------------------------------------------
// The public README has its own editorial source and shares run commands with
// the page. Pass --write-readme to regenerate it after editing that source.
const readme = renderReadme({ identity, evidence });
const readmePath = path.join(ROOT, "README.md");
const current = await readFile(readmePath, "utf8").catch(() => null);
if (current !== readme) {
  if (process.argv.includes("--write-readme")) {
    await writeFile(readmePath, readme);
    console.error("README.md regenerated from site/src/readme.mjs");
  } else {
    throw new Error("README.md is out of step with site/src/readme.mjs; run: node site/build.mjs --write-readme");
  }
}

// ---- publish manifest -------------------------------------------------------
const manifest = {
  publishing_source_sha: publishingSourceSha,
  source_sha: identity.source_sha,
  site_sha: identity.site_sha,
  built_at: identity.built_at,
  built_at_note: "the release commit's own date; the build stamps no wall clock, so two builds of the same sources are byte-identical",
  site_sha_note: "SHA-256 of authored page sources and recorded evidence; generated README, dist and specimen copies are excluded. Product tokens and modules come from source_sha Git blobs.",
  tokens: { source: "app/web/styles.css", source_sha256: tokens.sourceSha256, blocks: tokens.blocks },
  media_manifest: "media/manifest.json",
  product_media_manifest: "media/main/manifest.json",
  product_media_source_sha: pageMedia.source_sha,
  specimen_manifest: "specimen/manifest.json",
  evidence_links: evidence.links,
  supported_platforms: ["local run from source on macOS and Linux"],
  download_assets: [],
  source_preview_version: packageVersion,
  product_pages: Object.keys(productPages),
  known_limits: evidence.knownLimits,
  locale_content_hashes: { "zh-CN": sha256(await readFile(path.join(DIST, "index.html"))) },
  files: written,
};
await emit("build-manifest.json", JSON.stringify(manifest, null, 2) + "\n");

await assertPublicTree(DIST);

for (const file of written) {
  console.log(`${file.sha256.slice(0, 12)}  ${String(file.bytes).padStart(9)}  ${file.path}`);
}

async function exists(p) {
  try { await stat(p); return true; } catch { return false; }
}
