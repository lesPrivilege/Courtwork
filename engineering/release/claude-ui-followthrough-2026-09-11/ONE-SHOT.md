# Claude · 单红 diff、Settings、Chat 与 Pages 串行施工单

2026-09-11。用户已授权：参考 Motto 的 TUI diff，消费时同步 Settings diff 预览，而后串行加 Chat tab bar。本文是可直接转交的正式工单，未声称已发送或作者已运行。仅一个 Claude writer 在独立 scratchpad/worktree 连续施工，无需逐阶段再批准；共享文件阶段交接记录固定提交。

## 最新范围与执行顺序

用户追加要求已经由[Astra Chat页面裁定](../../design/chat-product-page-2026-09-11/DECISION.md)写定：Chat必须有与Spark/Attention同级的独立App页面与专门Pages产品展示，不以一个导航按钮或几句文案交差。该裁定优先于下文较早的最小入口措辞。先消费Luna参考索引，按同一Design系统增量补画App、Pages和三面并置，再在本单串行实施前端；后端仍待后续。

顺序：单红diff＋Settings基础 → Chat专门视觉设计与独立预留页 → Settings主展示/Pages单红语言及独立Chat产品页 → 同包验收返回。无需新开并行writer或另等逐阶段批准。

## 输入与先读

Courtwork 本轮输入基线 `26d949b7a24b06b3280b0a3d19f721a76b9b5aef`，开工重新读取实际 HEAD/status、AGENTS、[current](../../current.md)、[前端连续性规范](../../design/agent-interface-2026-09-10/frontend-contract.md)及相关 precedent 条目。只消费本单与[Motto 研究](../../research/motto-diff-2026-09-11/README.md)，不把品牌红作为 diff token。你不是唯一作者，不修改共享 checkout、不覆盖其他 writer、不使用个人凭据或付费 provider。

最近已实现先例：`app/web/settings-view.mjs` 的 `appearancePreview()`；`app/web/styles.css` 的 `.diff-line`；`app/web/index.html` 左侧 Home/Attention/Spark 和 `app/web/app.mjs` 的 `selectSession`/`goHome`/`attentionAgent.open`。变更涉及 Visual、Projection/Control、Placement；后端事实继续由原 service/domain 合同持有。

## 1 · 扁平 diff 展示与 Settings 同步预览

Motto 固定来源为 `lesPrivilege/motto` 本地提交 `a510036ec0ba2a55bbd41bfb8313debd14588fc2`，`packages/coding-agent/src/modes/interactive/components/diff.ts`。stock主题用红/绿/灰前景，但用户截图来自仓内 `packages/motto/extensions/motto-themes/`：added=accent暗红，removed/context=mid灰，三JSON固定于上述提交（详见研究报告）。目标以此custom pack及用户后续红色覆盖裁定为准。renderer保留行号；单删单增才做词级 inverse，多行回退。inverse 是终端反色机制，不照搬到浏览器；不把研究文档当已实施能力。

CW 当前 Settings 是四行静态 `.diff-line[data-diff=same/add/del]` 样例，尚无真实文件 diff UI。提取小型共享纯展示 renderer（例如 `app/web/diff-view.mjs`），Settings 真实调用它；不增加生产 diff pane 或新的请求链。以现有行模型/转义文本安全呈现上下文、增加、删除及可选词级片段，保留 +/−、行号或明确文字，不能只靠色彩区分。

用户随后提供[Motto截图](../../research/motto-diff-2026-09-11/user-mono-diff.png)，明确目标是“单色引入的 diff”：灰阶为底，context/removed保留中性灰，added引入同一枚强调色，词级变化用局部反差突出；±继续持有增删区别。此视觉裁定优先于Motto默认主题红绿映射。采用更扁平的单强调色层级，避免整行红绿底色；保持代码可读与最小必要变更强调。不要求这枚强调色等于品牌c95e55；文本与背景实测后定，浅深的可访问性适配由diff角色控制。不要把 success/danger 的全局用途改成 diff 色；确有需要新增 diff 专用角色时按 color governance 映射与记录，不在组件硬编码颜色。不把新增/删除映射成接受/拒绝，也不使换 skin 改变 Review。先给相同固定 fixture 的前后对照，再记录最终选择。

