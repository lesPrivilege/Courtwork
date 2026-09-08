# WO-WK7 交付 · 色彩三层治理与深宗（Fable，2026-09-08）

分支 `claude/wk7-color-governance`，基线 `f8aff61`。未推送；合流由 Astra。

## 提交

| SHA | 内容 |
|---|---|
| `40c9af0` | `app/web/styles.css`：S / R 分块、深宗两路、组件去字面量；`app/web/skins/gray-steel.css` 备用 skin |
| `00aca82` | `tools/lint-colors.mjs`、`tools/contrast-report.mjs`、`tests/color-governance.test.mjs`、`evidence/wk7/` |
| （本提交） | 本交付与契约副本 |

## 验证（fixture 列）

```
node tools/lint-colors.mjs        → lint-colors: ok (12 files)
node tools/contrast-report.mjs    → 68 项通过，0 项低于门槛（2 skin × 2 宗 × 17 对）
npm --prefix app test             → tests 136 · pass 136 · fail 0
```

浏览器实测见 `evidence/wk7/computed.md`：浅 / 深宗角色值与预期一致，1440 与 375 无横向溢出。真实 provider 列：not_run。

## 哪一像素改变了哪一判断

| 变化 | 判断轴 |
|---|---|
| 中性 gray → Slate 冷灰，paper 冷白 #fdfdfe | Identity（去掉默认 AI chat 的纯白 / 纯灰）、Quietness |
| accent 由钢蓝改为单色 ink，链接 / 等待态 / 焦点同用 ink | Quietness、Maturity（无 SaaS 蓝）；等待态辨识改由状态词与字重承担，需用户判断 |
| 深宗：canvas 2 / panel 3 / panel-muted 1，阴影 0.4，glass 0.10 | Durability（层级越高越亮，与 Atlassian / Primer / Apple 同向） |
| `.primary-button` 的 `color: white` → `--on-accent`；滑块阴影 → `--shadow-thumb` | Durability（skin 可整体替换，lint 守门） |

## 未验证

`data-theme` 属性切换未在页面实测（无宿主开关）；forced-colors、Safari / Firefox、真实设备；Opus WO-WK6 分支与本分支同时改 `styles.css`（区域不相交：本分支只动 `:root` 色块与四处 U 层引用），合流冲突由 Astra 实际 merge 时核对。截图未存盘。

## 未决（留用户）

四轴视觉判断：单色 accent 下等待态是否仍足够可辨；深宗是否作默认。
