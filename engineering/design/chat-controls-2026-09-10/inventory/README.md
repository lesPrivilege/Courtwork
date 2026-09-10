# EX-IC2 分片 A · Chat space 全量控件清点

2026-09-10 · Sonnet 探索者 · 只读盘点，不实现、不裁决、不给 winner。基线 `main`
`1992e90bd92266a9c99076a0709617bae4d4cf67`，隔离 worktree `se-agent-ic2`，分支
`claude/ic2-chat-controls`。范围、覆盖面定义与缺口登记规则见
[chat-controls README](../README.md) 与 [pr-plan.md 分片 A 的退出证据](../pr-plan.md)。

裁决与产品改造属于后续分片（B/C），本单不做取舍。

## 方法

1. **静态源码盘点**：`app/web/index.html`（静态 chrome/dialog/popover 容器）、
   `app/web/app.mjs`（主 Chat 渲染，6552 行）、`app/web/ui-controls.mjs`（共享
   action/icon/tooltip adapter）、`app/web/user-message.mjs`、
   `app/web/attention-agent-view.mjs` + `app/web/attention-conversation.mjs`
   （Attention 独立实现）、`app/web/materials-view.mjs`、
   `app/web/workspace-view.mjs`、`app/web/surface-modules.mjs`、
   `app/web/model-picker.mjs`、`app/web/thread-projection.mjs`。逐个定位每个
   实际消费者的源路径:行，不按截图猜测。
2. **动态证据**：`captures/capture.mjs` 用真实浏览器（headless Chrome，原生
   CDP，无 Puppeteer/Playwright 依赖，与仓内既有 `evidence/*/browser.mjs` 同一
   驱动方式）驱动端口 8881 上的真实界面，通过应用自己的 `/api/v5` 流量播种合成
   数据（无付费 provider、无个人凭据），然后真实点击/hover/聚焦/键盘 Tab 捕获
   每族的 rest/hover/focus 与关键动态状态。脚本可复跑，端口与输出目录参数化
   （`APP_URL`、`OUT_DIR`、`CDP_PORT`）。
3. **键盘可达性**：不凭 CSS 规则推断，脚本对三类假设分别做了真实 Tab/Enter/
   Escape 探测并记录布尔结果（见 `captures/capture-report.json` 的
   `keyboard` 数组）；调试过程中发现并修正了脚本自身的两处误报（见下）。

## 已核验的关键静态事实

- **两条 DOM builder**：
  - `element(tag, options, ...children)`，定义于 `app/web/app.mjs:233`，只在
    该文件内部使用（未导出）。承担主 Chat 消息流、composer、question/
    permission 卡片、run-status 卡片、work-surface fallback 面等几乎全部
    app.mjs 自渲染的 DOM。
  - `el(tag, {className,text,attrs}, ...children)`，定义并导出于
    `app/web/ui-controls.mjs:11`。是仓内**共享**的 DOM builder：
    `attention-agent-view.mjs`、`attention-view.mjs`、`home-view.mjs`、
    `inspector.mjs`、`materials-view.mjs`、`coordination-view.mjs`、
    `model-picker.mjs`、`runtime-view.mjs`、`settings-view.mjs`、
    `spark-view.mjs`、`surface-modules.mjs`、`telemetry-view.mjs`、
    `workspace-view.mjs`、`usage-view.mjs`、`user-message.mjs` 均
    `import { el, ... } from "./ui-controls.mjs"`；`app.mjs` 自己也从
    `ui-controls.mjs` 导入 `el`/`icon`/`action`/`copyAction`/`markdown` 等
    共享 action 层，但**未**用 `el` 替换自己的 `element`——两者在 app.mjs
    内并存，`element` 管消息流主干，`el` 间接通过 `action()`/`flowRow()`/
    `copyAction()` 等共享 helper 落地按钮解剖。
  - `markdown-source.mjs:24` 另有一个同名 `element(tag, children, attrs)`，
    但它构造的是纯数据对象 `{tag,children,...attrs}`（markdown AST 节点），
    不接触真实 DOM，不计入"两条 DOM builder"。
- **共享 action/tooltip/icon 层**：`ui-controls.mjs` 的 `icon()` 有 **24 个
  静态 glyph 白名单**（与 interaction-vocabulary.md 所述"24-name static
  allowlist"一致）；`action()`/`setAction()` 统一了图标+可见/`sr-only`标签+
  `aria-label`+`data-tooltip`+`icon-only` 几何锁；`installTooltips()` 是唯一
  的 tooltip 单例（hover 400ms 延迟、300ms 分组窗口、Escape 关闭、
  `focus-visible` 打开）。
- **Attention 助手是独立实现，非共享**：`attention-agent-view.mjs` 复用
  `renderUserMessage`（来自 `user-message.mjs`）与 `markdown`/`copyAction`/
  `action`/`el`，但它自己的 tool/question/permission 卡片是本文件内联手写
  的朴素 `<details>`/`<button>`，**不复用** `app.mjs` 的 `flowRow`/
  `toolGlyph`/`toolStateWord`/`setRequestLabel`/`permissionPresentation`。
  详见 ledger「AT-」前缀各行与 `gaps.md` 的对应观察。

