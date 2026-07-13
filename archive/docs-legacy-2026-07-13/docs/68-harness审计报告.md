# HARNESS-AUDIT-1 审计报告（2026-07-12，Fable @ Code）

单据：docs/55「HARNESS-AUDIT-1」（ce54883 发单）。纪律执行声明：**零行为改动**——本报告为本单唯一产物；变异检验全程在独立 detached worktree（@ 76069d7，审计后已清理）内进行并逐项回退，主工作树未被触碰；与 SOL-WRAP 并行零冲突（未动 apps/desktop 可视面、未碰共享索引暂存件）。

审计基座：main tip `76069d7`；三批实现 `0e23d49`（HARNESS-0）/ `accca2e`（GOAL-2 收编）/ `88da2a8`（右列改判）。官方文档实抓日期：2026-07-12。

## 结论速览（立/不立逐条）

| # | 审计项 | 结论 |
|---|---|---|
| 1 | 五缺口修复真闭合（变异检验） | **立**（#2/#3/#4重试/#5 四组变异全红）；两个子项不达标：单飞行锁零附带测试、CLI 非零退出无测试锁 |
| 2 | prompt 链路 vs docs/58 五段序 | **不立**（五段中约 0.5 段在场；已挂账 HARNESS-1，本审计给出精确差距清单） |
| 3 | 单飞行与超时层级 UI≥Rust≥core | **立**（∞ ≥ 180s ≥ 120s，注释与实现一致）；一处语义注记（孤儿请求 60s 窗口） |
| 4 | providerNotices 全链完整性 | **不立**（五环断最后一环：投影层之后无 UI 消费者；#40 chip 显示的是发前声明值，降档时刻反而会显示错误档位） |
| 5 | golden 通道强度 | **半立**（事件骨架与阈值有牙、变异可红；但非 byte-stable，且考点断言被平凡输出实证骗过） |
| 6 | quirk 表 vs 官方现值 | **DeepSeek 全立（缺省 enabled 获官方坐实）；Qwen 互斥立、json_schema_strict 档位漂移证实；豆包路由漂移嫌疑（中置信，需实测定案）** |
| 7 | ABI 三拍板前置清单 | 完成（见施工输入节：引用点计数/落点/改动面全量） |
| 8 | 安全回归抽查 | **立**（FIX-KC-1/PRV-1 主张复验全立，Rust 16/16 实跑绿）；两条低危观察（转发 host 不窄、F5 文案滞后于 F3） |

---

## 一、五缺口修复真闭合复核（变异检验）

方法：独立 worktree @ 76069d7，`pnpm -r build` 后基线 65/65 绿（五个涉案测试文件）；逐项回退修复代码（保留测试），跑其附带测试，要求红；跑毕即 `git checkout` 回退变异。

| 缺口 | 变异内容 | 附带测试 | 结果 |
|---|---|---|---|
| #2 thinking 显式 | quirk-profile.ts DeepSeek standard 撤回 `{type:'disabled'}` → `undefined` | quirk-profile.test.ts | **红 ✓**（2 例倒：wire 断言 + 路由断言） |
| #3 互斥降档（机制） | structured-output.ts compatibilityAdjustment 条件恒假旁路 | structured-output.test.ts | **红 ✓**（Qwen 降档例倒） |
| #3 互斥降档（表值） | QWEN 表值 `downgrade_to_standard` → `supported` | 同上 | **红 ✓**（表值本身被测试锁住） |
| #4 重试边界 | http-client.ts catch 回退旧行为（超时/网络错误重试） | http-client.test.ts | **红 ✓**（恰好两条边界测试倒：模糊网络错误单次、超时单次） |
| #5 golden 长牙 | evaluateS3DemoGolden `pass` 弱化为仅骨架匹配 | s3-golden.test.ts | **红 ✓**（"空 RiskList 必须失败"例倒） |

"缺口即测试缺口"判例达标验证：四组修复的附带测试全部具备"回退即红"性质，**主体立**。

两个不达标子项：

