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
- v0.1.1 Apple Silicon 开发构建已发布：annotated tag `v0.1.1` 指向 `39555d6`，GitHub Release 与 Pages 均已上线；desktop 129、provider 86、root 981、Rust 25、Playwright 208 全绿，远端 DMG 复算 SHA-256 与仓库记录一致。构建为 ad-hoc 且未公证，官网与 Release 明示该边界；
- demo 全链穿越、发布修实三项（遥测真开关、共享 docx 预检、产物存在后冻结）。

## 已发布入口

- Pages：<https://lesprivilege.github.io/Courtwork/>
- GitHub Release：<https://github.com/lesPrivilege/Courtwork/releases/tag/v0.1.1>
- 发布与部署证据：[`release/DEPLOYMENT.md`](../../release/DEPLOYMENT.md)
- 分支 / worktree：本地与远端均只保留 `main`；已验收分支已确认进入 `main` 历史后删除，已淘汰的 DESLOP-GATE-1 未合流分支直接删除。

## 当前架构债

1. desktop 仍有法律 type id 路由与 demo 语料直连，尚未完全由 RendererRegistry/descriptor 驱动；generic fallback 仍可能裸露 wire key。
2. PM 垂类仍有一套未接入 `VerticalPackageManifest` 的平行 descriptor，需要迁入唯一 ABI。
3. 除 RiskList 外，部分模型产物的最终 schema 仍直接包含 SourceAnchor，尚未统一为 quote → resolver → system anchor。
4. `services/ingest` 仍只有规格，OCR、分类与实体对齐未落地。
5. 企业私域 ACL、MCP adapter、机构层记忆仍是后置席位。
6. usage ledger 与真实 token/cost 投影尚未成为统一权威来源。
7. 部分 package SPEC/ACCEPTANCE 是长篇编年记录，后续应按层拆成“现行 SPEC + 历史验收”，但本轮不改其证据内容。
8. Chat 已走真实 Turn 流，Work 产品面仍以 demo recording 为主且模型步骤绕过 Turn；Tauri provider transport 与 chat orchestration 尚未通过 host port 分离。
9. Package manifest 仍把可序列化声明与 Zod runtime 对象混装，尚未形成 ADR-009 定义的 descriptor/bindings 双平面与版本化 artifact envelope。

## 下一阶段优先序

ADR-009 已拍板，第一波三单可并行但不得互相扩 scope：

1. `CONFIRM-CAS-1`：修复 Work confirmation 的 destructive take-before-validate，非法输入零消费、竞争 first-wins。
2. `ABI-2A`：建立可序列化 descriptor / runtime bindings 双平面，先迁 Legal；保留单点 compatibility adapter。
3. `HOST-PORT-1`：把 Tauri provider transport 从 chat orchestration 抽成可注入 host adapter，Rust wire 零变化。

第二波必须等对应前置独立验收并进入 main：`CORE-BOUNDARY-1` → `ABI-2B`（PM 唯一 ABI）→ `VIEW-ABI-1`（host renderer/zero-wire）→ `TURN-WORK-1`（Work 复用 Turn）→ `WORK-LIVE-1`（真实 WorkCommandPort 退役生产 recording）。SourceAnchor system producer 门随 ABI/VIEW conformance kit 持续推进，不由 desktop 特判补洞。

正式 macOS 公证、真实材料链/usage ledger 与包内 SPEC 瘦身继续保留，但不插队破坏上述依赖序。

## 发行边界

v0.1.1 的公开制品是 Apple Silicon 开发构建：ad-hoc 签名、未 Apple 公证。`codesign` 与 DMG 完整性通过不等于 Gatekeeper 公证；官网、Release notes 与校验文件必须持续保留这一区分，直到正式公证制品替换。
