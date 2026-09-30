/* UX-11 audit slice S4 (engineering/research/ux-interaction-topology-20260930/rulings.md):
 * ambient attention signals. A chat waiting on the person carries a mark with
 * one word; the Attention entry carries the count of items that need the
 * person in the working project; both come from owner facts Home already
 * reads. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { withTinyDom } from "./tiny-dom.mjs";

const app = readFileSync(new URL("../web/app.mjs", import.meta.url), "utf8");
const pending = (sessionId, kind, questionId = `${sessionId}-${kind}`) => ({ sessionId, kind, questionId, runId: `run-${sessionId}`, createdAt: "2026-09-30T00:00:00Z" });

test("S4 · waiting chats come from actionable questions; each row says what is waited for", async () => {
  await withTinyDom(async () => {
    const { waitingBySession, waitMark, needsYouWords, WAIT_WORD } = await import("../web/shell-signals.mjs");
    const map = waitingBySession([pending("a", "permission"), pending("a", "ask_user"), pending("b", "ask_user"), pending("c", "other")]);
    assert.deepEqual([...map], [["a", "permission"], ["b", "ask_user"]], "the oldest question names the chat's wait; unknown kinds are not marks");
    assert.deepEqual(WAIT_WORD, { permission: "Approval", ask_user: "Answer" });
    const mark = waitMark("permission");
    assert.equal(mark.className, "session-wait");
    assert.equal(mark.querySelector(".tab-activity").className, "tab-activity waiting_user", "the ring of a waiting run, as on a Preview tab");
    assert.match(mark.textContent, /Approval/);
    assert.equal(mark.querySelector(".sr-only").textContent, " · Waiting for your approval", "the sentence is what a screen reader hears");
    assert.equal(waitMark(null), null);
    assert.equal(needsYouWords(1), "1 needs you");
    assert.equal(needsYouWords(3), "3 need you");
    assert.equal(needsYouWords(0), null, "zero shows nothing");
    assert.equal(needsYouWords(null), null, "unknown shows nothing");
  });
});

test("S4 · one reader: all pending pages, the needs-you count of the working project, and no count when it is unknown", async () => {
  await withTinyDom(async () => {
    const { createShellSignals } = await import("../web/shell-signals.mjs");
    const calls = [];
    let scope = "p1", attentionFails = false, changes = 0;
    const request = async (path, init) => {
      calls.push([path, init?.body]);
      if (path.startsWith("/work-summary")) {
        const offset = Number(new URL(path, "http://x").searchParams.get("pendingOffset"));
        return offset === 0
          ? { pendingItems: { items: [pending("a", "permission")], hasMore: true, nextOffset: 100 }, sessionCandidates: { items: [{ sessionId: "a", latestRun: { status: "waiting_user" } }] } }
          : { pendingItems: { items: [pending("b", "ask_user")], hasMore: false }, sessionCandidates: { items: [] } };
      }
      if (attentionFails) throw new Error("offline");
      return { count: init.body.projectId === "p1" ? 2 : 0 };
    };
    const signals = createShellSignals({ request, attentionScope: () => scope, onChange: () => changes++ });
    await signals.refresh();
    assert.equal(signals.waitingKind("a"), "permission");
    assert.equal(signals.waitingKind("b"), "ask_user", "the second page is read too");
    assert.equal(signals.waitingKind("z"), null);
    assert.deepEqual(signals.attention(), { projectId: "p1", count: 2 });
    const query = calls.find(([path]) => path === "/attention/query")[1];
    assert.deepEqual(query, { projectId: "p1", query: { schema_version: 1, kind: "exact", field: "status", value: "needs_you", limit: 1, offset: 0 } });
    assert.equal(changes, 1);

    await signals.refresh();
    assert.equal(changes, 1, "views redraw only when what they show changed");

    attentionFails = true;
    await signals.refresh();
    assert.deepEqual(signals.attention(), { projectId: "p1", count: null }, "a failed read is unknown, not zero");
    assert.equal(changes, 2);

    attentionFails = false;
    scope = "p2";
    const before = calls.length;
    signals.followScope();
    signals.followScope();
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(calls.slice(before).filter(([path]) => path === "/attention/query").length, 1, "a new working project is read once");
    assert.deepEqual(signals.attention(), { projectId: "p2", count: 0 });
  });
});

test("S4 · a failed waiting read keeps the last marks", async () => {
  await withTinyDom(async () => {
    const { createShellSignals } = await import("../web/shell-signals.mjs");
    let fail = false;
    const request = async (path) => {
      if (path.startsWith("/work-summary")) {
        if (fail) throw new Error("offline");
        return { pendingItems: { items: [pending("a", "ask_user")], hasMore: false }, sessionCandidates: { items: [] } };
      }
      return { count: 0 };
    };
    const signals = createShellSignals({ request, attentionScope: () => null, onChange: () => {} });
    await signals.refresh();
    fail = true;
    await signals.refresh();
    assert.equal(signals.waitingKind("a"), "ask_user");
  });
});

test("S4 · wiring: rail rows, the Chat page and the Attention entry read the same signals; the working project is the open chat's, else Home's", () => {
  assert.match(app, /rows\.map\(s=>\[s\.id,s\.title,shellSignals\?\.waitingKind\(s\.id\)\]\)/, "Recent rows redraw when a chat starts or stops waiting");
  assert.equal((app.match(/waitMark\(shellSignals\?\.waitingKind\(session\.id\)\)/g) || []).length, 2, "Recent and project rows carry the mark");
  assert.match(app, /waitingKind: \(id\) => shellSignals\?\.waitingKind\(id\) \?\? null/, "the Chat page rows too");
  assert.match(app, /const chat = state\.view === "session" \? currentSession\(\)\?\.projectId : null;\n  const id = chat \?\? homeProjectId\(\);/);
  assert.match(app, /async function openAttentionWorkspace\(projectId = attentionScope\(\)/, "the item queue opens on the working project");
  assert.match(app, /sparkView\.open\(workingProjectId\(\)\)/);
  assert.match(app, /\$\("attention-button"\)\.addEventListener\("click", \(\) => attentionAgent\.open\(\)\)/, "the rail entry stays the assistant (Astra's Attention rule)");
  assert.match(app, /itemsSummary: \(\) => needsYouWords\(shellSignals\.attention\(\)\.count\)/, "the assistant's way to the items says the same count");
  assert.match(app, /\(question\|permission\)\\\.\(open\|resolved\)/, "a question opened or answered in the open chat re-reads the waiting chats");
});

test("S4 review · the Chat page changes a mark in place: focus and the rows stay", async () => {
  await withTinyDom(async () => {
    const { createChatPage } = await import("../web/chat-page.mjs");
    const container = document.createElement("section");
    const page = createChatPage(container, { onOpenSession() {}, onNewChat() {}, onOpenAttention() {}, onOpenSpark() {} });
    const projects = [{ id: "p1", name: "租约审阅" }];
    const sessions = [{ id: "s1", projectId: "p1", title: "合同红线" }, { id: "s2", projectId: "p1", title: "Lease" }];
    page.open({ projects, sessionsByProject: new Map([["p1", sessions]]), waitingKind: (id) => (id === "s1" ? "permission" : null) });
    const row = (id) => container.querySelectorAll("[data-chat-session]").find((node) => node.getAttribute("data-chat-session") === id);
    const before = row("s1");
    before.focus?.();
    assert.match(before.textContent, /Approval/);
    page.updateWaiting((id) => (id === "s2" ? "ask_user" : null));
    assert.equal(row("s1"), before, "the same row node, so focus is not lost");
    assert.doesNotMatch(row("s1").textContent, /Approval/);
    assert.match(row("s2").textContent, /Answer/);
    assert.equal(row("s2").querySelectorAll(".session-wait").length, 1);
    page.updateWaiting((id) => (id === "s2" ? "ask_user" : null));
    assert.equal(row("s2").querySelectorAll(".session-wait").length, 1, "an unchanged mark is left alone");
  });
});

test("S4 review · an example project is never the scope of the count; leaving the queue or the assistant re-reads", () => {
  assert.match(app, /return workingProjectId\(\) \?\? state\.projects\.find\(\(project\) => !project\.preview\)\?\.id \?\? null;/);
  assert.match(app, /\$\("attention-agent-dialog"\)\.addEventListener\("close", \(\) => void shellSignals\.refresh\(\)\)/);
  assert.match(app, /attentionWorkspace\.deactivate\(\);\n    renderAll\(\);\n    \/\/ S4 · items handled in the queue change the count\.\n    void shellSignals\.refresh\(\);/);
});
