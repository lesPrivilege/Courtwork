# CourtWork

_A place for expert work to take form._

**Turn AI output into work you can build on.**
**把 AI 的产出，变成接得下去的工作。**

在本地处理材料，与 AI 一起推进专业工作。工具调用清晰可见，候选带着证据进入审阅，决定与文件留在事项里，下一次打开就能接着做。

发布面候选的源码与本地预览见 [`site/`](site/README.md)。页面与本文共用同一份声称表；本候选尚未发布，当前工程状态见 [`engineering/current.md`](engineering/current.md)。

## 本地运行

需要 Node.js 22.19 以上、Python 3、Git 2.36 以上。默认 provider 是本地确定性 fake；真实 provider 在界面里配置，密钥不进入仓库、聊天或截图。

每个服务使用独立数据目录。当前主线的数据版本、迁移检查与备份要求见 [运行与数据说明](app/README.md)；升级后的数据不得与旧 host 共用。停止用 Ctrl-C。

```sh
git clone https://github.com/lesPrivilege/Courtwork.git
cd Courtwork
npm --prefix app ci
npm --prefix app start -- --data-dir /absolute/path/outside-repo/courtwork-data --port 8845
npm --prefix app test
```

## 验证

```sh
npm --prefix app test
node --test benchmarks/continuity/grade.test.mjs
node benchmarks/continuity/run.mjs --output /absolute/path/result.json
node tools/lint-colors.mjs
node tools/lint-materials.mjs
node tools/contrast-report.mjs
```

产品证据快照 `9e5384f` 上的记录：应用测试 308 通过、0 失败；continuity conformance E 6/6、S 6/6，记录在 [`evidence/publishing-surface-2026-09-09/continuity-9e5384f.json`](evidence/publishing-surface-2026-09-09/continuity-9e5384f.json)。这些数字属于该固定快照，不代表当前 main 的测试总数。该 benchmark 衡量协议保真度，不衡量增量价值：E 与 S 都应通过，这是校准。

Local / fake-provider 通过不等于真实模型验收。

## 声称表

| 可写的声称 | 状态 | 证据入口 |
|---|---|---|
| 从独立 clone 安装、测试、启动 | verified with synthetic data | [`evidence/final-integration-20260908/sync.md`](evidence/final-integration-20260908/sync.md) |
| Run 链：回答、精确写入批准、文件身份、预览、拒绝、停止、断线重连 | verified with synthetic data | [`evidence/final-integration-20260908/README.md`](evidence/final-integration-20260908/README.md) |
| 运行控制：配置 CAS、来源、上下文、MCP 生命周期 | verified with synthetic data | [`evidence/rc/`](evidence/rc/) |
| MCP 未知效果后封闭后续调用 | verified with synthetic data | [`evidence/final-integration-20260908/mcp-unknown.json`](evidence/final-integration-20260908/mcp-unknown.json) |
| Continue in Work：Chat 绑定 Matter，历史与 Project 保留 | verified with synthetic data | [`evidence/fe03/`](evidence/fe03/) |
| 合成 NDA：逐规则候选 → 审阅 → 正式决定；幂等与过时版本拒绝 | verified with synthetic data | [`evidence/wk10b2-main-integration-20260908/`](evidence/wk10b2-main-integration-20260908/) |
| 新 Session 继续同一事项；产生候选的一方缺席时历史可读 | verified with synthetic data | [`evidence/se-continuity-20260908/`](evidence/se-continuity-20260908/) |
| Models：Catalog provider · Compatible endpoint · Local endpoint；Test connection、Fetch models | runs locally | [`evidence/fe03-main-integration-20260909/`](evidence/fe03-main-integration-20260909/) |
| Settings 整页；Appearance 本设备偏好 | runs locally | [`evidence/cc-s-main-integration-20260909/`](evidence/cc-s-main-integration-20260909/) |
| 真实模型 provider 路径 | not yet | 用户在界面配置 |
| 有界模型 pilot 与对比分数 | not yet | — |
| 事项级记忆、Temporary chat | not yet | — |
| 桌面安装包、签名 | not yet | — |

每份记录包含对应版本、运行条件与验证范围。

## 入口

- [`engineering/current.md`](engineering/current.md)：已交付能力、证据边界、下一单。
- [`engineering/architecture.md`](engineering/architecture.md)：模块所有权与边界。
- [`engineering/roadmap.md`](engineering/roadmap.md)：长期路线与验证门。
- [`docs/runtime-control/INDEX.md`](docs/runtime-control/INDEX.md)：资源、权限、MCP 与上下文绑定。
- [`docs/interface-components.md`](docs/interface-components.md)：布局、消息、工作面、焦点与状态 owner。
- [`PAPER.md`](PAPER.md)：采用的论文版本与反馈路径。
- [`engineering/migration/2026-09-08/README.md`](engineering/migration/2026-09-08/README.md)：来源、Git 谱系、工作目录与回退边界。

## 组成

- **Web UI.** 原生 ES module 前端，呈现会话、运行、文件与审阅。
- **Host runtime.** Pi AgentSession 0.85.1 驱动运行，本地控制面管理配置、权限、资源与 MCP。
- **Domain core.** Matter、候选、证据与决定，配合版本校验与幂等提交。

CourtWork 运行在 Pi agent SDK（`@earendil-works/pi-*` 0.85.1）与官方 MCP client 2.0.0 之上；harness core 管理策略、状态与审阅。

## Paper

CourtWork 按 Schema Engineering 9.6（`d78fd31`）建造，版本绑定与反馈路径见 [`PAPER.md`](PAPER.md)。

## License

MIT，见 [`LICENSE`](LICENSE)。
