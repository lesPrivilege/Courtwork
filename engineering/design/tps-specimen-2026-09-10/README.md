# WO-TPS-01 · Decode TPS 微型 sparkline 动态 specimen（合成数据，设计候选）

2026-09-10 · Opus 施工，作者验证；不称独立验收。工作树 `/private/tmp/se-agent-tps`，分支 `claude/tps-reference-specimen`，基线 main `1992e90` + EX-TPS1 `799f54a`。事实输入为同目录下的 [EX-TPS1 参考核验](reference/README.md)。

打开 [specimen/index.html](specimen/index.html) 即可查看（经典 script，零外部依赖，`file://` 可直接打开；也可在本目录执行 `python3 -m http.server 8884`）。截图和测量数据在 [captures/](captures/measurements.json)。

## 1. 目的与边界

- **这是候选，不是产品。** 它回答的问题是：将来某个 owner 真的上报 token 时钟时，Decode TPS 这一行应当长什么样。今天产品仍然是 PV-79/80 那一行（一行加一个来源词，不画图；`Observed stream rate` ≠ TPS，见 `git show claude/fable-round4d:engineering/design/performance-specimen-2026-09-10/README.md`），`Decode TPS` 仍然显示 `Unavailable · no token deltas`（`app/web/telemetry-view.mjs:25`）。
- **不推翻 WK-141(b)。** [intake-round-3](../../mvp/execution/work-surface-kit/intake-round-3.md) WK-141 规定：micro-visualization 的准入前提，是 owner 给出带单位和来源的测量。本 specimen 不构成这一前提，只把前提满足之后的形态提前做出来，供届时裁决。
- **生产阻断仍然成立。** [request-telemetry](../../../app/docs/request-telemetry.md) 第 9 行：`decodeTokensPerSecond` 为 null，因为没有带时间戳的 token 增量；代码中缺口的字面名是 `missing: ['provider_token_timing','token_deltas']`。
- 方向依据是 [runtime-telemetry](../home-composition-2026-09-10/runtime-telemetry.md) 的 Measurement admission 表（Decode TPS 行）和 Retained specimen scope 段。
- 写权只在本目录。没有改动 `app/`、产品 token 或其他工作树；没有运行 provider，没有读取凭据。

## 2. 显式合成

- 页面顶部有一条 `Synthetic data` 横幅。每张候选卡片的标题行都有 `SYNTHETIC DATA` 戳记，而且卡片只有 1–2 个读数，戳记紧挨读数。每个数字右侧的来源词位置写 `synthetic`。sparkline 的 `aria-label` 以 `Synthetic data.` 结尾；disclosure 内还写明 `synthetic.js · scenario · seed`。
- 来源词位置用 `synthetic`（9 个字符）而不是整句 `Synthetic data`，有一个原因：将来这个位置放的是 PV-79 体例下的来源词（例如 `provider`，8 个字符）。两者等宽，下面第 5 节的宽度测量才反映真实的槽位。整句标注由卡片戳记和页面横幅承担。
- 生成器 [specimen/synthetic.js](specimen/synthetic.js) 单独成文件，文件头写明分布，全部是 mulberry32 固定种子下的纯函数。执行 `node engineering/design/tps-specimen-2026-09-10/specimen/synthetic.js` 会打印四个场景的逐请求摘要，页面上的数字全部可由此复现。
  - 场景：`live`（6 个请求，种子 20260910，页面实时回放），`long`（16 个请求，种子 20260911，用于宽度和形态对照），`failed`（第 5 个请求在输出 45% 处失败），`cancelled`（第 4 个请求在输出 30% 处取消）。
  - 分布：首 token 等待 400 + Exp(500) ms；每个请求的基准速率 Normal(40, 6) tok/s，截断到 [18, 70]；每个 chunk 1–6 个 token；chunk 间隔为 size/rate × U(0.5, 1.5)；每个 chunk 有 4% 概率额外停顿 U(250, 800) ms；请求之间的间隔 U(500, 1400) ms。
- 页面中不出现任何真实 provider 或模型名。`Observed stream rate` 和 `Decode TPS` 在生成器里来自同一条假流，两者数值接近不说明任何问题。

