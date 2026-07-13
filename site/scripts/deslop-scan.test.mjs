import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { scanSources } from './deslop-scan-lib.mjs';

const source = (path, content) => ({ path, content });
const rules = (sources) => scanSources(sources).map((failure) => failure.rule);
const hex = (value) => `#${value}`;

const GOOD_SITE_MOTION = String.raw`
const steps = [...document.querySelectorAll('.evidence-step')];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (reduceMotion || !('IntersectionObserver' in window)) {
  steps.forEach((step) => step.classList.add('is-visible'));
} else {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.55 });
  steps.forEach((step) => observer.observe(step));
}
`;

test('raw colors are tied to an exact token consumer, including icon audit', () => {
  assert.deepEqual(rules([source('apps/desktop/src/icons/icon-audit.css',
    ':root { color: #0a2540; background: #f6f9fc; }\n.icon-audit-card { background: #fff; }')]), []);
  assert.ok(rules([source('apps/desktop/src/icons/icon-audit.css',
    '.icon-audit-card { color: #ff00ff; }')]).includes('raw-color'));
  assert.ok(rules([source('site/rogue.css', ':root { --rogue-neon: #ff00ff; }')]).includes('raw-color'));
  assert.ok(rules([source('site/rogue.js', `document.body.style.color = '${hex('123456')}';`)]).includes('raw-color'));
  assert.ok(rules([source('site/rogue.js', `document.body.style.setProperty('color', '${hex('123456')}');`)]).includes('raw-color'));
});

test('graph theme literals are exact token consumers, not a whole-file escape', () => {
  assert.deepEqual(rules([source('apps/desktop/src/workbench/graph-theme.ts',
    `export const graphTokens = { background: '${hex('FFFFFF')}', amber: '${hex('D97706')}' } as const;`)]), []);
  assert.ok(rules([source('apps/desktop/src/workbench/graph-theme.ts',
    `export const graphTokens = { background: '${hex('ff00ff')}' } as const;`)]).includes('raw-color'));
});

test('shadow allowlist binds file, selector, property, and exact token value', () => {
  const good = source('apps/desktop/src/styles.css',
    '.case-rail.surface-float, .surface-card-raised, .rail-module, .scroll-latest-button, .attachment-chip { box-shadow: var(--elevation-shadow); }');
  assert.deepEqual(rules([good]), []);
  assert.ok(rules([source('apps/desktop/src/styles.css',
    '.feature-card { box-shadow: var(--elevation-shadow); }')]).includes('shadow'));
  assert.ok(rules([source('site/rogue.css',
    '.feature-card { box-shadow: 0 12px 30px rgba(0,0,0,.2); }')]).includes('shadow'));
});

test('8/12/16 radius values remain inside exact approved domains', () => {
  assert.deepEqual(rules([source('apps/desktop/src/styles.css',
    '.composer-shell { border-radius: 12px; }\n.rail-segment { border-radius: 8px; }')]), []);
  assert.ok(rules([source('apps/desktop/src/styles.css',
    '.feature-card { border-radius: 16px; }')]).includes('radius'));
  assert.ok(rules([source('site/rogue.css',
    '.feature-card { border-radius: 24px; }')]).includes('radius'));
});

test('gradient allowlist checks the complete value, including internal colors', () => {
  assert.deepEqual(rules([source('apps/desktop/src/styles.css',
    '.usage-ring { background: conic-gradient(var(--slate-graphic) var(--usage), var(--border) 0); }')]), []);
  assert.ok(rules([source('apps/desktop/src/icons/icon-audit.css',
    '.icon-audit figure > span { background-image: linear-gradient(#e3e9ef 1px, transparent 1px), linear-gradient(90deg, #e3e9ef 1px, transparent 1px); }')]).includes('raw-color'));
  assert.ok(rules([source('apps/desktop/src/styles.css',
    '.usage-ring { background: conic-gradient(#ff00ff, #00ff00); }')]).includes('gradient'));
  assert.ok(rules([source('site/rogue.css',
    '.hero { background: linear-gradient(red, blue); }')]).includes('gradient'));
});

test('L1 nesting detects default SurfaceCard, raised elevation, and static className expressions', () => {
  assert.ok(rules([source('apps/desktop/src/Nested.tsx',
    'export const Nested = () => <SurfaceCard><SurfaceCard /></SurfaceCard>;')]).includes('l1-nesting'));
  assert.ok(rules([source('apps/desktop/src/Nested.tsx',
    'export const Nested = () => <SurfaceCard elevation="raised"><div className={"surface-card-raised"} /></SurfaceCard>;')]).includes('l1-nesting'));
  assert.deepEqual(rules([source('apps/desktop/src/Siblings.tsx',
    'export const Siblings = () => <><SurfaceCard /><SurfaceCard elevation="raised" /></>;')]), []);
  assert.ok(rules([source('site/index.html',
    '<div class="mac-window"><section class="feature-card">nested</section></div>')]).includes('l1-nesting'));
});

