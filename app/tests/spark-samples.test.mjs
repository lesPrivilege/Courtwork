/* WO-SD-01 · SD-18: the five Spark sample scenarios moved from
 * `app/tests/fixtures/spark-derivations/` to `app/web/samples/spark-derivations/`
 * (`git mv`) and became a served, product-owned asset — one file, two
 * readers: `spark-projection.test.mjs` reads it from disk, and this test
 * confirms the real server's static allowlist (`app/server/index.mjs`)
 * actually serves it, over real HTTP, with the frozen DTO content type.
 *
 * The allowlist is a literal Map with no directory traversal and no
 * fallback (see `static-web-manifest.test.mjs`'s header comment for the
 * general rule); this file makes the same "route exists on disk, and only
 * the route exists" check specifically for the five sample files, which are
 * JSON rather than `.mjs` and so fall outside that file's module sweep.
 */
import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { boot } from "./helpers.mjs";
import { validSparkDerivations } from "../web/spark-projection.mjs";

const APP_ROOT = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const SAMPLES_DIR = path.join(APP_ROOT, "web", "samples", "spark-derivations");
const SCENARIOS = ["stale", "quiet", "empty", "partial", "truncated"];

test("WO-SD-01 · GET /web/samples/spark-derivations/<name>.json 200s for all five scenarios, each a valid, unaltered BE-41 payload", async () => {
  const h = await boot();
  try {
    for (const name of SCENARIOS) {
      const response = await fetch(h.runtime.url + `/web/samples/spark-derivations/${name}.json`);
      assert.equal(response.status, 200, `/web/samples/spark-derivations/${name}.json was not served`);
      assert.match(response.headers.get("content-type") ?? "", /^application\/json; charset=utf-8/);
      const served = await response.json();
      const onDisk = JSON.parse(await readFile(path.join(SAMPLES_DIR, `${name}.json`), "utf8"));
      // Same file, two readers (SD-7): what the route serves is byte-for-byte
      // what the test suite reads from disk — no second copy drifting apart.
      assert.deepEqual(served, onDisk);
      // Still the frozen BE-41 shape (SD-18: "不改形状") — the DTO's own
      // validator accepts it, exactly as it accepts a live payload.
      assert.ok(validSparkDerivations(served), `${name}.json no longer validates as a BE-41 payload`);
    }
  } finally {
    await h.runtime.close();
    await rm(h.dataDir, { recursive: true, force: true });
  }
});

test("WO-SD-01 · the sample route is a literal allowlist: an unregistered scenario name 404s, no directory listing, no traversal", async () => {
  const h = await boot();
  try {
    const get = (pathname) => fetch(h.runtime.url + pathname);
    for (const pathname of [
      "/web/samples/spark-derivations/nonexistent.json",
      "/web/samples/spark-derivations/",
      "/web/samples/spark-derivations",
      "/web/samples/spark-derivations/../../server/index.mjs",
    ]) {
      const response = await get(pathname);
      assert.equal(response.status, 404, `${pathname} should not be servable`);
      await response.body?.cancel();
    }
  } finally {
    await h.runtime.close();
    await rm(h.dataDir, { recursive: true, force: true });
  }
});

test("WO-SD-01 · the fixture directory no longer exists under app/tests — SD-18's git mv landed for real, not just in spark-projection.test.mjs's path", async () => {
  await assert.rejects(readFile(path.join(APP_ROOT, "tests", "fixtures", "spark-derivations", "stale.json")));
});
