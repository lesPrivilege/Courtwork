# SKIN-DYSTOPIA-1 · 深宗欠账清偿批一 · craft-evidence

批次票面：`apps/desktop/specs/SKIN-DYSTOPIA-1.md`（九裁全在其中）。档位：中间档 `agent-interface` 唯一档。

**帧来源如实标注**：本目录全部帧由实现会话在 Chromium（Playwright，`deviceScaleFactor:1`、
`--force-color-profile=srgb --disable-lcd-text --font-render-hinting=none`）下取。**不是真 Tauri
WKWebView 帧**；深宗真机重摄循 `SKIN-R2-P4` 先例属验收侧义务，不得以本目录顶替。

---

## 一、双宗×三面全槽 AA 表（门④-2 实跑原文，`*` ＝该槽的判定面）

面集三值＝`--bg-app` / `--bg-surface` / `--bg-raised`。判定面按轨的真实落座面取：
功能/数据轨三面全判取最严，文书/标题轨只判文书纸面（白卡 `--bg-raised`）——测一张该轨结构上
不落座的底面，等于给门喂不存在的消费点（§2「对比度必须配对声明所对底面」）。

### 刻本印页宗（浅）

| 槽 | 色轨变量 | bg-app | bg-surface | bg-raised | 判定值 |
|---|---|---|---|---|---|
| viewTitle | `--text-primary` | 13.4061 | 12.9289 | 14.2458* | 14.2458 ✓ |
| sectionTitle | `--text-primary` | 13.4061 | 12.9289 | 14.2458* | 14.2458 ✓ |
| documentBody | `--text-primary` | 13.4061 | 12.9289 | 14.2458* | 14.2458 ✓ |
| documentQuote | `--text-secondary` | 5.8517 | 5.6434 | 6.2182* | 6.2182 ✓ |
| tableText | `--text-primary` | 13.4061* | 12.9289* | 14.2458* | 12.9289 ✓ |
| tableNumber | `--text-primary` | 13.4061* | 12.9289* | 14.2458* | 12.9289 ✓ |
| meta | `--text-tertiary` | 4.7324* | 4.5640* | 5.0288* | 4.5640 ✓ |
| control | `--text-primary` | 13.4061* | 12.9289* | 14.2458* | 12.9289 ✓ |
| sealNote | `--zhu-fg` | 4.6643 | **4.4983** | 4.9564* | 4.9564 ✓ |

### 磁青宗（深）

| 槽 | 色轨变量 | bg-app | bg-surface | bg-raised | 判定值 |
|---|---|---|---|---|---|
| viewTitle | `--text-primary` | 14.8721 | 13.4381 | 10.8893* | 10.8893 ✓ |
| sectionTitle | `--text-primary` | 14.8721 | 13.4381 | 10.8893* | 10.8893 ✓ |
| documentBody | `--text-primary` | 14.8721 | 13.4381 | 10.8893* | 10.8893 ✓ |
| documentQuote | `--text-secondary` | 8.6610 | 7.8259 | 6.3415* | 6.3415 ✓ |
| tableText | `--text-primary` | 14.8721* | 13.4381* | 10.8893* | 10.8893 ✓ |
| tableNumber | `--text-primary` | 14.8721* | 13.4381* | 10.8893* | 10.8893 ✓ |
| meta | `--text-tertiary` | 6.2868* | 5.6806* | 4.6032* | 4.6032 ✓ |
| control | `--text-primary` | 14.8721* | 13.4381* | 10.8893* | 10.8893 ✓ |
| sealNote | `--zhu-fg` | 6.7950 | 6.1398 | 4.9753* | 4.9753 ✓ |

### 批前对照（首红，同门同跑法）

| 槽 | 批前变量与值 | bg-app | bg-surface | bg-raised |
|---|---|---|---|---|
| meta@dark | `--text-tertiary` `#6E7C92` | 4.2836 | 3.8705 | **3.1364** |
| sealNote@dark | `--zhu-graphic` `#D75A3C` | 4.6773 | 4.2263 | **3.4247** |

**待架构裁**：浅宗 `sealNote` 在 `--bg-surface` 上实测 **4.4983 < 4.5**（贴阈 0.0017）。该面不在
文书轨的落座面内，故本门不判它；但「浅宗朱的文字轨值是否应按三面复算」是真提问，随回执上浮。

---

## 二、项 A 前后帧（深宗 tertiary `#6E7C92` → `#8B99B0`）

`frames/` 目录：

- `A-01-workbench-dark-before.png` / `A-02-workbench-dark-after.png` —— 深宗全帧前后
- `A-03-meta-closeup-dark-before.png` / `A-04-meta-closeup-dark-after.png` —— 元信息面（案件栏）特写前后
- `A-02-workbench-light-after.png` / `A-04-meta-closeup-light-after.png` —— 浅宗对照（本批浅宗零像素变化）

「前」帧取法如实登记：本批只改 token 值，故「前」帧由运行期把旧值回灌 `:root` 后取，
逐点等价于批前渲染；不是从批前 commit 另起一次构建。

---

## 三、项 B 像素判据（硬判据 **未成立**，已上浮）

