# 当前基线

更新时间：2026-07-14
重整输入基线：`f03e742`
当前基线：以本文件所在 `main` 提交与发布 tag 为准。
分支策略：发布完成后只保留 `main`；实现/验收分支在确认均为 `main` 祖先且报告已收账后删除。

## 已成立

- schemas / registry / package ABI 与 namespaced artifact 基础；
- provider 无关 core、六段 harness、事件账本、确认续行与 runtime guard；
- 模型引语到系统坐标的 citation resolver，含受限重试与 coverage 剪枝；
- legal 包、PM 第二垂类 schema 基础；
- docx/md/txt/文本层 PDF 阅读视图与 docx 修订/批注管线；
- web fetch 安全基线、受限系统文件动词与可撤销 FileOpsPlan；
- Tauri desktop、provider 凭证流、chat/work 双面与 schema 工作面；
- `@courtwork/provider` 独立包与 DeepSeek-only 产品注册；custom/base URL 猜测入口已退役；
- PROVIDER-2 已经异会话验收并合流：DeepSeek catalog 单源、Rust 原始字节真分片、Provider 增量 SSE、单一生成路径与 credential/connection 正交状态成立；
- TURN-1 已经异会话验收并合流：正文、reasoning、usage、失败、取消与严格事件闭集拥有 provider 无关生命周期和终局回放；
- INTERACTION-1A 已经异会话验收并合流：垂类 manifest 提供 strict 通用问题模板，legal 内容与锚点政策由 registry 深冻结注入；
- INTERACTION-1B 与 CHAT-UI-1 已经异会话验收并合流：Turn journal、刷新回放、core first-wins 回答、真实 stream projection、Stop/cancel 与通用交互卡成立；
- BRAND-1 已经异会话验收并合流：CaseRail 的透明核心标记固定在 `Courtwork` 左侧，无底盘、阴影或动画；
- SITE-2A / SITE-2B 已经异会话验收并合流：首页以“原件 → 引语 → 结论 → 人工确认”为主骨架，产品图来自已验收主树的 computer-use 真机操作，OG 消费无底盘核心标记；
- POLISH-P0 与 SCHEMA-POLISH-1 已经异会话全量验收并合流；
- DESLOP-GATE-2 已经异会话验收并合流：裸色、阴影、圆角、渐变、L1 嵌套、archive 消费、press/popover 与泛化文案使用精确消费点白名单；
- ADR-009 第一波与 ABI 收口已经异会话验收并合流：HOST-PORT-1、CONFIRM-CAS-1、ABI-2A、CORE-BOUNDARY-1、ABI-2B 全部进入 main；Legal/PM 同次走唯一 descriptor/bindings ABI，PM 保持 catalog-only；
- VIEW-ABI-1/1C 已经异会话验收并合流：desktop 生产路由由 descriptor + host blueprint 驱动，通用表严格按 schema/presentation 投影，未知或漂移载荷统一 zero-wire fail closed；
- TURN-WORK-1 已经异会话验收并合流：Work 模型步骤只经 `TurnRunnerPort`，每次调用先链接 Turn，notice、失败与取消沿统一 Turn 账本回放；
- WORK-PORT-1 已经异会话验收并合流：App 只消费注入的 Work projection，demo recording/gate/review 全部收口 fixture adapter，非 demo 与跨 session 查询 fail closed；
- v0.1.1 Apple Silicon 开发构建已发布：annotated tag `v0.1.1` 指向 `39555d6`，GitHub Release 与 Pages 均已上线；desktop 129、provider 86、root 981、Rust 25、Playwright 208 全绿，远端 DMG 复算 SHA-256 与仓库记录一致。构建为 ad-hoc 且未公证，官网与 Release 明示该边界；
- demo 全链穿越、发布修实三项（遥测真开关、共享 docx 预检、产物存在后冻结）。

## 已发布入口

- Pages：<https://lesprivilege.github.io/Courtwork/>
- GitHub Release：<https://github.com/lesPrivilege/Courtwork/releases/tag/v0.1.1>
- 发布与部署证据：[`release/DEPLOYMENT.md`](../../release/DEPLOYMENT.md)
- 分支 / worktree：本地、远端与 worktree 当前只保留 `main`；后续临时 `codex/*` 工单仍须在实现与验收提交均确认成为 `main` 祖先、报告收账后删除。

## 当前架构债

1. `WorkCommandPort` 契约与 projection 注入缝已经成立，但生产实现仍未装配；真实 run/resume 必须等待 ADR-010 的 browser/store/material/binding 前置。
2. ArtifactEnvelope 的持久读写与 package migration 尚未接入真实生产账本；当前 ABI 已定义形状与准入，但 Work live 持久层未落地。
3. 除 RiskList 外，部分模型产物的最终 schema 仍直接包含 SourceAnchor，尚未统一为 quote → resolver → system anchor。
4. `services/ingest` 仍只有规格，OCR、分类与实体对齐未落地。
5. 企业私域 ACL、MCP adapter、机构层记忆仍是后置席位。
6. usage ledger 与真实 token/cost 投影尚未成为统一权威来源。
7. 部分 package SPEC/ACCEPTANCE 是长篇编年记录，后续应按层拆成“现行 SPEC + 历史验收”，但本轮不改其证据内容。
8. `PriorityScore` 的确定性计算在任一参数 OOC 时返回 `null`，但 v1 payload schema 的 `score` 仍不接受 `null`；在创建任何 PM scenario 前须由 `PM-SCHEMA-1` 以版本化契约收口。

## 下一阶段优先序

ADR-009 的 VIEW/TURN 两条前置线已独立验收、进入 main 并清账。代码审计证明不能把
`WORK-LIVE-1` 直接当接线单：当前缺 browser-safe/durable Work state、真实材料入口与 S3 垂类 binding。
ADR-010 已把依赖收口，`WORK-PORT-1` 已独立验收清账。现先做 `WORK-BROWSER-1`，把 core Work graph
收成 WebView 可消费的纯协议出口；之后 `WORK-STORE-1` 与 `CASE-ROOT-1 → MATERIAL-INGRESS-1` 再按
文件面错峰，最后 `LEGAL-S3-BINDING-1 → WORK-LIVE-1`。recording 永久只在 fixture/demo mode，不引入
第二 chat runtime、agent loop 或 PM 空壳流程。

`PM-SCHEMA-1` 是独立的垂类契约修复：令 OOC score 与确定性计算同义，并完成 payload 版本、JSON Schema、
descriptor 与迁移边界。它可在不触碰 desktop/Work live 的条件下另行派发，但未完成前不得创建 PM scenario。
SourceAnchor system producer 门随 VIEW conformance kit 持续推进，不由 desktop 特判补洞。

正式 macOS 公证、真实材料链/usage ledger 与包内 SPEC 瘦身继续保留，但不插队破坏上述依赖序。

## 发行边界

v0.1.1 的公开制品是 Apple Silicon 开发构建：ad-hoc 签名、未 Apple 公证。`codesign` 与 DMG 完整性通过不等于 Gatekeeper 公证；官网、Release notes 与校验文件必须持续保留这一区分，直到正式公证制品替换。
