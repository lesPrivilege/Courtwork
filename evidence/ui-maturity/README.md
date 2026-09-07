# Web UI 成熟度首片：工作面覆盖与焦点连续性

2026-09-07。作者 Astra；Luna 负责只读溯源与 diff 复核。用户最新要求将 web UI 成熟度迭代交给 Astra，Claude Design 继续视觉审美、取色与画板。此候选从 C3 `2d8a26b263cb570b6adcc5d8cc866169c41174bd` 独立开出，未覆盖 `/private/tmp/se-agent-v9-web`。

## 范围与改变

普通窄屏工作面原先只是 CSS 覆盖，Tab 能进入被遮住的 Create project；Escape 对它无效。打开按钮还会在异步读取之后重新聚焦 tab，覆盖用户后续意图。

本片将已有 shell 关闭 owner 收敛为 closeSurface；覆盖时隔离背景、约束 Tab 边界、显示遮罩并支持关闭、恢复打开按钮焦点。展开层的 Escape 先还原布局，下一次才关闭窄屏工作面；原生 dialog 保留优先级。跨断点进入覆盖态时同步交焦点；上层 dialog 关闭时回到仍可操作的工作面。读取不再参与焦点交接。窄屏展开动作的逆操作名改为 Restore work surface。

状态/焦点职责仍在既有 app.mjs 中；未改 renderer 挂载、读取归属、command、草稿或 Run owner。新增 backdrop 复用现有原生 dialog 遮罩值。表面选择：辅助工作面 → 覆盖层 → 既有 shadow/遮罩 → modal/focus/closed → 桌面分栏保持非模态。未消费新依赖、图标、配色或画板资产。

## 验证

- `node --test app/tests/*.test.mjs tests/*.test.mjs`：88/88。覆盖既有后端/renderer 底座；不是完整前端验收。
- `node --test evidence/ui-maturity/surface-counterexamples.mjs`：9/9。作者 VM 控制器反例，使用 stub DOM 和挂起读取，不宣称浏览器网络竞态独验。
- Codex 内置浏览器实际操作：390×844 初始页按 Tab，旧代码焦点进入被覆盖的 Create project；新代码从 Preview tab 开始，Shift+Tab 到 surface-content，Tab 回到 Preview。
- 实际操作：普通 sheet Escape 关闭并聚焦 Show work surface；展开后一次 Escape 仅还原，下一次关闭；768×900 遮罩点击关闭并回焦点。
- 实际操作：768↔1440 断点切换恢复/隔离背景；1440 打开 Runtime setup 后缩至 768，Escape 只关 dialog，修正后聚焦 Preview。作者首轮发现焦点落 body，修后重新走全路径通过。
- 实际操作：中文 composer 草稿关闭/重开/重载仍存在。通过 UI 在独立数据目录创建合成项目/会话并绑定 Evidence Memo；renderer 内未保存文本 `Unsaved renderer draft survives close.` 在关闭重开后仍保留。
- 390 最终展开页面截图与 AX 实查：Restore work surface 名称和未保存 renderer 文本均可见。
- `node --check app/web/app.mjs`、`git diff --check` 通过；独立工作树按锁 `npm ci --ignore-scripts --prefix app` 成功。

第一次 `npm test --prefix app` 在本机 Node 25 因已有脚本 `node --test tests/` 的目录解析失败，未改产品脚本；改用项目 README 指定的 glob 命令后88项通过。

真实触屏、读屏器、200% 浏览器缩放、IME composition、浏览器延迟网络复验未运行。控制器保活断言与一次真实 renderer 输入保留不替代完整 G1/G2 历史前端回归。本片是局部候选，不宣称 GUI 完备、C3 合流完成或真实 provider 通过。

## 后续迭代顺序（Astra）

1. 沿已接受 A-5 拆出服务/纯投影和 surface-host；先补足前端反例入口再机械搬迁，保留唯一 owner。
2. 落实 G1 开始/恢复/导航与窄屏导航入口，含 DC-1/DC-9 默认落点；本片不改变既有初始 surfaceOpen 默认值。
3. 消费已接受 Lucide 子集和共用提示 adapter；授权、错误恢复、状态与后果仍用可见文字。
4. 接入 Dashboard 摘要与 run 内成果视图，依真实 API 逐字段验证。表格/事件/列表扁平化与 Claude 的最终视觉 token 合流单独审查。

工作树 `/Users/lesprivilege/.codex/worktrees/se-ui-maturity-20260907`，分支 `codex/ui-maturity-surface`。本地验证端口8816，独立合成数据 `/private/tmp/se-ui-maturity-data-20260907`。从本目录向上两级为仓根。重启命令：`PORT=8816 SE_RUNTIME_DATA_DIR=/private/tmp/se-ui-maturity-data-20260907 node app/server/index.mjs`。源码以提交和相邻 manifest.json 绑定；UI实操记录为作者观察，未伪称自动化截图归档。

Luna 独立运行首版控制器8/8与底座88/88，并复核指出 WS-10/D5 桌面第二次 Escape 必须关闭分栏。Astra已补修并增加组合输入防护反例；最终控制器9/9。Luna另指出默认落点/切会话后面板打开、1060实现断点与WS10的1024文档、隐藏面板的在途读取以及创建dialog opener统一策略尚需G1核对；这些未由本片关闭。新版最后一项IME仅是事件模拟，非真实IME实测。

最终追加实操：1440桌面打开设置，第一次Escape只关设置并回Runtime setup入口，第二次Escape关闭工作面并聚焦Show work surface，实测通过。
