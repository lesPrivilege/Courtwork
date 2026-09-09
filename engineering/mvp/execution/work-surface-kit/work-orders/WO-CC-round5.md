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

## CC-W · 工作面：1440 主次切换 + tab strip，≥1680 三栏（`opus-wo-medium`；选向 B + C，WK-116；视觉复核待用户）

### 交接契约（WK-112 §VI）

```yaml
design_task:
  intent:
    user_goal: 打开一份文档或 Run 时，阅读面与聊天在同一顶部 chrome 下各自滚动；宽屏并列，普通桌面一键切换
    primary_action: 在工作面里读（打开 / 切换 / 关闭对象）；决定动作仍由 packet 的 decide 描述符门控，不在本单
    information_priority: 当前阅读对象 > 它属于哪个 Matter（scope）> 其余类型 tab > 返回聊天
  constraints:
    functional: 复用 state.surface 单值形状、surfaceModules 四类型、renderer 挂载 / 卸载与 restoreLayerFocus；不新增端点、字段、状态容器（多文档 map 等 BE-2）
    business_states: 第一段只有一个受信活动文档；折叠 / 展开 / 切换 / 返回不重发命令、不取消 Run、不丢草稿、不换读取版本（FN-23，FE-T07）；聊天与当前阅读面的滚动位置、草稿、返回焦点必须保留（R4D-3）；renderer 失效仍按 sessionId / extensionId / generation / status / modulePath（R4D-4）
    navigation: 1024–1679 主次切换（B）：展开态文档面占主区 1136（1440），strip 左端 ← Chat；≥1680 三栏（C）：nav 256 · chat ≥640 · doc ≥688，共享顶部 chrome 基线，各自滚动；<1024 全屏 sheet 不变；tab strip 40–44 高，正文距其 24–32；方向键 / Home / End 沿现有 tablist，关闭有明确动作（Delete / 关闭钮），关闭活跃 tab 选邻近，全部关闭回紧凑目录
    density: 四个类型 tab + 至多一个文档 tab；文档 tab 关闭命中区与选中区分离；截断保留可访问全名；面板宽 ≠ 正文行宽——B 态文档面 1136 内正文行宽上限沿 --column 740 起（可读上限登记为 token），宽表 / 代码按内容允许扩展；消息不默认全部卡片化（WK-117 (b)）
    responsive: 1440 / 1680 / 1024 / 390 四档；断点两侧（1679 / 1680）、短高度（≤720）、200%（1440 一次）
    accessibility: 安全区 80×52 在展开态与三栏态零可聚焦元素（SHELL-4 / SHELL-5）；tablist 语义与焦点归还沿现状
  existing_system:
    components: app.mjs surface 段（3236–3321 一带）、surface-modules.mjs 宿主边界、#surface-tabs、#surface-backdrop、.work-surface 折叠 / 展开 CSS（styles.css 4008–4131）
    tokens: --nav 256/220、--column 740、--rail-width 360、--col-gap 24、--page-gutter 24、--band-top 56；新增断点 ≥1680 与 --doc-min 688（登记）
    screens: Work（Chat 与 Work 两态）、Review 阅读面
    assets: 现有 brand 包；无新图形
  references:
    positive:
      - {source: shell-refinement §三个上下贯通的工作面 / §标签式右区宿主契约草案, exact_element_to_borrow: 共享顶部 chrome 基线、独立滚动、tab 组织可读对象, why: 用户方向}
      - {source: EX-CC1 §3 / §4, exact_element_to_borrow: 既有 identity 字段组合、WAI-ARIA tablist、关闭区分离与截断保留全名, why: 已冻结条款与通行做法}
      - {source: 画布 WorkB / WorkC 画板, exact_element_to_borrow: 列宽与 strip 位置, why: 选向依据（工程），视觉待复核}
    negative:
      - {source: images/work-tabs.png, avoid: 550 中列、多余目录 / Help / 头像 / 模拟法律文字, why: 生成偏差}
      - {source: 现有展开态, avoid: 遮罩压暗聊天与大圆角模态卡作为默认, why: Astra R4D 总体意见——互斥可见与模态外观分开裁定}
      - {source: 方案 A, avoid: 导航收图标列, why: 本轮未裁，无 token}
  unresolved:
    - {question: B 态下 ← Chat 放在 strip 左端（strip 之外的同行控件）还是顶部 chrome 的返回位, competing_constraints: strip 是对象组织 vs 返回是导航；两者都不把返回控件放进 tablist（WK-117 (b)）}
    - {question: 三栏态 chat 列固定 640 还是 flex 至 740 上限, competing_constraints: 阅读列稳定 vs 宽屏利用}
    - {question: 文档 tab 的标题来源（文件名 / Run 标题 / 来源 id）与截断规则, competing_constraints: 可读 vs identity 不由标题充当}
    - {question: 顶带槽位——Back to app（Settings 态）与侧栏开合钮共用左端槽位（WK-121 ②），CC-W 若给顶带加 ← Chat 或 strip 相关控件须重裁该槽位, competing_constraints: 一个槽位一种离开动作 vs 顶带承载更多}
  exploration: {variant_count: 3, require_structural_difference: true}   # 已出 A / B / C，选 B + C
  review: {removal_pass: required, constraint_recheck: required, state_review: required, real_data_review: required}
```

