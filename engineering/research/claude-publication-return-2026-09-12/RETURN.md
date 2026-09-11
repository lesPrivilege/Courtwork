# return-publication-final-v1 · Claude Design · 最后一轮产品与发布筹备

工单：`engineering/release/ui-publication-closure-2026-09-11/ONE-SHOT.md`（含 Spark 定义、Settings 参考截图、Spark/Attention 形象修订三次增量）。作者：Claude Fable 5.1（单 writer）。作者自检 ≠ 独立验收；视觉与最终接受由 Astra 复核。

## 0. 基线与提交

| 项 | 值 |
|---|---|
| 基线 | CourtWork main `ec240e7`（含 Astra 已合入的 Stage 1 `2c7d181` + `90d7b65`、Pages 公共红 `9bdbb55`、形象修订 `9761e1d`/`ec240e7`） |
| 分支 / head | `claude/publication-final-v1` @ `f8b8914dfa466d6dbad452f3086703a380694748` |
| 提交顺序 | `53900a3` Chat 页 + 次级 chrome → `5018f3d` 普通控件强调色（Pages CTA 采用 Astra 公共红）→ `180e8bb` Spark/Attention 三组方向，方向 A 接入 → `885dfe5` 示例工作区 → `3a0d9e6` F1–F5 结构图 + README 叙事 → `1397b99` 示例样本按修正后 fixture 重录（**产品提交**，capture-plan 固定于此）→ `f8b8914` 媒体重拍批次 |
| 交付形式 | `claude-publication-final-v1.bundle`（`ec240e7..claude/publication-final-v1`）；`patches/0001–0007`；`source-manifest.json`（114 个改动文件的 sha256）；`changed-files.txt` |
| 冲突处理 | 变基时 `site/src/site.css` 与 `9bdbb55` 冲突：采用 Astra 的 `--campaign-action: #c95e55; --campaign-action-ink: #10161a`，保留我对 `check-figures.mjs` 中 hero 链接豁免的移除与 `figures.json` red_rule 文字；`control-accent.test.mjs` 断言改为公共红值 |

一条启动命令：`sh fixtures/start.sh`（在候选检出内）— 播种 capture fixture 并施加两项已记录修正，App 在 :8848，Pages 预览在 :8943。fixtures/ 内含本次使用的 fixture manifest（修正前后）与示例样本 manifest。

## 1. 可持续图标集（Stage 1，已由 Astra 合入 → 本轮形象修订）

- 结构接入（sprite、registry、`ui-controls` 允许集、Settings 分组图标、header 概览图标、contact sheet、manifest、19 项结构测试）沿 `2c7d181` 不变。
- **形象修订**（`180e8bb`）：`engineering/design/product-icons-2026-09-11/atmosphere-20260911/` — 三组真正不同的成对轮廓方向，可编辑源在 `directions/{a,b,c}/{spark,attention}.svg`（24 格 · 2px · 圆头 · currentColor · 1px 安全边），`sheet.html` 先看图样与产品名（16/18/20/24、明暗、与 Chat 及通用图标同列），说明列在最后；真实导航照片 `nav/nav-<方向>-<主题>-<1x|2x>.png`（`capture-nav.mjs` 在活 DOM 换符号，sprite 不动）；`directions.json` 记每组感受与取舍。
  - A **Strike · Awake**：一笔斜出的火花与三道飞离的短线；只画上眼睑与瞳孔的刚睁开的眼。
  - B **Pop · Hold**：一点与三道分离的迸发短线；被开口的杯托住的一点。
  - C **Sprout · Regard**：单叶新芽与一粒游离的光；两道开弧之间的静止圆心。
  - **推荐并接入 A**：16px 真实导航中两枚都保有清楚轮廓；斜火花重心在左下、有方向，读作"离开"而非星形或分支；无下眼睑的眼读作"醒着"而非"监视"。B 的杯+点在 Chat 旁读作笑脸，迸发短线在 16px 失去间隙；C 的新芽在 16px 读作字母 P，( • ) 读作声音/震动。已知取舍：三道短线是漫画式火花惯用符号；眼也可能被读作日出。
  - **替换范围**：`tools/ui-vendor/courtwork/spark.svg`、`attention.svg` 字节与 `sources.json` 的 hash/origin；sprite 内 `#spark`/`#attention`；`vendor/manifest.json`；Stage 1 contact sheet 与 `glyph-manifest.json`；Stage 1 README 两个含义单元格。**不变**：语义键 `spark.surface`/`attention.agent`、产品名、可见标签、权限、Review 状态、owner、命中区、`chat.svg`、全部 Lucide、所有消费点。旧 SVG 保留在 `directions/current/`，Stage 1 截图（`evidence/stage-shots/s1-*`）与 Astra 修订文件夹里的用户截图未动。接入后的真实导航：`nav/nav-integrated-*.png`。
