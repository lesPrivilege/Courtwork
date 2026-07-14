# 发布手册

本手册定义 Courtwork 从已验收 `main` 生成 macOS 制品、GitHub Release 与 Pages 的唯一现行路径。发布不改变产品契约；任何产品代码变化必须先完成独立实现与验收。除非另有说明，以下命令均从仓库根目录执行。

## 发布通道

- 当前公开通道：Apple Silicon 开发构建。
- 当前签名：ad-hoc；没有 Developer ID 和 notarization 时，官网、Release notes 与校验记录必须逐字说明“未公证”，不得称为正式 Apple 公证发行包。
- 正式通道：需要外部提供 Developer ID Application identity 与 notarytool 凭证；证书、密码、API key 和 profile 不进入仓库。

## 1. 冻结候选

1. 确认所有被合入工单已有不同会话写入的 `ACCEPTANCE.md` 放行记录。
2. `git status --porcelain` 必须为空；所有目标提交必须是 `main` 祖先。
3. 四处版本一致：desktop `package.json`、Tauri config、Cargo manifest、Settings 关于页。
4. 检查 GitHub tag / Release 不存在，防止覆盖已发布版本。

## 2. 全量门

```sh
pnpm install --frozen-lockfile
pnpm site:guard
pnpm lint
pnpm -r build
pnpm --filter @courtwork/desktop test
pnpm --filter @courtwork/provider test
pnpm test
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
COURTWORK_E2E_PORT=1583 pnpm --filter @courtwork/desktop test:e2e --workers=1
```

E2E 必须自起独立端口，禁止复用 `:1420`。报告只采信候选 tip 的完整实跑。

## 3. 构建与校验

```sh
rm -rf apps/desktop/src-tauri/target/release/bundle
pnpm --filter @courtwork/desktop tauri build --bundles app,dmg

APP=apps/desktop/src-tauri/target/release/bundle/macos/Courtwork.app
DMG=apps/desktop/src-tauri/target/release/bundle/dmg/Courtwork_0.1.1_aarch64.dmg
EXE="$APP/Contents/MacOS/courtwork-desktop"

codesign --verify --deep --strict "$APP"
hdiutil verify "$DMG"
shasum -a 256 "$DMG"
shasum -a 256 "$EXE"
file "$EXE"
lipo -archs "$EXE"
```

还必须挂载 DMG，复验其中 app 的签名与可执行文件哈希；实际启动一次再退出：

```sh
DMG=apps/desktop/src-tauri/target/release/bundle/dmg/Courtwork_0.1.1_aarch64.dmg
MOUNT=$(mktemp -d /tmp/courtwork-release.XXXXXX)
hdiutil attach -readonly -nobrowse -noautoopen -mountpoint "$MOUNT" "$DMG"
codesign --verify --deep --strict "$MOUNT/Courtwork.app"
shasum -a 256 "$MOUNT/Courtwork.app/Contents/MacOS/courtwork-desktop"
hdiutil detach "$MOUNT"
rmdir "$MOUNT"
```

用下列命令记录签名 identity 与 Gatekeeper 结果；没有 notarytool 凭证时必须明确记为不可公证。`spctl` 对 ad-hoc 包返回 rejected 是当前发行边界，不得删去或伪装通过。

```sh
APP=apps/desktop/src-tauri/target/release/bundle/macos/Courtwork.app
security find-identity -v -p codesigning
spctl --assess --type execute --verbose=4 "$APP"
```

## 4. 真值切换

1. 把本趟 DMG SHA 写入 `release/*.sha256` 和 desktop Build 记录。
2. Release notes 写清架构、签名、公证、Gatekeeper、SHA 与已知边界。
3. 官网只在真实产物即将随同一发布推送时切换到 `releases/download/<tag>/<asset>`；同时呈现 64 位 SHA 与未公证声明。
4. 由不同会话复验 DMG、校验文件、Release notes、站点链接和部署构建后，才可创建 tag。

## 5. 发布与部署

```sh
DMG=apps/desktop/src-tauri/target/release/bundle/dmg/Courtwork_0.1.1_aarch64.dmg
SHA_FILE=release/Courtwork_0.1.1_aarch64.dmg.sha256
NOTES=release/RELEASE_NOTES_v0.1.1.md

git tag -a v0.1.1 -m "Courtwork v0.1.1"
git push origin main
git push origin v0.1.1
gh release create v0.1.1 "$DMG" "$SHA_FILE" --notes-file "$NOTES" --title "Courtwork v0.1.1"
```

Pages workflow 由 `main` push 触发，必须执行完整 `pnpm site:guard`。完成条件同时包括：Release asset 200、SHA 与本地一致、Pages workflow success、部署页下载链接与 SHA 正确、无横向溢出或破图。

## 6. 收尾

- 删除已合流 worktree 与实现/验收分支，只保留 `main` 和发布 tag。
- 远端分支只删除属于本轮且已合流的分支；不得删除未知他人工作。
- 最终 `git status` 为空，`main` 与 `origin/main` 一致，tag 指向已验收发布提交。
