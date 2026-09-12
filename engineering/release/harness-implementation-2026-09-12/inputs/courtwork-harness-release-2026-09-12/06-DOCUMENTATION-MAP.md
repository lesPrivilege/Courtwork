# 06 · 文档、PR、RD 与证据的单一消费链

## 1. 不再追加一套平行平台文档

本包是本轮 review/intake 工件。进入仓库后，完整原件保留在一个新的 intake 目录；本地有效结论应回填已存在的 owner 文档。不要把全文复制到多个入口，也不要改写 received 原文。

| 现入口 | 只更新什么 | 不承担什么 |
|---|---|---|
| `engineering/architecture-runtime-canon.md` | DEC-013 的实施附录：选定 Pi、双解耦线、Runtime Port/Run Plan、native state 边界 | 不写全部任务状态、不替 Paper 改版本 |
| `engineering/roadmap.md` | 本轮第一/第二实施列与后续 DRT 的唯一依赖顺序 | 不复制所有 PR 验收细节 |
| `engineering/release/harness-next-node-2026-09-12/README.md` | 从“用户待排候选”更新为本轮已采用卡片和来源；旧缺件边界保留 | 不继续维持另一套总顺序 |
| `engineering/current.md` | 仅在真实发生后登记合同采用、代码合流、测试/发布事实，链接回执 | 不把方案写成已实现、不以 author self-test 冒独验 |
| HPR received 原件与原 mapping | 保持不可变；新 disposition/crosswalk 回指原包与本包 | 不把后版缺件计为已消费、不改旧作者原文 |
| `docs/runtime-control/api.md` 与当前 `.d.ts` | 新增字段/错误/权限/历史语义的唯一有效合同；先 proposed，接线后标 implemented | 不把多个研究稿各自 DTO 都当正式接口 |
| 运行时基础与 turn ownership 文档（P00 从现索引定位） | 已采用代码的 owner/恢复/测试命令差异 | 未复核内容只登记待修，不凭题名重写 |
| RD-006/007 与 BE-6/7 现稿 | 消费依赖、关键接缝、最新实现/未实现边界 | 不扩展成全部资源/插件治理大平台 |
| `evidence/<本轮命名>/` | 精确源码、命令、原始结果、覆盖与非作者关系 | 不写个人 key、不覆盖旧失败日志 |
| README/Pages | 仅在对应 G1–G5/能力证据成立后更新可用范围 | 不从架构图推导自动编排/模型能力收益 |

首次施工不要新占 DEC-014 或 RD-008；需正式编号时先由当前 owner 在全仓查重并分配。

## 2. 文档状态至少分两轴

`decision = adopted / amended / deferred / rejected / blocked`。  
`delivery = proposed / implemented / author-tested / independently-verified / integrated / released`。

采纳一个研究结论不等于它 implemented；代码 integrated 不等于 feature independently-verified；网站 released 不等于 G1–G5 全部通过。只在证据支持的轴上推进，不用一个“accepted”覆盖所有含义。

原 24 HPRO 的逐项清账在 P00 做；本包按 P00–P12 卡片层面提供处置。未全文重验的 HPRO 不能被包级采用自动打成已修复。本包内容完整，不依赖丢失的后版 14 卡/316 项返件。[R03](SOURCES.md#r03)[R11](SOURCES.md#r11)

## 3. 双向映射

```text
原用户输入 / 固定原包
          ↓ source ref + version/hash（实际取得字节后计算）
本轮裁定条目 / 原 P 卡处置
          ↓ chosen owner + allowed paths + contract
施工 PR（实际编号与 SHA，在创建后补）
          ↓ case IDs + raw evidence
非作者验证 / 集成回执
          ↓ 当前状态 / 发布能力声明
```

每个 output 有去处；每个实施项能回源。无需逐行重复长文，但必须保留原件和稳定引用。本包 `plan.json` 只是这一映射的便携投影，入库后实际状态仍以现 current/专项合同为准，禁止两边手写相互冲突的 done。

## 4. 为 Agent 接手准备的最小阅读集

默认读取 working agreement、current、实际领单、相关 contract、精确来源和测试证据。不要让每个 worker 默认读 Paper 全文、所有研究摘要与所有历史 current 段落。只在争议出现时沿稳定引用下钻。

开始一个 PR 时给出固定基线、允许路径、非目标、输入版本、硬负例与退出条件；代码作者只消费它负责的一片。集成者持有跨卡映射，不把跨 owner 的临时建议变成实现者可自行扩张的授权。

## 5. 文档自身的完结条件

所有链接可解析到固定源或标明 planned；未产生的 PR 不用伪 URL；新增文件明确 proposed；不得把 current 旧段当今天状态。迁移、恢复与 API 合同只有一个 owner。原件、摘要、裁决和最终代码不能混为同一种 artifact。
