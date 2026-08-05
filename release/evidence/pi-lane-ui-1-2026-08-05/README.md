# PI-LANE-UI-1 craft 证据（2026-08-05）

通用工作稿面（Draft）的全状态截图。**浅宗（刻本印页宗）为首轮 craft 主面**；
深宗（磁青宗）只做结构／对比／溢出烟测——同一脚本同一状态各摄一枚，用于比对同构。

- 摄制：`apps/desktop` dev server（`VITE_COURTWORK_E2E=1`），Chromium 1440×900 @1x。
- 宿主为 `browser-pi-lane` 的 scripted 樁（ADR-022 六-C harness 注入面）：账本形状的记录，
  没有真 sidecar／真模型／真落盘。截图证的是**界面对账本的投影**，不是产品运行事实。
- 朱砂稀缺律自证：逐枚看，只有 09／10／11／12 四态出现红；其余整屏无红。

| 文件 | 状态 | 字节 | SHA-256 |
|---|---|---|---|
| `01-empty-unbound-dark.png` | 空态·未绑定文件夹（诚实拦在开始之前）（深宗） | 58,958 | `18558c91454756610dd3df779e4bf00b02c9699b139bf8ddeafb60f0bb533633` |
| `01-empty-unbound.png` | 空态·未绑定文件夹（诚实拦在开始之前） | 60,325 | `db8549cae964c83f1b1a1a322ad891d62d4bdd99a3482af1abde453c1eb7feff` |
| `02-empty-bound-dark.png` | 空态·已绑定（指向第一动作）（深宗） | 44,665 | `5e00bbcc5e42f77b7260b130dae5eb0f4633baae2b88cf5e1735c4af72febcde` |
| `02-empty-bound.png` | 空态·已绑定（指向第一动作） | 45,233 | `d35cc96ff1913f170175c8d9b00634f8f6ff57d753ba019e7d00b4b205a47d84` |
| `03-composed-dark.png` | 已输入待发起（深宗） | 63,052 | `cf53abdf5a05dee22397799e844006d014a32acb39a2523d65f744982fd046af` |
| `03-composed.png` | 已输入待发起 | 63,599 | `5712aae63579e105c101abc94500d8f48faa52f951b1062dcf2f3214578e2c55` |
| `04-running-dark.png` | 运行中（工具卡在场）（深宗） | 91,575 | `64025153900e2e4f141341a9bd9336ca8a583408cd7ff36f0f071541871a43a2` |
| `04-running.png` | 运行中（工具卡在场） | 91,907 | `00b922ddc0b7dc822d3ab4fe9096b33c7c966ca28019e761ada6b7f169c52262` |
| `05-proposal-dark.png` | 待你决定：写入工作稿（逐次授权）（深宗） | 91,575 | `64025153900e2e4f141341a9bd9336ca8a583408cd7ff36f0f071541871a43a2` |
| `05-proposal.png` | 待你决定：写入工作稿（逐次授权） | 91,907 | `00b922ddc0b7dc822d3ab4fe9096b33c7c966ca28019e761ada6b7f169c52262` |
| `06-succeeded-dark.png` | 已新建工作稿＋本段索引（深宗） | 88,645 | `a9f56a88ced892181c45a4de4631f6ab9f12ec57ad1a3bbc3a44eb9d2d89523f` |
| `06-succeeded.png` | 已新建工作稿＋本段索引 | 88,959 | `91111c2a96a682ed37ecaebbcc6543f303e518dcc23082818296ac628be65a8f` |
| `07-viewer-dark.png` | 只读查看（当前 hash 与已确认一致）（深宗） | 103,178 | `519618c69a69e0ef3e758b9236bfc3343ee08e58f6e3d63309b960dfd74ecac6` |
| `07-viewer.png` | 只读查看（当前 hash 与已确认一致） | 102,947 | `81c101a923c22839b82b935ebecaa5bc31346c6581ac8e6b4748f6182191adfa` |
| `08-resume-prior-dark.png` | 另起一段后的上一段工作稿（只读）入口（深宗） | 48,685 | `bcfe1af465e380fec126a4b4ee4cf2ade4cf1d4e3c74965da34940553202ddb6` |
| `08-resume-prior.png` | 另起一段后的上一段工作稿（只读）入口 | 49,221 | `7ce6a44a5f52335998ce90cbec1abf255eba837a1d423223711587eb9cf748ef` |
| `09-denied-dark.png` | 已拒绝写入（索引不收）（深宗） | 82,909 | `1b74ff68c84450f8700e455072395edbeba3e3bad08d0d85af4b6b3063196625` |
| `09-denied.png` | 已拒绝写入（索引不收） | 83,571 | `f322bc3c1e6161a3111bbb0537c6b8b4f18d76c896de24747588040465c5a12c` |
| `10-failed-dark.png` | 未能写入（深宗） | 62,344 | `4899ac085c80d17e7943884081fa44148eabf43b64892a9d62501dc7e9c45f30` |
| `10-failed.png` | 未能写入 | 62,961 | `ab0880d93f1d3d7e5b57fe53be717758a1658b40e30f37b8220c004ff3cb4ea0` |
| `11-uncertain-dark.png` | 无法确认是否已写入（可核验，不补写）（深宗） | 71,809 | `2d93ce412cac00525b47910d656a28cb1815b05ba8ed1eb9bcbfdcaa1c730ac2` |
| `11-uncertain.png` | 无法确认是否已写入（可核验，不补写） | 72,553 | `2b5e6c780803123a51c0d6d6da63288a21b188453dddf5c6497b02be4fd2f566` |
| `12-fail-closed-dark.png` | 认不出的记录：整条会话显式失败（深宗） | 69,093 | `23a7a33153eecbdcfcf177401a557242270d11716cb6f3fab43bc9f5739bbeac` |
| `12-fail-closed.png` | 认不出的记录：整条会话显式失败 | 70,717 | `f50272c102f9889e7da23d8c2a04be2c6c728db566816221d3069c1ff5f6b15a` |