- Settings 参考截图（用户"可以参考"）：**采纳** 图标槽+标签的导航解剖、统一图标列、右侧开关解剖；**不采纳** 分类小标题、蓝色开关、代码语法配色（Astra ACCEPTANCE 的约束一致）。
- Spark 定义（cf4ab56）：公共文案取登记稿（Chat 页三面并置与 Pages `chat.html` 使用 "Spark 帮你准备工作所需的材料…" / "Fast, focused work for what comes next."）；未新增假生产按钮或后端；翻译只出现在示例身份内。

## 2. 次级 chrome 与 Chat 页（`53900a3`）

- `app/web/shell-layout.mjs` 宿主包（schemaVersion 1、macos、overlay、controlsInsetLeft 0–256、toolbarHeight 40–96；`?shell=desktop` 80px 回退；`courtwork:native-chrome` 事件），`html[data-shell="desktop"]` 下所有状态的表头与 view-switch 表头均让出安全矩形。
- 审计 `evidence/publication-final-20260911/native-chrome-audit.mjs`：5 种包 × 7 种状态（含通过"Expand preview"进入的真实展开工作面）× 1440/1280/390 + 活更新序列 = **108/108**（`evidence/native-chrome-audit/results.json` + 截图）。它只证明浏览器几何：**AppKit 命中测试、拖拽、VoiceOver 未在此运行**，且所有截图均为浏览器模拟（已标注）。
- Chat 页 `app/web/chat-page.mjs`（最近对话、Work 标记、返回、三面并置 Open Attention / Open Spark、"What a chat keeps" 的诚实 planned 文案、示例入口）；Pages `chat.html`（01 TALK / 02 KEEP & CITE + `chat-carry` 图 / 03 HAND ON，示例对话标注）；Features 行与 README 链接。

## 3. 普通控件强调色（`5018f3d`）

- tier:S `--control-accent(-strong)-foreground`、`--control-unavailable-fill/ink-foreground`（明/暗独立）+ tier:R 别名；开关 on 态、`accent-color`、分段控件选中环；**pale-red 不可用对只用于 DOM 上真正 disabled 的控件**；off 态保持中性；Review/danger/diff/品牌红各自独立（`control-accent.test.mjs`、skin-policy 拒绝这些角色名）。
- 对比：`tools/contrast-report.mjs` 新增 5 对全部通过（如 control-accent vs panel 4.17 ≥ 3；unavailable ink vs fill 6.81 ≥ 4.5）；`settings-view.mjs` CONTRAST_PAIRS 同步。
- 治理登记：`engineering/design/color-governance.md` 追加节；Pages Paper CTA 与 Review 标记分离（Astra 公共红值），`check-figures` 不再豁免 hero 链接。
- 双列行号 diff 未改（用户裁定）。

## 4. 统一合成产品预览 = 示例工作区（`885dfe5` + `1397b99`）

- **最小独立预览层** `app/web/preview-layer.mjs`：置于 `request()` 之下，只在激活时用一份录制样本回答工作数据读取（projects / sessions / runs / work-* / attention / coordination），对示例对象的写入本地拒绝并给一句话；`/bootstrap`、provider、runtime、extensions 等宿主事实永不代答；Core、schema、server、数据目录未改（server 只加了静态白名单两项）。
- **一份故事**：`app/web/samples/preview/responses.json`（26 条工作答复、55 个示例 id，`manifest.json` 含 sha256 与 fixture 源提交），由 `app/scripts/record-preview.mjs` 从 capture fixture（含 Spark / Attention 会话修正）录制 — 与 Pages 媒体同一合成数据。
- **可进入/可浏览/可返回**：标题带 "Example" 字样；Home 首位横幅一句话 + "Start with your own work" / "Close the example"；故事项目行带 Example 标记；composer 项目选择永不列出示例项目；示例对话中的草稿留在页面不发送。
- **进入/退出/重开**：无项目且本机无记忆 → 自动进入；有数据 → 不自动进入，Chat 页 "See the example workspace" 重开；手动关闭记 `off`（无项目时 Home 继续提供入口）；**第一次真实运行完成（run/status completed）** → 永久退出并记 `established`（仅有回执或失败的运行不退出）；本机记忆是 localStorage 一个词。
- 覆盖五种情形（`evidence/preview-audit/results.json` + 截图，headless Chrome 对本脚本自起的空数据服务器与 8848 既有数据服务器）：新用户自动进入并浏览示例会话、运行被拒且草稿保留；离开→刷新不再进入→从 Home 重开；示例开启中建立自己的项目与对话，首个完成的运行关闭示例，刷新后保持，Chat 页仍可重开；既有数据不自动进入、从 Chat 重开且并列显示；已配置但不可达的 provider：运行启动失败，示例保持。**无本地运行时**：页面本身无法提供，无可进入之物（诚实极限，非产品代码通过）。
- 单元测试 `app/tests/preview-layer.test.mjs` 7 项；文档 `app/docs/example-workspace.md`。

## 5. 工程图与最后发布面（`3a0d9e6` + `f8b8914`）

