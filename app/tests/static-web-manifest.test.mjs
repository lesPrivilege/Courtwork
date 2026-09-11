/* WO-MA2-01 · T5：`/web/*.mjs` 静态白名单与磁盘的机械对表。
 *
 * `app/server/index.mjs` 里的 STATIC 表是 `/web/*` 能否被取到的唯一决定者：
 * 它是一张字面清单，既没有目录遍历也没有回落。漏加一项不会有任何构建或测试
 * 报错，只在浏览器里静默 404；多留一项则指向不存在的文件，同样静默。
 *
 * 本文件做双向对表，两向都必须成立：
 *   (1) 磁盘 → 路由：`app/web/**.mjs` 每个文件都能被真服务器以 200 取到；
 *   (2) 路由 → 磁盘：源码里每条 `/web/...` 字面路由都指向磁盘上存在的文件。
 *
 * 例外按实际路由规则写明（不是按"应该"）：
 *   - `web/index.html` 不在 `/web/` 下取，它由 `/` 与 `/index.html` 两个键提供；
 *   - `web/skins/*.css` 根本不进路由，它是 `styles.css` 的同源对照文件，
 *     由 settings-preferences.test.mjs 逐字比对，产品从不请求它；
 *   - `web/README.md`、`web/vendor/manifest.json`、`web/vendor/*LICENSES.txt`
 *     是仓内说明与许可材料，同样不进路由。
 * 以上三类以 404 断言钉住，免得日后有人以为"没测过就等于可以随手加"。
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile, readdir, rm, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { boot } from "./helpers.mjs";

const APP_ROOT = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const WEB_ROOT = path.join(APP_ROOT, "web");
const TOOLS_ROOT = path.resolve(APP_ROOT, "../tools/ui-vendor");

/** Every `/web/...` route key the server source declares, read from the source
 * text: the STATIC Map is module-private, so the literal list is the artifact
 * under test. Both shapes must be found; a source rewrite that hides one of
 * them fails here instead of silently reducing this test to a no-op. */
async function declaredWebRoutes() {
  const source = await readFile(path.join(APP_ROOT, "server/index.mjs"), "utf8");
  const literal = [...source.matchAll(/"\/web\/([^"]+)"/g)].map((match) => match[1]);
  const loop = source.match(/for \(const name of \[([^\]]*)\]\) STATIC\.set\(`\/web\/\$\{name\}`/);
  assert.ok(loop, "the /web/${name} whitelist loop is no longer recognizable in app/server/index.mjs");
  const looped = [...loop[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  assert.ok(literal.length > 0 && looped.length > 0, "no /web routes were extracted from the source");
  const all = [...literal, ...looped];
  assert.equal(new Set(all).size, all.length, "a /web route is declared twice");
  return all.sort();
}

/** Every module on disk under app/web, relative to app/web. */
async function webModulesOnDisk() {
  const found = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.name.endsWith(".mjs")) found.push(path.relative(WEB_ROOT, full));
    }
  }
  await walk(WEB_ROOT);
  return found.sort();
}

test("每个 app/web 模块都在静态白名单里，且每条白名单路由都指向磁盘上存在的文件", async () => {
  const declared = await declaredWebRoutes();
  const modules = await webModulesOnDisk();

  // (1) 磁盘 → 白名单。漏加的那个文件会以名字出现在 diff 里。
  const declaredModules = declared.filter((name) => name.endsWith(".mjs"));
  assert.deepEqual(declaredModules, modules,
    "app/web 下的模块与 app/server/index.mjs 的 /web 白名单不一致（左=白名单，右=磁盘）");

  // (2) 白名单 → 磁盘。非 .mjs 的白名单项（两个 css）一并核实。
  for (const name of declared) {
    const target = path.join(WEB_ROOT, name);
    assert.ok((await stat(target)).isFile(), `/web/${name} 指向的文件不存在：${target}`);
  }
});

/** The static icon-name allowlist in ui-controls.mjs. `icons` is a module-private
 * `Set`, not exported, so the literal list is read from the source text — the
 * same approach as `declaredWebRoutes` above. */
async function uiControlsIconAllowlist() {
  const source = await readFile(path.join(WEB_ROOT, "ui-controls.mjs"), "utf8");
  const match = source.match(/const icons = new Set\(\[([^\]]*)\]\)/);
  assert.ok(match, "the `const icons = new Set([...])` allowlist is no longer recognizable in app/web/ui-controls.mjs");
  const names = [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(names.length > 0, "no icon names were extracted from the ui-controls.mjs allowlist");
  return new Set(names);
}

