# RELEASE-0.1.2 候选记录

状态：**实现完成，等待不同会话独立验收**。本记录不构成放行；当前没有创建 tag、push、GitHub Release 或 Pages 部署。

## 源码与构建

- 纳入的 `main` 基线：`0399d0476a7874bc608edd4ed4ddb444f0f57f7f`。
- 制品产品源码：`2021c8cd2379739bbd0cef229c0e7d141b5cd8ee`（版本、release truth guard 与参数化手册；随后回填只改 release/docs/site 元数据）。
- 构建时刻：`2026-07-14T13:51:55Z`。
- 工具链：Node `v25.9.0`、pnpm `9.15.0`、rustc/cargo `1.97.0`、macOS `26.5.2`、主机 `arm64`。
- 命令：`pnpm --filter @courtwork/desktop tauri build --bundles app,dmg`；构建前已删除旧 `target/release/bundle`。
- 前端 dist 清单 SHA-256：`e3f27e21a833a2fad6f8824ed1946e960e745d529e6f625dad375da76fc0ad9a`。

## 制品证据

| 项 | 结果 |
|---|---|
| DMG | `apps/desktop/src-tauri/target/release/bundle/dmg/Courtwork_0.1.2_aarch64.dmg` · `4,679,277` bytes |
| DMG SHA-256 | `f4af2a44248c7d7af970c8486ccaf7c8d72107565c4d824ce9cb8d69578de83d` |
| 可执行 SHA-256 | `f80d46c0bf1ed03593dbb1ed5e0db512937f3473361b92e47580ec1cd7ae0b51` |
| 版本 | Info.plist `CFBundleShortVersionString=0.1.2`、`CFBundleVersion=0.1.2`；最低 macOS `12.0` |
| 架构 | Mach-O 64-bit executable arm64；`lipo -archs` = `arm64` |
| 签名 | `codesign --verify --deep --strict` 通过；`Signature=adhoc`、flags `adhoc,runtime`、`TeamIdentifier=not set` |
| DMG 完整性 | `hdiutil verify` VALID；CRC32 `$3C3B7DAB` |
| 安装布局 | 挂载副本含 `Courtwork.app` 与 `Applications -> /Applications`；副本签名、版本、arm64 与可执行 SHA 均复验一致 |
| Gatekeeper | `spctl` exit `3` / `rejected`，符合未公证开发构建边界 |
| 身份 / 公证 | `security find-identity` 为 0；Apple ID/team/API key/issuer/path 环境项均 absent |

## 挂载启动纠偏

LaunchServices 曾复用主工作树与 `/Applications` 中相同 bundle id 的旧 app；PID `87039` 与 `88225` 均已停止，不能作为候选证据。

唯一采信的启动 smoke 是在只读 DMG 挂载点直接执行完整 Mach-O 路径，而非 `open` / `open -a`：PID `88521` 的 `ps command` 精确为 `/tmp/courtwork-release.yUf1jV/Courtwork.app/Contents/MacOS/courtwork-desktop`。该进程在隔离 HOME 下存活 8 秒，随后收到 TERM，`wait` 为 143、日志 0 bytes，DMG 正常卸载。

## 实现侧全门

- `pnpm install --frozen-lockfile`：14 workspace projects。
- `pnpm site:guard`：产品源码前置门 25/25 / 685 个活动文本文件；真值回填后的最终门 25/25 / 687；四个设计守卫全绿。
- `pnpm site:build`、`pnpm lint`：通过。
- `pnpm -r build`：13/14 workspace projects；desktop 3532 modules；仅既有 chunk size warning。
- desktop Vitest：39 files / 161 tests。
- provider Vitest：12 files / 88 tests。
- root Vitest：131 files / 1127 tests。
- Rust：25/25。
- `COURTWORK_E2E_PORT=1612`、`reuseExistingServer=false`、单 worker 完整 Playwright：209/209（2.9m）。

以上均为实现自证；独立验收必须在 clean worktree 重新核对候选 tip、DMG 字节、truth drift 反例、完整门禁与挂载启动路径。
