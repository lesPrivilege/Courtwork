# SPEC: services/ingest（W3 spike → W8 v1）

状态：W3 spike 未开工（最高优先级，结论决定 S1 滩头假设是否成立）

## 职责

卷宗摄取管线（Python 独立服务）：扫描件卷宗文件夹 → OCR → 版面结构化 → 文书类型分类 → 跨文档实体对齐 → 输出符合 packages/schemas 的 CaseFile / Timeline / PartyGraph JSON。

## W3 spike（先行工单）

- 样本：3–5 套真实脱敏扫描卷宗，覆盖印章遮挡、倾斜、手写批注三类样张
- 对比：PaddleOCR-VL + PP-StructureV3（主候选）vs DeepSeek-OCR（备选）；baidu/Unlimited-OCR 仅观察记录，不做依赖
- 产出：spike 报告——主链路选型、手写批注现实策略（识别 or 标记转人工）、端到端耗时预估（目标口径：一套卷宗"午休之内"出时间线）

## W8 v1 要点

- HTTP API + 队列化批处理 + 进度事件流（右栏进度 UI 的数据源）
- 跨文档实体对齐是自研加固点（无现成开源方案）：同一当事人在起诉状/合同/流水中的不同写法归一，PartyGraph 节点的别名数组是承载结构
- 卷宗结构还原（卷内目录顺序、正卷副卷）同为自研加固点
- 用 schemas 导出的 JSON Schema 做输出校验；Python 类型不外泄

## 验收

W3：spike 报告 + 量化数据。W8：spike 卷宗全量跑通；实体对齐准确率有基线数字；golden files 快照。

## 纪律

测试夹具一律脱敏，不得含真实当事人信息。

## TODO（跨层放入区）

（空）
