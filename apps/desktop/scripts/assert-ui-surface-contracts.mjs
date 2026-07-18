import { readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * UI-SURFACE-1：`data-state="unwired"` 是本单引入的可测标记约定——每个显式未开通控件都携带它，
 * 使这一门可以机器枚举全部未开通控件，断言诚实态（disabled/aria-disabled + 非空文案）成立，
 * 且文案不落入营销腔黑名单。门不做通用 JSX 解析，只对本单已知触面做精确文本核验（同 assert-chat-ui-contracts.mjs 手法）。
 */

const root = path.resolve(import.meta.dirname, '..');
const files = Object.fromEntries(await Promise.all([
  ['app', 'src/App.tsx'],
  ['messageActions', 'src/chat/MessageActions.tsx'],
  ['composer', 'src/composer/Composer.tsx'],
  ['railModules', 'src/rail/RightRailModules.tsx'],
  ['materialsZone', 'src/system/MaterialsZone.tsx'],
  ['composerTypes', 'src/composer/types.ts'],
].map(async ([name, relative]) => [name, await readFile(path.join(root, relative), 'utf8')])));

const failures = [];

const MARKETING_TONE = ['敬请期待', '即将震撼', '敬请关注', 'Stay tuned'];

// §9 零技术概念暴露：未开通态文案（tooltip/title）不得泄漏工程内部概念。
// 中文子串直配；英文按词界匹配避免误伤（如 'unwired' 不得因含 'wire' 触发）。
// 覆盖驳回报告点名的「执行器/接线」及其同族「接入/端口」，与 §9 例词。
const NINE_ENGINEERING_ZH = ['接线', '接入', '执行器', '端口', '句柄', '钩子', '渲染器', '适配器'];
const NINE_ENGINEERING_EN = ['schema', 'instruction', 'locator', 'trace', 'prompt', 'token', 'wire', 'endpoint', 'executor'];
function ninthViolation(copy) {
  const zh = NINE_ENGINEERING_ZH.find((term) => copy.includes(term));
  if (zh) return zh;
  const en = NINE_ENGINEERING_EN.find((term) => new RegExp(`\\b${term}\\b`, 'i').test(copy));
  return en ?? null;
}

/** 逐个断言 `needle` 所在 JSX opening tag 同时含 disabled 语义与非空 title/tooltip。 */
function requireHonestUnwired(fileKey, needle, expectedCount, message) {
  const text = files[fileKey];
  const matches = [];
  let cursor = 0;
  while (cursor < text.length) {
    const at = text.indexOf(needle, cursor);
    if (at === -1) break;
    matches.push(at);
    cursor = at + needle.length;
  }
  if (matches.length !== expectedCount) {
    failures.push(`${message}：标记数应为 ${expectedCount}，实得 ${matches.length}`);
  }
  matches.forEach((at, index) => {
    const tagStart = text.lastIndexOf('<', at);
    const tagEnd = text.indexOf('>', at);
    const openingTag = text.slice(tagStart, tagEnd === -1 ? at + needle.length : tagEnd + 1);
    if (!/\bdisabled(?:\s|=)|aria-disabled="true"/.test(openingTag)) {
      failures.push(`${message} #${index + 1}：同一元素缺少 disabled / aria-disabled="true"`);
    }
    if (!/title=(\{[^}]+\}|"[^"]+")/.test(openingTag)) {
      failures.push(`${message} #${index + 1}：同一元素缺少非空 title`);
    }
  });
}

requireHonestUnwired('messageActions', 'data-state="unwired"', 2, 'MessageActions 未开通态标记（Read aloud / More）');
requireHonestUnwired('composer', 'data-state="unwired"', 2, 'Composer 未开通态标记（camera / voice）');
requireHonestUnwired('railModules', "data-state={entry.disabled ? 'unwired' : undefined}", 1, 'RightRailModules reader-entry 未开通态标记');
requireHonestUnwired('materialsZone', 'data-state="unwired"', 1, 'MaterialsZone 在访达中显示未开通态标记');
// WORK-TURN-2：场景运行中 Work composer 整体禁用，不再造排队/steering 的假控件；App 不得回流 queue 标记或状态。
if (/queuedMessages|queued-message|queued-chip/.test(files.app)) {
  failures.push('App.tsx 不得回流 Work 对话排队/steering 残留');
}

// 反例覆盖：Retry 是本单接线的真实控件，不得携带未开通标记。
if (/data-testid="chat-retry"[^>]*data-state="unwired"/.test(files.app)) {
  failures.push('chat-retry 是已接线控件，不得携带 data-state="unwired"');
}

const unwiredOccurrences = [files.messageActions, files.composer, files.railModules, files.materialsZone, files.app]
  .join('\n')
  .split('data-state="unwired"').length - 1
  // RightRailModules 用条件表达式而非字面量，单独计入
  + (files.railModules.includes("data-state={entry.disabled ? 'unwired' : undefined}") ? 1 : 0);

const EXPECTED_UNWIRED_MARKERS = 6;
if (unwiredOccurrences !== EXPECTED_UNWIRED_MARKERS) {
  failures.push(`未开通态标记漂移：发现 ${unwiredOccurrences}，应为 ${EXPECTED_UNWIRED_MARKERS}（Work 排队 W5 已退役）`);
}

for (const [fileKey, text] of Object.entries(files)) {
  for (const phrase of MARKETING_TONE) {
    if (text.includes(phrase)) failures.push(`${fileKey} 含营销腔文案「${phrase}」，未开通态必须用 §9 产品语言（如「即将开通」）`);
  }
}

// §9 工程词守卫：扫描 5 个 UI 文件里 title 属性的字符串字面值 + DISABLED_TOOLTIPS 值。
// 只取 title 的「值」（不含周围 opening tag），故 `data-state="unwired"` 里的 'wire' 不会误触。
// title="X" / title={... 'X' ...}（取内联单引号串，覆盖 reader-entry 的三元 disabled 分支）。
const TITLE_VALUE = /title=(?:"([^"]*)"|\{[^}]*?'([^']*)'[^}]*?\})/g;
for (const fileKey of ['app', 'messageActions', 'composer', 'railModules', 'materialsZone']) {
  const text = files[fileKey];
  for (const match of text.matchAll(TITLE_VALUE)) {
    const value = match[1] ?? match[2] ?? '';
    const term = ninthViolation(value);
    if (term) failures.push(`${fileKey} 的 title 文案「${value}」含工程词「${term}」，违反 §9 零技术概念暴露（改产品语言，如「即将开通」）`);
  }
}
// DISABLED_TOOLTIPS 值（camera/voice 未开通态文案的真源，经 Composer title 间接消费）。
for (const match of files.composerTypes.matchAll(/'([^']*)'/g)) {
  const term = ninthViolation(match[1]);
  if (term) failures.push(`composerTypes 的 DISABLED_TOOLTIPS 文案「${match[1]}」含工程词「${term}」，违反 §9`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('UI-SURFACE-1 unwired markers: OK');
