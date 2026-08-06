# ADR-015：垂类可选加载与通用 work agent 底面（解耦相总纲）

状态：Accepted（2026-08-05 拍板）

拍板记录：产品负责人 2026-08-05——三轴取草案推荐值：加载粒度＝逐 matter 绑定＋全局可用集；实施序＝`GENERIC-PACK-1` 即刻开工与等 key 并行、`PI-BASE-GUI-ACCEPT` 到 key 后插队优先；动态装载显式后置。图底裁定与成品律同批并入正文。

## 背景

`PI-LANE-UI-1` 清账后，pi 线 GUI（Draft 面）与生产触发路径已装配。产品定调（2026-08-05）：不加载垂类包时，产品即一个基于 pi 的通用 work agent，唯一设计巧思是以 matter 为单位编排；如 OpenWork 基于 OpenCode，Courtwork 基于 pi 而更清朗。架构须先天保证垂类包可加载：不加载则界面与按钮（除 matter 巧思外）同于通用 work agent；agent 底面与垂类包两条线独立迭代，设计语言、schema 可视编排与互动包素材按需为场景绘制。

产品身份补定（2026-08-05 续）：通用面须看起来像「先为 pi agent 做了 GUI、再加载了某类契约」——开发史相反（垂类先行），产品形态以通用 GUI agent 为地、垂类为图；首先应是有模有样的 GUI agent，其次才谈加载。

本 ADR 是解耦相总纲。它不重复既有法，只把下列边界升格为「卸载可证」并补齐新裁：ADR-001（descriptor/bindings 双平面）、ADR-009 决定四（Renderer 是宿主 blueprint，垂类只注入投影）、ADR-012 决定四/五（宿主原生组件与版本化 blueprint 分层、素材库是设计索引）、ADR-014（tab＝schema 表、混包容器、三层包体系）、ADR-022（matter 不变量）。

## 决定一 · 两层定义：agent 具足 / 包注册

通用底面（agent 具足，卸垂类后完整可用）：壳与三段（Chat/Work/Draft）、chatflow、cards、composer 等通用件；通用文档 preview——reading-view 的 docx/md/txt/文本层 PDF 解析与诚实 `needs_ocr`，及 pi workspace 只读 viewer；matter 容器与账本、授权、预算、恢复；设计语言 tokens 与全部门禁机器。

垂类层（只从 package 引用）：语义 schema、声明式场景编排、词表、presentation/卡片投影、互动素材（SchemaParts 类）。

schema 以外的所有 UI 住 agent；语义与编排只从 schema/descriptor 注册。垂类只存在于加载后的卡片与 preview 中，通用件不因垂类在场而分叉。

**成品律**：通用底面以独立成品为验收标准，不是卸垂类后的残面——未加载任何垂类即产品默认形态：完整的起手引导与空态、matter 创建与生命周期、Draft 类工作面为主工作面、产物与账本可视可回看。垂类加载是加法，不得改通用件的图底关系，也不得让通用面的完整性依赖任何垂类在场。

## 决定二 · matter 是领域无关宿主原语

harness 编排以 matter 为单位；session 可管理但非首选入口。核心与通用 UI 的命名领域无关，「案件」是 Legal 词表对 matter 的着色。卸垂类后 chat/work 仍以 matter 为单位，蒸馏自主续行，人工 review 面在 matter 上的产物与账本、不在 session 清单——此为 ADR-022 冻结的 matter 不变量在权威层的落点，解耦相全程携带。

**matter 级规范文件（2026-08-05 补记）**：matter 根下用户自著的场景规范文件（如 `场景规范.md`）是通用 agent 的一等输入——起手读取、跨 session 遵循，使增量型任务免于重复补 context、输出稳定。它属模型输入，不属系统契约：系统只保证读取次序与原件只读边界，不赋予其 schema 效力、不据其裁决；与包注册的声明式场景分属两层，不得混同。

## 决定三 · 加载模型：编译期在场、运行期显式加载

当期不做动态 bundle 装载：第二方包生态无真实需求，动态装载触 ADR-011 复杂度红线与安全边界。「可选加载」＝registry 准入的运行期显式开关：垂类包随制品分发但默认不激活；加载动作（「加载」按钮）落在 matter 建立/设置处，matter 绑定零或一垂类包，全局 registry 只决定可用集。加载即准入生效，词表、tab 与卡片随之可见。

未加载态的零泄漏由双重机制保证：静态门——垂类 import 只经受信组合根注册点，通用件与壳零垂类引用；运行时——未准入即 fail-closed 拒载，零入口渲染、零词表泄漏、零垂类文案。动态装载留待真实生态需求出现，届时另修本 ADR，不得实现中暗造。

