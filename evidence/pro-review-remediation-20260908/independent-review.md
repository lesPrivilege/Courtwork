# D1/D2 有界独立复核与合流回执

2026-09-08。以下是Astra依据Luna独立消息和原始日志整理的回执；实现作者不代替Luna宣称独立接受。

## 非作者复核

Luna复核D1观察映射、预设角色、全检查点评分与普通S；[评分测试](luna-d1-tests.log) 7/7组，runner E/S 12/12。其后[生产focused/extension复核](luna-d2-focused.log) 12/12，包含分页读取、Context与HTTP续行。独立只读SQLite观察器补充后，Luna复跑事务SIGKILL两窗口2/2，并核对成果、Matter、decision、audit、receipt；未发现本轮D2生产阻断。

Luna确实发现三项评分问题，并非一次全绿即接受：raw与normalized脱钩、角色由adapter自报，以及[receipt错误指纹仍通过](luna-d1-receipt-gap.log)。前两项在`427226d`修复；最后一项在`55930a8`修复。Luna逐项核对E的Core._decision_hash与S的standard.py实际请求编码，确认预设payload匹配；对E/S都将raw指纹改为64个零、重新签trace并重建观察，两者均仅在receipt_payload_binding被拒绝，见[最终关闭探针](luna-d1-receipt-closed.log)。最终回复：P2在已声明D1协议范围关闭；grader 7/7、runner 12/12。Luna未修改代码。

## 作者运行与合流

- receipt修复后的[最终D1结果](d1-final.json)、[先落盘计划](d1-final.attempts.json)、[journal](d1-final.journal.jsonl)：12个计划、12个完成、12个通过；[评分与反例测试](d1-receipt-tests.log) 7/7组。精确Git/source哈希与运行状态以报告为准。
- 归档前发现主线已有WK10b第二段`b7fa5e27d013886250c04af07dc40523bd8bd67f`，在隔离分支无冲突合流，合流SHA `c444db653f0addf0d7b258f548f2f387be44e6d1`。保留UI交付与current原有更新，没有checkout/reset共享工作树。
- 在该合流SHA运行[应用全量回归](merged-tests.log)：183/183；[runtime smoke](merged-smoke.log)通过。此前179/179是生产修复提交的历史范围，不重标、不累加。此次合流没有新增生产代码修改。

D1/D2的本轮有界工程复核完成；未运行真实provider、法律质量、真人接管或完整live HTTP host SIGKILL矩阵。B0仍是同一memo族的开发符合性测试，S/E同过不能推出SE优势。后续D3须先冻结实际差异、独立任务与收益/成本界限。
