# HARNESS-CORE-1 Stage C · 成熟 GUI agent 功能面对标矩阵

事件性文档，随裁决闭合归档。本单性质是**读源码 + 外部对标 + 逐项判定**，不写产品代码、不改 schema、不动门的断言集。矩阵未批不进 C3。

基线：`main@57bc058`（施工期另有并发会话推进，见 §0.4）。Playwright floor 当前 **323**（`apps/desktop/scripts/assert-test-count.mjs:58`，实跑 `Total: 323 tests in 60 files` 零漂移）。

口径纪律：所有「现状」结论来自本轮 `file:line` 实核或运行时实测；凡未找到确凿证据一律写「未找到证据」，不以推断补齐。外部条目标注证据级别，未核实项显式标记，不以常见形态冒充事实。

---

## 0 · 本单口径

### 0.1 判定四态

| 态 | 含义 | 出口 |
|---|---|---|
| **① 实现** | 进 C3 分批 | 标前后端触点与规模 |
| **② 架构性不做** | 与不变量或产品定位冲突 | 必须引**现行文档**锚点；并自评该取舍是否真立得住，存疑者转 §2 |
| **③ 不给显式入口** | 自动管理即可，无需 UI | 说明为何无需；但依 UI-SURFACE-1 先例，刻意缺席须是**显式未开通态或留痕的设计决定**，不得是静默缺失 |
| **④ 延后** | 属未来阶段或已有在册工单 | 引就绪图/roadmap 坐标 |

### 0.2 引用纪律

- **归档材料无约束力**（`docs/README.md:49`）。「减法八条」（`archive/research-2026-07-15-round-3/generic-base-inventory.md:15`）本身只是史料线索；本单一律引其**已被吸收的现行锚点**，逐条对照见附录 A。
- **Stage A 四份 ADR 已于本日转 `Accepted`，本单按现行契约引用**（本节曾写作「在途提案」，Stage A 落地后就地更正）：
  - `ADR-016` 统一填格协议 — Accepted（R-6 准）
  - `ADR-017` 受控命令执行 — Accepted，但**决定零成立：bash 当期不入界**；决定一至七为「若入界」的既定受控形态，随 ADR 一并 Accepted 而**封存不生效**；**决定八生效**（reading/edits/writing 走既有工具契约）
  - `ADR-018` 执行隔离与沙箱 — Accepted，**当期隔离等级 `none`（显式停留，非疏漏）**
  - `ADR-019` 卷宗容器与本地缓存 — Accepted（R-9 准）

  影响本单两处：①§1.1 的会话↔案件从属与 checkpoint 等价物由「提案」升为**现行契约依据**；②附录 A 中「无任意 shell」原标注的悬空半边，现由 ADR-017 决定零补齐。

### 0.3 外部证据级别

| 级别 | 含义 | 本轮覆盖 |
|---|---|---|
| **源码级** | 检出仓库逐行阅读 | Cline（commit `c2faf38`，v4.0.0，2026-07-18，活跃）；**Roo Code（v3.54.0 快照，见下）** |
| **官方文档级** | 官方 docs/changelog 原文 | Cursor、Copilot Chat/VS Code、ChatGPT（help.openai.com）、**TRAE（国际版 changelog 全量 + sandbox/settings/error-codes 页，本轮补齐）** |
| **转述级** | 搜索摘要，官方页不可直达 | Qoder Quest Mode（其文档页返回 404）；TRAE 少数条目仅见于中国版 changelog（已就地标注） |

**证据时效更正（收尾时发现，如实登记）**：`Roo Code` 仓库已于 **2026-05-15 在 v3.54.0 归档为只读**，插件停止维护（原团队转做 Roomote），`docs.roocode.com` 已 301 重定向。其结论仍可用——**冻结快照对"引用坐标不漂移"反而更好**——但**不得作为「当前行业在做什么」的证据**，只能作为「一个成熟实现曾经做到什么形态」的史料。本单引用 Roo Code 处均按后者理解。

**警示一**：归档 `landscape.md` 对 TRAE / Qoder / Kimi 三家止于官方文档转述，只有 WorkBuddy 有实测六段。交互细粒度证据**不可跨家等同引用**。

**警示二 · 两类产品的基线不同，读本矩阵时须分开看**。本轮外部对标覆盖两个品类，同一功能在两族的基线归属常常相反：

| 品类 | 本轮样本 | 典型分野 |
|---|---|---|
| **编码 agent 族** | Cursor / Cline / Roo Code / Copilot Chat / TRAE / Qoder | checkpoint 回滚、上下文占用条、auto-approve 档位、@file 上下文 = 基线 |
| **通用聊天客户端族** | Claude / ChatGPT / Cherry Studio / LobeChat / Open WebUI | 上述多为**无或有意不做**；而会话改名/置顶/分组/导出、记忆三件套 = 基线 |

典型例：温度与系统提示词滑杆是**多模型聚合客户端**（CS/LC/OW）的基线，却**不是** Claude/ChatGPT 这类单厂商消费助手的基线——后两者刻意用更高层抽象替代。**我方是 work agent，两族都不完全对位；任何一条「行业基线」判断都必须点明是哪一族的基线**，否则会把一族的进阶项误当成普遍缺口来补。

**警示三 · 文档口径不等于代码口径**。本轮至少三例：Cherry Studio 官方文档称数学引擎可选 KaTeX/MathJax，源码显示 MathJax 已移除、设置项已撤；同家文档描述了完整上下文占用条，源码核实其组件文件在主分支**已 404**；Roo Code 官方文档仍列 auto-approve 第 8 类「浏览器」，源码中该工具与类别**已整体删除**。**引外部形态时以源码级 > 官方文档级 > 转述级为序**，本矩阵各条已就地标注级别。

### 0.4 与并发单的边界

- **第一单 `ARCH-SCOPE-2026-07-20`**（已提交 `57bc058`）：T3 设计体例复议归其所有，本单不夹带体例问题。其 R-11（`model-config` 静默降级）与本单 §3.1 属同族但不同对象，不合并。
- **Stage A**（ADR-016/017/018/019，本日全部 Accepted）：本单不改这四份文件，只按其现行效力引用（见 §0.2）。
- **Stage B**（工具结果展开、journal 展示）：本矩阵「工具与授权」域**只转结论不动同一面**——外部调研结论已在 §1.10 备查，实现归 Stage B / `TOOL-READ-1`。

---

## 1 · 对标矩阵

状态取值：`已实现` / `显式未开通态` / `静默缺失` / `demo-only`。判定取值见 §0.1。

### 1.1 会话管理

| 功能 | 现状 | 坐标 | 判定 |
|---|---|---|---|
| 会话列表/历史入口 | 已实现 | `chat/SessionHistory.tsx:30-90`；触发 `App.tsx:2500-2508`；journal 损坏 fail-closed | — |
| 会话跨重启持久（journal 本体） | 已实现 | `App.tsx:434-438` localStorage | — |
| 实时对话画布跨重启 | 静默缺失（按设计） | `App.tsx:422` 内存 state；`:420` 注释「chat=内存态轻画布（重启即逝），持久化归 HARNESS-1」——**`HARNESS-1` 在就绪图与 current.md 均无登记，是悬空前瞻引用**（R-14） | **③不给显式入口**（上游同向取舍，见 §2.1 反证）——但前提是列表可检索 |
| 会话改名 | 静默缺失 | ADR-013 §1 明拒，但理由只在 `SessionHistory.tsx:5-11` **源码注释**，UI 零解释 | **②架构性不做**，但呈现须补（§2.1） |
| 会话归档/置顶 | 静默缺失 | 同上。`App.tsx:409` `pinnedIds` 无 setter，硬编码只含 DEMO_CASE_ID | ②架构性不做 |
| **会话搜索** | **静默缺失** | `SessionHistory.tsx` 无 input | **①实现**（§2.1） |
| 会话删除 | 静默缺失（**后端函数亦不存在**） | 全仓无 delete/clear/purge | **④延后** → `ARCHIVE-MANAGE-1`（pilot J 已拍板：只删应用侧记录，永不触原件） |
| 会话分叉（编辑历史消息重发） | 显式未开通态 ✓ | `chat/MessageActions.tsx:34` `title="Message fork editing comes later"` | **④延后**（不变量 6 允许分叉，非架构禁止；现状呈现合规） |
| 会话导出 | 静默缺失 | SPEC.md:733（C31）记「减法不取」，仅开发文档 | ③不给显式入口（但须留痕，§2.6） |
| 案件改名 / 归档 | 已实现 | 双击 `App.tsx:2270-2279`；`case/ArchiveConfirmPopover.tsx:1-24` | — |
| 会话↔案件从属 | 无持久归属 + 单向拷贝 | `packages/core/src/turn/types.ts:115-137` PersistedTurn **无 caseId**；桥=`App.tsx:759-773` 只拷用户消息文本 | ④延后 → ADR-019 决定一 |

