# ACCEPTANCE: site

验收记录按工单追加；每节必须明确回答结构是否允许合入 `main`。官网发布与真实制品链接另需在部署后复核。

---

## SITE-GEN-1 · 多场景泛化台账独立验收（2026-07-14）— ✅ 放行

- **验收角色**：独立验收会话，未参与实现；不采信实现自述。
- **被验实现**：`f47bdb4ff4b380dd45ec710177209645a9d2a9cb`，基线 `868a75cc24527d129525803a04d8fb4ab6c2c2d5`。
- **隔离环境**：分支 `codex/accept-site-gen-1`；独立 worktree `/private/tmp/courtwork-site-gen-1-acceptance`；浏览器服务使用独立 `127.0.0.1:1641`，验收后已停止，未复用或触碰长期 `:4177`。
- **实现级修复**：无。未改变 schema 字段、统计口径、跨层接口或 SPEC 验收标准。

### 1. fixture claim validator 实际 mutation

验收用临时探针深拷贝权威输入并逐项注入反例，每次都让同一个 `validateFixtureClaims` 返回对应 failure；探针随后删除，工作树无 mutation 残留。

| mutation | 实际红灯 |
|---|---|
| CaseFile 删除一项、与 `dossier/*.md` 集合不等 | `CaseFile fileIds must equal ... dossier markdown file set`，并报页面 20 / fixture 19 |
| 页面 Timeline `47 → 46` | `timeline-events: page claims 46, fixture has 47` |
| 删除一条 Timeline `contradiction` marker | `contradiction-events: page claims 8, fixture has 7` |
| 页面主体 `14 → 15` | `party-nodes: page claims 15, fixture has 14` |
| 单位“个矛盾事件”改为“个矛盾” | `visible unit must be 个矛盾事件` |
| `prd-finding-05` UTF-16 start `+1` | 锚点不能逐字切片闭合 |
| `textLayerVersion` 改为假 full hash | full material hash 不匹配 |
| anchor `fileId` 改为 `02-feedback.md` | 锚点文件/文档与逐字切片闭合失败 |
| finding `pending → confirmed` | catalog findings 必须 pending；页面 wire metadata 同时漂移 |
| descriptor `scenarios` 非空 | descriptor 必须保持 scenario/prompt-free |
| descriptor `promptSegments` 非空 | descriptor 必须保持 scenario/prompt-free |
| 页面 `catalog → live` 并改成 Live 文案 | 必须显示精确 catalog preview 边界且不得声称 live |
| fixture 文件集加入 `priority-score.json` | PM catalog 固定文件集 / PriorityScore 边界失败 |
| 页面分别注入 `RICE`、`P0`、`公式` | 三项分别触发“不得虚构 score / formula / rank / band” |

另将真实 `site/index.html` 的 47 临时改为 46，在 `site-dist` 放入 `acceptance-sentinel` 后执行 `pnpm site:build`：构建以 fixture claim error 非零退出，sentinel 仍存在，证明 validator 在 `rmSync(site-dist)` **之前**执行。页面与产物目录随后精确恢复。

### 2. 结构、依赖与静态减法

- HTML 恰有一个 `data-site-generalization`，其 `.scenario-rows` 恰有三条连续 `.scenario-row`：合同审查、卷宗阅卷、PM 决策；阅读顺序就是 DOM 顺序。
- 全页仍恰有一个 `.mac-window`；本提交未新增 feature/trust/card grid、`01/02/03` 编号脚手架、button/input/select/textarea、`role="button"`、`tabindex`、动画或可点击假控件。
- `site/main.js` 未进入实现 diff；实现与基线 SHA-256 均为 `8ef0eb00a49ab5d8954c6a3c6465e65720a4d4a9805fb54d8b63ba8780ae5f19`，逐字节相同。
- 合同段只复用已验收 Evidence Line 语义；站点没有消费 `@courtwork/legal/testing` 或任何 Legal `/testing` 修订草稿。fixture validator 读取 `packages/demo-data` 的权威 Legal/PM artifact 与原文，不把测试草稿升级为官网真值。
- PM 明确显示 `Schema catalog preview / 尚未接通运行链`；descriptor 的 scenario/prompt 仍为空，页面不出现 PriorityScore、RICE、P0、排序、排名或公式。

### 3. 独立 Chromium 响应式、无 JS 与可访问性

按主会话指示使用仓库锁定的 Playwright Chromium，不使用 browser-client。八档均从独立静态服务读取真实站点文件，并保存全页截图到 `/private/tmp/courtwork-site-gen-1-screens/`（不写站点资产）。

| 视口 | 页面/内容检查 | 截图 SHA-256 |
|---|---|---|
| 375 | PASS | `a5813778719dd3b3ed1e75da49efaa3bf4eb9f4dc68959e823235ae1374d3ba1` |
| 540 | PASS | `29519e1b63ccae4376fdaaec2b905fb8059bf03fe48276dc0a5ac1b3b0ecda35` |
| 760 | PASS | `6a362e4e7804ddad18b55e53d65b767df9b9f3f10e7738b93b947582dd43ad9b` |
| 900 | PASS | `4373d85aa8a6462aa574df92780e41ddc5b8b0650298e7957f7f69427d79f0b1` |
| 1180 | PASS | `c660b1dc0f13a8b33ba990fda46ab35801bd8c947dfa95417cfdc5955859ef72` |
| 1280 | PASS | `e941687b7350c9ad5c535cf2b4c80f18c8f5f8aa361a42fdbac3239f0aa737ed` |
| 1440 | PASS | `70e1815bbe9946dddc113b69a68b3ef59ee3ecb7e72febb2becc29081bb16fb1` |
| 1600 | PASS | `c2a4c21c0ac768fd55856ee039c099e0891bdbc78ab6e9ce27260facf42919c3` |

每档实测 `documentElement/body scrollWidth === clientWidth`、越出视口元素 `[]`、内部 overflow `[]`、三行互不重叠；fixture 文案、长中英 label 与四个计数完整可见。375 下 PRD 原句与建议自然换行；其余宽度按可用空间排版，无截断。八张均经 `view_image` 人工目检，连续台账、分割线和宽窄屏层级无隐藏遮挡。

- **JS disabled**：375 与 1280 均保留 3 条泛化台账、4 条 Evidence、4 项承诺与 2 个下载入口，所有 fixture 文案完整。
- **reduced-motion**：媒体条件命中，`document.getAnimations({subtree:true}) = 0`，scroll behavior 为 `auto`，新区块所有 transition duration 均为 `0s`。
- **键盘**：9 个真实链接依 DOM 顺序逐一获得焦点，全部命中 `:focus-visible` 且 outline 非零；泛化台账自身无交互元素。
- **语义**：section 的 `aria-labelledby=scenarios-title` 有效；三条 proof 均有明确 `aria-label`；4 张内容图 alt 完整，wordmark 装饰 icon 使用空 alt。

### 4. 最终机器门

| 门禁 | 实跑结果 |
|---|---|
| `pnpm install --frozen-lockfile` | 14 workspace projects，1047 packages，exit 0 |
| `pnpm site:guard` | node tests **21/21**；deslop **682 active text files**；neutral/elevation/signature/motion 全绿 |
| `pnpm site:build` | exit 0 |
| `pnpm -r build` | 13/14 workspace projects 通过；desktop **3532 modules**；仅既有 Tauri import 与 chunk-size warning |
| `pnpm lint` | exit 0 |
| `pnpm test` | **131 files / 1127 tests passed**，exit 0 |

本工单只修改 `site/` 静态 HTML/CSS、fixture validator 与站点 build/guard，没有 desktop 行为或共享 desktop CSS/JS 变化；按验收委派不重复运行 209 条 desktop E2E。

