# 05 · 模型配置与 effort 的短路径

2026-09-16 · Claude（Fable 5.1）裁决与实现；Sonnet 5 做只读勘察、Settings 定位接缝与 Host 绑定测试。消费 [Composer Models 原 PR](../../research/models-provider-registration-2026-09-14/composer-pr.md)；owner 回写见该 PR 文末。

```text
Task / scope: composer → 精确 Models 配置 → 原草稿返回（片 A）；adapter 驱动的 effort 快选 → 保存 → 下次 Run 实际 binding（片 B）
Base SHA / branch: 04 片末 74dc997 / claude-frontend-harness-20260916
Writer / reviewer: Claude 作者；Sonnet 5 写 settings-view.locateConnection 与 model-effort-binding 测试；非作者复核与人的目验未做

Owner fact + contract: Host connection/config owner 持有连接、凭据事实、revision 与 future Run 配置；`describeReasoning`（model-capabilities.mjs）给出 connection/model/API/endpoint 的能力枚举与来源；`GET /provider-config` 已携带 `reasoningCapability`、`connection`、`credentialStatus`；`PUT /provider-config` 在活动 Run 期间答 409 active_run，版本不符答 409 config_conflict
Semantic / projection / control / placement: composer 右侧控件的可见文字仍是 `<模型> · <档位|Provider default>`，点开的不再是完整对话框而是一张卡（沿 connection-popover 同一解剖、340px、锚在控件上方 top-end）：Model 段（模型名、连接名 · API、Change model、Connections/Add provider、缺 key 事实行）；Reasoning effort 段（原生单选分段：Provider default + Host 列出的精确值，原样小写；unknown/unsupported 只写一行事实；失效已存值点名、不勾任何段）；范围句 All chats · future runs；活动 Run 时禁用并写 Available after this run ends.。保存即时：`projectProviderConfig(current, {reasoningEffort}, {models:[生效项+Host 能力]})` + `expectedVersion`；每次选择递增 epoch，旧回执不覆盖新选择；成功写 `Saved · <值> · all chats, future runs`。Connections 行 → `openSettings("models", {trigger, connectionId})` → `settingsView.locateConnection(id)` 落在该行（无连接时展开 Add provider）；composer 常驻，草稿与附件不动，Back to app 焦点回到模型控件
Affected UX rule IDs: UX-02（配置范围如实：卡片靠近 Chat 不等于 Chat-local）、UX-05（活动 Run 冻结沿 File access 同一句）、UX-08（能力来源与验证状态分列）
Nearest precedent: renderConnectionCard / connection-popover（卡片解剖与定位）；segmentedPermission + `.segmented`（原生单选分段与滑块）；model-picker.mjs（effort 合法性、Provider default、失效值）；provider-config.mjs（唯一投影）；model-capability-adaptation 测试（Run 绑定冻结）
Evidence type: implemented precedent
Governance status: candidate（无非作者复核）
Kept relationships: 完整对话框、Settings Models 表单、连接凭据流程不变；`PROVIDER_CONFIG_FIELDS` 闭集不变；Home 模块带不再放 Connections 入口（01 片裁定）
Intentional changes: model-settings-button 由打开 dialog 改为打开 popover（aria-controls/aria-expanded）；picker 的 effort 选项文字改为枚举原值（不再把 off 写成 Off）；`.segmented` 滑块派生式扩到 8 段；settings-view.refresh 只多保留一份 promise
New terms / primitives / dependencies: 模块 model-effort.mjs（静态清单已登记）；copy-convention §3.3b 十一行；无新 token、无新依赖
Exceptions: 控件不是滑轨；不承诺所有 Provider；真实 provider 未跑
```

## 提交

| 提交 | 内容 |
|---|---|
| `8123fe4` | Model & effort 卡（model-effort.mjs、app.mjs 接线、index.html popover、styles）、settings-view.locateConnection、picker 枚举原值、copy-convention §3.3b、三套测试 |

## 作者检查

| 检查 | 结果 |
|---|---|
| `node --test tests/model-effort.test.mjs tests/model-effort-binding.test.mjs tests/models-connections.test.mjs tests/model-capability-adaptation.test.mjs tests/model-picker-dom.test.mjs tests/provider-config-module.test.mjs tests/settings-navigation.test.mjs` | 全部通过（6 + 3 + 30 + 5 + 3 + 2 + 若干） |
| `npm test` | 1127/1127（Node 25.9，并发 4） |
| lint | interaction / colors / shapes / materials / product-copy / semantic-consumers / doc-links 通过 |
| 浏览器目验（Local test Host，8861） | Local test 连接：卡片写 Provider default 一行事实、无分段。以 fake provider 端点登记一条 compatible 连接并声明 `low, medium, high`：卡片画 4 段（`--segments: 4`），点 high → `Saved · high · all chats, future runs`、控件文字 `fake-model · high`；发一条 `/fixture script []` Run，Run 记录 `provider.reasoningEffort = high`、`reasoningBinding.values = [low, medium, high]`、`configVersion` 与该次保存一致。Connections 行落在 In force 那一行（焦点在其 Configure），Back to app 焦点回模型控件，草稿原文保留。390px 暗色：卡片 340px 无溢出，四段各 68px，Provider default 折两行；Escape 关卡并回焦 |

## 未完项

- 真实 provider 的受支持组合未跑（无凭据）；两组枚举 fixture（runtime-catalog 三值 / user-declared 两值）与一条真实 Host 路径（user-declared，fake 端点）已验。
- 活动 Run 冻结只有 Host 测试（409 active_run）与卡片禁用态的单元测试；浏览器里未在 Run 进行中打开卡片。
- 200% 缩放、读屏、长模型名（>30 字符）的系统目验未做；控件文字截断沿原 `.composer-model` 170px 规则。
- Settings › Models 落点只靠焦点与滚动，无高亮；`locateConnection` 只有源码断言（createSettingsView 依赖 `document.getElementById`，tiny-dom 无此接口）。
- 非作者复核未做；未 push、未部署。
