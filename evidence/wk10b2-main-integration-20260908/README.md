# WK10b 第二段：main 合流复验

2026-09-08，Astra。输入 main `d879e2ff94d234120f902e15101c103943719e33`；接收 Opus 实现 `e118992486cd0a0c0e417a37ec29163a5974e0b2`、作者回执 `10f185a`、Fable 复核 `a60187e`（开工基线 `62556b7`）。无冲突合流提交 `bf44b8f1b0c75ebd7b794ea1c080449335e26fcc`，保留 main 的 SE 连续性文档提交。未修改产品代码；作者与 Fable 的历史交付字节保留。

## 分列证据

- 作者：178/178、lint、contrast、浏览器26/26 + 11/11、40张截图，见 [作者交付](../../engineering/mvp/execution/work-surface-kit/delivery-wk10b-2.md)。
- Fable：同页 §11，独立重跑178/178与lint，目视review / continue / receipt，WK-85裁定。
- Astra合流复验：[全量178/178](tests.log)、[smoke](smoke.log)、[lint](lint.log)、[contrast](contrast.log)；[浏览器26/26](checks.json) 与 [缺席/历史11/11](fallbacks.json)，日志 [checks](checks.log)、[fallbacks](fallbacks.log)。非作者执行，不冒充完整产品或视觉验收。
- FE-T06另一半：[授权与取消链](run-chain.json) 11/11。复用既有final-integration的9条浏览器主链，并增加两条针对性断言：对已存在目录 `out` 的写入先从卡片明确allow，随后真实rename失败，记录 `permission.resolved: allow` 与 `tool.result.isError: true`，没有Artifact；界面同时保留Write allowed与失败事实。点击Cancel后，服务事件顺序为stopping→cancelled，问答卡关闭。全量中的既有T-CANCEL-2亦通过，验证第一token等待中stopping可观察且不能伪造正常完成回答。

## 反例覆盖

| 项 | 合流复验 |
|---|---|
| FE-T06 决定 | 空reason不发送；回执丢失不晋升；同request_id重试只记录一条Decision；null回执不显示成功；旧base拒绝；active Run期间无动作 |
| FE-T06 授权/取消 | allow不保证工具成功、不代表成果accept；取消请求经历stopping，最终cancelled由服务记录确认 |
| FE-T08 | renderer缺席、producer卸载、domain schema不兼容分别注入；各保留正确身份/只读范围，恢复后只出packet枚举动作 |
| FE-T11 | 换源后旧候选锚点/引文不变；按冻结revision读取历史字节；producer卸载后仍能读取；修订不改写旧决定 |
| 续行 | 项目隔离、existingMatterId、跨Session原候选/决定可见；重复绑定拒绝；Release保留项目工作 |

## 复跑与夹具修订

独立工作树 `codex/wk10b2-integration`，服务器端口8894，全新独立合成数据。未使用作者8874或作者数据。先安装app依赖，再启动 `npm --prefix app start -- --data-dir <独立临时目录> --port 8894`。本目录seed/checks/fallbacks复制自作者，只有模块相对路径改为本目录位置；产物写入本目录，不覆盖作者证据。

顺序：设 `WK10B2_BASE=http://127.0.0.1:8894`，运行本目录 `seed.mjs` → `checks.mjs`（CDP19780）→ `fallbacks.mjs`（19782）→ `run-chain.mjs`（最终19792）。各浏览器使用新profile；`WK10B2_CDP_PORT`设置独立端口。fallbacks只暂移本集成树renderer，并在finally恢复。

授权补验夹具最初使用文件的子路径，实际在授权前ENOTDIR，不满足目标；改为写现有目录。随后修正旧脚本宽选择器（会命中历史授权的summary）为button，并将事件断言名称改为实际契约的permission.resolved。一次遗留pending Run导致下一次启动被拒，已通过产品cancel API关闭。以上属于夹具修订，未更改产品以迁就断言；最终完整复跑结果见run-chain.json。

## 接收与后续

WK-85按复核接收：受信renderer静态消费固定宿主kit；conflict唯一着色、unknown灰字。绑定面顺序归WK13，未在本次抢改。BE-14 Decision时刻、BE-15项目工作标题/最近决定时间已登记，未实现且不阻塞本段；不得由前端推造。WK13的adapter新增精确静态准入仍由Astra负责，Opus不改server写权。WK13工单已纠正旧基线/第一段之后的过时文字，按本次最终清洁main回执建树；前端串行WK13→WK12→WK11。

本次仅local-fake/真实HTTP与Chromium。真实provider、触控、VoiceOver/NVDA、完整多客户端竞态、法律专业可用性未验；未重拍40张作者图或主张视觉四轴通过。G1–G5、部署与对外发行均不因合流关闭。
