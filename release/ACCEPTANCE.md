# ACCEPTANCE: DEPLOYMENT-0.1.2

验收日期：2026-07-15

角色：DEPLOYMENT-0.1.2-RECORD 独立验收；未参与发布、截图采集或部署记录实现

唯一实现：`941067d44c568c9efd80545521dc6fecf3358e44`

发布 tag 基线：`2fe8bf54dad12f58bccf06a9d692f7c14f65cbd3`

独立 worktree：`/private/tmp/courtwork-deployment-0.1.2-acceptance`

## 结论

**✅ 放行。** `v0.1.2` 的 annotated tag、公开 Release、两项资产、Pages workflow、公开页面真值、三张真机截图与部署后记录相互一致。实现只做发布后文档收账和证据入库，没有改产品、站点页面、Release notes、SHA 文件或既有 `RELEASE-0.1.2` 验收结论。

本结论放行的是 **DEPLOYMENT-0.1.2 的后置实录**，不重写 `v0.1.2` tag，也不把开发构建升级为正式签名发行。公开 DMG 仍是 Apple Silicon、ad-hoc 签名、未 Apple 公证；`spctl` exit 3 是已声明边界。

## 实现范围与历史保全

- `git diff 2fe8bf5..941067d` 恰为 10 项：`apps/desktop/SPEC.md`、`docs/status/current.md`、`release/DEPLOYMENT.md`、`release/DEPLOYMENT_v0.1.1.md`、`release/README.md`、`release/evidence/v0.1.2/README.md`、三张 PNG 与 `site/SPEC.md`。
- 限定 diff 对产品源码、`site/index.html`、`site/styles.css`、`site/main.js`、Release notes、`.sha256`、既有 `release/ACCEPTANCE.md` 均为空。
- `release/DEPLOYMENT_v0.1.1.md` 与实现父提交的 `release/DEPLOYMENT.md` 逐字节相等；v0.1.1 部署事实没有被覆盖。
- 当前态文档没有残留 `BUILD-0.1.2-CANDIDATE`、`RELEASE-0.1.2-CANDIDATE`、待验收或尚未发布表述。`release/CANDIDATE_v0.1.2.md` 与下方原 `RELEASE-0.1.2` 报告仍按当时语境保留，不被冒充为当前状态。

## Git、Release 与远端资产

- 本地与远端均独立读取到 annotated tag object `0c998d45bcc892ac56c8800902659b5ecc78f084`，`v0.1.2^{}` 解引用为 `2fe8bf54dad12f58bccf06a9d692f7c14f65cbd3`。
- 验收时 `git ls-remote --heads origin` 只有 `main`，且为同一 `2fe8bf5`。
- `gh release view`：`Courtwork v0.1.2`，非 draft、非 prerelease，发布时间 `2026-07-14T15:17:12Z`，目标分支 `main`。
- Release 两项资产均为 `uploaded`：

| 资产 | 大小 | GitHub digest |
|---|---:|---|
| `Courtwork_0.1.2_aarch64.dmg` | `4,679,277` bytes | `sha256:f4af2a44248c7d7af970c8486ccaf7c8d72107565c4d824ce9cb8d69578de83d` |
| `Courtwork_0.1.2_aarch64.dmg.sha256` | `94` bytes | `sha256:4d7231e67f97ba5693bf501ac842d6187fa80b14fba40517255d1b923e3a9ee2` |

- 本验收用两次精确 `gh release download` 把 DMG 与 SHA 文件重新下载到独立目录；独立 `stat` / `shasum` 与 GitHub 元数据一致，`shasum -a 256 --check Courtwork_0.1.2_aarch64.dmg.sha256` 返回 `OK`。

## Pages 与公开页面

- `gh run view 29383926592`：Pages workflow `success`，head `2fe8bf54dad12f58bccf06a9d692f7c14f65cbd3`，时间 `2026-07-15T02:22:23Z` 至 `02:22:45Z`。
- job `87253159770` 名为 `guard-and-deploy`，`success`；checkout、完整 guard、build、upload 与 Deploy to GitHub Pages 各步均成功。
- 公开首页、`assets/icon.svg`、`styles.css`、`main.js`、`assets/og.png`、Hero `09-source-confirmed-1280.webp` 与 DMG 最终响应均为 HTTP 200。
- 重新下载的公开首页与仓库 `site/index.html` 逐字节相等；恰有两个真实 DMG `href`，可见 `v0.1.2`、唯一 64 位 SHA、未公证边界、原件/引语/结论/人工确认、Legal 合同链、卷宗 `20 / 47 / 14 / 8` 与 PM `Schema catalog preview / 尚未接通运行链` 全部命中。

