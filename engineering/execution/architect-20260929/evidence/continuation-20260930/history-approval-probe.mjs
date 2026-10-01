import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { execFileSync } from "node:child_process";

const source = process.argv[2];
assert.ok(source, "usage: node history-approval-probe.mjs /path/to/reviewed/checkout");
const { permissionPresentation, checkAuthoredFilesSentence } = await import(pathToFileURL(path.join(source, "app/web/thread-projection.mjs")));
const payload = { tool: "check_run", recipeId: "node-test-harness-contract", recipeVersion: 1,
  command: "node", argv: ["--test"], timeoutMs: 120000, outputLimitBytes: 65536,
  candidateId: "old-candidate", candidateWriteRevision: 1 };
const presentation = permissionPresentation(payload, null);
const authoredFiles = checkAuthoredFilesSentence(1);
console.log(JSON.stringify({ sourceHead: execFileSync("git", ["-C", source, "rev-parse", "HEAD"], { encoding: "utf8" }).trim(), payload, scope: presentation.scope, authoredFiles }));
// Defect-expecting assertions: the shared live/history helpers invent this
// execution fact for an old payload that did not retain a sandbox identity.
assert.match(presentation.scope, /sandboxed, no network/);
assert.match(authoredFiles, /inside a sandbox/);
