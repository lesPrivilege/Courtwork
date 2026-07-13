# ACCEPTANCE: site

验收记录按工单追加；每节必须明确回答结构是否允许合入 `main`。官网发布与真实制品链接另需在部署后复核。

---

## SITE-2A · Evidence Line 独立验收（2026-07-13）

- 验收角色：独立验收会话，非 `77dae47` 实现者。
- 被验实现：`codex/site-2@77dae479591d5d8dd2edac87d252cf522ae122ce`。
- 集成基线：开始时最新 `main@0494f93`；独立树 merge `54cbdc7`，无冲突。
- 独立 worktree：`/Users/lesprivilege/Projects/Courtwork-accept-site-2`。未读取或修改共享主树的 dirty `site/` / `archive/`。
- 权威规范：完整复核 `docs/design/site-evidence-line.md`、`docs/design/icon.md`、`docs/design/principles.md`。
- 结论：**✅ SITE-2A 结构可合入 main。** 验收发现的两项实现级真实性缺陷均已修复；无契约级问题或 `[需架构拍板]` 项。

### 1. Evidence Line 与真实 fixture

页面因果链的 DOM 与视觉阅读顺序均为：

```text
原件 → 引语 → 结论 → 人工确认
```

- 原件来自 `packages/demo-data/data/dossier/04-设备采购合同.md`，页面逐字呈现“乙方逾期支付任何一期款项的，每逾期一日应按未付金额的1%向甲方支付违约金”，并标明 `04-设备采购合同 · 第 1 页`。
- 引语是 `packages/demo-data/data/artifacts/risk-list.json` 中 `risk-01` source anchor 的逐字子串；同一风险在 fixture 中为 `high / pending`，页面对应呈现“高风险 · 依据已核验 / 待确认 · 不自动送出”。
- 验收把上述 dossier 与 RiskList 直接接入 `deslop-scan.mjs`，常驻检查文件、原文、引语切片、风险级别与确认状态同源，避免页面文案以后脱离 fixture 漂移。

首屏恰有 **1** 个 `.mac-window` 完整工作台；后续恰有 **3** 个 `.work-crop` 连续台账裁片，没有第二个完整窗口。HTML/CSS 无 `I / E / V`、`01/02/03`、`scene-mark`、`feature-card`、`trust-list` 或 `card-grid` 脚手架。四条承诺逐字存在：不改原件、不自动送出、不把无锚引语落格、不替你确认。

### 2. 核心 mark

- mark 恰在 `Courtwork` 文字左侧；浏览器实测尺寸 **18×18px**、间距 **7px**、垂直中心差不超过 **1px**。
- 计算样式为透明背景、`box-shadow:none`、`border-radius:0`、`animation-name:none`、`transition-duration:0s`、`transform:none`；没有底盘、边框、阴影、圆角、hover 或入场动画。
- SVG 只有 4 条 `path`，无 `rect/circle/ellipse/polygon`。验收发现原实现三横误成“长/短/长”，与权威源稿及 desktop 核心 mark 的“长/长/短”不一致；已修为 `M8 5v14 / M11.5 8H18 / M11.5 12H18 / M11.5 16h4`，并由 scan 锁定精确序列：`3e94876 fix-by-acceptance: restore canonical site brand geometry`。

### 3. CTA 与发布真实性

只读网络核验：公开仓库 `https://github.com/lesPrivilege/Courtwork` 可访问；GitHub 页面显示 **No releases published**，`/releases/tag/v0.1.1` 与既有 DMG 直链均返回 404。本地 `release/` 只有 `.dmg.sha256` 文本，没有 DMG 制品。

原实现仍展示“下载 macOS 版”、release tag、DMG URL 与 SHA，违反“无制品时不得出现伪下载”。验收修复为：

- 保留与 `apps/desktop/package.json`、`tauri.conf.json` 一致的真实版本 `v0.1.1`；
- CTA 使用中文“查看 GitHub 源码 / 查看真实工作台”，GitHub 链接指向真实公开仓库；
- 明确写“macOS 制品尚未发布”，撤掉不存在的下载、release tag 与制品 SHA；
- scan 区分“已发布：中文下载 CTA + 64 位制品 SHA”与“未发布：明确说明 + 零 release 链接/SHA”，禁止两态并存。

