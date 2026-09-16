# 07 · 命令与手动压缩，不把字符串送给模型碰运气

2026-09-16 · Claude（Fable 5.1）裁决、Host 两片实现与 composer 接线；Sonnet 5 做只读勘察与命令菜单模块。消费 [RD-008](../../research/RD-008-command-compaction.md)；owner 回写见其文末。

```text
Task / scope: CMD-01 Host command discovery/dispatcher（read / client_ui / setting / control / passthrough，无 fallthrough，字面转义固定）；CMP-01 只在 idle Session 的共享 admission 内运行原生 compact（操作 ID、查回、预算、失败/取消/unknown、journal 顺序、ACK 丢失不重复付费）
Base SHA / branch: 06 片末 0075c1e / claude-frontend-harness-20260916
Writer / reviewer: Claude 作者；Sonnet 5 写 command-menu.mjs；非作者复核与人的目验未做

Owner fact + contract: Run admission在 #withConfiguration 队列与 store.createRun 的串行闭包里（singleActiveRun）；Pi 0.85.1 AgentSession.compact() 先 abort 再摘要，Already compacted / too small 以错误返回；SessionManager 是跨 Run 的连续性；run.notice 只是 best-effort。RuntimeStore 升到 18：operations[]（kind compaction）与 Run 共用独占席位，createOperation / createRun 互斥，配置冻结同时看 Run 与 operation，重启把 running 记 unknown
比对结论（Sonnet 只读，作者复核）: 前后端此前完全没有命令读取（`/` 一路作普通文本到模型）；`/fixture` 是 fake provider 的脚本记法；自动压缩已有完整合同与 15 项测试，不重开
Semantic / projection / control / placement: Host 只有一份目录（GET /sessions/:id/commands），修订 hash 自事实；分派重新裁决，stale 409、unknown 404、unavailable 409、参数 400；parseSlash 固定：`//` 转义、`/name[ args]` 命令、路径/前导空白/其他一律文本；whole-message 形式让 Host 做唯一读者。composer：以 `/` 开头的消息先送 Host 读，命令被处理则不发 Run 并清草稿；拒绝则草稿保留、feedback 行写原因（command 类别）。/status /tools 结果卡（command-popover，connection-card 解剖，尾句 Read from the Host. No model request.）；/model 开 picker；/effort 写回执句并刷新模型控件；/compact 在 feedback 行写 Compacting…，轮询操作直到结算，写估算前后与 provider 用量。命令菜单（command-menu.mjs）在消息是孤立斜杠词时列目录，不可用行灰显带原因
Affected UX rule IDs: UX-02（命令不是模型 turn；未知不 fallthrough）、UX-05（活动 Run 冻结同一句）、UX-08（估算与真实用量分列）
Nearest precedent: store.createRun 串行闭包与 commandId 幂等；repository binding 回执；Run 重启 unknown；connection-card / model-effort 卡；compaction-runtime 测试的 fake responder 与 seedHistory
Evidence type: implemented precedent
Governance status: candidate（无非作者复核）
Kept relationships: 自动压缩合同、run.usage 记账、PUT /provider-config CAS、Run.commandId 语义、`/fixture` 记法不变
Intentional changes: 新路由 commands / compactions；FEEDBACK_CATEGORY_ORDER 增 command；fake provider 可等待异步 responder；schema 17→18
New terms / primitives / dependencies: runtime/commands.mjs、runtime-proposals 之外的 web/command-result.mjs、web/command-menu.mjs；无新 token、无新依赖
Exceptions: `/model <id>` 的 setting 形态未做（只开 picker）；skill/prompt 展开命令未做；GUI 里无取消压缩控件（Host 路由存在）；真实 provider 未跑
```

## 提交

| 提交 | 内容 |
|---|---|
| `413a2ca` | CMP-01：schema 18 operations、compactSession/#executeCompaction/cancel、compactSessionJournal、fake provider 异步 responder、manual-compaction 测试 3 项、四处 schema 钉更新 |
| `06e3174` · `ab2cb37` | CMD-01：runtime/commands.mjs（parseSlash、discoverCommands、parseArguments）、listCommands/dispatchCommand/dispatchText、路由、commands 测试 5 项 |
| `42394fa` | composer 接线（readComposerCommand、结果卡、feedback、/compact 跟随）、command-result.mjs、command-menu.mjs、样式、测试；文档与文案 |

## 作者检查

| 检查 | 结果 |
|---|---|
| `node --test tests/manual-compaction.test.mjs tests/commands.test.mjs tests/command-surface.test.mjs tests/command-menu.test.mjs` | 3 + 5 + 2 + 4（+ static-web-manifest 6）= 20/20 |
| 相邻套件 | durability / async-recovery-independent / repository-candidate / subagent-migration / projectless-chat / control-plane / async-tasks / attention-agent（schema 18 钉更新后）通过；coordination / run-lineage 的 schema 6/8/9 fixture 在 09 片补钉（`delete …operations`、17→18） |
| `npm test` | 1195/1195（09 片补钉八套 schema fixture 后的同一次运行） |
| lint | interaction / colors / shapes / materials / product-copy / semantic-consumers / doc-links 通过 |
| 浏览器目验（Local test Host，8861） | 本地 Host 数据目录从 schema 17 升到 18（备份保留）。Chat 内：`/status` → 结果卡（Local test · Provider default · ask · Not connected · None · revision 1 · 14 exposed tools · 1 context item · 2 runs · 压缩不可用原因），焦点在 Close；`/frobnicate now` → 草稿保留、feedback "Unknown command /frobnicate. To send it as text, start with //frobnicate."；`/effort high` → "Reasoning effort is not selectable on the configured model."；`/compact` → "Compaction needs a known context window on the configured model."（Local test 无窗口）；`/model` → picker 打开、composer 清空。命令菜单在隐藏的浏览器面板里拿不到焦点（触发条件 activeElement === textarea），只由 4 项 tiny-dom 测试覆盖；手动压缩的 GUI 路径未在浏览器走（fake provider 需显式开启 compaction），由 3 项 Host 测试覆盖 |

## 未完项

- `/model <id>` 作为 setting、`/skill:name` 与 prompt 展开、第三方来源命令未做；autocomplete 只是目录投影。
- GUI 无取消压缩控件；Compacting… 期间 Send 由 Host 409 拒绝而非前端预先禁用。
- CMP-02（before/after 真实观测、长会话丢失定位）未开。
- 非作者复核、真实 provider、200%/读屏未做；未 push、未部署。
