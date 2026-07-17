import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// WORK-LIVE-1 边界守卫（ADR-010 决定一/二/三/五 + 就绪图 WORK-LIVE-1 行）：production Work 命令端口与装配缝必须——
// - 零 demo：work-command.ts / work-runtime.ts 不 import demo/recording/DEMO_ARTIFACTS/GATES/demo-data/demo-runtime，
//   不消费 demo 原文（contractSourceMd/?raw）；非 demo case 零 recording 回落（no-demo-in-harness 精神延伸到桌面 live）；
// - browser-safe：runtime 走 @courtwork/core/work-protocol|turn-protocol 子路径，零 node:*，core 根 barrel 仅 import type；
// - 完成 WorkCommandPort（本单明令「替换仅类型声明现状」）：client.ts 的 WorkCommandOutcome 携 ADR-010 决定一的
//   rejected 闭集（command_conflict/case_busy/invalid_scope/not_configured）；store-driven（每笔命令从 host 读回信封重建）；
//   crash mid-turn → interrupted（不自动重放同一 provider 调用）；
// - grant（真实）案：docx 源文经 bindDocxSourceMarkdown（会话材料，非 demo 原文），live gate 经 projectRiskListGate
//   （真实 RiskList，非 demo 门禁表），run/resume/cancel 经 workCommand.startWithPreflight/resolveReview/cancel；
// - WorkState host 精简装配（内存参考实现）；真机跨重启持久待 Tauri opaque blob host（`[需架构拍板]`）如实留痕。

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFile(path.join(root, relative), 'utf8');

// 只扫代码不扫注释：JSDoc 提到 demo/GATES 等词是合法解释（「绝不消费」），门守的是代码里的 demo 依赖/回落。
const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

const command = stripComments(await read('src/work/work-command.ts'));
const runtime = stripComments(await read('src/work/work-runtime.ts'));
const client = stripComments(await read('src/protocol/client.ts'));
const app = stripComments(await read('src/App.tsx'));

const failures = [];
const requireMatch = (source, pattern, message) => {
  if (!pattern.test(source)) failures.push(message);
};
const forbidMatch = (source, pattern, message) => {
  if (pattern.test(source)) failures.push(message);
};

