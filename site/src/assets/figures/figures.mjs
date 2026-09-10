// Figures are data: geometry and meaning live in the SVG files beside this
// module, and figures.json records what each one claims. Mounting refuses a
// file whose bytes differ from its manifest hash, so a figure cannot change
// without its concepts, status and red registration being looked at again.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const ROOT = new URL("../../../../", import.meta.url);
export const MANIFEST = JSON.parse(readFileSync(new URL("figures.json", import.meta.url), "utf8"));

export function figureEntry(id) {
  const entry = MANIFEST.figures.find((figure) => figure.id === id);
  if (!entry) throw new Error(`figure ${id} is not registered in figures.json`);
  return entry;
}

/** The SVG markup of a file-backed figure, verified against its manifest hash. */
export function figureSvg(id) {
  const entry = figureEntry(id);
  if (entry.source.basis !== "file") throw new Error(`figure ${id} is not file-backed`);
  const bytes = readFileSync(new URL(entry.source.file, ROOT));
  const sha = createHash("sha256").update(bytes).digest("hex");
  if (sha !== entry.source.sha256) throw new Error(`${entry.source.file} does not match the sha256 figures.json records for ${id}`);
  return bytes.toString("utf8").trim();
}
