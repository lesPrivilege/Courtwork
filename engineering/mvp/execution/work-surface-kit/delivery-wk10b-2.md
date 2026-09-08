# 交付 · WO-WK10b 第二段

2026-09-08，Opus。裁定 WK-43 / 45 / 47 / 57 / 59 / 71 / 72 / 74；主规范 [frontend-layering-spec](../../../design/frontend-layering-spec.md)（FN-04 / 05 / 17 / 18 / 19 / 20 / 21 / 22 / 23 / 24 / 25 / 28）；契约 [Work Core](../../../../docs/work-core/contract.md) 与 [NDA 接缝](../../../../docs/work-core/nda.md)；体例 [copy-convention](../../../design/copy-convention.md)、[icon-controls](../../../design/icon-controls.md)、[ui-composition-standard](../../../design/ui-composition-standard.md)。编排指引 [frontend-entries §3](../../../execution/2026-09-08-two-lines/frontend-entries.md)。

作者验证，**不是验收**。真实 provider、真实触控与真实读屏仍 not_run（§9）。

## 1. 固定坐标

| 项 | 值 |
|---|---|
| 开工基线 | `62556b7f65170ecf30efb2869447ae85fe69d721`（合流第一段与 Astra 动作 / renderer 接缝后的清洁 main） |
| 后端契约来源 | Astra `codex/work-review-actions` 冻结 `3d97beb8df20ee0061dc31e8cd72d01ac3b6afd7`；packet `fixtureVersion 2` |
| 工作树 | `/private/tmp/se-agent-wk10b2` |
| 分支 | `claude/wk10b-second`（未 push） |
| 交付 SHA | 见 §10 |
| 服务器 | `npm --prefix app start -- --data-dir /private/tmp/se-agent-wk10b2-data --port 8874`（已随交付停机） |
| 数据目录 | `/private/tmp/se-agent-wk10b2-data`（全新；每次完整跑之前删除重建） |
| provider | 宿主 loopback 假 provider，`capabilities.mode = "local-fake"`。**真实 provider not_run**，全程未配置也未读取任何凭据文件 |
| CDP | 19660 / 19662 / 19664 / 19668，各次新建 profile |

## 2. 改动的文件

| 文件 | 局部 |
|---|---|
| `app/extensions/inbound-nda/renderer.mjs` | **新建**。逐规则候选视图、决定、修订；只收 projection 与宿主的两个 typed 回调 |
| `app/web/surface-modules.mjs` | 新增 Work packet 的**唯一一份读法**：`workPacket`（纯规范化）、`renderWorkPacket`（DOM）、`candidateActions`（按描述符取动作）、`decisionWords` / `decisionActionWords`、`shortRef`；Workspace 悬浮卡改读同一 packet |
| `app/web/app.mjs` | `surfaceQuery`（两个只读 work 查询的闭表）与 `readHistoricalSource`；`loadWorkReceipts` / `loadWorkThread`（回执）；`decisionReceiptRows`（Chat Flow 行）；`dispatchSurfaceAction` 的 409 刷新；mount 增加 `query`；只读 fallback 改用同一读法；绑定面分两段 + `loadProjectWork` + `refreshSessionBinding`；扩展行新增 `Release`（`{detach:true}`） |
| `app/web/styles.css` | Work packet 读法、候选控件、修订表单、决定回执、绑定面两段的样式（全部只引用既有 token）；`.binding-panel` 的 `max-height` 40vh → 60vh |
| `app/tests/nda-renderer.test.mjs` | **新建**：交付的 renderer 字节经真实服务器只在声明路径可取、且不含任何自有数据通道；`workPacket` / `candidateActions` 对三态 packet 的读法与门控 |
| `engineering/mvp/execution/work-surface-kit/evidence/wk10b-2/**` | **新建**：脚本、断言结果、量测、同条件截图 |
| `docs/interface-components.md` | 新增「领域工作面」一节与 `surface-modules.mjs` 的读法 owner |
| `engineering/mvp/execution/work-surface-kit/contracts/glyph-semantics.md` | 新增第 3 / 4 节的本轮语义行（**新增 glyph 数 = 0**） |
| `engineering/mvp/execution/work-surface-kit/text-sweep.md` | §5 登记本轮增量入口 |
| `engineering/execution/2026-09-08-two-lines/frontend-entries.md` | §2 现状列按实际交付更新，裁定文字未改 |

