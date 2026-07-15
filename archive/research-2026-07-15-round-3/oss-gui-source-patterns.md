# 开源 GUI 项目源码级机制调研（2026-07-15）

调研原稿，不具约束力。对照系为 Courtwork 设计语言（三层表面、颜色全 token、动效四属性白名单、数据区绝对静止、零技术概念暴露）。派单时按采收清单嵌入工单 prompt。

## 1. Overlay 生命周期 — Radix Primitives + cmdk

源码：`radix-ui/primitives` `packages/react/{dismissable-layer,presence,portal,focus-scope}/src/`。

- **分层 dismiss 栈**：全局 `Set`（layers、layersWithOutsidePointerEventsDisabled、branches）维护栈序；仅最高层监听 Escape；outside-click 走 capture 阶段全局监听 + index 比较。**关键修复点：`disableOutsidePointerEvents` 必须在状态变化时（非仅卸载时）就移出栈**，否则多层疊加时 `body.pointerEvents` 卡死在 `none`（其自修 issue #3645）。
- **Presence 状态机**（mounted→unmountSuspended→unmounted）：在 ref 回调（commit 阶段，早于 passive effect）同步预读 `getComputedStyle().animationName` 缓存，避免二次强制回流；`animationend/animationcancel` 才真正卸载，卸载前锁 `animationFillMode:forwards` 一帧防 React 18 并发闪帧。
- **FocusScope**：独立 focus 栈（与 dismiss 栈分开），add 时 pause 前一个、remove 时 resume 新栈顶；卸载 `setTimeout(0)` 归还 `previouslyFocusedElement`。
- **cmdk**（pacocoursey/cmdk `cmdk/src/index.tsx`、`command-score.ts`）：**无虚拟化**（全量 DOM，条目多不可照抄）；排序不走 VDOM，直接 `appendChild` 物理搬移真实节点；高度动画 = `ResizeObserver` 观察内容高 → rAF 节流写 CSS 变量 `--cmdk-list-height` → 纯 CSS transition（JS 只出数据、动画纯 CSS，契合动效白名单）；评分算法为 memoized 递归字符跳转打分。

## 2. Chat 消息流渲染 — LobeUI（深）+ Jan（略，未读到源码）

源码：`lobehub/lobe-ui` `src/Markdown/`、`src/hooks/useMarkdown/`。

- **不做逐 token 增量解析**：全量字符串重解析 + `cacheKey` 内容缓存 + memo 兜底；逻辑简单、无增量 AST 合并 bug 面，天然无「半行渲染跳动」。
- **未收口内容不渲染**：`isLastFormulaRenderable` 检测末尾未闭合语法（如 LaTeX 缺右 `$`），复用上一次 validContent 直到收口——防 flash of incomplete markdown。可类比到法律引语锚点：**坐标未落定不渲染半截引语**，与「无锚不落格」同构。
- **`useStableValue` 深比较**防调用方内联对象导致 `react-markdown` components 引用变化 → 整个代码块/iframe 子树重挂载。对 G6 图谱等重组件同样适用。
- **`useDelayedAnimated`**：流结束后延迟 1s 才从动画态切静态，避免观感突变。
- Jan（janhq/jan，未进源码，仅 release note 转述）：思考内容流式输出时用户滚动不被自动滚动打断——自动滚动与思考面板展开解耦。

## 3. 分栏工作台 — dockview

源码：`mathuo/dockview` `packages/dockview-core/src/splitview/splitview.ts`（自注明移植自 VS Code splitview）、`dockview/components/panel/content.ts`。

- **拖拽性能**：pointerdown 一次算好 min/maxDelta，pointermove 命令式直写 style（不走 React state），pointerup 才 `saveProportions()` 落盘；拖拽期间 `disableIframePointEvents()` 防事件丢失。
- **布局持久化**：只存浮点占比数组 `_proportions`，容器 resize 按比例重分配，抗 resize 优于绝对像素。
- **面板显隐双模式**：`onlyWhenVisible`（append/remove 真卸载）vs `always`（attach/detach 挪位保活），均有显式 `onShow/onHide` 生命周期；focusTracker 订阅用 `MutableDisposable` 每次整体替换清空——无「面板关了监听器还在跑」的残留。
- 拒绝项：dockview 视觉皮肤（标签页阴影等）不符三层表面 token 规则，只抄布局引擎。

## 4. Tauri 桌面质感 — kunkun

源码：`kunkunsh/kunkun` `apps/desktop/src-tauri/src/setup/window.rs`。

- 沉浸式标题栏 = 绕过 Tauri 抽象直调 Cocoa/ObjC（`NSFullSizeContentViewWindowMask`、隐藏三色按钮、`setTitlebarAppearsTransparent_`）；`#[cfg(target_os)]` 把平台差异隔离在 setup 单函数，上层无感——与 ADR-009「Rust 只做受控宿主能力」同构，作范式参照非代码照搬。
- 前端状态同步机制未能读到源码，不假设可抄。

## 5. 紧凑表格/大列表 — TanStack Virtual（Table/AFFiNE 未读到）

- 已证实符号：`measureElement` + `ResizeObserver` + `itemSizeCache` 动态高度测量架构；`isIOSWebKit` 惯性滚动特判（程序化写 scrollTop 会打断惯性滚动，等稳定再调整）。
- TanStack Table 展开模型与 AFFiNE 表格视图未进源码——「展开不残留」具体实现不写入工单，后续单独深挖。

## 采收清单（按性价比，8 项）

1. Dismissable Layer 栈序清理时序（状态变化即清栈，非仅卸载）→ **UI-RESIDUE-1**
2. Presence commit 阶段预读动画名 + 动画真跑完才卸载 → **UI-RESIDUE-1**
3. 面板显隐双模式 + 显式 onShow/onHide 生命周期 → **UI-RESIDUE-1** / workbench 演进
4. cmdk ResizeObserver→CSS 变量驱动高度动画 → 命令面板提案
5. 流式渲染「未收口内容不渲染」兜底 → **CHAT-SESSION-1**（并类比引语锚点渲染）
6. `useStableValue` 深比较防子树重挂载 → **CHAT-SESSION-1** / 通用
7. `useDelayedAnimated` 流结束延迟切态 → **CHAT-SESSION-1**
8. 分隔条命令式直写 DOM + pointerup 落盘 → workbench 演进

## 明确拒绝项

cmdk 无虚拟化不适合全库搜索；dockview/LobeUI 视觉皮肤禁止照搬；未经核实机制（kunkun 前端同步、TanStack Table 展开、AFFiNE 表格）不写入工单。

## 未读到源码的诚实声明

kunkun 前端 stores、janhq/jan 全部、TanStack Table 展开模型、AFFiNE 表格视图、VS Code workbench 原始码（经 dockview 移植间接获得）。GitHub REST API 持续空结果，改经 raw.githubusercontent.com 与 jsdelivr 文件树绕道。
