# SPEC: site

状态：SITE-2 Evidence Line 与 SITE-GEN-1 多场景台账已经独立验收；`v0.1.2` Release、Pages、远端资产校验与 macOS/Safari 真机复核均已完成。

## SITE-GEN-1 · 多场景泛化台账（已独立验收并上线）

保留 Evidence Line Hero，不改成场景卡片目录。在既有连续台账后增加“同一底座，换的是判断”三段：

1. 合同审查：原句 → 风险 → 修订 → 人工确认，标记为已验收工作链；
2. 卷宗阅卷：20 份卷宗材料 → 47 个事件 → 14 个主体节点 → 8 个矛盾事件，全部计数由 Legal fixture 校验；“矛盾事件”只按 Timeline 的 `markers.includes('contradiction')` 统计，不与 4 处矛盾点或 2 条图谱矛盾边混算；
3. PM 决策：PRD 原句 → 缺陷维度 → 修改建议 → 人工处置。只有 `PM-FIXTURE-1` 与 host renderer 通过独立验收后才上线；scenario 未接通期间必须显示 `Schema catalog preview / 尚未接通运行链`，不得暗示 live。排序提案继续等待 `PM-SCHEMA-1`，本单不以假分数、PriorityScore、RICE、排名或公式补位。

三段仍使用连续行、分割线和真实局部裁片，不新增等权 feature card 或重复 Mac window。站点构建/guard 必须读取权威 fixture，锁定计数、引语、状态、“无公式/无 PriorityScore”事实与 live/catalog 标签；截图必须来自 VISUAL-KIT 独立验收后的 main 经真机操作。

### SITE-GEN-1 字段与构建门

- 卷宗四个可见计数使用固定 key：`dossier-materials=20`、`timeline-events=47`、`party-nodes=14`、`contradiction-events=8`。构建门必须同时核对 CaseFile 文件集合与 `dossier/*.md` 集合完全相等；不得从说明文案或中文关键词反推数字。
- PM 固定消费权威 fixture `prd-finding-05`：原句“所有成员都能编辑路线图，但路线图只有负责人可以修改。”、缺陷 `conflicting-requirement / 冲突需求`、建议“区分评论、提议和正式修改，并给出唯一权限矩阵。”、状态 `pending / 待确认`。构建门必须复验锚点文件、UTF-16 区间、全文 hash 与逐字切片闭合。
- 站点脚本共享一个无副作用 fixture-claim validator；`build` 在清空 `site-dist` 前先校验，`guard` 复用同一 validator。计数漂移、锚点偏移、状态被改为 confirmed、catalog 标签缺失/伪装 live、出现 PriorityScore/排序/公式任一情况都必须触红。
- 合同审查复用既有已验收 Evidence Line 与截图；SITE-GEN 不新增对垂类 `/testing` 修订草稿的生产消费，也不把测试草稿升级为官网真值。
- 新区块全部是静态语义内容：关闭 JS 仍完整；不新增可点击假控件或 `tabindex`；窄屏 DOM 顺序即阅读顺序；reduced-motion 不引入新动画。

### SITE-GEN-1 实现与验收留痕（2026-07-14）

- 泛化台账已落在既有工作台账与产品边界之间；合同审查只复用上方已验收证据链语义，卷宗四个可见计数来自 Legal artifact，PM 只展示 `prd-finding-05` 的权威原句、缺陷维度、建议与待确认状态。
- `fixture-claims.mjs` 从 CaseFile、Timeline、PartyGraph、PM PrdReview、PRD 原文、PM manifest 与 descriptor/presentation 真源计算 claim；build 在清空产物前先校验，deslop guard 复用同一实现。
- 八类反例锁定 46 事件、删除矛盾 marker、15 主体、错误“矛盾”单位、PM UTF-16 偏移、confirmed 漂移、伪 live 与 PriorityScore 注入。本单没有修改 `main.js`、Hero、截图、动画或视觉 token，也没有新增卡片、第二个 Mac window 或假控件；独立验收结论见 [`site/ACCEPTANCE.md`](ACCEPTANCE.md)。

## SITE-2 · Evidence Line：首页约束链