### 5. 结论

> **SITE-GEN-1 放行 ✅。** `f47bdb4` 的三个连续场景台账可以合入 `main`。Legal 计数与 PM 锚点/状态/catalog 边界均由权威 fixture 与可触红的构建门锁定；页面诚实证明同一宿主的泛化能力，没有把 catalog 包装成 live，也没有以评分公式或视觉脚手架补位。

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

---

## SITE-2B · 已验收主树真机证据刷新独立验收（2026-07-14，纯追加）

- 验收角色：未参与 SITE-2B 实现的独立验收者。
- 独立 worktree：`/Users/lesprivilege/Projects/Courtwork-accept-site-2b`；分支：`codex/accept-site-2b`。
- 被验实现：`cb6e8198f0e73bd9b71cca67a1ef58dd43e55151`，父提交为已放行 CHAT-UI `ce09110ddb930f9a4bc91f1cc0b709c6bb604b32`。后续 canonical OG 提交 `1983a6bd540b1d4fd1d9e1802afabb8dc111ddd9` 为 `cb6e819` 直接后继，已在验收分支 fast-forward 后一并验收。
- 实现范围：`site/index.html`、`site/SPEC.md`、四枚新 WebP；OG 增量另含 `site/assets/og.png` 与 SPEC 一行。验收没有修改下载 CTA、发布状态、站点结构或契约。

### 1. 总结论

> **SITE-2B 放行部署 ✅。** 真机证据刷新与 canonical OG 可以进入 Pages 部署；页面仍必须保持“macOS 制品尚未发布”，本结论不授权创建 Release、恢复下载 CTA 或宣称已有 macOS 制品。

Hero、坐标与确认台账已经改用同一轮已验收主树真机帧；页面仍只有一个完整 `.mac-window`，没有新增 feature card、第二个窗口或营销脚手架。独立验收发现一项实现级资产格式缺陷：`1983a6b` 的 `og.png` 实质为 JPEG。已在不改变解码像素的前提下修复为真实 PNG，提交为 `9c2eb158f176e1e2328873d4dc8598a12296353a`（`fix-by-acceptance: store OG asset as real PNG`）。无契约级问题或 `[需架构拍板]` 项。

### 2. 真机源帧与 WebP 忠实度

派单给出的两枚源文件校验和现场复核一致：

- `accepted-workbench-2026-07-14.png`：`0a4e70a4b4d3402844f291ae488e2457b55c46a8e23cc8471cb9a8bedc24ee8d`；
- `accepted-confirmed-anchor-2026-07-14.png`：`bbb3f0da2649ca9746e5f7ced7e57c036e010c5e1b1101dc46c0e696cad2b4b2`。

两文件名虽为 `.png`，实际容器均是 1280×720 baseline JPEG；本报告按真实格式记录，不把扩展名冒充编码。四枚站点 WebP 均由 `dwebp` 实际解码成功：1280 档为 1280×720，720 档为 720×405，均为单帧 lossy WebP。与对应源帧解码像素对比：

| 资产 | SHA-256 | 对源 PSNR |
|---|---|---:|
| `08-interaction-evidence-1280.webp` | `f44450e7e8aca9aed995474617326b2a899207b813c3ad07ec9dcecb62c841be` | 43.340 dB |
| `08-interaction-evidence-720.webp` | `4d851386d366c235cd4fbb47a132fbbb185cd1ac547e39260feff49bda489ebe` | 35.460 dB |
| `09-source-confirmed-1280.webp` | `bece439d672c447d9a9555b2bd91ff92ade8311cd77daeabd82babcc81e0f62f` | 43.602 dB |
| `09-source-confirmed-720.webp` | `b993035f8a89ec526fd3c2ab6e27473f8ca0dbb582189c946bd7c6a7df55cd7e` | 34.727 dB |

四枚图逐张目视与源帧一致：08 为待选择的通用交互卡与右侧风险/依据工作面，09 为已记录人工确认、完整引语和右侧原件精确高亮；没有 API key、Authorization、Bearer token 或真实客户信息。二进制 strings 敏感模式扫描亦无命中。

### 3. 页面结构、fixture 与叙述真实性

- DOM 静态与浏览器实测均为 `.mac-window = 1`、`.work-row = 3`、`.work-crop = 3`、证据节点 4 个。Hero 使用 09 的确认+原件帧；“坐标”复用 09，“确认”使用同轮 08，未出现第二层窗口或新卡片。
- Hero figcaption 如实写 `1280 × 720 · 已验收主树`，`width/height` 与文件一致；两档 `srcset` 在 375px 实际选择 720，在 1280px Hero 实际选择 1280。三处新 alt 分别说明人工确认记录、原件高亮、封闭选项/来源锚点，没有写成模型自动裁决。
- 首页原件句子可逐字追到 `packages/demo-data/data/dossier/04-设备采购合同.md:40` 与 `risk-list.json`；`04-设备采购合同 · 第 1 页` 与现有 S3 reading fixture 的 `第 1 / 2 页` 一致。页面无伪 release、伪 `.dmg`、自动确认或替用户裁决叙述。
- 现场在真实 `site/index.html` 注入第二个 `.mac-window`，scanner 实际以 `exactly one complete workbench window is allowed` 非零退出；恢复后 `deslop: PASS`。这证明结构门不是只运行绿例。

### 4. canonical OG 反例与修复

`1983a6b` 的 OG 画面为正确 1200×630、无 404 文案，wordmark 左侧是四路径核心 icon，没有旧 navy square/底盘；但独立格式断言实际得到 `format=JPEG` 并以 `expected PNG bytes, got JPEG` 失败。该提交中伪 `.png` 的 SHA-256 为 `bd058c63bbe3b805ddb8a692023ab6dfc4bccf81db4e7554a95650058dc1ae30`。

验收修复只把同一解码像素封装成真实 PNG：新 SHA-256 为 `5ffed8cb6b389f95f7cb22687f0ad5ea82707ca9d5f7380bfec5a5795ad2970f`，Pillow 与 `file` 均识别为 1200×630 RGB PNG，源 JPEG 与新 PNG 解码后的 `ImageChops.difference().getbbox()` 为 `None`。`site:build` 后源/产物 `cmp` 相同，经 HTTP 返回 `Content-Type: image/png` 且可解码；没有引入画面变异。

### 5. 隔离浏览器、键盘与 Pages 子路径

Codex in-app Browser 运行时已按技能说明连接，但 `agent.browsers.list()` 为空；本验收没有冒充 in-app Browser 证据，也未复用共享 Chrome。回退使用仓库锁定的 `@playwright/test` Chromium，并在独立 `127.0.0.1:17724` 自起静态服务，目标 URL 为模拟 GitHub Pages 项目子路径的 `http://127.0.0.1:17724/Courtwork/`。

逐屏滚动触发 lazy-load 后，两档全部图片 `complete && naturalWidth > 0`，所有资源 HTTP 200，无 failed request、console error 或 page error；`documentElement/body.scrollWidth` 均等于 viewport，越界元素为 0。

| 视口 | 全页截图 | 尺寸 | SHA-256 |
|---|---|---:|---|
| 375×900 | `/tmp/courtwork-site2b-final-375.png` | 375×7265 | `666520a1deb1cc313c9a7cfec2149660f9371da780bd23e89f03eee919684fae` |
| 1280×900 | `/tmp/courtwork-site2b-final-1280.png` | 1280×6424 | `38a4373e1925985516c362c948e3a186a962fba1e99bb8b2061902dcec5ff433` |

两张逐张目视：首屏为 09 完整工作台，坐标与确认两枚承重裁片均已加载且可辨；375px 单列、1280px 双栏无横滚、遮挡、空白 lazy 图或截断的核心文字。

