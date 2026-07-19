// 线级语法（docs/design/courtwork-design.md §10 / docs/design/tokens.json rule.*）共享解析。
// 只做一件事：把 styles.css 的每一条 `Npx solid <色>` 边框声明还原为 (选择器, 边, 宽度源) 三元组，
// 供 assert-rule-grammar.mjs 与其自测共用。规则层判断全部留在门本体。

const BORDER = /border(-top|-bottom|-left|-right)?\s*:\s*(var\(--rule-(?:major|minor)\)|\d+px)\s+solid\s+([^;}!]+?)(\s*!important)?\s*(?=[;}]|$)/g;
/** 只写宽度的边框声明（如 kbd 的 border-bottom-width: 2px）——同属线宽字面量，不得逃过普查。 */
const BORDER_WIDTH = /border(?:-(?:top|bottom|left|right))?-width\s*:\s*(\d+px)/g;

/** 折叠空白，令 `.a,\n  .b` 与 `.a, .b` 视为同一选择器键。 */
export function normalizeSelector(raw) {
  return raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim();
}

/**
 * 容忍式扫描：按花括号深度跟踪当前规则头，@media/@container 内的规则同样计入
 * （其选择器键与顶层同名规则相同——响应式覆写与本体属同一消费点，分类必须一致）。
 */
export function collectBorderSites(css) {
  const sites = [];
  let cursor = 0;
  const stack = [];
  while (cursor < css.length) {
    const open = css.indexOf('{', cursor);
    const close = css.indexOf('}', cursor);
    if (open === -1 && close === -1) break;
    if (open !== -1 && (close === -1 || open < close)) {
      const head = normalizeSelector(css.slice(cursor, open));
      stack.push(head);
      cursor = open + 1;
      continue;
    }
    const body = css.slice(cursor, close);
    const selector = stack[stack.length - 1] ?? '';
    if (selector && !selector.startsWith('@')) {
      for (const match of body.matchAll(BORDER)) {
        sites.push({
          selector,
          side: match[1] ? match[1].slice(1) : 'all',
          width: match[2],
          color: match[3].trim(),
          important: Boolean(match[4]),
          line: css.slice(0, cursor + match.index).split('\n').length,
        });
      }
      for (const match of body.matchAll(BORDER_WIDTH)) {
        sites.push({
          selector,
          side: 'width-only',
          width: match[1],
          color: '(width-only)',
          important: false,
          line: css.slice(0, cursor + match.index).split('\n').length,
        });
      }
    }
    stack.pop();
    cursor = close + 1;
  }
  return sites;
}

export const siteKey = (site) => `${site.selector}|${site.side}`;

/**
 * 取出选择器列表含 `<selector>` 的规则体。文武线的细线按边分组书写
 * （`.a::after, .b::after { … }`），逐名正则会被逗号挡住，故按选择器列表逐项比对。
 */
export function findRuleBody(css, selector) {
  let cursor = 0;
  while (cursor < css.length) {
    const open = css.indexOf('{', cursor);
    if (open === -1) return undefined;
    const close = css.indexOf('}', open);
    if (close === -1) return undefined;
    const head = normalizeSelector(css.slice(cursor, open));
    if (!head.startsWith('@') && head.split(',').some((part) => normalizeSelector(part) === selector)) {
      return css.slice(open + 1, close);
    }
    cursor = close + 1;
  }
  return undefined;
}
