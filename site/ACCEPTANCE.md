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

---

## DESLOP-GATE-2 · 精确反 slop 门禁与交互工艺独立验收（2026-07-14）

- 验收角色：独立验收会话，非 `0a73723` 实现者，也不是上一轮拒绝报告的实现会话。
- 被验实现：`codex/deslop-gate-2@0a73723c2c61c936b86bcbcbdad1a11565c8e417`。
- 集成基线：`075d616 docs(status): advance to controlled interaction`。
- 验收分支：`codex/accept-deslop-gate-2`；独立 worktree：`/Users/lesprivilege/Projects/Courtwork-accept-deslop-gate-2`。
- 权威输入：完整复核根 `CLAUDE.md`、`AGENTS.md`、`docs/engineering/workflow.md`、`apps/desktop/SPEC.md` 的 DESLOP 契约、全部 `docs/design/*`，并逐项对照旧拒绝报告 `codex/accept-deslop-gate-1@a50c03d:site/ACCEPTANCE.md`。
- 结论：**✅ DESLOP-GATE-2 放行。** 旧拒绝报告所列整文件豁免、值域宽泛豁免、L1/archive/JS 逃逸和站点动效文件级通行证均已闭合；本轮另发现两项实现级扫描缺口，分别补红绿 fixture、实仓反例复验并独立提交。没有契约级问题或 `[需架构拍板]` 项。

### 1. 验收侧修复

验收不采信实现自述，先在真实活动文件注入反例。发现以下两项应当变红却仍为绿的实现缺陷：

1. `archive/legacy.json` 这类不带 `../` 或绝对前缀的直接消费者，能从 markdown、`href/src`、`fetch`、`import`、`require` 与 `new URL` 逃逸。验收先加失败 fixture，得到 **11 pass / 1 fail**，再把识别范围收紧到直接与带前缀路径；真实仓库八种消费者随后全部触发 `[archive-reference]`。提交：`4fd7cf5 fix-by-acceptance: catch direct archive consumers`。
2. 数据区 `.cell-peek` 可自行增加动画，而通用 popover 类才会触红。验收先加通用类与 cell-peek fixture，得到 **11 pass / 1 fail**，再明确把数据 peek 固定为静止消费者；实际加入动画后触发 `[popover-motion] data cell peek must remain static`。提交：`7dc3866 fix-by-acceptance: keep data peeks motionless`。

两项均为扫描器实现级小修复，没有扩大 token、selector、跨层接口或验收标准。修复后 fixture 为 **12/12**，完整 `site:guard` 重新全绿。

### 2. 精确白名单与结构反例

下表每项都在独立 worktree 的真实活动文件中单独注入，并以完整 scanner 或对应 guard 观察非零退出；之后精确恢复，再确认工作树没有残留。不是只调用导出的测试函数。

| 领域 | 实际注入 | 观察到的红项 |
|---|---|---|
| icon audit | 在真实 `icon-audit.css` 添加错误 selector 和裸品红 | `[raw-color] ... is not an exact docs/design/tokens.json consumer`，证明没有整文件通行证 |
| 精确 CSS consumer | 对已批准 selector 分别写错误 shadow、16px radius、完整但错误的 token gradient、含裸色 gradient | 分别触发 `[shadow]`、`[radius]`、`[gradient]`、`[raw-color]`；批准 selector 不能豁免错误 property/value |
| graph theme | 改批准 key 的值、增加错误 key、加入裸 `rgba(...)` | 三处均触发 `[raw-color]`，不存在 graph 文件级或任意 key 通行证 |
| L1 结构 | 默认/raised `SurfaceCard` 嵌套、可静态判定的 `className={...}` 嵌套，以及 HTML L1 嵌套 | 四处 `[l1-nesting]`；默认 SurfaceCard 和静态表达式不再逃逸 |
| archive 边界 | 先加“历史材料只在 archive，现行文档不引用”的政策文字，再加 markdown、href、src、fetch、import、require、new URL、path consumer | 政策文字保持绿；八种真实 consumer 全部触发 `[archive-reference]`，只存目备查不被误杀 |
| site motion | 改 observer target、删 `unobserve`、删 reduced-motion 分支、追加额外 rAF/animate | 四次均触发 `[site-motion]`；白名单锁到 observer、目标、收尾和 reduced 分支的具体 AST 形状 |
| 文案与编号 | 在首页加入 `01` 和“一站式赋能，打造革命性体验” | `[placeholder-scaffold]` 与三类 `[generic-copy]` 同时触红 |
| Pages workflow | 把完整 `pnpm site:guard` 换成 scanner-only | fixture 变为 **11/12**，`Pages deploy executes the complete root guard` 失败 |
| press | 改 selector、scale、duration、键盘边界和 reduced 分支；给 data row/table/card 增加 scale；改 token 为 130ms | `[press-feedback]` 精确触红；数据/表格/卡片、键盘与 reduced-motion 不得缩放 |
| popover | 改实际锚点方向、删 reduced 静止、给通用 `.popover` 或 `.cell-peek` 加动画 | `[popover-motion]` 精确触红；类名不能成为通行证，data peek 必须静止 |
| OS traffic | 在非 traffic selector 消费 `--mac-close`，再漂移 root token 值 | 非授权 consumer 与 token/value drift 均触发 `[raw-color]` |

