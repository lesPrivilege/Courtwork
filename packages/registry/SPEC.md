# SPEC: packages/registry（W2）

状态：未开工（依赖 W1 schemas）

## 职责

场景注册表：场景以声明式定义存在，产品团队可不动 core 增改场景。

## 场景定义 schema

一个场景 = `{ id, 名称, 触发条件（文件类型/用户动作/分类器标签）, 输入 schema 引用, 工具集（packages/tools 的工具 id 列表）, 产出 schema 引用, UI 模板标识, 确认节点（哪些产出必须留人确认后才可继续）, 提示词模板引用 }`。

## 交付清单

- 场景定义的 schema 与校验
- 加载器：从 `scenarios/*.yaml`（或 json）加载、校验、注册
- 查询 API：按触发条件匹配场景、列出场景清单（UI 场景卡片的数据源）
- 内置 MVP 四场景声明文件：S1 卷宗阅卷、S2 矩阵审阅、S3 合同审查、S4 文书起草（提示词模板可先占位）

## 验收

四场景加载通过校验；缺字段/引用不存在的 schema/工具时报错清晰；触发匹配有单测。

## TODO（跨层放入区）

- [架构拍板 2026-07-09] S4（文书起草）当前不声明 `outputArtifacts`，`confirmationGates` 用 label-only 门禁过渡；真正的产物类型（`RevisionInstructionSet`）由 W4 在 `packages/schemas` 提案落地后，S4 声明需同步更新为引用该类型（详见 `packages/schemas/SPEC.md` TODO、`packages/output/SPEC.md` TODO）。
- [架构拍板 2026-07-09] S1（卷宗阅卷）当前 `outputArtifacts` 不含"供述/证据矛盾清单"，因为对应的 `ContradictionList` 产物类型待 W3 spike 结论后另行判断是否新增（详见 `packages/schemas/SPEC.md` TODO）。若新增，S1 声明需同步更新。
