# 开源上下游与消费纪律

本目录保留会折旧的生态事实及其工程用途。可用入口：[2026-09-05 快照](2026-09-05.md)、[本地来源](local-sources.md)。具体采纳见 [decisions](../decisions.md)，不由仓库热度或维护者叙述自动成立。

## 一次消费的闭环

```text
局部工程问题
→ 官方接口/代码/发行说明与社区失败线索
→ 固定来源版本、许可证、能力范围
→ 映射 M-ID 和 RD 的一个判别问题
→ 实验 / 裁决：采用、只借范式、延后或不用
→ 兼容回归与剩余胶水
→ 可复现问题回馈、响应消费、删除已被上游吸收的实现
```

不为“持续关注生态”无限积累仓库。每个来源必须指出消费者、决策影响或待验证问题；无消费者的材料只保留短索引。优先配置、公共 API/SDK、薄 Adapter；只有缺口无法通过这些方式闭合才讨论 fork，并指定退出条件。

## 来源卡要求

记录来源 ID、观察日期、URL/path、原文日期、release/commit、检索方式、许可证范围、事实与推论、消费者/RD、未核验项、复查触发器。浏览分支只能标“未 pin”；访问日不等于版本固定，更不等于已经运行。社区 issue 是故障线索，只有复现后才成为本项目失败证据。

快照记录本轮变化与决策影响；不每月整份复制。API 变化、release、弃用、归档、许可证或关键 issue 变化触发重查。进入实验/采纳/升级前必须固定依赖，不以旧快照代替。

## 当前渠道与问题队列

| 对象 | 上游渠道 | 本项目需要问/验证的边界 | 消费者 / 状态 |
|---|---|---|---|
| DeepSeek Harness | [仓库与贡献入口](https://github.com/deepseek-ai/deepseek-harness)、[Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions) | 公共插件接口、flush/恢复、pending interaction 与卸载兼容 | RD-001；内部问题，未发送 |
| Pi | [仓库](https://github.com/earendil-works/pi)、[贡献规则](https://github.com/earendil-works/pi/blob/main/CONTRIBUTING.md) | SDK/Session 层与 agent-core 边界、取消 settle、包迁移 | RD-001；内部问题，未发送 |
| OpenCode | [仓库](https://github.com/anomalyco/opencode)、[Issues](https://github.com/anomalyco/opencode/issues)、[Server 文档](https://opencode.ai/docs/server/) | 发行接口与 dev/V2 区分、重连补发、pending 恢复、取消 | RD-001；内部问题，未发送 |
| GUI wrappers | [OpenWork](https://github.com/different-ai/openwork)、[Pi Web](https://github.com/agegr/pi-web) | 哪些交互可独立消费，哪些依赖私有状态或具体宿主版本 | RD-003；参考，不接管产品路线 |
| 下游个人 demo | [本地场景索引](local-sources.md) | Evidence、版本差异与 Review 是否足够；遗留业务问题如何进入义务 | RD-002/003；无真实用户反馈记录 |

对外材料先在本目录形成草稿，包含确切版本、最小复现、期望/实际、影响、现有 workaround 与脱敏日志。提交前读取项目当前贡献规则，确认已有同类问题与许可。实际 issue/PR/邮件/消息须有明确授权；本次未向任何维护者发送消息。

后续通信记录采用：日期、问题/RD、草稿、发送授权、外部链接、上游响应、采纳版本、受影响契约、下一动作。尚无记录时保持空缺说明，不编造已联系。上游关闭 issue 不等于本地问题解决；合并后在目标发行版复验。

## 采用后的长期维护

为每个采用依赖指定维护者、固定版本、上游接口清单、禁止内部依赖、许可证目录、回归集、更新窗口、导出与退出方法。尚未采用时这些是待填义务，不制造不存在的 owner。

升级先比较接口和状态格式，再跑受影响 RD，最后更新锁定记录。新依赖造成文档、脚本、镜像或第二语言成本时一并计入。fork 的新增差异按“上游可回馈 / 暂时适配 / 本地长期语义”逐项登记；避免把本地产品语义硬推上游。

本机路径索引在其他机器可能不可用。使用者应报告 missing，按记录的标题/章节重新定位；不能静默替换成相似材料。可公开来源优先补原始外链；无外链则保留本地来源类别，不擅自上传私有归档。

## 本地治理与 Explore 方法索引

[2026-09-09 来源包](../research/local-governance-2026-09-09/source-index.md)完整映射一份授权会话的五个turn、图片和30个明文外链；六个原始页面有界抽查，其余仅索引。每项给消费者与重查触发，manifest保存消息hash。它为后续自研/评测提供出处，不新增依赖或替代固定版本、许可和独立复现。

[架构局部选型索引（2026-09-09）](../research/architecture-maintenance-2026-09-09/source-index.md)将Pi、DSH/Cordis、MCP Tasks、OpenAI/Anthropic缓存和VSCode贡献机制映射到AM施工单；保存用户handoff原件与消息hash，区分旧实验协议、新扩展与锁定实现，不新增依赖。
