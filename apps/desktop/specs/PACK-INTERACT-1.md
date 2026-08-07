# PACK-INTERACT-1 · 加载动作与准入 UX（解耦相）

状态：实现中（2026-08-07 开工）

权威：`docs/decisions/ADR-015-optional-vertical-loading.md`（Accepted）决定三/四；
`docs/architecture/implementation-readiness.md`「解耦相」`PACK-INTERACT-1` 行为票面唯一真值；
`GENERIC-PACK-1` SPEC（packBinding 三态与 `resolveMatterPackBinding` 既有契约，已清账 `9b5a321`）。
2026-07 期同名 parked 行仅作 UX 素材（Settings 包管理面／建案时选包／插槽显式空态三件）。

本文件是本票的实现回执：逐步登记外提物、新增概念、偏离与红证。跨工单判例另进
`docs/engineering/workflow.md`；能力状态只进 `docs/status/current.md`（架构收账，本票不动）。

---

## 〇 · OSS 前置复核（2026-07-28 架构纪律，现行 HEAD 基线）

本票真实缺口＝**matter 级包绑定选择/加载动作的 UI 面**（0 或 1 枚构建期准入包的 radio 选择＋
全局可用集呈现）与**准入失败显式面**。候选复核（2026-08-07，现行 HEAD `d6f78ab`）：

- `@radix-ui/react-radio-group@1.4.7`（MIT，2026-07 活跃）：通用 radio 原语。但本票交互是
  2–3 项的单一选择组，应用内已有 `settings-radio` 平铺模式与 `modal-backdrop`/`SurfaceCard`
  弹层先例（SettingsPage reasoning、NewCaseDialog）；引入将净增一整组传递依赖去替换一个
  已工作的两选项单选，**复杂度不减反增**（复杂度节制条：能用平铺解决的不上抽象）。
- `@headlessui/react@2.2.10`（MIT，2026-04 活跃）：dialog/radio 原语。同上，无能力缺口。
- `react-hook-form@7.84.0`（MIT，2026-08 活跃）：表单状态机。本票无复杂表单（无校验矩阵、
  无联动、无嵌套），提交值仅一个可选 id；现有真源（`packBinding` 持久面）与状态机
  （`registriesFor` 逐 matter 现算）不会被重建。

**四选一结论**：UI 面＝**删除当期动作**（无候选值得接库——应用既有平铺原语已覆盖，候选库
均会引入净增依赖而不缩小真源；上述三枚均核过一手 npm 元数据，许可/维护信号如实记录，不因
「全绿」而跳过评估）；准入与绑定语义＝**保留自研**（ADR-015 决定六既有结论于现行 HEAD 复核
仍成立：构建期 `admitPackages` 不变、零动态装载、插件装载面无合形可直接依赖的候选，registry
准入维持自研；本票不触碰该机制）。

---

## 一 · 新增概念登记（复杂度节制条要求）

本票新增**两个**概念（均属宿主呈现面，不动 Package ABI、不动 wire/journal）：

### 宿主包目录 `PackageCatalogEntry`

`src/composition/package-catalog.ts`：`{ packageId, displayName, version }` 只读目录，由受信
组合根按准入序装配，随 `DesktopPackageRuntime` 交付壳。

**为何非加不可**：ADR-015 决定三的加载文案「加载 X 包」需要包的**用户可见名**，而 Package
ABI 只有 `packageId`/`version`（`PackageIdentitySchema`），无 displayName。改 ABI 属契约拍板
（本票无权）；改 wire 属票面禁区。故按 GENERIC-PACK-1 ③ 的既有先例——「label 立在宿主侧而非
Package ABI：标题是宿主呈现事实」——把包的用户可见名立在受信组合根（`composition/` 属绑定族，
允许持垂类 id，`assert-vertical-isolation.mjs` 门内正当）。**不是第二真源**：它不参与准入、
不参与绑定解析、不参与任何机制，只供呈现文案取词；机制真源仍是 `packageId`。若未来包要自持
displayName，属 Package ABI 扩展，须架构拍板后随 ABI 版本化落地，本票不代做。

### 绑定失效显式态 `MatterBindingError`

matter 持久绑定指向**本制品未准入**的包时（如某构建删包后旧档仍绑），`registriesFor` 依既有
契约 throw。本票把该 throw 收进壳内显式态：生效 registry 落**零垂类**（`registriesFor([])`，
fail-closed——不静默取全局集、不渲染半张垂类面），Work 面渲染显式失败面板（「发生了什么＋
下一步」），下一步＝管理此案的包（换绑或清绑）。

