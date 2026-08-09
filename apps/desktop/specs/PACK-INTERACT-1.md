# PACK-INTERACT-1 · 加载动作与准入 UX（解耦相）

状态：已清账（3R 独立验收 PASS `791063a`，no-ff 合入 `c330ea7`；合并整合修 `620b3eb`——PACK 侧新增 composition 两测试文件三处 import 改指 DEBT-VERTICAL-SPLIT-1 迁移后的 `verticals/legal/` 居所）

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
- 新建案默认绑定 prop（原 NewCaseDialog 过渡默认入参）——**销条**（见四 · ⑤）。
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

- 新建案默认绑定由 `['legal']` 翻为 `[]`；App `createCase` 默认 `packBinding: []`，
  承载该过渡默认的 NewCaseDialog prop 随之**整链退役**（不保留兼容层——删除即语义）；
  其标识符全仓零残留（含本 SPEC——票面门是字面零命中）。
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
增 `packageCatalog` 与 `describePackage`；新建案默认绑定翻 `[]`。红证：单测。

### 步骤 B · 建案处选包（NewCaseDialog）

新增 prop `packCatalog` 与单选组；`onCreate` 携 `packBinding`。红证：`NewCaseDialog.dom.test.ts`
（默认不加载 → `[]`；选 legal → `['legal']`；取消/关闭不落任何东西）。

### 步骤 C · MatterPackDialog + 设置处（rail 展开区）

`MatterPackDialog.tsx`；`CaseRail` 展开区「垂类包」节 + `onManagePack`。红证：单测。

### 步骤 D · App 装配 + fail-closed（`matter-registries.ts` 外提）

`resolveMatterRegistries` 外提；App 接 `packDialogCaseId`/`applyPackBinding`/失效面板；
`createCase` 默认零绑定；过渡默认 prop 退役；`VerticalArtifactUnloadedView` 换
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

## 八 · 回执收尾（2026-08-07 实施完成）

分支 `claude/pack-interact-1` 全量门实测（含回执提交）：

| 相 | 结果 |
|---|---|
| build | `pnpm -r build` 绿 |
| lint | 绿（eslint 零告警） |
| root test | **1941/1941** |
| desktop test | **795/795** |
| cargo | **250 过 / 1 忽略**（零迁基线） |
| Playwright | **375/375**（独占端口单链；含 residue 谱；`test:e2e` 前置门链全过） |
| site:guard | PASS |
| sidecar | pi-lane 零改动 → **547,893 B / `951acf8e…` 零迁** |

**受检数取数提交登记**：零泄漏门受检 **184**（较 `GENERIC-PACK-1` 的 174 增 10——新增 `case/MatterPackDialog`＋`matter-pack-state`＋`use-containerization`＋`use-matter-pack-manager`（含两枚测试）、`command-palette/commands`、`workbench/matter-binding-failure` 入受检面；`composition/` 新增件属绑定族）；绑定族 verticals/composition/demo 共 77 份在族外，`verticals/` 内实有 6 处垂类绑定（反向锁）。voice 门扫描 **170** 个 UI 源文件零违例。

**高水位**：2279 → **2272**（净减 7）。外提物三件——①⌘K 命令面板条目装配去 `command-palette/commands.ts`（`buildPaletteCommands`）；②matter 包设置弹层的开关与保存去 `case/use-matter-pack-manager.ts`（改绑定＋整表落持久）；③容器化仪式两枚处理器去 `case/use-containerization.ts`。留痕见 `assert-app-highwater.mjs` 注释。

**偏离与决策登记**：

