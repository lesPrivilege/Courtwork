# SKIN-R2 P1 · 线级逐界架构签署包（只读提案）

- 基线：`main@19242d273f12b53f4d41086ff2ba18405404ad21`。
- 机器账：现行 `assert-rule-grammar.mjs` 的 8 主界 + 105 次界；本表没有修改 token、门、三分类账或消费层。
- 当前值解析：`--rule-major=2px`、`--rule-minor=1px`、`--rule-gap=2px`、`--rule-ink=#c3cad6`、`--border=#d5dae3`；线型均为 solid。
- 档位：全部 desktop selector 属 Agent 中间档；表格、文书、schema 内部按最克制口径裁。
- 判词定义：`留`＝完全保持；`减薄`＝不改宽度 token，只把强描边消费降到既有 `--border`；`回单线`＝改为 `--rule-minor solid --border` 并撤对应文武线伪元素。
- 浏览器证据：主架构会话已用 Codex in-app Browser 在独立端口 `18831` 完成 E01–E15；截图和 computed-style JSON 位于 `/tmp/skin-r2-p1-evidence/`。`S:<line>` 是同一基线的机器账源锚。IAB 在请求 viewport 下完成 layout/computed-style，但 PNG 输出受宿主 surface 裁切；这两类事实分开记账。
- 运行时抽核确认：主界主体为 `2px solid rgb(195, 202, 214)`，伪元素为同色 `1px solid`、gap `2px`；次界抽核为 `1px solid rgb(213, 218, 227)`。与 root token 静态解析逐值相等。

## 证据矩阵

| ID | 状态 | viewport | 密度/目的 |
|---|---|---:|---|
| E01 | welcome（IAB surface 高度受限） | 1180×664 | body/meta |
| E02 | 真实 sample RiskList 默认窄右栏 | 1180×720 | dense/meta；精确 1180 档 |
| E03 | RiskList + 修订预览展开（IAB surface 高度受限） | 1440×810 | dense/reading |
| E04 | Settings | 1440×900 | body/meta；精确 1440 档 |
| E05 | RiskList 宽态（IAB surface 宽度受限） | 1778×1000 | dense；宽态中继帧 |
| E06 | Timeline | 1600×900 | dense/meta |
| E07 | Graph | 1600×900 | dense |
| E08 | Matrix | 1600×900 | dense |
| E09 | Revision | 1600×900 | reading/dense |
| E10 | 左折 | 1600×900 | 响应态 |
| E11 | 右折 | 1600×900 | 响应态 |
| E12 | Focus | 1600×900 | 聚焦态 |
| E13 | Compare | 1600×900 | 比较态 |
| E14 | visual-gallery | 1440×900 | 十二族 |
| E15 | Session history | 1440×900 | 台账态 |

实机显影覆盖：E04=`panel/preview/settings/scene/owner`；E05–E09=`panel/preview/scene/owner`；E10=`panel/preview/scene`；E11=`panel/scene/owner`；E12=`panel/preview`；E13=`pane/preview/scene`；E14=`gallery`；E15=`panel/session-history/owner`。E02/E03 另有可见边框全列表，覆盖 `dense-row`、`risk-list`、`risk-status-ledger`、`verified-block`、`view-tabs` 等克制档消费点。E01 welcome 没有指定主界显影，保留为空证据而非补造。

## 逐界表

