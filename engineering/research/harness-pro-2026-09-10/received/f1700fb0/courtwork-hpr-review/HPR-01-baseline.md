# HPR-01 · 当前能力、对标与缺口

## HPRO-0001 · 基线和证据等级

文档入口固定 `d22eb66ef1b335b95202c8c0a34c425acb59a2f9`，产品代码按入口指定 `a2b084da09ba14a92f4e94bae49c9540d2e6dced`。不以不断变化的 main 替换它们。前者的回收规范已读；`current.md`、`roadmap.md` 只读了当前优先级及部分历史段落，完整历史尾部没有读完，已在清单中显式登记。其余本轮直接使用的必读专项文档及实际源码范围逐件列于 `source-manifest.json`。[S01–S14]

本次把“源代码事实”“文档说明”“隔离桩观察”“设计建议”“尚待实测”分开。代码版本是 RuntimeStore12 这一交付基线；较早文档出现的 schema5/9/11 不据此覆盖最新专项合同。原有用户数据与固定目录坐标保持不动。本包没有复跑上游自述的全量检查，也不把历史作者测试改签为本次独立验收。[S05、S14、C11]

## HPRO-0007 · 同任务、同权限的能力矩阵

下表的 GUI 列是已读界面源码或契约中的入口，不是浏览器亲测。保存、有效、已注入、真实执行分别判断。对标只说明可参考的实现/交互，不证明相同任务已经跑通。

