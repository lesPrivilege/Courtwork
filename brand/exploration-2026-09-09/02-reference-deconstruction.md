# EX-BR1 · 参考解构：两个 repo 的状态系统与品牌锁原则，现有品牌包的不变量

Sonnet，只读 explore。派单 [EX-BR1](EX-BR1-reference-deconstruction.md)；上下文 [00-brief](00-brief.md)、[01-semantic-field](01-semantic-field.md)；体例 [handoff-convention](../../engineering/mvp/execution/work-surface-kit/handoff-convention.md) §2 explore 卷。

**状态**：带溯源索引（外部两个 repo 的事实以 pinned commit 的 file:line 转录到下表；未转录部分只登记 URL，未展开）。

**只读声明**：本卷未修改 `brand/**`、`engineering/**` 之外的任何文件；未启动本地服务（未执行 `node brand/scripts/build.mjs`、未起 `python3 -m http.server`）；未下载图像/视频资产，只抓取文本文件（`.md`）。

**只读来源与 sha256**（本地 checkout `<isolated-checkout>`）：

| 文件 | sha256 |
|---|---|
| `brand/README.md` | `e573d6187108882058b00cfa2b3b9e9d924b5da754c11d2f7a6e45647039395f` |
| `brand/CONTRACT.md` | `9b8ed707efe9f9c704f2d7b79bed50037d7ff38f2d42fe049019597528364854` |
| `brand/geometry/mark.svg` | `522d4303216259490fb501458391431e8329a6aff8cfa3b463be6573d4614556` |
| `brand/src/court-symbol.mjs` | `f0341359d2266be26b5705249e43dad8abf68a96f3738e4637761cb81eb10a4e` |
| `brand/src/symbol.mjs` | `12618f4b36a7b1273fd4d8b8716618eccf626321ea8c753e0dfdfe44bfe5592f` |
| `brand/src/geometry.generated.mjs` | `9a35078536f5c70c460ad9e3afce2eac52f294495bd43810ae2aa2787cbc218d` |
| `brand/scripts/build.mjs` | `02550069cdc1372453caf942c20de7503d245ed2c268895262292de69dde7d1f` |
| `brand/tests/browser.mjs` | `39401e2ccd37689c2721a6557603cddb8cbce111d4d2ed8a2885721c0f91b5ce` |
| `brand/tests/host-colors.mjs` | `8089ad566e82d3233844a6b4fbdd105d71b9909bbe06dadade946abc47c845a4` |
| `brand/evidence/ACCEPTANCE.md` | `b5db1da49d2628f3fc8e955f8eee256f163a528227edee659b7851de5c60b0b4` |
| `brand/evidence/BR-1.md` | `7645d9c19da64bf0e082bbe51e605a795668c55afaf7040b1eec6ec520d076f0` |
| `brand/evidence/BR-1-review.md` | `3932011154898231ac4b1ef489ee99999ed73438cd9cb238ccd6082138ccc5b9` |
| `brand/sources/visual-runtime-index.json` | `367fa90818eebf398262db3e7a898c7227b6ad926ffb3529e2223ba3b1ef8f22` |
| `brand/exports/manifest.json` | `ac1457f03cd0e827bf5e3af93927c6e69bc422b11e86492c23e88f58f6904c73` |

**未找到**：`engineering/design/identity-specimen/**` — 工单只读清单列出该路径，但本 checkout（`<isolated-checkout>`）下不存在 `engineering/design/identity-specimen` 目录（`find engineering/design -iname "*identity*"` 无命中）；00-brief.md 第 3 行引用的 `identity-specimen/index.html` 链接在当前分支未落地。本卷未从该来源转录任何事实，也未访问其 URL。

**未访问的 URL / 未启动的服务**：未打开 `http://127.0.0.1:8842/`；未执行 `node brand/scripts/query-index.mjs`；两个外部 repo 中除下表列出的文件外，其余文件（如 `PROMPT.md` 第 1–139、261 行以后、`docs/troubleshooting.md`、`docs/provenance.md`、`prompts/images/*`、`prompts/video/*`、`brand-system-skill` 的 `BENCHMARK.md`、`CHANGELOG.md`、`CONTRIBUTING.md`、`.github/**`）已抓取存档但未在下表逐条转录，只作背景阅读。

---

## 1. 溯源索引行

