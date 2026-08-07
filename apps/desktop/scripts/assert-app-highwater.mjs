// App.tsx 高水位门（架构裁定 2026-07-20，随 CONVERGE-DOC-1 复验回炉批立）。
//
// **立门缘由**：第二轮验收暴露一个结构性事实——派生工单表 17 行里 **11 行触碰
// `App.tsx`**（6 行不触）。在「触 App.tsx 的票不并行」这条硬约束下，整条线实质串行，并行度上限
// 约等于 1。
//
// 架构裁定**不提前 D1**（大爆炸重构换并行度是坏交易——D1 自己就是最大的 App.tsx 票，
// 提前它等于把串行变成停摆），代之以两件配套：
//   ① **「过手即拆」纪律**：凡触 App.tsx 的票，所触状态/JSX 面优先外提为独立模组，
//      SPEC 留痕（人执行，验收查）。
//   ② **本门**：当前行数即上限，**只降不升**；票内净增须由等量外提抵消。
//
// 于是串行是既成代价，但**随线衰减**——每张票过手，下一张的触碰面就小一分。没有本门，
// ①只是一句劝告：过手的人赶工期时净增几十行毫无阻力，而债只会朝一个方向走。
//
// **门的边界（如实登记）**：行数是**代理指标**不是目标本身。它拦得住「又长胖了」，
// 拦不住「行数没变但耦合更深」。把 200 行塞进一个新文件再 import 回来同样能过门——
// 那正是本门想要的方向（外提），但外提得好不好仍须人看。**不要把绿灯读成解耦达标。**

import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.resolve(scriptDirectory, '..', 'src', 'App.tsx');

