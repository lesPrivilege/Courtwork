# CourtWork · Harness Extensions 下一轮聚焦与接入体例

日期：2026-09-13
状态：本轮补充提案，待本地逐项消费；未修改仓库、创建 PR、安装扩展或运行验收。
用途：补充上一轮 Release Review，不新建总路线图，不改写旧证据，不自动关闭 G1–G5。

## 1. 产品裁决

CourtWork 不以复制另一款 Coding Agent 为目标。开发者预览选择经典、有限的 coding 任务，作为电脑执行能力和扩展接缝的首个可验证消费者。它验证读、查、改、执行、观察结果、人工介入与接手续行，不将 IDE、终端或仓库工作流固化为整个产品的本体。

Harness Extensions 是按能力语义组织的可选执行能力。优先消费既有生态和本地选型，不因新一轮评审重新开展无边界竞品扫描。固定支持集合之后，先获得一个完整能力纵切，再逐项扩展。

本文将“Hooker”按生命周期 hooks 理解；Pi 参考沿用已登记的 Pi Agent 线。不把语音转录中的名称直接注册为新框架或新产品实体。

## 2. 资料与本轮核查范围

已召回 Library 中的 `harness-primitive-index.md`、`CourtWork-runtime-composition-v2-2026-09-12.md`，并定向读取 CourtWork 与上游的相关原件。旧研究结论只是其固定时点的来源，不自动成为本轮采用或验收。

本轮 CourtWork 源码读取沿用上一轮固定 SHA `24bd9545936dd19a498fc6b7eed5de106ac0d5e8`，未重新确认此刻 main，也未核对未提交的本地索引。

已读的当前接缝：
- `docs/runtime-control/INDEX.md`：资源类别、控制面、不变量；该基线中 hook 为 adapter-required，尚无 executable hooks。
- `app/runtime/control-contract.d.ts`：独立于 Pi/renderer 的 Runtime Control Protocol v1；资源身份、source、scope、运行/暴露/权限维度、RuntimeBinding、配置 revision。
- `AgentCompositionSource.uiSlots`：当前声明 `runtime.inspector` 与 `work.surface`，源码注明是未来前端组合声明而非可执行代码。不可据此称通用 renderer 注册已落地。

上游定向读取：Pi v0.85.1 extensions；DSH 固定 `d347e703908d0406b7a7ef80e3a0e594d86b2215` 架构；OpenCode 官方 plugins 与 V2 plugins 页面。V2 文档明示 beta，不以浏览到新文档为升级裁决。

## 3. 下一轮先收敛什么

### 3.1 基本 coding 能力纵切

在独立合成仓库执行：识别请求与工作范围 → 读取/检索 → 提出并实施修改 → 显示精确 diff → 经现有执行授权运行该仓库的检查命令 → 记录退出码、输出和运行身份 → 人检查结果 → 再次打开并继续。

应有的最小行为：
- 文件读、列、查与编辑；版本和 diff 可检查。
- 有明确 cwd、命令、环境策略、超时、输出限制、取消与退出结果的执行。
- 准确的工具权限、等待、失败、取消请求与终态；运行结束不等于检查通过。
- 模型/运行配置、必要的指令/skill/MCP 接入、历史及连续性；只使用本候选实际支持的集合。
- 斜杠入口与 GUI 动作进入同一 owner；指令不全被压成 prompt，也不把 template/tool/session command 当同一类型。

这是一条开发者能力验收，不替代正式 Work 产品的 G1–G5。当前 Release 已承诺的范围保持原归属；若发布新增“Agent 自行运行测试”的声明，相应命令执行证据成为该版本前置，不能沿用不需要 shell 的 NDA 限定来免除。

### 3.2 有界扩展候选