提交：`635f4b1 fix-by-acceptance: keep SITE-2 release claims truthful`。

### 4. 结构扫描反例

所有反例均在独立树用精确补丁注入，观察非零退出后精确恢复；最终 scan 重新通过。

| 注入 | 实测红项 |
|---|---|
| `.work-crop { box-shadow: var(--elevation-shadow); }` | `unauthorized shadow consumption`，exit 1 |
| 交换 `original / quote` 的 `data-stage` | `evidence stage missing or out of order: quote`，exit 1 |
| 恢复一个无 SHA 的假 `.dmg` URL，同时保留“尚未发布” | `published macOS CTA requires ... artifact SHA` + `published and unpublished ... cannot coexist`，exit 1 |

另由现行 scan 常驻覆盖：额外 `.mac-window`、icon `rect`、非四路径/错误路径序列、feature/trust 卡片脚手架、archive 引用、渐变、非白名单阴影与 release placeholder。

### 5. 浏览器、键盘、响应式与 reduced motion

内置可视浏览器运行时当次没有可用实例（browser list 为空）；验收没有借用共享 Chrome，改用仓库锁定的 Playwright/Chromium，在脚本内自起 `127.0.0.1:17722` 静态服务读取 `site-dist`。这是隔离的自动化浏览器证据，不是最终产品真机截图。

五档均实测：无页面横向滚动、无越界元素、无破图或 HTTP/console/page error；因果节点在宽屏从左到右、375px 从上到下；正文、引语、承诺和 CTA 无截断。Tab 从 skip link 进入 wordmark、导航、CTA 与反馈链接；所有可聚焦链接计算为 `2px solid` focus-visible，skip link 聚焦后位于视口内。

`prefers-reduced-motion: reduce` 下，4 个 evidence step 首屏加载后全部 `is-visible`；`scroll-behavior:auto`，step/button/mark transition 均 `0s`，mark animation 为 `none`。

| 视口 | 全页截图 | SHA-256 |
|---|---|---|
| 1180×900 | `/tmp/courtwork-site-2-accept/site-2-1180.png`（1180×6836） | `09502607dda4d6de2785b7e5fd2bccb789daf916e44e599fa8195c903a6c17c8` |
| 1280×900 | `/tmp/courtwork-site-2-accept/site-2-1280.png`（1280×6854） | `b31c660b5ca3cda44076c0ea8115340022042759df081543907790d2b746acec` |
| 1440×900 | `/tmp/courtwork-site-2-accept/site-2-1440.png`（1440×6854） | `16b0b22f71af8175f09e052325f5e7f70910aefcf4f906768c48952b03543c52` |
| 1600×900 | `/tmp/courtwork-site-2-accept/site-2-1600.png`（1600×6854） | `129d0184a5917b7c3539bef7ab25216e98e438d98435049d35df4717a9708ca9` |
| 375×900 | `/tmp/courtwork-site-2-accept/site-2-375.png`（375×7645） | `b4b21870b76bf3f65df5aae028ef9a3b9360d44783f8abb60d40fb7933bb7601` |

五张逐张目视：首屏只有一张完整工作台；四节点完整；三段台账裁片均加载真实内容；窄屏改为单列且无横滚、遮挡或被裁断的证据文字。

### 6. 最终机器门

- `node site/scripts/deslop-scan.mjs`：`deslop: PASS (5 files, structure-aware exit 0)`。
- `node site/scripts/build.mjs`：exit 0；`site-dist` 已反映真实未发布状态与修正后的 mark。
- `pnpm -r build`：scope **12/13 workspace projects** 全部通过；desktop **3493 modules**，仅既有 chunk-size warning。
- `pnpm lint`：exit 0。
- `pnpm test`：**108 files / 868 tests passed**。

### 7. 放行边界

> **SITE-2A 结构放行 ✅。** `77dae47 + 635f4b1 + 3e94876 + 本验收记录` 允许合入 `main@0494f93`。

本次截图只证明 `site-dist` 的页面结构与响应式，不得作为最终官网产品截图。最终 Chat/产品截图仍须在 **Chat-UI 独立验收通过后**，于已验收提交上使用 computer use 从真实运行界面重新拍摄，并同步页面图片、alt、OG 资产；真实 macOS 制品发布后，才可恢复下载 CTA 与对应制品 SHA，再做 Pages URL 部署后复核。
