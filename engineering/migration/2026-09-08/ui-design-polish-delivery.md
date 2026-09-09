> 历史作者回执。最新基线为 dd65d2b（settings 分段权限独占整行）；本轮 Astra 已另完成 Home 与间距/token/动作体例，故下文“间距未引用”等保留项只描述作者当时范围。当前事实见 engineering/current.md 与 evidence/final-ui-audit/README.md。

> 作者交付文本的迁移副本，冻结于 `4fab4bd`。下文原执行目录、命令和历史截图仅为来源记录；当前启动/验收命令以仓库根 README 为准。完整原文与 SHA-256 保留在私有 supplemental；迁移证据见 [索引](evidence-index.md)。

# UI Design Polish · 交付说明

2026-09-08，Fable 作者自述。作者不自验收（UP-8）；四轴判断留用户，独验留 Codex/Astra。

## 交付物

| 项 | 值 |
|---|---|
| 分支 / 提交 | `claude/ui-design-polish`：`891aa13`（token 与交互状态层）→ `e6bab95`（hover 才现的消息操作、连接小卡、设置行式版式）→ `f8e3c19`（时间戳随按钮一同 hover 出现）→ `4fab4bd`（BoardUI 三处模式：分段滑块、Working 计时行、ledger 微光）→ **`dd65d2b`**（设置行内分段控件整行宽），基于 `b26670c`（`codex/gui-completeness`），目录 `<isolated-checkout>` |
| 改动 | 相对 b26670c 五文件 +821/−120：`styles.css`（token 层、交互层、分段控件、设置行）、`ui-controls.mjs`（tooltip 截断守卫、`anchorPopover`）、`index.html`（徽章改按钮、`#connection-popover`）、`app.mjs`（`openConnectionCard`、`applySessionUpdate`、Escape 链加一层、chip 接线）、`settings-view.mjs`（`segmentedPermission`、`renderConnectionCard`、行式表单）。DOM 顺序、ARIA 角色、状态机、commandId、草稿与 renderer owner 未动 |
| 文件 hash（dd65d2b） | styles.css `20b21e632a74…`；app.mjs `e1430cd894a0…`；index.html `bc166fad312c…`；settings-view.mjs `0d662f0e79b7…`；ui-controls.mjs `d71f60026163…`。旧列：；ui-controls.mjs `d71f60026163…`；index.html `bc166fad312c…`；app.mjs `e3263f97611d…`；settings-view.mjs `0d662f0e79b7…` |
| 预览 | 8816（Astra 数据）与 8818（本批 fixture，数据目录 `/private/tmp/se-agent-v9-polish-data`）都从同一目录起，刷新即见 |
| 文档 | [intake.md](evidence-index.md)（原作者路径：`intake.md`）（UP-1…12）、[token-map.md](evidence-index.md)（原作者路径：`token-map.md`）、[pixel-judgment.md](evidence-index.md)（原作者路径：`pixel-judgment.md`）、[source-register-up.md](evidence-index.md)（原作者路径：`source-register-up.md`）、explore 两卷 |
| 证据 | `evidence/captures/`：before 75 张 / after 99 张（f8e3c19），390·768·1024·1440 × {home, hover 行, Tab 焦点, 导航抽屉/hover, 线程(底/顶), 复制 hover, run 检查栏, 文件, 放大, 概览浮层, 运行历史, 编辑对话框, composer 输入, 授权等待(+hover Allow), 问题等待, 空会话, 设置, 材料, **运行中, 取消后, 复制后, 消息 hover, 连接卡（徽章/chip）**}；`before-manifest.json` / `after-manifest.json` 含每张 sha256；脚本 `evidence/seed-polish.mjs`（只走 /api/v5）与 `evidence/capture-polish.mjs`（Playwright + Chromium 1228，同 L4r1 工具链） |

## 复验入口

```sh
cd <isolated-checkout> && git checkout claude/ui-design-polish
npm --prefix app test                                   # 119/119（本批实跑）
node evidence/ui-maturity/surface-counterexamples.mjs   # 9/9
node evidence/ui-maturity/run-receipt-counterexamples.mjs   # 5/5
node evidence/ui-maturity/message-edit-counterexamples.mjs  # 4/4
git diff --check && node --check app/web/ui-controls.mjs
```

fixture 重建：另起数据目录与端口，`node evidence/seed-polish.mjs http://127.0.0.1:<port>`，再 `node evidence/capture-polish.mjs --base … --out … --tag <tag> --seed '<seed 输出 JSON>'`。

## 实际验证了什么

- 第三增量（4fab4bd）真实浏览器探测：分段滑块 `translate` 由 `calc(100% + 2px)` 到 `calc(200% + 4px)`；Working 计时行 0s → 1s 递增，等待回答时改词并加 `is-waiting`；等待授权会话的 ledger 标题 `animation-name: se-shimmer`；取消后提示隐藏。三套反例 9/9、5/5、4/4（作者 stub 环境无 `setInterval`，已守卫）。

- 第二增量（e6bab95）真实浏览器探测：消息 Copy 图标 opacity 0 → hover 1 → 焦点 1；徽章点击开卡（`aria-expanded=true`，焦点落在卡内关闭钮）；卡内切到 Ask before writing 后 chip 文案、toast 与选中态同步；Escape 关卡且焦点回徽章；composer chip 开卡向上锚定；设置对话框 6 行 + 1 分段控件；390 下卡片 340px 完整在视口内。三套反例 9/9、5/5、4/4 仍过。

- 真实浏览器（headless Chromium 1228）四宽度全矩阵；hover 计算值实测 `rgb(240,240,240)`（gray-3）；Tab 焦点圈可见；运行中脉动点、Stop 同槽、取消后焦点回 composer（墨线）、复制后 toast + 图标变色，均为真实 fake-provider run，非 DOM 注入。
- 窄屏：390 composer 标签不再裁切；授权双键等宽 44px；抽屉与工作面滑入。
- 未改 DOM/ARIA/焦点次序/状态机；三套前端反例与 119 后端测试通过。

## 未验证 / 保留

- 真实 IME、读屏、物理触屏、200% 缩放、付费 provider：not_run。
- `@starting-style` 进入动画与 `backdrop-filter` 玻璃面在 Safari/Firefox 未看；无这些特性时退化为即时出现与不透明面（有 fallback 色）。
- `--space-*` 仍未被引用；间距重写不在本轮。
- Astra 数据（8816）上的长会话真实文案未截图；本批 fixture 文案为自然长度英文，未做 CJK 长段。
- 捕获脚本在 390/768 打开"文件"面超时（run 检查栏定位问题，非产品缺陷）；1024/1440 文件面已拍。

## 回迁义务

由 Astra（`codex/gui-completeness` owner）合流：`git merge claude/ui-design-polish` 应为快进；若 Astra 侧再有 styles.css 改动，冲突只在 token 层与附加的 polish 段。`ux-conventions.md` §2 注意力线一行按 UP-9 改标 superseded，待 Astra 或用户确认后由体例 owner 执行。
