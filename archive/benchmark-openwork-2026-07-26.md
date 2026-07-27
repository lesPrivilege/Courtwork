# 通用底座标杆实测：OpenWork 对照报告（2026-07-26）

对象：`different-ai/openwork` tip `1f41a52`（2026-07-26，活跃）。方法：云端源码快照，两路 Sonnet 并行拆解（harness 面 34 次工具调用、GUI 面 10 次），全部结论带 file:line 证据；对照基线为我方九域账（HARNESS-CORE-1 Stage C + 2026-07-26 两轮盘点）与现行票队列。本报告不改变任何能力口径；新增裁决三枚见第四节。

## 一 · 结构判定：标杆须拆成两半用

**OpenWork 的 agent loop 是 100% 外包的。** `spawn("opencode","serve",…)` 起外部子进程（`apps/server/src/managed-opencode.ts:92`），session/message/todo 类型直接 import 自 `@opencode-ai/sdk`，仓内零行 LLM 调用与 tool-loop 实现；其自述「Ejectable: powered by OpenCode」。OpenWork 本体 = 进程编排 + 能力网关（`search_capabilities`/`execute_capability` 双工具，实现在 `ee/` 企业侧）+ 共享/市场层 + Electron 壳。

因此「以 OpenWork 为标杆」要拆开：**GUI/交互标杆成立**（它的桌面面是自研的，且质量高）；**harness 标杆不成立**——执行内核的真标杆是 opencode 与 pi（pi 首源已消费），OpenWork 在这一层没有可校验物。这反向确认了我方架构选择的分量：ADR-011 自研最小 harness 意味着我们在 OpenWork 选择外包的那一层持有自己的资产——RuntimeGuard 四类硬限额（OpenWork 全仓 `tokenBudget|maxSteps|budgetUsd` 零命中，唯一「预算」是网关 180s 超时）、执行前持久授权、原件只读、fail-closed 门禁，这些它一样都没有。

**负面判例更新（OPENWORKER-SURVEY-1 续档）**：`_scheduled_approver` 标识符已不存在，但行为判例在 main 上换名存续——桌面内嵌 server 硬编码 `approvalMode:"auto"`（`apps/desktop/electron/runtime.mjs:1208`），19 处 host/write API 的 `requireApproval` 事实上无条件放行；真正门控工具调用的是 opencode 侧 permission.ask（once/always/reject，事前、always 持久化为 pattern 许可）。两层分明：**工具级审批外包给 opencode 且形态尚可，自建 host API 层仍是 auto 直放**。scheduled 线其 roadmap 标注 Building/Next，仓内零实现。

## 二 · 三栏对照

### 栏一：OpenWork 有，我方已裁不做——裁决全部经受住实测

| OpenWork 实况 | 我方裁定 | 验证结论 |
|---|---|---|
| 重新生成按钮：全仓 grep 零命中 | 已裁不做（C/R-5） | **对手同样不做**，裁定加固 |
| 斜杠触发 skills/commands（`slash-command.ts`） | /command 裁死、非上下文斜杠当期不做归 ⌘K | 维持；其斜杠面绑定共享层特色，不构成翻案新论据 |
| 语音：独立 WebRTC Realtime 侧栏，composer 无麦克风 | 不做留痕 | 维持；其形态恰好印证「桌面主输入不是语音」 |
| bash/终端（node-pty 全套 + Computer Use） | ADR-017 决定零 bash 不入界 | 维持——它敢开是因为安全性外包给 opencode permission + OS 信任边界，正是我们拒绝承接的风险模型 |
| 沙箱：本地零隔离（authorizedRoots 路径白名单 + 弹窗兜底），强隔离只在云端 Daytona | ADR-018 显式停 `none` | 同构选择，互证 |

### 栏二：OpenWork 有，我方有票——排序与票面获得实证输入

