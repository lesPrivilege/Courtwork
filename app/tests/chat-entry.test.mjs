/* CA-01 · the Chat seat beside Attention and Spark. app.mjs has no DOM harness,
 * so these pin the source-visible contract: the button exists in the same
 * navigation group, is a plain button (not a tab), is wired to openChat, and
 * openChat reuses existing routes without creating projects or sessions. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
const here = new URL(".", import.meta.url).pathname;
const html = readFileSync(`${here}../web/index.html`, "utf8");
const app = readFileSync(`${here}../web/app.mjs`, "utf8");
const fn = (source, name) => { const start = source.indexOf(`async function ${name}(`); const end = source.indexOf("\nfunction ", start + 1); return source.slice(start, end); };

test("Chat sits in the Home / Attention / Spark group as a plain button", () => {
  const order = [...html.matchAll(/id="(home-button|chat-button|attention-button|spark-button)"/g)].map((m) => m[1]);
  assert.deepEqual(order, ["home-button", "chat-button", "attention-button", "spark-button"]);
  const button = html.match(/<button id="chat-button"[^>]*>/)[0];
  assert.match(button, /class="nav-home quiet-button"/);
  assert.doesNotMatch(button, /role=/, "navigation buttons carry no tab roles");
  assert.doesNotMatch(html.slice(html.indexOf('id="home-button"'), html.indexOf('id="spark-button"')), /role="tab/);
  assert.match(html, /id="new-session-button"/, "New chat stays");
});

test("openChatPage opens the page over the existing session and creates nothing", () => {
  const body = fn(app, "openChatPage");
  assert.ok(body.length > 100);
  assert.match(body, /persistCurrentDraft\(\)/);
  assert.match(body, /chatPage\.open\(/);
  assert.doesNotMatch(body, /startNewSession|openDialog|request\(|createProject|clearActiveSession/);
  assert.match(app, /\$\("chat-button"\)\.addEventListener\("click", \(\) => void openChatPage\(\)\)/);
  assert.match(app, /\$\("chat-button"\)\.setAttribute\(\s*"aria-current"/);
  assert.match(app, /\$\("attention-button"\)\.addEventListener\("click", \(\) => attentionAgent\.open\(\)\)/, "Attention keeps its real entry");
  assert.match(app, /\$\("spark-button"\)\.addEventListener/, "Spark keeps its real entry");
});
