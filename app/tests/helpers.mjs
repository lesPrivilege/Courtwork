import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { startServer } from "../server/index.mjs";
import { FAKE_CREDENTIAL_KEY } from "../runtime/pi-session-runtime.mjs";

const TERMINAL = new Set(["completed", "failed", "cancelled", "unknown"]);

export async function boot({ budget, compaction, fakeResponder, configureFakeCredential = true, logger } = {}) {
  const dataDir = await mkdtemp(path.join(tmpdir(), "se-c1-test-"));
  const logs = [];
  const runtime = await startServer({ dataDir, port: 0, budget, compaction, fakeResponder, logger: logger ?? ((line) => logs.push(line)) });
  const headers = { "content-type": "application/json", "x-work-token": runtime.token };

  async function api(method, p, bodyObj) {
    const res = await fetch(runtime.url + "/api/v5" + p, {
      method,
      headers,
      body: bodyObj !== undefined ? JSON.stringify(bodyObj) : undefined,
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : null;
    return { status: res.status, json };
  }

  if (configureFakeCredential) {
    await api("PUT", "/provider-credential", { provider: "fake-openai-loopback", apiKey: FAKE_CREDENTIAL_KEY });
  }

  const proj = await api("POST", "/projects", { name: "test-project" });
  const projectId = proj.json.project.id;

  async function createSession(overrides = {}) {
    const res = await api("POST", "/sessions", { projectId, title: "test-session", ...overrides });
    return res.json.session;
  }

  async function pollRun(runId, { timeoutMs = 5000, until = (status) => TERMINAL.has(status) } = {}) {
    const start = Date.now();
    let run = (await api("GET", `/runs/${runId}`)).json.run;
    while (!until(run.status)) {
      if (Date.now() - start > timeoutMs) throw new Error(`pollRun timed out waiting past status ${run.status}`);
      await new Promise((resolve) => setTimeout(resolve, 25));
      run = (await api("GET", `/runs/${runId}`)).json.run;
    }
    return run;
  }

  function scriptInput(calls) {
    return `/fixture script ${JSON.stringify(calls)}`;
  }

  return { dataDir, runtime, api, projectId, createSession, pollRun, scriptInput, logs };
}

export { TERMINAL };

/**
 * Run a real server in a child process against `dataDir` so a test can kill
 * it hard. The child gets the SAME startServer, service, store, tool registry
 * and permission policy as production; only the provider (loopback fake), the
 * clock (short real budgets) and the crash point (SE_TEST_CRASH_POINT, armed
 * only with SE_TEST_MODE=1) are substituted.
 *
 * `body` is module source evaluated with `dataDir`, `runtime`, `api`, `emit`
 * and `waitRun` already in scope. `emit(value)` prints one `WORKER <json>`
 * line the parent can await with `waitForLine`.
 */
export function spawnWorker({ dataDir, body, env = {} }) {
  const appRoot = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
  const source = `
    import { startServer } from ${JSON.stringify(path.join(appRoot, "server/index.mjs"))};
    import { FAKE_CREDENTIAL_KEY } from ${JSON.stringify(path.join(appRoot, "runtime/pi-session-runtime.mjs"))};
    const dataDir = ${JSON.stringify(dataDir)};
    const runtime = await startServer({ dataDir, port: 0, logger: (line) => console.log("LOG " + line) });
    const headers = { "content-type": "application/json", "x-work-token": runtime.token };
    async function api(method, p, bodyObj) {
      const res = await fetch(runtime.url + "/api/v5" + p, { method, headers, body: bodyObj !== undefined ? JSON.stringify(bodyObj) : undefined });
      const t = await res.text();
      return { status: res.status, json: t ? JSON.parse(t) : null };
    }
    function emit(value) { console.log("WORKER " + JSON.stringify(value)); }
    async function waitRun(runId, predicate, timeoutMs = 15000) {
      const start = Date.now();
      let run = (await api("GET", "/runs/" + runId)).json.run;
      while (!predicate(run)) {
        if (Date.now() - start > timeoutMs) throw new Error("waitRun timed out at " + run.status);
        await new Promise((r) => setTimeout(r, 25));
        run = (await api("GET", "/runs/" + runId)).json.run;
      }
      return run;
    }
    ${body}
  `;
  const child = spawn(process.execPath, ["--input-type=module", "-e", source], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, ...env },
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

  return {
    child,
    get stdout() { return stdout; },
    get stderr() { return stderr; },
    /** Wait for a `WORKER <json>` line whose payload satisfies `match`. */
    async waitForLine(match = () => true, timeoutMs = 20000) {
      const start = Date.now();
      for (;;) {
        for (const line of stdout.split("\n")) {
          if (!line.startsWith("WORKER ")) continue;
          const value = JSON.parse(line.slice(7));
          if (match(value)) return value;
        }
        if (child.exitCode !== null || child.signalCode !== null) return null;
        if (Date.now() - start > timeoutMs) throw new Error(`worker line timed out; stdout=${stdout} stderr=${stderr}`);
        await new Promise((r) => setTimeout(r, 25));
      }
    },
    /** Wait for the child to be gone, returning how it died. */
    async waitForExit(timeoutMs = 20000) {
      if (child.exitCode !== null || child.signalCode !== null) return { code: child.exitCode, signal: child.signalCode };
      return Promise.race([
        new Promise((resolve) => child.once("exit", (code, signal) => resolve({ code, signal }))),
        new Promise((_, reject) => setTimeout(() => reject(new Error(`worker did not exit; stdout=${stdout} stderr=${stderr}`)), timeoutMs)),
      ]);
    },
    async kill(signal = "SIGKILL") {
      if (child.exitCode !== null || child.signalCode !== null) return;
      child.kill(signal);
      await new Promise((resolve) => child.once("exit", resolve));
    },
  };
}

/** Open a second server on a data directory a killed worker left behind. */
export async function reopen(dataDir, options = {}) {
  const logs = [];
  const runtime = await startServer({ dataDir, port: 0, logger: (line) => logs.push(line), ...options });
  const headers = { "content-type": "application/json", "x-work-token": runtime.token };
  async function api(method, p, bodyObj) {
    const res = await fetch(runtime.url + "/api/v5" + p, { method, headers, body: bodyObj !== undefined ? JSON.stringify(bodyObj) : undefined });
    const text = await res.text();
    return { status: res.status, json: text ? JSON.parse(text) : null };
  }
  return { runtime, api, logs };
}