**为何非加不可**：绑定此前不可变（过渡默认只写合法 id，UI 无从构造非法绑定），throw 即崩溃
已是「fail-closed」但**不显式**——用户看到的是空白/崩，不是可行动的说明。加载 UX 交付后绑定
可被 UI 变更，非法绑定由「陈旧持久数据」可达，必须把崩溃升级为可恢复的显式面（核心不变量四）。

---

## 二 · 外提物与新增文件清单

| 文件 | 职责 |
|---|---|
| `src/composition/package-catalog.ts`（新增） | 宿主包目录：准入序 + `displayName`/`version` 呈现事实 |
| `src/case/MatterPackDialog.tsx`（新增） | matter 级包设置弹层：当前状态 + 全局可用集单选 + 应用/取消 |
| `src/composition/matter-registries.ts`（新增，自 App 外提） | 逐 matter registry 的显式态解析：`resolveMatterRegistries`（成功 registry / 绑定失效 id） |
| `src/workbench/matter-binding-failure.tsx`（新增） | 绑定失效显式面板（纯呈现） |

App.tsx 侧只余装配与回调；高水位随外提净减（见门节）。

---

## 三 · 契约承接（GENERIC-PACK-1 既有，本票不动）

- `PersistedCase.packBinding` 三态、长度 ≤ 1 判整库不可读——**契约一字不动**（票面禁区：
  「packBinding 已在持久面，绑定可变更的持久语义若需扩展先 [需架构拍板]」）。本票只新增
  **写入口**（UI 变更绑定 → 整表替换投影），持久判据/读侧零改。
- `resolveMatterPackBinding` 三态解析——不动。
- `registriesFor` 非准入包 throw——不动（本票在消费侧接显式态，不改 throw 语义）。
- `defaultMatterPackBinding`——**销条**（见四 · ⑤）。
- 零泄漏静态门（`assert-vertical-isolation.mjs`）、voice 门（`lint:voice`）、VIEW-ABI、
  high-water——全部保持，随本票逐枚过。

---

## 四 · 票面四件＋承债两笔的实施与红证

### ① 加载动作与全局可用集呈现

- **建案处**（NewCaseDialog）：命名步新增「垂类包」单选——`不加载垂类包（通用工作区）`（默认）
  ＋可用集逐枚 `加载{displayName}`。`onCreate` 携 `packBinding`（不加载＝`[]`，选择＝`[id]`）。
- **设置处**（CaseRail 展开区）：真实案新增「垂类包」节——状态行（`已加载：{displayName}` /
  `未加载垂类包 · 通用能力可用`）＋「管理包」按钮开 MatterPackDialog；demo 案不渲染（固定展品，
  不可变）。
- **MatterPackDialog**：当前状态 + 全局可用集单选 + `保存`/`取消`；保存即改绑定并整表落持久。
- **Settings「Packages」节**：只读呈现随本版本分发的可用集（displayName + version），
  零开关（加载粒度是逐 matter，无全局启停——ADR-015 决定三；「零假开关」原则）。

**红证**：组件单测（建案默认不加载、选择携 `['legal']`、设置处状态行、弹层应用改绑定落持久）；
e2e 往返链。

### ② 加载/未加载状态语义与文案（voice 词表过门）

- 未加载：场景条起手引导（既有）、设置处状态行、Settings 说明——全部过 `lint:voice`。
- 已加载：场景条/页签由 registry 派生（既有），设置处状态行。
- 未准入：零入口零词表（既有静态门 + 本票失效态落零垂类 registry 的运行时半边）。
- 卸载退化视图文案由 `{packageId}` 升级为 `{displayName}`（`该产出由{displayName}生成 ·
  加载{displayName}以获得结构化视图`）——voice 门不触红（无裸确认词/成功自评/工程词）。

**红证**：voice 门全绿；失效态断言「零垂类页签、零垂类场景按钮」变红（若失效态误用全局集）。

### ③ 准入失败 fail-closed 显式

- `resolveMatterRegistries`：成功 → registry；绑定非准入 → `{ bindingErrorId }` ＋ 零垂类 registry。
- Work 面 `matter-binding-failure` 面板：`此案绑定的「{id}」包在当前版本不可用 · 管理此案的包`。
- 「管理此案的包」→ MatterPackDialog（当前绑定不可用态显式标注，保存清绑即恢复）。

**红证**：单测（绑定 `['tender']` → 显式态 + 零垂类 registry）；e2e（持久面注入非法绑定 →
面板可见、零垂类入口、清绑恢复）；撤处理复红。

### ④ 加载/卸载往返全链

- 加载 legal：场景条/页签出现；卸载：起手引导/通用面回归 + 活动视图落回在册默认（既有 effect）；
  再加载：结构面恢复，零迁移（产物在册，宿主资产不随包走）。

**红证**：e2e 往返链（建案选 legal → 面在 → 卸载 → 通用面在且活动视图回落 → 重载 → 面回）。

