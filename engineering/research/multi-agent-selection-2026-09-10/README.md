# 多智能体实践选型 · 会话消费与裁决

2026-09-10 接单，2026-09-11 收尾登记；Astra。固定接单基线 main `9097cbfd4b2b3b4c7b1117db5558b73568db67cc`，隔离分支 `codex/multi-agent-selection-intake-20260910`。共享入口实读为 `claude/ex-ss1-secondary-surface@3a6133686014973f62fcf58e71e779af36616876`，有其他 writer 修改；本单没有切换或写入该 checkout。

## 消费入口

[RD-005](../RD-005-multi-agent-selection.md) → [选型/来源索引](selection-index.md) → [PR 裁决](pr-plan.md) → 精确原文 [conversation.json](inputs/conversation.json)。[manifest](source-manifest.json)固定消息字符数与哈希。JSON 是 read_thread 返回消息的规范化存档，不是平台原始导出字节。返回 page.hasMore=false、nextCursor=null，共3个turn、6条消息；未见附件。64 搜索结果/6 workstream 是原会话自述，本单未取得底层 Exa 日志，不重复声称已核验。

| Turn（按发生顺序） | 原输入 | Astra 处置 |
|---|---|---|
| T01 · 0ba0f893-0ad3-4499-8e11-5e8791f3e968 | subagent/explore/multi-agent、main通信与前端 | 消费全部20节：profile/topology分离、四通信面、fresh refs、结构化结果、control/reducer/UI分层采纳为边界；多runtime、team/A2A与新UI控制留条件；原5个MA编号只做来源编号 |
| T02 · 4a49c0cb-5a4d-4468-9fc3-a0d120f8dec8 | PicoAgents repository | 消费pattern taxonomy、plan/execution分离与termination；拒绝共享全文context、宽松progress即成功、raw orchestrator event直连产品UI；不建常驻orchestrator类层级 |
| T03 · 5ac9470e-e1a4-4418-8e22-531613279b9b | SoL-Pi repository | 消费全部15节及MA-01…06修订：稳定harness/临时loop、证据绑定压缩、pointer recall、compaction状态转换、consult分离、D1…15候选、heldout方法；数值收益/参数/提案存活率仅保留来源主张，未复现实验 |

## 与当前交付对账

[首轮 MA](../multi-agent-2026-09-10/README.md)和[第二轮](../multi-agent-2026-09-10/round2/README.md)继续拥有事实与编号。第二轮文档中的“分支未合流”是历史节点；当前 [current](../../current.md) 已记录 MA2 合流，不据旧状态重派。Thread mailbox/HTTP/model工具与前端消费已存在；child conformance 无生产调用方，explore/handoff/workflow 未交付。生产路线受 MA2-D15 约束，不因本材料重开 lane。

本次用户分工登记为工程工作法：Astra 架构、模型能力瓶颈实现、PR裁决；Luna fast explore、有成熟先例且边界可验的实现。它不自动配置产品模型路由，也不削弱非作者接受要求。Luna 本轮只读回执见[explore](explore.md)。

本包未改 runtime/schema/web、未宣称独立产品接受。正式产品门沿 current；不另建开发线。

## 登记验证

2026-09-11作者检查：3 turn/6消息、全部字符数及SHA-256与manifest一致；`node tools/check-doc-links.mjs`通过（787份文档、3601条本地链接）；`git diff --check`通过。Luna只读接缝回执已逐项处置，无产品运行与独立产品接受。登记保存在隔离分支的本地提交，未合main、未创建远端PR。
