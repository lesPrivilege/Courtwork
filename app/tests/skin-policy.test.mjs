/* SK-2 · the classic policy is the one source for stored-skin projection.
 * These tests execute the checked-in policy and the checked-in first-frame
 * script; they do not carry a second parser implementation. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const root = new URL("../../", import.meta.url).pathname;
const policySource = readFileSync(`${root}app/web/skin-policy.js`, "utf8");
const indexSource = readFileSync(`${root}app/web/index.html`, "utf8");

function policyInVm() {
  const context = { console };
  context.globalThis = context;
  vm.runInNewContext(policySource, context, { filename: "skin-policy.js" });
  return { context, policy: context.__cwSkinPolicy };
}

function declarations(names, value = "#101010") {
  return names.map((name) => `${name}: ${value};`).join("\n");
}

function legacyTokens(policy) {
  const colors = declarations(policy.LEGACY_SKIN_COLOR_TOKENS);
  const numeric = Object.entries(policy.LEGACY_SKIN_NUMERIC_TOKENS)
    .map(([name, kind]) => `${name}: ${kind === "triple" ? "0, 0, 0" : "0.1"};`)
    .join("\n");
  return `:root {\n${colors}\n${numeric}\n}`;
}

function modernTokens(policy) {
  return `:root {\n${declarations(policy.SKIN_COLOR_TOKENS)}\n}`;
}

function scriptsIn(html) {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .map((match) => ({ attributes: match[1], body: match[2] }));
}

class Element {
  constructor(tagName) {
    this.tagName = tagName;
    this.id = "";
    this.textContent = "";
    this.attributes = new Map();
  }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }
  removeAttribute(name) {
    this.attributes.delete(name);
  }
  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }
}

function runFirstFrame(stored) {
  const rootElement = new Element("html");
  const nodesById = new Map();
  const writes = [];
  const reads = [];
  const document = {
    documentElement: rootElement,
    head: {
      appendChild(node) {
        if (node.id) nodesById.set(node.id, node);
      },
    },
    createElement(tagName) {
      return new Element(tagName);
    },
    getElementById(id) {
      return nodesById.get(id) ?? null;
    },
  };
  const localStorage = {
    getItem(key) {
      reads.push(key);
      return JSON.stringify(stored);
    },
    setItem(key, value) {
      writes.push([key, value]);
    },
  };
  const context = { console, document, localStorage, location: { origin: "http://example.test" } };
  context.window = context;
  context.globalThis = context;
  vm.runInNewContext(policySource, context, { filename: "skin-policy.js" });
  const bootstrap = scriptsIn(indexSource).find((script) =>
    !/\bsrc\s*=/.test(script.attributes) && script.body.includes('var key = "cw:prefs:"'),
  );
  assert.ok(bootstrap, "the synchronous first-frame bootstrap was not found");
  vm.runInNewContext(bootstrap.body, context, { filename: "index.html#first-frame" });
  return {
    context,
    root: rootElement,
    style: nodesById.get("user-appearance"),
    writes,
    reads,
  };
}

test("legacy values remain readable while projection ignores semantic and material keys", () => {
  const { policy } = policyInVm();
  const raw = legacyTokens(policy);
  const parsed = policy.validateLegacySkinTokens(raw);
  const projected = policy.projectSkin(raw);

  assert.equal(policy.SKIN_POLICY_VERSION, 1);
  assert.equal(parsed.ok, true, JSON.stringify(parsed.errors));
  assert.equal(projected.ok, true, JSON.stringify(projected.errors));
  assert.equal(projected.version, 1);
  assert.equal(projected.sourceFormat, "legacy");
  assert.deepEqual(
    JSON.parse(JSON.stringify(projected.values)),
    Object.fromEntries(policy.SKIN_COLOR_TOKENS.map((name) => [name, "#101010"])),
  );
  for (const name of [
    "--danger-3", "--danger-11", "--success-3", "--success-11",
    ...Object.keys(policy.LEGACY_SKIN_NUMERIC_TOKENS),
  ]) assert.ok(projected.ignored.includes(name), name);
  assert.equal(projected.css, policy.SKIN_COLOR_TOKENS.map((name) => `${name}: #101010;`).join(" "));
  assert.notEqual(projected.css, raw);
});

test("unknown, semantic, and material declarations cannot enter the modern skin", () => {
  const { policy } = policyInVm();
  const base = modernTokens(policy);
  for (const declaration of [
    "--unknown-brand: #ff0000;",
    "--attention-review: #ff0000;",
    "--control-accent: #ff0000;",
    "--control-unavailable-fill: #ffcccc;",
    "--danger-11: #ff0000;",
    "--success-11: #00ff00;",
    "--focus: #0000ff;",
    "--alpha-ink: 0, 0, 0;",
    "--glass-alpha: 0.5;",
  ]) {
    const result = policy.validateSkinTokens(base.replace("}", `${declaration} }`));
    assert.equal(result.ok, false, declaration);
    assert.equal(result.css, "", declaration);
    const rejected = policy.projectSkin(base.replace("}", `${declaration} }`));
    assert.equal(rejected.ok, false, declaration);
    assert.equal(rejected.sourceFormat, "invalid");
  }
});

test("first paint retains raw storage but writes only canonical projected CSS", () => {
  const { policy } = policyInVm();
  const raw = legacyTokens(policy);
  const projected = policy.projectSkin(raw);
  const result = runFirstFrame({ scheme: "dark", skin: "custom", customSkin: raw });
  const expected = ':root[data-skin="custom"],:root[data-skin="custom"][data-theme="dark"],:root[data-skin="custom"]:not([data-theme="light"]){' + projected.css + "}";

  assert.equal(projected.ok, true);
  assert.equal(result.context.__cwPrefs.value.customSkin, raw);
  assert.equal(result.root.getAttribute("data-theme"), "dark");
  assert.equal(result.root.getAttribute("data-skin"), "custom");
  assert.equal(result.style.textContent, expected);
  assert.equal(result.writes.length, 0);
  assert.ok(result.reads.length > 0);
  assert.doesNotMatch(result.style.textContent, /--(?:danger|success|alpha|attention-review|focus|unknown-brand)/);
});

test("a legal input over 4000 bytes and under 8000 bytes projects identically at first paint", () => {
  const { policy } = policyInVm();
  const raw = `/*${"x".repeat(4500)}*/\n${modernTokens(policy)}`;
  assert.ok(raw.length > 4000);
  assert.ok(raw.length <= 8000);
  const projected = policy.projectSkin(raw);
  const result = runFirstFrame({ skin: "custom", customSkin: raw });
  const prefix = ':root[data-skin="custom"],:root[data-skin="custom"][data-theme="dark"],:root[data-skin="custom"]:not([data-theme="light"]){';

  assert.equal(projected.ok, true, JSON.stringify(projected.errors));
  assert.equal(result.style.textContent, `${prefix}${projected.css}}`);
  assert.equal(result.context.__cwPrefs.value.customSkin, raw);
  assert.equal(result.writes.length, 0);
});

test("the policy is a synchronous classic script before the first-frame bootstrap", () => {
  const scripts = scriptsIn(indexSource);
  const policyIndex = scripts.findIndex(({ attributes }) => /src="\/web\/skin-policy\.js"/.test(attributes));
  const bootstrapIndex = scripts.findIndex(({ attributes, body }) =>
    !/\bsrc\s*=/.test(attributes) && body.includes('var key = "cw:prefs:"'),
  );
  const appIndex = scripts.findIndex(({ attributes }) => /src="\/web\/app\.mjs"/.test(attributes));

  assert.ok(policyIndex >= 0);
  assert.ok(bootstrapIndex > policyIndex);
  assert.ok(appIndex > bootstrapIndex);
  assert.doesNotMatch(scripts[policyIndex].attributes, /\b(?:async|defer|type\s*=)/);
  assert.doesNotMatch(scripts[bootstrapIndex].attributes, /\b(?:async|defer|type\s*=|src\s*=)/);
});
