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

  if (issues.length > 0) {
    console.error(`WORK-AGENT-GUI-1 守卫失败（${issues.length}）:\n${issues.join('\n')}`);
    process.exit(1);
  }
  console.log(`WORK-AGENT-GUI-1 守卫通过：${files.length} 个 production 文件，旧伪真源零残留`);
}
