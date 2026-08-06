# GENERIC-PACK-1 加载态零视觉回归证据（2026-08-06）

裁定二「加载态四钮零视觉回归」的机器证据：同一 PW 构造路径、变更前后各摄一帧，逐字节比对。

| 帧 | 基线（变更前） | 变更后 | 比对 |
|---|---|---|---|
| demo 四钮场景条 | baseline-demo-strip.png | after/after-demo-strip.png | **PIXEL-IDENTICAL**（cmp 逐字节相等） |
| grant 预检表单 | baseline-s3-launcher.png | after/after-s3-launcher.png | **PIXEL-IDENTICAL**（通用表单渲染与退役 S3LauncherPanel 逐字节同帧） |
| demo 整面 | baseline-demo-work.png | after/after-demo-work.png | 有差异——demo 回放是动态态（时间线/进度随回放推进），非按钮面差异；四钮与表单的钉死帧已逐字节相等 |

构造：`apps/desktop/tests/e2e` 临时 spec（本会话自建，拍完即删），PW 管理独立 dev server。