目标：在不重写整站、不虚构材料的前提下，把首页从平均分配截图的产品介绍，推进为“一个结论如何被证明”的连续叙事。

## 叙事契约

首屏主命题保持“模型只生成，不裁决”。产品链固定为：

```text
原件 → 引语 → 结论 → 人工确认
```

四个节点必须消费样板案真实 fixture 与当前工作台截图：原件展示真实合同句子；引语可回到页码、段落或文本坐标；结论对应真实风险或修订建议；确认展示确认、驳回、修正之一。动效只解释节点间因果，不作装饰。

## 实现边界

- Hero 只保留一张完整工作台，其余视觉使用真实局部裁片，不重复套多个 Mac window。
- 三段能力使用连续台账与分割线，不新增 feature card 网格：从散材料到卷宗、从句子到坐标、从建议到确认。
- 保留四项硬承诺：不改原件、不自动送出、不把无锚引语落格、不替用户确认。
- CTA 使用完整中文产品语言，并展示真实版本、真实提交与真实下载目标。
- 禁止随机法律碎片、假数据、3D 设备模型、glow、渐变、装饰坐标、`01/02/03` 脚手架与单字母场景标记。
- 颜色、排版、法理之线与动效仍只消费 `docs/design/` 的现行契约；活动源码和文档不得引用历史竞稿。

## 验收标准

1. JS 关闭时核心叙事、承诺与下载信息仍完整；滚动增强不是内容前提。
2. reduced-motion 下四节点直接成立，无位移动画；普通模式下每个动画都对应证据链状态变化。
3. 真实 fixture 文案与截图来源可追溯，版本、SHA、下载链接通过构建门生成或校验。
4. 通过 `site:guard`、站点构建、响应式视觉审计与键盘/对比度检查；由不同会话独立验收。

## SITE-2B · 已验收主树真机证据（2026-07-14）

- 截图源为 `main@ce09110` 冷启动后，由 Codex 内置浏览器真实点击样板案、通用交互卡、来源锚点与确认选项得到；启动环境未设置 `VITE_COURTWORK_E2E`，不消费测试 stream hook。
- Hero 使用“交互已记录 + 原件精确高亮”的完整工作台；坐标与确认台账分别复用同源局部裁片，不新增第二个 `.mac-window` 或装饰卡。
- 原始真机帧为 1280×720；站点只派生 1280 / 720 两档 WebP。alt 必须说明交互快照、原件高亮与人工确认关系，不得把截图描述为模型自动裁决。
- DeepSeek 首启凭证面另有真机验收帧，但不进入首页主叙事；provider 配置不是证据链的视觉主角。
- `assets/og.png` 由现行 `og.html` 重新渲染为 1200×630；wordmark 直接消费四路径核心 SVG，文字左侧不再残留旧版底盘。

## RELEASE-1 · v0.1.1 下载真值（历史）

- 下载 URL 固定为 `releases/download/v0.1.1/Courtwork_0.1.1_aarch64.dmg`，与已发布 GitHub Release 的 tag / asset 同名。
- 页面同时呈现本趟 DMG 的 64 位 SHA-256 与 `Apple Silicon 开发构建 · ad-hoc 签名 · 未公证`，不得只展示“下载”而隐藏 Gatekeeper 边界。
- 该版 asset 可下载、SHA 匹配、Pages workflow success 与部署页复核四项条件均已成立；现由 `v0.1.2` 替代为首页当前下载真值。

## RELEASE-1 · 部署实录（2026-07-14）

- annotated tag `v0.1.1` 指向 `main@39555d6`；GitHub Release 已发布，DMG 与 SHA 文件均为公开资产。
- 从 GitHub Release 重新下载 DMG 后独立复算：`37792b767fe08119edab3cc6b793e59cd4511758110f8b42e6242e80a023db7e`，大小 `4,667,331` bytes，与页面、校验文件及独立验收报告一致。
- Pages workflow `29301065279` 在 `39555d6` 上成功；部署首页 HTTP 200。macOS Safari 真机页复核可见四项硬承诺、下载 CTA 与“Apple Silicon 开发构建 · 未公证”边界。
- 完整外部证据与链接见 [`release/DEPLOYMENT_v0.1.1.md`](../release/DEPLOYMENT_v0.1.1.md)。

