# SVG 工程规范

产品图标只允许 SVG-as-code；位图、webfont、sprite、base64 与远程图标 URL 不进入产品 UI。

## 网格与外观

- `viewBox="0 0 24 24"`，源稿不写 width/height；
- 描边 1.35px，`currentColor`、round cap/join、`fill="none"`；
- 图标只继承品牌或中性 token，不跟随业务状态换色；
- 坐标最多两位小数，细节留足 16px 可辨间距。

## 白名单

只允许 `path`、`line`、`polygon`、`polyline`、`circle`、`ellipse`、`rect`。禁止 group、image、use、symbol、defs、filter、gradient、style、text、script、事件属性、id/class、transform 与未知 namespace。

## 命名与登记

- 文件名用小写 kebab-case，按几何形状命名，不按法律用途命名；
- 每个自绘图标必须在 manifest 登记，文件与记录一一对应；
- 通用隐喻优先使用 Lucide 静态具名导入；只有缺失时才新增自绘图标。

## 门禁

提交前运行图标优化与静态校验。机器门必须覆盖 viewBox、描边、标签/属性白名单、颜色、精度、manifest 完整性、SVGO 稳定性、TSX 内联 SVG 禁令与 Lucide 静态导入。

SchemaParts 不属于产品图标白名单：其几何唯一源、`<symbol>/<use>` 纯度、React 属性写法与双主题语义由 `pnpm --filter @courtwork/desktop lint:schema-parts` 专门门约束。图标门的内联 SVG 禁令不得拿来绕过 SchemaParts 门；SchemaParts 的具名豁免也不得扩大到任意内联 SVG。

每批新图标还要生成 16px/24px 审计板。16px 看主体轮廓，24px 看细节与光学重量；机器绿不能替代人审。
