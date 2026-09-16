# P · Home 身份、问候与账户

2026-09-16 · 用户中途裁定的产品片，交给 Claude（Fable 5.1）裁决与实现；Sonnet 5 做 Profile / Account 面板。不在 00→13 编号内，不改变 RD-006 → DF-04 主顺序。

```text
Task / scope: Home greeting 消费 Profile 的 work address；左下角身份行 + 账户菜单；Settings 前三组 Profile / Preferences / Account（Account 为 fixture plan）；Home 首屏重新编排（问候进 masthead，Example banner 降级），composer 锚点不动
Base SHA / branch: 06 片后 a44ec13（v2 入账）之后 / claude-frontend-harness-20260916
Writer / reviewer: Claude 作者；Sonnet 5 写 Profile / Account 面板与其测试；非作者复核未做

Owner fact + contract: Host 持有一份 profile.json（revision CAS；avatar initial/photo≤256 KiB/portrait、fullName、preferredName、workAddress≤40、role、organization、language zh-CN|en、IANA timeZone、preferences.contextualGreetings）；GET /account 返回 fixture（plan Max · active、billing/privacy/sessions 行、unavailable 动作清单），无任何用量数字
四条硬约束: 称呼只从 Profile 来（Home 不维护 nickname）；greeting 不承担 feature discovery；fake plan 可以有，fake telemetry 不存在；个人 Settings 不收 Harness 控制面
Semantic / projection / control / placement: home-greeting.mjs 纯语法：地址链 workAddress→preferredName→fullName→无；时段按 profile 时区（06–12 / 12–17 / 17–21 / 21–06）；星期与会话状态句只在为真时可选；seed = local|日期|时段|状态 固定一句，只在新时段/新一天/离开≥30 分钟后重抽，替换用 180 ms 淡入淡出，reduced-motion 直接换。语料 English only（18 句，用户 2026-09-16 裁定暂不翻译或投影中文），称呼型与行动型并存。放置：Modules 双栏——primary stack（masthead：问候 + Example 行）+ Attention 在左、Activity 在右，左列本有余高，composer 纵坐标不变；单栏时 masthead 成首行；Simple 复用 #home-composer-intro（旧 tagline 退役）；<768 普通首行。Example banner：保留 id 与 preview 状态机，只降级为灰字一句 + 同行动作。左下角：avatar 28px + work address + plan 词，菜单 Profile / Preferences / Account / Settings / Sign out（禁用，句：Available when accounts are connected.）。Settings 组：profile · appearance（标题 Preferences，加 Time zone / Contextual home greetings 两行（Language 字段保留在 Host，暂无消费者，不画），写 Host profile）· account · 原产品组
Affected UX rule IDs: UX-02（fixture 只表达 entitlement，不表达计量）、UX-08（问候只读事实，不读 Activity/Attention）
Nearest precedent: composer 的 Model & effort 卡（popover 菜单解剖）；segmentedPermission；settingsRow；`--home-lead` 56% 测量与 Modules 24px lead；preview-layer 状态机
Evidence type: implemented precedent
Governance status: candidate（无非作者复核）
Kept relationships: Modules/Simple 偏好不变；loadHomeModules 边界不变（Simple 不加载 Activity/Attention）；preview 状态机与按钮 id 不变；Appearance 组 id 不变（标题改 Preferences）
Intentional changes: 旧 tagline 不再显示；Settings 组从 10 增到 12；页脚 Settings 按钮移入账户菜单（id 保留）；registry 增 settings.profile / settings.account，settings.appearance 词改 Preferences；Account 组 glyph 暂用 house（图标集内无更贴切的空闲字形，待后续补字形）
New terms / primitives / dependencies: home-greeting.mjs、avatar-mark.mjs、server/profile-store.mjs；copy-convention §3.2d；无新依赖
Exceptions: Sign out / Delete account / Manage plan / Export / View history 全部禁用并写原因，不做假动作；无真实账户服务
```

## 提交

| 提交 | 内容 |
|---|---|
| `1a87bf2` | Host profile-store（CAS、限额、fixture Account）、路由、home-greeting 语法与语料、profile / greeting 测试 |
| `e798306` | Home 问候放置（masthead / intro）、Example 行降级、左下角身份行与账户菜单、Settings 三组与 Preferences 三行、avatar-mark、registry 与生成投影 |
| `46d2b01` · `ac81800` | Profile / Account 面板（Sonnet；其未提交改动被前一提交一并带入，见提交说明）；问候 English only 与日期行；面板测试 |

## 作者检查

| 检查 | 结果 |
|---|---|
| 定向 | `tests/home-greeting.test.mjs` 5、`tests/profile.test.mjs` 2、settings-preferences / product-semantics / semantic-guards / entry-audit / static-web-manifest / home-presentation / settings-navigation / product-icons / shell-layout / chat-work-shell / composer-access-placement 87/87 |
| `npm test` | 1195/1195（09 片补钉八套 schema fixture 后的同一次运行） |
| lint | interaction / colors / shapes / materials / product-copy / semantic-consumers / doc-links 通过 |
| 浏览器（Local test Host，1280） | 空 profile：页脚 You · Max、masthead "Back again."；PUT 林知远/知远/林律师/律师/衡山律师事务所/zh-CN/Asia/Shanghai 后：masthead "继续吗，林律师？"（上海下午时段）、页脚 林律师 · Max、头像 林；composer top 414 → 414（差 0 px）；primary stack 127 < Activity 248；Example 行落在 masthead aside（两行灰字）。Simple：问候进 intro，Example 行在其右，band 隐藏。390：问候首行、Example 两行、composer sticky 底部、无横向溢出 |

## 用户下午裁定（2026-09-16，截图）

- 问候只留一行：句子与日期拼接（句子在前，日期同一行、较轻的等宽数字），`.home-greeting-text` / `.home-greeting-date` 两个 span 在同一个 h2 里；Simple 的 intro 与 Modules 的 masthead 同一结构（`2837a1f`）。
- Modules 展开时与 Activity 卡对齐：masthead 上补 18px，使问候行盒（30 高）与 Activity 标题行（28 高）同中心；1280 实测 98–128 对 99–127，composer 顶仍为 427。
- 日期点击展开日历视图：**登记为需求，本轮不研发**。日期现在是文字不是控件，避免死入口；何时做由后续单独裁定（数据来源候选：`/work-activity` 日桶）。

## 未完项

- Profile / Account 面板：Sonnet 交付（工作地址建议是按钮而非自动填充；账户动作全部禁用带原因；256 KiB 客户端拒绝），浏览器目验未做（Photo 上传、409 冲突）。
- 语料未做非作者审读；English only 18 句，中文语料按用户裁定暂不做。
- 跨时段淡入淡出未在浏览器观察（需等时段变化）；逻辑有单元测试。
- 无真实账户服务：Sign out 等动作禁用；未 push、未部署。
