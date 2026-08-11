# ADR-023：通用基线包与垂类绑定的并立

状态：Accepted（2026-08-11 架构拍板）

拍板记录：架构会话 2026-08-11——产品负责人当日以会话指令排产「work agent 全量功能」线，本 ADR 为该线首件权威落痕。三路侦察材料（归档召回、现行 HEAD 装配点盘点、Turn 线事实盘点）随批消费；归档件只作史料线索，结论以现行 HEAD 复核为准。

## 背景

`GENERIC-PACK-1`（通用底面收口）与 `PACK-INTERACT-1`（加载动作与准入 UX）清账后，宿主已具备卸载态零泄漏、matter↔包绑定三态与 `loadable`/`catalog-only` 成熟度分层；但 2026-07 期票面所指的「通用场景包三场景」未随之交付，`admitPackages` 仍只有 Legal 与 PM 两枚垂类包。ADR-015 决定一成品律要求「未加载任何垂类即产品默认形态」且为独立成品；旧素材行的验收律要求「只装通用包时产品是合格 work agent」。两句在现行代码下互斥：零绑定 matter 的生效 registry 为空，场景条零条目，卸载态没有任何声明式场景可启动，也没有任何 docx 产出路径。

冲突的根源是「通用场景」的居所未定：ADR-015 决定一规定语义与编排只从 schema/descriptor 注册，故通用场景必须住在一个包里；而 ADR-015 决定三（2026-08-08 补记）规定 matter 绑定是执行授权唯一真源、绑定零或一垂类包——若通用包按垂类同形接入，Legal matter 将因绑定席位恒一而失去通用场景，通用能力反而不是基线。

本 ADR 裁定通用包的形制，消解该冲突。ADR-015 的成品律、零泄漏与激活真源条款不因本 ADR 放宽，只按下列决定收窄辖域。

## 决定一 · 通用基线包按同一 ABI 成立

通用基线包是一枚真实的包：目录 `packages/generic`、npm 名 `@courtwork/generic`、`identity.packageId` 为 `generic`，三者一致（ADR-012 决定一）。它经同一 `admitPackages` 准入、同一 descriptor/bindings 双平面（ADR-001）、同一场景与 launch 声明契约进入宿主，零绕过 schema 契约的后门。场景 id 形制 `generic.<场景名>`，artifact/schema id 形制 `generic.<PascalCase>`。

## 决定二 · availability 闭集扩员：`baseline`

宿主发行成熟度闭集由 `loadable | catalog-only` 扩为 `loadable | catalog-only | baseline`。`baseline` 的语义：

- 恒在每个 matter 的生效 registry 内，与该 matter 的垂类绑定态无关；
- 不占 `packBinding` 席位——`packBinding` 三态语义与 ADR-014 决定二 `containerPackBinding` 长度恒一的约束原样有效，且自本 ADR 起显式限定为**垂类**绑定；
- 不进建案与 matter 设置处的加载选择面（`loadablePackages` 不含 `baseline`），用户不加载也不卸载它——它是产品本体的一部分，不是可选项。

该成熟度维持既有性质：宿主发行事实，只住受信组合根，不进 Package ABI、不进 `packBinding`/case store/wire/journal，不另立持久开关。

## 决定三 · 执行授权语义收窄为垂类辖域

ADR-015 决定三（2026-08-08 补记）「matter 当前绑定是垂类执行授权的唯一真源」自本 ADR 起显式收窄为**垂类命名空间**辖域；对基线包场景，执行授权是宿主发行事实，与通用起草画布同级。基线场景仍走同一条 production work command 链、同一确认账本、同一预算与 journal 纪律，不因基线身份豁免任何门。

`registriesForCase(caseId)` 的返回语义相应为：基线 registry 与该 matter 垂类绑定所解析 registry 的并集；零绑定 matter 的生效 registry 即基线 registry 本身。垂类侧的 fail-closed 判据（零绑定、失效绑定、他包绑定在 provider/journal/effect 之前 `rejected/invalid_scope`）一字不动。

## 决定四 · 中性义务与门禁覆盖

基线包 descriptor、prompt 段与 vocabulary 承担零垂类语义义务，且该义务是机器可验的：`GENERIC-PACK-1` ①附的场景词零命中断言扩展覆盖基线包 prompt 段与词表。基线包不得引用任何垂类包；垂类包不得要求基线包特定场景在场（垂类加载是加法，基线是地）。

`assert-vertical-isolation.mjs` 的包名正则扩员收入 `generic`：基线包实现同受零泄漏门辖制，import 只许受信组合根、demo 与准入机器既有族，通用件与壳不得绕过 registry 直连其实现。

## 决定五 · 验收律定形

「只装通用包时产品是合格 work agent」自本 ADR 起与 ADR-015 成品律合一：验收态即**零垂类绑定态**。GENERIC-SCENARIOS 各票按此验收——零绑定 matter 上，基线场景可启动、产物可呈现、docx 可落盘、账本可回看，全程零垂类词表与文案泄漏。

## 决定六 · 场景线边界

基线场景属场景线：经声明式场景执行器与 Turn Engine 运行，不借 ADR-022 pi 线的任何例外，不把 pi workspace 当产出目录。ADR-009 决定二的步骤闭集（`model | deterministic_tool | interaction | projection | confirmation`）不因基线场景扩员。两条派生裁定：

- **批处理 fan-out 形制**：多文件批处理不表达为新步骤种类或运行期动态步骤，其唯一合法形状是单枚 artifact 携数组 payload、`presentation.collectionPointer` 指向该数组、逐项自带状态字段承载失败显式；逐项完整性（每份在册就绪材料恰一行）由系统确定性校验，不由模型自证。
- **md↔docx 往返辖域**：往返只住工作稿轨。ADR-004「定稿后 docx 是权威表示，不回转 md」「上传原件永远只读」不因通用场景松动；细则随 `GENERIC-SCENARIOS-2` 票面冻结，该票开工前置为 Word/WPS 真机核验会话。

## 边界与不做

- 不做动态装载：基线包随制品分发、构建期准入，ADR-015 决定三的动态装载后置不变。
- 不新增第二套 renderer 注册或命名空间机制（ADR-014 决定二）。
- 不因基线包放宽任何垂类零泄漏判据：基线包的「恒在」不构成垂类「恒在」的先例。
- PM 包维持 `catalog-only`，不因本 ADR 改动。
