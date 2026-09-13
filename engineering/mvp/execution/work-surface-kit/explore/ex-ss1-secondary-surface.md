# EX-SS1 · Secondary Surface / Disclosure Grammar，用户供料对照既有裁定，只读探索

状态：只读 explore，Sonnet，2026-09-10，分支 `claude/ex-ss1-secondary-surface`，基线 `codex/web-gpt-design-continuity` `3a61336`。无派单编号：本卷回应用户在对话里直接粘贴的一份提案（自称核对 48 个结果 / 4 条 workstream，引用 Primer / GitLab Pajamas / Apple HIG / Radix / VS Code 官方规范），用户已明确本卷只做只读探索，不写裁定、不改产品代码、不新增文件（除本卷）、不动 Attention。

只读声明：本卷只读 `engineering/design/home-composition-2026-09-10/disclosure-overlay.md`、`engineering/design/frontend-layering-spec.md`、`engineering/design/scout/README.md`、`engineering/ecosystem/legacy-recall-index.md`、`engineering/mvp/execution/work-surface-kit/explore/ex-cc3-popover-inspector.md`、`app/web/surface-modules.mjs`、`app/web/markdown-reader.mjs`、`app/web/markdown-reader.css`、`app/web/styles.css`（grep 定位行）。未修改任何产品代码、未 `git commit`、未启动任何服务、未新增依赖。用户提案原文未经二次核验，一律标"提案称"；Primer/GitLab/Apple/Radix/VS Code 的具体规则文本本卷未重新抓取，只标"提案称已读官方规范"。

## 1. 现状盘点：这块地盘今天已经有裁定，不是空地

用户的提案把"局部 UI 修正"提升为"Secondary Surface / Disclosure Grammar"独立治理项，但仓库里已经有两层裁定覆盖了绝大部分同一地盘，且都是今天（2026-09-10）写的：

### 1.1 `disclosure-overlay.md` 已经是一份 family contract 文档，不是空白

`engineering/design/home-composition-2026-09-10/disclosure-overlay.md`（Astra，基线 `c788764`，"consumes the complete supplied 28-result / 3-workstream research"）已经裁定了 Select / Combobox / Action menu / Context menu / Popover-mini inspector-filter panel / Disclosure / Accordion / Tooltip / Dialog / Split-combo button 十个 family 的 trigger-content-selection / focus-dismissal / geometry-glyph-mobile 三栏契约（disclosure-overlay.md:9-20），外加 Surface and state rules（geometry 数值、motion 时长范围）、Actual consumers and retained specimens（D0–D4 五个真实组件的现状与待办）、Source disposition（disclosure-overlay.md:48-52，已核实 Radix Select / Radix Dropdown Menu / Base UI Popover / WAI disclosure / menu-button，未核实 Apple 链接经第三方镜像、Bloom 与 unattributed Atlassian submenu quote 为"experimental leads"）。

用户提案的 family 表（"选择一个值 / 从很多值中搜索并选择 / 执行命令 / 查看带 controls 的少量 contextual 信息 / 展开当前内容的更多细节 / 在同层级 view 间切换 / 浏览树状对象"）与 disclosure-overlay.md 的十个 family 逐条对应（Select/Combobox/Action menu/Popover/Disclosure 五个名字完全相同；提案额外提的 Tabs/Tree 在 disclosure-overlay.md 里没有对应行，是真正的缺口，见 §4）。**disclosure-overlay.md 已经先于用户这份提案，把"不能由局部组件自己决定弹多大、从哪出来"的诉求写成了逐 family 的具体契约**，且已经点名"trigger-to-panel morph"实验范围、"one scroll owner"式的表述目前没有出现。

### 1.2 `surface-modules.mjs` 是另一层已裁定的原语，和用户提案的 S-tier 概念部分重叠但不是同一件事

`app/web/surface-modules.mjs:1-21`（文件头注释，WK-41/45/47/56/59/66）定义了一套独立于 disclosure-overlay.md 的"row / card / pane 是同一原语的三种状态"契约，用于右列 module rail（Run / File / Workspace / Runtime 四个模块，`surface-modules.mjs:477-482`）：一个模块的 `adapter()` 产出 schema，`card()` 把 schema 画成折叠卡片（`surface-modules.mjs:159-187` runModule 的 card），点击卡片的 "Open" 动作（`openAction`，`surface-modules.mjs:30-41`）促升为 `pane()`（`surface-modules.mjs:188-200`），落进 `host.container(kind)`——按 `tabId`/`contentId` 字段（`surface-modules.mjs:141-142`）可知这是工作面的 tab strip，不是浮层。这条"card（常驻右列，非浮层）→ open → pane（整块 tab）"的促升路径，已经是用户提案"inline → anchored → supporting pane → workspace destination"这条 promotion rule 里后半段（supporting → destination）的一个现成实现，只是没有被叫做 S-tier。

