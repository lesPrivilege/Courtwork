# UX 合流复核地图 · Luna 只读探索

基线为 main / f937c98a86b794b79e4b363c19ca56c4cebe39f9。本轮只读检查当前源码、前端契约与已存截图；没有运行浏览器或 Provider，也没有改产品文件。截图来自各自注明的历史源码，只能作为局部线索，不能作为最终合流接受。

## 结论与残余

抽样到的历史界面在对象语义、SVG/原生控件和信息层级上与现有 grammar 一致；没有找到可确认的当前产品 UI 缺陷。这不是视觉接受或 Release 放行。最终目验仍由 Astra 在合流后的同一 SHA 完成。

| 等级 / 状态 | 残余 | 证据与完成条件 |
|---|---|---|
| P1 · 已证实的发布媒资缺口（不属于应用缺陷） | site/src/capture-plan.mjs:2 与 site/media/main/manifest.json:2-3 都把 publication batch 固定在 07688226330121e5877a6ff1e09e6ebf82995ae3；当前基线是 f937c98…，其后 41 个 app/web 文件有变化。批次自称 ready，但不是当前合流的截图。校验器 capture-plan.mjs:28-35 只要求图片 manifest 和旧 pin 一致、13 个槽各有同状态明暗 1440×900 图；它不核对最终候选 HEAD。 | 若以当前产品更新公开页面，必须在最终接受的 SHA 重拍全部 13 个槽的明暗配对、同状态截图，更新 manifest/batch pin；旧图保留其历史来源，不重标为新版本实录。 |
| P1 · 缺最终合流目验证据（证据缺口） | 现有完整窗口证据分属不同源码：projectless Chat b81403c（evidence/projectless-chat-20260913/README.md:14,25），Spark 窗口/窄屏在 83df385 与 1d691c5（evidence/spark-agent-20260913/final-browser/README.md:8-12），Work Review 最近的时间/图标补充只有 1195px（engineering/design/context-tps-motion-2026-09-13/production/closure.md:31-32）。Files 的 390/1280/1440 截图来自响应式 iframe，不是原生完整应用窗（engineering/research/data-surfaces-2026-09-13/ui-delivery.md:17,34）。这些均不能代表最终组合。 | 另一 writer 的模板编辑改动合入后，Astra 按下表用同一最终 SHA 走关键完整旅程并查看实际窗口；为截图记录 HEAD、fixture、真实窗口尺寸/主题、状态和交互。候选/作者截图不能代替该记录。 |
| P2 · 声明范围缺口（不作已通过） | 最新 Chat 消息时间/16px 操作的浏览器补拍不是 390/1280，也没有重跑原生 200% / 屏幕阅读器；Work Review 已存的 390/焦点证据属于较早源码。Projectless Chat 用 720 CSS px 模拟宽度，不是原生 200% zoom（evidence/projectless-chat-20260913/README.md:14）。Files 与 Settings 记录也都明确留有原生 zoom / 屏幕阅读器等未测项。 | 做完下表 390px 与键盘路径。若发布材料要声称高缩放或完整辅助技术支持，另测原生 200% 和目标辅助技术并留证；否则明确不作该声明，不将 720px 重排写成 zoom 通过。 |

## Astra 最终浏览器旅程矩阵

所有旅程使用独立临时数据、固定合成身份与本地 fake adapter；不连接付费 Provider，不用个人工作区。若重跑现有脚本，先检查并隔离其默认输出目录：部分脚本会写回邻近 evidence/；验收截图和日志放到新的临时目录，避免覆盖作者回执。

