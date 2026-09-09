# WO-MA2-02 · Thread 消费面（Attention 对话面内）

派单人 Fable，执行 `opus-wo-medium`。裁定见 [本轮 README](README.md) MA2-D09…D14、MA2-D16，接缝见 [EX-MA-R3](explore/ex-ma-r3-frontend-seams.md)，设计语法见 [EX-MA-R4](explore/ex-ma-r4-design-grammar.md)，生产合同见 [coordination.md](../../../../app/docs/coordination.md)。基线 `6b4f4cd`。

**这一片要证明的事**：首片交付的 Thread 合同能不能被一个真实使用者消费——显式选择来源会话与目标工作线、拿到一张与 Run 和 Core 接受分得开的回执、在收件箱里看到它。不是做一个消息中心，是把"投递不等于执行、不等于接受"这件事在界面上看得见。

## 0. 写权与红线

- 隔离工作树 `/private/tmp/se-ma2-fe`，分支 `claude/ma2-frontend`，`app/node_modules` 已软链。要跑起来看时用端口 **8940**、数据目录 `/private/tmp/se-ma2-fe-data`；**不要**用 8804／8816／8818／8930。
- **写权**：新增 `app/web/coordination-view.mjs`、新增 `app/web/coordination-projection.mjs`、小改 `app/web/attention-agent-view.mjs`（只改挂载与 `deactivate`）、`app/server/index.mjs` 的静态白名单数组（只加项）、新增 `app/tests/coordination-view.test.mjs`、交付文档 `engineering/research/multi-agent-2026-09-10/round2/delivery-ma2-02.md`。
- **`app/web/styles.css` 是与 CC-I 并行写的唯一重叠文件**（MA2-D16）。你只准在**文件末尾追加一整块**，块首尾各加一行注释标记本片来源，块内不得穿插修改既有规则。合流前先 rebase。
- 不得新增依赖、不得引组件库、不得新建第三个 element builder（本片只用 `ui-controls.mjs` 的 `el()`）、不得新增图标（`icon()` 只认固定 24 图标子集，用不上就用文字）。
- 不得改后端：`app/harness/**`、`app/server/service.mjs`、`app/core/**` 一行不动。合同与实现如有出入，写进交付文档。
- 不得动 `app/web/settings-view.mjs`（CC-I 正在写）。

## 1. 形态

挂载点就是首片撤出原型留下的那处空槽：`attention-agent-view.mjs` 的 `dialog.append(header, toolbar, [此处], stream, status, composer)`。模块返回 `{root, deactivate()}`，在 `createAttentionAgent` 里构造并在其 `deactivate()` 中一并停掉。

- 顶层是 `<details>` 折叠面，**只在展开时取数**，收起即停。它不与 composer 争写焦点，不需改 `shell-layout.mjs` 或 `surface-modules.mjs`。
- 三个动作：创建 Thread、把当前会话接入已有 Thread、发消息。**发请求前先构造回执对象**（`crypto.randomUUID()` 生成 ID），以闭包变量跨重试保持同一对象——合同要求"未知回执后保留精确 ID 与载荷"，靠的是对象身份，不是重新推导。这一条照抄已撤出原型的做法（`git show 105458a^:app/web/coordination-view.mjs` 可读原件）。
- 回执文案把投递与执行分开：显示服务端的 `queued|delivered|stale_target|target_unavailable` 原词，并明说这不启动目标 Run、不构成 Core 接受。
- 收件箱按 `offset`/`limit` 分页，`limit` 最大 20；每条显示方向（To／From）、对方工作线标题、状态。
- **只从已知列表显式选择**来源会话与目标 Thread，不接受任意 Thread ID 输入：人类 HTTP 的收件箱读取不按成员关系限权，服务端不为前端兜住越权 ID（MA2-D12）。
- 草稿：点击外部不得隐式丢弃；关闭再打开，未发送的草稿要还在。
- 长度上限与服务端一致：ID／标题 200，正文 16000。

## 2. 投影与视图分开

新建纯投影模块，只做形状校验与重排：不取数、不缓存、不 `Date.now()`、不算"多久以前"、不覆盖服务端顺序；遇不认识的形状返回 `null`（体例见 `presentation-adapters.mjs`）。缺失事实是显式 `null`，不是 `0` 或 `""`。

**不得把 Thread 消息折进 `projectThread` 的行模型**（MA2-D10）：它不在 `state.events` 里，且合同要求投递与 Run／Core 接受分开显示，成员关系共享的是收件箱，不是彼此的模型 transcript。

## 3. 视觉

- 消息流一律**实色**，不用 glass、不用 `backdrop-filter`（材质规则：消息流／长文／证据／diff／表格属实色类）。
- 颜色只引角色 token，不得出现颜色字面量；`background` 只能落在既有角色集内。状态不得只靠颜色区分。
- **不预支 FE-05a**：继承当前字号与控件高度，不改 `--` 字号变量，不顺手修 M-16/M-17 的 composer 图标裁切。
- Answer／Allow／Deny 一类动词必须有文字，不得纯图标。

## 4. 测试

新增 `app/tests/coordination-view.test.mjs`：
- 投影纯函数的形状与失败关闭（缺字段、错 `schemaVersion`、越界分页各给一条反例）。
- 一条源码回归（体例见 `home-presentation.test.mjs`）：断言两个新模块都在 `app/server/index.mjs` 的静态白名单里；断言本片没有引入第二条 `POST /sessions/:id/runs` 写入路径。

不得改既有测试的断言来迁就新代码。

## 5. 验收

- 全量 `node --test tests/*.test.mjs ../tests/*.test.mjs`，记 before/after 数目（主线在动，基线以你自己这次为准）。
- `npm --prefix app run smoke`。
- 三项 lint 全跑并贴输出：`node tools/lint-colors.mjs`、`node tools/lint-materials.mjs`、`node tools/contrast-report.mjs`。
- 真实浏览器观察（8940，独立数据目录，合成数据，未配置真实 provider）：展开时才加载；创建工作线与接续会话各拿到回执；发送后看到 `delivered` 且目标会话**没有**新起 Run；切换目标后旧消息仍在真实收件箱里；390 宽窄屏无横向溢出。观察写进交付文档，**明确标为手工观察，不是完整视觉验收**。
- 交付文档记清：做了什么、每条合同要求落在哪个函数、暴露但未改的问题、以及仍未交付的范围。
- 不合流，停在分支上等复核。
