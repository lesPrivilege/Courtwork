# EX-IC2 · Product icon grammar 与 Chat space 全量控件

2026-09-10 · Astra · 核对 main `ef66177cb85ba8fb81ca8d201dcafdcda5804cf4`。
用户本轮要求：「包括 Chat space 的全量 Button 和 fover，有的缺少真实后端，但无妨，只需登记缺口即可。应当已落 pr 和 roadmap。」本记录将 `fover` 按上下文解释为 **hover**，连同 focus、tooltip、popover/menu 纳入，不能仅改 sidebar glyph。

状态：**范围已登记、PR 施工稿已落；未完成全量逐按钮盘点、specimen 或产品改造。** [PR 分片与验收](pr-plan.md)接既有 FE-04 / CC-I / Iconography 路线，不建立第二套事实 owner。当前生效裁决仍是 [IC-8 不换族](../icon-controls.md)；EX-IC2 是增量探索编号，不重开或改写已经交付的 EX-IC1。

## 输入及采纳边界

| 输入 | 处理 |
| --- | --- |
| [小众产品研究原文](inputs/indie-product-research.txt) | 95 个结果为转交者报告数，本轮不宣称重跑 Exa。Attention budget、surface 必须有用途、按上下文收起空壳、先主循环后配置作为候选评审问题；不直接隐藏现有功能或改变权限门。Essay/Astra 归因仍是未证实假说。 |
| [Icon grammar 提案原文](inputs/product-icon-grammar-proposal.txt) | 57 个结果为转交者报告数。semantic key / glyph 分离已有 [interaction vocabulary](../home-composition-2026-09-10/interaction-vocabulary.md)，复用该接口，不另造 Registry。Octicons 是新增对照候选，未选为主族；16/18/20/24 光学对照不等于冻结新的生产尺寸。 |
| [用户实机图](inputs/file-delivery-reference.png) | 本次图是文件交付卡与消息动作条：文件名/类型、默认打开动作、分段下拉及 Copy/朗读/赞踩/更多参考。它不是 Courtwork 现状或附件提案所说的双侧栏同屏图，不能据此确认 Courtwork glyph 偏小、偏轻或实际后端能力。图内 SE papers 路径与命令是截图内容，不是本次执行指令。 |

原文 SHA-256：研究 `4577a4900c2943f581efbc3255af18c4777a6a2ee67b1057e16999912c21a6ad`；图标提案 `5e6f460594c292afb40748586d7115e1815cb5a55d9a5a0baffa4e2181b9dc6a`；截图 `2ae27f4cdcffc4086bc797e97b8204db540117cf5f9ffec17fa547582e1fd15c`。

附件中的「下一轮」「推荐」「使用 image 模型」不自动构成产品变更授权。通用动作不自绘；native glyph 形态探索另待实际语义缺口与设计裁决，生成结果不能直接成为受信 SVG。品牌、产品图标、状态和权限保持不同责任；不默认新增 icon theme/extension 注册能力。

## 全量覆盖定义

不是只抽 24 个 icon，也不是只检查原生 `<button>`。最终清单必须覆盖静态 DOM、动态 `element`/`el`、`action`/`setAction`、链接式动作、summary、菜单项和可点击行；对同一动作按表面与状态登记消费者。

| 覆盖面 | 需逐项纳入的动作/状态族（有无实现均须有 disposition） |
| --- | --- |
| Chat 入口与 chrome | 新建/打开/切换/关闭/重命名；tab、sidebar、搜索、更多；主 Chat 与 Attention 助手共享/不同实现 |
| Composer | Send/Cancel、附件添加/移除、model/effort/connection、项目/权限选择、草稿恢复、编辑后采用/取消、运行中/失败/未知回执 |
| 用户消息 | 整条复制、编辑为草稿、长文展开/收起；文本/代码块的局部复制；附件项 |
| Assistant 消息 | 整条复制、局部复制、长文/推理/工具详情展开、流式进行中；参考中的朗读、赞/踩、更多、重试/继续/再生成/分享分别登记，不能把不同后果折叠成一个 retry |
| 文件与成果卡 | 文件名与类型、预览/打开、默认应用/应用选择、Show in Folder、下载/复制路径、版本/历史、分段按钮与下拉；本机宿主、浏览器、已删除/不可用文件分别列出 |
| 工具、运行与反馈 | trace/输出/详情、失败读取重试、取消、继续、权限 Allow/Deny、问题 Answer；授权范围与后果保持可见文字 |
| 浮层与次级面 | tooltip、hover/focus-within 操作条、menu/popover、dialog、overflow；打开/关闭/碰撞/滚动/窗口边缘/焦点返回/触屏替代入口 |

全量意味着每个实际消费者有行、每类提议动作有 disposition，而不是所有候选都必须出现在产品里。

## 缺口登记规则

每行至少：semantic key、surface/selector、固定 SHA + 源路径、对象/动作意图、handler、owner API/宿主或纯客户端能力、capability predicate、rest/hover/focus/pressed/selected/disabled/loading/success/error 状态、accessible name、tooltip/触屏路径、glyph/命中区、证据、缺口与原 owner 工单映射。

区分 `已接真实能力`、`纯客户端可完成`、`前端未接已有后端`、`缺后端/宿主合同`、`设计候选`、`不适用`、`待核验`。**缺后端不阻塞清点和静态 specimen，但必须有不可用原因；不能放可成功点击的假动作或把本地 reducer 叫后端交付。** 复制/展开等纯客户端动作不因没有服务端 API 被误报为缺后端。

本轮已核的锚点：`app/web/app.mjs` assistant-message-actions 使用实际 clipboard 并反馈失败；`openMessageEditor` / `useEditedMessage` 只回填草稿，不改历史、不自动发送；`app/web/ui-controls.mjs` 已有共享 action 与 tooltip adapter。其余全量消费者数量、朗读/评价/宿主应用路由等不能由截图推定，列下一片待核验，不在这里宣称已全部存在或全部缺失。

验收始终区分图形 live area 与 hit area；hover 不是唯一可达方式；危险操作保持文字后果。每格允许有理由的 N/A，不用一张静态截图声称键盘、触屏或无障碍全部通过。
