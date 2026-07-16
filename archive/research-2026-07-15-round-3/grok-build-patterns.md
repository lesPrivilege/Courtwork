# Grok Build（xai-org/grok-build）设计模式调研（2026-07-15）

来源：github.com/xai-org/grok-build（xAI 开源 coding agent + CLI，Rust）。调研原稿，不具约束力。**证据级别声明**：GitHub API 对该仓库返回空，仅读到 README 与 22 篇用户文档（行为级证据），未读到 .rs 源码——借鉴仅限「设计形状」，符合技术基线「agent loop 自研，只借鉴轻量、协议化、provider 无关的设计形状」。

## 采收（按落点）

**→ OUTPUT-CONFIRM-UI-1**：
- 五层授权管线，severity 排序 deny > ask > allow；危险命令永远重新提示、不吃 remembered grant；deny 与 hook 连 bypassPermissions 都绕不过（`22-permissions-and-safety.md`）。
- Plan Mode 三态审阅：进入审阅态后可写面收窄到唯一产物、逐行评论、批准/退回三态（`19-plan-mode.md`）——最贴近 non-applied 指令确认 UI 的现成形状。

**→ CHAT-MEMORY-1**：
- 先蒸馏后裁剪的 compaction 时序：硬阈值前留 `soft_threshold_tokens` 宽限窗先 flush 重要内容入 memory，再分级 pruning（保护近轮 / 保留工具结果首尾 / 超龄整段占位符化）（`13-memory.md`）。
- 但其「模型自主判断记什么 + 自动注入」的自动化程度不取——ADR-013 要求可撤销可审计、案件内容隔离，蒸馏结果是缓存不是裁决。

**→ agent loop / tools 演进（后置参考）**：
- rewind_points 逐 prompt 真实文件快照，回滚用快照非模型重建（`17-sessions.md`）——仅适用工作副本层，不触「原件只读」。
- 子代理深度硬限 1 层 + capability_mode 粗筛而非逐工具白名单（`16-subagents.md`）——符合「能平铺不上抽象」。
- **OS 内核级沙箱**（Linux Landlock / macOS Seatbelt，进程级、session 内 profile 不可弱化，deny glob 内核强制）（`18-sandbox.md`）——照出我们 packages/tools 仅应用层 path check 的真实 gap；登记为正式发布阶段的加固提案，MVP 不做。
- provider 凭证解析优先级链（显式 key→env→session→全局 fallback）与具名 extra_headers（`11-custom-models.md`）——形状可参，不引入其任意 URL 灵活度。

**→ 思考呈现**：ACP 事件三分流（正文/思考/工具调用独立事件类型）与任务栏动态子状态文案（"Running: …"/"Compacting"/"Retrying (2/3)"）——我们 ProviderStreamEvent 已同构（reasoning_delta/content_delta/notice），子状态文案思路可入品牌化思考反馈。

## 明确不取

模型自主蒸馏默认注入（用户主权冲突）；HTTP hook 外发完整 session envelope（内容不出域红线）；ACP 完整协议栈/多入口 runtime（不引第二 runtime）；宽松 devbox 沙箱取向（与原件只读反向）；危险命令清单当安全边界（其文档自认仅 UX 便利）。

## 旁证

其功能广度 = 大量独立小机制 + 独立 config surface 堆叠，非单一架构突破——反向印证复杂度节制判断：功能广度不等于复杂度免费。工具部分移植自 openai/codex 与 sst/opencode（Apache 变更声明），非全自研。