```
video-states-website · https://github.com/amirmushichge/video-states-website @ 8e732893ab2367ef64e70fc01878ab70a23bf66e · 访问日 2026-09-09 · MIT(代码/文档)+CC BY 4.0(项目图像视频) · REFERENCE · 转录到本卷 §2
brand-system-skill · https://github.com/amirmushichge/brand-system-skill @ 30f6084ddf6adf4173cf882fce266015f8872c17 · 访问日 2026-09-09 · CC-BY-4.0 · REFERENCE · 转录到本卷 §3
```

- 定位方式偏离工单字面指示：工单要求"用 WebSearch 定位仓库"。实测 WebSearch 对 `"amirmushichge video-states-website github"` 与 `"amirmushichge brand-system-skill github"` 均**未返回目标仓库**（见下方"取舍"记录），改用 WebFetch 直接访问 `https://github.com/amirmushichge?tab=repositories`（对 video-states-website）与工单已给定的 `https://github.com/amirmushichge/brand-system-skill`（对 brand-system-skill）确认存在。这是观察，不是自行改写工单。
- Commit SHA 通过 `https://api.github.com/repos/<owner>/<repo>/commits/main` 首方获取并二次核验（两次独立 fetch 取得同一字符串）。
- 正文文件通过 `curl` 直接抓取 `raw.githubusercontent.com/<owner>/<repo>/<pinned-sha>/<path>`（第一手，字节精确，可 `cat -n` 取行号，已落盘并计算 sha256，见下）；仓库/README 存在性的最初确认使用了 WebFetch 的 AI 摘要（非字节精确，只用于判定"repo 是否存在"，不作为下表事实来源）。

| 文件（pinned commit） | 抓取方式 | sha256（本地落盘副本） |
|---|---|---|
| `video-states-website/README.md` | curl 直取 | `6bd1ec085d422166bd4abe677c1abe4ffafc862d2cb1959febf13bccf9ebf3a5` |
| `video-states-website/PROMPT.md` | curl 直取 | `f22fd6a6ec68b74426014957b23141c4922e1ee72932ffc0fe512492add82d29` |
| `video-states-website/docs/workflow.md` | curl 直取 | `38597e9763c0cbc27f2cb37c0e73fca31e694570f1f202a7161ab943ed9db728` |
| `video-states-website/docs/assets.md` | curl 直取 | `269e459e36ada50cf418ed70f09e0f9d990f700fe2bc60cd8705cead11ed1686` |
| `brand-system-skill/README.md` | curl 直取 | `d8a76a6c1c26ea666ad302fd522e9e6a8637310a7418b8938210cd7c5e6de1a3` |
| `brand-system-skill/SKILL.md` | curl 直取 | `afd8ee4b8cc807eb2a3218e082abacadb7d4f268e39a984f4dcff2a09bcc2de2` |

`brand-system-skill` 目录树（`git/trees?recursive=1` 于 pinned SHA）：`README.md`、`SKILL.md`（935 行，主实现文件）、`BENCHMARK.md`、`CHANGELOG.md`、`CONTRIBUTING.md`、`CITATION.cff`、`LICENSE`、`assets/*.png`、`.github/**`。无独立"Anchor Kit" schema 文件；Anchor Brand Kit 的规则整体写在 `SKILL.md` 的 Stage 2 / Stage 6 段落内，不是单独数据文件。

---

## 2. video-states-website 状态系统表

| 状态维度 | 取值 | 存储方式 | 切换机制 | 是否可回 base | file:line |
|---|---|---|---|---|---|
| Scene | `'base' \| 'environment' \| 'light' \| 'colorway' \| 'fullLook'` | 类型声明为参数（TS union），但每个取值绑定一段**预制视频文件**，非运行时生成 | 点击四个控件（Scene/Lighting/Clothing/Cast）之一触发对应 forward clip | 是；`base → forward(branch) → selected(branch) → reverse(branch) → base` 是唯一合法流程 | `PROMPT.md:175`, `PROMPT.md:182-184` |
| Playback | `'loading' \| 'ready' \| 'starting' \| 'playing' \| 'error'` | 参数（内存态，驱动 UI 反馈，不落盘） | 由视频元素就绪事件（`loadeddata`、`readyState`、`requestVideoFrameCallback`）与播放锁共同推进 | 不适用（Playback 是 Scene 切换过程中的进度态，不是"可回退"的对象） | `PROMPT.md:176`, `PROMPT.md:228-243` |
| Direction | `'forward' \| 'reverse'` | 参数 | forward 由用户点击触发；reverse 由 "Reset" 触发，二者各对应一条独立预制文件（非同一 clip 倒放） | 是；reverse 的终点即 base | `PROMPT.md:177`; 文件对照 `docs/assets.md:3-8`（如 `video-1.mp4` / `video-1-reverse.mp4`） |
| 预制文件基座 | `state-base.png`（公共 base）+ 4×2 条 mp4（forward/reverse）+ 4 张目的地静帧 | 全部为仓内 `public/retake/` 下的静态文件，"Generation happens during production, not when a visitor clicks" | 构建期离线生成（LTX + 剪辑），运行时只播放 | 是 | `README.md:9`, `docs/assets.md:5-10` |

