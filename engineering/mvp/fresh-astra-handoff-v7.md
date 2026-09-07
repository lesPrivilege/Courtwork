# Fresh Astra 接手：前端消费与 SE 编排回溯

2026-09-06。V6 已收尾；本文是下一 fresh thread 的首读入口。此次交付只准备 handoff，没有创建或启动新线程，没有继续功能施工。旧 fresh-handoff-v5.md 是历史输入，不能作为当前开工清单。

## 用户最新指令

> 本轮收尾后，会启动 fresh Astra 收缴和消费 Court work、DSH web UI 、Claude desktop 的前端，harness Core 也会是单独的一轮，作为 SE 理念的收敛和 UI 编排的回溯—— runtime 的一切实现按照 SE 的编排理念收敛 开源生态 和 frontier 局部实现思路。

> 可以 handoff 给 fresh thread Astra 了，工作方式不变，explore agent 优先选 luna，能力存在瓶颈时可以考虑升级。

因此下一轮先围绕三个来源的前端与 UI 编排展开；Harness Core 留作独立一轮。本轮末次范围裁决仍有效：SE 是通用 work agent 上的额外 preview 接入，extensions/experts 不属于已完成的 V6。后续扩展工作单独编排，不因已有 deferred 代码自动进入下一轮施工。

SE 的编排理念是收敛依据。Courtwork、DSH、Claude、开源 runtime 与 frontier 的局部实现均为可消费材料，V6 也可被回溯和替换。不要把任何来源的既有层次、依赖或治理结论当作固定答案；也不要因为历史理念较旧而整体弃用成熟实现。

## 接手位置与首读顺序

持久工作树：`/Users/lesprivilege/.codex/worktrees/se-continuation-v3-20260906/Schema Engineering`。

原目录 `/Users/lesprivilege/Projects/Schema Engineering` 的工程摘要较旧，保持只读。当前活动源码在临时目录，持久源码交付形式是归档包；不能只在持久工作树搜索 app 并据此判断实现不存在。

1. 本文、[current](../current.md)、[decisions](../decisions.md)、[governance](../governance.md) 与 [CONTRIBUTING（历史路径：`../../CONTRIBUTING.md`）](../migration/2026-09-08/evidence-index.md)。后续指令优先于旧文档的轮次安排。
2. [Canonical（历史路径：`../../papers/src/canonical.md`）](../../PAPER.md)、[Practice（历史路径：`../../papers/src/practice.md`）](../../PAPER.md)，重点为编排、Host Adapter、Compiled Expert、人类工作面、正式状态与验证责任。按问题读相关节，避免重新通读所有历史工单。
3. [V6 结果（历史路径：`execution/framework-v6-result.md`）](../migration/2026-09-08/evidence-index.md)、[范围纠偏（历史路径：`execution/scope-correction-v6.md`）](../migration/2026-09-08/evidence-index.md)、[验收范围（历史路径：`execution/acceptance-scope-v6.md`）](../migration/2026-09-08/evidence-index.md)、[V5 契约（历史路径：`execution/framework-contract-v5.md`）](../migration/2026-09-08/evidence-index.md) 与 [API（历史路径：`execution/api-v5.md`）](../migration/2026-09-08/evidence-index.md)。V6 只变更四个通用 Web 文件，runtime/Core/API/SE renderer 均沿用 V5 字节。
4. [Claude 实际观察（历史路径：`execution/claude-observation-v6.md`）](../migration/2026-09-08/evidence-index.md)、[Courtwork 索引（历史路径：`execution/courtwork-index-v6.md`）](../migration/2026-09-08/evidence-index.md)、[具体源码追踪（历史路径：`execution/selected-source-v6.md`）](../migration/2026-09-08/evidence-index.md)、[采纳裁定（历史路径：`execution/source-selection-v6.md`）](../migration/2026-09-08/evidence-index.md)、[Courtwork/DSH 参考（历史路径：`execution/courtwork-dsh-construction-reference-v5.md`）](../migration/2026-09-08/evidence-index.md)。已有局部消费可复用，但不能等同三个产品已经完整消费。

交接输入的当前 SHA-256 见 [inputs（历史路径：`fresh-astra-handoff-v7-inputs.json`）](../migration/2026-09-08/evidence-index.md)。这是交接时版本坐标；如文件随后变更，应核对实际新旧差异，不覆盖用户的新修改。

## 下一轮工作方式

Astra 负责问题定义、架构与 SE 映射、来源取舍、工单接口和最终综合裁定。Explore/来源索引/定向源码阅读优先显式选择 Luna；不要仅凭 explorer 角色名假定其底层模型就是 Luna。本轮使用过 `luna_max_worker`，若 fresh 环境仍提供可直接使用；否则选择实际可用的 Luna 模型配置。不要改全局模型配置来满足局部委派。

出现真实能力瓶颈时可升级有界子任务：先说明卡在哪个推理、跨模块追踪或证据冲突，保留已获得材料，再将该子任务交更强模型或由 Astra 接手。不要求所有子任务升到 Astra，也不为例行升级重复索取许可。模型与 reasoning 取 fresh 环境支持的配置，不强塞 Astra minimal。

并行只用于能独立产出的工单，明确文件所有权并告知共享工程不可撤销其他作者修改。研究先于依赖它的实现；实现作者不承担同一工单的独立验收。Astra 需要亲自消费结果与关键反例，不以代理的 PASS 或数量投票替代判断。

