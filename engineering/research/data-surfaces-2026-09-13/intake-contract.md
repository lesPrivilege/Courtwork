# 第一片 · 保留上传、精确阅读与引用

Astra，基线4698e0e。归属RD-007 / LG-01 / RG-BE-01、03 / RG-FE-01、02。这里只处理用户主动上传的UTF-8文本，不猜官方导出格式、不读取任意目录。原件在本地Intake sidecar中，Runtime Session仅为获准读取范围；Core决定、Run产物与Runtime能力资源各自不变。

## 事实与持久化

- Intake schema1使用SQLite事务：source ID独立于hash；同Session同上传名称为同一来源、内容变化新增revision。同名不同Session是不同来源，不按hash合并。原件与manifest同事务保留，UTF-8原文不变换，完整SHA-256与字节数可核验。现HTTP请求/文本大小上限继续生效。
- 新资料不回扫旧工作区：旧文件仍按Current file读取。最新保留版本不声称工作区当前文件或正式采用版本；没有Core adoption关系就不显示“已采用”。没有来源名义上的Provider/账号事实，不补造。
- 保留与工作区写入分开。先持久保留，后写当前材料路径；失败保留pending回执。同commandId同payload可重试，对不同payload返回409；过期命令不得覆盖后续版本。expectedRevision用于新UI替换CAS，旧API调用保持兼容并由Host串行。成功回执重试不再次改写工作区。
- Intake DB在独立 `intake/` 下，与ArtifactHistory/Core store分离；依托现dataDir Host独占锁，SQLite schema未知拒绝打开。Runtime schema13不修改；旧Host不写该sidecar，当前工作区的改动不改保留历史。无自动GC、删除、跨Session授权继承或并行写权。

## 查询与呈现

Session存活和现Host令牌是本地应用准入，每个查询限制在URL的Session；不引入多账号/grant已实现的假象。来源reader要求sourceId+revision+sha256，错误scope/版本404，hash冲突拒绝，内容损坏/缺失显式不可读；绝不退回当前工作区路径。来源列表有界并报告coverage，不靠UI隐藏越权数据。

GET materials列来源/最新保留与revision列表；GET materials/file返回精确全文（上限1MiB）。POST materials兼容name/text，增加commandId与expectedRevision。用户选择旧版、刷新或返回不写状态。Quote包含Session/source/revision/hash和准确文本，仅写现草稿，不自动Send。

最近实现先例：`materials-view.mjs::createMaterialsView`、`inspector.mjs::createFileView`、`markdown-source.mjs::projectMarkdown`、`markdown-reader.mjs` 与 `chat-sources.mjs::quoteRecordedFile`。沿前端合同：原列表/原生details/既有overlay返回；工程标识进入Version details，缺件/冲突就地可见。不同版本有不同文档key，晚响应不得覆盖当前选中版本；非请求更新不切版本。

## 成熟机制与边界

SQLite提供事务与独立schema，使用Node内置公共 `DatabaseSync` / prepared statements，不自研WAL、并发提交或JSON数据库。最低运行时22.19.0已提供所用接口；该版node:sqlite仍标Active development，需同时记录实际运行版本和定向兼容证据，不冒称绑定API已稳定。来源：[Node22.19.0](https://nodejs.org/download/release/v22.19.0/docs/api/sqlite.html)、[SQLite事务](https://www.sqlite.org/transactional.html)、[外键](https://www.sqlite.org/foreignkeys.html)。现Core的SQLite机制仅参考其owner隔离与不可变版本，不复用其专业schema。无新npm依赖，升级触发为安全/接口兼容；退出可按精确manifest+原文字节导出，不能只留搜索摘要。

## 必测

同名r1/r2旧引用；不同Session同名/同hash拒串；空文/Unicode；重试/改payload/并发CAS；工作区写失败后保留及重启恢复；后续新版本阻止旧pending覆盖；删除Session停止新读取但不删除sidecar；缺失/损坏拒绝；关闭Host等待本片写入。UI旧版/Quote/重复重开/返回焦点/草稿与晚到隔离；390/1280/1440明暗、长文/空/失败。作者和非作者验证分列。
