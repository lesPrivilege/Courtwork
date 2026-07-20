# ADR-016：统一填格协议

- 状态：**Accepted（2026-07-20）**
- 日期：2026-07-20
- 关系：泛化 ADR-009 决定二的 Work 寻址信封；受 ADR-011 决定一/三约束；不改 ADR-013 的 Chat/Work 双轨
- 提出单：`HARNESS-CORE-1` Stage A；裁决：R-6 准（2026-07-20）

## 背景

Work 侧已有一套完整的「填格」协议，但它当前只长在 scenario 执行路径上：

- 寻址信封由 `buildEnvelopeSchema()` 构造，`target.stepId` 与 `target.artifactType` 以 `z.literal` 锁死，错址在 schema 校验层即拒收（`packages/core/src/assembly/assemble.ts:45`）。
- 契约段的「四知」已把这套协议写成模型可读的自述——知推理、知输出（寻址制）、知回填（按址收货）、知交互（封闭动词集）（`packages/core/src/assembly/segments.ts:24`）。
- executor 以该信封作 `responseSchema` 并按址收货。

Chat 侧则完全没有这一层：`assembleGenericChatSystemPrompt()` 是零依赖纯常量身份段（`packages/core/src/assembly/generic-chat.ts:7`），`sendChatTurn` 只传 `systemPrompt` 与 `messages`，**从不设置 `responseSchema`**（`apps/desktop/src/provider/chat-client.ts:136`）。Chat 的一切产出都是自由文本。

Round 5 方向①要求把「schema 约束输出 → 校验入格」泛化为 chat 面同规范（实现就绪图 Round 5 节）。本 ADR 定义该泛化的契约形态。

**本 ADR 要解决的真问题**：Work 的地址来自 scenario 声明；Chat 没有 scenario、没有 step、没有 artifactType——**地址从哪里来**。若答案是「模型自己说」，则直接冲撞 ADR-011 决定三（模型输出的 tool name、step、goto 只是普通不可信文本，不构成调度命令）。

## 决定一：填格协议只有一套，Chat/Work 共用同一构造器

统一填格协议 = 现行寻址信封，不新造第二套形状：

```jsonc
{ "target": { /* 系统供给的地址 */ }, "artifact": { /* 符合本次注入 schema 的产出 */ } }
```

- `buildEnvelopeSchema()` 从 `assembly/assemble.ts` 提升为两侧共用的协议构造器；Chat 侧不得另写一份「轻量版」信封。
- 契约段「四知」是两侧共用常量。Chat 侧启用填格时注入同一段文本，不得改写措辞——它同时是模型的协议说明与 golden 断言对象。
- 不填格时 Chat 保持现状自由文本，且 `assembleGenericChatSystemPrompt()` 的输出**逐字节不变**（沿 CHAT-MEMORY-1 与 WORK-TURN-1 H 已两次确立的加法式可选段先例）。

## 决定二：地址只由系统供给，来源为闭集

`target` 的合法来源穷举为三类，模型不参与任何一类的选择：

| 来源 | 地址构成 | 供给方 |
|---|---|---|
| scenario step（现行） | `{ stepId, artifactType }` | 垂类 descriptor 声明，executor 铸造 |
| 冻结填格模板（新增） | `{ templateId, artifactType }` | registry 冻结模板，用户显式触发 |
| 无地址 | —— | 自由文本，不启用填格 |

- 新增的「冻结填格模板」沿 `InteractionTemplate` 的既有先例（ADR-011 决定四：模板内容与锚点政策来自垂类，registry 冻结，不开放自由提问模板）。Chat 侧的填格入口因此是**用户显式触发的具名动作**，不是模型自主发起。
- 模型输出中若出现未注入的 `templateId`/`artifactType`，是普通不可信文本，`z.literal` 在校验层拒收——与 Work 侧错址拒收同一机制、同一红证形态。
- **本条是本 ADR 唯一的新增概念**（冻结填格模板）。其余全部是既有机制的复用。

## 决定三：校验失败显式不落格，禁静默纠正与伪成功

