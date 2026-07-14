# 调研底稿

本目录存放**尚未被 ADR 吸收**的调研报告。

## 状态与权威层级

按 `docs/README.md` 的既定规矩：**调研结论只有被 ADR 吸收后才具约束力**。本目录的全部内容位于权威层级的最低档，位置等同「提交史与 `archive/`」：

- 不得被实现会话当作验收标准或工单依据；
- 不得覆盖 schema、`CLAUDE.md`、Accepted ADR 或包内 `SPEC.md`；
- 与现行契约冲突时，一律以现行契约为准，冲突本身登记为待裁决项；
- 一旦结论被 ADR 或 SPEC 吸收，对应报告即移入 `archive/`，不在现行链路里留第二份真源。

调研派发的评估依据：六份报告对应的是**从未被覆盖过的缺口**，不是既有调研的翻新。`archive/docs-legacy-2026-07-13/docs/` 的 26 份调研全部产出于 2026-07-09~07-13 并已被 ADR-009~012 吸收，本轮不重做。

## 本轮报告

调研日期：2026-07-14。基线：`d7756a7`。

| 报告 | 核心结论 | 回灌目标 |
|---|---|---|
| [durable-work-state.md](durable-work-state.md) | CAS 边界正确，但 CAS 的**对象**错了：六条顺序契约 × 全量重写 envelope ⇒ 总写入量 O(N²)。建议改「小 snapshot + append-only tail」。另：macOS 原子替换须 `F_FULLFSYNC`，未落到系统调用级验收标准 | ADR-010 决定二 |
| [host-file-authorization.md](host-file-authorization.md) | 非沙盒下 security-scoped bookmark 用不上；真正机制是 TCC，而 TCC 按**代码签名身份**记账 —— ad-hoc 签名每次发版身份即变，「注册一次免每次提醒」每次发新版都会被打破 | ADR-004 / ADR-005 |
| [package-machine-gates.md](package-machine-gates.md) | ADR-012 七条约束无一能「装工具就绿」，但也无一不可机器化。仓库已有两个可照抄的自研门先例；browser-safe 须以 `esbuild --platform=browser` 真实构建为唯一权威判据 | ADR-012 |
| [legal-scan-corpus.md](legal-scan-corpus.md) | 中文法律扫描件语料结构性不存在（官方源自建立起即无图像模态）。合成基线可即刻启动，但印章遮挡召回率与手写批注策略两项须有真实样本锚点，否则不得结项 | `services/ingest/SPEC.md` W3 |
| [wps-compat.md](wps-compat.md) | 本报告不能替代实测。挖到 WPS 官方社区自认、至今未修的修订/批注共存缺陷；另有一条更硬的待验旧证据：WPS 产出 docx 可能不合标准 ZIP 规范，严格解析器解压即失败。已转为 14 行实测矩阵 | `packages/output/SPEC.md` |
| [deepseek-usage-billing.md](deepseek-usage-billing.md) | 峰谷计价已官宣且响应体无档位字段 ⇒ **无法从 usage 反推真实成本，只能显式标估算**。且 `provider-stream.ts` 归一化时已在丢弃 DeepSeek 明确返回的 cache/reasoning 字段 | ADR-007 |

## 时效提醒

- `package-machine-gates.md` 与在飞的 `VPKG-META-1` 直接重叠；`VPKG-EXPORTS-1` / `VPKG-LAYOUT-1` 已并入 `main`，该报告对这两条已转为回溯核对。
- `durable-work-state.md` 须在 `WORK-STORE-1` 开工前完成回灌，否则构成返工。
- `deepseek-usage-billing.md` 的价格与峰谷时刻表是会变的外部事实，引用时以报告内标注的抓取日期为准。
- 归档 05 号对 `baidu/Unlimited-OCR` 挂的「跟踪 1–2 个月」复核窗口到期在 2026 年 8 月下旬。
- 归档 16 号已记 MCP 规范候选版预定 2026-07-28 引入无状态核心、Extensions、Tasks、MCP Apps；企业接入面的复核不早于该日期。

## 已知门误报（待架构角色裁决）

`site/scripts/deslop-scan.mjs` 的 `archive-reference` 规则从仓库根扫描全部 `.md`（`docs/` 不在排除集内），其正则 `[^)\n>]*\/archive\/` 会把**任何路径含 `/archive/` 的外部 URL** 判成「引用归档内容」。本轮实际命中一例：Apple 官方手册页 `developer.apple.com/library/archive/...`——属误报，与 Courtwork 的 `archive/` 无关。

当前规避方式：该 URL 在 `durable-work-state.md` 里以行内代码而非 markdown 链接形式给出，URL 原文完整保留、可验证。`DESLOP-GATE-2` 是已验收合流的门，本轮**未擅改**；是否给规则加「排除带 scheme 的外链」由架构角色裁决。

## 体例

- 置信度三档：**✓** 本次实抓（含 URL 与抓取日期）；**※** 训练语料所知（截至 2025-05，可能已漂移）；**⚠** 推测/未验证。查不到一律写「未能核实」，不得以记忆冒充实抓。
- 判定沿用既有判例词汇：直取形状 / 改造取形 / 可评估 vendored / 不适用。**取形不取码**。
- 报告只陈述调研，不改架构、不定验收标准。对现行 ADR 的挑战写在各报告的「回灌建议」一节，由架构角色裁决。
