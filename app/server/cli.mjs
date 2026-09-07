import path from "node:path";
import { parseArgs } from "node:util";

const HELP = `Usage: npm start -- [options]

  --data-dir PATH       Persistent data directory (or SE_RUNTIME_DATA_DIR; default ./data)
  --port NUMBER         Loopback HTTP port (or PORT; default 8787; 0 chooses a free port)
  --deadline-ms NUMBER  Execution time per Run, excluding human wait (default 600000)
  --max-turns NUMBER    Ordinary agent turns per Run (default 40)
  --compaction-limit N  Native compactions per Run (default 4)
  --help               Show this help

Credentials are configured through the Web UI/API, never through these flags.
SIGINT/SIGTERM stops admission, settles Runs, and releases the data directory lock.
`;

function integer(value, label, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < min || Number(value) > max) {
    throw new Error(`${label} must be an integer between ${min} and ${max}`);
  }
  return Number(value);
}

export async function runCli(startServer) {
  let runtime;
  try {
    const { values } = parseArgs({ options: {
      "data-dir": { type: "string" }, port: { type: "string" },
      "deadline-ms": { type: "string" }, "max-turns": { type: "string" },
      "compaction-limit": { type: "string" }, help: { type: "boolean" },
    } });
    if (values.help) { console.log(HELP); return; }
    const budget = {};
    if (values["deadline-ms"] !== undefined) budget.deadlineMs = integer(values["deadline-ms"], "deadline-ms");
    if (values["max-turns"] !== undefined) budget.maxTurns = integer(values["max-turns"], "max-turns");
    const compaction = {};
    if (values["compaction-limit"] !== undefined) compaction.maxCompactions = integer(values["compaction-limit"], "compaction-limit", { max: 100 });
    runtime = await startServer({
      dataDir: path.resolve(values["data-dir"] ?? process.env.SE_RUNTIME_DATA_DIR ?? "data"),
      port: integer(values.port ?? process.env.PORT ?? "8787", "port", { min: 0, max: 65535 }),
      budget, compaction,
    });
    console.log(runtime.url);
    let stopping;
    const stop = () => {
      stopping ??= runtime.close().catch(() => {
        console.error("Runtime shutdown did not complete cleanly; reopen to reconcile interrupted work.");
        process.exitCode = 1;
      }).finally(() => {
        process.removeListener("SIGINT", stop);
        process.removeListener("SIGTERM", stop);
      });
    };
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);
  } catch (error) {
    if (runtime) await runtime.close().catch(() => {});
    // CLI configuration errors have no credentials; startup errors may come
    // from external components, so report a stable code without raw details.
    console.error(runtime ? "Runtime stopped after a startup error." : `Runtime could not start (${error.code ?? error.name ?? "error"}). Check options, dependencies and data-directory ownership.`);
    process.exitCode = 1;
  }
}
