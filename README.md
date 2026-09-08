# CourtWork · Fresh

A place for expert work to take form.

本分支是 CourtWork 的 fresh 开发候选：通用 Agent Web UI、Pi AgentSession 运行底座、Runtime Control Plane 后端与资源检查 UI、悬浮工作面，以及独立品牌 SVG/动效包。开发在这里继续，Schema Engineering 专注论文。Legacy `main` 仍冻结，候选同步不代表产品接管或正式发布。

## 入口

- [工程状态](engineering/current.md)：已交付能力、证据边界、下一单。
- [工程索引](engineering/README.md)：架构、设计、RD 与工单。
- [Runtime Control Plane](docs/runtime-control/INDEX.md)：资源与权限、MCP、上下文绑定、schema 4与已合流的资源检查UI；Runtime Workbench仍属后续工单。
- [UI 文本与编排体例](engineering/design/ui-composition-standard.md)：字阶、按钮、卡片、对齐、留白与窄屏重排。
- [UI 组件契约](docs/interface-components.md)：布局、消息、工作面、焦点与状态 owner。
- [品牌符号与动效](brand/README.md)：8 个语义样板、5 种材质与独立预览。
- [Paper](PAPER.md)：SE 的固定语义基线、最新论文入口与反馈路径。
- [迁移记录](engineering/migration/2026-09-08/README.md)：来源、Git 谱系、工作目录与回退边界。

## 本地运行

需要 Node.js >=22.19.0、Python 3、Git >=2.36。

```sh
npm --prefix app ci
npm --prefix app start -- --data-dir /absolute/path/outside-repo/courtwork-data --port 8845
```

默认使用本地 deterministic provider。真实 provider 由用户在 UI 配置，密钥不进入聊天、版本库或截图。每个服务使用独立数据目录；旧 schema 3 数据由新 host 打开时会升级到 schema 4，先备份，不与仍运行旧 host 的实例共用目录。停止用 Ctrl-C。详见 [运行与数据说明](app/README.md)。

## 验证

```sh
npm --prefix app test
node evidence/ui-maturity/surface-counterexamples.mjs
node evidence/ui-maturity/run-receipt-counterexamples.mjs
node evidence/ui-maturity/message-edit-counterexamples.mjs
node brand/evidence/independent/court-symbol.acceptance.test.mjs
node brand/scripts/build.mjs
```

品牌预览单独启动：

```sh
python3 -m http.server 8842 --bind 127.0.0.1 --directory brand
```

Local/fake-provider 通过不等于真实模型验收；完整 Matter、专家编排、专业正确性和 main takeover 均不由此获得通过。
