# DEMO-REAL-SHELL-1 · 发布态真实工作／样例边界

状态：**已清账**。架构冻结 `a240e57`／补正 `eaf604f`；独立 Luna 实现 `20caeb9`，
合入 `725f992`；另一 Luna 以验收级小修 `8c7edcf` 后在 `75678cc` 独立 PASS，验收链合入
`0272e25`。本票只收敛 scripted desktop shell 的首开叙事与样例驻留，不改变
`PI-BASE-GUI-ACCEPT`、Agent、AX、真实 provider 或 product-live 口径。

权威：`CLAUDE.md`、`AGENTS.md`、`docs/product/roadmap.md`、
`docs/architecture/implementation-readiness.md`、`docs/design/principles.md`、
`apps/desktop/SPEC.md` 与本票。能力状态只认 `docs/status/current.md`；本票不得更新它。

## 一、问题与目标

当前运行时已经用 `isDemo`／`DEMO_CASE_ID` 把样板语料与真实案件物理分流，但产品壳仍在启动时
把 `DEMO_CASE` 固定注入 `cases`、固定置顶，并让左下账户位随样板案改成
`林律师 · Sample lead`。欢迎页两条建议又都通向同一样板案，其中一条先打开 provider 引导，
Skip 再把用户劫持进样板。于是首屏同时暗示了并不存在的历史工作、成员身份、Pinned 数据和已配置
工作区；这是发布态叙事不实，不是换一组冷白／冷灰可以修好的皮层问题。

本票把三种东西明确分开：

1. **真实工作**：左栏 Recent 只来自持久的真实案件／工作区；没有就如实为空。
2. **样例**：只由用户显式选择进入；激活期间是清楚标注的只读展品，离开或重载即退出产品列表。
3. **本机壳入口**：不得从样板案人物派生；当前阶段也不得虚构组织、成员、角色或权限。

