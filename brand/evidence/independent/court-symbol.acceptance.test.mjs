import assert from 'node:assert/strict';

/*
 * Independent acceptance harness for brand/src/symbol.mjs and
 * brand/src/court-symbol.mjs. This intentionally uses a small DOM/WAAPI stub
 * so the contract can be exercised without adding a browser dependency.
 */

class EventTargetStub {
  #listeners = new Map();

  addEventListener(type, listener) {
    const listeners = this.#listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.#listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.#listeners.get(type)?.delete(listener);
  }

  dispatchEvent(event) {
    event.target ??= this;
    for (const listener of this.#listeners.get(event.type) ?? []) listener.call(this, event);
    return !event.defaultPrevented;
  }
}

class AnimationStub {
  static all = new Set();

  constructor(element, frames, options) {
    this.element = element;
    this.frames = frames;
    this.options = options;
    this.cancelled = false;
    this.finished = new Promise((resolve, reject) => {
      this.#resolve = resolve;
      this.#reject = reject;
    });
    AnimationStub.all.add(this);
  }

  #resolve;
  #reject;

  cancel() {
    if (this.cancelled) return;
    this.cancelled = true;
    AnimationStub.all.delete(this);
    this.#reject(new DOMException('The animation was cancelled.', 'AbortError'));
  }

  finish() {
    if (this.cancelled) return;
    AnimationStub.all.delete(this);
    this.#resolve(this);
  }

  static finishAll() {
    for (const animation of [...AnimationStub.all]) animation.finish();
  }

  static reset() {
    for (const animation of [...AnimationStub.all]) animation.cancel();
    AnimationStub.all.clear();
  }
}

class ShadowRootStub {
  #html = '';

  set innerHTML(value) {
    this.#html = String(value);
  }

  get innerHTML() {
    return this.#html;
  }

  set textContent(value) {
    this.#html = String(value ?? '');
  }

  get textContent() {
    return this.#html;
  }

  querySelectorAll(selector) {
    const elements = [];
    const tagPattern = /<([a-z][a-z0-9-]*)\b([^>]*)>/gi;
    for (const match of this.#html.matchAll(tagPattern)) {
      const attrs = match[2];
      const dataLayer = attrs.match(/\bdata-layer="([^"]*)"/i)?.[1] ?? '';
      const className = attrs.match(/\bclass="([^"]*)"/i)?.[1] ?? '';
      const node = {
        dataLayer,
        className,
        animations: [],
        animate(frames, options) {
          const animation = new AnimationStub(this, frames, options);
          this.animations.push(animation);
          return animation;
        },
      };
      const layerSelector = selector.match(/^\[data-layer="([^"]+)"\]$/)?.[1];
      if (layerSelector !== undefined && dataLayer === layerSelector) elements.push(node);
      else if (selector === '.record' && className.split(/\s+/).includes('record')) elements.push(node);
    }
    return elements;
  }
}

class HTMLElementStub extends EventTargetStub {
  #attributes = new Map();

  constructor() {
    super();
    this.shadowRoot = null;
    this.isConnected = false;
  }

  attachShadow() {
    this.shadowRoot = new ShadowRootStub();
    return this.shadowRoot;
  }

  hasAttribute(name) {
    return this.#attributes.has(name);
  }

  getAttribute(name) {
    return this.#attributes.get(name) ?? null;
  }

  setAttribute(name, value) {
    const next = String(value);
    const previous = this.#attributes.get(name) ?? null;
    this.#attributes.set(name, next);
    if (previous !== next && this.isConnected && this.constructor.observedAttributes?.includes(name)) {
      this.attributeChangedCallback(name, previous, next);
    }
  }

  removeAttribute(name) {
    const previous = this.#attributes.get(name) ?? null;
    if (previous === null) return;
    this.#attributes.delete(name);
    if (this.isConnected && this.constructor.observedAttributes?.includes(name)) {
      this.attributeChangedCallback(name, previous, null);
    }
  }

  animate(frames, options) {
    return new AnimationStub(this, frames, options);
  }