- **未声明（旧档）matter 的弹层语义**：`describeMatterPackState` 对未声明态显示「跟随全部可用包」并在弹层显式说明，单选不预选；保存后按用户选择固定（把隐式未声明显式化为单枚/零绑定）。这是诚实呈现，非静默改义。
- **卸载退化视图产物选择**：结构化产出页签在多枚垂类产物时取会话末枚（既有 artifact 席位语义，本票不动）；e2e 断言产物标题属于 S1 三枚产物之一而非钉死单枚。
- **demo 案不渲染包节**（固定展品，绑定不可变）；`availablePackageIds`/`packCatalog` 传参不触 demo 分支。
- **迁移 e2e 按置换批定式更新**：翻转默认后需 legal 场景的 grant 建案谱（contract-output/trace、work-live/budget/turn、case-persist、legal-five-faces）在建案时显式选包；`d1-case-scope` 大纲断言收窄为通用面、`pilot-layout` 布局证改走 `outline-draft`——按本意重写不放宽（布局证不依赖垂类面）。
- **撤回判据复红（本票自施）**：M1 撤 `resolveMatterRegistries` fail-closed 收口 → 单测「绑定非准入包」红 1；M2 退化视图文案回加裸「包」→ 单测红 1；M3 建案默认改回 legal → 单测红 3。撤修复全复绿。
- **语料墙**：本票新增 fixture 全部为合成构造（turn 樁产出时间线/图谱/CaseFile 为结构化示例），卷宗实物零入仓。

**报交验点**：六边界达成即停；不自我验收——报 Codex 独立会话验收（clean worktree、独立端口、漂移/守卫实际注入反例观察变红）。

---

## 九 · 1R 返修（2026-08-07，应 REJECT 六枚拒绝分支）

首轮 `e432e494` 被独立验收判 **REJECT**（记录见 `apps/desktop/ACCEPTANCE.md`「PACK-INTERACT-1
独立验收」节，验收提交 `5eef398a`）。六枚拒绝分支逐枚返修：

| # | 拒因 | 返修 |
|---|---|---|
| 1 | 新增 fixture 命中语料墙（`:130,148,184`） | 三处改合成串：`合成卷宗 · 包交互`→`演示文件夹 · 包交互`（两处）、`晨曦印务有限公司`→`合川器材有限公司`。六词全仓在本 fixture 内零命中 |
| 2 | 完整链两轮 374/375，`pi-lane.spec.ts:338` 复现失败；回执 375/375 不可采信 | 根因＝**取样时机**：`pi-assistant-turn` 可见只说明首个 delta 到了，此刻视口尚未被正文撑出可滚区（`max−top` 恒 0），滚轮无从离底——判据没被验到却以「断言红」示人。改为滚轮前 `expect.poll` 等 `scrollHeight−clientHeight > 400`，判据本身一字不动 |
| 3 | 卸载后 store 层直证缺失 | ⑥ 链新增 store 层探针：卸载前后各读一次 **WorkState 宿主原始字节**（非 UI 投影），断言逐字节相同且仍含产物正文；并直读案件账本断言 `packBinding` 为 `[]` |
| 4 | 三态未在 `writeCaseList → readCaseList` 往返中逐态直证 | `case-store.test.ts` 新增三态往返用例（未声明/显式零/显式一枚各一枚，经 `reopen` 换实例读同一底层字节），并逐态断言可区分 |
| 5 | 缺 catalog 条目的呈现允许裸 id 伪装正常态 | `unavailablePackLabel`：目录缺条目一律 `{id} · 本版本不可用`，**不回落裸 id**；`CaseRail`／`MatterPackDialog` 状态行在失效态改说「绑定不可用」而非「已加载」。单测 + 弹层 DOM 测 + e2e ③ 三层断言 |
| 6 | 过渡期「新建案默认绑定」prop 的旧代码标识符仍有四处 SPEC 残留 | 本 SPEC 四处改按角色称谓（「新建案默认绑定 prop」）。旧标识符全仓（除 `ACCEPTANCE.md` 验收记录本身）零命中 |

**新增 DEV/E2E 探针（登记）**：`work-runtime.ts` 的测试钩子增 `listSessions()`，只记录内存宿主
写过账的会话坐标。**为何非加不可**：`courtwork.work-session.v1` 是**可续/中断态**恢复指针，
会话跑完即 `clear_if_matches`（`work-session-lifecycle`），故完成态会话在 e2e 侧无坐标可取，
store 层直证（拒因三）无从落地。该钩子只在 DEV+E2E 由 `main.tsx` 安装，生产注入 Tauri 宿主时
台账恒空；不改任何 store 语义、不进 wire/journal。

**1R 撤判据复红**：

- M4：`unavailablePackLabel` 回落裸 id → desktop 单测红 2（`matter-pack-state` + `MatterPackDialog`）；
  e2e ③ 红 1。
