# SPEC: packages/output（W4）

状态：包级核心与自动化成立；完成过一次 macOS WPS 基础视觉抽核；`OUTPUT-CORRECTNESS-1` 与 Word/WPS 双端 P0 roundtrip 尚未完成

## 现行能力边界

- `applyRevisionInstructionSet` 与 `compileDraftToDocx` 是 Courtwork 内唯一权威修订/文书著录器；desktop、插件和垂类包不得复制 OOXML 生成逻辑。
- golden、ZIP/OOXML 安全预检、基础修订/批注与字体自动化已经成立；这些是 `package-ready`，不等于任意真实 docx 均可无损往返。
- 2026-07-09 W4 验收曾在 macOS 的 WPS 打开样例并做基础视觉抽核；Microsoft Word、Windows WPS、打开—轻改—保存—回读、现有复杂批注/关系保全尚未形成 P0 证据，不得概括成“Word/WPS 兼容已验证”。
- 本包尚缺与 `@courtwork/core/work-protocol`、`@courtwork/core/turn-protocol` 同等级的真实 Vite browser consumer 证明；进入 desktop production 编排前必须补齐。

## 职责

产出管线：`RevisionInstructionSet` 修订指令集 → 带修订痕迹（tracked changes）与批注（附法条/判例依据）的 .docx。这是面向用户的交付格式——用户认 Office，不认 md。

## 要点

- 输入契约：原 docx + `@courtwork/schemas` 的 `RevisionInstructionSet`（定位：文本锚/表格单元格/表格行，判别联合 + 操作：替换/插入/删除/纯批注，判别联合 + 可选批注含依据引用）
- 技术路线（spike 后拍板）：**纯 TypeScript 直接著录**（fflate 处理 zip、@xmldom/xmldom 操作 XML、自实现最小化 diff），不引入 JVM/Python 子进程——桌面 Tauri 壳分发是决定性论据。docx4j 子进程路线留档为 Plan B（`spike/docx4j/`），触发条件见 `spike-report.md`。
- **WPS 兼容是自研加固点**：修订与批注在 WPS 打开必须正常渲染（国内律所/政企大量用 WPS），这是验收标准不是加分项
- 定位鲁棒性：文档被用户轻改后指令集仍能定位（模糊锚点匹配，`src/locate.ts`）
- **字体规则**：正文仿宋_GB2312、标题黑体、西文/数字 Times New Roman，不用微软雅黑；管线写出的每个 run 显式声明完整 `w:rFonts`（`src/fonts.ts` + `apply-instructions.ts` 的 `buildRPr`）

## OUTPUT-CORRECTNESS-1（P0）

在真实材料链把本包接入 production 之前，必须同时满足：

1. `replace` 保留原段落的 `w:pPr`，不得把编号、样式、分页或段落级属性随文字替换丢掉；
2. 只给本次新写入或实际触碰的 run 设置必要字体，不得全局改写未触碰 run 的字体与 run properties；
3. 保留输入文档既有 comments、comment ids、range 与关系，不得以新建 Courtwork 批注覆盖或重置；
4. comments、relationships 与 content-types 的新增/复用必须幂等；重复应用、已有 part 和非连续 id 均不得制造重复关系或悬挂引用；
5. `paragraphHint` 要么被定位器真实消费并有歧义反例，要么通过版本化契约删除；不得保留一个看似可消歧、实际无人读取的字段；
6. 每条未应用指令都返回逐条、typed outcome；任何 non-applied outcome 必须在落盘前向用户显式展示，并由策略阻断整份落盘或取得针对性确认，不能“报错并跳过后照常交付”；
7. 真实 Vite consumer、Word/WPS P0 roundtrip 与保存前后 OOXML part/rel diff 按 `verification-checklist.md` 留证。

## 验收

Golden files 与安全反例；真实 Vite browser consumer；Word + WPS 双端渲染与 roundtrip 清单；歧义或定位失败逐条显式、落盘前阻断/确认，不错插也不静默漏改。

## TODO（跨层放入区）