未改：`app/server/**`、`app/runtime/**`、`app/core/**`、`app/domains/**`、`app/extensions/**`（新建的 renderer 除外）、`brand/**`、`PAPER.md`、HTTP 契约、`app/web/home-view.mjs`（WK13）、`app/web/runtime-view.mjs`（WK11）、`app/web/settings-view.mjs`（WK12）、`app/web/index.html`、`app/web/ui-controls.mjs`、`app/web/thread-projection.mjs`、`tools/**`。无新增 npm 依赖，lockfile 未动。**未提交 allowlist 请求**：`/extensions/inbound-nda/renderer.mjs` 已由 Astra 准入，本轮没有新增任何需要服务端登记的路径。

## 3. 做了什么

### 3.1 一份读法，两个消费者（入口 1 与 6）

工单要求「同一 renderer 组件」既服务于 producer 在场的可操作面，也服务于 producer 缺席的只读历史。这两个场合的挂载条件相反：`resolveSurfaceSlot` 只在 `status === "loaded"` ∧ 记录里有 `surface.module` 时挂载（第一段裁定，未改）。因此本轮不改挂载条件，而是把**读法本身**放进宿主已准入的 `surface-modules.mjs`：

```
workPacket(projection)            → 纯视图模型，字段缺失即 null，不补默认值
renderWorkPacket(packet, hooks)   → DOM；hooks 只能加三样东西：
                                      candidateControls(候选控件)
                                      onReadSource(历史来源读取)
                                      expanded / onToggle(开合记忆)
                                    —— 加不了任何一条事实
candidateActions(packet, id)      → 只认 schemaVersion === 1 的描述符
```

renderer 与只读 fallback 都调用它。两者不可能对同一份 packet 给出两种读法，也不存在第二套行解剖：行仍是 `flowRow`（16 glyph + 对象名 + 至多一个元数据词）。

**renderer 的 import**：`/web/ui-controls.mjs` 与 `/web/surface-modules.mjs`，都是静态、同源、已在 STATIC 表内、且宿主页面早已加载的模块（浏览器模块图命中，**新增网络请求 0**）。这是**刻意的选择**，理由是工单的「不要 fork 第二套解剖」；代价是这个 renderer 与宿主 UI kit 耦合。若 Fable 认为贡献方不得 import 宿主模块，替代做法是把这两个导出复制进 renderer——那正好是被禁止的第二套解剖，因此本轮不做，改由裁定决定。

### 3.2 逐规则候选视图（入口 1）

一行一规则：`ruleId` · packet 原值状态词；展开后是 `reason`、锚点 `source_id:source_version [start, end]`（Unicode 码点偏移，原样）与该候选**冻结的引文**。`reconciliation`（状态词 + 未决计数）、`playbookVersion` 与 `facts` 每候选各出现一次，不逐规则重复；`sources[]`、`matter.version / source_version`、`stateVersion`、候选的 `base_version / source_version / supersedes / provenance` 都在。inline（悬浮卡）与展开面读**宿主同一个 `state.surface.projection` 字段**，卡片显示的 `State` 即该 `stateVersion` 前 12 位。

状态词一律灰字；**只有 `conflict` 着色**（`--danger`），且词本身始终在，颜色从不是唯一载体（FN-28）。`unknown` 保持灰：unknown 不是 failed。

### 3.3 决定（入口 2）

按钮只来自 `humanActions` 里 `action === "decide"` 且 `schemaVersion === 1` 的描述符，且只画 `payloadSchema.properties.action.enum` 列出的值；`candidate_id` 与 `base_version` 取描述符自己的 `const`，不取本视图对「当前版本」的理解。对象化命名：`Accept this version` / `Reject` / `Request evidence`。reason 为空不发请求。

`request_id` 由 `(candidate_id, base_version, action, reason)` 决定：同一份内容重试用同一个 identity，改了 reason 就是新请求（FN-19，契约「Request ID binds full content」）。回执丢失（网络失败、5xx）时保留 identity 与草稿、**不自动重放**；被服务端拒绝（4xx）时丢弃 identity 并显示服务端原话。宿主在任何 4xx 之后重新读取 surface，把权威状态放回屏幕。

