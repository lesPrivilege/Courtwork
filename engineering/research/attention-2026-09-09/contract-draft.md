# Attention state contract v0.1（草案）

状态：`draft / not frozen`。本页是 ATT-BE-01 的语义输入，不是已实现 API、数据库 schema、ACL 服务或产品接受。正式状态归现有 Core owner；实现前由 Astra 冻结字段、迁移、调用者和 route 名称。

## 1. 权威边界

| 对象 | 真源 / 写者 | 可替换性 | 不能推导的内容 |
|---|---|---|---|
| Attention current state | Core B0 state，在现有 Core owner 的事务边界内写入 | UI、Runtime、Session 可替换 | 不能由 Session finished、通知已发或模型 signal 自动推导 resolved |
| Attention event/audit | 同一 Core 的 append-only audit/event 记录 | UI/projection 可在保留范围内从 current、event 和 source 重建；B0 不假定完整 event sourcing | event 本身不成为另一份 current state，也不自动取得完整重建权 |
| Matter facts | 现有 Matter/Core owner | 沿既有 Work 契约读取 | Attention descriptor 不覆盖 Matter 正文 |
| Session/Run/execution ref | RuntimeStore 与 Core 中明确的 relation ref | 可以附加新 Session、换 Runtime、producer 缺席 | ref 的删除、结束或缺席不改变 Attention 正式状态 |
| UI、briefing、context、registry projection | 派生读取模型；registry 本身仍受 policy 保护 | 可丢弃后从 Core/source 重建 | 不取得正式写权；不把摘要提升为事实 |
| 外部邮件/issue/系统记录 | 外部 owner | 需单独的受权 adapter/对账 | Core action 不能冒充外部效果；未知结果保持 unknown |

单一正式状态owner是约束；首个产品纵切建议复用现有Core数据库。未来若独立存储更合适，须另行证明事务、恢复与责任边界，不能增加并行事实源。个人 `Attention Assistant` 目录只验证手动实践字段和续行，不能成为产品 sidecar、第二 registry 或权限服务。

## 2. 当前对象形状

以下是语义形状；字段名、SQL 表和 JSON envelope 需在实现 PR 中冻结。未知事实使用 `null` 或显式 `unknown`，不能用空字符串掩盖。

```json
{
  "attention_id": "att_…",
  "schema_version": 1,
  "revision": 0,
  "descriptor": {
    "title": "可供人判断的短标题",
    "summary": "最小允许摘要或 null"
  },
  "status": "investigating",
  "freshness": "current",
  "reason": "为何需要关注；带 source ref 或 unknown",
  "next_action": {
    "kind": "inspect|decide|wait|follow_up|none",
    "label": "下一步",
    "trigger": "manual|at|after|external",
    "due_at": null
  },
  "source_refs": [
    {"source_id": "…", "version": "…", "locator": "…", "role": "supports|reports|contradicts"}
  ],
  "relation_refs": [
    {"kind": "matter|session|run|external", "id": "…", "relation": "about|execution|origin"}
  ],
  "authorization": {
    "owner": "local-user",
    "external_send": "requires_explicit_authorization",
    "disclosure": "policy_checked"
  },
  "last_event_id": "evt_…",
  "updated_at": "2026-09-09T00:00:00Z",
  "seen": false
}
```

允许的初始状态为 `investigating`、`needs_you`、`waiting`、`later`、`resolved`。`seen` 是人的阅览事实，不能覆盖 status。`reason`、`next_action`、source version 和关系应能回读；若依据缺失，明确 `unknown`。

Attention 可零到多个 Matter relation，也可只有 external/session relation。relation 是导航和范围约束，不把 Matter 的事实复制进 Attention；Runtime/session ref 只说明执行关联。

## 3. 状态与动作

状态转换由 Core 校验；UI 只呈现允许的动作。初版可采用以下最小集合：

| 动作 | 可信调用者 | 结果 | 约束 |
|---|---|---|---|
| `record_signal` | 已登记的 source/adapter，经 Core policy | 追加 signal/proposal event，必要时更新独立 `freshness` 为 `stale`/`unknown` | signal 不等于授权，不直接改变 status、resolve 或外发 |
| `acknowledge` / `seen` | 当前 host 的人类 actor | 更新阅览字段或 event | 不改变义务是否闭合 |
| `snooze` / `set_waiting` / `later` | 人类 actor 或既有policy明确授权的维护adapter | 更新 status、reason、next action | 要求触发条件或理由；不能伪造外部回执 |
| `resume` / `reopen` | 人类 actor 或既有policy明确授权的维护adapter | 回到 `investigating` 或 `needs_you` | 保留原事件与依据 |
| `resolve` | 人类 actor，或满足已授权闭合规则的adapter | `resolved` + 闭合 reason/依据 | 不由 run finish、notification、read 或模型自报触发 |
| `attach_relation` | 人类 actor 或受限 adapter | 新增/移除 relation ref | 需 scope 检查；不复制 relation 对象正文 |
| `request_disclosure` | 当前 actor | 一次性或有期限的 disclosure decision/proposal | 明确 object、revision、fields、purpose、expiry/revoke |

Runtime 可以提出 proposal 或 signal；是否写入 current row、是否需要人的决定由 Core contract 决定。对已授权且可验证的维护动作，Core可按policy提交，不为每次状态维护增设human gate；重要承诺、不可约判断与未授权外部动作保留人的决定。Runtime完成或来源文字本身不能充当该policy。外部 `send`、publish、issue comment 和邮件不在本合同内。

## 4. 读取、registry 与渐进披露