1. **单飞行锁零附带测试**。锁在 [App.tsx:274](apps/desktop/src/App.tsx)（`chatFlightRef.current` 卫语句），全库 grep 无任何 unit/e2e 断言双击发送只产生一次在途请求——该子项的变异检验**无从执行**（没有会红的测试）。HARNESS-0 收账"单飞行锁"落地为真，但按判例其测试缺口仍在。
2. **CLI DIFF 非零退出无测试锁**。`demo-s3-flow.ts:46` 的 `process.exitCode = 1` 存在（直读可证），但无测试驱动该脚本断言退出码。脚本层薄、评估器本体已有单测，登记不升级。

## 二、prompt 链路现状 vs docs/58 五段序

真实请求此刻发什么（读码追踪，两条路径）：

**场景路径**（executor → provider）[executor.ts:108-117](packages/core/src/scenario-executor/executor.ts)：
- system = `scenario.promptTemplateRef` **裸引用串本身**（S3 即字符串 `"S3-contract-review-v0"`）。registry 仅校验其为非空字符串（scenario.ts:50），全库无解析器、无模板正文文件。DeepSeek（json_object 档）下 structured-output 会在其后追加 JSON Schema 提示（这是目前 system 段里唯一的"真内容"）。
- user = `JSON.stringify({artifactType, inputArtifacts, toolResults, producedSoFar, todo})`。inputArtifacts 的 CaseFile 只含**文件元数据**（fileId/fileName/documentType），**合同正文不在 context 里**。
- todo 复述在 JSON 尾部 ✓（docs/12 技巧，唯一已落的组装纪律）。

**chat 路径**（App.tsx → chat-client → Rust 转发）：`provider.generate({ messages })`——原始对话历史直发，**无 system prompt，零段**。

逐段差距表（目标序 = 契约段→声明段→租户段→卷宗续行块→会话增量，docs/58 三/七节）：

| 段 | 现状 | 差距 |
|---|---|---|
| 契约段（红线+信源纪律 core 常量） | **不存在**（core 全库无此常量） | 全缺 |
| 声明段（场景编排/提示词正文） | ref 占位串直发，未解析 | 载体在（promptTemplateRef 字段），正文与解析器全缺 |
| 租户段 | 不存在 | 全缺（Stage 1 既裁，非本期欠账） |
| 卷宗续行块（rehydrationProjection） | 不存在（全库零代码命中，纯文档概念） | 全缺 |
| 会话增量/语料 | 场景路径只进元数据 JSON；**语料（合同正文）不进 context**；"数据非指令"标记无 | 语料注入全缺 |

**连锁推论（本审计的新增事实）**：语料注入缺位 ⇒ S3 真模型跑不可能命中预埋考点（模型引不出它没见过的合同原文），大概率先倒在 RiskList 校验或 golden 5/7 门——**GOAL-1 交付的"S3 真跑命令通道"目前是一条自证失败预期的通道**。这与 docs/66 观测记录至今为空互为印证（通道在、数据零）。参数治理面（本期已治理的部分）：reasoningLevel 显式路由 ✓、互斥降档 ✓、response_format 按 tier ✓、json_object 补提示 ✓；temperature/max_tokens 未治理（不发送，随 provider 默认）；缓存稳定前缀在组装器缺位下无从谈起。

结论：**不立**（与目标序差距≈全量），但差距与 ABI 施工序第 4 步（HARNESS-1）登记范围一致，无失控欠账；唯"真跑通道自证失败"应作为排期输入显式化（见拍板清单 #4）。

## 三、单飞行与超时层级语义核对

| 层 | 实际值 | 出处 |
|---|---|---|
| UI | 无显式超时（∞）；chat 面单飞行锁 `chatFlightRef` | App.tsx handleChatSend |
| Rust | chat 转发 **180s**；冒烟 probe **20s**（独立链路，不与 core 叠层） | [lib.rs:749](apps/desktop/src-tauri/src/lib.rs:749) / lib.rs:682 |
| core | **120s**（DEFAULT_TIMEOUT_MS）；maxTransportRetries=2 仅 429/5xx，退避 500ms×2ⁿ 封顶 8s | openai-compatible-provider.ts:21 / http-client.ts |

