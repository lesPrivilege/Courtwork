# R2-SD01 · 常驻摘要 → 局部披露 → 同对象 tab

2026-09-10，Astra 架构裁决与工作单。类别：产品前端模块 + 显式隔离 fixture 接线；生产 host 接线待单 writer 窗口，不复制 host。

## 目标与固定输入

用户工作时直接看见一张有来源摘要，先在卡内展开信息，再按需在原右侧 tab 阅读同一对象；收起和返回不改变对象或正式接受状态。首片只晋升一个已有 reader 的对象，不同时实现 Task/Explore/Context/Diff 平台。

实际开工 cwd 为独立 Courtwork worktree，HEAD `67ed0fd748017f3d71d426de51d9f1f63860ea54`，无改动、detached；本任务建立 `codex/summary-disclosure-r2`。RuntimeStore11/Core4/app5。准备包按 `13874d32310e4d09817d32c46a9e948925ff4ba0:engineering/execution/2026-09-10-release-roundmap/{README.md,audit.md,work-order-format.md,fresh-astra-handoff.md}` 读取，未 merge 资料或产品链。

Provider 观察固定 PV-BE03 `76cd11f` / PV-FE02 `6ddb94a`（产品 `f4e601b`），不是组合接受。即使树干净，预约未释放。无 merge/push/deploy、个人数据或付费 provider。

## 来源消费与最近先例

- 本地 canonical：`app/web/surface-modules.mjs` 的 facts→adapter→card/pane、`railHost`（`app/web/app.mjs`）的 open/openFile/openRun；host 保留 tab、renderer、Escape、returnFocus 与读代际。新模块只投影与发 read/navigation intent。
- Disclosure：`engineering/design/home-composition-2026-09-10/disclosure-overlay.md` 原生 details/summary，普通文档流、不自动展开、Enter/Space 保持触发器焦点、无新 overlay/motion。
- Tab：同目录 `tab-view-grammar.md`。lens 不伪装可关闭文档；文件身份保留 session/path/read kind/SHA/run，具体 renderer 生命周期继续既有 host。
- UI Continuity：`engineering/design/agent-interface-2026-09-10/frontend-contract.md` 与对应 precedent-map 的 work.composition / tab.chrome / projection.status / button.action。使用原 `ui-controls`、rail-card/rail-row/rail-note 与已有 tokens；PropertyRow 不重复实施。
- 用户方向：固定包 `engineering/design/sidebar-intake-2026-09-10/README.md` 的常驻→向下→同对象 tab。采用明确中间层及常驻入口；窄屏改为文档流内可达卡片，不能挤掉正文。Task/Explore 留既有 owner 接口，不造计数/执行态。
- 外部机制只复用上述本地已消费的 disclosure/tab 规则；未重查外站、没有新增依赖/许可。原文外部主张、截图、动效数值仍未核验。EX-SS1 未接受稿与 CC-I `41966b6` 不消费。

## Owner 与写权

Astra：对象/authority/版本与 host 边界、fixture bridge、最终集成裁决。Luna：有界只读 Explore，边界冻结后实施新模块及定向测试；作者测试不得称独立接受。Astra 对 Luna 模块做 CUA；若 Astra 改产品代码，另请非作者 Luna 复核。

允许：新 `app/web/summary-disclosure*.mjs`、新 `app/web/summary-disclosure.css`、`app/tests/summary-disclosure.test.mjs`、本工单目录、本 evidence 目录。禁止：`app.mjs`、`ui-controls.mjs`、`surface-modules.mjs`、`styles.css`、`model-picker.mjs`、`settings-view.mjs`、Models 测试、server 生产路由、site/、Core/Runtime/schema、共享工作树。

隔离 fixture 允许按精确源路径加载真实 app/index 与原 host，仅在测试 HTTP 响应追加 read/navigation bridge exports。无生产代码替换、无新 tab host、无自动安装入口。fixture 页面明确标示模拟状态和 provider 方式；不将此 bridge 称生产接线。

## 共同状态与交互验收

|状态|显示/动作|恢复与归属|
|---|---|---|
|正常|常驻身份摘要，默认折叠；局部事实；明确 Open in right panel|同一 scope/identity/version 发 host intent|
|loading|读取中，不补计数/成功；避免重复请求|adapter/host 管读代际|
|empty|有对象但无已记录内容；无对象则不造卡|不推导 completed|
|unknown|明确状态未知和缺少事实|不当作 0/失败/完成|
|error|可读失败原因，只有 adapter 提供 retry 才有重试|同对象重试；过期回包不覆盖|
|撤权/切目标/版本变更|不继续暴露旧对象详情，不执行旧 Open|scope/identity/revision 校验；清理本地披露记忆|
|renderer缺席/不兼容|准确不可用，不能有假可用 Open|重新得到匹配 reader/facts 后同清单回测|
|关闭/重开/重启|host 管 tab/焦点；披露仅局部 UI 状态|不持久新域事实、不新增权限|

