# Attention：Courtwork 候选 PR 计划

状态：`planned / not_started`。这是可审阅的施工输入，不是 GitHub PR、执行会话或产品接受。基线 `683b6d1419242bd08d20b7deec77ce12af7dcf12`；开工时重新冻结实际 main、隔离树、owner、fixture 和文件差异。每项保持单一 writer；作者、非作者复核和 Astra 集成分别记录。

固定边界：Attention 沿既有 Work/Core owner 扩展，首个产品纵切建议复用现有 Core 数据库。Session、Run、RuntimeStore、UI cache 和个人 Attention Assistant 目录都不是第二权威。不能把当前 `app_run.matter_id` 非空约束静默改成通用 target；若需要执行关联，优先在 Core 增加明确的 Attention execution/session relation，由 Astra 裁定表形和迁移。

## ATT-BE-01 · Core-owned Attention domain 与 typed service seam

**问题与消费者。** 当前 Courtwork 能持有 Matter、Candidate、Artifact、Decision、来源历史和 Work session/run，但没有可跨 Session 持续的“需要人关注”对象。把 Attention 放在 RuntimeStore 或 UI 会让重启、换 Runtime 和删除 Session 改变正式事实。消费者是 Human Attention UI、Core 读写调用者以及后续手动 Runtime adapter。

**最小交付。** 在现有 Core B0 state/audit 和事务边界内增加：

1. Attention current row，含稳定 `attention_id`、`schema_version`、`revision`、descriptor、状态/理由、下一动作、来源 ref、Matter/Session/external relation ref、authorization summary、`last_event_id` 和更新时间。
2. Core-owned append-only event/audit，记录 typed action、actor/context、前后 revision、request id、来源版本和结果。它服务审计与恢复，不成为第二份当前状态；B0 不假定完整 event sourcing，current row 仍按 Core 规则校验。
3. schema-aware registry/list、单对象 inspect 和有界 exact/grep/relation query。每个读取请求先经过 disclosure policy；不允许通过 `count`、错误信息或 descriptor 绕过存在性策略。
4. typed action（其中包含 human action）：至少 `acknowledge`、`snooze`、`set_waiting`、`resume`、`resolve`、`reopen`、`attach_relation`、`request_disclosure`。`resolve` 需要明确 reason/依据；外部发送另属新动作，不由本单实现。
5. Runtime adapter seam 接收/提交声明好的 execution relation 或 proposal/signal；对已有 policy 授权且可验证的维护动作，可沿 Core 规则提交，不为每次维护虚构 human gate。Session finished、producer absent、notification delivered、模型自述和来源 signal 都不能充当该 policy，也不能直接产生 `resolved` 或外部授权。

**候选文件范围。** Core owner 负责 `app/core/core.py`、`app/core/bridge.py`、`app/core/client.mjs`、`app/core/owner.mjs` 的最小增量及对应合同/迁移；adapter/service 负责 `app/extensions/attention-adapter.mjs`（或经 Astra 核准的等价路径）、`app/runtime/extension-registry.mjs`、`app/server/service.mjs`、`app/server/index.mjs` 的接缝；测试只增与本合同相关的 Core/HTTP/恢复 fixture。不得改 `app/web`、重写 Runtime loop 或另建 `app/server/work-summary.mjs` 的正式来源。

HTTP 名称是待冻结的候选，不把本表当现有 API：

```text
GET  /api/v5/attention/registry
GET  /api/v5/attention/:id
POST /api/v5/attention/query
POST /api/v5/attention/:id/actions
```

host 从当前会话取得 actor、scope、binding/generation；模型或浏览器 payload 不能自填可信 actor。查询响应须说明 `disclosure`、basis/revision、source refs、truncation 和 unknown；拒绝时不泄露未获准的对象存在或字段。

**依赖与裁决。** Astra 必须先决定以下一点：执行关联是 Core 内 `attention_execution`/`attention_session_ref` 一类关系，还是沿现有 Core run 模型另行扩展。现有 `app_run` 由 Matter 约束，故不能为了方便把 `matter_id` 改 nullable 或让 RuntimeStore 充当关系真源。关系 ref 可指向可替换 Runtime/session/generation，但 Attention 状态不由 ref 的生命周期推导。

**验收反例。** 使用独立合成目录和固定请求 id，至少覆盖：

