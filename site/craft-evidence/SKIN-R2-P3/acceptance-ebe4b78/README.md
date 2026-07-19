# SKIN-R2 P3 · 独立验收真机证据

目标：`ebe4b78505da4c9d2b1cfb94360f3ad029e23702`。本目录由独立验收 clone
`/tmp/courtwork-p3-acceptance.nRHbBv/repo` 新摄；不是实现会话截图的转存。

验收会话以仓内 `tauri-evidence.conf.json` 启动真实 `courtwork-desktop` Tauri 二进制，
macOS Accessibility 树独立读得 `supportsAllowEnd=true`、正例悬出 23 CSS px、负例下移
39 CSS px；同屏帧见 `tauri-wkwebview-independent-1280x720.png`，结构化记录见
`tauri-independent-measurements.json`。独立重摄在相同机器、窗口几何与 fixture 字节下得到与
实现帧相同的 SHA-256，说明画面确定性，不说明实现会话代替了本轮复跑。

本轮仍拒绝 P3：把正负声明改成同一 `allow-end` 后，仓内 `pnpm site:guard` 依旧 67/67
全绿。独立验收探针能诊断「control collapsed」与 fixture hash drift，但该探针不在产品门内，
不能冒称仓门已成立。复验前必须让仓门分别锁住正负异值、fixture 四件任一字节／hash 漂移、
截图 hash 漂移与测量记录 hash 漂移。
