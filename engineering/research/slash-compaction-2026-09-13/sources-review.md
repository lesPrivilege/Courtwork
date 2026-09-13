# 来源与外部机制核对

2026-09-13；外部只为机制参考，CourtWork行为以本地固定源码与探针为准。源会话的内部citation token没有可解析URL映射；保留原文，不能当作本轮已打开引用。

| 来源 | 本轮实际确认 | 消费边界 |
|---|---|---|
| 安装的Pi 0.85.1 `dist/core/agent-session.js`、`dist/core/compaction/compaction.js`、`docs/rpc.md` | `compact(customInstructions)`先abort再发manual生命周期；原生阈值留reserve；RPC区分typed compact与get_commands，before/after字段有估算限定 | 以lockfile和SDK文件hash固定；SDK方法不是CourtWork已实现的公共命令 |
| [Pi官方RPC文档](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/rpc.md) | typed compact与commands discovery分开，TUI专属命令不都包含在discovery；estimatedTokensAfter是启发式估算 | 在线main只交叉核对，不以其当前版本覆盖安装0.85.1 |
| [Claude context window](https://code.claude.com/docs/en/context-window) | 根项目规则可重新注入；嵌套/按路径上下文与已调用skill有不同保留方式 | 只采用“持久来源重新编译”和摘要分离，不能概括成所有内容永不丢失 |
| [Claude hooks guide](https://code.claude.com/docs/en/hooks-guide) | PreCompact/PostCompact生命周期存在 | 不引入Claude hook或执行来源文档中的命令 |
| [Gemini context文档](https://geminicli.com/docs/cli/tutorials/memory-management/)与[session文档](https://geminicli.com/docs/cli/session-management/) | 提供context管理、会话保留入口 | 这两页不足以验证来源提及的50%/30%/50k、truncation和第二probe算法；这些精确值继续未核，不作为CourtWork默认值或已验证事实 |

来源中的Oh My Pi 2026-09-03具体bug、Codex指令细节未单独复核，本轮不复述为外部事实。对应“命令不能误送普通input”的风险已由本地合成探针独立观察，无需依靠该incident成立。原文的“Pike”不是仓库依赖名；本轮仅确认Pi 0.85.1，不推断额外runtime。