- [现行边界] **本层著录器是 Courtwork 内唯一权威修订著录器**：Stage 1 若出现 Word/WPS task pane，只能作为触发与展示入口，修订运算仍回本层。外部宿主 API 能力必须在开工时按精确版本重新验证；不以旧调研的“全生态唯一可靠”概括替代当前证据，也不为想象中的来源提前扩枚举。

- [已解决 2026-07-13，LAUNCH-FIX] **新建文书路径与本层同栈**：`compileDraftToDocx` 已落为纯 TypeScript OOXML 直接著录，复用 `src/fonts.ts`（标题黑体、正文仿宋_GB2312、西文 Times New Roman）与同一 zip 引擎；不引入 pandoc/JVM，也未另造第二套桌面侧文档生成器。测试先锁空文书拒绝、XML 转义、字体与共享安全预检，再接 desktop 写入桥。

- [已解决 2026-07-09] ~~字体规则~~——正文仿宋_GB2312、标题黑体（v1 简化：不解析 `w:pStyle` 样式表，用"是否加粗"粗略判断标题/正文角色，见验收记录设计取舍）、西文/数字 Times New Roman，不用微软雅黑；管线写出的每个 run 强制声明完整 `w:rFonts`，实现于 `src/fonts.ts` + `apply-instructions.ts`，单测覆盖正文/标题两种角色。Word/WPS 核验清单（`verification-checklist.md`）已增加字体核对项。

- [已解决 2026-07-09] ~~本层的"修改指令集 JSON 契约"必须以新 artifact 类型的形式在 packages/schemas 内提案落地~~——`RevisionInstructionSet` 已由本层提案、架构拍板通过，落地于 `packages/schemas/src/revision-instruction-set.ts`。依据引用字段复用 schemas 的 `SourceAnchor`（可选，非必填），并新增 `statuteRef` 结构化法条引用字段（`sourceAnchors`/`statuteRef` 至少一项非空，纯散文依据引用不合法——依据 `docs/decisions/ADR-003-evidence-and-anchors.md` 信源分级决定）。跨层同步（S4 场景声明、registry 内置场景测试）已在架构显式授权下由本层一并完成，详见 `packages/registry/SPEC.md` 验收记录。

## 验收记录