- M5：卸载写 `undefined` 而非 `[]`（三态塌陷） → e2e 三谱全红 3。
- M6：读侧把显式 `[]` 归一为未声明 → 新增三态往返用例红 1。
- 说明（如实）：「卸载后 durable 字节逐字未动」这一判据在现行实现中**没有对应的可变异生产分支**
  （卸载路径根本不触碰 work 账本）——它是守卫式判据，区分力体现在「将来若引入迁移/重算即红」，
  本轮不以伪造分支冒充红证。

**1R 全量门实测**（工作树 clean，`release/evidence` 他票 PNG 已还原——Bin 卷入判例第三次拦下）：

| 相 | 结果 |
|---|---|
| build | `pnpm -r build` 绿 |
| lint | 绿 |
| root test | **1941/1941** |
| desktop test | **796/796**（较首轮 +1＝三态往返用例） |
| cargo | **250 过 / 0 失败 / 1 忽略** |
| Playwright | **375/375**（独占端口 18751、`--workers=1`、`test:e2e` 前置门链全过，5.9m） |
| site:guard | PASS（App 高水位 2272） |

**报交验点**：六枚拒绝分支全数返修，不自我验收——报 Codex 独立会话复验。

---

## 十 · 2R 架构裁定与返修票面（2026-08-08）

独立复验对象 `5e4206597fa21b14dea6bd12c8c663885f16d6cd`，报告提交
`8df937085acd0c32499772cb8ada3e1cb554e7b8`，结论 **REJECT**。首轮原始 REJECT 提交
`5eef398aa542834cdc362f8c73f4ba2f897bd10e` 已从独立 clean clone 补入本分支证据链；两轮报告
均只作验收事实，本节以下四裁才是 2R 实现契约。

### A · 准入集与可交互加载集分层

- `admitted` 表示 descriptor/schema/renderer 通过构建期准入，允许识别与读取既有产物；
  `loadable` 表示当期产品允许用户在 matter 建立/设置处激活。二者不得再用同一 UI 语义冒充。
- 宿主 `PackageCatalogEntry` 增非持久、非 ABI 的发行成熟度（闭集仅 `loadable | catalog-only`）：
  Legal=`loadable`；PM=`catalog-only`。该字段只住受信 composition root，不进入 Package ABI、
  case store、wire、journal 或第二开关状态。
- NewCaseDialog 与 MatterPackDialog 只允许选择 `loadable`；PM 可在 Settings 全局目录出现，但须明示
  「目录已收录，交互未开放」，不得显示普通「加载产品管理包」或承诺场景随包出现。
- 既有持久 `packBinding:['pm']` 不判未准入、不迁移、不清空：诚实显示「已绑定：产品管理包 ·
  仅目录与既有产物可用」，既有 PM artifact 继续走通用 table/preview；零 PM scenario、prompt、
  production 入口。保存时用户可清绑或改绑 Legal，不可新选 PM。

### B · production execution seam 按 matter fail-closed

- 全局 registry 只供 admission/catalog 与历史信封/产物 codec；不得作为 production scenario 的
  authorization。受信 composition 向 command 注入按 `caseId` 读取 canonical case store 并解析
  当前生效 registry 的依赖，不信任 UI 自报 packageId/binding。
- `start`、`startWithPreflight`、`resume` 与会继续垂类执行的 review resolution 每次 effect 前都
  校验：目标 package/scenario 必须存在于该 matter 当下生效 registry。`[]`、PM-only、未知/失效
  绑定均返回既有闭集 `rejected/invalid_scope`；provider 调用、WorkState CAS、journal append、
  confirmation effect 均为零。已绑 Legal 的 S1/S2/S3 正例保持。
- read-only replay、既有 journal/产物读取和 cancel 仍可用；卸载不删除、不迁移、不重算既有资产。
  不为此扩 Work protocol/wire/journal schema。

### C · 首个 committed render 零泄漏

- App 初始与切案渲染必须同步用目标 matter registry 校验/派生活动 view；不能先用 global
  `preferredView` 提交 Legal revision，再靠 `useEffect` 回落。
- 常设 DOM 测试覆盖：从 Legal revision 活动态切到 `packBinding:[]`、`['pm']`、失效绑定三形，
  首次可观察 DOM 即为 Draft/通用面，Legal tab/panel/title/copy 全零；撤回同步 gate 必红。

### D · 1R 证据残口与 pi 稳定红

