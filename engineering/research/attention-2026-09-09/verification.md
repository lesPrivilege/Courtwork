# Attention Assistant：有界来源核验记录

观察日：2026-09-09。这里记录实际读到的网页和代码路径，服务于 [`source-index.md`](source-index.md) 和 [`selection-index.md`](selection-index.md)。记录不构成产品验收、安全审计、上游背书或许可意见。外部仓库没有安装或运行；原作者的效果、规模和成熟度数字没有转写成本项目结果。

## V01 · GoRaven README / 产品自述

- 上游仓库：[8treenet/goraven](https://github.com/8treenet/goraven)。观察时 `refs/heads/master` 为 `55eda72890230a0a42c72b9599f6cfe1c480ead8`；固定 README 入口：[README@55eda728](https://github.com/8treenet/goraven/blob/55eda72890230a0a42c72b9599f6cfe1c480ead8/README.md)。
- README 自述每个团队成员拥有独立 Agent workspace，共享 project/skill library，管理员可控制 model quota、tool permission 和 data access；Agent 可读写文件、运行 Shell、调用 MCP；页面还自述 skill marketplace、plugin hooks、Docker/self-hosted 和 Apache-2.0 badge。
- README 的设计段落明确反对把“memory and evolution”作为 Agent 的长期负担，强调 observability、OS 和 engineering first。这是上游设计取向，不是 Attention 的性能或正确性证据。
- 结论：可作为产品边界和研究问题的入口；“isolated workspace”仍是 README 层自述，必须与下面的代码路径分开记录。

## V02 · GoRaven workspace / 文件路径实现

固定代码入口：

- [`core/sandbox/local/local.go@55eda728`](https://github.com/8treenet/goraven/blob/55eda72890230a0a42c72b9599f6cfe1c480ead8/core/sandbox/local/local.go)
- [`config/config.go@55eda728`](https://github.com/8treenet/goraven/blob/55eda72890230a0a42c72b9599f6cfe1c480ead8/config/config.go)
- [`core/sandbox/local/file_manager.go@55eda728`](https://github.com/8treenet/goraven/blob/55eda72890230a0a42c72b9599f6cfe1c480ead8/core/sandbox/local/file_manager.go)

实际读到的路径和符号：

1. `local.go:29–35` 的 `NewLocalSandbox(userName)` 将 `Workspace` 设置为 `config.Get().GetUserSpace(userName)`。
2. `config.go:175–203` 的 `GetUserSpace` 以 `Paths.UserSpace/userName` 组装目录，并创建 `documents`、`temp`、`downloads`、`images`、`videos`、`projects`、`skills` 等子目录。
3. `file_manager.go:30–40` 的 `resolvePath` 对清理后的路径做 workspace 前缀检查；`ReadFile` 和 `WriteFile`（`91–134`）都先经过该函数。
4. `local.go:304–321` 的 `validateFilePath` 允许用户 workspace，也允许显式配置的 `extraWorkspace`；这说明共享项目目录是另一个授权面，不是用户目录自动隔离的证明。

这支持一个精确的局部结论：GoRaven 当前固定代码有按 `userName` 生成 workspace 路径、并在文件管理器中阻止相对路径逃逸的实现线索。它没有证明：

- 每个 session/agent 都有唯一目录或唯一 ID；
- 并发进程之间有锁、租约、CAS 或冲突检测；
- shell、MCP、数据库、缓存和共享 project 都遵循同一隔离边界；
- 目录权限、容器边界或宿主机 OS 隔离满足安全承诺；
- 在当前部署配置中 workspace 路径不会被外部输入改变。

## V03 · GoRaven shell 与测试负面核验

固定入口：

- [`core/sandbox/local/shell.go@55eda728`](https://github.com/8treenet/goraven/blob/55eda72890230a0a42c72b9599f6cfe1c480ead8/core/sandbox/local/shell.go)
- [`core/sandbox/local/local_test.go@55eda728`](https://github.com/8treenet/goraven/blob/55eda72890230a0a42c72b9599f6cfe1c480ead8/core/sandbox/local/local_test.go)

实际读到的边界：

- `shell.go:36–48` 将空的 `ValidateCommand` 替换为 no-op；调用方没有提供校验时，默认不拒绝命令。
- `shell.go:127–133` 以 `/bin/sh -c` 构造命令，并设置进程组取消；该函数没有设置 `cmd.Dir` 到 `Workspace`，也没有在此处以 workspace 做命令级路径约束。取消/超时控制进程生命周期，不等于文件系统隔离。
- `local_test.go:8–92` 的测试主要是 `t.Log` 加硬编码本地路径的手工样例；没有看到两用户交叉访问、`../` 反例、shell 越界、并发 session 或恢复测试。

因此，GoRaven 的文件 API 路径守卫不能被升级成“整个 Agent runtime 已隔离”。这是一项待上游或本地独立 fixture 验证的实现问题；本轮没有执行任何越界命令或启动 GoRaven。

## V04 · GoRaven plugin seam

固定入口：

- [`plugins/README_EN.md@55eda728`](https://github.com/8treenet/goraven/blob/55eda72890230a0a42c72b9599f6cfe1c480ead8/plugins/README_EN.md)
- [`core/plugin/registry.go@55eda728`](https://github.com/8treenet/goraven/blob/55eda72890230a0a42c72b9599f6cfe1c480ead8/core/plugin/registry.go)

页面和代码明确给出 `Plugin` 的 `Name`/`Version`、显式 `RegisterAll`，以及 `RoundHook`、`ToolHook`、`SSEHook`、`AgentLifecycleHook`。指南写明注册顺序、各 hook 的错误处理和主 goroutine 执行；`registry.go:18–24` 保存 factory，`43–67` 为每个新 agent 建立新实例。

这支持“显式注册的进程内 hook / 每 agent 实例”这一局部选型。没有核验到独立进程、权限沙盒、版本兼容矩阵、热卸载、失败回滚或第三方包的稳定性保证；不要把 `Version()` 字段当成完整 lifecycle contract。

## V05 · Pi parallel isolation issue

- 补充上游页面：[earendil-works/pi#7812](https://github.com/earendil-works/pi/issues/7812)。该页面不是来源副本中的明文 URL，而是为核对 GoRaven 冷邮件所引用的 Pi 问题而补读。
- 页面实际状态为 closed / not planned，并带 no-action 类标签；页面显示由 `lesPrivilege` 于 2026-08-08 开启。正文描述第二个交互式 Pi 进程在未使用唯一 session directory 与 ID 时可能复用默认 session，造成状态干扰和测试歧义。
- 页面没有看到已合并 branch 或 PR。截图只留在个人 Attention 项目，不复制到仓库。

结论：这是一个真实的上游问题线索和反例背景，不是 GoRaven 已解决 Pi 问题、也不是 Courtwork 已完成隔离契约的证据。后续任何公开回复都应附本地可复现 fixture 或明确的代码观察。

## V06 · Agent Inbox

- 页面：[shariqh/agent-inbox](https://github.com/shariqh/agent-inbox)。实际读到 README/项目页。
- 页面把项目定位为本地 command center；agent 通过 stdio MCP 与共享 SQLite 状态交互，界面提供 flag、pending、status、board 等 attention/ownership 操作。页面区分 saved、delivered、acted 等状态，并说明 delivery receipt 不等于 agent 已恢复执行。
- 许可 badge 显示 MIT；本轮没有安装、运行或验证其 watcher、MCP host 和多进程边界。

可消费的是“attention control plane 与 runtime 分离”和“交付状态不等于执行结果”的局部机制；不能消费为完整 isolation、可靠 delivery 或 Courtwork schema。

## V07 · MAAT

- 页面：[eragonlonelyboy-lab/maat](https://github.com/eragonlonelyboy-lab/maat)。实际读到项目页/README。
- 页面定位为 Multi-Agent Attention Terminal：在本地展示 Claude Code/Codex traces、Needs-You queue 和证据，刷新循环不调用 LLM，不发送 telemetry；状态从 transcript/files 推导，并区分每-turn receipts、deterministic checks 和 redacted findings。
- 许可 badge 显示 MIT；本轮没有运行其 CLI、导入 trace 或验证“zero token/zero telemetry”在所有路径成立。

可消费的是 deterministic projection、evidence 与 status 分离；不能把其 README 说法当成本项目 benchmark 或产品接受条件。

## V08 · Open Walnut

- 页面：[EvanZhang008/walnut](https://github.com/EvanZhang008/walnut)。实际读到 GitHub 项目页和 README。
- 页面自述 self-hosted personal AI，组织 Claude Code sessions、tasks、notes/memory，支持多个 local/SSH session、断线后继续、浏览器/SSH/server 重启后保留状态和 review diff/comment；本地数据涉及 JSON/YAML/Markdown/SQLite。
- 许可 badge 显示 MIT；本轮没有部署、恢复或并发测试。

可消费的是 work object、session 和 durable local state 的 UI 形态；“可恢复”和数据持久性只保留为作者/README 自述。

## V09 · Agent Skills 与 Codex 官方文档

两个页面分别核验：

- [Agent Skills specification](https://github.com/agentskills/agentskills)：实际页面说明轻量开放格式；技能目录以 `SKILL.md` 为入口，包含必需的 `name`/`description` 元数据，可带 `scripts`、`references`、`assets`，并按 discovery → activation → execution 渐进披露。页面标示代码 Apache-2.0、文档 CC-BY；这不自动授予本产品复制第三方 assets 的权利。
- [OpenAI Codex Skills](https://developers.openai.com/codex/skills)：官方文档说明 Codex 使用开放 Agent Skills 格式，技能承担 workflow authoring，plugins 负责安装/分发 skills 和 connectors，并按需加载；文档还描述项目内 `.agents/skills` 的发现和显式/隐式调用。该文档不证明 Courtwork 的 Practice adapter 已实现，也不证明任意 runtime 无损执行。

可消费的是“高层 Practice 语义 + 薄的 Skills-compatible 执行封装”；不新造平行的 `CWPractice.md` 格式，不把 skills 发现机制当作权限授予或 runtime isolation。

## V10 · 个人作者实践：Sid Bharath 与 Martin Schenk

- [Sid Bharath — How I built Jarvis](https://sidbharath.com/blog/how-i-built-jarvis/)：实际读到作者文章。文章叙述先用 Markdown，遇到重复和格式漂移后改用 JSON machine source of truth，再生成 Markdown views；`CLAUDE.md` 记录职责、来源、流程与 approval/context 规则。这是作者的演化记录，不是通用性能定理。
- [Martin Schenk — 15 projects with Claude Code](https://dev.to/martinschenk/how-i-run-15-projects-with-claude-code-without-losing-the-thread-23lb)：实际读到作者文章。文章提出 external signal 的 origin 应先于 classification，邮件可以提出工作但不能单独授权无人值守执行，并区分 autonomous/dialogue/decision。这里的数字、运行次数或实践效果若有出现，均按作者自述，不作本项目结果。

两篇文章可作为 manual-first、source-of-truth 和“signal ≠ authorization”的 practice 候选；没有独立复现实验或代码审计。

## V11 · 未能实际读取的 Codex wrapper 页面

[Cloudx 的 Codex app-server wrapper 文章](https://dev.to/cloudx/how-i-built-a-personal-ai-super-app-by-wrapping-codex-app-server-5fp6) 是来源副本中的明文 URL，但本轮直接打开失败。因此只保留 URL 和对话中的候选定位，不主张其 timeline、approval、delegation、recovery 设计已经存在或有效。若未来以该文章支撑 runtime adapter 选择，应先重新获取正文、记录日期和版本，再与本地实现对照。

## 核验退出边界

本轮达到 8 个公开来源页面 + GoRaven 6 个固定 Go 代码路径（另含 1 个 plugin guide）+ 1 个补充 Pi issue 的有界读取范围。其余明文外链都已在 [`source-index.md`](source-index.md) 标为 `indexed_unverified`，不需要为了填充数量继续扩展检索。下一次实施前只针对具体消费者重新核对版本、许可、失败边界和可复现实验；外部来源不自动修改 Paper、架构权威或产品状态。
