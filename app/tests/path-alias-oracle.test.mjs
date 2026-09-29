/* Path policy folds every spelling that a Host volume may open as the same
 * file (architect record, review AR1 and AR3). The volume is the oracle: it is
 * asked which names collide, and the fold must make each colliding pair equal. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, openSync, closeSync, readdirSync, rmSync, writeFileSync, constants } from "node:fs";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { evaluatePolicy, foldPathAliases } from "../runtime/control-plane.mjs";
import { createPathAdmission, governTools } from "../runtime/control-tools.mjs";
import { createWsReadTool } from "../runtime/workspace-tools.mjs";

const layer = (...rules) => [{ scope: { type: "user", id: "local" }, rules: rules.map(([action, resource, effect]) => ({ action, resource, effect })) }];
const PATH_ACTIONS = ["ws_read", "ws_write", "ws_grep", "repo_read", "repo_write", "candidate_read"];

test("every single-code-point alias this volume has is equal under the fold", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "cw-alias-oracle-"));
  try {
    const folded = new Set();
    let collisions = 0;
    const missed = [];
    for (let cp = 0x21; cp <= 0x1FFFF; cp += 1) {
      if (cp >= 0xD800 && cp <= 0xDFFF) continue;
      const ch = String.fromCodePoint(cp);
      if (ch === "/" || ch === "." || !/\p{L}|\p{M}|\p{N}|\p{S}/u.test(ch)) continue;
      const name = "x" + ch + "y";
      try {
        closeSync(openSync(path.join(dir, name), constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY));
        folded.add(foldPathAliases(name));
      } catch (error) {
        if (error.code !== "EEXIST") continue;
        // The volume says this name is an earlier one; the fold must agree.
        collisions += 1;
        if (!folded.has(foldPathAliases(name))) missed.push("U+" + cp.toString(16).toUpperCase());
      }
    }
    assert.deepEqual(missed, [], `aliases the fold does not cover (${collisions} collisions on this volume)`);
    if (collisions === 0) console.log("# this volume aliases no names; the oracle had nothing to compare");
    else console.log(`# ${collisions} aliases on this volume, all covered`);
    assert.ok(readdirSync(dir).length > 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("AR1: a final-sigma spelling of a denied name is denied for every path action", () => {
  for (const action of PATH_ACTIONS) {
    for (const effect of ["deny", "ask"]) {
      const policy = layer([action, "Σ.txt", effect]);
      for (const spelling of ["Σ.txt", "σ.txt", "ς.txt"]) assert.equal(evaluatePolicy(policy, action, spelling).effect, effect, `${action} ${spelling}`);
    }
  }
});

test("AR1: ws_read through governTools refuses the alias that opens the denied file", async t => {
  const workspace = await mkdtemp(path.join(tmpdir(), "cw-alias-ws-"));
  await mkdir(path.join(workspace, "materials"));
  await writeFile(path.join(workspace, "materials", "Σ.txt"), "SENTINEL\n");
  const plain = createWsReadTool({ workspaceDir: workspace });
  const aliased = await plain.execute("probe", { path: "materials/ς.txt" }).then(() => true, () => false);
  if (!aliased) t.diagnostic("this volume does not open ς.txt as Σ.txt; the policy is still asserted");
  const binding = { resources: [{ id: "tool:ws_read", kind: "tool", action: "ws_read", exposed: true }], policies: layer(["ws_read", "materials/Σ.txt", "deny"]) };
  const [tool] = governTools([plain], { binding, permissionMode: "draft", workspaceDir: workspace, requestPermission: async () => "deny", isOpen: () => true });
  for (const spelling of ["materials/Σ.txt", "materials/σ.txt", "materials/ς.txt", "MATERIALS/ς.TXT"]) {
    await assert.rejects(tool.execute("call", { path: spelling }), /denied/, spelling);
  }
  assert.equal(createPathAdmission({ binding, permissionMode: "draft" })("ws_grep", "materials/ς.txt"), "allow", "no ws_grep rule exists; the aggregate also applies the ws_read rule");
  assert.equal(createPathAdmission({ binding, permissionMode: "draft" })("ws_read", "materials/ς.txt"), "deny");
});

test("AR3: folding never turns a deny or ask into something weaker", () => {
  // In one layer the last matching rule wins, so a reading that matches more
  // rules could let a later allow win. Each case is the effect before folding.
  const cases = [
    { rules: [["ws_read", "private.txt", "deny"], ["ws_read", "PRIVATE.txt", "allow"]], action: "ws_read", resource: "private.txt", atLeast: "deny" },
    { rules: [["ws_write", "out/*", "ask"], ["ws_write", "OUT/*", "allow"]], action: "ws_write", resource: "out/a.txt", atLeast: "ask" },
    { rules: [["repo_read", "Caf*", "deny"], ["repo_read", "café.txt", "allow"]], action: "repo_read", resource: "café.txt", atLeast: "deny" },
    { rules: [["candidate_read", "σ.txt", "deny"], ["candidate_read", "ς.txt", "allow"]], action: "candidate_read", resource: "σ.txt", atLeast: "deny" },
  ];
  const weight = { allow: 0, ask: 1, deny: 2 };
  for (const item of cases) {
    const effect = evaluatePolicy(layer(...item.rules), item.action, item.resource).effect;
    assert.ok(weight[effect] >= weight[item.atLeast], `${item.action} ${item.resource}: ${effect}`);
  }
});

test("AR3: the documented last-match override still works", () => {
  const policy = layer(["ws_write", "*", "deny"], ["ws_write", "out/*", "allow"]);
  assert.equal(evaluatePolicy(policy, "ws_write", "out/a.txt").effect, "allow");
  assert.equal(evaluatePolicy(policy, "ws_write", "materials/a.txt").effect, "deny");
});

test("non-path resources keep exact matching", () => {
  assert.equal(evaluatePolicy(layer(["runtime_load", "Skill-A", "deny"]), "runtime_load", "skill-a").effect, "allow");
});