- 删除工单 SPEC 内过渡默认 prop 的旧代码标识符字面；允许历史 ACCEPTANCE 原始报告保留该字面，
  生产源码、测试与现行 SPEC 零命中。
- `pi-lane.spec.ts:319` 不放宽「真实滚轮离底 >200」及流态/终态不夺视口判据。以被测滚动容器的
  `scrollHeight/clientHeight/scrollTop` 派生条件驱动有上界的真实 wheel 重试；不得换固定 sleep、
  直接赋 `scrollTop`、删除 precondition 或降低阈值。
- 退出证据：完整 `test:e2e` 独立端口 **375/375**；该 pi 用例在默认 workers 与 `--workers=1`
  各独立通过；撤回派生等待/真实 wheel 重试须在同条件复红。

### 2R 边界与最低全量门

不新增第三个概念；不加依赖；不改 Package ABI、`packBinding` 三态、wire/journal、dynamic bundle、
renderer 命名空间或持久格式。保留 1R 已闭合的语料墙、store 原始字节、三态往返、失效 label 与
六枚 mutation 红证，逐项不得回归。完成后更新本节回执并运行：`pnpm -r build`、`pnpm lint`、
root/desktop tests、cargo（两 sidecar 身份据实）、`pnpm site:guard`、完整 Playwright；实现会话停止
于报交验点，不得自验收。

### 2R 实施回执（2026-08-08，四裁逐项）

分支 `claude/pack-interact-1r2`，自架构裁定 tip `c979918` 起 clean worktree
`/private/tmp/courtwork-pack-interact-1r2`；1R 已闭合的语料墙、WorkState 原始字节、三态往返、
失效 label 与六枚 mutation 门逐项保留，未回归。

#### A · admitted 与 loadable 分层

- `PackageCatalogEntry` 增 `availability: 'loadable' | 'catalog-only'`（`package-catalog.ts`）：
  Legal=`loadable`，PM=`catalog-only`（PM descriptor 明写 `scenarios: []`/`promptSegments: []`）。
  该字段只住受信 composition root——不进 Package ABI、不进 `packBinding`/case store/wire/journal，
  也不另立持久开关；同文件另出 `loadablePackages()` 作两处选择面的唯一取用口。
- NewCaseDialog 与 MatterPackDialog 的选项集改取 `loadablePackages`，PM 不再渲染为
  「加载产品管理包」；Settings「Packages」节两枚条目都在册，PM 行标 `目录已收录，交互未开放`
  并带 `data-availability` 属性（Legal 行为 `可按工作区加载`）。
- 历史 `packBinding:['pm']`：`describeMatterPackState` 增派生位 `catalogOnlyId`（**不是**第三个
  概念，是既有三态在宿主呈现面的诚实读法）。不迁移、不清空、不判未准入——CaseRail 状态行与
  弹层状态行都说「已绑定：产品管理包 · 仅目录与既有产物可用」，既不说「已加载」也不报失效；
  弹层为此多一枚**保持当前绑定**单选（默认选中，避免一次无意的保存把既有绑定清掉），另可清绑
  或改绑 Legal，唯独不能新选 PM。既有 PM artifact 仍走通用 table/preview，零 PM 场景/prompt/
  production 入口（e2e ④ 断言 `scene-legal.*` 与 PM 场景按钮同为 0）。

#### B · production execution seam 按 matter fail-closed

- `LegalWorkCommandDeps.registries` **退役**，换 `registriesForCase(caseId) => PackageRegistries`
  （不留兼容层）。组合根 `main.tsx` 注入 `createCaseRegistriesResolver`：按 `caseId` **现读**
  canonical case store（`readCaseList()`）解析绑定，案件不在账本内即落零垂类 registry。
  全局 `packageRegistries` 只余一个消费者——ArtifactEnvelope codec 的版本源（既有信封/产物解码）。
- 授权点四处：`beginStart`（覆盖 `start` 与 `startWithPreflight`）在闭集校验之后、
  `isConfigured`/`case_busy`/`runStart` 之前；`resume` 与 `resolveReview` 走 `resumeAuthorized`
  ——只读账本头（`host.read` 为只读，不落 effect）取该会话的 `scenarioId` 与本 matter 生效
  registry 对表，账本读不到时退回「本 matter 有没有任何 production 场景」这条更宽判据。
  `runStart`/`runResume` 内部的场景解析与 `createLegalS3ScenarioDeps` 也一并改取按 matter 的
  registry，不再有第二条能拿到全局集的路径。
