# SITE-SHOTS-VERSIONAL-1 · 版本学皮层 Pages 重摄

采集对象：`main@16928c15d0abda68ea3631a685395214931965fa`。应用由本树
`apps/desktop` 在独立 Vite `127.0.0.1:19539` 启动；新浏览器上下文固定
`1440×900`，以 `prefers-reduced-motion: reduce` 取得稳定终帧。三帧均来自实际运行的
desktop 产品 UI 与合成卷宗，不是设计稿、站面微演示或手工拼图。

## 帧与 Pages 映射

| 原始帧 | 产品状态 | Pages 消费名 | SHA-256 |
|---|---|---|---|
| `frames/01-workbench-1440x900.png` | 三栏工作台、卷宗进度与修订工作面 | `11-milestone-dossier` | `2927bf209e6326376bf5b0259c5a709b567f74ee62f262772d8119b0f9dcee6f` |
| `frames/02-risklist-settled-1440x900.png` | RiskList R04 已确认、朱印终态 | `12-milestone-risklist` | `de9a2b37b409a43afff3340307a4cd308e72421bc1fbcd9f1968f8bc926d75aa` |
| `frames/03-revision-focus-1440x900.png` | Focus 模式下的修订主从与文书工作面 | `13-milestone-redline` | `04f0d72251aee2e78b1d5f44b31bebe9d4124c8e519f3e66d6d1604fe877df11` |

每个 1440×900 PNG 以 `cwebp -q 85` 原尺寸生成 Pages 的 1440 WebP，并从同源帧
等比生成 720×450 WebP。响应式配对不改变内容状态。

| Pages 资产 | 画幅 | SHA-256 |
|---|---:|---|
| `11-milestone-dossier-1440.webp` | 1440×900 | `287946c45d3a5c80d92cb4f6ebdad83af9e9b64886b6efe634995686613afc0b` |
| `11-milestone-dossier-720.webp` | 720×450 | `21c4b505a06c9290785171780d191bf06f73812899da332070dc6c3e9ed7509b` |
| `12-milestone-risklist-1440.webp` | 1440×900 | `a075ba40395a89f4cc6723efc2ca1394cd3f2431171df89742631499c6c146dd` |
| `12-milestone-risklist-720.webp` | 720×450 | `0fd7656ed751a501e885649a3645adfc2462f7c5f4b7edc1d359d72aec5418ad` |
| `13-milestone-redline-1440.webp` | 1440×900 | `df396b24f335c6950d121ec1a5416bd62fffa7973728576f13cb39cd29ac3b2f` |
| `13-milestone-redline-720.webp` | 720×450 | `ead00e9ab522bafc9f3db0b7a9539055308ae9dec3ead68755ed51e726420d0a` |

## 版本学读法

- 三帧保持功能 UI sans、标题 serif、文书朱雀仿宋与数据 mono 四轨，不把“陌生化”扩散成
  全系统换字。
- 获签的 11 个 routine 线消费已经退场；composer focus、preview、RiskList 主从、台账组界与
  人工裁决边界继续在场。工作面因此更静，但层级与行为没有被抹平。
- 01 与 02 保留三栏关系；03 只切既有 Focus 状态，没有改 DOM、fixture、写入路径或 schema。

## 证据边界

这是浏览器承载的真实 desktop UI 截图，用于 Pages 产品图绑定；它不冒充原生壳证据。
VERSIONAL-LANG-1 的真实 Tauri/WKWebView 放行来自两个独立 clean clone，详见
`../VERSIONAL-LANG-1/acceptance-45fb395/README.md` 与
`../VERSIONAL-LANG-1/reacceptance-b93796a/README.md`。前者发现 focus 门假绿并拒绝，后者在
修补后的 `b93796a` 上复验 mutation、321 条 desktop e2e 与真壳焦点后放行。

`capture.mjs` 是确定性重摄脚本；它只操作授权的 demo fixture 与既有交互，不写产品数据。

## P2-L21 焦点态补摄

2026-07-20 产品补报左上叠压后，03 帧从同一 1440×900 fixture 重摄；仅 Preview 首行消费既有
detached chrome 动态安全区，01／02 内容哈希不变。红证、后测几何与独立验收状态见
`../SKIN-R2-OVERFLOW-2/README.md`。Pages WebP 只能在该小批独立放行后再由本 PNG 重制。
