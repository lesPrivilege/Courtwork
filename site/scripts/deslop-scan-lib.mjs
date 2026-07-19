import { readFileSync } from 'node:fs';
import { brotliDecompressSync } from 'node:zlib';

const repoRoot = new URL('../../', import.meta.url);
const tokenDocument = JSON.parse(readFileSync(new URL('docs/design/tokens.json', repoRoot), 'utf8'));

const colorPattern = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/gi;
const gradientPattern = /(?:linear|radial|conic)-gradient\(/i;
const highRadiusTokens = new Set(['8px', '12px', '16px']);
const ordinaryRadiusPattern = /^(?:0|1px|2px|3px|4px(?:\s*!important)?|6px|50%|inherit)$/;

const normalizePath = (value) => value.replaceAll('\\', '/').replace(/^\.\//, '');
const normalizeSelector = (value) => value.trim().replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ');
const expandHex = (value) => {
  const body = value.slice(1).toLowerCase();
  if (body.length === 3 || body.length === 4) return `#${[...body].map((part) => part + part).join('')}`;
  return `#${body}`;
};
const normalizeCssValue = (value) => value
  .replace(/#[0-9a-f]{3,8}\b/gi, (match) => expandHex(match))
  .replace(/\s+/g, ' ')
  .replace(/\s*,\s*/g, ',')
  .trim()
  .toLowerCase();

function tokenAt(path) {
  let value = tokenDocument;
  for (const segment of path.split('.')) value = value?.[segment];
  if (value && typeof value === 'object') value = value.resolved ?? value.value ?? value.graphic ?? value.fg ?? value.bg;
  if (typeof value !== 'string') throw new Error(`DESLOP token path has no string value: ${path}`);
  return value;
}

const colorEntry = (file, selector, property, value) => [
  `${file}|${normalizeSelector(selector)}|${property}`,
  normalizeCssValue(value),
];

const desktopRootColors = {
  color: 'color.text.primary.value',
  background: 'color.bg.app.value',
  '--bg-app': 'color.bg.app.value',
  '--bg-surface': 'color.bg.surface.value',
  '--bg-raised': 'color.bg.raised.value',
  '--bg-hover': 'color.bg.hover.value',
  '--control-hover': 'color.bg.controlHover.value',
  '--bg-selected': 'color.bg.selected.value',
  '--text-primary': 'color.text.primary.value',
  '--text-secondary': 'color.text.secondary.value',
  '--text-tertiary': 'color.text.tertiary.value',
  '--text-disabled': 'color.text.disabled.value',
  '--border': 'color.border.hairline.value',
  '--border-strong': 'color.border.strong.value',
  '--action-primary-hover': 'color.action.primaryHoverBg.value',
  '--generated': 'color.semantic.provenance.generatedBg.value',
  '--verified': 'color.semantic.provenance.verifiedBg.value',
  '--red-graphic': 'color.semantic.severity.high.graphic',
  '--red-fg': 'color.semantic.severity.high.fg',
  '--red-bg': 'color.semantic.severity.high.bg',
  '--amber-graphic': 'color.semantic.severity.medium.graphic',
  '--amber-fg': 'color.semantic.severity.medium.fg',
  '--amber-bg': 'color.semantic.severity.medium.bg',
  '--text-inverse': 'color.text.inverse.value',
  '--blue-graphic': 'color.semantic.revision.insert.graphic',
  '--blue-fg': 'color.semantic.revision.insert.fg',
  '--blue-bg': 'color.semantic.revision.insert.bg',
  '--green-graphic': 'color.semantic.gate.confirmed.graphic',
  '--green-fg': 'color.semantic.gate.confirmed.fg',
  '--green-bg': 'color.semantic.gate.confirmed.bg',
  '--slate-graphic': 'color.semantic.severity.low.graphic',
  '--zhu-graphic': 'color.line.settled.value',
  '--slate-fg': 'color.semantic.severity.low.fg',
  '--slate-bg': 'color.semantic.severity.low.bg',
};

// —— site 侧色板：磁青宗 · 按 token 名绑定（SITE-CRAFT-2 磁青宗批，2026-07-19 解冻）——
// B1 分治裁定②立的 `siteFrozenColors` 按值冻结表，到期条件是「SITE 磁青宗批置换 site 色板」。
// 该条件已成立，本表整体删除，改为下表按**名**绑定 `themes.dark`：站与壳 dark 同宗、同源，
// 色值只剩 tokens.json 一份真源，站面门禁随 token 改动即刻传导，不再存在第二份色值清单。
//
// 命名同步（速裁「site 仅同步 token 命名」的终局形态）：site 变量名一律取 token 路径末段，
// 退役 `--ink`/`--focus`/`--danger` 三个站面私名（分别归位 --text-primary/--border-focus/--red-fg）。
// `--gold`（泥金）绑到 `semantic.amber.fg`：Q7 裁定泥金在壳侧降格为琥珀 dark-fg 轨、
// 「hero 语义只留站面」——同一个值，站读作泥金、壳读作琥珀，真源仍只有一处。
const siteDarkColors = {
  '--bg-app': 'themes.dark.bg.app.value',
  '--bg-surface': 'themes.dark.bg.surface.value',
  '--bg-raised': 'themes.dark.bg.raised.value',
  '--text-primary': 'themes.dark.text.primary.value',
  '--text-secondary': 'themes.dark.text.secondary.value',
  '--text-tertiary': 'themes.dark.text.tertiary.value',
  '--text-inverse': 'themes.dark.text.inverse.value',
  '--border-hairline': 'themes.dark.border.hairline.value',
  '--border-strong': 'themes.dark.border.strong.value',
  '--border-focus': 'themes.dark.border.focus.value',
  '--red-fg': 'themes.dark.semantic.red.fg',
  '--zhu-graphic': 'themes.dark.semantic.zhu.graphic',
  '--zhu-fg': 'themes.dark.semantic.zhu.fg',
  '--gold': 'themes.dark.semantic.amber.fg',
};

// og.html 是 og.png 的渲染源，同批换宗；变量名与 site/styles.css 同规，同样按名绑定。
const siteOgColors = {
  '--bg-app': 'themes.dark.bg.app.value',
  '--bg-surface': 'themes.dark.bg.surface.value',
  '--text-primary': 'themes.dark.text.primary.value',
  '--text-secondary': 'themes.dark.text.secondary.value',
  '--text-tertiary': 'themes.dark.text.tertiary.value',
  '--border-hairline': 'themes.dark.border.hairline.value',
};

const cssColorAllowlist = new Map([
  ...Object.entries(desktopRootColors).map(([property, path]) => colorEntry('apps/desktop/src/styles.css', ':root', property, tokenAt(path))),
  colorEntry('apps/desktop/src/styles.css', ':root', '--elevation-shadow', tokenAt('elevation.shadow.value')),
  ...Object.entries(siteDarkColors).map(([property, path]) => colorEntry('site/styles.css', ':root', property, tokenAt(path))),
  ...Object.entries(siteOgColors).map(([property, path]) => colorEntry('site/og.html', ':root', property, tokenAt(path))),
  colorEntry('site/styles.css', ':root', '--mac-close', '#FF5F57'),
  colorEntry('site/styles.css', ':root', '--mac-minimize', '#FEBC2E'),
  colorEntry('site/styles.css', ':root', '--mac-zoom', '#28C840'),
  colorEntry('apps/desktop/src/icons/icon-audit.css', ':root', 'color', tokenAt('color.text.primary.value')),
  colorEntry('apps/desktop/src/icons/icon-audit.css', ':root', 'background', tokenAt('color.bg.app.value')),
  colorEntry('apps/desktop/src/icons/icon-audit.css', ':root', '--audit-border', tokenAt('color.border.hairline.value')),
  colorEntry('apps/desktop/src/icons/icon-audit.css', 'body', 'background', tokenAt('color.bg.app.value')),
  colorEntry('apps/desktop/src/icons/icon-audit.css', '.icon-audit > header', 'border-bottom', `1px solid ${tokenAt('color.border.strong.value')}`),
  colorEntry('apps/desktop/src/icons/icon-audit.css', '.icon-audit > header span, .icon-audit > header p', 'color', tokenAt('color.text.tertiary.value')),
  colorEntry('apps/desktop/src/icons/icon-audit.css', '.icon-audit-card', 'border', `1px solid ${tokenAt('color.border.strong.value')}`),
  colorEntry('apps/desktop/src/icons/icon-audit.css', '.icon-audit-card', 'background', tokenAt('color.bg.raised.value')),
  colorEntry('apps/desktop/src/icons/icon-audit.css', '.icon-audit-title code, .icon-audit-card small', 'color', tokenAt('color.text.tertiary.value')),
  colorEntry('apps/desktop/src/icons/icon-audit.css', '.icon-audit figure > span', 'border', `1px solid ${tokenAt('color.border.hairline.value')}`),
  colorEntry('apps/desktop/src/icons/icon-audit.css', '.icon-audit figure > span', 'background-color', tokenAt('color.bg.raised.value')),
  colorEntry('apps/desktop/src/icons/icon-audit.css', '.icon-audit figure > span', 'color', tokenAt('color.text.primary.value')),
  colorEntry('apps/desktop/src/icons/icon-audit.css', '.icon-audit figcaption', 'color', tokenAt('color.text.secondary.value')),
]);

const exactShadowConsumers = new Map([
  ['apps/desktop/src/styles.css|.case-rail.surface-float, .surface-card-raised, .rail-module, .scroll-latest-button, .attachment-chip|box-shadow', 'var(--elevation-shadow)'],
]);

const exactRadiusConsumers = new Map([
  ['apps/desktop/src/styles.css|:root|--elevation-float-radius', '12px'],
  ['apps/desktop/src/styles.css|:root|--home-control-radius', '8px'],
  ['apps/desktop/src/styles.css|:root|--home-surface-radius', '16px'],
  ['apps/desktop/src/styles.css|.surface-float|border-radius', 'var(--elevation-float-radius)'],
  ['apps/desktop/src/styles.css|.surface-card|border-radius', 'var(--elevation-float-radius)'],
  ['apps/desktop/src/styles.css|.rail-nav-item|border-radius', 'var(--home-control-radius)'],
  ['apps/desktop/src/styles.css|.case-card > .rail-row-main|border-radius', 'var(--home-control-radius)'],
  ['apps/desktop/src/styles.css|.case-card.is-expanded > .rail-row-main|border-radius', 'var(--home-control-radius)'],
  ['apps/desktop/src/styles.css|.utility-dock|border-radius', 'var(--elevation-float-radius)'],
  ['apps/desktop/src/styles.css|.rail-module|border-radius', 'var(--elevation-float-radius)'],
  ['apps/desktop/src/styles.css|.rail-segment|border-radius', '8px'],
  ['apps/desktop/src/styles.css|.welcome-idea-row|border-radius', '8px'],
  ['apps/desktop/src/styles.css|.sample-tour|border-radius', '8px'],
  ['apps/desktop/src/styles.css|.user-message|border-radius', '8px'],
  ['apps/desktop/src/styles.css|.composer-shell|border-radius', '12px'],
  ['apps/desktop/src/styles.css|.settings-recovery|border-radius', '8px'],
  ['apps/desktop/src/styles.css|.s3-launcher|border-radius', '8px'],
  ['site/styles.css|.mac-window|border-radius', '12px'],
]);

const exactGradients = new Map([
  ['apps/desktop/src/icons/icon-audit.css|.icon-audit figure > span|background-image', 'linear-gradient(var(--audit-border) 1px, transparent 1px), linear-gradient(90deg, var(--audit-border) 1px, transparent 1px)'],
  ['apps/desktop/src/styles.css|.case-scroll|mask-image', 'linear-gradient(to bottom, transparent 0, var(--text-primary) 10px, var(--text-primary) calc(100% - 10px), transparent 100%)'],
  ['apps/desktop/src/styles.css|.collapsible-message.is-overflowing:not(.is-expanded) .collapsible-body|-webkit-mask-image', 'linear-gradient(to bottom, var(--text-primary) calc(100% - 48px), transparent)'],
  ['apps/desktop/src/styles.css|.collapsible-message.is-overflowing:not(.is-expanded) .collapsible-body|mask-image', 'linear-gradient(to bottom, var(--text-primary) calc(100% - 48px), transparent)'],
  ['apps/desktop/src/styles.css|.signature-line::after|background', 'linear-gradient(to bottom, currentColor 0%, color-mix(in srgb, var(--bg-raised) 58%, transparent) 50%, currentColor 100%)'],
  ['apps/desktop/src/styles.css|.usage-ring|background', 'conic-gradient(var(--slate-graphic) var(--usage), var(--border) 0)'],
  ['apps/desktop/src/styles.css|.usage-ring|mask', 'radial-gradient(circle, transparent 45%, var(--text-primary) 48%)'],
  ['apps/desktop/src/styles.css|.usage-ring.critical|background', 'conic-gradient(var(--red-graphic) var(--usage), var(--border) 0)'],
  ['apps/desktop/src/styles.css|.paste-block.is-overflowing:not(.is-expanded) .paste-block-body|-webkit-mask-image', 'linear-gradient(to bottom, var(--text-primary) 62%, transparent)'],
  ['apps/desktop/src/styles.css|.paste-block.is-overflowing:not(.is-expanded) .paste-block-body|mask-image', 'linear-gradient(to bottom, var(--text-primary) 62%, transparent)'],
]);

const graphColorTokens = {
  background: 'color.bg.raised.value',
  surface: 'color.bg.surface.value',
  hover: 'color.bg.hover.value',
  selected: 'color.bg.selected.value',
  ink: 'color.text.primary.value',
  textSecondary: 'color.text.secondary.value',
  border: 'color.border.hairline.value',
  borderStrong: 'color.border.strong.value',
  slate: 'color.semantic.severity.low.graphic',
  amber: 'color.semantic.severity.medium.graphic',
};

const desktopPressSelector = ':is(.primary-button, .scene-primary, .continuation-button, .question-option, .composer-send, .composer-icon-button, .icon-button, .copy-button, .case-archive-button, .window-chrome-button, .collapse-right-button, .rail-seam-toggle, .workspace-edge-control, .model-config-trigger, .shortcut-trigger):active:not(:focus-visible):not(:disabled):not(.is-disabled-feature)';
const sitePressSelector = '.button-primary:active:not(:focus-visible)';
const approvedPressSelectors = new Set([desktopPressSelector, sitePressSelector]);

const canonicalSiteMotion = `
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

function stripScriptTrivia(value) {
  return value
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}()[\];,.!])\s*/g, '$1')
    .trim();
}

function withoutComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '));
}

function matchingBrace(source, open, limit) {
  let depth = 1;
  let quote = '';
  for (let cursor = open + 1; cursor < limit; cursor += 1) {
    const char = source[cursor];
    if (quote) {
      if (char === '\\') cursor += 1;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === '{') depth += 1;
    else if (char === '}' && --depth === 0) return cursor;
  }
  return limit - 1;
}

function splitDeclarations(body, offset, source, selector, context) {
  const declarations = [];
  let start = 0;
  let quote = '';
  let parens = 0;
  const commit = (end) => {
    const segment = body.slice(start, end).trim();
    start = end + 1;
    if (!segment) return;
    let colon = -1;
    let innerQuote = '';
    let innerParens = 0;
    for (let index = 0; index < segment.length; index += 1) {
      const char = segment[index];
      if (innerQuote) {
        if (char === '\\') index += 1;
        else if (char === innerQuote) innerQuote = '';
      } else if (char === '"' || char === "'") innerQuote = char;
      else if (char === '(') innerParens += 1;
      else if (char === ')') innerParens -= 1;
      else if (char === ':' && innerParens === 0) { colon = index; break; }
    }
    if (colon < 0) return;
    const property = segment.slice(0, colon).trim().toLowerCase();
    const value = segment.slice(colon + 1).trim();
    const local = body.indexOf(segment, Math.max(0, start - segment.length - 1));
    const line = source.slice(0, offset + Math.max(0, local)).split('\n').length;
    declarations.push({ selector, property, value, line, context });
  };
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    if (quote) {
      if (char === '\\') index += 1;
      else if (char === quote) quote = '';
    } else if (char === '"' || char === "'") quote = char;
    else if (char === '(') parens += 1;
    else if (char === ')') parens -= 1;
    else if (char === ';' && parens === 0) commit(index);
  }
  commit(body.length);
  return declarations;
}

function parseCss(css) {
  const source = withoutComments(css);
  const declarations = [];
  function parseRange(start, end, context = []) {
    let cursor = start;
    while (cursor < end) {
      const open = source.indexOf('{', cursor);
      if (open < 0 || open >= end) break;
      const prelude = source.slice(cursor, open).trim();
      const close = matchingBrace(source, open, end);
      if (prelude.startsWith('@media') || prelude.startsWith('@supports') || prelude.startsWith('@container') || prelude.startsWith('@layer')) {
        parseRange(open + 1, close, [...context, normalizeSelector(prelude)]);
      } else if (!prelude.startsWith('@keyframes')) {
        declarations.push(...splitDeclarations(source.slice(open + 1, close), open + 1, source, normalizeSelector(prelude), context));
      }
      cursor = close + 1;
    }
  }
  parseRange(0, source.length);
  return declarations;
}

function push(failures, rule, file, line, message) {
  failures.push({ rule, file, line, message });
}

function scanCss(file, content, failures, { repository }) {
  const declarations = parseCss(content);
  const rules = new Map();
  for (const declaration of declarations) {
    const key = `${file}|${declaration.selector}|${declaration.property}`;
    const normalizedValue = normalizeCssValue(declaration.value);
    const rawColors = declaration.value.match(colorPattern) ?? [];
    if (rawColors.length) {
      const approved = cssColorAllowlist.get(key);
      if (approved !== normalizedValue) {
        push(failures, 'raw-color', file, declaration.line, `${declaration.selector} ${declaration.property} is not an exact docs/design/tokens.json consumer`);
      }
    }

    if (declaration.property === 'box-shadow') {
      const safe = normalizedValue === 'none' || normalizedValue === 'none !important';
      if (!safe && normalizeCssValue(exactShadowConsumers.get(key) ?? '') !== normalizedValue) {
        push(failures, 'shadow', file, declaration.line, `${declaration.selector} is not an approved elevation consumer`);
      }
    }

    if (declaration.property === 'border-radius' || declaration.property.endsWith('-radius')) {
      const plain = normalizedValue.replace(/\s*!important$/, '');
      const isHigh = highRadiusTokens.has(plain) || plain.startsWith('var(');
      if ((!ordinaryRadiusPattern.test(normalizedValue) && !isHigh)
        || (isHigh && normalizeCssValue(exactRadiusConsumers.get(key) ?? '') !== normalizedValue)) {
        push(failures, 'radius', file, declaration.line, `${declaration.selector} ${declaration.property}: ${declaration.value}`);
      }
    }

    if (gradientPattern.test(declaration.value)) {
      if (normalizeCssValue(exactGradients.get(key) ?? '') !== normalizedValue) {
        push(failures, 'gradient', file, declaration.line, `${declaration.selector} ${declaration.property} gradient is not exact`);
      }
    }

    const ruleKey = `${declaration.context.join('|')}|${declaration.selector}`;
    if (!rules.has(ruleKey)) rules.set(ruleKey, { context: declaration.context, selector: declaration.selector, declarations: new Map(), line: declaration.line });
    rules.get(ruleKey).declarations.set(declaration.property, declaration.value);
  }

  for (const rule of rules.values()) {
    const transform = normalizeCssValue(rule.declarations.get('transform') ?? '');
    if (rule.selector.includes(':active') && /scale\(/.test(transform)) {
      const scale = Number(transform.match(/scale\(([^)]+)\)/)?.[1]);
      const duration = normalizeCssValue(rule.declarations.get('transition-duration') ?? '');
      if (!approvedPressSelectors.has(rule.selector)
        || scale < 0.97 || scale > 0.98
        || (duration !== 'var(--motion-press)' && !/^(?:100|1[1-5][0-9]|160)ms$/.test(duration))) {
        push(failures, 'press-feedback', file, rule.line, `${rule.selector} is outside the press contract`);
      }
      if (/(?:row|table|card)/i.test(rule.selector)) {
        push(failures, 'press-feedback', file, rule.line, 'data rows, tables, and cards must not scale');
      }
      const reduced = [...rules.values()].find((candidate) => candidate.selector === rule.selector
        && candidate.context.some((entry) => entry === '@media (prefers-reduced-motion: reduce)'));
      if (!reduced || normalizeCssValue(reduced.declarations.get('transform') ?? '') !== 'none') {
        push(failures, 'press-feedback', file, rule.line, `${rule.selector} has no movement-free reduced-motion branch`);
      }
      const focusPresent = declarations.some((entry) => entry.selector.includes(':focus-visible') && entry.property === 'outline');
      if (!focusPresent) push(failures, 'press-feedback', file, rule.line, 'press consumers need a focus-visible outline');
    }
  }

  const popoverDirections = new Map([
    ['.case-card .archive-popover', ['popover-from-top', 'top right']],
    ['.file-ops-undo-popover', ['popover-from-top', 'top right']],
    ['.rail-containerize-popover', ['popover-from-top', 'top right']],
    ['.store-chat-popover', ['popover-from-top', 'top right']],
    ['.attachment-scope > .scope-popover', ['popover-from-bottom', 'bottom right']],
    ['.composer-plus-menu', ['popover-from-bottom', 'bottom left']],
    ['.case-menu', ['popover-from-bottom', 'bottom left']],
    ['.model-config-popover', ['popover-from-bottom', 'bottom right']],
    ['.scene-more-popover', ['popover-from-bottom', 'bottom right']],
  ]);
  for (const rule of rules.values()) {
    const animation = normalizeCssValue(rule.declarations.get('animation') ?? '');
    if (rule.selector.includes('.cell-peek') && animation && animation !== 'none') {
      push(failures, 'popover-motion', file, rule.line, 'data cell peek must remain static');
      continue;
    }
    if (!rule.selector.includes('popover') || !animation || animation === 'none') continue;
    const contract = popoverDirections.get(rule.selector);
    const origin = normalizeCssValue(rule.declarations.get('transform-origin') ?? '');
    if (!contract || animation !== `${contract[0]} var(--motion-overlay) var(--motion-overlay-ease) both` || origin !== contract[1]) {
      push(failures, 'popover-motion', file, rule.line, `${rule.selector} animation is not tied to its anchor direction`);
    }
    const reduced = [...rules.values()].find((candidate) => candidate.selector === rule.selector
      && candidate.context.some((entry) => entry === '@media (prefers-reduced-motion: reduce)'));
    if (!reduced || normalizeCssValue(reduced.declarations.get('animation') ?? '') !== 'none'
      || normalizeCssValue(reduced.declarations.get('transform') ?? '') !== 'none') {
      push(failures, 'popover-motion', file, rule.line, `${rule.selector} has no movement-free reduced-motion branch`);
    }
  }

  if (repository && file === 'site/styles.css') {
    const macContract = new Map([
      [':root|--mac-close', '#ff5f57'],
      [':root|--mac-minimize', '#febc2e'],
      [':root|--mac-zoom', '#28c840'],
      ['.traffic i:nth-child(1)|background', 'var(--mac-close)'],
      ['.traffic i:nth-child(2)|background', 'var(--mac-minimize)'],
      ['.traffic i:nth-child(3)|background', 'var(--mac-zoom)'],
    ]);
    for (const [contractKey, expected] of macContract) {
      const [selector, property] = contractKey.split('|');
      const declaration = declarations.find((entry) => entry.selector === selector && entry.property === property);
      if (!declaration || normalizeCssValue(declaration.value) !== expected) {
        push(failures, 'raw-color', file, declaration?.line ?? 1, `OS chrome exception drifted: ${selector} ${property}`);
      }
    }
    for (const declaration of declarations.filter((entry) => /--mac-(?:close|minimize|zoom)/.test(entry.value))) {
      const contractKey = `${declaration.selector}|${declaration.property}`;
      if (macContract.get(contractKey) !== normalizeCssValue(declaration.value)) {
        push(failures, 'raw-color', file, declaration.line, 'OS chrome token consumed outside .traffic nth-child');
      }
    }
  }

  if (repository && file === 'apps/desktop/src/styles.css') {
    const rootPress = declarations.find((entry) => entry.selector === ':root' && entry.property === '--motion-press');
    if (normalizeCssValue(rootPress?.value ?? '') !== '120ms') {
      push(failures, 'press-feedback', file, rootPress?.line ?? 1, '--motion-press must resolve to the approved 120ms token');
    }
    const pressRule = [...rules.values()].find((entry) => entry.selector === desktopPressSelector && entry.context.length === 0);
    if (normalizeCssValue(pressRule?.declarations.get('transform') ?? '') !== 'scale(.98)'
      || normalizeCssValue(pressRule?.declarations.get('transition-duration') ?? '') !== 'var(--motion-press)') {
      push(failures, 'press-feedback', file, pressRule?.line ?? 1, 'desktop approved consumers need the exact 120ms scale(.98) press rule');
    }
    const reducedPress = [...rules.values()].find((entry) => entry.selector === desktopPressSelector
      && entry.context.some((context) => context === '@media (prefers-reduced-motion: reduce)'));
    if (normalizeCssValue(reducedPress?.declarations.get('transform') ?? '') !== 'none') {
      push(failures, 'press-feedback', file, reducedPress?.line ?? 1, 'desktop press rule needs a movement-free reduced-motion branch');
    }
    if (!declarations.some((entry) => entry.selector.includes('button:focus-visible') && entry.property === 'outline')) {
      push(failures, 'press-feedback', file, 1, 'desktop buttons need focus-visible feedback independent of press');
    }

    for (const [selector, [animationName, origin]] of popoverDirections) {
      const base = [...rules.values()].find((entry) => entry.selector === selector && entry.context.length === 0);
      const reduced = [...rules.values()].find((entry) => entry.selector === selector
        && entry.context.some((context) => context === '@media (prefers-reduced-motion: reduce)'));
      if (normalizeCssValue(base?.declarations.get('animation') ?? '') !== `${animationName} var(--motion-overlay) var(--motion-overlay-ease) both`
        || normalizeCssValue(base?.declarations.get('transform-origin') ?? '') !== origin) {
        push(failures, 'popover-motion', file, base?.line ?? 1, `${selector} is missing its exact anchor-direction contract`);
      }
      if (normalizeCssValue(reduced?.declarations.get('animation') ?? '') !== 'none'
        || normalizeCssValue(reduced?.declarations.get('transform') ?? '') !== 'none') {
        push(failures, 'popover-motion', file, reduced?.line ?? 1, `${selector} is missing its reduced-motion contract`);
      }
    }
    const keyframes = [
      '@keyframes popover-from-top { from { opacity: 0; transform: translatey(-4px); } to { opacity: 1; transform: translatey(0); } }',
      '@keyframes popover-from-bottom { from { opacity: 0; transform: translatey(4px); } to { opacity: 1; transform: translatey(0); } }',
    ];
    const normalizedSource = normalizeCssValue(withoutComments(content));
    for (const keyframe of keyframes) {
      if (!normalizedSource.includes(keyframe)) push(failures, 'popover-motion', file, 1, `missing exact ${keyframe.split(' ')[1]} motion shape`);
    }
  }

  if (repository && file === 'site/styles.css') {
    const primaryPress = [...rules.values()].find((entry) => entry.selector === sitePressSelector && entry.context.length === 0);
    const reducedPress = [...rules.values()].find((entry) => entry.selector === sitePressSelector
      && entry.context.some((context) => context === '@media (prefers-reduced-motion: reduce)'));
    if (normalizeCssValue(primaryPress?.declarations.get('transform') ?? '') !== 'scale(.98)'
      || normalizeCssValue(primaryPress?.declarations.get('transition-duration') ?? '') !== 'var(--motion-press)') {
      push(failures, 'press-feedback', file, primaryPress?.line ?? 1, 'site primary CTA needs the exact press contract');
    }
    if (normalizeCssValue(reducedPress?.declarations.get('transform') ?? '') !== 'none') {
      push(failures, 'press-feedback', file, reducedPress?.line ?? 1, 'site primary CTA needs a movement-free reduced-motion branch');
    }
    const rootPress = declarations.find((entry) => entry.selector === ':root' && entry.property === '--motion-press');
    if (normalizeCssValue(rootPress?.value ?? '') !== '120ms') {
      push(failures, 'press-feedback', file, rootPress?.line ?? 1, 'site --motion-press must resolve to 120ms');
    }
  }
}

function scanScriptColors(file, content, failures) {
  if (file === 'apps/desktop/src/workbench/graph-theme.ts') {
    const objectMatch = content.match(/\bgraphTokens\s*=\s*\{([\s\S]*?)\}\s*as const/);
    const rangeStart = objectMatch?.index ?? -1;
    const rangeEnd = rangeStart < 0 ? -1 : rangeStart + objectMatch[0].length;
    for (const match of content.matchAll(colorPattern)) {
      const offset = match.index ?? 0;
      const line = content.slice(0, offset).split('\n').length;
      const before = content.slice(rangeStart, offset);
      const property = before.match(/([A-Za-z][A-Za-z0-9]*)\s*:\s*['"][^'"]*$/)?.[1];
      const tokenPath = property ? graphColorTokens[property] : undefined;
      if (offset < rangeStart || offset > rangeEnd || !tokenPath || normalizeCssValue(match[0]) !== normalizeCssValue(tokenAt(tokenPath))) {
        push(failures, 'raw-color', file, line, 'graph color literal is not an exact graphTokens consumer');
      }
    }
    return;
  }
  const styleLiteral = /(?:\.style\.(?:color|background|backgroundColor|borderColor|fill|stroke)\s*=|\b(?:color|background|backgroundColor|borderColor|fill|stroke)\s*:)\s*['"`]([^'"`]*(?:#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\))[^'"`]*)['"`]/gi;
  for (const match of content.matchAll(styleLiteral)) {
    push(failures, 'raw-color', file, content.slice(0, match.index).split('\n').length, 'JS/TS style colors must consume a declared token');
  }
  const styleSetProperty = /\.style\.setProperty\s*\(\s*['"`](?:color|background|background-color|border-color|fill|stroke)['"`]\s*,\s*['"`]([^'"`]*(?:#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\))[^'"`]*)['"`]/gi;
  for (const match of content.matchAll(styleSetProperty)) {
    push(failures, 'raw-color', file, content.slice(0, match.index).split('\n').length, 'style.setProperty colors must consume a declared token');
  }
}

function jsxClassFragments(attributes) {
  const classAttribute = attributes.match(/className\s*=\s*(?:"([^"]*)"|'([^']*)'|\{([\s\S]*?)\})/);
  if (!classAttribute) return [];
  const expression = classAttribute[1] ?? classAttribute[2] ?? classAttribute[3] ?? '';
  return [...expression.matchAll(/[A-Za-z][A-Za-z0-9_-]*/g)].map((match) => match[0]);
}

function isL1(tag, classes, html) {
  if (tag === 'SurfaceCard') return true;
  const exact = new Set(['surface-card', 'surface-card-raised', 'surface-float', 'rail-module', 'mac-window', 'work-crop']);
  if (classes.some((name) => exact.has(name))) return true;
  return html && classes.some((name) => /(?:^|-)(?:feature|trust|product)-card$/.test(name));
}

function scanL1(file, content, failures) {
  if (!/\.(?:tsx|jsx|html)$/.test(file)) return;
  const html = file.endsWith('.html');
  const tagPattern = /<\/?([A-Za-z][A-Za-z0-9.]*)\b([^>]*?)(\/?)>/g;
  const stack = [];
  for (const match of content.matchAll(tagPattern)) {
    const closing = match[0].startsWith('</');
    const tag = match[1];
    if (closing) {
      const index = stack.map((entry) => entry.tag).lastIndexOf(tag);
      if (index >= 0) stack.splice(index);
      continue;
    }
    const classes = html
      ? (match[2].match(/class\s*=\s*["']([^"']*)["']/)?.[1] ?? '').split(/\s+/)
      : jsxClassFragments(match[2]);
    const l1 = isL1(tag, classes, html);
    if (l1 && stack.some((entry) => entry.l1)) {
      push(failures, 'l1-nesting', file, content.slice(0, match.index).split('\n').length, `${tag} creates card-inside-card`);
    }
    if (match[3] !== '/') stack.push({ tag, l1 });
  }
}

function scanArchiveReference(file, content, failures) {
  const patterns = [
    /\]\(<?(?:archive\/|[^)\n>]*\/archive\/)[^)\n>]*>?\)/gim,
    /\b(?:href|src)\s*=\s*["'](?:archive\/|[^"']*\/archive\/)[^"']*["']/gim,
    /\b(?:fetch|require|readFile(?:Sync)?|open|new\s+URL|import)\s*\(\s*["'`](?:archive\/|[^"'`]*\/archive\/)[^"'`]*/gim,
    /\b(?:import|export)[\s\S]{0,120}?\bfrom\s*["'](?:archive\/|[^"']*\/archive\/)[^"']*["']/gim,
    /\bpath\.(?:join|resolve)\s*\([^)]*["']archive["'][^)]*\)/gim,
  ];
  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      push(failures, 'archive-reference', file, content.slice(0, match.index).split('\n').length, 'active source must not reference archive content');
    }
  }
}

function scanSiteMotion(file, content, failures) {
  if (file !== 'site/main.js') return;
  const dangerous = /requestAnimationFrame|cancelAnimationFrame|\.animate\s*\(|\bconfetti\b|\bcanvas\b|new\s+MutationObserver|addEventListener\s*\(\s*['"]scroll|setInterval\s*\(/;
  if (dangerous.test(content) || stripScriptTrivia(content) !== stripScriptTrivia(canonicalSiteMotion)) {
    push(failures, 'site-motion', file, 1, 'site/main.js must retain the exact evidence-step observer/reduced-motion AST shape');
  }
}

function scanCopy(file, content, failures) {
  if (file !== 'site/index.html') return;
  if (/>\s*(?:0[1-9]|[A-Z])\s*</.test(content)) push(failures, 'placeholder-scaffold', file, 1, 'number/single-letter section scaffolding is forbidden');
  for (const phrase of ['一站式', '赋能', '革命性', '颠覆性', '无缝体验', '未来已来']) {
    if (content.includes(phrase)) push(failures, 'generic-copy', file, 1, `generic marketing phrase: ${phrase}`);
  }
}

function scanSvg(file, content, failures) {
  const allowlist = new Map([
    // site 品牌标（B1 分治裁定③ 的品牌一致性挂账，本批闭合）：几何四路径一字不动，
    // 只把描边从迁移前旧板（210° 锚）换到磁青宗的墨色阶——站面是深底，标记随之取
    // themes.dark 的正文墨。壳侧 docs/design/icon-*.svg 各自绑本宗，三件同锚同源。
    ['site/assets/icon.svg|g|1|fill', tokenAt('themes.dark.text.primary.value')],
    ['docs/design/icon-dark.svg|rect|1|fill', tokenAt('color.text.primary.value')],
    ['docs/design/icon-dark.svg|rect|2|fill', tokenAt('color.bg.app.value')],
    ['docs/design/icon-dark.svg|rect|3|fill', tokenAt('color.text.tertiary.value')],
    ['docs/design/icon-dark.svg|rect|4|fill', tokenAt('color.text.tertiary.value')],
    ['docs/design/icon-dark.svg|rect|5|fill', tokenAt('color.text.tertiary.value')],
    ['docs/design/icon-light.svg|rect|1|fill', tokenAt('color.bg.app.value')],
    ['docs/design/icon-light.svg|rect|2|stroke', tokenAt('color.border.hairline.value')],
    ['docs/design/icon-light.svg|rect|3|fill', tokenAt('color.text.primary.value')],
    ['docs/design/icon-light.svg|rect|4|fill', tokenAt('color.text.disabled.value')],
    ['docs/design/icon-light.svg|rect|5|fill', tokenAt('color.text.disabled.value')],
    ['docs/design/icon-light.svg|rect|6|fill', tokenAt('color.text.disabled.value')],
  ]);
  const counts = new Map();
  for (const tagMatch of content.matchAll(/<([A-Za-z][A-Za-z0-9:-]*)\b[^>]*>/g)) {
    const tag = tagMatch[1];
    const index = (counts.get(tag) ?? 0) + 1;
    counts.set(tag, index);
    for (const attribute of tagMatch[0].matchAll(/\b(fill|stroke)=["']([^"']+)["']/gi)) {
      if (!colorPattern.test(attribute[2])) continue;
      colorPattern.lastIndex = 0;
      const key = `${file}|${tag}|${index}|${attribute[1].toLowerCase()}`;
      if (normalizeCssValue(allowlist.get(key) ?? '') !== normalizeCssValue(attribute[2])) {
        const absolute = (tagMatch.index ?? 0) + (attribute.index ?? 0);
        push(failures, 'raw-color', file, content.slice(0, absolute).split('\n').length, `SVG consumer drifted: ${tag}[${index}] ${attribute[1]}`);
      }
    }
  }
}

// SITE-CRAFT-2：字体子集三向绑定——HTML 消费者用字 ⊆ 清单文本、清单与 woff2 字节同锚、
// CSS 真实接线（@font-face + 消费类真的消费对应 token）。任一向脱钩即缺字静默回退，必须触红。
// 三轨字体制落地后（字体策略二次修订）：文书轨 zh-display/zh-doc 共用朱雀清单，标题轨 h2/h3
// 共用 Noto 双字重清单，故消费类与清单均由调用方传入，一套门守三枚子集。
export function checkDisplayFont({ html, css, manifest, woff2Sha256, consumerClasses = ['zh-display'], manifestPath = 'site/assets/fonts/zhuque-subset.json', faceFamily = 'Zhuque Fangsong', faceFiles = ['assets/fonts/zhuque-fangsong-subset.woff2'], tokenRule = { selector: '\\.zh-display', token: '--display' } }) {
  const failures = [];
  const fail = (message) => push(failures, 'display-font', manifestPath, 1, message);
  if (!manifest || typeof manifest.text !== 'string' || !/^[0-9a-f]{64}$/.test(manifest.woff2Sha256 ?? '')) {
    fail('subset manifest must declare text and a 64-hex woff2Sha256');
    return failures;
  }
  if (woff2Sha256 !== manifest.woff2Sha256) {
    fail('subset woff2 bytes drifted from the manifest anchor; re-subset and update woff2Sha256');
  }
  const consumers = [];
  const openTag = new RegExp(`<([a-z][a-z0-9]*)\\b[^>]*\\bclass="[^"]*\\b(?:${consumerClasses.join('|')})\\b[^"]*"[^>]*>`, 'g');
  for (const match of html.matchAll(openTag)) {
    const tag = match[1];
    const start = (match.index ?? 0) + match[0].length;
    const step = new RegExp(`<${tag}\\b[^>]*>|</${tag}>`, 'g');
    step.lastIndex = start;
    let depth = 1;
    let end = html.length;
    for (let hit = step.exec(html); hit; hit = step.exec(html)) {
      depth += hit[0].startsWith('</') ? -1 : 1;
      if (depth === 0) { end = hit.index; break; }
    }
    consumers.push(html.slice(start, end).replace(/<[^>]*>/g, ''));
  }
  if (!consumers.length) fail(`display font asset has no ${consumerClasses.join('/')} consumer in the page`);
  const allowed = new Set(manifest.text);
  for (const text of consumers) {
    const missing = [...new Set([...text.replace(/\s/g, '')].filter((char) => !allowed.has(char)))];
    if (missing.length) fail(`${consumerClasses.join('/')} consumer uses characters outside the subset manifest: ${missing.join('')}`);
  }
  for (const file of faceFiles) {
    if (!css.includes(file)) fail(`styles.css must load ${file}`);
  }
  if (!new RegExp(`@font-face\\s*\\{[^}]*"${faceFamily}"`).test(css)) {
    fail(`styles.css must declare @font-face "${faceFamily}"`);
  }
  if (!new RegExp(`${tokenRule.selector}[^{]*\\{[^}]*font-family:\\s*var\\(${tokenRule.token}\\)`).test(css)
    || !new RegExp(`${tokenRule.token}:[^;]*"${faceFamily}"`).test(css)) {
    fail(`${tokenRule.selector} must consume var(${tokenRule.token}) anchored to "${faceFamily}"`);
  }
  return failures;
}

// SITE-CRAFT-2：hero 微演示动效契约——demo-* keyframe 只许注意力层属性
// （background-color/border-color/border-top-color/opacity），数据字形零位移零变形；
// 存在演示时 reduced-motion 必须整体全灭。越界属性即「数据区绝对静止」破口，触红。
export function checkDemoMotion(css) {
  const failures = [];
  const fail = (message) => push(failures, 'demo-motion', 'site/styles.css', 1, message);
  const allowed = new Set(['background-color', 'border-color', 'border-top-color', 'opacity']);
  const source = withoutComments(css);
  let hasDemo = false;
  for (const match of source.matchAll(/@keyframes\s+(demo-[a-z0-9-]+)\s*\{/g)) {
    hasDemo = true;
    const open = source.indexOf('{', match.index);
    const close = matchingBrace(source, open, source.length);
    for (const declaration of source.slice(open + 1, close).matchAll(/([a-z-]+)\s*:/g)) {
      if (!allowed.has(declaration[1])) fail(`${match[1]} animates ${declaration[1]} outside the attention whitelist`);
    }
  }
  if (hasDemo) {
    // 判例（P0 驳回）：**分支在场 ≠ 分支胜出**。旧实现只查 reduce 分支的字面串在不在，
    // 而 `.demo-actions span`(0,1,1) 特异性高于 blanket `.schema-demo *`(0,1,0)，
    // 于是 reduce 下朱照常走完幕二，字面锁却全绿。字面存在自此降格为线索，
    // 真断言改为**层叠解析**：blanket 必须真的赢过每一个演示内的 animation 消费点。
    const declarations = parseCss(source);
    const isReduce = (entry) => entry.context.some((c) => c.includes('prefers-reduced-motion: reduce'));
    const blankets = declarations.filter((entry) => isReduce(entry)
      && entry.property === 'animation'
      && /^none\b/.test(normalizeCssValue(entry.value))
      && /\.schema-demo\s+\*/.test(entry.selector));
    if (!blankets.length) {
      fail('hero demo needs a `.schema-demo *` animation:none branch inside prefers-reduced-motion: reduce');
    }
    const consumers = declarations.filter((entry) => !isReduce(entry)
      && (entry.property === 'animation' || entry.property === 'animation-name')
      && !/^none\b/.test(normalizeCssValue(entry.value))
      && /demo-/.test(entry.value));
    for (const consumer of consumers) {
      const beaten = blankets.some((blanket) => {
        const blanketImportant = /!important/.test(blanket.value);
        const consumerImportant = /!important/.test(consumer.value);
        if (blanketImportant !== consumerImportant) return blanketImportant;
        const rank = specificity(blanket.selector);
        const other = specificity(consumer.selector);
        if (rank[0] !== other[0]) return rank[0] > other[0];
        if (rank[1] !== other[1]) return rank[1] > other[1];
        if (rank[2] !== other[2]) return rank[2] > other[2];
        return blanket.line > consumer.line; // 同特异性时后写者胜
      });
      if (!beaten) {
        fail(`reduced-motion blanket loses to \`${consumer.selector}\` (${consumer.value.trim()}); the branch is present but does not win`);
      }
    }
  }
  return failures;
}

