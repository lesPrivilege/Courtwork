# 品牌图标 · B1 锚迁前后对照

`docs/design/icon-dark.svg` / `icon-light.svg` 是应用图标的权威源稿（`docs/design/icon.md`）。
B1 分治裁定①：品牌标随壳锚色走，锚迁 217° 的自然延伸，属色阶批本 domain。

## 逐槽换值（按 deslop `svgColorAllowlist` 的 token 绑定，非全局替换）

| 槽 | token | before | after |
|---|---|---|---|
| dark rect1 fill / light rect3 fill | `color.text.primary` | `#0A2540` | `#232B38` |
| dark rect2 fill / light rect1 fill | `color.bg.app` | `#F6F9FC` | `#F7F8FA` |
| dark rect3-5 fill | `color.text.tertiary` | `#6E8098` | `#6E7C92` |
| light rect4-6 fill | `color.text.disabled` | `#98A9BA` | `#8A94A8` |
| light rect2 stroke | `color.border.hairline` | `#E3E9EF` | `#D5DAE3` |

## 几何零变更

剥离全部 `fill`/`stroke` 属性后两版逐字节相等——**只换色不动形**，与 `icon.md`
「几何完全一致，只交换背景与前景关系」的源稿约定不冲突。

## 下游未随动（挂账）

- Tauri 打包指向 `src-tauri/icons/*.png|icns`，非本 SVG；下游位图未重新导出，
  应用图标实际外观在重导出前不变。属既有导出流程，B1 不夹带。
- `site/assets/icon.svg` 仍旧板（裁定②site 冻结），品牌不一致已显式挂 SITE-CRAFT-2。
