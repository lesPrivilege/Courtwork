# WO-ATT-UI02 · Attention UI 与 motion 独立绘制

2026-09-13 · Astra 派单，Luna 分层/参考索引，用户转交 Claude 独立绘制与 motion，Astra 裁决验收后合入。基线 `main@6e211bd5f5169a603bc801024d16f87eec16a071`。本工单是现有 [WO-ATT-FE01](../../mvp/execution/work-surface-kit/work-orders/WO-ATT-FE01.md) 的前端表现接续；不重开已交付的处置合同。

状态：Luna分层/索引已交付，Astra已核对交接范围，可转交Claude；Claude 尚未提交，视觉/motion 尚未被 Astra 接受。本片创建文件工单，不新建 Codex 任务，也不向 Claude 发送消息。用户自行提交。

## 交接入口

先读 [可直接提交给 Claude 的任务](CLAUDE-PROMPT.md)，再读 Luna 的 [分层标注](layers.md) 与 [内外部参考索引](references.md)。[验收与返回协议](acceptance.md)规定交付物及后续合入条件。[Context/TPS 后续片](astra-context-tps.md)独立归 Astra。

## 产品任务与范围

优先完成 Attention items 的可操作前端候选：让人迅速找到需要介入的对象、理解原因、执行当前合法动作，并在返回时保持位置。包括列表/状态筛选/分页、详情、技术披露、处置编辑器与回执反馈、宽窄屏转换，以及显式进入/退出 Attention assistant 的邻接关系。Home 只需表现进入同一对象和返回的衔接，避免扩成 Home 或全站重设计。

Claude 对布局、密度、阅读节奏、视觉关系和 motion 有独立设计空间；以现有颜色/字体/图标/材质角色和稳定语义为起点。可提出有理由的变体；新 token/依赖/primitive 必须列出差异，交 Astra 裁决。既有截图为实现参考，不要求逐像素复刻，也不自动成为本轮 golden。

UI 优先：基于现有真实字段建立独立合成数据预览，展示五状态、处置及异常恢复；未有数据合同的投影可作为单独探索附页，明确所需字段，不混进主路径的可用能力。主交付仍应能直接对应当前 List–Detail 与 typed actions。Context window/TPS 的绘制和 motion 不在 Claude 本单；用户指定稍后由 Astra 串行、基于真实视觉处理。

## 分工和顺序

| 阶段 | 责任 | 完成条件 |
|---|---|---|
| 输入 | Luna | 各区分层、事实/控制/异常标注，内部符号与证据、外部关系与适用边界索引 |
| 绘制与motion | Claude，用户转交 | 可运行前端候选、固定合成场景、before/after、motion规格与录屏、文件差异/依赖说明 |
| 裁决 | Astra | 逐项采用/修改/拒绝，核对语义与真实UI；不以作者自评代替接受 |
| 验收与合入 | Astra | 针对返回固定候选做独立检查；必要接线/修正完成后再合入Courtwork main；保留原writer改动 |
| 后续串行 | Astra | 独立完成Context/TPS真实视觉及motion，不并行混入本工单 |

## 施工位置

Claude 若拥有仓库，在核对最新 HEAD 后使用独立 `codex/` 工作分支/worktree；不得 checkout/stash/reset 用户活动树。仅获交接包时，可在包外新目录创建自足前端候选并交回源码。不得对打包的固定证据声称当前产品接受，也不得改 Core/runtime/server 合同来迎合视觉。基线更新由 Astra 合入前核对。

接入阶段优先修改 `app/web/attention-view.mjs` 及局部 styles，必要 presentation-only helper 列清单；`app.mjs`/Home/Attention assistant 的改动只服务于明确邻接路径。状态/权限/回执事实仍由原 owner 提供。不得访问个人数据或默认调用付费Provider，不随本单push/部署。

## 可携带交接包

运行 `python3 engineering/design/attention-ui-handoff-2026-09-13/build-packet.py <输出zip路径>` 可重建包。源码从固定Git基线读取，工单从本目录读取；包内包括全部app/web源码、精选合同、历史明暗/窄屏截图、Tasktori图与逐文件SHA-256。不包含运行后端、凭据、用户数据或整个仓库；主任务输入齐全，索引中更远的链接仍需原仓库。Claude从包根START-HERE.md进入。

## 本次交接验证

Luna完成两份65行分层/索引，Astra核对范围、实际入口与返回协议。文档链接检查通过；交接包逐文件SHA-256及ZIP完整性检查通过。无产品变更，不运行产品测试；没有本轮视觉/motion验收声明。
