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
- v0.1.1 Apple Silicon Release 候选已从全量门后的主树生成：desktop 129、provider 86、root 981、Rust 25、Playwright 208；DMG 已通过 codesign/hdiutil/挂载/启动校验。构建为 ad-hoc 且未公证，官网与 Release 明示该边界；
- demo 全链穿越、发布修实三项（遥测真开关、共享 docx 预检、产物存在后冻结）。

## 当前架构债

1. desktop 仍有法律 type id 路由与 demo 语料直连，尚未完全由 RendererRegistry/descriptor 驱动；generic fallback 仍可能裸露 wire key。
2. PM 垂类仍有一套未接入 `VerticalPackageManifest` 的平行 descriptor，需要迁入唯一 ABI。
3. 除 RiskList 外，部分模型产物的最终 schema 仍直接包含 SourceAnchor，尚未统一为 quote → resolver → system anchor。
4. `services/ingest` 仍只有规格，OCR、分类与实体对齐未落地。
5. 企业私域 ACL、MCP adapter、机构层记忆仍是后置席位。
6. usage ledger 与真实 token/cost 投影尚未成为统一权威来源。
7. 部分 package SPEC/ACCEPTANCE 是长篇编年记录，后续应按层拆成“现行 SPEC + 历史验收”，但本轮不改其证据内容。

## 下一阶段优先序

1. SCHEMA-CONFORMANCE-1：统一 PM descriptor、host renderer 路由、zero-wire fallback 与 SourceAnchor system producer 门。
2. 正式 macOS 分发：外部提供 Developer ID 与 notarization 凭证后，把当前开发构建升级为 Apple 公证通道；仓库不得保存证书或密码。
3. 真实材料链与 usage ledger：用脱敏卷宗建立 OCR/实体对齐基线，并把 token、成本、context 接入权威账本。
4. 包内文档瘦身：保持当前证据不丢失，把长篇编年验收拆成现行摘要与 Git 提交索引。

## 发行边界

v0.1.1 的公开制品是 Apple Silicon 开发构建：ad-hoc 签名、未 Apple 公证。`codesign` 与 DMG 完整性通过不等于 Gatekeeper 公证；官网、Release notes 与校验文件必须持续保留这一区分，直到正式公证制品替换。
