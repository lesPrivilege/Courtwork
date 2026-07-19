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

### B4 · 磁青宗解冻置换 + 色彩语法四位落账（票面①③，实现完成）

站面自本批起入**磁青宗**（深靛蓝写经纸）：`themes.dark` 同源，站与壳 dark 同宗。
逐帧证据、对照实验表与对比度矩阵见 [`craft-evidence/SITE-CRAFT-2/`](craft-evidence/SITE-CRAFT-2/) B4 节。

- **冻结表到期**：B1 分治裁定②的 `siteFrozenColors` 按值冻结表整体删除，改为按**名**绑定
  `themes.dark`；`og.html` 六枚同规。site 私名归位 token 路径末段（`--ink→--text-primary`、
  `--focus→--border-focus`、`--danger→--red-fg`），即速裁「site 仅同步 token 命名」的终局形态。
  按名绑定以对照实验坐实：只动 tokens.json 一枚值、站面源码不动即触红（按值冻结表在同一实验下
  会保持全绿，故实验有真实区分力）。
- **品牌一致性闭合**（B1 分治裁定③挂账）：`icon.svg` 四路径几何一字不动、仅描边换宗；
  `og.html` 换宗并重渲 `og.png`。站标与壳侧 `icon-light/dark` 此后各绑本宗、同锚同源。
- **色彩语法四位落账**：磁青为底 / 墨为记 / 朱仅裁决 / 泥金 hero 唯一强调。泥金落在 hero 母题
  （磁青纸上以泥金写经，是本宗出处本身，`--gold` 绑 `semantic.amber.fg`——Q7 裁定该值在壳侧
  降格为琥珀 dark-fg 轨、「hero 语义只留站面」，同值两名、真源仍只有一处）。朱落在两处人做决定的
  地方：落定章与微演示处置动作。**朱的归位**：B3 落章时朱尚未入 token 故拒印泥红，B0 定值批准后
  朱成为独立语义族（朱＝人工落定/裁决），落定章正是该族原型件——这是补上当时缺的 token，
  不是放宽红的预算，红与朱在门内仍是两族。
- **本单新增概念（复杂度台账）**：`color-grammar` 门 1 条、`--meta` 分档变量 1 枚、朱/泥金 token
  4 枚（全部按名绑 `themes.dark`，非新色值）。**同批净删 4 枚**：B1 的 `--ink-deep / --plate-line /
  --plate-text / --plate-text-dim`——它们只是「亮站上唯一暗版」这一浅宗装置的脚手架，全站入磁青后
  零消费面。为何非加不可：`color-grammar` 是「朱仅裁决 / 泥金唯一强调」从文案升格为机器事实的
  最小载体（被宣告的克制若无门就只是文案）；`--meta` 是对比度闭合的规则形态，比逐处打补丁少 22 处
  改动面。无新依赖、无新状态机、无新持久化格式、无新构建步骤。
- **门禁扩展**：`checkColorGrammar`（纯函数，双向锁——越界触红 + 白名单零消费亦触红，防白名单烂掉）；
  测试六向反例。门体空转变异实测 26/26 → 25 passed / 1 failed，复原回 26/26，证门非空转。
  其余门面零放宽：无新 gradient / shadow / radius 登记项，raw-color 允许面由「按值 11 项」
  变为「按名 14 项」且新增项全部指向 `themes.dark`。

#### 元信息按底色分档（对比度）

深宗把中性阶与浮起面的明度差压窄了：`--text-tertiary` 在底纸 4.28:1、在 `bg-raised` 仅 3.14:1。
经产品负责人 2026-07-19 拍板取「站面消费侧升档」，新增 `--meta`（底纸 tertiary / 浮起面 secondary）。
低于 AA 4.5:1 的元素：基线 45 枚（最低 3.49:1）→ 未分档 50 枚（最低 3.14:1，回放峰值 2.67:1）
→ **交付态 14 枚（最低 4.28:1）**，两项均优于基线。残余 14 枚比值恰为 `themes.dark.text.tertiary`
在 tokens.json 中自述的 "对底纸 4.28:1"，即站面零本地劣化。

