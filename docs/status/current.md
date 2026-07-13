# 当前基线

更新时间：2026-07-13
提交基线：`f03e742`
分支状态：所有已命名本地与远端分支 tip 均为该基线祖先，提交层已合流。

## 已成立

- schemas / registry / package ABI 与 namespaced artifact 基础；
- provider 无关 core、六段 harness、事件账本、确认续行与 runtime guard；
- 模型引语到系统坐标的 citation resolver，含受限重试与 coverage 剪枝；
- legal 包、PM 第二垂类 schema 基础；
- docx/md/txt/文本层 PDF 阅读视图与 docx 修订/批注管线；
- web fetch 安全基线、受限系统文件动词与可撤销 FileOpsPlan；
- Tauri desktop、provider 凭证流、chat/work 双面与 schema 工作面；
- demo 全链穿越、发布修实三项（遥测真开关、共享 docx 预检、产物存在后冻结）。

## 当前架构债

1. desktop 仍有法律类型路由、文案或 demo 语料直连，尚未完全改为 registry/descriptor 驱动。
2. `services/ingest` 仍只有规格，OCR、分类与实体对齐未落地。
3. 企业私域 ACL、MCP adapter、机构层记忆仍是后置席位。
4. usage ledger 与真实 token/cost 投影尚未成为统一权威来源。
5. 部分 package SPEC/ACCEPTANCE 是长篇编年记录，后续应按层拆成“现行 SPEC + 历史验收”，但本轮不改其证据内容。

## 下一阶段优先序

1. desktop ABI 化：移除包外领域路由与 demo 直连，并用边界守卫触红。
2. 真实材料链：启动 ingest spike；用脱敏卷宗建立 OCR/实体对齐基线。
3. schema UX：以真实 artifact 密度完善 renderer，禁止占位供养。
4. usage ledger：把 token、成本与 context 使用量接入权威账本。
5. 真实 provider 与真机回归：维持承诺对照 gate，防止 UI 声明超前于能力。

## 非提交态说明

主工作树与另一个历史 worktree 在本次重整开始时存在未提交修改。它们未被视为分支、未被合入，也未被本次工作触碰；只有形成提交并通过独立验收后才可进入基线。
