// 线级语法门（SKIN-B3）。权威：docs/design/courtwork-design.md §10 + docs/design/tokens.json rule.*。
//
// 线重即层级语义，不是装饰。本门锁四件事：
//   ① 单源——CSS 的 --rule-* 与 tokens.json rule.* 逐值相等，且 major > minor（层级不可倒置）。
//   ② 文武线完整——每条主界必须「元素 border + ::after border」两线俱在，零 gradient、零 box-shadow。
//   ③ 逐点分类——styles.css 的每一条线宽声明都必须在下方清单里有归属与理由。
//      「答不出即不换」是设计法：不换的线同样要具名登记，不许沉默留一条无主的 1px。
//   ④ 线级不择纸温——宽度三槽全局各只声明一次，不得随宗（theme）改写；随宗的只有 ink。
//
// 清单键＝`选择器|边`，选择器按空白折叠归一。@container/@media 内的响应式覆写与本体同键，
// 因其是同一消费点的另一视口取值，分类必须一致。

import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { collectBorderSites, findRuleBody, siteKey } from './rule-grammar-lib.mjs';

const root = process.cwd();
const css = readFileSync(path.join(root, 'src/styles.css'), 'utf8');
const tokens = JSON.parse(readFileSync(path.resolve(root, '..', '..', 'docs', 'design', 'tokens.json'), 'utf8'));
const tierLedger = JSON.parse(readFileSync(path.resolve(root, '..', '..', 'docs', 'design', 'r2-tier-ledger.json'), 'utf8'));

// ── 主界：文武线（粗细双线错落）────────────────────────────────────────────
// 收口判据三条，缺一即不入：
//   (a) 壳的骨架带——线两侧是宿主的两个结构区段（chrome 带 ↔ 内容）。数据区/文书纸面/schema 表
//       一律不入：激进度梯度定 schema 面最保守，作者性只落壳的 chrome，不抢裁决面的庄重。
//   (b) 横界——文武线在刻本里是版框的天头地脚，竖分是界行（乌丝栏）的职分；故竖向分栏一律归次界。
//   (c) 非滚动容器——细线走绝对定位，在 overflow 容器里会随内容卷走。`.view-tabs`（overflow-x）
//       与 `.settings-nav`（overflow-y）因此退次界：加包裹元素才能画，而那要动 TSX，越出本单范围。
const MAJOR = {
  '.panel-head|bottom': '面板标题带 ↔ 面板内容',
  '.preview-host-head|bottom': '阅读宿主头 ↔ 文档内容',
  '.settings-header|bottom': '设置页头 ↔ 设置体',
  '.gallery-header|bottom': '件库页头 ↔ 件库网格',
};

