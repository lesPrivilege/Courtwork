# 第四轮派单（Fable，2026-09-09）

基线：Astra 合流后的清洁 `main` `1688a7b`；FE-01 合流后 `2b6c221`（WK-106）（WK11 + `claude/fable-round4` 已入，208/208，见 [合流证据](../../../../evidence/wk11-main-integration-20260909/README.md)）。本 Fable 会话文档支 `claude/fable-round4b`（已合流）→ `claude/fable-round4c`（worktree `/private/tmp/se-fable-r4c`，只有文档），Astra 合流。Opus 档位经用户级 agent 定义 `~/.claude/agents/opus-wo-low.md` / `opus-wo-medium.md`（`effort:` 字段）设置。

| 单 | 执行者 | 树 / 分支 / 端口 | 输入 | 交付 | 状态 |
|---|---|---|---|---|---|
| EX-WK9 材质来源 | Sonnet | 只读，无服务 | [EX-WK9](work-orders/EX-WK9-material-sources.md) | [ex-wk9](explore/ex-wk9-material-sources.md) | 已回执，消费为 WK-104 |
| FE-01 词表 + IA + chrome + composition | Opus | `/private/tmp/se-agent-fe01` · `claude/fe01-vocab-ia` · 8885 · 数据 `/private/tmp/se-agent-fe01-data` | [WO-FE-round4 §FE-01](work-orders/WO-FE-round4.md)（含 WK-100 / WK-102 追加项） | [delivery-fe01](delivery-fe01.md) `bfefcd2` + 复核 | 已回执，WK-105 接受，待 Astra 合流 |
| FE-02 Models & Connections | Opus，agent 定义 `opus-wo-low`（effort: low） | `/private/tmp/se-agent-fe02` · `claude/fe02-models` · 8887（MCP fixture 8888）· 数据 `/private/tmp/se-agent-fe02-data`，基线 `2b6c221` | WO-FE-round4 §FE-02（第 0 项 `--nav` 256；BE-17/18 未交付不画按钮） | `delivery-fe02.md` | 已交付 `38717bd`，Fable 复核 WK-107（[intake-round-3 §4m](intake-round-3.md)）：六项待裁裁毕，② display name 由第二个 `opus-wo-low` 修订 `a82c192`；Fable 复跑一致，接受；分支头 `565d18c`（§13），交 Astra 合流。提示词见 [WO-FE02-dispatch-prompt](work-orders/WO-FE02-dispatch-prompt.md) |
| FE-03 Chat / Work / Memory shell + 第 0 项 BE-17/18 消费 | Opus，`opus-wo-low`（effort: low） | `/private/tmp/se-agent-fe03` · `claude/fe03-chat-work` · 8895（MCP fixture 8896）· 数据 `/private/tmp/se-agent-fe03-data`，基线 `4d9714e` | WO-FE-round4 §FE-03 + WK-108 | `delivery-fe03.md` | 已交付 `fabfd22`，Fable 复核 WK-109（[intake-round-3 §4o](intake-round-3.md)）接受，§13 在分支头；交 Astra 合流 |
| FE-04 Primitive reconciliation | Opus，`opus-wo-medium`（effort: medium） | `/private/tmp/se-agent-fe04` · `claude/fe04-primitives` · 8897（MCP fixture 8898）· 数据 `/private/tmp/se-agent-fe04-data`，基线 `af95bcb` | WO-FE-round4 §FE-04 + EX-WK8 台账 + WK-112 (d) 状态矩阵 | `delivery-fe04.md` | 已派（2026-09-09）；提示词 [WO-FE04-dispatch-prompt](work-orders/WO-FE04-dispatch-prompt.md) |
| EX-CC1 三面贯通 + tab strip 宿主契约探索 | Sonnet（只读，不写代码） | 读 r4d 树 | WK-110 (c) | `explore/ex-cc1-three-pane-tabs.md` | 已回执，消费为 WK-113（[intake §4r](intake-round-3.md)） |
| EX-CC2 模块首页量测与数据接缝 | Sonnet（只读，不写代码） | 读 r4d 树 | WK-110 (d) | `explore/ex-cc2-home-modules.md` | 已派（2026-09-09） |
| CC-S → CC-W → CC-D0 → FE-05 | Opus 串行 | 各自从上一单合流后的清洁 main | WK-110 次序 | `delivery-cc-*.md` | 排队（CC-W / CC-D0 待探索回执与几何合同修订） |
| FE-05 材质与光效 | Opus | FE-04 合流后 | WO-FE-round4 §FE-05 + EX-WK9 | `delivery-fe05.md` | 待 EX-WK9 回执后由 Fable 填值 |

规则：Opus 单一 writer 串行；每单固定 SHA、消融表、text-sweep 增量、分配反例、五轮收敛表（WK-100）；作者验证与 Astra 独验分列；视觉四轴留用户。后端前置 BE-1/3、12、14…20 仍由 [backend-requests](backend-requests.md) 维护；FE-02 / FE-03 未交付能力不画可用按钮。

合流顺序：`claude/fe01-vocab-ia`（代码 + 交付 + 复核）→ `claude/fable-round4b`（只有文档，无文件重叠）。Astra 独验 FE-01 时用 `evidence/fe01/rc/` 的改写副本，不用 wk11 原副本（旧 IA）。