验证：纯投影负例、重复/迟到/切目标、默认不展开、Enter/Space、Tab、Escape、返回焦点、同对象右 tab；包含邻接完整 Work/Home/Settings、1440/1280/390、light/dark、长文与200%可读性。按风险跑 interaction/color/material lint、contrast 与精确测试。CUA 实操必须实际操作而非 headless 冒充；OS/browser/viewport/scale/SHA/data kind/步骤预期实际/原图hash/单一caption/作者与复核身份写 evidence。

## 交付分栏与回溯

Design定型、FE视觉、FE交互(fixture/live)、生产接线、非作者复核分列。生产 adapter 接入需等待 host writer 窗口，并沿此处 schema/映射和同一回归清单重跑；fixture 不关闭 G1–G5，不宣称真实推理或 native 宿主通过。下一记录补具体对象、projection v1 字段和最终路径。

## Astra 冻结的首对象与接缝 v1

选 **Run**。现有 Run lens 有已实现 reader；记录文件只是该 Run 的已报告 content-version，不冒称 Source/Task/Explore。未新增 closable Run tab：该类型是 lens，关闭工作面沿 host；文档关闭另测邻接原 host。

`projectRunSummary(facts, options)` 的输入是 `surfaceFacts` 的 sessionId/runId/runs/events；options.phase/error/readerAvailable/generation 是 adapter 的读取状态，不属于后端事实。输出 `schemaVersion:1`、`identity:{sessionId,runId}` 和已校验的记录文件；`generation` 仅 UI 请求代际，不冒作 domain revision。不同 scope 或过期 intent 不执行。Run 可变状态按 owner 读取结果，文件版本按 path+sha256+runId；没有 Run-level revision 的字段就明确无，不能补一个看似正式版本。

`createRunSummaryCard({getSnapshot,onOpen,onRetry})` 返回 element/update/dispose，只拥有 disclosure 与 busy/focus 的局部状态；Open 前重新读取快照，identity+generation 匹配且 reader 可用才交 `railHost.openRun(runId)`。既有 `GET /api/v5/sessions/:id` 和 `GET /api/v5/runs/:id` 为真实接线目标，RuntimeStore 持 Run，原 `readRunDetails` 的 scope/代际处理继续有效。没有新 endpoint/schema/registry。

Fixture adapter：`evidence/summary-disclosure-20260910/serve.mjs` 从 `app/tests/helpers.mjs` 启动独立临时 Runtime11/Core4/app5，通过 HTTP/Pi loopback 合成一个 Run 与 `out/source-note.txt`。使用仓库已有测试用 fake credential 常量，不读个人凭据。`fixture.mjs` 只消费匹配 session 的 host facts；故障/未知/空/长文分支是显式模拟投影，不能称生产服务返回这些状态。Retry 演示有 generation 窗口并实际重读同一 Run；真实 host 会在自己的 reader 中继续验证。

常驻位置这次只在 fixture CSS 中接入：桌面聊天右侧卡片，<1024 在聊天文档流前端；expanded tab 仍使用原 host 的中宽 view switch 和窄屏 sheet。不是擅改生产断点，也不称完成生产常驻编排。待共同 host 路径单 writer 释放后，按本片实测再接 production placement/事实刷新/必要 static route，不能直接把测试 exports 搬进产品。

## 首轮 CUA / 非作者发现后的有界修补

Astra CUA 发现288px卡内Session/Run身份被原rail-row的flex:none挤出；Luna新增局部换行约束。投影补Unicode/长路径、缺文件列表不等于0、schema/scope/代际检查，按钮披露重绘焦点与异步失败可读回退由作者修补。

非作者 Luna 在 fixture retry 中复现切会话后永久 Loading。Astra桥接补 activeSession/view/sessionEpoch 变化失效、HTTP返回后的同scope检查、中断后的可重试error，并将成功的确切Run读包作为该次fixture读快照，不以旧包伪装刷新成功。

原host的Escape先回旧rail；此fixture位置已有摘要卡，因而桥接仅在本卡发出Open后观察host的expanded→collapsed，调用原 `closeSurface()` 收尾，原host恢复returnFocus。没有第二套Escape/tab handler或renderer生命周期。此协调是fixture的显式差异，生产host窗口仍待接续，不能把测试export/observer直接认作生产发布方案。

## 用户截图修订 · 19:48–19:49

