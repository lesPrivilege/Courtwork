# Markdown Review A0 · 证据与接受

2026-09-10；产品读取基线 `1f437a98e57cffb17cdde5c3fd864fe38ce8efd5`，架构包见 [研究入口](../../engineering/research/markdown-review-2026-09-10/README.md)。仅研究/评测代码，无 app、Core、Runtime、schema 或 vendor 产品修改。

| 范围 | 作者与复核 | 实际结果 |
|---|---|---|
| Parser source-coordinate experiment | Astra 作者；Luna 非作者重跑并逐条审查 | [10/10](parser-spike/results.json)；验证 parser 行为与反例，不是产品源映射 |
| 现有 renderer DOM/安全基线 | Terra 作者；Astra 读码、提出修订并独立新端口重跑 | [8/8 cases、0 exceptions](baseline/astra-results.json)；真实 Chrome 调用 app/web/ui-controls.mjs 的 markdown() |
| Revision fixture integrity | Terra 合成夹具；Astra 重跑同一结构/hash校验 | 7/7 declared hashes；不计 anchor/rebase 产品通过 |
| 200 KiB 组件样本 | Terra 作者及 Astra 独立各一次 | Astra 204,816 bytes，86.4ms 观察值；无性能门槛，无产品全链/样式/容量接受 |
| 架构跨层复核 | Luna 接缝探索，Astra 最终裁定 | review revision/receipt namespace 独立；重定位确认延到 A3；file action capability/version 不混用 |
| 七个上游仓库 | Luna 固定 SHA 读码，Astra 消费报告并修订裁定 | [来源报告](../../engineering/research/markdown-review-2026-09-10/luna-sources.md)；没有运行这些完整 app/test，不称安全/性能已验 |

## Renderer 修订与归因

Astra 复核首次回执后要求更正 HTTP(S) 文案与增加 HTTP 断言、绑定测试源码 hash/HEAD、修复 Chrome 启动后失败清理并加入 CDP 超时。Terra 在同一 evidence 写权内修订并复跑；生产 markdown() 一字未动。

- `baseline/author-results.json`：Terra 初跑，保留历史。
- `baseline/terra-final-results.json`：Terra 修订后作者结果。
- `baseline/astra-results.json`：Astra 使用独立端口 8977 / CDP 20277 和新临时 profile 重跑的固定副本。
- `baseline/results.json`：runner 最近一次结果；未来复跑会更新，不作为不可变副本。

独立执行使用同一测试脚本，不称独立设计了8组反例。Terra 的不可用 Chrome 清理反例为作者验证；Astra 读码确认清理分支，本轮未再次故障注入。脚本、fixture 及复跑说明见 [baseline](baseline/README.md)。两个执行者各自关闭自己的临时服务/浏览器；不接产品 backend、不运行真实 provider、不操作个人数据。

## 边界

本轮没有持久评注、精确 inline/source-display 映射、流式块稳定、完整 semantic diff 或模型质量验收。Incomplete snapshots 是静态安全检查。当前源码只支持其受限语法，math/Mermaid/footnote/images/relative assets 的观察不当作已实现支持。200 KiB 直接 renderer 压力样本超过当前 ES 单文件上限，不改变服务合同。

Astra 接受此有界研究与评测交付。后续产品施工从 MR-A1 开始，依赖/DDL/HTTP capability 仍待其明确施工单；本次不修改 Paper、不发布、不关闭 G1–G5。

入库检查：73个本地链接无缺失，转录9,637 bytes及SHA-256与manifest一致，全部本单JSON可解析，两支新脚本语法检查通过。diff whitespace检查除逐字稿外通过；逐字稿原有两处Markdown hard break的行尾空格保留，不修改来源hash。仅显式stage本研究包、evidence包与current；共享树原有WK-98未提交证据不纳入。


## MR-A1a · 原始文本坐标基础

[作者交付](source-coordinates/README.md)与[Astra 合流复核](source-coordinates-integration/README.md)分别记录来源与接收。该纯模块未接入产品调用链，不把原始字节坐标当作 parser/显示文本坐标。
