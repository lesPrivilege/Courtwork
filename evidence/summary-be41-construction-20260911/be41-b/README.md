# BE41-B · live Spark 接线

固定产品 `0cbbf7e`，输入独立前端节点901d5f9、后端兼容节点c71eb02，经f55ed6d接合；既有后端30fd470/4c2a56a未重写。Astra负责此片adapter/host语义与测试，BE41-A的测试作者Luna不是本片代码作者。来源Astra仍决定主线接收。

## 问题 → 来源 → 裁定 → 验证

| 问题 | 已核验本地来源 | 处置 | 验证 |
|---|---|---|---|
| 合法零版本、source文件回退被前端拒绝 | 4c2a56a Core/DTO、c71eb02兼容反例 | Matter/sourceVersion/FILE允许非负整数；replaced非负且两版本不同，不要求增长；source revision仍要求增长 | spark-live零版本、4→0、相同/负版本反例；Core合成HTTP |
| 空页无row导致丢token | 4c2a56a顶层snapshot合同 | 显式顶层64hex优先、与每row一致；允许beyondtotal空页，旧样本无top时仍用row或null | 有token空页一致、非法/混token拒绝、实际认证空项目 |
| 分页仅本地比较，服务端未获预期值 | 原spark-view load与Core snapshot_ref | 下一页传snapshotRef；409 derivations_snapshot_changed进入拒绝并Refresh，从offset0无旧token重读 | TinyDOM真实view请求序列、真实浏览器HTTP409→Refresh200→page200 |
| sample与live隔离 | SP-13及原generation/sampleGeneration | 保留404显式入口；有效live或非404失败清样本；新409同样清除 | sample→409、晚分页关闭/重开、旧场景/静态路径检查 |
| 权限/状态owner | BE41原service/Core、SP-11/12、RD005 | 不新增store/producer/agent工具，不将current计数当accepted，不接Attention恢复 | backend6+compat4重跑；最终组合独验另列 |

## 作者验证

`targeted-first.txt` 57/57，最终`targeted.txt` **77/77**（Spark adapter/view/live/samples/routing与BE41-A/B实际Core和HTTP）。固定产品全量 **736/736**，另存`full-tests.txt`。四项lint与smoke日志分别存放，未调用付费provider。

真实浏览器：CUA Chromium152，`serve.mjs`创建27个Matter version0、初始source FILE1；synthetic-00后续源版本4→0（source revision2→3），第一个下一页请求前由fixture修改页外synthetic-26。代理保持产品UI和DTO字节不注入，仅在合成Core调用既有replace_sources。`http-browser-log.jsonl`记录：第一页200；offset25携旧token409；Refresh offset0不携token200；offset25携新token200。屏幕从维护变化提示回到26–27 of27；390视口无页面横溢，图与AX保存。Core初始createMatter要求source1：初版fixture用source0被拒绝，已按合同改用1后replace0；不把它归因adapter或绕过Core合同。

真实host未创建Session或producer，零计数来自真实空candidate集，不是合成DTO。样本场景依旧是显式产品样本，测试桩不冒充真实工作覆盖。

## 范围与限制

这是后端消费与UI接线，不是Spark重建/恢复、ME03整体接受或真实provider覆盖。不会生成新Run或接受Artifact。真实147、forced-colors、原生Courtwork宿主、IME/软键盘/VoiceOver未测；SD-FIX旧200%证据不冒充本片新浏览器矩阵。最终非作者报告与作者结果分开。
