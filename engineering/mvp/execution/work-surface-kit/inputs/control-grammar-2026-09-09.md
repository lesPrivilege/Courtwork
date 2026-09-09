# 用户转交 · Control Grammar（Exa 56 结果 / 5 workstream，2026-09-09）

用户以消息原文转交（附两张控件截图，未入库），Fable 转录要点，链接未经核验。消费裁定见 [intake-round-3 §4ah WK-129](../intake-round-3.md)。

**命题**：成熟工作软件的"厚度"相当一部分来自为数据类型和操作语义选择恰当的控件，而不是把一切降级成 button + text input + dropdown；不能只治理 Button / Input / Card，应治理一整套 Control Grammar，位置在 Schema / intent → **Control grammar** → Component anatomy → Shape / material / motion。**控件是 Schema 的人类可操作 projection**：`confidence: number, range 0..1, step .05` 推导出 Slider + NumberField，不由设计 agent 临场决定。

**第一版 canonical mapping**：boolean immediate → Switch（destructive → approval）；small exclusive enum → Segmented（>4/5 → Select）；large searchable enum → ComboBox（entity → picker）；discrete multi → Checkbox group（大集合 → multi-select）；entities / tags → Token field（+ autocomplete）；bounded approximate number → Slider（需精确 → Slider + NumberField）；precise integer → NumberField / Stepper；numeric interval → Range slider；date → DateField + Calendar；date/time interval → Range picker；ordered procedure → Stepper / Plan（可分支 → workflow）；short actions → Toolbar（context dependent → floating toolbar）；hierarchical → Tree / disclosure；status quantity → Meter（execution → Progress）；media time → Scrubber（rich audio → waveform）；record/play → Transport；conditions → Rule builder（复杂 → workflow canvas）；high-risk action → Approval control（quorum / policy / reviewer）。

**实现选型**：React Aria 提级（ToggleButtonGroup / ComboBox / TagGroup / GridList / DateRangePicker / TimeField / NumberField / Slider / Meter / DropZone…，只管交互语义、键盘、读屏、触控、国际化，不规定外观）；Base UI NumberField 的 **ScrubArea**（拖动 label / value 连续改数）——同一数值三种 modality（键入 / ± / scrub）。范式：React Aria / Base UI = behavior donor；Courtwork = visual grammar owner。

**Inspector grammar**：Inspector → section → PropertyRow（label / description / control / modified indicator / reset）→ conditional disclosure；property schema 决定 control（Boolean → switch、Enum ≤4 → segmented、many → dropdown、Number bounded → slider、exact → number field、Date → picker、Array → token、Group → disclosure、Entity → picker）；**validation 与 inspector 分离：Schema constraint ≠ UI affordance**（MetaBind Inspector 参照）。

**Waveform 作正式 control**：Waveform / Transport / Play-Pause-Stop / Scrubber / Current time / Duration / Trim / Annotations / Record state（waveform-playlist 的 engine / UI / adapter 分层）；按需加载，不让 DAW runtime 混入 Core。

**Contextual toolbar 一级模式**：selection / object → relevant actions only → compact floating bar；fixed / bubble（selection）/ floating（empty block）三分（Tiptap / Nuxt）；Courtwork：select text → Quote / Annotate / Ask / Mark issue；select artifact → Open / Diff / Download / Cite；select evidence → Accept / Challenge / Link proposition；select tool call → Inspect / Retry / Approve；select matter item → Move / Tag / Assign / Review——control 出现的位置也受 intent 治理。

**Policy / Rule 控件**：Tailscale visual editor ↔ canonical policy text 双向，GitOps 时 VCS 为 source of truth；Courtwork 的 Expert / Context / Approval policy、Matter governance、Tool permission、Retrieval / compile rules 皆可 human-friendly control surface ↔ canonical governed representation；**视觉控件只是编辑器，不是事实源**。

**CONTROL GRAMMAR 六类**：Selection（segmented / toggle / combobox / token）、Value（number / stepper / slider / scrubber / range）、Temporal（date-time / calendar / waveform / transport）、Command（toolbar / contextual toolbar / menu / command palette）、Structure（disclosure / tree / inspector / rule builder）、Governed Action（approval / threshold / reviewer picker / policy editor）。Shape 决定其圆角，Material 决定表面，Motion 决定 state response。下一份 specimen board 扩为 **Control Specimen Board**：segmented / slider + number / stepper / token picker / time range / waveform transport / contextual toolbar / inspector row / approval policy / rule condition，全部用真实 Courtwork 语义，不用 Option A/B/C 假数据。