## RELEASE-0.1.2 · 下载真值与部署实录（2026-07-15）

- 官网两个下载入口已同次切换到 `releases/download/v0.1.2/Courtwork_0.1.2_aarch64.dmg`，页面显示真实 DMG SHA-256 `f4af2a44248c7d7af970c8486ccaf7c8d72107565c4d824ce9cb8d69578de83d`。
- `release-truth` 同时核对四个应用版本源、Cargo.lock、全部 DMG URL、tag/asset 版本、SHA 文件、Release notes、README 与未公证声明；最终严格门使用 `--require-site-match`，当前站点与 `v0.1.2` 完全一致。
- 页面继续明示 Apple Silicon、ad-hoc、未公证；本次没有改变 Evidence Line、SITE-GEN fixture claim、截图、动画、布局或视觉 token。
- annotated tag `v0.1.2` 解引用到 `2fe8bf54dad12f58bccf06a9d692f7c14f65cbd3`；GitHub Release 为非 draft、非 prerelease，DMG 与 SHA 两项资产已重新下载并通过 `shasum --check`。
- Pages workflow `29383926592` / job `87253159770` 在 `2fe8bf5` 上成功；首页、icon、CSS、JS、OG、Hero WebP 与 DMG 均 HTTP 200，两个真实下载 `href`、可见版本和 SHA 一致。
- macOS `26.5.2` / Safari 原始真机帧证明 Hero 与三垂类台账；完整外部事实见 [`release/DEPLOYMENT.md`](../release/DEPLOYMENT.md)，原始 PNG 清单见 [`release/evidence/v0.1.2/README.md`](../release/evidence/v0.1.2/README.md)。

## SITE-CRAFT-1 · Pages 三处巧思（实现完成，待独立验收）

在不改叙事、不动 fixture、不回迁产品壳的前提下，为 Pages 展示站落地三处 vault 技法（arlan.me/vault，MIT）：Hero 逐字显影 Typer、案例截图 Ghosty reveal、主 CTA Satin 材质。只动 `site/`（含其构建配套 `site/scripts/*`），`apps/desktop` 零触碰。色彩全落藏青派生色阶，三处均实现 `prefers-reduced-motion` 退化，零新构建依赖。

### 架构裁定（本会话，2026-07-16）

三处技法与站点已验收设计契约 `docs/design/principles.md` 存在结构性冲突，经架构角色就地拍板（三问三答，取推荐项）：

1. **动效破例**：`principles.md §5` 动效白名单只允许 `transform / opacity / background-color / border-color`；Typer 反色态动画 `color`、Ghosty reveal 动画 `mask-position` 均在白名单外。裁定 **Pages 展示站就地破例**：按 vault 技法忠实实现，deslop 白名单精确锁定这三处新消费点 + 漂移红测，其余 slop 仍全封；`principles.md` 分歧标 `[需架构拍板]` 留待批复（见下）。
2. **CTA 材质**：Satin 缎面需渐变、Inset 凹刻需 `inset` 阴影，二者都被 `site/styles.css` 顶层门禁硬封（`bannedVisual` + `box-shadow` 行禁）且与 §1 零投影相悖。裁定 **扁平伪元素高光**：`::before/::after` 用 `color-mix(var(--bg-app)…, transparent)` 叠上部微光带 + 顶缘高光细线，无渐变无阴影，只取三子技法里的「伪元素高光」，尊重站点零投影身份，零门禁改动。
3. **Ghosty 作用域**：卷宗数字（20/47/14/8）是 fixture 校验的数据区，§5 明令「数据区绝对静止」。裁定 **仅作用于 `.work-crop` 截图媒体**，卷宗数字保持零动效。

### 本单新增概念（复杂度台账）

按根 `CLAUDE.md` 复杂度节制条，本单预算内新增 **3 个效果模块 + 1 张遮罩资产**，无额外抽象、无新持久化格式、无新状态机：

