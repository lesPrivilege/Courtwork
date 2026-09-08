# 候选同步与远端复现

2026-09-08，fresh Astra完成授权范围内的候选分支同步。未部署、未变更默认分支或legacy main。

- 目标：`https://github.com/lesPrivilege/Courtwork.git` 的 `codex/fresh-courtwork`。
- 首次非force推送：远端 `f8aff61` → `512ef14dbc621dcd034e384d27fed62824144771`；`git ls-remote`核对一致。
- 固定产品代码基线：`0a3b9b22f47f5605ccedc227106b0c17a4df6120`；后续为交接/证据文档。
- 独立远端浅克隆实际测试提交：`512ef14dbc621dcd034e384d27fed62824144771`。最初全历史clone下载较慢，主动停止其自有进程后另建空目录浅克隆；没有使用本地对象库、共享node_modules或原工作树数据。
- `source-manifest.json`全部45个文件SHA-256匹配。Node v25.9.0 / npm 11.12.1。

| 远端副本验证 | 结果 | 证据 |
|---|---|---|
| npm --prefix app ci | 277 packages；audit 0 vulnerabilities | remote-install.txt |
| npm --prefix app test | 146/146，0 failed/skipped | remote-tests.txt |
| npm --prefix app run smoke | material/tool/artifact、close/reopen、续跑/修订、历史字节通过 | remote-smoke.txt |
| npm --prefix app start | 全新仓外synthetic数据，独立19021端口；HTML/MJS/CSS均200且MIME正确 | remote-server.txt、remote-start.json |
| bootstrap | local-fake，realProvider=false | remote-start.json |
| 收尾 | 自有启动进程已停止，clone工作树干净 | remote-start.json |

可复现：在独立clone根运行 `python3 <联调证据目录>/remote-verify.py <仓外证据输出目录>`；脚本依次安装、测试、smoke和启动/关闭服务，不读取个人凭据。真实provider仍为not_run。

本回执提交仅新增复现脚本、日志并更新说明；不修改产品代码。推送后另以独立clone fetch核对最终HEAD，并以测试提交到回执提交的app/tests/brand无diff和45个hash再次确认源码等价。

本机既有fresh候选checkout仍保留原HEAD `b0173de`及其他writer未提交/未跟踪文件。试算本地快进会覆盖未跟踪copy-convention文档，故没有checkout、stash或reset该树。候选分支已从隔离集成树推到远端；之后应从远端固定提交新建工作树继续。原暂停轮工作树也原样保留。
