# SKIN-B1 · 色阶批独立验收

验收结论：**驳回，不部分放行**。

- 实现对象：`8bb305de627e1dce877a8d6c8c7c9721647a4b9e`（`impl/skin-b1`）
- 基线：`8f43331`
- 验收树：独立 worktree `codex/accept-skin-b1`；未复用实现树或共享 Playwright server。
- 授权顺带修：`e47e67d`（只改 `assert-signature-line.mjs` stdout「五色」→「六色」；该门复跑通过）。

## 门禁实跑

| 项 | 结果 | 实测 |
|---|---|---|
| `pnpm -r build` | 通过 | 13/14 workspace projects；仅既有 Vite dynamic-import/chunk-size warning |
| `pnpm lint` | 通过 | exit 0 |
| `pnpm test` | 通过 | 148 files / 1261 tests |
| desktop 30 静态门 + e2e | 通过 | app + residue 双 project、4 workers，297/297；floor 297 |
| `pnpm site:guard` | **失败** | Node 41 tests 中 2 failed：icon-audit 与 graph-theme 的 raw-color exact-token fixture 仍写 B1 前值 |

## Mutation 重放

| 注入 | 结果 |
|---|---|
| 向 `tokens.json` 任一中性槽回注 `#0A2540` | **未红（失败）**：`assert-neutral-source.mjs` exit 0。该门只验证「消费值属于当前声明集合」，并未将旧锚列为废除值，因此 tokens 自身可把旧值重新声明为合法。 |
| `src/` 搜索 `#0A2540` | 通过：零命中 |
| 40px @ Δ=3 | 触发舍入带超限（红） |
| 3px @ Δ=3 | 放行（绿） |
| 1px @ Δ=4 | 触发超阈像素差（红） |
| 不清 portal | 孤儿 dialog 残留门红 |
| 朱作装饰 | `line.settled` 未绑定落定数据，红 |
| 朱绑定 `confirmed` | 绿 |
| 第七 `line-*` 色 | 六色封闭集红 |

## AA 复算

按 WCAG sRGB 相对亮度实算：

- `#D9AE6A / #223047` = **6.4566:1**（与 6.46 一致）。
- `#6E7C92 / #FFFFFF` = **4.2329:1**（与 4.23 一致）。
- `#6E7C92 / #F2F4F7` = **3.8416:1**，**不等于声明的 3.98:1**。
- `#55617A / #FFFFFF` = **6.2182:1**（与 6.22 一致）。

## 零触碰与视觉审计

- e2e 差异为 token 相对读取、icon `currentColor` 继承关系或既有颜色关系断言；没有删除行为断言、残留门或降低 floor。rp211 的关系断言在浏览器页内实际读取并计算三组 token，不是 Node 侧异常后的空转。
- 对照 `01-workbench`、`03-modules` 的前后截图：三栏版式、数据区和绿族未见异常漂移；README 所列主色面积比例前后相同（首帧 37/28/15/2；模块帧 63/14/13/1）。这项不抵消机器门或 AA 失败。

## 缺陷清单

1. **[阻断] `site:guard` 失败。** `site/scripts/deslop-scan.test.mjs` 的两个正向 fixture 未从旧色阶更新为 token 相对值，导致 raw-color 守卫的自测无法通过。
2. **[阻断] 旧锚回注不触红。** `assert-neutral-source.mjs` 缺少旧 hex 的集合排除／黑名单，因此「原子性」门不成立。
3. **[阻断] 浅宗 tertiary 对 surface 的 AA 数值漂移。** 实算 3.8416:1，与 B0/B1 值表要求的 3.98:1 不符；须由架构决定更正值、背景语境或声明后再验。

在以上缺陷消除、完整门禁重新实跑且 mutation 再现后，方可复验。
