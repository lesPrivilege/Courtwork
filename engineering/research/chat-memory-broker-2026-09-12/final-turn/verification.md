# 验证与交付边界

后续审阅更正：本页保留923998d上片记录；其footer显隐检查遗漏了时间与指针命中，不能证明这两项安全。[修订验证](review-followup.md)已改为action row并补齐反例，以后者为当前接收依据。

接单 `main@6bfb23444944d5841df2e7a30806a8a6ddabfcb2`；交付独立分支 `codex/chat-harness-intake-20260912`。受核CSS blob `0980c02e9bde60612e30e1464642f218e5bf5d68`；产品差异仅 `app/web/styles.css`，Luna作者，Astra逐条审阅选择器并执行下述有界非作者组件核查。其余均工程文档、来源与合成证据。

## UI连续性变更记录

Owner fact沿现 `createProductionActionAdapter`；本轮不改actions的能力、消息目标或后端。最近先例、确切符号与来源类型见[召回](recall.md)。受影响grammar为消息级Control/Placement；保留Markdown、composer、文件动作、Run停止/审批、Review与skin语义。刻意改变assistant常显覆盖；与user footer统一hover/focus，并保留打开菜单、状态、确认与busy的可见性。无新增token、依赖、primitive或状态store。窄屏与coarse pointer常显；reduced-motion不做淡入。

## 已运行

- `node --test app/tests/chat-actions.test.mjs`：8/8。沿用既有能力/目标绑定/异步动作测试；不新增镜像CSS的unit test。
- `node tools/lint-interaction.mjs`：通过，38文件，四类已登记规则。
- `node tools/check-doc-links.mjs`：最终结果见[checks.json](checks.json)。首次运行在verification文件写入前报两条未建链接，补齐后重跑。
- [浏览器脚本](verify-hover.mjs)与[结果](browser/results.json)：1440/1280/390 × light/dark共6配置，真实共享action/user renderer与两类消息DOM先例，纯合成数据。检查idle、hover、focus/Tab、菜单Escape返回、结果/错误、确认/busy、文件动作可见、长文本、无横向溢出与200% CSS zoom。浏览器reduced-motion环境，截图为候选组件证据。
- Astra视觉实读： [桌面hover](browser/light-1440-hover.png)、[深色触屏](browser/dark-390.png)。正文几何稳定，消息操作分层与触屏入口符合本次意图。

浏览器通过独立Host和数据目录提供真实模块及样式，默认确定性provider；脚本挂载合成组件场景，不调用模型。复跑前按仓库README以独立data-dir启动Host，然后设置 `CW_TEST_URL`；脚本通过 `PLAYWRIGHT_MODULE`（可省略、需环境已有playwright）和可选 `CHROME_PATH`选择环境内浏览器。没有给产品package新增Playwright。

首次浏览器脚本使用错误模块URL，fetch失败；改成真实 `/web/` 路径后重跑，失败不算通过。脚本和本目录路径可携带，不依赖作者机器绝对路径。

## 未运行与接受上限

未跑完整Runtime suite、真实Provider、个人历史、资料导入/connector/容器、迁移或新Chat页面验收：这些不在CSS与文档改动范围。未将合成组件图当作完整宿主端到端或已接受产品baseline。颜色/材质未变，不重跑对应审计；本次未创建动画，只保留既有transition并补reduced-motion。源截图和对话文本的完整性见[hash](source-hashes.json)，不证明原文外部论断成立。

本轮架构文字由Astra裁决，不冒称作者自证的独立架构接受；CSS已有Astra有界非作者复核。后端worktree与共享main未修改；本分支未合main、push、部署，原有G1–G5与真实DeepSeek门保持。
