# 第五轮工单 · CC-S / CC-W / CC-D0（Fable，2026-09-09）

来源：[shell-refinement](../../../../design/clean-cool-2026-09-09/shell-refinement.md)（用户方向）→ WK-110；方法 WK-112（每单带 §VI 交接契约头；CC-W / CC-D0 施工前先选向）；几何 WK-113；Home WK-114。次序：CC-S → CC-W → CC-D0 → FE-05。前端单 writer（Opus）串行，Astra 独验与合流。

---

## CC-S · Settings 替换全局导航（`opus-wo-low`）

### 交接契约（WK-112 §VI）

```yaml
design_task:
  intent:
    user_goal: 进入 Settings 后只面对设置本身；改完一项能回到刚才的地方
    primary_action: Back to app（唯一的离开动作；组内主动作仍是各表单自己的 Save）
    information_priority: 设置导航（九组 + 搜索）> 当前组的行 > 页标题
  constraints:
    functional: 复用现有 settings-view 控制器、九组、搜索、runtime 块与全部 API；不新增端点、状态、字段
    business_states: settings-active 时全局侧栏不渲染（不是隐藏后仍可聚焦）；Back 恢复进入前的 view / session / focus；未保存表单离开时沿现有 dirty 语义
    navigation: 唯一导航列 240–256；窄屏（<1024）导航变 select（已有 `settings-nav-select`）；`/` 聚焦搜索（已有）；Escape 沿 WK-78 两步序
    density: 内容列 760–960 上限；桌面左右 gutter ≥48（宽屏 56–80）；组间 40–48；组内行 16–24；label / help 同起点，控件同右边界；说明可换行不缩字号
    responsive: 1440 / 1024 / 390 三档；200% 缩放不横向溢出（作者至少量 1440 下 200% 一次）
    accessibility: 桌面宿主 80×52 安全区内零可聚焦元素（Settings 态 + 侧栏折叠态两档新增断言）；Back 有可访问名；导航列 tablist 或 list 语义沿现状
  existing_system:
    components: settings-view.mjs 九组、`settings-nav-column` / `settings-nav` / `settings-nav-select` / `settings-back-button` / `settings-search`
    tokens: `--nav` 256、`--page-gutter` 24、`--control` 32、`--radius-control` 8、间距 token `--space-*`；无新 token
    screens: Settings 九组、Home、Work（Back 的两个返回目标）
    assets: 现有 brand 包；无新图形
  references:
    positive:
      - {source: shell-refinement §"已确认的结构方向" 3 与 §"呼吸感" Settings 行, exact_element_to_borrow: 单导航列 + Back to app + 宽 gutter + 字段右对齐, why: 用户给定的结构}
      - {source: 参考 S01 / S06（用户截图，已目视，不入库）, exact_element_to_borrow: 分组间距与 label/control 对齐, why: 成熟范式}
    negative:
      - {source: images/settings-dedicated.png, avoid: 左栏宽度、蓝色主按钮、新品牌图形、"保存 custom 端点", why: 生成偏差，非裁定}
      - {source: 上一轮 models-preview.png, avoid: 双重侧栏, why: 用户已否}
  unresolved:
    - {question: Back to app 的位置：页标题行左端（安全区之后）还是导航列顶部, competing_constraints: 安全区 80×52 vs 与 Home/Work 的返回控件同位}
    - {question: settings-active 时 `--nav` 轨道是否复用（设置导航占同一列宽）还是独立 240, competing_constraints: 视觉连续 vs 设计初值}
  exploration: {variant_count: 0, require_structural_difference: false}   # 结构由用户给定（WK-110 (e)），不做变体
  review: {removal_pass: required, constraint_recheck: required, state_review: required, real_data_review: required}
```

### 第 0 项（契约修订 + WK-115 遗留）
- **显式改约**：`docs/interface-components.md` §Settings "while the sidebar stays operable" 与 WK-78 (1) "应用侧栏保留可操作"、frontend-layering-spec FN-26 注 → 改为"settings-active 时全局侧栏不渲染，Settings 自身导航是唯一导航；Back to app 与 Escape 返回进入前的位置"。在 intake 记 WK-116（Fable 派单时写），工单里引用；不伪装成 CSS 修复。
- tool 行第六个状态词 `Unknown`（glyph-semantics §3，WK-115 ①）：Run 终态 `unknown` 且无 result 时用它，不再写 `Interrupted`；单测 + 断言。
- Inbox 列表加 `Home` / `End`；Home 下带与 Chat Flow 未决卡各自 `role="list"`（两条列表，WK-115 ②）。

