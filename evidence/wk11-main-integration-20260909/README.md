# WK11 与第四轮交接：main 合流复验

2026-09-09，Astra。输入 main `14ebd61877545ab71e20ce54a720d4e1e13c6b78`。先接收 Opus 实现 `644cc43`、Fable 复核 `3acff2d`，无冲突合流为 `f8643f81996aae5367853acb4306052e6c32ed4e`；再接收 Fable 文档 `19deb1e`，无冲突合流为 `54c0d2480124a5b54e24ddef66964a2db460bc38`。交付见 [WK11](../../engineering/mvp/execution/work-surface-kit/delivery-wk11.md)、[第四轮交接](../../engineering/mvp/execution/work-surface-kit/handoff-round4.md)。

没有集成产品代码修补。server/runtime/core/extensions、home-view、presentation-adapters 相对输入 main 无差异；无新增静态准入。原作者证据未覆写，本文脚本及结果为独立合流复跑。

## 验证分列

| 执行者 | 结果与边界 |
|---|---|
| Opus 作者 | 208/208、lint、contrast，RC 20/9/36，FE-T03/T04 手动实测，21张截图；见交付 §12–16 |
| Fable | 在实现 `644cc43` 独立208/208与lint、范围检查及三张截图目视；见交付 §17，不冒充浏览器独验 |
| Astra 合流复跑 | [208/208](tests.log)、[lint](lint.log)、[contrast](contrast.log)、[smoke](smoke.log)通过；以下浏览器验证通过 |

| 范围 | 结果 | 实际支持 |
|---|---|---|
| RC 契约 | [20/20](rc/runtime-ui-checks.json) | 新Settings入口、资源四维、来源、配置与缺席说明 |
| RC 反例 / FE-T04 | [9/9](rc/runtime-ui-counterexamples.json) | 两客户端revision冲突：单次失败、显式草稿、仅用户点击提交才重发；active Run冲突冻结全部提交控件、Run结束后解除冻结；继承、MCP lifecycle、断线、prompt仅草稿 |
| RC 视口 | [36/36](rc/runtime-ui-viewport.json) | 1440/390，浅/深/reduced motion，几何与键盘断言；不是实际200%浏览器缩放或用户视觉验收 |
| FE-T03 追加 | [4/4](fe-t03.json) | 从UI换profile；Requested exposure与Effective ceiling区分；历史binding字节不变且UI显示旧profile；恢复正常exposure后，session allow不能放宽user deny |
| MCP unknown | [3/3](mcp-unknown.json) | 合成loopback远端授权明确来源；回包丢失记录mcp_effect_unknown，只调用一次；刷新不重放 |

[RC总结果](rc/verify.log)。FE-T03脚本由Astra编写与执行，是对Opus产品代码的非作者验证；不是对该验证脚本的独立接受。FE-T04复用作者断言，由Astra在全新fixture复跑；不把同一9条再累加一遍。

## 复跑条件与脚本适配

隔离分支 `codex/wk11-integration`，两份全新仓外数据目录。主fixture端口8903、MCP 19044、RC CDP 19844；MCP unknown另用应用8905、CDP19846；FE-T03用主fixture、CDP19848。Chrome为每次新profile；全程local-fake/loopback，无真实provider、无个人凭据读取。

```sh
npm --prefix app ci
npm --prefix app test
node tools/lint-colors.mjs
node tools/contrast-report.mjs
npm --prefix app run smoke
# 分别启动独立进程；替换为两个新的仓外数据目录
MCP_PORT=19044 node evidence/wk11-main-integration-20260909/rc/mcp-fixture.mjs
npm --prefix app start -- --data-dir <rc-data> --port 8903
npm --prefix app start -- --data-dir <unknown-data> --port 8905
RC_PORT=8903 MCP_PORT=19044 node evidence/wk11-main-integration-20260909/rc/seed-fixture.mjs
RC_APP=http://127.0.0.1:8903/ RC_CDP_PORT=19844 RC_CHROME_DIR=<new-profile> node evidence/wk11-main-integration-20260909/rc/verify.mjs
RC_PORT=8903 node evidence/wk11-main-integration-20260909/rc/reset-fixture.mjs
APP_URL=http://127.0.0.1:8903 WK6_CDP_PORT=19848 node evidence/wk11-main-integration-20260909/fe-t03.mjs
RC_PORT=8905 MCP_PORT=19044 node evidence/wk11-main-integration-20260909/rc/seed-fixture.mjs
APP_URL=http://127.0.0.1:8905 WK6_CDP_PORT=19846 node evidence/wk11-main-integration-20260909/mcp-unknown.mjs
```

RC脚本复制自WK11，断言未改；reset仅将固定作者端口改为环境变量。MCP脚本与browser来自既有final-integration，增加点击已播种会话：旧脚本默认已有项目/活动会话，首跑在全新空目录等待项目超时；补播种与显式打开后3/3。FE-T03初版在HTTP创建Run后未刷新UI，绑定按钮尚未出现；补刷新等待。父deny探针另明确恢复正常exposure，防止profile ceiling遮蔽policy检查。这些为复跑harness修正，无产品修补。

## 接收与仍开项

- WK-98删除L2 Runtime面板裁定接收；导轨Runtime卡保留粗粒度事实，打开Settings。WK-87两项已实施。
- Explain permission裸`null`、深链bootstrap 401竞态按交接保留为FE-01首项。BE-13本轮MCP lifecycle未复现，保持条件性问题。
- FE-01 → FE-02 → FE-03 → FE-04串行，材质/动效后置。Chat恢复、Runtime入Developer、composer唯一L1锚点已裁定；当前代码尚未实施第四轮，不再将31vh写成待裁定。
- BE-1/3、12、14…20由既有后端台账维护；本次接收文档不等于完成后端接缝，也未启动新执行会话。Pages/README等FE-01词表后施工。
- current/roadmap采用Paper9.6；历史9.3引用保留，不重标历史验证。
- G1真实provider not_run；G2/G3独立产品验收与真实演示未闭合；G4/G5未施工。触控、读屏、真实IME、实际200%缩放、1024–1439中间档、桌面壳与用户视觉四轴未验；本次不宣称产品验收或发布。