#### 提案区（交架构拍板，本单不越权改）

- **`[需架构拍板]` 分档法作为 B2 票面②的第三条闭合杠杆**：B2 现列杠杆为「字号/字重升档」与
  「值面复审」，并注明「色值单独加深伤中性阶层级非首选」。本批在站面实证了第三条：**按底色分档**
  （同一语义档在不同台阶上取不同中性值），零新色值、不动共用 token、层级不塌。站面 131 类消费点的
  同型问题在壳侧规模更大，是否采纳该杠杆属 B2 的取值裁定，本单只提供实证与数据，不动 `tokens.json`
  与产品壳。
- **`[需架构拍板]` `themes.dark` 缺 `bg.hover` 槽位**：B0 定值只到三级台阶，站面 `.button-secondary`
  的 hover/active 现由 `color-mix` 自派生（零新 hex）。壳侧 B5 深色批装载时会遇到同一缺口，
  建议届时或补槽位、或统一采派生式，不要两侧各派生一份。
- **前置死资产（B2 已登记，仍未处置）**：`07-og-source-clean-workbench-{1440,720}.webp` 全站零引用
  （og.html 不消费任何截图），先于 SITE-CRAFT-2 存在——留给独立验收按 fix-by-acceptance 处置或架构另裁。

### B5 · 文书记号系原生 SVG 首场 + SchemaParts 件库（票面②，实现完成）

「左侧彩色竖条退役候选」本批转正式：通用色条换文书系记号，四记号各司一职，全部抽象引用
（无法槌/天平类具象纹样），全部静态零动效。逐帧证据见 craft-evidence B5 节。

| 记号 | 职 | 消费面 | 形 |
|---|---|---|---|
| 鱼尾 | 节标 | 卷一/卷二/卷三/卷四/卷尾（hero 为封面不编号，沿 B3 裁定） | 刻本版心折叠标记，抽象为对称折带 |
| 文武线（乌丝栏界行） | 结构分隔·无彩 | 三处引语 blockquote（**退役的 `border-left` 通用竖条**） | 粗 2 / 空 2 / 细 1，取 `tokens.json` `rule.*` 规格 |
| 侧点圈点 | 强调 | 结论「违约金单向且畸高」 | 评点传统里标记要处的圈，抽象为空心环 |
| 朱印落定章 | 裁决落定 | 承诺暗版右上（框廓入件库，印文留消费点） | B4 已归位为朱；本批只把框廓并入单源 |

- **线重即层级语义**：文武线以粗细双线错落替代「均一 1px 单线」的 AI 工具脸——线的粗细携结构信息
  而非装饰，与色阶「阶的作者性」同构。
- **同批并入单源**：B3 的骑缝齿痕原为内联几何，本批并入件库（`#mark-seam`）——否则预留①即刻失效。
  该缺口是由 `schema-parts` 门的单源检查当场发现的，不是人工回看发现的。
- **结构纪律**：`data-stage="quote"` 的引语提取正则要求 `<blockquote>` 后**直接**跟正文，故界行以
  同级 `<svg>` + `.ruled` 定位容器承载，不塞进 blockquote 内部——记号入场零代价地保住了引语逐字校验。
- **本单新增概念（复杂度台账）**：SchemaParts 件库 1 个（5 枚 symbol）+ `schema-parts` 门 1 条 +
  `.ruled` 定位容器 1 个。为何非加不可：件库是就绪图「SVG 记号解耦预留」的载体，门是三条预留
  从书面约定升格为机器事实的最小形态。零新资产文件（件库内联）、零动效、零依赖。

#### 三条解耦预留 = 回迁 R2 零重绘的机器可验形态