## 覆盖统计

| 族 | 已登记控件/动作行数 | 备注 |
|---|---|---|
| 入口与 chrome | 见 ledger §1 | 主 Chat 侧栏 + Attention 独立 toolbar/recent 列表 |
| Composer | 见 ledger §2 | 含 materials 弹窗、connection popover、model picker、Attention 自己的 composer |
| 用户消息 | 见 ledger §3 | 主 Chat 与 Attention 共享 `renderUserMessage` |
| Assistant 消息 | 见 ledger §4 | 参考图候选动作（朗读/赞踩/更多/重试/继续/再生成/分享）逐项给出 disposition |
| 文件与成果卡 | 见 ledger §5 | materials 弹窗行 vs. Work surface Workspace 面板行是**两套并存**实现 |
| 工具、运行与反馈 | 见 ledger §6 | 含 Run inspector rail/pane、Run history、Extensions 生命周期 |
| 浮层与次级面 | 见 ledger §7 | tooltip、connection popover、context popover、materials/edit-message/project/session dialog、Attention dialog |
| Attention 独立实现 | 见 ledger §8 | 与 §2/§4/§6/§7 中同名族的对照行交叉引用，不重复整表 |

逐行计数与 disposition 分布见 `ledger.md` 末尾的自检小节（本 README 不重复
维护一份可能漂移的第二份计数）。

## 未解释漏项 = 0 的自检说明

- 静态盘点以 `grep -n "^function \|^async function "` 对 `app.mjs` 枚举全部
  200 个顶层函数，逐一分类为「Chat space 渲染/交互」「非 Chat 表面
  （Settings/Runtime/Spark 等，超出本分片范围，仅登记入口按钮）」「纯状态/
  数据整形（无 DOM）」三类；ledger 只收第一类的完整行 + 第二类的**入口**行
  （如 `runtime-setup-button`），不展开 Settings 页内部（Settings 是独立表
  面，属于 IC2 未来分片或既有 frontend-contract 范围，非本次「Chat space」
  定义内）。
- 每个 `icon()` 24 个白名单 glyph 都能在 ledger 中找到至少一处实际调用行；
  `external-link` 是唯一在白名单中但**当前无任何调用方**的 glyph（见
  gaps.md 观察项）。
- 参考图（file-delivery-reference.png）列出的候选动作族（默认打开、分段
  下拉、Copy、朗读、赞/踩、更多、重试/继续/再生成/分享、应用选择、
  Show in Folder、下载、复制路径、版本/历史）逐项在 ledger §4/§5/§6 中有
  disposition 行，即使产品当前完全没有对应 UI（disposition
  `缺后端/宿主合同` 或 `设计候选`），不留空。
- 动态捕获：`captures/capture-report.json` 记录了脚本每一步的成功/失败与
  三项键盘可达性探测的最终真实结果；捕获不到的状态在 `gaps.md` 「捕获缺口」
  小节逐条给出原因，不用静态截图冒充键盘/触屏验证。

**已知未解决的捕获局限（如实披露，不掩盖）**：六次独立完整重跑捕获脚本后，
反复观察到同一个未查明根因的时序缺陷——脚本运行到中段（大致第 10–30 步，
覆盖消息流/工具卡/问题卡/权限卡/materials 弹窗/Work surface 面板等大多数
"进入某个会话之后才能看到"的状态）时，真实点击会话行会静默不生效，画面
停在 Home；同一段代码在脚本最开始和第 30 步之后的会话切换又稳定成功。
已尝试的修法（轮询替代固定等待、整页重载强制重新拉取、延长首屏等待、换用
另一个已验证可达的会话做跳板）均未能在该区间内稳定复现成功，且一个独立
的短小诊断脚本单独运行时四步都能成功——这指向本机资源争用而非产品代码，
但未在预算内证实。受影响状态的验收依据因此退回到源码 `path:line` 静态
确认；ledger.md 开头的"证据可靠性更正"逐一列出了哪些 PNG 文件名不能作为
对应状态的真实像素证据，`gaps.md` §四/§六有完整方法论与逐项清单。
Attention 助手区的动态截图额外受累于另一处独立超时（`attention-open` 及
其后全部步骤在六次重跑中反复整体超时），同样未能在预算内解决。

## 状态

范围已登记、PR 施工稿已落。**本分片（A）已交付**：两条 DOM builder 已确认，
全量控件已逐项登记 handler/owner/capability/状态/a11y/glyph-hit-area/
disposition；动态证据部分用真实浏览器捕获成功（Home/侧栏/tooltip/
connection popover/edit dialog/streaming 等，见 `captures/`），部分因上述
未解决的捕获局限退回源码静态确认——两者在 ledger 与 gaps 中明确区分，不
混为一谈。分片 B（icon/control specimen）与分片 C（裁决后最小接线）不在
本单范围内。
