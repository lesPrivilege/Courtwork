# Multi-agent首片 · Astra交付证据

开工 `27d37dad75c07f0bc0aa394c19d208e92c8c9a1f`，隔离分支 `codex/multi-agent-seams-20260910`。初片checkpoint `8f2a581` 尚待集成；接入telemetry主线 `6921dbd` 为 `c44e31f`，明确coordination schema8，保留main schema7 effort。最终组合提交与合流在 [current](../../engineering/current.md) 登记。

[裁定/入账](../../engineering/research/multi-agent-2026-09-10/README.md)、[生产合同](../../app/docs/coordination.md)、[C1–C10](../../engineering/research/multi-agent-2026-09-10/verification.md)。

## 实际交付

显式持久Thread、同scope Session成员关系、通信历史保留；本地outbox/inbox、精确target revision、同键回执、SIGKILL恢复；模型目录/自己收件箱/消息工具经原有Runtime边界，read_only deny、单次ask；Attention中的真实Thread管理和发送入口。child helper/grant/reducer是可执行conformance entry，没有生产Pi child scheduler。

## 作者验证

- [组合全量](tests-final.log)：**440/440**，在telemetry组合与最后一批边界修复后完成。
- [最终定向](focused-final.log)：**21/21**，coordination、request telemetry与renderer admission。
- [smoke](smoke.log)：现有material→tool→版本历史→重启续行通过，local-fake。
- 两项色彩/材质lint通过；[contrast](contrast.log)及[文档链接](doc-links.log)结果随最终文档复查更新。
- 前次[全量](tests.log)436/437：renderer admission的隔离fixture漏复制新增harness目录，已修正copy清单并保留原missing/present/sibling反例；不修改生产renderer准入来迎合测试。

## Luna独立范围

[Luna只读报告](luna-review.md)：源码scope/metadata反例、Pi固定commit核对、定向21/21复跑。最初发现的项目目录过宽、read_only metadata与执行不一致已修；人类HTTP全局读取与模型member/scope adapter分别明确。Luna自己的更早宽套结果439/440有一条CLI SIGTERM polling timeout；作者随后全量440/440通过，不把Luna那轮改写为通过。报告不是完整独立产品接受。

## 浏览器观察

真实同源UI，独立合成数据，未配置真实provider：

1. Attention对话中的“Threads & messages”可展开；没有默认选择最近会话，来源明确选择。
2. Research → Review发送合成消息，看到delivered回执；切换目标工作线，原消息和新消息都在真实inbox，旧主对话没有注入新turn。
3. 1280默认视口与390×844窄屏视觉检查；窄屏documentWidth=390、dialogWidth=374、消息体scrollWidth/clientWidth均340，无横向溢出，消息正文可在有界区域滚动。
4. 关闭对话/重新打开、草稿与创建/接续入口在本轮验证中记录；这不是完整视觉或原生AppKit验收。

交互是手动浏览器观察，未声称留存自动化截图套件。fixture状态留在独立临时目录，不作为产品数据或代码提交。

## 仍未交付

生产Pi parallel child、持久child recovery、通用grant升级、domain输入覆盖下的跨Matter proposal/SQLite事务、Expert handoff、Workflow、OTel桥接。当前`capabilities.explore/handoff/workflow:false`与此一致。Core3/app4、Paper不变；没有升级个人数据、付费模型、外部消息或部署。
