import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";
const source = (
  await readFile(new URL("../../app/web/app.mjs", import.meta.url), "utf8")
)
  .replace(/^import[\s\S]*?from ["'][^"']+["'];\n/gm, "")
  .replace("void init();", "");
function fixture() {
  const nodes = {
    "composer-input": {
      value: "existing draft",
      disabled: false,
      readOnly: false,
      focus() {
        this.focused = true;
      },
    },
    "edit-message-input": { value: "revised input" },
  };
  let saves = 0,
    closed = 0;
  const sandbox = {
    console,
    window: { matchMedia: () => ({ matches: false }) },
    document: { getElementById: (id) => nodes[id] },
    save: () => saves++,
    close: () => closed++,
  };
  vm.runInNewContext(
    source +
      `\n scheduleDraftSave=save;closeDialog=close;showToast=()=>{};state.activeSessionId='s';state.editMessageCandidate={sessionId:'s'};state.unconfirmedRuns.set('s',{commandId:'c',input:'original'});window.api={state,useEditedMessage};`,
    sandbox,
  );
  return { ...sandbox.window.api, nodes, count: () => ({ saves, closed }) };
}
test("an edit from another session cannot replace the current draft", () => {
  const f = fixture();
  f.state.activeSessionId = "other";
  f.useEditedMessage();
  assert.equal(f.nodes["composer-input"].value, "existing draft");
  assert.equal(f.count().saves, 0);
});
test("an in-flight submission keeps its readonly composer protected", () => {
  const f = fixture();
  f.nodes["composer-input"].readOnly = true;
  f.useEditedMessage();
  assert.equal(f.nodes["composer-input"].value, "existing draft");
  assert.equal(f.count().closed, 0);
});
test("a new edit preserves unresolved run identity and only queues draft persistence", () => {
  const f = fixture();
  f.useEditedMessage();
  assert.equal(f.state.unconfirmedRuns.get("s").commandId, "c");
  assert.equal(f.state.unconfirmedRuns.get("s").input, "original");
  assert.equal(f.state.draftCache.get("s"), "revised input");
  assert.equal(f.state.draftRevisions.get("s"), 1);
  assert.deepEqual(f.count(), { saves: 1, closed: 1 });
  assert.equal(f.nodes["composer-input"].focused, true);
});

test('disabling a pending stop moves focus to the composer before native blur', () => {
  const document = {activeElement:null,getElementById:id=>nodes[id]};
  const nodes = {'composer-input':{value:'',focus(){document.activeElement=this}},'send-button':{},'cancel-run-button':{},'composer-run-hint':{}};
  Object.defineProperty(nodes['cancel-run-button'],'disabled',{set(value){if(value && document.activeElement===this) document.activeElement=null}});
  document.activeElement=nodes['cancel-run-button'];
  const sandbox={console,document,window:{matchMedia:()=>({matches:false})}};
  vm.runInNewContext(source+`\n state.activeSessionId='s';state.session={id:'s',draft:''};state.runs=[{id:'r',sessionId:'s',status:'running'}];state.pendingCancels.set('r',{});renderComposer();`,sandbox);
  assert.equal(document.activeElement,nodes['composer-input']);
  assert.equal(nodes['send-button'].hidden,true);
  assert.equal(nodes['cancel-run-button'].hidden,false);
});