// 高水位＝立门当日实测行数。**此常量只许下调**：任何上调都是在把裁定改掉，
// 须经架构拍板并在此处留痕（同 floor 只升不降的先例，方向相反）。
// FILE-PREVIEW-1 验收收口（2026-07-20）：2747 → 2746；删除零消费的
// `data-right-narrow` 死属性，净减亦同步收紧棘轮。
// MODEL-CONFIG-EXPLICIT-1（2026-07-20）：2747 → 2740。外提物＝模型配置状态面
// （`modelConfig`/`modelConfigOpen` 两个 state + `updateModelConfig` 本体 + 本票新增的
// 降级一次性提示）去向 `src/provider/use-model-config.ts`；App.tsx 侧只余一次 hook 调用。
// RELEASE-VERIFY-1 合并态（2026-07-20）：两侧正交净减叠加后以 `wc -l` 实测为 2739，
// 不取任一侧旧常量；两侧沿革均保留在上方。
// CONTRACT-REVIEW-SAFETY-1（2026-07-25）：2738 → 2665。本票净增的提交编排全部外提，
// 且顺带带走了原先就住在 App 的五枚 state：外提物＝`work/use-contract-review-submission.ts`
// （review 编辑态 + submitted/submitting/resultMessage/nonAppliedPending/confirmedNonAppliedIds
// 五枚 state + `produceContractDocx` + demo waiver 效应 + 提交编排），App.tsx 侧只余一次 hook
// 调用与四个消费点。`contractOutputExists` 有三处与提交无关的渲染消费，留在 App 由回调驱动。
// 同票收尾再 −2：清掉外提 auto-resume effect 后遗留在 `dispose`/`beginCorrection` 里的两行空白。
// CONTRACT-OUTPUT-TRUTH-1 · O3（2026-07-26）：2665 → 2661。外提物＝`recoverWorkRun` 的**判定**
// （replay 判别联合 → 恢复动作的分支矩阵，含 typed 失败按 reason 分流的可重试文案）去向
// `src/work/work-recovery.ts` 的纯函数 `planWorkRecovery` / `readWorkRecovery`；App.tsx 侧只余
// 「读 pointer → 取 plan → 应用 React 动作」。本票在 App 净增的 typed 失败分流由此抵消并再收紧 4。
// CONTRACT-OUTPUT-TRUTH-1 · O4（2026-07-26）：2661 → 2658。外提物＝production S3 起跑面整块
// JSX 去向既有 `workbench/Panels.tsx` 的 `S3LauncherPanel`（纯呈现件，零新 CSS、零新 React 模块），
// App.tsx 侧只余一次组件调用与 props 供给；本票新增的必填主合同 `<select>` 净增由此抵消并再收紧 3。
// CONTRACT-OUTPUT-TRUTH-1 · O8（2026-07-26）：2658 → 2657。外提物＝production 产物**显示名**的
// 派生（版本化命名由 coordinator 铸出）去向 `work/use-contract-review-submission.ts` 的
// `outputDisplayName`；App 侧只余一次读取。同批清掉 `startWorkRun` 里多余的主合同别名行。
// CONTRACT-TRACE-1（2026-07-26）：2657 → 2644。外提物三件——① run/cancel/recover/pointer/
// completed-output 五处状态面整块去向新建的 `src/work/work-session-lifecycle.ts`（`useWorkRunLifecycle`
// 及其 §1 纯判定：pointer compare-and-clear 矩阵、start 建立时点 tracker、replay 恢复分支表）；
// ② 审阅界面状态投影 `projectReviewItemStates` 与批量池/逐条就绪等派生去向 `workbench/Panels.tsx`；
// ③ 被吸收的 `work/work-recovery.ts` 整件退役。本票在 App 新增的 canonical reader 适配、回到原件
// 路由与 read_only 分支由此抵消并再收紧 13。
// DEBT-DOSSIER-1 件一：两条入库编排（整夹 / composer 上传）外提至 `material/case-ingest.ts`，
// App 只留装配（store / 宿主写入 / 显式态通道注入）。2644 → 2567。
// DEBT-DOSSIER-1 件二：材料清单的持有与逐案派生外提至 `case/use-case-materials.ts`
// （件数不再挂在 CaseSummary 上，八处构造点随之退掉 fileCount）。2567 → 2551。
// PANEL-BLUEPRINT-1（矩阵首枚）：外提物两件——① 会话产出取数（四个工作面各抄一遍的
// 「账本优先 / 仅 demo ref 回落 fixture」表达式）去向 `work/session-artifacts.ts` 的
// `createArtifactReader`；② 具名工作面的 blueprint→组件解析去向 `preview/named-component-view.ts`
// 的 `resolveNamedComponentView`。App 侧只余一次 reader 构造与一次解析消费；`view === 'matrix'`
// 专用分支与 `MatrixPanel` 直连同批退役。同批显式收口末尾落点（`revision` 原为无判等的默认落点，
// blueprint 缺席即静默渲染成修订预览）净增 4 行。2551 → 2549。
// PI-LANE-UI-1（2026-08-05）：2549 → 2475。本票净增 24 行（pi 端口 prop、pi 会话 hook 一次调用、
// Draft 面一段 JSX、三段 union 与 Composer 段值收窄），外提 95 行——
// `ChatAssistantMessage` 与 `ChatMessage` 型去 `chat/ChatAssistantMessage.tsx`（助手气泡与其消息型，
// 与 App 状态无关，逐字节移出），`useWideSplitAvailable`/`useNarrowRailRequired` 去
// `workbench/use-viewport-queries.ts`（两枚断点查询）。两处外提行为一字未改；
// 随外提失去消费者的四枚 import（`formatUsageMetering`／`TurnProjection`／`processTraceFromTurn`／
// `ChatMarkdown`）同批删除，再收紧 3。
// GENERIC-PACK-1 · 余三 panel 第一枚（timeline）：2475 → 2460。外提物两件——① 样板案 chat 侧
// artifact 卡的取数与文案去 `demo/demo-artifact-card.ts` 的 `demoArtifactCardCopy`（它只属显式
// demo 回放，却让壳长期持有三个垂类 artifact 局部）；② 时间线渲染去
// `preview/TimelineRenderer.tsx`（blueprint 链）。App 侧净增 3 行（宿主渲染上下文 memo 与
// Provider 包裹），`view === 'timeline'` 分支、`TimelinePanel` 直连与 `timeline`/`Timeline`
// 两处垂类持有同批退役。
// GENERIC-PACK-1 · 余三 panel 第二枚（graph）：2460 → 2451。外提物＝当事人图谱渲染与其
// 懒载点去 `preview/GraphRenderer.tsx`（`lazy(() => import('workbench/GraphPanel'))` 随渲染件
// 迁走，g6 chunk 切分不变）；`view === 'graph'` 分支、`graph` 局部、`PartyGraph` 类型持有与
// `lazy`/`Suspense` 两枚 React import 同批退役。App 侧净增 0。
// GENERIC-PACK-1 · ③ 工作面集 blueprint 驱动：2451 → 2449。外提物两件——① 可见工作面集、
// 默认落点与标题查询去 `preview/workbench-views.ts`（`resolveWorkbenchViews` /
// `preferredWorkbenchView` / `workbenchViewLabel`），壳侧 `VIEW_LABELS` / `VIEWS` /
// `visibleViews` 三件同批退役；② 样板案页签计数四枚去 `demo/demo-view-counts.ts`。
// App 侧净增 4 行（派生一次、默认落点一次与对照面配对两行注释）。
// GENERIC-PACK-1 · ⑤ revision 迁 kind:'component'（余三收官）：2449 → 2276。外提物＝整套 S3
// 审阅编排——风险清单取数、两条门禁投影、逐条处置/修正与其埋点、提交与交付、run/cancel/recover
// 生命周期、切案切场景的面态重置——去 `work/legal-work-surface.tsx`；起跑面与审阅面 JSX 去
// `preview/RiskReviewRenderer.tsx`。App 侧新增的只有驱动装配（宿主输入面一段字面量 + 一次
// `use()`）与「回到原件」的 ref 间接一行；`riskList`/`gate`/`submission`/`workRun` 四枚持有、
// 三处渲染链外消费与非 demo 三段前置分支同批退役。
// GENERIC-PACK-1 ⑧ 上调（净增 22，SPEC 留痕）：逐 matter 生效 registry 接线（派生 + 落回退
// effect + 水合携绑定 + 过渡默认写入）——卸载态机制的必要接线，非功能膨胀；C5 场景条外提
// 与起手引导的净减将随外提生效下调。
// GENERIC-PACK-1 裁定二下调至 2292（外提生效）：预检表单迁通用件——壳内 workSubject/
// primaryContractId 双状态与 setter、切案清零行退役（表单值收进场景启动参数，住驱动侧）。
// GENERIC-PACK-1 裁定二再下调至 2282（外提生效）：场景条内联 JSX（四钮/更多弹层/取消控件
// 约 45 行）迁 `workbench/scene-strip.tsx` 通用件——壳只留派生与路由；sceneMore 双状态与
// 点击外弹层关闭同批随迁。
// GENERIC-PACK-1 ⑧ 上调至 2293（净增 11，SPEC 留痕）：卸载态退化接线——垂类产物包未加载的
// 显式退化分支（ADR-015 决定四，产物存在＋加载提示）与卸载态起草面默认面（落通用工作稿轨）
// 两条显式诚实呈现分支，属卸载态机制的必要接线。
const HIGH_WATER_LINES = 2282;