### 第 0 项（显式改约，单独提交）
- `docs/interface-components.md` §工作面定性："not a third column" 改为按视口分档（≥1680 第三栏；1024–1679 覆盖 / 折叠 + tab strip；<1024 sheet），标注 WK-113 / WK-116。
- `engineering/design/ui-composition-standard.md` §右侧 contextual surface 同步；尺寸 token 表加 ≥1680 断点与 `--doc-min` 688。
- M-10：tooltip 共享延迟——同一 provider 内首个 400ms 延迟，随后相邻 tooltip 在短窗口（初值 300ms）内即时切换，离开窗口后恢复延迟；纯文本 tooltip 不变（WK-119 ②）；断言一条。
- M-9：决定类与 composer 按钮在 `Sending…` 态保持静止态宽度（min-width 由静止标签量得），焦点不丢；断言一条。
- Atlas ④⑤（WK-118）：tab 是状态容器——文档 tab 保留 scroll / draft / run state；agent activity（running / waiting-human / error）以微型 indicator 入类型 tab，不造 banner。
- `composition-checks` 新增 WORK-5…（B 展开态：doc 1136、chat 隐藏但 DOM 与草稿保留；C 三栏：nav 256 / chat ≥640 / doc ≥688、各自 `overflow: auto`、顶部 chrome 同一基线）、SHELL-4 / SHELL-5（展开态与三栏态安全区）、断点两侧各一次。

### 做什么
1. tab strip：四类型 tab + 一个文档 tab 的组织；关闭动作与邻近选择；全部关闭回紧凑目录；焦点归还复用 restoreLayerFocus；截断保留 `title` / 可访问名。
2. B（1024–1679）：展开态 = 主区视图切换（不套遮罩与模态卡外观），strip 顶部；← Chat 返回并恢复聊天滚动与草稿；chat 面 DOM 保留（`hidden` + `inert`）。
3. C（≥1680）：三栏 grid（nav / chat / doc），各自滚动，顶部 chrome 同一基线；chat ≥640；断点切换时不重挂 renderer、不丢滚动 / 草稿。
4. Memory scope 位从会话 meta 行搬到工作面标题带（M-2；只在 Work 上，仍零控件）。
5. FE-T07 全部重跑 + 新增：断点跨越（1679 ↔ 1680）不重发命令、不重挂、位置与草稿不丢；关闭文档 tab 后返回焦点落在打开它的控件；C 态 composer 完整可见、长文与短高度（≤720）不溢出；B 态正文行宽 ≤ 上限、宽表 / 代码可横向滚动。
6. 消融轮 + anti-slop 门。

