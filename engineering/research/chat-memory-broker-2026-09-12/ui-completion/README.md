# Chat UI完整改版 · 生产接线回执

2026-09-13。按用户“explore验收后考虑合并，完成已登记的完整UI改版”推进；Astra负责集成、来源/阅读连续性与裁决，Luna独立验收模型适配，并实现有界执行披露和测量呈现。隔离分支从main `7a2e26c`合流模型适配 `ea51ffc`，合流点 `f65994f`保留既有Home修复。

## 登记覆盖与实现

| 登记项 | 生产结果 / 原owner |
|---|---|
| 消息actions | 消费已合流的共享消息动作显隐，保留时间、失败、Edit as new message、菜单与焦点规则 |
| Tool披露 | 完成Run中可证明成功的tool result及精确匹配allow回执收于一个Execution入口；节点保留原时间线位置。待审批、拒绝、失败、unknown、产物和assistant仍直接可见。展开记忆、选区和子项焦点不被自动收起 |
| Composer / effort | 消费精确能力目录与版本校验的统一picker，Provider default保持省略参数；按用户最终布局附件在左、模型在右靠近Send，长名称可缩而不挤掉附件。Home附件准备真实Session后打开Files，零Run，不需先发消息 |
| Telemetry | Chat connection card、Run Inspector、Attention复用默认收起的request measurements，保留展开状态；Host时间、provider观察、缓存和context估计分开，不推测TPS、实效或费用 |
| Inline code | 正文inline code弱化背景并可换行，保留可复制文本；工具机器输出和diff沿原组件，不套用正文层级 |
| 阅读连续性 | Chat与Attention更新前记录选区与可见锚点，更新后同文本恢复；沿原follow-latest语义，用户离开底部时不抢阅读位置 |
| 来源 / 文件 / r1-r2 | Sources and work versions接现Session work surface、work-query和不可变文件reader。候选evidence固定source ID/version/digest，全文哈希验证后展开，禁止用r2替代r1。Core文件manifest仍用原reader；引用准确文件文本及Session/Run或candidate/artifact/path/hash到现草稿，无自动发送 |
| 无来源 / 失败 / 返回 | 无binding及文件时不画空来源入口；加载失败保留反馈。Session/binding变动与晚到响应隔离。文件overlay复用关闭路径；Quote主动回composer，原草稿保留；缓存重开仍可引用，离开目标的旧按钮不能引用新文件 |

[原前端计划](../frontend-plan.md)、[Human review attention](../review-attention/README.md)与[模型适配回执](../model-adaptation/production.md)保持来源和历史裁决。通用跨Provider检索、账号授权/撤权、导入解析、集合整理、原生通道嵌入及跨Runtime handoff仍是原计划明确的owner候选；本次生产接线覆盖已有Work和文件能力，不把specimen当作这些后端已实现。Host-wide未来Run作用域不变，未增加单turn override。

## 最近实现先例与grammar

依据[前端合同](../../../design/agent-interface-2026-09-10/frontend-contract.md)：复用 `app/web/model-picker.mjs` 的原生dialog、`inspector.mjs` 的不可变文件overlay、`work-view.mjs` 的Core投影和manifest、`telemetry-view.mjs` 的measurement定义、`app.mjs`/`attention-agent-view.mjs` 的流节点与现导航恢复。新增 `chat-sources.mjs`、`chat-reading.mjs`、`execution-disclosure.mjs` 只组合这些已有事实。

受影响grammar是渐进披露、正文/辅助文本层级、有限互斥模型选择、附件动作与瞬时界面焦点返回。Execution是显式aria-controls控制原节点的button；来源和测量使用原生details；模型入口指向真实model-picker dialog。正式判断和接收仍经原Work Review owner，来源变化提示不代签stale或接受。

## 验证与独立复核

- [最终全量](evidence/final-full-tests.log)：890/890通过，237.7秒；包括Runtime/schema13与UI回归。[首次全量](evidence/full-tests.log)887/889，两个失败为旧语义消费登记和Activity分组断言；已改为真实unknown/interrupted行为及当前glyph登记，[最后定向](evidence/final-delta-tests.log)18/18通过。
- 全量后只修正模型入口的ARIA目标；[标记定向回归](evidence/final-markup-tests.log)通过。颜色、材质、交互lint与contrast检查通过，[5605条文档链接](evidence/doc-links.json)和[Runtime smoke](evidence/smoke.json)通过；[最终浅色预览](evidence/chat-light-final.png)。
- [定向35项](evidence/targeted-tests.log)、[来源7项](evidence/source-tests.log)，覆盖精确旧版本、错hash拒绝、晚到隔离、无来源、引用和Execution边界。新增缓存重开测试验证首开、重开及旧脱离节点不能引用。
- [实际DOM阅读5项](evidence/reading-browser.json)与[六组响应式检查](evidence/responsive.json)：390/1280/1440，light与dark/reduced motion，生产app置于已核对实际CSS viewport的iframe；桌面截图仅为适配捕获缩放，不称原生golden。均无横向溢出，附件可见、模型未截断、长路径可换行；成功组能展开/收起，失败独立可见。
- 实际合成生产交互：Home附件创建Session且0 Run；candidate引用r1而当前为r2，读取r1正确；文件连续两次Quote保留前一草稿并聚焦composer。request measurements默认闭合，展开有实际request数据，关闭connection card再开保留展开。测试外观恢复System/Follow system。证据见[交互记录](evidence/interactions.json)。
- Luna作为非作者验收 `ea51ffc` 模型适配63/63；Astra检查Luna工具披露和测量代码；Luna反向检查Astra来源/引用/Home接线，发现缓存重开Quote失效，Astra修复后独立3/3回归。最后binding guard和左右布局静态复核无阻断。浏览器核查由Astra执行，不称非作者浏览器接受。

未执行200%原生缩放、forced-colors或物理触屏验证；不以合成回归代替这些产品门。本轮无付费Provider调用、个人数据迁移、push或部署。Runtime schema13继续只在独立合成数据上验证。
