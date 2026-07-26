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
const main = stripComments(await read('src/main.tsx'));
const binding = stripComments(await read('src/work/legal-s3-binding.ts'));
const modules = stripComments(await read('src/modules/ModuleStack.tsx'));
// CONTRACT-REVIEW-SAFETY-1「过手即拆」：提交编排与产物落盘已从 App.tsx 外提到本模块。
// 门跟着码走——扫描面迁移，断言不弱化（见下方 resume/docx 源两处拆成「接线」+「调用」两段）。
const submission = stripComments(await read('src/work/use-contract-review-submission.ts'));
// CONTRACT-OUTPUT-TRUTH-1「过手即拆」：恢复入口的判定外提到本模块，扫描面同批迁移。
const recovery = stripComments(await read('src/work/work-recovery.ts'));
// CONTRACT-OUTPUT-TRUTH-1：显式主合同选择/排序/CaseFile 派生的纯函数落点。
const primaryContract = stripComments(await read('src/work/primary-contract.ts'));
// CONTRACT-OUTPUT-TRUTH-1：唯一 production 交付编排。
const delivery = stripComments(await read('src/output/contract-review-delivery.ts'));
const failures = [];
const requireMatch = (source, pattern, message) => {
  if (!pattern.test(source)) failures.push(message);
};
const forbidMatch = (source, pattern, message) => {
  if (pattern.test(source)) failures.push(message);
};