/** Every `<symbol id="...">` id in the sprite. */
async function iconsSvgSymbolIds() {
  const source = await readFile(path.join(WEB_ROOT, "vendor/icons.svg"), "utf8");
  const ids = [...source.matchAll(/<symbol id="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(ids.length > 0, "no <symbol id=...> entries were extracted from icons.svg");
  return new Set(ids);
}

/** The basenames (without `.svg`) of `lucide.files` in the vendor manifest,
 * excluding the bundled `LICENSE` entry, which is not a glyph. */
async function manifestLucideIconNames() {
  const manifest = JSON.parse(await readFile(path.join(WEB_ROOT, "vendor/manifest.json"), "utf8"));
  // The sprite is the Lucide pin plus the CourtWork domain glyphs recorded
  // under manifest.courtwork (tools/ui-vendor/courtwork); both are sources.
  const files = [...Object.keys(manifest.lucide.files), ...Object.keys(manifest.courtwork?.files ?? {})].filter((name) => name.endsWith(".svg"));
  assert.ok(files.length > 0, "no lucide.files entries were found in vendor/manifest.json");
  return new Set(files.map((name) => name.replace(/\.svg$/, "")));
}

test("ui-controls 白名单、icons.svg 的 symbol id、manifest 的 lucide.files 三者一致", async () => {
  const allowlist = await uiControlsIconAllowlist();
  const symbolIds = await iconsSvgSymbolIds();
  const manifestNames = await manifestLucideIconNames();

  assert.deepEqual([...allowlist].sort(), [...symbolIds].sort(),
    "ui-controls.mjs 的图标白名单与 icons.svg 的 symbol id 不一致（左=白名单，右=sprite）");
  assert.deepEqual([...symbolIds].sort(), [...manifestNames].sort(),
    "icons.svg 的 symbol id 与 manifest.json 的 lucide.files 不一致（左=sprite，右=manifest）");
});

test("manifest.lucide 与 tools/ui-vendor/lucide/sources.json 逐字相同（生成源=已记录来源）", async () => {
  const manifest = JSON.parse(await readFile(path.join(WEB_ROOT, "vendor/manifest.json"), "utf8"));
  const sources = JSON.parse(await readFile(path.join(TOOLS_ROOT, "lucide/sources.json"), "utf8"));
  assert.deepEqual(manifest.lucide, sources,
    "vendor/manifest.json 里的 lucide 块与 tools/ui-vendor/lucide/sources.json 不一致——manifest 记的来源已经跟不上真实生成来源了");
});

test("manifest.outputs 里记的每个文件哈希都等于该文件此刻在磁盘上的真实 sha256", async () => {
  const manifest = JSON.parse(await readFile(path.join(WEB_ROOT, "vendor/manifest.json"), "utf8"));
  for (const [name, recorded] of Object.entries(manifest.outputs)) {
    const actual = createHash("sha256")
      .update(await readFile(path.join(WEB_ROOT, "vendor", name)))
      .digest("hex");
    assert.equal(actual, recorded,
      `app/web/vendor/${name} 的真实 sha256 与 manifest.json 里记的不一致——文件被手改过，或 manifest 没有跟着重新生成`);
  }
});

test("白名单决定 /web 的可取性：模块 200，未列入的仓内材料 404", async () => {
  const h = await boot();
  try {
    const get = (pathname) => fetch(h.runtime.url + pathname);
    for (const name of await webModulesOnDisk()) {
      const response = await get(`/web/${name}`);
      assert.equal(response.status, 200, `/web/${name} 未被路由`);
      assert.match(response.headers.get("content-type") ?? "", /^text\/javascript/);
      await response.body?.cancel();
    }
    // 例外，按上方注释里的实际规则：这些文件在磁盘上，但不在 /web 下取。
    for (const pathname of ["/web/index.html", "/web/README.md", "/web/skins/gray-steel.css",
      "/web/vendor/manifest.json", "/web/vendor/LICENSES.txt", "/web/vendor/markdown-parser-manifest.json"]) {
      const response = await get(pathname);
      assert.equal(response.status, 404, `${pathname} 不应可取`);
      await response.body?.cancel();
    }
    const index = await get("/index.html");
    assert.equal(index.status, 200);
    assert.match(index.headers.get("content-type") ?? "", /^text\/html/);
    await index.body?.cancel();
  } finally {
    await h.runtime.close();
    await rm(h.dataDir, { recursive: true, force: true });
  }
});

test("skin-policy.js is an exact synchronous static route", async () => {
  const h = await boot();
  try {
    const response = await fetch(h.runtime.url + "/web/skin-policy.js");
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /^text\/javascript/);
    assert.match(await response.text(), /__cwSkinPolicy/);

    const sibling = await fetch(h.runtime.url + "/web/skin-policy.js/extra");
    assert.equal(sibling.status, 404);
    await sibling.body?.cancel();
  } finally {
    await h.runtime.close();
    await rm(h.dataDir, { recursive: true, force: true });
  }
});