| 新增 | 位置 | 为何非加不可 |
|---|---|---|
| Typer 逐字显影模块 | `index.html` 每字 `.tc` span（`aria-hidden`，h1 挂 `aria-label` 保可达）+ `styles.css` `@keyframes typer-develop` | Hero 逐字 pill/反色/outline 闪烁定格是工单落点一；纯 CSS 交付（无 JS、无渐变、无阴影），动画仅挂在 `no-preference` 下，reduced-motion 与 JS 关闭都直接呈现定格标题 |
| Ghosty reveal 模块 | `styles.css` `.js .work-crop[data-reveal] img` 遮罩 + 过渡 | 截图进场是落点三；正常态 `mask-image` + `mask-position` 过渡由 IntersectionObserver 加 `.is-visible` 触发，隐藏预态仅在 `.js` 就绪时武装，JS 关闭时截图完整可见；reduced-motion 取消遮罩、以 `transition:none` 中和基础 mask 过渡，并由 `.is-visible img` 挂载 420ms、仅 opacity 0→1 的 `ghosty-reduced-fade` keyframe |
| CTA Satin 伪元素高光 | `styles.css` `.button-primary::before/::after` | 主 CTA 材质是落点二（裁定为扁平高光）；`z-index:-1` 压在填充色之上、文字之下，纯静态，reduced-motion 不受影响；两处 CTA 同时生效 |
| `assets/ghosty-mask.svg` | 新资产（预期内的 1 张遮罩） | Ghosty 的羽化遮罩：竖向 alpha 羽化（实顶三分之一 / 中段羽化 / 透明底三分之一），仅用 `stop-opacity`、色相无关；`mask-size:100% 300%` 下隐藏预态透至底、显影后全实 |

### 门禁扩展（deslop 是站点构建配套，属本单可动范围）

- `site/scripts/deslop-scan-lib.mjs` 的 `canonicalSiteMotion` 与 `site/scripts/deslop-scan.test.mjs` 的 `GOOD_SITE_MOTION` 同步更新：`main.js` 观察器目标由 `.evidence-step` 扩为 `.evidence-step, [data-reveal]`，并新增 `document.documentElement.classList.add('js')` 渐进增强旗标。观察器/收尾/reduced-motion 的 AST 形状仍逐字锁定；新增两条漂移红测锁定「去掉 `, [data-reveal]`」与「去掉 `.js` 旗标行」均触红 `site-motion`。
- `site/scripts/build.mjs` 资产拷贝清单加入 `ghosty-mask.svg`（不加则 Pages 部署缺遮罩）。
- 其余门禁面（gradient/box-shadow/raw-color/L1/archive/press/popover/fixture-claim）零改动、零放宽；Typer/Ghosty/CTA 的颜色全部经 `var()` + `color-mix(…transparent)` + `white/transparent` 关键字表达，未新增任何 hex/rgb/hsl 或非白名单 gradient/shadow。

### 退出证据

- 三落点前后对照 + reduced-motion + JS 关闭实测截图与量化记录在 [`craft-evidence/SITE-CRAFT-1/`](craft-evidence/SITE-CRAFT-1/)（含 `measurements.json`）。三修后的 reduced-motion 实测：Typer `getAnimations`（`.tc`）= 0、`animation-name:none`；三张 Ghosty 均 `mask:none`，加载时恰有 3 条 `ghosty-reduced-fade` CSSAnimation，420ms 内真实计算出 opacity 0→1，逐帧 transition 数恒为 0；CTA `::before` 静态、`animation-name:none`。JS 关闭实测：无 `.js` 类、h1 全文与 `aria-label` 完整、截图 `mask:none` / `opacity:1` 完整可见。
- 机器门（SITE-CRAFT-1-FADE tip 实跑）：Node **32/32**；`pnpm site:guard` exit 0（deslop **733** 活动文件、release-truth PASS、desktop neutral/elevation/signature/motion 四门全绿）；`pnpm site:build` exit 0；`pnpm lint` exit 0；`pnpm -r build` exit 0（13/14 项目，仅既有 desktop dynamic-import/chunk-size warning）；`pnpm test` **139 files / 1204 tests**。

### SITE-CRAFT-1-FADE · reduced-motion 三修（2026-07-16，待独立验收）

