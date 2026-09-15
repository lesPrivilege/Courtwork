import { parentPort, workerData } from "node:worker_threads";

const MAX_RESULTS = 200;
const MAX_LINE_CHARS = 500;
const matches = [];
let truncated = false;
let regex;
try { regex = new RegExp(workerData.pattern); }
catch { parentPort.postMessage({ error: "regular-expression pattern is invalid" }); }

if (regex) {
  for (const file of workerData.files) {
    const text = Buffer.from(file.dataBase64, "base64").toString("utf8");
    const lines = text.split("\n");
    for (let index = 0; index < lines.length; index += 1) {
      if (!regex.test(lines[index])) continue;
      if (matches.length >= MAX_RESULTS) { truncated = true; break; }
      matches.push({ path: file.path, line: index + 1, text: lines[index].slice(0, MAX_LINE_CHARS) });
    }
    if (truncated) break;
  }
  parentPort.postMessage({ matches, truncated });
}