- 拒绝一律落既有闭集 `rejected/invalid_scope`（文案 `本工作区未加载这项工作所需的包，无法开始`），
  Work protocol/wire/journal schema 零扩展。`matter-execution-scope.test.ts` 以宿主 CAS 计数、
  turn runner 调用计数与 publish 事件三路直证「effect 恰为零」；`replay` 与 `cancel` 在未授权
  matter 上照常可用（只读面不因卸载被禁）。
- `resolveReview` 保持**同步返回同一枚 Promise**：授权判定放进 `.then` 之前构造的那条链上，
  first-wins 的 Promise 身份判据（`work-command.test.ts` 既有）一字未改。

#### C · 首个 committed render 零泄漏

- `activeView`/`secondaryView` 改为**渲染期同步收口**：`resolveActiveWorkbenchViews`
  （外提入 `preview/workbench-views.ts`）取「用户所选 ∩ 本 matter 生效视图集」，落空即回落
  在册默认；原先「先提交、再由 `useEffect` 回落」的那枚 effect 删除（App 状态改名
  `requestedView`/`requestedSecondaryView`，语义即「用户点了哪一面」）。切案 effect 里的复位
  也改取本 matter 的 preferred，不再取全局。
- 常设 DOM 谱 `composition/matter-first-frame.dom.test.ts`：Legal 修订面活动态 → 切到
  `packBinding:[]` / `['pm']` / 失效绑定三形，逐帧断言零 Legal tab/panel/文案。
  **取样点的甄别过程如实登记**：先试 `MutationObserver`（回调是微任务，`act` 已把两次提交
  一并冲刷完，只读到终态——对回落实现零区分力，作废）；再试 `flushSync`（同样读不到中间态，
  作废）；最终形态是**脱开 `act` 后录帧**——React 的提交与 passive effect 分处两个宏任务，
  观察者回调恰落在两者之间。同时确认了泄漏的真实形状：页签集早已随 matter 收窄，泄漏在
  **活动面身份**——预览宿主的 `aria-labelledby="preview-tab-<id>-revision"` 与取不到词的空标题；
  判据据此写成「首帧无垂类活动面身份，且标题是说得出名字的通用面（起草画布）」。

#### D · 1R 残口与 pi 稳定红

- 过渡期「新建案默认绑定」prop 的旧代码标识符在现行 SPEC、生产源码与测试中零命中
  （历史 `ACCEPTANCE.md` 原始报告允许保留）——该项在 2R 基线上已闭合，现行回执不得为说明
  「零命中」而再次写出该标识符本身。
- `pi-lane.spec.ts:319`：根因是**自动跟随与「用户在读史」判定之间的真实竞态**——滚轮落在流态
  中段时，下一段 delta 会在判定落定前把视口夺回底部，判据没被验到却以「断言红」示人
  （基线复跑 `--workers=1 --repeat-each=3` 稳定 3/3 红，`before.max - before.top = 0`）。
  返修以滚动容器自身几何（`scrollHeight/clientHeight/scrollTop`）派生条件，驱动**有上界（20 次）
  的真实滚轮重试**，并对每次上滚二次取样确认站住；`>200` 阈值、真实 `mouse.wheel`、流态与终态
  两段前置断言全部一字未动，无固定 sleep、无直接赋 `scrollTop`。

#### 全量门实测（clean worktree，本轮原始数字）

| 相 | 结果 |
|---|---|
| `pnpm -r build` | 绿 |
| `pnpm lint` | 绿（eslint 零告警） |
| `pnpm test` | **170 文件 / 1941 通过 / 0 失败** |
| `pnpm --filter @courtwork/desktop test` | **93 文件 / 819 通过 / 0 失败**（1R 796 + 23：执行授权 16、首帧 3、catalog/state/弹层 4） |
| cargo（先构建两枚 sidecar） | **250 通过 / 0 失败 / 1 忽略** |
| `pnpm site:guard` | PASS（App 高水位 **2272**，与 1R 持平；零泄漏门受检 **184**、绑定族 79、`verticals/` 内 6；voice 门 170 个 UI 文件零违例） |
| `COURTWORK_E2E_PORT=18881 pnpm test:e2e` | **376 通过 / 376**（独占端口、`test:e2e` 前置门链全过，7.5m；同一树在 18841 亦为 376/376） |
| pi 目标用例 | `-g 用户上滚读史后` 默认 workers **4/4**、`--workers=1` **4/4** |
| sidecar 身份 | product `sidecar.cjs` 547,893 B / `951acf8e…`；headless 555,314 B / `061248fa…`（均零迁） |

