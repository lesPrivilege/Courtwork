# UX 体例（已裁定规则的单一阅读出口）

2026-09-07，main Fable，按 Astra 裁定 A-1 建立。**本页是索引与施工入口，不是第二套权威**：每条只登记已裁定的规则，写明适用面、来源、状态与例外；冲突回到来源裁决，不由本页覆盖。新规则不混入，另列 §末"提案"。状态：`accepted` = 来源文档已裁定；`proposed` = 来源仍为 proposed 或待独验。

## 1. 状态与措辞

| 规则 | 适用面 | 来源 | 状态 | 例外 |
|---|---|---|---|---|
| run 八态固定文案：created / running / waiting_user / stopping / completed / cancelled / failed / unknown；unknown 只在 Host 报告时出现 | Thread、Dashboard、Run details | WS-06、WS-12、api-v6 | accepted | — |
| question 四态：pending / resolved / expired_restart / cancelled；非 pending 永不显示回答或授权按钮 | 问题卡、授权卡、Dashboard | api-v6、DC-2 | accepted | — |
| `current` / `content-version` 是文件读取与版本引用类别，不是成果审批状态 | preview、outcome | api-v6 §Current file vs content version、A-1 | accepted | — |
| 状态文字化：胶囊底色退役；只有 failed 与 waiting_user 允许颜色；completed / cancelled / unknown 灰字 | 全部 | PD-L2、PC-4 | proposed（L4r1 待 Codex 独验、DS-007） | 画布已转录；产品待 polish 合流 |
| 动作词表：answer 与 allow / deny 是两类，自然语言回答不授权写入；allow 是一次写授权，不是成果接受 | 卡片、Dashboard | WS-07、api-v6、DC 契约 | accepted | accept / reject / revise 在 Core 契约成立前不出现（WS-01、A-4） |
| "等待你回应 / Waiting for you"不推断紧迫或截止 | Dashboard | Astra 复核 P2-3 | accepted | — |

## 2. 注意力与阅读层级

| 规则 | 适用面 | 来源 | 状态 | 例外 |
|---|---|---|---|---|
| 成功压缩为一行 ledger；失败整行强显、不静默折叠 | Thread 工具行、Dashboard | MT-04、layout-brief L2、PD-L2 | proposed（同上） | 失败自动展开属 app.mjs 逻辑，留 P3 |
| 注意力线：等待你＝左侧 2px `--accent` 线＋蓝字；失败＝左侧 2px `--danger` 线＋红字；安静＝灰字无线 | Dashboard 行、Thread、Run details | PD-L2、PC-3；UP-9；f8e3c19 实际样式 | **superseded** | f8e3c19 移除等待态装饰线：等待/运行使用状态词前圆点与 accent 字色；失败保留错误语言的红线。消息时间与操作随 hover/focus-within 成组显现（`app/web/styles.css` polish layer）。历史来源保留，其他 §2 条款不变。 |
| 三层阅读面：ledger（Thread 一行）→ bounded preview（卡片正文、Run details 摘要）→ 事件级 canonical 输出（Run details 折叠区、preview tab）；不等同 Papers 的 canonical 工作状态 | Thread、Run details、preview | MT-04、DC-7、A-1 | accepted | — |
| 三档注意力：等待你回应 / 需检查候选（failed、unknown，按状态筛选、无 read/ack 生命周期）/ 安静；与 work-summary 三集合可重叠 | Dashboard | DC-2（Astra 修订） | accepted | unrecorded_files 单独从 run.notice 取证 |
| 消息流唯一表面卡 = 需要人决定的对象（问题卡/授权卡）；已关闭退灰字 | Thread | PD-L2 | proposed | 只是消息流内的层级约束，不扩写为全产品规则（A-1） |

## 3. 字段来源纪律

| 规则 | 适用面 | 来源 | 状态 | 例外 |
|---|---|---|---|---|
| 只画已记录字段：时间来自 Run `startedAt/endedAt`、`session.createdAt`、`question.createdAt`；事件无时间字段；seq 不跨会话比较；不画逐消息时钟 | 全部 | DC-3（Astra 修订）、api-v6 | accepted | 接入 work-summary 后以其公开排序契约为准 |
| `tool.start` 只有 callId / name；工具行显示名称与真实 `tool.result` 摘要，不猜参数 | Thread、Run details | api-v6、Astra 复核 P2-4 | accepted | — |
| 授权卡绑定 questionId + toolCallId + path + bytes + contentSha256 + preview（400 字）；参数变化即新问题 | 授权卡 | api-v6 §Permission cards | accepted | — |
| usage `missing: true` 显示"至少 N"，不显示为零 | Run details、Thread 页脚 | api-v6 §usage | accepted | — |
| hash/bytes 不是语义变化；写入成功、allow、工具成功均不证明内容正确或被接受 | preview、outcome | A-3 | accepted | — |

## 4. 未知、断连与截断

| 规则 | 适用面 | 来源 | 状态 | 例外 |
|---|---|---|---|---|
| 连接状态与 Run 状态分开；断连期间保留最后确认的状态与时间；连接条是应用级灰条，不用红 | 全部 | WS-12、L4-11 | accepted / proposed（视觉） | — |
| 读取失败是加载失败与重试，不能渲染成"没有待办"或"无会话" | Dashboard、落点 | DC-1（Astra 接受）、消费补充 §3 | accepted | — |
| 截断（truncated / hasMore）显示"还有未显示"，不显示"就这些" | Dashboard | work-summary 契约 | accepted | — |
| 失败隔离到当前内容模块，呈现"发生了什么 / 可执行的下一步"；不渲染可提交的半张决定卡；重试只在确有读取能力时提供 | surface 内容模块 | WS-01、A-2 | accepted | — |

