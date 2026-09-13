import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const appDir = fileURLToPath(new URL("..", import.meta.url));
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const checks = [
  {
    name: "bounded synthetic test suite",
    command: npmCommand,
    args: ["test"],
  },
  {
    name: "local deterministic runtime smoke",
    command: npmCommand,
    args: ["run", "smoke"],
  },
  {
    name: "repository documentation links",
    command: process.execPath,
    args: ["../tools/check-doc-links.mjs"],
  },
];

for (const check of checks) {
  console.log(`\n==> ${check.name}`);
  const result = spawnSync(check.command, check.args, {
    cwd: appDir,
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) throw result.error;
  if (result.signal) {
    console.error(`${check.name} stopped by ${result.signal}`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