Settings 各合法 appearance/浅深主题直接消费同 renderer/token；保留保存、重置和 live preview 原行为。必须核验长行、无变化、全增/全删、多行替换、HTML字符安全、无末尾换行的展示标记与窄屏。已有后端 `file-diff` 返回 codepoint-prefix-suffix-v1 replacement，不能假装它已是统一 patch；未来 pane 的转换在另单完成，本次不把 Settings 假样例写成真实工件比较。

写入面：新 renderer、`settings-view.mjs` 的预览段、必要 `styles.css` 局部和定向测试。完成并记录阶段提交再进入 2。

## 2 · Chat独立产品页面 / CA-01扩展

消费 [Chat/Attention 时间快照与 CA-01](../../research/chat-attention-2026-09-11/README.md)；用户原话“Chat tap bar”按本轮上下文解释为 Chat/Attention/Spark 同层入口中的 Chat 位点，不解释成 Work Surface 文件 tabs 或新增会话 runtime。

先以当前导航做最小 delta：为已有普通聊天阅读/创作提供明确 Chat 入口，恢复已有/最近有效 session 或现有空聊天入口；不丢 draft、selection、scroll 和当前运行。Attention 与 Spark 继续调用真实既有入口。尚不存在的 personal context/独立纯 Chat provider 能力保持规划，不用改名伪造上线。保留 Home、新建聊天、历史项目列表和返回路径；不自动创建 project/session，也不把 Attention 对话迁移为普通 Chat。

布局复用现有导航 grammar。只有真正共享 panel 的互斥 tabs 才使用 tablist/tabpanel 与方向键/Home/End；若继续是导航按钮/弹窗，则保留对应按钮与 disclosure 语义，不为外观添加错误 tab roles。Chat overview 与 work surface 的两个 header 入口依旧独立；不得把 overview 塞进工作面 tab。若实际 HEAD 已有等价 Chat 位点，核对并记录覆盖，避免第二个重复入口。

写入面：`index.html`、`app.mjs`、必要局部 CSS/semantic-controls 和定向导航测试；不改 Core/Runtime schema、Attention owner、provider、权限、后台队列或 memory。

## 3 · Settings 主展示与 Pages 同语言接入

用户进一步裁定：取消绿色，只保留红色涂抹/色块覆盖，形成陌生化的修改语言；可作为 Settings 展示面的首要，并在 Pages 中呈现。本条优先于前文只缩小底色重量或 added 红前景的初步描述。

以灰阶代码/正文为底，红色局部覆盖作为主视觉手势；删除、新增、词级替换保留明确 ±/标记和文本，不把红色独占地解释为删除/错误/拒绝。红色覆盖需让原文可读或有可访问的等价文本，不能真的涂掉唯一差异内容。先对单行、多行、纯新增/纯删除提出可复核的静态布局，选定一致规则；颜色可按浅深阅读对比适配，不必强用品牌icon红。

Settings Appearance 预览以该 diff 为首要展示，重排现有样例层级即可，不新增设置值/开关/偏好 schema。延续第1阶段同 renderer，避免一份真实预览、一份独立装饰副本。

Pages增加一处局部展示该视觉语言，消费同语义fixture与最终视觉规则；沿现site视觉和媒体登记流程，保留已发布Home/Tour主体及原有叙事。可以为发布阅读节奏做原创静态编排，但不要把纯样例称真实已接通的工件diff能力；具体位置依据当前页面节奏做最小合适调整。此段是用户新增授权，不重开整页设计。写入面为site页面必要局部/样式/自有资产与证据；读取site相关合同与工具规则，再构建及宽窄实拍。发布执行与上线回执另行处理，不把本地接入称已部署。

