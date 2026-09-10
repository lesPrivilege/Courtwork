# 本单回执 · Skin / UI Continuity

2026-09-10 · 产品读取基线 `2e9da09bd163ca128e3cd2f4c91ef61ceec2fc2f`。Astra编写/整合规范；Luna分两项做源码探索与有界核对。仅文档与AGENTS入口，无产品代码、schema、依赖、用户数据或部署变更。

## 输入完整性

- 泛化陌生化设计：7 turns / 13 messages，hasMore=false；T6只有用户消息，未杜撰回复。全部正文保存到input-conversation.md；图片未作为取色或视觉验收证据。
- 补充控制语法：3 turns / 6 messages，hasMore=false，完整正文保存到对应input-conversation.md。
- 本轮用户纠正“Review稳定、不涉及skin，skin变化不影响review”作为最新裁决写入合同；旧输入仅保留溯源，不成为当前规则。

## Luna核对与处置

| 核对 | 发现 | Astra处置 |
|---|---|---|
| Skin源码 | custom/gray-steel→accent影响review；custom可改固定状态色和材质数值；首帧/模块规则不一致 | 写入inventory与SK-1/SK-2整改，不声称已修 |
| Skin合同复核 | 两个validator常量名错误；gray-steel实际已可选；拟建resolver/export容易被误读现成；review对比警告尚缺 | 全部修正；Luna回看确认无剩余阻塞，legacy parser也改为拟建 |
| Continuity源码/规范 | 原生DOM/control先例可复用；provider contextWindow已有专用number input；通用NumberField仍候选 | 同步Atlas/先例索引；不引入新组件库或未知schema |
| 新UI维护边界 | 现有lint不能覆盖所有视觉规则，截图/先例不等于接受 | v1区分合同、实现先例、candidate、reference与accepted baseline；保留人工/独立复核 |

Luna的核对是文档与具体源码范围的非作者证据，不是Dystopia视觉接受或新Skin API的独立产品接受。最终先例索引由Astra整合，不能把Luna早期探索自动套用为该文件全部内容的接受。

## 既有基线检查

Skin探索的定向命令：`node --test app/tests/settings-preferences.test.mjs app/tests/material-governance.test.mjs tests/color-governance.test.mjs`，33/33；material lint通过，范围是3份CSS。

Continuity探索的精确命令：

```sh
node --test app/tests/models-connections.test.mjs app/tests/settings-preferences.test.mjs app/tests/settings-navigation.test.mjs app/tests/ui-event-mapping.test.mjs app/tests/runtime-workbench.test.mjs app/tests/architecture-boundaries.test.mjs app/tests/primitive-reconciliation.test.mjs
```

71/71通过（16+27+7+5+4+3+9）。`node --check`分别检查`app/web/ui-controls.mjs`、`settings-view.mjs`、`model-picker.mjs`、`app.mjs`，4/4。colors、contrast、materials、interaction四项既有工具均通过。这些是Luna对既有基线的检查，不证明尚未实现的迁移规范。

Luna最后只读复核当前frontend-contract/precedents，未见断链、错误符号或把未知schema升为canonical。作者按建议补充overlay函数索引、把“六个偏好属性”收窄为六个Appearance PropertyRow，明确`npm --prefix app test`是完整suite、定向用`node --test`。

## 文档验证

交付前检查相对文件链接、输入turn/message数、显式改动范围与`git diff --check`。不验证原文中的不可恢复citation handles；新引用分别记录直接网页核验与未取得正文项。历史论文、archive、截图原字节未修改。

最终检查：23个显式文件，仅AGENTS与engineering文档；296个相对文件链接目标全部存在；输入消息13/13与6/6；`git diff --cached --check`通过。转录行尾空白已规范化，未删节正文。此检查不声称所有历史Markdown锚点或远端链接都可用。

本次未生成Dystopia/Pages新视觉稿、未修改默认配色、未运行付费provider、未声称全量产品回归或G1–G5关闭。后续真实施工从[迁移切片](migration-notes.md)与[前端连续性规范](../agent-interface-2026-09-10/frontend-contract.md)接续。
