# SE continuity benchmark 起步证据

2026-09-08。基线 `62556b7f65170ecf30efb2869447ae85fe69d721`，隔离分支 `codex/se-continuity-benchmark`。用户授权撰写文档并顺序建设，Luna explore；Astra 编写协议与 B0 runner。未改生产实现、Paper、UI、品牌或部署。

## 交付

- [协议](../../engineering/research/se-continuity-2026-09-08/README.md)：三项可证伪命题、强基线、独立 oracle、指标分母、分组留出、成本、人的实验和 B0–B4 顺序。
- [运行入口](../../benchmarks/continuity/README.md)：无模型/网络依赖的真实 Core 操作与 JSON 报告。
- [下一能力](../../engineering/research/se-continuity-2026-09-08/next-capability.md)：B1a NDA/宿主、B1b 强制中断，随后 B2 模型对照。

## 本次运行

[首次原始报告](author-first.json) 保存各文件 SHA256、基线 HEAD、dirty=true、Node/Python/平台、原始 snapshot、操作错误与逐项评分。dirty 表示新 runner 当时尚未提交，执行内容由哈希固定。五条开发轨迹 5/5；只有一个合成 memo 任务族，不是五个独立领域样本。

命令：`node benchmarks/continuity/run.mjs --output <new-result.json>`。覆盖 pending 不生效、合法接受、来源过期拒绝且保留历史、原请求重放/同键异内容拒绝、优雅进程重启和义务保留、拒绝外部 actor 字段后正常接受。

[相关检查](checks.log)：`node --test app/tests/work-core.test.mjs benchmarks/continuity/grade.test.mjs`，6/6。包含既有真实 SIGKILL Core 回归，但不把这些回归重标为本 runner 的故障注入；runner 自己的 restart 仅为优雅关闭/重开。grader 负例检查缺失/额外 checkpoint、错误字段、null 缺失和运行错误。

## 限制

代码依赖独立的 grader 不等于独立语料或专业 oracle。脚本调用可信 Core 不证明模型工具的权限隔离。未执行 host Session、NDA 新语料、producer 缺席、真实模型、T/S/E 对照、法律质量或真实人的接管。本报告不提供效果提升、统计显著性或产品门关闭结论。B1–B4 未运行；没有后台自动续行任务。

Luna 探索/复核结果另附，不能将作者 5/5 自称独立接受。
