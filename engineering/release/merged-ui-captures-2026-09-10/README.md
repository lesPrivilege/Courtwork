# 合并后统一截图与发布

2026-09-10 用户授权：Spark / Attention UI 正在分支施工；当前先由 Luna explore、保留空图位并完成其他编排。后续 UI 完工合并后，统一选择、采集、替换全部当前产品截图，完成 push 与现有 GitHub Pages 部署。此授权继续有效，无需重复询问同一发布动作。

## 当前交付

公开分支前片 `bd1f815a99c88f2431244671e871e97ddcc082fa`；本轮读取本地 main `df9fc18b9f1a8374d72fa071c2b9c1e61e0010d1`，不推断其他施工分支已经合并。共享 UI checkout 未切换、未修改。

[统一图位](../../../site/src/capture-plan.mjs)声明一整批 pending 状态。首页 Home / Review / Models、Tour 与 Models 子页使用同一渲染器：当前只有定比留空画框，不回填旧图，也不绘制假产品 UI。Hero、Spark/Attention 语义图、Paper/Tour 并排入口及其他内容编排继续保留。

Tour 顺序：Home → Spark → Running → Attention → Action approval → Artifact → Matter → Review → Continue → Models → Integrations → Settings → Attention conversation。Attention 工作介入、单次工具批准和全局对话分别取图；M2 旧批准图不代表整个 Attention。

[发布检查](../../../site/scripts/check-capture-ready.mjs)在 Pages workflow 上传前要求整批 ready、每个图位有素材、固定源版本与媒体清单一致，并已进入 main。普通构建仍可用于本地编排预览；pending 不能部署。当前不 push 此准备片、不部署，后续与完成的截图一起发布。

## 选图与构图表

统一桌面基准 1440×900，采用同一个已合并 commit、同一套字体/主题/缩放、独立合成事项；页面内保持完整工作上下文，避免只截无对象的浮层。明暗成对时必须来自同一状态。窄屏另验证页面布局，不能用桌面缩图声称产品移动端可用。

| 图位 | 页面用途 | 要拍到的真实状态 | 构图重点 / 旧映射 |
|---|---|---|---|
| home | 首页主图、Tour | 有工作内容的首页 | 导航、工作入口与当前事项；M1 |
| spark | Tour知识来源 | 完工后的来源与派生查看 | 来源对象、版本/关系与正文；新图 |
| running | Tour执行 | 真实工具调用或执行过程 | 请求、工具动作、当前状态；新图 |
| attention | Tour人的介入 | 有理由及目标的待处理事项 | 列表与所选对象/下一步；新图 |
| approval | Tour具体授权 | 待批准的真实操作 | 路径/内容/本次作用域；M2 |
| artifact | Tour成果 | 运行生成的实际文件 | 文件与上下文同屏；M4 |
| matter | Tour工作归属 | 持续事项及其已有来源/决定 | 导航与工作详情；新图 |
| review | 首页、Tour | 有依据的候选待审阅 | 候选、原文、版本、决定入口；M6 |
| continuity | Tour续行 | 沿已有Matter继续工作的状态 | 已保留成果与当前执行关系；M5 |
| models | 首页、Models、Tour | 有合成连接及模型目录 | 有用配置，不展示个人endpoint/密钥；M7 |
| integrations | Tour配置 | 合成工具/集成及作用域 | 接入对象、启用/权限语义；M9 |
| settings | Tour外观 | 合并后的外观设置 | 已生效与草稿/恢复关系；M10 |
| conversation | Tour全局对话 | Attention带工作上下文的对话 | 输入、回答与相关对象；M11 |

## 后续执行顺序

1. 重读实际 main、Spark/Attention UI 交付单和非作者验证证据；确认对应实现已合并且截图所需行为真实可达。只有后端或设计文档不满足此节点。
2. 在独立 worktree 固定合并产品 SHA，准备全新合成数据与独立端口。不得借用个人会话、凭据或升级旧host数据；真机截图指实际运行的产品界面，数据仍为合成。
3. 对照当前 API/路由修订现有 capture 工具后采集。旧脚本不直接套在新UI上；不以DOM注入或绘图补造 Spark/Attention 状态。
4. 先写独立新批次目录与manifest，核验每张图的源SHA、状态、尺寸、hash与图位。旧媒体、录制和实验作为历史证据保留原始字节；切换当前素材入口，不重新标记旧图来源。
5. 一次切换 `site/media/main/manifest.json` 和 `capture-plan.mjs` 的全部 mediaId/source_sha，置 ready。需要的深色图一同替换，不能残留另一版本的dark source。
6. 重建与完整链接/素材/hash检查；逐页检查真实截图、正文对应、明暗、窄宽与可读性。截图未能证明的宣传语按真实行为调整。通过后更新交付证据和current。
7. 合并公开分支与benchmark依赖，重新对齐main并保留其他writer变更。显式stage、commit、push，运行现有GitHub Pages workflow，确认部署成功及线上主要路径，再交付公开URL。无需重开发布许可，也不绕过pending检查。

## 历史回放边界

`site/specimen/` 是固定数据的交互回放，CLI study 同样消费历史录制；两者不是本轮当前UI截图。不得只更改其 source_sha 或用新图冒充旧实验重跑。若最终公开Tour需要新版回放，独立录制新数据/渲染依赖/manifest，再整体切换回放入口；否则明确保留历史回放标识。任何旧图只可留在明确历史入口，不能重新进入当前产品图位。

## 检查

当前空图位构建、链接、材质与统一批次测试通过；发布checker按预期拒绝pending。未运行新产品、未采集新UI、未进行页面浏览器测试。Luna只读探索作为截图规划输入，不构成未完UI的接受。

Luna 已完成并交回 [候选UI节点与capture接缝探索](luna-explore.md)：Spark候选仍有合成/后端缺席边界，旧截图工具需要适配；本轮探索到此收束，等待实际完工合并节点。
