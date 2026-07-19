# SKIN-R2 P1 · 线级复调证据索引

## 权威与档位

- 档位：Agent 通用界面＝**中间档**；113 行各绑定唯一 `P1-Mxx` / `P1-Nxxx`。
- 逐界表：`P1-LINE-PROPOSAL.md`，SHA-256 `ef84049d1cfbd20b8c7ddbcdc8700760b7c58350cbb398a9a398640b57b72423`。
- 架构签署：`ARCHITECTURE-SIGNATURE.md`；签署基线 `main@27990dd`，M01–M08、N001–N105 全签。
- P0 表与签署的仓内投影随 `72787d7` 固化；本目录不依赖聊天口述。

## 实现前 computer-use

`before/` 保存 E01–E15 的真实数据帧和对应 computed-style 账，覆盖 1180×720、1280×720、1440×900、1600×900、2400×1000，以及 welcome、RiskList、Settings、件库、会话、compare、折叠/窄栏/聚焦/预览与密度状态。按签署条款，`E01` welcome 仍为空证据，不补造消费点。

签署后追加的精确全帧位于 `exact-frames/`：

- `1280x720.png`：Safari 顶层 `AXWebArea`，原生比例、无裁切；SHA-256 `c17cb8f9ad2a474c9f38f54b4e6ca5b2a1038bad186d95ad7f664823d4398955`。
- `2400x1000.png`：真实 Safari WebKit iframe 的精确 2400×1000 layout viewport，完整帧经 0.58 缩放后归一；SHA-256 `b2be98d7209fe19ddaadb21f0e814bc575e1b80b5ab28b97c5ef4ad7622d3303`。
- 第二帧只证明布局、状态与线级关系，不作为 native-scale AA 证据。设备、DPR、AX 尺寸、复现夹具和全部文件哈希见 `exact-frames/README.md` 与 `metadata.json`。

## TDD 红证

先改 `tests/e2e/rule-grammar.spec.ts` 的签署后运行时预期，保留旧 CSS，在独立端口执行：

```text
COURTWORK_E2E_PORT=18931 pnpm --filter @courtwork/desktop exec playwright test tests/e2e/rule-grammar.spec.ts --project=app
```

结果 1 failed / 1 passed；失败定点为 `.panel-head` M01 色槽：期望普通 `--border`，实收旧 `--rule-ink`（`rgb(195, 202, 214)`）。随后才落 CSS 最小消费值，在端口 18932 首轮 2/2 复绿。新增的第三例进一步锁 M01、M07 与 N043，e2e floor 由 311 升到 312。

## 旧账迁移

| 维度 | 旧账 | 新账 | 解释 |
|---|---:|---:|---|
| 主界文武线 | 8 | 4 | M02/M04/M07/M08 回单线；M05/M06 全形保留；M01/M03 只退 ink，不退层级 |
| 次界乌丝线 | 105 | 109 | 四条回单线从主界转入次界 |
| 具名不换 | 69 | 69 | EXEMPT 账零移动 |
| 总判词 | — | 留 97 / 减薄 12 / 回单线 4 | 逐行对应签署表 |
| P1 档位账 | 0 | 113 | 既有平铺表追加；target 与提案行均唯一 |

`rule.*` token、采集器和三分类结构均未改变。批准后精确色槽分布为 `--border` 108、`--border-strong` 3、`--rule-ink` 2；这是签署消费值的机器锁，不是新 token 面。

## 实现后与门日志

`after/` 保存相同真实状态的 WebKit 后帧；其 README 逐帧登记 viewport、DPR、状态、裁切与 2400 帧的缩放限制。

实现会话自检（2026-07-19 夜）：

- `pnpm site:guard`：58/58，归档全部前后帧后 deslop 863 active text files；首跑曾定点拒绝 exact-frame wrapper 的外层 raw hex，改为画面外 `transparent` 并同步夹具哈希后复绿。
- `pnpm lint`：通过。
- `pnpm test`：148 files / 1261 tests。
- `pnpm --filter @courtwork/desktop test`：59 files / 371 tests。
- `pnpm -r build`：13 个工作区构建通过。
- `COURTWORK_E2E_PORT=18941 pnpm --filter @courtwork/desktop test:e2e`：独立端口完整前链与 312/312 Playwright 用例通过，用时 3.0m。
- `lint:rule-grammar`：主界 4、次界 109、具名不换 69、总消费点 184；P1 留 97 / 减薄 12 / 回单线 4。
- `lint:schema-exemplar`：通过，P1 113 行平铺档位账保持唯一 target/提案绑定。

以上是实现自检，不是验收放行。独立 clone 仍须实际注入均一 1px、漏账界线、未登记双线、色槽漂移及伴生线复活反例，复位后重跑全门并把结论写入 `apps/desktop/ACCEPTANCE.md`。
