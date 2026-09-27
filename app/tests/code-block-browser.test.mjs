/* CB-D1 · shared code blocks in a real headless Chrome: Chat, Attention and
 * the Markdown reader, against a disposable Host with the loopback fake
 * provider. Skips (and says so) without Chrome; set COURTWORK_CHROME. Evidence
 * runs write screenshots with `node app/scripts/code-block-density-browser.mjs --out <dir>`. */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { runCodeBlockDensity } from "../scripts/code-block-density-browser.mjs";

const CHROME = process.env.COURTWORK_CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

test("code blocks carry no constant header, keep Copy beside the code, and copy the exact authored bytes", { skip: existsSync(CHROME) ? false : `no Chrome at ${CHROME}` }, async () => {
  const record = await runCodeBlockDensity({ chromePath: CHROME });
  assert.deepEqual(record.pageErrors, []);
  const find = (surface, name) => record.cases.find((entry) => entry.surface === surface && entry.name === name);
  for (const entry of record.cases) {
    assert.equal(entry.blocks.length, 2, `${entry.surface} ${entry.name}: two blocks`);
    for (const block of entry.blocks) {
      const where = `${entry.surface} ${entry.name} (${block.lines} lines)`;
      assert.equal(block.toolbar, null, `${where}: no header row`);
      assert.ok(["Copy code", "Copied"].includes(block.copyName), `${where}: Copy keeps its name (or its transient feedback)`);
      assert.equal(block.copyOverPre, false, `${where}: Copy never sits over the code`);
      assert.ok(block.block.h <= block.pre.h + Math.max(0, block.copy.h + 16 - block.pre.h) + 2, `${where}: no chrome beyond the code and its Copy column`);
    }
  }
  // Readable code is not shrunk, and each surface keeps its established wrap policy.
  assert.deepEqual(find("chat", "desktop-1440-light").blocks[0].code, { size: "15px", line: "25.5px", family: "monospace", padTop: "12px", padLeft: "12px", whiteSpace: "pre" });
  assert.equal(find("chat", "desktop-1440-light").blocks[1].scroll.scrollWidth > find("chat", "desktop-1440-light").blocks[1].scroll.clientWidth, true, "a long Chat line scrolls");
  // Targets: the existing 28px fine-pointer control; the 44px narrow/coarse fallback.
  assert.equal(find("chat", "desktop-1440-light").blocks[0].copyTarget, 28);
  assert.equal(find("chat", "narrow-390-touch-light").blocks[0].copyTarget, 44);
  assert.equal(find("chat", "zoom-200-emulated-720").blocks[0].copyTarget, 44);
  // The screenshot's one-line command: one line of code, no header.
  assert.ok(find("chat", "desktop-1440-light").blocks[0].block.h <= 56);
  // Exact clipboard bytes by keyboard, with visible feedback and focus kept.
  for (const [surface, name, keyName] of [["chat", "desktop-1440-light", "copyOneLine"], ["chat", "desktop-1440-light", "copyMulti"], ["chat", "narrow-390-touch-light", "copyOneLine"], ["attention", "desktop-1440-light", "copyOneLine"], ["reader", "desktop-1440-light", "copyOneLine"]]) {
    const copied = find(surface, name)[keyName];
    assert.deepEqual([copied.focused, copied.exact, copied.bytes, copied.feedback, copied.stillFocused], [true, true, copied.expectedBytes, "Copied", true], `${surface} ${name} ${keyName}`);
  }
  for (const result of find("chat", "desktop-1440-light").selectScroll)
    assert.deepEqual(result, { selectedIsCode: true, selectedHasChrome: false, scrolledToEnd: true, overlapAfterScroll: false });
});
