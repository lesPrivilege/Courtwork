# PR / commit 真实消费核账

2026-09-10，用户要求Luna fast explore。Luna只读refs、祖先与交付证据；根Astra核远端PR、产品差异及最新摘要/组合文档。固定main `312965f0b777fc14025752368ce6e162cc072249`，共享UI仍为`3a61336`且有他人未提交改动，不触碰。

## 固定事实表

| 项 | 固定交付/最新已读头 | 是否进入main | 实际消费与剩余门 |
|---|---|---|---|
| CI-B/F | code `0aca122`，receipt `525aed0` | 否 | 已被候选组合消费；作者两次691/691，根此前定向6/6，不是组合独验 |
| CS-01 × CI-B/F | `776ee4e`、`3b4212b`，组合头`68b3341` | 否 | 候选组合报告15/15、CS21/21、712/712；未独立产品接受。两行空态/WORK-3、summary修补门保留 |
| Summary | product `eff0e41`，review `2265649`，后续review文档`87a202f` | 否 | 条件通过；本次未找到可接收的D1/D2固定修补+非作者复验。`87a202f`只是指向Q裁定的文档，不是修复 |
| Q1–Q3接续 | `420370c` | 否 | 记录裁定与删除会话后服务端404探针，不能计为D1/D2修复或普遍权限撤销验证 |
| EX-IC2 | `c616933`、`80f39bf`；B在途 | 否 | 清点/工单进入候选组合，不是控件整改已实现；B specimen后C等固定基线 |
| BE-41 | code `30fd470`，receipt `4c2a56a` | 否 | 后端有界交付；688/691与串行13/13分列。前端version0/source回退、expected snapshot与空页token仍未接，不关闭真实Spark纵切 |
| Pro送审 | `d22eb66` | 是 | 送审输入已入main并推选定分支，不等于Pro结论被接受 |
| Pro上传 | `312965f`下`received/f1700fb0` | 归档是 | f1700fb0是ZIP哈希前缀，不是commit；24项/13卡结构已核，未逐项架构消费 |
| Pro后版 | ZIP声明`ab8c14cb…` | 未收到字节 | 这是ZIP哈希，不可用git对象存在性判断；316条/14卡完整包仍缺，不能混用前版P编号 |

最新组合证据用固定Git对象读取：`git show 68b3341:evidence/cs01-ci-bf-integration/README.md`；摘要独验用`git show 87a202f:evidence/summary-disclosure-20260910/independent-review/README.md`。这些路径并未进入main，不制造指向共享UI checkout的失效文件链接。旧`7a906a1`的Pro D1/D2属于另一轮，不是summary D1/D2。

## 远端与产品差异（根Astra）

`gh pr list --repo lesPrivilege/Courtwork --state all --limit 50`本次返回两条：[#1 benchmark](https://github.com/lesPrivilege/Courtwork/pull/1)、[#2 Pages](https://github.com/lesPrivilege/Courtwork/pull/2)，均OPEN；未见本轮Composer/CS/BE41/HPR对应远端PR。远端OPEN也不自动等于本地未消费，二者另核；本次不关闭这些PR。

`git diff a2b084d 312965f -- app docs tests`为空；该范围内近期main未新增产品代码，资料入账不能算Harness补全。差异检查不等于整仓独立测试。本次没有跑产品测试、浏览器或provider，也未创建/更新远端PR。

## 结论

下一步不是重新派同一套实现，而是先关闭summary D1/D2修补门并独立验组合，同时做Harness P00版本/合同清账。Pro包版本问题不会阻止普通源码核账，但阻止把未取得完整合同的P编号当成已冻结施工单。[下一轮准备](README.md)描述主题与准入门，唯一总顺序仍由roadmap拥有。
