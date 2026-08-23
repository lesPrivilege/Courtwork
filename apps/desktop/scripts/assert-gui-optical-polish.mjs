import { readFile } from 'node:fs/promises';
import path from 'node:path';

// GUI-OPTICAL-POLISH-1：锁 GOP-C01/C02 的几何、层级与按压边界，不把 UI Skills 变成第二套 token。
const root = path.resolve(import.meta.dirname, '..');
const [css, card, panel, viewer, rail, adapter, manifestRaw] = await Promise.all([
  readFile(path.join(root, 'src', 'styles.css'), 'utf8'),
  readFile(path.join(root, 'src', 'pi', 'PiToolCard.tsx'), 'utf8'),
  readFile(path.join(root, 'src', 'pi', 'PiLanePanel.tsx'), 'utf8'),
  readFile(path.join(root, 'src', 'pi', 'PiDraftViewer.tsx'), 'utf8'),
  readFile(path.join(root, 'src', 'rail', 'CaseRail.tsx'), 'utf8'),
  readFile(path.join(root, 'src', 'pi', 'PiActionIcon.tsx'), 'utf8'),
  readFile(path.join(root, 'src', 'icons', 'manifest.json'), 'utf8'),
]);
const manifest = JSON.parse(manifestRaw);

const failures = [];
const need = (condition, message) => {
  if (!condition) failures.push(message);
};

function rules(selector) {
  const expression = new RegExp(`${selector}\\s*\\{([^}]*)\\}`, 'g');
  return [...css.matchAll(expression)].map((match) => match[1]);
}

const composerRules = rules('\\.pi-composer');
const inputRules = rules('\\.pi-composer-input');
const cardRules = rules('\\.pi-tool-card');
const proposalRules = rules('\\.pi-tool-card\\[data-state="proposed"\\]');
const buttonRules = rules('\\.pi-button');
const actionRules = rules('\\.pi-tool-actions');
const proposalPrimaryRules = rules('\\.pi-tool-actions \\.pi-button-primary');
const composerPrimaryRules = rules('\\.pi-composer \\.pi-button-primary');
const railRules = rules('\\.rail-pack-section');
const railLabelRules = rules('\\.rail-pack-section \\.rail-label');
const railStateRules = rules('\\.rail-pack-state');
const railManageRules = rules('\\.rail-pack-manage');
const threadRules = rules('\\.pi-thread');
const viewportRules = rules('\\.pi-thread-viewport');
const iconButtonRules = rules('\\.pi-button-icon');
const actionIconRules = rules('\\.pi-action-icon');

// GOP-C01-a：真实浮面才拿容器圆角；composer 不能再是横贯主面的 raised 带。
need(composerRules.some((body) => /width:\s*min\(calc\(100% - 32px\),\s*var\(--pi-content-measure\)\)/.test(body)),
  'GOP-C01-a：composer 必须收进 calc(100% - 32px) 与 Pi 版心中的较小值');
need(composerRules.some((body) => /margin-inline:\s*auto/.test(body)),
  'GOP-C01-a：composer 必须在主轴居中');
need(composerRules.some((body) => /padding:\s*6px/.test(body)),
  'GOP-C01-a：composer 必须使用 6px 内边距');
need(composerRules.some((body) => /border:\s*1px solid var\(--elevation-float-border\)/.test(body)),
  'GOP-C01-a：composer 外描边必须复用 elevation-float-border');
need(composerRules.some((body) => /border-radius:\s*var\(--elevation-float-radius\)/.test(body)),
  'GOP-C01-a：composer 必须复用既有 L1 radius');
need(composerRules.every((body) => !/box-shadow\s*:/.test(body)),
  'GOP-C01-a：composer 不得新增阴影消费');
need(inputRules.some((body) => /border-radius:\s*6px/.test(body)),
  'GOP-C01-a：composer input 必须使用 6px 内圆角');

// GOP-C01-a：普通账行、索引与事实表是数据面，不得借本票获得卡片层。
need(cardRules.some((body) => /border-radius:\s*0/.test(body)),
  'GOP-C01-a：普通工具账行必须保持直角');
need(cardRules.every((body) => !/box-shadow\s*:/.test(body)),
  'GOP-C01-a：工具账行不得消费阴影');
need(proposalRules.some((body) => /border-radius:\s*6px/.test(body)),
  'GOP-C01-a：proposal 卡片必须使用既有 6px 卡片圆角');