// ── 次界：乌丝细线 ────────────────────────────────────────────────────────
// 行分隔 / 单元格网格 / 内层容器 / 段内分隔 / 面内分栏——同一区段内的并列关系。
// 值与迁移前逐像素相同（--rule-minor ≡ 1px）：本档只是把宽度从字面量换成按名消费，
// 不动一格版面，故 e2e 的 1px 断言不因本批改判。
const MINOR = {
  // 行分隔
  '.session-history-head|bottom': 'P1-M04：会话台账空态退场，回单线',
  '.session-entry|bottom': '行分隔',
  '.session-transcript-turn|bottom': '行分隔',
  '.dense-row|bottom': '行分隔',
  '.nonapplied-item|bottom': '行分隔',
  '.originals-list li|bottom': '行分隔',
  '.settings-row|bottom': '行分隔',
  '.gallery-ledger li|bottom': '行分隔',
  '.gallery-timeline li|left': '行分隔（时间轴轨）',
  '.visual-decision-actions .question-option|bottom': '行分隔',
  '.interaction-anchor|bottom': '行分隔',
  '.relation-list button|bottom': '行分隔',
  '.file-ops-table th, .file-ops-table td|bottom': '单元格网格',
  // 单元格网格
  '.table-head|bottom': '单元格网格（表头行）',
  '.artifact-table th, .artifact-table td|right': '单元格网格',
  '.artifact-table th, .artifact-table td|bottom': '单元格网格',
  '.matrix-wrap th|right': '单元格网格',
  '.matrix-wrap th|bottom': '单元格网格',
  '.matrix-wrap td|right': '单元格网格',
  '.matrix-wrap td|bottom': '单元格网格',
  '.md-table th, .md-table td|right': '单元格网格',
  '.md-table th, .md-table td|bottom': '单元格网格',
  '.risk-status-ledger > div|right': '单元格网格',
  '.gallery-grid|left': '单元格网格',
  '.gallery-specimen|right': '单元格网格',
  '.gallery-specimen|bottom': '单元格网格',
  '.gallery-specimen th, .gallery-specimen td|all': '单元格网格',
  '.gallery-coverage|top': '单元格网格',
  '.gallery-coverage|left': '单元格网格',
  '.gallery-coverage div|right': '单元格网格',
  '.gallery-coverage div|bottom': '单元格网格',
  '.gallery-graph|top': '单元格网格',
  '.gallery-graph|left': '单元格网格',
  '.gallery-graph span|right': '单元格网格',
  '.gallery-graph span|bottom': '单元格网格',
  // 内层容器
  '.file-ops-toolbar|all': '内层容器',
  '.file-ops-table|all': '内层容器（表框）',
  '.file-ops-report|all': '内层容器',
  '.progress-card|top': '内层容器',
  '.progress-card|bottom': '内层容器',
  '.interaction-turn-card|all': '内层容器（轻卡）',
  '.generated-callout|all': '内层容器',
  '.model-config-reasoning|all': '内层容器',
  '.sample-tour|all': '内层容器',
  '.data-card, .detail-card|all': '内层容器',
  '.turn-card-gate|all': '内层容器（轻卡）',
  '.graph-canvas|all': '内层容器（图谱画布）',
  '.s3-launcher|all': '内层容器',
  '.work-recover|all': '内层容器',
  '.work-output-result|all': '内层容器',
  '.nonapplied-confirm|all': '内层容器',
  '.draft-panel > header|all': '内层容器（文书工作面·头）',
  '.draft-editor, .draft-reading|all': '内层容器（文书纸面）',
  '.work-draft-toolbar|all': '内层容器',
  '.work-draft-body|all': '内层容器（工作稿面）',
  '.settings-memory-item|all': '内层容器',
  '.settings-fields fieldset|all': '内层容器',
  '.settings-path|all': '内层容器',
  '.settings-credential-embed|all': '内层容器',
  '.paste-block|all': '内层容器',
  '.md-table-wrap|all': '内层容器（表框）',
  '.composer-entry-guidance|all': '内层容器',
  '.composer-disabled-reason|all': '内层容器',
  '.gallery-chain li|all': '内层容器',
  '.gallery-specimen .visual-decision|all': '内层容器',
  // 段内分隔
  '.scene-strip|top': 'P1-M07：高频 composer 上界回单线',
  '.rail-user-wrap|top': 'P1-M08：栏脚 owner 区回单线',
  '.visual-decision-actions|top': '段内分隔',
  '.visual-partial|top': '段内分隔',
  '.visual-partial ul|top': '段内分隔',
  '.interaction-anchor-ledger|top': '段内分隔',
  '.interaction-submit-error, .turn-recovery-error|top': '段内分隔',
  '.interaction-recorded|top': '段内分隔',
  '.stack-module|bottom': '段内分隔（模块栈）',
  '.context-next-step|top': '段内分隔',
  '.utility-dock-popover > header|bottom': '段内分隔（浮层内头）',
  '.artifact-table-view > h3|bottom': '段内分隔',
  '.verified-block|top': '段内分隔',
  '.verified-block|bottom': '段内分隔',
  '.relation-list h3|bottom': '段内分隔',
  '.submission-note|bottom': '段内分隔',
  '.nonapplied-confirm > header|bottom': '段内分隔',
  '.nonapplied-confirm > footer|top': '段内分隔',
  '.risk-master-detail|bottom': '段内分隔',
  '.risk-status-ledger|top': '段内分隔',
  '.risk-status-ledger|bottom': '段内分隔',
  '.evidence-stack .verified-block:last-child|bottom': '段内分隔',
  '.document-preview header|bottom': '段内分隔',
  '.provider-dialog header|bottom': '段内分隔（浮层内头）',
  '.provider-dialog footer|top': '段内分隔（浮层内脚）',
  '.credential-modes|bottom': '段内分隔',
  '.settings-developer|top': '段内分隔',
  '.settings-promise-section|bottom': '段内分隔',
  '.palette-input|bottom': '段内分隔（浮层内头）',
  '.paste-block .collapse-toggle|top': '段内分隔',
  '.gallery-specimen > header|bottom': '段内分隔',
  '.gallery-specimen > footer|top': '段内分隔',
  '.gallery-ledger|top': '段内分隔',
  // 面内分栏
  '.pane-head|bottom': 'P1-M02：compare 窗格头回单线',
  '.rail-case-expand|left': '面内分栏（树形缩进轨）',
  '.utility-dock-item|right': '面内分栏',
  '.preview-scroll-progress|left': '面内分栏',
  '.relation-list|left': '面内分栏',
  '.relation-list|top': '面内分栏（窄容器覆写）',
  '.risk-list|right': '面内分栏',
  '.risk-list|bottom': '面内分栏（窄容器覆写）',
  '.work-draft-list|right': '面内分栏',
  '.settings-nav|right': '面内分栏（判据 b/c：竖分归界行，且自身为滚动容器）',
  '.view-tabs|bottom': '段内分隔（判据 c：overflow-x 滚动容器，细线会随 tab 卷走）',
};