- 2026-07-09：W4 核心完成。

  **Spike（`spike-report.md`）**：Python-Redlines（DocxodusEngine）vs docx4j 对比后，发现真正的分叉是"diff 式"与"直接著录式"架构，而非库选型本身——diff 式（Python-Redlines 唯一模式）与批注需求存在结构性冲突（9 条批注里 diff 后文本定位仅命中 4 条，因为细粒度 diff 会把原文拆散，纯插入型编辑甚至不产生可搜索的删除文本）；直接著录式（docx4j 的自然用法）没有这个问题，10/10 批注一次性正确挂载。在直接著录式架构下，进一步验证同一套技术（zip/XML 直接操作 + 最小化 diff）可以不经 docx4j/JVM，直接在 TypeScript 里实现（`spike/ts/`），产出与 docx4j 黄金参照结构完全一致（w:ins/w:del/commentReference 计数逐一对照）。

  **架构拍板**：纯 TypeScript 直接著录，理由是桌面 Tauri 壳分发——JVM 子进程意味着安装包塞入 Java 运行时，对 ToB 桌面产品是长期运维税；手写 OOXML 恰好是 WPS 兼容这一自研加固点要求的形态（精确控制吐出的每一段 XML，不隔着库的序列化决策）。docx4j 路线记录为可逆的 Plan B（接口收窄为 `applyRevisionInstructionSet(docx, instructions) → docx` 单一签名，真撞到手写 OOXML 解不了的深坑时只是换实现）。

  **交付**：`@courtwork/output` 包，`pnpm test` 全绿（196 例，其中本层 16 例：`locate` 模糊定位 6 + `apply-instructions` 字体角色 3 + `apply-revision-instruction-set` 集成/golden 7），`pnpm lint` 无 error，`pnpm -r run build` 通过。

  - 设计取舍：
    - **公共前缀/后缀裁剪**代替完整 LCS diff 算法：spike 已证明对"单条指令 = 一处已知局部改动"这个场景，15 行量级的简化算法就能达到专业 diff 引擎的最小化效果（"百分之十→百分之十五"正确识别为纯插入，不产生多余删除）。完整 diff 算法是为"两份不知道差异的文档"设计的，本层不需要。
    - **批注在应用指令的同一遍构造**，不做 diff-后文本搜索定位——这是 spike 里发现的诊断结论直接转化为实现：批注锚点用的是"这条指令改的就是这个刚构造出来的节点"这一已知信息，不依赖事后在输出文档里重新找文字。
    - **标题/正文角色判断用"是否加粗"简化**，不解析 `w:pStyle` 样式表：真实文档的标题机制（显式样式 vs 直接加粗）比这更复杂，但当前管线只编辑既有段落内容、不凭空生成新标题，加粗启发式覆盖了"编辑一段已加粗文字仍保持加粗+对应字体"这个实际需要的场景；更鲁棒的样式表解析留作已知缺口，真遇到样式化标题渲染错误再补。
    - **模糊定位分三级**（精确唯一命中 / 模糊命中 / 拒绝）而非"精确或模糊二选一"：精确命中多处判 `ambiguous`（交给指令的 `paragraphHint` 消歧，而非本层猜）；模糊匹配要求最佳候选显著超过阈值、且明显优于次佳候选，否则宁可整条指令报 `locator_not_found` 跳过，也不做置信度不足的自动选择——直接对应 SPEC"定位失败时报错并跳过，不错插"这条硬性要求。
    - 时间戳/修订 id 计数器通过 `now: Date` 参数注入而非硬编码：生产用途默认真实当前时间，golden file 测试显式传入固定时间以保证快照可复现——早期实现漏了这一点（硬编码 1970 纪元），复核时自己发现并改正。
    - Golden files 用 `vitest` 的 `toMatchFileSnapshot`（`src/__snapshots__/golden-*.xml`）比较 `document.xml`/`comments.xml` 的文本内容，不比较 docx 原始字节——zip 层的时间戳/压缩细节不是本层承诺的契约，XML 内容才是。
  - 已知缺口（非阻塞，记录以免遗忘）：
    - 标题识别的"加粗启发式"不解析真实样式表（见上）。
    - 表格定位（`tableCell`/`tableRow`）目前只做精确匹配，模糊定位只覆盖 `text` 策略——真实场景里表格结构变动（增删行/列）比正文文字轻改更少见且更难安全模糊匹配，暂不做。
    - 复杂样式场景（多级编号、批注跨页、表格嵌套表格）未覆盖，样例合同刻意保持简单。
  - 跨层动作：`RevisionInstructionSet` 落地与 registry S4 同步已记录在 `packages/schemas/SPEC.md`、`packages/registry/SPEC.md` 的验收记录里；顺手修了根 `eslint.config.js`（`**/spike/**` 加入忽略，spike 代码不受产线 lint 约束）。
  - **待你执行**：`verification-checklist.md` 的 Word/WPS 双端人工核验——这是我程序化验证不到的部分（渲染是否好看、批注气泡位置、接受修订后表格行是否真的消失等）。

- 2026-07-13（**LAUNCH-FIX 异会话验收通过**）：`loadDocx` 不再裸 `unzipSync`，改消费 `@courtwork/reading-view/docx-security` 唯一预检；宏工程、宏使能 content type、任一 XML/RELS 的 DOCTYPE/ENTITY、zip bomb 均在 output 解析前拒绝。新增 `compileDraftToDocx` 供起草画布生成真实新文书；`buffer` 作为显式浏览器兼容依赖，使同一 output 代码可在 Tauri WebView 与 Node CLI 运行。验收会话从 clean detached worktree 在拓扑 build 后向真实 `applyRevisionInstructionSet` 路径喂入宏/XXE/zip bomb，三反例逐名通过；全仓包测试 104 files / 850 tests。详见 `packages/output/ACCEPTANCE.md`。