- 根因是正常态基础规则的 900ms `mask-position` transition 在 reduce 分支取消遮罩后仍被 `.is-visible` 的位置翻转触发，形成视觉不可见但 Web Animations API 可见的 6 条幽灵过渡；本修复在 reduce 精确 consumer 上显式 `transition:none`，不改正常态规则。
- 淡入只由 `@keyframes ghosty-reduced-fade` 的 opacity 0→1 实现，`.js .work-crop[data-reveal].is-visible img` 挂载 `420ms var(--ease-out) both`；不用 transition，故不受同帧赋类跳变影响。`site/main.js` 一字不动，reduce 分支仍在加载时一次为三张图加 `.is-visible`。
- TDD 先加入 CSS 精确契约测试并在旧实现上得到 0/1 红，再以最小 CSS 转绿；同次抽验既有 `main.js` canonical AST 测试继续通过。
- Chromium `149.0.7827.55`、1280×860 逐帧实测：reduce 共 40 帧，每帧恰有 3 条 `ghosty-reduced-fade`，24 帧存在 `0 < opacity < 1`，代表中间样本为 `0.970183`；元素与整页 CSSTransition 违例帧均为 0，三图 `mask:none`、computed transition duration `0s`，卷宗 20/47/14/8 动画数仍全 0。
- 正常态第一张图保持隐藏 `100%` → 220ms 中扫 `27.2963%` → 收尾 `0%`，全程没有 reduced opacity keyframe；JS 关闭时无 `.js` arming，三图均 `opacity:1`、`mask:none`、`animation:none`、`naturalWidth:640`。

### 提案区（交架构拍板，本单不越权改）

- **`[需架构拍板]` principles.md 破例入册**：Pages 展示站已就地破例 §5 动效属性白名单（Typer 动 `color`、Ghosty 动 `mask-position`）与「数据区绝对静止」之外的媒体显影。`principles.md` 不在 `site/` 范围，本会话未改；建议架构在 `principles.md` 或 `site-evidence-line.md` 增设「Pages 展示站动效例外」条款，明确产品壳仍受四属性白名单约束、例外只限展示站媒体层，以消除实现与写面契约的分歧。
- **偶然复杂度（SITE-CRAFT-1-ACCEPT 已清理）**：`.text-link { color: var(--text-secondary); font-size: 13px; }` 经确认无任何 HTML/JS 消费点；架构批准后由独立验收以 `fix-by-acceptance` 删除。

## MILESTONE-SHOTS-1 · 真机冒烟版里程碑定格（实现完成，待独立验收）

### 权威范围与边界

- 依据：`docs/design/site-evidence-line.md` 的「真实局部裁片」规范、`docs/status/pilot-2026-07-17.md` 第五轮真机冒烟与版本收口记录；基线为 `main@3909c4d`（`CONFIRM-GRANULARITY-1` 已合入）。
- 本单主要改 `site/index.html`、Pages WebP 裁片、`site/craft-evidence/MILESTONE-SHOTS-1/` 前后对照证据和本 SPEC；为让既有 guard 与当前真源一致，另做两处门禁卫生修正：`site/scripts/deslop-scan-lib.mjs` 精确登记 desktop 当前 48px 渐隐值，`apps/desktop/SPEC.md` 移除现行文档对 archive 调研原稿的直接链接。两处均不改产品运行逻辑、协议/schema、`CONFIRM-GRANULARITY-1` 实现或 `site/ACCEPTANCE.md`。
- 首屏只保留一张完整工作台；三张站内局部依次证明卷宗侧栏失败闭环、RiskList 高危逐条确认/查看引语回跳、修订 redline。聊天案语境/关系图谱与未落格「确认知悉」作为同批真应用证据留在 craft-evidence，不新增第二个 Mac window。

### 视觉与文案契约

- 六张终版帧均为独立 Vite `127.0.0.1:18882` 上的真实 desktop UI，`1440×900`、藏青主题、批量收起后、无弹层残留；数据来自合成卷宗「合成卷宗 · 晨曦印务设备纠纷」。
- RiskList 只展示单项确认路径；高危与未核验条目不得被文案写成可批量确认。侧栏保留 12 件材料的可读、需文字识别与不可用状态，失败必须可见而不被抹平。
- 文案把「真实模型场景全链」限定为「合成数据试点」且明确不等同于产品已全面上线；隐私与原件只读降为进入门槛，差异化落在锚点、分级确认与可回放台账。不得新增台账之外的 live、性能或规模宣称。
- Evidence Line 保持 `原件 → 引语 → 结论 → 人工确认`；引语文案必须明确可回到原件，未落格修订必须停在逐条确认边界。