**域小结**：ADR-013 §1 裁掉的是**运营性操作**（改名/归档/置顶），这条立得住。但「不改名 + 无搜索 + 无自动标题」三者叠加，使历史会话在数量增长后实际不可检索——问题不在被裁的那一项，在没被裁的另两项。详见 §2.1。

**Checkpoint / 回滚到某一步**（外部近乎基线，本矩阵须单列）：Cursor / Cline / Roo Code / Copilot Chat 均有自动打点 + 回滚，机制一致——**独立于项目 Git 的影子仓，只追踪 agent 改动**。我方**语义不对位**：原件只读（不变量 9），agent 从不改用户原件；可变面是工作稿轨（`system/work-draft-store.ts:44`，自动保存、越界/原件路径硬拒绝）与产出目录。因此文件级回滚在我方等价于「工作稿可撤销」，而 ADR-019 决定三正是「产出先入卷再确认，落卷可撤销」。

值得注意的是 Copilot 官方文档**主动把 checkpoint 与错误恢复划清界限**：「Checkpoints are designed for quick iteration within a chat session and are temporary. They complement Git but don't replace it.」——即上游自己也不把它当持久回滚。

→ 判定 **②架构性不做**（不引入影子仓/文件级 checkpoint），但**须确认工作稿轨的可撤销性在 UI 上真实成立**，否则 ADR-019 决定三落地时会缺一块。见 **R-16**。

### 1.2 输入面

| 功能 | 现状 | 坐标 | 判定 |
|---|---|---|---|
| **输入框自动增高** | **静默缺失** | `composer/Composer.tsx:647-666` `<textarea rows={1}>`，无 scrollHeight 同步；`styles.css:812-816` 已有 `max-height:120px` 但**因无自增高逻辑而永不触达** | **①实现**（现成 CSS 上限空转，属半成品） |
| Enter 发送 / Shift+Enter 换行 | 已实现 | `Composer.tsx:352-357` | — |
| Cmd/Ctrl+Enter | 等同裸 Enter，非独立语义 | 同上（从不检查 metaKey/ctrlKey）；`chrome/copy.ts:44` `newLine='New line'` 为**死字符串**零消费 | ③不给显式入口（品类通用规则，`Composer.tsx:709` 有注释留痕）；死字符串另见 §3.4 |
| 草稿保持 · 同视图切案 | 已实现 | `Composer.tsx:104,133-148` 不重置 text | — |
| **草稿保持 · 切视图 / 开历史面板** | **静默丢失** | `App.tsx:2295/2485/2579` 三处互斥 JSX 分支导致组件卸载重挂 | **①实现** |
| 粘贴长文本转块 | 已实现，**阈值待校准** | `chat/PasteBlock.tsx:35-37`：**含换行符即转块**，或长度 >220 字符。对照 ChatGPT 2026-06-22 起的阈值为 **10,000 字符**（此前 5,000），且不以换行为判据 | ③不给显式入口，但阈值见 §3.5 |
| 拖放单文件 | 已实现 | `Composer.tsx:292-327` + `admitEntry` | — |
| 拖放多文件/文件夹 | 显式未开通态 ✓ 带引导 | `Composer.tsx:245-256,386-390`「一次只能带一份文件 · …需要整份文件夹请改用「+」菜单添加」 | — |
| @提及 | 静默缺失 | 全仓零命中 | **②架构性不做**（§2.2 自评） |
| 斜杠命令（消息内 `/`） | 静默缺失 | 命令面板是独立 ⌘K 全局面板，非输入框内触发器 | **②架构性不做** → `roadmap.md:43`「不暴露任何 `/command` 式上下文操作」。**范围待澄清，见 R-3** |
| 附件 chip 移除与三态 | 已实现 | `composer/AttachmentChip.tsx:42-112,153-161`；failed 按 reason 给办案语言 + 可选 Retry | — |
| 发送前校验与阻断 | 已实现 | `Composer.tsx:154-155,258-260,701`；`composer/outcome-copy.ts:22-74` 八种 outcome 逐一产品语 | — |
| **↑ 键召回上一条** | **静默缺失** | Composer 唯一 onKeyDown 只处理 Enter | **①实现**（低成本） |
| 清空输入 | 仅发送后自动清空 | `Composer.tsx:263-268`，无独立清空控件 | ③不给显式入口 |

### 1.3 生成控制

**本域是全矩阵最严重的一处不对等。** 产品有三条对话管线，能力不齐：

| 能力 | Chat | Work 自由对话（work-chat） | Work S3 场景 |
|---|---|---|---|
| 停止/取消 | ✅ `App.tsx:242,727,2569-2573` | ❌ **静默缺失** | ✅ `App.tsx:1361-1364`「停止审查」 |
| 重试失败轮 | ✅ `App.tsx:260-264,729-744` | ❌ **静默缺失** | ➖ 无原样重试，整段重跑 |
| 崩溃/重启恢复 | ❌（设计上内存态） | ❌ | ✅ `WORK-LIVE-REPLAY-1` 全链 |
| 失败文案产品语过滤 | ❌ 裸出 | ❌ 裸出 | ✅ `work/work-failure-copy.ts:10-23` |
| 生成中输入禁用 | 仅锁发送键 | 仅锁发送键 | 整个 textarea 禁用 + 说明原因 |

**根因坐标**：`App.tsx:605-613` 的 `sendChatTurn` 调用体**不含 `signal` 键**，`App.tsx:2438-2444` 渲染 work-chat 消息时不传 `onStop`/`onRetry`。因此 work-chat 一经发出无法中断，只能等 provider 端超时（JS 兜底 120s / Rust 生产 180s）。

| 功能 | 现状 | 判定 |
|---|---|---|
| **work-chat 补 Stop + Retry** | 静默缺失 | **①实现 · 批一首项** |
| **响应因长度上限截断的提示** | **静默缺失** | `provider/turn-protocol-client.ts:36,100` 定义并透传 `finishReason:'length'`，**全仓零 UI 消费点**（本单实核：`App.tsx`/`chat/*` 零命中，仓内无任何截断文案）。响应被截断后按普通 completed 呈现 → **①实现**，且属不变量 4 候选（§2.3） |
| 重新生成（对成功轮再来一次） | 静默缺失 | **②架构性不做**（§2.4 自评） |
| 多回答分支切换 / Best-of-N | 静默缺失 | **②架构性不做**（§2.4，**无现行锚点，属新裁定请求 R-5**） |
| 继续生成（截断续写） | 静默缺失 | ④延后（须先有截断提示；续写涉及 journal 语义） |
| 会话中途切模型 | 已实现 | `provider/ModelConfigPopover.tsx:21-76`；生成中亦可切，下次发送生效 | — |
| 推理档位 Standard/Deep | 已实现 | `settings/model-config.ts:38-41`；档位改写实际模型时就地明示（`ModelConfigPopover.tsx:62-67`） | — |
| 温度等生成参数 | 不暴露 | — | **②架构性不做 · 有外部佐证**：ChatGPT 产品面同样不向终端用户暴露温度，其 Custom Instructions FAQ 专门区分「Chat Completions API 的 system message」与「ChatGPT UI 的自定义指令」是两套机制——上游自己就把 API 级精细参数与产品内可调项划了边界。我方二档（Standard/Deep）+ 档位改写明示，粒度合理 |
| 思考过程展开折叠 | 已实现 三面共用 | `chat/ProcessTrace.tsx:99-121` 四态 | — |
| auto-approve 档位 | 不存在（逐条确认唯一路径） | **②架构性不做 · 立得住且有外部佐证**（§2.5） |
| 中途插话 steer | 不存在（S3 场景整体禁用输入） | **②架构性不做 · 立得住**（§2.5） |

### 1.4 内容渲染

markdown 为**自研零依赖**解析器（`chat/ChatMarkdown.tsx:1-228`，注释自陈；package.json 无 markdown-it/marked/remark/rehype/katex/highlight.js）。