键盘从页面顶部 Tab：第一个焦点是可见 skip link（top 16px），随后 wordmark、导航和 CTA；抽验焦点均为 `2px solid` focus-visible。`prefers-reduced-motion: reduce` 下 4 个节点直接 `is-visible`，`scroll-behavior:auto`，step/button transition 为 `0s`，主按钮 transform 为 `none`。关闭 JS 后 h1、4 个证据节点、4 项承诺、未发布说明和全部图片仍完整。

生产 HTML 的 `src/href` 无根绝对路径，CSS、JS、icon 与截图都从 `/Courtwork/` 下相对解析并实测 200；canonical OG URL 为 `https://lesprivilege.github.io/Courtwork/assets/og.png`。因此当前资源路径可部署到 GitHub Pages 项目子路径。

### 6. 发布真值

验收当时只读查询 `gh release list --repo lesPrivilege/Courtwork` 无条目；GitHub API releases 长度为 0，`releases/latest` 为 HTTP 404。首页在 Hero 与 closing 两处明确写“macOS 制品尚未发布”，只有 GitHub 源码 CTA，无 release tag、`.dmg` URL 或制品 SHA。SITE-2B 可以部署页面，但不能据此宣称 macOS 已发布。

### 7. 最终机器门与提交卫生

- `pnpm install --frozen-lockfile`：13 个 workspace project、1047 个包，lockfile 无改写。
- `pnpm site:guard`：exit 0；scanner fixture **12/12**，`deslop: PASS (585 active text files)`，desktop neutral/elevation/signature/motion 四门通过。
- `pnpm site:build`：exit 0；`site-dist/assets/og.png` 与源文件逐字节一致。
- `pnpm lint`：exit 0。
- `pnpm -r build`：exit 0；scope **12/13 workspace projects**，desktop Vite **3504 modules**；只有既有 dynamic-import/chunk-size warning。
- `pnpm test`：新 worktree 在尚无 workspace dist 时首跑有 46 个 suite 收集失败，原因均为内部包入口未构建；当时已运行 **585/585** 无行为失败。完成全仓 build 后原命令复跑：**114 files、981/981**，exit 0。环境性首跑不冒充通过，也不列为 SITE-2B 产品缺陷。
- `git diff --check`：通过。验收修复提交只暂存 `site/assets/og.png`；没有触碰 CTA、HTML、CSS、JS、四枚 WebP 或跨层契约。

### 8. 放行边界

本轮只放行 SITE-2B 的真机证据刷新、canonical OG 与当前未发布状态下的 Pages 站点部署。后续若创建真实 Release，必须在真实制品、校验和与下载目标成立后另行更新 CTA，并重新执行发布态 claim guard 与线上 URL 复核；不得沿用本报告把未发布页面直接改写为已发布。

---

## SITE-CRAFT-1-ACCEPT · Pages 三处巧思独立验收（2026-07-16）— ❌ 不放行

- **验收角色**：独立验收会话，未参与 `SITE-CRAFT-1` 实现；不采信实现自述。
- **被验实现**：`impl/site-craft-1@134796ba2237a3511056e905f03aa6cd35290a04`，实现基线 `31123fc`；已由 `b31dad6` 合入 `main`。
- **验收尖端**：从 `5a1fcf71eb55b48a35f379fdc93daa031068da20` 建立独立 clean worktree `/Users/lesprivilege/Projects/Courtwork-site-craft-1-accept-5a1fcf7`，分支 `codex/site-craft-1-accept`；静态站只使用独立 `127.0.0.1:17416`。
- **权威契约**：`docs/design/site-evidence-line.md` 的 2026-07-15 Pages 动效例外与本 SPEC 的 `SITE-CRAFT-1` 节；验收没有改写动效契约、跨层接口或 `docs/status/current.md`。

### 1. 总结论

> **SITE-CRAFT-1 不放行 ❌。** Typer、正常态 Ghosty、Satin CTA、JS 关闭退化、数据区静止、AST 锁、构建资产与全量机器门均通过；但 Ghosty 的 reduced-motion 分支只有 `transition: opacity 0.42s` 声明，实际首个可观察 frame 起即为 `opacity:1`，没有发生 SPEC 要求的 opacity 淡入。实现证据把“存在 transition 声明”写成“退化为 opacity 淡入”，与独立逐帧实测不一致。

这是实现行为缺口，不由验收会话把“直接全显”等价改写为“opacity 淡入”。若架构希望 reduced-motion 直接全显也合规，必须先修改权威验收契约并重新派单；否则实现需让淡入真实发生，且不得放宽精确 motion 锁或波及卷宗数字区，之后重新独立验收。

### 2. 范围、依赖与提交事实

- `git diff 31123fc..134796b` 恰为 **20 files changed, 171 insertions, 15 deletions**；20/20 全在 `site/`。
- `apps/desktop/`、`packages/*`、`docs/status/current.md` 均为零触碰；`pnpm-lock.yaml`、根 manifest、workspace 与 `site/package.json` 无差异。
- `pnpm install --frozen-lockfile` 成功：14 个 workspace 范围、1047 个包全部复用，lockfile 无改写。
- 合并提交 `b31dad6` 的第二父为 `134796b`；`134796b`、`b31dad6` 与验收尖端 `5a1fcf7` 均为 `main` 祖先。

### 3. deslop AST 锁与真实漂移红测

逐行比较 `31123fc..134796b` 的 `deslop-scan-lib.mjs` 与 fixture：`canonicalSiteMotion` 的语义扩展只有两点——在脚本首行加入 `document.documentElement.classList.add('js')`，以及把同一个 observer/reduced-motion 收尾链的目标从 `.evidence-step` 扩为 `.evidence-step, [data-reveal]`；对应变量名由 `steps/step` 改成 `revealTargets/target`，阈值 `0.55`、相交判断、`is-visible` 收尾与 `unobserve` 形状均未放宽。`deslop-scan.test.mjs` 只同步 canonical fixture 并新增两条对应反例。

验收在真实活动文件逐项注入、观察非零退出，再用反向 patch 完整撤除：

1. `site/main.js` 去掉 `, [data-reveal]`：exit 1，命中 `[site-motion]`；
2. 去掉 `.js` 旗标行：exit 1，命中 `[site-motion]`；
3. `site/styles.css` 新增一个 `linear-gradient(...)`：exit 1，同时命中顶层 banned tell 与 `[gradient]`；
4. 新增一个 `box-shadow: 0 2px`：exit 1，同时命中 unauthorized shadow 与 `[shadow]`；
5. 另注入 `color: #123456`：exit 1，同时命中 raw hex 与 `[raw-color]`。

全部反例撤除后 `git diff --check` 通过、工作树恢复 clean，deslop 重新全绿。指定尖端的实跑扫描数为 **731 active text files**，不是派单中预期的 730；本报告按仓库事实记录，没有改门禁计数口径。

### 4. 三效果与三态浏览器实测

同一 `site-dist` 与独立端口在 1280×860 下由 in-app Browser 逐帧实看，并以仓库锁定的 `@playwright/test` Chromium context 补齐 Web Animations API、reduced-motion 与 JS 关闭量测。

**Typer**

- 正常态约 220ms：十个 `.tc` 各有 1 条动画，`document.getAnimations()` 为 **10**；前段字符已进入藏青反色/pill 状态，后段仍为 opacity 0，左右错峰肉眼可辨。
- 收尾后十字均为 `color:rgb(10,37,64)`、透明背景、opacity 1；`h1.textContent` 与 `aria-label` 都完整为“模型只生成，不裁决。”。
- reduced-motion 媒体查询真实命中：整页与十个字符 `getAnimations()` 均为 **0**，`animation-name:none`，十字直接以 `rgb(10,37,64)` / opacity 1 定格。

