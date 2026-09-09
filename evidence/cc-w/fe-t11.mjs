/* FE-03 · FE-T11（delivery-wk10b-2 §6.3，FN-12 / 18 / 25）· 换源与旧记录。
 *
 * 全部经产品自己的 /api/v5 走，路径与 UI 用的是同一条（`window.__V5_UI__.request`
 * 在浏览器里读的也是它）。本单没有触碰工作面与 work-core，这一条是回归：
 * 一次换源之后，**旧记录仍然说它当时说过的话**。
 *
 *   T11-1  换源后旧候选的四条状态词逐个不变；当前 sources[0].text 已无该条款
 *   T11-2  旧候选的 term-duration 锚点与引文不变
 *   T11-3  按冻结 revision 读历史来源，字节里仍含该条款
 *   T11-4  修订之后重放原决定的 request_id 得到同一条 Decision，不新增不撤销
 *   T11-5  对旧 base 的新决定被拒（候选已关闭 / 版本冲突），不静默改写
 *   T11-6  producer 卸载后历史来源仍可读
 */
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const BASE = process.env.APP_URL ?? "http://127.0.0.1:8901";
const seed = JSON.parse(await readFile(new URL("./work-seed.json", import.meta.url), "utf8"));
const sessionId = seed.sessions.complete;
const token = (await (await fetch(`${BASE}/api/v5/bootstrap`)).json()).sessionToken;
const results = [];
const record = (name, pass, actual) => {
  results.push({ name, pass, actual });
  console.log(pass ? "PASS" : "FAIL", name, JSON.stringify(actual).slice(0, 600));
};
async function api(method, path, body) {
  const res = await fetch(`${BASE}/api/v5${path}`, {
    method,
    headers: { "content-type": "application/json", "x-work-token": token },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}
const surface = async () => (await api("GET", `/sessions/${sessionId}/surface`)).json;

try {
  const before = await surface();
  const candidate = before.projection.candidates[0];
  const statusesBefore = candidate.domain.findings.map((f) => [f.ruleId, f.status]);
  const anchorBefore = candidate.domain.findings.find((f) => f.ruleId === "term-duration");
  const old = before.projection.sources[0];

  // 先记录一条决定，它是"旧记录"的那一半。
  const decide = await api("POST", `/sessions/${sessionId}/actions`, {
    extensionId: "inbound-nda",
    generation: before.extension.generation,
    action: "decide",
    payload: { request_id: "fe-t11-decision", candidate_id: candidate.id, base_version: 0, action: "accept", reason: "Synthetic human review" },
  });
  if (decide.status !== 200) throw new Error(`decide ${decide.status} ${JSON.stringify(decide.json)}`);

  // 换源：删掉 `4. Term.` 条款，revision 2。
  const text = old.text.split("\n").filter((line) => !line.startsWith("4. Term.")).join("\n");
  const replaced = await api("POST", `/sessions/${sessionId}/actions`, {
    extensionId: "inbound-nda",
    generation: before.extension.generation,
    action: "replace_sources",
    payload: { revision: 2, sources: [{ ...old, version: 2, text, digest: createHash("sha256").update(text).digest("hex") }] },
  });
  if (replaced.status !== 200) throw new Error(`replace_sources ${replaced.status} ${JSON.stringify(replaced.json)}`);

  const after = await surface();
  const stale = after.projection.candidates.find((c) => c.id === candidate.id);
  record("T11-1 · 换源后旧候选的四条状态词逐个不变；当前来源已无该条款",
    JSON.stringify(stale.domain.findings.map((f) => [f.ruleId, f.status])) === JSON.stringify(statusesBefore) &&
      !after.projection.sources[0].text.includes("4. Term.") &&
      after.projection.sources[0].version === 2,
    { before: statusesBefore, after: stale.domain.findings.map((f) => [f.ruleId, f.status]),
      currentHasClause: after.projection.sources[0].text.includes("4. Term.") });

  const anchorAfter = stale.domain.findings.find((f) => f.ruleId === "term-duration");
  /* 锚点是 evidence 里的 `<source_id>:<source_version> [start, end]` 加那段引文。
   * 换源之后它必须逐字不变，而且它指的 revision 必须还是 1 —— 一条被冻结的引用
   * 不会因为当前来源换了就改指现在的字节。 */
  const anchorOf = (finding) => finding.evidence.map((e) =>
    `${e.source_id}:${e.source_version} [${e.start}, ${e.end}] ${e.quote}`);
  record("T11-2 · 旧候选的 term-duration 锚点与引文不变",
    JSON.stringify(anchorOf(anchorAfter)) === JSON.stringify(anchorOf(anchorBefore)) &&
      anchorOf(anchorAfter)[0].includes(":1 [672, 765]") &&
      anchorOf(anchorAfter)[0].includes("4. Term.") &&
      stale.source_version === 1,
    { anchor: anchorOf(anchorAfter), unchanged: JSON.stringify(anchorOf(anchorAfter)) === JSON.stringify(anchorOf(anchorBefore)), sourceVersion: stale.source_version });

  const query = new URLSearchParams({ kind: "source", candidateId: candidate.id, sourceId: old.id, version: "1" });
  const historical = await api("GET", `/sessions/${sessionId}/work-query?${query}`);
  record("T11-3 · 按冻结 revision 读历史来源，字节里仍含该条款；当前来源不含",
    historical.status === 200 && historical.json.source.text.includes("4. Term.") &&
      historical.json.source.text === old.text &&
      !after.projection.sources[0].text.includes("4. Term."),
    { bytes: historical.json.source.text.length, hasClause: historical.json.source.text.includes("4. Term.") });

  const replay = await api("POST", `/sessions/${sessionId}/actions`, {
    extensionId: "inbound-nda",
    generation: after.extension.generation,
    action: "decide",
    payload: { request_id: "fe-t11-decision", candidate_id: candidate.id, base_version: 0, action: "accept", reason: "Synthetic human review" },
  });
  const decisionsAfter = (await surface()).projection.decisions;
  record("T11-4 · 重放原 request_id 得到同一条 Decision，不新增不撤销",
    JSON.stringify(replay.json.result ?? replay.json) === JSON.stringify(decide.json.result ?? decide.json) &&
      decisionsAfter.length === 1,
    { replayStatus: replay.status, decisions: decisionsAfter.length, same: JSON.stringify(replay.json.result) === JSON.stringify(decide.json.result) });

  const fresh = await api("POST", `/sessions/${sessionId}/actions`, {
    extensionId: "inbound-nda",
    generation: after.extension.generation,
    action: "decide",
    payload: { request_id: "fe-t11-new-decision", candidate_id: candidate.id, base_version: 0, action: "reject", reason: "Synthetic second decision on a closed base" },
  });
  record("T11-5 · 对旧 base 的新决定被拒，不静默改写",
    fresh.status !== 200 && (await surface()).projection.decisions.length === 1,
    { status: fresh.status, error: fresh.json?.error ?? null });

  const unload = await api("POST", "/extensions/inbound-nda/lifecycle", { action: "unload" });
  const afterUnload = await api("GET", `/sessions/${sessionId}/work-query?${query}`);
  record("T11-6 · producer 卸载后历史来源仍可读",
    unload.status === 200 && afterUnload.status === 200 &&
      afterUnload.json.source.text === old.text,
    { unload: unload.status, read: afterUnload.status, bytes: afterUnload.json?.source?.text?.length ?? null });
  await api("POST", "/extensions/inbound-nda/lifecycle", { action: "load" });
} catch (error) {
  results.push({ name: "exception", pass: false, error: error.stack });
  process.exitCode = 1;
} finally {
  await writeFile(new URL("./fe-t11.json", import.meta.url), JSON.stringify(results, null, 2));
  console.log(`${results.filter((r) => r.pass).length} / ${results.length}`);
}
