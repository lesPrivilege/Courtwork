# CC-S 合流复验与CC-W交接

2026-09-09，Astra非作者复验。接单main `3af83ebd35a09b4d029a9b8ce6e9c1979b7f6c54`；先合CC-S `45625b2`为`85c4e73`，再合r4d固定头`66bd820`为`4fc3de24c0d431f6a6f72edac5117d9c69649035`。无冲突，无集成产品补丁、依赖或allowlist增量；server/runtime/core/domains/brand无差异。Attention研究和截图路线完整保留。

[交付§16](../../engineering/mvp/execution/work-surface-kit/delivery-cc-s.md)、[WK-116…121](../../engineering/mvp/execution/work-surface-kit/intake-round-3.md)、[下一轮工单](../../engineering/mvp/execution/work-surface-kit/work-orders/WO-CC-round5.md)。作者全套结果保持在evidence/cc-s；Fable的独验按§16分列，本页不冒充其执行者。

## 本轮结果

| 范围 | Astra组合产品字节上的结果 |
|---|---|
| 全量 | [244/244](tests.log) |
| lint/contrast/smoke | [colors](lint-colors.log)、[materials](lint-materials.log)、[contrast](contrast.log)、[smoke](smoke.log)通过 |
| Settings与Home/Work几何、安全区 | [32/32](composition-checks.json) |
| Models | [18/18](models-checks.json) |
| Chat/Work/Memory shell | [12/12](shell-checks.json) |
| compatible探测 | [8/8](probe-checks.json) |
| 第0项 | [4/4](cc-s-checks.json)：Unknown、Home/End、Home集合list与Chat Flow列表 |
| RC契约/反例/视口 | [20/20、9/9、36/36](rc/verify.log) |

脚本从evidence/cc-s逐字复制，使用环境变量切独立端口，无断言改写。作者改写的NAV-1、LIST_KEYS及WK-92扫描窗口已读码核对其契约依据；没有把原阈值放宽。Astra本轮未单独重跑FE-T01/03/06/07/11，作者完整回执仍按原SHA保留，不累加为本轮结果。

目视本轮settings-general-1440-light.png与settings-general-390-light.png：设置唯一导航成立、标题可见、分组和控件边界清楚。未做全面逐图视觉四轴验收；截图文件按脚本命名，其他套件可能覆盖同名Home/Work图，JSON断言分别保存。真实IME、读屏、触控、真实provider与产品G1–G5未关闭。

## 独立fixture与异常恢复

端口8951 main、8952 shell、8953 unknown、8954 RC；四个独立新仓外数据目录；MCP19084，CDP19961–19966，Chrome profile独立。全程local-fake/loopback，不读取个人凭据、不运行付费provider。

第0项先在8953播种三条已完成会话与等待授权的ws_write；核对该端口服务器PID76937，执行SIGKILL后用同一目录重启，宿主输出interrupted run恢复。脚本确认runStatuses=[unknown]，工具行和组头均Unknown；没有直接注入数据，也没有用优雅停机产生的cancelled冒充unknown。原输出见[播种](cc-s-seed.log)与[断言](cc-s-checks.log)。PID只记录本次执行，不用于复跑。

```sh
npm --prefix app ci
npm --prefix app test
node tools/lint-colors.mjs
node tools/lint-materials.mjs
node tools/contrast-report.mjs
npm --prefix app run smoke
# 每个端口独立新目录、独立进程，例如：
npm --prefix app start -- --data-dir <new-main-data> --port 8951
# 同理8952 shell、8953 unknown、8954 RC
APP_URL=http://127.0.0.1:8951 node evidence/cc-s-main-integration-20260909/seed.mjs
APP_URL=http://127.0.0.1:8951 WK6_CDP_PORT=19961 node evidence/cc-s-main-integration-20260909/composition-checks.mjs
APP_URL=http://127.0.0.1:8951 WK6_CDP_PORT=19962 node evidence/cc-s-main-integration-20260909/models-checks.mjs
APP_URL=http://127.0.0.1:8951 WK6_CDP_PORT=19966 node evidence/cc-s-main-integration-20260909/probe-checks.mjs
WK10B2_BASE=http://127.0.0.1:8952 node evidence/cc-s-main-integration-20260909/work-seed.mjs
APP_URL=http://127.0.0.1:8952 WK6_CDP_PORT=19963 node evidence/cc-s-main-integration-20260909/shell-checks.mjs
APP_URL=http://127.0.0.1:8953 node evidence/cc-s-main-integration-20260909/cc-s-seed.mjs
# lsof核对8953属于本fixture的server PID；kill -9 <该PID>，再以同目录/端口启动
APP_URL=http://127.0.0.1:8953 WK6_CDP_PORT=19964 node evidence/cc-s-main-integration-20260909/cc-s-checks.mjs
MCP_PORT=19084 node evidence/cc-s-main-integration-20260909/rc/mcp-fixture.mjs
RC_PORT=8954 MCP_PORT=19084 node evidence/cc-s-main-integration-20260909/rc/seed-fixture.mjs
RC_APP=http://127.0.0.1:8954/ RC_CDP_PORT=19965 RC_CHROME_DIR=<new-profile> node evidence/cc-s-main-integration-20260909/rc/verify.mjs
```

## 接收与下一节点

WK-121七项有界接受，M-12/M-13留后单；BE-33尚待。Settings Back顶带槽位在CC-W必须一并裁定，不回退安全区或返回focus。下一单Fable从最终main提交派CC-W Medium，本次不代派。

WK-120队列：CC-W → CC-D0-a → FE-05a → FE-05 → CC-I。FE-05a先约束、再两张变体及消融、用户比较后推广；本次未批准未生成的变体。ATT-FE-01按接缝真实交付进入。CC-S树核对干净且已合入后删除；r4d保留。共享main原WK98 JSON修改保持blob cfb2eea25da95b59140f96110f54ac6b4f73e6a8，不称共享目录干净。无push或部署。
