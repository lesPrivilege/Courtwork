# Browser 候选施工顺序

研究完成不代表下表已派实施任务。Astra持合同/集成写权；Luna可以有界实现和非作者验证。前端、Core、RuntimeStore迁移不得并行争用现有owner。

| 单元 | 最小消费者与可能文件范围（未授权实施） | 完成证据/首反例/停止条件 |
| --- | --- | --- |
| BR-00 本轮研究 | 本目录；消化上游真实边界与AM/ES引用 | 固定source SHA、完整讨论、claim核验、限制与后续单；不称产品接入 |
| BR-01 离线adapter合同与执行隔离验证 | 新 `app/tests/browser-capability.test.mjs` / fixtures；如需模块，仅 `app/runtime/browser-adapter.mjs` 候选，由实际测试再定 | synthetic SDK事件/结果映射、身份去重、permission修改、missing usage、partial/final区别；真实执行环境反例证明Node fetch/文件/CDP不能绕过受限范围。没有该证明就停留fixture，不开放个人数据 |
| BR-02 首个有界browser纵切 | 受控无登录fixture站点，读取两个页面返回 `{title,sourceUrl,observationRef}`；新增可选adapter、已有service/tool/transport接缝需Astra串行授予精确写权 | 实际SDK/Pi+浏览器运行、固定request、timeout/cancel、恶意页面试图写/披露被实际拒绝、回包归原Run、close只释放owned资源；不能仅mock成功就升级真实网站 |
| BR-03 恢复/兼容/分发 | 若BR-02确有消费者，再接AM-B与AM-D/F；不另建ledger | SDK parent/JS worker各自SIGKILL，dispatch/ACK丢失、重复结果、变更来源/策略、卸载后只读；失败留unknown。若需Runtime schema改动，先迁移/备份/旧host拒绝合同 |

BR-01的mapping fixture与执行环境核验可分别交付，但fixture通过不关闭执行隔离门。首个真实浏览器验证不使用个人Chrome profile、Cloud账号或真实模型；固定脚本transport能验证工程调用链，不能证明真实模型的任务能力。Browser包保持可选，锁定tarball integrity/上游commit/许可后才纳入依赖，不先整体升级Pi。

## 与既有工作的分工

- AM-A/C：新增browser × driver × model/API × mode矩阵和最终wire基线；已经合流的AM-C三项仅本地fake通用host，不覆盖该SDK第二loop。
- AM-B：只有需要异步handle/get/wait时才接；目前尚无该能力，不将Promise/AsyncIterator当持久async。
- AM-D/F：非核心可选能力的激活/卸载/升级/替换与独立复现；不新增plugin platform。
- LG/ES：浏览器观察、下载材料及文件成果分别进入既有来源/Intake/接受路线；不把上游workspace或partial当正式Artifact；browser外部输入不能绕过ES fixed-basis coverage，可先摄入来源再另开固定依据Run。
- Attention：将来可请求受限浏览任务，但Attention对象未实施；本轮不提前建对象、schema或导航。
- FE：只有冻结DTO/身份/动作/trace覆盖之后才进入现有单writer队列；不因研究包添加可用按钮。

## 最低故障清单（全部待实施验证）

1. javascript工具内直接网络/文件/另建CDP连接，以及公开/暂停execute绕过域名和purchase hook：真实执行边界拒绝，否则unsupported。
2. cancel与页面POST成功竞争：保持实际/unknown外部结果，不重试；晚回包不入新Session。
3. checkpoint rename后IPC前崩溃、已发布后worker死，及parent也死：分别检验可恢复bytes和持久身份，不混用两种保证。
4. event queue溢出/journal截断/run_end写失败：明确coverage与warning，不制造完整trace。
5. 输出通过JSON schema但引文错误，或下载路径内容被替换：不形成Core接受；正式读取必须绑定不可变字节。
6. attached Chrome与created local/remote实例的close：只清理有权资源；Cloud创建回执丢失不重复provision。
7. SDK/driver缺席或升级后读旧history：不自动恢复heap/登录/动作，不隐式重放。
8. 主/子模型token都报告、一个缺失、重复终止回包：统计无双计，missing保留，费用软限制不伪装成硬限制。

回退：本轮仅文档commit，可revert无数据影响。未来adapter关闭新任务后仍需完成/取消/unknown结算；二进制、配置、数据与外部效果回退分别验证。
