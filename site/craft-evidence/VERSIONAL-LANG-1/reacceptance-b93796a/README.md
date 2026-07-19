# VERSIONAL-LANG-1 · `b93796a` 独立复验（放行）

日期：2026-07-20。复验对象：`b93796aca5110c4f349d9c0398710a38207741ea`，包含首轮拒绝
`c7c9210`、守卫实现 `b93796a`，并以 `45fb395` 为原消费实现。全新 clone：
`/tmp/courtwork-vl-reacceptance.VO5wt4/repo`；独立分支：
`codex/versional-lang-1-reaccept-b93796a`；独立端口：`19731–19733`、`19740–19741`。
依赖以 `pnpm install --frozen-lockfile` 安装（14 projects / 1,047 packages）。本会话未参与实现或
首轮验收，没有复用其 clone、服务、进程或结论；未改产品实现、契约或机器门，未 push。

**裁决：✅ 放行 VERSIONAL-LANG-1。** 首轮唯一阻断已经双向关闭：把活动
`.composer-shell:focus-within { border-color: var(--text-tertiary); }` 真改为 `transparent` 后，
定点 Node 门与完整 `site:guard` 均精确翻红；复原后真实 Chat 输入获得 focus，浏览器 computed
composer 外框色等于 computed `--text-tertiary` 且非透明。其余档位账、线级、结构、Pages、字体与
色值反例全部真实注入并红。`45fb395..b93796a` 对 desktop/site 消费 CSS 的 diff 为空，因此本轮只
解除守卫拒绝，不重新裁定消费值。

## 1. 首轮阻断的真实反例与正向证明

在活动 `apps/desktop/src/styles.css` 把 focus rule 的值改为 `transparent`：

- `node --test site/scripts/versional-language-contract.test.mjs`：exit 1，**4/5**，定点报
  `VL-L05 composer focus 强边界退场或色槽漂移`；
- 完整 `pnpm site:guard`：exit 1，**76/77**，同一契约测试精确失败；
- 精确复位后定点 Node **5/5**、完整 guard **77/77**。

独立端口 `19731` 的 VERSIONAL-LANG e2e 为 **4/4**。第一项先切到真实 Chat，确认
`composer-input` 可输入并实际 `.focus()`；随后同时读取 `.composer-shell` 的 computed
`borderTopColor` 与 DOM probe 消费 `--text-tertiary` 的 computed color，断言二者相等且不为
`rgba(0, 0, 0, 0)`。这不是 selector 或字面值存在性测试。

## 2. 代表性 mutation 复验

每项都直接修改 fresh clone 的活动源，运行实际门，观察失败后逐项精确复位；报告写入前产品树
`git diff --exit-code` 成立。

| 注入 | 实际结果 |
|---|---|
| 删除档位账 `VL-A01` | `lint:skin-r2-ledger` 定点报已签提案行缺失 |
| `VL-A02` 改错档 | 定点报 schema 行档位漂移 |
| `VL-A02` 与 `VL-A01` 复用 target | 定点报 target 非唯一、行漂移与缺失 |
| `.scene-strip` routine top 线复活 | `lint:rule-grammar` 同时报未分类与 VERSIONAL-LANG routine 复活 |
| 删除 composer／preview／ledger 组界／Settings input 边界 | 端口 `19732` 的四项 VL e2e **3 红 / 1 绿**；三条结构消费分别被咬住 |
| 单独删除响应式 master/detail bottom 主从线 | 端口 `19733` schema VL e2e **0/1**，`masterDetail` 0≠1 |
| schema `.risk-detail` 新装饰线 | `lint:rule-grammar` 定点报未分类 |
| Pages proof 恢复 routine 竖格线 | `assert-versional-language` 定点报 VL-P02 |
| 删除 `release-colophon` anchor | 定点报 VL-P03 |
| 眉批恢复四周卡框 | 定点报 VL-P04 |
| P5 写本 family 注入站面 `--sans` | deslop 定点报间接字体槽扩散 |
| `.wordmark` 新增 raw `#123456` | deslop 定点报 raw color／token consumer 漂移 |