**Scene state 与 Playback state 分离**：源文件明确写"Use independent scene and playback state"，把"当前展示哪个场景"（Scene）与"这次切换播放到哪一步"（Playback）拆成两个独立类型，二者用同一份 `Direction` 区分正放/倒放。`PROMPT.md:184` 进一步禁止 branch-to-branch 直接切换（"No direct branch-to-branch playback: Scene must reset before Clothing can run"），即任何非 base 的 Scene 值之间不能互相跳转，必须先回 base。

**状态是否预制**：是，四组 forward/reverse 共 8 个 mp4 + 5 张 png 全部预生成并提交入库（`docs/assets.md:3-10`），运行时只做"哪个 `<video>` 元素可见"的原子切换（`PROMPT.md:242` "Atomically switch which video is visible. Do not crossfade two different scene states."），不做实时插值或参数化渲染。切换机制的关键约束：切换前锁定输入、倒带隐藏视频到起点、等待其解码首帧就绪后再原子显隐（`PROMPT.md:236-244`，九步流程），可见帧结束前维持上一张有效画面（`PROMPT.md:238` "Keep the previously displayed frame visible and paused"）。

---

## 3. brand-system-skill 锁表

`brand-system-skill` 的 `SKILL.md`（Stage 6 "Brand Lock Setup"）与 README 均**不使用 "invariant / semi-stable / contextual" 这三个词**；原文用的是三个参照角色（reference role）：`SCENE REFERENCE MAY INSPIRE AT A HIGH LEVEL` / `BRAND KIT CONTROLS` / `PACKAGING / PRODUCT REFERENCE CONTROLS`，外加一个独立分组 `THE GENERATED SCENE MUST MATERIALLY CHANGE`（强制变更项，不属于"控制"或"可影响"的二分）。下表"归类"列照录原文标题，不代入 BR-2 的三档措辞。

| 属性 | 归类（原文标题） | 参考可否影响 | file:line |
|---|---|---|---|
| composition family（构图族） | SCENE REFERENCE MAY INSPIRE | 可，"not exact object placement" | `SKILL.md:624` |
| shot type / camera distance / camera angle family | SCENE REFERENCE MAY INSPIRE | 可 | `SKILL.md:624` |
| lighting direction and quality | SCENE REFERENCE MAY INSPIRE | 可 | `SKILL.md:624` |
| material and texture category | SCENE REFERENCE MAY INSPIRE | 可 | `SKILL.md:624` |
| depth / negative-space behavior | SCENE REFERENCE MAY INSPIRE | 可 | `SKILL.md:624` |
| visual rhythm / approved mood | SCENE REFERENCE MAY INSPIRE | 可 | `SKILL.md:624` |
| logo | BRAND KIT CONTROLS | 否（参考不可控制，只有 Anchor Brand Kit 控制） | `SKILL.md:646` |
| typography | BRAND KIT CONTROLS | 否 | `SKILL.md:646` |
| colors | BRAND KIT CONTROLS | 否 | `SKILL.md:646` |
| graphic language | BRAND KIT CONTROLS | 否 | `SKILL.md:646` |
| hierarchy | BRAND KIT CONTROLS | 否 | `SKILL.md:646` |
| white-space behavior | BRAND KIT CONTROLS | 否 | `SKILL.md:646` |
| product shape / design / SKU architecture / label zones | PACKAGING / PRODUCT REFERENCE CONTROLS | 由 Packaging Reference 控制，与 Scene Reference、Brand Kit 均不同源 | `SKILL.md:654` |
| people/character identity、poses、wardrobe、environment、props、background architecture、product interaction、crop、narrative details、brand-specific color treatment | THE GENERATED SCENE MUST MATERIALLY CHANGE | 强制要求"实质性改变"，是排除性约束，不是"可被参考影响"的正面清单 | `SKILL.md:630-640` |

