# WK13 r2：main 合流复验

2026-09-08，Astra。输入main `7a906a181f3b4be66246d975f925413dfbf211a4`；接收Opus实现 `f1875ae`、r2 `6de394e`、Fable复核 `a271d95`，作者基线 `b7fa5e2`。Pro修复的九笔后续提交与本单文件无交集，合流 `fbb18f1f1d9418bf110b6e92dfc418a9362aa7a8` 无冲突。

唯一产品集成改动为 `5fe8b384d65faaecece22f2a5866bf326f96507f`：在server STATIC模块数组加入 `presentation-adapters.mjs`。路径精确对应 `/web/presentation-adapters.mjs`，类型为JavaScript；未扩大目录服务范围。

## 分列结果

| 执行者/范围 | 结果与证据 |
|---|---|
| Opus作者r2 | 185/185、lint、contrast、浏览器46/46与Home回归；[交付 §11](../../engineering/mvp/execution/work-surface-kit/delivery-wk13.md)。原始证据未覆写 |
| Fable复核 | 独立185/185与lint、server无差异、三态目视与WK-86裁定；同交付 §12 |
| Astra合流复跑 | [全量190/190](tests.log)，main原183项 + WK13新增7项；[smoke](smoke.log)、[lint](lint.log)、[contrast](contrast.log)通过 |
| Astra浏览器复跑 | [46/46](home-checks.json)，[日志](home-checks.log)；[空态4/4](home-states-empty.json)、[无绑定2/2](home-states-rows.json)、[截断2/2](home-states-truncate.json) |
| Astra既有Home回归 | 原断言未改：[rows几何4/4](regression/home-rows-geometry.json)、[empty几何4/4](regression/home-empty-geometry.json)、[Home行为7/7](regression/home-checks.log) |
| Astra静态准入作者验证 | [3/3](static.json)：模块200、JavaScript类型且响应逐字等于源码；嵌套后缀与.map均404。此一行server变更不声称由作者独立验收 |

## 本单反例

- FE-T01：空态确认0而非缺失；未绑定会话可读写且不叫空Matter；读取失败保留最后确认total并提供Retry，不能塌成0。
- FE-T02：指针与列表键盘抵达同一session；j/k/箭头移动，o打开或进入待处理卡，不代按allow/deny；composer输入不被拦截。
- FE-T12的Home范围：只显示Planned活动行，无热力图格子、无今日口径；服务端33项、页面30项时明确截断，tile仍读total=33。usage missing的下限措辞在inspector内，本次未重验，不将Home结果扩成该半条验收。
- WK-85：有工作时Continue existing在上；无工作时只显示Create new与条件句。
- 1440浅/深带高155 / 257 / 432；390保留2+1 tile与沉底composer。等效200%视口无横向溢出。

## 复跑条件

独立分支 `codex/wk13-integration`；端口8895 / 8896 / 8897对应rows / empty / truncate，各用新建仓外数据。CDP19800–19812，新profile。未用Opus端口和数据。安装尚未结束时第一次启动/测试遇到缺包，等待npm ci完成后重新启动并完整复跑；无依赖或lockfile改动。

1. `npm --prefix app ci`，再启动三个 `npm --prefix app start -- --data-dir <独立目录> --port <端口>`。
2. 各设 `APP_URL` 运行本目录 `configure-fixture.mjs`，仅配置仓库固定local-fake key，不读个人凭据。rows / truncate运行 `WK13_STAGE=<状态> node <本目录>/seed.mjs`，empty无项目/会话。
3. rows运行本目录home-checks；三态分别运行home-states，设APP_URL、WK13_STAGE和独立WK6_CDP_PORT。
4. regression/home-geometry设APP_URL、HOME_STAGE=rows或empty；最后在empty服务器运行regression/home-checks（该脚本使用WK6_BASE而非APP_URL）。

脚本复制自作者或既有final-integration，只有相对导入位置调整；所有输出落在本目录。断言未改。先运行empty几何，再运行会创建项目的既有Home行为回归。

## 接收边界与交接

WK-86按Fable已复核r2接收：WK-76的18vh留白退役，Continue集合可见名In progress，两个只读adapter签名入.d.ts。空态Home的WK-11 `clamp(96px,31vh,640px)`保持原样，等用户裁定；未因架构建议代替用户做视觉决定。

current与WK12工单更新到本次节点；WK12从最终清洁main回执SHA建树，随后WK11。新增模块静态路径仍交Astra，不准许前端直接改server。BE-14/15等既有后端请求未因本单实施。

全程local-fake、真实HTTP与Chromium；真实provider、触控、VoiceOver/NVDA、真实IME、浏览器自身200%缩放与1024–1439单独取样未检。截图已生成与几何断言通过，本次不宣称逐张视觉独验或用户四轴通过。产品G1–G5与发布门未关闭。
