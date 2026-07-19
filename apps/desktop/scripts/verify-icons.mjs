import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { optimize } from 'svgo';
import svgoConfig, { svgPolicy } from '../svgo.config.mjs';
import { generateCustomIconModule } from './generate-custom-icons.mjs';

const iconDirectory = resolve('src/icons/custom');
const manifestPath = resolve('src/icons/manifest.json');
const generatedPath = resolve('src/icons/custom-icons.generated.ts');
const allowedElements = new Set(['svg', 'path', 'line', 'polygon', 'polyline', 'circle', 'ellipse', 'rect']);
const allowedAttributes = {
  svg: new Set(['xmlns', 'viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin']),
  path: new Set(['d']),
  line: new Set(['x1', 'x2', 'y1', 'y2']),
  polygon: new Set(['points']),
  polyline: new Set(['points']),
  circle: new Set(['cx', 'cy', 'r']),
  ellipse: new Set(['cx', 'cy', 'rx', 'ry']),
  rect: new Set(['x', 'y', 'width', 'height', 'rx']),
};
const requiredAttributes = {
  path: ['d'],
  line: ['x1', 'x2', 'y1', 'y2'],
  polygon: ['points'],
  polyline: ['points'],
  circle: ['cx', 'cy', 'r'],
  ellipse: ['cx', 'cy', 'rx', 'ry'],
  rect: ['x', 'y', 'width', 'height'],
};
const kebabCase = /^[a-z]+(?:-[a-z]+)*$/;
const attributePattern = /([:\w-]+)\s*=\s*"([^"]*)"/g;
const violations = [];
if (svgPolicy.removeViewBox !== false) violations.push('svgo: removeViewBox 必须显式为 false');

function attributesOf(raw) {
  return Object.fromEntries([...raw.matchAll(attributePattern)].map((match) => [match[1], match[2]]));
}

