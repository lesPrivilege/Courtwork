# WORK-DIFF-SEMANTICS-1 · 砖红 Work diff 语义边界

状态：**语义与候选值已冻结；无真实 Work diff 数据源，禁止 UI 开工。**

权威：`docs/design/principles.md`、`docs/design/tokens.json`、`docs/design/signature-line.md`、本票。
本票是架构契约，不是视觉 Demo；截至 2026-08-23，生产 `apps/desktop/src`、tests、packages 与 site 对
`work.?diff|work-diff|data-diff|diff-tone|brick` 扫描为 0 命中。真实差异来源、旧／新 bytes/hash、
artifact identity 与审阅动作未立契约前，不得用 fixture 假造产品能力。

## 一、四类红的边界

| 语义 | 现行编码 | 本票裁定 |
|---|---|---|
| Legal revision insert/delete | 蓝＋下划线／红＋删除线，`<ins>/<del>` | 原样保留，不借给 Work diff |
| severity high | 风险／问题红 | 原样保留，不表示文件发生变化 |
| human settled Zhu | 人工裁决落定印记 | 原样保留，不表示模型差异 |
| Work diff | **砖红 diff family＋操作形态** | 新命名空间，只在真实工作产物比较面出现 |

批准行 `WDS-C01`：

> Work diff 的砖红只回答“这处工作产物发生了可审阅变化”，不回答风险、删除、确认或谁作出裁决。
> `add | remove | replace` 必须由可读标签和 `+ | − | ↺` gutter marker 双编码；颜色只作辅助。
> 禁止复用 `<ins>/<del>`、underline、line-through、gate、severity 或法理之线，禁止整行／整卡铺 tint。

未来数据契约必须提供稳定 `artifactId`、before/after identity 与 hash、闭集 `op=add|remove|replace`、
可定位范围和人工 review 状态；UI 建议 DOM 锚为 `data-diff-family="work"` 与 `data-diff-op`，最终字段名
须由对应 runtime/schema ADR 拍板，不能由实现者自行铸造。

## 二、冻结候选 token

拟新增 `color.semantic.workDiff.graphic` / `.fg` 及 dark 对称槽；正式写入 `tokens.json` 的动作被真实
数据契约阻塞，在此之前只认本表候选，禁止预占空 token：

| 宗 | graphic（marker） | fg（文字标签） | fg 三面 WCAG |
|---|---:|---:|---:|
| light | `#C47764` | `#9C3F31` | 6.392 / 6.018 / 6.627 |
| dark lead-black | `#CA806E` | `#F0A092` | 8.923 / 7.919 / 6.807 |

graphic 只承非文字 marker；对三面最小比分别为 light 3.091、dark 4.577。相邻语义色同屏验收采用
CIEDE2000 `ΔE00 ≥ 10`：候选对 Legal/severity red 为约 20.0/20.1，对 Zhu 为约 12.9/10.9
（light/dark）。低于 10 时必须增强形态，不得继续加色或用更大面积背景补救。

## 三、开工阻塞与退出证据

开工前必须另有架构票冻结真实 Work artifact diff 的 producer、schema、持久化、授权和 review 生命周期；
没有该票，本票不得加入 DOM、token、展示样例或公开文案。砖红不构成竞争力；竞争力仍在真实原件只读、
anchor、ledger、逐次授权、fail-closed 和可核验产物。

未来实现的最低证据：producer→projection→DOM source trace；add/remove/replace 与 empty/error/restart
真实状态；form-only 与 grayscale 可辨；AA、ΔE00、语义色白名单和 raw-color mutation；Legal revision、
severity、Zhu 与 Work diff 四族同屏反例；clean-worktree 独立验收。外部 Cline/OpenHands/bolt.diy 只借
“diff/result/permission 有独立席位”的信息架构，不复制 coding diff runtime 或皮肤。
