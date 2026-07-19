# VERSIONAL-LANG-1 · 首轮独立验收（拒绝）

日期：2026-07-20。验收对象：`45fb39510902b7b7a99eb0792024328bc27672df`；父提交为
`01e74589285eab8c3db8564e41430f5a0bbe945c`。本会话从目标 SHA 建立全新 clone
`/tmp/courtwork-vl1-acceptance.gxZovW/repo`，使用分支 `codex/vl1-acceptance-45fb395` 和独立
端口 `19521–19522`、`19623`、`19536`；依赖由
`pnpm install --offline --frozen-lockfile` 安装。没有复用实现会话的服务、进程或结论，未改产品
实现、契约或机器门，未 push。

**裁决：❌ 拒绝 VERSIONAL-LANG-1。** 消费结果与绝大多数定点门成立，但签署行 `VL-L05`
要求保留的 composer `focus-within` 反馈缺少前向守卫：把活动
`.composer-shell:focus-within` 的 `border-color` 改为 `transparent` 后，完整 `pnpm site:guard`
仍为 **76/76**，独立端口 VERSIONAL-LANG e2e 仍为 **4/4**。这是已签强边界可被静默删除的契约
门缺口；依照实现／验收分离，本会话不替实现补门，也不以其余全绿覆盖该阻断。

## 1. 真实 mutation 结果

全部反例均直接修改 fresh clone 的活动文件，观察真实命令结果后逐件精确复位。最终实现树
`git diff --exit-code` 成立。

| 注入类别 | 结果 |
|---|---|
| 20 条 VL 档位账缺行 | `lint:skin-r2-ledger` 定点报 `已签提案行缺失：VL-A01` |
| VL 行错档 | 定点报 `VL-A01` tier 漂移 |
| VL 行重复 target／双绑定 | 定点报 target 漂移、唯一绑定缺失与双绑定 |
| 11 条 routine 线复活 | `lint:rule-grammar` 定点报未分类及 `VERSIONAL-LANG routine 线复活` |
| 旧 P1 活分类复活 | 定点报 P1 ledger／ruleClass 不一致及统计漂移 |
| 删除 composer 外框、preview 外框、台账组界、Settings 输入边界 | VERSIONAL-LANG 定点 e2e **3/4 红**，分别咬住 composer/preview、ledger、Settings |
| 删除 master/detail 主从线 | 与上项合并时未单独翻红；完整响应式矩阵仍覆盖该消费，非本轮唯一阻断 |
| 删除 composer `focus-within` 反馈 | **漏网：`site:guard` 76/76、VERSIONAL-LANG e2e 4/4 均绿** |
| schema 新增 `.risk-detail` 装饰线 | `lint:rule-grammar` 定点报未分类 |
| Pages proof 恢复竖格线 | `assert-versional-language` 定点红 |
| 删除刊记 `release-colophon` anchor | `assert-versional-language` 定点红 |
| 眉批恢复四边框 | `assert-versional-language` 定点红 |
| 写本 family 注入 `--sans` | `site:guard` 定点报 P5 字体间接槽扩散 |
| Pages 新增 raw color `#123456` | `site:guard` 定点报 raw-color 逃逸 |

强边界组合反例中 master/detail 在当前响应式声明仍有 bottom 线，因此单次组合只得到 3/4 红；这项
不冒称已获专门 mutation 证明。真正阻断是 focus 反馈：活动值被完整替换为透明后，静态与真渲
前向门都没有感知，无法满足签署的「输入与 focus 原样保留」。

## 2. 全尺寸、状态与双宗复核

完整 desktop e2e 在独立端口 `19623` 运行 **321/321 passed（3.0m）**。其真实 fixture 覆盖：

- `1180×720`、`1280×720`、`1440×900`、`1600×900` 及 `2400×1000`；
- 左栏折叠／窄栏、比较态、composer focus、Settings、真实 RiskList 主从面；
- P4 C-4 light/dark 双宗，SchemaParts 与数据面几何逐位相等、颜色随宗；
- reduced-motion、叠层残留、数据静止及既有交互 floor。

第一次尝试端口 `19523` 时，发现共享仓库已有外部 Vite 进程占用；本会话没有终止或复用它，改用
新的 `19623` 从本 clone 自起服务后完整重跑。上述 321 数字只来自后一轮。

## 3. 真实 Tauri WKWebView

fresh clone 自身编译并启动真实 `target/debug/courtwork-desktop`，连接独立 Vite `19536`；配置为
1600×900 CSS、DPR 2。macOS 26.5.2（25F84）处于 Dark，live CGWindow owner 为
`courtwork-desktop`、标题为 `VERSIONAL-LANG-1 · WKWebView authority frame`。新摄整扇原生窗口
[`tauri-wkwebview-1600x900.png`](tauri-wkwebview-1600x900.png) 为 3424×2024（含系统阴影），
SHA-256：`872230118791265b5fd3114eec475055b898e04417d4d62cb7579021a510725b`。

截图可见首行标题轨、左栏收敛后的单一外界、真实暗宗 composer 外框与输入区，未见 composer
横向溢出；交通灯、标题与内容列无碰撞。该帧只证明当前消费值在 WKWebView 的实机状态，不能替
缺失的 focus 前向守卫放行。截图后 Tauri 与独立 Vite 均已停止。

## 4. 独立全量门

| 门 | 结果 |
|---|---|
| `pnpm lint` | PASS |
| 根 `pnpm test` | PASS；**148 files / 1261 tests** |
| `pnpm -r build` | PASS；13 个具 build 脚本的 workspace 完成；desktop 仅既有 dynamic-import／chunk-size 提示 |
| `pnpm site:guard`（报告与截图加入后最终复跑） | PASS；**76/76** Node tests；deslop **900** 个现行文本文件 |
| `pnpm site:build` | PASS |
| VERSIONAL-LANG 定点 e2e，端口 `19521–19522` | baseline **4/4**；结构删除 3/4 红；focus 删除错误地仍 4/4 绿 |
| desktop 完整 e2e，端口 `19623` | PASS；**321/321（3.0m）** |
| Tauri WKWebView，端口 `19536` | PASS；fresh cargo build 后真实进程与 CGWindow 新摄 |

## 5. 最小复验要求

1. 为 `.composer-shell:focus-within` 建立机器可执行的获批消费断言：必须消费非透明、获批的 focus
   token；删除规则、改 `transparent`、错 token 均须定点红。
2. 真渲前向门在 composer 输入获得 focus 后，断言外框反馈与未聚焦态有可计算差异；不得只检查
   selector 文本存在。
3. 复位后重跑本报告的 focus mutation、全尺寸矩阵、完整 `site:guard`、321 floor 与真实 Tauri
   focus 帧；由新的独立会话验收修复 SHA。

本提交只追加拒绝报告与独立 WKWebView 截图。VERSIONAL-LANG-1 未放行，不能据此推进其后依赖的
终局 one-shot；P3/P4/P5 既有独立结论不被本报告改写。