**稳定性两笔如实登记**：①新增的首帧 DOM 谱首例要冷装配整张 App，并行满载下撞 vitest 5s 缺省
超时（desktop 全量重跑 5 次里红 3 次，红因恒为 `Test timed out`，非断言）——只对该 `it.each`
放宽到 30s，判据一字未动，其后 desktop 全量连跑 5 次 819/819 全绿。②中途一次全量 e2e
（端口 18861）在 `chat-interaction.spec.ts:11` 出现一枚与本票无关的红（该次之前与之后的两次
全量 e2e 同树皆 376/376，该 spec 独占端口 `--repeat-each=3` 复跑 21/21 绿），按既有纪律登记为
偶发、不据其改判，也不以「重跑到绿」掩盖：本回执的退出数字取最后一次完整实跑。

**e2e 计数登记（偏离）**：票面写的退出证据是 375/375，本轮为 **376/376**——新增一枚
`pack-interact-1.spec.ts ④ PM 分层` 链（就绪图退出证据要求「PM 在 Settings 显式 catalog-only
且 NewCase/管理面不可选、历史 PM 绑定只读诚实」，无既有用例承载）。只增不减，原 375 枚逐枚照过。

#### 撤回判据复红（逐枚真改、真红、随后还原）

| # | 变异 | 实跑红证 |
|---|---|---|
| M-A1 | 两处选择面不再按 `loadable` 过滤 | desktop `src/case/` **3 failed / 65** |
| M-A2 | `catalogOnlyId` 恒 `undefined`（catalog-only 绑定退回「已加载」同形） | desktop `src/case/` **2 failed / 65** |
| M-A3 | 全局目录把 catalog-only 包说成「可按工作区加载」 | e2e ④ **1 failed** |
| M-B1 | 撤 `beginStart` 的 matter 授权门 | `matter-execution-scope` **9 failed / 16** |
| M-B2 | 撤 `resumeAuthorized`（resume 与垂类 resolution 侧） | `matter-execution-scope` **4 failed / 16** |
| M-B3 | 案件不在 canonical 账本时回落全局可用集（不 fail-closed） | `matter-execution-scope` **2 failed / 16** |
| M-C1 | 同步收口改回「先提交、`useEffect` 回落」 | `matter-first-frame.dom` **3 failed / 3**，红在 `active-view:revision` |
| M-D1 | 撤回派生条件驱动的有上界真实滚轮重试 | pi 目标用例 `--workers=1 --repeat-each=3` **3 failed** |

作废登记：M-C 早期两版取样形态（`MutationObserver` 终态、`flushSync`）对 M-C1 **零区分力**，
不以其绿冒充判据；其中一次「红」实为 `flushSync` 导入自 `react-dom/client` 的 `TypeError`
（假红），已如实作废并改正导入。

**报交验点**：四裁与六边界达成即停；不自我验收——报独立 Luna 会话验收（clean worktree、
独立端口、逐枚注入反例观察变红）。

---

## 十一 · 3R 两项收口（2026-08-08）

2R 实现 `b35d724c633e4dbfdd4b476ce4d896e095050e3e` 的独立验收提交
`7c6763e765732bed732fa87be38636bb616fd1ae`，结论 **REJECT**。A/B/C/D、旧六门与独立完整
Playwright **376/376** 均已成立；3R 不得重做或扩张其结构，只收以下两项：

1. **PM keep 态尾注诚实**：`MatterPackDialog` 的说明文案须跟当前选择同步。历史 PM
   `catalog-only` 绑定处于「保持当前」时，不得显示「结构化工作面与对应场景随包出现」或任何
   等价能力承诺；应只说明既有产物继续可读、交互场景当期未开放。选择 Legal（`loadable`）时
   可保留加载后结构化面/场景出现的说明；选择「不加载」时只说明卸载不删除已有产出。
