# WO-WK10b · 通用工作面收尾与领域 Review 接缝

2026-09-08。用户授权下一轮施工；Claude Opus为实现者，沿用Fable WK裁定，Astra负责当前契约和接收。基线 `d86eba49ca308fb9f47fc953fe440ffa3289da3e`（main）；第二节点与收尾均已合流。替代旧WO-WK10中“b待合流”的启动条件，不改变历史作者回执。

本单分两个依赖明确的交付，第一段可立即开工；第二段等H1。总顺序见 [本轮派单](../../../../execution/2026-09-08-main-round/README.md)。

## 输入与写权

消费 [intake-round-2](../intake-round-2.md) 的WK-43/45、57、69–76，[text-sweep](../text-sweep.md)、[ReviewProjection](../contracts/review-projection.md)、[Work Surface边界](../../../../design/work-surface-boundaries.md)、`docs/interface-components.md` 与 `engineering/design/copy-convention.md`。

Opus拥有本单必要的 `app/web/app.mjs`、`surface-modules.mjs`、相关view/样式/图标sprite与这几份UI文档。H3的 `app/extensions/evidence-memo/renderer.mjs` 只在第二段开写。不改server/runtime/Core、HTTP契约或brand几何；同一路径与WK11串行。

## 第一段：只消费已有事实

1. 建 `contracts/glyph-semantics.md`，每个稳定动作记录语义、出现面、频率、文字/图标裁取、已准入Lucide glyph、accessible name与tooltip。用本仓固定sprite源；后果、对象与权限范围保持必要文字，不为单词化牺牲含义。
2. Chat Flow/行卡减法。Home下带三集合、分页、错误与空态显示自 2026-09-08 起移入 [WO-WK13](WO-WK13-home-bands.md)（第三轮派单），本单不再写 `home-view.mjs`；“当前待处理”不改叫“今日”。BE-1/3未交付，不画假heatmap或补0。
3. 工作面沿主区+悬浮卡/展开态，复用既有renderer身份、File/Run引用、Escape和焦点恢复；更新旧“三栏/第三列/rail header”文档到WK-72/74最终模型。
4. 热插拔仅指当前注册模块的呈现生命周期：声明槽位不等于可执行renderer。可复用registry、既有revision/snapshot与mount/dispose，但不能把任意profile uiSlots当新组件代码。active run期间由后端冻结配置，不提供保证稍后执行的前端队列。
5. producer/renderer缺席区分：已有payload而renderer缺席可只读展示；后端返回空projection时明确缺失，不能自造Decision/Evidence或宣称持久fallback已完成。
6. 维持Home框外状态行、64–160输入区、桌面居中/留白与L0–L3层级；不重新裁定桌面沉底、窄宗优先级或四轴设计。

## 第二段：领域 Review 与续行（契约已交付，合流后开工）

依据 Astra `codex/harness-core` `d6247a8`（代码基线 `1332691`，170/170）交付的 [Work Core 契约](../../../../../docs/work-core/contract.md)、[NDA 接缝](../../../../../docs/work-core/nda.md) 与真实合成 packet `app/tests/fixtures/work-core/nda-packets.json`（pending / accepted / producer-unloaded 三态）。本段只消费 packet 中实际存在的字段与 `humanActions` 列出的合法动作；服务端复验一切授权（spec FN-17）。

| 入口 | 消费 | 形态 |
|---|---|---|
| 逐规则候选视图（G2） | `projection.candidates[].domain`：`findings[]`（`ruleId / status / evidence / reason`）、`reconciliation`、`facts`、`playbookVersion`；`sources[]`、`evidence[]`、`matter.version / source_version` | 一行一规则，状态词按 packet 原值（灰字，仅 conflict / unknown 类可着色）；展开显示引文锚点（Unicode 码点偏移）与 reason；同一 `stateVersion` 下 inline 与展开一致 |
| 正式决定（G2） | `POST /sessions/:id/actions` `decide {request_id, candidate_id, base_version, action, reason}`；只在 `humanActions` 含该 action 时显示；未决 finding 存在时 packet 不给 accept | 三个对象化按钮（Accept this version · Reject · Request evidence）+ reason；409 `VERSION_CONFLICT / STALE_INPUT / IDEMPOTENCY_CONFLICT / CANDIDATE_CLOSED` 后刷新 surface 并保留 reason 草稿；回执丢失时用原 `request_id` 重试 |
| 人工修订 | `revise_candidate {candidate_id, new_candidate_id, base_version, proposal:{domain}}` | 只在 `humanActions` 含该 action 时提供；新候选带 `supersedes` 与 `provenance`，旧候选保持可读 |
| 决定回执可见（G2） | `GET /sessions/:id/work-query?kind=request&requestId=…`；`projection.decisions[]` | Chat Flow 该 Run 后一行只读回执（动作 · 候选 · stateVersion · 时间）；null 表示无已提交回执，不显示成功 |
| 继续已有事项（G3） | `GET /projects/:id/work` → 列出 Matter identity 与 extensionId；`POST /sessions/:id/extension {extensionId, input:{existingMatterId}}`；`{detach:true}` 释放 | `#binding-panel` 分两段 Create new / Continue existing；跨 project 不可见；`binding_mismatch / binding_exists` 按权威回执处理 |
| 只读历史（G3） | `GET /sessions/:id/surface` 在 producer 缺席、卸载或 contract 不支持时返回 `readOnly:true`、`humanActions:[]`、`extension:null` 或 unloaded | 同一组件无按钮；顶行显示 producer 状态与 `stateVersion`；`compatibility` 非 supported 时只显示可安全识别的 envelope |
| 历史来源字节 | `GET /sessions/:id/work-query?kind=source&candidateId=…&sourceId=…&version=…` | 旧候选的引文按其冻结 revision 读取，不用当前 sources 回填 |

Renderer：`inbound-nda` manifest `surface:null`，需新建 `app/extensions/inbound-nda/renderer.mjs`（与 evidence-memo renderer 同一 dispatch 契约：只收 projection 与 typed dispatch，无 fetch / storage）；静态 allowlist 路径向 Astra 提交请求，不自改 `app/server/index.mjs`。绑定表单沿 manifest `bindingFields`（title / sourceText / facts JSON）。

不做：通用 permission / question / outcome 信封不扩 accepted；不画 packet 未给的动作；不在前端计算 findings 是否完整；不执行旧 producer。
## 必须验证与交付

第一段：代表控件键盘/accessible name、切换renderer零重复订阅、关闭与重新打开、空/失败/分页区别、1440和390浅深、200%缩放、reduced-motion。复用现有受影响回归，有界新增真实反例；视口模拟与真实触控/读屏分开。

第二段：以 `nda-packets.json` 三态 fixture 与 `work-continuity.test.mjs` 的真实 loopback 链验证：同版本 inline / detail、过时决定 409、回执丢失后原 request_id 重试、断线恢复、候选修订后旧决定失效、renderer 缺席与 producer 缺席分别验证；续行：新 Session 绑定既有 Matter 后显示原候选与决定。交付 spec 反例 FE-T06 / T08 / T11 前端侧结果。作者不把 local-fake 写成真实 provider。

两个交付各自固定SHA、实际路径、运行/数据位置、相称检查、消融表与未检项。第一段可先合流并释放WK11共享文件；第二段随后消费H1，不让整个WK10b被后端依赖卡住。Astra接收并安排非作者独验，用户保留视觉四轴裁定。
