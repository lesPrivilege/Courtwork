# 当前基线

更新时间：2026-07-13
重整输入基线：`f03e742`
新基线：以本文件所在提交为准。
分支状态：重整开始时，除当前重整分支外的所有已命名本地与远端分支 tip 均为输入基线祖先，提交层已合流。

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
- POLISH-P0 与 SCHEMA-POLISH-1 已经异会话全量验收并合流；
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

1. TURN-1：把思考、reasoning、正文、usage、失败与取消落成 provider 无关生命周期。
2. INTERACTION-1 / CHAT-UI-1：垂类 manifest 注入问题、选项与锚点；core 暂停/续行；desktop 渲染通用轻框卡。
3. SCHEMA-CONFORMANCE-1：统一 PM descriptor、host renderer 路由、zero-wire fallback 与 SourceAnchor system producer 门。
4. DESLOP-GATE-1：首版因 allowlist 过宽被拒收，按拒收报告重做精确消费点白名单，不合入旧实现。
5. 真实材料链与 usage ledger：用脱敏卷宗建立 OCR/实体对齐基线，并把 token、成本、context 接入权威账本。
6. SITE-2：底座与 chat 工单独立验收后，以真实 fixture 把首页重构为“原件 → 引语 → 结论 → 人工确认”的证据链。

## 非提交态说明

主工作树与另一个历史 worktree 在本次重整开始时存在未提交修改。它们未被视为分支、未被合入，也未被本次工作触碰；只有形成提交并通过独立验收后才可进入基线。
