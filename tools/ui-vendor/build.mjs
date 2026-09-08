import { build } from "esbuild";
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
const names = (await readdir(path.join(here, "lucide")))
  .filter((f) => f.endsWith(".svg"))
  .sort();
let sprite = '<svg xmlns="http://www.w3.org/2000/svg">\n';
for (const file of names) {
  const svg = await readFile(path.join(here, "lucide", file), "utf8");
  const contents = svg.slice(svg.indexOf(">") + 1, svg.lastIndexOf("</svg>"));
  sprite += `<symbol id="${file.slice(0, -4)}" viewBox="0 0 24 24">${contents}</symbol>\n`;
}
sprite += "</svg>\n";
await writeFile(path.join(output, "icons.svg"), sprite);
let notices =
  "Vendored UI assets — pinned source and adaptations in tools/ui-vendor.\n\n";
for (const pkg of [
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
  (await readFile(path.join(here, "lucide/LICENSE"), "utf8"));
await writeFile(path.join(output, "LICENSES.txt"), notices);
const lock = JSON.parse(
  await readFile(path.join(here, "package-lock.json"), "utf8"),
);
const packages = Object.fromEntries(
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
      adaptations: [
        "Floating DOM is bundled to ESM; Marked and DOMPurify distributions copied without edits.",
        "Lucide paths copied into static symbols; native SVG use retains viewBox 24, stroke currentColor, stroke-width 2, round caps/joins, fill none.",
      ],
      outputs,
    },
    null,
    2,
  ) + "\n",
);
