/* A small DOM for view tests. It is deliberately not a browser: it implements
 * the parts `app/web` actually uses — element construction, attributes, the
 * dataset, class lists, focus, bubbling events and simple selectors — so a view
 * module can be rendered and driven from `node --test` without a dependency.
 *
 * Two behaviours matter for the Attention triage tests and are modelled on the
 * real platform rather than on convenience:
 *   · an event dispatched on a node runs its listeners and then bubbles to each
 *     ancestor, which is how a keydown on a row reaches the list's handler;
 *   · `Enter` / `Space` on a button activates it, which is why the view adds no
 *     Enter handler of its own. */

class ClassList {
  constructor(node) { this.node = node; }
  get #names() { return new Set(String(this.node.className || '').split(/\s+/).filter(Boolean)); }
  #write(names) { this.node.className = [...names].join(' '); }
  contains(name) { return this.#names.has(name); }
  add(...names) { const set = this.#names; for (const name of names) set.add(name); this.#write(set); }
  remove(...names) { const set = this.#names; for (const name of names) set.delete(name); this.#write(set); }
  toggle(name, force) {
    const set = this.#names;
    const on = force === undefined ? !set.has(name) : Boolean(force);
    if (on) set.add(name); else set.delete(name);
    this.#write(set);
    return on;
  }
}

function parseSelector(selector) {
  return selector.split(',').map(part => {
    const compound = part.trim();
    const tag = compound.match(/^[a-zA-Z][\w-]*/)?.[0] ?? null;
    const classes = [...compound.matchAll(/\.([\w-]+)/g)].map(match => match[1]);
    const attrs = [...compound.matchAll(/\[([\w:-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\]]*)))?\]/g)]
      .map(match => ({ name: match[1], value: match[2] ?? match[3] ?? match[4] ?? null }));
    return { tag, classes, attrs };
  });
}

export class TinyNode {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName;
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.parentNode = null;
    this._text = '';
    this.className = '';
    this.value = '';
    this.checked = false;
    this.disabled = false;
  }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  get classList() { return new ClassList(this); }
  get isContentEditable() { return this.getAttribute('contenteditable') === 'true'; }
  append(...children) {
    for (const child of children.flat()) {
      if (child === null || child === undefined || child === false) continue;
      const node = typeof child === 'string' ? this.ownerDocument.createTextNode(child) : child;
      node.parentNode = this;
      this.children.push(node);
    }
  }
  replaceChildren(...children) {
    for (const child of this.children) child.parentNode = null;
    this.children = [];
    this.append(...children);
  }
  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter(child => child !== this);
    this.parentNode = null;
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  hasAttribute(name) { return this.attributes.has(name); }
  addEventListener(type, callback) {
    const callbacks = this.listeners.get(type) ?? [];
    callbacks.push(callback);
    this.listeners.set(type, callbacks);
  }
  dispatchEvent(event = {}) {
    const target = event.target ?? this;
    let defaultPrevented = false;
    const shaped = { ...event, target, preventDefault() { defaultPrevented = true; } };
    for (let node = this; node; node = node.parentNode)
      for (const callback of node.listeners.get(event.type) ?? []) callback(shaped);
    // Native activation: a button is operated by Enter and Space, so a view that
    // renders ordinary buttons needs no key handler to open a row.
    if (event.type === 'keydown' && !defaultPrevented && ['Enter', ' '].includes(event.key) &&
        String(this.tagName).toLowerCase() === 'button' && !this.disabled) this.click();
    return !defaultPrevented;
  }
  click() { if (!this.disabled) this.dispatchEvent({ type: 'click', target: this }); }
  focus() { this.ownerDocument.activeElement = this; }
  blur() { if (this.ownerDocument.activeElement === this) this.ownerDocument.activeElement = null; }
  contains(node) {
    if (!node) return false;
    if (node === this) return true;
    return this.children.some(child => child.contains?.(node));
  }
  matches(selector) {
    return parseSelector(selector).some(({ tag, classes, attrs }) =>
      (!tag || String(this.tagName).toLowerCase() === tag.toLowerCase()) &&
      classes.every(name => this.classList.contains(name)) &&
      attrs.every(({ name, value }) => value === null ? this.hasAttribute(name) : this.getAttribute(name) === value));
  }
  closest(selector) {
    for (let node = this; node; node = node.parentNode) if (node.matches?.(selector)) return node;
    return null;
  }
  querySelectorAll(selector) {
    const found = [];
    const visit = node => {
      for (const child of node.children) {
        if (child.matches?.(selector)) found.push(child);
        visit(child);
      }
    };
    visit(this);
    return found;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  get dataset() {
    const dataset = {};
    for (const [name, value] of this.attributes)
      if (name.startsWith('data-')) dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
    return dataset;
  }
}

export class TinyDocument {
  constructor() { this.activeElement = null; }
  createElement(tagName) { return new TinyNode(tagName, this); }
  createElementNS(_namespace, tagName) { return new TinyNode(tagName, this); }
  createTextNode(text) {
    const node = new TinyNode('#text', this);
    node.textContent = text;
    return node;
  }
}

export function withTinyDom(fn) {
  const previousDocument = globalThis.document;
  const previousCSS = globalThis.CSS;
  globalThis.document = new TinyDocument();
  globalThis.CSS = { escape: value => String(value).replaceAll('"', '\\"') };
  const container = document.createElement('main');
  return Promise.resolve()
    .then(() => fn(container))
    .finally(() => {
      if (previousDocument === undefined) delete globalThis.document;
      else globalThis.document = previousDocument;
      if (previousCSS === undefined) delete globalThis.CSS;
      else globalThis.CSS = previousCSS;
    });
}

export function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

export async function flush() {
  await Promise.resolve();
  await new Promise(resolve => setImmediate(resolve));
  await Promise.resolve();
}

/** A keydown on `node`, bubbling like the platform's. */
export function press(node, key) { return node.dispatchEvent({ type: 'keydown', key, target: node }); }

/** Polls `predicate` on real timers — for a view driven against a real server,
 * where a microtask flush is not enough to see the request finish. */
export async function waitFor(predicate, { timeout = 10_000, label = 'condition' } = {}) {
  const deadline = Date.now() + timeout;
  for (;;) {
    const value = predicate();
    if (value) return value;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${label}`);
    await new Promise(resolve => setTimeout(resolve, 5));
  }
}
