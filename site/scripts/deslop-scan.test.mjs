import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { scanSources } from './deslop-scan-lib.mjs';
import {
  loadFixtureClaimInputs,
  validateFixtureClaims,
} from './fixture-claims.mjs';

const source = (path, content) => ({ path, content });
const rules = (sources) => scanSources(sources).map((failure) => failure.rule);
const hex = (value) => `#${value}`;
const repoRoot = new URL('../../', import.meta.url);

const GOOD_FIXTURE_CLAIMS = String.raw`
<section data-site-generalization>
  <article data-runtime-state="accepted"><span>已验收工作链</span></article>
  <article>
    <strong data-fixture-count="dossier-materials">20</strong><span>份卷宗材料</span>
    <strong data-fixture-count="timeline-events">47</strong><span>个事件</span>
    <strong data-fixture-count="party-nodes">14</strong><span>个主体节点</span>
    <strong data-fixture-count="contradiction-events">8</strong><span>个矛盾事件</span>
  </article>
  <article data-pm-finding-id="prd-finding-05" data-pm-defect-type="conflicting-requirement" data-pm-status="pending" data-runtime-state="catalog">
    <blockquote data-pm-clause>所有成员都能编辑路线图，但路线图只有负责人可以修改。</blockquote>
    <span data-pm-defect-label>冲突需求</span>
    <p data-pm-suggestion>区分评论、提议和正式修改，并给出唯一权限矩阵。</p>
    <span data-pm-disposition>待确认</span>
    <small>Schema catalog preview / 尚未接通运行链</small>
  </article>
</section>
`;

const fixtureFailures = (html = GOOD_FIXTURE_CLAIMS, mutate = () => {}) => {
  const inputs = JSON.parse(JSON.stringify(loadFixtureClaimInputs(repoRoot)));
  mutate(inputs);
  return validateFixtureClaims(html, inputs);
};

const GOOD_SITE_MOTION = String.raw`
document.documentElement.classList.add('js');
const revealTargets = [...document.querySelectorAll('.evidence-step, [data-reveal]')];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (reduceMotion || !('IntersectionObserver' in window)) {
  revealTargets.forEach((target) => target.classList.add('is-visible'));
} else {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.55 });
  revealTargets.forEach((target) => observer.observe(target));
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
  // SITE-CRAFT-1: the broadened reveal selector and the JS-off progressive-enhancement flag are part of the locked shape.
  assert.ok(rules([source('site/main.js', GOOD_SITE_MOTION.replace(', [data-reveal]', ''))]).includes('site-motion'));
  assert.ok(rules([source('site/main.js', GOOD_SITE_MOTION.replace("document.documentElement.classList.add('js');\n", ''))]).includes('site-motion'));
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

test('SITE-GEN fixture claims accept the authoritative Legal and PM snapshot', () => {
  assert.deepEqual(fixtureFailures(), []);
});

test('SITE-GEN rejects a 46-event page claim', () => {
  assert.ok(fixtureFailures(GOOD_FIXTURE_CLAIMS.replace('>47</strong>', '>46</strong>')).some((failure) => failure.includes('timeline-events')));
});

test('SITE-GEN rejects a deleted contradiction marker', () => {
  assert.ok(fixtureFailures(GOOD_FIXTURE_CLAIMS, (inputs) => {
    delete inputs.legal.timeline.events.find((event) => event.markers?.includes('contradiction')).markers;
  }).some((failure) => failure.includes('contradiction-events')));
});

test('SITE-GEN rejects a 15-party page claim', () => {
  assert.ok(fixtureFailures(GOOD_FIXTURE_CLAIMS.replace('>14</strong>', '>15</strong>')).some((failure) => failure.includes('party-nodes')));
});

test('SITE-GEN requires the contradiction-event unit instead of claiming eight contradictions', () => {
  assert.ok(fixtureFailures(GOOD_FIXTURE_CLAIMS.replace('个矛盾事件', '个矛盾')).some((failure) => failure.includes('矛盾事件')));
});

test('SITE-GEN rejects a PM UTF-16 anchor offset drift', () => {
  assert.ok(fixtureFailures(GOOD_FIXTURE_CLAIMS, (inputs) => {
    inputs.pm.prdReview.findings.find((finding) => finding.id === 'prd-finding-05').sourceAnchors[0].textRange.start += 1;
  }).some((failure) => failure.includes('UTF-16')));
});

test('SITE-GEN rejects a confirmed PM fixture presented as pending', () => {
  assert.ok(fixtureFailures(GOOD_FIXTURE_CLAIMS, (inputs) => {
    inputs.pm.prdReview.findings.find((finding) => finding.id === 'prd-finding-05').status = 'confirmed';
  }).some((failure) => failure.includes('pending')));
});

test('SITE-GEN rejects a live PM claim while the descriptor has no scenario', () => {
  const live = GOOD_FIXTURE_CLAIMS
    .replace('data-runtime-state="catalog"', 'data-runtime-state="live"')
    .replace('Schema catalog preview / 尚未接通运行链', 'Live / 已接通运行链');
  assert.ok(fixtureFailures(live).some((failure) => failure.includes('catalog')));
});

test('SITE-GEN rejects a PriorityScore fixture or score claim', () => {
  assert.ok(fixtureFailures(GOOD_FIXTURE_CLAIMS, (inputs) => {
    inputs.pm.fixtureFiles.push('artifacts/priority-score.json');
  }).some((failure) => failure.includes('PriorityScore')));
  assert.ok(fixtureFailures(GOOD_FIXTURE_CLAIMS.replace('</section>', '<p>PriorityScore · RICE 排序</p></section>'))
    .some((failure) => failure.includes('PriorityScore')));
});