## 3. 假设的 owner 合同（假设，未存在）

> **以下字段在 Courtwork 中不存在。** 当前没有任何工单认领它。BE-38 是失败和中断的 error class，不是 token 时钟（EX-TPS1 §0）。**归属：待裁。** 本单不发明 endpoint，也不发明工单号。

假设它作为可空字段挂在现有 `runtime.request.telemetry` v1 事件上（身份：Run + requestId），分两层：

1. **per-request 终值（推荐形态只需要这一层）**：`decode = { outputTokensAfterFirst: int, decodeMs: number, clock: 'provider' | 'host-tokenizer', source: string } | null`。分子是 owner 计数的首个 token 采样之后的输出 token，不能由字符数估算；分母是 owner 单调钟上首个到最后一个 token 采样之间的时长，不含首 token 等待。failed、cancelled、interrupted 以及未上报时一律为 `null`。
2. **可选扩展（只有 interval 形态或进行中实时数字才需要）**：`tokenSamples = [{ seq, tMs, outputTokensCumulative }]`，与第 1 层同钟、同计数口径。

这里有一个本单才看清的事实：**推荐形态（按请求采样）不需要时间序列，只需要每个请求的一对终值。** 它比「每个采样 = {时间戳, 累计 token, 来源}」小一个量级。这与 EX-TPS1 §2 第 2 条的先例（按消息或 turn 采样，而不是逐 token 采样）一致。

## 4. 设计规则（候选语法）

| 规则 | 内容 | 依据 |
|---|---|---|
| 采样单位 | 一根柱代表本 Run 内一个已完成请求的 decode rate；最新的在右侧 | EX-TPS1 §2-2；第 5 节 G3 |
| 刻度 | 柱从 0 起，顶部取当前可见的最大值；用柱不用折线 | 自动缩放的折线会把 38 与 42 画成成倍差异 |
| 墨色柱 = 数字 | 显示的数字对应哪根柱，哪根柱用 `--ink`，其余用 `--muted`（非文本 ≥3:1）；数字不对应任何柱时（进行中、idle 中位数、失败）没有墨色柱 | 让「数字是哪一根」可见，不引入颜色语义 |
| 无速度色阶 | 不用红黄绿，不标「异常」 | runtime-telemetry Route distribution 行 |
| 缺值 | 值写 `—`，来源词位置写状态词（`in flight` / `failed` / `cancelled`） | PV-81：破折号即全部陈述 |
| failed / cancelled 柱位 | 画一条悬浮短横（3×1，位于中线），不画 0 高柱 | 0 高柱会被读成 0 tok/s |
| unavailable | 不画 sparkline 框，空框也不画；原样保留产品文字 `Unavailable · no token deltas` | 空框暗示「数据将至」 |
| idle | 不再有「当前速率」。行名改为 `Decode TPS · median`，值是已结束 Run 的中位数，保留累计 `Output tokens`；不显示 spinner 或脉冲，没有任何自走文字（如「4 分钟前」） | EX-TPS1 §2-3：窗口过期后速率类字段消失，累计量保留 |
| 冻结 | completed 之后这根柱和这个数字不再变化，直到下一个请求事件 | EX-TPS1 §2-3；Pi Pulse `renderFinal` |
| 动效 | 首根柱出现时整个 locus 做一次 opacity 入场（`--duration` 180ms）；之后只有新到的那一根柱做 opacity 淡入（`--duration-fast` 120ms）；数字直接替换，不做滚动 ticker | EX-TPS1 §2-6（beUI）；产品规定只动 opacity/transform/colour |
| reduced motion | 系统 `prefers-reduced-motion` 与强制档 `data-motion="reduce"` 都走产品原规则 `animation:none`，即瞬切 | Courtwork 既有约定（styles.css 2619–2637），与 transitions.dev 一致，不采用 beUI 的 ≤120ms 钳制 |
| 只随采样变化 | 渲染是（场景，owner 时间 t）的纯函数；播放器只为下一个采样设一个 timeout，没有 rAF 循环；内容没变就不重挂载 DOM | 第 7 节连续帧 |
| 文字等价 | SVG 为 `role="img"`，带 `aria-label` 与 `<title>`（条数、min/median/max、失败数、Synthetic data）；disclosure 以文字列出逐请求数值 | frontend-contract 可访问性 |
| disclosure | 原生 `<details>` 在原位展开：采样单位、样本数、显示窗口、分子、分母、时钟、min·median·max、刻度、来源 | atlas `tool-card` 的原位 `<details>` 先例 |
| 移动端 | ≤767px（产品窄屏断点）去掉 sparkline，保留数字、来源词和 disclosure | runtime-telemetry「移动端收起」 |