// ── 不换：答不出「此界为何是主/次」的线 ────────────────────────────────────
// 控件边、浮面描边、语义色标线与占位透明边都不承载层级信息——它们不是层级语法的一部分，
// 强行归档只会让线重重新变回装饰。逐条具名登记即「答不出即不换」的可机验形态。
const EXEMPT = {
  // 控件边（按钮/输入/选择/徽章/chip/图标）
  'kbd|all': '控件边（按键拟形）',
  'kbd|width-only': '控件边（按键拟形底沿）',
  '.quiet-button, .primary-button, .scene-strip button, .batch-bar button, .continuation-button|all': '控件边',
  '.chat-titlebar input|all': '控件边',
  '.container-origin-label|all': '控件边（标签）',
  '.demo-badge|all': '控件边（徽章）',
  '.chat-case-head input|all': '控件边',
  '.scroll-latest-button|all': '控件边（浮标）',
  '.attachment-chip|all': '控件边（chip）',
  '.scope-badge|all': '控件边（徽章）',
  '.model-config-reasoning-tag|all': '控件边（标签）',
  '.model-config-field select|all': '控件边',
  '.context-model-chip|all': '控件边（chip）',
  '.pane-head select|all': '控件边',
  '.s3-subject-field input|all': '控件边',
  '.credential-field input, .credential-field select|all': '控件边',
  '.settings-fields select, .settings-fields input, .settings-number|all': '控件边',
  '.settings-status-chip|all': '控件边（chip）',
  '.welcome-idea-icon|all': '控件边（图标槽）',
  '.user-message-attachments span|all': '控件边（chip）',
  '.visual-status|all': '控件边（状态徽章）',
  '.settings-memory-kind|all': '控件边（徽章）',
  '.composer-paste-chip|all': '控件边（chip）',
  '.chat-markdown code|all': '排印元素（行内代码底纹）',
  '.gallery-specimen em|all': '控件边（徽章）',
  '.gallery-decision button|all': '控件边',
  '.gallery-timeline time|all': '记号（时间轴节点圆）',
  '.composer-send|all': '控件边（主按钮，ink 同色）',
  '.attachment-chip.is-uploading::after|all': '控件边（上传态描边）',
  '.composer-drop-card|all': '控件边（拖放靶区）',
  '.composer-shell|all': '控件边（输入外壳——composer 是控件不是区段）',
  '.gallery-revision del, .gallery-revision ins|left': '记号（修订对照引导条）',
  // 浮面描边：「浮＝影、有影必描边」由 elevation 门管辖，边界感来自影与面，不是层级线
  '.rail-containerize-popover|all': '浮面描边',
  '.archive-popover|all': '浮面描边',
  '.command-palette|all': '浮面描边',
  '.rail-user-menu|all': '浮面描边',
  '.chat-feedback|all': '浮面描边',
  '.case-menu|all': '浮面描边',
  '.scope-popover|all': '浮面描边',
  '.composer-plus-menu|all': '浮面描边',
  '.model-config-popover|all': '浮面描边',
  '.utility-dock-popover|all': '浮面描边',
  '.graph-controls|all': '浮面描边',
  '.matrix-question-header [role="tooltip"]|all': '浮面描边',
  '.usage-popover|all': '浮面描边',
  '.compile-dialog|all': '浮面描边',
  '.new-case-dialog|all': '浮面描边',
  '.provider-dialog|all': '浮面描边',
  '.settings-confirm-dialog|all': '浮面描边',
  '.cell-peek|all': '浮面描边',
  '.surface-float|all': '浮面描边（elevation 单点供给）',
  '.surface-card|all': '浮面描边（elevation 单点供给）',
  '.utility-dock|all': '浮面描边（elevation 单点供给）',
  '.rail-module|all': '浮面描边（elevation 单点供给）',
  // 语义色标线：色即语义，线宽不参与层级
  '.titlebar-credential-warn|all': '语义色标线（warn）',
  '.case-grant-invalid|all': '语义色标线（warn）',
  '.case-remove-button|all': '语义色标线（warn）',
  '.session-history-error|left': '语义色标线（red）',
  '.chat-recovery-error|left': '语义色标线（red）',
  '.settings-recovery|all': '语义色标线（subtle）',
  '.reader-focus-anchor|bottom': '语义色标线（blue·溯源锚点下划）',
  // 占位透明边：留位不画线，改色即显影，宽度是布局补偿不是层级
  '.case-file-count|bottom': '占位透明边',
  '.case-archive-button|all': '占位透明边',
  '.attachment-chip-flash|all': '占位透明边',
  '.view-tabs button|all': '占位透明边',
  '.settle-flash|all': '占位透明边',
  '.credential-modes button|bottom': '占位透明边（选中态显影）',
  // 第三方渲染面
  '.courtwork-minimap|all': 'G6 内联样式覆写（第三方渲染面，非壳结构线）',
  // 无消费选择器账已清空：B3 三死件由 B4 删除；裸 `.titlebar` 由 B5 预签票删除。
};