### 3.4 修订（入口 3）

只在 packet 为该候选声明 `revise_candidate` 时出现。表单从父候选自己的 `domain` 字节起草，允许逐规则改 `status` 与 `reason`，每次提交生成新的 `new_candidate_id`。**前端不计算 findings 是否完整、也不重算 reconciliation**：NDA adapter 会按当前来源与 facts 复算每条 finding，人工改动的状态被它以 `REVIEW_INVALID`（`CONCLUSION_MISMATCH` / `STATUS_INVALID`）拒绝，界面显示服务端原话。这是**实测行为**（§6.3），不是设计缺陷的粉饰：这个动作真正成立的用法，是在来源被替换后按当前可验证输入把父候选重新提到当前 base 上。表单里那句 "The extension re-checks every finding against the current sources and facts before saving." 就是这个后果。

状态词的词表没有在 packet 里被声明，因此 status 是自由文本 + 本 packet 已出现状态的 `datalist` 建议；合法性由服务端裁定（FN-17）。

### 3.5 决定回执（入口 4）

`projection.decisions[]` 说本宿主记了什么，`GET …/work-query?kind=request&requestId=…` 说 Core 是否**提交**了它。只有拿到非 null 回执才画行；回执读不到就什么都不画（不是成功也不是失败）。行落在该 Decision 的 `scope.run_id` 对应的 run 状态行之后，形态是 `flowRow`：`file-text` glyph · 短候选 id · `Accepted this version` / `Rejected` / `Evidence requested`，其下一行 `version N · state <12 位>`。无按钮。

为了让这一行不依赖「工作面panel 是否被打开过」，会话打开时对已绑定会话读一次 `/surface`（`loadWorkThread`）。开合工作面不会重复这次读取。

**契约缺口**：Work packet 的 Decision 记录里**没有时间字段**（`action / actor / candidate_id / matter_id / reason / request_id / result / scope`），宿主也没有 decision 事件。工单要求回执显示「时间」，本轮**没有画时间**，也没有拿 run 的 `endedAt` 冒充它。请求 Astra：若要时间，需要 Core 在 Decision 上给一个记录时刻。

### 3.6 继续已有事项（入口 5）

`#binding-panel` 分两段：**Create new**（沿 manifest `bindingFields`，含 NDA 的 `facts` JSON，未改）与 **Continue existing**（`GET /projects/:id/work` → 过滤出本扩展的条目）。路由本身按 project 划界，跨 project 条目不可见（实测 §6.2）。空态一句条件句：`No work in this project is bound to <extension> yet.`

行的对象名是 Matter id 的短形，元数据是 `version N`，其下一行 `<extensionId> · source revision N · <contractVersion>`。**`GET /projects/:id/work` 不返回 title、最近决定时间或会话名**（`{extensionId, matter:{id,version,source_version,contract_version,active_artifact,obligations}}`），frontend-entries 3.2 设想的 title 与「最近决定时间」因此没有画，也没有用别的对象回填。请求 Astra：若 Continue existing 要人读得懂的名字，需要 `list_work` 带上 Matter 的 title。

`binding_exists` / `binding_mismatch` 一律按服务端回执处理，并重新读一次 session 记录。`{detach:true}` 作为扩展行上的安静次动作 `Release`（可访问名写全后果："Release this session's binding; the recorded work stays in this project"），实测释放后会话回到纯 Chat 而 project 仍持有该 Matter。

### 3.7 只读历史与历史来源字节（入口 6、7）