## 5. 落点、导航与生命周期

| 规则 | 适用面 | 来源 | 状态 | 例外 |
|---|---|---|---|---|
| 落点：Host 列表成功读取后，有效 activeSessionId 恢复该会话；否则有会话进 Dashboard；确认无会话进开始视图；Home 稳定可达；显式 Home 导航递增导航代次 | 应用入口 | DC-1 / DC-9（Astra 接受、用户同意）、WS-02（已回填） | accepted | — |
| 进入会话附加面板一律关闭；显式 preview / run 深链在会话验证后打开目标 | surface | WS-09、Astra 复核 | accepted | — |
| 附加 tab 由 `{tabId, kind, title, icon, targetRef}` 描述；壳只做打开/激活/关闭/展开/返回；kind 由构建期静态映射，无运行时注册 | surface-host | WS-09、DS-006、A-2 | accepted | — |
| 生命周期：同会话切 tab 同身份不重挂、隐藏非活动内容且不留可聚焦控件；关闭/重开现有工作面保活；只有移除实例、身份替换、会话失效、宿主退出才按 kind 声明释放 | surface 内容模块 | WS-09、V7-02、A-2 | accepted | 跨会话 DOM 保留不作承诺 |
| 关闭面板不取消 Run、不清草稿；异步回执绑定 `{sessionId, tabId, targetRef, navigationGeneration}` | surface、composer | DS-006、G1、A-2 | accepted | — |
| 一个关闭协调者：Escape 一次只关最上层；IME 消费 Escape 时不关；关闭后焦点回入口，无入口回会话标题 | 全部 | WS-10、G1 第 7 项 | accepted（待施工） | — |
| composer：run-active 保持可编辑、Send 保持不可用并显示 run hint；readonly 只属 sending | composer | WS-08 | accepted | — |

## 6. 版面与触达

| 规则 | 适用面 | 来源 | 状态 | 例外 |
|---|---|---|---|---|
| 断点 768 / 1024；<1024 导航与附加面板为 sheet + inert；768–1023 附加面板 `min(420px,100%)` + 遮罩 | 全部 | PD-L3、WS-10 | proposed（L4r1） | — |
| <1024 主操作 44px 触控档（Send/Cancel 等宽、关闭 sheet、授权双键等宽） | 窄屏 | PD-L4r1、WS-10、Astra polish 复核 P3 | proposed | 44 是 SE 自定 AAA 档，非行业默认 |
| 内容列 740，头部主界收到列宽；间距 4/8/12/16/24；圆角 6/8/999；控件 24/32/36/44；两档线重；单一浮面阴影 | 全部 | PD-KIT、PD-L1b、PD-L2 | proposed（L4r1） | — |
| 通用操作消费单一成熟 SVG 家族；导航可图标+文字，状态/授权/后果仍以文字为主；字体系统栈 | 全部 | 用户 2026-09-07 新指示、[IC-1…5](icon-controls.md)；更新 DC-4/PC-6 | accepted（取用范围；待施工验收） | Lucide 静态子集，不自建家族；Inter 自托管仍延后 |
| 等宽字体只给哈希、序号、类型片段，不套整行 | Run details、卡片 | PC-9、explore-polish-rows §3 | proposed | — |
| 空态：Blank slate（无内容，单一主动作+说明+设置）与 Empty state（有内容无此项，只有标题必需）分别设计 | 开始视图、各分区 | WS-02.2、EXPLORE-SAAS、SAAS-ATLASSIAN-01 | accepted | — |
| 无能力不画控件；有能力但当前不可用则禁用并说明原因 | 全部 | WS-01、DC-11 | accepted | — |

## 7. 新增表面与图标体例 · 2026-09-07

| 规则 | 适用面 | 来源 | 状态 | 例外 |
|---|---|---|---|---|
| 按阅读/比较/独立对象/输入/浮层任务选择行、section、DataList、卡片和浮层，不为每条信息套卡 | 全部 | [SH-1…6](surface-hierarchy.md)、用户新指示 | accepted（用途规则；新增值待验） | 真正授权对象保持整体范围和动作 |
| 留白/字阶先分组，框线定义边界，阴影表示抬升/覆盖；hover/focus/selected区别明确 | 全部 | [SH-2…4](surface-hierarchy.md)、Radix/Atlassian官方规范 | accepted（取用范围） | focus ring不受装饰数量限制 |
| SVG在原生button/link内；关键决定保留可见文字；tooltip支持hover/focus且不藏必要语义 | 操作栏、导航、行内操作 | [IC-1…5](icon-controls.md)、Luna源核验 | accepted（取用范围） | 触屏有等价可发现入口，实际能力来自Host |
| 本轮成果摘要与运行记录共用 kind:run；preview仍独立 | 附加面板 | [O-1（历史路径：`../mvp/execution/gui-completeness/dashboard-design/adjudication-outcome-astra.md`）](../migration/2026-09-08/evidence-index.md) | accepted | 将来独立decision unit另立项，不改变Continue落点 |

## 8. 当前 UI 编排标准（2026-09-08）

用户要求本轮清缴文本、版面、卡片、Button 的各级对齐与编排。已实施的 token、动作词表、组件规则和窄屏边界统一登记在 [UI 编排标准](ui-composition-standard.md)，作为当前新增组件的施工入口。Court Work 品牌语义注入由用户在 merge 后首单交 Claude；本轮独立品牌包交付不等于产品语义接入。

## 提案（未裁定，不属体例）

- 成果摘要四段在 run 内的最终呈现——容器已按 O-1 合并；具体去嵌套卡、证据措辞与失败变体仍待作者消费 O-2/SH-5，不重新引入 outcome kind。
- tool → turn 聚合（三层阅读面的聚合单位）——行为增量，待 C3 拆分后单列证据。
