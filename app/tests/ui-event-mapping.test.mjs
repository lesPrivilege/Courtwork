import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(here, "../web/app.mjs"), "utf8");

assert.match(source, /raw === "user\.message"\) return "message\/user"/);
assert.match(source, /raw === "assistant\.message"\) return "assistant\/final"/);
assert.match(source, /type === "message\/user"/);
assert.match(source, /type === "assistant\/final"/);
