// DESIGN-MD-1 编译器单测（node:test，零依赖）。
// 证明：编译确定性、token 变更漂移敏感、无第二份手写 token、Geist 同形态
// （YAML frontmatter 承载 token 值 / 正文承载用法语义）、产物头部非权威声明、来源 sha 溯源。
// 纯逻辑单测喂合成源；一条不变量（输出 hex ⊆ tokens.json）读真实 tokens 佐证。
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { compileDesignMd } from './compile-design-md-lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');

// —— 合成源：足够小以便断言精确，覆盖 $meta / 嵌套 value / 多轨语义 / space 数字键 / motion。
const TOKENS = JSON.stringify({
  $meta: {
    name: 'x-tokens',
    version: '9.9.9',
    date: '2026-01-01',
    status: '合成真值',
    theme: '浅色唯一',
  },
  color: {
    text: { primary: { value: '#0A2540', description: '正文藏青黑' } },
    action: { primaryBg: { value: '#0A2540', description: '主按钮底 = ink' } },
    semantic: {
      $description: '语义色预算全表',
      severity: {
        high: { graphic: '#DC2626', fg: '#B91C1C', bg: '#FEF2F2', description: '高危' },
      },
    },
  },
  space: { 1: 4, 2: 8 },
  motion: { stateChange: { value: '0ms', description: '语义状态 0ms 硬切' } },
});

const PRINCIPLES = [
  '# 组件与交互原则',
  '',
  '状态：现行规范。数值以 tokens.json 为唯一机器真值。',
  '',
  '## 1. 三层表面',
  '',
  '- L0 画布无投影。',
  '',
  '## 5. 动效',
  '',
  '允许动画属性只有 transform、opacity、background-color、border-color。',
  '',
].join('\n');

const compile = () => compileDesignMd({ tokensText: TOKENS, principlesText: PRINCIPLES });

const HEX = /#[0-9a-fA-F]{3}\b|#[0-9a-fA-F]{6}\b/g;
const norm = (hex) => {
  const h = hex.toLowerCase();
  return h.length === 4 ? `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}` : h;
};
const hexes = (text) => new Set((text.match(HEX) ?? []).map(norm));

const splitFrontmatter = (md) => {
  assert.ok(md.startsWith('---\n'), 'frontmatter 起始栅栏缺失');
  const end = md.indexOf('\n---\n', 4);
  assert.ok(end > 0, 'frontmatter 结束栅栏缺失');
  return { frontmatter: md.slice(4, end), body: md.slice(end + 5) };
};

test('编译确定性：同源两次编译逐字节相等', () => {
  assert.equal(compile(), compile());
});

test('Geist 同形态：frontmatter 承载 token 值，正文承载用法语义', () => {
  const { frontmatter, body } = splitFrontmatter(compile());
  // frontmatter = 机器 token 值
  assert.match(frontmatter, /\ntokens:\n/);
  assert.ok(frontmatter.includes('#0A2540'), 'token 值须落 frontmatter');
  assert.ok(frontmatter.includes('#DC2626'), '多轨语义图形色须落 frontmatter');
  // 正文 = 用法语义：principles 要点 + 逐 token 描述
  assert.ok(body.includes('三层表面'), 'principles 要点须落正文');
  assert.ok(body.includes('动效'), 'principles 要点须落正文');
  assert.ok(body.includes('正文藏青黑'), '逐 token 描述须落正文');
  assert.ok(body.includes('语义色预算全表'), '$description 组语义须落正文');
});

test('要点提取：丢弃 principles 标题与状态前言（编译而非原样粘贴）', () => {
  const { body } = splitFrontmatter(compile());
  assert.ok(!body.includes('状态：现行规范'), '状态前言应被剔除');
});

test('产物头部声明非权威、tokens.json 为唯一真值', () => {
  const md = compile();
  assert.ok(md.includes('authoritative: false'), 'frontmatter 须声明 authoritative: false');
  assert.ok(md.includes('docs/design/tokens.json'), '须点名 tokens.json 为真值');
  assert.ok(md.includes('非权威'), '正文须有人读非权威声明');
});

test('漂移敏感：改一个 token 值 → 产物变化且新值出现在产物中', () => {
  const mutated = TOKENS.replace('#0A2540', '#0B2641');
  const before = compile();
  const after = compileDesignMd({ tokensText: mutated, principlesText: PRINCIPLES });
  assert.notEqual(after, before, 'token 变更须改变产物（drift 门据此触红）');
  assert.ok(after.includes('#0B2641'), '新 token 值须真正被搬入产物（非仅哈希）');
});

test('无第二份手写 token：产物中每个 hex 都来自 tokens.json（真实 tokens）', () => {
  const realTokens = readFileSync(resolve(root, 'docs/design/tokens.json'), 'utf8');
  const realPrinciples = readFileSync(resolve(root, 'docs/design/principles.md'), 'utf8');
  const out = compileDesignMd({ tokensText: realTokens, principlesText: realPrinciples });
  const allowed = hexes(realTokens);
  for (const h of hexes(out)) {
    assert.ok(allowed.has(h), `产物 hex ${h} 不在 tokens.json 声明集（疑似手写第二份 token）`);
  }
});

test('来源溯源：tokens.json 的 sha256 嵌入产物，且随源变化', () => {
  const md = compile();
  const sha = createHash('sha256').update(TOKENS).digest('hex');
  assert.ok(md.includes(sha), 'tokens 源 sha256 须嵌入产物 frontmatter');
  const mutated = TOKENS.replace('#0A2540', '#0B2641');
  assert.ok(!compileDesignMd({ tokensText: mutated, principlesText: PRINCIPLES }).includes(sha), 'sha 须随源变化');
});
