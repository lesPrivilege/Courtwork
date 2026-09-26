/* Order 3 · the body of one assistant segment, shared by Chat and Attention.
 *
 * While a segment grows, each snapshot is lexed once as a whole document and
 * split into its top-level blocks. Every block is rendered with that
 * document's reference definitions (`tokens.links`), through the same
 * sanitizing path as `markdown()`. A block keeps its DOM nodes while its source
 * is unchanged and, if it could use a reference (`[…]`), while the
 * definitions are unchanged too; only the other blocks are rendered again.
 * The last block may be unfinished (an open fence, a half list), so it is always
 * re-rendered. When the segment settles, the body is rendered once from the
 * final text, so settled output is exactly one `markdown()` of the canonical
 * text (CR-01: no per-token motion, no replay).
 *
 * D2(a) · while the reader's selection touches a growing body, its text is not
 * painted: the newest snapshot is kept and `Content updated` says so. When the
 * selection leaves, the newest text is painted once. Nothing else is frozen. */
import { marked } from "./vendor/marked.mjs";
import { el, markdown, markdownTokens } from "./ui-controls.mjs";

export const CONTENT_UPDATED = "Content updated";

const frozenBodies = new Set();
let listening = false;
function onSelectionChange() {
  for (const body of [...frozenBodies]) body.release();
}

function selectionTouches(node) {
  const selection = node.ownerDocument?.getSelection?.();
  if (!selection || selection.isCollapsed || !selection.rangeCount) return false;
  for (let i = 0; i < selection.rangeCount; i += 1) {
    if (selection.getRangeAt(i).intersectsNode?.(node)) return true;
  }
  return false;
}

/** Split Markdown into top-level blocks with their exact source. */
export function markdownBlocks(text) {
  return marked.lexer(String(text), { gfm: true }).map((token) => token.raw);
}

export function createAssistantBody({ key }) {
  const root = el("div", { className: "markdown-body" });
  const hint = el("p", { className: "form-help stream-body-hint", text: CONTENT_UPDATED, attrs: { role: "status" } });
  hint.hidden = true;
  let blocks = []; // [{ raw, refs, nodes }]
  let definitions = ""; // the reference definitions the blocks were drawn with
  let painted = null; // text currently in the DOM
  let settled = false;
  let waiting = null; // { text, settled } held while the selection is inside
  let held = false; // the selection was inside when the surface began a rebuild

  function renderBlock(token, index, links) {
    if (!token.raw.trim()) return [];
    const one = [token];
    one.links = links;
    return [...markdownTokens(one, { key: `${key}:b${index}` }).childNodes];
  }
  function paintGrowing(text) {
    const tokens = marked.lexer(text, { gfm: true });
    const links = tokens.links ?? {};
    const nextDefinitions = JSON.stringify(links);
    const definitionsChanged = nextDefinitions !== definitions;
    // Every block but the last is complete. Keep one whose source is unchanged
    // unless it could resolve a reference and the definitions have changed.
    const plan = tokens.map((token, i) => {
      const old = blocks[i];
      const reuse = Boolean(old) && i < tokens.length - 1 && old.raw === token.raw && !(definitionsChanged && old.refs);
      return { token, old, reuse };
    });
    blocks.forEach((block, i) => { if (!plan[i]?.reuse) for (const node of block.nodes) node.remove(); });
    // Insert the new blocks before the next kept one, from the end.
    const next = new Array(plan.length);
    let anchor = null;
    for (let i = plan.length - 1; i >= 0; i -= 1) {
      const { token, old, reuse } = plan[i];
      if (reuse) { next[i] = old; if (old.nodes.length) anchor = old.nodes[0]; continue; }
      const nodes = renderBlock(token, i, links);
      for (const node of nodes) root.insertBefore(node, anchor);
      if (nodes.length) anchor = nodes[0];
      next[i] = { raw: token.raw, refs: /\[[^\]]*\]/.test(token.raw), nodes };
    }
    blocks = next;
    definitions = nextDefinitions;
  }
  function paint(text, isSettled) {
    if (isSettled) {
      root.replaceChildren(...markdown(text, { key }).childNodes);
      blocks = [];
      definitions = "";
      settled = true;
    } else paintGrowing(text);
    painted = text;
  }
  const body = {
    root,
    hint,
    get text() { return painted; },
    get frozen() { return waiting !== null; },
    /** Show `text` for this segment; `settled` once its final has arrived. */
    update(text, { settled: isSettled = false } = {}) {
      text = String(text ?? "");
      if (settled && !isSettled) return; // a settled body never reopens
      if (text === painted && isSettled === settled) return;
      if (painted !== null && (held || selectionTouches(root))) {
        waiting = { text, settled: isSettled };
        hint.hidden = false;
        frozenBodies.add(body);
        if (!listening && root.ownerDocument) { root.ownerDocument.addEventListener("selectionchange", onSelectionChange); listening = true; }
        return;
      }
      paint(text, isSettled);
    },
    /** Paint the held snapshot once the selection has left this body. */
    release() {
      if (selectionTouches(root)) return;
      held = false;
      if (!waiting) return;
      const next = waiting;
      waiting = null;
      hint.hidden = true;
      frozenBodies.delete(body);
      paint(next.text, next.settled);
    },
    /** Before a surface detaches its rows: keep this body's text while the
     * selection is inside, until the surface has restored the selection. */
    holdIfSelected() {
      if (painted === null || !selectionTouches(root)) return;
      held = true;
      frozenBodies.add(body);
      if (!listening && root.ownerDocument) { root.ownerDocument.addEventListener("selectionchange", onSelectionChange); listening = true; }
    },
    dispose() { frozenBodies.delete(body); waiting = null; held = false; },
  };
  return body;
}

/** Bodies of one surface by stable key: a rebuild reuses a body whose text is
 * unchanged instead of parsing it again. `sweep()` drops bodies a full render
 * did not use. */
export function createBodyRegistry() {
  const bodies = new Map();
  let used = new Set();
  return {
    body(key, text, { settled = false } = {}) {
      let body = bodies.get(key);
      if (!body) { body = createAssistantBody({ key }); bodies.set(key, body); }
      body.update(text, { settled });
      used.add(key);
      return body;
    },
    get(key) { return bodies.get(key) ?? null; },
    /** Call before detaching the rows (D2 a across a rebuild). */
    holdSelection() { for (const body of bodies.values()) body.holdIfSelected(); },
    sweep() {
      for (const [key, body] of bodies) if (!used.has(key)) { body.dispose(); bodies.delete(key); }
      used = new Set();
    },
    clear() { for (const body of bodies.values()) body.dispose(); bodies.clear(); used = new Set(); },
  };
}