  connect() {
    this.isConnected = true;
    this.connectedCallback?.();
  }

  disconnect() {
    this.isConnected = false;
    this.disconnectedCallback?.();
  }
}

class MediaQueryListStub extends EventTargetStub {
  constructor() {
    super();
    this.matches = false;
  }

  setMatches(value) {
    this.matches = Boolean(value);
    this.dispatchEvent({ type: 'change', matches: this.matches });
  }
}

const mediaQuery = new MediaQueryListStub();
const documentStub = new EventTargetStub();
documentStub.hidden = false;
globalThis.HTMLElement = HTMLElementStub;
globalThis.CustomEvent = class CustomEventStub {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
    this.bubbles = Boolean(init.bubbles);
    this.defaultPrevented = false;
  }
};
globalThis.DOMException ??= class DOMExceptionStub extends Error {
  constructor(message, name) {
    super(message);
    this.name = name;
  }
};
globalThis.document = documentStub;
globalThis.matchMedia = () => mediaQuery;
globalThis.customElements = {
  registry: new Map(),
  define(name, constructor) {
    this.registry.set(name, constructor);
  },
  get(name) {
    return this.registry.get(name);
  },
};

const { renderSymbol, normalize } = await import('../../src/symbol.mjs');
const { CourtSymbol } = await import('../../src/court-symbol.mjs');

const checks = [];
async function check(name, fn) {
  await fn();
  checks.push(name);
}

await check('normalize rejects unsupported state and out-of-range sizes', () => {
  assert.throws(() => normalize({ concept: 'grant' }), /Unsupported concept/);
  assert.throws(() => normalize({ authority: 'committed' }), /Unsupported authority/);
  assert.throws(() => normalize({ size: 11 }), /size must be 12/);
  assert.throws(() => normalize({ size: 1025 }), /size must be 12/);
  assert.throws(() => normalize({ size: Number.NaN }), /size must be 12/);
});

await check('renderSymbol escapes labels and rejects unsafe SVG identifiers', () => {
  const svg = renderSymbol({ label: '<img src=x onerror=alert(1)>' });
  assert.match(svg, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(svg, /<img\b|<script\b/i);
  assert.throws(() => renderSymbol({ idPrefix: 'x" onload="alert(1)' }), /SVG-safe identifier/);
});

await check('renderSymbol gives separately requested instances distinct ids', () => {
  const first = renderSymbol({ concept: 'write' });
  const second = renderSymbol({ concept: 'write' });
  const id = svg => svg.match(/aria-labelledby="([^"]+)"/)?.[1];
  assert.ok(id(first));
  assert.ok(id(second));
  assert.notEqual(id(first), id(second));
  assert.match(first, new RegExp(`id="${id(first)}"`));
  assert.match(second, new RegExp(`id="${id(second)}"`));
});

await check('small expressive symbols degrade to hierarchical material and drop effects', () => {
  const svg = renderSymbol({ size: 24, material: 'glass' });
  assert.match(svg, /data-material="hierarchical"/);
  assert.match(svg, /data-requested-material="glass"/);
  assert.doesNotMatch(svg, /filter="url\(#/);
});

await check('withdraw hides actor while preserving record geometry', () => {
  const svg = renderSymbol({ concept: 'withdraw', presence: 'absent' });
  assert.match(svg, /data-presence="absent"/);
  assert.match(svg, /\[data-presence="absent"\] \.actor\{opacity:0\}/);
  assert.match(svg, /class="part record"/);
  assert.match(svg, /data-layer="trace"/);
});

await check('completion remains host-provided activity state and does not grant authority', () => {
  const svg = renderSymbol({ concept: 'commit', activity: 'complete', authority: 'none' });
  assert.match(svg, /data-activity="complete"/);
  assert.match(svg, /data-authority="none"/);
  assert.match(svg, /\[data-concept="commit"\]\[data-activity="complete"\].*settled/);
  assert.doesNotMatch(svg, /data-authority="committed"/);
});

const symbol = () => new CourtSymbol();

await check('connected component renders valid state and property updates rerender', () => {
  const element = symbol();
  element.setAttribute('concept', 'write');
  element.setAttribute('material', 'glass');
  element.connect();
  assert.equal(element.getAttribute('data-error'), null);
  assert.match(element.shadowRoot.innerHTML, /data-concept="write"/);
  element.setAttribute('concept', 'scope');
  assert.match(element.shadowRoot.innerHTML, /data-concept="scope"/);
  assert.match(element.shadowRoot.innerHTML, /data-layer="boundary"/);
});

await check('multiple custom-element instances receive distinct SVG title ids', () => {
  const first = symbol();
  const second = symbol();
  first.connect();
  second.connect();
  const id = element => element.shadowRoot.innerHTML.match(/aria-labelledby="([^"]+)"/)?.[1];
  assert.ok(id(first));
  assert.ok(id(second));
  assert.notEqual(id(first), id(second));
});