| 语法 | 现状 | 判定 |
|---|---|---|
| 标题 / 单层列表 / GFM 管道表格 / `---` / 行内代码 / 代码块 / `**加粗**` | 已实现 | — |
| **链接 `[t](url)`、裸 URL** | **不支持 · 原样透出** | **①实现**（§2.7）——用户看到的是裸方括号与 URL 文本 |
| **`*单星号斜体*`** | 不支持 · 原样透出 | **①实现**（SPEC 自陈是真机最易被感知为「渲染没生效」的一类） |
| 引用 `>`、`~~删除线~~`、任务清单、转义 `\*` | 不支持 · 原样透出 | ①实现（审慎子集扩围，随 §2.7 同批） |
| 图片 `![]()` | 不支持 · 原样透出 | ④延后（无图片管线，见 §2.7） |
| 数学公式 | 不支持 · 原样透出 | ③不给显式入口（法律垂类无需；但须登记，§2.6） |
| 原始 HTML | 按纯文本渲染 | — 刻意安全边界（SPEC.md:70） |
| 代码块语法高亮 | 不支持 | ③不给显式入口（`PasteBlock.tsx:1-32` 注释自陈「dense mono 凡例」——已是留痕的设计决定） |
| **代码块复制按钮** | **静默缺失** | **①实现**（唯一替代是整条消息复制，粒度不同） |
| 表格横向溢出 | 已实现 | `styles.css:1770` `overflow-x:auto` | — |
| 长消息折叠 · 最新条默认全展开 | 已实现 | `chat/CollapsibleMessage.tsx`；`App.tsx:250`（PILOT-LIVE-2 E） | — |
| 消息级：复制 | 已实现 | `MessageActions.tsx:30` | — |
| 消息级：重发 | 已实现但**仅最近一条 failed** | `App.tsx:260-264,735-744` | — |
| 消息级：朗读 / 更多 | 显式未开通态 ✓ | `MessageActions.tsx:31,34` | — |
| 消息级：引用、删除 | 静默缺失 | ③不给显式入口（不变量 9 历史不可涂改 ⇒ 删除单条与账本冲突；引用无场景拉动） |
| 链接可点 / 受控 openExternal | 静默缺失 | ④延后 → `EXPLORE-RAIL-1`（该单已登记需新增 `opener:allow-open-url` 权限位，见 arch-scope §1.2） |
| Artifact 未注册回退 | 显式未开通态 ✓ | `preview/ArtifactTableRenderer.tsx:14-21`「当前版本不支持此工作面」 | — |

### 1.5 检索召回

| 功能 | 现状 | 坐标 | 判定 |
|---|---|---|---|
| **会话内查找** | 静默缺失 | 全仓无实现 | **①实现**（§2.1） |
| **跨会话搜索** | 静默缺失（**有死代码**） | ⌘K 只匹配场景/案件/动作**标签**（`App.tsx:2047-2092`）；`chat/chat-memory.ts:333-351` `searchTranscripts` **零生产调用点**，仅测试引用 | **①实现**（§2.1） |
| memory 查看 + 一键清除 | 已实现 | `chat/ChatMemoryPanel.tsx:22-78,66-74` | — |
| memory 编辑 / 单条删除 | 静默缺失 | ADR-013 §2 明拒 | ②架构性不做（呈现须补，§2.6） |
| **memory 注入逐轮可见性** | 静默缺失 | 机制真实（`App.tsx:647,650`→`packages/core/src/assembly/generic-chat.ts:21-32`），但 Turn 卡/ProcessTrace/用量行**均不呈现本轮是否携带记忆** | **①实现**（§2.8） |

**放大镜的形状与语义不符**：左栏 Search 图标（`rail/CaseRail.tsx`）打开的是命令面板（`Search scenes, cases, or actions…`），不检索任何消息正文。运行时实测确认。这是控件语义与用户预期的错配，非单纯缺失。

### 1.6 错误恢复与断线续行

| 功能 | 现状 | 坐标 | 判定 |
|---|---|---|---|
| **Chat 失败文案裸出技术句** | 缺陷 | `App.tsx:255-259` 直接渲染 `turn.failure.message`；`packages/core/src/turn/turn-runner.ts` 的 `protocolFailure` 分支是**纯英文技术句**（如 `Provider emitted an unknown stream event`），`workFailureDisplayCopy` 的过滤**不覆盖此路径**。真机曾裸透同族文本（`pilot-2026-07-17.md:78`） | **①实现 · 批一**（voice §2/§6 违例风险） |
| **rate limit / 余额不足 / key 失效 无差异化** | 缺陷 | `packages/provider/src/provider-stream.ts:238-248` 对所有非 2xx 统一 `服务商请求失败（HTTP ${status}）`，kind 分类正确但**从不据 kind 改写措辞**；`402` 全仓零命中，落进 `invalid_response` 通用分支 | **①实现 · 批一**（§2.9：现成文案表未接线） |
| **超时文案两路径不一致** | 缺陷 | JS 兜底 `packages/provider/src/http-client.ts:109`「服务商在 ${timeoutMs}ms 内未返回完整响应」（**泄漏毫秒数**）；Rust 生产 `src-tauri/src/lib.rs:1217`「服务商响应超时」 | ①实现 · 批一（归一 + 去技术泄漏） |
| 基础设施异常原样透传 | 缺陷 | `App.tsx:196-198,686-689` `readableError` 直取 `error.message` 无过滤，渲染为真红条 | ①实现 · 批一 |
| **诊断记录只写不读** | 缺陷（诚实性） | `App.tsx:1341-1344` 写 `courtwork.provider-evidence.v1`；**全仓零读取消费点、无 UI**。而兜底文案自称「诊断记录已留存，供排查使用」 | **①实现 · 批一**（§2.10：要么给出口，要么改文案） |
| 一键重试 | Chat ✅ / work-chat ❌ | 见 §1.3 | ①实现 · 批一（同 work-chat 项） |
| Work S3 崩溃恢复 | 已实现（完整） | `work/work-session-store.ts:18-144`；`interrupted` 检测后**显式拒绝**自动重放（`work/work-command.ts:311-313`），要求用户以全新 attempt 发起 | — 行业对照下属**领先**实现 |
| Chat 崩溃恢复 | 静默缺失（按设计） | `TurnStore.save()` 只在终态写入（`packages/core/src/turn/turn-store.ts:432-443`）→ 流式中途崩溃**连 journal 记录都不留**，不是「未恢复」而是「该次尝试从未被记录」 | **①实现或③留痕**（§2.1） |
| 取消后残留清理 | 已实现 | `turn-runner.ts:221-246`；部分正文保留展示 + 「已停止」+ 可 Retry；Work S3 取消后清除恢复指针不留悬空入口 | — |
| 连接探测错误差异化 | 已实现但**仅此一处消费** | `credentials/client.ts:7-9,40-51` `FAIL_KIND_MESSAGES` 十种 kind 各有产品语；`messageForFailKind` 全仓零其它调用点 | 见 §2.9 |

### 1.7 可观测性

| 功能 | 现状 | 坐标 | 判定 |
|---|---|---|---|
| 单轮 token 用量 | 已实现 | `App.tsx:267-270` + `provider/usage-metering.ts:4-11`；缺槽显示「未知」非 0 | — |
| 会话/累计用量 | 静默缺失 | 无跨 turn 聚合 | ①实现（§2.8，低成本） |
| **成本估算** | **已算但无 UI 出口** | `packages/provider/src/pricing-table.ts:63-83` → 唯一调用点 `packages/core/src/scenario-executor/executor.ts:374` → 只喂 `RuntimeGuard.checkUsd`。desktop 零引用。**且价目表只收录 `deepseek/deepseek-v4-pro`（`pricing-table.ts:36-51`），而默认模型是 `deepseek-v4-flash` ⇒ 默认路径估价恒 `undefined`** | **①实现**（§2.11；Settings 已有「Usage limit (USD)」上限输入，用户设了限却看不到已花多少） |
| 上下文窗口占用 | 静默缺失 | 全仓无 contextWindow/maxTokens 概念，**底层类型未定义该槽位** | **①实现**（§2.12——可见 ≠ 转嫁管理） |
| 模型名 + 实际生效模型 | 已实现 | `ModelConfigPopover.tsx:59-67` | — |
| 请求耗时 | 静默缺失 | `packages/core/src/turn/types.ts:23` 有 `emittedAt`，投影层（`turn-protocol-client.ts:26-38`）丢弃 | ③不给显式入口（外部六家均无一手「有」的证据，非行业基线） |
| 工具调用 / 步骤 trace | **demo-only** | `chat/TurnCard.tsx` 组件完整，渲染调用点全在 `App.tsx:2323-2409` 的 `isDemoCase` 分支（`App.tsx:900-902` 注释「非 demo 永不进入该路径」） | **④延后 → Stage B / `TOOL-READ-1`**（本单不动） |
| journal 用户可见面 | 已实现 | `chat/SessionHistory.tsx:1-90` 只读回放 | — |

