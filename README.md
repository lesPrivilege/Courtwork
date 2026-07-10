# Courtwork

法律垂类 Agent——案件文件夹级协作工作台，对标 Cowork 交互范式，面向中国律所与企业法务团队。**卖的不是能力，是秩序**：场景化、防呆、承诺、留痕（docs/92）。

**状态（2026-07-10）：全部工单验收放行，Build 段完成。** core MVP 成立、Tauri 桌面成品可装可跑、eval 转正为选型与回归门禁。待办仅余：真实 provider key 首跑（冒烟 + eval 真实基线）→ 对外演示（S3 合同审查 + S6 卷宗整理双剧本）。

## 快速验证

```bash
pnpm install
pnpm test                              # 全仓测试
pnpm --filter @courtwork/core demo:s3  # 无 UI 全流程：样板案合同 → 核验 → 留人确认 → 带修订与批注的 docx
# 桌面成品：apps/desktop（Tauri v2），DMG 见 src-tauri/target/release/bundle/
# 真实模型冒烟：packages/core scripts/smoke-provider.ts（读环境变量 key，无 key 明确跳过）
```

## 架构（依赖只向 schemas，禁横向）

```
packages/schemas      契约根：typed artifacts（含 RevisionInstructionSet/FileOpsPlan）+ JSON Schema 导出 + drift
packages/registry     场景注册表：声明式场景（S1–S4 + S6），strict 校验，触发三维
packages/core         headless 执行器：事件流协议、确认门禁、信源台账、provider 层（OpenAI 兼容唯一基线）
packages/tools        确定性接口：party-verify / cite-check / web-fetch(C级+消毒) / 系统动词 / 文件操作执行器（无 delete）
packages/output       纯 TS OOXML 著录器：docx 修订+批注（全生态唯一可靠修订引擎，WPS 硬验收）
packages/reading-view 阅读视图：office 文件 → md + 段落级锚点（md 是模型母语，原件只读）
packages/demo-data    样板案语料（临江精铸 v. 起云智能）：数据与 src 解耦，装配点唯一注入
eval/                 promptfoo 单跑分器 + 中性结果格式：模型选型与回归门禁
apps/desktop          Tauri 成品：三栏工作台、五工作面、composer、⌘K、专注模式、S6 整理计划
services/ingest       OCR v1（Python，等真实卷宗样本，W3/W8）
```

## 文档索引（docs/）

- **00–05** 战略与规划：意见稿 / 规划稿 / 竞品全景 / MVP / Roadmap / 开源选型
- **06–19** 调研报告（DeepResearch、编辑面、防呆、记忆、安全、合规、provider、动效……）
- **10/11** 实施切分与全部工单/验收 prompt（追加式，含完整判例）
- **20–29** 架构决定（ADR"宪法"）：信源分级 / 演示数据 / 泛化边界 / 编辑面 / 场景注册表 / 记忆 / curation / 安全分期 / 数据承诺 / 企业库
- **30–35** 设计：brief / 调研分发 / 设计语言包（tokens/规格/北极星屏/图标）/ sol-review / GeminiUX
- **40–50** 场景与观察：S5 对比 / MVP 缺口三态 / 合批验收 / 可视化选型 / 组件图标 / composer / 控件全量清单（活文档）/ 文件操作分级 / 场景族预言 / 通用底座路由 / workflow 阶梯
- **90–92** 手册与终稿：架构会话工作手册（再水化入口）/ 协作范式泛化 / 垂类结构优势

## 治理（AGENTS.md）

多模型多会话开发：实现（默认 Grok，重码 Opus，Sonnet 在池）× 独立验收（异模型）× 架构拍板（本仓库唯一契约权威）。三不变量、git 判例集（宽 add 禁令 / 暂存核对 / pathspec 边界 / worktree 复核）、共享索引 CAS 协议、全仓 build 自查——全部由真实事故淬炼成文。

## 核心纪律速查

模型只生成不裁决｜不可逆动作归用户（确认门禁/定稿编译/续行）｜静默降级零容忍｜契约先行 schemas 为根｜厚薄算法（上游会变强的做薄，数据/判断/场景做厚）｜声明高于代码｜通用层禁渗领域语义｜零技术概念暴露｜缺口三态诚实声明｜销毁级动词永不存在。