层级 ∞ ≥ 180 ≥ 120 **成立**；Rust 侧注释明言"比 core 侧 120s race 更长的兜底：让 TS 侧先超时，保持分型出口唯一"——注释与实现一致，语义自觉。**立**。

语义注记（登记非阻断）：core 120s 先超时后，`invoke` 不可取消（chat-client 注释自认），Rust 侧请求最长再悬 60s 仍在计费；而单飞行锁已随 catch/finally 释放，用户立即重发会造成 provider 视角双在途——与"超时不重试防重复计费"同一风险家族的残余窗口。处置选项见拍板清单 #9。

## 四、providerNotices 全链完整性

| 环 | 状态 |
|---|---|
| structured-output 产 notice（降档时） | ✓（含 code/message/requested/applied） |
| openai-compatible-provider 透传 | ✓（0e23d49） |
| executor 挂 `artifact_produced.providerNotices` | ✓（附带测试在，变异可红） |
| desktop projectSession 投影 | ✓（accca2e；契约测试注释"供 composer chip 轻提示"） |
| **UI 消费（chip 渲染）** | **✗ 断点**——全 desktop src 仅 protocol/client.ts 触及 `providerNotices`，无任何组件读取渲染 |

加重情节：[Composer.tsx:587](apps/desktop/src/composer/Composer.tsx:587) 的 #40 chip 显示的是**发前声明值**（`reasoningRequest(modelConfig)` + 用户所选档位标签）。当 Qwen 深思 + 结构化触发运行时降档时，chip 会持续显示「deep」而 wire 实为 standard——**恰在降档发生的时刻给出错误档位显示**，与 #40「禁静默偏差」的立法本意相反。HARNESS-0 收账"chip 归 GOAL-2 合并提交"实际只合并到投影层，最后一环在协调中脱落。

结论：**不立**（4.5/5 环，断在唯一面向用户的一环）。

## 五、golden 通道强度

**byte-stable：否（各层皆非）**。golden 现由三件构成：① 事件类型序列全等比对（evaluateS3DemoGolden.structureMatches）；② 预埋考点 ≥5/7 阈值；③ 集成测试结构断言（risks 计数/处置态/docx 仅验 PK 头与非空，不比字节）。docs/58 七节的 byte-stable 是续行块投影的目标（ABI 施工序第 4 步交付），当前通道不承诺字节稳定——如实定位，不算欠账，但命名上"golden"易高估强度。

**考点断言可被平凡输出骗过：实证成立**。[run-s3-demo.ts:81](packages/core/src/acceptance/run-s3-demo.ts:81) 的匹配是双向 substring（`actual.includes(expected) || expected.includes(actual)`）。审计探针：构造五条**通用法律词** quote（违约金/人民法院/质保期/三十日/附表一——任何合同审查都会写出的词，不构成"读过本合同"的证据），喂给评估器得 `{"pass":true,"matchedPreloadedFindings":5}`。弱点在反向分支 `expected.includes(actual)`。

上游 schema 挡了半道：SourceAnchor 强制 bbox/textRange 至少其一（"无锚不落格"结构性成立），平凡输出还须**编造** textRange 才能过 Zod——但编造的 textRange 当前无人对照真实文本层校验（quote 声明为非权威定位器，textRange 也仅是形状校验）。顺带发现：TextRangeSchema 未约束 `end ≥ start`。

结论：**半立**——骨架与阈值机制有牙（变异红），考点语义强度不足以证明"模型读过这份合同"。收紧方案见拍板清单 #5。

## 六、quirk 表与官方文档现值比对（实抓）