### 1.8 设置面

七区：`Model / Appearance / Output & files / Channels / Data & privacy / Data promise / About & updates`（`settings/SettingsPage.tsx:40-48`）。

| 功能 | 现状 | 判定 |
|---|---|---|
| provider/模型/key/推理档 | 已实现 | — |
| 主题 System/Light/Dark | 已实现（`SettingsPage.tsx:246-257`） | — |
| 字号/密度 | 显式未开通态，**机制异源** | ③不给显式入口 —— `SettingsPage.tsx:239` 内嵌句「Layout and information density stay unchanged」是诚实声明；但呈现机制与其余六处 `data-state="unwired"` 不同源（§3.2） |
| 遥测双开关 | 已实现（使用遥测 opt-out / 行为数据 opt-in + 二次确认） | — |
| 导出 | 仅诊断 JSON（`SettingsPage.tsx:613-621`），非对话或案件内容 | ③不给显式入口（§2.6 须留痕） |
| 删除全部 | 静默缺失 | ④延后 → `ARCHIVE-MANAGE-1` |
| Clear saved preferences / Check for updates / Channels 四项 / Source access / managed credits | 显式未开通态 ✓ | — |
| **语言切换 / i18n** | **静默缺失** | ②架构性不做（§2.13 自评：单一市场，但**须留痕**） |
| 快捷键自定义 | 静默缺失 | ③不给显式入口（现有 18 项快捷键均为品类通用绑定，无冲突面） |
| 关于/版本 | 已实现（`APP_VERSION='0.1.2'`） | — |

### 1.9 无障碍与本地化

| 功能 | 现状 | 坐标 | 判定 |
|---|---|---|---|
| Tab 序可达 / focus ring / aria-label(72) / role 覆盖 / aria-expanded | 已实现 | `styles.css:206`；`tests/e2e/workbench.spec.ts:334-341` | — |
| **焦点陷阱** | **静默缺失** | 零 inert/focus-trap；`tests/e2e/overlay-residue.ts:17-18` 注释自陈；**即便 `aria-modal="true"` 的真模态（Settings/NewCaseDialog/ProviderSetup/CommandPalette）也无 Tab 循环囚禁** | **①实现**（§2.14；归档 `oss-gui-source-patterns` 的 FocusScope 条目正是此解，留档未消费） |
| **aria-live 流式播报** | **静默缺失** | 全仓零 `aria-live`；`.chat-stream-content`（`App.tsx:249`）无 role/aria | **①实现** |
| Escape 关闭 | 已实现 | `hooks/useDismissOnOutside.ts:28-30` + 全局级联 `App.tsx:963-979` | — 归档 BM31 记录竞品「Settings Escape 不关」为反例，我方已避开 |
| prefers-reduced-motion | 已实现 | `styles.css:1007,1601-1603,1811-1827` | — |
| 对比度 AA | 有留痕**无自动门** | `docs/design/courtwork-design.md:640` 三面 5.03/4.73/4.56 | ④延后（挂设计门批次，不在本单） |
| **字号缩放耐受** | **静默缺失** | `styles.css` 全文 **0 处 rem/em**，26+ 处固定 px | ①实现 或 ②（§2.15：与「密度不可变」的设计声明有张力，须裁） |
| focus ring 例外 | `.palette-input`（`styles.css:481`）无替代可视反馈 | — | ①实现（单点修复） |

### 1.10 工具与授权（**结论转 Stage B，本单不实现**）

外部对标结论备查，供 `TOOL-READ-1` 与 bash 受控 ADR 取用：

- **「默认展开还是折叠」问错了**：Cline 按**风险分层**（只读探索类合并折叠成一行摘要「read 3 files, 2 folders, performed 1 search」；有副作用的各自独立成卡 + 工作区外目标加黄色警示徽标）；Cursor 做成**三档密度**（Compact「minimal traces」/ Balanced「important steps」/ Detailed「complete context」）。
- **行业在收紧授权粒度**：Cline 4.0.0 把 auto-approve 从 8–9 开关精简为 5 个扁平开关，旧的 all-files/all-commands 字段标记 `Legacy` 移出面板，changelog 明写「命令自动批准现在默认关闭」。Cursor `autoRun` 自然语言规则官方自陈 **"best-effort convenience"、"not a security guarantee"**。
- **「已授权但尚未执行」是全行业盲区（八家逐一确认，含两家源码级）**：Cline（源码级）点 Approve 后仅按钮置灰 + 透明度 0.5，无「已批准，执行中」文案；Roo Code（源码级）确认 `askApproval` 到工具执行几乎同一时刻，无该过渡态；Cursor、TRAE 官方文档查无；Copilot Chat 只有**执行后追溯**通知（自动批准发生后弹提示 + 直达触发该放行的设置项链接），非待执行队列。我方就绪图「Effect 与授权」节要求**授权决定持久化先于 effect** ⇒ 若做出可见性即**领先项**。
- **结构化错误码表**（TRAE 官方 `error-codes` 页，供 R-7 取形）：每个错误码配「文案 + 原因 + 可执行解法」三段，例：`-1` → 「服务端不稳定，重试通常可恢复，例如切换 Wi-Fi 或改用手机热点」；`600` → 「并发任务过多导致本地数据库访问超时，减少窗口与并发任务后重试」；`700` → 「请求被当前网络拦截，请联系网管将域名加入白名单」。**这正是 voice §2「发生了什么 + 下一步」的逐码落地形态。**
- **自动重试须连带撤回半执行状态**（TRAE v3.5.67）：可重试错误自动重试时「retracts any tool cards that were not executed」——避免留下不一致的中间态卡片。
- **删除类动作的双保险**（TRAE v3.5.66）：渐进灰度停用 Delete 工具的自动执行改为二次确认，**且已删文件进系统回收站可找回**。与我方 pilot J 项拍板「只删应用侧记录，永不触原件」同向。
- **静默纠正污染模型世界模型**（ADR-016 决定三外部实证）：Cline 内部编号 CLINE-2503 —— 早期 Compact 按钮把字面 `/compact` 发给模型，模型不认识该系统命令，**自行编造了一份假摘要**。
- **授权粒度四级**（Copilot Chat 确认卡原文）：`a single use, the current session, the current workspace, or all future invocations`；另有集中式「Chat: Manage Tool Approval」面板，按来源分组，每工具可分设 **Pre-approval**（跳过执行前确认）与 **Post-approval**（跳过执行后**结果审阅**，专防 prompt injection）。
- **URL 两段式审批**（供 `EXPLORE-RAIL-1` 取用）：`#web/fetch` 类工具把「域名是否可信」与「抓回的内容是否可信」拆成**两次独立确认**——即使域名命中可信名单，内容本身仍**强制**人工审阅。这正是「外部线索恒为未锚定线索级」在交互层的同构实现。
- **确定性策略层先于 LLM 判断**（Copilot Agent Hooks `PreToolUse`）：生命周期节点跑自定义 shell 命令，返回 `allow`/`deny`/`ask` 三态，「无论 agent 被怎样提示」都生效，官方举例拦 `rm -rf`、`DROP TABLE`。与架构原则 1「模型生成，系统裁决」同构，是 bash 受控 ADR 的直接素材。
- **默认拒绝清单**（Copilot `chat.tools.terminal.autoApprove` 官方默认值）：`rm`/`rmdir`/`del`/`kill`/`curl`/`wget`/`eval`/`chmod`/`chown`/`/^Remove-Item\b/i`，按**子命令**逐个匹配。
- **失败工具调用自动展开**（与默认折叠相反），是折叠策略的例外规则。

---

## 2 · 存疑取舍与关键判定的自评

本节逐条回答票面要求的「该取舍是否真立得住」。**立得住**的不再展开，只列存疑与需裁项。