// 提交编排里 demo 与 production 物理分流：只扫 `deliverProductionDocx` **函数体**
// （demo adapter 与 demo 状态名合法保留 draft 编译器与 waiver 词，扫全文会误伤）。
const deliverStart = submission.indexOf('const deliverProductionDocx');
const deliverEnd = submission.indexOf('const submitterRef', deliverStart);
if (deliverStart < 0 || deliverEnd < 0) {
  failures.push('use-contract-review-submission：未找到 deliverProductionDocx 函数体，production 扫描面失效');
}
const submissionProductionSlice =
  deliverStart >= 0 && deliverEnd > deliverStart ? submission.slice(deliverStart, deliverEnd) : '';

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
requireMatch(app, /useContractReviewSubmission\(\{[\s\S]*?\n {4}workCommand,/, 'grant 案 resume 必须把生产 workCommand 交给提交编排（App 侧接线）');
requireMatch(submission, /commandRef\.current\.resolveReview\(/, 'grant 案 resume 必须经 workCommand.resolveReview（逐条 revision）');
requireMatch(app, /workCommand\.cancel\(/, 'grant 案 cancel 必须经 workCommand.cancel');
// WORK-LIVE-REPLAY-1（答复 WORK-HOST-1 驳回阻断二）：跨切案/重启的恢复入口必须真实消费 workCommand.replay
// 水合投影（此前「全 App 对 workCommand.replay 零消费点」是驳回根因）。
// CONTRACT-OUTPUT-TRUTH-1「过手即拆」：判定外提到 work/work-recovery.ts 后，App 侧是**把
// workCommand.replay 交给** readWorkRecovery，调用点在外提件里。门跟着码走，拆成两段——
// 断言不弱化：两段都在才算真正接通，任一段消失（App 不再交、或外提件不再调）仍触红。
requireMatch(
  app,
  /readWorkRecovery\(\s*workCommand\.replay/,
  'grant 案 恢复入口必须把 workCommand.replay 交给恢复编排（App 侧接线）',
);
requireMatch(
  recovery,
  /await replay\(query\)/,
  'grant 案 恢复编排必须真实调用注入的 replay（水合投影续行，答复 WORK-HOST-1 驳回阻断二）',
);
requireMatch(app, /projectRiskListGate\(riskList/, 'grant 案 live gate 必须经 projectRiskListGate（真实 RiskList）');

// ── CONTRACT-OUTPUT-TRUTH-1：主合同必须由用户显式选定，「取 ready[0] 猜」在生产路径零出现 ──
// 旧实现让入库顺序决定「哪份是主合同」，用户从未表达过；本组锁的就是那处猜测不许复活。
for (const [label, source] of [['App', app], ['work-command', command], ['primary-contract', primaryContract]]) {
  forbidMatch(
    source,
    /\bready\s*\[\s*0\s*\]/,
    `${label}：production Legal S3 路径不得以 ready[0] 猜主合同（须用户显式选定）`,
  );
}
requireMatch(app, /selectPrimaryContractCandidates\(/, 'grant 案起跑面必须只列可作主合同的 DOCX 候选');
requireMatch(app, /orderS3MaterialRefs\(/, 'grant 案 start 必须经 orderS3MaterialRefs（主合同稳定在 materialRefs[0]）');
requireMatch(command, /deriveS3CaseFile\(/, 'S3 start 必须从同一输入机械派生 legal.CaseFile（不再传空 artifacts）');
requireMatch(
  primaryContract,
  /material\.mediaType === DOCX_MEDIA_TYPE/,
  '主合同候选判据必须是精确 mediaType（不得按文件名后缀猜）',
);
// CONTRACT-OUTPUT-TRUTH-1：ReadingView 重建路径退役。grant 案的 docx 底稿不再是
// `bindDocxSourceMarkdown` 派生的 Markdown，而是 MaterialStore 一次 snapshot 读回的**原始
// DOCX bytes**，经唯一 coordinator 交付。本条正向要求随之替换（SPEC 明载「须退役」）。
requireMatch(submission, /coordinateContractReviewOutput\(/, 'grant 案交付必须经唯一 coordinator');
requireMatch(submission, /materialStore\.readForOutput\(/, 'grant 案 docx 底稿必须经 readForOutput（一次 snapshot 的原始 bytes）');
requireMatch(delivery, /compileConfirmedReviewToDocx\(\{[\s\S]*?originalDocx: material\.bytes/, 'coordinator 必须把复验后的原 bytes 直接交编译器');

// production 编排/编译路径零 ReadingView 重建、零 waiver、零旧产物名。
// 允许通用 draft 编译器与显式 demo adapter 合法消费，故只扫这两个 production 文件。
const S3_PRODUCTION_FORBIDDEN = [
  [/compileDraftToDocx/, '不得用 draft 编译器重建原稿（原 bytes 才是底稿）'],
  [/markdownToDocument/, '不得从 ReadingView Markdown 重建原稿'],
  [/bindDocxSourceMarkdown/, '不得把 Markdown 当 docx 底稿'],
  [/confirmedNonApplied/, 'production 不接受逐条 waiver——未落点即整份阻断'],
  [/合同审查报告/, '旧固定产物名已退役（版本化命名 + no-replace）'],
  [/overwrite/, 'production 合同审查批注稿一律 no-replace'],
];
for (const [label, source] of [['contract-review-delivery', delivery], ['use-contract-review-submission(production 段)', submissionProductionSlice]]) {
  for (const [pattern, message] of S3_PRODUCTION_FORBIDDEN) forbidMatch(source, pattern, `${label}：${message}`);
}

// ── WorkState host 精简装配 + Turn 樁仅 DEV/E2E ─────────────────────────────
requireMatch(runtime, /createInMemoryWorkStateHost/, 'WorkState host = 内存参考实现（真机跨重启待 Tauri host [需架构拍板]）');
requireMatch(runtime, /installWorkTestHooks/, 'E2E Work turn 樁经 installWorkTestHooks（仅 DEV+E2E 装配）');
requireMatch(runtime, /createTurnRunner\(workProvider\(/, '生产 Turn 引擎 = createTurnRunner(provider, turnStore)（provider 走注入 transport）');
forbidMatch(main, /providerConfig|loadModelConfig/, 'production Work 不得动态读取 providerConfig/loadModelConfig');
forbidMatch(runtime, /providerConfig/, 'work-runtime 不得保留动态 providerConfig 接缝');
requireMatch(main, /loadRuntimeLimits:\s*\(\)\s*=>\s*loadSettings\(\)\.runtimeGuard/, 'main 必须只注入 Settings runtimeGuard');
requireMatch(command, /makeTurnRunner:\s*\(turnStore:\s*TurnStore,\s*modelRoute:/, 'runner 必须接收冻结 route');
requireMatch(command, /createRuntimeBudget:\s*\(modelRoute:/, 'fresh start 必须经 createRuntimeBudget 铸预算');
requireMatch(binding, /runtimeBudget:\s*input\.store\.runtimeBudget/, 'production executor 必须消费 store.runtimeBudget');
requireMatch(binding, /expectedModelRoute:\s*\{\s*\.\.\.input\.expectedModelRoute\s*\}/, 'expected route 必须同源防御复制');
forbidMatch(binding, /\blimits\s*:/, 'production binding 不得注入 legacy limits');
forbidMatch(app, /outcome\.status === 'failed'[\s\S]{0,180}clearWorkSession/, 'failed outcome 不得清除恢复指针');
requireMatch(runtime, /readState\(ref:\s*WorkSessionRef\)[\s\S]*?readHost\s*\?\s*readHost\(ref\)/, 'E2E hook 必须只读暴露 readState(ref)');
forbidMatch(runtime, /(?:write|mutate|tamper|compareAndSwap)State\s*\(/i, 'E2E hook 禁止暴露 WorkState 写入/篡改能力');
requireMatch(modules, /function ProgressModuleBody\(\{\s*projection\s*\}[\s\S]*?SessionProjection/, 'ProgressModuleBody 必须只接完整 SessionProjection');
requireMatch(modules, /尚无任务进展 · 开始一项工作后在此查看/, 'Progress 必须使用 demo/real 统一空态');
requireMatch(modules, /scenarioFailure[\s\S]*?workScenarioFailureDisplayCopy/, 'Progress 持久失败必须经过 display guard');
forbidMatch(app, /Waiting for task events|New case · waiting for a task/, 'App 不得保留 demo/real 分叉 Progress 空态');

if (failures.length > 0) {
  console.error(`WORK-LIVE-1 boundary violations (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('WORK-LIVE-1 boundary checks passed');
