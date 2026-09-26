/* Order 3 · the body of one assistant segment, shared by Chat and Attention.
 *
 * While a segment grows, each snapshot is split into Markdown blocks. Blocks
 * whose source is unchanged keep their DOM nodes; only the changed tail is
 * rendered again, through the same sanitizing `markdown()` as everything else.
 * The last block may be unfinished (an open fence, a half list), so it is always
 * re-rendered. When the segment settles, the body is rendered once from the
 * final text, so settled output is exactly one `markdown()` of the canonical
 * text (CR-01: no per-token motion, no replay).
 *
 * D2(a) · while the reader's selection touches a growing body, its text is not
 * painted: the newest snapshot is kept and `Content updated` says so. When the
 * selection leaves, the newest text is painted once. Nothing else is frozen. */
import { marked } from "./vendor/marked.mjs";
import { el, markdown } from "./ui-controls.mjs";

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
  let blocks = []; // [{ raw, nodes }]
  let painted = null; // text currently in the DOM
  let settled = false;
  let waiting = null; // { text, settled } held while the selection is inside
  let held = false; // the selection was inside when the surface began a rebuild

  function renderBlock(raw, index) {
    if (!raw.trim()) return [];
    return [...markdown(raw, { key: `${key}:b${index}` }).childNodes];
  }
  function paintGrowing(text) {
    const raws = markdownBlocks(text);
    let keep = 0;
    // Every block but the last is complete; keep those whose source is unchanged.
    while (keep < blocks.length && keep < raws.length - 1 && blocks[keep].raw === raws[keep]) keep += 1;
    for (const block of blocks.slice(keep)) for (const node of block.nodes) node.remove();
    blocks = blocks.slice(0, keep);
    for (let i = keep; i < raws.length; i += 1) {
      const nodes = renderBlock(raws[i], i);
      root.append(...nodes);
      blocks.push({ raw: raws[i], nodes });
    }
  }
  function paint(text, isSettled) {
    if (isSettled) {
      root.replaceChildren(...markdown(text, { key }).childNodes);
      blocks = [];
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
