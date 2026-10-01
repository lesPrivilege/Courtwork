/* A path rule applies to a file, not to one spelling of its path (architect
 * record, reviews AR1 and AR3 and their re-reviews). The volume is the oracle
 * for which spellings are one file; the policy must then give one effect per
 * file, whatever the request or the rules spell. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, openSync, closeSync, existsSync, realpathSync, rmSync, constants } from "node:fs";
import { mkdtemp, mkdir, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { evaluatePolicy, foldPathAliases } from "../runtime/control-plane.mjs";
import { createPathAdmission, governTools } from "../runtime/control-tools.mjs";
import { createWsReadTool } from "../runtime/workspace-tools.mjs";

const layer = (...rules) => [{ scope: { type: "user", id: "local" }, rules: rules.map(([action, resource, effect]) => ({ action, resource, effect })) }];
const PATH_ACTIONS = ["ws_read", "ws_write", "ws_grep", "repo_read", "repo_write", "candidate_read"];

test("every alias this volume has is equal under the fold, alone and inside a name", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "cw-alias-oracle-"));
  try {
    const single = path.join(dir, "single");
    mkdirSync(single);
    const pairs = [];
    const missed = [];
    for (let cp = 0x21; cp <= 0x1FFFF; cp += 1) {
      if (cp >= 0xD800 && cp <= 0xDFFF) continue;
      const ch = String.fromCodePoint(cp);
      if (ch === "/" || ch === "." || !/\p{L}|\p{M}|\p{N}|\p{S}/u.test(ch)) continue;
      const name = "x" + ch + "y";
      try { closeSync(openSync(path.join(single, name), constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY)); }
      catch (error) {
        if (error.code !== "EEXIST") continue;
        // The volume names the file this spelling collides with; the fold must make that pair equal.
        const stored = path.basename(realpathSync.native(path.join(single, name)));
        pairs.push([stored.slice(1, -1), ch]);
        if (foldPathAliases(stored) !== foldPathAliases(name)) missed.push(`U+${cp.toString(16).toUpperCase()} as ${JSON.stringify(stored)}`);
      }
    }
    assert.deepEqual(missed, [], "aliases the fold does not cover");
    // The same pairs at the start, middle and end of a name, where a fold of the whole string could differ.
    const contexts = [c => c + "x", c => "a" + c + "x", c => "a" + c, c => "aa" + c + ".txt"];
    const inContext = [];
    let compared = 0;
    for (const [index, [stored, alias]] of pairs.entries()) {
      const sub = path.join(dir, "c" + index);
      mkdirSync(sub);
      for (const make of contexts) {
        try { closeSync(openSync(path.join(sub, make(stored)), constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY)); } catch { continue; }
        if (!existsSync(path.join(sub, make(alias)))) continue;
        compared += 1;
        if (foldPathAliases(make(stored)) !== foldPathAliases(make(alias))) inContext.push([make(stored), make(alias)]);
      }
    }
    assert.deepEqual(inContext, [], "aliases inside a name the fold does not cover");
    console.log(pairs.length ? `# ${pairs.length} aliases on this volume, ${compared} in context, all covered` : "# this volume aliases no names; the oracle had nothing to compare");
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
  for (const spelling of ["materials/Σ.txt", "materials/σ.txt", "materials/ς.txt"]) {
    await assert.rejects(tool.execute("call", { path: spelling }), /denied/, spelling);
  }
  // The upper-case directory names the same directory only where the volume
  // folds case; there the policy must deny it. Where it does not, the spelling
  // names no directory and is refused before any policy applies.
  const foldsCase = await stat(path.join(workspace, "MATERIALS")).then(() => true, () => false);
  if (!foldsCase) t.diagnostic("this volume does not open MATERIALS as materials; the spelling is refused as a missing directory");
  await assert.rejects(tool.execute("call", { path: "MATERIALS/ς.TXT" }), foldsCase ? /denied/ : /parent directory does not exist/, "MATERIALS/ς.TXT");
  assert.equal(createPathAdmission({ binding, permissionMode: "draft" })("ws_grep", "materials/ς.txt"), "allow", "no ws_grep rule exists; the aggregate also applies the ws_read rule");
  assert.equal(createPathAdmission({ binding, permissionMode: "draft" })("ws_read", "materials/ς.txt"), "deny");
});

// One decision per file: every spelling of a path gets the effect its canonical spelling gets.
const spellings = text => [text, text.toUpperCase(), text.normalize("NFD"), text.normalize("NFC"), text.toUpperCase().normalize("NFD"), text.replaceAll("σ", "ς"), text.replaceAll("ς", "σ"), text.replaceAll("σ", "Σ")];
function sameForEverySpelling(rules, action, resource, expected) {
  for (const spelling of spellings(resource)) assert.equal(evaluatePolicy(layer(...rules), action, spelling).effect, expected, `${action} ${JSON.stringify(spelling)} under ${JSON.stringify(rules)}`);
}

test("a wildcard rule reaches every spelling of a name it covers", () => {
  for (const action of PATH_ACTIONS) {
    sameForEverySpelling([[action, "aσ*", "deny"]], action, "aσx.txt", "deny");
    sameForEverySpelling([[action, "*σ", "ask"]], action, "notes/aσ", "ask");
    sameForEverySpelling([[action, "caf\u00e9*", "deny"]], action, "caf\u00e9-secret.txt", "deny");
  }
});

test("rules that meet on a file only through folding resolve to the stricter, whatever the request spells", () => {
  sameForEverySpelling([["ws_read", "private.txt", "deny"], ["ws_read", "PRIVATE.txt", "allow"]], "ws_read", "private.txt", "deny");
  sameForEverySpelling([["ws_read", "private.txt", "deny"], ["ws_read", "PRIVATE*", "allow"]], "ws_read", "private.txt", "deny");
  sameForEverySpelling([["ws_write", "out/*", "ask"], ["ws_write", "OUT/*", "allow"]], "ws_write", "out/a.txt", "ask");
  sameForEverySpelling([["repo_read", "Caf*", "deny"], ["repo_read", "cafe\u0301.txt", "allow"]], "repo_read", "caf\u00e9.txt", "deny");
  sameForEverySpelling([["candidate_read", "σ.txt", "deny"], ["candidate_read", "ς.txt", "allow"]], "candidate_read", "σ.txt", "deny");
  sameForEverySpelling([["ws_read", "AB*", "deny"], ["ws_read", "*bc", "allow"]], "ws_read", "abc", "deny");
  const held = evaluatePolicy(layer(["ws_read", "private.txt", "deny"], ["ws_read", "PRIVATE.txt", "allow"]), "ws_read", "PRIVATE.txt").trace.find(item => item.held);
  assert.deepEqual([held.resource, held.effect, held.held], ["private.txt", "deny", "alias-conflict"]);
});

test("a later rule that shares a spelling with an earlier one overrides it for every spelling", () => {
  sameForEverySpelling([["ws_write", "*", "deny"], ["ws_write", "out/*", "allow"]], "ws_write", "out/a.txt", "allow");
  sameForEverySpelling([["ws_write", "*", "deny"], ["ws_write", "out/*", "allow"]], "ws_write", "materials/a.txt", "deny");
  sameForEverySpelling([["ws_read", "x.txt", "deny"], ["ws_read", "x.txt", "allow"]], "ws_read", "x.txt", "allow");
  sameForEverySpelling([["ws_read", "notes/*", "deny"], ["ws_read", "*/keep.md", "ask"], ["ws_read", "notes/keep.md", "allow"]], "ws_read", "notes/keep.md", "allow");
});

