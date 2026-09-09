// Copy the product's pure rendering modules into the specimen (PS-18 c).
//
// The specimen must draw the work surface with the product's own code, not a
// site-side imitation, or the page would be showing a drawing of the product
// instead of the product. So the modules are copied at build time and the copy
// is never edited by hand: the only change made to any byte is the rewrite of
// the root-relative URLs the product server serves from "/", which would 404
// under the /Courtwork/ sub-path (EX-PS3 table 4).
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

// Source path → destination path inside the specimen. The layout mirrors the
// product's, so the modules' own "./" imports keep resolving unchanged.
export const MODULES = [
  ["app/web/ui-controls.mjs", "web/ui-controls.mjs"],
  ["app/web/surface-modules.mjs", "web/surface-modules.mjs"],
  ["app/web/thread-projection.mjs", "web/thread-projection.mjs"],
  ["app/web/presentation-adapters.mjs", "web/presentation-adapters.mjs"],
  ["app/web/user-message.mjs", "web/user-message.mjs"],
  ["app/web/workspace-view.mjs", "web/workspace-view.mjs"],
  ["app/web/inspector.mjs", "web/inspector.mjs"],
  ["app/web/runtime-view.mjs", "web/runtime-view.mjs"],
  ["app/web/styles.css", "web/styles.css"],
  ["app/web/vendor/floating.mjs", "web/vendor/floating.mjs"],
  ["app/web/vendor/marked.mjs", "web/vendor/marked.mjs"],
  ["app/web/vendor/purify.mjs", "web/vendor/purify.mjs"],
  ["app/web/vendor/icons.svg", "web/vendor/icons.svg"],
  ["app/web/vendor/LICENSES.txt", "web/vendor/LICENSES.txt"],
  ["app/extensions/inbound-nda/renderer.mjs", "extensions/inbound-nda/renderer.mjs"],
];

// Every root-relative reference EX-PS3 table 4 found across the product's web
// assets, with what this build does about it. The four that live in files the
// specimen does not copy are listed too, so the table can be checked against
// the explore receipt rather than silently shortened.
const REFERENCES = [
  { source: "app/web/index.html", original: "/web/styles.css", disposition: "not copied — the specimen has its own document" },
  { source: "app/web/index.html", original: "/brand/src/court-symbol.mjs", disposition: "not copied — the specimen has its own document" },
  { source: "app/web/index.html", original: "/web/app.mjs", disposition: "not copied — the specimen has its own document" },
  { source: "app/web/app.mjs", original: '"/api/v5"', disposition: "not copied — app.mjs is replaced by site/specimen/shell.mjs" },
  // <use href> resolves against the *document*, not against the module that
  // wrote it, so this one is relative to specimen/index.html rather than to
  // ui-controls.mjs's own directory.
  {
    source: "app/web/ui-controls.mjs",
    original: "/web/vendor/icons.svg#",
    rewrite: ["/web/vendor/icons.svg#", "./vendor-product/web/vendor/icons.svg#"],
  },
  { source: "app/extensions/inbound-nda/renderer.mjs", original: '"/web/ui-controls.mjs"', rewrite: ['"/web/ui-controls.mjs"', '"../../web/ui-controls.mjs"'] },
  { source: "app/extensions/inbound-nda/renderer.mjs", original: '"/web/surface-modules.mjs"', rewrite: ['"/web/surface-modules.mjs"', '"../../web/surface-modules.mjs"'] },
];

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

function lineOf(text, index) {
  let line = 1;
  for (let i = 0; i < index; i++) if (text[i] === "\n") line++;
  return line;
}

export async function copyProductModules({ root, destination, readSource = (from) => readFile(path.join(root, from)) }) {
  await rm(destination, { recursive: true, force: true });
  const files = [];

  for (const [from, to] of MODULES) {
    const original = await readSource(from);
    const rewrites = [];
    let text = original.toString("utf8");

    for (const ref of REFERENCES) {
      if (ref.source !== from || !ref.rewrite) continue;
      const [find, replace] = ref.rewrite;
      let index = text.indexOf(find);
      if (index === -1) throw new Error(`${from}: expected to find ${find} and did not; EX-PS3 table 4 is stale`);
      while (index !== -1) {
        rewrites.push({ line: lineOf(text, index), from: find, to: replace });
        text = text.slice(0, index) + replace + text.slice(index + find.length);
        index = text.indexOf(find, index + replace.length);
      }
    }

    const copied = Buffer.from(text, "utf8");
    const target = path.join(destination, to);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, copied);

    files.push({
      source: from,
      source_sha256: sha256(original),
      source_bytes: original.length,
      copied_to: to,
      copied_sha256: sha256(copied),
      rewrites,
    });
  }

  return { files, references: REFERENCES };
}

// Runnable on its own, so the copy can be regenerated and inspected without a
// full build: node site/scripts/vendor-product.mjs
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const { release, ROOT, SITE, productBytes } = await import("./release.mjs");
  const identity = await release();
  const result = await copyProductModules({
    root: ROOT,
    readSource: (from) => productBytes(identity.source_sha, from),
    destination: path.join(SITE, "specimen", "vendor-product"),
  });
  for (const file of result.files) {
    console.log(`${file.copied_sha256.slice(0, 12)}  ${String(file.source_bytes).padStart(8)}  ${file.source} -> specimen/vendor-product/${file.copied_to}${file.rewrites.length ? `  (${file.rewrites.length} rewritten)` : ""}`);
  }
}
