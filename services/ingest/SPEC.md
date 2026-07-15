# SPEC: services/ingest（W3 spike → W8 v1）

状态：W3 spike 未开工（合成基线可先行，真实脱敏扫描锚点到位前不得结项）

## 职责

卷宗摄取管线（Python 独立服务）：扫描件卷宗文件夹 → OCR → 版面结构化 → 文书类型分类 → 跨文档实体对齐 → 输出符合 Legal 垂类 JSON Schema 的 CaseFile / Timeline / PartyGraph JSON。三类 schema 位于 `packages/legal/json-schema/`，不在 `packages/schemas/json-schema/`。

## W3 spike（先行工单）

- 样本分两层：A. 可在仓库内复现的合成退化基线，只允许仓库自行创作的虚构语料或许可条款明确覆盖本用途的素材；B. 至少一份经授权、真实脱敏的扫描卷宗作外部锚点，覆盖印章遮挡、倾斜、手写批注中的实际形态。未脱敏原件不得进入仓库、CI、日志或模型请求。
- 真实锚点必须另存授权/许可引用、脱敏复核人和日期、允许用途/期限/主体范围，以及“原件、可识别衍生物与路径均未入仓”的证明。公开可访问、裁判文书已隐名或搜索引擎可下载都不等于可商用、可再分发或可送入模型。
- 对比：PaddleOCR-VL + PP-StructureV3（主候选）vs DeepSeek-OCR（备选）；baidu/Unlimited-OCR 仅观察记录，不做依赖
- 产出：spike 报告——主链路选型、手写批注现实策略（识别 or 标记转人工）、端到端耗时预估（目标口径：一套卷宗"午休之内"出时间线）。每项量化结论必须标明来自“合成”还是“真实锚定”；真实锚点到位前，印章遮挡召回率与手写批注策略只能记录倾向，不得宣称验收通过。

## W8 v1 要点

- HTTP API + 队列化批处理 + 进度事件流是目标形态；当前尚无版本化 request/response/error/progress wire，未立契约前不得让 desktop 或第二宿主按临时 JSON 接入
- 跨文档实体对齐是自研加固点（无现成开源方案）：同一当事人在起诉状/合同/流水中的不同写法归一，PartyGraph 节点的别名数组是承载结构
- 卷宗结构还原（卷内目录顺序、正卷副卷）同为自研加固点
- 用 Legal package 导出的 JSON Schema 做完整 artifact 输出校验，并等效补齐公共 SourceAnchor 跨字段规则；Python 类型不外泄

## 验收

W3：合成基线 + 至少一份真实脱敏扫描锚点 + 分来源量化数据；印章与手写两项必须有真实锚点证据。W8：spike 卷宗全量跑通；实体对齐准确率有基线数字；golden files 快照。

## 纪律

测试夹具一律使用仓库虚构语料或许可明确的素材；“脱敏”只是隐私条件，不自动取得版权、商业使用、再分发或模型处理授权。真实锚点原则上留在仓库外，按 W3 证据清单证明其存在与用途边界。

## TODO（跨层放入区）

- [Legal → W3/W8] `CaseFile.schema.json`、`Timeline.schema.json` 与 `PartyGraph.schema.json` 的现行导出位于 `packages/legal/json-schema/`，由 `@courtwork/legal` 的 schema drift 门维护；ingest 必须加载 Legal 包的版本化导出，不能从 `packages/schemas/json-schema/` 猜同名文件。公共 `SourceAnchor` 类型仍来自 schemas，但 Legal artifact 的完整结构权威属于 Legal package。**已知限制**：JSON Schema 主要覆盖结构性校验；`SourceAnchor` 的跨字段规则仍须以 packages/schemas 的现行契约核对，不能只依赖 Python `jsonschema` 默认行为。
- [架构拍板 2026-07-09] 上述两条跨字段规则在 **W8 的 Python 校验层必须等效实现**（列入 W8 验收标准），不是可选项：SourceAnchor 是全部可溯源交互的地基，ingest 是它最大的生产方，生产方校验弱于消费方契约会把脏锚点漏进全链路。