## 真机 PNG 与直接启动边界

三帧均已重新计算尺寸、大小、SHA，并与 `/tmp/courtwork-v0.1.2-evidence` 采集原件 `cmp` 相等；本验收使用原始分辨率逐帧目视，而不是只看清单文字。

| 文件 | 尺寸 | 大小 | SHA-256 | 目视结论 |
|---|---:|---:|---|---|
| `pages-hero-safari.png` | `2700×1718` | `622,744` | `52d854a91fe1fb099216276954c4c21e1c686e977ba4b5c93432361b08fed4f6` | 公开 Hero、核心 icon 位于 Courtwork 左侧；版本、SHA、下载与未公证边界可见，页面比例符合 100% 记录。 |
| `pages-scenarios-safari.png` | `2700×1718` | `599,324` | `5782000a27b82ab89fd379661226a4ca8114b59af7ce0320783a67e10d6aa1cc` | 页面整体缩小后同屏展示合同、卷宗四计数与 PM catalog-only；没有把 PM 冒充 live。 |
| `app-mounted-direct.png` | `2700×1792` | `558,614` | `5fda3c17fe6dfdd3d0fc79b8d1b2422d9ec6e9b17f732eaf048e386a0a20b010` | 原生 App Work 首屏；隔离无 key 时诚实显示 `Connection failed`，无假成功态。 |

截图像素本身不携带 Safari zoom 或进程路径的可验证元数据，因此本报告不把画面单独冒充为操作日志。部署记录已准确区分“Safari 原生页面缩小四档”和“PNG 入库后未重采样”；三 PNG 与采集目录逐字节相同，未发现后期像素变换。Hero 的 `100%` 与场景的四档缩小属于采集方法记录，画面形态与之不冲突。

为独立复核 App 路径，本验收从**重新下载的远端 DMG**另行只读挂载并直接执行挂载点 Mach-O，没有调用 `open` / LaunchServices：

- `hdiutil` 验证通过，CRC32 `$3C3B7DAB`；App short/build version 均为 `0.1.2`，最低 macOS `12.0`，thin `arm64`。
- `codesign --verify --deep --strict` 通过；`Signature=adhoc`、`TeamIdentifier=not set`；`spctl` exit `3 / rejected`。
- 隔离 HOME/TMPDIR 后直接启动 `/tmp/courtwork-deployment-0.1.2-accept-mount.47828/Courtwork.app/Contents/MacOS/courtwork-desktop`；PID `47884` 存活 8 秒，`ps` 路径逐字命中。
- TERM 后 `wait=143`、进程消失；随后 `/dev/disk13` 成功 eject，并确认无本验收挂载或进程残留。

这条独立复跑验证的是 DMG 的“挂载点直接运行”能力与边界；原截图清单中的采集 PID `31776` 仍是部署会话的操作日志，不由 PNG 单独证明。

## 链接、archive 隔离与基线断链

- 本次新增/改写的相对链接全部在现行仓库内解析；活动 Markdown 没有链接到 `archive/`，活动源码也没有 import/fetch/read consumer。
- 实际把 `site/index.html` 的一个真实 `href` 临时指向被禁历史目录后运行完整 `pnpm site:guard`：前置 Node 31/31 后 scanner 精确报告 `[archive-reference] site/index.html:159`，exit 1。反向补丁撤回后文件 SHA 恢复、最终门禁全绿。
- 复现一项**实现前既存**文档债：`apps/desktop/SPEC.md` 共有 33 个 `visual-audit/*.png` 相对链接目标缺失；在 `941067d^` 与实现 tip 上清单完全相同（before=33 / after=33）。本部署实录没有新增或扩大该断链，验收角色不越界补历史素材。

## 全量门禁

- `pnpm install --frozen-lockfile`：14 workspace projects；lockfile 未变。
- `node release/scripts/assert-release-truth.mjs --require-site-match`：PASS，app/site 均为 `0.1.2`，SHA 一致。
- `pnpm site:guard`：Node **31/31**；deslop **689 active text files**；archive、neutral、elevation、signature、motion 全绿。
- `pnpm site:build`：通过。
- `pnpm lint`：通过。
- `pnpm -r build`：13/14 workspace projects；desktop **3532 modules**；仅既有 chunk-size warning。
- `pnpm test`：Vitest **131 files / 1127 tests** 全绿。

