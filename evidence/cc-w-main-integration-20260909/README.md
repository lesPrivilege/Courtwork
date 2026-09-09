# CC-W 主线合流 · 2026-09-09

## 来源、边界与责任

从实际 `main@172130e8d0ba1e6642e967ac0c1e0938e221d4a8` 建隔离树，按用户指定次序合 `claude/cc-w-surface-tabs@67a6d8d`，再合 `claude/fable-round4d@c8d8ddb`，组合提交 `73ce524a4b4368b2b5fdd5a289ab5084b13f31f6`，无冲突。固定SHA之后的r4d在途研究未擅自合入。主线已有BE-1/3/25与BE-29及研究文档保留；没有后端、依赖、静态准入或schema修改。

原交付及Fable独验按 [CC-W作者证据](../cc-w/README.md)、[交付§16](../../engineering/mvp/execution/work-surface-kit/delivery-cc-w.md) 与WK-126接收。下面合流复验由Astra运行；新增产品补丁 `48693ad` 是Astra作者验证，仍待Fable非作者复核，不套用WK-126。

全部服务使用新建合成数据目录与独立端口8961…8969，CDP19981…19988；local-fake/loopback，无真实provider或账户。原作者 evidence/cc-w 保留原字节。共享目录既有 `evidence/fe01-main-integration-20260909/wk98-regression.json` 未提交改动保持不动。

## 合流补丁

1. **M-9短标签宽度**：原 `setRequestLabel` 仅预留静止词。默认字号Answer从69.73px变85.92px，Send从55.09px变85.92px，邻钮随之位移。现在静止词和Sending…分别由两个隐藏的CSS伪元素始终占同一grid格；保留按钮元素、单一真实文本子节点和显式可访问名。浏览器组件反例补前9/15，补后15/15，覆盖Answer、Send、Cancel run、Approve this write、Deny this write × 字号倍率1/1.25/2，检查宽度、邻钮位置、焦点与可访问名。它是生产CSS/函数的合成组件测试，不冒充完整发送流程或真机动效验证；产品Question/Approval在途另由primitive套件覆盖。
2. **Unknown词表**：`TAB_ACTIVITY.unknown` 从Failed校正为Unknown，符合ui-state-vocabulary。当前 `renderSurfaceTabActivity` 只传 `currentRun()` 的活动态，unknown/failed终态不可由这个调用到达；未观察到产品误读终态，也不宣称补丁使终态记号出现。

保留发现：composer初始化setAction创建图标，但renderComposer替换子节点，Send/Cancel run文字挤入icon-only圆形按钮；`172130e` 原有textContent赋值已存在同一问题。新 [用户截图10](../../engineering/design/attention-surface-2026-09-09/screenshots/10-codex-composer-stop.png) 支持后续固定主动作位置/保留停止方块的设计输入，详见 [输入说明](../../engineering/design/attention-surface-2026-09-09/README.md)。本单不改composer交互合同；须由Fable成后单，M-9补验不代表它已修复。

## 结果

| 检查 | 结果与位置 |
|---|---|
| 全量应用测试 | 263/263，`tests.log`；255作者基线 + 当前主线后端8项，补丁后复跑 |
| colors / materials / contrast / smoke | 两项lint通过、contrast76行通过、smoke通过，根目录对应log；realProvider:not_run |
| 布局 / 安全区 | 41/41，根目录为补前复验；`final-layout/composition-checks.json`为补后复跑 |
| CC-W文档tab / tooltip / activity行为 | 9/9，根目录补前；`final-behavior/cc-w-checks.json`补后 |
| FE-T07 | 8/8，`fe-t07.json`（组合提交73ce524） |
| Chat / Work / Memory shell | 12/12，`shell-checks.json`（组合提交73ce524） |
| Models / 探测 | 18/18、8/8，`settings/models-checks.json`、`settings/probe-checks.json`，补后 |
| FE-T01 | rows4/4、empty3/3，`settings/fe-t01-rows.json`、`empty/fe-t01-empty.json`，补后 |
| Primitive / Question / Approval | 11/11，`primitive/primitive-checks.json`，补后 |
| FE-T11历史来源 | 6/6，`history/fe-t11.json`，补后 |
| FE-T03配置冻结反例 | 5/5，`counterexamples/counterexamples.json`，补后 |
| 请求宽度补充 | 9/15→15/15，`request-width-before.json`与`request-width-after.json` |
| RC契约 / 反例 / 视口 | 20/20、9/9、36/36，`runtime/rc/*.json` 与 `runtime/verify.log`，补后 |

截图用于静态复核，不自评视觉接受。根目录composition截图是补前版本，补后截图在final-layout；headless不证明真机帧时间、Reduced transparency系统偏好或触屏体验。

## 复现与测试输入修正

按作者README运行根目录复制脚本时，各组需新数据；work-seed会在脚本旁写work-seed.json，shell与FE-T07不能共用这个输出文件并行播种。本次首次shell因该ID覆盖而超时，恢复shell-seed.log中的对应ID后12/12；没有改断言。

`run-regressions.py`负责后续独立分组，cwd为仓根；脚本副本仅把多一层目录对应的 `../../app/` import改为 `../../../app/`。首次history缺此调整而在import阶段退出，修正后新数据播种通过6/6。最初FE-T03第二fixture误传空WK13_STAGE，未生成等待run，4/5；保留 `counterexamples/*.invalid-fixture`，改为作者默认rows并从新数据重跑5/5。失败均是本次验证编排问题，不以改宽断言消除。

```sh
npm --prefix app ci
npm --prefix app test
node tools/lint-colors.mjs
node tools/lint-materials.mjs
node tools/contrast-report.mjs
npm --prefix app run smoke
python3 evidence/cc-w-main-integration-20260909/run-regressions.py
# 已启动独立合成服务时：
APP_URL=http://127.0.0.1:8961 WK6_CDP_PORT=19985 node evidence/cc-w-main-integration-20260909/request-width-checks.mjs
```

## 下一单

Fable从最终main回执提交新建清洁树派CC-D0-a（opus-wo-low），可先独立复核48693ad与上述15条补验。D0-a范围保持现有事实/模块外壳，不因后端Activity/Usage交付而自动并入D0-b。WK-122…127作为指定设计/契约输入合入；Visual Grammar/specimen、progressive blur真实设备性能都不宣称已实现或验收。M-14/M-15沿原后单，EX-CC5/CS1/GI1沿原任务；r4d树保留。无push、部署或G1–G5关闭。
