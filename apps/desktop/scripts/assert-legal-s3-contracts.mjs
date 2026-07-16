import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// LEGAL-S3-BINDING-1 边界守卫（ADR-010 决定五 + 决定三）：legal.S3 生产装配点必须——
// - 零 demo：不 import demo/recording/DEMO_ARTIFACTS/demo-data/demo-runtime，不消费 demo 原文
//   （contractSourceMd），不挂 demo-fixture/mock party 适配器（非 demo case 回落即触红）；
// - 真实工具：party-verify 挂 qcc 适配器（未配置即 typed 降级，绝不换 demo/mock 冒充已核验）；
// - 材料经 resolveForProvider 核验后才入 provider；docx 源文只从会话材料（readingMarkdown）取；
// - live gate projection 由真实 RiskList 派生（不复用 demo GATES 表）；逐条 revision + revise 非终态阻断；
// - 缺主体/缺工具/材料阻断/revise 各有显式错误闭集（零静默降级）；
// - ArtifactEnvelope 版本源装配到位（首个真实 artifact 生产者）；
// - browser-safe：runtime 只走 @courtwork/core/work-protocol 与 @courtwork/tools/* 子路径，零 node:*，
//   @courtwork/core 根 barrel 仅允许 import type；durable-before-effect（persistBarrier=store.commit）。

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFile(path.join(root, relative), 'utf8');

// 只扫代码，不扫注释：说明性 JSDoc 提到 demo/GATES 等词是合法的（解释「绝不消费」），
// 门守的是**代码**里的 demo 依赖/回落。剥离块注释与行注释后再断言。
const stripComments = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

const binding = stripComments(await read('src/work/legal-s3-binding.ts'));

const failures = [];
const requireMatch = (source, pattern, message) => {
  if (!pattern.test(source)) failures.push(message);
};
const forbidMatch = (source, pattern, message) => {
  if (pattern.test(source)) failures.push(message);
};

// ── 零 demo 依赖 / 零 demo 原文回落（ADR-010 决定五、七向隔离）─────────────
const DEMO_FORBIDDEN = [
  [/@courtwork\/demo-data/, '不得依赖 @courtwork/demo-data（非 demo 生产装配点）'],
  [/@courtwork\/demo-runtime/, '不得依赖 @courtwork/demo-runtime（demo/验收装配点，非生产）'],
  [/from ['"]\.\.?\/demo\//, "不得 import ../demo/*（recording/fixture/demo client）"],
  [/\brecordings?\b/, '不得引用 recording（非 demo case 零 recording 回落）'],
  [/DEMO_ARTIFACTS/, '不得消费 DEMO_ARTIFACTS'],
  [/contractSourceMd|设备采购合同\.md|\?raw/, '不得消费 demo 原文（contractSourceMd/?raw）——docx 源文只从会话材料取'],
  [/createDemoFixturePartyVerifyAdapter/, '不得挂 demo-fixture party 适配器（缺工具须 typed 降级，不换 demo）'],
  [/createMockPartyVerifyAdapter/, '不得挂 mock party 适配器（缺工具须 typed 降级，不换 mock）'],
  [/\bGATES\b/, '不得复用 demo GATES 表——live gate 由真实 RiskList 派生'],
];
for (const [pattern, message] of DEMO_FORBIDDEN) {
  forbidMatch(binding, pattern, message);
}

// ── 真实 party-verify 工具（qcc，非 demo/mock）──────────────────────────
requireMatch(binding, /createQccPartyVerifyAdapter/, 'party-verify 必须挂真实 QCC 适配器（createQccPartyVerifyAdapter）');
requireMatch(
  binding,
  /createPartyVerifyTool\(createQccPartyVerifyAdapter\(/,
  '生产工具注册表必须以 qcc 适配器构造 party-verify',
);

// ── 材料经 resolveForProvider 核验；docx 源文只从会话材料取 ────────────────
requireMatch(binding, /\.resolveForProvider\(/, '材料必须经 resolveForProvider 核验后才入 provider');
requireMatch(binding, /MaterialResolutionBlockedError/, '材料核验失败必须显式阻断（MaterialResolutionBlockedError）');
requireMatch(
  binding,
  /export function bindDocxSourceMarkdown\(material: StoredMaterial\): string \{[\s\S]*?return material\.readingMarkdown;/,
  'session 原文绑定：docx 源文必须从复验后的会话材料 readingMarkdown 取（非 demo 原文）',
);

// ── live gate 由真实 RiskList 派生；逐条 revision + revise 非终态 ──────────
requireMatch(binding, /export function projectRiskListGate\([\s\S]*?riskList\.risks\.map\(/, 'live gate 必须由真实 riskList.risks 逐条派生');
requireMatch(binding, /\/risks\/\$\{index\}\/dispositionStatus/, '逐条 revision 必须映射 /risks/<index>/dispositionStatus');
requireMatch(binding, /disposition === 'reject' \? 'rejected' : 'confirmed'/, 'confirm→confirmed / reject→rejected 映射必须显式');
requireMatch(binding, /ReviseNotTerminalError/, 'revise 必须保持 pending 非终态（ReviseNotTerminalError）');

// ── 显式主体/工具阻断闭集（零静默降级）────────────────────────────────
for (const err of ['MissingContractPartyError', 'MissingToolInputError', 'IncompleteReviewError', 'UnknownReviewItemError']) {
  requireMatch(binding, new RegExp(`class ${err}`), `缺显式错误 ${err}（阻断必须类型化，零静默降级）`);
}

// ── ArtifactEnvelope 版本源装配（首个真实 artifact 生产者）────────────────
requireMatch(binding, /export function buildArtifactVersioningSource\(/, '必须装配 ArtifactEnvelope 版本源（buildArtifactVersioningSource）');
requireMatch(binding, /descriptor\.schema\.safeParse/, '版本源必须以 descriptor.schema 校验 payload（读侧迁移基底）');

// ── durable-before-effect：persistBarrier = store.commit ──────────────────
requireMatch(binding, /persistBarrier: async \(\) => \{[\s\S]*?await input\.store\.commit\(\);/, 'ScenarioExecutorDeps.persistBarrier 必须 = store.commit（durable-before-effect）');

// ── browser-safe：零 node:*；core 根 barrel 仅 import type；runtime 走子路径 ──
forbidMatch(binding, /from ['"]node:/, '生产装配点不得 import node:*（browser-safe）');
forbidMatch(binding, /import\s+(?!type\b)[^;]*?from ['"]@courtwork\/core['"]/, '@courtwork/core 根 barrel 仅允许 import type（runtime 走 @courtwork/core/work-protocol）');
requireMatch(binding, /from ['"]@courtwork\/core\/work-protocol['"]/, 'runtime core 必须走 browser-safe @courtwork/core/work-protocol 子路径');
requireMatch(binding, /from ['"]@courtwork\/tools\/party-verify['"]/, 'party-verify 必须走 browser-safe 子路径 @courtwork/tools/party-verify');

if (failures.length > 0) {
  console.error(`LEGAL-S3-BINDING-1 boundary violations (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('LEGAL-S3-BINDING-1 boundary checks passed');
