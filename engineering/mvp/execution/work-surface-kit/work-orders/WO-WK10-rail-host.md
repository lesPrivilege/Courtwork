# WO-WK10 · 右栏模块导轨、三栏对齐带、composer 层级、文本清退扫描（Opus）— 拆为 a / b（WK-62）

状态：**a 已派发 2026-09-09**，基线 = 整合支 `claude/wsk-integration` `9cb1d7e`，worktree `/private/tmp/se-agent-wk10`，分支 `claude/wk10-rail`，端口 8855；b 待合流。

## 范围

1. `app/web/surface-modules.mjs`：模块登记表与 `registerSurfaceModule / unregisterSurfaceModule`（WK-41 / WK-43）；首批 run / file / workspace 三模块由既有 inspector / workspace-view 内容迁入（宿主保留 DOM id、ARIA、Run / File 身份、renderer owner）。
2. rail host（`app.mjs` 内一处）：收敛态卡片纵列、展开态 tab 面板、选中与 Escape 次序、生命周期委托、扩展模块 mount / dispose、provider 缺席占位。
3. 对齐带（WK-42）：`--band-top`、`--col-gap` token；侧栏 wordmark 行、chat header、rail header 同带对齐；中栏 740 列与右栏卡片共 gutter。
4. 热插拔（WK-43 / WK-45）：模块存在与槽位只来自控制面快照（`RuntimeResource` + `uiSlots` + `revision`）；mount = running ∧ exposed ∧ 声明槽位，dispose = 快照消失或 exposed=false；active run 期间不卸载、标"Run 结束后生效"；renderer 缺席走 H3 fallback query；与 WO-RC 的 runtime 面互通（槽位占用显示）。
5. 文本清退扫描（WK-44）：三列清单 + 实施。
6. 消融表（WK-47）：导轨每模块与模块内每元素的"去除后失去的判断"表；删除项直接实施，保留项写明依据。模块形态参照 Codex 右栏 anatomy（标题 + 计数 / 状态 + 一个尾部动作 + 行），不引入其模块清单。

## 不得

新增状态、端点、颜色、依赖；改变既有保留项；让模块持有列布局或正式状态。

验证：fixture 下三模块两态切换、以控制面 fixture 改 exposed / running 触发的 mount / dispose 计数与 active run 期间的延迟生效、H3 fallback 只读呈现（无可操作按钮）、Escape 次序、390 / 1440 × 浅深、reduced-motion；对齐以 DOM 测量断言（三者 top 相等）。验收 Astra / Luna；四轴留用户。


## b 的范围（更新 2026-09-09）

当前可执行拆分见 [WO-WK10b](WO-WK10b-work-surface.md)：通用段先做，领域段等待H1。下列旧范围作为来源保留。

1. WK-71 语义 → glyph 表与图标化实施；2. WK-43 / 45 热插拔槽位；3. WK-57 Chat Flow 卡片减法；4. WO-WK4 Review 纵切。依赖 a 合流。
