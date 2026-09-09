# ES-00 作者回执：首个执行文件后端施工合同

2026-09-09。作者：Astra（gpt-6-astra / low）。本单仅设计与工单；不是实现交付、独立验收或发布。交付：[backend-contract-draft](../../engineering/execution/2026-09-09-execution-state/backend-contract-draft.md)。根 Astra 负责派单、合流与最终架构判断。

读取 HEAD `a431650b8c4726adc10905485aaadfdb1983689c`，分支 `codex/astra-execution-state-contract`；临时隔离工作树 basename `cw-astra-execution-state-contract`，开工无未提交修改。唯一持久产品目录仍为 Courtwork；没有检出/修改共享 UI 工作树。写权限本回执与上述合同两文件。

## 实际源码依据

以下均按上述 SHA 读取，不以历史聊天替代源码：

| 来源 | 本次据此裁定 |
| --- | --- |
| [AGENTS](../../AGENTS.md)、[current](../../engineering/current.md)、[准备包](../../engineering/execution/2026-09-09-execution-state/README.md)、[PR-BE](../../engineering/execution/2026-09-09-execution-state/PR-BE-exact-file-candidates.md)、[正式 contract](../../docs/work-core/contract.md) | Core owner、不同 workflow 不强制升级、文件包需绑定现有决定事务 |
| [core.py](../../app/core/core.py) validate_candidate_payload / save_candidate / decide / Store | 当前 exact schema；canonical identity；user schema1；BEGIN IMMEDIATE、FULL/DELETE、ACK hooks；文件不能只放 payload 而在 Artifact 丢失 |
| [bridge.py](../../app/core/bridge.py) ensure_app_schema / save_candidate / read_artifact / main | app schema2、open Run/归属检查、当前分页接口、逐行 transport；提议新 Core2/app3 隔离旧 Store 和 bridge |
| [client.mjs](../../app/core/client.mjs) MAX_WIRE_LINE / call / onLine | 1,500,000 按 JS length，不是文件 byte limit；新增操作必须整包编码后预算 |
| [work-adapter](../../app/extensions/work-adapter.mjs)、[evidence-memo](../../app/extensions/evidence-memo/index.mjs)、[owner](../../app/core/owner.mjs) | 文本提交 exact schema、按 Matter profile 分支、投影/Context 有界引用、旧 action 不能静默丢 files |
| [workspace-tools](../../app/runtime/workspace-tools.mjs) createWsWriteTool | 512 KiB read、4 MiB write；history → rename → record 次序；无跨文件目录快照证据 |
| [ArtifactHistory](../../app/runtime/artifact-history.mjs) read/save | Buffer 完整读取与长度/类型/hash 校验；history 本身不证明 Run 归属，不需新建内容存储才能开始 |
| [service](../../app/server/service.mjs) getArtifactFile / queryWork / Run setup | durable Run selector guard、HTTP preview 有截断不可当原文、合并额外工具与上下文需监测 |
| [RuntimeStore](../../app/server/store.mjs) validateArtifact / appendArtifact | 持久 content-version 记录 path/bytes/sha256/kind/writtenAt；缺 toolCallId，不能捏造 |
| [Pi runtime](../../app/runtime/pi-session-runtime.mjs) createSessionRun | 复用 SessionManager/currentContext/compaction 的真实闭合输入限制；不能只声明 complete |
| [package scripts](../../app/package.json) | ES-01 应运行 npm test、smoke；本设计单不冒充已执行 |

Luna 的只读探索由根 Astra 转发，作者据此亲读 ArtifactHistory/recorded 文件接缝并改正最初 inline-file 方案。最终合同消费受信 recorded bytes：不把 inline 内容提议冒称已有执行文件，也不把先后写成的多个 recorded 版本冒称同时刻目录快照。此处是设计采纳，不是 Luna 对本文或将来代码的独立验收。

## 作者检查与未检项

- 两份文档相对 Markdown 链接按实际文件解析，全部存在；无个人数据/凭据读取，无新外部依赖、无付费 provider。
- `git diff --check` 与加入暂存后的 `git diff --cached --check`；显式 stage 仅合同与本回执，并审查 cached name list。
- 首版 16 文件/64 KiB 单文件/128 KiB 总包/32 KiB metadata 是保守工程选择；JSON envelope 实测、性能、完整输入监测、DDL 与故障恢复均待 ES-01 验证，不能报为通过。
- 未实施任何 app/FE/schema/API；未运行 runtime/UI/crash/migration 测试，未关闭产品门，未 push 或发送外部消息。新 protocol/code names 仅施工提议，正式 ABI 由实现文档与固定 fixtures 冻结。
- 文档作者不为自己给独立 acceptance。后续 ES-01 的确切写权、反例、消费者、ES-02/03 边界均在合同中；由根 Astra 决定实际施工与非作者验证。
