# PREVIEW-TAB-1 · 产出页签动态化与多产物并列（实现回执）

状态：实现完成，待独立验收（本会话不自我验收、不合 main、不 push）。

分支 `claude/preview-tab-1`（base `main@89c266a`，worktree 分树 `/private/tmp/courtwork-preview-tab-1`；
Playwright 走 `mkdir /private/tmp/courtwork-pw-lock` 原子锁 + 独占端口 `1451`，遵排程律「全仓同刻至多一条全链」，
跑完即 `rmdir`）。

权威：`docs/architecture/implementation-readiness.md` 的 `PREVIEW-TAB-1` 行（票面唯一真值，含
2026-08-07 `LEGAL-FIVE-FACES-1` D11 转挂批注）；`docs/decisions/ADR-014-preview-tabs-and-package-tiers.md`
决定一/二；ADR-015 决定三（零泄漏）与决定四（未加载包的显式退化）；先例回执
`apps/desktop/specs/GENERIC-PACK-1.md`（工作面集已由 registry 派生）、`apps/desktop/specs/PACK-INTERACT-1.md`
（活动面渲染期同步收口）、`apps/desktop/specs/LEGAL-FIVE-FACES-1.md`（D11 原报与裁定）。

---

## 一 · 改动的那一件事

ADR-014 决定一把 tab 语义从「固定视图种类」改为「按已产出 artifact 动态开 tab，tab ＝一张 schema 表，
多 artifact 并列共存，tab 间切换不销毁彼此状态」。落地前的现行链只做到一半：

- 具名工作面（时间线／关系图谱／矩阵审阅／修订预览）已由 `resolveWorkbenchViews` 从「已准入 artifact ×
  在册 blueprint」派生（GENERIC-PACK-1 ①）——这半边不动，本票与 Legal panel 迁移解耦；
- **通用产出席位仍是一枚多对一页签**：`view: 'artifact'` 的 blueprint 名下所有产物挤在一张「结构化产出」
  页签里，席位内靠 `activeArtifactType` 自持选择，未选时 `artifactViewEntries.at(-1)` **末位者胜**。
  同时在册的另外几枚产出在页签条上根本不存在。

本票退役那枚多对一席位：**每一枚没有具名工作面收留的产出各得一张页签**，页签身份就是它的
namespaced artifact type，格栈整体常驻、非活动格只加 `hidden`。同批落 D11：同一 matter 内起新一轮
运行不再整本清空投影。

### 为何不是「所有页签都按产出开」

ADR-014 决定一里「固定工作面视图不再是独立 tab 类别」的条件是 `PANEL-BLUEPRINT-1` 迁完之后同样以
artifact tab 形态呈现；票面同时写明「与 Legal panel 迁移解耦」。四枚具名面此刻是**有面无产物时也要在场**的
——`LEGAL-FIVE-FACES-1` D4 让空面说出「谁产出它、怎么开始」，那句话正挂在尚未产出的具名页签上。把具名面
也改成「产出后才有页签」会把 D4 的指引面一并删掉。故本票只动产出席位这一处，具名面的 tab 形态收敛留给
`PANEL-BLUEPRINT-1` 的后续条款处理。**此为本票范围的显式收窄，非遗漏。**

---

## 二 · 实现面

### ① 产出席位派生（`src/preview/workbench-views.ts`）

新增 `ARTIFACT_TAB_PREFIX` / `artifactTabId` / `artifactTypeOfTab` / `WorkbenchTabId` / `ArtifactSeatTab`
与 `resolveArtifactSeat`。

- 页签身份＝`artifact:` + **带包命名空间的全 type**。不另立页签编号：ADR-014 决定二「混包 tab 栏内不同
  垂类 artifact 共存靠 namespaced artifact type 天然隔离，不引入第二套命名空间机制」。前缀只把两个 id
  空间分开。
- 三态 `ready` / `unloaded` / `unsupported` 是**渲染归属**不是成熟度，三态都占一张页签——产物是宿主资产，
  不因包的加载与否从页签条上消失（ADR-015 决定四）。