复原后的线级门统计为 main 4、minor 98、retired 11、exempt 65、total 169；P1 迁移统计
89/11/2/11。`VL-A01…` 平铺账及 P1/VL 统计保持完整，没有以放宽统计换取通过。

## 3. 全尺寸、全状态与双宗

`COURTWORK_E2E_PORT=19740 pnpm --filter @courtwork/desktop test:e2e` 从本 clone 自起独立服务，完整
静态前链全绿，Playwright **321/321 passed（4.6m）**。实际 suite 覆盖：

- `1180×720`、`1280×720`、`1440×900`、`1600×900`、`2400×1000`；
- light/dark 双宗、左栏收敛／折叠、窄栏、比较态、composer focus、Settings、真实 RiskList；
- composer 不越对话列、全局横向溢出、SchemaParts／数据面双宗几何、reduced-motion、叠层残留与
  数据静止。

因此用户指出的「composer 溢出、左侧栏收敛有残余」不只靠单帧判断：相关尺寸、比较态、收栏态与
focus 态均进入同一 321 floor；本轮没有改消费 CSS，复验后未复现。

## 4. fresh-clone Tauri / WKWebView 真壳

本 clone 从空 cargo target 编译 398 个单元并启动真实
`apps/desktop/src-tauri/target/debug/courtwork-desktop`，连接独立 Vite `19741`。通过 native
Accessibility 点击 Chat 并聚焦真实 composer；截图瞬间 focused element 明确为
`AXTextArea / Message`，空值且可输入。live CGWindow owner 为 `courtwork-desktop`，标题为
`VERSIONAL-LANG-1 · reacceptance WKWebView`，CSS bounds 为 1600×900。

新摄 [`tauri-wkwebview-chat-focus-1600x900.png`](tauri-wkwebview-chat-focus-1600x900.png) 为
3424×2024 physical px（含系统阴影），SHA-256：
`bc5ac6f0f9c758f237732814fd7397f1a34ea4012d36f0a96fca813926b27c0d`。帧中 Chat composer
有可见 caret 与强边界，未越出对话测宽；左栏只有获批外界，没有收栏残线。系统为 macOS 26.5.2
（25F84）、Darwin 25.5.0 arm64，Tauri CLI 2.11.4。结构化运行记录见同目录 JSON；截图后
Tauri/Vite 已停止，端口释放。

## 5. 独立全量门

| 门 | 本 clone 实跑 |
|---|---|
| `pnpm lint` | PASS |
| 根 `pnpm test` | PASS；**148 files / 1,261 tests** |
| `pnpm -r build` | PASS；13/14 workspace 有 build 脚本；desktop 3,580 modules；仅既有 Vite 提示 |
| `pnpm site:guard` | PASS；**77/77**；产品树 deslop 900，报告 tip **901 active text files** |
| `pnpm site:build` | PASS |
| VERSIONAL-LANG e2e，端口 `19731` | PASS；**4/4**，含真实 Chat focus computed 断言 |
| desktop 完整 e2e，端口 `19740` | PASS；**321/321（4.6m）** |
| Tauri WKWebView，端口 `19741` | PASS；fresh cargo build、native AX focus、新摄 live CGWindow |

本提交只追加本轮放行报告与 fresh-clone 真壳证据，并在 desktop/site 两层 `ACCEPTANCE.md` 投影
结论；不修改实现、SPEC、机器门、消费 CSS 或产品契约。首轮 `c7c9210` 拒绝报告原样保留作为红证；
本节仅以 `b93796a` 的实际反例和全门结果解除该拒绝，放行范围止于 VERSIONAL-LANG-1，不替后续
终局 one-shot 作放行。