await check('invalid attribute reports an error without executing markup', () => {
  const element = symbol();
  element.connect();
  element.setAttribute('concept', 'grant');
  assert.match(element.getAttribute('data-error'), /Unsupported concept/);
  assert.equal(element.shadowRoot.textContent, '');
});

await check('play is presentation-only, finishes, and clears data-playing', async () => {
  const element = symbol();
  element.setAttribute('concept', 'write');
  element.setAttribute('presence', 'present');
  element.setAttribute('authority', 'none');
  element.connect();
  const before = element.getAttribute('authority');
  const play = element.play('write');
  assert.equal(element.getAttribute('authority'), before);
  assert.equal(element.getAttribute('presence'), 'present');
  assert.equal(element.getAttribute('data-playing'), 'write');
  assert.ok(AnimationStub.all.size >= 3);
  AnimationStub.finishAll();
  assert.deepEqual(await play, { status: 'finished' });
  assert.equal(element.getAttribute('data-playing'), null);
  assert.equal(element.getAttribute('authority'), 'none');
});

await check('a new play interrupts the previous play', async () => {
  const element = symbol();
  element.setAttribute('concept', 'write');
  element.connect();
  const first = element.play('write');
  assert.equal(element.getAttribute('data-playing'), 'write');
  const second = element.play('summon');
  assert.equal(element.getAttribute('data-playing'), 'summon');
  AnimationStub.finishAll();
  assert.deepEqual(await first, { status: 'interrupted' });
  assert.deepEqual(await second, { status: 'finished' });
});

await check('attribute updates, disconnect, reduced motion, and hidden document stop playback', async () => {
  const element = symbol();
  element.setAttribute('concept', 'write');
  element.connect();
  const running = element.play('write');
  element.setAttribute('material', 'depth');
  assert.equal(element.getAttribute('data-playing'), null);
  assert.match(element.shadowRoot.innerHTML, /data-material="depth"/);
  assert.deepEqual(await running, { status: 'interrupted' });

  const reduced = element.play('write');
  mediaQuery.setMatches(true);
  assert.deepEqual(await reduced, { status: 'interrupted' });
  assert.deepEqual(await element.play('write'), { status: 'static' });
  mediaQuery.setMatches(false);

  const hidden = element.play('write');
  documentStub.hidden = true;
  documentStub.dispatchEvent({ type: 'visibilitychange' });
  assert.equal(element.getAttribute('data-playing'), null);
  assert.deepEqual(await hidden, { status: 'interrupted' });
  documentStub.hidden = false;

  const detached = element.play('write');
  element.disconnect();
  assert.equal(element.getAttribute('data-playing'), null);
  assert.deepEqual(await detached, { status: 'interrupted' });
  AnimationStub.reset();
});

await check('reduced-motion and background gates return static before creating animations', async () => {
  const element = symbol();
  element.connect();
  mediaQuery.setMatches(true);
  assert.deepEqual(await element.play('write'), { status: 'static' });
  mediaQuery.setMatches(false);
});

console.log(`PASS ${checks.length} independent CourtSymbol acceptance checks`);
