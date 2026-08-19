# WORK-AGENT-SHOWCASE-1 · Luna 独立验收证据（2026-08-19）

本目录只含验收会话从 clean clone 自行启动、自己截图的证据；没有复用 implementation 帧。
目标 clone：`/private/tmp/work-agent-showcase-accept`；target tip：
`78550b59ee648c061bbae8c8ca6c35c85f5abb57`；独立截图端口：`1421`；完整 E2E 端口：`1422`。
Playwright 配置使用 `reuseExistingServer:false`。所有图片为 1440×900 RGB；`squint/` 为对应
normal 帧的 10% 缩图，`-text-mask` 为文字掩码帧。

## 基础独立矩阵

根目录下的 60 帧由仓内 `apps/desktop/scripts/capture-pi-lane-states.mjs` 在验收会话自起的
1421 server 上重摄，覆盖 light/dark 的 15 个状态；另有 30 枚独立 squint 帧。关键 light
状态包括未绑定、已绑定、unavailable、proposal、succeeded、viewer、resume-prior、长中文
matter 与 CJK/Latin 混排；dark 组为同一 scripted matrix 的 smoke。

## 补齐的状态与压力态

`custom/` 是补验收脚本实际驱动的额外帧（每态 normal/text-mask/squint）：

| 状态 | 证据 | 观察 |
|---|---|---|
| `16-running-real` | `custom/16-running-real*` | 2500 个独立 event-loop delta 后、proposal 前真实显示「工作中」；与 proposal 帧 hash 不同 |
| `17-stopped` | `custom/17-stopped*` | 先到 pending proposal，再点击真实 Stop，悬置写入收束为拒绝、索引为空 |
| `18-resumed` | `custom/18-resumed*` | 成功工作稿后 restart，上一段只读入口可见 |
| `19-multi-cards-proposal` | `custom/19-multi-cards-proposal*` | read/glob/grep/write 多工具卡同场，proposal 决定区可达 |
| `20-multi-drafts` | `custom/20-multi-drafts*` | 两次逐次允许后，两枚工作稿同时出现在结果席与索引 |
| `21-viewer-hash-differs` | `custom/21-viewer-hash-differs*` | viewer 明示当前内容不同于已确认版本，未晋升成功 |

代表帧 SHA-256：`16-running-real.png` `481230a79040d52e6929892a26db4b14519489c13ae80ce2470e9c356f581ba1`；
`19-multi-cards-proposal.png` `4c5508cc5480adb743d9c84db69a6e5b8ec4a9618ae72816c16738953738a61f`；
`20-multi-drafts.png` `2379f45aa49a7634977af37e20456cfc3e1311a04b385ae8c5b8ff38115a8d17`；
`21-viewer-hash-differs.png` `3f9a788575f4f416dacd5a94ab9dc49c68f5c3fdd04b580f1da68651a0f3d30a`。

## 证据边界

上述 scripted 帧证明 renderer 对账本形状的投影与可达性，不证明真实 DeepSeek、Tauri/WKWebView
或 AX；后者仍由 `PI-BASE-GUI-ACCEPT` 的 external-validated gate 处理。

实现 receipt 的原 manifest 将 `04-running` 放在 `pi-tool-card.first().waitFor()` 后仅等待
220ms；0ms scripted 步进已经把 proposal 推到同一帧。独立复核了实现帧：light 1180 的
`04-running` 与 `05-proposal` 的 squint/text-mask SHA 相同，且该脚本只有 read+write 一枚
工作稿。该票外证据缺口已由本目录的 `16-running-real` 与 `19/20` 补证，原 manifest 不作
独立验收证据引用。
