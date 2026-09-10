# EX-VG1 · 外部影像 skill 拆解

执行者：并入 WO-VG-01 第 0 项，由 Opus 按需执行（intake VG-14）；交付路径与问题清单不变。

## 目标

把[参考索引](../inputs/visual-reference-index-2026-09-10.md)里的外部 skill 拆成可比较的契约，供 WO-VG-01 按需取用。只取机制（intake VG-9、`engineering/design/reference-consumption.md`）。

## 范围

必读：`anthropic-style-diagram`、`fireworks-tech-graph`、`design-system-assets`；zyncli-template 只读 `process-cutaway`、`paper-architecture`、`spatial-systems`、`axonometric-commons`、`cyanotype-evidence` 五个。p5js、repo-graphics、brand-studio 只看 README 是否有 manifest 或 QA 机制，没有就一行记“无可取”。

## 每个 skill 回答

1. 许可与最近维护日期。
2. 调用方与 renderer 的职责边界：输入是什么结构，哪些决定留给调用方。
3. 构图规则：其中哪些是**可检查**的（能写成断言），哪些只是品味描述。
4. QA：具体检查项，以及是否有可运行的实现（语言、依赖）。
5. negative constraints 原文要点。
6. 对照 intake VG-2 / VG-3 / VG-8：可取 / 不取 / 理由，每条一行。

## 禁止

- 不安装、不 vendor、不运行第三方脚本。
- 不把品牌色值、字体或配色抄进交付。
- 不改 `site/`，不改 registry 与 intake。

## 交付

`engineering/release/publishing-visuals-2026-09-10/explore/ex-vg1-skill-deconstruction.md`，每个 skill 一节，末尾一张汇总表：可写成 VG-10 断言的检查项清单（去重）。无法访问的来源如实记录，不据错误推断内容。