**Anchor Brand Kit 与场景参考如何分开**：`SKILL.md:58` "Never allow the Scene Reference to control identity"；分开机制是审批门（Approval Gate 3，`SKILL.md:477`）先冻结 Anchor Brand Kit，再进入 Stage 6 时把 Scene Reference、Anchor Brand Kit、Packaging Reference 列为三个并列的 Required Input（`SKILL.md:609-616`），生成指令层面要求"Use the Anchor Brand Kit for identity and the packaging reference for product design"（`SKILL.md:749`）。

**流程步骤**（README 的 12 步核心工作流，与 `SKILL.md` 的 Stage 0–11 一一对应）：Stage 0 Onboarding（`SKILL.md:145`）→ Stage 1 Reference Deconstruction（`SKILL.md:221`，含 Approval Gate 2）→ Stage 2 First Brand Kit（`SKILL.md:288`）→ Stage 3 Creative-Direction Review and Refinement（`SKILL.md:355`，含 Approval Gate 3 冻结 Anchor Brand Kit，`SKILL.md:477`）→ Stage 4 Brand Guidelines（`SKILL.md:491`）→ Stage 5 Key Visual System（`SKILL.md:566`）→ Stage 6 Brand Lock Setup（`SKILL.md:605`，含 Approval Gate 4，`SKILL.md:689`）→ Stage 7 Consistency Audit（`SKILL.md:695`）→ Stage 8 Campaign Correction（`SKILL.md:732`）→ Stage 9 Campaign Asset Generation（`SKILL.md:758`）→ Stage 10 Packaging Concepts（`SKILL.md:793`）→ Stage 11 Final System Review（`SKILL.md:823`）。Reference Deconstruction 阶段（Stage 1）本身产出三类结果：Transferable Principles / Reference-Specific Elements（禁止复制项）/ Translation Opportunity（`SKILL.md:31-41`），"Extract transferable design principles without copying the source brand"（`SKILL.md:230`，Objective 行）。

**与 BR-2 三档的差异逐条列出**（00-brief.md BR-2 定义：Invariant = mark geometry·proportions·negative space·stroke logic·corner logic；Semi-stable = type·palette·material·elevation；Contextual = lighting·glass·blur·motion·background·composition）：

1. 词汇本身：BR-2 的 "invariant / semi-stable / contextual" 三词在 `brand-system-skill` 原文中不出现（已如上所述），是本工程自定义的移植措辞，非源仓库直接引用。
2. 分组数不同：源仓库是三个参照角色（Scene / Brand Kit / Packaging）+ 一个强制变更清单，共四组；BR-2 是三档。
3. "negative space" 在源仓库被列在 SCENE REFERENCE MAY INSPIRE 一侧（`SKILL.md:624`，"depth and negative-space behavior"）——即参考可影响；BR-2 把 negative space 划入 Invariant（不可被参考影响）。这是本表发现的唯一直接措辞冲突点。
4. "material" 在源仓库属于 SCENE REFERENCE MAY INSPIRE（`material and texture category`，`SKILL.md:624`）；BR-2 把 material 放进 Semi-stable（介于可变与不可变之间，非纯 Contextual）。方向一致（都不算 Invariant），但源仓库没有 Semi-stable 这一中间档，material 在源仓库是"可被参考直接启发"的一等项。
5. "graphic language / hierarchy / white-space behavior" 在源仓库属于 BRAND KIT CONTROLS（即参考不可影响，`SKILL.md:646-648`）；BR-2 没有把"graphic language / hierarchy / white-space"列入 Invariant 清单（BR-2 的 Invariant 只列 geometry·proportions·negative space·stroke logic·corner logic），这三项在 BR-2 里没有对应位置。
6. "lighting" 在源仓库属于 SCENE REFERENCE MAY INSPIRE（`SKILL.md:624`）；BR-2 把 lighting 放进 Contextual。二者虽用词不同（"may inspire" vs "contextual"），但都判定 lighting 为可变项，方向一致。
7. 源仓库没有"品牌几何/mark 比例/描边逻辑/圆角逻辑"这类图形基元层的锁定概念（它面向的是 logo/typography/color 这种"品牌资产清单"，不是单一符号的坐标级不变量）；BR-2 的 Invariant 档（mark geometry / proportions / stroke logic / corner logic）在源仓库找不到直接对应段落，是本工程针对"单一 mark 图形"场景的延伸，源仓库讨论的是整套品牌资产（logo 作为一个不可再分的资产，不涉及其内部坐标）。

