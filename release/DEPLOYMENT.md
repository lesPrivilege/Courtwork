# DEPLOYMENT: v0.1.2

部署日期：2026-07-15（Asia/Singapore）

## 结论

`v0.1.2` 已完成 annotated tag、GitHub Release、资产回下载校验、Pages workflow 与公开页面真机复核。Release 和 Pages 均已公开；本记录是远端事实成立后的后置留痕，不属于 `v0.1.2` tag 本身。

## 公开入口

- Pages：<https://lesprivilege.github.io/Courtwork/>
- Release：<https://github.com/lesPrivilege/Courtwork/releases/tag/v0.1.2>
- DMG：<https://github.com/lesPrivilege/Courtwork/releases/download/v0.1.2/Courtwork_0.1.2_aarch64.dmg>
- SHA 文件：<https://github.com/lesPrivilege/Courtwork/releases/download/v0.1.2/Courtwork_0.1.2_aarch64.dmg.sha256>
- Pages workflow：<https://github.com/lesPrivilege/Courtwork/actions/runs/29383926592>
- Pages job：<https://github.com/lesPrivilege/Courtwork/actions/runs/29383926592/job/87253159770>

## Git 与 Release 真值

- annotated tag：`v0.1.2`；tag object `0c998d45bcc892ac56c8800902659b5ecc78f084`。
- tag 解引用：`2fe8bf54dad12f58bccf06a9d692f7c14f65cbd3`；该提交也是本次 Pages workflow 的发布基线。
- GitHub Release：非 draft、非 prerelease；发布时间 `2026-07-14T15:17:12Z`。
- 独立验收：[`release/ACCEPTANCE.md`](ACCEPTANCE.md) 已放行产品、发布真值与同一枚 DMG；发布后没有重建或替换制品。

## 远端制品复核

GitHub Release 公开资产：

| 资产 | 大小 | GitHub digest |
|---|---:|---|
| `Courtwork_0.1.2_aarch64.dmg` | `4,679,277` bytes | `sha256:f4af2a44248c7d7af970c8486ccaf7c8d72107565c4d824ce9cb8d69578de83d` |
| `Courtwork_0.1.2_aarch64.dmg.sha256` | `94` bytes | `sha256:4d7231e67f97ba5693bf501ac842d6187fa80b14fba40517255d1b923e3a9ee2` |

发布后使用 `gh release download v0.1.2` 把两项资产下载到独立临时目录，并执行 `shasum -a 256 --check Courtwork_0.1.2_aarch64.dmg.sha256`；检查通过。重新下载的 DMG 大小与 SHA-256 仍为 `4,679,277` bytes 与 `f4af2a44248c7d7af970c8486ccaf7c8d72107565c4d824ce9cb8d69578de83d`，和仓库校验文件、Release notes、站点及独立验收一致。

## Pages 复核

- workflow run `29383926592` / job `87253159770`：`success`；head `2fe8bf5`；运行时间 `2026-07-15T02:22:23Z` 至 `2026-07-15T02:22:45Z`。
- 公开首页、`assets/icon.svg`、`styles.css`、`main.js`、`assets/og.png`、Hero WebP 与 DMG 均返回 HTTP 200。
- 首页可见版本为 `v0.1.2`；两个真实下载 `href` 均指向同一公开 DMG；可见 SHA 为本记录所列 64 位值。
- Legal 合同链、卷宗 `20 / 47 / 14 / 8` 与 PM `Schema catalog preview / 尚未接通运行链` 边界同时命中；没有把 PM catalog 冒充 live 场景。

## 真机证据

复核环境为 macOS `26.5.2` 与 Safari `26.5.2`。System Events 操作真机原生 UI，macOS `screencapture` 按窗口区域直接采集；入库后未再次裁切、缩放、压缩、标注或修图。Hero 使用 Safari `100%` 页面缩放；多场景帧使用 Safari 原生页面缩小四档，以在同一窗口容纳 Legal 合同、卷宗与 PM catalog，PNG 未做后处理或重采样。逐文件尺寸、SHA 与采集边界见 [`release/evidence/v0.1.2/README.md`](evidence/v0.1.2/README.md)：

- [`pages-hero-safari.png`](evidence/v0.1.2/pages-hero-safari.png)：公开 Pages Hero、真实版本、SHA 与下载入口。
- [`pages-scenarios-safari.png`](evidence/v0.1.2/pages-scenarios-safari.png)：同屏 Legal 合同、卷宗四项计数与 PM catalog-only 边界。
- [`app-mounted-direct.png`](evidence/v0.1.2/app-mounted-direct.png)：从本版 DMG 挂载点直接执行 Mach-O；隔离 HOME，PID `31776` 命中挂载绝对路径；取证后 TERM、`wait=143` 并卸载。

## 发行边界

本次公开制品是 Apple Silicon、ad-hoc 签名、未 Apple 公证的开发构建。独立验收中的 `codesign`、`hdiutil` 与挂载启动通过不等于 Gatekeeper 公证；正式分发仍需外部提供 Developer ID 与 notarization 凭据后重新出包。官网、Release notes 与校验记录均保留该边界。