### 做什么
1. settings-active：`.app-shell` 不渲染全局侧栏（DOM 移除或 `hidden` + `inert`，不能只是视觉隐藏），主区与设置导航列构成两列；退出时恢复。
2. 导航列 240–256、内容列 760–960 上限、gutter ≥48（宽屏 56–80）；组间 40–48、行 16–24；label / help 同起点、控件同右边界；沿现有 token，无新值则加入尺寸 token 表并在 `ui-composition-standard.md` 登记。
3. Back to app：位置按 unresolved 第 1 条选最保守者（页标题行左端、安全区之后）并写明理由；恢复 view / session / focus；Escape 两步序不变。
4. 安全区：`composition-checks` 新增 SHELL-2（Settings 态）与 SHELL-3（侧栏折叠态）断言，桌面宿主与普通浏览器各一次。
5. 窄屏：导航列变 select（已有），gutter 16–20，控件 ≥44。
6. 消融轮 + anti-slop 门（WK-112 §IX）逐项自查写入交付页。

### 写权与禁令
- 可写：app/web/**、app/tests/**、docs/interface-components.md §Settings（仅改约段）、engineering/design/frontend-layering-spec.md FN-26 注、ui-composition-standard.md 尺寸 token 表、copy-convention.md、text-sweep.md、delivery-cc-s.md、evidence/cc-s/。
- 不改：app/server、app/runtime、app/core、domains、brand、HTTP 契约、review-projection.md；不新增依赖、状态、字段或端点。

### 交付
delivery-cc-s.md 沿 delivery-fe04.md 体例：基线、commit 表、改动文件、消融表、五轮收敛表（Settings 1440 / 1024 / 390）、状态矩阵（导航列、行、Back）、text-sweep、SHELL-1/2/3 结果原文、既有回归（RC 三支、composition、shell、探测、Models、FE-T01/03/06/07/11）、allowlist / 后端请求、未检项、待裁定、"哪一像素改变了哪一判断"、anti-slop 门自查。

---

## CC-W · 三面贯通与 tab strip（待用户在 [画布](https://claude.ai/code/artifact/f0b8d9b9-01fc-4dff-bcdb-390ad6f2a24c) 选向后成单）

骨架（WK-113 + WK-116 R4D-3/4/5）：第 0 项显式改约（`interface-components.md` §工作面定性按视口分档、`ui-composition-standard.md` §右侧 contextual surface、≥1680 断点、WORK-5… 断言）；1440 主次切换 + tab strip（四个类型 tab + 至多一个可关闭文档 tab，关闭区与选中区分离，截断保留全名）；≥1680 真三栏；Memory scope 位搬到工作面标题带（M-2）；tab 显示 key 复用既有身份但 renderer 失效判定保留 `status` / `modulePath`；单文档阶段仍保留聊天与当前阅读面的滚动、草稿与返回焦点（不建多文档 map ≠ 可丢位置）；B / C 均补展开态、返回、断点两侧、短高度、200% 与安全区断言；多实例等 BE-2。effort：`opus-wo-medium`（几何合同与 tab 生命周期需逐项判断）。

## CC-D0 · Home 模块带（WK-116 R4D-2 拆两片：D0-a 外壳与现有事实投影，不依赖新后端，按产品收益排期；D0-b Activity 待 BE-1/3 + BE-25）

骨架（WK-114）：Appearance `Home layout: Simple / Modules`（本设备偏好，默认 Simple）；模块带契约（次级带、显隐预置、折叠 / 移除、六态显示约定）；Today strip 原位演进；Activity 随 BE-1/3/25，Usage 随 BE-29；Mail / Calendar 待产品裁定；0.56 不动；不放死模块。effort：`opus-wo-low`。

## Astra 合流接缝限定（2026-09-09）

成单时必须消费 [r4d 设计接缝评审](../../../../design/clean-cool-2026-09-09/r4d-review.md) R4D-1…6；WK-113/114历史裁定保留，不能用其简写覆盖现行owner合同。CC-W保留原renderer status/modulePath失效条件，以及聊天/当前阅读面的滚动、草稿与返回焦点；B/C均补展开与断点两侧几何验证。CC-D0拆为现有事实的布局外壳与Activity接入：仅后者依赖BE-1/3/25；外壳是否先做按选向与产品收益裁定。临时probe不构成连接健康记录；邮件/日历保留路线意向，具体来源与接入排期另定。CC-S可沿既定结构接单；本次未代派。