| 用户任务 | 当前 GUI／控制面入口 | 实际执行链与持久 owner | 当前证据、缺口 | 对标与裁决 |
|---|---|---|---|---|
| 选择连接、模型、effort，得到流式答复 | Settings/Models；普通 Chat composer；本次未亲测 | RuntimeService → Pi ModelRuntime/AgentSession；连接/Run 属 RuntimeStore，key 属 credential file，native history 属 Pi | 已有两种 OpenAI wire format、compatible connection、catalog extras、generation/verify binding。不能称只有静态模型白名单；真实 provider 能力与 GUI 联调本次未验。[S14、C02、C05] | 保留这条生产路径。Codex `model/list`/会话控制仅作第二 adapter 候选，不为补目录而换整套 runtime。[W01] |
| 读文件、写结果、问人、取消工具 | Chat 的工具/permission/ask-user 面；Runtime Tools | `governTools` → workspace/extension/other executors；Run/Question 为 Host owner；内容历史按原合同 | 已有精确参数绑定、审批后 cancel/open 重查；workspace guard 不是 OS sandbox。新工具仍须走该门。[C04、C14] | 复用 wrapper/receipt；不另建工具执行总线，不把任意 shell 加入“基础完整”。 |
| 给 URL 让 agent 读取正文 | 尚无已证明的模型 `web_fetch` 入口；来源 inspect 接口存在 | `source-resolver` 对 locator 返回 unsupported，不读网、不 clone、不安装；当前实际 custom tools 链无内置 web fetch | 这是真后端缺口；provider `/models` 探测和 MCP 连接不等于通用网页读取。[C10、C02、C13] | 局部适配 OpenCode 的 URL 权限+格式转换分层；不搬它的 Effect/Bun 运行栈，也不凭 donor 声望推断网络安全。P09 新增受限读取。[U03–04] |
| 登记 skill 并按需加载 | Settings/Skills、Runtime catalog/source inspector | control JSON → skill frontmatter metadata → `runtime_load`；content/hash 进入 Run binding | 手动登记、catalog-only 和按需正文已存在；任意目录发现、assets/scripts 不存在。Pi 原生 discovery 被显式关闭。[C03–05、U01] | 保留 parser/loader，增加显式工作区根下的检查/登记；不打开 HOME 自动扫描或脚本执行。 |
| 连接 MCP 并调用工具 | Settings/MCP；显式 lifecycle/exposure/permission | MCPManager 拥有连接句柄，SDK 拥有协议，Host 拥有审批/Run | 支持 unauthenticated Streamable HTTP；resource/prompt 只列目录。分页和效果不确定性有已复现分支缺口。[C06、C13] | 保留 SDK；先修目录完整性和错误后效果语义。stdio/OAuth 不是本节点默认扩权项。 |
| 配置多层指令并查看最终生效值 | Instructions／Context／scope tabs | `compileControlContext` 已按 scope/id 排序；Host system prompt 在 service；隐藏 `runtime.context` 进入 native journal | 不是“system prompt 完全没有编排”；缺的是明确定义的层语义、完整有效快照、冲突说明和 compaction 下的实测保障。现有字符数仅是一个 compiler 的贡献。[C02–05、C12–13] | 扩现有链，不建第二 prompt 真源。先准确记录实际输入，再有界调整层位置与作用。 |
| 编辑、查看、关闭普通自然语言 memory | 当前 Memory providers 是 planned row；Attention 有历史会话读取工具 | `memory_list/read` 从 RuntimeStore 读已保留 user/assistant 事件，按 seq/hash 定位 | 历史会话读取已有；普通可编辑 memory 并未实现。历史陈述不是当前指令，也不等于 Core 正式事实。[C07、C12] | 在控制面增加人维护的文本资源；provider marker 保留原义。禁用注入与清理已有模型上下文必须分开处理。 |
| 用同一批工作来源审阅/接受成果 | 已有 Work/Review projection 与 typed human action | WorkCoreOwner/CoreClient → 原 SQLite Core；扩展产候选；human decision 正式生效 | 基线存在版本/候选/接受边界。普通 Chat 不应因此硬依赖完整 Matter；没有证据要求重建 Core 或迁库。[C08–09、S04、S10] | 保留 Work Core，拆应用组合接缝；不把接受操作泛化成模型可调用的 `approve`。 |
| 失败、取消、重启后继续 | Run/Question 状态及当前 Runtime 配置 | Host 结算、原命令 receipt、Pi journal；pending configuration fence | 已有取消粘性、projection drain、unknown、不盲重放。新组件不能绕过这些机制。完整关闭/恢复反例本次没有产品级重跑。[C02、C05、S14] | 以原行为为回归基线，补现有接缝的负例，不重造 durable workflow。 |
| 查 usage、context、来源、版本 | Runtime/Context、现有 usage 面 | 原生 usage/telemetry + Host projection | admittedCharacters 不是 tokens，也不是整个模型输入；web/skills/memory 新面须展示真实来源与未实现范围。[C03、C05、C13] | 保留 current/next/historical 分层；任何新 UI 都只消费后端能力与真实 receipt。 |

## 对标任务协议：本轮未伪造跨产品跑分

冻结一份合成工作区：两版材料、一个开放义务、一个更正来源、一个人为设置的写作偏好、一个显式 skill、一个两页 MCP catalog、一个可取消的读取。统一权限要求为：仅该工作区读取；写 out/ 每次询问；无 shell；网络显式批准；不得读取其他项目、HOME 或已有凭据。

分别检验：普通 Chat 读材料 → 加载 skill → 询问缺项 → 获批写输出；MCP 分页读取；网页读取；改指令/关闭 memory 后开始下一 Run；取消/断线/重启查询原 receipt。没有某项能力就标 unsupported；不能给 CW 手工塞结果后把它记成原生网络能力。另一产品无法建立同样权限边界时标“未能建立可比条件”，不把默认全权运行和 CW 受限运行直接比较。

本轮该端到端任务在三个产品上均为 **not-run**。实际执行只有下面的 MCP 隔离诊断及参考函数测试。这样的矩阵可用于选型与出工单，不足以支持速度、质量或成本胜出主张。[S11]

## 固定对标来源与负索引

