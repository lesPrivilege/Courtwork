// Export the static SVG assets from src/geometry.mjs (the geometric source).
// tests/presence.test.mjs checks that every file still equals its export, so
// an asset cannot drift from the geometry the motion uses.
//   node engineering/design/agent-presence-2026-09-11/return-v1/tools/build-assets.mjs

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { ASSETS, assetMarkup, manifest } from "./assets.mjs";

const dir = fileURLToPath(new URL("../assets/", import.meta.url));
await mkdir(dir, { recursive: true });
for (const asset of ASSETS) await writeFile(join(dir, asset.file), assetMarkup(asset) + "\n");
await writeFile(join(dir, "manifest.json"), JSON.stringify(manifest(), null, 2) + "\n");
console.log(`wrote ${ASSETS.length} SVG assets + manifest.json`);
