# SKIN-R2 P0 · DESIGN-CANON-1 实现证据

实现基线：`main@27990dd`。档位：schema 工作面为最克制档；设计总纲和 Agent 排印条款分别按其具名档位落账。实现者不承担本批验收。

## 封存件

- `P0-CANON-PROPOSAL.md`：架构逐行读取并签署的省并表；SHA-256 `5efbb65649198ddc9c9d22b4d40d46e067012360193e15df4afc0a89dc29e5b9`。
- `ARCHITECTURE-SIGNATURE.md`：2026-07-19 夜完整签署正文，与 `SKIN-R2-P1` 同文；两目录文件 SHA-256 均为 `018b071374fbe38279f7e1097120235329ab6335e9d44b13da102e15c1a7640d`。
- 现行凡例：`docs/design/schema-exemplar.md`。
- 机器来源：`docs/design/schema-exemplar.sources.json`。
- 平铺档位账：`docs/design/r2-tier-ledger.json`。

## TDD 红证

先建立 `assert-schema-exemplar.test.mjs`，在验证库尚不存在时运行：

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
apps/desktop/scripts/schema-exemplar-contract-lib.mjs
tests 1 · fail 1 · exit 1
```

最小实现落地后同一测试 5/5 通过。构造反例逐项锁定：缺来源、错哈希、重复权威、历史输入、复制 JSON/TypeScript schema、把 Panels 当前列当跨域字段契约、漏档位、漏批准行、未登记 primitive。独立验收仍须对真实仓库件注入同族反例，不能用本记录替代。

## 来源哈希迁移

签署表封存的是提案前基线哈希。P0 只对已签 `P0-A11` 授权的 `P0-S08` 发生有意迁移：

| 来源 | 签署前 | P0 后 | 解释 |
|---|---|---|---|
| `P0-S08` `visualization-kit.md` | `2ad1f393cf9acd18e32e67bff721010e469d20a7e3bbb319aa3434de12024a50` | `30cf868db4dc86b62df0ad390442e17c0e135fe3432ff90893d7e703e9970234` | 新增 exemplar 双向指针，并把 1px hairline 收窄到次界/数据格；不改 primitive、ViewModel 或 blueprint 语义 |

`P0-S01`–`P0-S07`、`P0-S09` 与签署值逐位相等。manifest 锁 P0 落地后的现行权威值，避免把已授权修改永远误报为漂移。

## 实现者自检（2026-07-19）

| 门 | 结果 |
|---|---|
| `pnpm site:guard` | PASS；58/58 Node tests，含 schema-exemplar 5/5；deslop 扫 857 个现行文本文件 |
| `pnpm lint` | PASS |
| `pnpm test` | PASS；148 files / 1261 tests |
| `pnpm --filter @courtwork/desktop test` | PASS；59 files / 371 tests |
| `pnpm -r build` | PASS；13/14 workspace 有 build 的包全过 |
| `COURTWORK_E2E_PORT=18921 pnpm --filter @courtwork/desktop test:e2e` | PASS；独立端口，静态前链全绿，Playwright 311/311（3.0m） |

## 克制与边界

- 新增视觉元素：0；token 值、组件、布局、schema、scenario、wire、UX 行为与数据区均未改。
- 新概念只有平铺来源/档位 manifest；零新依赖、状态机、持久格式与 schema 生成器。
- 机器门只验引用、闭集与漂移，不生成 schema。
- 事件性摸底报告已退出设计权威目录；现行设计文档、源码和脚本不以历史材料为输入。
