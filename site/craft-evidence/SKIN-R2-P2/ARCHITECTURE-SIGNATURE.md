# SKIN-R2 P2 · 架构签署投影

投影日期：2026-07-19 夜。签署落图基线：`main@ee0f288d481a3132a200c82b1cb19db705ea8517`。

## 正式签署

> P2-T01…T14 全签（保 C，产品追认在案）／P2-L01…L16 全签。

这项签署授权把上述唯一 target 投影进 `docs/design/r2-tier-ledger.json`，并按「缺行先红、
投影后转绿、四类反例定点红、零消费 diff 同哈希＋全态幀」闭环。T01…T09、T11、T13 与
L01…L16 的产品消费值保持不动，不得为制造 diff 重开已裁项。

### T12 复议门（全文）

未来重开 C/D 排印裁决，必须同时具备：

1. 模型外盲评；
2. 真实 Tauri WKWebView 对同一 fixture 的 12–13px 权威实测；
3. D 净胜预锁同分区，且可读性不回退。

本轮 C `86.5`、D `87.8` 的 `+1.3` 方向性优势不构成自动授权；文书轨朱雀仿宋仍为产品定讞。

## 2026-07-19 23:30 真机缺陷补遗

用户／架构在 Safari exact `1600×900`、scale `0.8` 真幀上追加指出：

> composer 溢出，左侧栏收敛有残余。

据此追加并签署两条中间档修正，仍只在既有 DOM、数据和行为内调整皮层：

- `P2-L17`：`apps/desktop/src/styles.css#.composer-stack|block-end`。composer 与免责声明完整留在
  对话工作面和 viewport 内，不遮挡、不截断、不制造页面级滚动。
- `P2-L18`：`apps/desktop/src/styles.css#.workspace.comparing.left-collapsed|grid`。比较态已经撤挂
  `CaseRail` 时，不得保留无语义的 48px 网格轨；对话与右工作面保留既有层级。

原始幀：`before/compare-1600x900-safari-overflow.png`；SHA-256
`b0af876805d505e0338fc9a080aa4ee20e2682f50faf59449591847eb157356d`。E01 空证据规则不受影响。

## 边界

本补遗不授权 schema、主题、字体值、动效、数据、写入路径或新交互；实现者不得验收自己。