### 2.1 【存疑】历史会话的可用性：被裁的那一项没错，没被裁的两项塌了

ADR-013 §1 裁掉「重命名、归档、置顶等**运营性**操作」，理由是不把 session 管理转嫁用户。**这条本身立得住**。

但现状叠加后的实际后果是：会话列表条目**无自动标题、无搜索、无会话内查找**，且实时画布重启即逝。用户想找上周那次对话，只能整表滚动、逐条点开只读回放。ADR-013 同段还写着「UI 只呈现会话列表作为**导航**」——一个不可检索的列表不构成导航。

外部对照：Copilot Chat 会话标题由首条消息**自动生成**（用户不可编辑，与我方「不给运营性操作」完全兼容）；Cursor 有 ⌘F 会话内查找 + ⌘K 跨会话检索（本地建索引）。**「不给用户管理」与「系统自己组织好」是两件事，我方只做到了前者。**

**一条反证，如实登记**：Copilot Chat 在 v1.108（2026-01-08）**主动取消**了「自动恢复重启前会话」这一行为，改为默认显示空白 Chat、需手动从列表选取（`chat.restoreLastPanelSession` 可调回）。即「重启后不回到离开时的画面」在上游是**有意为之的取舍**，不是缺陷。

这条削弱了「实时画布不持久 ⇒ 必须实现」的直接论证，但**不改变本节结论**：Copilot 敢这么改，前提是它有带自动标题、可归档、可导出、可 `/fork`、可 `/chronicle:search` 全文检索的会话列表兜底。我方把「不自动恢复」和「列表不可检索」两件事同时占了，用户就真的找不回来。所以要做的是**检索与标题**，不是自动恢复——`chatMessages` 的内存态设计本身可以保留。矩阵 §1.1 该行判定据此收窄为「①实现（检索与标题），非①实现（自动恢复）」。

同时，归档 `session-recall-survey` 八条已被采纳，其中④明写「查询 FTS 起步非语义」，配套口径是「**人不浏览历史，agent 查询之**」——即检索能力本就是既定方向，只是当前一条未落地。而 `chat/chat-memory.ts:333-351` 的 `searchTranscripts`（子串检索、大小写不敏感）**已经写好且有测试，零生产调用点**。

→ **R-1**。

### 2.2 【立得住】@提及不做

@file/@folder 是把上下文选择权交给用户逐次挑选，与我方「材料经 `admitEntry` 准入入库、场景按 descriptor 声明消费」的模型正交。案件容器本身即上下文边界（ADR-005 §1），无需二次指定。归档减法八条「无跨案文件系统」的现行锚点为 ADR-005 §1。**判定二成立，无需新裁定。**

### 2.3 【需裁】响应截断无提示 —— 不变量 4 候选

`finishReason:'length'` 在协议层被定义并透传（`turn-protocol-client.ts:36,100`），**全仓零 UI 消费点**（本单实核：`App.tsx` 与 `chat/*` 零命中，仓内无任何截断相关文案）。后果：模型输出因长度上限被截断时，助手消息在句中戛然而止，并按**普通 completed** 呈现——用户无从区分「模型说完了」与「被切断了」。

对照不变量 4「静默降级零容忍；缺配置、缺覆盖、**降档**、拒载与失败都必须显式」：截断是输出完整性的降级，且完全不显式。修复成本极低（投影层已有该字段）。

**外部对照改变了这一项的性质**：Claude / Cherry Studio / LobeChat / Open WebUI 四家**共同缺口**——「输出撞 max_tokens 被截断」在四家产品里都是静默发生，用户只能凭回答「没写完」自行判断；ChatGPT 亦仅有社区来源的旧「Continue generating」证据；Cursor / Cline / Copilot 同样查无专属提示。**即这是全行业盲区。**

故本项不是「补一个别人都有的洞」，而是**我方不变量 4 比行业惯例更严**所以必须做，做了即领先。Roo Code 有一条同源旁证：其源码注释明确说截断可视化是为修复「之前截断是静默的」这一 UX 缺口才补的——**同一个问题，有人已经踩过并认定要修。**

→ **R-2**。

### 2.4 【需裁·无现行锚点】重新生成 / 多回答分支

两者在外部六家均属常见（Cursor 有 `/best-of-n` 多模型并跑择优）。我方目前静默缺失，且**找不到任何现行文档裁过这两项**——不能凭「感觉不符合定位」记为判定二。

本单建议的论证：法律场景下让用户在多个模型输出间挑一个「看起来更好的」，是以文采与流畅度代替事实依据，与架构原则 1「模型生成，系统裁决」和原则 2「无锚不落格」的取向相悖——我方的正确路径是**逐条确认 + 引语回跳 + 驳回/修正**，那才是"不满意就再来一次"的产品形态。重新生成（对成功轮）同理：成功轮已入 journal，重生成会产生两份等权产出而无裁决依据。

但这是**新论证，不是既有裁定**。请架构确认或否决。

→ **R-5**。

### 2.5 【立得住·有外部佐证】无 auto-approve 档位、无 steer

- **auto-approve**：现行锚点为不变量 3 与架构原则 3。外部佐证：Cline 4.0.0 正在**收紧**（8–9 开关 → 5 个，命令自动批准默认关闭）；Cursor 的自然语言 allow 规则官方自陈非安全保证。我方逐条确认不是落后，是行业正在靠拢的位置。
- **steer**：Roo Code 的消息排队有一条在案副作用——**排队消息被处理时会隐式批准所有原本需确认的动作，即使 auto-approve 已关闭**。这正是不变量 3 要拒的形态。我方 S3 场景运行中整体禁用输入并给出理由（`App.tsx:2487-2489`），与 Cline 的「运行期输入框禁用」同构。**两条均立得住，无需新裁定。**

### 2.6 【需裁】判定三的留痕形态：「减法不取」只写在开发文档不算数

会话导出（SPEC.md:733 / C31）、数学公式、消息级删除、memory 编辑等项，理由都只存在于 SPEC 或 ADR 正文、或源码注释里，**用户面零痕迹**。

对照 `vision.md:83`「未接线的控件以**显式未开通态在场**，不伪装可用」——该句管的是「未接线」；而「刻意不做」的项目前既无控件也无说明。票面要求判定三须是「显式未开通态或**留痕的设计决定**」，当前多数属后者中的「文档留痕」。

问题在于**留痕的位置**：`PasteBlock.tsx:1-32` 那种「源码注释 + 凡例引用」是可接受的工程留痕；但会话导出这类**用户会主动找的功能**，文档留痕不解决用户困惑。

→ **R-4**（请裁定判定三的留痕最低标准，以及哪些项需要升级为用户可见说明）。

### 2.7 【需裁】markdown 缺口的边界：链接是硬伤，图片不是

不支持的语法**全部原样透出**（无静默吞），这一点是对的。但缺口的性质不同：

- **链接**：模型引用法条、给出参考来源时会输出 `[《民法典》第五百七十七条](...)`，用户看到的是裸方括号与 URL 文本。这不只是「渲染没生效」，是**产品最核心的引用场景**被削弱。且我方有 `EXPLORE-RAIL-1` 已登记的受控 openExternal 路线，链接**渲染**（可见、可复制）与链接**打开**（需权限位）可拆开做。
- **单星号斜体**：SPEC 自陈是真机最易被感知为渲染失效的一类，低成本。
- **图片**：无图片管线（附件不做多模态，`current.md:27` 明载），此时渲染图片语法反而制造能力幻觉 → **判定四延后**，与多模态同批。
- **数学公式**：法律垂类无需 → 判定三，但按 R-4 补留痕。

→ **R-6**（确认扩围范围：链接 + 斜体 + 引用 + 删除线 + 任务清单，图片与公式除外）。

### 2.8 【建议实现】memory 注入与用量的逐轮可见性

ADR-013 §2 把 memory 定性为「**可撤销、可审计**的系统缓存层」，可审计是其合法性的一半。当前 memory 面板只有设置页的静态汇总，**用户无法知道具体哪一轮请求携带了记忆**——审计链断在最后一跳。

**上游有现成形态可借**：ChatGPT 的 **Sources** 机制——每条回复下方一个书本图标，点开可见本次回复引用了哪些依据做个性化（自定义指令 / 历史对话 / 文件 / 记忆），点某条具体记忆还能展开「它为何被用上」的说明；该来源信息**不含在分享出去的对话链接中**。这与我方「引语回跳」的形状同构，且正是补齐审计最后一跳所需的粒度。

