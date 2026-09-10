# FE-05 material specimen · independent verification

日期：2026-09-10（Asia/Singapore）

这是对材质 specimen 修补的非作者复核。原始交付 `cd124d6301981f892d62989f8907a3f0d94f60a5` 的失败证据保留在 [`original/independent-browser-verification.json`](original/independent-browser-verification.json) 与 [`combined/independent-browser-verification.json`](combined/independent-browser-verification.json)；两者都记录了真实媒体回退的 cascade 缺陷（各 12 个失败样本）。本报告不把旧 capture 或旧 measurements 改标为修补后的证据。

## 修补范围与树

- 修补固定提交：`93a641fd91e1615f2f8495f4f4576d310753740c`，树 `/private/tmp/cw-material-delivery-repair-20260910`。
- 组合固定提交：`0246ef294cda236d0e4bb2b3ef9cf98d625bd8ea`，从当前 `68b8d3d67d6b66d1a6c2c8d4f72ff7079135b662` 加入修补，树 `/private/tmp/cw-material-delivery-repair-v2-combo-verify-20260910`。
- 修补 diff 只触及 specimen README/CSS；`app/`、产品 CSS、provider、运行时和凭据均未改动。组合树相对 `68b8d3d` 没有 `app/`、`tools/` 或 package 路径差异。

## 浏览器矩阵

使用 Chrome `152.0.7977.83`、CDP、device scale 1，静态 HTTP 页面，无应用 server、provider 或个人凭据：

- 宽度 `1440`、`1024`、`390`，浅色与深色各一组，共 6 个默认样本；
- 默认、`data-a11y` 的 reduce/nosupport/forced 三种实验开关；
- `Emulation.setEmulatedMedia` 的真实 `prefers-reduced-transparency: reduce` 与 `forced-colors: active`；
- 另以同源 CSSOM 将真实 `@supports not ((backdrop-filter...) or (...))` 条件在已加载页面中有界替换为必真的 `@supports (display: block)`，仅执行并检查该声明块。这个 CSSOM 反例验证声明与级联，不是旧引擎兼容性认证。

## 结果

| 检查范围 | 修补树 | `68b8d3d` 组合树 | 证据 |
|---|---:|---:|---|
| 默认 6 个样本：specimen check、10 个 sampling layers、3 个 masks、overflow | **通过** | **通过** | [`repair-v2`](repair-v2/independent-browser-verification.json)、[`repaired-v2-combined`](repaired-v2-combined/independent-browser-verification.json) |
| `data-a11y` reduce/nosupport/forced：0 layers、0 masks、几何不变 | **18/18 通过** | **18/18 通过** | 上述两个 JSON 的 `fallbacks` |
| 真实 reduced-transparency：0 layers、0 masks、overflow 0 | **6/6 通过** | **6/6 通过** | 上述两个 JSON 的 `mediaReduced` |
| 真实 forced-colors：0 layers、0 masks、overflow 0 | **6/6 通过** | **6/6 通过** | 上述两个 JSON 的 `mediaForced` |
| CSSOM 执行 `@supports` 回退声明：0 layers、0 masks、无残留 computed material、几何不变 | **6/6 通过** | **6/6 通过** | [`repair-v2-cssom`](repair-v2-cssom/independent-cssom-verification.json)、[`repaired-v2-combined-cssom`](repaired-v2-combined-cssom/independent-cssom-verification.json) |
| runtime exceptions / HTTP failures | 空 | 空 | 各 JSON 的 `runtimeExceptions`、`network` |

每个修补后的 default 样本均为 18 rows、10 active sampling layers、3 masks、overflow 0、`__specimenCheck.ok=true`。实际媒体检查中 `matchMedia` 与设定条件一致，`activeRows=[]`。CSSOM 检查在全部 6 个浅/深与三宽度样本中确认 `@supports` 原条件被定位并替换为 `(display: block)`，之后 18 rows 均为 0 sampling layers/0 masks，geometry unchanged，检查无 residual material styles。

修补后的 CSS 选择器在 `specimen.css` 的真实规则中使用 `:root` 提升级联优先级：reduced-transparency 行 734–756、unsupported-engine `@supports` 行 782–806、forced-colors 行 832–854；reduce 块的重复 filter 声明已移除。CSSOM 检查确认这些声明实际压过 P2/transient variant 选择器。

## 视觉与边界

查看了修补树和组合树的 1440/1024/390 浅色与深色 default captures；标题、控制组、Board A 文本与卡片边界在视口内无可见裁切，390 页面继续向下滚动属于页面高度而非横向溢出。新 captures 保存在 [`repair-v2/`](repair-v2/) 与 [`repaired-v2-combined/`](repaired-v2-combined/)；旧 captures 保持只读。该检查不替代真机、触屏、屏幕阅读器或帧时间测量，也不宣称生产材质实现或产品接受。

## 结论

在本报告限定的静态 specimen 范围内，`93a641f` 修补及其与当前 `68b8d3d` 的组合均 **通过**：真实 reduced-transparency、forced-colors、模拟 fallback 和有界 CSSOM `@supports` 声明执行都清除材质采样与 mask，并保持 anatomy/geometry/overflow。旧 `cd124d6` 的真实媒体失败已由新证据覆盖，但旧失败文件仍作为历史审计证据保留。该结论是独立验证结果，不是产品实现、合入、部署或用户视觉接受。