function validateSvg(name, source) {
  if (!kebabCase.test(name)) violations.push(`${name}: 文件名不是形状式 kebab-case`);
  if (/<!--|<\?|<!DOCTYPE|=\s*'/.test(source)) violations.push(`${name}: 含注释、声明或单引号属性`);
  if (/#(?:[0-9a-f]{3,8})\b|\brgba?\(|\bhsla?\(|var\(--|\b(?:red|blue|green|black|white|gray|grey|orange|yellow|purple)\b/i.test(source)) {
    violations.push(`${name}: 含内联色值`);
  }

  const tags = [...source.matchAll(/<\/?([A-Za-z][\w:-]*)\b/g)].map((match) => match[1]);
  for (const tag of tags) if (!allowedElements.has(tag)) violations.push(`${name}: 非白名单元素 <${tag}>`);
  const textOnly = source.replace(/<[^>]+>/g, '').trim();
  if (textOnly) violations.push(`${name}: SVG 内含文本节点`);

  const openings = [...source.matchAll(/<([A-Za-z][\w:-]*)([^>]*)>/g)];
  if (openings.length < 2 || openings[0][1] !== 'svg') violations.push(`${name}: 缺少根 svg 或几何为空`);
  for (const opening of openings) {
    const [, tag, raw] = opening;
    if (!allowedElements.has(tag)) continue;
    const attributes = attributesOf(raw);
    const parsedCount = [...raw.matchAll(attributePattern)].length;
    const residual = raw
      .replace(attributePattern, '')
      .replace(/\//g, '')
      .trim();
    if (residual || parsedCount !== Object.keys(attributes).length) violations.push(`${name}: <${tag}> 有不可解析或重复属性`);
    for (const attribute of Object.keys(attributes)) {
      if (!allowedAttributes[tag].has(attribute)) violations.push(`${name}: <${tag}> 禁止属性 ${attribute}`);
      if (/^on/i.test(attribute) || ['style', 'class', 'id', 'transform'].includes(attribute)) violations.push(`${name}: <${tag}> 含危险属性 ${attribute}`);
    }
    for (const required of requiredAttributes[tag] ?? []) {
      if (!attributes[required]) violations.push(`${name}: <${tag}> 缺少 ${required}`);
    }
    for (const value of Object.values(attributes)) {
      for (const number of value.matchAll(/-?\d+\.\d+/g)) {
        if ((number[0].split('.')[1]?.length ?? 0) > 2) violations.push(`${name}: 数值精度超过两位 ${number[0]}`);
      }
    }
  }

  const root = attributesOf(openings[0]?.[2] ?? '');
  const expectedRoot = {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '1.35',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  };
  for (const [attribute, expected] of Object.entries(expectedRoot)) {
    if (root[attribute] !== expected) violations.push(`${name}: 根属性 ${attribute} 应为 ${expected}`);
  }
  if (root.width || root.height) violations.push(`${name}: 根元素禁止固定尺寸`);

  const optimized = optimize(source, { ...svgoConfig, path: `${name}.svg` }).data.trim();
  if (optimized !== source.trim()) violations.push(`${name}: 未通过 svgo multipass 规范化`);
}

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

const files = readdirSync(iconDirectory).filter((file) => file.endsWith('.svg')).sort();
const names = files.map((file) => file.slice(0, -4));
for (const file of files) validateSvg(file.slice(0, -4), readFileSync(resolve(iconDirectory, file), 'utf8'));

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const manifestNames = manifest.map((entry) => entry.name).sort();
if (new Set(manifestNames).size !== manifestNames.length) violations.push('manifest: name 重复');
if (JSON.stringify(names) !== JSON.stringify(manifestNames)) violations.push('manifest: 与 SVG 文件不是一一对应');
// P-4 起 17 概念 / 19 具名；RP-2.10 增 brand-mark（#26.3 推理指示锚）→ 20 具名。
if (names.length !== 20) violations.push(`manifest: 应有 18 概念 / 20 具名 SVG，实际 ${names.length}`);
if (manifest.filter((entry) => entry.family === 'split-gate').length !== 3) violations.push('manifest: split-gate 必须恰有三态');
const allowedSpecs = new Set(['P-4', 'RP-2.10']);
for (const entry of manifest) {
  if (!kebabCase.test(entry.name) || !kebabCase.test(entry.family)) violations.push(`manifest: ${entry.name} 名称或 family 非 kebab-case`);
  if (!Array.isArray(entry.tags) || !entry.tags.length || entry.tags.some((tag) => !kebabCase.test(tag))) violations.push(`manifest: ${entry.name} tags 无效`);
  if (typeof entry.concept !== 'string' || !entry.concept.trim()) violations.push(`manifest: ${entry.name} concept 为空`);
  if (!allowedSpecs.has(entry.addedInSpec)) violations.push(`manifest: ${entry.name} addedInSpec 非法`);
}

if (!readFileSync(resolve('src/main.tsx'), 'utf8').includes('<LucideProvider strokeWidth={1.35}>')) violations.push('LucideProvider 未全局锁定 strokeWidth=1.35');
const iconSource = readFileSync(resolve('src/workbench/Icon.tsx'), 'utf8');
if (iconSource.includes('const paths')) violations.push('存量 Icon.tsx 仍含手写通用 SVG 路径表');
if (!/from 'lucide-react'/.test(iconSource)) violations.push('Icon.tsx 未从 Lucide 静态导入通用图标');
if (/tabler/i.test(readFileSync(resolve('package.json'), 'utf8'))) violations.push('本批未触发 Tabler 缺口，不应引入 Tabler');
/**
 * 记号系豁免（SKIN-B4）。B0 速裁「线级组不经 icon 门」，但**不经 icon 门不等于无门**——
 * `assert-schema-parts.mjs` 才是记号系的门（站/壳单源逐字相等、件内零字面色、零内联复制、
 * 消费登记双向锁）。故本条禁令按其**本意**收窄而非放宽：禁的是**几何**进 TSX，
 * 不是禁 `<svg` 这四个字符。
 *
 * 两种形态剥出禁令之外：① `<use href="#mark-*">` 引用——零几何，它是指针不是图形；
 * ② 件库 `src/icons/schema-parts.tsx`——记号几何的唯一住所，其纯度（除 symbol 外零几何）
 * 由 schema-parts 门第 ⑧ 条锁。剥完仍有 `<svg` 即照旧红。
 * 同款剥法在 `assert-rp211-contracts.mjs` 另有一份：两处若漂移，严的那一份先红，方向安全。
 */
const MARK_LIBRARY = resolve('src/icons/schema-parts.tsx');
const stripMarkRefs = (source) => source.replace(
  /<svg\b[^>]*>\s*<use\s+href="#mark-[a-z-]+"\s*\/>\s*<\/svg>/g,
  '',
);
for (const file of sourceFiles(resolve('src'))) {
  const source = readFileSync(file, 'utf8');
  if (file !== MARK_LIBRARY && /<svg\b/.test(stripMarkRefs(source))) violations.push(`${file.replace(`${resolve('.')}/`, '')}: 禁止 TSX 内联 SVG；改用 Lucide 或登记的 SVG-as-code 源稿`);
  if (/lucide-react/.test(source) && /import\s+\*|DynamicIcon|lucide-react\/dynamic|\bicons\s*(?:,|})/.test(source)) {
    violations.push(`${file.replace(`${resolve('.')}/`, '')}: Lucide 必须静态具名导入，禁止全量表或 DynamicIcon`);
  }
}

const expectedGenerated = generateCustomIconModule();
const actualGenerated = existsSync(generatedPath) ? readFileSync(generatedPath, 'utf8') : '';
if (expectedGenerated !== actualGenerated) violations.push('custom-icons.generated.ts 与 SVG 源稿漂移，请运行 pnpm icons:generate');

if (violations.length) throw new Error(`SVG 图标门禁失败：\n${violations.join('\n')}`);
globalThis.process.stdout.write(`SVG 图标门禁通过：${names.length} 个具名 SVG（18 概念）+ Lucide 静态按需导入\n`);
