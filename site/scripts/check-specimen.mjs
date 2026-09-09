#!/usr/bin/env node
// Prove the specimen is a recording and not a hand-written artefact: capture it
// twice and compare.
//
// Two captures cannot be byte-identical, because the runtime mints a fresh
// session id, run ids, candidate ids and timestamps each time, and every
// content hash in the projection is taken over those ids. What must be
// identical is everything else — and the *structure* of the identifiers: the
// same value must recur in the same places. So each document is normalised by
// replacing volatile tokens with placeholders numbered by first appearance,
// which preserves that structure, and the normalised documents are compared
// byte for byte.
//
//   node site/scripts/check-specimen.mjs
//
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { release, ROOT, SITE } from "./release.mjs";

const VOLATILE = [
  /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}(?:Z|[+-]\d{2}:\d{2})/g, // ISO timestamps
  /\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z/g, // journal file names
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, // run/session ids
  /[0-9a-f]{64}/g, // content hashes and Core ids
  /\/(?:private\/)?(?:tmp|var)\/[A-Za-z0-9._\-\/]+/g, // the capture data directory
];

export function normalise(text) {
  const seen = new Map();
  let out = text;
  for (const pattern of VOLATILE) {
    out = out.replace(pattern, (token) => {
      if (!seen.has(token)) seen.set(token, `<v${seen.size + 1}>`);
      return seen.get(token);
    });
  }
  return { text: out, tokens: seen.size };
}

const { sha7 } = await release();
const specimen = path.join(SITE, "specimen", `${sha7}.json`);
const scratch = await mkdtemp(path.join(tmpdir(), "ps01-specimen-check-"));

const receiptPath = path.join(SITE, "specimen", "capture.json");

try {
  const first = await readFile(specimen, "utf8");
  const firstReceipt = await readFile(receiptPath, "utf8");
  execFileSync(process.execPath, [path.join(SITE, "scripts", "capture-specimen.mjs"), "--data-dir", path.join(scratch, "data")], {
    cwd: ROOT,
    stdio: "pipe",
  });
  const second = await readFile(specimen, "utf8");
  // Leave the committed file as it was found; this check must not be a way to
  // silently replace the evidence.
  await writeFile(specimen, first);
  await writeFile(receiptPath, firstReceipt);

  const a = normalise(first);
  const b = normalise(second);
  const identical = a.text === b.text;
  console.log(
    JSON.stringify(
      {
        specimen: path.relative(ROOT, specimen),
        bytes: Buffer.byteLength(first),
        sha256: createHash("sha256").update(first).digest("hex"),
        normalised_sha256: createHash("sha256").update(a.text).digest("hex"),
        second_capture_normalised_sha256: createHash("sha256").update(b.text).digest("hex"),
        volatile_tokens: { first: a.tokens, second: b.tokens },
        identical_after_normalising_ids_and_timestamps: identical,
      },
      null,
      2,
    ),
  );
  if (!identical) process.exitCode = 1;
} finally {
  await rm(scratch, { recursive: true, force: true });
}