本单只改文档与证据 PNG，不改变 desktop 行为、Rust 或发布制品；因此不重复运行 Playwright/Rust，也不以本单替代上一个 `RELEASE-0.1.2` 报告已完成的 209/209 与 25/25 产品验收。

---

# ACCEPTANCE: RELEASE-0.1.2

验收日期：2026-07-14

角色：RELEASE-0.1.2 独立验收；未参与候选制品构建或发布真值实现

唯一候选实现：`a6563f1da6370304eefa85286aaa60e86b58fc0e`

验收守卫修复：`f4e076a`（`fix-by-acceptance`；不改产品、站点真值或 DMG）

产品 / 制品源码：`2021c8cd2379739bbd0cef229c0e7d141b5cd8ee`

纳入的 main：`0399d0476a7874bc608edd4ed4ddb444f0f57f7f`

独立 worktree：`/private/tmp/courtwork-release-0.1.2-acceptance`

## 结论

**✅ 放行。** RELEASE-0.1.2 的产品、同批站点真值、发布手册、原候选 DMG 与独立全量门禁一致。验收报告合入后，发布会话可以严格按本文固定顺序创建 annotated `v0.1.2`、GitHub Release 和 Pages；本验收会话没有 tag、push、创建 Release 或部署。

这是一枚 **Apple Silicon、ad-hoc 签名、未 Apple 公证的开发构建**。`codesign` 与 DMG 完整性通过不等于 notarization；`spctl` 拒绝是当前已声明边界。放行也不表示远端 v0.1.2 已发布。

## 候选边界与版本

- 旧候选 `2acc1e7` 已退役，不作为本结论对象。`a6563f1` 以前进提交修正手册顺序与 release truth 测试；验收分支只从 `2acc1e7` fast-forward，没有重写历史。
- `git diff 2021c8c..f4e076a` 只有 desktop/site SPEC、发布手册与记录、release guard、SHA 文件和 `site/index.html` 共 10 个 release/docs/site 文件；对 `apps/desktop/src`、`apps/desktop/src-tauri`、`packages`、根 package/workspace/lockfile 的限定 diff 为空。
- `0399d04` 与产品 / 制品源码 `2021c8c` 均是候选祖先；候选没有遗漏已收账的本地 main。
- desktop `package.json`、`tauri.conf.json`、`Cargo.toml`、`Cargo.lock` 的 `courtwork-desktop` block、`SettingsPage.APP_VERSION` 五处均为 `0.1.2`。
- 站点恰有两个真实 `href`，均指向 `releases/download/v0.1.2/Courtwork_0.1.2_aarch64.dmg`；可见版本、SHA、Release notes 与 README 同源。

## 反例注入与 `fix-by-acceptance`

所有变异都在独立树用补丁实际注入，运行真实 guard 观察非零退出，再以反向补丁撤回；最终工作树恢复干净。

| 反例 | 观察 |
|---|---|
| desktop package / Tauri config / Cargo.toml / Settings 关于页 / Cargo.lock 各自改为 `9.9.9` | 五次 strict truth 均 exit 1，并精确指出对应来源 |
| 五个应用来源整体退回 `0.1.1` | exit 1，五个来源全部报告旧版 |
| site tag 漂移 | exit 1：tag/asset、expected version、跨入口与可见版本同时红 |
| site asset 漂移 | exit 1：asset、SHA、notes、README 同时红 |
| site 显示 SHA 漂移 | exit 1：displayed SHA 与校验文件不符 |
| SHA 文件漂移 / Release notes SHA 漂移 | 两项分别 exit 1 |
| 可见 `release-fact` 改为 v0.1.1 | exit 1：可见版本与下载版本不符 |
| 手册退回先 `push main` | Node release suite 9/10，顺序测试稳定红 |

验收另发现：把一个真实 `href` 改成 `data-href` 后，原 guard 会误把属性子串与脚本文本中的裸 URL 计为入口，strict truth 错误 exit 0。先补测试得到 **7 pass / 3 fail**，再以 `f4e076a fix-by-acceptance(release): count only real DMG hrefs` 收严：

- canonical URL 与 raw DMG 检测都只从真实 `href` 属性读取；`data-href`、`aria-href` 和 script/style 文本不计数；
- 明确支持单双引号的真实 `href`；未引入 HTML parser 或第三方依赖；
- 修后 release suite **10/10**；再次实际只留一个真实 DMG `href` 时 strict truth exit 1：`expected exactly two ... got 1`。