const failures = [];

// ── P1 签署账：113 行逐界提案必须完整、唯一并与三分类账逐项同构 ──────────────
// 这里仍是已批准的平铺映射：不引入新分类或状态机，只把 M01–M08 / N001–N105
// 与唯一消费点、档位、判词及批准后的精确消费值绑定。
const P1_TARGET_PREFIX = 'apps/desktop/src/styles.css#';
const p1Rows = (tierLedger.entries ?? []).filter((row) => /^P1-[MN]\d+$/.test(row.approvedProposalLine ?? ''));
const ledgerByKey = new Map();
const proposalLines = new Set();
const decisionCounts = { '留': 0, '减薄': 0, '回单线': 0 };
const classCounts = { major: 0, minor: 0 };
for (const row of p1Rows) {
  const line = row.approvedProposalLine;
  if (proposalLines.has(line)) failures.push(`P1 档位账提案行重复：${line}`);
  proposalLines.add(line);
  if (row.tier !== 'agent-interface') failures.push(`P1 档位账 ${line} 档位漂移：${row.tier ?? '(缺)'}`);
  if (typeof row.target !== 'string' || !row.target.startsWith(P1_TARGET_PREFIX)) {
    failures.push(`P1 档位账 ${line} target 非 styles.css 逐界键：${row.target ?? '(缺)'}`);
    continue;
  }
  const key = row.target.slice(P1_TARGET_PREFIX.length);
  if (ledgerByKey.has(key)) failures.push(`P1 档位账消费点重复：${key}`);
  ledgerByKey.set(key, row);
  if (!(row.decision in decisionCounts)) failures.push(`P1 档位账 ${line} 判词非法：${row.decision ?? '(缺)'}`);
  else decisionCounts[row.decision] += 1;
  if (!(row.ruleClass in classCounts)) failures.push(`P1 档位账 ${line} 线级非法：${row.ruleClass ?? '(缺)'}`);
  else classCounts[row.ruleClass] += 1;
  const expectedClass = key in MAJOR ? 'major' : key in MINOR ? 'minor' : undefined;
  if (row.ruleClass !== expectedClass) failures.push(`P1 档位账 ${line} 与三分类账不一致：${key} = ${row.ruleClass ?? '(缺)'}/${expectedClass ?? '(未分类)'}`);
  const expectedWidth = expectedClass === 'major' ? 'var(--rule-major)' : 'var(--rule-minor)';
  if (row.expectedWidth !== expectedWidth) failures.push(`P1 档位账 ${line} 宽度漂移：${row.expectedWidth ?? '(缺)'} / ${expectedWidth}`);
  if (!['var(--rule-ink)', 'var(--border)', 'var(--border-strong)'].includes(row.expectedColor)) {
    failures.push(`P1 档位账 ${line} 色槽非法：${row.expectedColor ?? '(缺)'}`);
  }
  if (row.hairline !== (expectedClass === 'major')) failures.push(`P1 档位账 ${line} 文武线伴生标记错误`);
}
for (let index = 1; index <= 8; index += 1) {
  const line = `P1-M${String(index).padStart(2, '0')}`;
  if (!proposalLines.has(line)) failures.push(`P1 档位账缺提案行：${line}`);
}
for (let index = 1; index <= 105; index += 1) {
  const line = `P1-N${String(index).padStart(3, '0')}`;
  if (!proposalLines.has(line)) failures.push(`P1 档位账缺提案行：${line}`);
}
if (p1Rows.length !== 113) failures.push(`P1 档位账行数漂移：${p1Rows.length} / 113`);
if (classCounts.major !== 4 || classCounts.minor !== 109) {
  failures.push(`P1 三分类裁决数漂移：主 ${classCounts.major}/4 · 次 ${classCounts.minor}/109`);
}
if (decisionCounts['留'] !== 97 || decisionCounts['减薄'] !== 12 || decisionCounts['回单线'] !== 4) {
  failures.push(`P1 判词数漂移：留 ${decisionCounts['留']}/97 · 减薄 ${decisionCounts['减薄']}/12 · 回单线 ${decisionCounts['回单线']}/4`);
}
for (const key of [...Object.keys(MAJOR), ...Object.keys(MINOR)]) {
  if (!ledgerByKey.has(key)) failures.push(`P1 档位账漏消费点：${key}`);
}