- `readOnly:true` 且 producer 在场（active Run 冻结、或不支持的 contract）：renderer 自己不画任何控件，顶行元数据词 `Read only`，并沿用第一段既有句 `No action is declared on this reading.`（**未新增第五种措辞**）。
- producer 卸载 / 缺席 / renderer 取不到：宿主 fallback，第一段的三态缺席句原样保留，其下接同一份读法（无控件），最后是 `Recorded fields` 折叠着的原始 key/value（第一段消融 S-8 的保留项一字不丢）。
- **可解码性与 `compatibility` 分开**：producer 缺席的 packet 是 `compatibility: "read_only"` 却完全可解码；反过来 `domain.schemaVersion` 不认识的 packet 即使 producer 在场也不可解码。因此解码判据取 payload 自己声明的 `schemaVersion === 1`，不取信封的 `compatibility` 词。不可解码时只显示可安全识别的信封（身份、版本、状态、packet 自己记的文本）并写明 `domain schema N · not readable by this build`，**不按字段名重建 findings**。
- 历史引文：展开的锚点旁有 `Read the recorded source`，走宿主的 typed `query("source", …)` → `GET …/work-query?kind=source&candidateId=…&sourceId=…&version=…`。**从不拿当前 `sources[].text` 回填**，producer 不在时也照样能读（实测 §6.3）。

### 3.8 renderer 的通道

renderer 没有 fetch / storage / URL / provider / Core。它只有 `dispatch(action, payload)`（→ `POST /sessions/:id/actions`，服务端复验）与 `query(kind, input)`。`query` 是**闭表**：只有 `source` 与 `request` 两个 kind，参数形状固定，贡献方给不出路径、方法或主机（FN-21）。断言见 `app/tests/nda-renderer.test.mjs`：交付字节里没有 `fetch(` / `XMLHttpRequest` / `WebSocket` / `EventSource` / `sendBeacon` / `localStorage` / `sessionStorage` / `indexedDB` / `document.cookie` / 动态 `import(` / `eval(` / `new Function` / `innerHTML` / `outerHTML` / `insertAdjacentHTML` / `document.write`，import 只有那两个宿主 kit 路径。

## 4. 消融表（WK-47）

判据同第一段：**去掉后「该做什么 / 发生了什么 / 依据在哪」是否仍成立；成立即删。**

| # | 元素 | 去除后失去的判断 | 结果 |
|---|---|---|---|
| R-1 | 每条规则行上的「未决计数」（frontend-entries 3.1 的字面读法） | 无。一行只讲一条规则，它的状态词就是它的未决与否；把 candidate 级的计数抄进每一行，是同一事实的第 N 份拷贝 | **改**：未决计数每候选一次，落在 `playbook … · <reconciliation 状态> · N unresolved rules` 一行 |
| R-2 | 每条规则行上重复的 `playbookVersion` / `facts` | 无。它们属于这份 review，不属于某一条规则 | **删**（每候选各一次；facts 收进 `Recorded facts` 折叠） |
| R-3 | 规则行展开态里的引文与锚点 | **失去**「依据在哪」。锚点是这条 finding 唯一可核对的东西 | **保留** |
| R-4 | 收敛态就显示引文 | 无。扫一列规则时要读的是 ruleId 与状态词；四段引文把列表变成文档 | **删**（进展开态） |
| R-5 | `unknown` / `missing` / `deviation` 的着色 | 无，反而制造一个错的判断：把 unknown 染成 failed（FN-28 明令 unknown ≠ failed）。词本身已经说清 | **删**（只留 `conflict` 着色，且词永远在） |
| R-6 | 决定按钮的动词命名（`Accept` / `Reject`） | **失去**对象：接受的是「这一版」，不是一次泛化批准（FN-18） | **改**为 `Accept this version`；`Reject` / `Request evidence` 的对象由它所在的候选卡承担 |
| R-7 | 决定成功后的提示 | 无。回执行就在对话里，且它是服务端确认过的那一条；再弹一句 toast 是同一事实的第二份，且比回执更早、更不可靠 | **删**（成功不提示；只有拒绝与未回执有话） |
| R-8 | 回执行上的「时间」 | 无法给出：packet 里没有 Decision 时刻。用 run 的 `endedAt` 顶替就是把另一件事的时间写成这件事的时间 | **不画**（登记为契约缺口，§3.5） |
| R-9 | 只读 fallback 的整份 key/value 原始清单 | 「依据在哪」。第一段消融 S-8 已裁定保留 | **保留**，但收进 `Recorded fields` 折叠：结构化读法在上，字节在下，一份事实不出现两次的同一层级 |
| S-10 | `Read-only. An action needs the extension's own renderer.` 在 producer 卸载分支 | 无，且**是错的**：那里没有动作的原因是 producer 卸载了（上一行的状态词已经写出），不是缺 renderer | **条件删**（只留在 renderer 缺席分支，那里它正是原因） |
| S-11 | 只读读法里重复的 `state <12 位>` | 无。宿主的身份行已经写了一次，紧邻两行写同样十二个字符 | **删**（`renderWorkPacket` 收 `stateVersionShown`，由调用方说明自己已经写过） |
| R-12 | 修订表单里由前端预填的「新候选 id」输入框 | 无，且是负担：id 只需唯一，人写不出比随机更好的值；`new_candidate_id` 复用且内容不同会被 Core 拒 | **删**（每次提交自动生成） |
| R-13 | 续行列表里的 Matter title | 契约没给（§3.6）。用会话名回填就是把另一个对象的名字写成它的名字 | **不画**（登记为契约缺口） |
| R-14 | `#binding-panel` 的 `max-height: 40vh` | **失去**第二段的存在本身：两段之后，40vh 之内只看得到 Create new 的表单，来「继续已有事项」的人看不到入口 | **改**为 60vh（两个受检宽度下两段同屏；面板仍可滚） |

