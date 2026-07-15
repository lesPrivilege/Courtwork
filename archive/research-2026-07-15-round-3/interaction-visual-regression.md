# 交互态视觉回归与 UI 残留检验调研（2026-07-15）

调研原稿，不具约束力；已吸收为 `UI-RESIDUE-1` 工单（见 implementation-readiness）。

## 1. Playwright 像素对比的确定性工程

- `toHaveScreenshot`：`animations:'disabled'`（有限动画快进到结束、无限动画取消回初始态）、`caret:'hide'`、`stylePath` 注入 CSS 掩蔽易变元素、按组件分层设 `maxDiffPixels`/`threshold`（勿用全局大容差掩盖真实回归）。
- `reducedMotion:'reduce'` 是 context 层模拟，与截图时 `animations` 是两套机制，混用会使 reduced-motion 遵守性断言失真，应分开验证。
- `getAnimations()` 陷阱：delay 动画的 `transitionend` 延后但可靠；元素同时有 transition 和 keyframe 时需 `Promise.all` 等全部 `.finished`；`networkidle` 对动画无效。
- 基线环境：官方明确警告渲染依赖 host OS/硬件，必须同环境生成与比对基线；单开发者同机基线天然满足。实战经验（turntrout 428 天）：对少数已知机器相关差异显式记录放弃，不死磕。
- 进阶抖动抑制：`deviceScaleFactor:1` + `scale:'css'`；Chromium 启动参数 `--force-color-profile=srgb --disable-lcd-text --font-render-hinting=none`；截图前鼠标停靠安全位；媒体元素 `MutationObserver` 固定帧。

## 2. 「闭合不变量」模式现状

- 社区无统一命名的「open→close 回基线」模式；等价实践散在三处：
  - Storybook interaction tests + test-runner（play function + 真浏览器），但像素回归官方推 Chromatic（云，排除）；需自行在 play 末尾加 `toHaveScreenshot`。
  - **XState `@xstate/test`**：`createTestModel` + shortest-path plans 从状态机自动生成「初始态→每个可达态」测试计划，最贴合「交互序列遍历」诉求。
  - **fast-check-frontend**：属性测试随机生成交互序列，验证跨序列不变量（官方示例即「同时只有一个 modal」）。

## 3. DOM 级残留检验

- 无现成「overlay 清理」lint/runtime 库，需自建 helper：portal/`[role=dialog]` 孤儿节点计数、`document.getAnimations()` 归零或全部非 running、`activeElement` 归还触发元素、无残留 `aria-hidden`/`inert`。
- RTL 侧 portal 需 `baseElement`/`within(document.body)` 查询；Playwright 侧 `toHaveFocus()` 断言 focus 归还。
- `@axe-core/react` 可捕捉 aria-hidden/inert 误用（通用审计，非专用残留检测）。

## 4. 自托管视觉回归工具对比

单开发者+本地基线+基线入 git 场景：**Playwright 内建方案成本最低**（现状即是）；Lost Pixel OSS 是未来跨 Storybook 统一管理时的低成本扩展；reg-suit（需存储插件）、BackstopJS（第二套管线）、Argos（需自建带 DB 服务）边际收益不明显。

## 5. 可转化为机器断言的设计规范

- WAI-ARIA APG Dialog：开时 focus 移入对话框首个可聚焦元素；ESC 必须关闭；关后 focus 归还触发元素；`aria-modal="true"` 使背景 inert（可断言背景不可 tab 到）。
- HTML 原生 Popover API 的三态清理语义（auto/hint light-dismiss、manual 显式不自动清理）是现成的疊層清理断言分类法；`beforetoggle`/`toggle` + `oldState/newState` 是可仿造的生命周期事件契约。

## 6. 推荐组合（已吸收进 UI-RESIDUE-1）

四层断言：静态契约门（现状）→ 像素基线（Playwright 内建、同机、Chromium 闭环）→ **开合闭合门**（初始截图 A → 开 → 中间态断言 → 关 → 截图 B，A≡B 掩动态区；XState shortest-path 枚举路径）→ **DOM 残留门**（`expectNoOverlayResidue` 自建 helper，兜 WKWebView 像素盲区）。抖动控制清单见上文第 1 节。

来源：playwright.dev/docs/test-snapshots；github.com/microsoft/playwright/issues/11912；turntrout.com/playwright-tips；stately.ai/docs/xstate-test；github.com/mdubourg001/fast-check-frontend；w3.org/WAI/ARIA/apg/patterns/dialog-modal；MDN Popover API。
