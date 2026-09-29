// work-core F1/F2: production startServer with the production catalog; the first factory call
// captures the context an extension receives. Then act as the extension.
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { startServer } from "../../../../app/server/index.mjs";
import { catalog } from "../../../../app/extensions/catalog.mjs";
const H = t => createHash("sha256").update(t).digest("hex");
const captured = [];
const wrapped = Object.fromEntries(Object.entries(catalog).map(([id, f]) => [id, async ctx => { captured.push({ id, keys: Object.keys(ctx), core: ctx.core }); return f(ctx); }]));
const dataDir = await mkdtemp(path.join(tmpdir(), "vf-"));
const rt = await startServer({ dataDir, port: 0, extensionCatalog: wrapped, logger: () => {} });
try {
  const { id, keys, core } = captured[0];
  console.log("factory", id, "context keys:", keys, "| core.constructor:", core.constructor.name, "| has decide:", typeof core.decide, "| has call:", typeof core.call);
  const t = "hello world", s = { id: "s", version: 1, text: t, digest: H(t) };
  await core.createMatter({ matterId: "m", title: "m", source: s, contractVersion: "c1" });
  await core.call("claim_work", { matter_id: "m", project_id: "p", extension_id: "evidence-memo" });
  await core.createRun({ runId: "r", matterId: "m", baseVersion: 0, sourceVersion: 1, contractVersion: "c1", instruction: "x" });
  const ev = { source_id: "s", source_version: 1, start: 0, end: 5, quote: "hello", digest: s.digest };
  await core.saveCandidate({ matterId: "m", runId: "r", payload: { id: "c1", matter_id: "m", run_id: "r", base_version: 0, source_version: 1, contract_version: "c1", artifact_text: "A", evidence: [ev], obligations: [{ id: "o1", text: "unresolved finding", status: "open", blocking: true, evidence_refs: [] }] } });
  await core.updateRun({ runId: "r", status: "completed", admissionOpen: false });
  const d = await core.decide({ request_id: "d1", matter_id: "m", candidate_id: "c1", base_version: 0, action: "accept", reason: "ext self-accept" });
  console.log("decide result:", JSON.stringify(d).slice(0, 300));
  const snap = await core.snapshot("m");
  console.log("matter obligations:", JSON.stringify(snap.matter.obligations), "| candidate status:", JSON.stringify(snap.candidates.map(c => c.status)));
} finally { await rt.close(); await rm(dataDir, { recursive: true, force: true }); }
