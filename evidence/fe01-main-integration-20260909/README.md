# FE-01：main 合流复验与FE-02交接

2026-09-09，Astra。接单main `a431650b8c4726adc10905485aaadfdb1983689c`，工作树干净；交付基线为 `1688a7b`。先接收Opus交付 `bfefcd2`、Fable复核 `2694001`，无冲突合流为 `6bdc6db257245c0aba17d26e9986bdccd2cc36c2`；再接收Fable文档 `3eba008`，无冲突合流为 `ccc107615312bd0608315c9297edcf6e67b07cab`。保留main后继执行文件状态PR准备文档。

[FE-01交付](../../engineering/mvp/execution/work-surface-kit/delivery-fe01.md)、[WK-105及派单](../../engineering/mvp/execution/work-surface-kit/dispatch-round-4.md)、[下一单工单](../../engineering/mvp/execution/work-surface-kit/work-orders/WO-FE-round4.md)。server/runtime/core/domains/brand相对接单main无差异，无新静态准入或后端请求。

## 验证分列

| 执行者 | 范围 |
|---|---|
| Opus作者 | 212/212、两项lint、contrast、smoke，composition16/16、反例12/12、RC20/9/36；原证据在交付目录，未覆写 |
| Fable非作者复核 | 在 `bfefcd2` 重跑212/212、两项lint、contrast、smoke，范围核对与Home/Work/Settings截图目视；WK-105接受，不冒充浏览器独验 |
| Astra合流复跑 | [212/212](tests.log)、[lint-colors](lint-colors.log)、[lint-materials](lint-materials.log)、[contrast](contrast.log)、[smoke](smoke.log)，以下浏览器结果；另有两行Astra补丁，作者身份单列如下 |

| 浏览器范围 | 结果 | 支持边界 |
|---|---|---|
| Home/Work composition | [16/16](composition-checks.json) | Home中心0.56、输入96、measure820；Work输入88、无Home primitive；safe area和1440/390溢出等；同名截图已生成，Astra目视Home/Work两张 |
| FE-T02/T09/T10 | [12/12](counterexamples.json) | 多入口同Chat、Settings状态、单一连接入口；外观/字号/窄屏/reduced motion不改事实与动作；键盘、合成IME、dialog焦点、composer不被覆盖 |
| RC新版IA | [20/9/36](rc/verify.log) | [契约](rc/runtime-ui-checks.json)、[反例](rc/runtime-ui-counterexamples.json)、[视口](rc/runtime-ui-viewport.json)；入口Developer、根settings-sections、视口逐组测量；最终补丁后完整重跑 |
| WK-98追加 | [10/10](wk98-regression.json) | 九个Settings冷启动深链均无401；展开ws_write无裸null/undefined文本；真实HTTP与DOM，不模拟后端响应 |

composition与12条反例在合流 `ccc1076` 上跑；全量/两项lint/contrast/smoke、最终RC与WK-98在补丁 `343e59b` 产品字节上跑。补丁仅涉及Runtime资源展开面，不改变composition或前述12条反例路径。Astra对Opus代码的复跑与对自写补丁的作者验证不可混称独立产品验收。

## WK-98遗漏与集成补修

实际展开 `tool:ws_write` 仍出现 `Explain permissionnull`。FE-01在explanationBlock中增加了“评估缺effect”条件句，但截图中的空文本还来自另一路：sourceInspector未打开时返回null，resourceRow直接调用原生DOM append，浏览器将null转成文本。可选permissionDetail也有同样风险。

Astra补丁 `343e59b`：资源detail两处append改为过滤缺席的DOM片段，保留存在的节点；没有修改数据、权限算法、端点或全局DOM工具。[代码](../../app/web/runtime-view.mjs)。WK-98追加脚本在补丁前确实读到独立null文本节点，补后通过。**这两行是Astra作者代码，非作者复核待Fable补核；WK-105对2694001的接受不覆盖它。**

深链追加脚本初版连续Page.navigate只改hash，后八次属于页内导航，缺少新的bootstrap请求而报失败；并未观察到401。改为每组独立query触发完整加载后九组全过。这个修改只修测试的冷启动前提，未改产品或放宽断言。

## 独立环境与复跑

隔离分支 `codex/fe01-integration`；两份新仓外数据目录，composition/反例端口8911、RC端口8912、MCP19054；CDP19911/19913/19912/19914，使用独立Chrome profile。系统Chrome固定路径启动，无ENOENT或权限拒绝；不依赖桌面Browser pane。仅local-fake/loopback，无真实provider，无个人凭据读取。

脚本逐字复制自 `engineering/mvp/execution/work-surface-kit/evidence/fe01/`，包括新版rc子目录；不使用旧WK11 IA。WK-98脚本由Astra追加。原作者脚本与结果未改。

```sh
npm --prefix app ci
npm --prefix app test
node tools/lint-colors.mjs
node tools/lint-materials.mjs
node tools/contrast-report.mjs
npm --prefix app run smoke
# 各自独立进程；替换为两个新的仓外数据目录
npm --prefix app start -- --data-dir <main-data> --port 8911
npm --prefix app start -- --data-dir <rc-data> --port 8912
MCP_PORT=19054 node evidence/fe01-main-integration-20260909/rc/mcp-fixture.mjs
APP_URL=http://127.0.0.1:8911 node evidence/fe01-main-integration-20260909/seed.mjs
APP_URL=http://127.0.0.1:8911 WK6_CDP_PORT=19911 node evidence/fe01-main-integration-20260909/composition-checks.mjs
APP_URL=http://127.0.0.1:8911 WK6_CDP_PORT=19913 node evidence/fe01-main-integration-20260909/counterexamples.mjs
RC_PORT=8912 MCP_PORT=19054 node evidence/fe01-main-integration-20260909/rc/seed-fixture.mjs
RC_APP=http://127.0.0.1:8912/ RC_CDP_PORT=19912 RC_CHROME_DIR=<new-profile> node evidence/fe01-main-integration-20260909/rc/verify.mjs
APP_URL=http://127.0.0.1:8912 WK6_CDP_PORT=19914 node evidence/fe01-main-integration-20260909/wk98-regression.mjs
```

重跑RC前用RC_PORT=8912执行rc/reset-fixture.mjs；它会清掉反例产生的配置覆盖。复制的shots.mjs为复现入口，本次未重拍九组Settings截图；不把作者截图称为本次产物。

## WK-105与下一单

六项裁定接收：Home中心取55%下限；高度量输入本体；scope strip多处挂载单一scopeType；分隔线与对象边框分开；nav256延至FE-02第0项；侧栏脚保持工具条，账户身份不虚构。scope与权限事实不由布局裁定赋权。

Fable按用户安排以agent定义文件Low档派Opus FE-02，从本次最终清洁main节点建树；本次未代为启动。Fetch models/Test connection仍等BE-17/18，未交付前不画；FE-03 Low、FE-04 Medium、FE-05后置。后端前置继续由原台账维护。请Fable顺带非作者复核 `343e59b` 两行与WK-98追加证据。

public-copy尚有Session/Ask/Write/Read和历史媒体基线句，FE-01没有改该文件；先同步当前词表及媒体证据，再施工README/Pages，不因本次合流宣称发布面已就绪。G1真实provider not_run；G2/G3真实演示与独立产品验收、G4/G5均未闭合。真实触控、读屏、IME、200%缩放、1024–1439中间档和桌面壳未验；视觉四轴留用户。
