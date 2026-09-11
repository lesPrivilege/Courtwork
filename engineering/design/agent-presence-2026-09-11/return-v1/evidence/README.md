# return-v1 · 证据

所有图片都是作者候选图，由 `tools/capture.mjs` 从固定 fixture（seed 7；场景 `t=1400 ms`，时钟暂停）在 Chromium（Playwright 自带 headless shell）中生成，均不作 golden。机器可读结果见 [results.json](results.json)。

## 图片

| 文件 | 内容 |
|---|---|
| `compare-board-light.png` / `-dark.png` | A/B/C 同眼部比例的 flat 静止比较（16–64），以及推荐路线的 rest/thinking 形状、`:` 变体、32/64 soft、64 hard 对照 |
| `keyframes-thinking.png` | 推荐路线 thinking 一个周期内的 9 帧（flat 与 soft，64 px） |
| `chat-line-{1440,1280,390}-{light,dark}.png` | 完整 Chat，状态行落位，thinking |
| `chat-corner-1440-{light,dark}.png`、`chat-corner-390-light.png` | 完整 Chat，composer 角落落位，thinking |
| `states-line-light-1440.png`、`states-line-light-390.png`、`states-corner-dark-1440.png` | 15 个 fixture 状态的 composer 截图（同一张合成图） |
| `detail-open-line-1440-light.png` | 键盘打开的详情（并发工具） |
| `zoom200-{line,corner}-long-label.png`、`w390-line-long-label.png` | 200% zoom（720×450 CSS px @2x）与 390 下的长工具名 |
| `reduced-motion-line-1440-light.png` | reduced-motion 下的 thinking |
| `forced-colors-corner-soft32.png` | forced-colors 下的 soft 32 请求（深度层隐藏） |

## 定向检查结果

| 检查 | 结果 | 方法 |
|---|---|---|
| 纯函数与 fixture（`node --test tests/presence.test.mjs`） | 17/17 | 优先级、不推导 thinking、unknown ≠ Ready、并发 scope、取消请求 ≠ 停止、完成 ≠ 接受、确定性、reduced-motion、settle ≤220 ms、词表禁用进度语、旧词计时器不覆盖新事实、切换从当前形状接续、序列重放、资产与几何源一致 |
| 序列检查（工具面） | 19/19 探针 | 4 条固定序列，每步 +50 ms 以及跨越上一状态词边界的时刻；比对 pose、文本、DOM |
| 键盘详情 · 状态行 / 角落 | 通过 / 通过 | Tab 到触发器 → Enter 打开 → Escape 关闭且焦点回到触发器 → Space 重开 → 点外部关闭 |
| 200% zoom、390 × 状态行/角落 × 长工具名/idle | 8/8 | 主操作（运行中为 Stop，否则为 Send）在视口内、未被遮挡；模型控件可见；触发器不与二者重叠 |
| reduced-motion | 通过 | 5 个时刻嘴型路径完全相同，文本固定为 “Thinking”，`animating=false` |
| forced-colors | 通过 | `.pr-depth/.pr-sheen` display:none |
| 深度不支持回退 | 通过 | `depth=off` 隐藏深度层；soft 请求在 20 px 解析为 flat |
| 非 thinking 无帧循环 | 通过 | 工具事实保持 2.2 s，rAF 调用 0 次 |
| 隐藏页面停时钟 | 通过 | visibilitychange hidden 后时钟冻结，恢复后继续 |
| 读屏 live region | 通过 | 一条序列播报 4 次事实变化，轮播词 0 次 |

## 作者过程中发现并修正的问题

1. 空闲和终态下仍显示 `Stop working`：基础 `button{display:inline-flex}` 覆盖了 `[hidden]`。已补上 App 自身的 `[hidden]{display:none!important}`。
2. 终态下仍显示 “Your input will not be sent automatically.”，Send 与 Stop 同时出现：已按 `renderComposer` 改为运行中用 Stop 替换 Send，非活动时隐藏提示句。
3. 工具面与 iframe 就绪存在竞争（iframe 先于模块加载完成）：改为轮询。
4. 场景 `onFrame` 在构造期间引用了尚未赋值的 `view`（TDZ）。
5. soft 的 sheen 在 64 px 读成内描边：两次降低宽度和透明度。
6. 比较板截图被视口裁掉：改为 fullPage 裁切。
7. 表单外的落位/宽度单选（`form=` 关联）没有触发更新：已补监听。
8. 无循环检查原先把首个 180 ms 过渡也算进去：改为过渡结束后计数，期望 0。

## 未测项（逐项）

- 真实设备上的 60/120 Hz 动效质量与长时间 thinking 的疲劳：截图不能证明，留给 Astra 实际观察。
- Safari、Firefox、iOS/Android 真机与触控：只测了 Chromium。
- 真实读屏（VoiceOver/NVDA）：只检查了 live region 的 DOM 变化，没有听读。
- App 的 gray-steel / dystopia skin 与 Text size small/large：specimen 只复制了 lead-gray 与默认字号。
- 1280 宽下的角落落位、1280/390 深色角落：未截图（1440/390 已显示同样的问题）。
- 与真实 `.activity-group.is-working` 渐变同屏的叠加效果：场景中的工具行都是已完成状态。
- `node tools/contrast-report.mjs` 与 `node tools/lint-interaction.mjs`：两者都固定读取 `app/web`，本片没有修改 App，所以未运行。已对本片文件运行 `node tools/lint-colors.mjs <files>`（14 个文件通过，其中复制的 scale 标为 tier:S）和 `node tools/lint-materials.mjs <files>`（4 个文件通过）。工具面的时间刮条用了 `input[type=range]`，它只是仪表，不在产品场景里。新的 presence role 若进入产品，需要在 App 内补跑全部四项。
- 工具面（index.html）本身在 390 下的可用性：它是作者仪表，不是产品面。