test('archive references cover markdown, URL, fetch, import, require, and path consumers', () => {
  const archive = ['..', 'archive', 'legacy.json'].join('/');
  const directArchive = ['archive', 'legacy.json'].join('/');
  const archiveName = ['arch', 'ive'].join('');
  const cases = [
    source('docs/live.md', `[legacy](${archive})`),
    source('docs/direct-live.md', `[legacy](${directArchive})`),
    source('site/live.js', `fetch('${archive}')`),
    source('site/direct-live.js', `fetch('${directArchive}')`),
    source('site/live.js', `import data from '${archive}'`),
    source('site/direct-live.js', `import data from '${directArchive}'`),
    source('site/live.cjs', `require('${archive}')`),
    source('site/direct-live.cjs', `require('${directArchive}')`),
    source('site/live.js', `new URL('${archive}', import.meta.url)`),
    source('site/direct-live.js', `new URL('${directArchive}', import.meta.url)`),
    source('site/direct-live.html', `<a href="${directArchive}">legacy</a><img src="${directArchive}">`),
    source('site/live.mjs', `readFile(path.resolve('${archiveName}', 'legacy.json'))`),
  ];
  for (const fixture of cases) assert.ok(rules([fixture]).includes('archive-reference'), fixture.content);
  assert.deepEqual(rules([source('docs/policy.md', '历史材料只在 `archive/`，现行文档不得引用归档内容。')]), []);
});

test('site motion is an exact observer/reduced-motion AST shape', () => {
  assert.deepEqual(rules([source('site/main.js', GOOD_SITE_MOTION)]), []);
  assert.ok(rules([source('site/main.js', `${GOOD_SITE_MOTION}\nrequestAnimationFrame(() => confetti());`)]).includes('site-motion'));
  assert.ok(rules([source('site/main.js', GOOD_SITE_MOTION.replace('entry.target', 'document.body'))]).includes('site-motion'));
  assert.ok(rules([source('site/main.js', GOOD_SITE_MOTION.replace('observer.unobserve(entry.target);', 'entry.target.animate([], {});'))]).includes('site-motion'));
});

test('press feedback is restricted, tactile, keyboard-visible, and reduced-motion safe', () => {
  const good = source('apps/desktop/src/styles.css', String.raw`
:root { --motion-press: 120ms; }
button:focus-visible { outline: 2px solid var(--blue-graphic); }
:is(.primary-button, .scene-primary, .continuation-button, .question-option, .composer-send, .composer-icon-button, .icon-button, .copy-button, .case-archive-button, .window-chrome-button, .collapse-right-button, .rail-seam-toggle, .workspace-edge-control, .model-config-trigger, .shortcut-trigger):active:not(:focus-visible):not(:disabled):not(.is-disabled-feature) { transform: scale(.98); transition-duration: var(--motion-press); }
@media (prefers-reduced-motion: reduce) { :is(.primary-button, .scene-primary, .continuation-button, .question-option, .composer-send, .composer-icon-button, .icon-button, .copy-button, .case-archive-button, .window-chrome-button, .collapse-right-button, .rail-seam-toggle, .workspace-edge-control, .model-config-trigger, .shortcut-trigger):active:not(:focus-visible):not(:disabled):not(.is-disabled-feature) { transform: none; } }
`);
  assert.deepEqual(rules([good]), []);
  assert.ok(rules([source('apps/desktop/src/styles.css',
    '.data-row:active { transform: scale(.98); transition-duration: 120ms; }')]).includes('press-feedback'));
  assert.ok(rules([source('apps/desktop/src/styles.css',
    '.primary-button:active { transform: scale(.9); transition-duration: 300ms; }')]).includes('press-feedback'));
});

test('popover motion is tied to direction and has a reduced-motion branch', () => {
  const good = source('apps/desktop/src/styles.css', String.raw`
.case-card .archive-popover { animation: popover-from-top var(--motion-overlay) var(--motion-overlay-ease) both; transform-origin: top right; }
@keyframes popover-from-top { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
@media (prefers-reduced-motion: reduce) { .case-card .archive-popover { animation: none; transform: none; } }
`);
  assert.deepEqual(rules([good]), []);
  assert.ok(rules([source('apps/desktop/src/styles.css',
    '.archive-popover { animation: spin 2s linear infinite; }')]).includes('popover-motion'));
  assert.ok(rules([source('apps/desktop/src/styles.css',
    '.popover { animation: popover-from-top 120ms ease-out both; transform-origin: top left; }')]).includes('popover-motion'));
  assert.ok(rules([source('apps/desktop/src/styles.css',
    '.cell-peek { animation: popover-from-top 120ms ease-out both; transform-origin: top left; }')]).includes('popover-motion'));
});

test('placeholder scaffolding and generic marketing copy remain red', () => {
  assert.ok(rules([source('site/index.html', '<section><b>01</b><p>Q</p></section>')]).includes('placeholder-scaffold'));
  assert.ok(rules([source('site/index.html', '<p>一站式赋能，打造革命性体验。</p>')]).includes('generic-copy'));
});

test('Pages deploy executes the complete root guard instead of the scanner alone', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/pages.yml', import.meta.url), 'utf8');
  assert.match(workflow, /run:\s*pnpm site:guard/);
  assert.doesNotMatch(workflow, /run:\s*node site\/scripts\/deslop-scan\.mjs/);
});
