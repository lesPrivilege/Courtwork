# Round 3 调研批次（2026-07-15）

本目录是 Round 3 期间的外部调研原稿，**只作线索与历史证据，不具约束力**；结论只有被 ADR 或工单 prompt 吸收后才生效（吸收记录见对应工单与 `docs/architecture/implementation-readiness.md`）。

| 文档 | 主题 | 已吸收落点 |
|---|---|---|
| `provider-switch-mechanisms.md` | cc-switch / claude-code-router / New API / Cherry Studio 的 provider 切换机制 | 三个 profile schema 盲点（参数化怪癖、双层粒度、模型别名）待第二 provider 需求到来时立 ADR 吸收 |
| `interaction-visual-regression.md` | 交互态视觉回归与 UI 残留检验方案 | 已吸收为 `UI-RESIDUE-1` 工单（开合闭合门 + DOM 残留 helper + 抖动清单） |
| `oss-gui-source-patterns.md` | Radix/cmdk/LobeUI/dockview/kunkun/TanStack 源码级机制拆解 | 采收清单 8 项分别标注 `UI-RESIDUE-1` / `CHAT-SESSION-1` / workbench 演进落点，派单时嵌入工单 prompt |
| `geist-design-md.md` | Vercel Geist design.md 对照与分发形态分析 | 已吸收为 `VOICE-SPEC-1` 与 `DESIGN-MD-1` 提案（见 implementation-readiness） |
| `vault-site-craft.md` | arlan.me/vault 技法拆解（MIT），Pages 站巧思候选 | 已吸收为 `SITE-CRAFT-1` 提案：Typer hero、Inset/Satin CTA、Ghosty reveal 三落点 |
| `feldar-page-narrative.md` | feldar.com 能力×微演示台账叙事结构 | 终局 polish / 未来 SITE-LEDGER 参照；与 site-evidence-line 台账裁决同构，只取结构不取皮肤 |
