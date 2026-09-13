# Sources and evidence scope

审查日期：2026-09-13。仓库证据固定于 `24bd9545936dd19a498fc6b7eed5de106ac0d5e8`，除明确标注的历史证据与 SE 采用版本。以下是检索/读取索引，不是原始源码、Actions 日志或完整对话的归档。

## S01 · Runtime workflow

[Runtime workflow](https://github.com/lesPrivilege/Courtwork/blob/24bd9545936dd19a498fc6b7eed5de106ac0d5e8/.github/workflows/runtime.yml)

锁定 Node 22.19.0/24.x、Ubuntu、安装与测试顺序；checkout 未指定完整历史。

## S02 · RuntimeStore tests

[RuntimeStore tests](https://github.com/lesPrivilege/Courtwork/blob/24bd9545936dd19a498fc6b7eed5de106ac0d5e8/app/tests/runtime.test.mjs)

四个测试使用 /private/tmp，源码与 Node 24 失败日志一致。

## S03 · Historical migration fixture

[Historical migration fixture](https://github.com/lesPrivilege/Courtwork/blob/24bd9545936dd19a498fc6b7eed5de106ac0d5e8/app/tests/review-provider-publication-migration.test.mjs)

historicalStore 通过 git show 固定旧提交加载旧实现；与浅克隆存在环境依赖冲突。

## S04 · Runtime Actions run

[Runtime Actions run](https://github.com/lesPrivilege/Courtwork/actions/runs/34752311259)

本轮读取的固定 SHA push run；两个 Node job 均失败。

## S05 · Node 24 job

[Node 24 job](https://github.com/lesPrivilege/Courtwork/actions/runs/34752311259/job/103710791717)

本轮读取完整日志：942 total / 931 pass / 11 fail，后续 smoke 与 links 被跳过。

## S06 · Pages Actions run

[Pages Actions run](https://github.com/lesPrivilege/Courtwork/actions/runs/34752311258)

本轮读取 build job 103710791650 日志，README 生成一致性检查失败。

## S07 · Public README

[Public README](https://github.com/lesPrivilege/Courtwork/blob/24bd9545936dd19a498fc6b7eed5de106ac0d5e8/README.md)

发布叙事、运行指令、产品检查与并发说明；本轮读取完整文本。

## S08 · README source template

[README source template](https://github.com/lesPrivilege/Courtwork/blob/24bd9545936dd19a498fc6b7eed5de106ac0d5e8/site/src/readme.mjs)

根 README 对应生成源；缺少根文件新增的产品检查/并发段落。

## S09 · Site builder

[Site builder](https://github.com/lesPrivilege/Courtwork/blob/24bd9545936dd19a498fc6b7eed5de106ac0d5e8/site/build.mjs)

正常构建拒绝 README 与生成源漂移，报错给出 --write-readme。

## S10 · Current architecture node

[Current architecture node](https://github.com/lesPrivilege/Courtwork/blob/24bd9545936dd19a498fc6b7eed5de106ac0d5e8/engineering/research/architecture-node-2026-09-13/architecture.md)

五层责任、权限交集、恢复/续行、产品定义与已实现/未贯通边界。

## S11 · Architecture module map

[Architecture module map](https://github.com/lesPrivilege/Courtwork/blob/24bd9545936dd19a498fc6b7eed5de106ac0d5e8/engineering/architecture.md)

实际 owner、兼容存储坐标、最小纵切、SessionManager 耦合及替换轴。

## S12 · Attention conversation contract

[Attention conversation contract](https://github.com/lesPrivilege/Courtwork/blob/24bd9545936dd19a498fc6b7eed5de106ac0d5e8/app/docs/attention-agent.md)

全局角色、同一活动 Run 门、渐进读取、权限、尚未交付的 connector/scheduler/delegation。

## S13 · Release preflight evidence

[Release preflight evidence](https://github.com/lesPrivilege/Courtwork/blob/24bd9545936dd19a498fc6b7eed5de106ac0d5e8/evidence/release-preflight-20260913/README.md)

旧固定 SHA 的 GUI Local test、65/65 迁移、producer 修复、全量失败与定向复验范围。

## S14 · Existing release review intake

[Existing release review intake](https://github.com/lesPrivilege/Courtwork/blob/24bd9545936dd19a498fc6b7eed5de106ac0d5e8/engineering/release/review-intake-2026-09-13/README.md)

消费原有派工编号、固定 Pi 组合、DF-04 条件、既有验收与尚未关闭部分。

## S15 · G1–G5 public-readiness gates

[G1–G5 public-readiness gates](https://github.com/lesPrivilege/Courtwork/blob/24bd9545936dd19a498fc6b7eed5de106ac0d5e8/engineering/execution/2026-09-08-main-round/public-readiness.md)

独立启动/真实运行、正式闭环、连续性/界面、公开演示、事实映射。

## S16 · UI orchestration contract

[UI orchestration contract](https://github.com/lesPrivilege/Courtwork/blob/24bd9545936dd19a498fc6b7eed5de106ac0d5e8/docs/ui-orchestration-contract.md)

状态 owner、异步身份、草稿、pending、投影、正式决定与视图状态的分离。

## S17 · App composition source

[App composition source](https://github.com/lesPrivilege/Courtwork/blob/24bd9545936dd19a498fc6b7eed5de106ac0d5e8/app/web/app.mjs)

抽查开头导入、共享状态、navigationEpoch 与断点；并非全文件逐行审核。

## S18 · Paper binding

[Paper binding](https://github.com/lesPrivilege/Courtwork/blob/24bd9545936dd19a498fc6b7eed5de106ac0d5e8/PAPER.md)

工程采用 SE 9.6，正文独立维护；产品进度不直接驱动正文修订。

## S19 · SE adopted Canonical

[SE adopted Canonical](https://github.com/lesPrivilege/Schema-Engineering/blob/d78fd312955c1f594e59cbdcbb0d3074ac355940/papers/src/canonical.md)

抽查摘要、A/B/C 链、输入/输出治理与前部定义；不是全文重审。

## S20 · SE adopted Practice Index

[SE adopted Practice Index](https://github.com/lesPrivilege/Schema-Engineering/blob/d78fd312955c1f594e59cbdcbb0d3074ac355940/papers/src/practice-index.md)

抽查用途、登记格式和修订状态；支持最小观察先入 Index。

## E01 · LangGraph interrupts

[LangGraph interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts)

恢复可能从 node 起点重跑，前置副作用需幂等；参考其反例，不建议替换当前 Runtime。

## E02 · Carbon color tokens

[Carbon color tokens](https://carbondesignsystem.com/elements/color/tokens/)

语义 token 与组件专属 token 的作用域。

## E03 · Carbon motion

[Carbon motion](https://carbondesignsystem.com/elements/motion/overview/)

productive/expressive motion、任务层级与静态替代表达。

## E04 · W3C APG modal dialog

[W3C APG modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)

模态语义、键盘、焦点进入/返回；需要实际浏览器验证。

## 证据纪律

GitHub connector 读取的源码、日志与本轮推论分开。历史验收按原 SHA 保留，不能升级为当前候选 PASS。未执行本地完整测试、真实 Provider、浏览器截图或部署验收。外部资料经 Exa 检索并复核官方页面，只支持机制参考，不证明 CourtWork 通过对应检查。
