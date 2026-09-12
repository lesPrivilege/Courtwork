# 来源、版本与审阅上限

固定产品基线：`1ac28980c4877f4a86adf586aeb1b66980e23504`。审阅日期：2026-09-12（Asia/Singapore）。

## 已核见与未执行

通过 GitHub connector 读取固定源码与合同；通过 Exa/Pi/OpenAI 官方文档核对少量外部机制。外部 latest 文档不是现依赖版本的实现证明。初次与结束前的 main 核对见 audit.json。

未取得可运行的本地 clone（容器 DNS 失败），容器 Node 22.16.0 低于 repo engines；未安装依赖、未执行产品测试、未访问本机 8804、未调用真实模型或远端工具副作用。没有读取用户凭据或修改远端 repo。

全部代码结论仅覆盖下表列出的读取范围。没有声称逐行全仓审计、全量 PR review、独立产品接受，或完成旧 24 HPRO 的每条源码重验。

GitHub combined commit statuses 查询为空并不代表没有 Actions/check-runs；本文不据此判断 CI 配置缺失。open PR 查询为空不代表没有本地分支。GitHub Release 对象为空不代表 Pages 未发布。

下列源文通过 connector 阅读，并未作为原始字节包下载保存；本包 SHA256SUMS 只校验本包文件，**不冒充远端源文件 hash**。源复核用固定 SHA + path，实际 intake 字节 hash 由本地 P00 计算。

<a id="r01"></a>
## R01 · 固定 main 元数据
来源：[固定 main 元数据](https://api.github.com/repos/lesPrivilege/Courtwork/branches/main)
类型：pin。范围：分支读取返回本文固定 SHA；最终复查另见审计范围。

<a id="r02"></a>
## R02 · 当前工程状态
来源：[当前工程状态](https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/engineering/current.md)
类型：repo。范围：读取最新状态段；历史测试、发布回执为仓库所记，不是本轮重跑。

<a id="r03"></a>
## R03 · 下一 Harness 节点
来源：[下一 Harness 节点](https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/engineering/release/harness-next-node-2026-09-12/README.md)
类型：repo。范围：已收包版本、现 Pi/MCP 接缝、开放门与归档边界。

<a id="r04"></a>
## R04 · DEC-013 Runtime canon
来源：[DEC-013 Runtime canon](https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/engineering/architecture-runtime-canon.md)
类型：repo。范围：责任边界与 DRT-01～04 原路线。

<a id="r05"></a>
## R05 · RuntimeService
来源：[RuntimeService](https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/app/server/service.mjs)
类型：code。范围：有界读取：构造/初始化、SessionManager 接缝、Run admission、MCP unknown 与终态结算；未逐方法全文件审计。

<a id="r06"></a>
## R06 · 现 Runtime 组合根
来源：[现 Runtime 组合根](https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/app/server/runtime.mjs)
类型：code。范围：完整读取；无条件构造 WorkCoreOwner。

<a id="r07"></a>
## R07 · 现 Pi 适配
来源：[现 Pi 适配](https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/app/runtime/pi-session-runtime.mjs)
类型：code。范围：有界读取：资源发现关闭、模型身份/凭据隔离、createSessionRun 接口和连续性说明；未全路径运行。

<a id="r08"></a>
## R08 · MCP Manager
来源：[MCP Manager](https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/app/runtime/mcp-manager.mjs)
类型：code。范围：完整读取；分页、结果保真、reported-error/unknown 分支。

<a id="r09"></a>
## R09 · 应用依赖与命令
来源：[应用依赖与命令](https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/app/package.json)
类型：repo。范围：Pi 0.85.1、MCP client 2.0.0、Node >=22.19.0；未验证安装后的包字节。

<a id="r10"></a>
## R10 · 旧 Pro P00–P12 工单
来源：[旧 Pro P00–P12 工单](https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/engineering/research/harness-pro-2026-09-10/received/f1700fb0/courtwork-hpr-review/HPR-02-work-orders.md)
类型：repo。范围：读取全部 13 张卡；本文处置的是工单层，不冒称已完成原 24 HPRO 的逐项源码重验。

<a id="r11"></a>
## R11 · 旧 Pro 双向实施映射
来源：[旧 Pro 双向实施映射](https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/engineering/research/harness-pro-2026-09-10/received/f1700fb0/courtwork-hpr-review/implementation-map.json)
类型：repo。范围：24 HPRO 到 13 卡的原映射；不混后版缺件。

<a id="r12"></a>
## R12 · 唯一总 roadmap
来源：[唯一总 roadmap](https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/engineering/roadmap.md)
类型：repo。范围：读取当前排序和相关增量；旧时点状态由 current 覆盖。

<a id="r13"></a>
## R13 · Governed work loop
来源：[Governed work loop](https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/engineering/release/governed-work-loop-2026-09-12/README.md)
类型：repo。范围：四职责、状态与权限边界、只读首片。

<a id="r14"></a>
## R14 · G1–G5 产品门
来源：[G1–G5 产品门](https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/engineering/execution/2026-09-08-main-round/public-readiness.md)
类型：repo。范围：完整读取；既有发布验收标准不由本包降格。

<a id="r15"></a>
## R15 · 8 项真实 Runtime 验证入口
来源：[8 项真实 Runtime 验证入口](https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/engineering/release/frontend-node-2026-09-12/RUNTIME-VALIDATION.md)
类型：repo。范围：完整读取；本轮未执行其中的 provider 调用。

<a id="r16"></a>
## R16 · RD-006 延迟工作区绑定
来源：[RD-006 延迟工作区绑定](https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/engineering/research/RD-006-deferred-workspace-binding.md)
类型：repo。范围：完整读取；managed cwd、目录能力与 projectless 身份分开。

<a id="r17"></a>
## R17 · RD-007 内容资源治理
来源：[RD-007 内容资源治理](https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/engineering/research/RD-007-resource-governance.md)
类型：repo。范围：完整读取；LG/DS/BG/Runtime 各自 owner，首片无需等目录绑定。

<a id="r18"></a>
## R18 · BE-6/7 声明式 Skill 提案
来源：[BE-6/7 声明式 Skill 提案](https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/engineering/research/gui-agent-control-plane-2026-09-12/skill-proposal-slice.md)
类型：repo。范围：完整读取；proposal 不等于 effective registry；精确版本批准与 crash-safe apply。

<a id="r19"></a>
## R19 · 当前 open PR 查询
来源：[当前 open PR 查询](https://api.github.com/repos/lesPrivilege/Courtwork/pulls?state=open&per_page=100)
类型：live-api。范围：本次返回空数组，不代表没有本地分支或其他 writer 的未提交工作。

<a id="r20"></a>
## R20 · GitHub releases 查询
来源：[GitHub releases 查询](https://api.github.com/repos/lesPrivilege/Courtwork/releases?per_page=5)
类型：live-api。范围：本次返回空数组；GitHub Release 对象与已发布 Pages 分开。

<a id="e01"></a>
## E01 · Pi 官方 SDK 文档
来源：[Pi 官方 SDK 文档](https://pi.dev/docs/latest/sdk)
类型：external-primary。范围：只作可嵌入/ResourceLoader/工具/session 能力的外部校验；latest 页面不代替 0.85.1 锁定源码。

<a id="e02"></a>
## E02 · OpenAI App Server 官方说明
来源：[OpenAI App Server 官方说明](https://openai.com/index/unlocking-the-codex-harness/)
类型：external-primary。范围：支持将 Codex App Server 列为后续独立 runtime probe；不证明 CW 已适配。
