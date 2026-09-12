// Presentation-only continuity. Keys include the session and immutable row id.
const rows = root => [...root.querySelectorAll('[data-reading-key]')];
const find = (root, key) => rows(root).find(node => node.dataset.readingKey === key);
function endpoint(root, node, offset) {
  const row = (node?.nodeType === 1 ? node : node?.parentElement)?.closest('[data-reading-key]');
  if (!row || !root.contains(row)) return null;
  const range = root.ownerDocument.createRange();
  range.selectNodeContents(row); range.setEnd(node, offset);
  return {key: row.dataset.readingKey, offset: range.toString().length};
}
function locate(root, point) {
  const row = find(root, point.key);
  if (!row) return null;
  const walker = root.ownerDocument.createTreeWalker(row, 4);
  let node, remaining = point.offset;
  while ((node = walker.nextNode())) {
    if (remaining <= node.textContent.length) return [node, remaining];
    remaining -= node.textContent.length;
  }
  return null;
}
export function captureChatReading(root) {
  if (!root.getBoundingClientRect || !root.ownerDocument?.createRange) return {anchor: null, selection: null};
  const top = root.getBoundingClientRect().top;
  const anchor = rows(root).find(node => node.getBoundingClientRect().bottom > top);
  const selection = root.ownerDocument.getSelection?.();
  const start = selection && !selection.isCollapsed ? endpoint(root, selection.anchorNode, selection.anchorOffset) : null;
  const end = start ? endpoint(root, selection.focusNode, selection.focusOffset) : null;
  return {
    anchor: anchor ? {key: anchor.dataset.readingKey, top: anchor.getBoundingClientRect().top - top} : null,
    selection: start && end ? {start, end, text: selection.toString()} : null,
  };
}
export function restoreChatReading(root, snapshot, {followLatest = false} = {}) {
  if (!snapshot) return;
  if (!followLatest && snapshot.anchor) {
    const anchor = find(root, snapshot.anchor.key);
    if (anchor) root.scrollTop += anchor.getBoundingClientRect().top - root.getBoundingClientRect().top - snapshot.anchor.top;
  }
  if (!snapshot.selection) return;
  const start = locate(root, snapshot.selection.start), end = locate(root, snapshot.selection.end);
  if (!start || !end) return;
  const selection = root.ownerDocument.getSelection?.();
  if (!selection?.setBaseAndExtent) return;
  const oldTop = root.scrollTop;
  selection.setBaseAndExtent(...start, ...end);
  // Changed source content must never silently become a different selection.
  if (selection.toString() !== snapshot.selection.text) selection.removeAllRanges();
  root.scrollTop = oldTop;
}
