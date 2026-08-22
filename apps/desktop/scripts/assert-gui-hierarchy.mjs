import { readFile } from 'node:fs/promises';
import path from 'node:path';

// GUI-HIERARCHY-1：层级由字重、间距、对齐与密度承担；线与影只消费既有语汇。
// 该门只锁本票结构，不复制第三方 Skill 的评分或视觉皮层。
const root = path.resolve(import.meta.dirname, '..');
const css = await readFile(path.join(root, 'src', 'styles.css'), 'utf8');
const failures = [];
const need = (condition, message) => {
  if (!condition) failures.push(message);
};

function rules(selector) {
  const expression = new RegExp(`${selector}\\s*\\{([^}]*)\\}`, 'g');
  return [...css.matchAll(expression)].map((match) => match[1]);
}

const parentRules = rules('\\.case-card-select strong, \\.case-card-main strong');
const childRules = rules('\\.stage-row');
const branchRules = rules('\\.rail-case-expand');
const viewportRules = rules('\\.pi-thread-viewport');
const turnRules = rules('\\.pi-turn');
const factsRules = rules('\\.pi-tool-facts');

need(parentRules.some((body) => /font-weight:\s*var\(--control-weight-emphasized\)/.test(body)),
  'GH-C01-a：CaseRail 父级必须消费 control-weight-emphasized');
need(childRules.some((body) => /font-weight:\s*var\(--control-weight-regular\)/.test(body)),
  'GH-C01-a：CaseRail 子级必须消费 control-weight-regular');
need(branchRules.some((body) => /padding:[^;]*18px/.test(body) && /border-left:\s*0/.test(body)),
  'GH-C01-a：父子层级须由缩进表达，展开区不得画左连接线');
need(!/\.rail-case-expand::?(?:before|after)\s*\{/.test(css),
  'GH-C01-a：展开区不得以伪元素补画连接线');

need(viewportRules.some((body) => /gap:\s*var\(--home-section-gap\)/.test(body)),
  'GH-C01-b：Pi Work 顶层节间距必须消费 home-section-gap');
need(turnRules.some((body) => /gap:\s*var\(--control-gap\)/.test(body)),
  'GH-C01-b：Pi Work 节内行距必须消费 control-gap');

need(factsRules.some((body) => /display:\s*grid/.test(body)),
  'GH-C01-c：多事实集合必须使用 grid 列式布局');
need(factsRules.some((body) => /grid-template-columns:\s*minmax\(7ch/.test(body)),
  'GH-C01-c：事实列须有可辨的语义列宽，不得退回等宽文本行');
need(factsRules.every((body) => !/border-(?:left|right|inline-start|inline-end)\s*:/.test(body)),
  'GH-C01-c：事实集合不得用竖线替代列对齐');

const shadows = [...css.matchAll(/box-shadow\s*:\s*([^;]+);/g)].map((match) => match[1].trim());
need(shadows.every((value) => value === 'none' || value === 'none !important' || value === 'var(--elevation-shadow)'),
  'GH-C01-d：阴影只能是 none 或既有唯一 --elevation-shadow');
need(shadows.filter((value) => value === 'var(--elevation-shadow)').length === 1,
  'GH-C01-d：既有唯一 elevation shadow 消费点不得分裂成第二档');

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('GUI-HIERARCHY-1 structural boundaries: OK');
