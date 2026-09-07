// Author-side deterministic controller tests; real browser evidence is recorded separately.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
const source = await readFile(new URL('../../app/web/app.mjs', import.meta.url), 'utf8');
function fixture() {
  const nodes = new Map();
  const listeners = new Map();
  const doc = { activeElement: null, body: {},
    getElementById: id => node(id),
    querySelector: () => [...nodes.values()].find(n => n.id.endsWith('-dialog') && n.open) || null,
    querySelectorAll: () => ['runtime-dialog','project-dialog','session-dialog'].map(node),
    addEventListener: (k, fn) => listeners.set(k, fn),
  };
  function node(id) {
    if (nodes.has(id)) return nodes.get(id);
    const attrs = new Map(), events = new Map(), classes = new Set();
    const n = { id, events, tabIndex: 0, hidden: false, inert: false,
      classList: { toggle: (k,v) => v ? classes.add(k) : classes.delete(k) },
      setAttribute: (k,v) => attrs.set(k,v), getAttribute: k => attrs.get(k) ?? null, removeAttribute: k => attrs.delete(k),
      addEventListener: (k,f) => { const fs = events.get(k) || []; fs.push(f); events.set(k,fs); },
      focus: () => { if (!n.inert) doc.activeElement = n; },
      contains: x => x === n || (id === 'surface-panel' && ['surface-preview-tab','surface-expand-button','close-surface-button','surface-content'].includes(x?.id)),
      querySelector: q => q === '.sidebar' ? node('sidebar') : node('chat'),
      querySelectorAll: () => ['surface-preview-tab','surface-expand-button','close-surface-button','surface-content'].map(node),
      matches: () => false, closest: () => null, getClientRects: () => [{}],
    };
    nodes.set(id,n); return n;
  }
  const media = { matches: true, addEventListener: (_,fn) => { media.change = fn; } };
  const sandbox = { document: doc, window: { matchMedia: () => media, addEventListener() {} },
    getComputedStyle: () => ({visibility:'visible'}), setTimeout, clearTimeout, console,
    localStorage: {setItem() {}}, AbortController,
  };
  const ctx = vm.createContext(sandbox);
  vm.runInContext(source.replace('void init();','') + `
    currentSession = () => ({ id: 'session-a' });
    writeUiState = () => {};
    loadSurface = () => new Promise(resolve => { window.finishRead = resolve; });
    window.test = { state, renderSurfaceVisibility, handleSurfaceEscape, closeSurface, setSurfaceExpanded };
    wireEvents();`,ctx);
  const api = sandbox.window.test;
  const click = id => { node(id).focus(); for (const fn of node(id).events.get('click') || []) fn({}); };
  const key = (key, shiftKey=false) => { const e = {key,shiftKey,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}}; api.handleSurfaceEscape(e); return e; };
  return {node,doc,media,api,click,key,win:sandbox.window};
}
test('ordinary narrow sheet isolates background; closing makes retained content inert', () => {
  const f=fixture(); f.api.renderSurfaceVisibility();
  assert.equal(f.node('chat').inert,true); assert.equal(f.node('sidebar').inert,true);
  assert.equal(f.doc.activeElement.id,'surface-preview-tab');
  f.key('Escape'); assert.equal(f.api.state.surface.open,false);
  assert.equal(f.node('surface-panel').inert,true); assert.equal(f.doc.activeElement.id,'show-surface-button');
});
test('keyboard wraps in both directions', () => {
  const f=fixture(); f.api.renderSurfaceVisibility();
  assert.equal(f.key('Tab',true).defaultPrevented,true); assert.equal(f.doc.activeElement.id,'surface-content');
  f.key('Tab'); assert.equal(f.doc.activeElement.id,'surface-preview-tab');
});
test('one Escape restores expanded sheet; second closes it', () => {
  const f=fixture(); f.api.renderSurfaceVisibility(); f.api.setSurfaceExpanded(true);
  assert.equal(f.node('surface-expand-button').getAttribute('aria-label'),'Restore work surface');
  f.key('Escape'); assert.equal(f.api.state.surface.expanded,false); assert.equal(f.api.state.surface.open,true);
  f.key('Escape'); assert.equal(f.api.state.surface.open,false);
});
test('desktop split is nonmodal; expanded desktop is modal', () => {
  const f=fixture(); f.media.matches=false; f.api.renderSurfaceVisibility();
  assert.equal(f.node('chat').inert,false);
  assert.equal(f.key('Escape').defaultPrevented,true); assert.equal(f.api.state.surface.open,false);
  f.click('show-surface-button');
  f.api.setSurfaceExpanded(true); assert.equal(f.node('chat').inert,true);
  f.key('Escape'); assert.equal(f.node('chat').inert,false); assert.equal(f.api.state.surface.open,true);
});
test('breakpoint transitions transfer focus only when entering modality', () => {
  const f=fixture(); f.media.matches=false; f.api.renderSurfaceVisibility(); f.node('chat').focus();
  f.media.matches=true; f.media.change(); assert.equal(f.doc.activeElement.id,'surface-preview-tab');
  f.media.matches=false; f.media.change(); assert.equal(f.node('chat').inert,false);
});
test('native dialog owns Escape and Tab; closing restores sheet focus', () => {
  const f=fixture(); f.node('runtime-dialog').open=true; f.node('runtime-dialog').focus(); f.api.renderSurfaceVisibility();
  assert.equal(f.key('Escape').defaultPrevented,false); assert.equal(f.key('Tab').defaultPrevented,false);
  assert.equal(f.doc.activeElement.id,'runtime-dialog');
  f.node('runtime-dialog').open=false;
  for(const fn of f.node('runtime-dialog').events.get('close')) fn();
  assert.equal(f.doc.activeElement.id,'surface-preview-tab'); assert.equal(f.api.state.surface.open,true);
});
test('late surface read cannot steal focus after close or after user moves on', async () => {
  const f=fixture(); f.api.closeSurface(); f.click('show-surface-button');
  assert.equal(f.doc.activeElement.id,'surface-preview-tab');
  f.api.closeSurface(); f.win.finishRead(); await Promise.resolve();
  assert.equal(f.doc.activeElement.id,'show-surface-button');
  f.media.matches=false; f.click('show-surface-button'); f.node('composer-input').focus();
  f.win.finishRead(); await Promise.resolve(); assert.equal(f.doc.activeElement.id,'composer-input');
});
test('closing preserves renderer owner, local drafts, and run state', () => {
  const f=fixture(); const mounted={localDraft:'renderer draft'};
  f.api.state.surface.mounted=mounted; f.api.state.draftCache.set('session-a','unsent');
  f.api.state.runs=[{id:'run-a',status:'running'}]; f.api.closeSurface();
  assert.equal(f.api.state.surface.mounted,mounted); assert.equal(f.api.state.draftCache.get('session-a'),'unsent');
  assert.equal(f.api.state.runs[0].status,'running');
});

test('surface ignores Escape during IME composition', () => {
  const f=fixture(); f.api.renderSurfaceVisibility();
  const event={key:'Escape',isComposing:true,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};
  f.api.handleSurfaceEscape(event); assert.equal(f.api.state.surface.open,true); assert.equal(event.defaultPrevented,false);
});
