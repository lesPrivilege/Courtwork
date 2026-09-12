# 三场景specimen · 验证回执

2026-09-12，隔离分支 `codex/chat-harness-intake-20260912`，施工基线 `ee8d9df690975a574432ec4ddeb967d094271d26`。共享main在并行任务中继续前进，本片没有合并、push、部署或修改共享checkout。

## 最近先例与变化

复用 `app/web/user-message.mjs` 的 `renderUserMessage`、`chat-actions.mjs` 的 `createChatActions`、`composer-field.mjs` 的 `installComposerGrowth`、`model-picker.mjs` 的 `createModelPicker`，以及 `ui-controls.mjs` 的Markdown/静态图标/原生动作。沿[前端合同](../../../design/agent-interface-2026-09-10/frontend-contract.md)与[来源返回约束](../frontend-plan.md)，只在fixture中组合来源详情。最近消息动作规则是父提交 `ee8d9df`，生产文件不再改动。

| Before | After | Why |
|---|---|---|
| 三场景为文稿，通道能力未具象 | 无来源讨论、部分来源、r1/r2判断三条可操作路径，各有正常/缺失/拒绝状态 | 让身份、失败保留与下一步可核查 |
| 来源返回尚无交互证据 | 桌面非模态详情、窄屏原生modal，关闭恢复焦点/滚动/展开/草稿 | 详情是阅读路径，关闭不产生Run或工作决定 |
| 保留记录不能原地编辑 | Copy与明确“Cite to hosted draft”，附record/account/session/version出处 | 原消息不变，跨通道由显式动作选择 |
| 仅作者初稿 | Astra集成、浏览器检查；另一位Luna有界非作者静态核对 | 不将作者检查冒称独立产品接受 |

视觉采用host层级role、字号、间距、圆角与阴影；不加新色系、图标族、动画或半透明材质。场景/账号/迟到/错误开关置于显式合成控制区。新来源surface仅为实验组合，尚非canonical通用reader。

## 检查与可复跑证据

- `node --test app/tests/chat-continuity-specimen.test.mjs`：9/9，涵盖通道准入、账号/会话草稿与阅读隔离、关闭不取消、撤权清缓存、三类晚到、r1/r2、过期预览、取消回执与无API静态宿主。
- `verify-browser.mjs`：10组检查，见[browser/results.json](browser/results.json)。包含发送、Edit-as-new不改原消息、保留文本引用到已有hosted草稿、模型mock、缺失/拒绝、中文短词、撤权、迟到、r1/r2、判断刷新与返回连续性。1440/1280/390 × 浅深色，每组覆盖三个场景、来源开关、200% CSS zoom；窄屏Tab闭环，全部Escape，强制颜色模式开关。页面异常与非本地/非GET请求均须为空。
- `node tools/lint-colors.mjs app/tests/fixtures/chat-continuity/specimen.css`、同路径 `lint-materials.mjs` 通过；`lint-interaction.mjs`通过其默认38个生产模块登记规则，fixture交互由上面行为/浏览器检查覆盖，不扩大lint证明范围。
- `node tools/contrast-report.mjs`：既有角色对比度表全部通过；它检验角色组合，不是全页面逐像素审计。无新增blur/material，unsupported及reduced-transparency无需新增回退；forced-colors与无motion/reduced-motion环境已浏览器覆盖。
- 作者视觉核查包含完整变化场景、窄屏正文、来源详情及判断预览；[候选截图](browser/)随脚本生成。200%采用CSS zoom溢出检查，未声称OS缩放/真实触屏或原生宿主全面验收。

浏览器脚本需可用Playwright与Chromium，可分别以 `PLAYWRIGHT_MODULE` 和 `CHROME_PATH` 指定本地安装位置。它自行启动随机独立静态端口，结束后关闭。没有付费Provider、个人数据或Runtime fixture迁移。

## 非作者有界复核

另一位Luna静态复核adapter/controller/预览宿主与测试并独立运行9/9；指出取消提示易被误读，已修正为提交消息仍留在对话。其固定controller blob `a89914fe4a6d3b67a890d50e7e9026bae7bb71d1`。

页面复核覆盖Edit-as-new、retained引用、来源关闭与scope晚到，未发现阻塞反例；首次view blob `fefee8dc10bfed860fd1a57ad494e70d8c7713c9`，增量复核到 `dd5fea56d69e787a0837a78ef1c267a85fa92c72`；index `2482c4c7d006b95c608b7580ef00dc8c18619b77`、CSS `80ed82c959588ca324a964637d127b615b58a222`。最终作者另将同一null过滤应用到判断内容，浏览器回归覆盖。Luna没有重复浏览器矩阵；以上不代表独立视觉接受或生产产品门关闭。

## 保留边界

production exact reader、跨Provider身份/授权、真实披露回执和正式交接沿[字段映射](field-map.md)所列RG/LG/BE owner继续接线。fixture不创建新的生产store/DTO，不赋予Chat正式判断或关闭权限。未运行全量Runtime suite；本片只新增独立静态标本与测试/文档，现生产代码不变。