| 类别 | 第一份候选消费者 | 不默认捆绑 |
|---|---|---|
| Hooks | 一种准备/检查/通知模板，完整注册与执行记录 | 任意 hook 脚本编辑器、可视化流程引擎 |
| Computer Vision | 显式提供的一张图片或受控截图，关联原件的解释结果 | 全天屏幕监视、任意桌面操作 |
| Browser | 一个明确网页任务所需的读取/操作 | 完整 computer-use 产品 |
| Agent/subagent | 一个有输入范围、能力限制和结果引用的核查或探索子任务 | 多层团队、无限递归、全局并发调度 |

上述是排序建议，不宣称已实现或全部是首发 blocker。首条消费者真正需要哪项，才将它加入该候选支持集合。图片理解、屏幕采集、浏览器操作和桌面操作分别定权限和验收，不能合并成一个“视觉已开启”。

## 4. 扩展封装：共同身份，分开的职责

建议保持以下区分：tool 是可调用动作；hook 是生命周期挂点；command 是用户入口；skill/instruction 是指令和资源；profile 是能力组合；subagent 是子执行；MCP 是协议接入；UI contribution 是呈现和交互贡献。

一个包可以贡献其中若干部分，不要求每个包都具备它们。前后端可以位于不同模块，通过同一扩展身份和版本关联，而不是必须成为一个文件、一个进程或同一语言。

私有 Runtime 扩展、CourtWork 共享能力服务、Work 专业扩展仍按原 owner 分开。原生 hook 名称在 adapter 处映射，不冻结跨全部 Runtime 的假通用 ABI，不用只剩 prompt→text 的最低公分母抹掉原生能力。

优先采用受信源码扩展：固定来源/版本，小 adapter，必要配置与前端注册，样例与测试，由 coder 辅助维护。构建时组合或重启生效都是正式支持方式；不以一键安装、任意第三方代码隔离或运行中热替换作为首个合格插件的门槛。

## 5. 前后端合流合同

优先扩展现有 Runtime Control、控制面和 surface/semantic contracts，不再创建第二个总 registry。以下是需要清账的责任，不是已确定的新 DTO：

| 责任 | 最少登记内容 |
|---|---|
| 身份与来源 | 扩展 ID、版本、上游来源、适配版本、维护入口 |
| 执行贡献 | tools/hooks/commands/profile 等具体贡献、实际执行 owner |
| 权限与范围 | 能力需要、输入/文件/网络范围、审批与作用域 |
| 生效与生命周期 | 配置意图、实际绑定、重启/下一 Run 等生效边界、清理与禁用 |
| 结果与证据 | Run/call/source 身份、输出引用、错误与未知结果 |
| 前端贡献 | 配置与使用入口、结果类型、可用动作、默认 inspector 回退 |
| 验证与升级 | 可运行样例、负例、兼容 fixture、升级/回退说明 |

同一资源的 installed、running、exposed、permitted 继续分开。UI 展示 owner 事实并提交 typed intent，不复制正式状态，不通过开启卡片授予权限。

所谓“自然长出”，应是新扩展能复用已登记的行为、组件和样例，coder 只需填写与其不同的少量代码；不是宣称任意 schema 自动生成成熟 UI。

## 6. Hooks 的最小前端

### 控制面

在现有 Settings/Runtime 能力配置中显示名称、来源、作用范围、触发时机、是否启用与生效边界。需要时展开版本、配置与最近记录。技术性的 hook 名称留给开发者详情，默认文案说明用途。

### 使用面

正常无事发生时保持安静。真正改变流程时才呈现：阻止操作、需要批准、检查失败、修改输入、暂停或提供相关结果。不要把每次 hook 触发变成聊天消息。

### 检查面

在 Run 详情内提供触发点、扩展/配置版本、目标操作、执行结果、耗时和错误。历史 Run 展示其历史 binding，不以现在的开关解释过去。

先区分观察 hook、拦截 hook 与变换 hook。普通通知失败可记录后继续；承担权限守门的 hook 失败不得默许通过；变换最终执行参数后，必须针对新参数核查权限/审批。输出检查不允许把未知或失败写成通过。

