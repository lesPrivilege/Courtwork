# 归档索引

历史材料唯一存放处。本索引是归档的**唯一入口**：续行会话按此定位历史证据，不逐文件回读原文。

## 使用纪律

归档材料是历史证据链，不是现行规范。`archive/` 全部内容不参与实现或验收，不得被现行文档、源码、脚本或 SPEC 直接引用（唯一例外见 `docs/README.md`「史料引用例外」：ADR 来源段与就绪图工单行可引路径作历史线索）。归档结论——即便文内标有「架构定调」——只有经现行 ADR、SPEC 或就绪图工单逐条吸收后才具约束力；升格动作须经架构拍板并在现行文档留痕。归档报告中的行号、计数、版本号与外部事实是当时工作树的历史坐标，会漂移；当前验收只认 `docs/status/current.md` 与现行 SPEC/ACCEPTANCE，不得从归档恢复字段、状态或验收标准。reconnect 时架构层文档（`docs/README.md` 起）自足开工，仅在追查现行规则历史成因或核实调研结论是否被推翻时按本索引定位。

## docs-legacy-2026-07-13/

2026-07-13 文档重整时退出权威链的第一代 `docs/` 全量快照（基线 `f03e742`，143 文件，原编号 00–94 + superpowers/plans）。MANIFEST.md 逐段标注归档原因（已省并/已由 ADR 重述/已被后续契约替代/证据快照）。整体视为已升格或已过时的历史底稿；只在追查某条现行规则历史成因时按原编号定位。

## research/（workbuddy-interaction-bench-2026-07-16）

- `BEHAVIOR-MATRIX.md` — WorkBuddy 只读行为语料枚举（六段体例）。定调：行为语料源非正确性真源。已升格：`WORKBUDDY-INTERACTION-BENCH` 工单。

## research-2026-07-14/（A–F 批，全部已升格）

`durable-work-state`→ADR-010/WORK-STORE-1；`host-file-authorization`→ADR-004/005 + CASE-ROOT/HOST-AUTH-LITE；`legal-scan-corpus`→ingest SPEC；`package-machine-gates`→registry/tools SPEC；`wps-compat`→output SPEC；`deepseek-usage-billing`→provider SPEC + USAGE-LEDGER-1；`INTAKE-RAW` 为过程性文件（已过时）。

## research-2026-07-15-round-2/（R1–R6，须按目录 README「阅读校正」读取）

R1 多宿主解耦→system.md 复用边界；R2 多写者×跨案矛盾→roadmap 前置；R3 材料链真实度→current.md/就绪图实测清单。**已过时**：R4 output 真实度（「真实产品可达」判断被校正推翻）、R5 触发/门禁推演（未被采纳部分）、R6 claimed-vs-real（v0.1.1 口径过期）。

## research-2026-07-19-work-agent-landscape/（WORK-AGENT-LANDSCAPE-1，只读，不进权威链）

市场流通 work agent 架构全景（WorkBuddy / TRAE Work / QoderWork / Kimi Work + frontier 旁节）。八问对照：工具集·授权·容器·工作流·记忆·知识包·toolResult·降级。不重做 WORKBUDDY-INTERACTION-BENCH / session-recall-survey。

| 文件 | 主题 | 时效三态 | 消费状态 | 消费去向（吸收前无约束力） |
|---|---|---|---|---|
| `landscape.md` | 逐家八问表 + 横表 + 三桶（可借形/反面教材/中性事实） | **有效**（2026-07-19 一手抓取） | **已消费**（消费 pass 2026-07-19，逐条裁定见下） | 见消费 pass 记录 |
| `README.md` | 批次入口与范围 | 有效 | 已消费（随批） | — |