| OpenWork 实况（可借形素材） | 我方票 | 输入 |
|---|---|---|
| `TodoPanel`：composer 上方、折叠计数/展开逐条圆点（`session-surface.tsx:416-471`） | `WORK-PLAN-PANEL-1` | frontier 实证 + 落位形态参照；我方数据源（`todo_snapshot` 系统派生只读）契约更强 |
| sonner 定制 toast 双位（action 有无分流 top/bottom）+ 通知中心（100 条/30 天、告警合并） | `UI-TOAST-1` | 借形对象一致（sonner）；通知中心作二期候选不入当期票面 |
| 深度搜索弹窗（标题+全文并发+进度）+ 会话内查找栏 + 命令面板跳转 | `C3-2` | 三形态并存的分工参照 |
| 粘贴 >50 字折叠 chip；草稿仅内存态不跨重启 | `C3-3` | 阈值实测数据点（其 50 vs 我方拟 500–1000，对象不同：它折叠所有粘贴，我们只折长文）；草稿跨重启是我方超出点 |
| 失败卡带「改用建议模型」动作、自动重试倒计时卡 | `C3-1` | 失败呈现的动作化参照 |
| 模型 key 三通道（粘贴/OAuth/托管）、用量显示**零实现**（计费类型定义了无 UI 消费） | `C3-4` | 用量可见出口是我方相对 frontier 的领先项，抬高该票价值 |
| opencode permission「once/always/reject + always 持久化 pattern 许可」渲染层 | `TOOL-READ-1`/`S6-EXEC-1` | 同意面 UI 三选项形态可借；**但其「always」按 pattern 概批与我方「授权作用域=单次提案」相悖，只借皮不借语义** |
| 市场/共享（五源合并浏览、GitHub 导入 Claude 插件包） | `PACK-INTERACT-1`（一级）/Stage 4 | 其桌面端也仍是「发现→本地安装」，「零安装直接执行」在其文档明确 Not in Phase 1——我方后置不失速 |

### 栏三：OpenWork 有，我方零登记——真空白仅三项

1. **忙碌时消息排队/steer**：busy 发消息即 steer 不打断，另有排队面板（Cmd+Enter 入队）。我方 S3 场景禁中途输入是既有裁定，但 **chat 面 busy 时的输入处置**（禁用 vs 排队）确无登记。
2. **产物侧滑面板的富预览编辑**（Markdown/HTML sandbox/PDF/图片 + 电子表格编辑器 + CodeMirror）。我方 PreviewHost + reading-view 覆盖大半，电子表格编辑属垂类外，不对标；差集实为「产物面板的下载/在文件夹显示/关闭动作排」，小。
3. **会话跨重启的前进/后退导航栈**。我方 ADR-013 语义下无此概念，属体验糖。

### 我方有、OpenWork 无（差异化资产清单，供站面/叙事引用）

运行预算硬限额（steps/time/toolCalls/usd 四类 + 冻结价目）、执行前持久 per-effect 授权、原件只读与受控副本、引语锚点与 fail-closed 落格、确认账本与修订可回放、用量/成本可见（在票）、声明式场景编排、65 门机器门禁体系。**每一项都在它的空白区。**

## 三 · 对「通用能力自足，垂类契约才能生长」的排队含义

实测不支持推翻现行队列，支持两点微调认知：其一，TRACE/DOSSIER 不是「垂类功能」——显式选择、来源回跳、账本同源是通用 work agent 的产物真实性机制，恰是 OpenWork 没有的底座件，legal 只是首个消费者；收束 v0.2.0 与通用线不冲突。其二，通用线开工资格已由⑤解锁路径给出，OpenWork 实测把 `WORK-PLAN-PANEL-1`、`UI-TOAST-1`、`C3-1/2/3/4` 的票面从「我们认为该有」升级为「frontier 已实证 + 有借形坐标」——按互斥模型尾随入队即可，无需插队。

## 四 · 新增裁决三枚

1. **`CHAT-QUEUE-1` 入票池**（不入当期队列）：chat 面 busy 时输入处置从「禁用」升级为「排队发送」，S3 场景禁 steer 的既有裁定不变。待 C3-1 清账后按互斥模型排队。
2. **归档索引 OPENWORKER-SURVEY-1 条目续档**：负面判例按第一节更新（标识符退役、行为存续于 `runtime.mjs:1208`），随下批落痕写回。
3. **opencode 定向补充调研挂 `TOOL-READ-1` 派单前置**：只读三题——permission 配置的归一化语义（`tools`/`permission` 四种写法）、工具结果进 session 的形状、abort/steer 的 turn 语义；云端 Sonnet 一次跑完，不立独立票。

导航栈与产物面板动作排两项：**显式不采纳留痕**（体验糖，不触现行缺口；重启判据=试点用户提出）。