该修复只改两份 release guard/test 文件，不改变发布契约、站点内容、产品代码或制品字节。

## 制品复验

待验 DMG（没有重建或替换）：

`/private/tmp/courtwork-release-0.1.2-candidate/apps/desktop/src-tauri/target/release/bundle/dmg/Courtwork_0.1.2_aarch64.dmg`

| 项 | 独立结果 |
|---|---|
| DMG 大小 | `4,679,277` bytes |
| DMG SHA-256 | `f4af2a44248c7d7af970c8486ccaf7c8d72107565c4d824ce9cb8d69578de83d` |
| SHA 同源 | `.sha256`、Release notes、candidate record、site 四处一致 |
| `hdiutil verify` | VALID；CRC32 `$3C3B7DAB` |
| DMG 布局 | `Courtwork.app` + `Applications -> /Applications` |
| Info.plist | short version / bundle version `0.1.2`；`LSMinimumSystemVersion=12.0` |
| 架构 | `file`: Mach-O 64-bit executable arm64；`lipo -archs`: `arm64` |
| 可执行 SHA-256 | `f80d46c0bf1ed03593dbb1ed5e0db512937f3473361b92e47580ec1cd7ae0b51` |
| 签名 | deep/strict 通过；`Signature=adhoc`、`TeamIdentifier=not set`、thin arm64 |
| identity | `security find-identity -v -p codesigning`: `0 valid identities found` |
| Apple 公证环境 | Apple ID/password/team/API key/issuer/path 六项均 absent；只检查 presence，未输出值 |
| notarytool | 无凭证 history exit `64`，`Must provide credentials` |
| Gatekeeper | `spctl` exit `3`，`rejected`，符合未公证开发构建声明 |

### 挂载与直接启动

- 只使用本轮显式挂载点 `/tmp/courtwork-release-accept.8KF7sK`；命令带 `-readonly -nobrowse -noautoopen -mountpoint`，没有调用 `open` 或 LaunchServices。
- 未读取系统中既存的 `/Volumes/Courtwork` 至 `/Volumes/Courtwork 3` 旧挂载，避免串包取证。
- 隔离 HOME/TMPDIR 后直接执行 `/tmp/courtwork-release-accept.8KF7sK/Courtwork.app/Contents/MacOS/courtwork-desktop`；PID `18379`，8 秒后仍存活，`ps` command 与该绝对路径逐字一致。
- 对该 PID 发送 TERM，`wait` exit `143`，进程消失；`disk13` 随后 ejected，精确 `/tmp` 挂载点已 detach 并删除。

## 全量门禁

- `pnpm install --frozen-lockfile`：14 workspace projects；lockfile 未变。
- `pnpm site:guard`：Node **31/31**（release 10 + deslop/fixture 21）；scanner **687 active text files**；neutral/elevation/signature/motion 全绿。
- `pnpm site:build`：通过。
- `pnpm lint`：通过。
- `pnpm -r build`：13/14 workspace projects；desktop **3532 modules**；仅既有 chunk size warning。
- desktop Vitest：**39 files / 161 tests**。
- provider Vitest：**12 files / 88 tests**。
- root Vitest：**131 files / 1127 tests**。
- Rust：**25/25**。
- `COURTWORK_E2E_PORT=1623 ... test:e2e --workers=1`：`reuseExistingServer=false`，静态前置门与假绿下限 209 通过，Playwright **209/209 passed（2.8m）**。

活动源码/文档的 archive consumer 扫描为绿；命中的 `archive/` 文字只位于治理禁令和历史验收说明，不构成 import/fetch/link/path 消费。现行发布、desktop 与 site 文档在仓库内最小自足。

## 远端发布前状态

- 本地 `v0.1.2` tag 为空；`git ls-remote` 的远端 `v0.1.2` tag/解引用为空。
- `gh release view v0.1.2` exit 1：`release not found`；候选资产 HEAD 返回 404。
- 验收时 `origin/main=d7756a78dcd1386b8f318c9a3e060ed662b56c52`。
- 当前部署页仍诚实展示 `v0.1.1 · Apple Silicon`、`Courtwork_0.1.1_aarch64.dmg` 与 SHA `37792b...db7e`；没有 v0.1.2 字样。

因此 candidate 的 v0.1.2 链接只允许作为同批待发布真值，不能在 Release 资产存在前先部署 Pages。

## 固定发布顺序