- 标题三层取处，**没有一层是壳自己起的名**：本 matter 准入取本 matter descriptor；包未加载取全局准入集
  descriptor（产物自己的身份，同 `VerticalArtifactUnloadedView` 既有口径）；全局也认不出才落中性
  `结构化产出`。
- 次序＝产出到达次序（`Object.keys(session.artifacts)`）。`resolveWorkbenchViews` 第三参由 `boolean`
  改为席位数组，产出页签落在通用起草画布之后。
- `GENERIC_ARTIFACT_VIEW`（页签条目）退役，改为 `GENERIC_ARTIFACT_SEAT_VIEW`（仅 blueprint 标记）：
  `view: 'artifact'` 的含义由「住那一张聚合页签」改为「不认领具名面，按产出逐枚开页签」。

### ② 格栈（`src/preview/ArtifactTabPanes.tsx`，新增）

整栈常驻、非活动格 `hidden`。**判据落在挂载面而非事件**：只渲活动格的实现里切页签就是卸载，被切走那格的
DOM 态（表格横向偏移、纵向滚动）随之消失，事后没有任何断言能把它区分出来——「不销毁状态」在那种实现里
没有可落地的含义。格数＝本 matter 无具名面收留的产出数（ADR-014 席位条款：当期至多绑一枚包），常驻代价有界。

`src/styles.css` 随之两行：`.artifact-tab-pane { height: 100% }` 与 `[hidden] { display: none }`。**零视觉表达**
——只有「占满父格」与「隐藏即不占位」，不引入任何颜色/排印/间距 token，故不触激进度档位与提案行。

### ③ 壳侧（`src/App.tsx`，2248 → 2245）

`resolveArtifactSeat` 一次派生 → `resolveWorkbenchViews` / `renderView` 共用；`previewViewForArtifact` 对落
产出席位的产物返回**它自己那张**页签 id；`renderView` 的 `view === 'artifact'` 整块（20 行退化面判定 + 包名
取词 + 组件路由）迁入 `ArtifactTabPanes`；`activeArtifactType` 这枚 state 与它的两处写入退役——席位内
「自持产出选择」随多对一席位一并作废，产出选择从此就是页签选择本身。

`onSelectTab` 里 `view as ModuleId` 的既有近似加一道产出页签守卫：产出页签不是模块 id，不再往 `moduleOpen`
里写垃圾键。

### ④ D11：一个 matter 内多场景产物并存

`src/protocol/client.ts` 新增 `resetSessionForNewRun(state)`：`{ ...EMPTY_SESSION, artifacts, evidenceGrades,
citationStats }`。留下的三项是「产物本身」的完整读面；运行态（progress/todo/confirmation/failures/completed/
scenarioFailure/lastSeq）一律归零——新场景的进度不能续上一场的账，`lastSeq` 更必须归零。

`App.tsx` 的 `reduceSession` 增 `__new_run__` 动作；`src/work/work-session-lifecycle.ts` 的三处
`__clear__`（`startIntake` / `startPreflight` / `recover`）改派 `__new_run__`。恢复续行与起新场景共用同一条
规则，不为恢复另立第二种清法——两者都是换一场 session、都仍在同一 matter 内。

**仍是整本清空的两处（显式登记，非遗漏）**：
- `App.tsx` 切案 effect：离开 matter 即清，跨 matter 零串料是既有不变量；
- `App.tsx` `selectFlow`（demo 容器的 S1↔S3 切换）：demo 的 flow 切换是**换一段导览**而非同一 matter 内起
  新场景——它按 `replayEpoch` 整段重放 fixture，保留上一段产物会把导览语料混写（D-1 容器隔离既有边界）。
  真实案的多场景并存不经此路。

---

## 三 · 四判据与红绿证

全部红证均**带命中校验**（每次变异先 `grep -c MUTANT-*` 确认真落地，跑完立即还原并复跑绿）。

