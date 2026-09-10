# Publishing visuals · figure verification

2026-09-10 · WO-VG-01 第 7 项 · Opus 作者自检。页面由 `node site/build.mjs` 构建，经 `node site/scripts/preview.mjs --port 8961` 在 `/Courtwork/` 子路径下提供，由 `site/scripts/verify.mjs`（headless Chrome，CDP 端口 19971，独立 profile `/private/tmp/se-agent-vg01-chrome`）截取：

```sh
node site/scripts/verify.mjs --origin http://127.0.0.1:8961/Courtwork/ --cdp-port 19971 \
  --profile /private/tmp/se-agent-vg01-chrome --out <scratch>
```

`--figures-out` 默认写入本目录。`--out` 指向会话 scratch，因此 `site/verification/` 的既有截图未被改写。

## 内容

| 文件 | 内容 |
|---|---|
| `verify.json` | 本次运行的全部 28 项结果（原 V1–V8 共 18 项 + V9 图几何 / 对比 / 红色 4 项 + V10 去色 / forced-colors / 矩阵 6 项） |
| `matrix.json` | 每张截图的实际 viewport（`innerWidth` / `innerHeight` / `devicePixelRatio`，无 JS 时为模拟尺寸）、主题、模式、区域与裁切尺寸；浏览器版本 |
| `{long-work,state-to-commit,fig-00}-{1440,390}-{light,dark}-{default,reduced-motion,no-js}.png` | 矩阵：2 viewport × 2 主题 × 3 模式 × 3 区域 = 36 张 |
| `long-work-*-grayscale.png` | `filter: grayscale(1)`：1440 浅、1440 深、390 浅 |
| `long-work-*-forced-colors.png` | `forced-colors: active`：1440 浅、390 深 |

`long-work` 区域包含本批四张新图（pipeline、spark、attention、roles）；`state-to-commit` 是修订后的 `diagram.svg`；`fig-00` 是 hero 纸层（只改了候选页的线型）。

## 边界

- 去色断言按计算样式换算亮度（elevated 标记与底色的非文字对比 ≥ 3:1、其余安静项均无填充、标签字重 ≥ 600），不是逐像素采样；截图供人工核对。
- forced-colors 由 CDP `Emulation.setEmulatedMedia` 触发；Chrome 152 在该模拟下实际强制了系统色（elevated 标记解析为 `CanvasText`，见 `verify.json`），不代表 Windows 高对比主题的逐一实测。
- 本目录为作者验证，不是独立视觉接受。
