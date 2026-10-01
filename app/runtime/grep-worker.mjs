import { parentPort, workerData } from "node:worker_threads";

// Matches the model's regular expression against file text the Host supplies
// in batches. It opens no file: the fixed filesystem helper establishes which
// files are read. No code from the model is evaluated; only its regular
// expression is matched, here, in a thread the Host can terminate.
const { pattern, maxResults } = workerData;
const regex = new RegExp(pattern);
const matches = [];
parentPort.on("message", ({ files }) => {
  for (const file of files) {
    if (matches.length >= maxResults) break;
    const lines = Buffer.from(file.dataBase64, "base64").toString("utf8").split("\n");
    for (let i = 0; i < lines.length && matches.length < maxResults; i += 1) {
      if (regex.test(lines[i])) matches.push({ path: file.path, line: i + 1, text: lines[i] });
    }
  }
  parentPort.postMessage({ matches });
});
