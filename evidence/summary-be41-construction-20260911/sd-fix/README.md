# SD-FIX · 修补组合回执

主责 Astra，Luna 有界 explore 与非作者确定性复验。实际 main 输入 `dedf005494e3f17a18ee261a81e367026d0a0f70`，CI-B/F × CS-01 输入 `68b3341a457aeba1fcaf0bcf6a30c913bfc29e7a`，组合 `f6c726f`，修复固定 **`445fb48aa42d47c6ff0f819790630ac9ba723f33`**。本分支是交付候选，不是来源 Astra 的主线接收；没有 push/deploy。

## 修补及用户追加

- D1：点击按钮作为显式 opener，在禁用前确定，经原 railHost → openRun/openFile → activateSurface 传递。原 host 以 sessionEpoch 约束回焦，跳过禁用/隐藏控件；重绘找稳定版本键，文件重排仍指向原记录，移除后回到同类 disclosure。关闭文档与 Escape 共用原 host 的回焦逻辑。
- D2：SHA 行从 auto/1fr 改为有界1fr/2fr；完整路径及64位hash保留。修前真实浏览器长路径值列0px，修后288px卡内值列约158.7px；390视口约205.3px，无页面横溢。
- WORK-3：旧80–96px初始textarea断言替换为两行可见、实际line-height/content-height与控件边界；保留单增长机制、Home96/160、Work180及28dvh。大字两行内容高53px、行高26.4033px，54.2px不是新常量。
- 用户01:50截图：flow-row文本按baseline而glyph按center产生错位；全行改为center，工具/文件行现有图标与文案共享垂直中心。长文件名仍允许换行。
- 用户02:03截图：阅读动作改为 `Run details` + 16px chevron-right；panel-right仍表示顶栏工作面开合。IC-8/WK-163已选D保留Lucide，不按旧EX-IC1作者未选族状态重开家族迁移。

## 来源 → 裁定 → 验证

| 问题 | 固定本地 precedent/来源 | 核验及处置 | 本地验证 |
|---|---|---|---|
| opener/阅读返回 | `f6c726f:app/web/app.mjs` 原host、model-picker/attention-agent-view/spark-view；Disclosure/Overlay | 适配已有捕获→转移→返回，不新造pane/状态owner | 两个禁用失焦反例修前失败、修后通过；真实文件关闭/Run Escape |
| 长路径与SHA | `f6c726f:app/web/summary-disclosure.css`、styles既有minmax零最小值 | 限定轨道比例，完整来源不删短 | ASCII原路径及中文/组合字符/emoji路径，三宽度明暗/大字 |
| Work composer | `68b3341`、2026-09-11 merge-node WORK-3 | 采纳两行内容驱动，不采旧固定高度 | Home/Chat草稿往返、大字、长输入与短视口 |
| 同行对齐 | `f6c726f:app/web/styles.css` flow-row | 修正同一行混用baseline/center | DOM几何中心、原图对照与最终浏览器图 |
| 阅读按钮 | IC-1/IC-8、WK-163、`f5890fa` EX-IC1来源 | 适配既有chevron阅读动作；拒绝借此换族 | 键盘/焦点/200%实际缩放 |
| 分工 | RD-005 / selection-index @dedf005 | fresh有界Luna consult；主责持实施权 | 固定445fb48非作者报告分列 |

## 验证及归因