**零泄漏含 prompt 空间（2026-08-05 补记）**：通用底面 system prompt 泛化（非 coding 工作场景全功能形），垂类 prompt 段只随包加载进入组装，未加载即零垂类语义入 prompt。组装的版本化与 wire 闭集处理随 `PACK-INTERACT-1` 冻结细则；`GENERIC-PACK-1` 只须证未加载态 prompt 零垂类语义。

**过渡默认（2026-08-06 补记，随 `PACK-INTERACT-1` 销条）**：加载动作交付前，新建 matter 过渡默认绑定 Legal 以保全链可达——此为显式登记的过渡态，非「默认不激活」的例外常态；`PACK-INTERACT-1` 交付加载 UX 时同批翻转为默认不激活并销本条。过渡期卸载态整面评审与 prompt 零垂类断言经测试构造点的未绑定 matter 取证，不入产品 UX。

## 决定四 · 卸载态语义：诚实降级

已有垂类产物的 matter 在包未加载时：journal、产物与确认账本仍可读（宿主资产不随包走）；垂类卡片与工作面退化为通用文档 preview，并显式提示「加载 X 包以获得结构化视图」——不静默降级、不伪装通用产物。重新加载即恢复结构化视图，零迁移、零重算。

## 决定五 · 两线接缝冻结

agent 底面与垂类包各自版本、各自票据、各自验收。接缝穷举四条：registry ABI（descriptor/bindings 双平面）、schema 契约（JSON Schema＋drift 门）、投影协议（`uiTemplateId`→宿主 blueprint）、词表。接缝之外零私通道；接缝变更契约先行，双侧同步。设计语言：通用 tokens 住壳，垂类互动素材与 schema 可视编排按需入包。

## 决定六 · 实施序与 OSS 义务

本 ADR 拍板后：`GENERIC-PACK-1`（底面收口：零泄漏静态门、卸载态 UI、matter 中立命名清点；退出证据含**卸载态整面评审**——以从未接触垂类的用户视角走通 matter 创建→work→产物→回看全链，评审对象是成品而非开关）→ `PACK-INTERACT-1`（加载动作与准入 UX）。每票开工按工程纪律复核成熟 OSS。既有召回结论：OpenWork 证明「内核＋GUI 壳」形态可行，GUI 完备度对标须剔除其 branch/edit/queue 类明禁能力；插件装载面无合形可直接依赖的候选，registry 准入维持自研——去处按归档索引的 `benchmark-openwork-2026-07-26.md` 条目定位。与 `PI-BASE-GUI-ACCEPT` 的先后属产品排序，本 ADR 不裁。

## 明确拒绝

第二 runtime 或编排框架（ADR-011 红线）；垂类包互相 import（ADR-001 边界）；session 清单作首选入口；未加载态的任何垂类兜底渲染或占位文案；把「可加载」实现为第二套命名空间、第二状态真源或平行 renderer 表。通用底面新增云端能力依赖（现行具名 provider 之外）——本地优先，云端面收敛于具名 DeepSeek。

## 修订记录

- **2026-08-06 · GENERIC-PACK-1 停手三裁（架构）**：①revision 面同迁 `kind:'component'`，三处渲染外消费者（resetReview/clearGate、样板案进度计数、production 产物显示名）改经 work projection/command port 消费、受信组合根装配（循 S6 装配点先例），App 零 `RiskList` 持有——只改居所与取用路径，语义零改以场景链 e2e 全绿为证；②scene-strip 改 registry 派生，预检表单契约冻结为「descriptor 声明、registry 冻结、宿主有限元素集通用渲染」（ADR-016 填格协议同族），提交值进场景启动参数，加载态四钮零视觉回归为证，未加载态起手引导为通用开场（matter 规范文件提示＋Draft 入口）零垂类兜底；③默认绑定本票不翻，过渡默认入决定三补记。
- **2026-08-05 · 产品定调续（同日三笔补记）**：①决定二增 matter 级规范文件（模型输入非系统契约）；②决定三增 prompt 空间零泄漏（垂类段随加载进组装）；③明确拒绝增云端依赖极简条。同日方向登记：DeepSeek response-format API 兼容评估入就绪图「需要实测」清单（成本与 agent 能力使其为全场景首选 provider 的产品判断随行登记）。

## 来源

产品负责人 2026-08-05 定调（解耦相产品形态）；ADR-001／009／012／014／021／022 既有边界；OpenWork/OpenCode 对标与 GUI 机制调研结论按归档索引对应条目定位。