// ── ① 单源与层级 ──────────────────────────────────────────────────────────
const rootBlock = css.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
const cssVar = (name) => rootBlock.match(new RegExp(`--rule-${name}\\s*:\\s*([^;]+);`))?.[1]?.trim();
for (const slot of ['major', 'minor', 'gap']) {
  const declared = cssVar(slot);
  const token = tokens.rule?.[slot];
  const expected = token ? `${token.value}${token.unit ?? ''}` : undefined;
  if (!declared || declared !== expected) {
    failures.push(`线级 token 漂移 --rule-${slot}: css=${declared ?? '(缺)'} token=${expected ?? '(缺)'}`);
  }
}
// ink 随宗切换：tokens 侧以 {themes.<theme>.border.strong} 声明，CSS 侧即 --border-strong。
if (cssVar('ink') !== 'var(--border-strong)') {
  failures.push(`线色单源破裂 --rule-ink: ${cssVar('ink') ?? '(缺)'}（应为 var(--border-strong)）`);
}
if (!/\{themes\.<theme>\.border\.strong\}/.test(tokens.rule?.ink?.value ?? '')) {
  failures.push('tokens.json rule.ink 不再指向 themes.*.border.strong');
}
const major = Number.parseFloat(cssVar('major') ?? 'NaN');
const minor = Number.parseFloat(cssVar('minor') ?? 'NaN');
if (!(major > minor)) failures.push(`线重层级倒置：major=${major} 未大于 minor=${minor}`);

