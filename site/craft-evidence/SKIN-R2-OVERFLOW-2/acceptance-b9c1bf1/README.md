# SKIN-R2 P2-L21 · 独立验收（放行）

日期：2026-07-20。验收对象：`b9c1bf140caba475baf028476d6fd72f32835aa0`。本会话从目标 SHA
建立全新 clone `/tmp/courtwork-p2-l21-acceptance.J4uM7P/repo`，使用分支
`codex/p2-l21-accept-b9c1bf1` 和独立端口 `19842–19845`；依赖由
`pnpm install --frozen-lockfile` 安装（14 projects / 1,047 packages）。实现者为另一会话，本会话
没有复用实现进程、截图或结论，未改实现消费值、SPEC、契约或机器门，未 push。

**裁决：✅ 放行 SKIN-R2 P2-L21。** 1440×900 Focus 状态的 chrome→back 净距实测 9px，
back／title／meta 顺序与间距成立；撤掉唯一安全内距后同一几何门精确回到 `19 < 147` 并翻红。
删除平铺账 `P2-L21` 行亦定点红。复原后 P2 与 RP-2.5 定向谱 15/15、全仓 lint/test/build 均绿，
fresh clone 自身编译的真实 Tauri/WKWebView 新摄暗宗 Focus 帧也没有 chrome、返回钮、标题或计数
叠压。

## 1. 权威范围与实现边界

验收前逐读：

- `site/craft-evidence/SKIN-R2-P2/OVERFLOW-SIGNATURE.md` 的 P2-L21 签署行；
- `site/craft-evidence/SKIN-R2-OVERFLOW-2/README.md` 的实现侧红／后测；
- `apps/desktop/SPEC.md` 的 P2-L21 节。

目标 diff 只让 `.workspace.focus-mode .preview-host-head` 复用既有
`--window-chrome-detached-title-safe-inline`，并增加测试、签署投影、档位账与证据；没有新增 token、
固定屏幕坐标、DOM、状态、数据、路由、focus/back 行为、颜色、字体或动效。非 Focus Preview、
P2-L19、P2-L20 的消费值未被本轮验收改写。

## 2. P2-L21 几何 mutation

在活动 `apps/desktop/src/styles.css` 完整撤掉：

```css
.workspace.focus-mode .preview-host-head {
  padding-left: var(--window-chrome-detached-title-safe-inline);
}
```

独立端口 `19843` 只跑 P2-L21：**0/1，exit 1**。真实几何错误为：

```text
Expected: >= 147
Received:    19
```

即 `chromeRight=139`，获批最小净距要求 `backLeft≥139+8=147`，撤值后 back 回到 19px。精确复原
后换端口 `19844` 同项 **1/1**；`git diff --exit-code -- apps/desktop/src/styles.css` 成立。该红证咬住
实际计算几何，不是只查 selector 或 token 字面存在。

## 3. 档位账 mutation

在活动 `docs/design/r2-tier-ledger.json` 删除 P2-L21 的唯一平铺行后，运行
`pnpm --filter @courtwork/desktop lint:skin-r2-ledger` 得到 exit 1：

```text
SKIN-R2 signed ledger failed (1):
- 已签提案行缺失：P2-L21
```

精确复原后同门 PASS，账文件零 diff。中间档对象仍唯一绑定
`apps/desktop/src/styles.css#.workspace.focus-mode .preview-host-head|title-safe-inline`，没有双绑或借行。

## 4. P2／RP-2.5 定向谱与浏览器真帧

build 完成后，独立端口 `19842` 运行：

```text
playwright test tests/e2e/p2-layout.spec.ts tests/e2e/rp25.spec.ts
15 passed (12.9s)
```

15 项包括 P2-L17/L18/L19/L20/L21、RP-2.5 的 1180/1240/1440/1600 横向溢出矩阵、Preview
back、artifact 跟随、model-config、scene/disclaimer 与 1180 Settings。报告没有沿用实现自述中的旧
14 项数字；当前目标实际列举为 **15 项**。