| 预留 | 门实现 | 反例 |
|---|---|---|
| ① 站/稿/壳共用**单源** | 件库外零 `path/rect/circle/ellipse/polygon/polyline`，每处记号都是 `<use>` | 几何抄成第二份即触红 |
| ② 按 **token 名**消费不带值 | 件内 `fill/stroke` 只许 `currentColor`/`none`/`var(...)`；件库正文零色值字面量 | 件里写死色值即触红 |
| ③ **C-4 双主题渲染一致** | 由②推出——不携色值的几何在 light/dark 两宗下渲染同一份，宗由 theme 承载；另要求每件真有消费者 | 死件（零消费者）与 `<use>` 指向未声明件均触红 |

`schema-parts` 门自身受变异检验：门体空转 → `node --test` 由 27/27 转 26 passed / 1 failed，复原回 27/27。

### B6 · 排印光学 + 墨迹洇染压线单点实验（票面④的零下载部分，实现完成）

**范围声明**：票面④的**字体轨不在本批**。刻本标题类候选（齐伋体/京华老宋体类）与朱雀仿宋
正文轨都需联网取字并逐一核许可留快照；经产品负责人 2026-07-19 拍板「先做零下载的④」，
字体轨另开一批。既有选型记录已排除汇文系（授权不可审计），该结论不因本批改变。

- **排印光学（站面先行）**：`text-autospace: normal` + `text-spacing-trim: trim-start` +
  `hanging-punctuation: allow-end`，三条都挂 body 走继承，均为渐进增强。**适用面如实登记**
  （不宣称未测得的效果）：autospace 整页聚合 +7px，增量全部落在三处 fixture 逐字引语
  （唯一未加空格的中西混排）；trim-start 在当前渲染文案上**零作用面**（开合括号计数 0），
  按标准政策声明；hanging-punctuation 仅 Safari 实现，Chromium 148 `CSS.supports` 为 false，
  **本批未取得实测**。
  立身理由：人写的文案可以手加空格，**fixture 逐字引语不能动**——autospace 是让这些不可编辑
  字串拿到正确视觉字距的唯一机制，属机制而非装饰。
- **墨迹洇染压线单点**：`feTurbulence` + `feDisplacementMap`（scale 1.7）扰动界行边缘，
  纯几何、零色值、零渐变、零阴影、零动效。落点唯一——证据链「引语」节点的界行。
  **奖级工艺裁定「单点，不铺开」已写成门**：`schema-parts` 要求件库每枚 filter 全站消费点恰为 1；
  铺到第二处即触红（实测反例入册）。裁定只写在文档里就会被下一次顺手铺开，写成门之后铺不开。
- **本单新增概念（复杂度台账）**：`#ink-bleed` 滤镜 1 枚 + 单点消费计数 1 条（并入既有
  `schema-parts` 门，不新开门）。排印光学是三条标准 CSS 属性，零概念。无新资产、无动效、无依赖。
- **数据区静止复核**：7 个数据节点（卷宗计数 + 三处引语 + 微演示正文）1.2s 间隔前后包围盒
  逐位一致；洇染为静态滤镜，运行动画数不因它增加。

### B7 · 三轨字体制落地（④修订 · 字体编排，实现完成）

依据字体策略二次修订（`90ce965`）与排印凡例发凡一。逐帧证据、真上身对照实验与许可快照见
craft-evidence B7 节与 `noto/` `zhuque/` `juzhen-rejected/` 三个快照目录。

- **正文轨：首选拒收，落朱雀仿宋**。方正聚珍新仿两张授权逐张核实——个人非商业授权用途枚举
  （个人打印/微博图片/美化照片/学生作业）无网页一项且需购买（未核清）；授权条款明文禁止
  「格式转换后以嵌入方式应用到网站」，嵌入式应用属独立收费类目（明确不可用）。按拍板
  「任一未核清即以朱雀仿宋为落地值，不悬置不静默替换」落朱雀，拒收理由三处同时记名
  （CSS 注释 / 本节 / `juzhen-rejected/DECISION.md`）。**未下载任何方正字体文件**——核实先于取字。
