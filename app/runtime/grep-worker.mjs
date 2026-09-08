import { parentPort, workerData } from "node:worker_threads";
import { open, opendir, lstat } from "node:fs/promises";
import path from "node:path";

// Host resolves the search root; traversal, reads, and regex all share the worker deadline.
// No code from the model is evaluated; only its regular expression is matched.
const { workspaceReal, searchPath, pattern, maxReadBytes, maxResults } = workerData;
const regex = new RegExp(pattern);
const matches = [];
async function* files(full) {
  const info = await lstat(full).catch(() => null);
  if (!info || info.isSymbolicLink()) return;
  if (info.isFile()) { yield { full, bytes: info.size }; return; }
  if (!info.isDirectory()) return;
  const directory = await opendir(full);
  for await (const entry of directory) {
    if (entry.isSymbolicLink()) continue;
    yield* files(path.join(full, entry.name));
  }
}
for await (const entry of files(searchPath)) {
  if (matches.length >= maxResults) break;
  if (entry.bytes > maxReadBytes) continue;
  // Read at most the host ceiling plus one byte even if a file grows after stat.
  const handle = await open(entry.full, "r").catch(() => null);
  if (!handle) continue;
  let bytes;
  try {
    const buffer = Buffer.alloc(maxReadBytes + 1);
    let size = 0;
    while (size < buffer.length) {
      const read = await handle.read(buffer, size, buffer.length - size, null);
      if (!read.bytesRead) break;
      size += read.bytesRead;
    }
    bytes = buffer.subarray(0, size);
  } finally { await handle.close(); }
  if (bytes.length > maxReadBytes || bytes.subarray(0, 8000).includes(0)) continue;
  const lines = bytes.toString("utf8").split("\n");
  for (let i = 0; i < lines.length && matches.length < maxResults; i += 1) {
    if (regex.test(lines[i])) matches.push({ path: path.relative(workspaceReal, entry.full).split(path.sep).join("/"), line: i + 1, text: lines[i] });
  }
}
parentPort.postMessage({ matches });