定义执行顺序、超时、取消、重入与派生事件去重；卸载回收注册、watcher、timer、连接和在途资源。回收注册不等于撤销已发生的外部副作用。

## 7. UI Grammar 的落点

配置进入 Settings/Runtime；使用入口进入适当的 composer command/action；过程进入工具/执行展示；图片、文件、diff、命令输出和子任务进入对应共享 reader；技术细节进入 Inspector。每个小扩展不默认新增永久侧栏入口。

按责任依次消费：设计 token → 基础 controls → 行为模式（展开、返回、焦点、pending）→ typed projection → 页面/surface composition。

常规扩展复用表单、状态行、调用卡和结果 reader。专用视图只有明确消费者需要时才增加，并登记容器角色、返回、焦点、空/错/过时状态、尺寸与动效。纯后端扩展也应有可理解的通用检查入口。

## 8. 内外叙事分开

内部保存实际缺口、风险、版本绑定、验收与 Release 前后依赖网；对外按产品用途和能力选择组织叙事，不把未完工单、待办编号、阻断状态铺进首页。

对外可以提前完成稳定产品定义；不需要每一句理念都附实现标签。下载/使用入口与当前版本说明则简洁、准确地交代可使用范围。产品内无法执行的动作仍应如实给出原因，不以隐藏内部工单为由呈现虚假可用状态。

### 对外定义草稿

Harness Extensions 是 CourtWork 面向电脑工作环境的能力层。它围绕文件、命令、检索、视觉与协作组织可组合的能力，让不同 Agent 按任务使用合适的工具，也让人能够理解和控制它们如何参与工作。

开发者预览以经典的代码任务检验这套能力：理解仓库、修改文件、执行检查、审阅结果与接续任务。Coding 是通用执行能力的验证场景，而不是 CourtWork 的产品边界。

扩展实现优先复用开放生态。无论能力由上游工具、本地模块还是专用执行器提供，都沿一致的配置、权限、状态与界面体例接入。

本段为产品定义提案，不是当前候选逐项支持清单。

## 9. 串行消费与停止条件

先核对已登记选型与当前代码，形成唯一的小支持集合；再用一个扩展代表验证后端执行、控制面、Run 记录和 UI reader 的合流；随后完成基本 coding 场景及其错误/取消/历史负例；候选冻结后按其对外声明完成发布证据。视觉、浏览器、子任务等按依赖和收益进入当前候选或 Release 后，不因本轮列出就自动承诺首发。

现有原编号、current、发布门和选型索引仍持有各自权威。本文回收时需逐项登记采用/调整/不采用与实际施工入口；本文件本身不算已入账实现。

长期退出判据：接入一个普通新扩展时，无需改主 loop、无需复制正式状态、无需再造一套前端视觉语法；确需修改共享合同的增量可以被定位、解释与测试。

## 来源

1. CourtWork Runtime Control Index（固定审查基线）：https://github.com/lesPrivilege/Courtwork/blob/24bd9545936dd19a498fc6b7eed5de106ac0d5e8/docs/runtime-control/INDEX.md
2. CourtWork Control Contract（固定审查基线）：https://github.com/lesPrivilege/Courtwork/blob/24bd9545936dd19a498fc6b7eed5de106ac0d5e8/app/runtime/control-contract.d.ts
3. Pi Extensions，v0.85.1：https://github.com/earendil-works/pi/blob/v0.85.1/packages/coding-agent/docs/extensions.md
4. DeepSeek Harness architecture（既有研究固定 SHA）：https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/docs/architecture.md
5. OpenCode plugins：https://opencode.ai/docs/plugins/
6. OpenCode V2 plugins（官方页面明示 beta；本轮读取日 2026-09-13）：https://opencode.ai/v2/docs/build/plugins
7. Library 原件：`harness-primitive-index.md`，2026-09-06 研究快照。
8. Library 原件：`CourtWork-runtime-composition-v2-2026-09-12.md`，历史补充裁决，不用其旧排序覆盖新的本地 current。
