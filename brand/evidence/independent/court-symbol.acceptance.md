# CourtSymbol 独立验收证据

验收时间：2026-09-08 01:01 +08:00
验收工作区：`<isolated-checkout>`
范围：`brand/src/symbol.mjs`、`brand/src/court-symbol.mjs`。本次只在 `brand/evidence/independent/` 新增测试与本报告，没有修改产品源码，也没有运行会写入 `brand/exports/` 的 build。

## 可执行检查

命令：

```text
node brand/evidence/independent/court-symbol.acceptance.test.mjs
node --check brand/src/symbol.mjs
node --check brand/src/court-symbol.mjs
node --check brand/evidence/independent/court-symbol.acceptance.test.mjs
git diff --no-index --check /dev/null brand/evidence/independent/court-symbol.acceptance.test.mjs
```

结果：

```text
PASS 13 independent CourtSymbol acceptance checks
```

13 项检查由无依赖的 Node DOM/WAAPI stub 执行，覆盖：

- `normalize()` 拒绝未知 concept、`committed` authority 和越界尺寸。
- title label HTML 转义；不安全 `idPrefix` 被拒绝。
- `renderSymbol()` 默认序列与两个 `CourtSymbol` 实例的 SVG title id 均不重复。
- `≤24px` 的 glass 请求降为 hierarchical，并移除 SVG filter 引用，同时保留 requested-material 记录。
- `withdraw + absent` 只让 actor 隐藏，record 几何和 trace 保留。
- `activity=complete` 由宿主输入；play 不写入 authority，也不存在 `committed` 状态。
- connected 初次渲染、属性更新重渲染和错误属性处理。
- play 完成时清理 `data-playing`；第二次 play 打断第一次。
- play 期间属性更新、`disconnectedCallback()`、reduced-motion 变化、`document.hidden` 变化都会停止当前动画。
- reduced-motion 开启或后台启动时不创建动画并返回 static。

另行核对：`sha256(brand/geometry/mark.svg)` 与 `geometry.generated.mjs` 的 `geometryHash` 均为：

```text
522d4303216259490fb501458391431e8329a6aff8cfa3b463be6573d4614556
```

## 静态证据

- `symbol.mjs:2-15` 将 concept、material、presence、authority、activity 限制为冻结枚举；authority 没有 `committed` 值。
- `symbol.mjs:29-39` 对 id 进行 SVG-safe 校验，表达性材质在小尺寸降级，label 经过 `esc()`，withdraw 的 record 仍由 `parts.map(core)` 输出。
- `symbol.mjs:55-57` 将 absent actor 设为 opacity 0，commit 的 settled 仅由宿主提供的 `activity=complete` 显示。
- `court-symbol.mjs:9-18` 在属性变化、断开和 stop 时终止动画并清理 `data-playing`。
- `court-symbol.mjs:19-42` 的 `play()` 只使用 WAAPI 做演示，保留 host-owned presence/authority/activity；新 play、reduced-motion、后台和断开均受 generation/stop 保护。

## 边界

本次实际执行的是 Node DOM/WAAPI stub，不是真实浏览器；没有声称已验证浏览器布局、真实 SVG filter 光栅化、真实 WAAPI 时序、forced-colors、屏幕阅读器或 CSP。未执行 `node brand/scripts/build.mjs`，因此没有生成物写入风险。

在上述独立可执行范围内未发现阻断缺陷；本报告提供证据，最终迁移/接收裁决由 Astra 完成。
