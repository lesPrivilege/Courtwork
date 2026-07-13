# Courtwork

**法律团队的工作台，不是聊天窗口。**

通用 agent 卖能力，能力在贬值；垂类 agent 卖秩序——场景、防呆、承诺、留痕——秩序在复利。**模型越便宜，秩序越值钱**（论纲全文见 docs/92）。Courtwork 把这句话造成实物：案件装进文件夹，模型在写好的秩序里工作，产出带着来源，签字之前一切可回溯。

## 一次真实请求的解剖

每次推理请求的 prompt 不是自由拼接，而是五段确定性组装，随后进入固定编排：

```
契约段 → 声明段 → 租户段 → 续行投影 → 会话与语料      （组装，优先级律定序）
   ↓
组装 → 编排 → schema 校验 → 确认门禁                    （执行，模型只做填空）
```

- **契约段**是不可协商的红线：无锚不落格、原件只读、不可逆动作留人确认。
- **声明段**来自垂类包的场景声明——编排是数据，不是代码；换垂类 = 换声明。
- **续行投影**是案件工作语义的确定性摘要，禁止 LLM 压缩——投影可测试，压缩会漂移。
- **语料是数据，不是指令**；模型只生成，裁决停在门禁，由人签字。

## 架构（依赖只向 schemas，禁横向）

```
packages/schemas      契约根：typed artifacts + JSON Schema 导出 + drift 守护
packages/registry     场景注册表：声明式场景（S1–S4、S6），strict 校验
packages/core         headless 执行器：事件流协议、确认门禁、信源台账、provider 层（OpenAI 兼容基线，quirk 表治理）
packages/tools        确定性接口：主体核验 / 引用校验 / 文件操作执行器（销毁级动词不存在）
packages/output       纯 TS OOXML 著录器：docx 修订 + 批注（WPS 硬验收）
packages/reading-view 阅读视图：office 文件 → md + 段落级锚点（md 是模型母语，原件只读）
packages/demo-data    样板案语料（临江精铸 v. 起云智能）：唯一装配点注入，src 零直连
eval/                 promptfoo 跑分器：模型选型与回归门禁
apps/desktop          Tauri v2 成品：三栏工作台、Schema 面五视图、门禁交互、阅读视图汇流
services/ingest       OCR 摄取（Python，等真实卷宗样本开工）
```

五个必须自研加固的节点（开源填不上，是壁垒所在）：OCR 印章/手写、跨文档法律实体对齐、docx 的 WPS 兼容、卷宗结构还原、法律垂类评测集。

## 治理

多模型多会话开发，三条不变量高于一切任命（AGENTS.md）：

1. **实现与验收分离**——任何会话不得验收自己的实现；
2. **契约拍板独属架构会话**——实现与验收只能标 `[需架构拍板]` 上报；
3. **纪律对模型一视同仁**。

判例集全部由真实事故淬炼成文：宽 add 误吞、暂存核对、pathspec 边界、worktree 复核、端口隔离、假绿被验收抓获、重复派单转独立复验。工单史与验收记录全程在册（docs/11、docs/55、各层 ACCEPTANCE.md）。

## 门禁体系

- **192 条端到端断言**（Playwright，假绿下限禁降——`assert-test-count.mjs` 机器锁）
- **16 道机器门禁**：动效属性 / 法理之线 / 图谱主题 / 图标 / 预览边界 / 高程阴影 / 各批次契约断言 / 中性色单源
- **850 条单元测试**（vitest，104 文件），golden files 快照对照（S3 场景 7/7 预埋考点命中）
- 设计纪律机器化：中性阶从藏青单源派生（`assert-neutral-source`）、de-slop 黑名单、零技术概念暴露扫描

## 快速验证

```bash
pnpm install
pnpm test                              # 全仓单测（104 文件 / 850 例）
pnpm --filter @courtwork/core demo:s3  # 无 UI 全流程：样板案合同 → 风险 → 留人确认 → 带修订与批注的 docx（golden 对照 PASS）
pnpm --filter @courtwork/desktop test:e2e  # 16 门禁 + 169 条 e2e
pnpm --filter @courtwork/desktop dev   # 桌面壳 dev（浏览器 1420 端口；Tauri 成品见 BUILD 记录，dmg + SHA-256）
```

## 路线图

- **HARNESS 正序**：SCHEMA-SPEC-1（namespaced ID + 版本迁移）→ PACKAGE-ABI（manifest + 五 registry + 引用闭合）→ 法律包迁出 core → 组装器六段（byte-stable golden）→ MCP 适配 → PM 包上架（终证 = 零 core diff）
- **引用闭环**："模型出引语，系统出坐标"——锚点坐标由 resolver 铸造，模型机制性失去伪造 offset 能力
- **摄取**：真实卷宗样本到位后开 OCR v1（PaddleOCR-VL 首选）
- **对外**：本仓全史公开 + GitHub Pages 产品站 + Release dmg；机制、判例与实现同源可考古

## 核心纪律速查

模型只生成不裁决｜不可逆动作归用户｜静默降级零容忍｜契约先行 schemas 为根｜厚薄算法（上游会变强的做薄，数据/判断/场景做厚）｜声明高于代码｜通用层禁渗领域语义｜零技术概念暴露｜缺口三态诚实声明｜销毁级动词永不存在。

---

*Cowork + **u r t** = Courtwork。you are there——没有人被取代，你就置身 loop 之中。*