---

## 4. 现有品牌包不变量表

| 不变量 | 位置 | 被第 1 层替换时的影响 | 可保留否 |
|---|---|---|---|
| 四矩形坐标/尺寸/圆角：`stem` x=7.2,y=4,w=11.2,h=52.8,rx=2；`line-1` x=28,y=7.2,w=28,h=9.6,rx=2.8；`line-2` x=28,y=25.6,w=28,h=9.6,rx=2.8；`line-3` x=28,y=44,w=19.2,h=9.6,rx=2.8 | `brand/geometry/mark.svg:4-7` | 直接被替换——这正是第 1 层重开的对象；替换后 `geometrySha256` 变化，`src/geometry.generated.mjs`、40 份 `exports/*.svg`、`exports/manifest.json` 会在下次 `node brand/scripts/build.mjs` 后自动重生成（见 §5） | 否（候选历史稿 E，按 00-brief BR-1 降级为同台候选之一） |
| `data-part` 命名与顺序硬约束：必须恰好是 `stem,line-1,line-2,line-3`，否则构建器抛错 `Unexpected canonical geometry` | `brand/scripts/build.mjs:6-7` | 若新几何仍是"1 个 actor + 3 条 record 线"且保留这 4 个 `data-part` 名与顺序，构建器可直接消费；若新方向的部件数量或命名不同（例如 00-brief BR-4 的 Folio/Governed Frame/Trace/Annotation candidate 未必是"1+3"结构），此断言会先抛错，需要先改 `build.mjs:7` 的期望值 | 结构断言本身可保留（防止意外几何漂移），但其具体期望字符串 `'stem,line-1,line-2,line-3'` 与新方向的部件数耦合，需要随新命名同步 |
| `write` 动词硬编码 3 条 record 线：`for(let i=1;i<=3;i++)` 逐条驱动 `[data-layer="line line-${i}"]` | `brand/src/court-symbol.mjs:31` | 若新几何的 record 层不是恰好 3 条，此循环上界需要跟着变，否则多出或缺失的层不会被 `write` 动画覆盖 | 不是纯几何问题——这是 CONTRACT 明文禁止改动的组件 ABI（00-brief BR-6："不得改 `brand/src/court-symbol.mjs`/`symbol.mjs` 的 ABI"），但其内部逻辑对"3 条线"这一具体几何形状事实上有隐式依赖，是几何与 ABI 之间的一处耦合点 |
| 材质降级阈值 ≤24px 强制降为 `hierarchical`（`glass/depth/luminous` 三种表现材质在小尺寸下被替换） | `brand/src/symbol.mjs:31` | 与几何坐标无关，是材质/尺寸逻辑，不因换几何而改变 | 是（CONTRACT.md:49 "尺寸≤24时三种表现材质自动降为无滤镜的 hierarchical" 与 README 同口径，属于材质契约而非图形基元） |
| 状态轴三组：`presence`(4)、`authority`(4)、`activity`(3) | `brand/CONTRACT.md:13-21`；实现于 `brand/src/symbol.mjs:4-6` | 与几何坐标无关；00-brief BR-6 明文禁止改 CONTRACT.md 的状态轴 | 是 |
| 八个动词枚举与语义（`summon…withdraw`） | `brand/CONTRACT.md:27-36`；`brand/src/symbol.mjs:2` | 动词名称/语义不因几何形状改变而改变；但各动词的具体动画描述（如 `write` 逐行揭示、`commit` proposal 层下落）隐含假设了"竖线+横线"的空间关系，新几何若不再有"竖线 stem + 横向 record 行"的空间对位，各动词的**运动描述文字**需要重新核对是否仍成立，动词**名称**本身不必变 | 动词枚举可保留；各动词的运动语义与新几何的空间适配性未核实（BR-5 已裁定第 3 层在第 1 层锁定后才派，本表不越权判断） |
| 40 份导出矩阵：8 concepts × 5 materials | `brand/scripts/build.mjs:12-17`；`brand/exports/manifest.json`（`"assets"` 数组长度 40，已用 `ls exports/*.svg \| wc -l` 核实为 40） | 全部由 build.mjs 自动重生成，不需手工触碰 exports/ 目录 | 是（矩阵结构可保留；具体 40 个文件内容会因几何替换而全部改变，这是预期结果不是意外） |
| 测试断言：4 个 `.part`（`tests/browser.mjs:11`）、write 动画 delay 序列 `0,40,80` 且总时长 220ms±.01ms（`tests/browser.mjs:12`）、重启/属性更新取消动画（`tests/browser.mjs:13-14`）、withdraw 后 record opacity 保留 1（`tests/browser.mjs:15`）、commit 不改宿主状态（`tests/browser.mjs:16`）、8 个动词全部 finished 且无残留动画（`tests/browser.mjs:17`）、断开连接取消动画（`tests/browser.mjs:18`）、多实例 ID 不冲突（`tests/browser.mjs:19`）、≤16px 材质降级无 filter（`tests/browser.mjs:20`） | `brand/tests/browser.mjs` | 断言 `.part` 数量为 4（`browser.mjs:11`）与 `write` 断言 3 条 record 线的时间序列（`browser.mjs:12`）都隐含"1 actor + 3 record"的几何部件数；新几何若部件数不同，这两条测试会直接失败，需要同步改测试期望值；其余断言（材质降级、动画取消、ID 隔离、commit 不越权）与具体几何坐标无关 | 测试**方法论**（native WAAPI 实测、时长±容差、状态不越权）可保留；测试中与"4 部件/3 record"绑定的具体数字需要随新几何同步 |
| Host color token 契约：`--cw-ink`/`--cw-record`/`--cw-background`/`--cw-depth`/`--cw-amend`，在各绘制点用 `var(--cw-role, themeDefault)` 解析 | `brand/CONTRACT.md:50-62`；实现 `brand/src/symbol.mjs:33-35,38-42,50-56`（据 `brand/evidence/BR-1-review.md:9` 核实一致） | 与几何坐标无关，是取色/token 层 | 是 |
| 组件 ABI：`observedAttributes`（`concept,material,size,presence,authority,activity,theme,label`）与 `play(verb)` 校验 `concepts` 枚举 | `brand/src/court-symbol.mjs:4`；`brand/src/court-symbol.mjs:21` | 与几何坐标无关；00-brief BR-6 明文禁止改此 ABI | 是 |