- `before-opener-tests.txt`：在f6c726f原模块执行新反例，两项失败。`targeted-final.txt`：固定修复Summary 17/17；全链早期定向29/29在`targeted.txt`（稳定键新反例前）。
- `full-tests.txt`：稳定键新反例前作者714/714。最终固定445fb48全量715/715通过，另存`full-tests-445fb48.txt`，不得将旧714转记最终。
- `smoke.txt`：local-fake生命周期/历史bytes通过。`static.json`：五个声明资源200，未知路径404。适用四项lint及contrast通过，最终记录另存。
- `luna-fixed-review.md`：非作者固定445fb48定向37/37与额外Unicode/引号路径重排、删除回退反例通过；无独立视觉接受。
- 浏览器：CUA控制的Chromium152，精确生产UI字节、独立临时数据与loopback；`serve.mjs`生成完整Unicode路径，先创建合成父目录再让真实ws_write记录。最初夹具缺父目录产生工具失败，已修正夹具，不将那次失败记录当文件覆盖。目录不会读个人数据。
- `browser-checks.json`保存开发过程与最终DOM测量；`final-unicode-*`为最终展开态，早期不带final的图与`final-composer-short-viewport-large`含探索/关闭态，仅作过程，不作为D2展开通过。最终文件/Run回焦与截图人工检查另列。
- `native-chrome-200-*`：原生Chrome152临时Incognito窗口，Ctrl/Command缩放工具明确显示Zoom:200%；键盘Tab到Run details、Enter进入、Escape返回原按钮。完整路径/hash在内部滚动中可读，输入与发送可达。关闭临时窗口；720px viewport图单列为窄布局，不冒充真实200%。

## 保留限制

Chromium147.0.7727.15仅找到headless binary，当前CUA无可控147界面；没有实际147浏览器复跑。确定性禁用失焦反例覆盖其已知事件次序，但152通过不抵销147旧反例。Q1 summary read-state仍缺独立error/retry接线；Q3跨客户端同步、原生宿主/IME/软键盘/VoiceOver未验证；删除404不是通用撤权接受。SD-ENTRY不随本片自动关闭，BE41-A/B另节点，G1–G5仍开放。

## main8393d7b 收尾单消费补验

接收文档main `8393d7b37db5f36ac7b8ef8dc35fe552993dbde5` 合入为 `dbf8d6c`。定向消费 `d2fdeed6c2b7d436a00c5bee571ef4eb58152599` 的 WORK-3/WORK-4 测试语义与两处合同文字，没有整头merge，没有引入第二增长机制。styles变更仅纠正旧88px注释；产品执行字节仍为445fb48（CSS仅注释差异）。历史home-modules文件顶部已明示旧Simple默认/几何被当前Home合同覆盖，保留历史表格，不把旧条目解释为当前规则。

- `work3-growth-matrix.json`：CUA实际键盘/输入操作，Medium空态54.1875→长文180内部滚动→清空54.1875；Large60.796875→180→60.796875。两行、字号扩展和Files/Model/Send边界通过。CUA空字符串fill未清除文本，改用Meta+A/Backspace后确认valueLength=0；没有把工具未执行当产品清空失败。
- `work3-error-matrix.json` 与对应图：独立18979合成HTTP代理仅对PUT draft返回503，生产UI真实进入Draft not saved，Medium/Large错误行可见、不截断且在form上方。此fixture不注入DOM文案。既有nextAction=retry-edit没有直接按钮，继续编辑触发保存；本片只确认错误布局，不宣称新增重试能力。
- `home-layout-premises.json`：相同1440×900、Medium、空草稿、两个合成会话、一条保留Run，明确从Settings选择Modules/Simple。候选Modules centre .4937、上方373.31、输入48；main8393d7b Modules .4971、373.31、54.1875，均不满足旧HOME-1/2/5。两者Simple centre .5600、上方38.02、输入96，三项均满足。旧断言没有删除；此为同前提归因，不复述历史13/16或12/16。main的styles HTTP hash与其工作树文件一致（871689646bd4bbe00118d544970b1e9190804ac319e9c0f4e983d0ba53e46607）。
- 本轮矩阵由作者操作，不转称Luna真机独验。Luna只读复核指出donor必要语义、历史Home前提与retry-edit限制；最终固定树非作者复核另列。
- forced-colors未进行真实媒体仿真/OS验证，明确NOT RUN；普通主题对比检查不是forced-colors。147/原生Courtwork宿主/IME/软键盘/VoiceOver的限制保持。原始测试日志尾空格保留；不将原始日志的diff空白告警说成源码检查通过。

EX-IC2 B/C随SD-FIX固定接受后按main收尾单接续；TPS BE-42仅登记、未实现。SD-ENTRY及BE41-A/B独立交付，不挟带关闭。