`ex-cc3-popover-inspector.md:44-46`（同批 Sonnet explore，2026-09-09）已经把这条边界写清楚过一次："Artifact/File" 与 "Trace/Run details" 今天根本不是浮出层，是导航目标（`openFile(ref)` → `activateSurface("file")` → 渲染进 `#surface-panel`），这正是 WK-113 已裁定的"工作面不是弹出层"（引自 `docs/interface-components.md:5`，本卷未重读该行，标"转引未核实"）。**用户提案里"Artifact/file 现在走 workspace/tab 是对的"这句判断，和仓库既有的 WK-113 裁定同向**，不是新发现。

## 2. 真正新增的部分：S-tier 命名与显式 promotion 标准

对照 §1，用户这份提案相对于已裁定内容，净新增只有三样：

1. **S0–S4 五级 tier 命名本身**，把 disclosure-overlay.md 里已经隐含的"inline 不带浮层 / 锚定浮层 / 常驻辅助面 / 模态聚焦 / 独立目的地"五种形态显式分级并统一命名。disclosure-overlay.md 的 family 表本身没有一个跨 family 的分级词表，每行只谈自己的 focus/geometry。
2. **显式 promotion 标准**（"内容变复杂时升级 surface，而不是不断把原来的 dropdown/dialog 撑大"），disclosure-overlay.md 有一句方向一致但更窄的话（disclosure-overlay.md:34，"Trigger-to-panel morph is experimental only for a small local sort/filter/selector... Deep configuration belongs in a searchable picker or inspector"），但没有写成跨 family 的通用判据。
3. **Scroll ownership 作为一条独立、跨 surface 的不变量**，disclosure-overlay.md 全文未出现类似表述（本卷通读 disclosure-overlay.md:1-52 确认零命中）。

## 3. 命名冲突：S0–S4 在本仓已经是另一件事，"scroll ownership" 也已经在用但含义更窄

**S0–S4 冲突（需要 Fable 决定是否需要换名，本卷不建议具体替代词）**：`engineering/design/frontend-layering-spec.md:173` 已经用 "候选 FE-S0…S4" 指代该 spec 自身改写的五个章节段位（S0=本页，S1=§8 引用既有目录，S2=§7 分配到各单，S3=WK10b 第二段，S4=只在确需新 renderer 时开），与 surface tier 完全是两件不相关的事。同一个仓库里出现两套含义不同的 "S0–S4" 编号，会让未来任何一次引用产生歧义（尤其是短上下文 agent，`engineering/design/agent-interface-2026-09-10/README.md` 标题所指的那类读者，本卷未读该文件正文，只引其存在）。

**"scroll ownership" 术语已存在但指另一件事**：`archive/research-gui-design-direction-2026-07-28.md`（经 `f9ade85b72e5abcdc64c3a6c43ed3a13a2292476` 只读，`legacy-recall-index.md:27` L03 收录，索引本身声明"历史研究……不能据此直接实现或采纳"）第 11、115 行两次提到 "scroll ownership"，指的是流式会话"用户上滚后不被夺回"这一个具体机制（stream 输出时不劫持用户手动上滚的位置），和用户提案里"一个视觉轴上默认只有一个主要 scroll owner"这条关于**浮层/面板嵌套滚动**的不变量，是同名不同指的两件事。若采纳提案的 scroll-ownership 措辞，需要在文中明确这是第二种含义，不是重申第一种。

## 4. 候选映射表（对照，不裁定）

| 提案 S-tier | 提案例子 | 本仓对应 family（disclosure-overlay.md）/ 原语（surface-modules.mjs）| 差距 |
|---|---|---|---|
| S0 Inline | disclosure/accordion 类展开 | Disclosure、Accordion 两行（disclosure-overlay.md:16-17，"Parent plane, no overlay shadow/material"）已经是同一描述 | 无差距，只是缺一个 tier 名字 |
| S1 Anchored | select/listbox/menu/popover | Select、Combobox、Action menu、Context menu、Split/combo button 五行（disclosure-overlay.md:11-14,20） | 无差距 |
| S2 Supporting | trailing pane / inspector / side sheet | 两处部分对应：disclosure-overlay.md 的 Popover 行（"rich Popover may use header/body/footer"，disclosure-overlay.md:15,26）覆盖"轻"内容；`surface-modules.mjs` 的 card 状态（右列常驻 rail）覆盖"常驻但折叠"，但**没有任何现有原语覆盖"420–520px 常驻可见、非模态、可独立滚动的宽面板"这一档**——这是用户提案里对 Attention 的核心建议，也是本仓当前唯一的真实缺口（§6 说明为何本卷不就 Attention 展开） | 有缺口，但缺口目前只在 Attention 这一个消费者上成立，本卷奉命不展开 |
| S3 Focused | dialog/sheet | Dialog 行（disclosure-overlay.md:19） | 无差距 |
| S4 Destination | workspace tab/page | `surface-modules.mjs` 的 pane 状态 + `activateSurface("file")`/`#surface-panel`（ex-cc3-popover-inspector.md:46 转引） | 无差距，只是缺一个跨 family 的名字统一两条已存在的促升路径（card→pane，以及 file 引用→tab） |