**Ghosty**

- 正常态初始 observer 未命中时为 `mask-position:0px 100%`、`mask-size:100% 300%`；滚入后实看约 `50.4%` 的中扫帧，再收尾到 `0px 0px` 全显。仓库 hidden/midsweep/revealed 三图两两均有明确像素差（changed channels 26.282% / 39.086% / 29.295%），与实看顺序一致。
- reduced-motion 下三图都计算为 `mask-image:none`、`opacity:1`，声明 `transition:opacity 0.42s cubic-bezier(...)`；但验收从页面脚本前安装只读逐帧采样，首个样本 `t=29.7ms` 到 `t=664.4ms` 共 **40** 帧全部为 opacity 1、动画数 0，中间 opacity 样本为零。故“直接全显”成立，“opacity 淡入”不成立。
- 卷宗统计 20/47/14/8 四项逐一为 `getAnimations()=0`、`animation-name:none`、`transition-duration:0s`、`transform:none`；数据区未被媒体例外波及。

**Satin CTA**

- 主按钮本体为 `rgb(10,37,64)`，文字为 `rgb(246,249,252)`；`isolation:isolate`、`overflow:hidden` 保证伪元素留在按钮内，`::before/::after` 均 `z-index:-1`，文字位于材质之上。
- `::before` 为 `--bg-app` 派生的 12% 静态上部高光，`::after` 为 55% 顶缘细线；两者 `animation-name:none`，无 gradient、shadow 或新 raw color。
- `before-cta.png` 与 `after-cta.png` 同为 760×43；逐通道比较有 **8.237%** 通道变化、平均绝对差 2.358、最大差 142，主按钮顶缘/上半部材质肉眼可辨，文字清晰。

**JavaScript 关闭**

- `documentElement.className` 为空、无 `.js`；等待 Typer 定格后 H1 十字均 opacity 1，文本与 `aria-label` 完整。
- 三张 `.work-crop` 图片均 `mask-image:none`、`opacity:1`、`visibility:visible`、`display:block`；naturalWidth 均为 640，内容实际解码并完整可见。

### 5. 证据与构建资产复核

- `craft-evidence/SITE-CRAFT-1/` 的 Typer 闪烁/定格、CTA 前后与 Ghosty 三态截图已逐张目视；除 reduced opacity 行为措辞外，画面与正常态、JS 关闭实测一致。
- `measurements.json` 的 Typer 10/0、Ghosty mask/size/position、CTA 静态背景、HTML `.js` 与整页 reduced 动画 0 均可复现；它只记录了 `transition` 声明，没有逐帧证明 opacity 曾低于 1，因此不能支持 README/SPEC 的“淡入”结论。
- `node site/scripts/build.mjs` exit 0；`site-dist/assets/ghosty-mask.svg` 存在且与源资产逐字节 `cmp` 相同，固定拷贝清单生效。

### 6. 架构已批清理

全站 `rg` 只在 SPEC 提案与 CSS 声明命中 `.text-link`，无 HTML/JS 消费者。验收按明确批准删除死 CSS，并同步关闭 SPEC 的偶然复杂度提案；提交为 `73f9f9bf582cca2116f9888681b08e73e03f6e7d`（`fix-by-acceptance: remove dead site text-link style`）。该提交只含 `site/styles.css` 与 `site/SPEC.md`，提交 tip 的 deslop 与站点 build 均通过。

### 7. 全量机器门

- `pnpm site:guard`：exit 0；Node fixture **31/31**，release-truth PASS，deslop **731 active text files**，desktop neutral/elevation/signature/motion 四门全绿。
- `pnpm lint`：exit 0。
- `pnpm -r build`：exit 0；scope **13/14 workspace projects**，desktop Vite **3540 modules**；只有既有 dynamic-import/chunk-size warning。
- `pnpm test`：exit 0；**139 files / 1204 tests**。
- `git diff --check`：通过；未更新 `docs/status/current.md`，未推送。

### 8. 不放行边界

`134796b + 73f9f9b + 本验收记录` 当前不得作为 `SITE-CRAFT-1` 放行依据。修复只需关闭 reduced Ghosty 实际行为与书面契约的差距；不得借机改变正常态 Typer/Ghosty、CTA 材质、卷宗数字静止边界、observer 精确 AST 锁、发布真值或产品壳。任何实现修订都必须在新的独立 clean worktree 重新注入 drift/guard 反例、复测三态并出具独立验收结论。

---

## SITE-CRAFT-1-REACCEPT · reduced-motion 裁定后复验（2026-07-16）— ✅ 放行

- **架构裁定**：`47c9c6bdd7c0bed34f4c9c8ad107c90eb071d44b` 将 reduced-motion 合规标准明确为直接全显（0ms）；淡入非必需，但声称必须与实测一致，永不触发的过渡声明须删。
- **复验对象**：`134796b` 的 SITE-CRAFT-1 实现、既有验收清理 `73f9f9b`，以及本轮修复 `7f6d1b631b587e5f492321d1fc2e7acb6d734328`（`fix-by-acceptance: align reduced Ghosty with direct reveal`）。
- **隔离环境**：原独立 worktree `/Users/lesprivilege/Projects/Courtwork-site-craft-1-accept-5a1fcf7` 与分支 `codex/site-craft-1-accept` 已 fast-forward 到 `main@47c9c6b`；静态站只使用独立 `127.0.0.1:17417`，未触碰共享树。

### 1. 总结论

> **SITE-CRAFT-1 放行 ✅。** 首轮唯一拒绝项已经按架构新裁定闭合：reduced Ghosty 从首帧起无遮罩、无预隐藏、无活动动画，0ms 直接全显；CSS、SPEC、README 与 measurements 的声称现与实测一致。正常态 Ghosty 三态未回归，Typer、Satin、JS 关闭、数据区静止、AST 锁与首轮其余通过项继续有效。

### 2. fix-by-acceptance 范围

`site/styles.css` 的 reduced media block 只保留 `-webkit-mask-image:none` 与 `mask-image:none`；删除三处死行为：`opacity:0`、`transition:opacity 420ms ...` 与 `.is-visible { opacity:1 }` 翻转。正常态 `mask-position 900ms` 过渡及 observer 形状未改。

同步修改四个受控文件：

- `styles.css` 注释改为“取消遮罩并直接全显（0ms、零运动）”；
- `site/SPEC.md` 两处 reduced 声称改为 `mask:none` / `opacity:1`、无 opacity transition、活动动画 0；
- `craft-evidence/SITE-CRAFT-1/README.md` 使用相同口径；
- `measurements.json` 记录 opacity 1、opacity transition absent、active animations 0 与 `direct full visibility (0ms)`。

正常态所需的 base `mask-position 0.9s` 声明仍可出现在 computed style；reduced 下遮罩已取消且不存在 mask/opacity 状态差，逐帧 `getAnimations()` 恒为 0。报告没有把“无活动动画”误写成不存在正常态 base 声明。

### 3. reduced-motion 逐帧复验

仓库锁定 Chromium 在 1280×860、`prefers-reduced-motion:reduce` context 下，从页面脚本执行前安装只读 rAF 采样：

- `t=32.5ms` 至 `t=713ms` 共 **41 帧**；每帧均 `opacity:1`、`mask-image:none`、元素动画数 0；违例样本为 0。
- `document.getAnimations()` 为 0；三张 `.work-crop` 逐一滚入完成 lazy-load 后 naturalWidth 均为 640，且全部 opacity 1、mask none、动画 0。
- 页面没有 reduced 预隐藏、遮罩扫动或 opacity 淡入；声称与 0ms 直接全显行为一致。