最终 scanner 输出：`deslop: PASS (570 active text files; archive excluded from scan roots)`。allowlist 已按 **rule + file + selector/consumer + property + exact token/value/shape** 约束，没有以路径、函数名或类名做宽泛豁免。

### 3. 契约、token 与实际交互

- `docs/design/tokens.json` 的 `motion.press`、`docs/design/principles.md` 和 `apps/desktop/SPEC.md` 一致为 **120ms / ease-out / scale(.98)**；允许范围是主操作、图标按钮、提问选项与 popover trigger。数据行、表格单元格、卡片、键盘触发和 reduced-motion 都是零缩放。
- CSS 实现只在精确 consumer 集合的 pointer `:active:not(:focus-visible)` 上使用 `scale(.98)`；普通/quiet button 仍可保留底色反馈，但不获得缩放通行证。
- Playwright 计算样式实测：复制 icon 与“整理卷宗”主操作按下为 `0.12s`、`matrix(0.98, ...)`；承载 data-card 保持 `transform:none`。Space / Enter 触发时主操作保持 `transform:none`；reduced-motion 下 pointer 按压也保持 `none`。
- popover 实测真实锚点几何：composer plus 菜单位于 trigger 上方并使用 `popover-from-bottom`；归档确认位于 trigger 下方并使用 `popover-from-top`。reduced-motion 下为 `animation-name:none`、`transform:none`。
- graph theme、icon audit 与 macOS traffic chrome 的颜色都由精确 token consumer 约束；没有新增裸色、未授权 gradient/shadow/radius 或 OS 语义色外溢。

### 4. 隔离浏览器证据

验收没有复用共享 dev server。配置确认 `reuseExistingServer:false`，最终全量在独立端口 `127.0.0.1:1551` 启动，命令为：

```text
COURTWORK_E2E_PORT=1551 pnpm --filter @courtwork/desktop exec playwright test --workers=1
```

原始输出明确为 `Running 200 tests using 1 worker`，最终 **200 passed (2.7m)**。

定向交互首轮在另一独立端口得到 50/51；唯一失败是既有 `openWorkbench` 启动竞态，trace 停在 welcome，未触及本工单断言。该例随后换新独立端口 `--repeat-each=3 --workers=1` 为 **3/3**，最终 200/200 单 worker 全量也覆盖并通过。一次误传参数而以 4 workers 完成的 200/200 仅作辅助，不计作本节所需的单 worker 证据。

实现阶段曾报告的 `:1420` 运行结果无法证明独立服务边界，**本验收明确作废且不计数**；放行只采用上述 `:1551`、`reuseExistingServer:false`、单 worker 的独立全量证据。

本验收没有制作或冒充最终产品截图；最终 screenshot 由架构角色在放行 tip 上另行完成。

### 5. 最终顺序门禁

在两枚验收修复后的代码 tip 上，严格按指定顺序逐项实跑，原始结果如下：

1. `pnpm site:guard`：exit 0；Node fixture **12/12**，scanner **570 active text files**；neutral **103 src files**、elevation、signature 与 motion 四门均通过。
2. `pnpm site:build`：exit 0。
3. `pnpm lint`：exit 0。
4. `pnpm -r build`：exit 0；scope **12 of 13 workspace projects**，desktop **3493 modules**；只有既有 dynamic-import/chunk-size warning。
5. `pnpm test`：exit 0；**110 files / 908 tests passed**。

报告提交后同一验收 tip 还需保持上述顺序门禁全绿；任何后续实现改动都必须重新独立验收，不得沿用本报告结果。

### 6. 放行边界

> **DESLOP-GATE-2 放行 ✅。** `0a73723 + 4fd7cf5 + 7dc3866 + 本验收记录` 允许进入架构合流；旧 `a50c03d` 拒绝项已逐条关闭。

本结论只覆盖精确 anti-slop scanner、Pages 完整 guard、press feedback、popover 锚点动效、reduced-motion 与本工单定义的 token/consumer 边界；不替代 SCHEMA-POLISH 的视觉审计，也不授权新增空壳面板、装饰卡、品牌反色方案或其他未验收契约。
