import { copyAction } from './ui-controls.mjs';

const PROFILE = 'cw-markdown-block-v1';
const ALLOWED_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'del', 'code', 'pre', 'br', 'hr', 'blockquote', 'ol', 'ul', 'li', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td']);

function requireProjection(projection) {
  if (!projection || projection.schemaVersion !== 1 || projection.profile !== PROFILE || typeof projection.key !== 'string' || !Array.isArray(projection.blocks) || !Array.isArray(projection.outline) || typeof projection.source !== 'string') {
    throw new TypeError('This document uses an unsupported Markdown reader profile.');
  }
}

function make(doc, tag, className, text) {
  const element = doc.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function visibleText(nodes) {
  return nodes.map((node) => node?.tag === 'text' ? node.text : visibleText(node?.children ?? [])).join('');
}

function appendSemantic(doc, parent, node) {
  if (!node || typeof node !== 'object') return;
  if (node.tag === 'text') {
    parent.append(doc.createTextNode(typeof node.text === 'string' ? node.text : ''));
    return;
  }
  if (!ALLOWED_TAGS.has(node.tag)) {
    parent.append(doc.createTextNode(visibleText([node])));
    return;
  }
  const element = doc.createElement(node.tag);
  if (node.tag === 'a' && /^https?:\/\//i.test(node.href ?? '')) {
    element.href = node.href;
    element.target = '_blank';
    element.rel = 'noopener noreferrer';
  }
  if (node.tag === 'ol' && Number.isSafeInteger(node.start) && node.start > 0) element.start = node.start;
  for (const child of node.children ?? []) appendSemantic(doc, element, child);
  if (node.tag === 'pre') {
    const wrap = make(doc, 'div', 'code-block');
    const toolbar = make(doc, 'div', 'code-toolbar');
    toolbar.append(make(doc, 'span', '', 'Code'), copyAction(element.textContent, 'Copy code'));
    wrap.append(toolbar, element);
    parent.append(wrap);
    return;
  }
  parent.append(element);
}

/**
 * A complete, revision-fixed Markdown projection reader. The host owns fetching
 * and lifetime; this component deliberately keeps no network or persistence state.
 */
export function createMarkdownReader(container) {
  if (!(container instanceof Element)) throw new TypeError('A reader container is required.');
  const doc = container.ownerDocument;
  const lifetimeEvents = new AbortController();
  let buildEvents = null;
  let projection = null;
  let selectedId = null;
  let sourceMode = false;
  let findTerm = '';
  let destroyed = false;

  function clear() {
    buildEvents?.abort();
    buildEvents = null;
    container.replaceChildren();
  }
  function select(id, {focus = false} = {}) {
    selectedId = id;
    for (const block of container.querySelectorAll('[data-markdown-block]')) {
      const active = block.dataset.markdownBlock === id;
      block.classList.toggle('is-selected', active);
      block.setAttribute('aria-current', active ? 'true' : 'false');
    }
    const selected = projection?.blocks.find((block) => block.id === id);
    const inspector = container.querySelector('[data-markdown-inspector]');
    if (inspector) {
      inspector.replaceChildren();
      if (selected) {
        inspector.hidden = false;
        const sourceCopy = make(doc, 'div', 'code-block markdown-reader__source-copy');
        const toolbar = make(doc, 'div', 'code-toolbar');
        const label = make(doc, 'span', 'markdown-reader__inspector-label', `Source · code points ${selected.start}–${selected.end}`);
        const source = make(doc, 'pre', 'markdown-reader__raw-source');
        source.append(doc.createTextNode(selected.raw));
        toolbar.append(label, copyAction(selected.raw, 'Copy block source'));
        sourceCopy.append(toolbar, source);
        inspector.append(sourceCopy);
      } else inspector.hidden = true;
    }
    const target = container.querySelector(`[data-markdown-block="${CSS.escape(id)}"]`);
    if (target) {
      if (selected && inspector) target.after(inspector);
      target.scrollIntoView({block: 'nearest'});
      if (focus) target.focus();
    }
  }

  function applyFind() {
    const status = container.querySelector('[data-markdown-find-status]');
    if (sourceMode) {
      if (status) status.textContent = 'Find is available in rendered view.';
      return [];
    }
    const blocks = [...container.querySelectorAll('[data-markdown-block]')];
    const term = findTerm.trim().toLocaleLowerCase();
    const semanticText = new Map((projection?.blocks ?? []).map((block) => [block.id, visibleText(block.nodes).toLocaleLowerCase()]));
    const matches = term ? blocks.filter((block) => semanticText.get(block.dataset.markdownBlock)?.includes(term)) : [];
    for (const block of blocks) block.classList.toggle('is-match', matches.includes(block));
    if (status) status.textContent = term ? `${matches.length} matching block${matches.length === 1 ? '' : 's'}` : '';
    return matches;
  }

  function buildReader({focusMode = false} = {}) {
    clear();
    buildEvents = new AbortController();
    const root = make(doc, 'section', 'markdown-reader');
    root.setAttribute('aria-label', 'Read-only Markdown document');
    const toolbar = make(doc, 'header', 'markdown-reader__toolbar');
    const mode = make(doc, 'button', 'markdown-reader__mode', sourceMode ? 'Rendered view' : 'Raw source');
    mode.type = 'button';
    mode.setAttribute('aria-pressed', String(sourceMode));
    mode.addEventListener('click', () => { sourceMode = !sourceMode; buildReader({focusMode: true}); }, {signal: buildEvents.signal});
    const findLabel = make(doc, 'label', 'markdown-reader__find-label', 'Find');
    const find = make(doc, 'input', 'markdown-reader__find');
    find.type = 'search';
    find.name = 'markdown-find';
    find.autocomplete = 'off';
    find.value = findTerm;
    find.disabled = sourceMode;
    find.placeholder = sourceMode ? 'Available in rendered view' : 'Find in document';
    find.setAttribute('aria-describedby', 'markdown-find-status');
    const findStatus = make(doc, 'output', 'markdown-reader__find-status');
    findStatus.id = 'markdown-find-status';
    findStatus.dataset.markdownFindStatus = '';
    findStatus.setAttribute('aria-live', 'polite');
    findLabel.htmlFor = 'markdown-find-input';
    find.id = 'markdown-find-input';
    find.addEventListener('input', () => { findTerm = find.value; applyFind(); }, {signal: buildEvents.signal});
    find.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      const matches = applyFind();
      if (matches.length) {
        const index = matches.findIndex((block) => block.dataset.markdownBlock === selectedId);
        select(matches[(index + 1) % matches.length].dataset.markdownBlock, {focus: true});
      }
      event.preventDefault();
    }, {signal: buildEvents.signal});
    toolbar.append(mode, findLabel, find, findStatus);
    root.append(toolbar);

    if (sourceMode) {
      const source = make(doc, 'pre', 'markdown-reader__document-source');
      source.tabIndex = 0;
      source.setAttribute('aria-label', 'Raw Markdown source');
      source.append(doc.createTextNode(projection.source));
      root.append(source);
      container.append(root);
      applyFind();
      if (focusMode) mode.focus();
      return;
    }

    const layout = make(doc, 'div', 'markdown-reader__layout');
    const rail = make(doc, 'nav', 'markdown-reader__outline');
    rail.setAttribute('aria-label', 'Document outline');
    const outlineHeading = make(doc, 'div', 'markdown-reader__outline-title', 'Outline');
    rail.append(outlineHeading);
    if (projection.outline.length) {
      const list = make(doc, 'ol', 'markdown-reader__outline-list');
      for (const item of projection.outline) {
        const row = make(doc, 'li', 'markdown-reader__outline-item');
        row.style.setProperty('--outline-depth', String(Math.max(0, Number(item.depth ?? 1) - 1)));
        const button = make(doc, 'button', 'markdown-reader__outline-link', item.text || 'Untitled heading');
        button.type = 'button';
        button.addEventListener('click', () => select(item.id, {focus: true}), {signal: buildEvents.signal});
        row.append(button); list.append(row);
      }
      rail.append(list);
    } else rail.append(make(doc, 'p', 'markdown-reader__outline-empty', 'No headings'));

    const article = make(doc, 'article', 'markdown-reader__document');
    article.tabIndex = 0;
    article.setAttribute('aria-label', 'Rendered Markdown');
    for (const block of projection.blocks) {
      const blockElement = make(doc, 'section', 'markdown-reader__block');
      blockElement.dataset.markdownBlock = block.id;
      blockElement.tabIndex = 0;
      blockElement.setAttribute('aria-label', `Markdown ${block.type}, code points ${block.start} to ${block.end}`);
      for (const semanticNode of block.nodes) appendSemantic(doc, blockElement, semanticNode);
      blockElement.addEventListener('click', (event) => {
        if (event.target.closest('a, button')) return;
        select(block.id);
      }, {signal: buildEvents.signal});
      blockElement.addEventListener('keydown', (event) => {
        if (event.target !== blockElement) return;
        if (event.key === 'Enter' || event.key === ' ') { select(block.id); event.preventDefault(); }
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        const blocks = projection.blocks;
        const position = blocks.findIndex((item) => item.id === block.id);
        const next = blocks[position + (event.key === 'ArrowDown' ? 1 : -1)];
        if (next) { select(next.id, {focus: true}); event.preventDefault(); }
      }, {signal: buildEvents.signal});
      article.append(blockElement);
    }
    const inspector = make(doc, 'aside', 'markdown-reader__inspector');
    inspector.dataset.markdownInspector = '';
    inspector.setAttribute('aria-live', 'polite');
    inspector.hidden = true;
    layout.append(rail, article, inspector);
    root.append(layout);
    if (projection.warnings?.length) root.append(make(doc, 'p', 'markdown-reader__warning', projection.warnings.join(' ')));
    container.append(root);
    applyFind();
    if (selectedId && projection.blocks.some((block) => block.id === selectedId)) select(selectedId);
    if (focusMode) mode.focus();
  }

  function render(next) {
    if (destroyed) return;
    try { requireProjection(next); } catch (error) { errorState(error.message); throw error; }
    const changed = projection?.key !== next.key;
    projection = next;
    if (changed) { selectedId = null; sourceMode = false; findTerm = ''; }
    buildReader();
  }

  function loading() {
    if (destroyed) return;
    projection = null; selectedId = null; sourceMode = false; findTerm = '';
    clear();
    const status = make(doc, 'p', 'markdown-reader__status', 'Loading recorded Markdown…');
    status.setAttribute('role', 'status'); container.append(status);
  }

  function errorState(message) {
    if (destroyed) return;
    projection = null; selectedId = null; sourceMode = false; findTerm = '';
    clear();
    const error = make(doc, 'p', 'markdown-reader__error', message || 'The recorded Markdown could not be opened.');
    error.setAttribute('role', 'alert'); container.append(error);
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true; lifetimeEvents.abort(); projection = null; clear();
  }

  const onKeydown = (event) => {
    if (destroyed || !projection || sourceMode || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'f') return;
    const input = container.querySelector('.markdown-reader__find');
    if (input) { event.preventDefault(); input.focus(); input.select(); }
  };
  container.addEventListener('keydown', onKeydown, {signal: lifetimeEvents.signal});
  return {render, loading, error: errorState, destroy};
}