for (const [name, selector] of [
  ['工作稿索引', '\\.pi-drafts'],
  ['工作稿行', '\\.pi-draft-row'],
  ['事实集合', '\\.pi-tool-facts'],
]) {
  const bodies = rules(selector);
  need(bodies.length > 0 && bodies.every((body) => !/border-radius\s*:|box-shadow\s*:/.test(body)),
    `GOP-C01-a：${name}不得获得圆角或投影`);
}

// GOP-C01-b：控制件和决定簇的几何/顺序。
need(buttonRules.some((body) => /display:\s*inline-flex/.test(body) && /align-items:\s*center/.test(body) && /justify-content:\s*center/.test(body)),
  'GOP-C01-b：.pi-button 必须 inline-flex 且居中文字');
need(actionRules.some((body) => /justify-content:\s*flex-end/.test(body)),
  'GOP-C01-b：proposal 决定簇必须贴 trailing edge');
need(proposalPrimaryRules.some((body) => /min-height:\s*var\(--control-height-md\)/.test(body)),
  'GOP-C01-b：proposal primary 必须消费 control-height-md');
need(composerPrimaryRules.some((body) => /min-height:\s*var\(--control-height-md\)/.test(body)),
  'GOP-C01-b：composer primary 必须消费 control-height-md');
need(!/\.pi-tool-card:not\(\[data-state="proposed"\]\)/.test(css),
  'GOP-C01-b：工具卡布局不得以 proposed 反向否定选择器制造第二层结构');

const denyIndex = card.indexOf('data-testid="pi-deny"');
const approveIndex = card.indexOf('data-testid="pi-approve"');
need(denyIndex >= 0 && approveIndex > denyIndex,
  'GOP-C01-b：proposal DOM/键盘顺序必须拒绝在前、允许收尾');
