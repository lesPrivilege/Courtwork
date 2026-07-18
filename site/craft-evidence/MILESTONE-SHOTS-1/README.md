# MILESTONE-SHOTS-1 · 真机冒烟版里程碑定格

日期：2026-07-18

应用来源：本隔离 worktree 的 `apps/desktop`，Vite `127.0.0.1:18882`

文章来源：`main@3909c4d`（`CONFIRM-GRANULARITY-1` 已合入）

浏览器画幅：`1440×900`，PNG 原始帧；站点裁片由同源 PNG 派生为 `1440×900` 与 `720×450` WebP。

## After：本版真应用帧

- `after/01-risklist-granular-quote.png`：RiskList 分级确认面；选中高危项，`查看引语` 展开，`确认此项` 单项入口可见，无批量确认条。
- `after/02-revision-redline.png`：修订预览；删除/插入 redline 同屏，仍由人工确认台账承接。
- `after/03-non-applied-acknowledgement.png`：未落格「确认知悉」流；已逐条提交与未能落文书的两处修订同时可见，并保留取消生成产物路径。
- `after/04-chat-context-party-graph.png`：chat 案语境开场与关系图谱产出；图谱显示节点、关系、依据与矛盾标记。
- `after/05-dossier-12-fail-closed.png`：卷宗侧栏下段；12 件合成材料中，第 11 件需文字识别、第 12 件不可转为可引用阅读视图，失败状态没有被隐藏。
- `after/06-workbench-first-screen.png`：完整工作台首屏；藏青主题、无弹层残留、批量入口收起后终版 UI。

以上帧都来自真实 desktop UI。合成卷宗与材料授权通过 DEV/E2E-only 的内存 host hook 注入，仅为稳定重现虚构数据和 fail-closed 画面；没有访问外部卷宗、生产凭证或网络服务。真实模型场景的原句→风险→修订→人工确认全链事实，以 `docs/status/pilot-2026-07-17.md` 为权威并在 site 文案中明确限定为「合成数据试点」，不把截图写成 product-live 证明。

## Before：上一版代表性帧

- `before/01-workbench-before.webp`：上一版完整工作台首屏。
- `before/02-batch-confirmation-before.webp`：上一版批量确认入口可见的 RiskList 帧；仅作变更对照。
- `before/03-chat-before.webp`：上一版 chat 局部。
- `before/04-confirmed-before.webp`：上一版确认后的工作台帧。

Before 只用于说明本单替换范围，不作为当前站点证据。旧版原始资产与历史验收目录仍保留在仓库历史中。

## Site 消费映射

- Hero：`10-milestone-workbench-{1440,720}.webp`
- 卷宗局部：`11-milestone-dossier-{1440,720}.webp`
- RiskList 局部：`12-milestone-risklist-{1440,720}.webp`
- redline 局部：`13-milestone-redline-{1440,720}.webp`
- `14-milestone-chat-graph-*` 与 `15-milestone-non-applied-*` 是本批证据资产，供后续证据复核，不新增首页第二个 Mac window。

## 复核边界

- 画面内「晨曦印务」等主体全部为虚构合成数据，属于预期内容。
- 本会话只替换 site 裁片与文案，不变更产品契约、schema、运行链或产品 live 状态。
- 本文记录实现证据；放行结论必须由独立验收会话写入 `site/ACCEPTANCE.md`。
