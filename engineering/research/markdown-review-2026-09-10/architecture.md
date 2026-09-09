# Markdown Review Surface · Astra 架构裁定

2026-09-10；读取基线 `1f437a98e57cffb17cdde5c3fd864fe38ce8efd5`。本页冻结实施边界，不宣称下述新增读写接口或 GUI 已存在。用户指定本单前后端架构由 Astra 持有；Luna 探索/独验，Terra 承接成熟且验收明确的分片。既有 FE 队列不因此多出一个共享文件 writer。

## 1. 产品目标与第一条纵切

人在固定版本的 Markdown 上阅读、定位依据、提出评注，看到修订后的差异，并明确知道自己处理的是哪个版本。关闭 Chat、重启宿主或替换 renderer 不改变已确认的评注与正式成果事实。

第一条产品纵切按 **固定文件版本 → 安静阅读 → 对段落评注 → 同源回执恢复** 收敛。跨版本定位、细粒度 inline、语义 diff、agent 建议依次补入。参考对话末尾的整串能力是路线，不作为一个不可验收的大包。Markdown 是一种内容表达与阅读格式，DOCX/PDF 是后续输出 adapter；不将所有成果强制降成 Markdown。

现有 native ES modules 保留。Marked + DOMPurify 的受限渲染继续承担当前 Message/File 阅读。新增 source-aware parser 先在独立评测中证明价值，不直接替换聊天 renderer，不引 React 迁栈。当前流式 Chat 会持久记录；“流式”不等于其历史是暂态，也不等于可直接作为不可变文档版本。

## 2. 身份与 owner

| 对象 | 本单归属 | 不能混同的事实 |
|---|---|---|
| 原始文件字节、记录版本 | 既有 ArtifactHistory / ES Core file bundle，按各自读取合同 | 当前 workspace 文本、HTTP 截断预览、记录 blob、Core 成果有不同身份 |
| AST、outline、rendered text、block 索引、diff | 可重建的派生投影，带实现版本与原始 hash | AST 路径或 block hash 不是跨修订身份；AST 不是新的 canonical state |
| 正式评注线程、回复、处置回执 | 首个可写切片扩展既有 Core 的工作评审域及同一 SQLite 事务边界，由 Astra 实现 | 不在 UI localStorage、独立 Markdown sidecar 或 agent 私有文件保存第二份正式真源 |
| 接受 Candidate、生成 Artifact、领域义务 | 既有 `decide` / domain contract | resolve comment 不接受成果，不表示问题已修好，也不自动解决 Attention |
| UI 选择、滚动、未提交草稿、高亮 | app.mjs 生命周期与局部 reader 状态 | 乐观显示、保存中、离线草稿不表示服务端已持久确认 |
| agent finding / 修改建议 | 有依据的提议；读写通过宿主受限接口 | 模型不能自报可信 actor、替人 confirm reanchor、apply 或 accept |

首个正式评注目标限定为**已有 Core file Candidate/Artifact 中的文件**，不要求普通 Chat 或打开任意 `.md` 自动建立 Matter。普通 recorded file 先提供同一 reader 的只读能力；需要治理时通过明确的现有 ES 候选路径接入。通用独立文件 notes 是后续范围，不能偷塞进本轮 Core 或假装已有持久接缝。

现有 ES 每文件 65,536 UTF-8 bytes、bundle 131,072 bytes 的限额继续有效。评测直接调用 renderer 的 200 KiB 压力样本是组件实验，不能据此宣布服务端、File UI 或正式评注已支持该容量。扩大限额须另验完整读取、消息上限、解析成本与恢复。

读取身份至少绑定：owner kind、project/Matter scope（服务端导出）、Candidate/Artifact id、bundle digest、path、file sha256。ArtifactHistory 的 Session/Run/path/hash 身份仍单独携带，不能仅凭相同文件 hash 获得别的 scope 的访问权。model 提供的 hash 只用于一致性检查，不能取代宿主读取和完整字节校验。

## 3. 源坐标与显示坐标分别定义

