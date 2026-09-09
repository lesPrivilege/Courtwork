# EX-PS4 · Eval 证据面：发布 SHA 下可以展示什么（Sonnet，只读）

派单：Fable，2026-09-09。裁定依据 [intake](../intake.md) PS-13。输出：`../explore/ex-ps4-eval-surface.md`（只写此文件）。

## 问题

Pages 的证据区要回答八个问题：What was tested · Against what · With which model · Which harness · Which fixture · What was held constant · What failed · Can I reproduce it。在当前 `main` 上，continuity benchmark 对每个问题能给出什么事实，哪些问题现在只能回答"not yet"。

## 只读来源

- `benchmarks/continuity/`：`README.md`、`standard.md`、`observation-contract.md`、`cases.json`、`grade.mjs`、`observe.mjs`、`run.mjs`、`courtwork.mjs`、`fixture-identities.mjs`；
- `evidence/se-continuity-20260908/`：`author-first.json`、`luna-independent.json`、`luna-review.md`、`checks.log`；
- `evidence/pro-review-remediation-20260908/README.md` 与 `engineering/research/se-continuity-2026-09-08/README.md` 中关于 S / E 差异、评分盲区与"有界模型 pilot"的段落；
- `engineering/current.md`「Benchmark / SE 连续性」一行。

## 交付表

1. 八问对照表：`问题 · 当前可给出的事实（文件:行）· 证据等级（code fact / 文档声明 / 运行观察）· 缺口`。
2. 用例表：`cases.json` 每条 `id · 场景一句 · 观察关系 · 评分项`（只转录字段，不评价）。
3. 运行记录表：已存在的每次运行 `文件 · 日期 · 执行者 · provider（fake / 真实）· 结果摘要字段 · 是否独立复核`。
4. Baseline 与 SE 两列在协议里的定义原文位置；若协议未定义 baseline，如实写。
5. 失败分类：协议中是否有 failure taxonomy；有则转录类目名，无则写无。
6. 复现命令：README 给出的实际命令，与其前置条件。
7. 结论不超过十行，只陈述观察；不得写"建议展示""可以宣称"。

不做：运行 benchmark、修改文件、启动服务。
