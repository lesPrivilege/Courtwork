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