| 判据 | 绿证 | 红证（变异 → 红） |
|---|---|---|
| 多 artifact 动态开 tab | `src/preview/artifact-seat.test.ts`「多产物并列」；e2e ①（三枚产出三张页签） | **M1** `resolveArtifactSeat` 末尾 `return seat.slice(-1)`（聚合席位回归）→ 单测 5 红；**E1** 同形变异 + 中性聚合标题 → e2e ① 红 |
| 切换不销毁状态 | `src/preview/ArtifactTabPanes.test.ts`（两格恒在、切换只翻 `hidden`、抹平 `hidden` 后两次渲染逐字相等）；e2e ①（三格恒在 DOM、非活动格 `toBeHidden`） | **M2** `seat.filter((tab) => tab.id === activeTab)`（只渲活动格）→ 3 红 |
| 单 artifact 回退 | `artifact-seat.test.ts`「单产物回退：恰一张页签，不留任何聚合席位」＋整条页签条断言 | **M5** 产物数 < 2 时走旧聚合席位 → 2 红 |
| 混包命名空间隔离反例 | `artifact-seat.test.ts`「页签身份是带命名空间的全 type，逐枚回指自己的载荷」（真两包 legal＋pm，非自造 fixture 包） | **M3** `artifactTabId` 取 `artifactType.split('.').at(-1)`（丢命名空间）→ 8 红 |
| D11 多场景产物并存 | `src/protocol/session-reset.test.ts` 四例；e2e ②（跑完 S1 再跑 S2，时间线仍带 S1 产物、矩阵不被顶掉） | **M4/E2** `resetSessionForNewRun` 恒返 `EMPTY_SESSION` → 单测 3 红、e2e ② 红 |

**e2e 的产品可达性（如实登记）**：产品里唯一「多枚产出同时落产出席位」的可达状态是**卸载态**——legal 四面
产出在包卸载后失去具名面，逐枚落席位（这正是聚合席位末位者胜的原形，`PACK-INTERACT-1` ⑥ 的
`expect(['卷宗清单','事件时间线','当事人图谱']).toContain(degradedTitle)` 那句「三者之一」就是它的痕迹）。
加载态下 legal 的产物全部有具名面或 passive 面，**零席位页签**；唯一会填满席位的 `pm` 包当期
「目录已收录，交互未开放」（`PACK-INTERACT-1` ④），产品内无从起跑。故 e2e ① 走卸载态取证，加载态的多产物
并列由单测以真 `registriesFor(['legal','pm'])` 取证。**本票不宣称加载态多产物并列有产品级真跑证据。**

模型回合边界：本票 e2e 的模型回合由 DEV/E2E turn 樁承载，真 key 真模型回合 **external-validated blocked**
（承 `LEGAL-FIVE-FACES-1` / `LEGAL-ANCHOR-BINDING-1` 同一条边界）。

---

## 四 · 他票用例的随改（显式登记）

`tests/e2e/pack-interact-1.spec.ts` ⑥ 卸载退化全链：`结构化产出` 聚合页签已不存在，改为点 `事件时间线`
页签并把标题断言由「三者之一」定死为 `事件时间线`；退化面按所属格取（`artifact-pane-legal.Timeline` 作用域内），
因为格栈常驻后全页会有三枚 `vertical-artifact-unloaded`。**语义由本票的 ADR 落地改变，断言随之收紧而非放宽。**

`src/preview/workbench-views.test.ts` 两例随签名改写（第三参 `boolean` → 席位数组），断言等价收紧。

---

## 五 · 门实测（本会话，`89c266a` + 本票改动）

