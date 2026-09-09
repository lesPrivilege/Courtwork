# FE-02修订：main合流复验与FE-03交接

2026-09-09，Astra。接单main `c529923f158f702bcdb8a2952e9fc245d906d212`，已包含BE-17/18后端探测及ES-00合同。FE-02基线为 `2b6c221`：初版 `38717bd`，移除本设备display name修订 `a82c192`，Fable复核头 `565d18c`。

先合 `claude/fe02-models`，无冲突合流为 `a9d1d15235a1da44fb60cf111079f744fe440332`；再合r4c `7026b09` 为 `2ab0193154c6231a8d20a067db9ba56964727b02`。后一步仅backend-requests末尾产生文档冲突：保留主线BE-17/18交付全文，并将新增BE-21/22接回第四轮表格。未修改产品代码、API、allowlist、依赖或作者证据。

入口：[FE-02交付](../../engineering/mvp/execution/work-surface-kit/delivery-fe02.md)、[WK-106/107](../../engineering/mvp/execution/work-surface-kit/intake-round-3.md)、[派单](../../engineering/mvp/execution/work-surface-kit/dispatch-round-4.md)、[后端台账](../../engineering/mvp/execution/work-surface-kit/backend-requests.md)。

## 验证分列

| 执行者 | 结果 |
|---|---|
| Opus初版作者 | 219/219、两项lint、contrast、smoke、Models16/16、composition16/16、FE-T03及RC；固定初版38717bd，不混为修订结果 |
| Opus修订作者 | a82c192移除连接别名设备状态后218/218、两项lint、smoke、Models16/16、FE-T03 5/5；作者README明确RC/composition/contrast/截图保留修订前结果，采用此较精确范围，不按交付§13末句声称修订后RC已重跑 |
| Fable非作者 | 初版与修订的范围/代码核对；修订218/218、两项lint、Models16/16、composition16/16；WK-107接受；修订后RC和FE-T03未独立重跑 |
| Astra合流非作者 | 组合节点2ab0193：[219/219](tests.log)、[lint-colors](lint-colors.log)、[lint-materials](lint-materials.log)、[contrast](contrast.log)、[smoke](smoke.log)与下表全部通过；无Astra产品补丁 |

组合全量219 = FE-02修订218 + 接单main已带的provider preview测试1；不是被删除的display name测试复活。`app/web`及本单测试中connectionNames/CONNECTION_NAME/rememberName/displayName/Display name无残留；server/runtime/core/domains/brand相对接单main差异为空。

| 浏览器套件 | 结果 | 支持范围 |
|---|---|---|
| Models/Tools五轮收敛 | [16/16](models-checks.json) | nav256、后端单一连接事实、无别名状态、三路径单tab stop、未接入两步无按钮、控件32/8px、窄屏无溢出 |
| Home/Work几何 | [16/16](composition-checks.json) | nav变更后Home中心0.56/输入96，Work输入88/无Home primitive，safe area及1440/390溢出检查 |
| FE-T03 | [5/5](counterexamples.json) | 草稿不冒充生效，Save改变默认而历史runtime.bound不变，改回local，active Run时保存被拒绝且不假排队 |
| RC契约 | [20/20](rc/runtime-ui-checks.json) | 新IA、来源/作用域/权限事实与目录读取 |
| RC反例 | [9/9](rc/runtime-ui-counterexamples.json) | stale revision保留草稿、active Run冻结、继承、MCP lifecycle、断线与prompt草稿 |
| RC视口 | [36/36](rc/runtime-ui-viewport.json) | 1440/390浅/深/reduced motion、逐组命中区/几何/键盘；采用FE-02 segment归属修订 |

[RC总结果](rc/verify.log)。Models与Home/Work截图由本次脚本生成；Astra目视Models 1440与390两张，不声称其余图逐张独验或用户视觉四轴接受。

## 环境与复跑

隔离分支 `codex/fe02-integration`，从接单main提交建立，未使用共享main中的未提交文件。三个全新仓外数据目录：main端口8921（rows fixture，保留waiting Run）、T03端口8922（failed fixture，无active Run）、RC端口8923；MCP19064；CDP19921/19922/19923/19924，各自独立Chrome profile。所有脚本逐字复制自FE-02 evidence目录，无断言改写；结果写本目录，未覆盖原作者文件。