## 5. `text-sweep.md` 增量

### 删

| # | 字符串 | 位置 | 去掉后失去的判断 | 结果 |
|---|---|---|---|---|
| D-14 | `Read-only. An action needs the extension's own renderer.`（producer 卸载分支） | 工作面只读 fallback | 无，且在该分支不成立（消融 S-10） | ✅ 条件删 |
| D-15 | 只读读法里第二次出现的 `state <12 位>` | 同上 | 无（消融 S-11） | ✅ 删 |
| D-16 | 决定成功后的 toast | 决定控件 | 无（消融 R-7） | ✅ 未实现 |

### 单词化

| # | 原可见文字 | 新可见文字 | accessible name | 位置 | 结果 |
|---|---|---|---|---|---|
| W-17 | `accept` / `reject` / `request evidence`（evidence-memo renderer 的既有写法，本轮不沿用） | `Accept this version` / `Reject` / `Request evidence` | 行文字即名 | NDA 候选控件 | ✅ 对象化，不缩为无范围的 `Approve` |
| W-18 | Matter id 全文 | 短形 `candidate-1f16060cd6…` / `matter-237c73ab…` | 行文字即名；续行行另给 `Continue <完整 id>` | 候选头、回执行、续行行 | ✅ 行内取短、可核对处取全（锚点与来源行保持完整 id） |

### 保留并注明承重（本轮新增字符串）

| 字符串 | 承担 |
|---|---|
| `Accept this version` / `Reject` / `Request evidence` | **范围 + 后果**：接受的是这一版；三者不是同一个 Approve |
| `Why this decision`（placeholder）· `The reason is recorded with the decision.` | **后果**：这段文字会进正式记录 |
| `A reason is required for this decision.` | **条件** |
| `Sending…` | **进行时**（review-projection §6 已裁定的提交态措辞） |
| `The decision was not acknowledged. Sending it again uses the same request.` | **条件 + 后果**：既不是成功也不是拒绝；重试不会产生第二条 Decision（FN-19） |
| `Propose a revision` · `Save this revision` | **对象名 + 动作**：提的是一份新候选 |
| `A revision is saved as a new candidate at the current version. The earlier candidate and any decision on it stay as they are.` | **后果**：修订不撤销旧决定或已接受成果 |
| `The extension re-checks every finding against the current sources and facts before saving.` | **条件**：合法性不由这里判定（FN-17） |
| `Read the recorded source` | **读取类别**：读的是该候选冻结的那一版，不是当前来源 |
| `Reading the recorded source…` / `The recorded source could not be read.` | **进行时** / **条件** |
| `Recorded facts` / `Recorded fields` | **读取类别**：packet 自己记的事实与字节 |
| `Accepted this version` / `Rejected` / `Evidence requested` | **状态 + 对象**：回执行说的是哪一版被怎样处置 |
| `version N` / `source revision N` / `base version N` / `state <12 位>` / `supersedes <id>` / `human revision` | **依据在哪**：读与提交所绑定的版本与血缘，全部取自 packet 原值 |
| `N unresolved rules` / packet 的 `reconciliation` 状态词 | **计数与状态事实**，前端不计算 |
| `domain schema N · not readable by this build` | **条件 + 后果**：这份 payload 的版本本机不认识，所以只显示信封 |
| `Create new` / `Continue existing` | **两种绑定行为的分野**（G3） |
| `No work in this project is bound to <extension> yet.` | **条件**（空态一句） |
| `Reading the work this project already owns…` | **进行时** |
| `Continue <matter id>`（accessible name） | **对象名**：续的是哪一件 |
| `Release` + `Release this session's binding; the recorded work stays in this project` | **范围 + 后果**：释放的是执行绑定，正式工作留在 project |
| `This session continues the existing work.` / `The binding is released; the recorded work stays in this project.` | **后果** |
| `No candidate has been proposed yet.` / `This finding records no source anchor.` | **条件**：空不是 0，也不是失败 |