`item-b/` 目录，五组同状态深宗帧 `*-before.png` / `*-after.png` 与差异热图 `*-diff-heat.png`
（热图把每像素的最大通道差 ×85 涂成品红，差为 0 处纯黑）。

取帧装置先自证：同一状态连跑两次逐字节相等（五帧全部 SAME），故下表的差异不是取帧抖动。

| 状态 | 差异像素 | 最大 Δ | Δ 分布 | 差异包围盒 (x0,y0,x1,y1) |
|---|---|---|---|---|
| 01-idle | 17914 | 1 | {1: 17914} | (396, 116, 736, 172) |
| 02-rail-hover | 17914 | 1 | {1: 17914} | (396, 116, 736, 172) |
| 03-stage-hover | 17914 | 1 | {1: 17914} | (396, 116, 736, 172) |
| 04-settings | **0** | 0 | — | — |
| 05-settings-nav-hover | 9 | 2 | {1: 8, 2: 1} | (1350, 848, 1359, 859) |

**病灶已定位到具体消费点**：`.user-message` 吃的是
`color-mix(in srgb, var(--bg-selected) 55%, var(--bg-raised) 45%)`——**二次派生**。
派生式在浏览器内保持不舍入（34.54, 57.18, 100.52），换成 8bit 字面量 (35, 57, 101) 后二次混合
的结果跨过舍入界，整块用户气泡 R/B 各偏 1。05 的 9 px 同理，落在 `--control-hover` 圆角按钮的
AA 边。即「解析值为真值」在**只有一次消费**时像素中性，在**有二次派生消费**时不中性。
差幅落在本仓既有亚感知律（Δ≤3）之内，但票面写的是 diff=0，故按未成立登记，不自裁。

---

## 四、项 D 朱面与朱/红并置（Q6，值零改）

- `frames/D-01-zhu-surface-{light,dark}.png` —— 六项处置走完后的落定面（法理之线落定态 + 落定章）
- `frames/D-02-zhu-closeup-{light,dark}.png` —— 落定卡特写（朱印按 §六之二 原样，opacity .5、`aria-hidden`）
- `frames/D-03-zhu-vs-red-{light,dark}.png` —— 朱/红四值 × 三面并置板（`--zhu-graphic` / `--zhu-fg` /
  `--red-graphic` / `--red-fg`，文字与色条两形态同屏）

**并置观察（只留帧不改值，Q6）**：深宗记号轨两色（朱 `#D75A3C` vs 红 `#B5382F`）在三面上均可辨；
**文字轨两色（朱 `#E2857A` vs 红 `#DE8881`）目视几乎不可辨**——两者 RGB 距离仅 (4, 3, 7)。
当期朱的文字轨在壳内零消费点，故不构成现实混淆；一旦朱旁文真的上身，与红 fg 同屏即是风险。
按 Q6「不改值不立票」原样登记。

---

## 五、项 E 深宗 A≡B 的 Δ 分布（承 SKIN-B5 贴阈例挂账）

取样面自证：量测时 `data-theme=dark`、`--bg-app=#0f1622`（实跑打印，非「以为在深宗」）。
A≡B 例数实测 **16 例**（票面写 17 例——第 17 枚 `containerize-popover` 是一次性链式仪式，
无对称基线，只跑残留门不跑 A≡B；差异如实登记）。

| 例 | total | max Δ | banded (Δ∈(2,3]) | significant (Δ>3) |
|---|---|---|---|---|
| user-menu | 0 | 0 | 0 | 0 |
| wall-clock-mask | 0 | 0 | 0 | 0 |
| scene-more | 0 | 0 | 0 | 0 |
| composer-plus | 0 | 0 | 0 | 0 |
| model-config | 0 | 0 | 0 | 0 |
| command-palette | 0 | 0 | 0 | 0 |
| settings | 0 | 0 | 0 | 0 |
| new-case | 0 | 0 | 0 | 0 |
| archive | 0 | 0 | 0 | 0 |
| file-ops-undo | 0 | 0 | 0 | 0 |
| compile | 0 | 0 | 0 | 0 |
| scope | 16 | 1 | 0 | 0 |
| store-chat | 18 | 1 | 0 | 0 |
| composer-case | 0 | 0 | 0 | 0 |
| **settings-optin** | **10** | **2** | **0** | **0** |
| provider-setup | 0 | 0 | 0 | 0 |

浅宗历史值（`ui-residue.spec.ts` 原注）：11 例逐字节相等 / 4 例 max=1 / settings-optin max=2。
深宗：13 例逐字节相等 / 2 例 max=1 / settings-optin max=2。

**处方落定**：settings-optin **确实再度贴阈**（max=2，与浅宗同值）。换宗前后同值，正是「成因是
嵌套模态的重栅格化面天然偏大、与底色无关」的证据，故按当初写下的处方走「舍入带计数上限」而
**不放宽阈值**：`maxChannelDelta` 维持 3（3/255 是亚感知律上界），舍入带实测计数 0、上限 4 的
头寸一格未用——当期无须动任何阈值。深宗逐字节相等例反而比浅宗多两例，换底不构成检出力下降。