### ⑤ 翻转过渡默认（承债，销条）

- `defaultMatterPackBinding` 由 `['legal']` 翻为 `[]`；App `createCase` 默认 `packBinding: []`，
  `defaultMatterPackBinding` prop 随之**整链退役**（不保留兼容层——删除即语义）。
- 同批销 ADR-015 决定三「过渡默认（2026-08-06 补记）」条：正文删除过渡句，修订记录增补
  「2026-08-07 · PACK-INTERACT-1 销条」条目（修订记录留痕）。
- `PersistedCase.packBinding` / `CaseSummary.packBinding` / `package-runtime.ts` 三处
  「过渡默认随 PACK-INTERACT-1 翻转」的注释同批订正为现行语义。
- GENERIC-PACK-1 SPEC 与 e2e「过渡默认：新建 matter 持久携 packBinding [legal]」为历史记录：
  e2e 按本意**翻转**为断言 `[]`（重写不放宽），GENERIC-PACK-1 SPEC 原文属历史证据不动。

**红证**：单测（默认零绑定）；e2e 翻转后断言 `[]`；ADL 正文无「过渡默认」残留（grep）。

### ⑥ 补卸载退化视图产品面 e2e（承 GENERIC-PACK-1 追认⑤转挂）

真实加载动作使「已有垂类产物＋包未加载」产品可达：e2e 走通——建案选 legal → 场景运行产出
legal artifact → 卸载 → 打开「结构化产出」页签见显式退化面（文案含 displayName）→ 重载 →
结构化视图恢复。

**红证**：该 e2e 全链；撤退化分支复红（单测已有，见下）。

---

## 五 · 实施步骤（TDD 先红）

### 步骤 A · 包目录 + 默认翻转（composition）

`package-catalog.ts`（`PACKAGE_CATALOG`：legal=法律包、pm=产品管理包，准入序）；`package-runtime.ts`
增 `packageCatalog` 与 `describePackage`；`defaultMatterPackBinding` 翻 `[]`。红证：单测。

### 步骤 B · 建案处选包（NewCaseDialog）

新增 prop `packCatalog` 与单选组；`onCreate` 携 `packBinding`。红证：`NewCaseDialog.dom.test.ts`
（默认不加载 → `[]`；选 legal → `['legal']`；取消/关闭不落任何东西）。

### 步骤 C · MatterPackDialog + 设置处（rail 展开区）

`MatterPackDialog.tsx`；`CaseRail` 展开区「垂类包」节 + `onManagePack`。红证：单测。

### 步骤 D · App 装配 + fail-closed（`matter-registries.ts` 外提）

`resolveMatterRegistries` 外提；App 接 `packDialogCaseId`/`applyPackBinding`/失效面板；
`createCase` 默认零绑定；`defaultMatterPackBinding` 退役；`VerticalArtifactUnloadedView` 换
displayName；高水位随外提收紧。红证：单测 + 失效态断言。

### 步骤 E · Settings「Packages」节

新 `SettingsSection 'packages'` + 只读面板。红证：单测/门。

### 步骤 F · e2e（`pack-interact-1.spec.ts`）＋ generic-pack-1 过渡默认测试翻转

往返全链、退化面全链、失效态 fail-closed、翻转断言。独立端口单链（排程律）。

### 步骤 G · 文档与门

ADR-015 销条、注释订正、SPEC 回执收尾；八相全量门。

---

## 六 · 边界（票面）

- 包仍随应用发行、构建期 `admitPackages` 准入不变；**零动态装载、零外部包导入**。
- 不动 wire/journal 闭集；`packBinding` 持久判据一字不动；绑定可变更的持久语义扩展先
  [需架构拍板]。
- 不动 Package ABI（不加 displayName 字段）。
- `caseId` 等 C 族标识符债不入本票。
- demo 案绑定不可变（固定展品）。

## 七 · 红证清单（汇总，逐枚注入观察变红）

| # | 变异 | 期望红 |
|---|---|---|
| R1 | 建案默认绑 legal（翻转未生效） | 单测：默认不加载 |
| R2 | 选包未写入 `packBinding` | 单测/e2e：持久 `[]` |
| R3 | 失效态用全局集兜底（不落零） | 单测/e2e：失效面板 + 零垂类页签 |
| R4 | 设置处状态行缺失 | 单测：节与状态行在场 |
| R5 | 卸载后活动视图停在垂类面 | e2e：回落通用面（既有 effect 复验） |
| R6 | 退化视图仍用 `packageId` | 单测：文案含 displayName |
| R7 | 高水位净增未外提 | high-water 门红 |
| R8 | 文案触 voice 门 | `lint:voice` 红 |

---

## 八 · 回执收尾（实施完成时填）

八相全量门实测、高水位净减、债表、偏离与决策登记、报交验点。