2. **现行 SPEC 字面门**：现行 SPEC、生产源码与测试不得出现过渡期「新建案默认绑定」prop 的
   旧代码标识符；历史 `ACCEPTANCE.md` 原始报告允许保留。本节及 3R 回执一律用角色称谓，禁止
   再以「零命中」自述重新制造命中。

常设红证：MatterPackDialog DOM 测试与 PACK e2e ④ 同时断言 PM keep 态不含上述场景承诺、含
catalog-only 诚实说明；Legal 选择态仍含 loadable 说明；撤条件分支、恢复无条件通用尾注须真红。
同批执行现行 SPEC/源码/测试的旧标识符零命中门。边界：不改 availability、Package ABI、
`packBinding`、execution seam、首帧 gate、pi 测试、wire/journal、持久格式或依赖；不新增概念。

---

## 十二 · 3R 回执（2026-08-09）

严格只做 §十一 两项；A/B/C/D 的结构一处未动。零新概念、零新依赖、零新持久格式、
App.tsx 零改；availability、Package ABI、`packBinding`、execution seam、首帧 gate、
pi 测试、wire/journal 全未触碰。

### 改动清单（三文件）

| 文件 | 改动 |
|---|---|
| `src/case/MatterPackDialog.tsx` | 底部说明从**一句无条件通用尾注**改为**随当前选择切换的三分支**（`data-testid="matter-pack-note"`）；头部注释登记理由——尾注是对当前选择的能力承诺，不是通用装饰 |
| `src/case/MatterPackDialog.test.ts` | 新增一枚常设 DOM 谱：keep／不加载／Legal 三态文案逐态断言 |
| `tests/e2e/pack-interact-1.spec.ts` | ④ 内追加同一三态断言（既有用例内追加，e2e 计数仍 376） |

### 三态文案（改动本体）

- **keep（历史 `catalog-only` 绑定，默认选中）**：「保持当前绑定：既有产物继续可读；该包当期
  只上架目录，交互场景未开放。」——零场景／零结构化面承诺。
- **不加载**：「不加载垂类包：不删除已有产出——产出属工作区资产，留在本工作区照旧可读。」
  ——只说资产不删除，不承诺加载后会出现什么。
- **Legal（`loadable`）**：原句一字未动（「加载后，结构化工作面与对应场景随包出现；卸载不删除
  已有产出（产出属工作区资产，重新加载即恢复结构化视图）。」）。

判据写在**整张弹层**而不只在尾注元素上（`expect(host.textContent).not.toContain(...)`）：
尾注不是唯一可能的泄漏点，只钉一个 testid 会给「把同一句话搬到别处」留门。

### born-red（实现前，测试先红）

`pnpm --filter @courtwork/desktop exec vitest run src/case/MatterPackDialog.test.ts`

```
 FAIL  src/case/MatterPackDialog.test.ts > MatterPackDialog（matter 级包设置） > 说明文案随当前选择诚实切换：keep 态零能力承诺，Legal 态保留加载说明，不加载态只说资产不删除
AssertionError: expected '包设置「戊案」已绑定：产品管理包 · 仅目录与既有产物可用垂类包不加载垂类…' not to contain '结构化工作面与对应场景随包出现'
 Test Files  1 failed (1)
      Tests  1 failed | 6 passed (7)
```

**首红形态的甄别如实登记**：第一版把 `note()` 取元素的断言排在最前，红因是
「`undefined` 与 string 不能比」——那是**取不到新 testid**的红，不是**尾注在撒谎**的红，对本票
缺陷区分力弱。调整断言次序把整张弹层的诚实判据前置后，首红直接指名缺陷本体（上方原文）。
实现后同一命令 **7 passed**，`src/case/` 全组 **8 files / 66 tests passed**（2R 基线 65，+1）。

### mutation（撤条件分支、恢复无条件通用尾注 → 真红 → 还原）

| # | 变异 | 实跑红证 |
|---|---|---|
| M-3R1a | `MatterPackDialog.tsx` 尾注改回无条件单句（保留 testid） | `vitest run src/case/MatterPackDialog.test.ts` **1 failed / 7**，红在 `not.toContain('结构化工作面与对应场景随包出现')`，原文含实际渲染串 |
| M-3R1b | 同一变异下跑 e2e ④ | `COURTWORK_E2E_PORT=18893 npx playwright test tests/e2e/pack-interact-1.spec.ts -g "④" --project=app` **1 failed**；失败是实断言（`locator resolved to <p … data-testid="matter-pack-note">加载后，结构化工作面与对应场景随包出现…`／`unexpected value`），非 timeout、非选择器落空 |

