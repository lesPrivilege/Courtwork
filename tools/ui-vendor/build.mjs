import {
  readFile,
  writeFile,
  mkdir,
  readdir,
  copyFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
const here = path.dirname(fileURLToPath(import.meta.url));
const output = path.resolve(here, "../../app/web/vendor");
await mkdir(output, { recursive: true });
// `--icons-only` regenerates the sprite, its notices and the manifest without
// touching the bundled JS distributions, so a glyph change needs no esbuild.
const iconsOnly = process.argv.includes("--icons-only");
const previous = iconsOnly ? JSON.parse(await readFile(path.join(output, "manifest.json"), "utf8")) : null;
if (!iconsOnly) {
const { build } = await import("esbuild");
await build({
  stdin: {
    contents:
      "export {computePosition,offset,flip,shift,autoUpdate} from '@floating-ui/dom';",
    resolveDir: here,
  },
  bundle: true,
  format: "esm",
  minify: true,
  outfile: path.join(output, "floating.mjs"),
  legalComments: "inline",
});
await copyFile(
  path.join(here, "node_modules/marked/lib/marked.esm.js"),
  path.join(output, "marked.mjs"),
);
await copyFile(
  path.join(here, "node_modules/dompurify/dist/purify.es.mjs"),
  path.join(output, "purify.mjs"),
);
}
const names = (await readdir(path.join(here, "lucide")))
  .filter((f) => f.endsWith(".svg"))
  .sort();
let sprite = '<svg xmlns="http://www.w3.org/2000/svg">\n';
for (const file of names) {
  const svg = await readFile(path.join(here, "lucide", file), "utf8");
  const contents = svg.slice(svg.indexOf(">") + 1, svg.lastIndexOf("</svg>"));
  sprite += `<symbol id="${file.slice(0, -4)}" viewBox="0 0 24 24">${contents}</symbol>\n`;
}
// CourtWork's own domain glyphs (Spark, Attention, Chat) share the sprite and the
// Lucide geometry contract; their sources and hashes live beside the Lucide pin.
const domainNames = (await readdir(path.join(here, "courtwork")))
  .filter((f) => f.endsWith(".svg"))
  .sort();
for (const file of domainNames) {
  const svg = await readFile(path.join(here, "courtwork", file), "utf8");
  const contents = svg.slice(svg.indexOf(">") + 1, svg.lastIndexOf("</svg>"));
  sprite += `<symbol id="${file.slice(0, -4)}" viewBox="0 0 24 24">${contents}</symbol>\n`;
}
sprite += "</svg>\n";
await writeFile(path.join(output, "icons.svg"), sprite);
let notices =
  "Vendored UI assets — pinned source and adaptations in tools/ui-vendor.\n\n";
if (iconsOnly) {
  const existing = await readFile(path.join(output, "LICENSES.txt"), "utf8");
  notices = existing.slice(0, existing.indexOf("Lucide 1.41.0"));
}
for (const pkg of iconsOnly ? [] : [
  "@floating-ui/dom",
  "@floating-ui/core",
  "@floating-ui/utils",
  "marked",
  "dompurify",
]) {
  const dir = path.join(here, "node_modules", pkg);
  const meta = JSON.parse(
    await readFile(path.join(dir, "package.json"), "utf8"),
  );
  const files = await readdir(dir);
  const license = files.find((f) => /^license(?:\.txt|\.md)?$/i.test(f));
  notices += `${pkg} ${meta.version}\n${await readFile(path.join(dir, license), "utf8")}\n\n`;
}
notices +=
  "Lucide 1.41.0\n" +
  (await readFile(path.join(here, "lucide/LICENSE"), "utf8")) +
  "\nCourtWork domain glyphs (tools/ui-vendor/courtwork): MIT, see the repository LICENSE.\n";
await writeFile(path.join(output, "LICENSES.txt"), notices);
const lock = JSON.parse(
  await readFile(path.join(here, "package-lock.json"), "utf8"),
);
const packages = iconsOnly ? previous.packages : Object.fromEntries(
  Object.entries(lock.packages)
    .filter(([k]) => k && !k.includes("@esbuild/") && !k.endsWith("/esbuild"))
    .map(([k, v]) => [
      k,
      { version: v.version, integrity: v.integrity, license: v.license },
    ]),
);
const outputs = {};
for (const file of [
  "floating.mjs",
  "marked.mjs",
  "purify.mjs",
  "icons.svg",
  "LICENSES.txt",
])
  outputs[file] = createHash("sha256")
    .update(await readFile(path.join(output, file)))
    .digest("hex");
await writeFile(
  path.join(output, "manifest.json"),
  JSON.stringify(
    {
      packages,
      lucide: JSON.parse(
        await readFile(path.join(here, "lucide/sources.json"), "utf8"),
      ),
      courtwork: JSON.parse(
        await readFile(path.join(here, "courtwork/sources.json"), "utf8"),
      ),
      adaptations: [
        "Floating DOM is bundled to ESM; Marked and DOMPurify distributions copied without edits.",
        "Lucide paths copied into static symbols; native SVG use retains viewBox 24, stroke currentColor, stroke-width 2, round caps/joins, fill none.",
        "CourtWork domain glyphs (tools/ui-vendor/courtwork) are appended to the same sprite under the same geometry contract; sources and hashes recorded under courtwork.",
      ],
      outputs,
    },
    null,
    2,
  ) + "\n",
);
