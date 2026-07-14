# Courtwork 文档库

本目录只存放**现行、可执行、互不重复**的项目文档。历史调研、工单、验收记录、会话记忆、设计探索与发布快照已经退出权威链；需要考古时以 Git 提交为主，以根目录 `archive/` 为辅。

## 阅读顺序

1. [产品定位](product/vision.md)：解决什么问题、为谁服务、什么不做。
2. [系统架构](architecture/system.md)：包边界、依赖方向、运行链路。
3. [架构原则](architecture/principles.md)：所有实现必须保持的不变量。
4. [Schema Engineering](architecture/schema-engineering.md)：模型、系统与人共同消费的契约方法。
5. [PM 垂类契约](product/pm-vertical.md)：第二垂类的包级边界。
6. [ADR 索引](decisions/README.md)：已经拍板的跨层契约。
7. [工程工作流](engineering/workflow.md)：角色、TDD、提交与验收纪律。
8. [发布手册](engineering/release.md)：全量门、制品校验、GitHub Release 与 Pages 真值切换。
9. [当前基线](status/current.md)：已完成、已知缺口、下一阶段。

设计实现另读 [设计系统](design/README.md)。各包的职责、公开 API 与验收记录仍以包内 `SPEC.md` / `ACCEPTANCE.md` 为准。

## 权威层级

出现冲突时按下列顺序裁定：

1. 可执行 schema、类型与机器门；
2. 根目录 `CLAUDE.md`；
3. `docs/decisions/` 中状态为 `Accepted` 的 ADR；
4. 包内 `SPEC.md`；
5. 本目录其他现行文档；
6. 提交史与 `archive/`。

低层材料不能覆盖高层契约。实现与文档不一致时，先标记漂移，再由架构角色决定改代码还是改文档。

## 文档体例

- 一份文档只承担一种职责；状态、决定和操作说明不混写。
- 跨层决定必须进入 ADR，不能只存在于 commit message、聊天或工单。
- 当前状态只写在 `status/current.md`，不在多处复制数字和阶段。
- 已完成工单的过程记录进入提交史；不再维护追加式“总工单册”。
- 调研结论只有被 ADR 吸收后才具约束力。
- 过时文档直接移入 `archive/`；现行文档与源码不得引用归档路径。

## 维护动作

新增或修改跨层契约时：

1. 新建 ADR 或修订既有 ADR，写明状态、上下文、决定、后果与来源提交；
2. 同步受影响的 schema、消费方与包内 SPEC；
3. 增加能触红的机器门；
4. 更新 `status/current.md`；
5. 由不同会话独立验收。