// 计数口径＝**视觉行数**：末尾换行不算作额外一行。对以换行结尾的文件（本仓源码皆是）
// 它与 `wc -l` 同值；无尾换行时本门比 `wc -l` 多 1——那一行确实存在，只是没有结尾换行符。
// 写死这条是因为立门时踩过：`split('\n').length` 比 `wc -l` 多 1，门在基线就自红。
// 口径含糊的门比没有门更坏——它会让人以为常量错了而去调常量。（前版注释把口径写成
// 「对齐 wc -l」，仅在尾换行时成立，属自述不准，已订正为实际口径。）
const content = readFileSync(appPath, 'utf8');
const actual = content.endsWith('\n') ? content.split('\n').length - 1 : content.split('\n').length;

if (actual > HIGH_WATER_LINES) {
  console.error(
    `App.tsx 高水位门失败：当前 ${actual} 行 > 上限 ${HIGH_WATER_LINES} 行（净增 ${actual - HIGH_WATER_LINES}）。\n`
    + '「过手即拆」纪律：触碰 App.tsx 的票，其所触状态/JSX 面须优先外提为独立模组，\n'
    + '票内净增必须由等量外提抵消。若本票确有正当理由净增，须经架构拍板后下调本门常量并留痕——\n'
    + '不得因赶工期而上调：上限只降不升是这条纪律唯一的执行力来源。',
  );
  process.exit(1);
}

if (actual < HIGH_WATER_LINES) {
  // 外提生效即应收紧上限，否则腾出的空间会被下一张票悄悄吃掉——高水位若不跟着降，
  // 「只降不升」就退化成「一次性宽限」。
  console.error(
    `App.tsx 高水位门失败：当前 ${actual} 行 < 上限 ${HIGH_WATER_LINES} 行。\n`
    + `外提已生效，请把本门常量下调为 ${actual} 并在票内 SPEC 留痕（外提了什么、去了哪个模组）。\n`
    + '不收紧上限＝把腾出的空间留给下一张票悄悄吃掉，纪律随即失效。',
  );
  process.exit(1);
}

console.log(`App.tsx 高水位门通过：${actual} 行（上限 ${HIGH_WATER_LINES}，只降不升）`);