### 复杂度与实现证据

- 本单无新概念、新依赖、新状态机或跨层接口；只替换 4 个站内消费位置的媒体与对应 alt/叙事，另保留 6 张 1440/720 WebP 资产供证据与响应式消费。门禁卫生修正只改 exact allowlist/现行文档引用，不改变 desktop 行为。
- `before/` 保存上一版站内代表性工作台、批量确认、聊天与确认帧；`after/` 保存本单六类终版帧：`01-risklist-granular-quote`、`02-revision-redline`、`03-non-applied-acknowledgement`、`04-chat-context-party-graph`、`05-dossier-12-fail-closed`、`06-workbench-first-screen`。
- craft-evidence 的测试注入只用于稳定复现合成卷宗的授权材料与画面；它不是 product-live 证据。真实模型全链跑通与「合成数据试点」限定来自 `pilot-2026-07-17.md` 的台账事实。

### 出口门与验收分离

- 本会话退出门：`pnpm site:build`、`pnpm site:guard`、`pnpm lint`、`pnpm -r build`、`pnpm test` 均需实跑留证；提交前再执行 `git diff --check`，逐文件暂存并检查 cached names。
- 独立验收会话必须在 clean worktree、独立端口复核六类真应用帧、响应式/键盘/对比度、文案 voice 与前后对照，并实际注入批量入口反例确认门禁变红；本实现会话不标记放行。

## COMPOSER-FLOW-COMPACT-1 · 首页 composer/chat 流收窄（实现完成，待独立验收）

本次首页视觉收尾的后续实现项。根因在 desktop 真源：`--content-measure: 760px` 同时约束 chat 正文列与 composer；宽主栏裁片中两者均显得过宽。现收至 **640px**，welcome `560px` 与站点布局契约保持不变。

- 真应用先红/转绿证据：`pilot-layout.spec.ts` 旧 CSS 实测 5 项 `760 vs 640`；改 CSS 后独立端口真应用 e2e **9/9**。
- 替换：`assets/screenshots/11-milestone-dossier-{1440,720}.webp`；原始 1440×900 PNG 与前后对照在 `craft-evidence/COMPOSER-FLOW-COMPACT-1/`。
- 站点语义不变：本裁片仍是虚构合成卷宗的真实 UI，不新增 product-live、隐私、性能或规模宣称；其他 RiskList/redline/未落格/关系图谱/工作台资产不因本次测宽改动而虚构重拍。
- 本节为实现留痕；放行结论需由独立验收会话写入 `site/ACCEPTANCE.md`，本实现会话不自验。

## SITE-CRAFT-2 · Pages 视效升级（实现进行中，分批交付）

权威范围：就绪图 `SITE-CRAFT-2` 行（hero 微演示 / 朱雀仿宋 / 冷色五杠杆 / 前卫实验田条款）。
硬边界不变：仅 `site/`（含其构建配套 `site/scripts/*`），产品壳字体与素材不随动；site 源码不引用归档路径。
分批交付、每批独立可验；逐帧证据与许可快照在 [`craft-evidence/SITE-CRAFT-2/`](craft-evidence/SITE-CRAFT-2/)。

### B1 · 朱雀仿宋 + 藏青阶深地基（杠杆①②⑤，实现完成）

- **朱雀仿宋（TrionesType/zhuque v0.212，SIL OFL 1.1，beta 锁版）**：按选型拍板以子集入站——
  hero 母题、承诺四则、收尾判词共 37 字（12KB woff2，preload + `font-display: swap`）。剂量纪律：
  仅上述品牌时刻，其余标题层保持系统 sans；单字重 + `font-synthesis: none`，层级靠字号与留白。
  上游版权行未宣告 Reserved Font Name；许可全文、制品 SHA 链与再生成命令见
  `craft-evidence/SITE-CRAFT-2/zhuque/SOURCE.md`。
