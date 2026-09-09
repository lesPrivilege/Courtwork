# 验证协议 · 长期收益必须可证伪

接续 [SE continuity](../se-continuity-2026-09-08/README.md) 的T/S/E与强对照，不新造更弱raw-chat基线来取胜。原讨论建议的raw files + raw chat只是最低参照；生产候选必须与具有正常搜索、明确交接摘要和可用runtime compaction的强基线比较。

## 实验层次

| 层 | 输入 / 对照 | 结论上限 |
|---|---|---|
| B0 确定性符合性 | 合成目录、固定事件、source与policy版本；full rebuild对incremental | 只证明边界/实现符合，不证明模型质量或PMF |
| B1 索引消融 | 同一来源/任务：直接读；exact/lexical；typed结构；语义/agentic按需 | 测边际收益与预处理/维护成本，不把所有组合收益归因单组件 |
| B2 恢复与替换 | 同runtime新Session、无旧chat、producer缺席、cache缺席；随后单独换runtime | 每次只证明所替换轴，不能一个fake换件宣称全面可移植 |
| B3 Spark分层 | deterministic-only、强模型直做、cheap→strong verifier、cheap→独立oracle | false accept/遗漏/升级率与成本配对，含验证器盲区；失败允许取消cheap层 |
| B4 跨时间工作 | 至少一个主张校勘/整改任务，含来源更新、撤回、权限撤销、未决问题与迟到结果 | 合成时间线只能称跨事件；真实跨周后才能称长期采用证据 |
| B5 产品/学习 | 独立用户完成/修订/后来改判，弱commitment对照；经授权trace | 成果采用与maintenance成本，不据满意度或tokens单独宣称PMF/训练价值 |

任务先冻结输入与oracle，再实现策略。开发集与holdout按任务族/来源事件分开；同一材料改几个词不算独立holdout。控制模型版本、工具、授权范围、预算与任务顺序；缓存冷/热分开，计费缺失写unknown。随机化可行的运行顺序，记录失败/中断，样本少时列原始配对结果，不伪造显著性。

## 七项可拔除性测试

| 原T19不变量 | 最小实验与必须成立的断言 |
|---|---|
| 拔掉Pi工作仍完整 | 禁用producer/runtime，用独立reader读正式成果/来源/未决；不偷启动旧实现 |
| 换Codex无需迁移Matter | 先FakeRuntime符合性、后真实第二adapter；正式state schema不因vendor变化迁移；runtime自己的session不要求可转换 |
| 无CW GUI仍消费同Matter | 认证只读API/MCP返回同版本/权限结果；不可见对象不能靠另一surface探测 |
| 无模型资料仍有意义 | 关闭全部provider完成manifest/hash/diff/lexical及历史读取；不暗中用embedding调用 |
| Spark派生可重建 | 删除index/摘要缓存后从允许来源/正式候选重建，rebuild parity；唯一观察不能误删 |
| runtime session消失工作仍在 | 删除合成执行session或模拟不可访问，保留领域成果/义务/效力；不自动恢复被删runtime |
| context可重编无需完整chat | 用当前版本/refs/必要历史指针恢复任务；开放义务、冲突、撤回和unknown不能因压缩漏掉 |

它们是分阶段目标；当前源代码具备其中部分机制不等于七项已独立通过。ME-09在每个固定实现SHA登记具体结果。

## 指标与硬门

质量：来源定位准确率、错误旧版引用、撤回后复活、关键遗漏/污染、义务与冲突保留、成果被独立接受及实质修订/later reversal。安全边界：越权读取/提交、未核对effect重放、恢复后伪完成作为失败项，不能由平均分抵消。

成本：首次摄取/解析/索引/人工纠正，增量更新/失效/重建、每次检索/重读、input/output/cache tokens、实际账单、host latency、恢复定位时间、review时间、重复分析与维护工时。`C_total(N) = C_build + C_updates + C_rebuilds + Σ(C_run + C_review + C_correction) + C_maintenance`；分别列各项再看N次复用的摊销，不把隐藏离线成本当免费。

效益阈值在运行前由具体消费者冻结；本包不臆定普适百分比。必须先通过权限、effect、版本与关键遗漏门，再讨论成本降低。依现有Usage/telemetry区分估算与实测，host首输出不是provider TTFT，fake请求不证明缓存命中。runtime替换失败就收窄兼容声明；无长期净收益就删除派生层或缩任务范围。

## 指令、Attention与遗忘消融

- 比较native默认、最小CW规则、加Expert上下文、额外重复规则；看任务质量/工具正确性/成本，不以提示词长度取代结果。
- Attention比较所有event入队、确定性筛选、模型排序；测有意义事件漏报、无效通知、人类响应/恢复成本。通知少但漏关键事项同样失败。
- 故意将开放义务、unknown effect、后来撤回证据放进低频历史，再做compress/filter/archive；必须可重建正确当前状态，不能用“安全遗忘”解释漏项。
- trace仅记录可观察输入/调用/产物/修订/决定/后果与版本，不索取模型私有chain-of-thought。学习前先测试改工具/contract/context或换现成模型是否足够。

产物沿已有evidence约定：输入manifest/hash、固定代码/依赖、条件、原始结果、评估者及与作者关系、失败、局限、复现命令。来源性能数字、厂商博客与本地测量分列，作者测试不得署作独立接受。
