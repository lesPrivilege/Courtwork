/* Order 3 frontend · request.activity keeps its accepted staggered recipe.
 * The production rule once reset every mark's animation-delay to 0 through the
 * `animation` shorthand (it out-ranked the :nth-child delays), so all seven
 * marks moved as one. The phase now lives inside the shorthand. Source pin;
 * the live computed styles are in the Order 3 frontend evidence. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../web/styles.css", import.meta.url), "utf8");

test("the moving rule carries each mark's phase inside the animation shorthand", () => {
  const moving = /\.run-activity\.is-moving \.run-activity-bars i \{ animation:([^;]+);/.exec(css)?.[1];
  assert.ok(moving, "moving rule present");
  assert.match(moving, /run-work-breath 1\.8s var\(--ease-out\) calc\(var\(--bar-index\) \* -130ms\) infinite alternate/);
  assert.doesNotMatch(css, /\.run-activity-bars i:nth-child\([^)]*\) \{ animation-delay/, "no separate delay rule the shorthand would override");
});

test("each of the seven marks has its own phase index", () => {
  const indices = [...css.matchAll(/\.run-activity-bars i:nth-child\((\d)\) \{ --bar-index:(\d); \}/g)].map((m) => [Number(m[1]), Number(m[2])]);
  assert.deepEqual(indices, [[1, 0], [2, 1], [3, 2], [4, 3], [5, 4], [6, 5], [7, 6]]);
});

test("reduced motion still stops the marks", () => {
  assert.match(css, /@media\(prefers-reduced-motion:reduce\) \{ \.run-activity\.is-moving \.run-activity-bars i \{ animation:none; \}/);
});