- **子集化实现口径**：拍板文写「cn-font-split 挂 CI」；本单按复杂度节制落为「离线精确子集 +
  fail-closed 覆盖门」——不新增构建依赖，改由 deslop `display-font` 门三向绑定（页面 `zh-display`
  用字 ⊆ `site/assets/fonts/zhuque-subset.json` 清单文本；清单 `woff2Sha256` 锚定实际字节；CSS 必须
  真实接线 @font-face 与 `var(--display)`）。任一脱钩 = 缺字静默回退，构建直接失败（静默降级零容忍）。
  若架构仍要求 CI 内自动子集管线，标 `[需架构拍板]` 另立。
- **藏青阶做深（杠杆①）**：`--ink-deep / --plate-line / --plate-text / --plate-text-dim` 全部由既有
  token 经 `color-mix` 派生，零新 hex、零 allowlist 扩项。承诺段升级为全站唯一暗色石版：版面
  （`--ink`）+ 凹刻井（`--ink-deep`）两级暗部 + bg-app 派生刻线，不用阴影/渐变表达深度；
  页面因此获得亮纸—暗版的节奏，不再均匀平铺。副项：`.button-secondary` 按压底色加深
  （Inset 式材质响应，纯 background-color，press 门不涉）；卷宗计数 20/47/14/8 切 mono
  （核验数字与叙事文字字形分轨，纯静态属性）。
- **语义色稀缺性宣告 + 机器门叙事（杠杆②⑤）**：暗版底部 `design-boundary` 井两行 mono 小注，
  宣告「色彩只承载语义」（红/琥珀=风险，绿=落定，蓝=修订与焦点，其余交给藏青深浅与留白）并
  声明克制由机器门强制，链接 GitHub 上的 `site/craft-evidence` 目录。宣称与门禁实况逐字核对：
  颜色/渐变/阴影/动效四类确实各有触红门。
- **本单新增概念（复杂度台账）**：1 个字体资产 + 1 份子集清单 + 1 条 `display-font` 门 +
  4 个派生色变量。为何非加不可：字体是票面定向；清单与门是「静默降级零容忍」对 webfont 缺字
  这一静默降级面的封口；派生变量是杠杆①的最小载体。无新依赖、无新状态机、无新持久化格式。
- **门禁扩展**：`deslop-scan-lib.mjs` 新增 `checkDisplayFont`（纯函数）；`deslop-scan.mjs` 以真实
  清单与字节接线；`deslop-scan.test.mjs` 好例带清单外尾随文案（锁「门只约束 zh-display 消费者，
  不吞整页」），反例五向（越清单用字 / 字节脱钩 / 零消费者 / 未接 @font-face / 未消费 --display）。
  `build.mjs` 拷贝清单加入 fonts 目录。其余门面零改动：无新 gradient/shadow/radius/raw-color 项。
- 实现期缺陷判例（供验收注入参考）：消费者截取器首版把 `matchAll` 下恒为 0 的 `openTag.lastIndex`
  当切片起点，整页吞进覆盖检查——测试好例因消费者后无尾随内容而假绿；已按 TDD 补强好例并修复。

### B2 · hero 微演示：活的 schema 工作面（杠杆④，实现完成）

- **形态**：hero 唯一 Mac 窗从静态真机截图升级为 schema 工作面的诚实重建——左「原件」纸面
  （两端对齐 + 严格中文换行的文书阅读面），右「判断与处置」（风险条目/依据坐标/确认门/修订建议），
  底部三幕图例。纯 CSS 三幕循环回放（12s）：锚点跳转 → 逐条确认 → 修订对照；回放只移动注意力
  （底纹与刻线），数据字形绝对静止。`site/main.js` 一字未动，站点动效 AST 锁零扩展。
- **真实材料纪律**：演示文本全部取自页面既有已验字串——risk-01 锚点引语与坐标
  （04-设备采购合同 · 第 1 页）、高风险/已核验/待确认/不自动送出、结论标题与修订建议、
  处置动词（确认此项/驳回/修正，voice §1 合规）。不消费垂类 `/testing` 修订草稿（沿用 SITE-GEN
  既有裁定），故修订幕呈现「建议对照」而非杜撰 redline 文本对。mac-bar 标注「微演示重建」，
  不冒充截图；处置动作为静态描绘（无 tabindex/role/指针），不构成假控件。