// CSS 特异性 (a,b,c)：a=ID，b=类/属性/伪类，c=类型/伪元素；`*` 计 0。
// 只用于判断 reduce blanket 与消费点谁胜，故按最坏分支（逗号组里最高的一支）取值。
function specificity(selector) {
  let best = [0, 0, 0];
  for (const branch of selector.split(',')) {
    const clean = branch.replace(/::?[a-z-]+\([^)]*\)/gi, (m) => m.replace(/[^,]/g, 'x'));
    const a = (clean.match(/#[\w-]+/g) ?? []).length;
    const b = (clean.match(/\.[\w-]+|\[[^\]]*\]|:(?!:)[\w-]+/g) ?? []).length;
    const c = (clean.match(/(?:^|[\s>+~])(?![.#:[*])[a-z][\w-]*|::[\w-]+/gi) ?? []).length;
    if (a > best[0] || (a === best[0] && (b > best[1] || (b === best[1] && c > best[2])))) best = [a, b, c];
  }
  return best;
}

// SITE-CRAFT-2 · 品牌记号谱系单源门（P1 驳回回炉）。
// 裁定：壳侧 512 源稿为 master，site 小记号必须是 master 设计语言的**登记变体**——
// 从 5/6-rect 体系重推导，而非旧线标重上色。「一致性闭合」的宣称必须与裁定口径同粒度
// （几何 + 单源，非仅色）。故本门不锁死字面几何（那只是把另一个硬编码换个位置），
// 而是**从 master 现算比例**再核变体：master 改了，变体不跟就红，这才叫单源。
const rectPattern = /<rect\b[^>]*>/g;
const attr = (tag, name) => {
  const hit = tag.match(new RegExp(`\\b${name}="([^"]*)"`));
  return hit ? Number.parseFloat(hit[1]) : Number.NaN;
};

function contentRects(svg) {
  const rects = [...svg.matchAll(rectPattern)].map((m) => ({
    x: attr(m[0], 'x') || 0, y: attr(m[0], 'y') || 0,
    w: attr(m[0], 'width'), h: attr(m[0], 'height'),
  })).filter((r) => Number.isFinite(r.w) && Number.isFinite(r.h));
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1]?.trim().split(/\s+/).map(Number) ?? [0, 0, 0, 0];
  // 剔除满幅底盘（应用图标保留方形底盘，wordmark 不要——icon.md 既有规则）
  return rects.filter((r) => !(r.w >= viewBox[2] * 0.98 && r.h >= viewBox[3] * 0.98));
}

function normalise(rects) {
  const x0 = Math.min(...rects.map((r) => r.x));
  const y0 = Math.min(...rects.map((r) => r.y));
  const x1 = Math.max(...rects.map((r) => r.x + r.w));
  const y1 = Math.max(...rects.map((r) => r.y + r.h));
  const w = x1 - x0;
  const h = y1 - y0;
  return rects.map((r) => [(r.x - x0) / w, (r.y - y0) / h, r.w / w, r.h / h]);
}

export function checkBrandLineage({ master, variant, tolerance = 0.03 }) {
  const failures = [];
  const fail = (message) => push(failures, 'brand-lineage', 'site/assets/icon.svg', 1, message);
  const masterRects = contentRects(master);
  const variantRects = contentRects(variant);
  if (masterRects.length !== 4) {
    fail(`master content geometry should be the 4-rect 线+文 motif, found ${masterRects.length}`);
    return failures;
  }
  if (variantRects.length !== masterRects.length) {
    fail(`site mark must re-derive the master's ${masterRects.length}-rect system, found ${variantRects.length} rect(s)`
      + ' — a recoloured line mark is not a registered variant');
    return failures;
  }
  const a = normalise(masterRects);
  const b = normalise(variantRects);
  const label = ['竖线', '文书行一', '文书行二', '文书行三'];
  for (let i = 0; i < a.length; i += 1) {
    for (let k = 0; k < 4; k += 1) {
      const delta = Math.abs(a[i][k] - b[i][k]);
      if (delta > tolerance) {
        fail(`${label[i]} drifted from the master proportions (${['x', 'y', 'w', 'h'][k]}: `
          + `${a[i][k].toFixed(3)} vs ${b[i][k].toFixed(3)}, Δ${delta.toFixed(3)} > ${tolerance})`);
      }
    }
  }
  return failures;
}

// SITE-CRAFT-2 · 出处链闭合门（P1 驳回回炉）。
// manifest 侧早有「清单 ↔ 字节」双锚，出处记录（craft-evidence 的 SOURCE.md）侧却裸奔——
// 于是 37 字子集扩容到 104 字时 SOURCE.md 未随动，快照—来源—制品链断了一环而无人察觉。
// 教训是「机制不对称」：**立门以族为单位铺满**，不是哪里出事补哪里。故本门按族铺满：
// 每一枚入库 woff2 的实测 SHA，都必须在其出处记录里逐字登记；出处漂移即红。
// woff2 实测（零依赖）：Node 内建 brotli 解压 + 走表目录取 maxp.numGlyphs。
// 为什么要自己读而不是信生成时记下的数：**SHA 只锚内容，不锚声称**——制品换一个字节 SHA 必变，
// 但记录里的「128 glyphs / 33,036 bytes」这类人读数字，可以在 SHA 全对的前提下静默撒谎。
// 故这些数字必须有各自的机器对应，而不是被交叉抄写。实现已与 fontTools 在四枚制品上逐一互校。
const WOFF2_KNOWN_TAGS = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm',
  'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX',
  'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL',
  'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar',
  'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill'];

export function measureWoff2(buffer) {
  if (buffer.toString('ascii', 0, 4) !== 'wOF2') throw new Error('not a woff2 artifact');
  let cursor = 48; // 固定头长度
  const base128 = () => {
    let value = 0;
    for (let i = 0; i < 5; i += 1) {
      const byte = buffer[cursor];
      cursor += 1;
      value = ((value << 7) | (byte & 0x7f)) >>> 0;
      if (!(byte & 0x80)) return value;
    }
    throw new Error('malformed UIntBase128');
  };
  const directory = [];
  for (let i = 0; i < buffer.readUInt16BE(12); i += 1) {
    const flags = buffer[cursor];
    cursor += 1;
    const index = flags & 0x3f;
    let tag;
    if (index === 0x3f) { tag = buffer.toString('ascii', cursor, cursor + 4); cursor += 4; } else tag = WOFF2_KNOWN_TAGS[index];
    const version = (flags >> 6) & 0x3;
    const origLength = base128();
    // glyf/loca 的 version 0 才是「有变换」；其余表反之。变换后长度决定它在解压流里的实际占位。
    const transformed = (tag === 'glyf' || tag === 'loca') ? version === 0 : version !== 0;
    directory.push({ tag, length: transformed ? base128() : origLength });
  }
  const data = brotliDecompressSync(buffer.subarray(cursor, cursor + buffer.readUInt32BE(20)));
  const at = {};
  let offset = 0;
  for (const table of directory) { at[table.tag] = offset; offset += table.length; }
  if (at.maxp === undefined) throw new Error('woff2 has no maxp table');
  if (at.cmap === undefined) throw new Error('woff2 has no cmap table');
  return {
    bytes: buffer.length,
    glyphs: data.readUInt16BE(at.maxp + 4),
    chars: countMappedCodepoints(data, at.cmap),
  };
}

// cmap format 4 逐段走：把真正映射到非 0 字形的码位计入。
// 字数若只取自清单（manifest.text.length），就还是**交叉抄写**——改清单不重切子集时，
// SHA 照样对、字数照样自洽，谎仍能过门。故字数也从制品自身量。已与 fontTools 逐枚互校。
function countMappedCodepoints(data, base) {
  const mapped = new Set();
  const subtables = data.readUInt16BE(base + 2);
  for (let i = 0; i < subtables; i += 1) {
    const record = base + 4 + i * 8;
    const sub = base + data.readUInt32BE(record + 4);
    if (data.readUInt16BE(sub) !== 4) continue;
    const segX2 = data.readUInt16BE(sub + 6);
    const endAt = sub + 14;
    const startAt = sub + 16 + segX2;
    const deltaAt = sub + 16 + 2 * segX2;
    const rangeAt = sub + 16 + 3 * segX2;
    for (let s = 0; s < segX2 / 2; s += 1) {
      const end = data.readUInt16BE(endAt + 2 * s);
      const start = data.readUInt16BE(startAt + 2 * s);
      if (start === 0xffff) continue; // 尾哨兵段
      const delta = data.readInt16BE(deltaAt + 2 * s);
      const rangeOffset = data.readUInt16BE(rangeAt + 2 * s);
      for (let code = start; code <= end; code += 1) {
        let glyph;
        if (rangeOffset === 0) glyph = (code + delta) & 0xffff;
        else {
          const address = rangeAt + 2 * s + rangeOffset + 2 * (code - start);
          if (address + 1 >= data.length) continue;
          glyph = data.readUInt16BE(address);
          if (glyph !== 0) glyph = (glyph + delta) & 0xffff;
        }
        if (glyph !== 0) mapped.add(code);
      }
    }
  }
  return mapped.size;
}

// 从出处记录里取该制品那一行的可解析数字。行内写法允许有出入（两份 SOURCE.md 体例略不同），
// 但「N glyphs」「N bytes」「N 字」三类数字必须在场且可解析——数字不在场就等于没有契约。
const rowFor = (source, file) => source.split('\n').find((line) => line.includes(file)) ?? '';
const numberIn = (row, pattern) => {
  const hit = row.match(pattern);
  return hit ? Number.parseInt(hit[1].replace(/,/g, ''), 10) : Number.NaN;
};

export function checkFontProvenance(records) {
  const failures = [];
  for (const record of records) {
    const fail = (message) => push(failures, 'font-provenance', record.sourcePath, 1, message);
    if (!record.source) { fail('provenance record is missing'); continue; }
    for (const artifact of record.artifacts) {
      if (!record.source.includes(artifact.file)) {
        fail(`artifact is absent from the provenance record: ${artifact.file}`);
        continue;
      }
      if (!record.source.includes(artifact.sha256)) {
        fail(`provenance SHA drifted for ${artifact.file}; record does not carry the built bytes (${artifact.sha256.slice(0, 16)}…)`);
      }
      // 叙述侧三个数字各自对实测——SHA 对而数字错，正是本门此前的盲区。
      const row = rowFor(record.source, artifact.file);
      const claims = [
        ['bytes', numberIn(row, /([\d,]+)\s*(?:bytes|B)\b/), artifact.bytes],
        ['glyphs', numberIn(row, /([\d,]+)\s*glyphs\b/), artifact.glyphs],
        // 「字」是非 word 字元，其后不能用 \b（\b 要求相邻处有 word 字元），否则永不匹配。
        ['chars', numberIn(row, /([\d,]+)\s*字(?!符)/), artifact.chars],
      ];
      for (const [label, claimed, measured] of claims) {
        if (measured === undefined) continue;
        if (Number.isNaN(claimed)) fail(`${artifact.file}: provenance row states no ${label} count; the number must exist to be checkable`);
        else if (claimed !== measured) fail(`${artifact.file}: provenance claims ${claimed} ${label} but the artifact measures ${measured}`);
      }
    }
  }
  return failures;
}

// SITE-CRAFT-2 磁青宗批 · 色彩语法四位的机器封口。
// 「磁青为底 / 墨为记」是默认（除下列两族外全站只有中性阶）；「朱仅裁决 / 泥金 hero 唯一强调」
// 是**稀缺性宣告**——而被宣告的克制若没有门，就只是文案。故此门双向锁：
//   ① 朱（--zhu-*）只许落在人做决定处，泥金（--gold）只许落在 hero 母题；越界即触红。
//   ② 白名单条目必须真有消费面；登记了却没人用＝允许面虚增，同样触红（防白名单烂掉）。
const zhuConsumers = new Set([
  '.settle-seal', // 落定章：人工落定的印记
  '.demo-actions span', // 处置动作：确认此项 / 驳回 / 修正
]);
// 朱的帧边界（架构定谳「不作环境色」）：处置动作的朱只许活在这枚幕二 keyframe 里，
// 基态是中性墨。故白名单条目的「有消费面」既可由声明满足，也可由其所属 keyframe 满足。
const zhuKeyframes = new Map([['demo-zhu-b', '.demo-actions span']]);
const goldConsumers = new Set(['.tc']); // hero 母题逐字：磁青纸上以泥金写经
const goldKeyframes = new Set(['typer-develop']); // 同一枚 hero 母题的显影过程

export function checkColorGrammar(css) {
  const failures = [];
  const fail = (message) => push(failures, 'color-grammar', 'site/styles.css', 1, message);
  const source = withoutComments(css);
  const zhuPattern = /var\(--zhu-[a-z]+\)/;
  const goldPattern = /var\(--gold\)/;
  const seenZhu = new Set();
  const seenGold = new Set();

  for (const declaration of parseCss(source)) {
    if (zhuPattern.test(declaration.value)) {
      if (zhuConsumers.has(declaration.selector)) seenZhu.add(declaration.selector);
      else fail(`朱 left its adjudication surface: ${declaration.selector} ${declaration.property}`);
    }
    if (goldPattern.test(declaration.value)) {
      if (goldConsumers.has(declaration.selector)) seenGold.add(declaration.selector);
      else fail(`泥金 left the hero: ${declaration.selector} ${declaration.property}`);
    }
  }

  // @keyframes 不进 parseCss（越过声明层），单独扫——否则动效层就是这两族的逃逸通道。
  for (const match of source.matchAll(/@keyframes\s+([a-z0-9-]+)\s*\{/gi)) {
    const open = source.indexOf('{', match.index);
    const body = source.slice(open + 1, matchingBrace(source, open, source.length));
    if (zhuPattern.test(body)) {
      const owner = zhuKeyframes.get(match[1]);
      if (owner) seenZhu.add(owner); // 帧边界内的朱：算作该白名单条目的消费面
      else fail(`朱 left its adjudication surface: @keyframes ${match[1]}`);
    }
    if (goldPattern.test(body) && !goldKeyframes.has(match[1])) fail(`泥金 left the hero: @keyframes ${match[1]}`);
  }

  // 帧边界反向守卫：登记了帧边界的条目，其基态**不得**恒为朱——否则「只在那一帧现形」落空，
  // 朱退化成环境色。基态由 parseCss 的声明层给出，故此处要求它没有直接的朱声明。
  for (const [keyframe, owner] of zhuKeyframes) {
    const ambient = parseCss(source).some((entry) => entry.selector === owner && zhuPattern.test(entry.value));
    if (ambient) fail(`朱 is ambient on ${owner}; @keyframes ${keyframe} exists to keep it inside the adjudication frame`);
    if (!new RegExp(`animation:[^;]*\\b${keyframe}\\b`).test(source)) {
      fail(`@keyframes ${keyframe} is declared but never run; ${owner} would lose its 朱 entirely`);
    }
  }

  for (const selector of zhuConsumers) if (!seenZhu.has(selector)) fail(`朱 allowlist entry has no consumer: ${selector}`);
  for (const selector of goldConsumers) if (!seenGold.has(selector)) fail(`泥金 allowlist entry has no consumer: ${selector}`);
  return failures;
}

// SITE-CRAFT-2 磁青宗批 · SchemaParts 件库的三条解耦预留（就绪图「SVG 记号解耦预留」随两线同装）。
// 这三条就是「回迁 R2 时零重绘」的机器可验形态——件若带了值、或几何被抄成第二份、
// 或某件根本没人用，回迁时就必须重画，预留即告失效。故逐条设门：
//   ① 单源：页面里每一处记号都是 <use>，几何只此一份——件库外零 path/rect/circle/polygon；
//   ② 按 token 名消费不带值：件内零色值字面量，一律 currentColor（配色由消费点的 color 决定）；
//   ③ C-4 双主题渲染一致：②成立即②推出③——不携色值的几何在两宗下渲染同一份，
//      故此门把「零色值」实现为③的充分条件，并要求每件都真有消费者（死件回迁即白重画）。
export function checkSchemaParts(html) {
  const failures = [];
  const fail = (message) => push(failures, 'schema-parts', 'site/index.html', 1, message);
  const library = html.match(/<svg class="schema-parts"[^>]*>([\s\S]*?)<\/svg>/);
  if (!library) {
    fail('SchemaParts library block is missing; marks must come from one shared source');
    return failures;
  }
  const [libraryBlock, libraryBody] = library;
  const outside = html.replace(libraryBlock, '');

  // ① 单源
  for (const stray of outside.matchAll(/<(path|rect|circle|ellipse|polygon|polyline)\b/g)) {
    fail(`geometry outside the parts library: <${stray[1]}> — marks must be <use> instances`);
  }

  // ② 按 token 名消费不带值
  for (const attribute of libraryBody.matchAll(/\b(fill|stroke|stop-color|color)=["']([^"']+)["']/g)) {
    const value = attribute[2].trim().toLowerCase();
    if (value !== 'currentcolor' && value !== 'none' && !value.startsWith('var(')) {
      fail(`part carries a colour value (${attribute[1]}="${attribute[2]}"); parts consume token names, not values`);
    }
  }
  if (colorPattern.test(libraryBody)) {
    colorPattern.lastIndex = 0;
    fail('parts library contains a raw colour literal; C-4 dual-theme parity requires value-free geometry');
  }
  colorPattern.lastIndex = 0;

  // ③ 每件都有消费者
  const declared = [...libraryBody.matchAll(/<symbol\b[^>]*\bid="([^"]+)"/g)].map((match) => match[1]);
  if (!declared.length) fail('parts library declares no <symbol>');
  for (const id of declared) {
    if (!new RegExp(`<use\\b[^>]*href="#${id}"`).test(outside)) {
      fail(`part has no consumer: #${id} — a dead part is a redraw waiting to happen`);
    }
  }
  for (const use of outside.matchAll(/<use\b[^>]*href="#([^"]+)"/g)) {
    if (!declared.includes(use[1])) fail(`<use> points at an undeclared part: #${use[1]}`);
  }

  // 奖级工艺裁定「单点，不铺开」的机器形态：件库里声明的每一枚 filter，全站消费点恰为 1。
  // 零消费＝死滤镜；两处及以上＝铺开，正是裁定要拦的那一步。
  for (const declaredFilter of libraryBody.matchAll(/<filter\b[^>]*\bid="([^"]+)"/g)) {
    const id = declaredFilter[1];
    const uses = [...outside.matchAll(new RegExp(`url\\(#${id}\\)`, 'g'))].length;
    if (uses !== 1) {
      fail(`craft filter #${id} has ${uses} consumers; the single-point ruling allows exactly 1`);
    }
  }
  return failures;
}

export function scanSources(sources, options = {}) {
  const repository = options.repository ?? false;
  const failures = [];
  if (repository && (tokenAt('motion.press.value') !== '120ms'
    || tokenDocument.motion?.press?.easing !== 'ease-out'
    || tokenDocument.motion?.press?.scale !== 0.98)) {
    push(failures, 'press-feedback', 'docs/design/tokens.json', 1, 'motion.press must be 120ms ease-out / scale(.98)');
  }
  for (const item of sources) {
    const file = normalizePath(item.path);
    if (file === 'archive' || file.startsWith('archive/')) continue;
    if (file.endsWith('.css')) scanCss(file, item.content, failures, { repository });
    if (file.endsWith('.html')) {
      for (const style of item.content.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) scanCss(file, style[1], failures, { repository });
    }
    if (/\.(?:js|mjs|cjs|ts|tsx|jsx)$/.test(file)) scanScriptColors(file, item.content, failures);
    if (file.endsWith('.svg')) scanSvg(file, item.content, failures);
    scanL1(file, item.content, failures);
    scanArchiveReference(file, item.content, failures);
    scanSiteMotion(file, item.content, failures);
    scanCopy(file, item.content, failures);
  }
  return failures;
}

export const DESKTOP_PRESS_SELECTOR = desktopPressSelector;