| 项 | quirk 表现值 | 官方现值（2026-07-12 实抓） | 判定 |
|---|---|---|---|
| DeepSeek 模型名 | deepseek-v4-flash / v4-pro | 同（旧名 deepseek-chat/reasoner **2026-07-24 15:59 UTC 弃用**，映射 v4-flash 两模式） | ✓ 立 |
| DeepSeek thinking | standard 显式 `{type:'disabled'}` | `thinking.type` 枚举 enabled/disabled，**"Default value: enabled"**（create-chat-completion 参考页原文） | ✓ 立——**#2 修复的前提首次获官方文档坐实**（此前仅推断） |
| DeepSeek json_object | 补 prompt JSON 提示 | 官方警告不提示会产生空白流直至 token 上限 | ✓ 立 |
| Qwen 互斥 | structured×deep → downgrade_to_standard | 百炼中英双站原文："开启思考模式请勿设置 response_format…否则会报错" | ✓ 立 |
| Qwen enable_thinking | 请求字段 bool | 同（HTTP 顶层字段；qwen 商用系缺省关，3.7/3.6 系缺省开——显式双向发送恰是稳健形） | ✓ 立 |
| Qwen reasoning_content | 推测值（表内注"未证实"） | 官方文档确认流式思考内容字段即 reasoning_content | ✓ 升格为已证实（可去"推测"注） |
| **Qwen responseFormat 档位** | **json_schema_strict** | 百炼中国站与国际站结构化输出/JSON 模式两页**均只载 json_object**，无 json_schema/strict | **✗ 漂移证实**——wire 发 `json_schema+strict` 大概率 400（不可重试类），Qwen 结构化场景链路预期在传输层即断；docs/18 §1.2 的"北京地域 strict"陈述已与现行文档不符 |
| 豆包 thinking 路由 | OPENAI_COMPATIBLE（reasoning_effort low/high） | Ark 对 doubao-seed-1.6 的思考控制为 `thinking:{type: enabled/disabled/auto}`（litellm #11879 直证 + 第三方文档双源；官方文档页为 JS 壳，工具不可达） | **✗ 漂移嫌疑（中置信）**——若实测证实，standard/deep 切换在豆包上空转，档位由 provider 默认静默决定 = #2 的镜像问题 |
| 豆包模型名 | doubao-seed-1.6 | Ark 现行 id 形制为版本化连字符（如 doubao-seed-1-6-250615）；Seed 2.0 已出 | 存疑，随 /v1/models 实返定案（#42 判例：勿按记忆修表） |

