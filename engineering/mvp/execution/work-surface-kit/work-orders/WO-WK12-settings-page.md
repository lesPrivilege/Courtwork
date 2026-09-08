# WO-WK12 · Settings 整页与用户自定义（Claude Opus）

2026-09-08。裁定见 [WK-78](../intake-round-3.md)；参考登记见 [settings-references](../inputs/settings-references-2026-09-08.md)。基线为 WK13 r2 合流后的清洁 `main`（以 Astra 最终回执 SHA 为准）；接单时重查 HEAD，在 WK13 合流后开工，与 WK11 串行于同一前端文件。Astra 接收与独验；用户裁视觉四轴。

## 问题

现有 Settings 是一个 `<dialog>`（`app/web/index.html:460–517`），五节竖排，无导航、无搜索、无外观设置；Runtime Workbench（WK11）若再塞入同一对话框会失去层级。用户要求按 dashboard 方式编排，并让用户在侧栏取得更开放的自定义能力。

## 交付

1. **页面壳。** `#settings-page`（L3，替换 `.chat-panel` 内容区，应用侧栏保留），左列导航（分组 General / Appearance / Keyboard / Runtime / Developer）+ 搜索框（只过滤本页行的标题与说明），右列分节；Back 按钮与 Escape 回到进入前的会话或 Home；hash 路由 `#settings` 与 `#settings/<section>`；< 1024 导航折为顶部下拉，右列单列。
2. **General。** Connection 沿 `settings-view.mjs` 现有 connection card 与 credential form 迁入，不改字段与请求；New sessions 默认 File writes（Ask / Write / Read，写入现有 Home 默认值来源）；Data 节只读显示数据目录、adapter、host 状态（`GET /runtime-info`）。
3. **Appearance。** Scheme（Light / Dark / System → `data-theme`，WK7）；Skin（Slate、`skins/gray-steel.css`、用户 token 集）；Text size（三档，一个根字号变量）；Code font（单行输入，写入 `--font-mono` 前缀）；Reduced motion（跟随系统 / 强制开）。每行下方一块真实产品片段预览（一条 Chat Flow 工具行 + 一段带 diff 的代码块），随选择即时变化。用户 skin：粘贴一组 Tier S token（`--slate-1…12` 等既有名），前端按 `tools/lint-colors.mjs` 同一规则校验：只接受既有 token 名、只接受 hex、不得含 `url(`、`expression`、`@import` 或分号外内容；不通过时逐行指出并拒绝。
4. **Keyboard。** 现有快捷键只读表（`j` / `k` / `↑` / `↓` / `Enter` / `o` / `Escape` / 发送与取消）；"重绑定" 为 Planned 行。
5. **Runtime。** 预留组与节位，按 [frontend-layering-spec §3.1](../../../../design/frontend-layering-spec.md) 的意图分组（Overview / Composition / Instructions & context / Capabilities & connections / Permissions & environment），由 WK11 填充；本单只搬入现有 `#runtime-control-settings` 与 `#runtime-context-summary` 到 Runtime › Overview，不新增 API。Models 节与 General › Connection 共用同一表单实例，只在 General 编辑，Runtime › Models 显示只读摘要 + "Edit in General" 链接。
6. **Developer。** 现有 Extensions 生命周期列表、`PLANNED_CAPABILITIES`、runtime-info 迁入；Planned 行保持 inert 文字。
7. **持久化。** Appearance 与 Keyboard 偏好写 localStorage（键 `cw:prefs:<dataDirHash>`），页面加载时先应用再渲染，避免闪烁；不进 runtime-state，不新增后端；Connection / File writes / Runtime 仍走既有端点。
8. **文档。** 更新 `docs/interface-components.md` 的 Settings 段与 `engineering/design/copy-convention.md` 的词表（新增：Scheme · Skin · Text size · Code font；不用 Theme / Preference / Personalization）。

规范依据：[frontend-layering-spec](../../../../design/frontend-layering-spec.md) §2.1 Configure / Develop 面、§3 自定义分类、§4.1 设置条目四层、§6 FN-26 / 27；本单交付 FE-T09 / T10。

## 不做

- Full access 或任何"无需批准"总开关；权限仍为 Ask / Write / Read 与 control plane 策略。
- 任意 CSS / JS 注入、外部字体加载、语言切换、菜单栏与桌面壳项（壳位仍按 WK-30/31 预留）。
- 为凑节点画无后端控件；Registries / Memory / Secrets / Sandboxes 仍为 Planned 文字行。

## 验证

- 键盘：导航列 ↑/↓，Enter 进节，Escape 回退，焦点回到进入前的控件；搜索框不抢占 IME composition。
- 1440 / 390 × 浅 / 深 × 三档字号；用户 skin 通过与拒绝各一例；reduced-motion 下预览无过渡。
- 现有 Settings 回归（provider 保存、key 保存 / 删除、extension lifecycle）路径不变；`npm --prefix app test` 与 `lint-colors` 通过。
- 消融表：每个组 / 行删除后失去什么判断；无判断价值者删。

## 交付物

固定 SHA、受影响文件、同条件截图（每组一张 + 预览变化前后）、消融表、未检项（触控、读屏、真实 provider 分列）。作者验证与 Astra 独验分列。
