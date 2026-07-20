# VERSIONAL-LANG-3 · `d32985f` 独立验收

日期：2026-07-20（Asia/Singapore）

**裁决：❌ 拒绝。** 六类要求的前向红证、Pages 双宗、截图字节门和完整全仓测试都成立；但 Agent
第四类重要标题 `.gallery-header h1` 在其真实入口 `/visual-gallery.html` 的深色浏览器环境中仍是
浅宗冷墨，不是签署的泥金。当前静态合同与 e2e 都漏掉了这个自然运行缺口，不能用 322/322 代替
四白名单全部成立。

## 对象与隔离

- 最终对象：`d32985ff255aa2b9535e2fbfab3fdd998d3bb638`；实现提交
  `920bdaee8c60768e6a3d3aa290092646e0b3c6fa` 是其直接祖先。
- fresh clone：`/tmp/courtwork-vl3-reacceptance.Li6FMD/repo`；验收分支
  `codex/versional-lang-3-accept-d32985f`。
- Pages runtime 独立端口 `19961`；完整 desktop e2e 独立端口 `19962`；Agent 标题补充探针独立端口
  `19963`。未复用实现会话服务或共享工作树。
- 验收未改实现、契约或机器门；所有 mutation 均逐件复原，报告前实现树零 diff。

## 六类真实红证

| 反例 | 实跑结果 |
|---|---|
| Pages 深宗 `--bg-app #0F1622 → #101722` | `VL3-C01 Pages 磁青宗色阶漂移：--bg-app` |
| Agent dark `--important-title #d9ae6a → #d8ae6a` | `VL3-C02 Agent／Pages 重要标题双宗 token 未同源` |
| `.zh-doc` 新增 `color:var(--important-title)` | `VL3-T02 泥金越界进入正文或数据：.zh-doc` |
| 删除 ledger `VL3-C01` | `已签提案行缺失：VL3-C01` |
| `VL3-T01` 改绑 `pages-experimental` | `档位漂移：应为 agent-interface` |
| 复活 `.document-preview header` 底线 | versional 报 `VL2-L02`；rule-grammar 同时报未归一分类及 routine 线复活 |
| `11-milestone-dossier-1440.webp` 第 100 字节 XOR 1 | `VL3-S01` 13 项中 12 过 1 红；actual SHA `ce9a3c…87ea` 不等于 manifest `4a5977…3460` |

WebP 翻回同一字节后 SHA 恢复为
`4a5977fb9fc87a3624efe62ec6bd47c745429d2d1303611e6343adbaf4f13460`，合同 **13/13** 回绿。
ledger 缺行与错档分别实跑，未以单元测试中的内存 mutation 代替活动账文件。

## Pages 1280 双宗实帧

仓库 Playwright runtime 在 1280×900、reduced-motion 下分别以 light/dark 媒体宗遍历整页后回顶
截图并读取 computed style：

| 项 | light | dark |
|---|---|---|
| `--bg-app / surface / raised` | `#F7F8FA / #F2F4F7 / #FFFFFF` | `#0F1622 / #16202F / #223047` |
| `--important-title` | `#232B38` | `#D9AE6A` |
| Hero / 卷级标题 | `rgb(35,43,56)` / 700 | `rgb(217,174,106)` / 700 |
| body / 文书说明 / 数据 | `35,43,56 / 85,97,122 / 35,43,56` | `228,233,241 / 169,180,198 / 228,233,241` |
| html/body 水平溢出 | `0 / 0` | `0 / 0` |
| broken images | 0 | 0 |

三枚当前响应式产品图均加载；六枚 WebP 的 manifest SHA 基线通过。两宗 viewport 帧目视均无破图、
裁字或横向滚动，深宗标题与正文／数据明确分色。

## 阻断：第四类 Agent 标题没有自然进入深宗

独立端口 `19963` 以 `colorScheme:dark` 启动真实 desktop 页面：

| 已签消费者 | computed 字重 | computed 色 |
|---|---:|---|
| `.welcome-slogan` | 600 | `rgb(217,174,106)` |
| `.chat-titlebar .chat-case-title` | 600 | `rgb(217,174,106)` |
| `.settings-header h1` | 600 | `rgb(217,174,106)` |
| `.gallery-header h1`（`/visual-gallery.html`） | 600 | **`rgb(35,43,56)`** |

前三项所在应用根为 `data-theme=dark`，body 为 `rgb(228,233,241)`，标题／正文分色成立。第四项的
`visual-gallery.html` 却固定 `<meta name="color-scheme" content="light">`，其
`preview/gallery/main.tsx` 只挂 React gallery，不装 theme controller，也不解析 system 宗；因此
真实 dark 浏览器上下文下根没有 `data-theme=dark`。CSS 手工写入该 attribute 后会变金，但人工
改 DOM 不是自然运行证据。

现有 `validateVersionalSite` 的 `VL3-T01` 正向检查 case/welcome/settings，**漏检
`.gallery-header h1`**；`visual-gallery.spec.ts` 只验十二族结构和 fixture，完整 322 e2e 因而保持绿。
修复需二选一并重新签署／复验：

1. 给 gallery 入口复用同一 resolved-theme 边界，并加 dark 自然运行的 computed 断言；或
2. 若 gallery 本就必须永久浅宗，从 `VL3-T01` 四白名单撤回“图谱总题”并由产品／架构改签。

无论选哪条，静态合同须把第四消费者纳入正向闭集，避免再次出现“CSS 有配方、入口不消费”。

## 完整门

| 门 | 结果 |
|---|---|
| `pnpm install --frozen-lockfile` | 14 projects / 1,047 packages，exit 0 |
| `pnpm -r build` | 13/14 workspace；desktop 3,580 modules，exit 0 |
| `pnpm test` | 148 files / 1,261 tests，exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm site:guard` | 89/89；报告 tip deslop 916 active files，exit 0 |
| `pnpm site:build` | exit 0 |
| `COURTWORK_E2E_PORT=19962 pnpm --filter @courtwork/desktop test:e2e` | 静态前链全绿；Playwright **322/322（3.2m）** |

本轮拒绝只针对 `VL3-T01` 第四消费者的真实深宗解析及其漏门；不否定已成立的 Pages 双宗、截图
字节封存、三类 Agent 标题、VL2 五线旧账迁移或其余全仓回归。未 push、未部署、未更新
`docs/status/current.md`。