## 5. Artifact/file（markdown-reader）：S4 的一个真实实现，但不在 disclosure-overlay.md 的 D0–D4 名单里

`app/web/markdown-reader.mjs:169-184` 渲染一个 `<nav class="markdown-reader__outline">`（sticky，`markdown-reader.css:18` `position: sticky; max-block-size: 70vh; overflow: auto`）与文档正文并列；`markdown-reader.mjs:98` 的 `target.scrollIntoView({block:'nearest'})` 是点击大纲条目后正文侧的滚动响应。这是两个各自独立的滚动区域（outline 用自己的 `overflow:auto`，正文用文档流），窄屏下 outline 改为非 sticky、纵向 auto-fit 网格（`markdown-reader.css:45-46`）。这与用户提案截图描述的"Artifact / file"第一张图外观吻合（outline + 正文 + 找/raw source 等工作语义，提案原文）。

`disclosure-overlay.md:36-45` 的 Actual consumers 表（D0 Project selector、D1 Activity range、D2 Recorded context、D3 Context/runtime、D4 More object actions）**没有把 markdown-reader 列进去**——不是因为它不成立，是因为 disclosure-overlay.md 那批研究材料本身没有覆盖到它。这是一个可以直接补一行（候选 D5）的现成缺口，不需要新造 family，只需要把已经在生产代码里跑的 outline+body 双滚动区结构，读成"S4 Destination 下允许多个独立 scroll owner，只要它们是并列区域而非嵌套"这条更精确的措辞（比笼统的"一个视觉轴一个 scroll owner"更贴近这里的真实实现：outline 和 body 是并列的两根轴，不是同一根轴上嵌套了两层）。

## 6. Attention：本卷未读、未提议

按用户指示，本卷不读、不评估、不对 Attention 的对话框/面板形态给出任何意见。仅记录事实性背景，供 Fable 后续参考：`engineering/design/attention-agent-2026-09-10/` 与至少三个未合并分支（`codex/attention-delivery-candidate-20260910`、`codex/attention-triage-scope-repair-20260910`、`claude/att-fe01-triage`，`git branch -a` 观察，未读其内容）显示 Attention 交付仍在进行中；`engineering/design/home-composition-2026-09-10/construction-handoff.md:41-43` 的续行区块记录 Attention Chat 已作为"唯一全局 Attention 的对话表现"合流到 `attention-agent-2026-09-10/README.md`。用户提案里"Attention 现在是被装进巨大 Dialog 的小型应用，应该降级为 S2 supporting pane"这一具体建议，是否成立取决于上述分支收敛后的实际实现，本卷没有读那三个分支的 diff，不做任何判断。

## 7. 待裁定清单（交 Fable）

1. **是否采纳 S0–S4 分级命名，以及是否需要换一个不与 `frontend-layering-spec.md:173` 的 FE-S0…S4 撞名的词**（例如提案本身的 tier 名字改叫 "surface tier 0–4" 或完全不用数字前缀，只用 Inline/Anchored/Supporting/Focused/Destination 五个词）——本卷只指出冲突，不建议替代词。
2. **是否把 §4 的映射表并入 disclosure-overlay.md**，作为该文件已有 family 表之上的一层薄索引（不新造 family、不改现有九个 family 的任何一行），还是认为 family 表本身已经足够、不需要再加一层命名。
3. **是否采纳"一个视觉轴一个 scroll owner"作为独立于 §3 提到的"流式自动滚动"之外的第二条不变量**，以及如果采纳，是写成通用规则还是像 §5 那样按"并列区域 vs 嵌套区域"精确措辞。
4. **是否把 markdown-reader 补成 disclosure-overlay.md 的 D5 specimen 行**（本卷判断：这是当前唯一"零成本、零新造"的具体可执行项，其余三条都涉及命名或跨 family 决策）。
5. Attention 相关的 S2 supporting pane 建议何时重新评估——本卷不判断时机，只记录 §6 的分支状态供参考。

## 8. 不做

本卷未创建任何新的 governance 文件（`surface-grammar.md`、`surface-tokens.css`、specimen page 均未创建，用户已明确不要新建并行文档）；未改动 `disclosure-overlay.md`、`surface-modules.mjs` 或任何产品代码；未触碰 Attention 的代码、样式、测试或其三个在途分支；未对 Primer/GitLab/Apple/Radix/VS Code 的具体规则重新抓取核验，仅转述用户提案"称"已读；未新增依赖；未 `git commit`。
