# 后端派工证据 · 2026-09-09

基线 `a431650b8c4726adc10905485aaadfdb1983689c`。本包区分探索事实、Astra 设计/实现和非作者验收；不是新的产品状态表。

## Explore：Luna 集群

实际启动三个 `gpt-5.6-luna / max` 本任务子代理，均只读：后端队列、执行文件状态、前端消费者。无外部消息，无付费模型请求，无个人凭据读取。

### 前端消费者

Luna `explore_frontend_consumers` 核对前端分支 `claude/fe01-vocab-ia` 的 HEAD 为 `bfefcd2`，工作树清洁；共同基线为 `1688a7b`，未进入本次主线 `a431650`。来源为该固定提交的 `engineering/mvp/execution/work-surface-kit/delivery-fe01.md` §1/9/10 与 `evidence/fe01/README.md`，可用 `git show bfefcd2:<path>` 定向读取，不依赖临时树路径。

作者交付说明：词表、Settings IA、chrome、Home/Work composition 与两个 WK11 缺陷；未改 server/runtime/core/domain/HTTP。作者报告 212/212、composition 16/16、counterexamples 12/12、RC 20/9/36；这些数值在本轮没有重跑，不记作 Astra 独验。真实 provider、触控、读屏、IME、200% 和中间宽度列 not_run。

对应源码 `bfefcd2:app/web/settings-view.mjs` 仍消费 provider-config/provider-credential/provider-models，未提前暴露 BE-17/18、Memory 或 Temporary chat 功能。BE-17/18 阻塞 FE-02 的未保存 compatible/local 连接发现与测试，不阻塞已有 catalog 路径。BE-19/20 各自阻塞 Memory/Temporary chat，不阻塞全部 FE-03 shell。ES-FE 仍需 ES-BE 实际契约后进入单写者队列。

工作树及提交只能证明作者交付状态，不证明前端会话仍在运行；本轮不接管或中断其任务。

### 后端队列

Luna `explore_backend_queue` 在 a431650 核对 `app/server/index.mjs:95` 的路由和 `app/server/service.mjs:249` 的本地模型目录；`app/runtime/pi-session-runtime.mjs:58` 的 ModelRuntime 禁用网络刷新。`service.mjs:72` 的描述校验与 `:567` 的保存路径只接受已知 provider/catalog model。

裁定：BE-17/18 可独立新增短生命周期模型发现/握手，不使用配置 PUT 做临时探测。新的探测结果不能自动注册模型或证明 compatible/local 的保存/执行已实现；这个额外缺口从实际 backend 代码发现，进入后续队列。BE-5/12/14…20 其余项本轮没有完整逐项复核，不因原工单写待实现就宣称新核验完成。

### 执行文件状态

Luna `explore_execution_state` 核对：`app/extensions/work-adapter.mjs:160`、`:316` 严格限制 memo 输入，NDA schema 独立；Core `:131` 校验、`:427` 候选反序列化和 `:772` decide 都要处理文件能力，不能只在输入多加一个字段。decide 当前正式存的是 artifact_text，文件候选保存不等于文件已进入正式 Artifact。

`app/core/client.mjs:11`、`:147` 限制 JSONL 单行 1,500,000 JavaScript 字符；只限制单文件/总包仍可能被候选其他字段和 JSON 编码撑破。bridge application schema 当前为 2，新增文件语义必须避免旧 host 忽略字段仍执行旧 accept。Core 持久数据在既有私有 state.db，所谓“不写文件夹”不等于不落盘。

最关键反例：inline file-memo 可以构成一种提议，却没有 `ws_write` 的真实执行来源。既有 `workspace-tools.mjs:214` 的 ArtifactHistory 和 `service.mjs:948` 的 run.artifacts 是应优先消费的来源；不能把模型提交的 name/content/path/hash 升格为“工具确实写过”。Astra据此要求 ES-00 优先设计受信 recorded artifact → immutable bytes → Core 导入，不能用 inline 演示冒充原 ES workspace 纵切。额外只读核验限定为 ArtifactHistory 身份/读取/归属接缝。

定向补查已完成：ArtifactHistory 的 `read(sessionId,digest,bytes)` 校验对象存在、类型、大小与实际 hash 后返回完整 Buffer。既有 artifact HTTP 入口先校验 Session/Run 归属及 run.artifacts 的 path/hash，再读取历史。history 的 session-scoped 内容对象本身不保存 Run 归属；同内容在不同 Run 可复用字节，导入仍必须携带可信 Run/Matter 绑定。无 run.artifacts 记录的孤立 hash 不授予导入权限。由此可复用现有读取接缝，但不能把 HTTP 截断预览当完整文件。

## Astra 作者交付

ES-00 已派发给 `astra_state_contract`（`gpt-6-astra / low`），基线 a431650，独立分支 `codex/astra-execution-state-contract`，仅有界后端契约与下一施工单写权。实际结果见后续作者回执，不把派发计为完成。

ES-00 作者交付 `42a4c2f25fcb21b0663e6d1a0de08341a3f0f63c`：[合同](../../engineering/execution/2026-09-09-execution-state/backend-contract-draft.md)、[作者回执](es-contract.md)。根 Astra 复读合同，接收其作为 ES-01 施工输入：复用当前 Run recorded identity 与完整 history bytes，selected-recorded-versions 不冒称目录快照；完整 Candidate/Artifact 文件归属、Core2/app3 旧 host 拒绝、整体 wire 限额和输入覆盖单调失效列明。16文件/64KiB单文件/128KiB总包是待实现验证的保守工程选择，不是性能事实；ES-01仍须用真实service证明输入监测，unknown-only或纯fixture不构成完成。文档接收不表示新增 schema/API 已实现。

BE-PREVIEW 已派发给 `astra_provider_preview`（`gpt-6-astra / low`），基线 a431650，独立分支 `codex/astra-provider-preview`，精确写权见 [工单](../../engineering/execution/2026-09-09-backend-dispatch/WO-BE-PREVIEW.md)。它亲自实现 service/HTTP/helper/test，未将关键代码委派 Luna；本记录不预填测试结果。

## 验证边界

当前记录为派工和只读来源核对。后续新增 runtime/协议用例的运行结果按作者代码 SHA 与命令另记；不能用既有 FE 作者通过数证明后端新功能。G1–G5 保持开放。
