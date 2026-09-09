// The recorded facts the page is allowed to state as numbers.
//
// No number on the page is typed by a person. The benchmark pass counts come
// out of the record file produced by re-running the harness on the release
// commit, and the build refuses to produce a page if that record is missing or
// was produced somewhere else. Same for the test total.
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { productBytes } from "./release.mjs";

export const EVIDENCE_DIR = "evidence/publishing-surface-2026-09-09";

export async function readEvidence({ root, identity }) {
  const dir = path.join(root, EVIDENCE_DIR);
  const base = `continuity-${identity.sha7}.json`;

  let record;
  try {
    record = JSON.parse(await readFile(path.join(dir, base), "utf8"));
  } catch (error) {
    throw new Error(
      `${EVIDENCE_DIR}/${base} is missing. Re-run the harness on the release commit:\n` +
        `  node benchmarks/continuity/run.mjs --output /absolute/path/${base}\n` +
        `and copy the output, its .attempts.json and its .journal.jsonl into ${EVIDENCE_DIR}/.\n` +
        `(${error.message})`,
    );
  }

  if (record.git?.head !== identity.source_sha) {
    throw new Error(
      `${base} was produced at ${String(record.git?.head).slice(0, 7)}, not at the release commit ${identity.sha7}. ` +
        "The page may only read pass counts from a run on the commit it publishes.",
    );
  }
  if (record.git?.dirty) throw new Error(`${base} was produced from a dirty tree; the page may not read counts from it.`);

  if (!record.hashes || Object.keys(record.hashes).length === 0) throw new Error("Benchmark source hashes are missing");
  for (const [file, expected] of Object.entries(record.hashes)) {
    const actual = createHash("sha256").update(await productBytes(identity.source_sha, file)).digest("hex");
    if (actual !== expected) throw new Error(`Benchmark source hash mismatch: ${file}`);
  }

  // Pass counts per condition, counted from the results rather than taken from
  // any prose. E is CourtWork's Core, S the conventional comparator.
  const conditions = {};
  for (const result of record.results ?? []) {
    const bucket = (conditions[result.condition] ??= { attempted: 0, passed: 0 });
    bucket.attempted += 1;
    if (result.grade?.pass) bucket.passed += 1;
  }

  const files = [];
  for (const name of [base, `${base}.attempts.json`, `${base}.journal.jsonl`, "tests.log"]) {
    const bytes = await readFile(path.join(dir, name));
    const digest = createHash("sha256").update(bytes).digest("hex");
    const declaration = JSON.parse(await readFile(path.join(root, "site/release.json"), "utf8"));
    if (declaration.evidence_sha256?.[name] !== digest) throw new Error(`Evidence bytes differ from release receipt: ${name}`);
    files.push({ path: `${EVIDENCE_DIR}/${name}`, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
  }

  const attempts = JSON.parse(await readFile(path.join(dir, `${base}.attempts.json`), "utf8"));
  const journal = (await readFile(path.join(dir, `${base}.journal.jsonl`), "utf8")).trim().split("\n").map(line => JSON.parse(line));
  if (attempts.git?.head !== record.git.head || attempts.git?.dirty || JSON.stringify(attempts.hashes) !== JSON.stringify(record.hashes)) throw new Error("Attempt metadata differs from benchmark record");
  const ids = attempts.attempts?.map(row => row.id) ?? [];
  if (ids.length !== record.results.length || new Set(ids).size !== ids.length) throw new Error("Benchmark attempt coverage differs");
  for (const result of record.results) {
    const terminal = journal.filter(row => row.attemptId === result.id && row.result);
    if (!ids.includes(result.id) || terminal.length !== 1 || JSON.stringify(terminal[0].result) !== JSON.stringify(result)) throw new Error(`Benchmark journal differs: ${result.id}`);
  }

  const testLog = await readFile(path.join(dir, "tests.log"), "utf8");
  const pass = /^ℹ pass (\d+)$/m.exec(testLog);
  const fail = /^ℹ fail (\d+)$/m.exec(testLog);
  if (!pass || !fail) throw new Error(`${EVIDENCE_DIR}/tests.log does not carry a node --test summary`);

  return {
    benchmark: {
      protocol: record.protocol,
      started_at: record.startedAt,
      git: record.git,
      corpus: record.corpus,
      model: record.model,
      summary: record.summary,
      conditions,
      record: `${EVIDENCE_DIR}/${base}`,
    },
    tests: { pass: Number(pass[1]), fail: Number(fail[1]), command: "npm --prefix app test" },
    files,
    links: files.map((file) => file.path),
    knownLimits: record.limitations ?? [],
  };
}
