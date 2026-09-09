#!/usr/bin/env node
// The site declares no material of its own.
//
// Colour, shadow and corner radius belong to the product's stylesheet and
// reach the page through the tokens the build extracts. This check reads the
// site's own two stylesheets and fails on any literal that would quietly start
// a second design system: a hex or rgb() colour, a shadow written out, a
// radius in pixels, or a font stack. Measurements are allowed and are the only
// thing the site is permitted to declare for itself.
//
//   node site/scripts/check-material.mjs
//
import { readFile } from "node:fs/promises";
import path from "node:path";
import { SITE } from "./release.mjs";

const SHEETS = [
  path.join(SITE, "src", "site.css"),
  path.join(SITE, "src", "pricing.css"),
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

console.log(JSON.stringify({ sheets: SHEETS.length, site_declared_variables: [...declared], problems, pass: problems.length === 0 }, null, 2));
if (problems.length) process.exitCode = 1;