test("random policies give one effect per file", () => {
  let seed = 20260930;
  const random = n => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  const parts = ["a", "A", "σ", "ς", "Σ", "\u00e9", "e\u0301", "\u00c9", "ß", "ss", "k", "\u212a", "/", ".", "b", "B"];
  const word = length => Array.from({ length }, () => parts[random(parts.length)]).join("");
  const effects = ["allow", "ask", "deny"];
  for (let round = 0; round < 3000; round += 1) {
    const resource = word(1 + random(5));
    const rules = Array.from({ length: 1 + random(4) }, () => {
      const base = random(3) ? spellings(resource)[random(8)] : word(1 + random(4));
      const cut = [...base];
      const pattern = random(2) ? base : cut.slice(0, random(cut.length + 1)).join("") + "*" + (random(2) ? cut.slice(cut.length - random(cut.length + 1)).join("") : "");
      return ["ws_read", pattern, effects[random(3)]];
    });
    const expected = evaluatePolicy(layer(...rules), "ws_read", resource).effect;
    sameForEverySpelling(rules, "ws_read", resource, expected);
  }
});

test("the documented last-match override still works", () => {
  const policy = layer(["ws_write", "*", "deny"], ["ws_write", "out/*", "allow"]);
  assert.equal(evaluatePolicy(policy, "ws_write", "out/a.txt").effect, "allow");
  assert.equal(evaluatePolicy(policy, "ws_write", "materials/a.txt").effect, "deny");
});

test("non-path resources keep exact matching", () => {
  assert.equal(evaluatePolicy(layer(["runtime_load", "Skill-A", "deny"]), "runtime_load", "skill-a").effect, "allow");
});
