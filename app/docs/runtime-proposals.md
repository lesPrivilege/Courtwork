# Runtime proposals · declarative Skill proposals (BE-6 / BE-7 first slice)

2026-09-16 · Claude 施工单 06 第二段。模块 `app/runtime/runtime-proposals.mjs`，服务接线在 `app/server/service.mjs`（`proposeRuntimeSkill`、`listRuntimeProposals`、`getRuntimeProposal`、`editRuntimeProposal`、`rejectRuntimeProposal`、`applyRuntimeProposal`），模型工具 `runtime_propose` 在 `app/runtime/control-tools.mjs`。HTTP 合同见 [docs/runtime-control/api.md](../../docs/runtime-control/api.md)。

## 一条链

Agent 在 Run 内调用 `runtime_propose {title, content}` → Host 以真实 Session/Run 为作者写入 `runtime-proposals.json`（不可执行、不入快照、不入 catalog、不能 `runtime_load`、配置 revision 不动）→ 人在 Settings › Developer › Runtime 读 review（BE-6 九个字段与 `approvalSha256`）→ Apply 在配置队列内做一次 CAS `put`（活动 Run 冻结、修订与摘要核对）→ 下一个新 Run 的 `runtime.bound` 含该资源，显式 `runtime_load` 留下 `runtime.context.loaded`。

## 账本

`{ version: 1, revision, proposals[], applyCommands[] }`，整文件原子写（临时文件 + rename）。每条提案：`id`、`revision`、`status`（proposed / applying / applied / rejected）、`kind: skill`、`title`、`content`、`identity`（resolver 的 contentSha256 / artifactSha256 / bytes / characters）、`declared`（frontmatter 的 name / description / allowed-tools / compatibility）、`target`（`local:<name>`，session scope）、`author`（origin agent、sessionId、runId）、`history[]`、`decision`、`pending`。上限：正文 64 KiB，每 Session 16 条待审。

## 事务与恢复

Apply 的顺序：requestId 重放核对 → 状态、修订、阻塞项、摘要核对 → 写待决标记（`status: applying` + `pending`）→ 配置 `put`（`RuntimeControlPlane.change` 自身原子）→ 写回执并清标记。`put` 失败则标记清除、状态回到 proposed（fail-back：配置从未被碰）。启动时 `recover(control)` 对每条 `applying`：配置 audit 在 `expectedConfigRevision + 1` 有同 id 的 `put` 且当前内容 hash 相同 → 记 applied（`recovered: true`）；否则回到 proposed。配置文件在恢复中不被改写。

回执（`applyCommands[].receipt`）：`requestId`、`proposalId`、`proposalRevision`、`approvalSha256`、`decidedBy: local-user`、`at`、`configRevisionBefore/After`、`resourceId`、`contentSha256`、`recovered`。同 requestId 同请求体 → 同回执；同 requestId 不同请求体 → `409 idempotency_conflict`。

## 边界

只收 `skill`；只落发起 Session 的 scope；不扫描 URL / 仓库 / 路径，不执行脚本，`allowed-tools` 只是声明；Apply 不设曝光覆盖、不改策略；Rollback 与跨 scope 扩展未实现，完整 BE-7 不因本片关闭。
