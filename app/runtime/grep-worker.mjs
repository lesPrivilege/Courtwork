import { parentPort, workerData } from "node:worker_threads";
import { readFile } from "node:fs/promises";
import path from "node:path";

// Inputs are a host-resolved workspace and enumerated relative file names.
// No code from the model is evaluated; only its regular expression is matched.
const { workspaceReal, targets, pattern, maxReadBytes, maxResults } = workerData;
const regex = new RegExp(pattern);
const matches = [];
for (const entry of targets) {
  if (matches.length >= maxResults) break;
  if (entry.bytes > maxReadBytes) continue;
  const bytes = await readFile(path.join(workspaceReal, entry.path)).catch(() => null);
  if (!bytes || bytes.length > maxReadBytes || bytes.subarray(0, 8000).includes(0)) continue;
  const lines = bytes.toString("utf8").split("\n");
  for (let i = 0; i < lines.length && matches.length < maxResults; i += 1) {
    if (regex.test(lines[i])) matches.push({ path: entry.path, line: i + 1, text: lines[i] });
  }
}
parentPort.postMessage({ matches });
