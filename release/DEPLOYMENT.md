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

---

## SITE-CRAFT-1 · Pages 站面更新复核（2026-07-16）— ❌ 不放行

本节复核 `main@8ec979c503efb8fbed16469c01fca07aa9be43db` 的站面更新。它不是版本发布：没有新 tag、GitHub Release 或 Release 资产，`v0.1.2` 的 DMG、校验文件和发布边界均应保持不变。本记录只写远端事实，不更新 `docs/status/current.md`。

### Pages workflow

- 宿主机 push `31123fc..8ec979c` 后，`pages.yml` 的 run [`29482763400`](https://github.com/lesPrivilege/Courtwork/actions/runs/29482763400) / job [`87570062144`](https://github.com/lesPrivilege/Courtwork/actions/runs/29482763400/job/87570062144) 对精确 head `8ec979c503efb8fbed16469c01fca07aa9be43db` 运行成功；时间为 `2026-07-16T08:14:34Z` 至 `2026-07-16T08:15:01Z`。
- workflow 的完整 `pnpm site:guard` 通过，日志为 `deslop: PASS (733 active text files; archive excluded from scan roots)`；静态构建、Pages artifact 上传与部署步骤均为 `success`。
- artifact 清单实际包含 `assets/ghosty-mask.svg`；公开首页、`styles.css`、`main.js` 与 `assets/ghosty-mask.svg` 均返回 HTTP 200。

### 公开站正常态与页面健康

仓库锁定的 Playwright/Chromium `149.0.7827.55` 直接访问 <https://lesprivilege.github.io/Courtwork/>，使用 `1280×860` 桌面视口及 `375×900` 窄屏复核：

- **Typer**：从 `.tc` 首次进入 DOM 起采样 54 帧；30 帧含 opacity 0 字符、32 帧含 0 到 1 的中间值。约 `598ms` 的样本同时出现已反色字符、过渡字符与尚未显影字符；收尾为透明背景、藏青正文。`h1` 可见全文与 `aria-label` 都是“模型只生成，不裁决。”。
- **Satin CTA**：主按钮底色为 `rgb(10,37,64)`、文字为 `rgb(246,249,252)`；`::before` 为上部 52% 的 `color(srgb 0.964706 0.976471 0.988235 / 0.12)` 静态高光，`z-index:-1`，按钮本体 `isolation:isolate`，文字保持在材质层之上。
- **正常态 Ghosty**：首图滚入前为 `mask-position:0px 100%`、无活动动画；逐帧记录到 6 帧隐藏预态、53 帧中扫，约 `230ms` 时为 `14.1005%` 且有 1 条运行中 transition，最后收敛至 `0px 0px`、动画数 0。隐藏→中扫→全显三态在线成立。
- 桌面与 375px 均为 `scrollWidth === clientWidth`，无横向溢出；5 张页面图片全部 `complete` 且 `naturalWidth > 0`，窄屏破图清单为空，console/page error 与 request failure 均为空。JS 关闭时 h1、`aria-label` 与三张案例图仍完整，案例图均 `opacity:1`、`mask:none`。

### reduced-motion 阻塞项

`prefers-reduced-motion:reduce` 确实让三张案例图从首个可观察帧起都为 `opacity:1`、`mask-image:none`，视觉内容直接全显；Typer 动画数为 0。但逐帧 Web Animations API 结果与已合流验收声称不一致：

- 从 `t=2.3ms` 至 `t=903.3ms` 共采样 55 帧，其中前 54 帧的首张图 `getAnimations()` 为 2，整页为 6；只有最后一帧归零。最后一个非零样本是 `t=886.5ms`。
- 更早的细分样本从 `t=1.2ms` 起确认两项均为运行中的 `CSSTransition`，属性分别是 `-webkit-mask-position-x` 与 `-webkit-mask-position-y`；它们来自正常态基规则保留的 900ms `mask-position` transition。reduce 分支虽然取消遮罩，但加载时 `.is-visible` 仍把 mask position 从 `100%` 翻到 `0`，因此不可见的 transition 仍实际运行。
- 这与 [`site/ACCEPTANCE.md`](../site/ACCEPTANCE.md) SITE-CRAFT-1 复验记录的“逐帧元素动画数恒为 0 / `document.getAnimations()` 为 0”，以及 craft evidence 的相同声称直接冲突，也不满足本单部署复核沿用的“直接全显（0ms、零运动）”口径。

### v0.1.2 下载真值回归

- 公开 HTML 的两个真实下载 `href` 仍共同指向 `v0.1.2/Courtwork_0.1.2_aarch64.dmg`，页面可见 SHA 仍为 `f4af2a44248c7d7af970c8486ccaf7c8d72107565c4d824ce9cb8d69578de83d`。
- DMG 最终 HTTP 状态为 200；重新下载大小为 `4,679,277` bytes，SHA-256 为 `f4af2a44248c7d7af970c8486ccaf7c8d72107565c4d824ce9cb8d69578de83d`，与 `release/Courtwork_0.1.2_aarch64.dmg.sha256` 一致。站面更新没有动摇既有 Release 真值。

### 结论

> **本次 SITE-CRAFT-1 Pages 站面更新部署复核不放行。** GitHub Pages 已成功部署，正常态三效果、公开资源、响应式页面健康与 `v0.1.2` 下载真值均通过；唯一阻塞是 reduced-motion 的活动 `mask-position` transition 与已验收的“全程动画数 0”声称不一致。在该行为修正并重新部署、逐帧复核前，不应把本节登记为 SITE-CRAFT-1 已成功上线的发布事实。

---

## SITE-CRAFT-1-FADE · Pages 站面更新上线第二轮复核（2026-07-16）— ✅ 放行

本轮验收对象为最新 `main@d1f6563468dd604cef8b326ce17a1d9bd35a0123`，不是 `v0.1.2` 重发；使用独立 clean worktree 与独立浏览器上下文复核远端公开部署。

### Workflow 与远端来源

- Pages workflow run [`29488113178`](https://github.com/lesPrivilege/Courtwork/actions/runs/29488113178) / job [`87587379633`](https://github.com/lesPrivilege/Courtwork/actions/runs/29488113178/job/87587379633)：`success`，head 精确为 `d1f6563468dd604cef8b326ce17a1d9bd35a0123`；运行时间为 `2026-07-16T09:42:15Z` 至 `2026-07-16T09:42:38Z`。
- workflow 实录：`release-truth: PASS`（app/site `0.1.2`，DMG SHA 不变）、`deslop: PASS (740 active text files; archive excluded from scan roots)`；Pages artifact `github-pages.zip` ID `8371235936`，部署日志为 `Created deployment for d1f6563...` 与 `Reported success!`。
- 公开站 <https://lesprivilege.github.io/Courtwork/>、`styles.css` 与 `main.js` 均返回 HTTP 200；远端 `styles.css` SHA-256 `715d6c455448e06d0a24572bc25f2640f90b0b6323b74a11fc973127774b456a`、`main.js` SHA-256 `f0f036e78e463bc8710f1ce9bbdf32b2777277f0151fc5742b8a8e28bbba9620`，分别与 `d1f6563:site/` 对应文件一致。

### 远端逐帧复核

以 Playwright Chromium `149.0.7827.55`、`1280×860` 视口和 `requestAnimationFrame` 逐帧采样；reduce 主采样共 `107` 帧，其中实际运行 `ghosty-reduced-fade` 的 `89` 帧全部恰有 `3` 条 CSSAnimation，且每一帧 `CSSTransition=0`。其中 `24` 帧采到至少一个 `opacity ∈ (0,1)`；缓存预热后重载的代表中间帧为 `t=112.6ms`，三图 opacity 均为 `0.581038`，`mask-image:none`、`transform:none`、`transition-duration:0s`、`animation-duration:0.42s`，三图 `naturalWidth=640`。动画结束后三图均为 opacity `1`、`naturalWidth=640`。

- 正常态逐帧共 `129` 帧：隐藏 `7`、中扫 `109`、全显 `13`；中扫代表为 `mask-position: 0% 15.7369%`，保留正常态 `0.9s` mask transition、`transform:none`，且 `ghosty-reduced-fade` 出现次数为 `0`。三图最终均为 `mask-position:0px 0px`、opacity `1`、`naturalWidth=640`。
- JS 关闭抽查：`html.class` 为空；`h1` 文本与 `aria-label` 均为「模型只生成，不裁决。」；三图均 `opacity:1`、`mask:none`、`animation:none`、`naturalWidth=640`。
- 卷宗数字在逐帧采样期间恒为 `20 / 47 / 14 / 8`，四项 `getAnimations()` 恒为 `0`。

### v0.1.2 下载真值回归

- 线上两个真实 DMG `href` 均仍指向 [`Courtwork_0.1.2_aarch64.dmg`](https://github.com/lesPrivilege/Courtwork/releases/download/v0.1.2/Courtwork_0.1.2_aarch64.dmg)，页面可见 SHA 仍为 `f4af2a44248c7d7af970c8486ccaf7c8d72107565c4d824ce9cb8d69578de83d`。
- 重新下载 HTTP 200，大小 `4,679,277` bytes，SHA-256 为 `f4af2a44248c7d7af970c8486ccaf7c8d72107565c4d824ce9cb8d69578de83d`；对应 [`Courtwork_0.1.2_aarch64.dmg.sha256`](https://github.com/lesPrivilege/Courtwork/releases/download/v0.1.2/Courtwork_0.1.2_aarch64.dmg.sha256) 内容一致。

### 闭环与裁决

上轮不放行证据见本文件前一节「[`SITE-CRAFT-1 · Pages 站面更新复核（2026-07-16）— ❌ 不放行`](#site-craft-1--pages-站面更新复核2026-07-16--不放行)」：当时记录了 `6` 条幽灵 `CSSTransition`，并持续至 `t=886.5ms`。本轮以含 `47c693c` 独立验收的 `d1f6563` 部署重新逐帧确认该项归零，且其余正常态、JS 关闭、卷宗数字和 DMG 真值均通过。

> **SITE-CRAFT-1-FADE Pages 上线第二轮复核放行。** 本节只记录部署验收事实；未更新 `docs/status/current.md`，未推送。

---

## SITE-CRAFT-2 / SKIN 前置收尾 · Pages 两轮上线复核（2026-07-19）— ✅ 放行

本次只部署已批准的 `main@19242d273f12b53f4d41086ff2ba18405404ad21`，不是新版本发布；
`v0.1.2` 的 tag、Release、DMG 与签名/公证边界均未变化。

### Workflow 与远端同源

- Pages workflow run [`29688703720`](https://github.com/lesPrivilege/Courtwork/actions/runs/29688703720) /
  job [`88197486288`](https://github.com/lesPrivilege/Courtwork/actions/runs/29688703720/job/88197486288)
  对精确 head `19242d2` 运行成功；`release-truth: PASS`、
  `deslop: PASS (837 active text files; archive excluded from scan roots)`，部署日志为
  `Created deployment for 19242d2...` 与 `Reported success!`。
- 公开首页、CSS、JS、icon 与 OG 均 HTTP 200，并与该提交工作树逐字节相等；远端 CSS/JS
  SHA-256 分别为 `c8ef7d604e3bfe273a1ec157f3a6cb14849f0eaa658e7f01c9c545440d52290e`
  与 `f0f036e78e463bc8710f1ce9bbdf32b2777277f0151fc5742b8a8e28bbba9620`。

### 第一轮：宽窗全链

macOS `26.5.2` / Safari `26.5.2` 原生窗口实看，100% 首屏确认 Courtwork wordmark、
“模型只生成，不裁决。”、四节点微演示、`v0.1.2`、64 位 SHA 与两枚真实 CTA；缩小四档后
确认 Legal 合同、卷宗 `20 / 47 / 14 / 8`、PM `Schema catalog preview / 尚未接通运行链`、
四项产品边界及收尾 CTA。未见破图、遮挡、横向溢出或 live 边界冒进。

### 第二轮：窄窗回归

同一公开 URL 将 Safari 逻辑窗宽收至 `430`、恢复 100% 缩放并重新加载。导航、标题、两枚 CTA、
64 位 SHA 与 schema 微演示按单列重排，未见横向滚动、文字截断或控件碰撞。两轮原始 PNG、
像素尺寸和 SHA 见 [`release/evidence/pages-2026-07-19/README.md`](evidence/pages-2026-07-19/README.md)。

### 下载真值与裁决

公开 DMG HEAD 返回成功；重新下载 `Courtwork_0.1.2_aarch64.dmg` 为 `4,679,277` bytes，
SHA-256 仍为 `f4af2a44248c7d7af970c8486ccaf7c8d72107565c4d824ce9cb8d69578de83d`，
并通过随附 `.sha256` 文件校验。

> **本次 Pages 两轮上线复核放行。** 没有发现需要站面修复的首轮缺陷；因此未建立修复提交，
> 也没有夹带 SKIN-R2。现行新皮层真实界面源帧已在 `fc5d791` 落入
> `site/craft-evidence/SITE-SHOTS-SKIN-REFRESH-3/` 并由本次部署公开消费。

---

## VERSIONAL-LANG-1 · Pages 版本学皮层上线复核（2026-07-20）

本次仍不是 `v0.1.2` 重发；只发布已经独立验收放行的版本学皮层与三幅当前产品图。

### 第一轮 — ✅ 放行

- Pages run [`29702923819`](https://github.com/lesPrivilege/Courtwork/actions/runs/29702923819) /
  job [`88234949698`](https://github.com/lesPrivilege/Courtwork/actions/runs/29702923819/job/88234949698)
  对精确产品 head `2e2a570e3ef53bc5dd286433571c89f17ad5b119` 成功；guard、build 与 deploy 全绿。
- 公开 HTML/CSS/JS 及六枚新响应式 WebP 与该提交逐字节相等。1280 与 375 实看均无横向溢出、
  破图、遮挡或旧皮层回流；JS-off 与 reduced-motion 内容完整。
- proof 内竖线、promise routine 行线与眉批四周卡框均未复活；刊记、组末界和眉批上下界仍在。
  `v0.1.2`、64 位 SHA、ad-hoc／未公证边界和 DMG HTTP 200 保持。

完整机器结果、全页帧、SHA 与 `srcset` 取消说明见
[`release/evidence/versional-pages-2026-07-20/README.md`](evidence/versional-pages-2026-07-20/README.md)。
第二轮将在本记录提交触发的新部署上执行，结果不预写。