---

## 5. `build.mjs` 派生链

```
brand/geometry/mark.svg  (唯一手工编辑的几何源，4 个 <rect data-part="…">)
        │  build.mjs:5-6  读取文件、正则抽取 data-part 名与属性
        │  build.mjs:7    硬断言 part 名序列 === 'stem,line-1,line-2,line-3'，否则抛错终止
        │  build.mjs:8    对源文件全文计算 sha256 → geometryHash
        ▼
brand/src/geometry.generated.mjs  (build.mjs:9 自动写出；文件首行注释"Generated … Do not edit.")
        │  build.mjs:10   动态 import symbol.mjs 的 renderSymbol/concepts/materials
        │  build.mjs:12-17 对 8 concepts × 5 materials 做双重循环，每次调用 renderSymbol({…size:128}) 生成一份 128px SVG 字符串
        ▼
brand/exports/{concept}-{material}.svg × 40  (build.mjs:14-16 自动写出，附各自 sha256)
        │  build.mjs:18   汇总写出
        ▼
brand/exports/manifest.json  (geometry 路径、geometrySha256、40 条 asset 记录)

同时（运行时消费路径，不经过 exports/）：
brand/src/symbol.mjs:1  `import { parts, geometryHash } from './geometry.generated.mjs'`
        ▼
brand/src/court-symbol.mjs:1  `import { renderSymbol, normalize, concepts } from './symbol.mjs'`
        ▼
Web Component `<court-symbol>` 每次 attributeChangedCallback 触发 `renderSymbol()`，直接用 geometry.generated.mjs 里的 parts 数组画 SVG（不读 exports/ 静态文件，也不读 mark.svg 本身）
```

**换几何需要动哪些文件**：只需手工编辑 `brand/geometry/mark.svg`（保持 4 个 `<rect data-part="…">`，且 4 个 `data-part` 名与顺序等于 `stem,line-1,line-2,line-3`，否则 `build.mjs:7` 先抛错）。

