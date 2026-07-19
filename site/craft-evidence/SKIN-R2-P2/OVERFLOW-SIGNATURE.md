# SKIN-R2 P2-L19/L20/L21 · 溢出纠偏签署投影

状态：产品指令已于 2026-07-20 给出；本文件把 chat-only 指令投影进仓，供实现与独立验收引用。

## 原始实物

- 标红产品帧：`image-1.png`，SHA-256 `5c6ea7d7f6d6424bee31b128f6bead237a35b03b0197764b64f2dc735afbd56b`。
- Codex 对照帧：`image-2.png`，SHA-256 `e925f5d0e1813ef4389da76e9b73d08a62609084bdbe36813c34f540bd88a955`。
- 产品原文：「此图标红的两处有溢出，考虑到左上角本来就有红绿灯 Button，实现方式参考 codex」。
- 焦点态补充产品帧：`13-milestone-redline-1440 copy.tiff`，SHA-256
  `1b223334e4a96af42670ef3db79e5ed53e08acb202b73094e45d9662398d4af2`。
- 补充产品原文：「左上仍有溢出」。该指令与实物共同签署 P2-L21，不外推到其他状态或选择器。

## 逐行签署

| 行 | 档位 | 唯一对象 | 裁定 | 禁止范围 |
|---|---|---|---|---|
| P2-L19 | Agent 中间档 | `apps/desktop/src/styles.css#.window-chrome.is-detached\|title-safe-inline` | detached chrome 先容纳 AppKit 交通灯安全区与现有 sidebar/search 按钮；案件标题从该动作组之后起排，最少留 8px 间距，窄面允许标题自身省略 | 不仿造交通灯、不改 Tauri 窗口按钮语义、不新增 titlebar 容器或动效 |
| P2-L20 | Agent 中间档 | `apps/desktop/src/styles.css#.composer-disclaimer\|container-wrap` | disclaimer 以 composer 实际 inline-size 决定换行；任意视口下均不得越过 composer、对话列或右工作面 | 不裁字、不缩小字体、不隐藏反馈入口、不以 viewport 宽度冒充容器宽度 |
| P2-L21 | Agent 中间档 | `apps/desktop/src/styles.css#.workspace.focus-mode .preview-host-head\|title-safe-inline` | 焦点态 Preview 占据窗口首行时，返回钮、标题与计数整体从 detached chrome 的 AppKit＋应用按钮安全区之后起排，最少留 8px；标题仍可省略，计数保持原语义 | 不隐藏或挪走 window chrome、不改 focus/back 行为、不写死屏幕坐标、不改非焦点态 Preview |

三行只修既有皮层几何；DOM、数据、路由、焦点、窗口行为与 composer 写入路径不变。Pages 真截图替换另属激进档，只能消费独立放行后的真实壳帧。
