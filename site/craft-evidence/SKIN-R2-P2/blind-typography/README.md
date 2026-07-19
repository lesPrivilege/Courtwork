# SKIN-R2 P2 · C / D 真工作面盲测证据

结论先行：**当前证据不支持 D“明证胜出”，建议保留 C。** D 通过了 12–13px 可读性与 overflow 硬门，并在数据密度和冷色工作面作者性上更强；但组织者预评分只领先 `1.3/100`，落在预先锁定的同分区。按“同分取 C、举证责任在挑战方”，本批不得把 D 写入消费值。此结论是 P2 签署输入，不是架构/产品签署。

## 实验边界

- 基线：`967694e740de62e991fe7e6b1f4f0f8abbe55f13` 的独立 clone。
- C：现行标题、文书、功能、数据轨原样。
- D：标题轨与文书轨原样；功能轨临时注入 Sarasa UI SC Regular/SemiBold，数据轨临时注入 Sarasa Mono SC Regular。
- 注入只存在于 Playwright page data URL 与临时 `p2-blind.html`；未改 `apps/desktop/src/**`、`tokens.json`、现行 `@font-face`、subset manifest 或 SOURCE 链。
- 固定真实状态：welcome、RiskList、Settings、Compare、非 demo 空案、带真实起草面样式的长文 fixture。
- 固定尺寸：`1180×720 / 1280×720 / 1440×900 / 1600×900 / 2400×1000 @1x`；reduced-motion，sRGB。
- 四密度实值同帧统计：12px meta、13px dense、14px body、16px document，不虚构额外“密度开关”。

## 结果

1. 16 张 Chromium 全帧中，C/D 的 12、13、14、16px 节点数与 overflow 数在每一状态逐项相等；12px 新 overflow 为 `0`。现有截断都是同一语义控件既有的 ellipsis/隐藏探针，两案一致。
2. 1440 RiskList：C/D 都是 `24` 个 12px 节点、`25` 个 13px 节点；12px overflow `0/0`，13px overflow `1/1`。D 未新增小字溢出。
3. CJK / Latin：UI 12px CJK 宽都为 `72px`；Latin `116.628 → 116.796px`（+0.14%）。13px 混排 `115.661 → 120.978px`（+4.60%），但 320px 受控换行 fixture 均为 2 行，真实控件 overflow 数不变。
4. 数据轨：12px CJK 都为 `48px`；Latin `93.92 → 78px`（-16.95%），D 扫描更紧且仍等宽。此为 D 最明确的效力增益。
5. 控制组：document 16px 混排均 `154.219px`，title 20px 混排均 `180.547px`；文书仍朱雀仿宋、`16px/1.75`，标题轨 family/weight 不变。长文帧的换行与文书几何不受 D 影响。
6. landmark 几何除 RiskList 的内容终点因功能行盒变紧 `8px` 外均逐位相等；workspace、Compare、Settings、空案与长文容器未漂移。
7. 三个实验子集共 `916,316` bytes；相对现行内嵌排印资产 `8,332,196` bytes 增加约 `11.0%`。data URL harness 的 wall 时间均值 `66.5 → 120.1ms`，只说明实验注入成本，**不得外推为生产首屏时延**。

## 覆盖与 fallback

- 上游全 UI Regular/SemiBold：各 `48,756` glyphs、`46,272` Unicode、`20,992` CJK Unified；Mono Regular：`56,872` glyphs、`51,072` Unicode、`20,992` CJK Unified。
- 盲测源集 `1489` codepoints。UI 全字库与子集均缺 `⌑ U+2311`、`✅ U+2705`、`💡 U+1F4A1`、`🧪 U+1F9EA`（另换行控制）；Mono 缺 `💡`、`🧪`（另 NUL/换行控制）。这不是零 fallback 字体。
- 本次 8 状态实际可见联合集为 `491` 个非控制 codepoints，UI/Mono 全字库及盲测子集均覆盖 `491/491`，所以帧内无候选缺字导致的 fallback 假象。
- 若未来再提 D，符号/emoji 必须走现有 SVG 记号或显式受治理 fallback；不得把系统 fallback 静默当作 Sarasa 覆盖。用户/模型正文的任意 Unicode 仍需独立 fallback 策略。

## AA 与引擎诚实边界

- WCAG AA：C/D 的文字色、背景色、字号槽完全同源，现行 AA 四元组逐位不变；字体置换没有借改色过门。
- Chromium 149 @1x 帧中，D 的 12–13px 笔画可分、未见粘连；这只是 Chromium 栅格证据。
- 本会话 browser runtime 发现为空；按 browser skill 的故障流程复核后未再伪造连接。主会话另以 `iab` 完成四张有效 computer-use 同态帧，见 `computer-use/README.md`。
- 系统 Safari WebDriver 在本机拒绝会话，明确要求用户在 Safari Developer Settings 启用 `Allow remote automation`。未越权改设置；因此本批**没有 Safari/Tauri WKWebView 权威 AA 证据**，也不冒称 WebKit 放行。D 若要落地，仍须补真壳小字复核。

## 证据索引

- `manifest.json`：16 张全帧 SHA、尺寸、字体加载、逐状态 12/13/14/16px overflow、landmark 与可见 codepoints。
- `metrics/sample-*.json`：字栈、baseline、换行、slot、contrast 控制组。
- `metrics/font-files.json`：全字体/子集 glyph、Unicode、CJK、UPEM、SHA。
- `score-sheet.md`：模型外人工盲评空表；尚未有人签填。
- `organizer-score.md`：揭盲前锁定的组织者预评分与同分区。
- `reveal.json`：盲标签映射与 commitment。
- `computer-use/`：iab 复核帧；2400 黑块件显式判 invalid。
- `scripts/`：可复现实验 harness；需显式 `COURTWORK_P2_URL`、`P2_SARASA_DIR`。

最终裁量：**保 C；D 不落地、不进退役账，因为消费值从未变更。** 若产品/架构希望继续挑战 C，应先由模型外评审填 `score-sheet.md`，再补 Tauri WKWebView 12–13px 同 fixture；仍需净胜过同分区，才形成 D 的产品终裁提案。