// ── 零 demo 依赖 / 零 demo 原文回落（work-command.ts + work-runtime.ts）─────────
const DEMO_FORBIDDEN = [
  [/@courtwork\/demo-data/, '不得依赖 @courtwork/demo-data（非 demo 生产装配）'],
  [/@courtwork\/demo-runtime/, '不得依赖 @courtwork/demo-runtime（demo/验收装配点，非生产）'],
  [/from ['"]\.\.?\/demo\//, "不得 import ../demo/*（recording/fixture/demo client）"],
  [/\brecordings?\b/, '不得引用 recording（非 demo case 零 recording 回落）'],
  [/DEMO_ARTIFACTS/, '不得消费 DEMO_ARTIFACTS'],
  [/\bGATES\b/, '不得复用 demo GATES 表——live gate 由真实 RiskList 派生'],
  [/contractSourceMd|\?raw/, '不得消费 demo 原文（contractSourceMd/?raw）——docx 源文只从会话材料取'],
];
for (const [label, source] of [['work-command', command], ['work-runtime', runtime]]) {
  for (const [pattern, message] of DEMO_FORBIDDEN) forbidMatch(source, pattern, `${label}.ts：${message}`);
}

// ── browser-safe：零 node:*；core 根 barrel 仅 import type；runtime 走子路径 ──────
for (const [label, source] of [['work-command', command], ['work-runtime', runtime]]) {
  forbidMatch(source, /from ['"]node:/, `${label}.ts 不得 import node:*（browser-safe）`);
  forbidMatch(source, /import\s+(?!type\b)[^;]*?from ['"]@courtwork\/core['"]/, `${label}.ts：@courtwork/core 根 barrel 仅允许 import type（runtime 走子路径）`);
}
requireMatch(command, /from ['"]@courtwork\/core\/work-protocol['"]/, 'work-command 必须走 browser-safe @courtwork/core/work-protocol 子路径');
requireMatch(command, /from ['"]@courtwork\/core\/turn-protocol['"]/, 'work-command 必须走 browser-safe @courtwork/core/turn-protocol 子路径');

// ── 完成 WorkCommandPort：WorkCommandOutcome 携 ADR-010 决定一的 rejected 闭集 ────
requireMatch(
  client,
  /status: 'rejected'[\s\S]*?'command_conflict'[\s\S]*?'case_busy'[\s\S]*?'invalid_scope'[\s\S]*?'not_configured'/,
  'WorkCommandOutcome 必须携 ADR-010 决定一的 rejected 闭集（替换 WORK-PORT-1 仅类型声明的遗漏）',
);

// ── store-driven 生产命令：消费 store/binding 装配件，不重造 ─────────────────
requireMatch(command, /loadWorkStateStore/, 'store-driven：每笔命令从注入 host 读回信封重建（loadWorkStateStore）');
requireMatch(command, /interruptedTurns\(\)/, 'crash mid-turn → interrupted（turn_linked 无 terminal 不得自动重放）');
for (const fn of ['buildS3RunInput', 'resolveSessionMaterials', 'mapReviewResolutionToResume', 'createLegalS3ScenarioDeps', 'getS3Scenario']) {
  requireMatch(command, new RegExp(`\\b${fn}\\b`), `必须消费 LEGAL-S3 装配件 ${fn}（只装配不重造）`);
}
requireMatch(command, /runScenario/, 'run 必须经真实 core executor runScenario（非 recording）');
requireMatch(command, /resumeScenario/, 'resume 必须经真实 core executor resumeScenario（非 recording）');

// ── grant（真实）案接线（App.tsx）：run/gate/resume/cancel/docx 源全走生产链 ──────
requireMatch(app, /workCommand\.startWithPreflight\(/, 'grant 案 run 必须经 workCommand.startWithPreflight（显式主体 preflight）');
requireMatch(app, /workCommand\.resolveReview\(/, 'grant 案 resume 必须经 workCommand.resolveReview（逐条 revision）');
requireMatch(app, /workCommand\.cancel\(/, 'grant 案 cancel 必须经 workCommand.cancel');
// WORK-LIVE-REPLAY-1（答复 WORK-HOST-1 驳回阻断二）：跨切案/重启的恢复入口必须真实消费 workCommand.replay
// 水合投影（此前「全 App 对 workCommand.replay 零消费点」是驳回根因）。
requireMatch(app, /workCommand\.replay\(/, 'grant 案 恢复入口必须经 workCommand.replay（水合投影续行，答复 WORK-HOST-1 驳回阻断二）');
requireMatch(app, /projectRiskListGate\(riskList/, 'grant 案 live gate 必须经 projectRiskListGate（真实 RiskList）');
requireMatch(app, /bindDocxSourceMarkdown\(resolved\.material\)/, 'grant 案 docx 源文必须经 bindDocxSourceMarkdown（会话材料，非 demo 原文）');

// ── WorkState host 精简装配 + Turn 樁仅 DEV/E2E ─────────────────────────────
requireMatch(runtime, /createInMemoryWorkStateHost/, 'WorkState host = 内存参考实现（真机跨重启待 Tauri host [需架构拍板]）');
requireMatch(runtime, /installWorkTestHooks/, 'E2E Work turn 樁经 installWorkTestHooks（仅 DEV+E2E 装配）');
requireMatch(runtime, /createTurnRunner\(workProvider\(/, '生产 Turn 引擎 = createTurnRunner(provider, turnStore)（provider 走注入 transport）');

if (failures.length > 0) {
  console.error(`WORK-LIVE-1 boundary violations (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('WORK-LIVE-1 boundary checks passed');