**事实层**保存现有不可变 UTF-8 bytes 和 hash。BOM、CRLF、终止换行、组合字符不静默规范化。Core file-content 分页按 Unicode code points；source-aware adapter 不能把 DOM/JS 的 UTF-16 offset 当作该 offset。

**解析层**记录 parser/profile 版本、原始 hash、实际 parser input 及转换说明。remark spike 已证明：BOM 被忽略会改变原文坐标；entity 的 node.value 长度不等于其 source span；后置 reference definition 会影响之前节点。必须有原始 source → parser input → displayed segments 的可检映射；只持 mdast.position 不足以提供逐字符选区。

**显示层**使用独立 `projectionVersion` 与逻辑文本序列；排除 code toolbar、Copy 按钮、review rail、隐藏控件与 CSS 生成内容。代码换行、段落分隔、表格单元格分隔、entity 解码、soft break 都须写入投影规范。W3C TextQuote/TextPosition 是规范化文本上的 code-point 选择，不能直接用来命名 raw Markdown 或 JS code-unit 范围。采用其原语思想，不冒称首版完整 W3C interchange 实现。

首个写入版本只提供显式 **Comment on paragraph / block**：完整块原文的 start/end（半开、code points）和 raw quote 由服务端以固定字节重验。UI 可显示选中文字作为上下文，但要明确操作对象是该块；不伪装成已具备任意 inline/cross-block 锚定。精确 inline 后续必须证明显示区间到源区间（可能多段）的映射；不确定时说明不支持，不扩大为另一段落或猜一个位置。

`block_id` 首版仅在固定 revision/projection 内稳定：结合 revision identity、节点种类和原文 span；同内容重复段落必须不同 id。跨修订引用保留原 anchor，另记候选与确认后的新 anchor，绝不覆写历史。

## 4. 两个独立状态维度

拟议评注处置：`open | resolved`，可按 typed action reopen。拟议定位结果：`exact | candidate | ambiguous | orphan | unavailable`，按每个目标修订独立计算。删除目标段落使定位 orphan，不把评注标为 resolved；已 resolved 的评注也可能在新版本失去对应。

同一 revision 的 source range/hash/quote 全部吻合才是 exact。新 revision 即使仅前插且找到唯一完全匹配，也只是 candidate；显示理由、候选数、原文和目标版本，显式确认后追加新绑定。重复匹配必须 ambiguous；读取被拒/历史字节缺失是 unavailable，不能推断目标已删除。fuzzy、heading path、模型比较只能排序候选，不能提高为精确事实。首版不公开一个看似可比较的数值 confidence。

不得将 `drifted` 与 `open/resolved` 塞在同一 enum；不得沿 quote 搜索的第一个命中自动落点。重定位确认不改变源内容，不代替成果接受，也不撤销旧版本已成立的 Decision。

上游取舍已据源码收窄：mdProbe 的 unique-quote 分支虽然不直接选第一个重复项，后续 fuzzy 仍可能返回 `confident`。其恢复链可作算法索引，不能当“不得 silent mis-anchor”的已验证实现；本单保留 ambiguity 和显式确认，不导入它的状态/分数语义。固定 SHA 与具体路径见 [Luna 来源核验](luna-sources.md)。

## 5. Core 写入与异步节奏

Astra 在实际 A2 施工时冻结具体 DTO、DDL、迁移与恢复，不在研究文档创造已可调用的 API。必需边界已确定：