## 5. 逐组对照裁决

测量方法：真实槽位是 connection popover，宽 340、padding 16，measurements section 是 popover 的直接子元素（`settings-view.mjs` `renderConnectionCard`）。由此 `.data-list dd` 宽 **166px**。slack 为 dd 宽减去 locus 与来源词宽，行内还需要 4px gap。数据取自 `captures/measurements.json`，Chrome headless，系统字体。

### G1 · 宽度 40 / 48 / 60px（固定 4px 柱距，因此宽度也就是窗口：10 / 12 / 15 个请求）

| 条件 | 40px | 48px | 60px |
|---|---|---|---|
| 默认字号，典型值 `34 tok/s` + 来源词 | 一行，slack 17 | 一行，slack 9 | **溢出**（−3） |
| 默认字号，三位数 `188 tok/s` | slack 10 | **溢出**（2 < gap 4） | 溢出（−10） |
| Large 字号（×1.143），典型值 | slack 6 | **溢出**（−2） | 溢出（−14） |
| Large 字号，三位数 | **溢出**（−2） | 溢出 | 溢出 |
| `—` + 最长状态词 `cancelled` | 均可容纳（50 / 42 / 30） | | |

**裁决：40px。** 60px 在默认字号、典型值下就会挤出来源词，淘汰。48px 遇到三位数速率或 Large 字号就溢出，而这两种情况都不罕见。40px 只剩一个组合放不下：Large 字号且速率 ≥100，差 2px（处理办法见待裁 D-4）。视觉上，10 根柱已足以读出「最近几个请求是否变慢」；15 根柱在 12px 高度下柱距太密，读起来像一块灰斑（`captures/widths__1440-*.png`）。

### G2 · 形态：A sparkline + 数字 vs B 仅数字 + disclosure

- A 的增量信息是「这个请求比同 Run 前几个快还是慢」。这是一眼能扫到的信息，也是 sparkline 在这里唯一的存在理由。
- B 在任何字号和宽度下都有 ≥42px 余量，信息完全不丢，因为序列以文字形式留在 disclosure 里。代价是趋势必须展开才能看到。
- **裁决：桌面用 A（40px），≤767px 自动退为 B（同一份 markup）。** disclosure 在两种形态下都保留。另有一条前置规则：只要 owner 合同只提供单个请求的终值（第 3 节第 1 层），A 的柱就来自同 Run 的请求历史，不需要额外字段，所以 A 不会扩大合同。如果裁决不愿在 connection card 里放任何图形，B 是完整的退路，而且 B 与 PV-79「不画图」的精神距离最近。

### G3 · 采样：按请求 vs 按 500ms owner 固定间隔（同一条合成流，页面第 5 节实时并排）

| 维度 | 按请求 | 按 500ms |
|---|---|---|
| 变化频率 | 每个请求结束时变一次（live 场景 34s 内请求卡渲染 12 次） | 每 500ms 变一次（同期 65 次） |
| 读出的是什么 | 不同请求之间的速率差 | 请求内的 chunk 突发和停顿：同一请求内柱高时有时无，最后一格半截 |
| 进行中 | `—` + `in flight`，不伪造中间值 | 有「至今速率」数字，但需要第 3 节第 2 层时间序列 |
| 窗口含义 | 10 个请求，与 Run 对齐 | 10 × 500ms = 5s，没有产品含义；新请求开始即清空并重新入场 |
| 合同 | 每个请求一对终值 | 带时间戳的累计序列 |

