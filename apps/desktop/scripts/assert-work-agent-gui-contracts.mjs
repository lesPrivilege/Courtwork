import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(scriptDir, '..');
const sourceRoot = path.join(desktopRoot, 'src');

export const FORBIDDEN_PRODUCTION_TOKENS = [
  'WorkDraftPanel',
  'workDraftStore',
  'work-draft-store',
  'workDraftMode',
  'openWorkDrafts',
  'workTrack',
  'scene-unloaded-draft',
  'wf-open-work-drafts',
  'workDraftPath',
];

function productionFiles(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) files.push(...productionFiles(full));
    else if (/\.(?:ts|tsx)$/.test(name) && !/\.test\.(?:ts|tsx)$/.test(name)) files.push(full);
  }
  return files;
}

export function scanWorkAgentGuiContracts(files) {
  const issues = [];
  for (const [file, content] of files) {
    for (const token of FORBIDDEN_PRODUCTION_TOKENS) {
      if (content.includes(token)) issues.push(`${file}: 旧工作稿 producer/import/testid 回流：${token}`);
    }
    if (/caseRoot\s*[:=]\s*['"]{2}/.test(content) && /工作稿|draft/i.test(content)) {
      issues.push(`${file}: caseRoot='' 工作稿假写回流`);
    }
  }
  return issues;
}

/** R1 冻结契约（WORK-AGENT-GUI-1 §9.2/§9.3）的机器门。入参为两文件原文。 */
export function scanWorkAgentR1Contracts(history, lane) {
  const issues = [];
  if (!/PI_HISTORY_STORAGE_KEY\s*=\s*'courtwork\.pi-drafts\.v2'/.test(history)) {
    issues.push('src/pi/pi-history.ts: storage key 必须升 v2（courtwork.pi-drafts.v2）');
  }
  if (!/PI_HISTORY_SCHEMA_VERSION\s*=\s*2\s+as\s+const/.test(history)) {
    issues.push('src/pi/pi-history.ts: envelope version 必须为 2');
  }
  if (!/session\.grantId\s*===\s*'string'/.test(history) || !/session\.grantId\.length\s*>\s*0/.test(history)) {
    issues.push('src/pi/pi-history.ts: isSession 必须校验非空 grantId');
  }
  if (!/entry\.grantId\s*===\s*grantId/.test(lane)) {
    issues.push('src/pi/use-pi-lane.ts: open 放行必须比对 grantId');
  }
  const start = lane.indexOf('const start = useCallback(async () => {');
  const gate = lane.indexOf('if (identityRef.current !== startIdentity) return;');
  const mint = lane.indexOf('const nextSessionId = mint();');
  if (!(start >= 0 && gate > start && mint > gate)) {
    issues.push('src/pi/use-pi-lane.ts: start 必须在 mint 之前有 identityRef 前置门');
  }
  return issues;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const retired = [
    path.join(sourceRoot, 'system', 'WorkDraftPanel.tsx'),
    path.join(sourceRoot, 'system', 'work-draft-store.ts'),
  ];
  const issues = retired.filter(existsSync).map((file) => `${file}: 退役伪真源仍存在`);
  const files = productionFiles(sourceRoot).map((file) => [
    path.relative(desktopRoot, file),
    readFileSync(file, 'utf8'),
  ]);
  issues.push(...scanWorkAgentGuiContracts(files));

  const copy = readFileSync(path.join(sourceRoot, 'chrome', 'copy.ts'), 'utf8');
  if (!/work:\s*'Scenes'/.test(copy) || !/draft:\s*'Work'/.test(copy)) {
    issues.push('src/chrome/copy.ts: 顶层可见映射必须是 draft=Work、work=Scenes');
  }
  const scene = readFileSync(path.join(sourceRoot, 'workbench', 'scene-strip.tsx'), 'utf8');
  if (!scene.includes('scene-unloaded-work') || !scene.includes('通用 Work 可用，专业 Scenes 未加载')) {
    issues.push('src/workbench/scene-strip.tsx: 零垂类 Work CTA/诚实文案缺席');
  }

  const history = readFileSync(path.join(sourceRoot, 'pi', 'pi-history.ts'), 'utf8');
  const lane = readFileSync(path.join(sourceRoot, 'pi', 'use-pi-lane.ts'), 'utf8');
  issues.push(...scanWorkAgentR1Contracts(history, lane));

  if (issues.length > 0) {
    console.error(`WORK-AGENT-GUI-1 守卫失败（${issues.length}）:\n${issues.join('\n')}`);
    process.exit(1);
  }
  console.log(`WORK-AGENT-GUI-1 守卫通过：${files.length} 个 production 文件，旧伪真源零残留`);
}