同理，会话累计用量缺失使 Settings 里的「Usage limit (USD)」形同虚设：用户设了上限，却看不到已花多少。

→ 并入 R-8。

### 2.9 【建议实现·低成本】失败文案：现成的表没接线

`credentials/client.ts:7-9,40-51` 已有 `FAIL_KIND_MESSAGES` 十种 kind 的产品语文案（`auth`=「访问凭证未通过服务商验证，请检查后重试」、`rate_limit`=「服务商暂时限制了请求，请稍后重试」…），但 `messageForFailKind` **全仓只在连接探测流程消费**，生成失败流程零调用。

生成阶段现状是所有非 2xx 统一「服务商请求失败（HTTP ${status}）」——kind 已经分对了，只是从不据 kind 改写措辞。补 `402` 余额不足一类即可闭合。这是**接线**不是新建，成本最低而用户可感知度最高。

→ 并入 R-7。

### 2.10 【需裁·诚实性】诊断记录只写不读

`work-failure-copy.ts` 的兜底文案自称「诊断记录已留存，**供排查使用**」，而 `courtwork.provider-evidence.v1` 全仓零读取消费点、无任何 UI 可查看。用户按文案指引去找，找不到。

这与 §3.1 的 `model-config` 静默降级（arch-scope R-11）同属「系统说了一件它没做的事」。两条路：给出口（Settings→About 已有 Diagnostics 导出席位，`SettingsPage.tsx:613-621`，把 evidence 并进去成本很低），或改文案不承诺。

→ **R-9**。

### 2.11–2.12 【建议实现】成本可见与上下文占用可见

- **成本**：数据已算但无出口，且价目表只收录 `deepseek-v4-pro` 而默认模型是 `deepseek-v4-flash` ⇒ 默认路径估价恒 `undefined`。补型号 + 给出口。
- **上下文占用**：外部三家（Cursor 环形+分类 breakdown、Copilot 填充条、Cline 进度条+HoverCard 三手风琴）都把占用做成**持续可见**。我方连 `contextWindow` 概念都没有。

**关键辨析**：ADR-013 拒绝的是把 context **管理**转嫁用户（手动 compact、`/command` 操作），**不是拒绝让用户知道**。可见与可管理是两件事；且外部对照显示，「上下文已满」两家都无独立横幅，我方若做只做**持续可见的占用信号**，不做用户可触发的压缩操作——这与 ADR-013 完全相容。

**但基线归属须说准，且本项证据比初判更弱**：上下文占用可见是**编码 agent 族**的形态（Cursor / Cline / Roo Code / Copilot Chat 四家皆有），**通用 chatbot 族则明确不是**——ChatGPT 无原生指示器（第三方插件补缺即旁证）；**Open WebUI 官方文档写明是「有意不做」的设计取舍，非遗漏**；LobeChat 虽有，但源码硬编码「非开发者模式下用量低于 50% 完全不渲染」；Cherry Studio 官方文档描述了完整占用条，**源码核实其组件文件在当前主分支已不存在**。

**结论：没有任何一家做到「任何用量水平下都稳定可见」。**故本项不宜以「行业基线」立论。若批，理由应是我方自身的判断（work agent 的长材料场景确实需要），而非对齐；若驳，本单不认为证据足以反驳。

→ 并入 R-8。

### 2.13 【需裁·留痕】i18n 缺席

`index.html:2` 硬编码 `lang="zh-CN"`，零 i18n 依赖，日期格式硬编码 `zh-CN`，文案中英混杂（chrome 英文按 RP-2.7 已裁，数据面中文）。

产品定位是中国律所与企业法务（`voice.md:6`），单一市场不做 i18n 是合理取舍。但**当前是零登记的静默缺失**，且 RP-2.7 的英文 chrome 决定使这件事更需要一句明确记载（否则后来者会把中英混排读成 i18n 半成品而去"修"它）。

→ **R-10**（登记为显式取舍，不实现）。

### 2.14–2.15 【需裁】无障碍两项

- **焦点陷阱**：`aria-modal="true"` 的真模态无 Tab 囚禁，是可断言的无障碍缺陷（屏幕阅读器/键盘用户会 Tab 到背景内容）。归档 `oss-gui-source-patterns` 的 FocusScope（独立焦点栈，pause/resume 归还焦点）正是此解，状态为**留档未消费**。
- **字号缩放**：`styles.css` 零 rem/em 与 Appearance 分区「Layout and information density stay unchanged」的声明之间有张力——后者说的是**产品内不提供密度调节**，不等于**拒绝响应 OS 级字号无障碍设置**。两者是否同一件事，需架构裁定。

→ **R-11**、**R-12**。

**外部对照（避免把这两项误读成"人人都有、只有我们没有"）**：ChatGPT 在无障碍上同样薄弱——社区自 2024-05 提出的「遵循 `prefers-reduced-motion`」请求至今未见官方回应或实现；无 RTL 排版支持（阿语/波斯语/乌尔都语虽在其 60 种界面语言内，排版方向仍不跟随）；网页端与桌面端均有键盘焦点被困、菜单项在读屏下退化为静态文本的第三方缺陷报告。

同族四家（Claude / Cherry Studio / LobeChat / Open WebUI）实测同样薄弱：**无一家确认面向 AI 流式输出的 `aria-live` 播报**——Cherry Studio 的 issue #14744 逐项点名该缺口（图标按钮无可访问名称、流式回复未用 aria-live、消息列表未用 `role="log"/"feed"`），**被机器人以 not_planned 自动关闭**，未见修复。`prefers-reduced-motion` 亦仅 CS/LC 两家有确认证据。

另记一条**反模式警示**（Open WebUI 源码级）：其默认状态下大量交互元素主动用 `outline-hidden` **隐藏浏览器默认聚焦框**，仅当用户开启本为视觉障碍设计的 High Contrast Mode 才连带恢复——纯键盘用户在默认设置下难以追踪焦点。我方 `.palette-input`（`styles.css:481`）无替代可视反馈属同类问题的轻量版，不应放任。

即：**我方已实现的 `prefers-reduced-motion` 领先于 ChatGPT 与 Open WebUI**；焦点陷阱与 `aria-live` 是真缺口但**同为全行业盲区**——建议按缺陷而非按对齐处理（不需要外部基线背书，做了即领先）。

---

## 3 · 顺带发现（不在九域轴上）

### 3.1 `HARNESS-1` 是悬空前瞻引用
`App.tsx:420` 注释「chat=内存态轻画布（重启即逝），**持久化归 HARNESS-1**」。该编号在就绪图、`current.md`、`docs/` 全域**零登记**。要么补票，要么改注释——当前形态会让接手者以为有一张在册工单。

### 3.2 未开通态：四套机制、四种措辞、门只覆盖 6/20+ 处
1. `data-state="unwired"` 约定 + 静态门（`scripts/assert-ui-surface-contracts.mjs`，**扫描面仅 5 个文件**）
2. `settings/data-promise-copy.ts:55-67` `RESERVED_COPY` 7 条（仅 Settings，英文「X is coming soon · For now, Y」）
3. `composer/types.ts:60-63` `DISABLED_TOOLTIPS` 2 条（仅 Composer）
4. 裸字面量：`MessageActions.tsx:31,34`、`CaseRail.tsx:371,382`、**`CaseRail.tsx:397,398` 中文「排序与筛选（即将上线）」「更多（即将上线）」**、`SettingsPage.tsx:391`（Settings 域内自己都没复用 `RESERVED_COPY`）

四种措辞并存：`Coming later` / `Coming soon · …` / `即将上线` / `即将开通`；中英混用。共享的只有两个纯样式类（`is-disabled-feature` / `is-reserved`），不携文案逻辑。

**且门与实况已对齐但范围未扩**：`assert-ui-surface-contracts.mjs:83-86` 写死 `EXPECTED_UNWIRED_MARKERS = 6`，失败文案注明「Work 排队 W5 已退役」——即 UI-SURFACE-1 记账的**「七处」当前实为六处**（第 7 处被 `WORK-TURN-2` 物理退役，`:67-70` 另有反向断言禁 `queuedMessages` 回流）。门本身是诚实的，问题是它**不覆盖 Settings 域 10+ 处与 CaseRail 4 处**。

→ **R-13**。

