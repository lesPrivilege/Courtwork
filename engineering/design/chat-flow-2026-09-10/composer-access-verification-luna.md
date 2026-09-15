# P1 Composer Access 独立复核（Luna）

日期：2026-09-14。审阅对象为 `/tmp/courtwork-composer-access-20260914` 的 P1 差异，基线 `7e1a1ff047721e1ca6c871deba7f367ccea55a06`。该副本还带有既存 Copy P0 与治理文件；它们不计入本次 P1 差异。

## 结论与范围

在本单的静态放置/样式范围内未发现阻断。P1 只改变 `index.html` 与 `styles.css` 的控件位置和收缩规则，并新增定向合同测试及交付记录。Home select、Existing Chat Access button 的 DOM ID、控件类型、现有 Home 状态与 Session permission owner 均保留；本单没有改 `app.mjs`、权限 API 或 Run/Harness。对主树合入的授权范围限于下列四个路径：

- `app/web/index.html`
- `app/web/styles.css`
- `app/tests/composer-access-placement.test.mjs`
- `engineering/design/chat-flow-2026-09-10/composer-access-delivery.md`

P1 将 `#home-composer-context` 与 `#permission-settings-button` 移入 `.composer-context`；Home 仍用 `select#home-permission-input`，既有 Chat 仍用原 button 打开 `connection-popover`。`#composer-below` 只保留已绑定 Project 事实。源码确认原 Home `state.homePermissionMode` / draft 持久化 / 新 Session 参数，以及既有 Session `/permission-mode` 回执与 `openConnectionCard` listener 均未改。

CSS 现在声明 composer 左右两组与组内 context 不换行，在窄屏为 Home select 保留 44px 高度，并允许长权限文案收缩。测试锁定 DOM ID 唯一、控件归属和相关 CSS 声明；它是 source-contract 检查，不是运行时浏览器或 computed-layout 证据。

## 验证记录

独立执行：

```sh
node --test app/tests/composer-access-placement.test.mjs app/tests/composer-field.test.mjs app/tests/settings-navigation.test.mjs
node tools/lint-interaction.mjs
git diff --check
```

结果分别为 **16/16 通过**、`lint-interaction: ok`（48 files，0 个登记例外）和无 whitespace/diff 错误。作者报告相同三项结果；作者记录见 [composer-access-delivery.md](composer-access-delivery.md)。

隔离副本没有安装 `@earendil-works/pi-ai`，所以其 `permission.test.mjs` 未能加载，不能记作通过。该测试走现有合成 Host permission owner，与本单没有改动的 API 相关。主树集成后我另行运行该定向测试，结果记录在下文。

未进行浏览器截图或视觉接受。CSS 声明不能证明实际布局在 **390、768、1024、1199、1200 CSS px** 都无溢出或保持一行；长 model/effort 名、`Ask before editing`、附件/Workspace 仍可用、明暗、键盘、200% 缩放，以及 permission popover 锚定/返回焦点，均留待用户目验。作者也明确标记浏览器检查未运行。

## 主树同步与 permission owner 定向检查

同步前核对主树的 `app/web/index.html` 与 `app/web/styles.css` SHA256 分别为 `12fe0cb3ba3868ae0a971837d4ff4104ef76e8081b525b8c92b1ace8cd9c71ff`、`a8c465e1b5b266d0f63a94f964f6ecd7fdf0f770bec68b76bd40e6d900406a3f`，与隔离副本 P1 修改前记录的 baseline 一致；四个目标中新增的测试、交付与本复核文件当时均不存在。只将上述四个 P1 路径和本复核文件同步至主树，没有覆盖 Copy P0、治理或其他 writer 文件。

主树定向命令：

```sh
node --test app/tests/permission.test.mjs
```

**6/6 通过**。该合成 Host 测试覆盖 ask 进入 `waiting_user`、allow/deny/cancel、read-only 和精确 write 回执；它不验证 GUI 卡片、popover 焦点或响应式视觉。

因此本记录给出的是 P1 源码归属与布局合同的有界独立通过，以及未变权限 owner 的合成 Host 定向结果；不将其表述为浏览器/视觉接受。用户目验仍待完成。