- **动效契约**（`docs/design/site-evidence-line.md` 已留痕）：demo-* keyframe 只动
  `background-color` / `border-color` / `opacity`，在 principles.md §5 白名单之内——留痕为契约
  而非破例；reduced-motion 以 `.schema-demo * { animation: none; }` 整体全灭为定格全景；
  JS 关闭不受影响。首屏条款同步修订（完整真机帧退居 craft-evidence 与发布证据）。
- **门禁扩展**：`checkDemoMotion`（deslop `demo-motion` 门）——demo-* keyframe 属性 ⊆
  {background-color, border-color, border-top-color, opacity}，越界（transform/mask/位移类）触红；
  存在演示而缺 reduced 全灭精确分支亦触红。反例三向入 `deslop-scan.test.mjs`。
- **本单新增概念（复杂度台账）**：1 个演示区块 + 4 枚 keyframe + 1 条 `demo-motion` 门。
  为何非加不可：hero 微演示是票面主定向（杠杆④「秩序件当主角」）；门是「数据区绝对静止」
  从书面承诺升格为机器事实的最小载体。无新依赖、无 JS、无状态机。
- **同批清理**：`10-milestone-workbench-{1440,720}.webp` 因 hero 换装成为零引用死资产，已删
  （真机原始帧保留于 `craft-evidence/MILESTONE-SHOTS-1/`）。
- **登记（不越单）**：`07-og-source-clean-workbench-{1440,720}.webp` 经全站引用核对为前置死资产
  （og.html 不消费任何截图），先于本单存在——留给独立验收按 fix-by-acceptance 处置或架构另裁。
- 逐帧采样、三态证据与原始数据见 [`craft-evidence/SITE-CRAFT-2/`](craft-evidence/SITE-CRAFT-2/) B2 节。

### B3 · 前卫版式探索：文书文化抽象引用（杠杆③ + SVG 件库起步，实现完成）

三件均为抽象引用（无法槌/天平/具象纹样），全部静态零动效；SchemaParts「原生 SVG」约定在站面
起步为两枚内联件（骑缝齿、落定章），与 Design 稿共用的件库化留待稿面材料到位后续批。

- **卷宗编号体例**：五段 eyebrow 前缀「卷一…卷四 / 卷尾」，hero 保持封面无号——整页读作一册
  卷宗的分卷目录。纯文案，沿用 mono eyebrow 字面（12px 小字号不上仿宋，遵守选型拍板的
  断笔风险边界）；不触碰 `>0X<` 编号脚手架禁区。
- **骑缝式分隔**：卷二（真机证据台账）与卷三（catalog 投影）之间的接缝以半划齿痕 SVG 标记——
  「同一册连续台账跨缝完整」的完整性隐喻，恰置于真跑与投影的分界。currentColor 刻线，
  无新色；`scenario-ledger` 的 border-top 由骑缝行接替。
- **印记式落定章**：承诺暗版右上 88px 方印，阳文白线（`--plate-text`），印文与首则承诺同文
  「不改原件」（2×2 朱雀仿宋 28px，>20px 安全字号；四字已在子集清单内，零再生成）。
  拒印泥红——红的语义预算只属于风险与删除；静态 -2° 微倾，`aria-hidden` 装饰层。
  deslop 新增印章 tether：印文 ≠「不改原件」或首则 dt 漂移，任一即触红（双向反例已实测）。
- **本单新增概念（复杂度台账）**：2 枚内联 SVG 件 + 1 条印章 tether + 编号体例（纯文案）。
  为何非加不可：三件是杠杆③的票面定向；tether 是印章与盟约「同文」这一宣称的机器封口。
  无新资产文件（内联）、无动效、无依赖。
- **实现期判例**：在未提交工作面上验证 tether 反例后，误用 `git checkout -- site/index.html`
  还原——把整份未提交的 B3 HTML 冲回上一提交态（CSS 幸存）。已重施并以探针断言全件在场；
  规程修正为：未提交面上的反例注入只能用反向补丁还原（`checkout` 只适用于已提交基线上的
  验收注入）。供后续会话引以为戒。
