# SVG 图标工程规范（P-4，2026-07-10）

适用范围：Courtwork 产品 UI 的全部图标源稿、Lucide/Tabler 消费层与模型编写的自绘 SVG。产品素材只允许 SVG-as-code；位图生成、webfont、sprite、base64 图像与远程图标 URL 均不得进入产品 UI。

## 一、唯一网格与外观

- 画布固定 `viewBox="0 0 24 24"`，几何至少留 1px 安全边距；外层组件决定 16px / 24px 的实际尺寸，不在源稿写 `width` / `height`。
- 描边全站固定 1.35px，且只用 `stroke="currentColor"`、`stroke-linecap="round"`、`stroke-linejoin="round"`、居中描边。图标只能继承藏青或中性 token，不随风险、门禁等处置状态换语义色。
- 线框图标统一 `fill="none"`，子元素不得声明 `fill`。禁止十六进制、`rgb()` / `hsl()`、命名色和 CSS 变量等内联色值。
- ≥8px 的矩形用 2px 圆角，较小矩形用 1px 圆角；不同细节原则上保留至少 2px 间隔。光学体量和视觉重心以同尺寸 Lucide circle/square 为参照，由人审判断。

## 二、SVG 源码白名单

根元素只允许 `<svg>`；几何元素只允许：

- `<path d>`
- `<line x1 x2 y1 y2>`
- `<polygon points>`
- `<polyline points>`
- `<circle cx cy r>`
- `<ellipse cx cy rx ry>`
- `<rect x y width height rx>`

禁止 `<g>`、`<image>`、`<use>`、`<symbol>`、`<defs>`、`<filter>`、渐变、`<style>`、`<text>`、脚本、事件属性、`id` / `class`、`transform` 与未知 namespace。`path`、坐标与尺寸值最多保留两位小数。

## 三、命名与登记

- 文件名必须是小写 kebab-case，按**画出的形状**命名，不按法律用途或按钮动作命名。例如画面是“圆环 + 对勾”就叫 `ring-check.svg`，不得叫 `case-verification-icon.svg`。
- 法律含义只进入使用处的文案和 `manifest.json` 的用途说明；组件、文件名和导出类型保持领域无关，贯彻 docs/22 与 principles.md §12。
- 每个自绘图标必须登记 `{ name, family, tags, concept, addedInSpec }`；文件与 manifest 必须一一对应，禁止未登记 SVG、悬空记录或近义重复造轮子。
- docs/44 的 17 个概念行展开门禁三态后是 19 个具名变体。本批以 17 概念 / 19 SVG 为验收口径，三态共享同一 `split-gate` 母题。

## 四、SVGO 唯一配置

仓库配置位于 `apps/desktop/svgo.config.mjs`，固定为：

```js
export const svgPolicy = { removeViewBox: false };

export default {
  multipass: true,
  floatPrecision: 2,
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          cleanupIds: false,
          collapseGroups: false,
        },
      },
    },
    'removeDimensions',
  ],
};
```

SVGO 4 的 `preset-default` 已不再包含 `removeViewBox`，因此不能沿用旧版 override 写法；`svgPolicy.removeViewBox=false` 由自研门禁读取并强制，同时门禁直接断言每个源稿保留 `viewBox`。这保持架构裁决的效果且避免 SVGO 4 的无效配置警告。

提交前顺序固定：`pnpm icons:optimize` → `pnpm lint:icons`。优化后仍须通过源码白名单；SVGO 不能替代工程语义校验。

## 五、机器门禁

`apps/desktop/scripts/verify-icons.mjs` 必须在 CI/本地无浏览器运行，覆盖：

1. 根属性、24×24 viewBox、1.35px/currentColor/round/none 与禁止硬编码尺寸。
2. 标签和逐元素属性白名单；禁止 fill、颜色、style/id/class/transform、脚本与事件属性。
3. 文件名、manifest 完整性、字段完整性、唯一性和 `addedInSpec`。
4. 数字精度不超过两位；SVG 非空且 SVGO multipass 后无漂移。
5. `src/**/*.tsx` 禁止内联 `<svg>`：通用形状进 Lucide，领域形状进登记的 SVG 源稿与生成模块，避免脱离网格、SVGO 和清单的孤儿路径。
6. Lucide 只允许静态具名导入；禁止全量图标表、dynamic icon 与 Tabler 未登记混用。

通用 eslint-svg 插件已停维，本仓库不引入；校验脚本自研并接入 desktop `test:e2e` 前置门禁。

## 六、16px / 24px 人审

每批新图标必须生成同一审计板：左格 16×16、右格 24×24，使用 `text.primary` 单色、白底、1px 中性网格，不加投影或语义色。

通过标准：16px 仍能辨认主体轮廓，同族变体不混淆；24px 可数主要细节，端点不糊、交叉处不结块、光学重量与相邻 Lucide 图标接近。失败时只简化内部线条，不改变母题。截图进入 `apps/desktop/visual-audit/`，由架构抽查人完成最终人审。

## 七、库边界

- 通用隐喻首选 `lucide-react` 静态具名导入，全局 provider 锁定 1.35px；按需打包必须有生产构建体积记录。
- Tabler 仅在 Lucide 明确缺失通用办公图形时单个补充，并先在 16px / 24px 审计板核对描边密度；本批没有触发缺口，不引入 Tabler。
- Base UI 不在 P-4；只有下一个新增 Dialog/Popover 级组件时才触发。第二个 UI 壳出现前不创建 `packages/ui`。
