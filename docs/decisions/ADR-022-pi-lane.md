# ADR-022：通用 agent loop 线（pi lane）

- 状态：**Accepted（2026-07-27；未决四题已随 `PI-LANE-1` 作答并补记——题 1/2 源码级已答、题 3 提案已采、题 4 推至 `PI-LANE-2` 实付，细则随其冻结）**
- 日期：2026-07-27
- 关系：修订 ADR-011 决定二「不引入第二 agent runtime」（携新必要性证据，见该 ADR 修订记录三）；受 ADR-018 等级—能力绑定约束（写/bash 面锁 `SANDBOX-PROBE-1`）；保全 ADR-017 决定零的核心逻辑（取形必须带容器）；与 ADR-012 垂类包边界并立不相交；消费 ADR-019（loop 会话落卷宗容器）
- 提出：2026-07-27 产品定调——「此阶段优先立起确定性、有依据的通用 agent 能力；方案成熟、依赖 pi 生态、不存在技术或验证瓶颈；甚至可以只是一个 pi agent 的 GUI」

## 背景

到「应对大多数 .md 任务」的通用能力，仓内自研线（TOOL-READ → edits/writing 票 → EXEC-SCRIPT）依赖链长且尚有未立之票；而标准 agent loop（read/edit/write/bash + while 循环）在 pi 生态是已收敛的生产形态（`@earendil-works/pi-agent-core` 为 TS 库，MIT，一手核实见归档 pi 批次；包名全称见修订记录之包名订正）。语义层、确认原语等创新点须实测验证，通用 loop 不须。产品据此定调：确定性能力先行，创新层在其后嫁接。

减法纪律①（开源轮子尽可能用）与本裁定同向；此前「借形不接管真源」的边界按本 ADR 显式放宽为「loop runtime 整体引入，真源仍在容器、授权与垂类契约」。

## 决定一 · 引入 pi-agent-core 作通用线 runtime，双线并立

- 通用线以 **Node sidecar 承载 `@earendil-works/pi-agent-core` 库**（内嵌形态，非外挂 serve 进程；无 scope 的 npm 名 `pi-agent-core` 是第三方占位空壳，禁止依赖）；我方持有 GUI、容器、扩展与预算面。
- 既有声明式场景 runtime（ADR-009/011 谱系）**原样保留**，垂类包与确认账本流程只挂场景线；两线并立、各自账本，不迁移、不混写。
- ADR-011 的禁令按重启条款修订为：**不自研第二 runtime、不引入编排框架**；成熟开源 loop 以本 ADR 的受控引入线接入。新必要性证据三条：产品定调（确定性优先）；`pi-agent-core` 库形态使内嵌可行（非进程外包）；容器路线在途（`SANDBOX-PROBE-1` 已派）。

## 决定二 · 取形必须带容器（ADR-017 决定零逻辑保全）

pi 范式把安全性整体外包给容器；引入 pi 即承接这份外包——**容器由我方供给**，不是省略：

- **读面（pure_read）**：落现行 `none` 隔离等级内，可先行（ADR-018 决定五语义不变）。
- **写面与 bash**：一律锁 `SANDBOX-PROBE-1` 放行后按其结论落地；探测不成立则写/bash 面走降档路线另裁，不以「pi 生态成熟」为由绕过等级绑定。**放行不等于升档（2026-07-27 补句）**：探测放行的是原语可行与判据可满足，不是等级——等级仍按 ADR-018 决定五由**实现自带该等级的越界反例**证成（探测报告第十一节第 4 条同口径）；升档前写面与 bash 不可授，`PI-LANE-1` 的「edit/write/bash 配置层禁用」即此结果。
- ADR-017 的受控脚本执行（argv 三段式）与 pi lane 的 bash 是两条能力面：前者属场景线的受控形态，后者属 loop 线且只在容器内成立；两者互不豁免对方的前置。

## 决定三 · 不变量经扩展机制挂载，不改内核

我方不变量以 pi 官方扩展机制（一手核实：`permission-gate`／`protected-paths`／`tool-override` 三例）挂载：原件只读（授权文件夹外零读写，fail-closed）；危险动作事前确认；预算面（步数／usd 上限——pi loop 原生无上限，`while(true)` 无计数器，上限必须由扩展或 sidecar 层补齐）。**扩展不可达的不变量显式登记为已知边界，不静默放弃、不宣称等同场景线保障。**内核零 fork；需改内核即回本 ADR 修订。

## 决定四 · 会话归属与持久

pi lane 会话落卷宗容器内独立分区（工作稿旁），格式从 pi 原生 journal；不写入场景线 Turn journal 与确认账本。跨线引用（loop 产物进场景、场景材料进 loop）后置，需求实证后修订本 ADR。

## 决定五 · 升级纪律

锚定引入版本；升级逐版核对上游 changelog；扩展 API 破坏性变更触发重评（回本 ADR）。上游 license 逐版复核（pi 主仓 MIT，子仓有 Apache-2.0 先例，不默认继承）。