| 来源 | 本次实际读取 | 可借鉴 | 不据此宣称 |
|---|---|---|---|
| Pi 0.85.1，`d981de1229ef899957bbe968bc8dcda02a21f477` | SDK 160–230；CW 已锁 adapter 的实际构造/loop 接缝 | 显式资源 loader、native session/tool loop；关闭 discovery 是 CW 构造选择 | 上游所有工具/skills 在 CW 可用；更高层 AgentHarness/lane 已接生产 |
| Codex，`713caa89f389acd9cbcd77016edbb607273826af` + 当前官方 App Server 文档 | 固定 README 中取消/协议等操作说明；官方 lifecycle/approvals/skills 章节 | 明确 thread/turn、approval request identity、中断 signal 与最终完成分离 | 本次已审完整 app-server 源码、已运行第二 adapter，或实验 dynamic tools 是无条件稳定 ABI |
| OpenCode，`b3f1a96c6dd7adeb28b36dd11add1998fc84d67b`，包版本 1.18.30 | `webfetch.ts` 与包依赖声明 | URL 级权限、传输和 HTML 转换拆分；其声明使用 htmlparser2 8.0.2 / turndown 7.2.0 | 已验证该 HTTP stack 的全部重定向/SSRF/流式体积界限，或应将全部框架搬入 CW |
| MCP 2025-11-25 tools 规范 | nextCursor / execution error 语义 | 合法分页必须有明确完成边界；isError 是执行错误而非效果回滚证明 | 此次已验证 2026-07-28 全协议或真实 SDK 的所有分支 |

Codex 中止某项请求的确认与实际完成/已发生效果是不同事实，且部分动态工具能力仍标 experimental；这是未来 adapter 必须逐项消费的边界，不是现在换 runtime 的理由。[U02、W01]

## HPRO-0008 · MCP 目录完整性：已复现的适配器缺口

固定 `mcp-manager.mjs` 在 connect 时各调一次 `listTools/listResources/listPrompts`，随后按数组长度限制并公布 healthy/connected；没有消费返回的 nextCursor。以合法的两页 SDK 桩返回，实际结果为：只请求一页、只公布第一项、health=healthy。原文件 Git blob 已核验一致。[C06；evidence/baseline-byte-check.json；evidence/baseline-mcp.tap]

这是“适配器收到分页结果时”的反例，不是对真实 SDK 内部行为的全称证明。P01 必须再用安装的 SDK，分别跑基线声明支持的 legacy/modern 路径；若某一路原生已经归并分页，就适配其真实语义，不能再重复翻页。目录可以有硬上限，但超限必须明确 incomplete/error，不能把截短结果标成完整可用。[W03]

## HPRO-0009 · 工具失败与外部效果：已复现的语义缺口

目前 MCP `result.isError` 走 reported 分支，不触发 onUnknown；只有非 reported 异常触发 Host 的未知效果栅栏。隔离反例先递增一个本地“已发生效果”计数，再返回 isError，得到 effectCount=1、unknownCount=0；这说明仅有 isError 不足以判定可安全重试。[C06；evidence/baseline-mcp.tap]

没有真的发送消息或操作远端。建议第一片保守修复：已 dispatch 的未知效应远端调用返回 isError，也沿既有 unknown/fence 路线结算；只对 Host 实际强制只读或存在可信效果证据的调用放宽，不能信任远端 readOnlyHint。保留业务错误可解释性，同时禁止模型静默重试有后果的操作。此次不新建 BG-03 大账本。

## HPRO-0020 · 参考代码与可复现范围

运行 `node --experimental-vm-modules --test tests/baseline-mcp.test.mjs` 得 4/4；运行 `node --test tests/reference-catalog.test.mjs` 得 10/10。前者执行字节一致的 manager、仅替换 SDK 依赖；后者执行本包新写的 `collectCatalog`，覆盖全页、重复游标、跨页重复身份、总数量/字节/页数、取消前后和坏游标。

参考函数只限制**已经解析的**目录，不能替代传输层在分配大响应前的限制，也未对 SDK 特有分页行为背书。它不是对产品的 patch，更不能因本地 10/10 就跳过真实 adapter 集成。测试环境 Node v22.16.0 不是项目要求的 >=22.19.0；只运行了这些无需产品依赖的有界测试。
