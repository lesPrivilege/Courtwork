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