1. 将本验收提交合入 `main`，确认最终 tip 与工作树干净。
2. 在最终已验收 tip 创建 annotated `v0.1.2`，**只先 push tag，不先 push main**。
3. 创建 GitHub Release，上传本报告复验的原 DMG 与 `.sha256`。
4. 先做资产 HTTP HEAD；用 `gh release download` 重新下载 DMG 与 SHA 文件并执行 `shasum --check`。
5. 资产存在且重算一致后才 push `main`，触发 Pages。
6. 等待 Pages workflow success，复核公开页版本、两个下载 href、SHA、未公证声明、资源与布局。
7. 只有远端 Release 与 Pages 都复核通过，才以**单独的后置部署记录提交**写入真实 workflow、tag 解引用、公开大小与重下载 SHA。

发布顺序不可交换；任一步失败即停止，不能用本报告宣称部署已经完成。

---

# ACCEPTANCE: RELEASE-0.1.1

验收日期：2026-07-14

角色：RELEASE-0.1.1 独立验收；未参与候选发布元数据实现

候选：`c7f447e34bc619410499b9832d9b8eb60c4eac5a`

产品 / 制品源码：`0443e81b1b97cf47b45fa8f2dd7f8ed886c80f31`

独立 worktree：`/Users/lesprivilege/Projects/Courtwork-accept-release-0.1.1`

## 结论

**放行。** 本报告提交并完成最终 tip 门禁复跑后，允许在该验收 tip 创建 `v0.1.1` tag、push `main` 与 tag，并执行 `gh release create` 上传本报告核过的 DMG 与 SHA 文件。验收会话不自行 push、tag、创建 Release 或部署。

这是一枚 **Apple Silicon、ad-hoc 签名、未 Apple 公证的开发构建**。放行不等于 Apple 公证，也不等于 Release / Pages 已经上线。创建 Release 后仍须复核资产 HTTP 200、远端 SHA、Pages workflow 与部署页；任一不符即停止宣称发布完成。

## 候选边界与版本

- `git diff --name-status 0443e81..c7f447e` 只有 `apps/desktop/SPEC.md`、`docs/`、`release/`、`site/SPEC.md` 与 `site/index.html` 共 9 个 release/docs/site 元数据文件。
- 对 `apps/desktop/src/**`、`apps/desktop/src-tauri/**`、所有 `package.json`、`Cargo.toml`、lockfile 与 workspace 配置的限定 diff 为空；发布元数据提交没有改变产品、Tauri、package 或锁文件。
- 四处版本独立读取一致：desktop `package.json`、`tauri.conf.json`、`Cargo.toml` 与 `SettingsPage.APP_VERSION` 均为 `0.1.1`。
- App `Info.plist` 的 `CFBundleShortVersionString` / `CFBundleVersion` 均为 `0.1.1`，`LSMinimumSystemVersion` 为 `12.0`；Release notes 的 macOS 12+ 边界真实。

## 制品复验

待验本路径：

- DMG：`/Users/lesprivilege/Projects/Courtwork/apps/desktop/src-tauri/target/release/bundle/dmg/Courtwork_0.1.1_aarch64.dmg`
- App：`/Users/lesprivilege/Projects/Courtwork/apps/desktop/src-tauri/target/release/bundle/macos/Courtwork.app`

独立重算与系统工具结果：

| 项 | 结果 |
|---|---|
| DMG 大小 | `4,667,331` bytes |
| DMG SHA-256 | `37792b767fe08119edab3cc6b793e59cd4511758110f8b42e6242e80a023db7e` |
| 可执行文件 | `Contents/MacOS/courtwork-desktop` |
| 可执行 SHA-256 | `4f43773ecdfbb21c795d31e84cd9781a500acf0e029bbc8458e872aae546b499` |
| 架构 | `file`: Mach-O 64-bit executable arm64；`lipo -archs`: `arm64` |
| 本地 App 签名 | `codesign --verify --deep --strict`: valid on disk / satisfies Designated Requirement |
| 签名明细 | `Signature=adhoc`、flags `adhoc,runtime`、`TeamIdentifier=not set`、thin arm64 |
| DMG 完整性 | `hdiutil verify`: VALID；CRC32 `$405ED3DE` |
| 挂载副本 | deep/strict 通过；可执行 SHA 与架构同上 |
| DMG 安装布局 | `Courtwork.app` + `Applications -> /Applications` |

`release/Courtwork_0.1.1_aarch64.dmg.sha256`、Release notes 与 `site/index.html` 三处 SHA 均为同一 64 位值；文件名均为 `Courtwork_0.1.1_aarch64.dmg`。

