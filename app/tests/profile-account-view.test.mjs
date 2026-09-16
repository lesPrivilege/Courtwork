/* WO · Profile & Account tabs (user ruling 2026-09-16) · these are source
 * drift guards on settings-view.mjs, not DOM renders: the module wires
 * document-mounted panels through `createSettingsPage`, which this suite does
 * not instantiate. What is checked instead is that the shape promised by the
 * work order stays in the source — the two render functions exist and are
 * called from `render()`, the work-address suggestion is offered as a button
 * rather than written for the person, the client-side photo-size refusal is
 * in place, the Account fixture states its sentence and marks every disabled
 * action, and the Account panel never invents a usage or quota number — plus
 * one pure test of the exported `suggestWorkAddress` helper. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

import { suggestWorkAddress, PROFILE_AVATAR_MAX_BYTES } from "../web/settings-view.mjs";

const root = new URL("../../", import.meta.url).pathname;
const source = readFileSync(`${root}app/web/settings-view.mjs`, "utf8");
const styles = readFileSync(`${root}app/web/styles.css`, "utf8");

/** The body of a top-level `function name() { ... }` declaration in `source`,
 * matched by brace counting so nested blocks don't truncate it early. */
function functionBody(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `function ${name} not found in settings-view.mjs`);
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  throw new Error(`unbalanced braces reading function ${name}`);
}

test("renderProfile and renderAccount exist and are wired into render()", () => {
  assert.match(source, /function renderProfile\(\)\s*\{/);
  assert.match(source, /function renderAccount\(\)\s*\{/);
  const renderBody = functionBody("render");
  assert.match(renderBody, /renderProfile\(\)/, "render() must call renderProfile()");
  assert.match(renderBody, /renderAccount\(\)/, "render() must call renderAccount()");
  // Also mounted once at page bootstrap, alongside the other panel renders.
  assert.match(source, /renderKeyboard\(\);\s*\n\s*renderMemory\(\);\s*\n\s*renderNewSessions\(\);\s*\n\s*renderProfile\(\);\s*\n\s*renderAccount\(\);/);
});

test("renderProfile mounts into #settings-profile-rows and renderAccount into #settings-account-rows", () => {
  const profileBody = functionBody("renderProfile");
  assert.match(profileBody, /getElementById\("settings-profile-rows"\)/);
  const accountBody = functionBody("renderAccount");
  assert.match(accountBody, /getElementById\("settings-account-rows"\)/);
});

test("the work-address suggestion is a button a person presses, never an auto-fill", () => {
  const profileBody = functionBody("renderProfile");
  // The suggestion only appears when work address is empty and role is set,
  // and it is a <button>, wired on click — not assigned into the field or
  // saved automatically as soon as it becomes available.
  assert.match(profileBody, /!profile\.workAddress && profile\.role/);
  assert.match(profileBody, /el\("button",\s*\{\s*className:\s*"text-button"/);
  // The save is wired to the button's own click, not fired eagerly once the
  // suggestion is computed.
  assert.match(
    profileBody,
    /suggestButton\.addEventListener\("click", \(\) => void saveProfile\(\{ workAddress: suggestion \}\)\);/,
  );
});

test("a photo over 256 KiB is refused client-side before any save is attempted", () => {
  assert.equal(PROFILE_AVATAR_MAX_BYTES, 256 * 1024);
  const profileBody = functionBody("renderProfile");
  assert.match(profileBody, /file\.size > PROFILE_AVATAR_MAX_BYTES/);
  assert.match(profileBody, /notify\?\.\("The photo is larger than 256 KiB\.", "error"\)/);
});

test("a stale profile save keeps the typed value and reports the conflict, not the raw server message", () => {
  assert.match(source, /"Profile changed elsewhere; reload before saving\."/);
  assert.match(source, /error\?\.body\?\.error\?\.code === "profile_conflict"/);
});

test("the Account panel states its fixture sentence and marks every disabled action", () => {
  const accountBody = functionBody("renderAccount");
  assert.match(
    accountBody,
    /Plan, billing and sessions are fixture rows in this build; the actions become available when accounts are connected\. No usage or quota is shown because none is measured\./,
  );
  // Every disabled action is built through one helper that always sets the
  // same title, so a new disabled row cannot forget the tooltip.
  assert.match(source, /function disabledAccountButton\(text\)\s*\{[\s\S]*?title:\s*"Available when accounts are connected\."/);
  for (const label of ["Manage plan", "View history", "Export", "Sign out of all devices", "Sign out", "Delete account"])
    assert.match(accountBody, new RegExp(`accountActionRow\\("[^"]*",\\s*"${label}"\\)`), `disabled action "${label}" not wired through accountActionRow`);
});

test("renderAccount never invents a usage, quota or percentage figure beyond its one fixture disclosure", () => {
  // The disclosure line is required verbatim (it names "usage" and "quota" as
  // concepts, on purpose, to say neither is measured); strip it before
  // scanning so the check is for a leaked number or metric, not that sentence.
  const disclosure = "Plan, billing and sessions are fixture rows in this build; the actions become available when accounts are connected. No usage or quota is shown because none is measured.";
  assert.ok(functionBody("renderAccount").includes(disclosure), "the fixture disclosure sentence must be present verbatim");
  const rest = functionBody("renderAccount").replace(disclosure, "").toLowerCase();
  for (const word of ["token", "quota", "usage", "percent", "tps"])
    assert.ok(!rest.includes(word), `renderAccount must not mention "${word}" outside its one fixture disclosure`);
});

test("Profile and Account CSS additions use existing tokens only", () => {
  assert.match(styles, /\.profile-avatar-row\s*\{[^}]*display:\s*flex;[^}]*\}/);
  assert.match(styles, /\.profile-avatar-row \.avatar\s*\{[^}]*--avatar-size:\s*72px;[^}]*\}/);
  assert.match(styles, /\.account-block \+ \.account-block\s*\{[^}]*margin-top:\s*var\(--space-5\);[^}]*\}/);
  assert.match(styles, /\.danger-zone\s*\{[^}]*border-top:\s*1px solid var\(--line\);[^}]*\}/);
});

test("suggestWorkAddress · Chinese reads surname + role, everything else reads role + full name", () => {
  assert.equal(
    suggestWorkAddress({ fullName: "林知远", role: "律师", language: "zh-CN" }),
    "林律师",
  );
  assert.equal(
    suggestWorkAddress({ fullName: "John Smith", role: "Counsel", language: "en" }),
    "Counsel John Smith",
  );
  assert.equal(suggestWorkAddress({ fullName: "", role: "Counsel", language: "en" }), "");
  assert.equal(suggestWorkAddress({ fullName: "John Smith", role: "", language: "en" }), "");
  assert.equal(suggestWorkAddress({}), "");
});