成熟范式只借边界与行为，不照抄企业层级：[OpenAI Work/Codex](https://help.openai.com/en/articles/20001275-chatgpt-work-and-codex)
把 Work、Projects、Recents 与 review/approve 分开；[Linear conceptual model](https://linear.app/docs/conceptual-model)
只在真实 workspace/team/owner 数据存在后呈现对应层级；[OpenCode share](https://opencode.ai/docs/share/)
默认不分享、须显式触发。Courtwork 当前仍是 local-first single-writer；这些来源不能被解释为提前实现
团队协作。

## 二、冻结产品语义

### 2.1 首开与 Recent

- `cases` React 状态只持有真实案件／工作区（含水合的持久记录）；不得在初始化数组中注入
  `DEMO_CASE`，不得以样板填满空 rail。
- fresh install／无真实容器时，左栏不得出现 demo card、Pinned、假历史、假未读、假成员或假用量；
  可显示一行低强调、无卡片的 `No recent work` 诚实空态。
- 有真实容器时，`Recent` 只显示真实容器。真实容器的创建、改名、grant 失效、归档清除与跨重载
  语义保持现状。
- 没有真实 pin 能力时不得借样板让 `Pinned` 分区常驻；本票不新增 pin 行为。

### 2.2 欢迎页与样例入口

- 欢迎页保留一个真实开工入口 `Create a case`（复用既有 New Case dialog）和一个次级
  `Explore the sample case`。不得同时放两条指向同一 demo 的建议。
- 探索样例是显式 opt-in：点击后直接进入既有 `DEMO_CASE_ID`／fixture／tour，不先打开 provider
  引导，也不触发 credential probe。样例不需要真实 provider 才能浏览。
- provider 引导只由既有 Connect／model config／真实发送路径打开。其 `Skip` 文案冻结为
  `暂不连接`，只记录 onboarding 已看并关闭引导，必须留在原上下文；不得再把用户转入样板案。
- 产品测试选择器同步改为语义真实的 `welcome-sample-open`／`welcome-new-case`；不得保留
  `welcome-demo-start` 这种既开凭证又开样板的混合命名。

### 2.3 样例激活期间

- 样例可作为 `selectedCase` 的瞬时派生值，但不得写入 `cases`、`case-list.v1`、真实 Recents 或
  grant/material/session 的生产持久面。
- 样例激活时，左栏可临时显示独立 `Sample` 分区中的唯一样例行，以保留既有阶段／原件导览；
  它不得出现在 `Pinned` 或 `Recent`。选中任一真实容器或重载后，该分区消失。
- 既有 `样板案` 标识继续可见，并补一处简短的 `只读演示` 说明；不得把展品说成真实工作。
- 样例标题不可编辑，样例行不可归档／移除／绑定文件夹；所有 fixture 回放、阶段切换、原件与
  产物浏览继续工作。`isDemo`／binding／fixture 的双向隔离一字不改。

### 2.4 本机设置入口

- 删除 `Sample lead`／`林律师`／`Owner` 对全局账户壳的投影。底部入口在 welcome、sample、real
  三态均使用非人物、非角色的 `Local workspace`（图形不得使用人物头像），以保留
  Settings／feedback 唯一入口；它不能读成团队 workspace 已存在。
- `Local workspace` 只表示本机设置范围，不得扩张为已认证 principal、workspace role、admin
  或 ACL 声明。

## 三、精确实现范围

允许修改：

- `apps/desktop/src/App.tsx`
- `apps/desktop/src/chrome/copy.ts`
- `apps/desktop/src/credentials/ProviderSetup.tsx`（只改 Skip 的误导文案，不改凭证状态机）
- `apps/desktop/src/rail/CaseRail.tsx`
- `apps/desktop/src/rail/types.ts`
- `apps/desktop/src/rail/rail.test.ts`
- `apps/desktop/src/case/case-store.ts`（只准更正“demo 恒挂”过时注释；持久 schema/行为不改）
- `apps/desktop/src/case/case-store.test.ts`（只准保持 demo 防御性剔除断言并更正文案）
- `apps/desktop/src/case/case-scope.ts`／`.test.ts`（只准更新账户壳审计注记；demo binding 不改）
- `apps/desktop/src/styles.css`（只准 Sample 分区、诚实空态与只读说明，复用现有 token）
- `apps/desktop/tests/e2e/helpers.ts`
- 直接锁旧语义的既有 E2E：`rp1.spec.ts`、`rp2.spec.ts`、`rp26.spec.ts`、`rp27.spec.ts`、
  `rp29.spec.ts`、`case-persist.spec.ts`、`ui-residue.spec.ts`
- 新增 `apps/desktop/tests/e2e/demo-real-shell-1.spec.ts`
- `apps/desktop/SPEC.md`（实现回执）

实现会话先写失败测试，再做最小实现。若其他 E2E 只因测试助手选择器改名或 provider Skip 的
`先查看演示`→`暂不连接`文案收敛而失败，允许在对应文件做机械改名；不得借机改它们的产品断言、
wait 策略或扩大功能。

## 四、验收证据与反例

实现 tip 最低证据：

- 单测证明 demo 识别／binding 与 `projectPersistableCases` 的防御性剔除保持不变，底部设置入口
  不再随 `isDemoCase` 变成虚构人物或角色；
- fresh/no cases：welcome 可见、Recent 诚实空、demo/Pinned/Sample lead/假用量在产品壳中均为零；
- sample opt-in：不出现 provider setup、不触 credential probe，进入后 Sample 分区与只读标识
  可见，既有 fixture event stream／preview 可用；标题编辑与 archive 控件结构性不存在；
- real new matter：只进 Recent；从 sample 切入 real 后 Sample 分区消失，`Local workspace` 不变；
- reload：真实持久案仍回侧栏，sample 不回 rail、不入 `case-list.v1`；失效 grant 与归档清除回归；
- provider Skip：分别从 welcome 发送／Connect 触发后，关闭仍停原上下文，绝不选择 demo；
- 1440 与 390（或项目现行最小支持宽）截图覆盖 fresh、sample、real；浅宗为主，dark 做同构／对比
  smoke。不得为这张票重做整套 token 或增加装饰动效；
- 注入以下任一 mutation 必须使定向门变红：恢复 `[DEMO_CASE, ...hydratePersistedCases()]`；把 demo
  放回 Pinned/Recent；sample click 打开 provider；Skip 选择 demo；账户恢复 Owner/Sample lead；样例恢复
  改名或归档入口；
- `pnpm -r build`、root lint、desktop 定向单测、独立端口 Playwright、Cargo 与 `site:guard` 按
  触及面完整实跑。

独立验收会话只追加 `apps/desktop/ACCEPTANCE.md`；不得采信实现回执中的数字。验收必须使用 clean
worktree 与独立端口，实际注入至少上述六类 mutation，并逐帧核对 fresh/sample/real/reload/390。

## 五、禁止扩张

- 不改 core event、schema、wire、journal、runtime、provider、Pi lane、workspace、MaterialStore、
  host auth 或授权语义；不新增 store、持久字段、命令、依赖或图标包；
- 不新增真实或虚构的成员、头像、org/team、角色、RBAC/ACL、audit log、评论/@、公共 share、
  多写者、在线状态、统计 dashboard、通知 badge、initiative/cycle/roadmap；
- 不新增 Scheduled、Dispatch、background、parallel-agent board、自动批准／Always allow；
- 不安装 Morphicons。其候选状态 morph 继续等 `PI-BASE-GUI-ACCEPT` 后独立票；
- 不改样板 fixture、录制、法律 schema、场景、用量数字或真实案件持久契约；只改变它们在产品壳的
  驻留与入口；
- 不更新 `docs/status/current.md`、版本、release/site/README 口径，不宣称 Agent、team product、
  `PI-BASE-GUI-ACCEPT` 或 product-live。

## 六、清账证据（2026-08-20）

- 实现会话：3 files / 34 tests；新票 E2E 4/4；锁定回归 39/39，另有 D1/RP28 13/13；
  `pnpm -r build`、root lint、`site:guard` 均 EXIT 0。
- 独立验收：定向单测 34/34；新票 E2E 4/4；锁定回归 61/61；build、lint、site guard 均
  EXIT 0；1440/390、light/dark、fresh/sample/real/reload 与键盘 smoke 1/1。
- 验收实际注入并观察七类反例变红：demo 初始化常驻、demo 回 Recent、sample 打开 provider、
  Skip 劫持 demo、恢复 Owner、恢复样例改名、恢复样例归档；全部撤回。
- `8c7edcf` 只修两处旧 E2E：归档残留门先创建真实案件；provider modal 由真实 Connect 入口打开，
  Escape 后验证自然焦点归还。完整独立报告见 `apps/desktop/ACCEPTANCE.md`。
- 未跑 Cargo：本票产品与验收修缮均零 Rust/Tauri 触面。真实 WKWebView/AX 与 provider 仍归
  `PI-BASE-GUI-ACCEPT`，其 external-validated blocked 状态不变。
