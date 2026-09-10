# Luna 源码清点 · 2e9da09

2026-09-10只读；Astra整合到本页。路径/符号对应固定基线，不按旧聊天推断已发货。用户最新裁决要求Review固定、不随skin，本页明确记录尚不合规处。

| 面 | 实际实现 | 缺口/处置 |
|---|---|---|
| gray-steel | 已在PREFERENCE_VALUES/Appearance选择器与styles.css内接入；独立skins/gray-steel.css为未路由对照副本 | 不把独立文件404误称产品无此选项 |
| 色阶与role | `app/web/styles.css` S→R→U，默认slate与whole-skin分路 | 不另造token架构 |
| review来源 | `styles.css:5288/5301/5315` 浅深 `--home-attention-review-foreground`；5318 `--attention-review` 默认依赖accent-ink，slate才覆写专用色 | custom/gray-steel实际随skin变review，SK-1必须解耦 |
| 显式消费者 | `styles.css:5342` Home featured；5365 Attention详情 | 范围很窄，不代表全部needs_you统一 |
| 其他needs_you | Home普通行5243仍accent-ink；`home-view.mjs:253`详情无is-review；`attention-view.mjs:38`列表无review class | 统一前先按实际状态登记，不全局替换所有waiting |
| Custom键 | `settings-view.mjs` SKIN_COLOR_TOKENS/validateSkinTokens：25个必选颜色键，gray1–12、accent3/9/10/11、danger3/11、success3/11、paper/float-s/frame-s/ink-max/on-accent-s | danger/success仍可改，不满足固定语义层 |
| 数值权限 | 同文件SKIN_NUMERIC_TOKENS：alpha-ink/alpha-paper为RGB三元组；shadow-alpha/glass-alpha/rim-alpha为0–1；5项可选 | 外观接口能改材质强度；新scope不再开放 |
| 验证器 | 只收3/6/8位hex；拒未知键/非法数字/危险片段/多block；最大8000；重复键后值覆盖 | 不是新格式版本化/重复键拒绝的实现 |
| 持久化 | readPreferences仅检查customSkin字符串和长度；Apply先validate再存canonical CSS；writePreferences→apply/localStorage | 不能只改Apply校验器，读取/首帧也需同规则 |
| 首帧 | `index.html:27–69`，按origin hash分键；custom CSS有形状闸但不重验键和值，最大4000 | 与模块8000上限及语义校验不一致；SK-2覆盖 |
| 重置/来源 | settingsRow/createPreferenceGovernance/preferenceProvenance，默认skin=slate；已存与生效分开 | 保留CC-I行为，不因整改删除自定义数据 |
| 对比报告 | `tools/contrast-report.mjs` lead-gray/gray-steel×浅深，基础19对；lead-gray额外review×panel/float及muted-strong×panel-muted | arbitrary custom和Dystopia未覆盖；gray-steel无review extra |
| Custom对比警告 | `skinContrastWarnings`浏览器探针只镜像基础CONTRAST_PAIRS | 未检查Review；固定review后必须补 |
| 材质lint | `tools/lint-materials.mjs`默认3份CSS，2处backdrop消费者登记、blur token与reduced-transparency回退 | 不扫描JS/HTML内联，不检测shadow/alpha/Review；绿灯不代表完整材质规范 |
| Pages | `site/src/page.mjs` review()已有待人审阅标签，`site/src/site.css:699`专用campaign色及5px点 | A方案已在源码，不宣称线上已验；B/C仍提案 |

Luna运行固定基线定向检查：`node --test app/tests/settings-preferences.test.mjs app/tests/material-governance.test.mjs tests/color-governance.test.mjs`，33/33；`node tools/lint-materials.mjs`通过（3 files）。这是旧实现的有界检查，不证明新的Skin/Review边界已经通过。

## 最近合同/证据

- [色彩治理](../../mvp/execution/work-surface-kit/contracts/color-governance.md)，其中旧scope受本轮修订覆盖。
- [Material grammar](../home-composition-2026-09-10/material-grammar.md)，blur名额与fallback维持。
- [CC-I PropertyRow交付](../../mvp/execution/work-surface-kit/delivery-cci-01.md)，尤其保存未应用/复位不删custom。
- [Web GPT handoff](../web-gpt-design-handoff-20260910.md)，C/F保留密度→材质前置；本单不抢生产writer。
