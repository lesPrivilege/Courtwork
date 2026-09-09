#!/usr/bin/env node
// Check what the built page points at.
//
// Two failures matter here and neither shows up in a browser at the domain
// root: a link that resolves outside the /Courtwork/ sub-path (any src or href
// beginning with "/"), and a local link to a file the build never wrote. Both
// are silent 404s for every reader.
//
//   node site/scripts/check-links.mjs
//
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { SITE, ROOT } from "./release.mjs";

const DIST = path.join(SITE, "dist");
const ALLOWED_EXTERNAL = ["https://github.com/", "https://lesprivilege.github.io/"];

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

const files = await walk(DIST);
const present = new Set(files.map((file) => path.relative(DIST, file)));
const problems = [];
const checked = [];

// The copied product modules are checked differently, just below: scanning a
// bundled library's source for href="..." only finds the strings it builds at
// run time.
const VENDOR = path.join(DIST, "specimen", "vendor-product");

for (const file of files.filter((f) => /\.(html|css|mjs)$/.test(f) && !f.startsWith(VENDOR))) {
  const text = await readFile(file, "utf8");
  const from = path.relative(DIST, file);
  const dir = path.dirname(from);

  // Every attribute the browser will fetch, plus url() in stylesheets.
  const references = [
    ...text.matchAll(/(?:src|href|srcset)="([^"]+)"/g),
    ...text.matchAll(/url\((['"]?)([^)'"]+)\1\)/g),
  ].map((match) => (match[2] === undefined ? match[1] : match[2]));

  for (const reference of references) {
    if (reference.startsWith("#") || reference.startsWith("data:") || reference.startsWith("mailto:")) continue;
    if (/^https?:\/\//.test(reference)) {
      // Links off the site are allowed, but only to places this project owns;
      // anything else would be an outbound request the page never declared.
      if (!ALLOWED_EXTERNAL.some((prefix) => reference.startsWith(prefix)))
        problems.push({ file: from, reference, why: "external link outside the project's own hosts" });
      continue;
    }
    if (reference.startsWith("/")) {
      problems.push({ file: from, reference, why: "root-relative: resolves outside the /Courtwork/ sub-path" });
      continue;
    }
    const target = path.normalize(path.join(dir, reference.split("#")[0].split("?")[0]));
    checked.push({ file: from, reference, target });
    if (!present.has(target)) problems.push({ file: from, reference, why: `no such file in site/dist: ${target}` });
  }
}

// The copied product modules must carry no root-relative reference at all:
// those are exactly the ones that would resolve above /Courtwork/ and 404.
for (const file of files.filter((f) => f.startsWith(VENDOR))) {
  const text = await readFile(file, "utf8");
  for (const [, reference] of text.matchAll(/["'`](\/(?:web|api|brand)\/[^"'`]*)/g))
    problems.push({ file: path.relative(DIST, file), reference, why: "root-relative reference survived the rewrite" });
}

// The page also names repository paths in its evidence tables; those are links
// to github.com and are covered above, but the paths themselves must exist.
const index = await readFile(path.join(DIST, "index.html"), "utf8");
for (const [, repoPath] of index.matchAll(/https:\/\/github\.com\/lesPrivilege\/Courtwork\/(?:blob|tree)\/main\/([^"]+)/g)) {
  try {
    await stat(path.join(ROOT, repoPath));
  } catch {
    problems.push({ file: "index.html", reference: repoPath, why: "the repository has no such path at this commit" });
  }
}

console.log(
  JSON.stringify(
    {
      files: files.length,
      local_references_checked: checked.length,
      problems,
      pass: problems.length === 0,
    },
    null,
    2,
  ),
);
if (problems.length) process.exitCode = 1;
