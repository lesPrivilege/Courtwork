import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { validateVersionalSite } from './versional-language-contract-lib.mjs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const desktopCss = readFileSync(new URL('../../apps/desktop/src/styles.css', import.meta.url), 'utf8');

test('版本学 Pages 平框、组界与眉批契约全绿', () => {
  assert.deepEqual(validateVersionalSite({ html, css, desktopCss }), []);
});

test('注入 routine 竖格线复活时定点失败', () => {
  const mutated = css.replace('.scenario-proof li { min-width: 0; padding: 18px 4px; border-right: 0;', '.scenario-proof li { min-width: 0; padding: 18px 4px; border-right: 1px solid var(--border-hairline);');
  assert.match(validateVersionalSite({ html, css: mutated, desktopCss }).join('\n'), /routine 竖格线复活/);
});

test('注入刊记锚丢失时定点失败', () => {
  assert.match(validateVersionalSite({ html: html.replace(' id="release-colophon"', ''), css, desktopCss }).join('\n'), /平框刊记缺失/);
});

test('注入眉批退回四周卡框时定点失败', () => {
  const mutated = css.replace('border: 0; border-block: 0; background: transparent;', 'border: 1px solid var(--border-hairline); border-block: 0; background: transparent;');
  assert.match(validateVersionalSite({ html, css: mutated, desktopCss }).join('\n'), /眉批带退回卡框/);
});

test('注入参考浅宗色阶漂移时定点失败', () => {
  const mutated = css.replace('--bg-app: #F7F8FA;', '--bg-app: #F7F8FB;');
  assert.match(validateVersionalSite({ html, css: mutated, desktopCss }).join('\n'), /VL2-C01 Pages 浅宗色阶漂移/);
});

test('注入 hero 宋体退回轻端时定点失败', () => {
  const mutated = css.replace('h1.zh-title { font-weight: 700; }', 'h1.zh-title { font-weight: 400; }');
  assert.match(validateVersionalSite({ html, css: mutated, desktopCss }).join('\n'), /VL2-T01 hero 标题/);
});

test('注入 Pages 四栏 routine 竖线复活时定点失败', () => {
  const mutated = css.replace('.evidence-step { position: relative; min-width: 0; padding: 32px 24px 0; border-right: 0;', '.evidence-step { position: relative; min-width: 0; padding: 32px 24px 0; border-right: 1px solid var(--border-hairline);');
  assert.match(validateVersionalSite({ html, css: mutated, desktopCss }).join('\n'), /VL2-L01 Pages 连续叙事/);
});

test('注入 Agent 文书标题线复活时定点失败', () => {
  const mutated = desktopCss.replace('.document-preview header { display: flex; justify-content: space-between; gap: 12px; padding-bottom: 8px; border-bottom: 0;', '.document-preview header { display: flex; justify-content: space-between; gap: 12px; padding-bottom: 8px; border-bottom: var(--rule-minor) solid var(--border);');
  assert.match(validateVersionalSite({ html, css, desktopCss: mutated }).join('\n'), /VL2-L02 Agent 文书与进度面/);
});

test('注入 composer focus 强边界透明时定点失败', () => {
  const mutated = desktopCss.replace(
    '.composer-shell:focus-within { border-color: var(--text-tertiary); }',
    '.composer-shell:focus-within { border-color: transparent; }',
  );
  assert.match(validateVersionalSite({ html, css, desktopCss: mutated }).join('\n'), /composer focus 强边界退场/);
});

test('注入 Pages 磁青宗 token 漂移时定点失败', () => {
  const mutated = css.replace('--bg-app: #0F1622;', '--bg-app: #101722;');
  assert.match(validateVersionalSite({ html, css: mutated, desktopCss }).join('\n'), /VL3-C01 Pages 磁青宗色阶漂移/);
});

test('注入 Agent 重要标题 token 不同源时定点失败', () => {
  const mutated = desktopCss.replace('--important-title: #d9ae6a;', '--important-title: #d8ae6a;');
  assert.match(validateVersionalSite({ html, css, desktopCss: mutated }).join('\n'), /VL3-C02 Agent／Pages/);
});

test('注入泥金进入正文时定点失败', () => {
  const mutated = css.replace('.hero-lead {', '.hero-lead { color: var(--important-title);');
  assert.match(validateVersionalSite({ html, css: mutated, desktopCss }).join('\n'), /VL3-T02 泥金越界/);
});
