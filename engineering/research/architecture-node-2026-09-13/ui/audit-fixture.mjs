import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { startServer } from "../../../../app/server/index.mjs";
import { FAKE_CREDENTIAL_KEY } from "../../../../app/runtime/pi-session-runtime.mjs";

// Isolated, non-production browser-audit fixture. It uses only the app's
// loopback fake provider and synthetic records; no user data or paid service.
const dataDir = await mkdtemp(path.join(tmpdir(), "courtwork-ui-audit-"));
let candidateSubmission = null;
let candidateSubmitted = false;
const candidatePrompt = "Prepare a synthetic review candidate from the current source.";
const runtime = await startServer({
  dataDir,
  host: "127.0.0.1",
  port: 0,
  fakeResponder: ({ mode }) => {
    if (mode !== candidatePrompt || !candidateSubmission) return null;
    if (!candidateSubmitted) {
      candidateSubmitted = true;
      return { kind: "tool", toolCallId: "audit-candidate", name: "se_submit_candidate", arguments: candidateSubmission };
    }
    return { kind: "text", text: "Synthetic review candidate prepared." };
  },
  logger: line => console.log(`[host] ${line}`),
});
const headers = { "content-type": "application/json", "x-work-token": runtime.token };

async function api(method, route, body) {
  const response = await fetch(`${runtime.url}/api/v5${route}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${method} ${route} failed (${response.status}): ${JSON.stringify(json)}`);
  return json;
}

try {
  await api("PUT", "/provider-credential", { connectionId: "catalog-fake-openai-loopback", apiKey: FAKE_CREDENTIAL_KEY });
  const { project } = await api("POST", "/projects", { name: "Synthetic UI Audit" });
  const { session } = await api("POST", "/sessions", { projectId: project.id, title: "Cedar review — synthetic" });
  await api("POST", `/sessions/${session.id}/materials`, {
    name: "brief.md",
    text: "# Synthetic brief\n\nThis text was created only to inspect the local UI. It contains no user data.\n",
    commandId: "audit-material-brief",
    expectedRevision: 0,
  });
  await api("POST", "/extensions/evidence-memo/lifecycle", { action: "load" });
  await api("POST", `/sessions/${session.id}/extension`, {
    extensionId: "evidence-memo",
    input: {
      title: "Cedar review — synthetic",
      sourceText: "Synthetic review source. The audit fixture contains no personal or customer data.",
    },
  });
  const { projection } = await api("GET", `/sessions/${session.id}/surface`);
  const source = projection.sources[0];
  const evidence = [{
    source_id: source.id,
    source_version: source.version,
    start: 0,
    end: source.text.length,
    quote: source.text,
    digest: source.digest,
  }];
  candidateSubmission = {
    artifact_text: "Synthetic candidate ready for human review.",
    evidence,
    obligations: [],
  };
  const { run } = await api("POST", `/sessions/${session.id}/runs`, {
    commandId: "audit-submit-candidate",
    input: candidatePrompt,
  });
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const result = (await api("GET", `/runs/${run.id}`)).run;
    if (["completed", "failed", "unknown", "cancelled"].includes(result.status)) {
      if (result.status !== "completed") throw new Error(`Fixture run ended ${result.status}`);
      break;
    }
    if (attempt === 299) throw new Error("Fixture run did not finish within 15 seconds");
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  await api("POST", "/attention/conversations", { conversationId: randomUUID() });
  console.log(JSON.stringify({
    url: runtime.url,
    dataDir,
    projectId: project.id,
    reviewSessionId: session.id,
    candidateId: (await api("GET", `/sessions/${session.id}/surface`)).projection.candidates[0]?.id ?? null,
    syntheticOnly: true,
    provider: "fake-openai-loopback",
  }));
} catch (error) {
  console.error(error.message);
  await runtime.close();
  process.exitCode = 1;
}

if (process.exitCode !== 1) {
  const stop = async () => {
    await runtime.close();
    process.exit(0);
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}
