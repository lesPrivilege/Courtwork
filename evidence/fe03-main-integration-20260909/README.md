# FE-03：合流复验与FE-04交接

2026-09-09，Astra。接单main `386fbc65530d97b8f620fdd76141c8d4fa5967ef`；FE-03基线 `4d9714e`。Opus实现 `81390de`、交付 `fabfd22`、Fable复核 `f995778`，无冲突合流为 `6c77b54969c083a8b972dece9bebcaa8c3105d8d`；再合r4d固定提交 `00e33f9` 为 `f3d178571dd2bc50b6fc8d3869cda7e73f792922`。研究与设计包完整保留；不随r4d后续探索移动本次接收边界。

[交付](../../engineering/mvp/execution/work-surface-kit/delivery-fe03.md)、[WK-109/110](../../engineering/mvp/execution/work-surface-kit/intake-round-3.md)、[shell设计输入](../../engineering/design/clean-cool-2026-09-09/shell-refinement.md)、[后端台账](../../engineering/mvp/execution/work-surface-kit/backend-requests.md)。相对接单main，server/runtime/core/domains/brand无差异，无新增allowlist或依赖。

## 验证分列

| 执行者 | 范围 |
|---|---|
| Opus作者 | 228/228、两项lint、contrast、smoke、Models18、几何16、探测8、shell12、FE-T01 3+4、FE-T11 6、FE-T03 5、RC20/9/36；见原evidence/fe03，未覆写 |
| Fable非作者 | 在fabfd22重跑228/228、两项lint、contrast76项、Models18/18、几何16/16、探测8/8、shell12/12，七项裁定WK-109接受 |
| Astra合流 | [228/228](tests.log)、[两项lint](lint-colors.log)、[materials](lint-materials.log)、[contrast](contrast.log)、[smoke](smoke.log)，下表全部通过；新补丁4b6aef4为Astra作者验证，独立复核待Fable |

| 范围 | 结果 | 支持边界 |
|---|---|---|
| Models/Tools | [18/18](models-checks.json) | compatible恰好两个探测控件，空URL禁用；catalog/local无控件；原几何与操作约束 |
| composition | [16/16](composition-checks.json) | Home/Work当前合同、nav256、safe area、1440/390；不是WK-110新三面合同 |
| 探测 | [8/8](probe-checks.json) | ok/authentication_failed/unsupported原文；ID只显示；无key无Authorization，合成key只作Bearer；改地址清旧结果 |
| Chat/Work/Memory shell | [12/12](shell-checks.json) | 模式由binding得出、scope零控件、原Chat续Work保留id/project/history、Memory说明与窄屏 |
| FE-T01 | [空态3/3](fe-t01-empty.json)、[rows4/4](fe-t01-rows.json) | 确认0与读取失败区分、未绑定不误称空Matter |
| FE-T11 | [6/6](history/fe-t11.json) | 换源后旧候选/引文/冻结来源不变、决定幂等、旧base拒绝、producer卸载仍可读 |
| FE-T03 | [5/5](counterexamples.json) | 请求/生效/绑定值分开，默认改变不改历史，active Run拒绝保存不排队 |
| RC | [20/9/36](rc/verify.log) | 契约、冲突/冻结/MCP反例、逐组视口；补丁后完整重跑 |
| 延迟探测追加 | [补前0/3](probe-staleness-before.json)、[补后3/3](probe-staleness.json) | 地址/key/provider改动期间，旧响应不得重新成为当前表单结果 |

全量、lint、contrast、smoke、Models、探测、RC和追加回归在4b6aef4产品字节上跑；其余在f3d1785合流字节上跑。补丁仅改变探测结果失效控制，不修改shell、绑定、历史或geometry路径。截图由脚本生成，未做全面逐图视觉验收；composition与shell沿作者命名共用work-1440-light文件名，最终同名图按最后写入保留，不拿它替代各自JSON断言。视觉四轴留用户。

## 集成补丁与复核责任

`runProbe`等待HTTP返回时仍允许编辑输入。原代码只在input时清空结果，旧回包到达后会再次render，因而给新地址/key显示旧ok；provider变化还会清空key但没有清探测结果。延迟loopback已复现三种情况，前后JSON均保留。

Astra补丁 `4b6aef4`（settings-view.mjs，8增1删）：每次清空结果增加失效序号；请求记住自己的序号，成功与错误响应均仅在序号仍一致时显示；切路径或provider同样失效。继续复用原探测接口、单请求锁和保存流程，不注册模型、不持久新状态。

**该补丁由Astra撰写和验证，非作者复核待Fable；WK-109对f995778的接受不覆盖它。** 请在FE-04前补核本提交与probe-staleness脚本，原探测8条、Models18条和全量复跑支持正常路径未退化。

