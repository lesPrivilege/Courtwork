# Attention：本轮架构裁决

日期：2026-09-09。读取产品基线 `683b6d1419242bd08d20b7deec77ce12af7dcf12`，Paper `d78fd312955c1f594e59cbdcbb0d3074ac355940`。这是研究与 PR 准备裁决，不是实现接受或产品验收。

1. **对象边界**：Attention 的生命周期可独立于单个 Matter 和 Session；Matter 关系可为零到多。Attention 的个人关注事实需有明确 owner；Matter 事实继续由原领域/Core持有。产品扩展优先沿既有 Core 契约。独立 UI、缓存或常驻包装不能自行取得正式状态权。
2. **披露边界**：全量 memory 指在允许范围内可寻址，而非全量进入 context。registry 的存在性及描述本身也须受策略约束；已治理 schema 不等于向任何角色公开。先 typed/exact，再有界 grep/关系遍历，最后才按需要使用语义检索；这不是跨场景的性能定理。
3. **UI 分单**：Human Attention UI 消费当前事实和下一动作，不从 session finished 推导 resolved，不把 notification/read 当关注义务闭合。UI 草稿与数据契约分开，接入现有 FE 单 writer 队列，未交付后端能力不画作可用。
4. **Runtime 边界**：先用 Codex 手动 loop 观察稳定字段、披露和恢复；后续 provider/adapter 需逐项验证能力。Practice 可移植不等于任意 runtime 已兼容，不凭格式兼容宣称治理语义无损。
5. **论文处置**：优先 Index 登记候选观察及反例。现有对象/Contract 足以承载时，不给 Canonical 新增 ontology；后续 Practice 修订须有机制和证据。Paper 不接收产品工单或第二份当前状态表。
6. **局部消费**：外部项目和作者实践按具体机制入账，保留原始 URL、turn、核验层级和未检项。网页模型对成熟度、性能、搜索规模的说法不继承为本轮结果；自研前再核对精确实现版本、许可和失败边界。

## 手动实践的实际边界

独立 Attention Assistant 目录已建立，含 registry、单对象 state、追加事件、来源索引和手动步骤。私人数据保留本地且排除 Git；本轮没有读取邮箱当前状态、发送消息、创建自动化或实现产品 API。文件协议尚不提供事务 CAS 或技术强制 ACL。

Codex 提供的项目工具没有添加文件夹接口；电脑控制接口明确禁止操作 Codex 自身。因此本地目录已准备，应用侧栏注册需用户在 UI 添加目录，不以目录存在冒称已注册。

## 接收限度

Luna 分片分别编写产品接缝草稿、来源选型索引和 Paper 观察提案；Astra负责本页关键裁决与整合复读。各作者证据与非作者复核按实际范围记载，不把本文当产品独立验收。完整网页原文仅留个人项目私有资料，公开工程材料保留脱敏来源定位。
