#!/usr/bin/env node
// Turns a recaptured batch (site/media/<batch>/observations.json, 26 native
// 1440×900 JPEGs in 13 same-state light/dark pairs) into the Pages media
// registry: archives the previous site/media/main/manifest.json under
// site/media/archive/main-<sha7>.json (its JPEGs stay where they are), writes
// the new main manifest and pins site/src/capture-plan.mjs to the batch's
// product commit. Mirrors evidence/semantic-polish-merge-20260911/finalize-captures.mjs.
//
//   node evidence/publication-final-20260911/finalize-media.mjs --batch publication-final-20260911 --source-sha <40-hex>
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i === -1 ? fallback : process.argv[i + 1]; };
const BATCH = arg("--batch", "publication-final-20260911");
const SOURCE = arg("--source-sha", null);
if (!/^[0-9a-f]{40}$/.test(SOURCE ?? "")) throw new Error("--source-sha must be a full commit SHA");
const slots = ["home", "spark", "running", "attention", "approval", "artifact", "matter", "review", "continuity", "models", "integrations", "settings", "conversation"];
const observations = JSON.parse(await readFile(path.join(ROOT, "site/media", BATCH, "observations.json"), "utf8"));
if (observations.length !== 26) throw new Error(`Expected exactly 26 observations, found ${observations.length}`);

function dimensions(bytes) {
  if (bytes.readUInt16BE(0) !== 0xffd8) throw new Error("Expected native JPEG");
  for (let offset = 2; offset + 9 < bytes.length;) {
    if (bytes[offset++] !== 0xff) throw new Error("Invalid JPEG marker");
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++], length = bytes.readUInt16BE(offset);
    if ([0xc0, 0xc1, 0xc2].includes(marker)) return `${bytes.readUInt16BE(offset + 5)}x${bytes.readUInt16BE(offset + 3)}`;
    offset += length;
  }
  throw new Error("No JPEG dimensions");
}
const media = [];
for (const slot of slots) {
  const pair = ["light", "dark"].map((theme) => {
    const items = observations.filter((o) => o.slot === slot && o.theme === theme);
    if (items.length !== 1) throw new Error(`Missing or duplicate ${slot}/${theme}`);
    return items[0];
  });
  if (!pair[0].state_id || pair[0].state_id !== pair[1].state_id) throw new Error(`State pair mismatch: ${slot}`);
  for (const o of pair) {
    const bytes = await readFile(path.join(ROOT, o.asset_path));
    const viewport = dimensions(bytes);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (viewport !== "1440x900" || o.observed.width !== 1440 || o.observed.height !== 900 || o.observed.dpr !== 1 || o.observed.bodyFont !== "14px" || sha256 !== o.sha256) throw new Error(`Capture mismatch: ${o.asset_path}`);
    media.push({
      id: slot, kind: "product-screenshot", source_sha: SOURCE, state_id: o.state_id, capture_date: o.captured_at.slice(0, 10), captured_at: o.captured_at, viewport, theme: o.theme,
      data_kind: "synthetic",
      provider_mode: "Local deterministic loopback; catalog fake seed with the recorded Spark and Attention-conversation corrections (temporary local compatible loopback); no external model call",
      capture_command: "evidence/publication-final-20260911/recapture-media.mjs — headless Chrome over CDP; actual UI navigation; native viewport JPEG; no DOM/image edits",
      operator: "Claude Fable 5.1 (author)", independent_reviewer: "pending — non-author review is Astra's",
      asset_path: o.asset_path, evidence_path: "evidence/publication-final-20260911/media-recapture.md", sha256, bytes: bytes.length, displayed_path: o.displayed_path, setup_steps: o.detail, claim_ids: [slot],
      limitations: "Synthetic task material and deterministic local provider. UI state evidence does not establish model quality or formal product acceptance.",
      mime_type: "image/jpeg",
    });
  }
}
const mainPath = path.join(ROOT, "site/media/main/manifest.json");
const previous = JSON.parse(await readFile(mainPath, "utf8"));
if (previous.source_sha !== SOURCE) {
  const archivePath = path.join(ROOT, "site/media/archive", `main-${previous.source_sha.slice(0, 7)}.json`);
  await writeFile(archivePath, JSON.stringify({ ...previous, archived_at: new Date().toISOString(), superseded_by: BATCH }, null, 2) + "\n");
  console.log(`archived previous registry → ${path.relative(ROOT, archivePath)}`);
}
const manifest = { source_sha: SOURCE, batch: BATCH, origin: "isolated localhost fixtures on the final product commit; per-image URLs recorded below", media };
await writeFile(mainPath, JSON.stringify(manifest, null, 2) + "\n");
const planPath = path.join(ROOT, "site/src/capture-plan.mjs");
let plan = await readFile(planPath, "utf8");
plan = plan.replace(/export const captureBatch = \{ status: 'ready', source_sha: '[0-9a-f]{40}' \};/, `export const captureBatch = { status: 'ready', source_sha: '${SOURCE}' };`);
await writeFile(planPath, plan);
console.log(`Verified ${media.length} native 1440x900 JPEG images in 13 same-state pairs at ${SOURCE}`);