| ID | 路由/状态 | selector · side | 档位 | 当前 computed/源值 | 语义边界 | 证据 | 提案 | 批准后精确消费值 | 理由 |
|---|---|---|---|---|---|---|---|---|---|
| M01 | Work/Turn | `.panel-head · bottom` | Agent 中间档（内部克制） | `2px solid #c3cad6` + `::after 1px solid #c3cad6 @ gap 2px` | 面板标题带 ↔ 面板内容 | E02/E03/E05 · S:382 | 减薄 | 保留文武线几何；主/细线颜色改 `var(--border)` | 通用 panel 数量多；留层级但退对比，避免重复深线抢正文。 |
| M02 | Work/Panes | `.pane-head · bottom` | Agent 中间档（内部克制） | `2px solid #c3cad6` + `::after 1px solid #c3cad6 @ gap 2px` | 工作面窗格头 ↔ 窗格内容 | E13 · S:1100 | 回单线 | `border-bottom: var(--rule-minor) solid var(--border)`；移除该 selector 的 `::after` | compare 真帧中窗格头与 preview 宿主双线叠出过密；schema/文书窗格只需单线。 |
| M03 | Work/Turn | `.preview-host-head · bottom` | Agent 中间档（内部克制） | `2px solid #c3cad6` + `::after 1px solid #c3cad6 @ gap 2px` | 阅读宿主头 ↔ 文档内容 | E03 · S:1069 | 减薄 | 保留文武线几何；主/细线颜色改 `var(--border)` | 阅读宿主仍需与内容分界，但深色双线会压过文书正文。 |
| M04 | Session history | `.session-history-head · bottom` | Agent 中间档（内部克制） | `2px solid #c3cad6` + `::after 1px solid #c3cad6 @ gap 2px` | 会话台账头 ↔ 台账列表 | E15 · S:516 | 回单线 | `border-bottom: var(--rule-minor) solid var(--border)`；移除该 selector 的 `::after` | E15 空台账真帧中横贯全页的双线成为主角；单线足以界定列表起点。 |
| M05 | Settings | `.settings-header · bottom` | Agent 中间档（内部克制） | `2px solid #c3cad6` + `::after 1px solid #c3cad6 @ gap 2px` | 设置页头 ↔ 设置体 | E04 · S:1439 | 留 | 保持 `var(--rule-major) solid var(--rule-ink)` + `::after` minor @ gap | 全屏设置层的唯一总界；层级最高且不进入数据区。 |
| M06 | visual-gallery | `.gallery-header · bottom` | Agent 中间档（内部克制） | `2px solid #c3cad6` + `::after 1px solid #c3cad6 @ gap 2px` | 件库页头 ↔ 件库网格 | E14 · S:1778 | 留 | 保持 `var(--rule-major) solid var(--rule-ink)` + `::after` minor @ gap | 件库根页头是唯一总界，且用于观察两档线语法。 |
| M07 | Work/Turn | `.scene-strip · top` | Agent 中间档（内部克制） | `2px solid #c3cad6` + `::after 1px solid #c3cad6 @ gap 2px` | 正文列 ↔ 页脚场景带 | E02/E03/E05 · S:725 | 回单线 | `border-top: var(--rule-minor) solid var(--border)`；移除该 selector 的 `::after` | composer 上方双线在高频主流程中过显眼；单线已足以分开场景带。 |
| M08 | Case rail | `.rail-user-wrap · top` | Agent 中间档（内部克制） | `2px solid #c3cad6` + `::after 1px solid #c3cad6 @ gap 2px` | 左栏案件列表 ↔ 栏脚 owner 区 | E02/E05/E15 · S:487 | 回单线 | `border-top: var(--rule-minor) solid var(--border)`；移除该 selector 的 `::after` | E02/E15 真帧中栏脚双线权重接近根页头；单线仍清楚终止案件列表。 |
| N001 | Session history | `.session-entry · bottom` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 行分隔 | E15 · S:518 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N002 | Session history | `.session-transcript-turn · bottom` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 行分隔 | E15 · S:525 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N003 | Work/RiskList | `.dense-row · bottom` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 行分隔 | E02/E03/E05 · S:1109 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N004 | Work/RiskList | `.nonapplied-item · bottom` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 行分隔 | E02/E03/E05 · S:1228 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N005 | Work/Revision | `.originals-list li · bottom` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 行分隔 | E09 · S:1344 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N006 | Settings | `.settings-row · bottom` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 行分隔 | E04 · S:1468 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N007 | visual-gallery | `.gallery-ledger li · bottom` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 行分隔 | E14 · S:1813 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N008 | visual-gallery | `.gallery-timeline li · left` | Agent 中间档（内部克制） | `1px solid #c3cad6` (`var(--rule-minor) var(--border-strong)`) | 行分隔（时间轴轨） | E14 · S:1805 | 减薄 | 保持 `var(--rule-minor)`；颜色改 `var(--border)` | 仍保留单线语义；现强描边在克制档没有独有状态含义。 |
| N009 | Work/Turn | `.visual-decision-actions .question-option · bottom` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 行分隔 | E02 + S · S:671 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N010 | Work/Turn | `.interaction-anchor · bottom` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 行分隔 | E02 + S · S:706 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N011 | Work/Graph | `.relation-list button · bottom` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 行分隔 | E07 · S:1177 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N012 | Work/Output | `.file-ops-table th, .file-ops-table td · bottom` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 单元格网格 | E02 + S · S:462 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N013 | Work/RiskList | `.table-head · bottom` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 单元格网格（表头行） | E02/E03/E05 · S:1107 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N014 | Work/RiskList | `.artifact-table th, .artifact-table td · right` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 单元格网格 | E02/E03/E05 · S:1119 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N015 | Work/RiskList | `.artifact-table th, .artifact-table td · bottom` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 单元格网格 | E02/E03/E05 · S:1119 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N016 | Work/Matrix | `.matrix-wrap th · right` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 单元格网格 | E08 · S:1186 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N017 | Work/Matrix | `.matrix-wrap th · bottom` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 单元格网格 | E08 · S:1186 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N018 | Work/Matrix | `.matrix-wrap td · right` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 单元格网格 | E08 · S:1188 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N019 | Work/Matrix | `.matrix-wrap td · bottom` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 单元格网格 | E08 · S:1188 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N020 | Welcome/Composer | `.md-table th, .md-table td · right` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 单元格网格 | E01/E02 · S:1716 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N021 | Welcome/Composer | `.md-table th, .md-table td · bottom` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 单元格网格 | E01/E02 · S:1716 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N022 | Work/RiskList | `.risk-status-ledger > div · right` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 单元格网格 | E02/E03/E05 · S:1271 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N023 | visual-gallery | `.gallery-grid · left` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 单元格网格 | E14 · S:1782 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N024 | visual-gallery | `.gallery-specimen · right` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 单元格网格 | E14 · S:1783 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N025 | visual-gallery | `.gallery-specimen · bottom` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 单元格网格 | E14 · S:1783 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N026 | visual-gallery | `.gallery-specimen th, .gallery-specimen td · all` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 单元格网格 | E14 · S:1802 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N027 | visual-gallery | `.gallery-coverage · top` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 单元格网格 | E14 · S:1815 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N028 | visual-gallery | `.gallery-coverage · left` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 单元格网格 | E14 · S:1815 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N029 | visual-gallery | `.gallery-coverage div · right` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 单元格网格 | E14 · S:1816 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N030 | visual-gallery | `.gallery-coverage div · bottom` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 单元格网格 | E14 · S:1816 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N031 | visual-gallery | `.gallery-graph · top` | Agent 中间档（内部克制） | `1px solid #c3cad6` (`var(--rule-minor) var(--border-strong)`) | 单元格网格 | E14 · S:1807 | 减薄 | 保持 `var(--rule-minor)`；颜色改 `var(--border)` | 仍保留单线语义；现强描边在克制档没有独有状态含义。 |
| N032 | visual-gallery | `.gallery-graph · left` | Agent 中间档（内部克制） | `1px solid #c3cad6` (`var(--rule-minor) var(--border-strong)`) | 单元格网格 | E14 · S:1807 | 减薄 | 保持 `var(--rule-minor)`；颜色改 `var(--border)` | 仍保留单线语义；现强描边在克制档没有独有状态含义。 |
| N033 | visual-gallery | `.gallery-graph span · right` | Agent 中间档（内部克制） | `1px solid #c3cad6` (`var(--rule-minor) var(--border-strong)`) | 单元格网格 | E14 · S:1808 | 减薄 | 保持 `var(--rule-minor)`；颜色改 `var(--border)` | 仍保留单线语义；现强描边在克制档没有独有状态含义。 |
| N034 | visual-gallery | `.gallery-graph span · bottom` | Agent 中间档（内部克制） | `1px solid #c3cad6` (`var(--rule-minor) var(--border-strong)`) | 单元格网格 | E14 · S:1808 | 减薄 | 保持 `var(--rule-minor)`；颜色改 `var(--border)` | 仍保留单线语义；现强描边在克制档没有独有状态含义。 |
| N035 | Work/Output | `.file-ops-toolbar · all` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 内层容器 | E02 + S · S:453 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N036 | Work/Output | `.file-ops-table · all` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 内层容器（表框） | E02 + S · S:461 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N037 | Work/Output | `.file-ops-report · all` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 内层容器 | E02 + S · S:465 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N038 | Work/Turn | `.progress-card · top` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 内层容器 | E02 + S · S:605 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N039 | Work/Turn | `.progress-card · bottom` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 内层容器 | E02 + S · S:605 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N040 | Work/Turn | `.interaction-turn-card · all` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 内层容器（轻卡） | E02 + S · S:663 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N041 | Work/Turn | `.generated-callout · all` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 内层容器 | E02 + S · S:718 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N042 | Work/Turn | `.model-config-reasoning · all` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 内层容器 | E02 + S · S:952 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N043 | Work/Turn | `.sample-tour · all` | Agent 中间档（内部克制） | `1px solid #c3cad6` (`var(--rule-minor) var(--border-strong)`) | 内层容器 | E02 + S · S:557 | 减薄 | 保持 `var(--rule-minor)`；颜色改 `var(--border)` | 仍保留单线语义；现强描边在克制档没有独有状态含义。 |
| N044 | Work/Turn | `.data-card, .detail-card · all` | Agent 中间档（内部克制） | `1px solid #c3cad6` (`var(--rule-minor) var(--border-strong)`) | 内层容器 | E02 + S · S:592 | 减薄 | 保持 `var(--rule-minor)`；颜色改 `var(--border)` | 仍保留单线语义；现强描边在克制档没有独有状态含义。 |
| N045 | Work/Turn | `.turn-card-gate · all` | Agent 中间档（内部克制） | `1px solid #c3cad6` (`var(--rule-minor) var(--border-strong)`) | 内层容器（轻卡） | E02 + S · S:630 | 留 | 保持 `var(--rule-minor) solid var(--border-strong)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N046 | Work/Graph | `.graph-canvas · all` | Agent 中间档（内部克制） | `1px solid #c3cad6` (`var(--rule-minor) var(--border-strong)`) | 内层容器（图谱画布） | E07 · S:1153 | 留 | 保持 `var(--rule-minor) solid var(--border-strong)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N047 | Work/Turn | `.s3-launcher · all` | Agent 中间档（内部克制） | `1px solid #c3cad6` (`var(--rule-minor) var(--border-strong)`) | 内层容器 | E02 + S · S:1208 | 减薄 | 保持 `var(--rule-minor)`；颜色改 `var(--border)` | 仍保留单线语义；现强描边在克制档没有独有状态含义。 |
| N048 | Work/Turn | `.work-recover · all` | Agent 中间档（内部克制） | `1px solid #c3cad6` (`var(--rule-minor) var(--border-strong)`) | 内层容器 | E02 + S · S:1216 | 减薄 | 保持 `var(--rule-minor)`；颜色改 `var(--border)` | 仍保留单线语义；现强描边在克制档没有独有状态含义。 |
| N049 | Work/Output | `.work-output-result · all` | Agent 中间档（内部克制） | `1px solid #c3cad6` (`var(--rule-minor) var(--border-strong)`) | 内层容器 | E02 + S · S:1219 | 减薄 | 保持 `var(--rule-minor)`；颜色改 `var(--border)` | 仍保留单线语义；现强描边在克制档没有独有状态含义。 |
| N050 | Work/RiskList | `.nonapplied-confirm · all` | Agent 中间档（内部克制） | `1px solid #c3cad6` (`var(--rule-minor) var(--border-strong)`) | 内层容器 | E02/E03/E05 · S:1223 | 留 | 保持 `var(--rule-minor) solid var(--border-strong)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N051 | Work/Revision | `.draft-panel > header · all` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 内层容器（文书工作面·头） | E09 · S:1322 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N052 | Work/Revision | `.draft-editor, .draft-reading · all` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 内层容器（文书纸面） | E09 · S:1327 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N053 | Work/Revision | `.work-draft-toolbar · all` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 内层容器 | E09 · S:1354 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N054 | Work/Revision | `.work-draft-body · all` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 内层容器（工作稿面） | E09 · S:1359 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N055 | Settings | `.settings-memory-item · all` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 内层容器 | E04 · S:1480 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N056 | Settings | `.settings-fields fieldset · all` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 内层容器 | E04 · S:1497 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N057 | Settings | `.settings-path · all` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 内层容器 | E04 · S:1535 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N058 | Settings | `.settings-credential-embed · all` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 内层容器 | E04 · S:1565 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N059 | Welcome/Composer | `.paste-block · all` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 内层容器 | E01/E02 · S:1701 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N060 | Welcome/Composer | `.md-table-wrap · all` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 内层容器（表框） | E01/E02 · S:1714 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N061 | Welcome/Composer | `.composer-entry-guidance · all` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 内层容器 | E01/E02 · S:1733 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N062 | Welcome/Composer | `.composer-disabled-reason · all` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 内层容器 | E01/E02 · S:1735 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N063 | visual-gallery | `.gallery-chain li · all` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 内层容器 | E14 · S:1799 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N064 | visual-gallery | `.gallery-specimen .visual-decision · all` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 内层容器 | E14 · S:1827 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N065 | Work/Turn | `.visual-decision-actions · top` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 段内分隔 | E02 + S · S:670 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N066 | Work/Turn | `.visual-partial · top` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 段内分隔 | E02 + S · S:695 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N067 | Work/Turn | `.visual-partial ul · top` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 段内分隔 | E02 + S · S:700 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N068 | Work/Turn | `.interaction-anchor-ledger · top` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 段内分隔 | E02 + S · S:705 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N069 | Work/Turn | `.interaction-submit-error, .turn-recovery-error · top` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 段内分隔 | E02 + S · S:712 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N070 | Work/Turn | `.interaction-recorded · top` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 段内分隔 | E02 + S · S:713 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N071 | Work/Turn | `.stack-module · bottom` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 段内分隔（模块栈） | E02 + S · S:993 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N072 | Work/Turn | `.context-next-step · top` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 段内分隔 | E02 + S · S:1022 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N073 | Work/Turn | `.utility-dock-popover > header · bottom` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 段内分隔（浮层内头） | E02 + S · S:1064 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N074 | Work/RiskList | `.artifact-table-view > h3 · bottom` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 段内分隔 | E02/E03/E05 · S:1116 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N075 | Work/RiskList | `.verified-block · top` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 段内分隔 | E02/E03/E05 · S:1136 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N076 | Work/RiskList | `.verified-block · bottom` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 段内分隔 | E02/E03/E05 · S:1136 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N077 | Work/Graph | `.relation-list h3 · bottom` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 段内分隔 | E07 · S:1176 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N078 | Work/RiskList | `.submission-note · bottom` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 段内分隔 | E02/E03/E05 · S:1205 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N079 | Work/RiskList | `.nonapplied-confirm > header · bottom` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 段内分隔 | E02/E03/E05 · S:1224 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N080 | Work/RiskList | `.nonapplied-confirm > footer · top` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 段内分隔 | E02/E03/E05 · S:1235 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N081 | Work/RiskList | `.risk-master-detail · bottom` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 段内分隔 | E02/E03/E05 · S:1239 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N082 | Work/RiskList | `.risk-status-ledger · top` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 段内分隔 | E02/E03/E05 · S:1270 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N083 | Work/RiskList | `.risk-status-ledger · bottom` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 段内分隔 | E02/E03/E05 · S:1270 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N084 | Work/RiskList | `.evidence-stack .verified-block:last-child · bottom` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 段内分隔 | E02/E03/E05 · S:1290 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N085 | Work/Revision | `.document-preview header · bottom` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 段内分隔 | E09 · S:1298 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N086 | Settings | `.provider-dialog header · bottom` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 段内分隔（浮层内头） | E04 · S:1395 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N087 | Settings | `.provider-dialog footer · top` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 段内分隔（浮层内脚） | E04 · S:1411 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N088 | Settings | `.credential-modes · bottom` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 段内分隔 | E04 · S:1399 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N089 | Settings | `.settings-developer · top` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 段内分隔 | E04 · S:1509 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N090 | Settings | `.settings-promise-section · bottom` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 段内分隔 | E04 · S:1543 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N091 | Work/Turn | `.palette-input · bottom` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 段内分隔（浮层内头） | E02 + S · S:443 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N092 | Welcome/Composer | `.paste-block .collapse-toggle · top` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 段内分隔 | E01/E02 · S:1722 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N093 | visual-gallery | `.gallery-specimen > header · bottom` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 段内分隔 | E14 · S:1784 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N094 | visual-gallery | `.gallery-specimen > footer · top` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 段内分隔 | E14 · S:1792 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N095 | visual-gallery | `.gallery-ledger · top` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 段内分隔 | E14 · S:1812 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N096 | Case rail | `.rail-case-expand · left` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 面内分栏（树形缩进轨） | E02/E05/E10 · S:471 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N097 | Work/Turn | `.utility-dock-item · right` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 面内分栏 | E02 + S · S:1051 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N098 | Work/Turn | `.preview-scroll-progress · left` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 面内分栏 | E02 + S · S:1074 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N099 | Work/Graph | `.relation-list · left` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 面内分栏 | E07 · S:1175 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N100 | Work/Graph | `.relation-list · top` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 面内分栏（窄容器覆写） | E07 · S:1312 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N101 | Work/RiskList | `.risk-list · right` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 面内分栏 | E02/E03/E05 · S:1245 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N102 | Work/RiskList | `.risk-list · bottom` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 面内分栏（窄容器覆写） | E02/E03/E05 · S:1308 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N103 | Work/Revision | `.work-draft-list · right` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 面内分栏 | E09 · S:1360 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N104 | Settings | `.settings-nav · right` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 面内分栏（判据 b/c：竖分归界行，且自身为滚动容器） | E04 · S:1447 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |
| N105 | Work/RiskList | `.view-tabs · bottom` | Agent 中间档（内部克制） | `1px solid #d5dae3` (`var(--rule-minor) var(--border)`) | 段内分隔（判据 c：overflow-x 滚动容器，细线会随 tab 卷走） | E02/E03/E05 · S:1034 | 留 | 保持 `var(--rule-minor) solid var(--border)` | 已是最小 1px 单线；继续减宽会引入亚像素/新机制，删除则损伤现有结构或语义。 |

## 汇总与签署条件

- 提案统计：留 97、减薄 12、回单线 4，合计 113。
- 表格结构自检：M=8、N=105；全部 M/N 行 `awk -F'|'` 均为 `NF=12`，selector/side 使用 `·` 分隔，不含破坏 Markdown 列的裸管线字符。
- 架构签署前不得实现任何行。签署时逐行填写批准/驳回及替代值；不得用本表批量判词覆盖单行决定。
- E01–E15 状态矩阵已真机采集；主要 selector 与六类次界 computed style 已核。未在该状态显影的长尾 selector 只绑定状态帧 + `S` 源账，不宣称逐元素可见。
- **全尺寸未完成**：E01–E15 已采，但精确 1280×720 与 2400×1000 全帧未覆盖；Safari 的 JavaScript-from-Apple-Events 与 remote automation 均关闭，坐标法无法稳定进入 RiskList，故没有用不可复核的截图补账。113 行可供架构逐行裁，但不可据此放行 P1 全尺寸 computer-use 审视；消费值实现前须补足这两档精确全帧。
- P1 实现批只允许修改批准行的消费值和相应统计/门条款；`rule.*` token、采集器、三分类账结构零动。
