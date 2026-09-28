#!/usr/bin/env node
// N07-R1 · the Chat page's object commands in a real headless Chrome against a
// disposable Host (fake provider, fresh data): Shift+F10 on a Continue row →
// Rename / Delete through the real dialogs, then what the page shows and where
// focus lands. Author evidence, not visual or accessibility acceptance.
//
//   node app/scripts/chat-page-commands-browser.mjs [--chrome <path>]
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "../server/index.mjs";

const DEFAULT_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runChatPageCommandsBrowser({ chromePath = DEFAULT_CHROME } = {}) {
  const work = await mkdtemp(path.join(tmpdir(), "cw-chat-page-commands-"));
  const host = await startServer({ dataDir: path.join(work, "data"), port: 0, logger: () => {} });
  const api = async (method, route, body) => {
    const response = await fetch(`${host.url}/api/v5${route}`, { method, headers: { "content-type": "application/json", "x-work-token": host.token }, body: body === undefined ? undefined : JSON.stringify(body) });
    return response.json();
  };
  const project = (await api("POST", "/projects", { name: "UX batch" })).project;
  const titles = ["UX batch — Keep first", "UX batch — Delete target", "UX batch — Rename target", "UX batch — Keep last"];
  for (const title of titles) { await api("POST", "/sessions", { projectId: project.id, title }); await sleep(15); }
  const chrome = spawn(chromePath, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${path.join(work, "profile")}`, "--no-first-run", "--no-default-browser-check", "--window-size=1440,900", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  const record = { steps: [] };
  try {
    const browserWs = await new Promise((resolve, reject) => {
      let buffer = "";
      chrome.stderr.on("data", (data) => { buffer += data; const match = /DevTools listening on (ws:\S+)/.exec(buffer); if (match) resolve(match[1]); });
      chrome.on("exit", () => reject(new Error("Chrome exited before DevTools was ready")));
    });
    const target = await (await fetch(`http://${new URL(browserWs).host}/json/new?about:blank`, { method: "PUT" })).json();
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let nextId = 1;
    const pending = new Map();
    ws.onmessage = (message) => { const data = JSON.parse(message.data); if (data.id && pending.has(data.id)) { pending.get(data.id)(data); pending.delete(data.id); } };
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, (data) => (data.error ? reject(new Error(`${method}: ${data.error.message}`)) : resolve(data.result)));
      ws.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async (expression) => {
      const result = await send("Runtime.evaluate", { expression: `(async () => (${expression}))()`, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    };
    const waitFor = async (expression, label, timeout = 10_000) => {
      const end = Date.now() + timeout;
      while (Date.now() < end) { if (await evaluate(expression)) return; await sleep(80); }
      throw new Error(`timed out waiting for ${label}`);
    };
    const shiftF10 = async () => {
      for (const type of ["keyDown", "keyUp"])
        await send("Input.dispatchKeyEvent", { type, key: "F10", code: "F10", modifiers: 8, windowsVirtualKeyCode: 121, nativeVirtualKeyCode: 121 });
      await sleep(150);
    };
    await send("Page.enable");
    await send("Page.navigate", { url: `${host.url}/` });
    await waitFor(`Boolean(document.getElementById('chat-button')) && document.querySelectorAll('#recent-list [data-recent-id]').length >= ${titles.length}`, "the app and its Recent chats");
    await evaluate(`(document.getElementById('chat-button').click(), true)`);
    await waitFor(`document.querySelectorAll('#chat-page [data-chat-session]').length >= ${titles.length}`, "the Chat page rows");
    const rowFor = (title) => `[...document.querySelectorAll('#chat-page [data-chat-session]')].find(n => n.querySelector('.chat-row-title')?.textContent === ${JSON.stringify(title)})`;
    const read = () => evaluate(`({
      page: [...document.querySelectorAll('#chat-page [data-chat-session]')].map(n => n.querySelector('.chat-row-title')?.textContent),
      recent: [...document.querySelectorAll('#recent-list [data-recent-id]')].map(n => n.textContent.trim()),
      focus: document.activeElement?.closest?.('[data-chat-session]')?.querySelector('.chat-row-title')?.textContent ?? (document.activeElement?.getAttribute('data-chat-focus') ? 'page title' : document.activeElement?.tagName),
      focusConnected: document.activeElement ? document.activeElement.isConnected && document.activeElement !== document.body : false,
      pageOpen: !document.getElementById('chat-page').hidden,
    })`);
    const command = async (title, commandId) => {
      await evaluate(`(${rowFor(title)}.focus(), true)`);
      await shiftF10();
      await waitFor(`document.getElementById('object-menu').matches(':popover-open')`, "the object menu");
      await evaluate(`(document.querySelector('#object-menu [data-command="${commandId}"]').click(), true)`);
    };
    const step = async (name) => { const value = await read(); record.steps.push({ name, ...value }); return value; };

    try {
    await step("opened");
    /* N07-R2 · the rows' More target under a fine and a coarse pointer, on the
       Chat page and the sidebar (the same `.session-row` primitive). */
    const moreTargets = () => evaluate(`(() => {
      const box = (n) => { if (!n) return null; const r = n.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), opacity: getComputedStyle(n).opacity }; };
      return {
        coarse: matchMedia('(pointer: coarse)').matches,
        chatPage: [...document.querySelectorAll('#chat-page .session-row > .object-more')].map(box),
        sidebar: [...document.querySelectorAll('#recent-list .session-row > .object-more')].slice(0, 2).map(box),
        chatRowHeight: box(document.querySelector('#chat-page .chat-row'))?.h ?? null,
      };
    })()`);
    record.targets = { fine: await moreTargets() };
    await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
    await sleep(200);
    record.targets.coarse = await moreTargets();
    await send("Emulation.setTouchEmulationEnabled", { enabled: false });
    await sleep(200);
    await command(titles[2], "chat.rename");
    await waitFor(`document.getElementById('rename-dialog').open`, "the rename dialog");
    await evaluate(`(() => { const input = document.getElementById('rename-title-input'); input.value = 'UX batch — Renamed by page'; document.querySelector('#rename-form button[value="default"]').click(); return true; })()`);
    await waitFor(`!document.getElementById('rename-dialog').open`, "the rename to finish");
    await sleep(200);
    await step("renamed");

    await command(titles[1], "chat.delete");
    await waitFor(`document.getElementById('delete-dialog').open`, "the delete dialog");
    await evaluate(`(document.querySelector('#delete-form button[value="default"]').click(), true)`);
    await waitFor(`!document.getElementById('delete-dialog').open`, "the delete to finish");
    await sleep(200);
    await step("deleted-middle");

    const remaining = (await read()).page;
    await command(remaining.at(-1), "chat.delete");
    await waitFor(`document.getElementById('delete-dialog').open`, "the delete dialog");
    await evaluate(`(document.querySelector('#delete-form button[value="default"]').click(), true)`);
    await waitFor(`!document.getElementById('delete-dialog').open`, "the delete to finish");
    await sleep(200);
    await step("deleted-last");

    // The open chat deleted from the Chat page: the page stays; Home is underneath.
    await evaluate(`([...document.querySelectorAll('#recent-list [data-recent-id]')].find(n => n.textContent.trim() === 'UX batch — Keep last').click(), true)`);
    await waitFor(`document.getElementById('chat-page').hidden`, "the chat to open");
    await sleep(300);
    await evaluate(`(document.getElementById('chat-button').click(), true)`);
    await waitFor(`!document.getElementById('chat-page').hidden && Boolean(document.querySelector('#chat-page [data-chat-action="return"]'))`, "the Chat page over the open chat");
    await command("UX batch — Keep last", "chat.delete");
    await waitFor(`document.getElementById('delete-dialog').open`, "the delete dialog");
    await evaluate(`(document.querySelector('#delete-form button[value="default"]').click(), true)`);
    await waitFor(`!document.getElementById('delete-dialog').open`, "the delete to finish");
    await sleep(300);
    const afterOpen = await step("deleted-open-chat");
    record.returnControlAfterOpenDelete = await evaluate(`Boolean(document.querySelector('#chat-page [data-chat-action="return"]'))`);

    // The last row: focus goes to the page title; the empty state shows.
    await command(afterOpen.page[0], "chat.delete");
    await waitFor(`document.getElementById('delete-dialog').open`, "the delete dialog");
    await evaluate(`(document.querySelector('#delete-form button[value="default"]').click(), true)`);
    await waitFor(`!document.getElementById('delete-dialog').open`, "the delete to finish");
    await sleep(300);
    await step("deleted-final-row");
    record.emptyState = await evaluate(`document.querySelector('#chat-page .chat-empty')?.textContent ?? null`);
    } catch (error) {
      // A stale page can make a later step impossible; keep what was observed.
      record.error = error.message;
    }
    return record;
  } finally {
    chrome.kill();
    await host.close();
    await rm(work, { recursive: true, force: true }).catch(() => {});
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const at = process.argv.indexOf("--chrome");
  console.log(JSON.stringify(await runChatPageCommandsBrowser(at > 0 ? { chromePath: process.argv[at + 1] } : {}), null, 2));
}