所有读取带 requester context（由 host 取得）、purpose、scope、对象 id/查询、期望 revision、字段和预算。模型不能自行声称 actor、scope 或授权。Core 先执行 policy，再决定是否返回：

1. **存在性/registry**：只在 policy 允许时返回 id、最小 descriptor、状态桶或数量；拒绝不能用 404/错误细节泄露受保护存在。
2. **inspect**：返回允许字段、revision、freshness、来源/关系 ref、basis 和 unknown；不自动展开全部来源。
3. **exact/schema-aware lookup**：按稳定 id、字段、关系和来源版本查询，带结果上限与 continuation。
4. **bounded grep/relation**：限定对象、scope、字节/字符预算、source generation 和 locator；返回命中理由，不把未命中写成不存在。
5. **semantic/model**：只有前层不足且 policy/预算明确时使用；返回输入版本、选择/排除、模型/transform 版本和 uncertainty。
6. **raw source**：只有指定 source version、locator、purpose 和 disclosure grant 同时满足才展开；不得把“全量 memory”当自动 context 注入。

`source signal != authorization`：来信、网页、聊天、模型输出和工具回执都先是来源数据。来源可以支持、反对或提出候选，但不授予读取、接受或外发权限。registry existence 也不是公开事实。

## 5. 写入、CAS、幂等与恢复

每个正式动作携带 `request_id`、`expected_revision`、可信 actor/scope、action version、payload hash 和 source/relation versions。首个纵切复用现有 Core 数据库时，由 Core owner 在一个事务内校验 policy、revision、状态转换、current row、event/audit 和 request result；未来改变物理存储须重新证明同一提交语义：

- 合法新 revision 返回确定的 action result、event id、current revision 和 basis。
- 同一 `request_id` + 相同 payload 重试返回原结果，不重复 event；同 id 不同 payload 拒绝。
- 旧 revision 返回 `VERSION_CONFLICT`，附当前 revision 的最小可读信息，不覆盖他人更新。
- 未知 action/schema/policy/version 拒绝并保留原 current state；不静默丢字段。
- 进程在提交或回执前退出时，重启可按 request id 对账；无法确定时返回 `unknown` 和恢复路径，不猜一次成功。
- event/current/request result 的事务条件无法证明时，PR 停止，不以 JSONL 顺序写入冒充 CAS。

备份、迁移和恢复遵循现有 Core schema 契约。旧 host 不应把升级后的 schema 4/Attention 数据目录当作兼容共享目录；迁移在独立副本验证，失败保留备份和旧 reader 可理解的状态。删除 Session/Runtime 不删除仍合法的 Attention current/event/source；source 合法撤回则新读取反映不可用，历史决定不被重建偷偷复活。

## 6. Runtime 替换矩阵

Practice 与 adapter 分开记录。只有逐项通过合同测试才可写 `compatible`：

| 能力 | Codex 手动 loop | Pi / Courtwork-native / 其他 provider |
|---|---|---|
| registry 受 policy 约束的 discover | 仅完成手动目录文件读取；产品 runtime 的 policy-bound discover 未验证 | `untested`，除非有 adapter 证据 |
| schema-aware inspect 与 bounded source read | 仅完成手动 JSON/state 读取；产品 typed query 与有界 grep 接缝未实现 | `untested` |
| proposal/signal 与 human action 分离 | `candidate`，待 ATT-BE-01 | `untested` |
| CAS、同键重试、冲突、恢复 | 独立 Core fixture 待验证 | `untested` |
| Session replacement / producer absent | 设计要求；需回归 | `untested` |
| external effect / scheduler / background monitor | `unsupported` in this package | `unsupported` until separately authorized and implemented |

格式可读取只说明 parser 可用；不说明权限、取消、事件顺序、恢复或治理语义相同。切换 Runtime 时，Attention current、event、source versions 和 relations 要能在同一 Core owner 下重建；Execution ref 可以新增或失效，但不改变对象 identity。

## 7. 必须固定的测试 fixture

最小合成 fixture 包含：一个无 Matter 的 Attention、一个跨两个 Matter 的 Attention、两个 Session/不同 generation、producer 缺席、两版 source、撤回 source、未授权 requester、并发旧 revision、相同/冲突 request id、提交前后进程退出。正反例至少证明：

1. 新 Session 仍读到同一 `attention_id`、revision 和依据；删除运行日志不把正式状态清空。
2. `resolve` 需要理由/依据；人类 action 或已有 policy 授权且可验证的闭合 adapter 才能执行允许的转换，run finish、read、notification、source 指令和模型 signal 不会自动闭合。
3. policy 收窄后 registry、count、descriptor、grep 和 raw read 都按各自 disclosure 失败或裁剪。
4. 同键重试至多一个逻辑动作；旧 revision 冲突可见；中断结果可对账且 unknown 不被冒充成功。
5. source version 变化或撤回使当前适用性显式 stale/unknown；不以当前 workspace、最新摘要或另一个 source 代替旧依据。

## 8. 未决裁决

- Core 表/JSON 的精确字段、迁移编号以及 `attention_execution`/`attention_session_ref` 命名。
- `record_signal` 是否首版只存 event/proposal，还是允许在 Core policy 下更新有限 current fields。
- requester/purpose 的 host context 形状，以及单用户本地部署中 policy 的最小实现边界；不把本地环境权限冒称多用户 ACL。
- ATT-BE-01 的 HTTP route/分页/错误 envelope，与现有 `/api/v5` 路由冲突时的兼容策略。
- 真实外部 effect、自动刷新、定时触发和 provider adapter 均后置；出现首个明确消费者后另立合同和授权。

本草案与研究来源的追溯统一见 [source-index](source-index.md)；它不新增 Paper ontology，也不替代现有 Work/Core 合同。
