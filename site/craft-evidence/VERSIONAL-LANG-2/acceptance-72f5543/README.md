# VERSIONAL-LANG-2 · `72f5543` 独立验收

日期：2026-07-20（Asia/Singapore）
裁决：**✅ 放行**

## 对象与隔离

- 验收对象：`72f5543043f283e1048bd5bbaf8a8f36a6082049`。
- 全新 clone：`/tmp/courtwork-vl2-acceptance.AMyVc7/repo`；分支
  `codex/versional-lang-2-accept-72f5543`，验收前工作树 clean。
- Pages 运行态使用独立端口 `127.0.0.1:19851`；Agent 定向 e2e 使用独立端口
  `127.0.0.1:19852`，均未复用实现会话服务。
- 验收会话不改实现、契约或机器门；只写本报告与 `site/ACCEPTANCE.md` 放行记录。

## 裁决摘要

> **VERSIONAL-LANG-2 放行。** Pages 九个浅宗槽逐值绑定 `color.*`，OG 六槽同宗，站面 icon
> 使用 `color.text.primary` 的 `#232B38`；Hero 与四栏标题均真渲 Noto Serif SC 700。
> Pages evidence/work/scenario/marginalia 与 Agent document/draft/progress/paste-toggle 的已签
> routine 线均退场；composer focus、schema 主从/整组界、Settings 输入与未落点确认行为仍在。
> 1440×900 与 375×812 的 document/body 水平溢出均为 0。

## 四类真实反例

反例均直接改活动源文件，运行 `node site/scripts/assert-versional-language.mjs` 观察非零退出，随后
逐件精确复原；复原后实现文件 `git diff --exit-code` 且合同回绿。

| 注入 | 定点红 |
|---|---|
| `site/styles.css`：`--bg-app #F7F8FA → #F7F8FB` | `VL2-C01 Pages 浅宗色阶漂移：--bg-app` |
| `site/styles.css`：`h1.zh-title 700 → 400` | `VL2-T01 hero 标题未与四栏标题同用宋体 700 重端` |
| `site/styles.css`：`.evidence-step border-right 0 → 1px` | `VL2-L01 Pages 连续叙事的 routine 分隔线未完成二次减法` |
| `apps/desktop/src/styles.css`：`.document-preview header` 复活底线 | `VL2-L02 Agent 文书与进度面的 routine 分隔线未完成二次减法` |

合同基线及内置 mutation 测试最终为 **9/9**。

## 运行态与视觉复核

仓库自带 Playwright/Chromium runtime 在独立静态端口读取真实 computed style，并摄取视口帧；本
桌面会话的 Browser 插件发现列表为空，因此未把项目 harness 帧冒称为桌面内浏览器或 Safari
computer-use 证据。

| 项 | 1440×900 | 375×812 |
|---|---:|---:|
| `documentElement scrollWidth-clientWidth` | 0 | 0 |
| `body scrollWidth-clientWidth` | 0 | 0 |
| Hero 字族 / 字重 | Noto Serif SC / 700 | Noto Serif SC / 700 |
| 四栏 h3 字族 / 字重 | Noto Serif SC / 700 | Noto Serif SC / 700 |
| Hero 左右安全距 | 32px / 864.67px（文案自身宽） | 24px / 24px |

两个视口的 Pages computed 值一致：

- 九槽：`#F7F8FA / #F2F4F7 / #FFFFFF / #232B38 / #55617A / #637083 /
  #D5DAE3 / #C3CAD6 / #2563EB`。
- `.evidence-step` right、`.work-row` top、`.scenario-row` top、末行 bottom、marginalia top/bottom
  均为 `0px`。
- 1440 宽度下 `.promise-heading` 的旋转朱印产生 2px 局部绘制外伸，但 document/body 仍为零
  横向滚动，画面没有裁字或横向滚动条；这不是布局内容溢出。

OG `og.html` 六槽与浅宗一致；`site/assets/og.png` 为 1200×630，SHA-256
`a91c0120bb679c66e4c5f5dcb6ef2c9c1eb9a416b05d4bf716865e5c856fdc2a`，目视无深宗残留。
`site/assets/icon.svg` SHA-256
`65415a6d59824a9e605e9a56f427cc137fe0bd324a82e3622dbdfda45242747c`，四条均填
`#232B38`。

Agent 独立端口定向 e2e **6/6**：VERSIONAL-LANG 四项证明 composer focus、schema、标题轨与
Settings 输入边界；output-confirm 两项证明未落点修订必须逐条确认、取消时不生成产物。

## 完整门

| 门 | 本 clone 实跑 |
|---|---|
| `pnpm install --frozen-lockfile` | 14 projects / 1,047 packages，exit 0 |
| `pnpm site:guard` | **84/84**；报告 tip deslop 910 active files，exit 0 |
| `pnpm site:build` | exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm -r build` | 13/14 workspace；desktop 3,580 modules，exit 0 |
| `pnpm test`（构建后最终重跑） | **148 files / 1,261 tests**，exit 0 |
| Agent 定向 e2e | **6/6**，独立端口 19852，exit 0 |

首轮 `pnpm test` 与 fresh-clone `pnpm -r build` 并发时，workspace `dist` 尚未生成，出现包入口解析
失败（119 files / 926 tests 已先过）；同轮 build 完整成功。按依赖顺序在已构建的同一 clean clone
重跑后 148/148、1,261/1,261 全绿。此执行顺序事实保留，不把首轮环境前置红隐去，也不把它误判
为 VERSIONAL-LANG-2 源码缺陷。

## 范围边界

本放行只覆盖 `VL2-C01 / VL2-T01 / VL2-L01 / VL2-L02` 的参考浅宗、标题重端与二次减线；不
扩大为新主题、字体资产变更、schema 字段或 Agent 行为变更。未 push、未部署、未更新
`docs/status/current.md`。
