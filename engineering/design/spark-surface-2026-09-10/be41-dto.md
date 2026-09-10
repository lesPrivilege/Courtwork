# BE-41 · 派生失效只读投影 DTO（冻结）

基线 main `0c60f4f`。本页冻结 SP1-FE 消费的报文形状。**后端未实现**：冻结的是形状与语义，不是已交付的能力。字段全部由现有 Core 事实导出，见 [SP-2/SP-3](integration-ruling.md)。

## 路由

`GET /api/v5/work-derivations?projectId=<id>&limit=<1..100>&offset=<n>`

沿 `work-activity` / `work-usage` / `work-summary` 的顶层查询族（[index.mjs:130](../../../app/server/index.mjs)–[:135](../../../app/server/index.mjs)）。`limit` 默认 25。只读，无 mutation，不要求 producer 加载，不要求 session 绑定。权限沿现有 project 归属检查，不扩大 scope。

错误：`400 invalid_input`（查询参数非法）、`404 not_found`（project 不存在）。端点未实现期间前端会收到 404 且 body 非本 schema，按 SP1-FE 的 `unimplemented` 态处理。

## 报文

```json
{
  "schemaVersion": 1,
  "asOf": "2026-09-10T12:34:56.000Z",
  "scopeRef": "project:p-1",
  "coverage": { "matters": "complete", "reason": null },
  "page": { "limit": 25, "offset": 0, "total": 2 },
  "matters": [
    {
      "matterId": "m-1",
      "title": "Acme inbound NDA",
      "extensionId": "inbound-nda",
      "version": 7,
      "sourceVersion": 3,
      "snapshotRef": "core-state:9f2c1ab4",
      "availability": "observed",
      "reason": null,
      "derivations": {
        "total": 5,
        "current": 3,
        "stale": 2,
        "byStatus": [
          { "status": "pending",  "current": 1, "stale": 2 },
          { "status": "accepted", "current": 2, "stale": 0 }
        ]
      },
      "staleRefs": [
        {
          "candidateId": "c-9",
          "status": "pending",
          "candidateSourceVersion": 1,
          "matterSourceVersion": 3,
          "supersedes": null
        }
      ],
      "staleRefsTruncated": false,
      "sourceSetChange": {
        "fromRevision": 2,
        "toRevision": 3,
        "added": [{ "sourceId": "s-2", "version": 1 }],
        "replaced": [{ "sourceId": "s-1", "fromVersion": 1, "toVersion": 2 }],
        "removed": []
      }
    }
  ]
}
```

## 语义

`sourceVersion` 为该 Matter 现行源集修订。候选的 `candidateSourceVersion` 低于它，即该派生物落后于现行源集；这是当前状态量，不是事件，不带发生时间。

`availability` 取 `observed`、`partial`、`unavailable` 三值。`partial` 与 `unavailable` 时 `derivations` 各计数为 `null`，`reason` 给出机器可读原因（如 `contract_unsupported`、`read_failed`）。**`null` 与 `0` 不同，前端不得把缺测画成零。**

`coverage.matters` 为 `complete` 或 `partial`；`partial` 时 `reason` 说明哪一类 Matter 未纳入。

`staleRefs` 每个 Matter 至多 20 条，超出置 `staleRefsTruncated: true`；前端须显示截断，不得把截断后的条数当总数。总数取 `derivations.stale`。

`sourceSetChange` 为现行修订与其前一修订的成员差，取自 `source_history`。首个修订无前修订时该字段为 `null`。

`snapshotRef` 绑定本次读取的 Core 状态。分页与下钻须携同一 `snapshotRef`；不一致时拒绝旧观察，不把两次快照的数字并列。

## 合成 fixture（SP1-FE 验证用）

以下为冻结的验证数据，覆盖 SP1-FE 九态。Luna 落为 `app/tests/fixtures/spark-derivations/*.json`，不改形状。

