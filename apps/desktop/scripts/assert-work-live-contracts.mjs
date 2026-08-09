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

const command = stripComments(await read('src/verticals/legal/work-command.ts'));
const runtime = stripComments(await read('src/work/work-runtime.ts'));
const client = stripComments(await read('src/protocol/client.ts'));
const app = stripComments(await read('src/App.tsx'));
const main = stripComments(await read('src/main.tsx'));
const binding = stripComments(await read('src/verticals/legal/legal-s3-binding.ts'));
const modules = stripComments(await read('src/modules/ModuleStack.tsx'));
// CONTRACT-REVIEW-SAFETY-1「过手即拆」：提交编排与产物落盘已从 App.tsx 外提到本模块。
// 门跟着码走——扫描面迁移，断言不弱化（见下方 resume/docx 源两处拆成「接线」+「调用」两段）。
const submission = stripComments(await read('src/verticals/legal/use-contract-review-submission.ts'));
// CONTRACT-OUTPUT-TRUTH-1「过手即拆」：恢复入口的判定外提到独立模块，扫描面同批迁移。
// CONTRACT-TRACE-1：该模块被 `work/work-session-lifecycle.ts` 吸收（恢复判定与指针判定读同一份
// replay 结果、同一张相位表，两个模块要把 phase switch 写两遍）。扫描面随之迁移。
const lifecycle = stripComments(await read('src/work/work-session-lifecycle.ts'));
// CONTRACT-OUTPUT-TRUTH-1：显式主合同选择/排序/CaseFile 派生的纯函数落点。
const primaryContract = stripComments(await read('src/verticals/legal/primary-contract.ts'));
// GENERIC-PACK-1 ⑤「过手即拆」：S3 审阅编排（生命周期/提交/门禁投影）由 App.tsx 迁入垂类工作面
// 驱动，起跑面迁入其 blueprint renderer。门跟着码走——四条判据改锚新家，一条不减，并新增
// 一条组合根装配锁（垂类端口只能在受信组合根注入，不进壳的通用接缝）。
const legalSurface = stripComments(await read('src/verticals/legal/legal-work-surface.tsx'));
const riskReviewRenderer = stripComments(await read('src/verticals/legal/RiskReviewRenderer.tsx'));
// CONTRACT-OUTPUT-TRUTH-1：唯一 production 交付编排。
const delivery = stripComments(await read('src/verticals/legal/contract-review-delivery.ts'));
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
// LEGAL-FIVE-FACES-1：场景取用由 `getS3Scenario` 改锚 `getProductionScenario`（同一装配模块，
// 判据不变：场景实例必须来自 LEGAL-S3 装配点，端口不自行 registry 查表；且它对闭集外显式失败、
// 不回落 S3）。「只装配不重造」一条未减——红的理由判例：门跟着码走，改锚新家不删判据。
for (const fn of ['buildS3RunInput', 'buildIntakeRunInput', 'resolveSessionMaterials', 'mapReviewResolutionToResume', 'createLegalS3ScenarioDeps', 'getProductionScenario']) {
  requireMatch(command, new RegExp(`\\b${fn}\\b`), `必须消费 LEGAL-S3 装配件 ${fn}（只装配不重造）`);
}
requireMatch(command, /runScenario/, 'run 必须经真实 core executor runScenario（非 recording）');
requireMatch(command, /resumeScenario/, 'resume 必须经真实 core executor resumeScenario（非 recording）');

