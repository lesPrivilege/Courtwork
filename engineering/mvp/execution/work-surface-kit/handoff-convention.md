# 统一体例（Handoff Convention）

2026-09-08，Fable。适用于 Work Surface Kit 及其后所有多 agent 批次。已有裁定（UX 体例、UP/RC/DC 系列、A-1…A-5）不由本页覆盖；本页只规定文件形态与交接字段。

## 1. 角色与写权

| 角色 | 职责 | 写权 | 不得 |
|---|---|---|---|
| Fable | 架构全局、任务切分、契约冻结、裁定、瓶颈实现（模型能力受限处） | 接管记录、工单、契约文件；实现时限工单路径 | 自验自己的实现 |
| Sonnet | 只读 explore：本地摸底、只读 diff、外部溯源、度量 / 捕获脚本 | 仅 explore 卷与 `evidence/` 下捕获 | 写产品代码、下裁定、写"建议采用" |
| Opus | 关键前端设计与实现 | 工单指定的 `app/web/**` 或 `brand/**` 子路径 | 新增 review 状态、改 proposal → commit 语义、把 Expert 特有状态塞回 Chrome、引入依赖 |
| Astra / Luna | 集成、搬迁、基线 SHA、独立验收 | 集成树、`evidence/*-independent/` | 作者自验 |

一条线："可创造 implementation，不可创造 ontology。" 语义词表与状态机由接管记录冻结，实现者只决定如何达到成熟品质。

## 2. 文件种类与必填字段

### explore 卷 `EX-<批>-<n>-<主题>.md`（Sonnet）

卷首：状态（`直接可消费` / `带溯源索引`）、来源文件与 sha256、只读声明、未启动的服务 / 未访问的 URL。

外部溯源表，每行：`索引行 · 索引评级 · 本工程状态（已消费 / 仅登记 / 新）· 既有 ID 或 file:line · 本批应取段落 · 不取理由`。

本地摸底表，每行：`表面 · 文件:行 · 事实 owner（app.mjs / 投影模块 / 服务端契约）· Canon 类（observation / elicitation / permission / proposal review / commit gate / 非 Canon）· 是否重复上游原语 · 是否编码 SE 不变量 · 未核实项`。

结论不超过十行，只陈述观察；裁定属 Fable。

### 工单 `WO-<批>-<n>-<主题>.md`（Fable 发出）

字段：问题 · 输入（列出消费的 explore 卷行号与裁定编号）· 基线 SHA · 写权路径 · 不得改动 · 交付物 · 必须验证（fixture 列与真实列分开）· 验收者 · 端口与数据目录。

### 接管记录 `intake.md`（Fable）

事实表（来源可查的 SHA、路径、数字）→ 编号裁定表（编号 · 裁定 · 理由 · 来源）→ 未决（留用户）。裁定编号跨批唯一：本批 `WK-n`。

### 交付 `delivery.md`（实现者）

commit SHA、改动文件、验证命令与结果原文、未验证清单；视觉批次另附"哪一像素改变了哪一判断"。

### 验收 `adjudication-<who>.md`（非作者）

以实际执行为准；引用他处 PASS 不迁移为本项目 PASS。

## 3. 溯源索引行

```
<ID> · <URL 或 frozen SHA:path> · 访问日 · 许可 · 消费模式 · 转录到 <file:line 或裁定编号>
```

消费模式取索引 §1 五种：REUSE / REVERSE / REFERENCE / PROTOCOL / AVOID-COUPLING。一来源一行；知识落在裁定、token、样板与捕获，不写长篇研究报告。Sonnet 交接可直接消费（卷内已含转录值）或带索引（只登记 ID 与位置），卷首注明。

## 4. 词表优先级

1. SE 既有词：run 八态、question 四态、answer 与 allow / deny 两类、`current` / `content-version`、work-summary 三集合、`activity` / `presence` / `authority`（brand 契约）。
2. Canon 五类：observation / elicitation / permission / proposal review / commit gate。
3. 索引中的 `ReviewItem` 状态词与社区产品状态词：只在 WO-WK3 映射表内出现，不直接进产品文案或代码。

技术词表：原生 ES module、Custom Elements、Shadow DOM、WAAPI；讨论稿中的 React / TSX / Storybook 词汇一律转译，不进工单。

## 5. 证据纪律

- fixture 证据与真实 provider 证据分列；后者在用户于 Web UI 配置 key 之前一律 `not_run`。
- 作者检查 ≠ 独立验收；未执行写"未执行"，不写"应能通过"。
- 视觉判断四轴（Maturity / Identity / Quietness / Durability）由用户作最终裁定。

## 6. 目录、端口、Git

- 每工单独立 worktree 与数据目录；端口自 8850 起按工单递增（8797–8845 已占用）。
- schema 4 数据目录不给旧主机；不读取任何凭据文件。
- 单写者：同一路径同一时间只有一个作者；`app.mjs` 现为 158 KB 单文件，涉及它的工单串行。
- 显式路径 `git add`，不用 `-A`；不改写共享历史。

## 7. 反模式

- 从参考项目反推本地现状；本地事实只来自当前候选源码。
- 把索引整份塞进 prompt；遇到 approval 才追 CopilotKit / Gatewerk / Suna，遇到 trace 才追 assistant-ui / Langfuse。
- 一个 Expert 一套 UI；一个 Approve 按钮兼任 permission、proposal review 与 commit。
- 为方便施工新增状态、字段或端点；缺契约时记"待验接口"，不以本地状态伪造权威。
