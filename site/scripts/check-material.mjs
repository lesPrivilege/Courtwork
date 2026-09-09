#!/usr/bin/env node
// Campaign materials are independent; the recorded product specimen remains token-only.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { SITE } from "./release.mjs";

const SHEETS = [
  path.join(SITE, "specimen", "specimen.css"),
];

// Values that would quietly start a second design system.
const LITERALS = [
  { why: "hex colour", pattern: /#[0-9a-fA-F]{3,8}\b/g },
  { why: "rgb / rgba colour", pattern: /\brgba?\(/g },
  { why: "hsl colour", pattern: /\bhsla?\(/g },
  { why: "named colour", pattern: /:\s*(?:black|white|red|green|blue|grey|gray)\s*;/g },
];

// Properties whose value must be a product token, `none`, or nothing at all.
const TOKEN_ONLY = [
  ["box-shadow", /^(?:var\(--[a-z0-9-]+\)|none|inherit)$/],
  ["border-radius", /^(?:var\(--[a-z0-9-]+\)|0|50%|inherit)$/],
  ["font-family", /^(?:var\(--[a-z0-9-]+\)|inherit)$/],
  ["color", /^(?:var\(--[a-z0-9-]+\)|inherit|currentColor)$/],
  ["background", /^(?:var\(--[a-z0-9-]+\)|none|transparent|inherit)$/],
  ["background-color", /^(?:var\(--[a-z0-9-]+\)|none|transparent|inherit)$/],
];

// The measurements the site is allowed to name for itself, and why.
const DECLARED = /--site-[a-z0-9-]+:/g;

const problems = [];
const declared = new Set();

for (const sheet of SHEETS) {
  const text = await readFile(sheet, "utf8");
  const name = path.relative(SITE, sheet);
  // Comments explain the rules; they are not the rules.
  const code = text.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const { why, pattern } of LITERALS)
    for (const match of code.matchAll(pattern))
      problems.push({ file: name, why, text: code.slice(match.index, match.index + 40).split("\n")[0] });

  for (const [property, allowed] of TOKEN_ONLY) {
    const pattern = new RegExp(`(?:^|[;{\\s])${property}:([^;}]+)`, "g");
    for (const match of code.matchAll(pattern)) {
      const value = match[1].trim();
      if (!allowed.test(value))
        problems.push({ file: name, why: `${property} must be a product token`, text: `${property}: ${value}` });
    }
  }
  for (const [match] of code.matchAll(DECLARED)) declared.add(match.slice(0, -1));
}

// Pages may own materials, but must not redefine product semantic tokens.
for (const file of ["site.css", "pricing.css", "product-pages.css"]) {
  const code = (await readFile(path.join(SITE, "src", file), "utf8")).replace(/\/\*[\s\S]*?\*\//g, "");
  for (const match of code.matchAll(/(--[a-z0-9-]+)\s*:/g)) {
    if (!/^--(?:campaign|site|pricing)-/.test(match[1])) problems.push({file: `src/${file}`, why: "campaign must not redefine product tokens", text: match[1]});
  }
}

console.log(JSON.stringify({ sheets: SHEETS.length, site_declared_variables: [...declared], problems, pass: problems.length === 0 }, null, 2));
if (problems.length) process.exitCode = 1;
