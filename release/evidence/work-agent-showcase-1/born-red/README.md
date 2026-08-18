# WORK-AGENT-SHOWCASE-1 · born-red 证据

实现前留下的自动化失败证据（Vitest）与实现前截图（scripted matrix）。

## 自动化 born-red（票面 §二.1–5）

| # | 票面问题 | born-red 断言 | 实现前结果 |
|---|---|---|---|
| 1 | 新装默认 system | `theme-fallback.test.ts`：无存储/旧 snapshot 缺 appearance/畸形值均回退 `light`；显式 system 仍随 OS | 3 failed：received `system` expected `light` |
| 2 | 未绑定死端 | `PiLanePanel.dom.test.ts`：未绑定主动作 `pi-bind-folder` 调 callback；`pi-start` 零出现 | failed：仍渲染 disabled `pi-start`，无 `pi-bind-folder` |
| 3 | unavailable 缺恢复 | `PiLanePanel.dom.test.ts`：bound unavailable 主动作 `pi-open-model-settings`；普通 idle 不显示 | failed：仍渲染 `pi-start`，无 `pi-open-model-settings` |
| 4 | session id/hash/bytes 未折叠 | `PiLanePanel.dom.test.ts`：`pi-status-ident` 零出现；`pi-run-details` 含 session id；`pi-tool-details` 含 bytes/hash | failed：`pi-status-ident` 在，`pi-run-details`/`pi-tool-details` 缺 |
| 5 | 四枚未接线 rail 控件 | `rail.test.ts`：`CaseRail.tsx` 生产源码零 `nav-scheduled`/`nav-dispatch`/`pinned-filter`/`pinned-more` | failed：源码包含四枚 testid |

## 实现前截图（票面 §二.6）

- `pre/`：1440×900 light，12 状态 normal / text-mask / 10% squint，共 36 帧。
- 空态、运行中、提案、工作稿区可见。text-mask 用于目验主焦点与重心。
