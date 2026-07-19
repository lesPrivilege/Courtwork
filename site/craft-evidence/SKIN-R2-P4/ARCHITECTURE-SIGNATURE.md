# SKIN-R2 P4 · 预签裁定投影

状态：产品／架构已预签，P4 可直接实施。投影依据是批准版 SKIN-R2 全量线 v2 的修订②与 P4 条款；本文件只把 chat-only 裁定变成仓内可审计行，不新增契约。

| 行 | 档位 | 已签对象 | 裁定 |
|---|---|---|---|
| P4-D01 | Agent 中间档 | `courtwork.settings.v1#appearance.themeMode` | `system/light/dark`；默认与畸形回退 system；不新建存储键 |
| P4-D02 | Agent 中间档 | 根宗解析器 | system 随 OS，显式宗不随；根只暴露解析后的 `data-theme` |
| P4-D03 | Agent 中间档 | dark token 映射 | `[data-theme='dark']` 只映射 `themes.dark`；组件、布局、G6 零宗分支／字面色 |
| P4-D04 | schema 最克制档 | C-4 | 两宗 SchemaParts 与数据面几何逐位相等，颜色各随宗 |
| P4-D05 | Agent 中间档 | 裸 `.titlebar` | 删除裸死选择器与对应死账；保留 `.chat-titlebar`、`.titlebar-credential-warn` 等活类 |
| P4-D06 | Agent 中间档 | disabled/hairline/strong/focus | 真壳覆核；若 token 不满足既定目标，只能回架构改 token，禁止组件补色或放宽门 |

禁止范围不变：不改 schema、wire、G6 几何、交互骨架、数据或 reduced-motion；不 push、不部署。
