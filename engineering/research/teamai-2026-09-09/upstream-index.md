# TeamAI 上游有界核验索引

日期：2026-09-09。本文是 `teamai-conversation.md` 的局部上游核验，不是 TeamAI 采用决定、Courtwork 架构决定或产品验收。

## 来源与完整性

- 原始讨论：[多专家架构分析](chatgpt-conversation://6aa14cb0-1718-83ec-a738-684f6137b6c2) 已完整读取 2 个 turn、4 条文本；无附件、无截断、`hasMore=false`。私有快照 `teamai-conversation.md`：590 行、19,818 字节，SHA-256 `b3ea07e0f1a20c345faac6fce4c7788b980bdc13bac3d6561247eb9846d49520`。
- 讨论 turn：`ba22d3e1-c3bd-46b7-81ad-b3fcc13b51ed`、`45617fda-1571-4b88-9943-252aeee27205`。原文的两种明文链接都指向 [Tencent/teamai-cli](https://github.com/Tencent/teamai-cli)；原回答另外列出的 12 个 citation token 没有 URL 映射，不能恢复成“已读来源”。
- 本轮固定 `main@498a68731932f69ae00e5924586bda0afa77b15a`（2026-09-09 `git ls-remote` 的 `HEAD` 与 `refs/heads/main` 相同），只读 GitHub 原始文件；没有安装、执行 TeamAI、运行 provider 或发起外部操作。

证据等级：`L0`=讨论自述；`L1`=固定提交的可读文档；`L2`=固定提交的实现路径；`L3`=独立 fixture/测试。本轮没有 L3。

| 固定文件 | SHA-256（本轮抓取） | 作用 |
|---|---|---|
| [README.md](https://github.com/Tencent/teamai-cli/blob/498a68731932f69ae00e5924586bda0afa77b15a/README.md) | `f8ac73455acfaa91c0e2cb192e065dafced1a445a30050bed396279bbaf64cb6` | 产品概念与 push/MR/pull 描述（L1） |
| [docs/usage-guide.md](https://github.com/Tencent/teamai-cli/blob/498a68731932f69ae00e5924586bda0afa77b15a/docs/usage-guide.md) | `97584d481c3222bc2302eae095a34e671ff76c7d9b51a53866b6d8b46aecffad` | scope、role/project、inheritance（L1） |
| [src/pull.ts](https://github.com/Tencent/teamai-cli/blob/498a68731932f69ae00e5924586bda0afa77b15a/src/pull.ts) | `284287725990de5322a6213b603367efc709818b6409be956fa73f1a79696aeb` | scope 拉取与注入路径（L2） |
| [src/resources/agent-format.ts](https://github.com/Tencent/teamai-cli/blob/498a68731932f69ae00e5924586bda0afa77b15a/src/resources/agent-format.ts) | `7f19437a1f9ee3d2647f333dc180a233e4d445fd9ee9dd3d4305a002fd52406a` | canonical agent 与 native renderer（L2） |
| [src/resources/agents.ts](https://github.com/Tencent/teamai-cli/blob/498a68731932f69ae00e5924586bda0afa77b15a/src/resources/agents.ts) | `f9a5ce26abe4352280768d5274df78eca80e5f58fa0e6c7d4f36e3be34de9338` | agent pull/push 调度（L2） |
| [src/recall.ts](https://github.com/Tencent/teamai-cli/blob/498a68731932f69ae00e5924586bda0afa77b15a/src/recall.ts) | `60c20b7eef59e44772fcec73c56809ab4ca88466d10c5d357246855748e1eaf6` | scope merge、anchors、quality、upvote（L2） |
| [src/code-knowledge-recall.ts](https://github.com/Tencent/teamai-cli/blob/498a68731932f69ae00e5924586bda0afa77b15a/src/code-knowledge-recall.ts) | `bc6e62d9fb8cf0ebe10b57f96a08dc9a0804bc5fadc458426634e35395ba1dfb` | code graph 与 source anchors（L2） |
| [agents/teamai-recall.md](https://github.com/Tencent/teamai-cli/blob/498a68731932f69ae00e5924586bda0afa77b15a/agents/teamai-recall.md) | `0a5b7f58ee8ca160735a49dd3fe7416409fd195ba818ed5fa1f415e076556adf` | recall agent 的调用约束（L1） |

## Scope 与继承

- `usage-guide.md#L116-L151` 把 project scope 定为默认安装位置，把 user scope 定为 home 级资源；`#L180-L210` 把 `role`（工作职能）与 `project`（活动项目）作为正交维度，并说明 namespace 是并集选择。
- `usage-guide.md#L425-L427` 声明 project 默认隔离；`inheritUserScope` 才组合安全的 user `skills/rules/docs/agents` 与相关知识。user `env`、MCP、sources、reporting、写入等控制面保持边界；文档同时记录非 self project 的 hooks 会注入 HOME 设置，这个例外不能被概括成“所有配置均隔离”。
- `src/pull.ts#L1423-L1465` 显示 scope lock、争用时整段跳过；`#L1471-L1521` 先检测 project，未开启继承就跳过 user，开启时先调用 user `pullForScope` 且只给 `['skills','rules','docs','agents']`，再拉 project。这个是实现路径，不证明 OS/container 或模型权限隔离。
- 局部可消费点：把 scope、role/project precedence、继承 allowlist 与控制面隔离作为 Expert 分发输入；不复制 TeamAI 的第二 registry，也不把 scope 选择提升为 Authority。

## Canonical agent 与 native rendering

- `agent-format.ts#L37-L78` 定义 team repo 的 canonical `AgentSpec`：`name/description/instructions` 必填，`model/tools/tool_extras/targets` 可选；`#L99-L131` 解析失败返回 `ParseResult`，不会以异常终止整个 pull。
- `agent-format.ts#L145-L269` 按工具输出 native 文件：Claude 等为 Markdown/YAML frontmatter，Codex 为 TOML，Cursor/OpenCode 有各自字段；`#L550-L614` 对多工具 reverse 结果比较公共字段，冲突时返回 conflict，私有字段按 tool 合并；`#L626-L639` 集中分派 renderer。
- `agents.ts#L339-L399` 的 `AgentsHandler.pullItem` 读取 canonical YAML，检查 `targets`、工具路径、安装状态和 disabled 状态，然后调用 `renderForTool` 写入目标目录；`#L302-L336` 的 push 路径写回 canonical YAML 或保留 legacy `.md`。
- 局部可消费点：保留 canonical → adapter-native → recorded/bound 的语义差额、版本与 capability；renderer 成功只证明文件写入，不证明目标 Runtime 等价、激活、曝光或执行授权。

## Recall、source anchors 与 upvote

- `agents/teamai-recall.md#L23-L47` 要求先跑 `teamai recall --check`；`NOT_RELEVANT` 可提前结束，`RELEVANT` 只表示分数越过阈值，仍要看 `matched/missing` 与文件内容。`#L94-L117` 区分 `route/context/lookup` 深度，`#L124-L181` 要求中英文关键词与有限重试；这是 prompt 约束，不是强制安全边界。
- `src/recall.ts#L157-L227` 以 scope/type、score、file、`Sources:`、snippet 输出，并明确结果“仅供参考”；`#L346-L370` 的 `--check` 输出阈值、标题、matched/missing 和 sources，便于调用方自己判断覆盖。
- `src/code-knowledge-recall.ts#L16-L29` 的 `SourceAnchor` 是 `{path, desc?}`；`#L272-L301` 清理 URL 与目录型 source，只保留具体文件路径；`#L303-L325` 从页面内容寻找锚点行；`#L434-L541` 按 depth 做 BM25/graph boost、预算和 related files。
- `src/recall.ts#L389-L435` 只在 project 未激活时查 user，或在 `inheritUserScope` 时 project-first、user-second；`#L453-L477` 对同 type+filename 的 project entry shadow user entry；`#L479-L505` 另查活动 project 的 code wiki。
- `src/recall.ts#L529-L565` 只取前 5 项、记录 session recall quality，并在非 dry-run 时调用 `autoUpvote`；`#L230-L253` 显示它写 `~/.teamai/votes/<user>.yaml` 并增加 `recalled_count`，失败 best-effort。继承 user hit 在 project mode 的 vote scope 中不写回（代码注释 `#L547-L550`）。
- 选择边界：`retrieved`/`recalled_count` 是使用 signal，不是 useful、correct、accepted 或 authoritative；source anchor 是可定位入口，不是授权。Courtwork 只能把它接到既有 bounded disclosure 与 signal/promotion policy。

## 未检项与下一步

- 本轮未审完整 hooks/friction lifecycle、`src/recall-toggle.ts` 的回收细节、uninstall 修复、provider/CI、权限/安全、全部测试和运行时兼容矩阵；这些只保留为可追溯待检项，不做成熟度或生产就绪结论。
- 最小独立验证顺序：对两个 scope 做合成 pull fixture；验证 canonical agent 在至少两个 renderer 的语义差额与 disabled/target 分支；验证 project/user shadow、source anchor 行定位和 auto-upvote 只形成可审计 signal。完成前不把 TeamAI 代码、hook 或 recall agent 直接并入 Courtwork。
