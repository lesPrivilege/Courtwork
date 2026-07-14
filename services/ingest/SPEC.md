# SPEC: services/ingest（W3 spike → W8 v1）

状态：W3 spike 未开工（合成基线可先行，真实脱敏扫描锚点到位前不得结项）

## 职责

卷宗摄取管线（Python 独立服务）：扫描件卷宗文件夹 → OCR → 版面结构化 → 文书类型分类 → 跨文档实体对齐 → 输出符合 packages/schemas 的 CaseFile / Timeline / PartyGraph JSON。

## W3 spike（先行工单）

- 样本分两层：A. 可在仓库内复现的合成退化基线；B. 至少一份经授权、真实脱敏的扫描卷宗作外部锚点，覆盖印章遮挡、倾斜、手写批注中的实际形态。未脱敏原件不得进入仓库、CI、日志或模型请求。
- 对比：PaddleOCR-VL + PP-StructureV3（主候选）vs DeepSeek-OCR（备选）；baidu/Unlimited-OCR 仅观察记录，不做依赖
- 产出：spike 报告——主链路选型、手写批注现实策略（识别 or 标记转人工）、端到端耗时预估（目标口径：一套卷宗"午休之内"出时间线）。每项量化结论必须标明来自“合成”还是“真实锚定”；真实锚点到位前，印章遮挡召回率与手写批注策略只能记录倾向，不得宣称验收通过。

## W8 v1 要点

- HTTP API + 队列化批处理 + 进度事件流（右栏进度 UI 的数据源）
- 跨文档实体对齐是自研加固点（无现成开源方案）：同一当事人在起诉状/合同/流水中的不同写法归一，PartyGraph 节点的别名数组是承载结构
- 卷宗结构还原（卷内目录顺序、正卷副卷）同为自研加固点
- 用 schemas 导出的 JSON Schema 做输出校验；Python 类型不外泄

## 验收

W3：合成基线 + 至少一份真实脱敏扫描锚点 + 分来源量化数据；印章与手写两项必须有真实锚点证据。W8：spike 卷宗全量跑通；实体对齐准确率有基线数字；golden files 快照。

## 纪律

测试夹具一律脱敏，不得含真实当事人信息。

## TODO（跨层放入区）

- [W1 → W3/W8] `packages/schemas` 导出的 JSON Schema 位于 `packages/schemas/json-schema/*.schema.json`（`CaseFile.schema.json` / `Timeline.schema.json` / `PartyGraph.schema.json` 等，共 7 个文件），已提交进 git，可直接用 Python `jsonschema` 库加载做输出校验，无需装 Node 工具链。每个文件自包含（无跨文件 `$ref`），不需要额外的 schema resolver。生成命令：`pnpm --filter @courtwork/schemas run generate:json-schema`；这批文件是权威的、随 `packages/schemas` 包同步更新，ingest 侧只需在每次拉取新代码后确认这些文件是否有变更即可，不需要自己关心 zod 源码。**已知限制**：导出的 JSON Schema 只覆盖结构性校验（类型/必填/枚举/min-max），`SourceAnchor` 的两条跨字段规则（bbox/textRange 至少一个；bbox 存在时 page 必填）不在导出文件里——详见 `packages/schemas/SPEC.md` 验收记录。
- [架构拍板 2026-07-09] 上述两条跨字段规则在 **W8 的 Python 校验层必须等效实现**（列入 W8 验收标准），不是可选项：SourceAnchor 是全部可溯源交互的地基，ingest 是它最大的生产方，生产方校验弱于消费方契约会把脏锚点漏进全链路。
