# 调研：社区反 slop 设计资产（DSGN-1）

状态：调研完成，供架构裁决后一网打尽。  
范围：SITE-1 产品官网 + docs/32 设计语言演进；方法「顺藤摸瓜到源码——只收有实物」。  
对照权威：docs/32（tokens / principles / typography / signature-line / svg-standards）、docs/35 de-slop 十二律（已灌入 32）、docs/36 schema 空间分册、docs/11 SITE-1 工单、docs/33 既有八站拆解。  
扫描日：2026-07-11。本地浅克隆对照：`Nutlope/hallmark`、`Leonxlnx/taste-skill`、`pbakaus/impeccable`、`JCarterJohnson/vibecoded-design-tells`、`anthropics/skills`。

---

## 0. 方法与边界

| 收 | 不收 |
|---|---|
| 可 clone 的 skill / 规则集 / 门禁脚本 | 「如何写出品味」散文、无源码播客 |
| 带 SKILL.md / 确定性 detector / 可跑 CI 的扫描器 | 只晒截图不公开规则的付费课 |
| 可审查 CSS/HTML 的营销站或开源站源码 | 闭源只靠 Figma 复刻的「感觉」 |
| 社区反复转的那几份（X 高互动 + GitHub 星数可核） | 一次性 blog 清单无仓库 |

**品味如何被编码成纪律（跨藤归纳，后文展开）：**

1. **禁令写法**：具名 tell（`side-tab` / `gradient-text` / `cream-palette`），不是「别太 AI」。  
2. **Token 化**：先锁 `tokens.css` / `DESIGN.md` / `PRODUCT.md`，中途禁止 inline 即兴色与字。  
3. **审计方式**：pre-emit 自评 → 确定性 detector（零 LLM）→ 可选 hook 拦写 → CI exit code。  
4. **失败模式**：用新默认替换旧默认（紫渐变 → 奶油+衬线+鼠尾草绿）——社区 2026 年已点名。

---

## 一、藤 1：kill AI slop 类 skill / 规则集

### 1.1 实物清单（有源码）

