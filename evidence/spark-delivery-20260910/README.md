# Spark 整合修补 · 作者检查

来源为 `63840a7df22914e7a13cffcee0f646b8ded6ab9f`，组合主线为 `68b8d3d67d6b66d1a6c2c8d4f72ff7079135b662`，初次候选 `9761303`。静态准入冲突仅做并集：保留 `skin-policy.js` 并接入 Spark 两模块。

Astra 发现并修补：切换 project 后请求未决仍显示旧 scope 的可点击行；不拒绝与所选 project 不符的 `scopeRef`；失败重试丢失原 offset 与预期 snapshot；tab/过滤器重绘丢焦；点击 Work 路由时 Spark modal 未关闭。开始新读取消旧数据，复用完整失败查询，scope/snapshot 不符拒绝；焦点按既有控件身份恢复；调用宿主路由前关闭弹层。未增加后端参数、写 API 或持久化。组合 FE-05a 的 Shape lint 发现 Spark chip 使用游离 `999px`；改用同值的 `--radius-pill`，不改变几何。

[浏览器回归脚本](browser-regressions.mjs)用独立静态服务及 headless Chrome，导入真实产品模块、注入合成 request。固定原始候选 [0/6](browser-regressions-before.json)，修补后 [6/6](browser-regressions.json)；[原有单测](unit.log)38/38。这些为 Astra 作者检查，等待非作者 Luna 独立接受，不替代真实 BE-41 接线验证。原交付回执描述的是历史作者时点。

冻结 DTO 未定义 snapshot 查询参数；分页沿合同已定义的 project/limit/offset 查询，并在客户端保留预期 snapshot 拒绝不同快照。这不宣称服务器快照锁定或历史回读已实现。

从仓库根目录运行 `node evidence/spark-delivery-20260910/browser-regressions.mjs`。服务采用系统分配空闲端口，Chrome CDP 默认 20230，可用 `WK6_CDP_PORT` 覆盖。夹具仅在脚本注入，不进入运行产品数据源。

## Work 路由补修

非作者 Luna 在 `20d8330` 真实宿主验证中发现：选中绑定会话后 Work pane 仍隐藏（21 个浏览器检查中唯一失败）。`selectSession` 正确清除旧 surface，但 Spark 路由缺少后续激活。Astra 现在沿 `activateSurface("preview")` 打开既有 Work pane；异步查找或选择期间有新导航时取消旧激活，并在加载后重验所选 project/session/Matter binding。不创建会话、绑定或新 surface 类型。

[六项真实宿主函数定向测试](../../app/tests/spark-routing.test.mjs)控制异步导航/绑定变化/加载失败边界；[补前日志](routing-unit-before.log)保留反例，[补后与原有单测](routing-unit.log)44/44 通过。真实浏览器复验由非作者 Luna 另记；本段是补丁作者检查。
