# Design / GUI / anti-slop 召回补记

日期：2026-07-30
基线：`main@52bfd1df4cb00d06a0e43706275abea559ef9374`

性质：归档调研与 Fable 召回材料，**不是现行设计契约**。颜色、字体、线级、动效、组件与
blueprint 的真值仍只认 `docs/design/`、对应 ADR/SPEC、真实源码和机器门。本件只回答三件事：
新材料有什么增量、哪些旧材料已经消费、明日 GUI 施工如何避免自说自话和重复造轮子。

## 一、输入与身份

### René Wang · Field Notes

- 原文：[Field Notes](https://rene.wang/essay/field-notes-01)，2026-07-30 打开核读。
- 页面是若干真实改版的 before/after 决策日志：chat context menu、detail transition、privacy
  warning、chat sharing、channel configuration 与 usage dashboard。
- 它没有提供 Courtwork 的 token、组件 API、Tauri/WKWebView 证据或法律工作流，因此只可借
  **审计方法与微观交互判准**，不可借皮肤或能力声称。

### `anti-ai-slop-kit`

仓外路径：`/Users/lesprivilege/Downloads/anti-ai-slop-kit/`。只读盘点为 21 份 Markdown、
2 份 JSON、8 张 1440×900 PNG。几个复核锚点：

- `README.md` SHA-256 `d72be787c3044b9fba9dd0b99354ec5565377aed97af306ef955399181f17fe4`
- `05-可执行工具/09-检测清单.md` SHA-256
  `81f7446ebe23f61c5bfde8298c9248e87a3b6cce6f071fbce21ce900780ea03d`
- `05-可执行工具/12-AGENTS规则片段.md` SHA-256
  `e15b73aafc5176340ff9e031e6e871dcce13a8991874860ff7e9e566f38d767b`
- `references/sources.md` SHA-256
  `c4f4cc688efacc1f965b2ee1c5bcc5831d47baf544e215b6129f7a52b81338ef`

该包没有 LICENSE、Git 历史、作者/版权声明、逐图采集时间、浏览器/selector 账或可复跑脚本。
因此本仓不复制其文字、模板、JSON、截图、prompt 或 token，也不把其中工具安装命令当作许可。

### 两份 `.dc.html`

用户再次提供的两份文件与仓内 VERSIONAL-LANG 来源件逐字节相同，无需重复归档：

| 来源件 | SHA-256 |
|---|---|
| `site/craft-evidence/VERSIONAL-LANG-1/sources/巧思生长谱-版本学与写本.dc.html` | `dcba23b955d623bb55c258ba0e351858c4e187f6262f926dd85dec76e96bd870` |
| `site/craft-evidence/VERSIONAL-LANG-1/sources/设计语言三档评估板.dc.html` | `0648262d0894dd7b79ad8603e4441d21f6115cac422052b397e20350b67008f0` |

它们已经进入 VERSIONAL-LANG 的 architecture signature、proposal、机器门与独立视觉验收链。
它们仍是 craft evidence，不是 `tokens.json`、组件、wireframe 或产品能力真源。

## 二、消费裁定

| 材料 | 裁定 | 可消费 | 不得消费 |
|---|---|---|---|
| Field Notes | 借行为与审计方法 | before/after 决策日志、信息结构、措辞一致性、渐进暴露、垂直密度、协调运动的一致参数 | LobeHub 皮层、Framer Motion spring、未验证组件 |
| anti-ai-slop-kit | 借问题集；拒绝整包导入 | 参考阅读法、反模式名称、edge-case grid、a11y/长文/多宽度人工审计 | AGENTS/prompt 整贴、token、法律布局、外部 detector 直接安装、截图再发布 |
| 三档评估板 | 已消费；只作历史定位 | Pages/Agent/schema 三档许可与“离裁决越近越克制” | 固定画布、评分、旧 token SHA、具体 padding/圆角 |
| 巧思生长谱 | 已消费；保留候选生成法 | 出处/职能/所替 slop/档位/机器门五问；版框、眉批、题签、刊记候选词汇 | 古籍皮肤、具象装饰、普通任务古语、未出票 revision apparatus |

### Field Notes 的真实增量

1. **先写决定，再谈 polish。** 每个 before/after 必须点名：原行为哪里产生歧义、哪条约束起
   决定作用、修改后由什么状态或截图证明。只交“更好看”不算设计回执。
2. **菜单是信息架构，不是图标列表。** 同义对象使用同一名词；checkbox、submenu、action 的
   affordance 不混写；平级关系与渐进暴露必须一致；长文件名优先中段截断，保留首尾辨识度。
3. **一致性优先于逐件手调。** 允许动效的同一协调对象必须共享同一个登记过的 timing/easing。
   但 Courtwork desktop 的数据区静止、0ms 状态切换和四属性白名单优先；文章里的 layout spring
   不得回迁产品壳。该原则只约束已经获准的 motion。
4. **高密度任务先省垂直空间。** 批量选择、工具过程和转发类界面不得重复 avatar/title/status
   或用厚 toolbar 吃掉阅读高度；删重复信息优先于缩字号。
5. **低频配置页服务“尽快完成”。** 若用户通常只来一次，分组、说明与下一步应围绕选择和完成，
   不为展示导航体系而增加第二套 sidebar。

原文所链的 wording 练习与本仓 `docs/design/voice.md` 高度同向：按钮写结果、错误给下一步、
确认回显对象、同一概念用同一词。其价值是给 Fable/验收者提供 before/after 练习，不另造第二份
voice 契约。

### anti-slop kit 的真实增量与证据缺口

可借：

- 每个参考按“字 / 色 / 空 / 动 / 文 / 源”记录，并各写三条借用、三条拒绝；
- 把 empty、running、Stop、failed、rejected、uncertain、resume、长中文、中英混排、空值、
  多条 tool、窄窗与宽窗放进同一 visual state grid；
- 人工检查 card 套 card、无语义彩色侧线、假 screenshot/terminal/指标、装饰网格/AI 球、
  布局属性动画、缺 focus/reduced-motion/键盘路径和只适配 happy path 的短数据。

不得照搬：

- 它的系统 sans/衬线禁令、`radius <= 8`、单一 1px 线、全站零阴影，与 Courtwork 现行三轨字体、
  L1 12px/欢迎面 16px、文武线/乌丝线和唯一浮面轻影冲突；
- 其法律工作台的 Tabbed Splitter、五工作面、动态“签名动作”、JSON layout engine 与 MCP 组件
  服务器均是未出票产品/架构扩张；
- 八站数据存在观察漂移：Rauno 截图与“H1 最大 32px/无彩色”描述不符；Linear 截图主体空白；
  Midday landing 被外推为产品表格；部分 theme 标注与截图相反；Vercel 样本疑似误选节点。

此外，`data/design_styles.json` 与
`archive/docs-legacy-2026-07-13/docs/33-设计素材-GeminiCLI/design_styles.json` 字节同源；
冷调八站报告也与旧归档高度重复。明日不重做泛化 anti-slop 调研，不另搭 scanner。

## 三、GUI / OSS 证据状态速查

下表只是 `main@52bfd1d` 的召回定位；开具体票仍须按 handoff 的 OSS 闸门复核当日 exact
version/commit、源码、公开 exports、许可与目标宿主：

| 候选 | 仓内状态 | 明日动作 |
|---|---|---|
| assistant-ui | 已裁为 Pi GUI 唯一直接依赖候选 | 只重核 exact headless primitives / `useExternalStoreRuntime`、许可、React/Tauri/WKWebView 与 bundle；不再泛搜 chat kit |
| Open WebUI 0.11.0 | rAF 合帧、terminal 立即 flush、用户上滚后不夺 scroll 已吸收 | 只按行为写我方反例；许可证阻止复制/依赖皮层 |
| OpenDesign | 证据打包法已部分消费 | 借 Identity→Don’ts 十一层、截图与 computed style；不把抽取物当 token |
| Logue | 归档线索，未形成选型证据 | 需要时窄查信息密度、档案/时间/写作/tool approval；先核当前源码、维护与 MIT 身份 |
| OpenWork/OpenCode | 旧结构结论仍在，queue/steer 部分已推翻 | 只在对应行为票做 delta refresh；没有当前 GUI 成熟度放行 |
| Moda | 短样本 | 只借反馈时机，不形成依赖 |
| Radix/cmdk/dockview/LobeUI | 历史源码机制，部分已消费 | 按具名票召回 dismiss/focus、ResizeObserver 高度、显隐生命周期；不复制默认皮层 |

## 四、Fable 明日的固定使用顺序

1. 先读现行 authority：`docs/design/tokens.json`、`principles.md`、`voice.md`、
   `typography-density.md`、`signature-line.md`；`courtwork-design.md` 仅作只读编译上下文。
2. 再看 VERSIONAL-LANG 的 source/architecture signature/proposal/真实 after 与独立验收，
   确认哪些记号已消费，不从 Downloads 再复制一份。
3. 再读 GUI/Design 归档与本件，按当前票只召回最多三个成熟候选；Sonnet 做一手源码、许可和
   视觉证据跑腿，Fable 亲自裁“直接依赖 / 借行为或源码范式 / 保留自研 / 删除当期动作”。
4. 实现后先跑仓内机器门，再做人类语义审计。外部 detector 若要采用，须另做 exact-pin
   窄复核；不得建立第二 design system 或把 scanner 全绿当视觉完成。

每个新增视觉机制必须回答：

`出处 | 真实 UI 职能 | 所替 slop | 唯一档位 | 消费的现行 token | 机器门 | 区分力反例`

任一栏答不出即不实现。效果图只探索组合；被采纳的结论必须回迁为现行 token、组件或
blueprint，并以真实 fixture、真实 journal 状态、键盘路径与多宽度截图验收。

### 人工 anti-slop / 基础 GUI 状态格

- [ ] 当前明确为 Agent 中间档，没有借 Pages 激进档许可。
- [ ] 无新 hex、半径、阴影、字体、easing 或第二份 token。
- [ ] 无 card 汤、非语义侧线、假 dashboard/指标/terminal、装饰网格或漂浮 AI 球。
- [ ] 覆盖空会话、运行/Stop、tool proposal、成功、拒绝、失败、uncertain、resume。
- [ ] 以 200 字中文标题、中英混排、空值和多条 tool 实测溢出与截断。
- [ ] focus 进入/归还、Escape、读屏名称、scroll ownership、reduced-motion 均实走。
- [ ] 数据区无缩放、弹簧、crossfade 或 layout animation。
- [ ] 浅宗做完整 craft 主评；深宗只做同构、对比度、溢出与状态烟测，不阻塞基础 GUI。
