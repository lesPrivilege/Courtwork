import { readFileSync } from 'node:fs';

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
  '--slate-fg': 'color.semantic.severity.low.fg',
  '--slate-bg': 'color.semantic.severity.low.bg',
};

const siteRootColors = {
  '--bg-app': 'color.bg.app.value',
  '--bg-surface': 'color.bg.surface.value',
  '--bg-raised': 'color.bg.raised.value',
  '--bg-hover': 'color.bg.hover.value',
  '--ink': 'color.text.primary.value',
  '--text-secondary': 'color.text.secondary.value',
  '--text-tertiary': 'color.text.tertiary.value',
  '--border-hairline': 'color.border.hairline.value',
  '--border-strong': 'color.border.strong.value',
  '--focus': 'color.border.focus.value',
  '--danger': 'color.semantic.severity.high.graphic',
};

const cssColorAllowlist = new Map([
  ...Object.entries(desktopRootColors).map(([property, path]) => colorEntry('apps/desktop/src/styles.css', ':root', property, tokenAt(path))),
  colorEntry('apps/desktop/src/styles.css', ':root', '--elevation-shadow', tokenAt('elevation.shadow.value')),
  ...Object.entries(siteRootColors).map(([property, path]) => colorEntry('site/styles.css', ':root', property, tokenAt(path))),
  colorEntry('site/styles.css', ':root', '--mac-close', '#FF5F57'),
  colorEntry('site/styles.css', ':root', '--mac-minimize', '#FEBC2E'),
  colorEntry('site/styles.css', ':root', '--mac-zoom', '#28C840'),
  colorEntry('site/og.html', ':root', '--bg', tokenAt('color.bg.app.value')),
  colorEntry('site/og.html', ':root', '--surface', tokenAt('color.bg.surface.value')),
  colorEntry('site/og.html', ':root', '--ink', tokenAt('color.text.primary.value')),
  colorEntry('site/og.html', ':root', '--secondary', tokenAt('color.text.secondary.value')),
  colorEntry('site/og.html', ':root', '--tertiary', tokenAt('color.text.tertiary.value')),
  colorEntry('site/og.html', ':root', '--hairline', tokenAt('color.border.hairline.value')),
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
  ['apps/desktop/src/styles.css|.collapsible-message.is-overflowing:not(.is-expanded) .collapsible-body|-webkit-mask-image', 'linear-gradient(to bottom, var(--text-primary) 62%, transparent)'],
  ['apps/desktop/src/styles.css|.collapsible-message.is-overflowing:not(.is-expanded) .collapsible-body|mask-image', 'linear-gradient(to bottom, var(--text-primary) 62%, transparent)'],
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
    ['site/assets/icon.svg|g|1|stroke', tokenAt('color.text.primary.value')],
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