| 旅程 / 最邻近先例与 grammar | 可复用 fixture | 尺寸、主题与关键操作 | 必须保持的语义与状态 |
|---|---|---|---|
| **Home → unassigned Chat → Run → Work Review**。先例：app/web/home-view.mjs、projectless Chat、Core-owned Work Review object card；shell.navigation、home.composition、composer、request.activity、output.review。 | evidence/release-core-summary-20260913/browser-fixture.mjs 可重建 pending / same-Matter / 普通会话；evidence/projectless-chat-20260913/start-browser-host.mjs 与 browser-check.mjs 单独覆盖 unassigned 创建、Recent 与附件。两组是互补的独立合成宿主，不是现成的合并 fixture；同一最终旅程需在临时数据中组合，或分别记录相邻旅程，不能冒称已测一体路径。 | 主截图 1440 light、1280 dark、390 dark。390 用键盘新建无标题 Chat、发合成 Run、打开 Review；流式更新时检查焦点，Escape/关闭后回到原按钮。覆盖空 Chat、Run running/completed、Review pending/旧版或读取失败。 | Projects 在 Recent 上；无需先选 Project 或命名；附件与 workspace 分开。Run 完成不成为 Work 接受。Work Review 是同 Matter 的 Core 摘要，位于活动行之后；失败有具名重试；Review 流更新不丢焦点也不抢用户后来移走的焦点。依据：evidence/projectless-chat-20260913/README.md:7,21、evidence/work-review-object-card-20260913/README.md:9-11,20-22、engineering/design/context-tps-motion-2026-09-13/production/closure.md:8,14-19。 |
| **Chat → Files → 精确来源 / 引用 / 比较 → 返回**。先例：materials-view.mjs、inspector.mjs、markdown-source.mjs、diff-view.mjs；material.chrome、markdown.reading、popover.inspector。 | engineering/research/data-surfaces-2026-09-13/preview.mjs：独立临时 DB、生产 HTTP 路径、local fake loopback，含 r1/r2、Unicode/长文件名、损坏旧版本及另一 Chat 同名来源。现有 app/tests/fixtures/chat-continuity/responsive.html?port=… 只复用交互检查，不把 iframe 截图当作完整应用图。 | 最终合流原生应用窗：1440 light、1280 dark、390 dark。用 Enter 打开 r1、Quote、比较 r1→r2、Back/关闭；检查返回的焦点和列表阅读位置。 | 来源 ID、revision、hash 精确；Quote 原文/行号准确；损坏版本明确失败并可重试，不回退同名当前文件；Back 恢复原 revision 按钮与滚动/焦点；保留历史 ≠ 当前 workspace，比较 ≠ Core 接受。依据：engineering/research/data-surfaces-2026-09-13/ui-delivery.md:15-21,32-36。 |
| **Home/侧栏 → Attention ↔ Spark**。先例：app/web/attention-view.mjs、spark-view.mjs；attention.triage、projection.status、button.action。 | Attention：engineering/design/attention-ui-handoff-2026-09-13/astra-acceptance/runtime-fixture.mjs。Spark：evidence/spark-agent-20260913/synthetic-host.mjs 与 browser-check.mjs。均为本地合成状态。 | 1280 light、390 dark；Spark 再看 1100 compact。键盘进入/返回、Enter/Escape、丢回执后重试及窄屏 Back to items；检查来源展开/收起。 | Attention 冲突保留草稿并显示新 revision；丢回执不报成功；seen 不等于 status；返回原项目/行/焦点。Spark 精确显示 task/attempt/source/version；待处理、失败/重试、完成/候选来源状态不混同，不暗示正式接受或自动恢复。依据：engineering/design/attention-ui-handoff-2026-09-13/astra-acceptance/README.md:18-21,35-38,55-64、evidence/spark-agent-20260913/final-browser/README.md:5-14。 |
| **Settings 侧栏 → Plugins/资源 → Developer → 返回完整应用**。先例：app/web/settings-view.mjs、createRuntimeView；settings.navigation、button.action。 | engineering/design/settings-resource-management-2026-09-13/browser-check.mjs 有独立合成数据/端口与 1440/1280/390 明暗尺寸；重跑应在隔离副本/临时证据目录，原脚本写入同目录 evidence/。 | 合流后做 1440 light 与 390 dark；搜索 Enter、详情 Escape、跨 Tools/Permissions/Developer 导航，Back to app 后检查焦点。 | 只复核路由、导航与返回焦点，以及 Installed/Running/Exposed/Permitted 的区分；**不复审另一在途任务的 Instruction/Reference/Prompt 编辑表单**。无 owner capability 不画可执行动作。依据：engineering/design/settings-resource-management-2026-09-13/README.md:7-22。 |

## 已修复 / 不重开

- Work Review 读 Core 摘要，不从 Run 状态推导正式接受；卡片在 activity 后，同 Matter 空 Chat 仍可发现。流更新不替换焦点目标，Review 关闭/完成后按条件恢复焦点。见 evidence/work-review-object-card-20260913/README.md:9-22 和 engineering/design/context-tps-motion-2026-09-13/production/closure.md:8,13-19,31。
- Attention UI02 已去掉伪动作牌/衬线，修正错事项迟到回执、冲突文案、键盘动效和窄屏返回；真实助手与键盘证据已经记录。见 engineering/design/attention-ui-handoff-2026-09-13/astra-acceptance/README.md:9-11,32-39,53-64。
- Files 已有精确 revision / quote / compare 与焦点返回；Spark 已补丢回执恢复、长引用换行、来源版本事实；可选 workspace Chat 已区分 Projects、Recent、Attention 并保留无标题/unassigned 路径。上表只复核最终合流，不把这些历史修复误报为缺陷。

## 发布支持范围建议

UX证据可为受限的 local experimental/alpha 文案提供输入：无 Project 的普通 Chat、精确来源版本的读取/引用/比较、typed Attention 项及 Spark 的来源绑定状态、Core 提供的 Review 入口；须先完成上述同 SHA 的合流浏览器检查，真实语义仍由各 owner 决定。不要据此声称 Run 已接受工作、Spark 已完成正式审阅、TPS/context quota 是真实测量、200% 原生缩放/屏幕阅读器已验证、可连接任意外部文件夹、或 Board/Time 已实现。Release 计划规定同候选 SHA 的 G1–G5 及公开演示/声明对照仍是产品放行条件；synthetic UI 证据不替代它们（engineering/release/review-intake-2026-09-13/inputs/REVIEW-AND-RELEASE-PLAN.md:191-204,239-253）。

前端基线按 engineering/design/agent-interface-2026-09-10/frontend-contract.md:7-11,17-20,50-67、对应 precedent-map.md 项、ui-composition-standard.md、surface-hierarchy.md 及 icon-controls.md:11-28,45-49,71-73 检查：对象/动作文本承担意义；使用原生 HTML 控件和固定 Lucide SVG；优先沿用已有字阶、留白、容器与焦点行为。历史截图仅说明各自来源下的状态，不是新 baseline。