// ── grant（真实）案接线（App.tsx）：run/gate/resume/cancel/docx 源全走生产链 ──────
// CONTRACT-TRACE-1「过手即拆」：run/cancel/recover 的编排外提到 work-session-lifecycle。
// 门跟着码走，逐条拆「App 侧接线」＋「外提件里的调用」两段——两段都在才算真正接通。
requireMatch(legalSurface, /useWorkRunLifecycle\(\{[\s\S]*?workCommand: deps\.workCommand,/, 'grant 案 run/cancel/recover 必须把生产 workCommand 交给会话生命周期编排（垂类驱动侧接线）');
requireMatch(lifecycle, /workCommand\.startWithPreflight\(/, 'grant 案 run 必须经 workCommand.startWithPreflight（显式主体 preflight）');
requireMatch(legalSurface, /useContractReviewSubmission\(\{[\s\S]*?workCommand: deps\.workCommand,/, 'grant 案 resume 必须把生产 workCommand 交给提交编排（垂类驱动侧接线）');
// 组合根装配锁：生产 workCommand 只能由 main.tsx 注入垂类驱动，壳不得自持第二条注入路径。
requireMatch(main, /createLegalWorkSurface\(\{\s*workCommand\s*\}\)/, '受信组合根必须把生产 workCommand 注入垂类工作面驱动');
forbidMatch(app, /createLegalWorkSurface/, 'App.tsx 不得自行构造垂类工作面驱动（装配点只属组合根）');
requireMatch(submission, /commandRef\.current\.resolveReview\(/, 'grant 案 resume 必须经 workCommand.resolveReview（逐条 revision）');
requireMatch(lifecycle, /workCommand\.cancel\(/, 'grant 案 cancel 必须经 workCommand.cancel');
// WORK-LIVE-REPLAY-1（答复 WORK-HOST-1 驳回阻断二）：跨切案/重启的恢复入口必须真实消费 workCommand.replay
// 水合投影（此前「全 App 对 workCommand.replay 零消费点」是驳回根因）。
// CONTRACT-OUTPUT-TRUTH-1「过手即拆」：判定外提后，App 侧是**把 workCommand.replay 交给**外提件，
// 调用点在外提件里。门跟着码走，拆成两段——断言不弱化：两段都在才算真正接通，任一段消失
// （App 不再交、或外提件不再调）仍触红。
requireMatch(
  lifecycle,
  /readWorkReplay\(\s*workCommand\.replay/,
  'grant 案 恢复入口必须把 workCommand.replay 交给恢复编排',
);
requireMatch(
  lifecycle,
  /await replay\(query\)/,
  'grant 案 恢复编排必须真实调用注入的 replay（水合投影续行，答复 WORK-HOST-1 驳回阻断二）',
);
// 退役名反向锁（判例「红的理由」）：被吸收的模块名不得复活。若有人另起 work-recovery，
// 上面两条仍可能各自绿（App 交给新名、新模块里也有 await replay），红必须报对理由。
for (const [label, source] of [['App', app], ['work-session-lifecycle', lifecycle]]) {
  forbidMatch(
    source,
    /work-recovery|readWorkRecovery/,
    `${label}：\`work-recovery\` 已被 work-session-lifecycle 吸收，恢复判定不得再有第二处声明`,
  );
}

// ── CONTRACT-TRACE-1：pointer 生命周期——compare-and-clear 是唯一清除形态 ──────────
requireMatch(
  lifecycle,
  /const current = store\.read\(caseId\);[\s\S]*?current\?\.sessionId === action\.sessionId/,
  'pointer 清除必须 compare-and-clear：先读当前值比对 sessionId，永不 blanket clear',
);
requireMatch(
  lifecycle,
  /const previous = readWorkSession\(caseId\);/,
  'fresh start 必须在调用 start **之前**捕获旧 pointer（rejected 时它须逐字不变）',
);
requireMatch(
  lifecycle,
  /tracker\.observeDurableEvent\(\)/,
  'pointer 建立时点必须是首枚 post-CAS event，不得在 candidate 返回时抢写',
);
// 旧写法：start 同步返回即 persist、rejected/canceled 一律 clear。两处都必须零出现。
forbidMatch(
  lifecycle,
  /persistWorkSession\(caseId,\s*\{\s*sessionId/,
  'App：不得在 candidate 返回时直接持久（取得 candidate 不是建立成功）',
);
forbidMatch(
  lifecycle,
  /status === 'rejected' \|\| outcome\.status === 'canceled'\)\s*\{\s*clearWorkSession/,
  'App：rejected 不得清 pointer（旧记录须逐字不变）；canceled 只可 compare-and-clear',
);
requireMatch(legalSurface, /projectRiskListGate\(riskList/, 'grant 案 live gate 必须经 projectRiskListGate（真实 RiskList）');

// ── CONTRACT-OUTPUT-TRUTH-1 R1：旧固定产物名不得进入生产路径（驳回项二回归锁）──────────
// 生产产物名是版本化的，只能由唯一 coordinator 从完整 replay 的持久 metadata 铸出。
// 旧写法按固定名 `合同审查报告.docx` 探询存在性，会把产出目录里上一版留下的文件误报成
// 「本次会话已有产物」，并在结果卡回退显示旧名——本组锁死那两处。
// 样板案的合法使用**显式豁免**：demo 确实写这个固定名（`produceDemoDocx` 的 outputFileName、
// demo 卡片与 reveal/open），故字面量单源保留在 `DEMO_CONTRACT_OUTPUT_FILE` 常量上——
// 名字前缀本身声明了边界，任何生产路径引用它都会在 review 与下方断言处暴露。
const CONTRACT_OUTPUT_LITERAL_HITS = (app.match(/合同审查报告\.docx/g) ?? []).length;
if (CONTRACT_OUTPUT_LITERAL_HITS !== 1) {
  failures.push(
    `App：固定产物名字面量必须单源（只许留在 DEMO_CONTRACT_OUTPUT_FILE 常量上），实测 ${CONTRACT_OUTPUT_LITERAL_HITS} 处`,
  );
}
requireMatch(
  app,
  /const DEMO_CONTRACT_OUTPUT_FILE = '合同审查报告\.docx';/,
  'App：固定产物名常量必须带 DEMO_ 前缀（名字即边界声明）',
);
forbidMatch(
  app,
  /\boutputDisplayName\s*\?\?/,
  'App：生产结果卡不得对产物名做任何回退猜测（无持久名即诚实空态）',
);
// 逐行判定而非单条正则：守卫写在调用**之前**同一行，方向搞反的正则会给出假红（本轮已踩）。
for (const line of app.split('\n')) {
  if (!line.includes('caseOutputClient.exists(caseBinding, DEMO_CONTRACT_OUTPUT_FILE)')) continue;
  if (!line.includes("kind === 'demo'")) {
    failures.push('App：固定名存在性探询必须由 demo 判据同行守卫，grant 路径不得按名猜产物');
  }
}

// ── CONTRACT-OUTPUT-TRUTH-1：主合同必须由用户显式选定，「取 ready[0] 猜」在生产路径零出现 ──
// 旧实现让入库顺序决定「哪份是主合同」，用户从未表达过；本组锁的就是那处猜测不许复活。
for (const [label, source] of [['App', app], ['work-command', command], ['primary-contract', primaryContract]]) {
  forbidMatch(
    source,
    /\bready\s*\[\s*0\s*\]/,
    `${label}：production Legal S3 路径不得以 ready[0] 猜主合同（须用户显式选定）`,
  );
}
// GENERIC-PACK-1 裁定二：起跑面候选改经冻结 launch 声明的 mediaType→精确 MIME 映射
// （renderer 组装 `resolveOptions`），`selectPrimaryContractCandidates` 的判据随迁——
// 锚新家不删判据（红的理由判例）。
requireMatch(riskReviewRenderer, /MEDIA_TYPE_BY_DECLARATION/, 'grant 案起跑面候选必须经声明 mediaType→精确 MIME 映射（不得按文件名后缀猜）');
requireMatch(riskReviewRenderer, /DOCX_MEDIA_TYPE/, 'grant 案起跑面候选必须只列可作主合同的 DOCX（精确 mediaType 判据）');
requireMatch(lifecycle, /orderS3MaterialRefs\(/, 'grant 案 start 必须经 orderS3MaterialRefs（主合同稳定在 materialRefs[0]）');
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
forbidMatch(lifecycle, /outcome\.status === 'failed'[\s\S]{0,180}clearWorkSession/, 'failed outcome 不得清除恢复指针');
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