- **标题轨：Noto Serif SC 2.003 双字重**（h2 400 / h3 700）。选 Noto 版而非 Adobe
  `source-han-serif`：前者版权行未宣告 Reserved Font Name（name 表实读），子集可保留原名；
  后者保留 `Source`，子集须改名。梯度取向＝大字号 400、小字号 700（宋体大字重本就厚，
  48px 加粗即糊；20px 反需补重量），字重携层级语义。刻本类候选按修订降为实验田探索项，本批不入主轨。
- **四条编排义务**：①仿宋补偿 14px→15px + 行高各 +.12；②`--font-doc` 把衬线西文体排在 CJK 之前，
  拉丁数字不裸回退到仿宋弱拉丁；③三枚子集精确取字 + `font-display: swap` + 清单字节双锚；
  ④排印光学（B6 三属性）与新字体同批复量，非各自为政。
- **本单新增概念（复杂度台账）**：`--font-title` / `--font-doc` 两枚字栈 token + `zh-title` /
  `zh-doc` 两个消费类。`checkDisplayFont` 未新开门，而是由「只守朱雀一轨」**泛化为逐轨可配**
  （消费类/清单/family/接线 token 四项参数化），一套门守三枚子集——这是净化不是加法。
  无新依赖、无新构建步骤（`build.mjs` 拷贝清单由单文件改为三文件循环）。
- **真上身核验**：`document.fonts` 报 loaded 只证明字节到位。CJK 字形普遍 1em 等宽，**量文本宽度
  对是否换字体零区分力**（首版探针即栽此：h3 宽度在 webfont 与系统栈下同为 117.6px）。
  改 canvas 像素指纹 + 「指向确不存在族名」的对照后，阴性对照落在零差异、三项实验均有差异，
  实验方有区分力。

#### 提案区补充

- **`[需架构拍板]` `--font-doc` 的西文兜底残留**：CSS 的 generic family 只能收尾，无法在 CJK
  之前钉死「西文到此为止」。若 Charter/Georgia/Times 在宿主上全缺，数字仍会落到仿宋弱拉丁。
  彻底闭合需自带一枚西文子集（增体积）或用 `unicode-range` 分段 `@font-face` 把拉丁段显式绑到
  指定西文体——后者零新字体、可机器验，建议随壳侧 B2-1 置换一并定谳，本单只登记不擅改。

### 与施工期并行落地的排印凡例的交叉核对（基线 `74b82b1` → main `816a9f5`）

本单施工期间 main 前进三枚（`90ce965` / `d8b2732` / `816a9f5`，排印凡例发凡起例）。
**文件面零交集**：对方只动 `docs/architecture/implementation-readiness.md`、`docs/design/README.md`、
`docs/design/typography-density.md`；本单动 `site/**` 与 `docs/design/site-evidence-line.md`。
验收 rebase 无冲突。内容面逐条核对结果：

- **发凡二·零粗体律与本单记号系收敛**：凡例裁定「文书面强调走记号系（圈点/侧点）、字号与墨色，
  不走加粗」。本单 B5 的侧点圈点正是按此机制落地（在该凡例合入前独立选定），
  两侧结论一致；站面既有 `font-synthesis: none` 亦已符合。
- **发凡四·`font-display` 属站面义务**：站面既有 `font-display: swap`，符合。
- **`[需架构拍板]` 发凡三「朱仅印记」与票面「朱批/朱印」的口径差**：发凡三墨色律以
  「朱仅印记」概括语义色稀缺性**既有**裁定；而就绪图 SITE-CRAFT-2 行的原裁定是
  「朱色专属裁决落定（**朱批/朱印**语义，彩色只在人做决定处出现）」，`tokens.json` 亦记
  `zhu` ＝「人工落定/裁决」。本单按工单票面与就绪图落两处消费面：落定章（朱印）与
  微演示处置动作（**朱批式描边**，刻意不做填充以免静态描绘被读成可点控件）。
  若发凡三的「仅印记」是有意收窄而非对「朱批/朱印」的简写，则本单第二处消费面应退回中性阶——
  **本单不自行判定**，两处引证并陈交架构定谳；`color-grammar` 门的朱白名单为两项，
  收窄即改门白名单一行，改动面已隔离。