### 4. 正常态回归复验

另起 `no-preference` context，等待初始武装稳定后复测第一张 Ghosty：

- 隐藏预态：无 `.is-visible`，`mask-position:0px 100%`，活动动画 0；
- 触发后：从 100% 开始显影，220ms 中间帧为约 `23.97%`，活动 mask 动画 1；
- 收尾：`mask-position:0px 0px`，活动动画回到 0。

因此本轮只删除 reduced 死 opacity 过渡，没有改变正常态隐藏→中扫→全显链。

### 5. 门禁与放行边界

- 既有 Node 测试：**31/31**，exit 0。
- `pnpm site:guard`：exit 0；release-truth PASS、desktop neutral/elevation/signature/motion 四门全绿。当前 main 新增活动文档后 deslop 实跑为 **733 active text files**；派单中的 731 是上一尖端计数，本报告不改写仓库事实。
- `pnpm site:build` / `node site/scripts/build.mjs`：exit 0；`site-dist/assets/ghosty-mask.svg` 与源资产逐字节相同。
- `git diff --check`：通过；未推送，验收分支之外零写入。

放行只覆盖 `47c9c6b` 裁定后的 SITE-CRAFT-1：Pages 展示站 Typer、Ghosty、Satin 及其 reduced/JS-off 边界。不授权把媒体层动效回迁产品壳，也不改变卷宗数字绝对静止、发布真值或 deslop 精确 AST 锁。

---

## SITE-CRAFT-1-FADE-ACCEPT · deecb52 独立终局验收（2026-07-16）— ✅ 放行

### 1. 对象、隔离与范围

- **验收对象**：`impl/site-craft-1-fade@deecb52`；独立 clean worktree checkout 为 `main@ff12539`，目标提交已在其祖先链，未采信实现会话自述。
- **范围证据**：`git diff 357ae1d..deecb52 -- site` 恰为 5 个文件，全部位于 `site/`：`SPEC.md`、`craft-evidence/SITE-CRAFT-1/README.md`、`craft-evidence/SITE-CRAFT-1/measurements.json`、`scripts/deslop-scan.test.mjs`、`styles.css`。`git diff --quiet 357ae1d..deecb52 -- site/main.js` 通过；三枚 `site/main.js` blob（基线、实现 tip、验收 HEAD）均为 `6d97484f5c6c79f6051328910cfc6973f85bd46f`。package manifest 与 lockfile 无差异，零新依赖。
- `site:build` 产物中的 `assets/ghosty-mask.svg` 与源资产逐字节 `cmp` 通过；`git diff --check` 通过。

### 2. reduced-motion 逐帧实测

仓库锁定 Chromium **149.0.7827.55**，`1280×860`，独立静态服务 `127.0.0.1:18417`，`prefers-reduced-motion: reduce` context；从页面初始化前安装 rAF 采样，并滚动三张 `.work-crop` 使图片实际解码。

- 共 **43 帧**（`t=0` 至 `704.5ms`）；每一帧 `CSSAnimation` 恰为 **3**，动画名均为 `ghosty-reduced-fade`；全程 `CSSTransition=0`，无 transition property 样本。
- **24 帧**存在 `0 < opacity < 1`；其中 **22 帧**三张图均已加载，代表中间帧 `t=71.2ms` 的三图 opacity 均为 **0.462888**。`getKeyframes()` 实测属性集合只有 `opacity`；三图全程 `mask-image:none`、`transform:none`、computed `transition-duration:0s`。
- 收尾三图均 `opacity:1`、`naturalWidth:640`；reduce 采样期间卷宗四项数字的动画向量恒为 **`0,0,0,0`**，每项 computed `animation-name:none`、`transition-duration:0s`、`transform:none`。

### 3. 正常态与 JS 关闭回归

- `no-preference` 独立 context 共 **74 帧**：隐藏 **13** 帧（初始 `mask-position:0px 100%`），中扫 **53** 帧（首末约 `92.0245% → 0.000075685%`，代表帧 `0px 3.40174%`，活动 CSSTransition 恰 **1**），全显 **8** 帧（`0px 0px`）。正常态所有帧均未出现 `ghosty-reduced-fade`，故 reduced keyframe 没有回流到正常态。
- JS 关闭 context：`documentElement.className` 为空、无 `.js`；H1 文本与 `aria-label` 均为“模型只生成，不裁决。”；三图均 `opacity:1`、`mask:none`、`animation:none`、`naturalWidth:640`。

### 4. 契约反例触红

- 临时移除 reduce 块的 `transition:none`：`node --test site/scripts/deslop-scan.test.mjs` 观察到 **21 pass / 1 fail**，失败命中新增 Ghosty CSS 契约断言；还原后 **22/22**。
- 临时把 `.is-visible img` 的 `ghosty-reduced-fade` keyframe 改回 `transition`：同样观察到 **21 pass / 1 fail**；还原后 **22/22**。反例均在验收 worktree 内完成并恢复，未进入报告提交内容。

### 5. 全量门禁与交叉证据

- `pnpm site:guard`：exit 0；Node **32/32**、release-truth PASS、deslop PASS（完整实跑 **739 active text files**）、desktop neutral/elevation/signature/motion 四门全绿。
- `pnpm site:build`：exit 0；`pnpm lint`：exit 0；`pnpm -r build`：exit 0，scope **13/14 workspace projects**，仅既有 Vite chunk-size/dynamic-import warning。
- `pnpm test`：exit 0，完整实跑 **140 files / 1210 tests**；本次记录以实跑数字为准，不沿用实现声称的 139/1204。
- 部署复核曾在 [`release/DEPLOYMENT.md`](../release/DEPLOYMENT.md) 的 SITE-CRAFT-1 节捕获旧实现的不可见 `mask-position` 幽灵过渡；本节逐帧证明当前 reduce consumer 已显式 `transition:none`，该证据链现已闭合。

### 6. 裁决

> **SITE-CRAFT-1-FADE 放行 ✅。** reduced-motion 现在是三条真实渲染的 420ms opacity keyframe，遮罩、位移与 CSSTransition 均为零；正常态三态、JS 关闭、卷宗数字静止、`main.js` AST/blob 锁、契约反例与全量门禁均通过。

本次只写入本验收记录；未更新 `docs/status/current.md`，未推送。

---

## SITE-CRAFT-2-FONT-PROVENANCE-REACCEPT · 单点复验（2026-07-19）— ✅ 放行

- **验收对象**：`impl/site-cizing@7ed04e324914ea08f6337a33e8b9c4577e9a5597`；前轮 `300127a` 的唯一 P1（出处数字仅由 SHA 间接担保）复验。
- **隔离与纪律**：以 `git clone --local` 建立独立验收树与本地分支，未使用共仓 worktree；未改实现、未推送。

### 1. 制品实测与 SOURCE.md 对表

零依赖 `measureWoff2`（WOFF2 Brotli/目录、`maxp.numGlyphs`、cmap 映射）与 fontTools 交叉一致；两份 `SOURCE.md` 每件的字数 / glyph / 字节 / SHA 均逐项相等：

| 制品 | 字数 | glyph | 字节 |
|---|---:|---:|---:|
| `zhuque-fangsong-subset.woff2` | 104 | 128 | 33,036 |
| `doc-latin-subset.woff2` | 25 | 94 | 8,488 |
| `noto-serif-sc-regular-subset.woff2` | 87 | 107 | 25,632 |
| `noto-serif-sc-bold-subset.woff2` | 87 | 107 | 25,856 |

### 2. 六向红证与格式容忍