**消费 pass 记录（2026-07-19 架构逐条裁定，零悬置）**：可借形六条全采——①TRAE 命令三态+白名单+高风险弹窗、②Qoder `evaluated_permission` 事件（授权决定持久化先于 effect 的同行实现）→ **bash 受控 ADR 素材袋**（②兼入 TOOL-READ-1 票面参照）；③WorkBuddy 先批后执行 vs Full Access 双面 → **effect 授权语义材料**；④Qoder 回收站/tool 默认展开/Task Monitor/定时 missed 显式 → 分三处：回收站佐证 ARCHIVE-MANAGE-1 既采防呆、tool 展开形态入 TOOL-READ-1 journal 侦察、missed 显式入未来 scheduled ADR 素材；⑤Qoder Dreams COW+无 bash consolidation → **ADR-013 memory 演进正对照**（与 Mimo 静默压缩反例、OWASP 四态同袋）；⑥Expert Kit/指令+RAG 为垂类知识包最近流通物而契约/锚点/事实等级为空白带 → **产品定位佐证**（vision 一行：schema ABI 是行业空位非行业常识）。反面教材五条**显式留档不入票**（各条已点名不变量③④⑥与 Stage3 时序，作反例语料；公开链分享一条另挂后续 ADR 队列第 3 项 shared state/ACL 素材）。中性两条留档。

**时效用法**：有效=可作线索；监控=竞品大版本后复扫；过时=被更新调研或 ADR 吸收声明替代。消费：未消费→部分消费（若干条入 ADR 草稿）→已吸收（就绪图/ADR 留痕）。

## research-2026-07-15-round-3/（现行最新批，无被推翻项）

**已升格为工单/ADR**：`interaction-visual-regression`→UI-RESIDUE-1；`oss-gui-source-patterns`→UI-RESIDUE/CHAT-SESSION 等工单供料；`geist-design-md`→VOICE-SPEC-1/DESIGN-MD-1；`vault-site-craft`→SITE-CRAFT-1（三修终局）；`grok-build-patterns`→OUTPUT-CONFIRM-UI-1/CHAT-MEMORY-1；`pi-harness-comparison`→WORK-TURN-1（含真机 G/H 根因）；`session-handoff-survey`→PROJECTION-RESUME-1；`chinese-display-font`→SITE-CRAFT-2（已拍板：朱雀仿宋，SIL OFL）。

**方向已定、工单待立（发版后队列）**：`skill-refinery-feasibility`（炼化管线成立，SKILL-REFINERY-1 待立；补记：Build schema 定位内部 dogfood）；`invest-daily-brief-testbed` + `invest-daily-digest-field`（invest 实验田，后段挂 scheduled ADR 门槛）。

**定调型（监控/口径资产，无需进一步升格动作）**：`anysearch-retrieval-tier`（检索类 plugin 三原则：具名/fail-closed/外部检索恒为未锚定线索级）；`generic-connectors-tier`（通用连接器层位）；`frontier-vertical-scan-2026h1`（LAB 供弹格局 + Economic Index 量化 + 判定层监控线；追踪 LAB leaderboard 与可靠性平台期论文）；`harness-landscape-2026h1`（口径弹药五条 + 三档过滤；Manus breakpoint 已入实测表）；`kimi-k3-capability-audit`（法律库传言证伪，不立 provider 单）；`newmax-competitive-teardown`（生成式 HTML 瓶颈在裁决；本地优先降格为门槛）。

**论证素材/词表（仍有效，按需取用）**：`provider-switch-mechanisms`（第二 provider 时立 ADR）；`fortune-invest-schema-stress-test`（schema 可表达性双域证据）；`coding-agent-strategies-subtraction`（减法纪律；两候选挂起）；`chat-as-dossier-thesis`（容器同构论，待立项升 ADR）；`emil-skills-polish-input`（polish R2 工具）；`cognitive-debt-mapping`（可执行业务说明书命名已采）；`namethatui-vocabulary`（UI 正名词典）；`trae-work-landscape`（技能 vs 场景包分野）；`upstream-positioning`（内部定位，不入公开叙事）。
