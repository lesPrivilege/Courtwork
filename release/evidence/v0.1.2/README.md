# v0.1.2 真机截图清单

这组证据来自 `v0.1.2` 远端发布完成后的 macOS 真机复核。窗口由 System Events 操作，macOS `screencapture` 按窗口区域直接采集；PNG 按采集原字节入库，入库后未再次裁切、缩放、压缩、标注、色彩调整或修图。

## 原始文件

| 文件 | 尺寸 | 大小 | SHA-256 | 证明范围 |
|---|---:|---:|---|---|
| [`pages-hero-safari.png`](pages-hero-safari.png) | `2700×1718` | `622,744` bytes | `52d854a91fe1fb099216276954c4c21e1c686e977ba4b5c93432361b08fed4f6` | Safari `100%` 页面缩放下的公开 Hero；可见 `v0.1.2`、下载入口、SHA 与未公证边界。 |
| [`pages-scenarios-safari.png`](pages-scenarios-safari.png) | `2700×1718` | `599,324` bytes | `5782000a27b82ab89fd379661226a4ca8114b59af7ce0320783a67e10d6aa1cc` | Safari 原生页面缩小四档后，同屏 Legal 合同链、卷宗 `20 / 47 / 14 / 8` 与 PM catalog-only 声明；PNG 未后处理或重采样。 |
| [`app-mounted-direct.png`](app-mounted-direct.png) | `2700×1792` | `558,614` bytes | `5fda3c17fe6dfdd3d0fc79b8d1b2422d9ec6e9b17f732eaf048e386a0a20b010` | 直接运行本版 DMG 挂载副本，不经 LaunchServices 复用其他同 bundle id 应用。 |

## 采集方法

- Pages：macOS `26.5.2` 的 Safari `26.5.2` 打开 <https://lesprivilege.github.io/Courtwork/>；System Events 完成真机原生窗口、滚动与页面缩放操作，macOS `screencapture` 直接按窗口区域采集。Hero 保持 `100%`；多场景位置使用 Safari 原生页面缩小四档，只改变浏览器页面缩放，没有对 PNG 再缩放或重采样。
- App：只读挂载 `Courtwork_0.1.2_aarch64.dmg`，使用隔离 HOME/TMPDIR 直接执行挂载点内 `Courtwork.app/Contents/MacOS/courtwork-desktop`。PID `31776` 的 command 命中该绝对 Mach-O 路径；System Events 操作原生窗口并由 `screencapture` 直接采集窗口区域。截图后发送 TERM，`wait` 返回 `143`，随后 detach 挂载点。
- 入库后重新读取像素尺寸、文件大小与 SHA-256；三项均与采集目录原文件一致。

## 废帧排除

本目录采用正向清单，只承认上表三帧。滚动中间态、没有同时命中要求字段的页面位置、空白或过渡帧，以及无法用进程绝对路径排除同 bundle id 串包的 App 帧，均不入库、不登记 SHA，也不得作为发布证据。尤其不以 `open` / LaunchServices 启动结果替代 `app-mounted-direct.png`。