- F1 `ownership`、F3 `runtime-anatomy`（Features 新节 "ORCHESTRATE, THEN COURT"）、F2 `compile-commit`（Experts，唯一红点 = 人的决定，`#compile-commit-decision`）、F5 `expert-composition` + `-compact`（Experts CONTRACT，720px 切换）— 来源为 Design v3 repaired-ab，按静态几何检查缩短了少数次级标签、F5 紧凑版重新堆叠，节点/边/成熟度/含义不变；`figures.json` 21 项、`pages-map.json` 映射、`semantic-guards` 计数 16→21。F4 = 复用：`copy.mjs` 说明文字与 pipeline 审计注已在 main 采纳（v3 F4-captions），未重画既有图。
- 叙事 "先编排，再引出 Court"：Features 新节引言、README 「工作如何衔接」一句并链接 Features/Experts；未回滚已合入标题或恢复保护性旁白。
- **媒体重拍**：`site/media/publication-final-20260911/` 26 张原生 1440×900 JPEG（13 组同态明暗对），`recapture-media.mjs` 真实导航拍摄、`finalize-media.mjs` 校验并写 `media/main/manifest.json`，上一批 manifest 归档 `media/archive/main-f1373cd.json`（JPEG 原样留在 `merged-20260911/`），`capture-plan.mjs` 固定 `1397b99`；说明 `evidence/publication-final-20260911/media-recapture.md`。与上一批的产品差异（侧栏 Chat 与新 glyph、Settings 分组图标、Appearance 的 diff 预览、控件强调色）即本轮改动；Home 运行数因在同一 fixture 上再施修正而多一次。
- Paper：本包不改论文正文、不推送 SE。既有预发布回执：SE `026d5cb` 已由 Astra 部署接受（`PAPER-RELEASE-REVIEW.md`）；`return-paper-prepublish-v1`（zip sha `a7ac80a1…`）中的 `RELEASE-PLAN.md` / `release-manifest.json` / `verify_prepublish` 50/50 仍是 SE 侧的发布依据，Courtwork 提交不等于 SE 部署。

## 验证（原始日志在 `logs/`）

| 检查 | 结果 |
|---|---|
| `npm --prefix app test` | 791/791 |
| lint-colors / lint-shapes / lint-interaction / lint-materials / check-doc-links / check-semantic-consumers / check-pages-semantics / contrast-report | 全部 exit 0 |
| `site/build.mjs --write-readme`、check-figures、check-links、check-material、capture-plan/public-data 测试 | 通过 |
| `site/scripts/verify.mjs`（预览 :8943） | 69/69（`evidence/site-verify/`） |
| `site/scripts/verify-product-pages.mjs` | 32 PASS / **4 FAIL** — 同样 4 项在**未改动的 main `ec240e7`** 上失败（`logs/main-verify-product-pages.log`）：检查器仍期望 tour 11 态/9 图/"Capture provenance"、get 页 "尚未作为签名桌面应用分发"、CLI 链接 `specimen/#step-candidate`，与 Astra 的商业产品呈现改稿脱节。未改检查器，留 Astra 裁定 |
| `site/scripts/check-capture-ready.mjs` | 失败于 `merge-base --is-ancestor`（固定提交尚不在 main 上）— 合并后即通过；若合并改写 sha，需重固定或重拍 |
| 视觉 | 1440/1280/390 明暗（`evidence/final-shots/`、`stage-shots/`、`stage5-shots/`、`preview-audit/`）；200% 为 `Emulation.setPageScaleFactor` **模拟**（`example-home-1440-zoom200-simulated.png`），非真实系统缩放；forced-colors / reduced-motion 由 Pages `verify.mjs` 覆盖，App 侧本轮未单独拍 |
| 键盘 / 返回焦点 | Chat 页与示例横幅为普通按钮与 region；`preview-audit` 中用 DOM click，非真实键盘事件 — **键盘遍历未在本轮实测** |

## 未测项、能力缺口、待 Astra 裁定

1. 方向 A 的视觉接受（用户反馈 + 非作者复核）；B/C 源与照片已在包内，切换只需替换两枚 SVG 并重跑 `build.mjs --icons-only` / `contact-sheet.mjs`。
2. 媒体批次的 `independent_reviewer` 为 pending；`check-capture-ready` 的 ancestor 门在合并后由 Astra 跑。
3. 四项过时的 `verify-product-pages` 期望（见上）。
4. 原生宿主：AppKit 命中/拖拽/VoiceOver 未测；`window.__CW_NATIVE_CHROME__` 包由宿主注入，本轮全部为模拟。
5. 示例工作区在"无运行时"下无法呈现（页面不可达）；若需离线示例，需宿主静态壳，超出本轮。
6. 键盘遍历与 200% 真实缩放未实测。
7. 上一批媒体的 JPEG 与 manifest 保留；新 JPEG 由作者拍摄，未做逐像素对照。

## 包内清单

`RETURN.md` · `source-manifest.json` · `changed-files.txt` · `claude-publication-final-v1.bundle` · `patches/` · `fixtures/`（start.sh、fixture manifest 前/后、示例样本 manifest）· `evidence/`（atmosphere-sheet.html + 2x 截图、atmosphere-nav、native-chrome-audit、preview-audit、site-verify、site-verify-product-pages、stage-shots、stage5-shots、final-shots）· `logs/`。