**词表**：未引入新概念词。`Matter` 仍不可见（对外只出现它的 id）；`producer` 仍只在裁定与契约文本内，可见处沿用 `extension`。

## 6. 验证

### 6.1 命令与结果

| 命令 | 结果 |
|---|---|
| `npm --prefix app ci` | ok（lockfile 未改，0 vulnerabilities）· [install.log](evidence/wk10b-2/install.log) |
| `npm --prefix app test`（基线） | **174 / 174** · [tests-baseline.log](evidence/wk10b-2/tests-baseline.log) |
| `npm --prefix app test`（交付） | **178 / 178**（+4 为本轮新增的 `nda-renderer.test.mjs`，无既有断言改写）· [tests.log](evidence/wk10b-2/tests.log) |
| `node tools/lint-colors.mjs` | ok（14 files）· [lint.log](evidence/wk10b-2/lint.log) |
| `node tools/contrast-report.mjs` | 全部通过 · [contrast.md](evidence/wk10b-2/contrast.md) |
| `evidence/wk10b-2/checks.mjs` | **26 / 26** · [checks.json](evidence/wk10b-2/checks.json) |
| `evidence/wk10b-2/fallbacks.mjs` | **11 / 11** · [fallbacks.json](evidence/wk10b-2/fallbacks.json) |
| `evidence/wk10b-2/shoot.mjs` | 几何 / 动效 / 键盘量测 · [viewport-after.json](evidence/wk10b-2/viewport-after.json) |

种子全部由产品自己的 HTTP 路由产生（装扩展 → 建绑定 → 真实 Run 经 Pi 与 work adapter 提交候选），没有绕过 API 写库、也没有把 fixture packet 粘进界面。四个 NDA 会话：完整（enum 含 accept）、未决（enum 只有 reject / request_evidence，含一个 `unknown` 状态词）、冲突（含 `conflict` 状态词）、待续行；另一 project 一个会话。

### 6.2 26 条 `checks.mjs` 覆盖

逐规则视图 5 条（行数 = findings 数且 ruleId / 状态词逐个等于 packet；行解剖 16 glyph / 一个标题 / ≤1 元数据；展开态的 reason / 锚点 / 冻结引文逐字等于 packet；playbook 与 facts 每候选一次；收敛卡与展开面同一 `stateVersion`）· 决定 6 条（按钮 = 描述符 enum；每个控件都有非空可访问名；空 reason 不发请求且提示落在输入处；回执丢失后不晋升、不重放、草稿留着；重试用同一 `request_id` 且 Core 只记一条 Decision；未决 review 全面无 accept）· 状态词 2 条（`unknown` 与 `pass` 同色；`conflict` 是唯一着色词且词本身在）· 回执 2 条（一条只读行落在该 Run 之后，无按钮，写出版本与 state；回执为 null 时不画成功行）· 修订 3 条（已接受候选只声明修订；人工改动被扩展拒绝且什么都没存；保存成功后新候选带血缘、旧候选与其 Decision 与已接受成果都在）· 旧决定 1 条（修订之后重放原 identity 得同一条 Decision；对旧 base 的新决定被 409 拒）· 续行 5 条（面板两段；跨 project 为 0；续行后显示原候选与另一会话作出的决定；重复绑定被 `binding_exists` 拒；`Release` 后回到纯 Chat 而 project 仍持有该 Matter）· 页面异常 1 条（0）。

### 6.3 spec 反例

