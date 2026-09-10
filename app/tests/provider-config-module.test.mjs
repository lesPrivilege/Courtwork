import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { test } from "node:test";
import * as projection from "../web/provider-config.mjs";
import * as settings from "../web/settings-view.mjs";
import { boot } from "./helpers.mjs";

test("PV-54: both consumers use one pure provider projection, preserving existing exports", async () => {
  for (const name of ["PROVIDER_CONFIG_FIELDS", "projectProviderConfig", "supportedEffortsOf", "effortSelectable"]) {
    assert.equal(settings[name], projection[name]);
  }
  const source = await readFile(new URL("../web/provider-config.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /^import\s/m, "the pure projection must not import a view or runtime");
  for (const filename of ["settings-view.mjs", "model-picker.mjs"]) {
    const consumer = await readFile(new URL(`../web/${filename}`, import.meta.url), "utf8");
    assert.match(consumer, /import \{ effortSelectable, projectProviderConfig, supportedEffortsOf \} from ["']\.\/provider-config\.mjs["']/);
    assert.doesNotMatch(consumer, /function projectProviderConfig\(/);
  }
});

test("PV-54: the real host serves exactly the shared projection module", async () => {
  const h = await boot();
  try {
    const response = await fetch(`${h.runtime.url}/web/provider-config.mjs`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /^text\/javascript/);
    assert.equal(await response.text(), await readFile(new URL("../web/provider-config.mjs", import.meta.url), "utf8"));
    for (const pathname of ["/web/provider-config", "/web/provider-config.mjs.map", "/web/provider-config.mjs/extra"]) {
      const rejected = await fetch(h.runtime.url + pathname);
      assert.equal(rejected.status, 404);
      await rejected.body?.cancel();
    }
  } finally {
    await h.runtime.close();
    await rm(h.dataDir, { recursive: true, force: true });
  }
});
