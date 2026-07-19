# SKIN-R2 P5 · 独立 Safari 复摄

- 验收对象：`main@9a1281beb27f5daec2c780ff99614f8542062afb`。
- 验收环境：macOS `26.5.2 (25F84)`，Safari `26.5.2`；独立 clone 的 `site-dist`
  由 `127.0.0.1:18973` 提供。
- 内置 browser runtime 按故障规程检查后返回空列表；本目录两帧来自原生 Safari 自身窗口层，
  不是 Playwright 截图，也不冒充 browser/computer-use。

| 帧 | Safari 外窗 | 物理像素 | SHA-256 | 复核 |
|---|---|---|---|---|
| `acceptance-safari-1600.png` | `1600×859`（显示器约束） | `3424×1942` | `3051c6dc53a7821295fb61d1aeb7eea44a64cf337705b9766a4b0739f9db59e5` | hero/header 写本字真上身；完整右界可见，无横向溢出或新增换行 |
| `acceptance-safari-375.png` | `375×800` 内容窗 | `886×1736` | `10c9b23ee1d836e90732a8f67c1bea2b1b9ff85a65910db563d9223788b77d9f` | 窄屏顺序、CTA、版本 SHA 与工作面首段完整，无横向溢出 |

独立 reduced-motion Safari 帧未取得：验收进程没有修改
`com.apple.universalaccess.reduceMotion` 的权限（`defaults` 与直接 plist 写入均被系统拒绝），且
System Events 未获辅助功能控制权。验收没有绕过 TCC，也没有把实现会话的 reduced 帧复制到本目录。
计算态 reduced-motion 仍由仓内 Playwright 门在本 clone 实跑；其证据与 Safari 实机证据在验收报告中
分开陈述。