// ── ④ 线级不择纸温：宽度三槽全局各只一次 ──────────────────────────────────
for (const slot of ['major', 'minor', 'gap']) {
  const count = [...css.matchAll(new RegExp(`--rule-${slot}\\s*:`, 'g'))].length;
  if (count !== 1) failures.push(`--rule-${slot} 被声明 ${count} 次：线宽不得随宗改写（记号/线级不择纸温）`);
}

// ── ②③ 逐点分类与文武线完整性 ────────────────────────────────────────────
const sites = collectBorderSites(css);
// 文武线的细线自身也是一条边框声明。它按边成组书写在 ::after 上，归属由「其基选择器在主界清单
// 且同边」自动判定——既免去重复登记，又不给任意 ::after 开后门（基选择器不在主界即照样落未分类）。
const isMajorHairline = (site) => {
  const parts = site.selector.split(',').map((part) => part.trim());
  return parts.length > 0 && parts.every((part) => part.endsWith('::after')
    && `${part.slice(0, -'::after'.length)}|${site.side}` in MAJOR);
};
for (const site of sites) {
  if (site.width === 'var(--rule-minor)' && isMajorHairline(site)) continue;
  const key = siteKey(site);
  const inMajor = key in MAJOR;
  const inMinor = key in MINOR;
  const inExempt = key in EXEMPT;
  if (Number(inMajor) + Number(inMinor) + Number(inExempt) !== 1) {
    failures.push(`styles.css:${site.line} 线消费点未归一分类（主/次/不换须且只须占其一）：${key}`);
    continue;
  }
  const signed = ledgerByKey.get(key);
  if ((inMajor || inMinor) && signed && site.color !== signed.expectedColor) {
    failures.push(`styles.css:${site.line} P1 签署色槽漂移：${key} = ${site.color} / ${signed.expectedColor}`);
  }
  if (inMajor && site.width !== 'var(--rule-major)') {
    failures.push(`styles.css:${site.line} 主界未落文武线粗线：${key} = ${site.width} solid ${site.color}`);
  }
  if (inMinor && site.width !== 'var(--rule-minor)') {
    failures.push(`styles.css:${site.line} 次界未按名消费乌丝细线：${key} = ${site.width}`);
  }
  if (inExempt && /^var\(--rule-/.test(site.width)) {
    failures.push(`styles.css:${site.line} 不换清单内的线擅自入档：${key}`);
  }
}
const present = new Set(sites.map(siteKey));
for (const [scope, table] of [['主界', MAJOR], ['次界', MINOR], ['不换', EXEMPT]]) {
  for (const key of Object.keys(table)) {
    if (!present.has(key)) failures.push(`${scope}清单有陈项，styles.css 已无此消费点：${key}`);
  }
}

// 文武线＝两线俱在。粗线由上方逐点校验，细线在这里核对 ::after 伴生规则。
for (const key of Object.keys(MAJOR)) {
  const [selector, side] = key.split('|');
  const body = findRuleBody(css, `${selector}::after`);
  const expectedInk = ledgerByKey.get(key)?.expectedColor;
  if (body === undefined) {
    failures.push(`文武线缺细线：${selector}::after 未定义（主界必须粗细双线错落）`);
    continue;
  }
  if (!expectedInk || !body.includes(`border-${side}: var(--rule-minor) solid ${expectedInk}`)) {
    failures.push(`文武线细线走偏：${selector}::after 未在 ${side} 侧落 --rule-minor/${expectedInk ?? '(缺签署色)'}`);
  }
  if (!body.includes('var(--rule-gap)')) {
    failures.push(`文武线缺错落间距：${selector}::after 未消费 --rule-gap`);
  }
  if (/gradient|box-shadow/.test(body)) {
    failures.push(`文武线越界画法：${selector}::after 含 gradient/box-shadow（§10 零渐变零阴影）`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(
  `线级语法门通过：主界 ${Object.keys(MAJOR).length} 条文武线 · 次界 ${Object.keys(MINOR).length} 条乌丝细线 · 具名不换 ${Object.keys(EXEMPT).length} 条 · 共 ${sites.length} 处 · P1 留 ${decisionCounts['留']}/减薄 ${decisionCounts['减薄']}/回单线 ${decisionCounts['回单线']}`,
);