**FE-T06（FN-18 / 19）· 三类事实不混同、不自动重放**

| 步骤 | 结果 |
|---|---|
| 输入 reason，用 CDP 把浏览器切到 offline，点 `Accept this version` | 界面显示 `The decision was not acknowledged. Sending it again uses the same request.`；候选仍 `pending`；`decisions` 0；回执行 0；**草稿原样留在输入框**；无自动重放 |
| 恢复网络，再点一次同一个按钮 | 发出的 payload 的 `request_id` 与上一次**同一个**；Core 记录 **1 条** Decision，候选变 `accepted`，产生 Artifact |
| 换源之后点 `Reject`（旧 base / 旧 source） | 409；宿主重读 surface：`matter.source_version = 2`、候选 `source_version = 1`、packet 不再声明 `decide`、控件消失、`decisions` 仍为 0 |
| Run 进行中尝试决定 | packet `readOnly: true`、`humanActions: []`（界面无控件）；直接 POST 得 409 `active_run` |
| `allow` 之后工具失败 / `cancel requested ≠ stopped` | **本单未新增**：授权卡与 Run 取消是第一段与既有回归的范围，本轮既未改其代码也未重跑其断言。此半条记为 not_run，由持有该面的单承担 |

**FE-T08（FN-20 / 21 / 25）· 三种缺席分别注入**

| 注入 | 结果 |
|---|---|
| 把 `renderer.mjs` 从磁盘移开（producer 仍 loaded） | 声明路径 404；`slot().reason === "renderer-absent"`、`mount === false`、扩展状态仍 `loaded`；缺席句 `Inbound NDA Review · renderer not loaded` 与 `Read-only. An action needs the extension's own renderer.` 都在；同一读法给出 4 条规则行、**0 个动作控件**（`Read the recorded source` 是读，不是动作） |
| `POST /extensions/inbound-nda/lifecycle {unload}` | `slot().reason === "producer-unloaded"`、状态行写 `unloaded`、`readOnly: true`、`humanActions: []`、4 条规则行、0 个动作控件；**没有借用缺 renderer 的理由句**；`compatibility` 按服务端原值拼成 `read only` |
| 在传输层把 `/surface` 的 `domain.schemaVersion` 改成 2 | 0 条规则行；写出 `domain schema 2 · not readable by this build`；候选 id 与 `source revision` 仍在；0 个动作控件；**没有按字段名重建任何 finding** |
| 重新 `load` | renderer 恢复挂载，按钮数正好等于该 packet 的 enum 长度 |

三者互不冒充：renderer 缺席不报成 producer 缺席，producer 缺席不报成 renderer 缺席，不可解码不报成缺席。

**FE-T11（FN-12 / 18 / 25）· 换源与旧记录**

| 步骤 | 结果 |
|---|---|
| 对已有候选的 Matter 执行 `replace_sources`（revision 2，删掉 `4. Term.` 条款） | 旧候选的四条状态词逐个不变（含那条 `unknown`）；当前 `sources[0].text` 已无该条款 |
| 读旧候选的 `term-duration` 锚点 | 锚点仍是 `<source-id>:1 [672, 765]`；引文仍是被冻结的那一段 |
| 点 `Read the recorded source` | 返回的字节**包含**该条款，而当前来源不含它——历史来源来自该候选自己的冻结 revision，没有被当前 `sources` 回填 |
| 修订之后重放原决定的 `request_id` | 得到**同一条** Decision（不新增、不撤销）；对旧 base 的新决定 409 `CANDIDATE_CLOSED` |
| producer 完全卸载后再读历史来源 | 仍可读（765 字节）——历史读取不需要 producer |

### 6.4 几何、动效、键盘

- 1440 / 390 × 浅深两宗：工作面与绑定面里**没有**低于 32（桌面）/ 44（窄屏）的控件，横向溢出 0，无名控件 0。
- 200 %（720 × 450 CSS 视口）：横向溢出 0。
- `prefers-reduced-motion: reduce`：仍在运行的动画 0。
- 键盘：用**真实 Tab 按键**（`Input.dispatchKeyEvent`）遍历工作面，屏上 9 个可聚焦控件全部可达、全部有可访问名（reason 输入框的名来自它的 `<label>`）、全部有可见焦点；关在折叠 disclosure 里的 13 个控件不可达，**这是对的**。

