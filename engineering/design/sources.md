# Design 来源与消费快照 · 2026-09-05

三组 Luna 分别调研 Vercel、Linear/Apple、OpenWork/DSH；主线程复核 Vercel skill/指南、Linear 设计文章、Apple HIG 入口和 WCAG 对比度资料。只读文档与仓库，没有登录、截图、运行或审计上游 UI。GitHub 主分支未 pin，访问日不是发行版本。

## Skill、规范与社区解释

| ID / 类别 | 原始来源 | 核验与消费 | 不支持的外推 |
|---|---|---|---|
| S01 / 官方组织 skill | [vercel-labs/agent-skills 的 SKILL.md](https://github.com/vercel-labs/agent-skills/blob/main/skills/web-design-guidelines/SKILL.md) | 给 Agent 的 Web UI 检查工作指令；可以研究如何把规范变为检查项 | 不等于组件库或 runtime，不自动保证生成 UI 的质量 |
| S02 / 官方指南 | [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines)、[规范仓库](https://github.com/vercel-labs/web-interface-guidelines) | 键盘、焦点、loading、错误、长内容和异步状态；消费到 principles 与 UI04/07/12 | 品牌偏好、数值和乐观更新不机械套用；不能降低正式提交语义 |
| S03 / 官方设计系统文档 | [Geist Typography](https://vercel.com/geist/typography) | 字阶与阅读层级的研究对象；选定语言后再设计 tokens | “Geist”命名的第三方组件并非当然由 Vercel 维护；未选定字体/组件 |
| S04 / 官方产品方法 | [Linear Method](https://linear.app/method/introduction) | 明确问题、减少无效工作和逐步增强；启发任务路径与渐进披露 | 不把 Method 当 Design skill，也不规定所有工作必须用 issue 列表 |
| S05 / 官方设计案例 | [Linear UI redesign](https://linear.app/now/how-we-redesigned-the-linear-ui)、[Invisible details](https://linear.app/now/invisible-details) | 导航、层级和交互细节，供 A/B/C 的密度与效率对照 | 文章截图/叙述不是本次 UI 实测；低对比品牌外观不是无障碍依据 |
| S06 / 官方历史产品说明 | [Linear Command Menu](https://linear.app/changelog/2019-12-18-new-command-menu) | 研究按焦点与上下文组织高频操作；记录为历史说明 | 不以 2019 页面断言当前全部快捷键或行为；不要求每个动作都有三种菜单入口 |
| S07 / 官方平台设计资料 | [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/)、[Motion](https://developer.apple.com/design/human-interface-guidelines/motion)、[Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility/)、[Keyboards](https://developer.apple.com/design/human-interface-guidelines/keyboards) | 交互反馈、连续性、键盘与辅助技术；本轮 HIG 根页正文受动态渲染限制，细节以专项分队读取资料为线索 | 未核验到 Apple/Linear 官方通用 Design skill；不作不存在的断言，也不把第三方转译视作官方发布 |
| S08 / 本地社区转译 | [apple-design SKILL.md（历史路径：`</Users/lesprivilege/.codex/skills/apple-design/SKILL.md>`）](../migration/2026-09-08/evidence-index.md) | 将 Apple 设计理念转译为 Web 手势/动效的参考；只消费原则，不固定其所有数值 | 不是 Apple 官方 skill；库映射、CSS 建议与平台数值须单独核验 |
| S09 / 标准说明 | [WCAG 2.2 文本对比度](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)、[非文本对比度](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) | 为 prototype 定义可测试的对比度目标，保留条款与例外 | 对比度达标不代表完整 WCAG 合规或可访问性通过 |

官方与第三方的区分是来源责任，不是拒绝社区经验。可变远程 skill 在将来实际使用前需保存版本坐标和检查适用范围；不因安装/读取 skill 就允许其改写本项目 Authority 或发起未经授权的发布。

## 从 Agent GUI 文档提取的完成面

| ID / 证据入口 | 文档明确支持的观察 | 对应本项目要求 / 剩余验证 |
|---|---|---|
| G01 [DSH Quickstart](https://deepseek-harness.github.io/deepseek-harness/en/guide/quickstart) | 设置模型/key、选择 workspace 与输入任务的入口关系 | UI01–05；测试未配置、无 workspace、失败和草稿保持；不能默认它已满足全部分支 |
| G02 [DSH client 包地图](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/client/README.md) | 有 composer、附件、工作区、deliverables、approval、user-questions 等包 | UI05/10/11/14；包存在仅说明职责位置，不是流可用性证明 |
| G03 [DSH Trajectory UI](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/client/ui-trajectory/README.md) | 描述流式更新、尾部跟随、上滚暂停跟随和长记录处理 | UI06/07/09；借阅读不被打断的状态模式；仍需实际键盘/选择/滚动验证 |
| G04 [DSH Web Client](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/web-client.zh.md) | 描述队列、取消、控制流、baseline/cursor 与重连修复 | UI08/09/12；这是 DSH 特定协议，不能假设其他 Adapter 有相同游标 |
| G05 [OpenWork README](https://github.com/different-ai/openwork/blob/dev/README.md) | 产品壳包含 Web/Desktop/Server 等层，并有 headless 形态；ee 存在单独许可边界 | UI01/02/18 与生命周期参考；本轮没有逐项核验附件、Review 和恢复效果 |
| G06 [前轮工程生态快照](../ecosystem/2026-09-05.md)、[Courtwork 历史索引](../ecosystem/local-sources.md) | 提供 GUI wrapper、源码研究与旧失败线索 | 可作为 D1 取证题目；历史能力、旧 issue、当前文档和本次实测分开 |

OpenWork 与 DSH 都不因有 artifact/approval UI 就提供 SE 的正式成果接受语义。UI15–17 的版本、Evidence、Review 和工作义务来自本项目契约，要独立设计和验证。

## 下一轮取证卡

Motto TUI、Deswrit kit、Courtwork Design 与用户提供的 ChatGPT 讨论另见 [历史与网页参考裁取](reference-consumption.md)。它们不是当期 fresh brief；原建议中的工具与品牌偏好已经按事实、推论、不可访问项和未决选择分开。

```text
产品/页面与确切版本、日期、窗口和输入方式
用户任务与初始状态
操作序列、截图/录像定位
实际观察 / 文档声明 / 推断分别写
覆盖 UI-ID、失败/恢复入口、缺失证据
本项目裁取或不采纳、对应 Design Decision
```

若只有文档，不评价上游 UI “手感好”“焦点可靠”或“无错误”。原始截图放未来明确授权的证据目录，来源许可与个人内容先核对；本轮不下载或复制产品资产。
