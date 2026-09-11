# return-paper-v1 · Claude · SE Paper 串行开工返回

作者：Claude（Fable 5.1）· 2026-09-11 · 开工单 `engineering/release/claude-paper-2026-09-11/ONE-SHOT.md`（CourtWork main `bb1cba2`）。三阶段一次完整返回；作者自检不称独立验收，不声称已接收、合入或部署。

## 基线与实际现场

| 坐标 | 固定值 | 实际 |
|---|---|---|
| CourtWork 内容输入 | `02276730db8a32c24dddd8d514fb4f3b29bf5a5c` | 共享 checkout HEAD 为 `2337ada`（bb1cba2 之后一条 context-window 登记提交）；`git diff --stat 0227673 HEAD` 在本单相关路径只有 brand README 补裁定段、ONE-SHOT 新增、CLAUDE-BRIEF/README 的开工状态行；品牌 SVG、manifest、styles.css、site.css、frontend-contract 与 0227673 逐字节相同（hash 见 `source-manifest.json`）。消费按 0227673 读取 |
| SE reader 源 | `2817b8240c34d0754caf623e2a867cc168a260ab` | 从共享工作区 `git clone` 到 scratchpad 隔离副本并 checkout 该 SHA（工作树干净）；共享 checkout 未 checkout/stash/reset，DSH 观察分支与 reader-controls 未触碰 |
| 论文采用 | 9.6 / 2026-09-07 / `d78fd312…` | 不变；候选 HTML 的 `paper-edition`/`text-revision`/`source-commit` 元数据与现行 reader 相同 |
| 发布面 revision | 2026-09-11 候选 | `reader-revision=2026-09-11`，新增 `reader-candidate=paper-v1`；输出文件名 `…-reader-2026-09-11-paper-v1[-en].html`，不覆盖仓内已跟踪的 2026-09-11 文件 |

## 最近先例

- 阅读行为：`papers/reader/reader.js`@2817b824（mode/hash/language/theme），`papers/qa/verify_reader.mjs`（未改动即通过 72/72）。
- 出版尺度：CourtWork `site/src/site.css`@0227673 `--site-measure: 68ch`、masthead/figure 先例（源索引 §6.3）；Dystopia token `app/web/styles.css`@0227673 215–318。
- 署名：`brand/les-privilege/`@0227673 综合修订几何与两宗；本轮不重开几何。
- 受影响 grammar：仅 Paper reader 排印与控件 chrome；产品 App/Pages 的 Projection/Control/Placement 合同不涉及。

## 采用 / 适配 / 拒绝

逐项表在 `identity/README.md`「出版骨架：来源 / 采用 / 适配」。摘要：采用 Dystopia 角色静态映射、三卷/双语/主题/hash 行为、2026-09-11 候选标识；适配出版顺序、68ch、宽图突破、目录 rail、控件 chrome；参考三种官方文章节奏；拒绝会话中的 hex/尺寸作为来源；未消费社区 skill。

## 三阶段完成情况

| 阶段 | 状态 | 交付 |
|---|---|---|
| 1 · 两宗署名与出版骨架 | 完成 | `identity/`：黑/彩 × 明暗 × 1440/390 六张实例、同构建两版完整页面、`signature.inline.svg`、来源与采用表 |
| 2 · 原创编辑插画 | 完成 | `editorial/`：E1（可替换的手，留下的结构）、E2（光圈）、E3（尾迹）；各有宽/紧凑可编辑 SVG、明暗 PNG、claim 与来源定位、隐喻、借用/原创、角色→token、alt（zh/en）、裁切/安全区、真实显示尺寸、红的对象与作用 |
| 3 · 可运行出版阅读面 | 完成 | `reader/`：可应用补丁（`git am`）、源文件副本、隔离副本真实构建的中英三卷 HTML；预览直接打开或 `python3 -m http.server` |

**推荐构图：E1** 挂为 Canonical 封面（对应标题与摘要首句；结构为主体、执行者为次要线；不需要红）。E2 是强的第二选择（如 Astra 更看重"候选→效力"入口，可在同一挂载点替换，`cover.svg` 只需换成 `editorial/svg/E2-*.inline.svg`）。E3 作简练备选。

## 检查

见 `verification/README.md`。要点：SE build/validate PASS（历史字节不变）；译文门 8 tests OK；构建可复现；SE 原 QA 72/72；三视图 390 无横向溢出（修复了 Index 脚注长 URL 溢出）；44 张 1440/1280/390 明暗与长文截图；插画无文字元素。

## 未跑

推送与 Pages workflow；外链可达性；原生 VoiceOver/IME/forced-colors/灰度/真实缩放（以 720 视口 × DPR2 等价）；非作者验收；PDF 生成。

## 语义疑问与待裁

1. **封面只挂 Canonical**。Practice/Index 以自身标题开篇，无封面；若希望三卷同封面或各自封面，需要再绘。
2. **元数据 eyebrow 用词**：`Canonical Edition · Edition 2026-09-07 · 9.6 · 阅读面候选 2026-09-11`（英文 `Reader candidate`）；"Practice Snapshot / Practice Index" 取自各源 front matter Status，非新命名，但是否进入页面由 Astra 裁。
3. **章节标题改系统 sans**（显示标题与 dek 仍 serif）是作者排印判断；可回退为全 serif 而不影响结构。
4. **目录 rail 宽屏默认展开**由 JS 设置；无 JS 时折叠。若希望无 JS 也展开，需在模板输出 `open` 并在窄屏用 JS 收起（反向权衡）。
5. **`validate.py` 调色板检查值随材质改动**（`--canvas #edf1f3`/`#202b32`，`--ink #242d33`）；这是 reader 设施变更，集成时如保留旧值则旧检查失败。
6. **补丁包含带日期候选 HTML**（沿 SE 跟踪带日期 reader 文件的做法）；Astra 集成时可去掉 `-paper-v1` 后缀重建，或保留为候选文件。
7. **中横红与灰阶分色**未做实例（开工单固定彩色宗为上横红）；黑色宗反白在深底沿品牌包定义。
8. **E1 alt 的中文措辞**含"执行者"一词，与正文 executor/Operator 的对应留给 Astra 校。

## 写入边界

只写 scratchpad；未写共享 CourtWork/SE checkout、个人数据或凭据；未推送、未部署；未编辑论文正文、译文或 manifest。隔离副本 `paper-v1/se-src` 仍在 scratchpad（含本地分支 `claude/paper-v1-candidate`，提交 `77b7728`），不属于返回包。
