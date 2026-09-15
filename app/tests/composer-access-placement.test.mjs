import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

const root = new URL("../../", import.meta.url).pathname;
const html = readFileSync(`${root}app/web/index.html`, "utf8");
const css = readFileSync(`${root}app/web/styles.css`, "utf8");
const app = readFileSync(`${root}app/web/app.mjs`, "utf8");

test("P1 · actionable access controls live in the left composer context; only Project stays below", () => {
  const contextStart = html.indexOf('<div class="composer-context">');
  const buttonsStart = html.indexOf('<div class="composer-buttons">', contextStart);
  assert.ok(contextStart >= 0 && buttonsStart > contextStart);
  const context = html.slice(contextStart, buttonsStart);
  assert.match(context, /id="home-composer-context"/);
  assert.match(context, /id="home-permission-input"[^>]*class="home-choice-select"[^>]*aria-label="File access for this chat"/);
  assert.match(context, /id="permission-settings-button"[^>]*aria-haspopup="dialog"[^>]*aria-controls="connection-popover"/);
  assert.doesNotMatch(context, /model-settings-button|send-button|cancel-run-button/);
  assert.match(html.slice(buttonsStart, html.indexOf("</form>", buttonsStart)), /model-settings-button[\s\S]*cancel-run-button[\s\S]*send-button/);

  const belowStart = html.indexOf('<div id="composer-below"');
  const belowEnd = html.indexOf("</div>", belowStart);
  assert.ok(belowStart >= 0 && belowEnd > belowStart);
  const below = html.slice(belowStart, belowEnd);
  assert.match(below, /id="composer-project"/);
  assert.doesNotMatch(below, /home-composer-context|home-permission-input|permission-settings-button/);

  for (const id of ["home-composer-context", "home-permission-input", "permission-settings-button", "composer-project"]) {
    assert.equal((html.match(new RegExp(`id="${id}"`, "g")) || []).length, 1, `${id} remains unique`);
  }
});

test("P1 · the existing controls keep their Home and Session owners", () => {
  assert.match(app, /\$\("home-composer-context"\)\.hidden = !home/);
  assert.match(app, /\$\("permission-settings-button"\)\.hidden = home \|\| !session/);
  assert.match(app, /\$\("home-permission-input"\)\.addEventListener\("change", \(event\) => \{\s*state\.homePermissionMode = event\.target\.value;\s*storeHomeDraft\(\);/);
  assert.match(app, /\$\("permission-settings-button"\)\.addEventListener\("click", \(event\) => openConnectionCard\(event\.currentTarget\)\)/);
  assert.match(app, /\/permission-mode/);
  assert.match(app, /projectLine\.hidden = home \|\| !session \|\| !project\?\.name/);
  assert.match(css, /\.composer-below:not\(:has\(> \*:not\(\[hidden\]\)\)\) \{ display: none; \}/);
});

test("P1 · responsive composer controls stay in one row and preserve narrow hit targets", () => {
  assert.match(css, /\.composer-form \.composer-controls \{ flex-wrap: nowrap; \}/);
  assert.match(css, /\.composer-controls > \.composer-context \{ flex: 1 1 auto; \}/);
  assert.match(css, /\.composer-context \{ flex-wrap: nowrap; \}/);
  assert.match(css, /\.home-composer-context \{[^}]*flex-wrap: nowrap;[^}]*\}/);

  const tabletStart = css.indexOf("@media (min-width: 1024px) and (max-width: 1199px)");
  const tabletEnd = css.indexOf("@media (max-width: 1023px)", tabletStart);
  assert.ok(tabletStart >= 0 && tabletEnd > tabletStart);
  assert.doesNotMatch(css.slice(tabletStart, tabletEnd), /flex-wrap:\s*wrap/);

  const narrowStart = css.indexOf("@media (max-width: 1023px)");
  const narrowEnd = css.indexOf(".message-list", narrowStart);
  assert.ok(narrowStart >= 0 && narrowEnd > narrowStart);
  const narrow = css.slice(narrowStart, narrowEnd);
  assert.match(narrow, /\.home-composer-context \.home-choice-select \{\s*min-height: 44px;/);
  assert.match(narrow, /max-width: min\(150px, 37vw\)/);
  assert.match(css, /\.permission-mode \.button-label \{[^}]*text-overflow: ellipsis;/);
  assert.doesNotMatch(css, /\.home-active \.composer-buttons \{ align-self: flex-end; \}/);
});