顺序仍为共享diff＋Settings基础 → Chat入口 → Settings主展示收尾与Pages同语言展示；一个writer依次取得/释放共享文件，最终整包返回。

## 4 · 一次完整返回

运行相关 unit/行为、doc links、color/contrast、interaction 检查；视觉记录 1440/1280/390 浅深、Settings 相邻完整面与真实 Chat/Attention/Spark 导航、键盘/返回焦点、200%（准确说明真实或模拟）。对不适用项说明原因；作者不能直接替换既有截图 baseline 自称独立接受。

返回 `return-ui-followthrough-v1/`：RETURN、source-manifest、可应用补丁/固定提交、源码、固定 fixture、前后截图、验证原始日志、未测/能力缺口、目录及 ZIP 逐文件/hash 清单。Astra独立审阅后集成。没有新后端能力、部署或发送外部消息的授权。

## 其余 roadmap 的位置

Paper 预发布由 Astra 本轮收尾，不再把等待 icon 留给本单。Home/Tour P1/P2 已发布，其主体不重开；本单新增的单红diff局部展示按第3阶段消费。后续仍有 A 工程图 F1/F2 拥挤与关系排布、F3 成熟度标注、按必要性处理 F5 窄屏 inset；F4 复用。B 产品施工仍按 [DR-02–05 合同](../../design/se-control-one-shot-2026-09-11/return-intake.md)保留 glyph/header、Spark/Attention、其余 Chat/Composer/Settings 及 Explore/Rebuild specimen 门。本单只消费其中有明确授权的 diff/Settings/CA-01 子片，不把一次小单称整批产品门闭合。未完成的 A 图局部修订可作为本作者下一串行包，沿 [逐图合同](../architecture-reconciliation-2026-09-11.md)，不与本单共享 app 文件并行改写。

## 第二张截图 · 精确视觉层级

用户随后提供[主要实现参照](../../research/motto-diff-2026-09-11/user-mono-diff-detail.png)：旧行/上下文灰字，新行红字，真正新增词段才有紧贴文字的实心红块＋深色反字，不是整行红底或遮掉内容。第1/3阶段按此层级施工；红块大小由真实差异片段决定，不做随机涂鸦。截图下方失败提示不属于本次diff grammar，不因此改变全局danger/Review映射。截图中的命令和路径仅为视觉样例，不执行。

## 三入口产品理由补交

消费[产品理由登记](../../research/chat-attention-2026-09-11/product-rationale/README.md)，这是用户随后确认的新方向：Chat回答“我想和谁持续交谈”，Attention回答“什么值得我处理”，Spark回答“哪些工作可以持续推进”。本条细化第2阶段：Chat是独立产品方向的前端预留，不能将普通coding session改标签就宣称跨Provider会话/memory已实现。既有普通聊天保持可达；若复用既有聊天作临时承载，必须明示实际能力，不假造独立会话所有权。占位不要提供假可用的Provider/Memory/Handoff控件。

第3阶段Pages同时消费README新增方向：按现页面节奏局部说明三种用户目的，Chat用规划语境，Spark未来routine与当前来源/派生实现分开；Matter、Runtime、Expert责任保持。Home双原子无需硬改三张同权功能卡，不新增三套agent叙事；Features不列未实现能力为可用。不得直接使用来源助手的star、成熟度或条款摘要为发布证据。

本单Chat交付已按最新DECISION升级为完整产品页面与专门视觉设计，旧CA-01最小按钮/仅局部Pages文案不再构成充分交付；不扩大到Provider/Memory后端。

## 最新叙事基线 · Work优先

先消费[Astra Work优先裁定](../work-first-narrative-2026-09-11/DECISION.md)与最近三轮来源。Court是有机协作与正式编排下的工作场合，不是角色扮演或律师工作流。首页/README/Paper导读已由Astra改文案，Claude后续从这些源码增量接设计，不用旧返回包覆盖新叙事。现有法律示例只代表一个应用。Runtime互换与轻量Spark仍待验证，不以Explore或视觉样例宣布实现；Chat的产品目的及前端范围保持已裁定义。
