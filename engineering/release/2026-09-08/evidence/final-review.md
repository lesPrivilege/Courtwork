# CourtWork 发布文档最终只读核对

归档日期：2026-09-08（Asia/Singapore）。Astra校正原回执日期；其余为Luna限定只读复核结论。
范围：只读检查 fresh engineering/release/2026-09-08/ 全部 Markdown、engineering/current.md、engineering/README.md、engineering/roadmap.md，以及 SE papers/notes/publication-surface.md 与根 README.md。未改项目文件、未跑产品测试、未 push。

## 判定

**通过；无阻断性文档矛盾。** 发布顺序与用户安排一致，候选/已发布/未验证边界有明确文字，路径与 anchor 校验通过。

## 顺序与责任

1. **Fable 独立 UI**：包含 Preview extensions 编排选择与唯一 writer；WK9 画布先选定再进产品实现（CourtWork engineering/release/2026-09-08/README.md:5-10，integration.md:5-10）。
2. **Astra runtime/回溯**：负责 runtime control、路由、静态模块准入、数据 adapter、Preview renderer 身份与恢复接缝；不重复 Opus 的控制面 UI writer（integration.md:11-23）。
3. **两笔完成后合流 Web 联调**：在隔离集成树核对 ancestor，锁定单 SHA，执行安装、测试、启动和同源操作/恢复链；只有前置完成才 push（README.md:9-12；integration.md:25-33）。
4. **push 后双线推进**：候选同步后，发布线按候选源码 → 对外 preview/Pages → Web 体验 → 可构建 GUI DMG → 后续签名/公证推进（README.md:31-37）。文档没有把 DMG 写成现有产物或能力。
5. **同步后独立网页 GPT Pro review**：触发条件明确为 UI 与 Astra 两笔完成、合流 Web 验证、端云候选同步；输入契约要求固定 SHA/lockfile/Paper 版本并区分实际阅读与遗漏（README.md:13-14；review-handoff.md:1-17）。

current.md:28 同样按“Fable → Astra → 合流 Web → push → Pages/DMG → 同步后 GPT Pro review”表述，并明确当前不记作已完成、已推送/发版或已提交 review。evidence/local.md:6 已注明并行盘点时缺少的发布稿/回执现已补齐，避免旧观察被误读为当前缺口。

## 关键边界与成熟度

- integration.md:9 已按 BR-1 最新记录写明品牌候选由 WK6 以 f61120e 消费、adb2e01 补宿主映射；集成前仍复核最新祖先，避免重复施工。
- Runtime、Preview、Core 与 UI 的 owner 分开；Preview 仍消费真实 identity/projection，不取得 Core 写权，不把 UI allow 变成 Artifact acceptance（integration.md:15-21；engineering/design/work-surface-boundaries.md）。
- public-surface.md:1-49 是发布面草稿，要求真实截图/preview 绑定 SHA，并禁止没有托管体验时放 “Try live”、没有 DMG 时放 “Download for Mac”。
- README.md:45-47 明确本阶段只落盘安排，不宣称 UI 选型、runtime 缺口、合流、push、Pages、DMG 或 GPT Pro review 已完成。
- SE 入口保持独立：papers/notes/publication-surface.md:41-49 区分 SE 9.3 工程采用基线、9.6 本地候选与 CourtWork 发布；根 README.md:17-21,36-38 将工程反馈、CourtWork current 与论文发布面互链，并声明发布面草稿不改变论文版本/状态。

## 机械检查

- 发布目录共 6 个 Markdown：README.md、integration.md、public-surface.md、review-handoff.md、evidence/local.md、evidence/reef.md。
- 对上述文件及 current/engineering README/roadmap、两份 SE 入口共 12 个文件做本地 Markdown link/anchor 检查：**0 个缺失路径，0 个 anchor mismatch**。
- engineering/research/experts-hotplug-2026-09-08/README.md:95 的 #nda--experts-验证路径 与 engineering/roadmap.md:173 的标题匹配。
- git diff --check：通过，无输出。

未运行产品测试或浏览器验证；本报告只证明文档结构、链接和顺序表述，没有把这些文档转化为实现、push、Pages 部署、DMG 或 review 完成证据。