**裁决：按请求。** 固定间隔在 40px 里把传输层的突发画成了「速度波动」，在视野边缘每秒闪两次（与流式正文争夺注意力），窗口没有语义，合同还大一个量级。它只适合将来在 Inspector 里做诊断视图，不适合做 micro locus。截图见 `captures/frame-*__interval.png` 与 `__request.png` 的对照。

### G4 · 状态处理（页面第 2 节）

- **streaming**：已完成请求的柱全部为 `--muted`，值写 `—`，来源词写 `in flight`。页面上没有任何东西会在两次采样之间移动。
- **completed**：该请求的柱改为墨色，数字冻结，help 写「this request's rate will not change」。
- **idle**：见第 4 节规则表。选择以 Run 作为统计范围而不是 10 分钟滚动窗口，原因是滚动窗口的过期需要一个与采样无关的计时器来驱动重绘，这正是「动效只随真实采样变化」所禁止的。Run 范围是一条不过期的记录，行名明示它是中位数，不再冒充当前读数。
- **unavailable / failed / cancelled**：见规则表。failed 与 cancelled 与 PV-81 的 ③ 同形。

## 6. 推荐形态（一句）

按请求采样；在 connection card 的 `Decode TPS` 行里放 40px（10 个请求）、从 0 起的柱状 sparkline，紧跟整数 `tok/s` 与来源词；墨色柱就是所显示的数字；缺值写 `—` 加状态词；disclosure 原位列出方法与数值；≤767px 收成仅数字；只在请求终值到达时变化，reduced motion 下瞬切。它**与** PV-79 的 `Observed stream rate` 行并列，不替代它（页面第 1 节右卡）。

## 7. 作者验证（非独立验收）

捕获脚本 [specimen/capture.mjs](specimen/capture.mjs) 可复跑：先起静态服务 8884，再执行 `node .../specimen/capture.mjs`。它通过 CDP 驱动 headless Chrome，结束时清理临时 profile。输出共 40 张 PNG 与 `captures/measurements.json`（含每张图的 sha256 前 16 位）。

- **三态 + unavailable + 两个终态 × 明暗 × 1440/390**：`states__{1440,390}-{light,dark}.png`，以及整页 `page__*.png`。暗色走系统 `prefers-color-scheme` 路径；另有 `states__1440-dark-attr-over-light-system.png` 验证 `data-theme="dark"` 可覆盖浅色系统设置。今天与候选的并排对照：`today__*.png`；宽度：`widths__*.png`、`widths__1440-light-text-large.png`；形态：`forms__*.png`。
- **reduced motion**：在新柱到达后 40ms 截图。动效开时新柱 opacity 为 0.82，处于淡入中途（`motion__on.png`）；系统 reduce 与页面强制档都是 1，即瞬切（`motion__reduce-system.png` 与 `motion__reduce-toggle.png` 的像素哈希相同）。
- **键盘**：从页面顶部按 9 次 Tab 到达 completed 卡的 summary，Enter 展开；`:focus-visible` 为 true，焦点环为产品 `--focus` 2px/offset 2（`focus-disclosure__1440-{light,dark}.png`）。实时回放时，若 disclosure 已展开且持有焦点，采样到达后展开状态与焦点都会保留。
- **streaming → frozen 连续帧**（1× owner 时钟实时回放，`frame-1…6-*__{request,interval}.png`）：
  - a→b：请求 4 流式进行中，间隔 1.5s。请求卡的像素哈希与 DOM 签名**完全相同**（`a0d4f7a8…`），渲染计数停在 7；interval 卡则变化（渲染 40→43）。这说明请求卡只随它使用的采样变化。
  - c：请求 4 完成，新增一根墨色柱。d：请求 5 进行中，值为 `—`。
  - e→f：Run 结束后 3 秒，两张卡的像素哈希都**完全相同**（`ddaf1a6a…` / `f93eb297…`），已送达采样数停在 66，没有任何自走活动。
  - 截图前等待一次性淡入结束（`settled: true`）。像素比较前先把裁剪框取整到整像素：首次运行时，小数坐标的裁剪边缘抗锯齿曾让相同内容得到不同哈希，已记录并修正。