**哪些自动重生成**：执行 `node brand/scripts/build.mjs` 后，`brand/src/geometry.generated.mjs`、40 份 `brand/exports/*.svg`、`brand/exports/manifest.json` 全部自动重写，无需手工触碰；Web Component（`court-symbol.mjs`）与纯函数 renderer（`symbol.mjs`）不需要改代码就能反映新几何，因为它们在运行时从 `geometry.generated.mjs` 读取 `parts`，而不是硬编码坐标——前提是 part 名称集合不变（`symbol.mjs:37` 的 `core(part,i)` 用索引 `i===0` 判断 actor/record，对 part 数量本身没有硬编码，但 `court-symbol.mjs:31` 的 `write` 动画循环硬编码了 `i<=3`，见 §4）。

**未自动重生成、需人工核对的部分**：`brand/tests/browser.mjs` 与 `brand/tests/host-colors.mjs` 不在 `build.mjs` 的写出范围内；`brand/evidence/**` 下的验收记录（`ACCEPTANCE.md`、`BR-1.md`、`BR-1-review.md`）是历史时间戳文档，换几何后不会自动更新，其中记录的具体断言（如 `browser.mjs:11-12` 的 4 parts / 220ms 时序）仍指向旧几何的部件数假设。

---

## 6. 结论

1. `video-states-website` 用"预制文件 + 两个独立参数类型（Scene/Playback）+ 方向枚举（forward/reverse）"实现状态系统，不做运行时生成或插值，Scene 与 Playback 的分离写在 `PROMPT.md:172-177` 的类型声明里。
2. 该仓库强制"任何非 base 状态之间不能直接互跳，必须先回 base"（`PROMPT.md:184`），并把"保留上一帧可见、原子切换、按需回退"写成九步播放器协议（`PROMPT.md:236-244`）。
3. `brand-system-skill` 原文没有 "invariant/semi-stable/contextual" 三词；实际是三个参照角色（Scene may inspire / Brand Kit controls / Packaging controls）加一个强制变更清单，四组并列，不是三档递进结构。
4. 该仓库把 negative-space、material、lighting 三项归入"参考可启发"一侧（`SKILL.md:624`），与 00-brief BR-2 把 negative space 划入 Invariant、material 划入 Semi-stable 存在措辞与归类方向上的差异，其中 negative space 是唯一direction相反的一项。
5. 现有品牌包的四矩形坐标（`brand/geometry/mark.svg:4-7`）与 `data-part` 命名顺序（`stem,line-1,line-2,line-3`）由 `build.mjs:7` 做硬断言，构成第 1 层重开的直接接触面。
6. `build.mjs` 的派生链是单向的：手工改 `mark.svg` → 自动重生成 `geometry.generated.mjs` + 40 份 `exports/*.svg` + `manifest.json`；`court-symbol.mjs`/`symbol.mjs` 不需手改即可反映新几何。
7. 组件运行时不读取 `exports/` 静态文件，只从 `geometry.generated.mjs` 读 `parts`；40 份导出 SVG 是独立可编辑产物，不是运行时依赖。
8. `court-symbol.mjs:31` 的 `write` 动词动画硬编码了"3 条 record 线"（`for(let i=1;i<=3;i++)`），`tests/browser.mjs:11-12` 也硬编码了"4 个 .part / 0-40-80ms 三行时序"，二者都对当前"1 actor + 3 record"的具体部件数有隐式依赖，而非纯粹从 `geometry.generated.mjs` 动态推导。
9. 材质降级阈值（≤24px→hierarchical，`symbol.mjs:31`）、状态轴三组（`CONTRACT.md:13-21`）、八个动词名称枚举（`CONTRACT.md:27-36`）、host color token 解析（`symbol.mjs:33-35,38-42,50-56`）、组件 ABI（`observedAttributes`、`play()` 校验）均与几何坐标本身解耦，第 1 层换几何不直接触及这些文件。
10. 工单指定的只读路径 `engineering/design/identity-specimen/**` 在本 checkout 不存在；`video-states-website`/`brand-system-skill` 的仓库定位实测经 WebSearch 未命中，改用 WebFetch 直接访问确认存在，后续正文事实均以 `curl` 对 pinned commit 的字节级抓取为准。