- 同一 Attention 在新 Session、Runtime 重启、producer/adapter 缺席后仍可读；运行历史可缺失时显示 unknown，不丢正式状态。
- 正确 `expected_revision` 一次提交成功；重试相同 `request_id` 返回相同结果且不重复 event；旧 revision 返回 `VERSION_CONFLICT`，不生成部分状态。
- `session finished`、`read`、模型 signal、重复通知或来源中的指令均不改变 `resolved`；具备既有授权或明确 policy 依据且可验证的 typed action 才能完成允许的维护转换；不可约的人类判断另经 human action。
- 未授权角色/目的不能通过 registry、descriptor、count、exact、grep 或 relation 查询旁路披露；允许知道存在也不自动允许读取正文。
- Attention 可有零到多 Matter relation；跨 Matter 查询严格受 relation 和 policy 约束；未知/撤回 source 不被当前 workspace 替换。
- 进程在提交前后、回执前退出，重启后可按 request id 对账；状态为零次、一次或显式 unknown，不能猜成功。

复用现有 `work-core` CAS/idempotency/history/schema、`work-http-recovery`、`lifecycle-restart` 和 `extension-restart` 测试形状；只在现有断言不能表达上述规则时加最小 fixture。迁移前要在副本中验证旧 host 不会共享升级后的数据目录，失败保留备份和可读旧状态。

**回退与停点。** 关闭新 Attention 路由/adapter 后，既有 Matter/Work 不受影响；删除未发布投影或缓存不得删除 Core event/current row。若首个纵切无法证明 Core owner 事务中的 current row、event、request result 和 revision，停止实现，回到合同裁决。

## ATT-FE-01 · Human Attention surface

**问题与消费者。** 人需要看见“为什么需要我”、依据、下一动作和可恢复错误；现有 Home 三态词不能代替 Attention 状态。该单沿 [WO-FE-round4](../../mvp/execution/work-surface-kit/work-orders/WO-FE-round4.md) 的前端单 writer 顺序排队，避免后端能力未交付时画出假按钮。

**最小交付。** 仅在允许的 `app/web` 文件中增加 Attention projection/renderer：

- registry 允许时显示最小 descriptor、状态、reason、next action、freshness/unknown 和 source count；不可披露时不泄露对象存在。
- 详情面显示可获准的 source/relation refs、basis/revision、事件时间和“需要人”的具体原因；完整正文按后端 disclosure 返回。
- `resolve`、`snooze`、`reopen` 等按钮调用 ATT-BE-01 typed action，带当前 revision；冲突后重新读取并明确提示，不能用 optimistic UI 写回正式事实。
- loading、断线、401/403、404、stale、unknown、空态和 producer absent 都有可判断文案；刷新不调用模型、不创建 Runtime run、不把已阅写成 resolved。

**依赖与验收。** 依赖 ATT-BE-01 固定 route/schema/fixture，以及当前 FE 队列之前单的接收。浏览器合成验证至少覆盖同一 Attention 跨新 Session 读取、旧 revision 冲突、未授权 registry、producer 缺席和 refresh 后状态不自变。UI 只能通过 service/Work API 读写，不能导入 Core、RuntimeStore 或个人目录。

**回退。** 删除 renderer/route binding 不改变 Core state；隐藏未交付 action 比画成可用更安全。任何新静态入口按 FE work-order allowlist 复核，前端作者不自称后端或产品接受。

ATT-FE-01合流补充：消费[截图交接](../../design/attention-surface-2026-09-09/README.md)的既有UI要求。先交付常驻全局入口与独立列表/详情，再增加可选Home摘要；两面共用对象identity和service投影。移除Home摘要不删除或resolve对象，返回保留focus/scroll。默认排当前FE队列之后，不因本准备包自动插队。

## ATT-RT-01 · 手动 loop 与替换/恢复能力矩阵（后置）

**问题与消费者。** 需要知道 Practice 能否在不同 Runtime 保留 discovery、disclosure、写入、取消和恢复语义，而不是只验证 JSON 能否解析。首版使用 Codex 手动 loop 与合成 fixture；不建 scheduler、常驻 sidecar、provider connector 或后台监控。

**交付。** 固定一个不含个人资料的 Attention fixture，逐项记录 `observed/manual`、`candidate`、`untested` 或 `unsupported`：registry existence、typed inspect、source lookup、proposal/signal、human action、revision conflict、abort/recovery、Session replacement、producer absence、disclosure refusal。每格绑定 runtime/schema/adapter 版本与证据路径。

**验收与停点。** 先验证 Core round trip，再替换一个 execution adapter，保持 Attention schema/owner 不变；任何 runtime 不满足同一权限、恢复和审计规则时标记不兼容。Practice 可移植只表示可作为输入重建，不表示已在 Pi、Courtwork-native 或任意 provider 上通过。没有第二消费者或失败证据时不抽通用 SDK。

## 共同交付格式

每项实现须记录实际 base SHA、文件清单、fixture hash、正反例、复用测试、作者/非作者验证、迁移备份与回退结果、未检项和停点。研究来源统一回到 [source-index](source-index.md)；本包不把外部数字、网页兼容性、性能或法律效果变成项目结果。