来源：[DeepSeek API docs](https://api-docs.deepseek.com/)（首页/reasoning_model/create-chat-completion）、[百炼 JSON 模式](https://help.aliyun.com/zh/model-studio/json-mode)、[百炼结构化输出](https://help.aliyun.com/zh/model-studio/qwen-structured-output)、[国际站 deep-thinking](https://www.alibabacloud.com/help/en/model-studio/deep-thinking)、[litellm #11879](https://github.com/BerriAI/litellm/issues/11879)。

## 七、ABI 三拍板实现前置清单 → 见末节 SCHEMA-SPEC-1 施工输入

## 八、安全回归抽查（FIX-KC-1 / PRV-1）

- **命令面**：Rust `invoke_handler` 恰五枚命令（status/save/clear/validate/chat_request），逐个读毕——无任何返回 key 明文的通道；save 只进不出（回传 status 结构体）；chat 转发回传的是 provider 响应体。PRV-1 主张 1 **仍立**。
- **key 唯一注入点**：TS 侧 Authorization 占位符 `__keychain__` 且 headers 在桥内整体丢弃（chat-client.ts:30），真值仅 Rust `bearer_auth` 注入。**仍立**。
- **日志红线**：trace 构造器双保险（键名敏感词过滤 + 字段白名单构造）；`cargo test` 实跑 **16/16 绿**（含 trace_line_never_embeds_secret_fields_or_values / trace_disabled_by_default / status_payload_contains_no_secret_field / dev_service_suffix_matches_build_profile / chat_forward_url_narrow_gate / legacy_accounts_stay_deletable_targets_only）。**仍立**。
- **诊断导出**：buildDiagnosticPayload 为白名单构造（非展开），路径掩码 `[configured]`，credentialFailKind 仅枚举值。SET-1 主张**仍立**。
- **F2/F3 语义**：save = delete(忽略 NoEntry)→set 整组重写；单条目 `credential` + legacy 双条目静默清理不阻塞。**仍立**。

两条观察（登记，非回归）：

1. **chat 转发窄面不窄 host**：`chat_forward_url_allowed` 只校验协议与 `/chat/completions` 后缀——WebView 侧若被注入任意代码，可指挥 Rust 把 bearer key 发往任意 host。与"自定义 provider 允许任意 base URL"的产品语义一致（非缺陷），但 key 外发面比必要更宽；可选加固 = host 绑定到已保存/已验证配置（Stage 1 候选，见拍板 #7）。
2. **F5 恢复文案滞后 F3**：[client.ts:79](apps/desktop/src/credentials/client.ts:79) 仍指引删除"两项（active-source 与 provider-secret）"，未提 F3 现行单条目 `credential`——用户照文案手清后现行条目仍在，指引在新形制下失效一半（低危文案项，归批次册）。

---

## [需架构拍板] 清单

1. **providerNotices chip 补链**（四节断点）：补一枚消费组件（composer chip 或 turn 流轻提示），并裁归属——GOAL-2 遗留自修 vs 新快修单；建议附带断言"降档 notice 在场时 #40 chip 不得显示 deep"。
2. **Qwen responseFormat 修表**（六节漂移证实）：`json_schema_strict` → `json_object`（quirk 层数据改动，#41 判例同路）；修前建议真机一发实证 400 留档 docs/66。连带：tier 改后 augmentSystemPrompt 会自动补 JSON 提示，降级链行为需过一眼。
3. **豆包 reasoningRoute 修表候选**（中置信）：`reasoning_effort` → `thinking:{type}`；连同模型名形制（doubao-seed-1-6-*）一并以 /v1/models 实返定案后修，勿按记忆修表（#42 判例）。
4. **S3 真跑通道的过渡处置**：语料注入归 HARNESS-1 已挂账，但在其落地前 docs/66 无法产生任何真实观测（通道自证失败预期）。拍板：接受空窗至第 4 步 vs 先做最小语料注入（user 段塞合同正文一档）以解锁首跑数据。
5. **golden 考点收紧**：匹配收为单向 `actual.includes(expected)`（引语必须复现预埋原文片段）+ TextRangeSchema 补 `end ≥ start`；归 HARNESS-1 步 4（byte-stable golden 同批）vs 快修。
6. **单飞行锁补测试**：e2e 双击发送断言单在途（缺口即测试缺口判例的收尾件）。
7. **chat 转发 host 加固**：绑定已验证配置的 base_url（Stage 1 安全增强池）。
8. **F5 恢复文案更新**：补现行条目名（批次册文案项）。
9. **孤儿请求窗口**（三节注记）：接受现状（60s 上限、低频）vs Rust 侧对 chat_request 加单飞行/可中止通道。建议接受现状并登记，随 steer/排队语义（RP-2.9 #11 家族）一并演进。

## SCHEMA-SPEC-1 施工输入（三拍板影响面实测）

**拍板① ArtifactType → namespaced ID，影响面计数（@ 76069d7）：**

- 中央枚举定义 1 处：`ArtifactTypeEnum`（7 值）现居 [revision-event.ts:4](packages/schemas/src/revision-event.ts:4)——注意它长在通用基座类型 RevisionEvent 的文件里，迁移时须先把枚举与 RevisionEvent 拆开（RevisionEvent.artifactType 将从 enum 收窄改为 namespaced string 校验）。
- 类型/枚举引用：**12 文件 53 处**，全在 packages 侧（core 9 文件：events×2、scenario-executor×5、session×2；registry 2；schemas 1）。desktop **零 enum import**（协议层以 `Partial<Record<string, unknown>>` string 键工作）——UI 面迁移成本天然低。
- 字面量类型名：desktop src 11 处（'RiskList'/'CaseFile'）+ 4 处（其余类型）≈ 15 处硬编码键；5 张场景 YAML 共 19 处类型名（S1:5/S2:3/S3:3/S4:5/S6:3）。namespaced 后 YAML 与 desktop 字面量同步改（`legal.RiskList`），建议以 grep 门禁锁"裸类型名"防回流。
- 中央校验表 `ARTIFACT_SCHEMAS`（[artifact-schemas.ts:13](packages/core/src/scenario-executor/artifact-schemas.ts:13)）= 注入式 ArtifactSchemaRegistry 的替换目标。**施工注意**：现行 `Record<ArtifactType,…>` 的编译期穷尽性正是 F-4 补漏机制——注入式后此保护消失，须由 PACKAGE-ABI 引用闭合校验（准入时）接位，不能只删不接。
- 账本兼容：ledger/revision-events 为 append-only，存量事件带旧类型名——迁移协议必须是**读侧映射**（旧名→namespaced 别名表），禁止改写历史文件。
- 通用基座类型留中央照拍板：SourceAnchor/RevisionEvent/EvidenceGrade 不迁。

**拍板③ confirmationPolicy: none|gates[]，落点清单：**

- registry [scenario.ts:49](packages/registry/src/scenario.ts:49)：现行 `confirmationGates: z.array(…).min(1)`（"留人确认是产品纪律"的校验层表达）→ 改判别式 policy；**none 的准入约束（仅纯读取零外部写入可 none）在 registry 层无法单独判定**，须与工具/能力声明联判——落 PACKAGE-ABI 准入 + executor 运行时双门。
- core executor：produceSequence 门禁查找（executor.ts:197/203 两处 gate 分支）+ pauseAt + resumeScenario；todo-snapshot.ts 读 gates 排进度。
- 数据面：5 张 YAML 的 confirmationGates 节（12 处非测试引用共 8 文件）。
- 强制面新增：core 需要"能力副作用分级"输入（写文件/MCP/外发/改权威态 ⇒ 禁 none）——该分级表本身是 SCHEMA-SPEC-1 新契约，当前代码无载体。

**拍板② 续行投影归 artifact descriptor，改动面：**

- `rehydrationProjection` 与 descriptor **全库零代码命中**——绿地施工，无迁移负担。SCHEMA-SPEC-1 需新立 `ArtifactDescriptor` 载体（type id + schema 引用 + rehydrationProjection（字段+行预算）+ uiTemplateId + 词表节【docs/53 文案归宿律：字段级供词随 descriptor】）。
- 场景声明按拍板只引 profile + 定组合序（registry 增字段）。
- 接线现状供排期参考：`uiTemplateId` 桌面侧**零消费**（渲染器现为硬接线路由）——descriptor→renderer 声明式挂载属 PACKAGE-ABI（步 2）交付，SCHEMA-SPEC-1 只出形状。
- `promptTemplateRef` 现为裸串直发（见二节）：SCHEMA-SPEC-1 同批定"提示词正文随包"的载体形状（promptBody / ref 解析协议），否则步 4 组装器无输入格式。
- 投影 golden（byte-stable、字段序固定、易变项挤尾）落步 4，与本审计五节"现 golden 非 byte-stable"衔接为同一交付。

**施工序确认**：以上全部与既批六步序（1 SCHEMA-SPEC-1 → 2 PACKAGE-ABI → 3 法律迁出 → 4 HARNESS-1 → 5 MCP → 6 PM 包）兼容，无需调序；唯拍板清单 #2/#3（quirk 修表）不依赖 ABI，可作 HARNESS-0 同族快批先行。

---

*审计方法附注：变异矩阵 5 组全红后逐项回退，worktree 终态 `git status` 洁净后移除；官方文档四源实抓（DeepSeek×3 页、百炼×3 页、litellm issue、国际站），豆包官方页为 JS 壳不可达已注明置信度。*
