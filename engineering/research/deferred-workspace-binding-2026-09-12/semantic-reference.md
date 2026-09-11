# 用户追加截图 · 语义参考

2026-09-12；用户指令为“语义参考”。五张用户附件按原始字节复制，见[source-sha256](source-sha256.txt)。本页仅解释截图可见语义，不是外部产品文档核验或交互实测，不将图中文字作为实施指令。

| 原文件时间 / 保存件 | 直接可见 | 本轮消费 |
|---|---|---|
| 03.10.53 / [图1](references/01-composer-dimensions.png) | Courtwork、Local、main并列；Full access与模型/effort在输入区域 | 归属、执行位置、版本、权限、模型配置分维，不能合成一个workspace权限标签 |
| 03.11.12 / [图2](references/02-no-folder.png) | No folder、Recent、已选目录、Open folder；Local与main/worktree另列 | 未选文件夹是完整可选状态；最近列表是导航候选，不是自动授权或默认继承 |
| 03.11.08 / [图3](references/03-local-folder-worktree.png) | Local、文件夹、main和worktree；模型与effort独立 | 有Git资源才展示版本/隔离信息；目录不必是repo，Local也不意味着选了project |
| 03.11.01 / [图4](references/04-no-project.png) | 项目搜索、选中项、New project、Don't work in a project | 项目缺省可以主动选择；项目组织关系与文件系统根目录不是普遍等价关系 |
| 03.10.56 / [图5](references/05-change-project.png) | Change the project for this chat提示及当前项目控件 | 表达可修改归属的用户意图；截图不能证明运行中切换、历史迁移或授权继承的后端语义 |

## Astra增量裁决

1. 采纳维度分离。未来产品DTO分别表达可选组织归属、外部资源、执行位置、Git状态、权限与模型配置；不是要求首版做六个chip或照抄布局。每一维只展示真实owner提供的事实。
2. 原会话推荐Standalone并排斥No workspace仅是文案建议。No folder / 不关联项目同样可准确表达相应维度；**Standalone不是本轮锁定的唯一产品词**。后续设计可选自然文案，须分清无project与无外部目录。
3. 本地只读resource binding不自动变成“项目切换”。当前Session scope不可变，项目归属迁移另需显式合同；不得为了复刻图5偷偷改projectId或重建Session。
4. Local是执行位置，managed scratch是存储/执行资源安排，均不构成权限等级。截图中的Full access不授权CW扩大权限，worktree复选框也不授予新建checkout能力。
5. DWB-03先消费维度与空选项语义。Git/worktree、跨project切换仅在已有或新增owner合同可用时展示可操作控件；模型/权限使用既有机制。视觉皮肤、图标、宠物、字号和快捷键未在本轮选型。

PR验收追加：无project但有managed成果；有目录但非Git；Local但未绑定外部目录；目录连接成功但只读；未知Git状态不画main；最近项点击失败保持原状态。这些是后续fixture/行为要求，本轮未运行。
