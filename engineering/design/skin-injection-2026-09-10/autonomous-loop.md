# 界面自主续行 · 2026-09-10

用户授权：同意下一单，按异步节奏自主 loop，直到一个清洁自足界面。Astra 负责裁决、关键实现与合流，Luna 负责有界探索/测试及非作者复核。入口仍是 Courtwork；本轮从实际 main `a579929` 的隔离树施工，SK-1 已合流。

## 完成清单

“清洁自足”在本任务界面范围内落为以下可验证条件，不以审美承诺代替证据：

- [x] SK-2：首帧与设置编辑共享一份版本化外观规则；固定 Review/danger/success/focus/material 不随皮肤；旧原文保留/导出，ignored 与 invalid 有解释，draft/stored/effective 分开，Reset 不删除原文。
- [x] SK-3：按既有提案完成 Dystopia 中性 preset；与其他 preset 使用同一准入与明暗切换路径，固定语义对比可读，默认 Slate 保持。
- [x] SK-4：实际 needs_you 消费与状态转换、灰度文字、材质/fallback 有界核对；若没有新的领域事实，不新增着色或 material consumer。
- [x] Appearance、相邻设置与包含它的 Home/Attention 场景：1440/1280/390、light/dark、键盘/返回焦点、200% zoom、长文/草稿/错误/空状态、重载保留通过；发现的本范围内阻断缺口修复后重验。
- [x] 固定实现由非作者复核；证据/当前状态/下一步一致；适用检查通过并合入实际 main，不覆盖其他 writer。

SK-5 Pages A/B/C 属独立发布面提案，不是本产品界面完工的隐藏依赖；本授权不扩大为部署。FE-05a→FE-05→ATT-FE-01→CC-I 与 RV26 的后端队列仍按其各自合同/写权推进；本任务不虚构后端事实、不将候选分支证据当主线验收。若实际界面问题需要这些前置，记录具体依赖并优先处理可独立完成的项。G1–G5、付费 provider 与真人验收不因本清单完成而关闭。

## 当前切片

SK-2 已完成，独立复核无有界阻断；见 [SK-2 回执](../../../evidence/skin-boundary-sk2-20260910/README.md)。SK-3/4 与完整场景检查已完成；[证据](../../../evidence/dystopia-sk3-20260910/README.md)包括 Dystopia、系统主题诊断和 Settings 深链接焦点修复。最终焦点修复已在固定 detached 树复核；组合主线 `a7b9822` 为产品 `c1b1f4e`，70项接缝测试、smoke与新 Runtime 11 浏览器检查通过，本地 main 接收本轮交付。Astra single UI writer。最近先例：SK-1 `1d34cec` 的固定 Review 与本地 contrast probe；WK12 Appearance/no-flash；CC-I `settingsRow/createPreferenceGovernance`。保留原存储键、reset/remove 区别、原生控件、S→R→U 与 scheme；改变的是允许生效的 token 域与保存/生效解释。

新增 `skin-policy.js` 是无 DOM/存储依赖的同步策略入口，精确静态路由；index 首帧和 settings 模块消费相同文件。没有第三方包、第二份 role 映射、runtime schema 或个人数据迁移。现代输入只含完整外观色阶；旧全量解析仅供兼容读取，固定键只留存/导出，不进入 CSS。导出的内容是已存原文，不混入未提交草稿。

本清单全部完成；停止本轮自动续行并暂停 heartbeat。后续 FE-05/ATT-FE-01/CC-I 或 Pages 按各自队列接续，不自动扩大本轮已完成范围。