真实朱雀记录基线为绿；SHA 改一位、字节 `+1/-1`、glyph `+1/-1`、字数 `+1/-1`、删除全部数字均由同一 `checkFontProvenance` 触红。带逗号与不带逗号的千分位两种合法写法均保持绿。故数字现在是可解析的实测契约，而非 SHA 旁的叙述性抄写。

### 3. 门禁与裁决

- `node --test site/scripts/deslop-scan.test.mjs`：**35/35**，exit 0。
- `pnpm site:guard`：exit 0；guard 组合实跑 **52/52**、release-truth 与 deslop 均通过。

> **放行。** 本结论仅关闭 SITE-CRAFT-2 的 font-provenance 单点；不替代此前 P0 reduced-motion、品牌谱系或后续 Sol 视觉终审。

---

## SKIN-R2-P5-ACCEPT · Pages 写本拉丁独立验收（2026-07-20）— ❌ 不放行

### 1. 对象、隔离与结论

- **验收角色**：独立验收会话，未参与 P5 实现；实现者为 `p5_pages_implementation`，本会话不采信其自述。
- **被验实现**：`9a1281beb27f5daec2c780ff99614f8542062afb`，实现父提交
  `f6a04d2f1f74242caf8e1b34209d47e4659e2251`。
- **隔离环境**：全新 local clone `/tmp/courtwork-p5-acceptance.14x4pl/repo`，分支
  `codex/p5-independent-acceptance`；静态产物与源码模板分别只由独立端口 `127.0.0.1:18973`
  / `:18974` 提供，未复用共享服务。
- **实现级修复**：无。本轮只写验收报告与独立 Safari 证据，不改产品、契约或门禁实现。

> **SKIN-R2 P5 不放行 ❌。** `P5-F10` 的“四处批准选择器闭集”只检查直接
> `font-family: "Courtwork Manuscript Latin"` 声明，未检查 `--sans` 等自定义属性的间接传播。
> 验收把写本 family 加到 `:root --sans`（即正式退场的 `P5-F06` 复活），整站 `body`
> 会经 `font-family: var(--sans)` 消费，但完整 `node site/scripts/deslop-scan.mjs` 仍以
> `deslop: PASS (872 active text files)`、exit 0 通过。故“第五消费点即红”与 F06–F08
> 退场门当前不成立；基础门全绿不能覆盖这个可实际绕过的签署边界。

### 2. 实仓 mutation

全部反例都在本独立 clone 的真实活动文件中以精确补丁注入，观察后逐项反向恢复；没有 mutation
残留。除特别注明外，判定命令为完整 `node site/scripts/deslop-scan.mjs`。

| 反例 | 实测结果 |
|---|---|
| `.wordmark > span` 改为未签 `.wordmark > strong` | **红**：同时报未批准 consumer 与缺签 consumer |
| `:root --sans` 前插 `"Courtwork Manuscript Latin"`（复活退场 `P5-F06`） | **错误放过**：deslop exit 0；本轮拒绝根因 |
| manifest `glyphs: 8 → 9` | **红**：`subset cmap/glyph metrics drifted` |
| `[data-pm-defect-label]` 直接消费写本 family | **红**：`unapproved manuscript consumer` |
| `[data-fixture-count]` 注入 `animation: count-up 1s` | **红**：`p5-data-static data node gained motion` |
| reduced blanket 删除 `!important` | 静态 deslop 仍绿，但 `assert-reduced-motion.mjs` **定点红**：三条 `demo-zhu-b` 泄漏、幕二朱残留；复原后 runtime 门绿 |
| SOURCE 发布包 SHA 改为 `missing` | **红**：`SOURCE record is missing releaseArchiveSha256` |
| OFL 快照改变一字 | **红**：`OFL bytes drifted from manifest oflSha256` |

档位账自身的退场行反例也在 `site:guard` 实跑中通过：`注入四：退场的 P5 UI 覆盖行不得复活`。
但该账门只守映射表，不守消费值经 CSS 变量间接扩散；两层不能互相代替。

### 3. 字体、数据与前后帧复核

- 入库 WOFF2 实测 SHA `a9107ca58cf646f2c36713734402da9d728987d8587cd405b26b75fa88cb27e6`；
  OFL 快照 SHA `6078ed582d53a416f761fd2fdeb384320b69191bf316234c21aabe71e2416822`，均与 manifest / SOURCE 对上。
- `assert-p5-font-runtime.mjs` 在源码模板服务 `:18974` 实跑通过：站面三处与 OG 一处均真渲
  `Courtwork Manuscript Latin`，资源只加载一次；八个数据节点字符、bbox、字槽、animation 与
  transform 逐位等于签署基线。`site-dist` 不部署构建模板 `og.html`，故该脚本若误指 `site-dist`
  会诚实失败 OG selector；本报告只采用符合脚本用途的源码模板服务结果。
- `assert-reduced-motion.mjs` 复原后通过：运行动画仅三条既有 `ghosty-reduced-fade`，演示层八点归零，
  四相位零朱。
- 实现前后 Safari 十帧逐张目检，manifest 里的十个 SHA 均与仓内字节一致；1440 / 1600 / 375、
  reduced-motion 与 JS-off 未见新增换行、横滚、内容缺失或冷色面回退。
- 独立复摄帧见 [`craft-evidence/SKIN-R2-P5/acceptance/`](craft-evidence/SKIN-R2-P5/acceptance/)：
  Safari `26.5.2` 的 1600 宽窗与 375 窄窗均无溢出。内置 browser runtime 无可控浏览器；验收进程
  又无权限切换系统 Reduce Motion，因此没有复制实现帧冒充独立 reduced 实机。该证据边界如实留痕，
  但本轮即使补得独立 reduced 帧，也不能消除 F06 可绕过这一拒绝项。

### 4. 完整门禁

| 门 | 本 clone 实跑结果 |
|---|---|
| `pnpm install --frozen-lockfile` | 14 workspace projects，1047 packages，exit 0 |
| `pnpm -r build` | 13/14 workspace，desktop 3579 modules，exit 0；仅既有 dynamic-import / chunk-size warning |
| `pnpm lint` | exit 0 |
| `pnpm test` | **148 files / 1261 tests passed** |
| `pnpm site:guard` | Node **66/66**；deslop **873 active text files**；release-truth 与 desktop/design 门全绿 |
| `pnpm site:build` | exit 0；新子集进入 `site-dist/assets/fonts/` |

`main.js` 不在 `f6a04d2..9a1281b` diff 中；desktop/package/schema 均零渗入。工作树在报告与独立帧之外
无变化，`git diff --check` 通过。

### 5. 复验入口

实现会话需以 TDD 加固 `P5-F10`：至少令 `--sans`、`body`、OG body 或任意自定义属性／间接字槽
携写本 family 时定点失败，同时保留四个已签直接 consumer 与 `P5-F09` mono 原值。修复不得复活
F06–F08，不得把扫描面扩成通用字体状态机。修复后由新的独立 clean clone 重做本节全部 mutation、
Safari 复摄与全量门；本报告不能被沿用为放行依据。

---

## SKIN-R2-P5-REACCEPT · `P5-F10` 修复后独立复验（2026-07-20）— ❌ 不放行

### 1. 对象、隔离与结论

- **被验目标**：`15975d678e88ff99ce751bf659ef7a8c0b895151`，包含实现 `9a1281b`、首轮拒绝报告
  `26b42eb` 与本轮 `P5-F10` 修复。
- **验收角色**：新的独立验收会话，未参与实现，也不是首轮拒绝会话；全新 clone 为
  `/tmp/courtwork-p5-reacceptance.cPI86u/repo`。
- **实现／契约改动**：无。本轮只写报告与独立 Safari 帧。