### 3.3 「卷宗 0 件」计数缺陷未闭合
`pilot-2026-07-17.md:129` 第六轮观察项（R1 级）：侧栏案件「卷宗 0 件」与实际 12 件原件不符。本单未查该项是否已修，如实登记为**未核实**，不并入本单范围。

### 3.4 死字符串 `CHROME_COPY.composer.newLine`
`chrome/copy.ts:44` 定义 `'New line'`，全仓零消费点。属复杂度节制条的「无消费导出」，列入提案区交架构拍板，不越权删。

### 3.5 粘贴转块阈值可能过度触发
`chat/PasteBlock.tsx:35-37` 的判据是**含换行符即转块**，或长度 >220 字符。后果：粘贴一段两行的合同条文（远不足 220 字符）也会被收进折叠块，而非留在输入框里让用户接着改。

对照 ChatGPT：阈值 10,000 字符（2026-06-22 由 5,000 上调），且**不以换行为判据**——即多行短文本仍留在输入框内。二者相差约 45 倍。

更完整的外部对照（同族四家）：**Cherry Studio 与 Open WebUI 有此功能，但两家均默认关闭需手动开启**；Open WebUI 给出精确阈值 **>1000 字符**，并留了旁路——**Shift+粘贴可绕过转换**。

即外部三条设计选择我方一条都没占：①默认开关（我方常开）②阈值量级（我方 220 vs 1000/10000）③旁路（我方无）。

我方阈值低有其道理（法律材料粘贴常是整段条文，收进块可避免输入框被淹没），但「含换行即转块」与字符阈值是**两个独立判据**，前者会让「粘两行改一改再发」这个高频动作失效，且无旁路可逃。**这是校准问题不是缺失**，登记待裁，不在本单调整。

---

## 4 · 建议批次与规模

优先序依票面：**生成控制与错误恢复 > 会话管理基础 > 输入面效率 > 渲染与可观测性 > 其余**。

| 批 | 内容 | 前后端触点 | 规模 |
|---|---|---|---|
| **C3-1 · 生成控制与错误恢复** | work-chat 补 Stop/Retry（透传 `signal` + 传 `onStop`/`onRetry`）；失败文案按 kind 接现成 `FAIL_KIND_MESSAGES` + 补 402；超时文案两路径归一去毫秒；Chat 失败路径纳入 `workFailureDisplayCopy` 同源守卫；截断（`finishReason:'length'`）显式提示；诊断记录出口或改文案 | `App.tsx`、`provider/provider-stream.ts`、`credentials/client.ts`、`work/work-failure-copy.ts`、`src-tauri/src/lib.rs`（文案） | **中**（1 单饱满） |
| **C3-2 · 会话可检索** | 接线 `searchTranscripts` 到 UI；会话自动标题（首条消息派生，用户不可编辑，守 ADR-013）；会话内查找 | `chat/SessionHistory.tsx`、`chat/chat-memory.ts`（零改，只接线）、`App.tsx` | **中** |
| **C3-3 · 输入面效率** | textarea 自增高（补齐已有 max-height）；草稿跨视图/跨历史面板保持（状态提升出 Composer）；↑ 键召回上一条 | `composer/Composer.tsx`、`App.tsx` | **小** |
| **C3-4 · 渲染与可观测性** | markdown 扩围（链接/斜体/引用/删除线/任务清单）；代码块复制按钮；会话累计用量；成本估算出口 + 价目表补 flash；memory 注入逐轮可见；上下文占用可见 | `chat/ChatMarkdown.tsx`、`chat/PasteBlock.tsx`、`provider/pricing-table.ts`、`provider/usage-metering.ts`、`App.tsx` | **中**（可拆两批） |
| **C3-5 · 无障碍与未开通态归一** | 焦点陷阱（FocusScope）；`aria-live` 流式播报；`.palette-input` focus 反馈；未开通态措辞与机制归一 + 门扩围至 Settings/CaseRail | `hooks/`、`styles.css`、`settings/data-promise-copy.ts`、`scripts/assert-ui-surface-contracts.mjs` | **中** |

**通用约束**（各批一致）：状态入既有版本化单键持久层，不发明新持久格式；失败显式；取消零残留；零新颜色零新字重；`lint:voice` 与各契约门全绿；desktop 行为变更跑隔离端口 Playwright（`COURTWORK_E2E_PORT=14203 pnpm --dir apps/desktop test:e2e`），floor 只升不降（当前 323）。新依赖走选型对比 + 拍板——**C3-4 的 markdown 扩围须先答 `OSS-SUBTRACT-1` 的问题：继续自研审慎子集，还是换合规成熟件**（见 R-6）。

---

## 裁决请求清单

每项可独立准/驳。

| 编号 | 请求 | 关联 |
|---|---|---|
| **R-1** | **历史会话可用性三件**：确认「不给运营性操作」（ADR-013 §1）与「系统自己组织好」不矛盾，批准落地——①接线已有 `searchTranscripts`（零生产调用点的死代码）为跨会话检索；②会话标题由首条消息**自动派生、用户不可编辑**（守 ADR-013 不给重命名）；③会话内查找。若驳回，则须同批裁定「会话列表作为导航」这一 ADR 表述在无检索条件下如何成立。<br>**外部形态参照**（ChatGPT 官方，供设计取用）：检索按标题与正文精确匹配；**已归档会话仍可搜到**（只是不在侧栏）；**删除即同步移出检索索引**；侧栏只缓存最近对话，更早的靠搜索强制拉取 | §1.1、§1.5、§2.1 |
| **R-2** | **响应截断显式化**：`finishReason:'length'` 全仓零 UI 消费点，截断响应按普通 completed 呈现。请裁定是否认定为不变量 4「降档必须显式」的违例并纳入 C3-1 | §1.3、§2.3 |
| **R-3** | **澄清 `/command` 裁定范围**：`roadmap.md:43` 原文是「不暴露任何 `/command` 式**上下文操作**」。请确认限定词有效——即非上下文类的斜杠触发（如快速起场景）亦不做（现由 ⌘K 命令面板承担），还是仅上下文操作被裁 | §1.2 |
| **R-4** | **判定三的留痕最低标准**：会话导出、数学公式、消息级删除、memory 编辑等「刻意不做」项，理由目前只在 SPEC/ADR/源码注释，用户面零痕迹。请裁定：ⓐ 文档留痕即足够；或 ⓑ 用户会主动寻找的功能须升级为用户可见说明（并指定哪些项） | §2.6 |
| **R-5** | **新裁定：重新生成与多回答分支**（当前**无任何现行锚点**，不能凭感觉记为架构性不做）。本单建议判定二，论证：法律场景下在多份输出间择优是以文采代替依据，与原则 1/2 相悖，正确形态是逐条确认 + 引语回跳 + 驳回/修正。请确认或否决 | §1.3、§2.4 |
| **R-6** | **markdown 扩围范围 + 自研/换件**：建议扩围链接、单星号斜体、引用、删除线、任务清单；图片与公式除外（前者无多模态管线会造能力幻觉，后者垂类无需）。同批请裁：继续自研审慎子集，还是按 `OSS-SUBTRACT-1` 纪律评估合规成熟件（自研解析器已 228 行且缺口逐单扩围） | §1.4、§2.7 |
| **R-7** | **失败文案接线**：`FAIL_KIND_MESSAGES` 十种 kind 产品语已存在但只在连接探测消费，生成失败流程零调用；生成阶段统一「服务商请求失败（HTTP N）」，402 余额不足全仓零命中。批准接线 + 补 402 + 超时文案两路径归一（去毫秒数技术泄漏） | §1.6、§2.9 |
| **R-8** | **可观测性三件**：①会话累计用量（当前 Settings 有「Usage limit (USD)」但用户看不到已花多少）；②成本估算 UI 出口 + 价目表补 `deepseek-v4-flash`（默认模型无价目 ⇒ 估价恒 undefined）；③上下文占用**持续可见**（不做用户可触发的压缩，与 ADR-013 相容）。另含 memory 注入逐轮可见（补齐 ADR-013 §2「可审计」的最后一跳） | §1.7、§2.8、§2.11-12 |
| **R-9** | **诊断记录：给出口还是改文案**。`courtwork.provider-evidence.v1` 只写不读，而兜底文案自称「诊断记录已留存，供排查使用」。建议并入 Settings→About 已有的 Diagnostics 导出席位 | §1.6、§2.10 |
| **R-10** | **i18n 登记为显式取舍**（不实现）：单一市场不做 i18n 合理，但当前零登记；叠加 RP-2.7 英文 chrome，后来者易把中英混排误读为半成品而去"修"。请批准在 `voice.md` 或 SPEC 留一条明确记载 | §1.8、§2.13 |
| **R-11** | **焦点陷阱**：`aria-modal="true"` 的真模态无 Tab 循环囚禁，键盘/读屏用户会 Tab 到背景。归档 FocusScope 方案留档未消费。请批准纳入 C3-5 | §1.9、§2.14 |
| **R-12** | **字号缩放耐受**：`styles.css` 零 rem/em。请裁定 Appearance 分区「Layout and information density stay unchanged」是否**同时**意味着拒绝响应 OS 级字号无障碍设置——ⓐ 是（则登记为显式取舍）；ⓑ 否（则纳入 C3-5，改 rem/em 基线） | §1.9、§2.15 |
| **R-13** | **未开通态归一**：四套机制、四种措辞（`Coming later`/`Coming soon · …`/`即将上线`/`即将开通`）、中英混用；静态门只覆盖 4 文件 6 处，不含 Settings 域 10+ 处与 CaseRail 4 处。请批准归一 + 门扩围。附带确认：UI-SURFACE-1 记账的「七处」当前实为**六处**（W5 已由 WORK-TURN-2 退役，门已同步并带反向断言），本单不视为漂移 | §3.2 |
| **R-14** | **`HARNESS-1` 悬空引用处置**：`App.tsx:420` 注释引用一张在就绪图与 current.md 零登记的工单号。ⓐ 补票；或 ⓑ 改注释指向本单 C3 批次 | §3.1 |
| **R-15** | **提案区两笔**（复杂度节制条，不越权删）：①`chrome/copy.ts:44` `CHROME_COPY.composer.newLine` 死字符串零消费；②`chat/chat-memory.ts:333-351` `searchTranscripts` 零生产调用点——若 R-1 获批则自动消解，若 R-1 驳回则须裁定该函数去留 | §3.4、§2.1 |
| **R-16** | **确认 checkpoint 的我方等价物成立**：外部四家均有影子仓 + 文件级回滚，我方因原件只读而语义不对位，本单判定②不引入。但 ADR-019 决定三「产出先入卷再确认、落卷可撤销」需要**工作稿轨可撤销**兜底。请裁定：ⓐ 确认 `system/work-draft-store.ts` 的可撤销性在 UI 上已成立（若是，本项关闭）；或 ⓑ 承认缺口，随 ADR-019 落地时补票——本单不实现，只求登记不悬置 | §1.1 域小结 |