### 写权与禁令
- 可写：app/web/**、app/tests/**、docs/interface-components.md §工作面段、ui-composition-standard.md、copy-convention.md、text-sweep.md、delivery-cc-w.md、evidence/cc-w/。
- 不改：app/server、app/runtime、app/core、domains、brand、HTTP 契约、review-projection.md、presentation-primitives.d.ts；不做多文档 map、不新增 identity 字段。

### 交付
delivery-cc-w.md 沿 delivery-fe04.md 体例；五轮收敛表按 1440 B 态、1680 C 态、390 各一张；状态矩阵（strip、文档 tab、类型 tab、← Chat）；FE-T07 + 新增反例原文；SHELL-1…5；既有回归全量；未检项；待裁定；anti-slop 门自查。

## CC-D0-a · Home 模块带外壳与现有事实投影（`opus-wo-low`；D0-B 选向，WK-114 / WK-116 R4D-2；排期按产品收益）

### 交接契约（WK-112 §VI）

```yaml
design_task:
  intent:
    user_goal: 进入 Home 先能开始一个 Chat；其次一眼看到今天等我的事
    primary_action: composer 发送（不变）
    information_priority: composer > 具体待办（Waiting for you 列表）与 Today strip > 次级模块带（本片只有 Models 入口行）；统计不得把首屏具体待办推出可见区（WK-117 (b)，HOME-6 保持）
  constraints:
    functional: 只用 work-summary 与 provider-config 已加载的数据；不新增读取、端点、字段；模块显隐为 cw:prefs 本设备偏好；Simple 为默认布局
    business_states: 六态显示约定（loading / ready / empty / not connected / unavailable / stale）逐模块声明并逐态注明事实来源（端点与字段，file:line）；没有时间戳语义的模块不展示 stale，没有连接语义的模块不展示 not connected（写 not_applicable + 理由），不为凑齐六态编造状态；缺接缝的模块不安装（Activity / Usage / Mail / Calendar 本片不安装，留契约不留死模块）
    navigation: Settings › Appearance 增 Home layout: Simple / Modules；模块带可折叠 / 移除
    density: 主区外边距 24–40；模块 gap 20–24；卡内 20–24；同一行模块标题共基线；不强制同高。次级带宽度以 --home-column 820 为上限按剩余宽度分配（Today strip 优先取整行或 flex 主体，模块位取剩余；480 + 320 + gap 已超 820，画板尺寸不是合同），容不下即换行，绝不横向溢出
    responsive: 1440 / 390；900 与 1058 两个视口高各量一次 HOME-1 / HOME-6
    accessibility: 键盘顺序 composer → Today → 模块带 → 列表；模块折叠控件 ≥44
  existing_system:
    components: home-view.mjs 三带、renderHomeBand、StatTile、WorkCard、presentation-adapters；settings-view.mjs 偏好通道
    tokens: --home-column 820、--page-gutter 24、--card-padding 20、--space-*
    screens: Home（Simple / Modules 两态）
  references:
    positive:
      - {source: shell-refinement §首页模块退为辅助 / §模块首页的解耦约定, exact_element_to_borrow: composer 主位、模块带次级、显隐预置、六态, why: 用户方向}
      - {source: 画布 HomeBand 画板, exact_element_to_borrow: composer 820 + 次级带的相对次序（Today 在前、模块位在后）, why: 选向 D0-B；画板里的 480 / 320 是示意，合同见 density}
    negative:
      - {source: images/home-modular.png, avoid: 四块大卡、大热力图、演示数字, why: 尺寸目标已被用户撤回}
      - {source: 上一版"上带", avoid: 把模块放回 composer 之上, why: WK-96 / EX-CC2 §2}
  unresolved:
    - {question: Modules 布局下 Today strip 是否与模块带同一行（480 + 320）还是各自整行, competing_constraints: 首屏高度 vs 扫读}
    - {question: Models 入口行放模块带还是沿 composer chip 后的一行, competing_constraints: 不重复展示（WK-114 ⑤）vs 发现性}
  exploration: {variant_count: 3, require_structural_difference: true}   # 已出 现状 / D0-B / D0-C，选 D0-B
  review: {removal_pass: required, constraint_recheck: required, state_review: required, real_data_review: required}
```

### 做什么
1. Appearance `Home layout` 偏好（cw:prefs，默认 Simple）；Modules 态渲染次级模块带于 composer 之后；Simple 态与现状逐像素一致（HOME-1…7 不变）。
2. 模块带契约：模块注册表（id、标题、数据来源、六态各自的事实来源或 not_applicable、折叠 / 移除）、显隐偏好、键盘顺序、宽度分配与换行规则（≤820）；本片只安装 Today（原位）与 Models 入口行；Activity / Usage / Mail / Calendar / Attention 只在 contracts 里声明，不渲染、不占位、不写 "until BE-nn" 类文案；模块 id 与导航位置为未来 Attention 摘要留可扩展性，不画空卡、不造通用插件框架（WK-117）。
3. HOME-1 / HOME-6 在 900 与 1058 两高各量一次；390 沉底顺序不变。
4. 消融轮 + anti-slop 门（特别是 "fake dashboard density" 与 "gratuitous cards"）。

### 写权与禁令
- 可写：app/web/**、app/tests/**、contracts/home-modules.md（新）、copy-convention.md、text-sweep.md、delivery-cc-d0a.md、evidence/cc-d0a/。
- 不改：server / runtime / core / domains / brand / HTTP 契约；不新增读取；不画热力图。

## CC-D0-b · Activity 与 Usage 接入（待 BE-1/3 + BE-25、BE-29 交付）

热力图按真实日期桶（时区、去重、覆盖完整性由 BE-25 回答）；空白桶 = 无数据，unknown / 缺覆盖不显示 0；Usage token 分列、"Not reported"；尺寸从 320×120 初值起，HOME-6 复跑。Mail / Calendar 随产品裁定与 BE-26/27。

## CC-I · 共享 Inspector（`opus-wo-medium`；WK-118 (b) ③ / WK-119；排 FE-05 之后，以 FE-05 消融表为前置）

骨架：以 `connection-popover`（原生 `popover` + Floating UI，两锚点共享）为种子，合并为一个组件，payload kind 分只读（tool row、runtime 资源、来源 span、文件引用摘要）与可操作（permission mode，PUT 沿现有路径）；一个单点互斥状态"当前打开的是谁"（锚点身份复用 `toolScopeKey` / `{sessionId,runId,path,sha256}` / `resource.id`）；只 click / focus 触发，tooltip 保持纯文本 hover；同一浮层随锚点迁移、变尺寸、换内容，reduced-motion 下瞬切；"Open in surface" 动作接 File / Trace 的工作面导航，不做钉住；窄屏底部 sheet 且与工作面 sheet 互斥；材质 Transient（登记类名 + 回退，无 glass-on-glass，FE-05 消融后落地）；断言：焦点归还、两步 Escape、generation 竞态、安全区、窄屏、四处旧展开状态收敛后 FE-T07 与 RC 全量回归。§VI 契约头在成单时由 Fable 填写。

## FE-05a · 字阶与控件密度（`opus-wo-low`；M-11；WK-120 定为 FE-05 材质之前；WK-123 选向 V1，成单前置：1:1 单页、深色、390、命中区、按钮不折行）

按 WK-112：先约束后变体，一次只变一个维度（密度 → 字阶，材质另单）。约束表已写：[type-density-constraints](../../../../design/type-density-constraints.md)（现状 / 约束 / V1 V2 目标值 / 消融面）。原始要点：现状 ramp（title 20 / nav-title 17 / reading 15 / label 13 / section 14 / body 14 / meta 12 / caption 11；`--control` 32，触控 44；primary 550）对照目标（正文 14 不动、阅读列 15 不动；chrome 与元数据一档更细：meta 12 → 11–12、caption 11 → 10.5–11 且字重 400–450、字距 +0.01–0.02em 大写 eyebrow；桌面控件 32 → 28（触控仍 44）、按钮字号随 label 13、primary 字重 550 → 500；行高与间距随控件缩），每一项给"哪一层级因此更清"的理由与对比度门槛（contrast-report 不得降到 4.5 以下）。第二步 Opus 出两张变体（"chrome 收敛 / 正文不动" vs "全站一档"）在 Settings 与 Work 头部各一处做消融，用户比较后再全站落地。约束：`--text-scale` 三档保留；390 命中区 ≥44 不变；不引新字体；WK-69 层级与 WK-94 边框角色不动。

## FE-05 · 材质与光效（`opus-wo-low`；WK-99 / 101 / 102 / 104；排 FE-05a 之后）

取值与范围见 [WO-FE-round4 §FE-05](WO-FE-round4.md)（WK-104 已填：`--blur-chrome` 12 / `--blur-transient` 16；`--glass-alpha-chrome` 浅 0.86 / 深 0.10；`--glass-alpha-transient` 浅 0.92 / 深 0.16；`saturate(1.4)` 只在 transient；Fluent 式实色回退 `--float`；Appearance "Reduce transparency" 设备偏好）。

### 交接契约（WK-112 §VI）

```yaml
design_task:
  intent:
    user_goal: 浮在滚动内容之上的 chrome 与 transient 层读得出"在上面"，正文与侧栏保持实色安静
    primary_action: 无新动作；本单只改材质与光
    information_priority: 层级秩序（WK-120 已由 FE-05a 定）> 材质只表达层次，不表达状态
  constraints:
    functional: 只动 WK-101 登记的表面（jump-latest、context popover / 未来 Inspector、Work 态沉底 composer 与滚动 header 为消融候选）；侧栏实色 --frame，内容永不 blur；无 glass-on-glass、无折射、无"越大越厚"；backdrop-filter 只在登记类名且每个都有 reduced-transparency 回退（lint-materials）
    business_states: 状态不靠材质表达（FN-28）；reduce transparency 偏好与系统媒体查询二者任一生效即回退实色
    navigation: 无
    density: 沿 FE-05a 定型后的字阶；材质不改尺寸
    responsive: 1440 / 390 浅深两宗；reduced-motion 下无过渡
    accessibility: 回退实色时 contrast 全过；glass 上文字对比度以最差底（滚动内容最亮 / 最暗）计
  existing_system:
    components: .jump-latest-button、.context-popover、.connection-popover、.work-surface 卡片层
    tokens: --glass / --glass-muted / --glass-alpha / --blur-chrome / --blur-transient / --float / --rim / --shadow-float；`:root[data-reduce-transparency]`
    screens: Work、Settings › Models（popover）、Home（jump-latest）
    assets: 无
  references:
    positive:
      - {source: S10 Apple HIG Materials / WWDC25、Fluent Mica-Acrylic（EX-WK9）, exact_element_to_borrow: 材质分层、回退语义, why: WK-103/104 裁定来源}
    negative:
      - {source: Liquid Glass 的折射 / 透镜 / 越大越厚, avoid: 全部, why: WK-101 / WK-104}
      - {source: Acrylic 噪点与色调层, avoid: 装饰, why: WK-119 补充、anti-slop}
  unresolved:
    - {question: Work 态沉底 composer 是否取 chrome glass, competing_constraints: 滚动时层次 vs 输入区安静}
    - {question: 滚动时主区 header 带是否取 chrome glass, competing_constraints: 同上}
  exploration: {variant_count: 2, require_structural_difference: false}   # 每个候选表面一张消融（有 / 无 blur）
  review: {removal_pass: required, constraint_recheck: required, state_review: required, real_data_review: required}
```