> **SKIN-R2 P5 仍不放行 ❌。** `15975d6` 已正确咬住字面
> `"Courtwork Manuscript Latin"` 经 `--sans`、任意自定义属性及 OG 字槽传播；但门只做小写／空白
> 规范化，没有把 CSS escape 还原为同一 family。实仓以
> `"Courtwork\20 Manuscript\20 Latin"` 写进自定义字槽、由 body `var(...)` 消费后，完整 deslop
> 仍 exit 0，而浏览器 computed body 继承面已真变成写本 face。故 F06/F07 仍可语义复活，
> “间接外溢由 `p5-font-coverage` 定点红”尚未成立。

### 2. 修复核心与新反例

字面反例已闭合：在真实 `site/styles.css` 给 `--sans` 前插 family，完整 deslop 精确报
`site/styles.css has the manuscript face in an indirect font slot: :root --sans`。任意自定义槽 +
`body var(...)` 及 OG 自定义槽也分别由同一规则定点红。

新的语义等价反例为：

```css
:root { --acceptance-probe-face: "Courtwork\20 Manuscript\20 Latin"; }
body { font-family: var(--acceptance-probe-face); }
```

- 静态门：`node site/scripts/deslop-scan.mjs` **错误放过**，exit 0，880 active text files。
- 真渲门：`assert-p5-font-runtime` exit 1；`[data-pm-defect-label]`、`[data-pm-suggestion]`、
  `[data-pm-disposition]` 的 computed family 变为 `"Courtwork Manuscript Latin"`，八个数据节点
  字槽／bbox 漂移。

浏览器已将 `\20 ` 解析为空格，因此这是实际消费扩散，不是叙事拼写差异。runtime 能从结果面
发现漂移，不等于 `site:guard` 内的 P5 静态门成立：按需 runtime 不在 site:guard，且签署明确要求
间接字槽由 `p5-font-coverage` 定点失败。

### 3. 全量 mutation 与真渲

除上述新漏网项外，下列真实活动文件反例均定点红并逐件复原：直接第五 consumer、缺签 consumer、
glyph/cmap/SOURCE/OFL 漂移、数据字、`--mono`、数据 motion、reduced-motion blanket 漂移。退场范围
对应关系亦实证：字面 `--sans`（F06）、body 间接消费（F07）、OG 字槽（F08）都红；档位账的
`P5-F06…F08` 复活反例随 site:guard 通过。

复原后的 baseline runtime 通过：站面三处 + OG 一处均真渲 Junicode，资源只加载一次；八个数据
节点字符、bbox、font、animation、transform 与签署基线逐位相等。全部命令、报错与反例表见
[`craft-evidence/SKIN-R2-P5/reacceptance-15975d6/README.md`](craft-evidence/SKIN-R2-P5/reacceptance-15975d6/README.md)。

### 4. Safari 与完整门

独立原生 Safari 26.5.2 已复摄：exact iframe `1600×900 @ scale .8` 与顶层 `375×800` 均显示
写本 wordmark／hero，未见新增换行或横向溢出。截图 SHA 与尺寸见上述 evidence。系统拒绝验收
进程写 `com.apple.universalaccess.reduceMotion`，故没有伪造独立 reduced Safari 帧；计算态门
实跑并把删除 `!important` 的反例精确咬红。

