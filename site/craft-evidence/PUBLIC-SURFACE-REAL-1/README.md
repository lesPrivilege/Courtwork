# PUBLIC-SURFACE-REAL-1 · Work scripted 公开帧

采集基线：`3a4a90e8a2cd43362ecfce09135bb637496f6b36`。由本票允许的
`apps/desktop/scripts/capture-pi-lane-states.mjs` 在独立 Vite 端口运行；浏览器上下文固定
`1440×900`、DPR 1。capture 从 fresh shell 直接创建真实案件容器，不打开样板，不走 provider
onboarding；它驱动的是 browser-pi-lane scripted harness，因此画面是账本投影，不是真模型、真
Tauri/AX 或发布制品证据。

三张源帧均来自当前 Work shell，且肉眼复核无 `Pinned`、样板、`Owner`、`Sample lead` 或假成员；
底部只显示 `Local workspace`。Pages 只消费由同源 PNG 以 `cwebp -q 85` 派生的 1440×900 与
720×450 WebP，逐字节绑定见 `screenshot-manifest.json`。

| 源帧 | Work 状态 | Pages 资产 |
|---|---|---|
| `frames/PUBLIC-SURFACE-REAL-1-bound-1440x900.png` | 已绑定真实本地容器、尚无工作稿 | `PUBLIC-SURFACE-REAL-1-bound-{1440,720}.webp` |
| `frames/PUBLIC-SURFACE-REAL-1-proposal-1440x900.png` | 写入提案等待人决定 | `PUBLIC-SURFACE-REAL-1-proposal-{1440,720}.webp` |
| `frames/PUBLIC-SURFACE-REAL-1-viewer-1440x900.png` | 结果只读 viewer | `PUBLIC-SURFACE-REAL-1-viewer-{1440,720}.webp` |

这三态证明的是 scripted GUI 的信息层级与结果核验形状；`PI-BASE-GUI-ACCEPT` 的真实 DeepSeek、
真实 Tauri WKWebView、AX/键盘/读屏与焦点总验仍是独立 external gate，不能由本批帧外推。
