# G5 · 可消费事实与公开来源映射

固定探查源 `01f37f09b3b11d5c317ab9d45d31d1f9a87766ee`；NDA producer-contract修复后的真实模型结果另待取得。本表是发布前事实交接，不修改私人简历，不替换原公开产品表达/商业展示口径，不给G5签署完成。每条实现主张须保留本表的证据范围。

| 可消费的具体事实 | 公开表达/操作入口 | 对应证据与范围 |
|---|---|---|
| 本地clone、锁定安装、Node Host与Web启动 | [README 本地运行](../../README.md#本地运行)、[BUILD](../../site/src/copy.mjs)、[运行说明](../../app/README.md) | 本轮[安装环境](environment.json)与[安装日志](install.log)、fresh CLI/GUI；本地独立clone不是远端最新版本部署证明；实测macOS arm64/Node22.19，CI的24 lane未远端执行 |
| 用户可在界面配置模型并选择未来Run；旧Run保留绑定 | [Models/README](../../app/README.md)、[provider UI](../../app/web/settings-view.mjs) | [GUI key表单](fresh-model-key-form.png)和[local保存/Run](fresh-gui-run.json)；[输入绑定](../release-input-binding-20260913/README.md)、[能力合同](../../app/docs/runtime-foundation.md)。未以保存值冒称Provider effective参数 |
| 工具使用权限与正式成果接受由不同owner持有 | README“明确每次参与的边界”、[REVIEW](../../site/src/copy.mjs) | [DF-06](../release-mcp-failures-20260913/README.md)及[65/65](recovery-results.json)；GUI的正式Decision/Artifact独立于Run Completed；不宣称远端exactly-once |
| 受信NDA组合能经GUI加载、来源绑定、候选审阅、人的决定与新会话接续 | [首个工作流程](../../app/docs/first-work.md)、[NDA契约](../../docs/work-core/nda.md) | 本轮[GUI前后状态](gui-before-restart.json)、[跨重启等价](gui-after-restart.json)、[接续工具事件](gui-final-runs.json)。来源/事实与Provider均合成；此前模型输出由deterministic builder预生成，不能称模型独立审核 |
| 待审入口来自Core当前投影，版本变化/未知不冒称已接受 | README工作继续、[摘要API](../../app/docs/work-review-summary.md) | [摘要实现与UI](../release-core-summary-20260913/README.md)及本轮干净路径。标题/数量合并是展示变化，不授予决定权限 |
| Host支持有边界的MCP Streamable HTTP工具和声明式资源 | [运行说明 Tools](../../app/README.md#tools-available-to-the-model)、[runtime control](../../docs/runtime-control/INDEX.md) | [能力生命周期](../release-test-contract-20260913/README.md)、[权限/来源](../release-input-binding-20260913/README.md)、[MCP故障](../release-mcp-failures-20260913/README.md)。目录API不等于任意安装器，resources/prompts不是已实现的调用路径 |
| Host3–12→13与Core3/app4→Core4/app5保持备份和拒绝边界 | [迁移说明](../../app/README.md#store-schema-v13-validated-v3v4v5v6v7v8v9v10v11v12-upgrade) | [每文件结果](recovery-results.json)，全部重建合成fixture；每pair都有升级/原字节backup，旧host拒绝/独立恢复并非每pair都单独测。未迁移用户数据 |
| 当前站点候选图像确实来自有版本的实际UI与合成数据 | [媒体manifest](../../site/media/main/manifest.json)、[site release](../../site/release.json) | manifest仍固定0768822批次，site/release的数据证据仍固定9e5384f。没有重标本轮新UI/真实模型，不把旧图像hash等同新候选产品接受 |

多Agent接力、Expert完整席位、Spark更广泛自动治理和第二Runtime的产品叙事各有已有架构/研究owner；不从本轮NDA单会话和换Session证据推导这些全部实现。用作发行说明或简历的具体事实应采用上表已观察的有界动作，不能将概念架构、商业化展示或planned席位改写成已验收能力。

G5最终接收还需：把实际真实Provider/新候选证据补入能力行；核对当前发布工件与其源SHA；由原发布/简历owner消费。私人简历尚未读取或修改，外部页面尚未发布。
