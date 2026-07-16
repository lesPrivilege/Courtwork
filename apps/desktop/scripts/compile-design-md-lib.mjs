// DESIGN-MD-1 编译核心（纯函数，零依赖，仅 node:crypto 内置）。
// 输入 tokens.json + principles.md 文本，输出 Geist 同形态的机器可读 courtwork-design.md：
//   · YAML frontmatter 承载 token 值（value-only 树，叙述键剥离）+ 非权威/溯源头。
//   · 正文承载用法语义（token 集元信息 + principles.md 要点 + 逐 token 描述）。
// 产物非权威，唯一机器真值仍是 docs/design/tokens.json；本文件不手写任何 token 值。
// 确定性：不读时钟/随机；对象保持 JSON.parse 的键序（整数键按 V8 规范升序，稳定可复现）。
import { createHash } from 'node:crypto';

const GENERATOR = { script: 'apps/desktop/scripts/compile-design-md.mjs', version: 1 };
const TRUTH = 'docs/design/tokens.json';
const PRINCIPLES_PATH = 'docs/design/principles.md';

const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

// —— 最小 YAML 发射器：受限子集（嵌套 map + 标量 + 标量数组）。
//    字符串一律双引号（JSON.stringify 的转义是合法 YAML 双引号标量），规避 #/:/,/CJK 歧义。
const plainKey = /^[A-Za-z_][A-Za-z0-9_]*$/;
const yamlKey = (key) => (plainKey.test(key) ? key : JSON.stringify(String(key)));
const yamlScalar = (value) => {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
  return JSON.stringify(String(value));
};
const yamlLines = (obj, indent) => {
  const pad = '  '.repeat(indent);
  const lines = [];
  for (const [key, value] of Object.entries(obj)) {
    const head = `${pad}${yamlKey(key)}:`;
    if (Array.isArray(value)) {
      if (value.some((item) => item !== null && typeof item === 'object')) {
        throw new Error(`design-md: 不支持对象数组 token（${key}）——请扩展发射器或改用 map`);
      }
      lines.push(`${head} [${value.map(yamlScalar).join(', ')}]`);
    } else if (value !== null && typeof value === 'object') {
      const sub = yamlLines(value, indent + 1);
      if (sub.length === 0) lines.push(`${head} {}`);
      else lines.push(head, ...sub);
    } else {
      lines.push(`${head} ${yamlScalar(value)}`);
    }
  }
  return lines;
};

// —— value-only 树：剥离叙述键（$* 与 description），只留机器值，供 frontmatter。
const stripNarrative = (node) => {
  if (Array.isArray(node)) return node.map(stripNarrative);
  if (node !== null && typeof node === 'object') {
    const out = {};
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith('$') || key === 'description') continue;
      out[key] = stripNarrative(value);
    }
    return out;
  }
  return node;
};

// —— 逐 token 描述：把 $description（组语义）与 description（叶语义）走成正文用法行。
const primaryValue = (node) => {
  if (typeof node.value === 'string' || typeof node.value === 'number') return String(node.value);
  const parts = [];
  for (const channel of ['graphic', 'fg', 'bg']) {
    if (typeof node[channel] === 'string') parts.push(`${channel} ${node[channel]}`);
  }
  return parts.join(' · ');
};
const collectUsage = (node, path, rows) => {
  if (node === null || typeof node !== 'object' || Array.isArray(node)) return;
  if (typeof node.$description === 'string') rows.push(`- \`${path || '（根）'}\` — ${node.$description}`);
  if (typeof node.description === 'string') {
    const value = primaryValue(node);
    rows.push(`- \`${path}\`${value ? ` = \`${value}\`` : ''} — ${node.description}`);
  }
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('$') || key === 'description') continue;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      collectUsage(value, path ? `${path}.${key}` : key, rows);
    }
  }
};

// —— principles.md 要点：丢弃 H1 标题与状态前言，从首个 `## ` 小节起转录规范正文，
//    并把小节降一级（## → ###）以嵌套进本编译件的「二、」节。
const principlesPoints = (principlesText) => {
  const idx = principlesText.indexOf('\n## ');
  const body = idx >= 0 ? principlesText.slice(idx + 1) : principlesText;
  return body.replace(/^## /gm, '### ').replace(/\s+$/, '');
};

// —— token 集元信息：$meta 叙述字段成定义列表（值字段并入 frontmatter tokenSet，不算第二份 token）。
const metaBullets = (meta) =>
  Object.entries(meta)
    .filter(([key]) => !key.startsWith('$'))
    .map(([key, value]) => `- **${key}**：${String(value)}`);

export function compileDesignMd({ tokensText, principlesText }) {
  const tokens = JSON.parse(tokensText);
  const meta = (tokens && typeof tokens === 'object' && tokens.$meta) || {};

  const front = {
    courtwork_design_md: {
      authoritative: false,
      truth: TRUTH,
      note: '编译件，非权威。唯一机器真值是 docs/design/tokens.json；本文件供效果图/视觉生成管线作前置约束。',
      generator: GENERATOR,
      sources: {
        [TRUTH]: { sha256: sha256(tokensText) },
        [PRINCIPLES_PATH]: { sha256: sha256(principlesText) },
      },
      tokenSet: { name: meta.name ?? null, version: meta.version ?? null, date: meta.date ?? null },
    },
    tokens: stripNarrative(tokens),
  };
  const frontmatter = yamlLines(front, 0).join('\n');

  const usage = [];
  collectUsage(tokens, '', usage);

  const body = [
    '# Courtwork Design（机器可读编译件）',
    '',
    '> ⚠️ **非权威。** 本文件由 `apps/desktop/scripts/compile-design-md.mjs` 从',
    '> `docs/design/tokens.json` + `docs/design/principles.md` 编译生成，唯一机器真值是',
    '> `docs/design/tokens.json`。本文件是效果图 / 视觉生成管线的**前置约束**镜像——',
    '> frontmatter 承载 token 值，正文承载用法语义；三层表面、动效四属性白名单、色阶纪律',
    '> 在生成时即生效，把回迁护栏从事后过滤提前到生成时约束。',
    '> token 或原则变更后必须重新编译（`pnpm --filter @courtwork/desktop design:md`），否则 drift 门变红。',
    '',
    '## 一、token 集元信息',
    '',
    ...metaBullets(meta),
    '',
    '## 二、交互与视觉原则（principles.md 要点）',
    '',
    principlesPoints(principlesText),
    '',
    '## 三、token 用法语义（tokens.json 描述派生）',
    '',
    ...usage,
    '',
  ].join('\n');

  return `---\n${frontmatter}\n---\n\n${body.replace(/\s+$/, '')}\n`;
}