- 宿主导出 actor 与 scope；typed command 明确目标、expected review revision、request id；A2 只开放 create/reply/resolve/reopen。confirm_reanchor 待 A3 提供可重验候选 packet 后才开放，来源读取权限不能自动升级写权。
- 相同 request id + 相同命令精确重放原回执；不同 payload 冲突；CAS 失败无部分事件。丢响应先查询回执，再重取同源状态，未确认前保留本地草稿与 request id。
- 原始 anchor、回复与历史绑定可审计；评注 revision 独立于 Matter.version、Work stateVersion/digest 和 Attention revision。单纯评论不让既有 Candidate 的 base version 静默变旧，也不修改 Candidate/Artifact/Decision/义务；正式 decide 的校验保持原合同。
- 评注命令和回执使用独立的 typed schema/capability 与命名空间；同 Core owner 不代表复用正式 decide 的 receipt row。不得将评注命令塞进既有 file action schema v2 或遗漏 fileCapabilityVersion 要求；未知评注版本不执行。A2 需验证 review request id 与 decide/Attention request id 不碰撞。
- 服务端先在事务外做有界 parsing/候选计算，再在事务内重验身份与版本并提交。长文解析、diff、模型推断不占据 SQLite 写锁。
- producer 缺席的历史读取沿既有合同；可写操作是否可用必须由新评注 service 的真实 action descriptor 声明，不能继承某个 domain renderer 的按钮或假定 producer 缺席仍可写。
- 客户端每次切换目标/版本使前次请求失效；迟到 parse/diff/model 回复不能覆盖当前 reader。关闭视图清理监听、高亮、worker，既有 work 状态不取消、不删除。
- Markdown 读取、刷新、outline/find、确定性 diff 均零模型调用；不为本单建立第二条 Run loop。模型分析将来复用现有运行身份、输入覆盖与权限；AM-B 未验能力不视为可用。

## 6. Reader 与安全

沿既有 File/Work surface 实例与 tab 身份扩展阅读模式，先不新增第五类 tab。新的 Core file reader adapter 由 Astra 接入并验证契约版本；read-only fallback 仍必须可达。单一 reader owner 管目标、请求取消、滚动和销毁；renderer 不直连 Core、Runtime 或文件系统。

正文维持稳定行宽、语义 heading/list/table/code 与阅读字号；outline、评注列表和定位结果可收起。窄屏评注进入独立列表/详情并可回原位置，不靠硬塞侧栏缩窄正文。selection toolbar 也需键盘入口；不要求仅悬停才发现操作。j/k 若引入须有焦点范围，不能吞输入框与原生阅读按键。

CSS Custom Highlight 可作渐进显示增强，但不是可访问性或持久状态 API。评注内容、状态、目标位置和跳转始终有语义 HTML/文本入口；不支持 highlight 时仍可阅读和操作。具体像素与视口通过实际 UI 验证后裁定，Tufte 只作边注组织参考，不导入其字体或整套皮肤。

沿当前 sanitize allowlist。raw HTML 不得激活 script/event handler/任意 embed；source attribute 不参与 privileged routing；link scheme 校验继续成立。远程/相对 images、math、Mermaid 先明确 unsupported 或安全文本，不能因参考矩阵写了它们就开放 fetch、SVG/HTML 执行或 arbitrary URL。后续每种渲染插件单独有资源解析策略、限额与负例。模型文本不成为 JSX、MDX 或脚本。

## 7. Diff 与建议的后果

继续展示现有 ES `codepoint-prefix-suffix-v1` 的真实 replacement；它是确定性内容差异，不宣传为 semantic diff。新 block comparison 先是只读派生值，标出匹配依据、不确定配对和未对应块；保留原版本与 raw source 读取。代码块可用 code diff，重写/多义配对退到完整 old/new，不强行造逐字符相似度。

跨版本没有对应文件时不推断删除。模型提出“已解决”须带本次覆盖与来源证据，并保持 suggestion。应用修改须生成新 Candidate/文件版本，既有批准不能覆盖新 payload；自动写回 Markdown、CriticMarkup 或外部 Office 不属于首版。export sidecar 是格式转换，不是第二个持久 owner。

markdown-diff-viewer 的默认比较使用重建的 block 文本与词匹配阈值，不是 raw-byte equivalence，也不是语义证明；CJK、否定变化、仅格式变化与重复条款须单独验。借用结构比较不把上游默认阈值升级为 Courtwork 的接受规则。

## 8. 阶段出口

具体 writer、验收与依赖见 [work-orders](work-orders.md)。A0 的出口是核验来源、坐标反例、现状浏览器评测和可派工合同；这些证据不称 annotation/semantic diff 已实现。正式产品实现须先满足 A1/A2 接缝，再按唯一前端 writer 分片合流。视觉四轴、真实模型质量与专业接受仍独立。
