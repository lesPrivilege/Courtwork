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