need(/\{state !== 'proposed'\s*&&\s*\(\s*<header[^>]*className="pi-tool-head"/.test(card),
  'GOP-C01-c：proposed 状态不得渲染空 tool header');

// GOP-C01-c：rail 状态与管理入口同一 grid，label 跨列。
need(railRules.some((body) => /grid-template-columns:\s*minmax\(0,\s*1fr\) auto/.test(body)),
  'GOP-C01-c：rail pack section 必须使用 minmax(0, 1fr) auto');
need(railLabelRules.some((body) => /grid-column:\s*1 \/ -1/.test(body)),
  'GOP-C01-c：rail label 必须跨两列');
need(railStateRules.some((body) => /grid-column:\s*1/.test(body)),
  'GOP-C01-c：rail 状态文案必须落左列');
need(railManageRules.some((body) => /grid-column:\s*2/.test(body) && /justify-self:\s*end/.test(body)),
  'GOP-C01-c：rail 管理入口必须落右列并贴右');

// GOP-C01-d：primary 只进入既有 press whitelist；focus-visible、reduce-motion 都明确排除缩放。
const primaryPressBlocks = [...css.matchAll(/:is\(([^{}]*\.pi-button-primary[^{}]*)\):active:not\(:focus-visible\)[^{]*\{([^}]*)\}/g)];
need(primaryPressBlocks.length >= 2, 'GOP-C01-d：primary press whitelist 必须同时覆盖常态与 reduced-motion 规则');
need(primaryPressBlocks.some(([, , body]) => /transform:\s*scale\(\.98\)/.test(body)),
  'GOP-C01-d：primary pointer press 必须使用 scale(.98)');
need(primaryPressBlocks.some(([, , body]) => /transform:\s*none/.test(body)),
  'GOP-C01-d：reduced-motion 下 primary press 必须取消缩放');
need(!/transition\s*:\s*all\b/i.test(css),
  'GOP-C01-d：不得使用 transition: all');
need(!/^\.pi-button[^{}]*\{[^{}]*transform\s*:/m.test(css),
  'GOP-C01-d：普通按钮/quiet 动作不得获得 transform 按压');

// GOP-C02：composer 是 viewport 后的正常 flex 末项，不覆盖内容，也不靠定位沉底。
need(rules('\\.pi-panel').some((body) => /display:\s*flex/.test(body) && /flex-direction:\s*column/.test(body)),
  'GOP-C02：Pi panel 必须是纵向 flex 容器');
need(threadRules.some((body) => /flex:\s*1\s+1\s+auto/.test(body) && /min-height:\s*0/.test(body)),
  'GOP-C02：pi thread 必须占据剩余高度并允许收缩');
need(viewportRules.some((body) => /flex:\s*1/.test(body) && /min-height:\s*0/.test(body) && /overflow:\s*auto/.test(body)),
  'GOP-C02：viewport 必须独立滚动且允许收缩');
need(composerRules.some((body) => /flex:\s*0\s+0\s+auto/.test(body) && /margin-bottom:\s*16px/.test(body)),
  'GOP-C02：composer 必须是 flex 末项并保留 16px 底部安全边');
need(composerRules.every((body) => !/position:\s*(?:absolute|fixed|sticky)/.test(body)),
  'GOP-C02：composer 不得用 absolute/fixed/sticky 覆盖 viewport');

// GOP-C02：动作 chrome 使用固定点击面；图形尺寸仍由 custom SVG 适配层统一提供。
need(iconButtonRules.some((body) => /width:\s*32px/.test(body) && /height:\s*32px/.test(body) && /padding:\s*0/.test(body)),
  'GOP-C02：icon-only button 必须是 32×32 且无文字内边距');
need(buttonRules.some((body) => /border-radius:\s*4px/.test(body)),
  'GOP-C02：icon-only button 必须继承既有 4px chrome 圆角');
need(actionIconRules.some((body) => /width:\s*18px/.test(body) && /height:\s*18px/.test(body)),
  'GOP-C02：动作 SVG 必须锁定 18px 视觉尺寸');
const actionSources = [panel, card, viewer, rail].join('\n');
need(adapter.includes('customIcons') && !adapter.includes('lucide-react'),
  'GOP-C02：PiActionIcon 必须只消费 generated custom SVG，不得替换为 Lucide');
need(!/<svg\b/.test(adapter),
  'GOP-C02：PiActionIcon 适配层不得内联 SVG 几何');
for (const testid of [
  'pi-bind-folder', 'pi-open-model-settings', 'pi-start', 'pi-restart', 'pi-send', 'pi-stop',
  'pi-deny', 'pi-approve', 'pi-verify-uncertain', 'pi-draft-open', 'pi-viewer-close',
]) {
  need(actionSources.includes(`data-testid="${testid}"`), `GOP-C02：动作 ${testid} 缺少稳定 testid`);
}
for (const [name, source] of [
  ['agent-send', panel], ['agent-stop', panel], ['agent-restart', panel],
  ['agent-settings', panel], ['agent-close', viewer], ['agent-open', panel],
  ['bound-folder', panel], ['bound-folder', rail],
  ['cards-play', panel], ['split-gate-slash', card], ['split-gate-check', card], ['ring-check', card],
]) {
  need(source.includes(`<PiActionIcon name="${name}"`), `GOP-C02：${name} 未通过 PiActionIcon 适配层消费`);
}
need(/data-testid=\{`rail-pack-manage-\$\{item\.id\}`\}/.test(rail),
  'GOP-C02：rail manage 必须保留动态 testid 并走 icon-only chrome');
need(panel.includes('className="pi-draft-path"') && /className="[^"]*pi-draft-open/.test(panel),
  'GOP-C02：draft path 必须是按钮外的 sibling 数据列');
const panelButtonBlocks = panel.match(/<button\b[\s\S]*?<\/button>/g) ?? [];
need(!panelButtonBlocks.some((button) => {
  if (!/className="[^"]*pi-draft-open[^"]*"/.test(button)) return false;
  return /^\s*\{draft\.logicalPath\}/.test(button.slice(button.indexOf('>') + 1));
}),
  'GOP-C02：draft path 不得回到 open button 的可见文字子节点');
const expectedC02Icons = ['agent-close', 'agent-open', 'agent-restart', 'agent-send', 'agent-settings', 'agent-stop'];
const manifestNames = manifest.map((entry) => entry.name).sort();
need(manifestNames.length === 26, 'GOP-C02：custom icon manifest 必须有 26 枚具名 SVG');
need(JSON.stringify(manifest.filter((entry) => entry.addedInSpec === 'GUI-OPTICAL-POLISH-1').map((entry) => entry.name).sort()) === JSON.stringify(expectedC02Icons),
  'GOP-C02：manifest 必须登记六枚 GUI-OPTICAL-POLISH-1 Agent/Pi Work SVG');

// 光学本票只能消费既有 token/中性值；新增颜色或阴影都应在这里先红。
const opticalBodies = [
  ...composerRules,
  ...inputRules,
  ...cardRules,
  ...proposalRules,
  ...buttonRules,
  ...actionRules,
  ...proposalPrimaryRules,
  ...composerPrimaryRules,
  ...railRules,
  ...railLabelRules,
  ...railStateRules,
  ...railManageRules,
];
need(opticalBodies.every((body) => !/(#[0-9a-f]{3,8}|\b(?:rgba?|hsla?)\s*\()/i.test(body)),
  'GOP-C01：光学选择器不得新增字面颜色值');

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('GUI-OPTICAL-POLISH-1 GOP-C01/C02 structural boundaries: OK');