本 clone 另从独立 Vite `19845` 新摄
[`browser-focus-1440x900.png`](browser-focus-1440x900.png)，SHA-256：
`04f0d72251aee2e78b1d5f44b31bebe9d4124c8e519f3e66d6d1604fe877df11`。同帧计算值：

| 几何 | 实测 |
|---|---:|
| viewport / root scroll | `1440×900` / `1440=1440` |
| chromeRight → backLeft | `139 → 148`，净距 **9px** |
| backRight → titleLeft | `176 → 186`，净距 **10px** |
| titleRight → metaLeft | `242 → 250`，净距 **8px** |

肉眼复核该帧：sidebar/search chrome、返回钮、标题「修订预览」与计数「4 处」按单一首行顺序排列，
无遮挡、重叠、裁切或横向滚动；右侧 Exit focus 保持原位置与语义。

## 5. 真实 Tauri / WKWebView

本 fresh clone 从空 cargo target 编译 398 单元并启动真实
`apps/desktop/src-tauri/target/debug/courtwork-desktop`，连接独立 Vite `19845`。通过 macOS native
Accessibility 进入样板案并点击真实 `checkbox Focus`；截图时该控件已变为
`checkbox Exit focus Esc` 且 AX value=`1`，证明不是静态伪帧。

live CGWindow owner 为 `courtwork-desktop`，标题为 `SKIN-R2 P2-L21 · acceptance WKWebView`，
CSS window 为 1440×900。新摄
[`tauri-wkwebview-focus-1440x900.png`](tauri-wkwebview-focus-1440x900.png) 为 3104×2024 physical px
（含系统阴影），SHA-256：
`26e59b673f4353101d04dad55cccfa51796f906ab61b2a7b8125096c61555d3f`。macOS 26.5.2
（25F84）、arm64，Tauri CLI 2.11.4。

真壳暗宗帧中 AppKit 交通灯、sidebar/search 应用按钮、back、标题与 `4 处` 逐位分离；back 可见且
未被 chrome 盖住，title/meta 无叠字，窗口右端 Exit focus 也完整。截图后 Tauri 与 Vite 均已停止，
端口释放。

## 6. 全量工程门

| 门 | 本 clone 实跑 |
|---|---|
| `pnpm lint` | PASS |
| 根 `pnpm test` | PASS；**148 files / 1,261 tests** |
| `pnpm -r build` | PASS；13/14 workspace 有 build 脚本；desktop **3,580 modules**；仅既有 Vite 提示 |
| P2 + RP-2.5 定向谱，端口 `19842` | PASS；**15/15（12.9s）** |
| P2-L21 撤安全内距，端口 `19843` | 预期红；**0/1**，`19 < 147` |
| P2-L21 复位，端口 `19844` | PASS；**1/1** |
| P2-L21 ledger 缺行 | 预期红；精确报 `已签提案行缺失：P2-L21`；复位 PASS |
| Tauri WKWebView，端口 `19845` | PASS；fresh cargo build、native Focus AX、新摄 live CGWindow |

为诚实保留一次验收编排噪声：安装后、workspace build 前曾过早启动定向谱，Vite 因各 workspace
`dist` 尚不存在而报本地包入口无法解析，本会话立即中止，未把该轮算作产品测试。随后先完成全仓
build，再以新端口完整跑出上述 15/15；源码零变化，因此该前置失败归类为 fresh-clone 启动次序，
不是 P2-L21 回归。

本验收提交只追加本报告、浏览器／WKWebView 新帧、Tauri 配置及 `apps/desktop/ACCEPTANCE.md`
投影；不修改实现消费值、SPEC、测试或机器门。放行范围止于 P2-L21 焦点态 Preview 首行安全区，
不扩大为其他窗口状态或后续终局 one-shot 放行。