| 门 | 结果 |
|---|---|
| `pnpm install` | 通过 |
| `pnpm -r build` | 通过（含 `tsc -b` + `vite build`） |
| `pnpm lint` | 通过 |
| 根 `pnpm test` | **2159 passed / 173 files**（先 `pnpm --filter @courtwork/pi-lane build:product-sidecar`） |
| desktop `pnpm test` | **847 passed / 97 files**（基线 831，本票 +16：产出席位 8、格栈 4、会话重置 4） |
| `pnpm --filter @courtwork/desktop test:e2e` | **阻断于既有基线红**（见下），故按链分段实跑 |
| Playwright 全量 | **386 passed / 386**（floor 由 384 升 386，`--list` 实测 386） |
| cargo | **未跑**：本票零 Rust 改动（`git status` 无 `src-tauri/` 面），如实登记不凑数 |
| `pnpm site:guard` | **阻断于既有基线红**（见下）；该门链内其余各步单跑全绿 |
| App.tsx 高水位 | 2248 → **2245**，门常量同批下调并留痕 |

### 基线红（**非本票引入**，已实证）

`assert-schema-exemplar.mjs` 报 `来源哈希漂移 P0-S02：packages/legal/src/presentation/index.ts`。该文件**本票
零改动**（`git status` 未列），且：

```
docs/design/schema-exemplar.sources.json 在册 sha256  fec106d34b31664443c2d69eec2aef4b3ba4514217551cf7bce6a11884ee2e88
git show HEAD:packages/legal/src/presentation/index.ts 实测  9aa2a3a9448a38205012bcf048ac8bfa2ec3cdd6eec906d349909617b6665318
```

即 `main@89c266a` 自身即红，来自 `LEGAL-ANCHOR-BINDING-2` 改在册来源未同批重封哈希。本会话**不代修**
（属他票真源登记，且只改数字会放过「正文是否仍与来源相符」这一实质问题），已另立后续单登记。

该门位于 `test:e2e` 与 `site:guard` 两条链的中段，故两条完整链在基线上均无法跑通。分段实跑口径：
`site:guard` 内 `assert-schema-exemplar` 之外各步单跑全绿；`test:e2e` 内该步之后的
`assert-skin-r2-ledger` / `assert-app-highwater` / `assert-isolation-binding` / `assert-test-count` 逐条单跑全绿，
`playwright test` 全量 386/386。

### 排程与卫生

- Playwright 全程持 `/private/tmp/courtwork-pw-lock` 原子锁，跑完 `rmdir`；端口 `1451`。
- 跑完 `git checkout -- release/evidence` 还原他票 evidence PNG（`demo-anchor-2` 3 张、`generic-pack-1-unloaded`
  5 张、`legal-anchor-binding-1` 3 张、`legal-five-faces-1` 6 张，共 17 张全部还原），`test-results/` 已删。
  提交显式列文件，不用 `git add -A`。
- 本票**不产出 evidence 截图**：判据全部是 DOM 结构与页签集，截图不比断言更有说服力，不为凑证据造图。

---

## 六 · 偏离与待拍板

**待架构拍板：无。** 本票未遇 ADR 覆盖不到的跨层选择。

**登记的边界（供验收核，均在正文有据）**：

1. 具名工作面的 tab 形态收敛不在本票（票面「与 Legal panel 迁移解耦」＋ D4 空面指引），见一节末。
2. demo 容器的 flow 切换维持整本清空，理由见二节④。
3. 加载态多产物并列无产品级真跑证据（pm 交互未开放），见三节末。
4. 未加载包的产出以**产物自己的标题**入页签条。此非零泄漏松动：ADR-015 决定三的零泄漏针对「未加载垂类时
   的具名工作面与入口渲染」，而已产出物的标题是宿主资产的身份——同一条口径已由 `VerticalArtifactUnloadedView`
   在退化面正文上落地并经 `PACK-INTERACT-1` 验收。零绑定且零产出的 matter 页签条仍只有起草画布
   （`generic-pack-1.spec.ts` 卸载态例未动、仍绿）。
5. `ArtifactSeatTab` 的 `unloaded`/`unsupported` 二分逐字沿用 App 原有判定（`globalEntry !== undefined &&
   matterEntry === undefined`），只是从 `renderView` 搬进席位派生，语义零变化。