| 门 | 本 clone 实跑 |
|---|---|
| `pnpm install --frozen-lockfile` | 14 projects / 1,047 packages，exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm test` | **148 files / 1,261 tests**，exit 0 |
| `pnpm -r build` | 13/14 workspace；desktop 3,579 modules，exit 0 |
| `pnpm site:guard` | **68/68**；deslop 881 active files，exit 0 |
| `pnpm site:build` | exit 0 |
| P5 runtime | baseline 绿；转义字槽 mutation 定点证明真扩散并红 |

### 5. 再复验入口

实现需先补 CSS 等价 family spelling 的红测，再在既有 P5 局部规范化 CSS escape；无需变量解析
状态机，也不得扩大 F06–F08。修复后由另一新 clean clone 重做本报告；本轮拒绝不得沿用为放行。

---

## SKIN-R2-P5-ACCEPT-3 · CSS escape 修复独立复验（2026-07-20）— ✅ 放行

### 1. 对象与隔离

- **验收对象**：`a6cb5e3fcaffa7a4f0ee49223648962e76427ad1`；核验为复验时主线
  `76bf95155b9b1f16be9cddbaf501adceaf899099` 的祖先，本轮精确隔离 P5 提交而不借后续主线。
- **独立环境**：全新 clone `/tmp/courtwork-p5-third-acceptance.PCoFkA/repo`，独立源码端口
  `127.0.0.1:18987`；未复用前两轮 clone、端口、报告结论或服务。
- **范围**：`71b7fa3..a6cb5e3` 仅改 deslop library/test 两文件；本验收不改实现或契约，只写报告。

> **SKIN-R2 P5 放行 ✅。** 前轮真实绕过
> `"Courtwork\20 Manuscript\20 Latin"` 经自定义属性 → body/data 继承，现在由
> `p5-font-coverage` 精确报 `indirect font slot`；短／长 hex、普通字符转义与 OG 间接槽同样红。
> 修复只在 P5 局部还原 CSS escape，没有引入变量解析、级联状态机或新字体系统；四个签署 consumer
> 真渲、八数据节点静止，F06–F08 没有复活。

### 2. 转义与闭集反例

真实活动文件逐项注入并复原：

| 反例 | 结果 |
|---|---|
| `"Courtwork\20 Manuscript\20 Latin"` 自定义槽 + body `var(...)` | `p5-font-coverage` 定点红 |
| `\000020` 六位空格、`\43 ` 短 hex 字符 | 均定点红 |
| `Court\work` 普通字符转义 | 定点红 |
| OG 转义字槽 + OG body `var(...)` | `site/og.html` 定点红 |
| 既有 literal `--sans`、任意变量槽 | 均定点红 |
| 字面／转义第五 consumer | 均报 unapproved consumer |
| 已签 selector 改名 | unapproved + missing signed consumer 双红 |

正向反例也成立：签署 `@font-face` 或已签 consumer 使用语义等价转义时完整 deslop 保持绿，证明
门在 CSSOM 同义层判断，而不是以误杀合法 consumer 换取封口。复原后 deslop 基线全绿。

### 3. 真渲与全门

独立 runtime 实测站面三处 + OG 一处 computed family 全为写本 face，资源只加载一次；八数据节点
字符、bbox、字体、animation、transform 与签署 baseline 相等。reduced runtime 亦通过：三条名册
动画、演示层八点归零、四相位零朱。

| 门 | 实跑结果 |
|---|---|
| P5 定点 Node | **39/39** |
| `pnpm site:guard` | **68/68**；报告 tip deslop **883 active files** |
| `pnpm lint` | exit 0 |
| `pnpm -r build` | 13/14 workspace；desktop 3,579 modules，exit 0 |
| `pnpm site:build` | exit 0 |
| `pnpm test` 最终完整重跑 | **148 files / 1,261 tests**，exit 0 |

完整测试首轮仅 `s3-flow.integration` 遭 5 秒 timeout（147/148）；同一用例随后单跑 1/1、tests
694ms，负载平息后全量 148/148 复绿。两轮事实均保留。详细 mutation 与命令记录见
[`craft-evidence/SKIN-R2-P5/third-acceptance-a6cb5e3/README.md`](craft-evidence/SKIN-R2-P5/third-acceptance-a6cb5e3/README.md)。

### 4. 裁决边界

本放行只关闭 P5 写本拉丁表达轨及 `P5-F10` 两轮拒绝项；不扩大为系统 UI 字体全量覆盖，不撤回
F06–F08 退场，不替代后续 Pages 部署授权。未 push、未部署、未更新能力状态真源。

---

## VERSIONAL-LANG-1-ACCEPT-1 · 独立验收（2026-07-20）— ❌ 拒绝

- **对象与隔离**：`45fb39510902b7b7a99eb0792024328bc27672df`；fresh clone
  `/tmp/courtwork-vl1-acceptance.gxZovW/repo`，独立端口 `19521–19522`、`19623`、`19536`；未改
  实现、契约或机器门，未 push。
- **阻断**：把活动 `.composer-shell:focus-within` 的 `border-color` 改为 `transparent` 后，完整
  `site:guard` 仍 76/76，VERSIONAL-LANG e2e 仍 4/4。签署 `VL-L05` 的 focus 反馈因此没有可
  执行的前向守卫，不能以当前样本全绿代替契约成立。
- **其余红证**：20 行 VL 账缺行／错档／双绑定、11 routine 与旧 P1 分类复活、composer／preview／
  ledger／Settings 强界删除、schema 新装饰、Pages proof 竖线／刊记 anchor／四边眉批、字体与 raw
  color 逃逸均真实注入并红；精确复位后实现树零 diff。
- **全门与实机**：lint、148 files / 1261 root tests、13 workspace build、site guard 76/76、site
  build、独立端口 desktop e2e 321/321 均绿；真实 Tauri/WKWebView 新摄 1600×900 暗宗首行、侧栏
  与 composer 帧，当前消费无可见横向溢出。

完整报告与截图：
[`craft-evidence/VERSIONAL-LANG-1/acceptance-45fb395/README.md`](craft-evidence/VERSIONAL-LANG-1/acceptance-45fb395/README.md)。
补上 focus 非透明 token 静态门及聚焦前后 computed 差异断言后，须由新的独立会话复验修复 SHA。

---

## VERSIONAL-LANG-1-ACCEPT-2 · `b93796a` focus 守卫复验（2026-07-20）— ✅ 放行

- **对象／隔离**：`b93796aca5110c4f349d9c0398710a38207741ea`；fresh clone
  `/tmp/courtwork-vl-reacceptance.VO5wt4/repo`，独立分支与端口 `19731–19733`、`19740–19741`；
  新会话未参与实现或首轮拒绝，未复用旧进程，未 push。
- **首轮阻断关闭**：活动 focus token 改 `transparent` 后定点 Node **4/5 红**、完整 guard
  **76/77 红**；复位后真实 Chat input focus 的 computed shell color 与 computed
  `--text-tertiary` 相等且非透明，VL e2e **4/4**。
- **代表性红证**：VL 账缺／错／双绑定、routine/P1 复活、五类结构边界删除、schema 新装饰、
  Pages 竖线／刊记／四边眉批、写本字体与 raw color 逃逸全部真实注入、定点红、逐项复原。
- **矩阵与全门**：desktop e2e **321/321（4.6m）** 覆盖五尺寸、双宗、收栏／折叠、比较、focus、
  Settings 与真实 RiskList；root tests **148/1261**、13 workspace build、site guard **77/77**、
  lint/site build 全绿。
- **真壳**：fresh cargo 编译并启动 Tauri/WKWebView；native AX 焦点为 `AXTextArea / Message`；
  新摄 1600×900 Chat focus 原生窗口未见 composer 溢出或左栏残线。

完整 mutation、computed 证明、系统／窗口 metadata、SHA 与真壳帧见
[`craft-evidence/VERSIONAL-LANG-1/reacceptance-b93796a/README.md`](craft-evidence/VERSIONAL-LANG-1/reacceptance-b93796a/README.md)。
消费 CSS 自 `45fb395` 零 diff；本轮只解除 focus 守卫拒绝，放行范围止于 VERSIONAL-LANG-1。

---

## VERSIONAL-LANG-2-ACCEPT-1 · `72f5543` 独立验收（2026-07-20）— ✅ 放行

- **对象／隔离**：`72f5543043f283e1048bd5bbaf8a8f36a6082049`；fresh clone
  `/tmp/courtwork-vl2-acceptance.AMyVc7/repo`，Pages 独立端口 `19851`、Agent e2e 独立端口
  `19852`；未改实现或契约，未 push。
- **四类真实红证**：浅宗 palette drift、Hero 400、evidence 竖线、Agent document header 底线
  均在活动源文件实际注入并分别由 `VL2-C01/T01/L01/L02` 定点咬红；逐件精确恢复后合同 9/9。
- **运行态**：1440×900 与 375×812 的 document/body 水平溢出均为 0；Hero 与四栏 h3 均为
  Noto Serif SC 700；九个 Pages 色槽、OG 六槽及六类 Pages routine 边界 computed 值逐位符合签署。
  icon 使用 `#232B38`，OG PNG 为 1200×630 且目视无深宗残留。
- **Agent 不回退**：独立端口 VERSIONAL-LANG + output-confirm e2e **6/6**，覆盖 composer focus、
  schema 主从/整组界、Settings 输入、未落点逐条确认及取消不生成。
- **全门**：site guard **84/84**（报告 tip 910 active files）、site build、lint、13 workspace build、root
  tests **148 files / 1,261 tests** 全绿。首轮 tests 与 fresh build 并发因尚无 workspace `dist`
  出现入口解析红；build 后按依赖顺序重跑完整转绿，事实保留。

完整 mutation、computed 值、OG/icon SHA、隔离事实与命令记录见
[`craft-evidence/VERSIONAL-LANG-2/acceptance-72f5543/README.md`](craft-evidence/VERSIONAL-LANG-2/acceptance-72f5543/README.md)。
本放行止于 `VL2-C01/T01/L01/L02`，不扩大为新主题、字体资产、schema 或行为变更。

---

## VERSIONAL-LANG-3-ACCEPT-1 · `d32985f` 独立验收（2026-07-20）— ❌ 拒绝

- **对象／隔离**：`d32985ff255aa2b9535e2fbfab3fdd998d3bb638`（实现祖先 `920bdae`）；fresh
  clone `/tmp/courtwork-vl3-reacceptance.Li6FMD/repo`，独立端口 `19961–19963`，未改实现或门。
- **六类红证**：Pages 深宗 drift、Agent important-title drift、正文泥金、VL3 ledger 缺行／错档、
  VL2 routine 线复活均定点红；WebP 第 100 字节翻转后 `VL3-S01` 精确报 manifest SHA 不等，翻回
  原字节后合同 13/13。
- **Pages 成立部分**：1280 light/dark 的 html/body overflow 均 0、broken images 均 0；Hero／卷题
  深宗泥金 700，正文与数据保持冷白；六枚产品图 manifest 基线通过。
- **阻断**：Agent 四白名单前三项 welcome/case/settings 在真实 dark root 均为泥金 600，但第四项
  `.gallery-header h1` 的自然入口 `/visual-gallery.html` 固定 light、未装 theme controller，dark
  浏览器上下文仍为 `rgb(35,43,56)`。现有 VL3 静态合同也漏检此消费者，完整 e2e 因而假绿。
- **全门**：site guard 89/89、lint、root 148/1261、13 workspace build、site build、完整 desktop
  e2e **322/322（3.2m）** 均绿；全绿不能覆盖上述实物缺口。

完整 mutation、computed 值与复验入口见
[`craft-evidence/VERSIONAL-LANG-3/acceptance-d32985f/README.md`](craft-evidence/VERSIONAL-LANG-3/acceptance-d32985f/README.md)。
补 gallery 自然深宗解析与第四消费者前向门，或由产品／架构明确撤回该白名单项后，须另起 clean
clone 复验；本轮不得据为放行。