### 6.5 截图

`engineering/mvp/execution/work-surface-kit/evidence/wk10b-2/`，同一台服务器、同一份数据、同一具浏览器。只读历史一组有 `before` / `after`（`before` 以移开 renderer 文件 + `git stash push -- app/web` 回到基线 `62556b7` 后拍摄）；逐规则视图、决定、修订、回执与续行在基线不存在，故只有 `after`。索引见该目录 [README](evidence/wk10b-2/README.md)。

## 7. 越界与请求

| 项 | 说明 |
|---|---|
| 越界改动 | **无**。写权清单内的文件之外一律未动；`tools/**` 本轮未改（第一段的那行改名已在 main 内）。若需回滚，本轮全部改动集中在 §2 的表内 |
| 新增 allowlist | **无请求**。renderer 走 Astra 已准入的精确路径；未新增任何 `app/web/*.mjs` 文件——共享读法放进了已在 STATIC 表内的 `surface-modules.mjs`，正是为了不产生新的服务端登记项 |
| 给 Astra 的契约请求（不阻塞本段） | ① Decision 记录没有时刻，回执行因此不画时间（§3.5、消融 R-8）；② `GET /projects/:id/work` 不返回 Matter title，续行列表只能显示 id（§3.6、消融 R-13）。两者都只是「画不出来」，不影响已交付的任何判定 |
| 待 Fable 裁定 | ① renderer import 宿主 UI kit（§3.1）：接受耦合，还是宁可容忍第二套解剖；② 绑定面两段的顺序：裁定写的是 Create new → Continue existing，实测下来「来续行的人先看到新建表单」，若要调换只需改 `renderBindingPanel` 里两个 `append` 的次序与一条断言；③ `conflict` 是唯一着色状态词（消融 R-5） |
| `window.__V5_UI__` | 未新增导出。非作者独验可沿用既有的 `state` / `request` / `renderAll` / `slot()` |

## 8. 与第一段的关系

行解剖、槽位契约、`resolveSurfaceSlot`、四种缺席原因与三态缺席句**全部沿用，未 fork**。本轮只在两处动了第一段的产物：消融 S-10（把一句只在一种分支成立的原因句限定到那一分支）与 S-11（去掉相邻两行重复的 `state`）。permission / question / outcome 信封未扩 accepted，未做批量决定，未新增 glyph（语义登记见 [glyph-semantics §3 / §4](contracts/glyph-semantics.md)）。

## 9. 未检项（作者验证不是验收）

| 未检 | 为什么 |
|---|---|
| 真实 provider | 全程 `local-fake`；G1 未动。合成 loopback 只验证描述符传递，不是真实模型证据 |
| 真实触控 | 只做了 390 + `mobile` 视口模拟与命中区实测；模拟不是触控 |
| 真实读屏（VoiceOver / NVDA） | 逐规则行的 `aria-hidden` glyph、`<summary>` 由两个 span 构成的可访问名、`<label>` 包裹的 reason 输入框、状态词的读法，全部只做了 DOM 与真实 Tab 层的断言 |
| FE-T06 的另外半条（`allow` 后工具失败、`cancel requested ≠ stopped`） | 属授权卡与 Run 取消，本轮未改其代码、未重跑其断言 |
| 长中文标签下的行解剖 | 本轮 fixture 全为英文与 id |
| 专业 Review 可用性 | 规则是合成实验谓词，不是法律标准；本轮不主张任何专业判断 |
| 真实并发（两个浏览器同时决定） | 只做了同一页面内经产品 client 制造的过时读取；多客户端竞态未测 |
| Astra 独验 | 未做。本页全部读数出自作者自己的脚本 |
| 视觉四轴 | 留用户 |

## 10. 提交

| SHA | 题 |
|---|---|
| `e118992486cd0a0c0e417a37ec29163a5974e0b2` | `web: one reading of a Work packet, and the NDA renderer that acts on it` |
| 本页所在提交 | `docs: record the second segment` |

分支 `claude/wk10b-second`，未 push。基线 `62556b7`。服务器已停机，数据目录留在 `/private/tmp/se-agent-wk10b2-data`。
