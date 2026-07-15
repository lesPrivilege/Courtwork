# DEPLOYMENT: v0.1.1

部署日期：2026-07-14（Asia/Singapore）

## 公开入口

- Pages：<https://lesprivilege.github.io/Courtwork/>
- Release：<https://github.com/lesPrivilege/Courtwork/releases/tag/v0.1.1>
- DMG：<https://github.com/lesPrivilege/Courtwork/releases/download/v0.1.1/Courtwork_0.1.1_aarch64.dmg>
- Pages workflow：<https://github.com/lesPrivilege/Courtwork/actions/runs/29301065279>

## Git 真值

- `main` 发布合流：`39555d6aaa2ba6dddfd329ee2cd15bdc64d50e70`
- annotated tag：`v0.1.1`，解引用后指向 `39555d6aaa2ba6dddfd329ee2cd15bdc64d50e70`
- Release：非 draft、非 prerelease，发布时间 `2026-07-14T02:26:36Z`
- 分支 / worktree：发布前已清理全部 `codex/*` 分支与附属 worktree；远端只存在 `main`。

## 远端制品复核

GitHub Release 公开资产：

| 资产 | 大小 | GitHub digest |
|---|---:|---|
| `Courtwork_0.1.1_aarch64.dmg` | `4,667,331` bytes | `sha256:37792b767fe08119edab3cc6b793e59cd4511758110f8b42e6242e80a023db7e` |
| `Courtwork_0.1.1_aarch64.dmg.sha256` | `94` bytes | `sha256:a49ffa744eaf8465237f1cbe57cbc38be47ba6322fb48071cb0f2eadd723a548` |

发布后使用 `gh release download v0.1.1` 重新下载 DMG，独立复算 SHA-256 为 `37792b767fe08119edab3cc6b793e59cd4511758110f8b42e6242e80a023db7e`，大小仍为 `4,667,331` bytes。该结果与 [`Courtwork_0.1.1_aarch64.dmg.sha256`](Courtwork_0.1.1_aarch64.dmg.sha256)、Release notes、官网和 [`ACCEPTANCE.md`](ACCEPTANCE.md) 一致。

## Pages 复核

- workflow run `29301065279`：`success`；head `39555d6`；运行时间 `2026-07-14T02:26:19Z` 至 `2026-07-14T02:26:46Z`。
- 部署首页返回 HTTP 200；项目子路径 `/Courtwork/` 生效。
- macOS Safari 真机打开公开 URL 后，页面可见四项硬承诺、下载 CTA 与“Apple Silicon 开发构建 · 未公证”边界。

## 发行边界

本次公开制品是 Apple Silicon、ad-hoc 签名、未 Apple 公证的开发构建。独立验收中的 `codesign`、`hdiutil` 与挂载启动通过不等于 Gatekeeper 公证；正式分发仍需外部提供 Developer ID 与 notarization 凭据后重新出包。