六份用户本地截图作为构图参考：当前卡的调试表格感、Codex紧凑分组、Claude收敛/文件列表展开、Claude Preview和Codex顶部tab。修订不采纳截图中的外部产品功能或权限。常驻去UUID、第一层为Files清单、第二层Run information保留精确身份；点击文件沿原host的content-version reader。摘要右列抬到Chat标题带，既有Preview chrome在fixture内对齐该带。原两个header动作移动到Workspace tools折叠组，保留原DOM与监听器；离开目标会话时归还原位置。Fixture说明和故障控件排在内容下方。

<1024摘要位于chat header之后、conversation body之前；先前描述“聊天文档流前端”的旧实现实际被host排列至消息后，此次改为外层挂载予以纠正。原host的1024–1679视图切换与<1024 sheet仍保持，未以CSS伪造并排reader语义。此前2111375截图归于被用户要求修订的候选，不作为本轮视觉完成。

19:58追加参考：右侧纵向长卡、明确留白、不得覆盖溢出。Fixture桌面卡区上/右边距采用现有space tokens，高度有界于720px与可用视口，内容在卡内滚动；聊天正文明确预留320px，composer沿同一conversation列而不重复缩进。窄屏回归自然流与自然高度，不硬塞桌面长卡。

## 20:01 用户升级完成条件：生产层级稳定

用户明确“保证各级界面的稳定，不是临时局部实现”，覆盖前述fixture-only交付边界。Astra在本隔离分支实施生产host接线，既有其他writer修改不覆盖、不合流其在途版本：追加允许 `app/web/app.mjs`、`app/web/index.html`、`app/server/index.mjs`静态白名单、新`app/web/surface-layout.css`及相应测试。`styles.css`、provider/model/settings实现仍不改。只读核对PV/SD集成任务在途范围为provider配置拆分/迁移/样本，与本单host接线不同；server白名单纯追加在合流前仍须组合核对。

生产方案沿同一surface-panel与surface-rail：Run摘要替换原Run card，持久组件实例保留同对象局部披露；其它模块沿原目录，统一一个长卡容器。桌面进入Session默认显示目录；用户关闭后不因轮询自动重开。窄屏沿原按需sheet，不强制弹出modal。收起从原host恢复opener；不再依赖fixture MutationObserver。保留1680三栏/1024视图切换的既有最小阅读宽度。标题分隔线上为动作或tab，目录在线下共用col-gap；视图切换时旧标题带退出可视层，tab占同一带。新CSS为产品入口加载、静态白名单明确列出。

`serve.mjs`默认只提供真实产品与合成数据，测试exports/fixture UI注入改为显式`SD_FIXTURE_ADAPTER=1`历史诊断模式。新生产CUA不得以注入模式截图冒充。

最终留白修订：用户指出长卡过满，目录改为自然内容高度、最小360px（受可用高约束）、最大不超过标题带以下可用高，底部固定16px内距。当前样本收敛约360px、完整Run information约620px；不得以固定填满视口表现“长卡”。tab-list内部横向滚动，toolbar动作不参与挤压，390px Close右缘374px。`serve.mjs`最终移除所有exports/DOM/CSS注入路径，只代理产品原字节；前述`SD_FIXTURE_ADAPTER`模式已退役，`fixture.mjs/css`仅为早期候选留存，旧运行方式按`2111375`固定版本召回。

20:31 用户补充frontier/Claude对照，指出双关闭×混淆：文档tab的×仅关闭文档；工作面整体隐藏改为panel-right图标与Hide work surface；阅读时聊天标题中的重复surface入口退出。宽屏三栏Preview增加显式Expand preview/Restore preview，使用host内临时maximized布局位，保留同一个tab/fileRef/renderer，不新增正式状态或浏览器全屏权限。<1680沿既有主区阅读、窄屏sheet保持。紧凑strip的Run入口改用同一summary snapshot与点击前身份/代际检查，卡片↔strip切换时焦点按同模块映射。

### 材质与焦点回查（用户 20:45 纠正）

最近先例：`app/web/styles.css` 的 `.home-attention` / `.home-attention-item`、全局 `:focus-visible`（WK-128）与 `.rail-card`；依据 `engineering/design/home-composition-2026-09-10/material-grammar.md`。Home 与持续文件/阅读面为 solid/raised；glass 仍仅两个已登记消费者，不存在本卡片漏装的 blur 依赖。新 summary 原本无 radius，导致共享 focus 呈方形。局部补 `--radius-small`、8px 控件内距及既有 hover/pressed；外层复用 `--rim`，保留浮层边界和阴影。focus 色、2px 线/offset、原生 Enter/Space 与 owner facts 保持。Astra 作者执行真实浏览器 Home 对照和焦点计算样式；本增量不声称独立视觉接受，不新增玻璃消费者。
