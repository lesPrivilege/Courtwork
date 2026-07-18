# 解耦全量审计（2026-07-18，三腿并行）

审计原稿，不具约束力；裁定已升格就绪图 AUDIT-SEAL-1/2/3。命题：架构规划（包边界/双轨/demo 隔离/effect 授权/声明式编排）是否真落盘在 import 图、路由与机制里。

## 总判定

核心不变量在已装配路径上**全部成立**：依赖方向无环收敛（A）；core/legal 等 provider 无关（A）；descriptor 零可执行 renderer（A）；chat/work 双 journal 与组合根纪律落盘（B，含四起真机漂移的修复均在码）；确认账本 validate-before-consume + first-wins 严密（C）；模型输出零裁决零分支驱动（C）；`WorkCommandPort.publish` 仍进程内 callback（B）。

## 违规与漂移（已裁定归票）

**结构性口子两处（AUDIT-SEAL-1，P0）**：

1. `runTools()` 的 sideEffect 门只在 `confirmationPolicy.mode==='none'` 生效——gates 模式场景的 toolIds 在门禁之前无条件执行且不受分级校验（`legal.S6` 的 `file-ops-executor` 悬空声明正踩此口，当前因未装配而非活）。裁定规则：**全模式 toolIds 一律过 sideEffect 门——pure_read 与 ADR-004 无损级动词放行，其余拒绝**；`file-ops-executor` 移出 S6 toolIds（执行属确认后动作，非场景前置工具）。
2. `scoped_write`（`host_auth.rs`）底层无 target-exists 保护——「原件同名不可覆写」只靠 App.tsx 单点 sha256 比对自律。裁定：**覆盖保护下沉宿主层**（已存在文件默认拒绝，显式 overwrite 标志才放行），原件只读红线获得防御纵深。

**单门/无门残余（AUDIT-SEAL-2，P1）**：`installCredentialTestHooks`/`installProviderConnectionTestHooks` 无 DEV+E2E 双门且无静态断言（生产 bundle 唯二无门注入点，虽不构成越权发请求但破自建纪律）；`file-ops-demo.ts` 与 `legal-interaction.ts` 的 demo 语料仅 UI 单门（缺 `assertDemoRef` 式运行时二次校验，与 demo/client.ts 双门范本不一致）；`handleChatSend` 的 workContextSegment 死参数（清理项）。

**包语义泄漏（AUDIT-SEAL-3，P1）**：`packages/tools` 两处真实 schema 级法律语义（cite-check 的 `CitationTypeEnum=['statute','case']` 与中国法律数据源注释；party-verify 的 `litigationSummary`）——tools 身份已法律化，违「工具零垂类语义」；根因是 core 的 package-boundary 机器守卫未复制到 tools/reading-view/output 三包（检测盲区）。

**文档级**：eval 对 demo-data 的生产依赖属有意设计（评测标准答案与 demo 语料同源）但无显式豁免——已补 CLAUDE.md 例外句。Chat→Work「存入」桥只灌 UI 回显不注语境（设计如此，非缺陷，留观察）。

## 方法论收获

「规划≠落盘」的四起真机漂移（路由捷径/语料渗透/stub 绕分支/跨案在途）全部在审计中确认已修——试点暴露与审计扫尾形成闭环；新抓的口子全是**机制不对称**类（守卫只覆盖姊妹路径之一），提示今后立门时以「族」为单位铺满（四 hook 有门则六 hook 全有门；none 模式有门则 gates 模式同门）。