## 独立fixture与复跑

隔离分支codex/fe03-integration。全程local-fake/loopback，无真实provider或个人凭据读取；探测fixture使用临时端口和合成key。六份新仓外目录分别由服务端口8931（rows）、8932（empty/probe）、8933（shell）、8934（history）、8935（T03 failed）、8937（RC）持有；MCP19074。Chrome CDP19931–19939分开使用，profile独立。

脚本从evidence/fe03复制到本目录，断言未改。history下另存work-seed/fe-t11，只有work-seed导入路径多一层../；这是为了保留独立播种JSON。shell与FE-T11各自使用全新目录，互不沿用副作用。Astra只新增probe-staleness脚本。

```sh
npm --prefix app ci
npm --prefix app test
node tools/lint-colors.mjs
node tools/lint-materials.mjs
node tools/contrast-report.mjs
npm --prefix app run smoke
# 为每个端口启动独立进程与新的仓外目录，例如：
npm --prefix app start -- --data-dir <rows-data> --port 8931
# 同理启动8932/8933/8934/8935/8937，各用不同新目录
MCP_PORT=19074 node evidence/fe03-main-integration-20260909/rc/mcp-fixture.mjs
APP_URL=http://127.0.0.1:8931 node evidence/fe03-main-integration-20260909/seed.mjs
APP_URL=http://127.0.0.1:8931 WK6_CDP_PORT=19931 node evidence/fe03-main-integration-20260909/models-checks.mjs
APP_URL=http://127.0.0.1:8931 WK6_CDP_PORT=19932 node evidence/fe03-main-integration-20260909/composition-checks.mjs
APP_URL=http://127.0.0.1:8931 WK6_CDP_PORT=19933 T01_CASE=rows node evidence/fe03-main-integration-20260909/fe-t01.mjs
APP_URL=http://127.0.0.1:8932 WK6_CDP_PORT=19934 T01_CASE=empty node evidence/fe03-main-integration-20260909/fe-t01.mjs
APP_URL=http://127.0.0.1:8932 WK6_CDP_PORT=19935 node evidence/fe03-main-integration-20260909/probe-checks.mjs
WK10B2_BASE=http://127.0.0.1:8933 node evidence/fe03-main-integration-20260909/work-seed.mjs
APP_URL=http://127.0.0.1:8933 WK6_CDP_PORT=19936 node evidence/fe03-main-integration-20260909/shell-checks.mjs
WK10B2_BASE=http://127.0.0.1:8934 node evidence/fe03-main-integration-20260909/history/work-seed.mjs
APP_URL=http://127.0.0.1:8934 node evidence/fe03-main-integration-20260909/history/fe-t11.mjs
APP_URL=http://127.0.0.1:8935 WK13_STAGE=failed node evidence/fe03-main-integration-20260909/seed.mjs
APP_URL=http://127.0.0.1:8935 FROZEN_APP_URL=http://127.0.0.1:8931 WK6_CDP_PORT=19937 node evidence/fe03-main-integration-20260909/counterexamples.mjs
RC_PORT=8937 MCP_PORT=19074 node evidence/fe03-main-integration-20260909/rc/seed-fixture.mjs
RC_APP=http://127.0.0.1:8937/ RC_CDP_PORT=19938 RC_CHROME_DIR=<new-profile> node evidence/fe03-main-integration-20260909/rc/verify.mjs
APP_URL=http://127.0.0.1:8932 WK6_CDP_PORT=19939 node evidence/fe03-main-integration-20260909/probe-staleness.mjs
```

## 下一节点

WK-109有界接收：BE-17/18前端消费成立；无项目Chat创建仍缺projectId可选契约（BE-23），Memory/Temporary chat无能力控件（BE-19/20），任意连接/模型保存执行与MCP注册仍待BE-21/22；探测ok不能升级为key验证/推理可用/已配置。错误文案统一仍未排期。

WK-110采纳四条设计方向，brand只用已有包；Settings及折叠态安全区补CC-S，三面宽度策略与tab identity先探后裁，模块Home为可选布局而非替换简洁Home。队列FE-04（opus-wo-medium）→CC-S→CC-W→CC-D0→FE-05。EX-CC1/2据用户回执已派，本次不接收未裁定报告、不代为派新任务。

共享main原有WK-98 JSON未提交修改继续原样保留（blob cfb2eea25da95b59140f96110f54ac6b4f73e6a8）；从最终main提交可建清洁树，不称共享目录完全干净。FE-01树早已不存在；FE-03合流后核对干净再删除，保留分支。r4d及其探索工作树不清理。

public-copy与G1–G5仍开；真实provider、触控、读屏、真实IME、200%缩放、中间档、桌面壳和视觉四轴不借合成复跑关闭。