---

## 附录 A · 减法八条的现行锚点对照

归档原文（`archive/research-2026-07-15-round-3/generic-base-inventory.md:15`）无约束力，本单一律引下表右列：

| 减法条 | 现行锚点 |
|---|---|
| 无 `/compact` 手动上下文 | `docs/product/roadmap.md:43` |
| 无模型自主工具循环 | `CLAUDE.md` 技术基线；ADR-011 决定三 |
| 无任意 shell/URL | `CLAUDE.md`「不开放猜测能力的任意 URL」；**shell 半边已由 `ADR-017` 决定零补齐**（bash 当期不入界；决定一至七为「若入界」的受控形态，Accepted 但封存不生效；决定八生效）。`ADR-018` 另定当期隔离等级 `none`（显式停留） |
| 无跨案文件系统 | ADR-005 §1 |
| 无技能自由安装 | 就绪图 `PACK-INTERACT-1` 票面「本单零动态装载」 |
| 无记忆黑箱改写 | ADR-013 §2 |
| 无销毁级动词 | `pilot-2026-07-17.md:82`（J 项拍板：只删应用侧记录，永不触原件） |
| 无事后追认 | 就绪图「Effect 与授权」节 |

---

## 架构裁决（2026-07-20，逐项）

- **R-1 准（三件全）**。「不给运营性操作」与「系统自己组织好」不矛盾，后者是 ADR-013「列表作为导航」成立的前提。①接线 `searchTranscripts`；②自动标题首条派生、用户不可编辑；③会话内查找。ChatGPT 形态照单取用（归档仍可搜、删除同步出索引）。→ C3-2。
- **R-2 准**。认定为不变量 4「降档必须显式」违例，纳入 C3-1。
- **R-3 裁**：限定词有效——被**裁死**的是 `/command` 式上下文操作；非上下文类斜杠触发不属被裁项，但**当期同样不做**，快速动作统一归 ⌘K 命令面板（入口单一性）。未来若要斜杠须新裁。
- **R-4 裁 ⓑ（限定范围）**：通则——**用户会主动寻找的「刻意不做」功能，须有用户可见的一句说明**；纯工程内部项文档留痕即可。本轮升级两项：会话导出、memory 编辑/单条删除，落点 Settings 既有 Data & privacy / Data promise 席位。措辞必须与「即将开通」可区分（「设计上不做」是承诺，不是欠账），联动 R-13 归一。
- **R-5 准，判定二成立（新裁定，本行即落痕）**：多回答择优是以文采代替依据，重新生成对成功轮产生两份等权产出而无裁决依据，均与原则 1/2 相悖；正确形态是逐条确认 + 引语回跳 + 驳回/修正。边界：失败轮 Retry、用户改写输入的 fork editing 均不在被裁之列——被裁的是「同输入再摇一次」。随收敛批写入 roadmap「已裁不做」段。
- **R-6 准扩围（链接/单星号斜体/引用/删除线/任务清单；图片、公式除外），实现载体合票**：与 Stage A R-18 的 `MD-CONVERGE-1`（remark 化）合并为一张票——remark 化后扩围语法多数免费获得，不再扩自研解析器。链接**渲染**先做，链接**打开**挂 `EXPLORE-RAIL-1` 权限位。
- **R-7 准**。接线 `FAIL_KIND_MESSAGES` + 补 402 + 超时文案归一去毫秒；TRAE error-codes 三段式（文案+原因+解法）作文案形态参照。→ C3-1。
- **R-8 准（四件全）**。上下文占用以**我方自身判断**立论（work agent 长材料场景），不以行业基线立论——矩阵的诚实削弱正确。`contextWindow` 槽位为协议层版本化加法扩展；价目表补 `deepseek-v4-flash`；memory 逐轮可见借 ChatGPT Sources 形态。→ C3-4。
- **R-9 裁给出口**：evidence 并入 Settings→About 既有 Diagnostics 导出席位；文案不改（给出口后即为真）。→ C3-1。
- **R-10 准**。i18n 登记为显式取舍，落 `voice.md` 与 RP-2.7 记载同处。
- **R-11 准**。FocusScope 方案（归档留档正式消费）。→ C3-5。
- **R-12 裁 ⓑ**：「Layout and information density stay unchanged」说的是产品内不提供调节，**不等于**拒绝响应 OS 级无障碍字号——两者不是同一件事。纳入 C3-5，rem/em 基线化；硬约束：等比换算须零视觉 diff（既有皮层门作证），且与票丙（标题轨整备）同批或紧随，避免两次动字号面。
- **R-13 准**。措辞与机制归一（英文 chrome 按 RP-2.7 统一 Coming soon 族；中文「即将上线」两处随归一核对 RP-2.7 合规）+ 门扩围至 Settings 域与 CaseRail。「七处实为六处」接受，不视为漂移。→ C3-5。
- **R-14 裁 ⓑ**：改注释——内存态是既定设计（Copilot v1.108 同向先例），检索与标题归 C3-2，无持久化在册工单；未来要做另立票。
- **R-15 准**：①`newLine` 死字符串并入 `DEBT-CLEAR-1` D10 族删除；②`searchTranscripts` 随 R-1 获批自动消解。
- **R-16 裁 ⓑ**：不现在实现、不悬置——「工作稿轨可撤销性在 UI 真实成立」登记为 ADR-019 决定三实施票的**验收条款**（须有反例：不可撤销即红）。
- **顺带裁（§3.5 粘贴阈值）**：准校准——去除「含换行即转块」判据，字符阈值上调（实现票在 500–1000 区间实测定），补 Shift+粘贴旁路。→ C3-3。

**批次修订**：C3-4 中 markdown 扩围移出、并入 `MD-CONVERGE-1+`；C3-4 余下为可观测性四件。执行约束：**`App.tsx` 为串行面**——触碰它的票不并行（序见收敛批派发表）；其余按文件面互不相交者并行。