| 资产 | 星数（扫日 API） | 形态 | 可执行物 |
|---|---:|---|---|
| [anthropics/skills · frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | 160k（仓） | 单 SKILL.md（~55 行体） | 流程纪律：先 plan 再 build；点名三类 AI 默认 look |
| [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | 61.9k | 多 skill 包 + 三旋钮 | SKILL.md 长禁令表 + redesign audit + pre-flight |
| [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | 45.5k | 1 skill · 23 动词 · CLI · hook | **46 条确定性 antipattern**（`npx impeccable detect`） |
| [Nutlope/hallmark](https://github.com/Nutlope/hallmark) | 3.7k | 4 动词 + 20 主题 + 自有 demo 站 | **58 门 slop-test** + 六轴 pre-emit 自评 + 宏结构轮换 |
| [JCarterJohnson/vibecoded-design-tells · unslop-ui](https://github.com/JCarterJohnson/vibecoded-design-tells) | 0.4k | skill + `devibe_scan.py` + Reddit 语料 | 数据加权 tell 表 + CI vibe score + `unslop-ignore` |
| VoltAgent/awesome-agent-skills、awesome-design-md、rohitg00/awesome-claude-design | 索引仓 | DESIGN.md / skill 目录 | 形状参考，不逐条采信内容 |

X 上反复转的叙事与上表一致：taste-skill（结构/旋钮）+ impeccable（规则/钩子）成对使用；Hallmark 与 unslop-ui 作「门禁密度 / 数据溯源」补充（见 @undefinedKi 等串）。

### 1.2 源码要点（手法拆解）

#### A. Anthropic `frontend-design`

- **禁令粒度**：低——偏原则（「hero 是 thesis」「结构编码信息」「Chanels 出门前摘一件饰品」）。  
- **Token 化**：要求先写 4–6 named hex + 字族角色 + signature，再写码；但无机器校验。  
- **审计**：二次 critique，无 CI。  
- **关键坦白（源码原文）**：当下 AI 设计聚在三簇——(1) 暖奶油底 + 高对比衬线 + terracotta；(2) 近黑 + 单点酸绿/朱红；(3) 宽幅 hairline + 零圆角报纸栏。**三者合法但属默认而非选择**。  
- **与我们**：docs/32 已是「锁定系统」路线，比此 skill 更硬；缺的是营销面「先 plan 再 emit」的显式手势。

#### B. Taste-skill（`design-taste-frontend` v2）

- **三旋钮（token 化品味）**：`DESIGN_VARIANCE` / `MOTION_INTENSITY` / `VISUAL_DENSITY`（1–10），由 brief 推断表驱动，**禁止会话中发明别名**。  
- **禁令写法**：极密——紫默认、奶油+黄铜默认、三等分 feature 卡、split-header、section-number eyebrow、假截图 div、scroll cue、**em-dash 全禁**、假指标等。  
- **流程**：Design Read 一句话 → 旋钮 → 真实 design system 优先表（Fluent/Carbon/GOV.UK…）→ pre-flight 勾选。  
- **应警惕**：默认栈是 Next + Tailwind v4 + Motion/GSAP——**营销页工程**，不是法律工作台。

#### C. Impeccable

- **动词词汇表（23）**：`init` / `audit` / `critique` / `polish` / `quieter` / `distill` / `typeset` / `layout`…——把设计操作压成 agent 可调用原语。  
- **确定性 detector（46 id，源码 `cli/engine/registry/antipatterns.mjs`）**，节选与我们相关者：

| id | 含义 | 与 Courtwork |
|---|---|---|
| `side-tab` | 卡侧厚色条 | 已有：法理之线 2px 语义化，禁静默态（de-slop #1） |
| `nested-cards` | 卡中卡 | 已有：de-slop #2 |
| `bounce-easing` | 弹簧/弹性缓动 | 已有：动效八禁 #2 |
| `layout-transition` | 动画 width/height/padding | 已有：八禁 #7 |
| `ai-color-palette` / `cream-palette` | 紫渐变 / 奶油默认 | 已有浅色板岩系；SITE-1 须防第二默认 |
| `overused-font` / `single-font` | Inter 等 / 单字族 | **冲突见拒绝栏**——产品站系统字栈是刻意选择 |
| `icon-tile-stack` | 圆角方砖图标压标题 | SITE-1 feature 区须禁 |
| `dark-glow` | 深底色光晕 | 产品浅色唯一；营销若深底亦拒 |
| `marketing-buzzword` | streamline/empower… | SITE-1 文案红线 |
| `design-system-*` | 偏离 DESIGN.md | **可移植**：将来 skill 对齐 docs/32 tokens |

- **审计**：CLI + 编辑器 hook（写前/写后）+ `impeccable-disable` 行内豁免。  
- **init 产物**：`PRODUCT.md` + `DESIGN.md`——先语境后生成。

#### D. Hallmark

- **四动词**：default build / `audit` / `redesign` / `study`（从 URL/截图抽 DNA，禁像素抄）。  
- **Token 锁死**：主题选定后颜色与 `font-family` **只能走 named token**（gate 48）。  
- **Pre-emit 六轴**：Philosophy / Hierarchy / Execution / Specificity / Restraint / Variety，任一 <3 必改。  
- **58 门 slop-test** + 宏结构 21 选 1 + 主题 20 轮换 + `.hallmark/log.json` 防重复指纹。  
- **组件态铁律**：交互件 8 态（default/hover/focus/active/disabled/loading/error/success）强制 demo 页。  
- **与我们冲突点**：宏结构/主题轮换是为了**多 brief 多样站**；Courtwork 产品与官网要**同一语言**——轮换纪律应拒绝，**token 锁与 pre-emit 应吸收**。

#### E. unslop-ui（vibecoded-design-tells）

- **哲学硬句**：「本 skill 不给你品味；它只拆 tell 并逼你做一次项目特有选择。」  
- **数据**：47 subreddit · ~3.2M post 加权——精力打在真人点名的 tell 上。  
- **双模**：Build（先 brief：参考站 + 色 + 字 + 布局意图）/ Audit（`devibe_scan.py`，exit code = high 计数，CI 可闸）。  
- **关键进化**：v2 把 **cream + serif + sage** 也标为 vibe 默认——与 Anthropic frontend-design 产出方向对撞，故意互补。  
- **`unslop-ignore`**：有意选择可豁免——避免审计变成教条。

### 1.3 可移植结论（藤 1）

| 手法 | 移植到 Courtwork 的形态 |
|---|---|
| 具名 tell 表 | SITE-1 专用「营销 tell 清单」（见 §五），与产品 de-slop 十二律分册 |
| Token 锁 | 已有 tokens.json；SITE-1 单页 HTML 须 `:root` 全量镜像，禁裸 hex |
| Pre-emit 自评 | 建站单完工前 6 轴打分贴进 SPEC/PR 描述 |
| 确定性扫描 | 优先自研轻量（对齐 32/svg 门禁风格），或仅在 SITE-1 试用 impeccable detect 白名单规则 |
| 动词包 | 将来 skill 用 `init/audit/polish/quieter` 四动词即可，不必 23 |
| DESIGN.md init | 场景包工作坊 = 读 docs/32+36 即 init；勿再造第二套 tokens |
| 忽略标记 | 采用 `courtwork-deslop-ignore: <rule>` 注释纪律 |

---

## 二、藤 2：受盛赞的「品味设计」实物

### 2.1 实物清单（可审查优先）

| 实物 | 源码/审查通道 | 社区位置 | 取舍理由 |
|---|---|---|---|
| **midday.ai** | 开源 monorepo `midday-ai/midday` · `apps/website` | docs/33 已截图；数据区极静 | **可直接读 layout.tsx / metadata / font** |
| **linear.app** | 闭源；docs/33 DOM/CSS 提取 + 社区 DESIGN.md 复刻 | 行家默认参照 | 字重 510、0.1s 动效、hairline、密度 |
| **stripe.com** | 闭源；docs/33 提取 | 营销页天花板 | 字阶、负空间、斜切色带——**色带不采** |
| **vercel.com / Geist** | 部分开源 Geist；站本身可审 CSS | 硬朗网格 | 小圆角、瞬时响应、胶囊 nav |
| **raycast.com** | 闭源；docs/33 | KBD 文化 | 键帽感 → 已灌 32 typography KBD |
| **resend.com** | 闭源；docs/33 | 深色质感卡 | 噪声/金属——**产品面拒，官网慎** |
| **rauno.me** | 个人站可审 | 触感/弹簧 | **动效八禁直接拒绝弹簧** |
| **Hallmark demo 站** | `usehallmark.com` + 仓内 `site/_tests/` 自包含 HTML | 反 slop 产出样张 | 学「结构多样」勿学「主题轮盘」 |
| **Impeccable demos** | 仓内 `demos/landing-demo` + DESIGN.md | 规则驱动前后对比 | audit 话术样本 |

内部既有资产：`docs/33-设计素材-GeminiCLI/`（八站截图 + `design_styles.json` + 拆解报告）——本藤在其上**只补开源可证与营销专用技法**，不重做视觉综述。

### 2.2 源码要点（营销页技法）

#### Midday website（开源，可引用）

`apps/website/src/app/layout.tsx` 实物：

- **字族**：`next/font/google` 加载 **Hedvig Letters Sans + Serif**，`display: "optional"`，`preload: true`，`adjustFontFallback: true`，CSS 变量 `--font-hedvig-*`。  
- **OG / Twitter**：`metadataBase` + `openGraph.images` **双规格**（800×600 与 1800×1600 同源图）；`twitter.images` 对齐。  
- **结构**：Header / Footer / ThemeProvider / 极薄 page 壳——内容在 `StartPage` 组件，非巨型单文件。  
- **性能取向**：font `display: optional` 避免 FOIT 拖 LCP；与 SITE-1 Lighthouse 90+ 同向。

#### Linear 系（docs/33 已核 CSS 量级）

- Display **64px / weight 510**（变量字重，避开 700 糊边）——与我们 `font.weight.emphasis: 510` 同源。  
- 过渡 **~0.1s** cubic；静态无装饰动效。  
- 描边 `1px` 半透明；圆角 6/12——产品面我们收更紧（≤6，浮面 12 仅 elevation 外壳）。

#### Stripe 系

- Display ~48px，行高 ~1.15，字重偏轻；正文 14–16。  
- 营销留白大、仪表盘密——**双密度**；SITE-1 只做营销档，产品档已在 32。  
- 多重投影做浮层——**与我们零投影宪法冲突 → 官网也跟 32/49 零投影**，用描边+底色差。

#### Vercel / Raycast / Resend / Rauno

| 站 | 可采 | 拒 |
|---|---|---|
| Vercel | 网格、4–8px 圆角、瞬时 UI、Geist Mono 数据 | 过度 brutal 装饰线 |
| Raycast | KBD 实体感（底边加厚非 shadow） | 3D 键渲染成本 |
| Resend | 细描边、克制 hover | 深色金属与噪声滤镜（GPU） |
| Rauno | 触感反馈思路 | Spring / 拖拽回弹（八禁） |

### 2.3 可移植结论（藤 2）→ 营销页专用

1. **Hero**：一句话 thesis + 单一主 CTA（下载）；**不要**全视口居中空 hero + 渐变字。法理之线滚动点亮作为**唯一**签名微交互（SITE-1 工单已写）。  
2. **字阶**：营销 H1 建议 40–56px（中文宜偏下，防两行撞车）；字重 510；`letter-spacing: -0.01em`（≥16px 标题，32 已有）。测宽：标题尽量 ≤2 行、主句 ≤20 汉字。  
3. **正文字宽**：`max-width: 36–40rem`（约 65–75ch 中西混排舒适区）；impeccable `line-length` 门同向。  
4. **滚动叙事**：节数克制（Hero / 三场景 / 信任 / 工艺 / 合作）——**禁止** scroll-jack、scroll cue 文案、连环 zigzag 图文。  
5. **OG 卡**：固定产出 `og.png` **1200×630**（社媒主规格）；另可备 800×600。文案短：产品名 + 一句定位；**禁止**假指标。Midday 双尺寸写法可参考。  
6. **零/低 JS**：GitHub Pages 单页静态；动效仅 CSS（法理之线）；`prefers-reduced-motion: reduce` 必做。  
7. **性能**：系统字栈优先（与 32 一致，免 webfont LCP 税）；若引一款展示字，必须 `font-display: optional|swap` + preload + fallback metrics。  
8. **截图**：真机 visual-audit，无 PII；外框用 hairline，**禁止**手绘假浏览器 chrome（Hallmark gate 47）。

---

## 三、藤 3：skill 形态本身

### 3.1 实物清单（打包形状）

| 形状 | 代表 | 结构特征 |
|---|---|---|
| **单文件原则 skill** | Anthropic frontend-design | YAML frontmatter `name`+`description`（触发）+ 短正文 |
| **索引 + references 懒加载** | Hallmark | SKILL.md 调度；按步 `load ONLY` 子文件防烧 token |
| **旋钮配置 skill** | Taste-skill | 文首 dial 数值 + 推断表 + 长禁令 |
| **动词路由器** | Impeccable | `/impeccable <cmd>` → 23 命令；`init` 写 PRODUCT/DESIGN |
| **Skill + 确定性脚本** | unslop-ui / impeccable detect | `scripts/*.py|mjs`；CI exit code |
| **多 skill 包 + CLI 安装** | taste-skill / hallmark | `npx skills add <repo>`；Agent Skills 兼容 |
| **Hook 拦写** | Impeccable | 编辑器 post/pre tool hook 跑 detector |
| **模板壳** | anthropics/skills `template/SKILL.md` | 最小 frontmatter 契约 |

### 3.2 源码要点（结构 / 触发 / 校验）

```
触发（description 字段）
  └─ 场景词：landing / redesign / audit / "looks AI" / "de-slop"
流程
  └─ pre-flight（读已有 tokens）→ brief/init → build → pre-emit critique → detector
校验三层
  ├─ LLM 自检（清单勾选 / 六轴打分）
  ├─ 确定性规则（正则/AST/计算样式）
  └─ 人工北极星（截图 / northstar HTML）
豁免
  └─ 行内 ignore + 项目 config ignoreValues（有意品牌选择）
```

**Hallmark 的 token 纪律**（可直接抄形状）：  
「需要新色 → 先写入 token 块 → 再引用；禁止 render 中途 inline OKLCH」。与 Courtwork「组件不得引入新色值」同构。

**Impeccable 的 init**（可抄形状）：  
先写「给谁 / 什么面（brand vs product）/ 反参考」再生成——对应我们场景包工作坊开工读 32+36。

### 3.3 可移植结论 → 未来「Courtwork 设计 skill」形状建议

> 目标：把 docs/32 + docs/36 打成场景包工作坊的**设计工位**，不是再发明一套美学。

建议包结构（**仅形状，本单不建仓**）：

```
skills/courtwork-design/
  SKILL.md                 # frontmatter 触发：UI/组件/场景 renderer/官网
  references/
    tokens-contract.md     # 指向 docs/32/tokens.json 的硬约束摘要
    principles-12.md       # principles + de-slop 十二律 checklist
    schema-space.md        # docs/36 五级嵌套 + 凡例
    site1-marketing.md     # §五 SITE-1 技法（营销面专用）
    tells-product.md       # 产品面 tell（侧线静默、卡套卡…）
    tells-marketing.md     # 营销面 tell（紫渐变、三卡、假指标…）
  scripts/
    deslop_scan.mjs        # 可选：裸 hex、box-shadow≠none、radius>6、禁字族…
  agents/                  # 可选：audit 子代理
```

| 维度 | 建议 |
|---|---|
| **触发** | description 含：工作台 UI、schema renderer、法理之线、SITE-1、de-slop、设计语言 |
| **动词** | `init`（复述 32/36 约束）/ `audit`（跑 scan + 清单）/ `build`（默认）/ `polish` |
| **校验** | 复用 desktop 既有 svg/e2e 门禁精神；SITE-1 另加静态 HTML 扫描 |
| **Token** | **唯一真相 = docs/32/tokens.json**；skill 只引用不复制第二份色板 |
| **拒** | 主题目录、宏结构轮换、VARIANCE 默认 8（产品面应锁定低 variance / 低 motion / 高 density） |

产品面旋钮建议锁死（对照 taste-skill 推断表「regulated / trust-first」）：  
`VARIANCE=3` · `MOTION=2` · `DENSITY=7`。  
SITE-1 营销面：`VARIANCE=4` · `MOTION=3` · `DENSITY=4`（仍远低于 landing 默认 7/6/4）。

---

## 四、与 docs/32 / docs/36 对拍表

说明：**十二律**取 docs/35 清理清单 1–12（已灌入 32 的 de-slop 基线）；**原则**取 principles.md §1–12 与 36 凡例。三栏供架构一网打尽。

### 4.1 已有（社区有、我们已硬编码——保持）

| 项 | Courtwork 落点 | 社区同构 |
|---|---|---|
| 侧色条仅语义、禁静默 | de-slop #1 · signature-line · e2e | impeccable `side-tab` · Hallmark side-stripe |
| 禁卡套卡 / 扁平列表 | de-slop #2 · principles §2b | `nested-cards` · taste 3-column ban |
| 线框图标、不着色 | de-slop #3 · svg-standards | icon-tile 禁装饰砖 |
| 紧凑密度 28–32 行 | de-slop #4 · typography dense | Midday 表单密度 |
| 圆角 ≤6（浮面壳 12） | de-slop #5 · tokens | Linear 6/12；我们更严于消费端 |
| 阴影归零 | de-slop #6 · shadow.none | 社区多「细影」；我们更严（架构级） |
| tabular-nums / mono 数 | de-slop #7 | 专业工具共性 |
| 颜色预算 4 相 + 板岩 | de-slop #8 · color.semantic | taste COLOR LOCK；impeccable design-system-color |
| 数据区静止 + 动效八禁 | de-slop #9 · principles §3 | bounce/layout-transition 检测 |
| 文字型空态 | de-slop #10 | impeccable onboard 方向 |
| 截断 + tooltip | de-slop #11 | text-overflow 规则 |
| 细滚动条 | de-slop #12 | 产品 polish |
| 字重 400/510 · 禁 700 | typography | Linear 510 |
| 0ms 状态硬切 | tokens.motion.stateChange | — |
| 五级 schema 嵌套封闭 | docs/36 | Hallmark「一层容器」同构 |
| SVG 机器门禁 | svg-standards | detector 哲学同构，域不同 |
| 命名领域无关 | principles §12 · docs/22 | — |

### 4.2 可补强（架构裁决后可收）

| ID | 补强项 | 来源 | 建议落点 | 优先级 |
|---|---|---|---|---|
| S1 | **营销 tell 分册**（与产品 de-slop 分家） | unslop / Hallmark / taste | docs/32 增 `marketing-tells.md` 或 SITE-1 工单附录 | P0 SITE-1 |
| S2 | **Pre-emit 六轴**（哲/层/执行/特异/克制/多样） | Hallmark | 建站与 renderer PR 模板勾选 | P1 |
| S3 | **确定性 deslop 扫描**（裸 hex、shadow、radius、禁渐变字、禁紫梯度） | impeccable / unslop | `scripts/deslop_scan` + CI；先 SITE-1 后 desktop | P1 |
| S4 | **OG 规格与生成纪律** | Midday metadata | SITE-1：1200×630 实图 + metadata 字段清单 | P0 SITE-1 |
| S5 | **Hero 签名唯一**（法理之线一点亮，其余静） | SITE-1 工单 + Chanel 原则 | SITE-1 验收例 | P0 |
| S6 | **假指标 / 假 chrome / 假截图 div 禁令** | Hallmark 46–47 · taste | SITE-1 + 对外材料 | P0 |
| S7 | **奶油+衬线+sage 新默认**明确列入营销禁 | unslop v2 · Anthropic 自述 | SITE-1 tell 表 | P0 |
| S8 | **文案 buzzword + 中文 AI 腔**清单 | impeccable marketing-buzzword · stop-slop 系 | SITE-1 文案审；与 writing-voice 衔接 | P1 |
| S9 | **`courtwork-deslop-ignore` 豁免语法** | unslop-ignore | 扫描器设计 | P2 |
| S10 | **Courtwork 设计 skill 包形状**（§3.3） | 藤 3 全谱 | 场景包工作坊工位；**后置**，不阻塞 SITE-1 | P2 |
| S11 | **组件 8 态 checklist**（营销 CTA / 下载钮） | Hallmark component-scope | SITE-1 按钮态 | P1 |
| S12 | **docs/36 细则填实后挂 skill references** | 36 骨架 | SCHEMA-SPEC-1 后 | P2 |
| S13 | **行宽 / 标题测宽**写进 typography 营销附页 | impeccable line-length · taste hero sizing | 32 或 SITE-1 | P1 |
| S14 | **Lighthouse 与 font-display 纪律** | Midday font optional | SITE-1 验收 | P0 |

### 4.3 应拒绝（社区有、我们不收）

| 项 | 来源 | 拒绝理由 |
|---|---|---|
| 宏结构/主题轮换 · 日志防重复指纹 | Hallmark | 产品+官网必须**同一设计语言**，多样 = 品牌分裂 |
| 「选极端 aesthetics / 每项目新 look」 | Anthropic frontend-design 调性 | 与 32 锁定系统相反；仅允许在实验沙箱 |
| 默认高 MOTION + GSAP/ScrollTrigger | Taste-skill | 违反数据区静止；SITE-1 亦只许一处 CSS 签名 |
| 禁 Inter/系统字栈 · 强制展示衬线配对 | impeccable overused-font · Hallmark 2+1 字 | 中文法律工具 **系统字栈是正确选择**；展示字可选而非强制 |
| 禁纯白/近白表面 | Hallmark pure white ban | 我们 `bg.raised=#FFF` 是审阅白卡契约 |
| 弹层细双影「专业感」 | 旧 Gemini 提案 / Stripe 营销 | 已二轮修正：阴影全站归零（含弹层） |
| Spring / 物理拖拽 | Rauno · soft-skill | 动效八禁 |
| 深色默认营销 | Linear/Resend 站 | 产品浅色唯一；SITE-1 跟产品语言（冷浅），不跟暗黑 SaaS |
| 斜切极光 / mesh / orb | Stripe 签名 · 社区 tell | AI 与营销双杀；SITE-1 拒 |
| 编号章节 eyebrow 当装饰 | 多 skill 已禁 | 与「结构编码信息」不矛盾——无序不编号 |
| 把 impeccable/taste **整仓安装**进产品 repo | 安装便利 | 规则与栈（Tailwind/React 营销）污染；只采规则形状 |
| em-dash 全球禁止写入中文正文规范 | taste / unslop-text | 中文破折号语境不同；**仅对英文营销句**采「少用长破折」 |
| 手写假浏览器/代码窗 chrome | Hallmark 禁 | 同意禁；不拒绝真截图 |
| 场景包每次「研究 DNA」换皮 | Hallmark study | 场景包必须盖 32+36 章，禁止 study 漂移 |

### 4.4 对拍总判（给架构）

- **产品面（desktop + schema）**：十二律与 36 骨架已覆盖社区「结构/颜色/动效/密度」主干；补强重心在**机器扫描 + 豁免语法 + skill 打包**，不在再加美学条款。  
- **营销面（SITE-1）**：是缺口——社区 2024–2026 的 tell 战争几乎全在 landing；应用 **S1/S4/S5/S6/S7/S14** 一次收齐。  
- **阴影**：社区仍流行「轻影 = 精致」；我们零投影是差异化宪法——**拒绝回潮**（与 RP-2.5 阴影拍板同向，以 32/49 为准）。

---

## 五、SITE-1 专用技法清单（建站单直接引用）

权威叠加：docs/11 SITE-1 · docs/32 全包 · docs/28 信任文案 · docs/92 叙事 · 本调研 §4.2 P0 项。

### 5.1 信息架构（单页）

1. Hero：定位一句 + 主 CTA「下载 macOS」+ 次信息（版本 / SHA-256 链到 SPEC Build 记录）。  
2. 三招牌场景：真机图（S6 成卷 · 时间线矛盾 · 审查→Word），每块左题右图或上题下图，**禁止**三等分 icon-tile 卡。  
3. 信任区：docs/28 直译四句（永不训练 / 原件只读 / 钥匙串 / 留人确认）——无营销形容词升级。  
4. 工艺区：法理之线故事（可含 Courtwork 词源彩蛋一句，克制）。  
5. 合作与联系：单列，无四栏 SaaS footer 模板。

### 5.2 视觉与 token

| 技法 | 规格 |
|---|---|
| 色与字 | **只消费** docs/32 tokens；`:root` 镜像；禁裸 hex |
| 投影 | `box-shadow: none` 全页（含 CTA hover） |
| 圆角 | 控件 ≤6；大截图容器 ≤12；表格/文书 0 |
| 描边 | `border.hairline` 划界；浮面靠底色差 |
| 字阶 | H1 40–56px / 510；导语 16–18；正文 14–15；meta 12 下限 |
| 字宽 | 正文容器 max 40rem；Hero 主句避免 ≥3 行 |
| 字族 | 系统栈与产品一致；**不**默认上 Instrument Serif / 奶油底 |
| 法理之线 | 仅工艺区 + Hero 签名；2px；禁每卡一条 |

### 5.3 交互与动效

- 全页默认静；**唯一**签名：滚动时法理之线点亮（CSS，可 `scroll-driven` 或极短 IO）。  
- Hover：120ms 内背景/边色，**无**抬升、无缩放图。  
- `prefers-reduced-motion: reduce` → 签名停在静止终态。  
- 下载钮 8 态可简化为：default / hover / focus-visible / active / disabled（无包时）——须可见 focus 环。

### 5.4 反 tell（SITE-1 验收可勾）

- [ ] 无紫/蓝粉 hero 渐变、无 gradient text、无 aurora/orb  
- [ ] 无奶油底+衬线展示+sage 点缀的「第二默认」  
- [ ] 无三列等分 feature 卡 + 圆角方砖图标  
- [ ] 无 section `01 / 02` 装饰编号、无「Scroll to explore」  
- [ ] 无假数据（「10x」「50,000+ teams」）、无假浏览器框  
- [ ] 无 Inter 特意 webfont（系统栈即可）、无 emoji 当图标  
- [ ] 无 streamline/empower/supercharge 英腔；中文无「赋能/打造/一站式」空转  
- [ ] 截图无 PII；外链与下载 SHA 真实  

### 5.5 OG / 社交预览

| 项 | 要求 |
|---|---|
| 主图 | `og.png` **1200×630**，单行产品名 + 副句，背景冷浅，含 wordmark 与法理之线母题一点 |
| 文件 | 仓库内静态路径，GitHub Pages 可解析绝对 URL |
| metadata | `og:title` / `og:description` / `og:image` / `twitter:card=summary_large_image` |
| 禁 | 图上堆满 UI 字、假星标、渐变字 |

### 5.6 性能与工程

- 单页静态 HTML（或极薄静态生成）；**零**营销用 React 运行时亦可。  
- Lighthouse Performance/Accessibility ≥90（工单）。  
- 图片：WebP/AVIF 可选；width/height 防 CLS；Hero 图不 `loading=lazy`。  
- 无第三方追踪默认；若统计须 opt-in（对齐 docs/28）。  
- 移动端：可读，主 CTA 可达；允许简化三栏叙事为纵叠，**不**另做深色主题。

### 5.7 验收引用句（可贴建站单）

> SITE-1 必须：与 docs/32 同语言；零投影；tell 清单 §5.4 全绿；OG 1200×630 实装；签名动效仅法理之线一处；Lighthouse 90+；文案信任区与 docs/28 逐句不升级。

---

## 六、附录：源码索引（复核用）

| 路径 | 用途 |
|---|---|
| `anthropics/skills/skills/frontend-design/SKILL.md` | 官方反模板原则与三默认 look |
| `Leonxlnx/taste-skill/skills/taste-skill/SKILL.md` | 三旋钮 + 生产 tell 长表 |
| `pbakaus/impeccable/cli/engine/registry/antipatterns.mjs` | 46 detector id |
| `pbakaus/impeccable/README.md` | 23 动词 · hook · DESIGN.md |
| `Nutlope/hallmark/skills/hallmark/SKILL.md` | 四动词 · token 锁 · pre-emit |
| `Nutlope/hallmark/skills/hallmark/references/anti-patterns.md` | 具名 tell 叙事 |
| `Nutlope/hallmark/skills/hallmark/references/slop-test.md` | 58 门 |
| `JCarterJohnson/vibecoded-design-tells/skill/SKILL.md` | unslop-ui 哲学与双模 |
| `JCarterJohnson/vibecoded-design-tells/skill/scripts/devibe_scan.py` | CI 扫描 |
| `midday-ai/midday/apps/website/src/app/layout.tsx` | 字体 + OG 双规格 |
| 本仓 `docs/33-设计素材-GeminiCLI/*` | 八站 CSS 提取与截图 |
| 本仓 `docs/35` §1 | de-slop 十二律原文 |
| 本仓 `docs/32/*` · `docs/36` | 对照权威 |

---

## 七、移交

- **产出文件**：仅本篇 `docs/59-调研-社区反slop设计资产.md`。  
- **下一步（架构）**：按 §4.2 表勾选采纳项 → SITE-1 建站单直接嵌 §五 → 可选开「Courtwork 设计 skill」工单按 §3.3。  
- **不在本单**：改 tokens、改 desktop、安装社区 skill 进仓、写官网 HTML。
