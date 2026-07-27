# pi 生态摸底报告（2026-07-26，云端 Sonnet 网页层调研）

架构裁决三枚（正文为调研原件）：①`SANDBOX-PROBE-1` 候选对＝sandbox-runtime（进程级）vs gondolin（microvm，预期作对照组）；②`TOOL-READ-1` 借形坐标＝官方 permission-gate/protected-paths/tool-override 三例＋cc-safety-net 外置反例；③textbook 零命中，教学消费改拼装（作者博客四篇＋官方 extensions 文档＋示例分类）。深读名单五项中三项在 pi 本体（本地已有，核版本），新增 clone 三仓：cc-safety-net、gondolin、pi-review，各自票开工前取用。注意 WebFetch 数字（star/日期）不可靠已被调研自证，机制描述多源交叉可信。

---

## 调研原件

**方法论**：先读归档 pi 一手源批次避免重复；云端无 git 通道，全程 WebSearch + WebFetch；star 数与精确日期标注为网页转述不可信（同仓两次 fetch 星数矛盾的自证已记录），机制性描述多源交叉。

### 一、官方面（earendil-works 组织 + 作者个人站）

- `earendil-works/pi`：核心 monorepo（pi-ai/pi-agent-core/pi-coding-agent/pi-tui），原 badlogic/pi-mono；6 个月 235 版；MIT。
- `earendil-works/gondolin`：实验性 Linux microvm（QEMU）agent 沙箱，TS 控制平面；README 明确有 Pi+Gondolin 扩展在微虚拟机内跑 pi 工具挂载 /workspace；v0.8.1；Apache-2.0。
- `earendil-works/pi-chat`：Discord/Telegram 频道桥接沙箱化 pi 会话，每频道一个 Gondolin microvm；MIT。
- `earendil-works/pi-review`：代码审查扩展，/review + /end-review 两阶段有状态工作流，支持 REVIEW_GUIDELINES.md；MIT。
- `earendil-works/pi-tutorial`：交互式教程模式扩展（pi -e 直接跑）；Apache-2.0（与主仓 MIT 不同，逐仓核对勿默认继承）。
- `earendil-works/absurd`：PostgreSQL 持久执行工作流系统，pi 的外围基础设施非依赖；Apache-2.0。
- `earendil-works/pi-website`、`website`、`waves`：站点/公司/描述空白，未展开。
- **pi.dev/packages：官方扩展 registry 实存，自报 5,312 包**（Extension/Skill/Theme/Prompt 四类）——首页扫读曾误报无 registry，直访证伪，记录以警示单信摘要。
- mariozechner.at：作者个人站。

### 二、extensions 生态（五类）

**权限/确认**：官方 `permission-gate.ts`（危险 bash 前确认，借形价值高）、`protected-paths.ts`（受保护路径写阻断）、`tool-override.ts`（包装 read 拦 .env）；社区 `kenryu42/cc-safety-net`（MIT，跨 Codex/Claude Code/OpenCode/Gemini/Copilot/Kimi/Pi 七家的 PreToolUse hook：语义分析命令意图、递归解析 bash -c 包壳、fail-closed、规则 SHA-256 锁源——权限层外置解耦的成熟范本）；`SecKatie/pi-permission`（已归档弱信号）。

**sandbox/隔离**：官方 sandbox 示例（`@anthropic-ai/sandbox-runtime`：macOS sandbox-exec / Linux bubblewrap，整体替换内置 bash，network/filesystem 策略面）；gondolin（虚拟机级对照端）；subagent 示例（作用域收窄思路）。

**compaction/memory**：官方 `custom-compaction.ts` + docs/compaction.md（切点不劈 toolResult 的结构保证）、`trigger-compact.ts`、**`handoff.ts`（提取消息生成 handoff prompt 向新会话转移——我方交接实践的机器版先例）**；社区 pi-hermes-memory、pi-rewind（存在性记录）。

**工具扩展**：todo/hello（registerTool 最小范式）、`ssh.ts`（整体替换四件套委派远程）、dynamic-tools/kimi-deferred-tools（运行时注册/延迟加载）；registry 命中 pi-mcp-adapter、pi-subagents、pi-web-access。

**UI/TUI**：question/questionnaire（ctx.ui.custom 交互范式）、renderer/status-line；社区集合 luongnv89/pi-extensions（advisor-pi「咨询高阶模型」模式可留意）。

发现渠道：GitHub topic pi-extension（约 19 仓）+ 官方 registry（5,312 包，未逐一核实只做存在性证明）。另记 a5c-ai/babysitter：跨 CLI 确定性自编排框架，plugins/babysitter-pi 为适配层。

### 三、textbook/教学资源

**独立 textbook 载体零命中**（如实）。替代拼装：作者博客——2025-11-30「What I learned building an opinionated and minimal coding agent」（薄 harness 设计哲学，对照 TOOL-READ-1/ADR-017）、2025-08-15「MCP vs CLI」与 2025-11-02「What if you don't need MCP」（工具接口第一性论证）、2025-06-02「Prompts are code, .json/.md files are state」（对照 ADR-021）；pi-tutorial（产品化引导流程非知识体系）；第三方 gg-skills/pi（17 件结构化参考，2026-03-24 快照自称可能过期，需交叉验证）；YouTube 访谈三支（存在性记录）。

### 四、深读名单（≤5）

1. pi 本体 `examples/extensions/{permission-gate,protected-paths,tool-override}.ts` + docs/extensions.md → TOOL-READ-1 借形（钩子注册模式）。
2. pi 本体 `custom-compaction.ts` + docs/compaction.md → ADR-021 借形（切点保护、summary 注入基线）。
3. 官方 sandbox 示例 vs gondolin → SANDBOX-PROBE-1 两档隔离粒度成本对照（借形+对照组）。
4. cc-safety-net → TOOL-READ-1 架构反例/范本（权限层外置、fail-closed 语义分析）。
5. pi-review → 扩展管理跨多轮状态的实战样板（命令生命周期与状态持有）。

**License 自查**：范围内零 GPL/AGPL；pi-tutorial Apache-2.0 注意逐仓核对；未核实项标注未核实不默认放行。