## 签名、公证与 Gatekeeper 边界

- `security find-identity -v -p codesigning`：`0 valid identities found`。
- Apple ID / password / team / API key / issuer 相关环境项逐项只检查 presence，均 absent；未输出任何 secret。
- 无凭证运行 `xcrun notarytool history --output-format json`：exit `64`，`Must provide credentials`。当前环境不可公证。
- `spctl --assess --type execute --verbose=4 Courtwork.app`：exit `3`，`rejected`。
- Release notes、站点、release README、desktop Build 记录均明确写出开发构建、ad-hoc 与未公证，没有把 codesign / DMG 完整性冒充为 notarization。

## Release notes、文档与站点

- Release notes 的 macOS 12+、Apple Silicon、aarch64、文件名、SHA、Gatekeeper 拒绝与右键打开边界均与制品一致；验收补充了 DMG 拖入 `Applications` 和 Intel 不支持说明。
- 发布手册与 release README 的活动文档引用均可在现行库内解析，历史材料引用扫描为 0。
- `.github/workflows/pages.yml` 在 deploy 前执行完整 `pnpm site:guard`，上传 `site-dist`。
- `site/index.html` 的两个下载 href 均为 `https://github.com/lesPrivilege/Courtwork/releases/download/v0.1.1/Courtwork_0.1.1_aarch64.dmg`；首页显示同一 SHA，并两处明示“未公证”。
- `site:build` 后在本地等价 `/Courtwork/` 子路径独立服务；index、CSS、JS、icon、OG 与 hero WebP 六个资源均 HTTP 200，证明相对 URL 在项目 Pages 子路径成立。
- Codex 当前会话没有可用浏览器后端（发现列表为空），因此没有伪报可视化浏览器验收；部署后的真实页面视觉、横向溢出与下载资产 200 仍是发布后完成条件。
- 验收时本地 `v0.1.1` tag 为空，`git ls-remote` 远端 tag 为空，GitHub tag API 为 404，`gh release view v0.1.1` 为 `release not found`。当前页面只能作为与 Release 同批推送的候选。

## 反例与修复

### 反例

向活动 `site/index.html` 临时注入历史目录引用后，完整 `pnpm site:guard` exit `1`，精确报告 `site/index.html: active site references archive`；反向补丁撤除后恢复全绿，变异未进入提交。

### `fix-by-acceptance`

1. 发布手册原命令从仓库根目录引用不存在的裸 `Courtwork.app`、DMG、SHA 与 notes 路径，且只有 `git push origin v0.1.1`、没有创建 tag。已改为真实 repo-root 路径，补齐挂载副本、hash / arch、identity / `spctl` 命令与 annotated tag 创建。
2. 全新 worktree 按原手册在 workspace build 前执行 root tests，出现 16 个 suite 的 package entry import failure；此时 98 files / 806 tests 已通过。`pnpm -r build` 后同一源码为 114 files / 981 tests 全绿，证明是工序顺序问题。已把全仓 build 前移到 package/root tests 之前。
3. release README 改为现行库内可点击链接；Release notes 补齐真实 DMG 安装动作与 Intel 平台边界。

以上均为发布工序与文档实现级修复，不改变产品契约、制品字节或站点视觉。

## 实跑门禁

修复后的顺序实跑：

- `pnpm install --frozen-lockfile`：13 workspace projects，lockfile 无变更。
- `pnpm site:guard`：12/12；deslop 扫描 588 active text files；neutral / elevation / signature / motion 全绿。
- `pnpm site:build`：通过。
- `pnpm lint`：通过。
- `pnpm -r build`：12/13 workspace projects；desktop 3504 modules；仅既有 chunk size warning。
- desktop Vitest：30 files / 129 tests。
- provider Vitest：12 files / 86 tests。
- root Vitest：114 files / 981 tests。
- Rust：25/25。

最终提交后的 tip 还须至少重跑 `site:guard`、`site:build`、`lint` 与 root `test`；其结果由验收会话在交付时一并回报。

## 发布操作边界

放行顺序固定为：将本验收提交合入 `main` → 在最终验收 tip 创建 annotated `v0.1.1` → push `main` 与 tag → `gh release create` 上传本趟 DMG、SHA 文件并使用现行 Release notes → 等待 Pages 成功 → 复核资产 200、远端 SHA 与部署页。不得用当前放行文字宣称 Apple 已公证。