| 文件 | 覆盖 |
|---|---|
| `stale.json` | 两个 Matter，一个有 2 条失效（`pending` 2、`accepted` 0）、`sourceSetChange` 含 added 与 replaced；一个全部 current |
| `quiet.json` | 全部 Matter 的 `stale` 为 0，`sourceSetChange` 为 `null` |
| `empty.json` | `matters: []`，`page.total` 为 0 |
| `partial.json` | 一个 Matter `availability: "partial"`、计数为 `null`、`reason: "contract_unsupported"`；`coverage.matters` 为 `partial` |
| `truncated.json` | 一个 Matter `stale` 为 37、`staleRefs` 20 条、`staleRefsTruncated: true` |

`unimplemented`、`error`、`loading` 三态由 request 桩的 404、抛错与挂起表达，不落 fixture 文件。

## BE-41 后端交付补充（2026-09-10，待组合接收）

实现基线 `1992e90bd92266a9c99076a0709617bae4d4cf67`；后端实现与证据见 [BE-41 回执](../../../evidence/be41-20260910/README.md)。本段覆盖上方“后端未实现”的实现状态，不宣称前端接线或独立产品接受。

- 新增可选查询 `snapshotRef=core-state:<64 lowercase hex>`，不匹配返回 **409 `derivations_snapshot_changed`**。保持原查询兼容；offset>0 未传预期值时仍是一次新观察，消费者必须比对快照。响应额外携顶层 `snapshotRef`，空页也可绑定观察；原 Matter 字段保持。分页顺序是 Matter ID 的 SQLite BINARY 顺序；total 是项目拥有的全部 Matter 数，不是当前页条数。
- 快照是同一 SQLite 只读事务内的项目级投影输入指纹：Matter 身份/版本/源版本/contract/active Artifact/title/extension，全部候选身份/版本/status/payload hash，当前及历史源成员、现行披露政策。覆盖页外变化，绑定 project；不是历史快照存储或整个数据库的字节 hash。不相关 Run、draft、另一项目变化不使该观察失效。
- 权限沿现有认证 human HTTP + Runtime project 存在检查 + Core `app_work_scope` 所有权。不暴露为 agent tool，不以全局 Attention 身份继承权限。查询不要求 Session 或 producer；不迁移 schema、不新建表/日志/store。
- Core 通用字段与领域 contract 无关，因此新领域 contract 不自动令这组通用计数 unavailable，也不解码领域 payload 或推断接受资格。`current` 严格表示 source revision 相等，不表示 base/contract/obligation 当前或可接受。所有持久 status 均计入，包括 accepted/rejected/needs_evidence。
- 前一修订取 `source_history` 中小于现行修订的最大实际 revision，可跳号；source 文件版本可以回退至已有的不可变版本，replaced 的 toVersion 不保证大于 fromVersion。Matter version 合法范围从 **0** 开始。当前前端对这两种值的过严校验须由接线单修复，后端不伪造递增值。
- 缺少当前源历史，或只有大于1的现行修订且无法证明其为首修订，返回该 Matter `partial/source_history_unavailable`，全部计数 null、refs 空、sourceSetChange null。旧迁移只保留当前源成员时不编造前一修订。出现候选源修订领先 Matter 返回 `partial/source_version_inconsistent`。null 在 partial 下表示不可完整观察；仅 observed 下才可解释为无前修订。
- 单 Matter 序列化投影预算8192 UTF-8字节（不含随后附加的固定长度snapshot），超限为 `partial/projection_budget_exceeded`，不暗中截断源差集。整页另有1,000,000 UTF-8字节上限；身份元数据本身仍超限时显式HTTP409 `PROJECTION_BUDGET`，不截断身份。refs 正常至多20条且仍提供精确stale总数。项目任一行partial（包括页外行）使coverage为 `partial/matter_projection_incomplete`；total仍是已识别的全部拥有Matter。
- Core 整体读取/传输失败沿现有错误响应，不伪造空项目或零。没有足够身份信息时不制造 unavailable 行；DTO 对 unavailable/null 的既有语义保留。投影无历史数据回读，不提供candidate下钻新端点。现有客户端仅本地比较快照，顶层空页token与服务端预期token消费待前端接线。