- 文档链接：`node tools/check-doc-links.mjs` 通过（结果见交付回报）。
- **未跑项**：200% 缩放与 forced-colors（本单不涉及材质，也未新增颜色 role，但 sparkline 在 forced-colors 下的可见性未测，列入待裁 D-6）；`lint-colors` 与 `contrast-report` 不适用，因为它们扫描的是 `app/web`，本单未改产品 CSS；本目录的 CSS 只引用复制来的 R 层 role。没有非作者复核。

## 8. 最近先例与受影响语法（frontend-contract 变更记录要点）

- 最近先例：`app/web/telemetry-view.mjs` `renderRequestMeasurements`（compact，connection card）；Fable performance specimen 的右缘来源词（PV-79）；`runtime-view.mjs:2487` `renderContextBar`（`role="img"` 分布条，不是 meter）；atlas `tool-card` 的原位 `<details>`。
- 保持不变：`.data-list` 两列结构、`--text-meta` / `--text-caption`、`--muted-strong` 文本 role、`--focus` 焦点环、两档 duration、reduced-motion 规则。
- 新增（候选）：40×12 的 SVG locus（`--muted` 柱、`--ink` 最新柱、悬浮短横表示无值），以及两条一次性 opacity keyframe。没有新的颜色、字号、圆角或时长。

## 9. 将来接线的前置条件清单

1. **owner 测量合同**（阻断项）：由 Astra 指定归属，形成新工单（不是 BE-38）。合同需给出第 3 节第 1 层字段的单位、时钟一侧、计数口径（provider 上报还是本地 tokenizer，禁止字符估算）、failed/cancelled/interrupted 下的 null 语义，以及 `missing` 数组中 `provider_token_timing` / `token_deltas` 如何移除。至少一个真实可达的 provider 身份要能产出这些字段（PV-75 指出现有身份全部不可达）。
2. **文档**：`app/docs/request-telemetry.md` 第 9 行改写为新口径；PV-82 脚注保持，`Observed stream rate` 仍然存在。
3. **消费位置**：`telemetry-view.mjs` 只改这一处渲染器，connection card、Inspector、Attention runtime 三处消费者同时受益。compact 视图的 `Decode TPS` 行填值；Inspector 的逐请求行只放数字（每行本身就是一个请求），sparkline 只出现在 Run 范围的 locus 里。`validMeasurement` 对新字段 fail-closed。
4. **验收**：renderer 单测覆盖 null / 0 / 部分上报 / 失败 / 取消；浏览器覆盖 1440/1280/390 × 明暗 × Large 字号 × reduced motion × 键盘；证明两次采样之间 DOM 不变；由非作者复核。
5. **重新过 WK-141**：届时由 owner 给出带单位与来源的测量，满足 micro-visualization 的准入前提之后，才可以把本候选提升为产品形态。

## 10. 待裁定

- **D-1 合同归属与层级**：token 时钟由谁拥有（host 流边界？provider adapter？）；只要第 1 层（per-request 终值），还是同时要第 2 层（序列）。本单建议先只要第 1 层。
- **D-2 两行共存**：`Decode TPS` 有值之后，compact 视图里 `Observed stream rate`（PV-80）是否继续并列。本单的展示是并列，因为两者是不同事实，但 compact 视图的行数由 PV 线裁定。
- **D-3 idle 统计**：`Decode TPS · median`（Run 范围）是本单新引入的统计标签。另一个选项是 idle 时不显示任何速率数字，只保留柱与累计量。
- **D-4 Large 字号 × 三位数溢出 2px**：可选做法有两种，一是 `data-text-size="large"` 时同样收成仅数字，二是把 locus 内的 gap 从 6 收到 4。本单未实施，交给 Appearance 或文字尺寸的 owner。
- **D-5 L0 composer 位置**：runtime-telemetry 提到 L0 保留当前状态，本单只把 locus 放在 connection card（measurements 已在那里），没有做 composer footer 槽位。
- **D-6 forced-colors**：SVG 柱在 forced-colors 下的可见性未测，可能需要 `forced-color-adjust` 或改用 `CanvasText`。
- **D-7 数字精度**：本单取整数 `tok/s`，以减少跳变；另一个选项是保留一位小数（Pi Pulse 先例）。disclosure 内已保留一位小数。
