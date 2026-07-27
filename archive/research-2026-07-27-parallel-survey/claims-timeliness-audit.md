# 历史论断时效核查（2026-07-27）

五组论断逐条核查，来源均一手（官方公告、官方文档、GitHub 现行分支源码），访问日 2026-07-27。

## 一 · Opus 5 条目（原登记为转述级）

发布属实：anthropic.com/news/claude-opus-5（2026-07-24），定价 $5/$25 per MTok，另有 fast mode（2 倍价、约 2.5 倍速）。「Claude Code 系统提示删约 80%」**部分成立**：出处是 Claude Code 团队成员 Thariq Shihipar 在 AI Engineer World's Fair 2026 炉边谈话的口头声明（"The system prompt for Claude Code has been reduced by 80% because of Claude Fable"，YouTube 21:24；Simon Willison 2026-07-21 转录）；claude-code CHANGELOG.md（至 v2.1.210）通读**零对应条目**；且削减按模型条件加载（Fable／Opus 4.8 生效，旧模型仍全量），非版本化删减。引用时按口头声明级，不作 changelog 级。

## 二 · DeepSeek 缓存四前提（ADR-021 依据）

官方 api-docs.deepseek.com/guides/kv_cache 现行文档逐条证实：(a) 缓存自动启用、无显式断点 API；(b) 无精确 TTL（"usually within a few hours to a few days"，best-effort 不保证命中）；(c) 前缀失配成立，**粒度修正一处**——缓存以 prefix unit 为单位落盘，命中要求完整匹配某 unit，有效命中截断到最后一个完整匹配的 unit 边界，非精确到失配 token；(d) usage 暴露 `prompt_cache_hit_tokens`/`prompt_cache_miss_tokens` 且差价显著。

**换代事实**：`deepseek-chat`/`deepseek-reasoner` 已于 2026-07-24 弃用、转为 v4-flash 非思考/思考别名；现行价（每 1M tokens）：v4-flash 命中 $0.0028／未命中 $0.14／输出 $0.28；v4-pro 命中 $0.003625／未命中 $0.435／输出 $0.87。**仓内核查（同日）**：`packages/provider/src/pricing-table.ts` 版本号 `2026-07-24-deepseek-pricing`，v4-flash ¥1/¥2、v4-pro ¥3/¥6（人民币价与美元价同源），统一按未命中价估高不估低；catalog 只列 v4 两型、无弃用死名——**WORK-BUDGET 冻结价目无暴露**。

## 三 · Claude Code compact 自认大请求

证实。code.claude.com/docs/en/costs 现行原文："**Compaction**: `/compact` reads the conversation it summarizes, so compacting a large context is itself a large request."

## 四 · opencode／pi 源码参照（ADR-021 决定六第 3 条依据）

证实。opencode dev 分支 `session/compaction.ts` 现存 `PRUNE_PROTECT = 40_000`、`hidden` 集合（排除已压缩消息）、`previousSummary` 滚动续接，另有 `PRUNE_PROTECTED_TOOLS = ["skill"]`；pi main 分支 `compaction.ts` 现存 `keepRecentTokens: 20000`、`reserveTokens: 16384`、`firstKeptEntryId`。

## 五 · 2026-06 以来快讯（一手链接，五条）

Claude Sonnet 5（06-30，原生 1M 上下文、$2/$10 促销至 8/31）；Claude Opus 5（07-24，见上）；OpenAI GPT-5.6 家族（07-09，`ultra` 档多 agent 并行＋Programmatic Tool Calling——模型写小程序编排工具降 token，**与本仓受控闭集反向，登记不采纳**）；DeepSeek v4 换代（见上）；Google 06 月一揽子（Gemini Omni Flash、Gemma 4 12B 本地运行）。

## 来源

anthropic.com/news/claude-opus-5；anthropics/claude-code CHANGELOG（raw）；simonwillison.net/2026/Jul/21/cat-and-thariq；api-docs.deepseek.com/guides/kv_cache 与 /quick_start/pricing；code.claude.com/docs/en/costs；sst/opencode dev 分支 compaction.ts；earendil-works/pi main 分支 compaction.ts；openai.com/index/gpt-5-6；blog.google 2026-06 AI updates。
