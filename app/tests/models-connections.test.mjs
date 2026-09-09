/* FE-02 · 只测本单新增的判断，不重测别处已经断言过的东西：
 * (1) 三条 happy path 的 provider 身份取自后端目录的闭集 —— 前端不生成 provider ID，
 *     也就不会画出一条后端不认识的连接；
 * (2) 已保存的事实反推路径（本地 / 兼容端点 / 目录），不另存"用户当时选了哪条"；
 * (3) Connections 列表只画后端真有的那一条连接，凭据与端点分开陈述；
 * (4) 未交付的两步（BE-17 Fetch models、BE-18 Test connection）在界面上是说明而不是按钮；
 * (5) display name 的本设备存储只收目录里真有的 provider ID；
 * (6) WK-105 ⑤ 的 `--nav` 取值。 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

import {
  CONNECTION_PATHS,
  CONNECTION_STEPS,
  CONNECTION_NAME_PATTERN,
  MCP_INTAKE_STEPS,
  connectionPathOf,
  connectionRows,
  providerLabels,
  readPreferences,
} from "../web/settings-view.mjs";

const root = new URL("../../", import.meta.url).pathname;
const styles = readFileSync(`${root}app/web/styles.css`, "utf8");
const settingsSource = readFileSync(`${root}app/web/settings-view.mjs`, "utf8");

test("三条 happy path 是闭集，且每条只用后端目录里真有的 provider 身份", () => {
  assert.deepEqual(CONNECTION_PATHS.map((path) => path.id), ["catalog", "compatible", "local"]);
  for (const path of CONNECTION_PATHS) {
    assert.ok(path.providers.length, path.id);
    for (const provider of path.providers)
      assert.ok(Object.hasOwn(providerLabels, provider), `${path.id}: ${provider}`);
  }
  // 端点归谁决定，是三条路径唯一真正的差别。
  assert.deepEqual(CONNECTION_PATHS.map((path) => path.endpoint), ["provider", "required", "host"]);
});

test("路径由已保存的事实反推，不是第二个真源", () => {
  assert.equal(connectionPathOf({ provider: "openai" }), "catalog");
  assert.equal(connectionPathOf({ provider: "openai", baseUrl: "http://127.0.0.1:1234/v1" }), "compatible");
  assert.equal(connectionPathOf({ provider: "fake-openai-loopback" }), "local");
  assert.equal(connectionPathOf(null), "catalog");
});

test("Connections 只列后端真有的那一条：一条生效连接，凭据与端点分开陈述", () => {
  assert.deepEqual(connectionRows({ config: null }), []);
  const [saved] = connectionRows({
    config: { provider: "openai", model: "gpt-4.1-mini" },
    credentialStatus: "not_configured",
    names: { openai: "Work key" },
  });
  assert.equal(saved.name, "Work key");
  assert.equal(saved.endpoint, "Provider default endpoint");
  assert.equal(saved.credential, "No API key saved");
  assert.equal(saved.inForce, true);
  const [local] = connectionRows({
    config: { provider: "fake-openai-loopback", model: "fake-model" },
    credentialStatus: "not_configured",
  });
  // 本地端点不需要 key，所以它不说"没有 key"——那会读成一个缺口。
  assert.equal(local.credential, "No key needed");
  assert.equal(local.endpoint, "Local endpoint fixed by the host");
  assert.equal(local.name, "Local test");
});

test("未交付的两步是说明，不是按钮：BE-17 / BE-18 在界面上不长出控件", () => {
  const pending = CONNECTION_STEPS.filter((step) => !step.available).map((step) => step.id);
  assert.deepEqual(pending, ["test", "fetch"]);
  for (const step of CONNECTION_STEPS)
    if (!step.available) assert.match(step.note, /^Not available yet/);
  // 全站字符串一级的反向断言：没有任何按钮承诺这两件事。
  for (const label of ["Test connection", "Fetch models", "Detect models"])
    assert.doesNotMatch(
      settingsSource,
      new RegExp(`className:\\s*"[^"]*button[^"]*"[\\s\\S]{0,200}text:\\s*"${label}"`),
      label,
    );
});

test("MCP 走同一形态：六步，未交付的三步同样只留位", () => {
  assert.deepEqual(MCP_INTAKE_STEPS.map(([title]) => title), [
    "Add", "Configure", "Test connection", "Review permissions", "Enable", "Advanced",
  ]);
  const pending = MCP_INTAKE_STEPS.filter(([, note]) => note.startsWith("Not available yet"));
  assert.equal(pending.length, 3);
});

test("display name 只是本设备的叫法：键必须是目录里真有的 provider ID", () => {
  const original = globalThis.__cwPrefs;
  globalThis.__cwPrefs = {
    value: {
      connectionNames: {
        openai: "  Work key  ",
        "invented-provider": "Looks like a connection",
        deepseek: "a".repeat(90),
      },
    },
  };
  assert.deepEqual(readPreferences().connectionNames, { openai: "Work key" });
  globalThis.__cwPrefs = undefined;
  assert.deepEqual(readPreferences().connectionNames, {});
  globalThis.__cwPrefs = original;
  assert.equal(CONNECTION_NAME_PATTERN.test("a".repeat(61)), false);
  assert.equal(CONNECTION_NAME_PATTERN.test(""), false);
});

test("WK-105 ⑤ · 侧栏宽落进 256–280 的下沿", () => {
  assert.match(styles, /--nav:\s*256px;/);
});
