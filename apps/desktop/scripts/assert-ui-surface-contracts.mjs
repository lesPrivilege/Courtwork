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
].map(async ([name, relative]) => [name, await readFile(path.join(root, relative), 'utf8')])));

const failures = [];

const MARKETING_TONE = ['敬请期待', '即将震撼', '敬请关注', 'Stay tuned'];

/** 断言 `needle` 在 `file` 中出现，且其前后 `window` 字符内同时含 disabled 语义与非空 title/tooltip。 */
function requireHonestUnwired(fileKey, needle, message) {
  const text = files[fileKey];
  const at = text.indexOf(needle);
  if (at === -1) {
    failures.push(`${message}：未找到锚点文本`);
    return;
  }
  const windowText = text.slice(Math.max(0, at - 400), at + 400);
  if (!/\bdisabled\b|aria-disabled="true"/.test(windowText)) {
    failures.push(`${message}：附近缺少 disabled / aria-disabled="true"`);
  }
  if (!/title=(\{[^}]+\}|"[^"]+")/.test(windowText)) {
    failures.push(`${message}：附近缺少非空 title`);
  }
}

requireHonestUnwired('messageActions', 'data-state="unwired"', 'MessageActions 未开通态标记（Read aloud / More）');
requireHonestUnwired('composer', 'data-state="unwired"', 'Composer 未开通态标记（camera / voice）');
requireHonestUnwired('railModules', "data-state={entry.disabled ? 'unwired' : undefined}", 'RightRailModules reader-entry 未开通态标记');
requireHonestUnwired('materialsZone', 'data-state="unwired"', 'MaterialsZone 在访达中显示未开通态标记');
requireHonestUnwired('app', 'data-state="unwired"', 'App.tsx 排队消息「停止当前」未开通态标记');

// 反例覆盖：Retry 是本单接线的真实控件，不得携带未开通标记。
if (/data-testid="chat-retry"[^>]*data-state="unwired"/.test(files.app)) {
  failures.push('chat-retry 是已接线控件，不得携带 data-state="unwired"');
}

const unwiredOccurrences = [files.messageActions, files.composer, files.railModules, files.materialsZone, files.app]
  .join('\n')
  .split('data-state="unwired"').length - 1
  // RightRailModules 用条件表达式而非字面量，单独计入
  + (files.railModules.includes("data-state={entry.disabled ? 'unwired' : undefined}") ? 1 : 0);

const MINIMUM_UNWIRED_MARKERS = 6;
if (unwiredOccurrences < MINIMUM_UNWIRED_MARKERS) {
  failures.push(`未开通态标记数不足：发现 ${unwiredOccurrences}，至少需要 ${MINIMUM_UNWIRED_MARKERS}（对标清单留痕的最小可核验数）`);
}

for (const [fileKey, text] of Object.entries(files)) {
  for (const phrase of MARKETING_TONE) {
    if (text.includes(phrase)) failures.push(`${fileKey} 含营销腔文案「${phrase}」，未开通态必须用 §9 产品语言（如「即将开通」）`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('UI-SURFACE-1 unwired markers: OK');