来源消费沿用：文档/当前状态 → 归档、工单、commit 与施工记录索引 → 选择有价值的具体决定 → Luna 定向源码及对应测试 → Astra 裁定 → 自足的工程材料与有界验证。不要先让多个代理漫游全部仓库，再用堆砌摘要代替取舍。

## 三个来源与前端轮次产物

- Courtwork：`/Users/lesprivilege/Projects/Courtwork`。V6 读取时 HEAD 为 `f9ade85b72e5abcdc64c3a6c43ed3a13a2292476`，工作树有未提交变化。先核对当前 status/文档与实际文件 hash；commit 不是脏文件的版本替代。既有三组消费仅覆盖身份门、工具/消息分层与视图生命周期。Codex/Claude 历史施工记录可按选定问题召回，之前没有完整消费全部原始日志。
- DSH Web UI：`/Users/lesprivilege/Projects/motto-dsh`。V5 读取时 HEAD 为 `99f6f02fecdb7dff40c3fbc9470f5907c29f74ca`，同样有未提交变化。已有 QuestionComposer/pending、session projection、DetailsPanel 等源码线索；没有可继承的完整上游 Web UI 实操验收。核对实际入口、启动条件与 UI 版本后再判断。
- Claude Desktop：原生应用 `com.anthropic.claudefordesktop`，V6 观察时版本 `1.46388.4`。已实际观察会话定位、文件预览/源码/展开、工具请求详情、example.com Browser 打开与关闭重开后的状态。它是界面行为证据；未取得 Claude 前端源码，不能将不可见实现写成事实。fresh 轮仍以可访问实际界面为准。

前端轮次应交付：三个来源的机制与证据索引；“交互问题—状态/责任—来源决定—SE 映射—采纳/拒绝/待验”的回溯；可落地的 UI 编排契约与有界工单；需要 Harness Core 专轮处理的接口/语义问题单独列出。在既有授权内完成必要的可逆局部验证与实现，不仅交一份泛泛研究计划；也不在前端轮顺带重写 runtime/Core。

消费结果应在新工程材料中自足，保留必要来源版本/hash即可，不以原 repo 链接替代说明。原参考仓只读，私人原始聊天/业务材料不搬进交付。产品 UI 的观测、源码推断与本项目实测分开标记。

## V6 交付与恢复

- [源码包（历史路径：`execution/archives/framework-v6-source.tar.gz`）](../migration/2026-09-08/evidence-index.md) 与 [源码 manifest（历史路径：`execution/archives/framework-v6-source.json`）](../migration/2026-09-08/evidence-index.md)：31 个成员，已逐一 hash 校验。
- [证据包（历史路径：`execution/archives/framework-v6-evidence.tar.gz`）](../migration/2026-09-08/evidence-index.md) 与 [证据 manifest（历史路径：`execution/archives/framework-v6-evidence.json`）](../migration/2026-09-08/evidence-index.md)：44 个成员，已逐一 hash 校验。包含真实执行的独立 Chromium 脚本/结果、Astra 浏览器记录和 deferred 材料。
- [恢复说明（历史路径：`execution/restore-v6.md`）](../migration/2026-09-08/evidence-index.md)：恢复到新目录，独立数据目录，Node/npm 安装使用精确锁。不要使用旧数据目录做 seed，也不要依赖临时进程永远存活。
- 交接时临时源码 `/private/tmp/se-agent-v6/app`；预览 `http://127.0.0.1:8796/`，数据 `/private/tmp/se-v6-preview-20260906`。V5 比较入口此前为 `http://127.0.0.1:8795/`。这些是可失效的便捷入口；fresh 接手时先检查。
- 最终 `app/web/app.mjs` SHA-256：`ea234992379898d4a90347a184210ab6b1afd7f25ae2308a758131dab1c6a9b0`。
- 最终 `app/extensions/evidence-memo/renderer.mjs` SHA-256：`282259113422edea54d66c8780a9691d7b367a8461b41433f325462bb140c2a0`，保持 V5 字节。

V6 实际证据：底座回归 14/14、独立 HTTP 14/14；最终源码上的独立通用 UI 10/10、Preview 生命周期 13/13。Astra 另实际操作 in-app browser。源码字符串匹配检查已移入 deferred，不算行为测试；证据包内扩展草稿/Review 增强也已 deferred，不是被接受的源码。旧报告须按各自 source hash 阅读。

## 不应丢失的边界与欠项

当前 Pi 使用 local fake HTTP，真实付费模型预算仍为 0，不能读取现有凭证来试跑。默认 30 秒 Run deadline 包含 waiting_user；V6 未改变预算语义。Preview 是单个同源可信 renderer slot；owned container 解决合作 renderer 的 DOM 生命周期，不是安全 sandbox，也不是新的 Chrome/任意 URL 浏览器能力。

SE 正式状态与通用聊天/界面草稿必须分清；UI 位置不授予提交权限，Candidate 不自行成为正式成果。当前协议与实现是回溯对象，但变更责任/权限/提交边界必须有明确契约和反例验证。

extensions/experts、真实 provider、真正 adapter 替换/消融、完整 IME/可访问性/视觉 Polish 以及 Paper G1/G2 仍未完成。前端观察不继承上游的治理正确性；一个合成场景不代表 Paper 认证。影响论文命题时遵循 CONTRIBUTING 的观察与裁决流程，不默改 Paper。

本次没有修改源参考仓、应用源码、Paper、品牌/repo/remote、全局配置或自动化，没有启动后台下一轮。用户从 fresh Astra thread 开启后即可按以上范围继续，不用重问已明确的 Luna 优先分工和来源消费授权。