## 未决四题（`PI-LANE-1` 必答，答案回本 ADR 补记）

1. 预算上限（steps/usd）能否经扩展 API 可靠实施，还是须 sidecar 层强杀。**已答（2026-07-27，`docs/engineering/pi-lane-1.md` 第二节，源码级）：不能**——`beforeToolCall` 的 block 只换错误 toolResult 不停 loop；`shouldStopAfterTurn` 不被 `Agent` 转发、`AgentHarness` 零权限钩子。实现取宿主 `abort()`（`turn_end` 记账、被 abort 回合不计入，红证在案）。**已知边界：越限即停 ≠ 永不越限**（末回合可压线超出）——`PI-LANE-2` 生产面必须如实呈现该语义，不得宣称等同场景线 RuntimeGuard；乙路（直驱 `agentLoop()` 换真停钩、自担状态机）与丙路（请求前预估）留为升级选项，届时裁。
2. 授权决定能否持久化入我方账本（执行前落盘），扩展钩子的时序是否满足 durable-before-effect。**已答（同件第三节）：时序满足**——`beforeToolCall` 被 `await` 且 prepare 阶段串行先于执行。三限制随答登记：未注册工具在钩子前即被内核拒（「全部请求落账」须另解析 `message_end`）；immediate 结果的拒绝语不可覆盖；durable 的落得住半边归我方（ADR-010）。本票读面未实现账本，只证时序可用。
3. journal 分区的具体落点与备份/删除语义（ADR-019 容器分区细则）。**提案已采（2026-07-27 架构裁）**：容器分区内新增 `loop/` 子档与工作稿并列（对外分区单位仍是容器，不触 ADR-019「第四分区单位触红」判据），内存 pi 原生 journal 格式；不入跨容器检索、不写场景线 Turn journal 与确认账本、随容器整删、凭据不入；loop transcript 属过程记录不走「先入卷再确认」。细则随 `PI-LANE-2` 实施冻结；若届时走乙路自写 journal，格式再议。**已知边界：当期 `Agent` 层无 harness journal，pi lane 会话进程退出即散**（SPEC 已登记）。
4. Node sidecar 的签名/公证链影响（与 `SANDBOX-PROBE-1` 裁点一共用一个 sidecar 的可行性）。**部分回答（2026-07-27，探测报告第七节）**：场景线沙箱已定乙路（Rust 自研窄 profile），不需要 sidecar——「共用」只在甲路成立，而甲路已挂「域名级网络准入成为真实需求」重启；本题剩余部分（sidecar 自身签名链）随 `PI-LANE-1` 回答。**已答（同件第五节）**：dev 形态不进 `.app`，签名链代价零支付、零事实可测——整体推至 `PI-LANE-2` 生产挂载时实付实测（探测报告第七节记账假定已同步订正）。

## 对既有口径的两处反转（如实登记）

- OpenWork 标杆报告曾以「我们在它外包的那层持有自研资产」立论；本 ADR 后叙事口径改为：**loop 是 commodity，资产在容器、确认账本、预算硬限额与垂类契约**——资产清单本身不变，「自研 loop」不再列入。
- `OSS-SUBTRACT-1` 的最大一问（loop 自研 vs 换件）由本 ADR 先答；该票重定向为「其余自研面盘点」，优先级降一档。

## 修订记录

- **2026-07-27 晚**：决定二补句「放行不等于升档」——澄清性补句，不改任何决定语义；起因是 SANDBOX-PROBE-1 复读会话提请「探测已放行」易被误读为「写面已解锁」。同批裁定：ADR-018 门 R3 的扫描面随 `PI-LANE-1` 扩到 `packages/pi-lane` 的 Node 侧执行/写原语（机器门路线，非文档承诺路线；开口子同批封口子判例），条款入该票派单加签与就绪图行。

- **2026-07-27 夜二 · 包名订正（供应链陷阱）**：正文两处 `pi-agent-core` 补全为 **`@earendil-works/pi-agent-core`**（引入锚定 0.82.1，MIT，Node ≥22.19.0）。npm 无 scope 名 `pi-agent-core` 是第三方名下的占位空壳（486 字节，自述 placeholder name reservation；发布者为 pi 作者本人故未被抢注，但库本身未发布于该名下）——照订正前文本 `npm i` 会装错包。`PI-LANE-1` 实现一手核实后上报，订正为澄清性修订，不改决定语义。同批裁定一件：dev 入口落点准予 `packages/pi-lane/dev`（sidecar 自服务，不触 desktop 构建配置、dev 页不进产品包），就绪图行「desktop dev 入口」措辞随清账订正。

## 来源

产品定调：本对话 2026-07-27（接入形态与首票范围经显式确认）。pi 一手核实：归档 `research-2026-07-20-pi-first-source/`、`pi-ecosystem-2026-07-26.md`、`research-2026-07-27-parallel-survey/`（史料线索）。被修订项：ADR-011 决定二（修订记录三）。等级绑定：ADR-018 决定五。