- 信封校验失败 → 显式「未落格」态，携具体校验错误；不得回退成自由文本冒充成功产出，不得由系统替模型修正字段值。
- 该纪律与 ADR-005 §3 第 6 条（配置缺失、拦截与解析失败必须显式降级，不得返回伪成功空结果）同源；工程反证见归档 `research-2026-07-19-agent-pedagogy/survey.md`（Cursor 弯引号被静默转直引号、某 IDE 对 `git commit` 静默注入参数，均导致模型与工具的世界产生系统性偏差）。
- 重试策略沿用 `packages/core/SPEC.md:272` 已拍板的「分片验证 + 定点重试 + 部分成功诚实呈现」，本 ADR 不新增重试语义。

## 决定四：协议统一，账本不合并

- Chat 填格产物入 Turn journal，Work 填格产物入 SessionEvent/artifact 账本。ADR-011 决定一「两本账不合并」不因协议统一而松动。
- Chat 侧填格产物**不是 artifact**，不进 Work 的 confirmation/revision 账本，不获得 artifact 的成熟度标签。若用户要把它变成 Work 输入，仍须走 ADR-009 决定二的显式 promotion command。
- Chat 填格产物的持久形态是否需要 `ArtifactEnvelope` 式版本信封 `[需架构拍板]`——它不是 artifact，但同样面临跨版本读取问题。

## 决定五：稳定前缀律适用

契约段是两侧共用常量、变更频率最低，必须排在注入序最前；填格地址（易变）排尾。Chat 侧启用填格后的注入序：

```text
基身份（常量）→ memory 段 → 案语境段 → 契约段/四知 → 填格地址与 schema
```

该序与 Work 六段的「低频→高频」律同构（`segments.ts:5` 的组装序注释）。归档 `harness-landscape-2026h1.md` 记录了该律的产业实证（缓存/非缓存约 10 倍价差）。

## 与 `request_tool` 的关系（2026-07-20，R-25 裁，落痕不在本 ADR）

`TOOL-READ-1` 的模型请求通道采用同一判据——`z.literal` 锁定系统注入的闭集，闭集外即普通不可信文本在校验层拒收。但该扩集是**「知交互」动词集的跨层契约变更**，按 R-25 裁定以 [ADR-011](ADR-011-minimal-harness-kernel.md) **修订记录**形式落痕，**不在本 ADR 重述**，避免同一契约出现第二处真源。本 ADR 只提供其判据来源（决定二的地址闭集机制）。

## 门禁

- Chat 侧存在第二份信封 schema 构造器必须触红。
- 契约段文本在两侧不逐字相等必须触红（golden 锁字节）。
- 未注入的 `templateId`/`artifactType` 被消费必须触红（错址拒收反例）。
- 不启用填格时 `assembleGenericChatSystemPrompt()` 输出逐字节等同于启用前必须有测。
- 校验失败路径产生「看起来成功」的产出必须触红（注入非法信封的反例）。

## 明确拒绝

- 模型自选填格目标、自创 `templateId`、自定义 schema；
- 强制全部 chat 输出走 schema（自由文本仍是默认路径）；
- 校验失败静默降级为自由文本、或由系统替模型补字段；
- 借本 ADR 把 Chat 产物升格为 artifact，或合并两本账。

## 未决项的处置（2026-07-20 裁决后）

1. ~~冻结填格模板的注册位置~~ → **已裁：随垂类包 descriptor 声明、registry 冻结**，沿 ADR-011 决定四 `InteractionTemplate` 同一形态（复用 ABI 准入门，不另开宿主侧 registry）。
2. ~~Chat 填格产物的持久形态与版本策略~~ → **已裁：以带版本字段的 Turn journal 条目持久，不上 `ArtifactEnvelope`**——信封留给 artifact，Chat 填格产物不是 artifact（决定四）。跨版本问题实际出现再议，不预造迁移机制。
3. ~~触发入口的产品形态~~ → **已裁：另票**，本 ADR 落 `Accepted` 后即可立。

## 来源

- Work 侧现行实现：`packages/core/src/assembly/assemble.ts`、`segments.ts`；Chat 侧现状：`packages/core/src/assembly/generic-chat.ts`、`apps/desktop/src/provider/chat-client.ts`。
- 方向登记：`docs/architecture/implementation-readiness.md` Round 5 方向①。
- 结构化输出工程反证（史料线索）：`archive/research-2026-07-19-agent-pedagogy/survey.md`。
- 稳定前缀产业实证（史料线索）：`archive/research-2026-07-15-round-3/harness-landscape-2026h1.md`。