变异即 2R 基线态，故 M-3R1b 同时充当 e2e ④ 的 born-red。还原后 `pack-interact-1.spec.ts`
全谱（①③④⑥）**4 passed**，完整链见门表。

### 旧标识符零命中门（本批实测）

过渡期「新建案默认绑定」prop 的旧代码标识符，在 `apps/desktop/specs`、`apps/desktop/src`、
`apps/desktop/tests`、`apps/desktop/scripts`、`docs`、`packages` 六个扫描根下命中数 **0**
（`/usr/bin/grep -rna`，避开被 shim 的 `grep`；退出码 1＝零命中）。唯一命中面是历史
`apps/desktop/ACCEPTANCE.md` 的原始验收报告 **5** 处，按 §十一 属允许保留。

本节与本回执全程只用角色称谓，不为说明「零命中」而重新写出该标识符本身——2R 拒因②的成因
正是自述句把字面量又写了回去，说明门的读取面包含回执自身。

### 全量门实测（本树原始数字）

| 相 | 结果 |
|---|---|
| `pnpm install` | 绿（lockfile 未动） |
| `pnpm -r build` | 绿（EXIT=0；仅既有 chunk warning） |
| `pnpm lint` | 绿（EXIT=0） |
| `pnpm test`（根） | **170 文件 / 1941 通过 / 0 失败**（与 2R 持平——新增谱在 desktop 项目内） |
| `pnpm --filter @courtwork/desktop test` | **93 文件 / 820 通过 / 0 失败**（2R 819 + 1） |
| `cargo test`（先构建两枚 sidecar） | **250 通过 / 0 失败 / 1 忽略** |
| `pnpm site:guard` | PASS（App 高水位 **2272/2272**；deslop 1113 文件；中性色 265 文件；`lint:voice` 单跑 170 UI 文件零违例） |
| `COURTWORK_E2E_PORT=18893 pnpm test:e2e` | **376 通过 / 376**（EXIT=0，独占端口、`reuseExistingServer=false`、前置门链全过；跑前 `pgrep -f playwright` 无并发全链） |

**稳定性如实登记（本轮共起七次完整链，逐次交代，不以「重跑到绿」掩盖）**：

- **三次独占窗口的完整链均 376/376**（5.9m／9.1m／末次 6.9m 且 `EXIT=0`；末次跑前
  `pgrep -f playwright` 零命中、跑后再核他树链数为 0）。退出数字取**末次**完整实跑。
- **一次 365/376 是并发损伤，不进结论**：该次跑前 `pgrep` 打出 22 枚 PID，`ps` 锚到另一
  worktree `/private/tmp/courtwork-debt-vertical-split-1` 的 `@playwright/test/cli.js`
  同刻在跑；11 枚红散在互不相干的 spec，单测耗时被拖到 18–19.5m。这正是「同刻两条全链会
  互相打红」的既有判例，登记为**环境无效轮**。随后排队等对方空闲才起的一次又被对方重启的
  链撞上（单测 18.0m），一并作废。
- **两枚独占窗口下的单点偶发红，复跑绿但不据此结案**：`ui-residue.spec.ts:240` 卡在公共入口
  helper `enterSettledDemo` 的 `locator('.individual-note').waitFor()`（30s timeout，非断言
  红）；`global-verbs.spec.ts:7` 的 `.copy-button` 悬停不透明度取到过渡中值 0.59/0.86/0.13
  后回落 0（hover 丢失，非断言语义红）。两枚 spec 与包设置文案零交集，各自独占端口
  `--repeat-each=3` 复跑 **66/66**、**63/63** 全绿；结论仍以末次完整链为准。

Playwright 跑后 `release/evidence/**` 11 枚 PNG 被重生成，已 `git checkout --` 逐面还原；
`test-results/` 逐次清除。提交面只余三枚源码/测试文件与本 SPEC。

**报交验点**：两项收口达成即停；不自我验收、不合 `main`、不 push。