```sh
npm --prefix app ci
npm --prefix app test
node tools/lint-colors.mjs
node tools/lint-materials.mjs
node tools/contrast-report.mjs
npm --prefix app run smoke
# 三个独立进程，分别指定新的仓外空目录
npm --prefix app start -- --data-dir <main-data> --port 8921
npm --prefix app start -- --data-dir <t03-data> --port 8922
npm --prefix app start -- --data-dir <rc-data> --port 8923
MCP_PORT=19064 node evidence/fe02-main-integration-20260909/rc/mcp-fixture.mjs
APP_URL=http://127.0.0.1:8921 node evidence/fe02-main-integration-20260909/seed.mjs
APP_URL=http://127.0.0.1:8922 WK13_STAGE=failed node evidence/fe02-main-integration-20260909/seed.mjs
APP_URL=http://127.0.0.1:8921 WK6_CDP_PORT=19921 node evidence/fe02-main-integration-20260909/models-checks.mjs
APP_URL=http://127.0.0.1:8921 WK6_CDP_PORT=19922 node evidence/fe02-main-integration-20260909/composition-checks.mjs
APP_URL=http://127.0.0.1:8922 FROZEN_APP_URL=http://127.0.0.1:8921 WK6_CDP_PORT=19923 node evidence/fe02-main-integration-20260909/counterexamples.mjs
RC_PORT=8923 MCP_PORT=19064 node evidence/fe02-main-integration-20260909/rc/seed-fixture.mjs
RC_APP=http://127.0.0.1:8923/ RC_CDP_PORT=19924 RC_CHROME_DIR=<new-profile> node evidence/fe02-main-integration-20260909/rc/verify.mjs
```

全程local-fake/loopback；FE-T03把默认值暂存为DeepSeek但不创建真实provider Run、不设置真实key，结束改回local；不读取个人凭据。重复RC先用RC_PORT=8923执行rc/reset-fixture.mjs。未运行付费provider。

## 接收与未闭合

- WK-106进入主线：Fable已非作者复核Astra补丁343e59b，读码、212/212及WK-98 10/10，FE-01补丁不再挂“待独验”。本次不把主线未提交的WK-98 JSON当成新证据来源。
- WK-107接受修订：单条真实连接、provider目录身份、compatible为目录身份换端点、删除设备display name、nav256、冻结错误原文。连接注册表/独立身份/display name归BE-21，MCP注册归BE-22。错误文案统一为FE-03后议题，尚未排期。
- 后端BE-17/18已在接单main交付，FE-02从旧基线出发尚未消费，Test/Fetch依然没有按钮；`CONNECTION_STEPS`中的“host has no handshake”及MCP同一handshake的旧说明须在后续消费中校正。不把UI未接线记录成后端未交付，不声称完整连接工作流完成。探测成功仍不证明key被验证、模型可推理或新模型可保存/执行；后者受现有allowlist与BE-21限制。
- 下一单按用户安排由Fable从最终main提交建立清洁工作树，以opus-wo-low派FE-03；FE-04用opus-wo-medium，FE-05后置。本次未代为创建执行会话。
- public-copy同步仍待；G1真实provider not_run，G2/G3真实演示与独立产品验收、G4/G5未闭合。真实触控、读屏、IME、200%浏览器缩放、1024–1439中间档、桌面壳与视觉四轴仍未验。

## 共享工作树现状

接单时共享Courtwork main已有 `evidence/fe01-main-integration-20260909/wk98-regression.json` 未提交修改，仅显示revision12→7，文件Git blob散列 `cfb2eea25da95b59140f96110f54ac6b4f73e6a8`。本次保留、不暂存、不还原；它不是本次合流内容。最终main提交可用于建立清洁工作树，但不能把共享目录称为完全干净。

FE-01工作树在接单时已不存在；FE-02工作树合流后在检查干净且提交已包含后删除，分支与提交保留。作者r4c工作树不在本次清理范围。
