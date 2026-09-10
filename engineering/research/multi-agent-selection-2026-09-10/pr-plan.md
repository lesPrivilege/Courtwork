# Astra · 候选 PR 裁决与原编号映射

本页裁定施工方向，不是对未提供 diff 的远端 PR 作接受。没有指定现成 PR URL；本次形成可审阅的本地文档提交，不创建重复 MA 工单。正式施工前重读 main/合同/交付与并行 writer；各片单独固定文件写权。

| 来源 WO | 本次消费 ID / 裁决 | owner / 范围 | 前置、验收与退回 |
|---|---|---|---|
| MA-01 Runtime Contract | MAS-01：并入既有 MA/ME-05；先冻结生产 child 契约 | Astra：service/runtime/coordination owner，consult/delegate/handoff、identity、取消/恢复；Luna盘点 | MA2-D15 第二 Session/Run；明确持久intent与unknown，非自动spawn；错ID、权限扩大、迟到/重启/双终态反例。未通过留false；不迁移AgentHarness |
| MA-02 Event Reduction | MAS-02：在MAS-01之后补真实生产事件映射 | Astra 定事件/证据损失语义；Luna可实现冻结字段的确定性projection/绑定校验 | 区分可靠终态/结果与可丢progress；重复/乱序/背压后能从owner读取正确态；保留raw ref。没有消费者不建第二event store |
| MA-03 Explorer Profile | MAS-03：首个child纵切，受MAS-01/02约束 | Astra 写生命周期/上下文/模型判断密集实现；Luna可做固定profile、fixture与有界成熟适配 | fresh scoped refs、只读、工具/预算/depth上限、原文精确召回；主/子权限与撤权反例，退出/超时/未知明确。未跑真实路径不打开explore |
| MA-04 Agents Preview | MAS-04：现有MA2前端之上的增量，非重建Thread UI | Astra冻结owner投影；既有前端writer持写权，Luna仅可领无重叠明确片 | MAS-03有真实事实或明确标注fixture；activity→list/tree→inspect，统一Attention；无capability不画Resume/Close等可用控制。断流/旧态/等待不误成功 |
| MA-05 Explore Cluster | MAS-05：后置，一次性有界loop | Astra定义拆分/综合/停止规则；Luna执行可独立取证子题 | 单child基线先过；并发/预算硬限、取消传播、部分失败、父实际复用与总成本；无收益回串行。不新增常驻Orchestrator，不默认peer messaging |
| T03新增 MA-06 Mechanism Eval | MAS-06：并入ME-09与SE continuity | Astra定oracle、capability floor与因果归因；非作者独立留出，Luna可做确定性采集 | frozen paired baseline/holdout、质量/全生命周期成本；holdout泄漏即失效；不引用上游收益作CW验收 |

SoL-Pi ObservationPack/reducer 的存档与派生职责接 ME-01/03；恢复/compaction接ME-04、AM runtime生命周期；评测接ME-09。Action Fusion只有确定性局部序列且沿既有工具权限才值得独立试验，暂不新增agent。D1/D3/D4/D6/D7/D10/D11/D12/D14为优先研究标签，不独立新建九个PR；D2/D5/D8/D9/D13/D15保留索引、按证据重开。

每个实现PR交付必须给固定donor版本+路径、CW调用链、明确diff范围、反例与已知损失。Luna可读成熟来源、实现机械且有verifier的部分；当任务需要新owner、迁移、语义取舍、开放式综合或强模型判断时交Astra撰写。Astra作者代码须另有非作者有界复核，并明确接受范围；自测不改写为独验。
