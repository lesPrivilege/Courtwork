# 05 · Release 门、证据等级与放行矩阵

## 1. 当前结论

**本轮不签署产品 release 通过。** 这不是否定当前产品，而是本轮只有文档/源码有界审阅，没有真实 provider、GUI 或故障恢复的独立执行证据。仓库也仍把这些门列为开放。[R02](SOURCES.md#r02)[R03](SOURCES.md#r03)

审阅容器 Node 为 22.16.0，低于仓库要求的 22.19.0；git clone 还因 DNS 失败未取得运行 checkout。代码阅读通过 GitHub connector 完成。本轮未安装依赖、未执行 npm test/smoke、未启动用户 8804、未访问个人 key、未创建远端 PR/Release。历史“793/793”等只能指向原仓库回执，不能填进本轮 testResults。

包内脚本只验证交付文档与计划的完整性，不测试 CourtWork 产品。

## 2. 沿用 G1–G5，不另立低门槛

| 原门 | 最小通过证据 | 本轮新增的核对点 |
|---|---|---|
| G1 独立启动与真实运行 | 固定 clone/README/环境；用户 GUI 配置已授权 provider；至少一条真实模型/工具路径；失败/取消/重启可检查 | 配置“验证成功”不能替代工具任务；prepared/submitted 与实际调用分开；正确标示 runtime 与 model |
| G2 正式工作闭环 | 合成 Inbound NDA 输入/gold；绑定 source revision 的候选；人接受/退回/补证；Decision/Artifact 回执 | 模型不能接受自己；MCP/工具失败不隐藏未知效果；伪 actor、旧版本与重复请求必须拒绝 |
| G3 连续性与界面 | 新 Session 接手同一 Matter 的正式结果/依据/未决；主路径键盘和错误可理解 | 换 session 不等于同一 native 进程恢复；断线或 restart_unknown 不显示透明续跑；不因新 context 丢开放义务 |
| G4 可复现演示 | 原合同要求的 2–4 分钟闭环，合成/可公开来源，真实 UI 与成果可对照 | 不将 fixture、specimen 与真实 provider 画成同一证据；未决与失败不剪成成功 |
| G5 对外事实 | README/Pages/简历每项声称映射到同版本实现与证据，或明确源码等价 | 不声称完整四 Agent 调度、跨 Provider memory、任意 runtime 替换或原生桌面宿主已可用 |

以上来自现产品接受合同。[R14](SOURCES.md#r14) 所有门应对应同一产品基线，或记录产品路径 byte/commit 等价；网页 copy-only 更新不自动使所有先前测试失效，也不能覆盖实际产品变更。

## 3. 阶段接受与产品放行分开

P12-A = 本次第一列的独立工程接受。  
完整 P12 = 原通用能力范围在按本轮修订的实际卡片/测试矩阵下被独立接受。  
G1–G5 = 对外产品证据门。

三个结论需要明确对象，不互相代签。完整通用节点尚未接受时，可以继续准确的 experimental 发布面，但不能由 P12-A 得出“所有通用能力完备”。是否发布某项功能，按下面 capability-to-evidence 表判断，不按研究文档是否存在判断。

## 4. 声称触发的附加门

| 对外声称 | 必须额外具备 | 不满足时 |
|---|---|---|
| MCP 可用 | 锁定 SDK 目录完整/失效、结果保真、权限与 unknown settlement | 对应动作不可用或收窄到已验协议/能力，不 healthy 冒绿 |
| 可查看真实 Run 输入 | prepared/submitted/partial 证据及历史版本读取 | 只能显示当前配置，不命名为历史实际输入 |
| 普通偏好可关闭/遗忘 | P07 exact future injection；“隔离旧上下文”另需 P08 sentinel 证明 | 仅说关闭后续注入，不能声称 provider 已忘记 |
| web fetch | P09 网络授权/SSRF/限额/内容处理与版本回执 | 不显示可用按钮，不用偷偷发网代替 |
| Skill 可导入/Agent 可创建 | 文件导入 P10 或 BE-6/7 对应真实链；两者各自验收 | 只保留已有手动能力，不把 draft 当生效 |
| Runtime 可替换 | 同 Expert/同 Core 合同的真实第二 executor 证据 | 只说架构设计为可替换，不把 fake provider 算第二 runtime |
| 项目/目录可不预选 | BE-23 身份合同与 DWB 的实际实现各自成立 | 不能由 Core-free 推导普通 projectless Chat |
| 历史卸载/升级仍可读 | 固定版本数据和 renderer 缺席/升级失败/历史回读证据 | 沿原合同增加对应测试；不把 roadmap 当保证 |

## 5. 硬失败不能被平均分抵消

越权读取/外发/执行；模型获得正式接受权；同 request/command 重放造成重复效果；未知外部效果被清除或误重试；未持久准备就启动模型请求且无恢复依据；丢失已接受成果的确切版本；缺历史却伪造成功；旧 host 打开新 schema 数据；active writer 未停就释放 ownership。任一硬失败使相关能力保持禁用，不能以整体测试成功率补偿。

对输入与输出证据的权限也要测试：来源正文、附件、key 形文本与远端异常不能未经审查写入公开 evidence。合法数据保留和 UI 脱敏是不同动作。

## 6. 真实验证怎样消费现 8 项 prompts

直接沿现 `RUNTIME-VALIDATION.md`，不另造替代脚本。[R15](SOURCES.md#r15)

1/2 验普通消息与同 Chat 连续性；3/4 验精确文件写入批准、拒绝和 recorded version；5 检查实际 advertised/exposed 工具而非模型自报；6 必须在确有活动 Run 时停止；7 绑定合成 Work 来源产生候选，人的决定由实际 Review 操作完成；8 用实际产物做 UI 检查，不增加模型调用。

追加一条 G3 场景：在保留同一 Matter 的有效决定/来源/未决后，新建合法 Session 继续；不能只把同一个 Chat 的滚动历史当跨 Session 工作连续性证据。重启场景应检查 unknown 与待核对项，未经证明不自动重发外部工具。

输入失败就保存原 Run：连接/鉴权、模型未调用、宿主拒绝、工具错误与 UI 问题分开；不要用反复提示把失败覆盖成成功。调用上限与真实 provider 权限由用户已有授权或具体实验合同决定，本包没有发生付费消费。

## 7. 备份、迁移与回滚

迁移前确认全部 writers 停止，保存匹配版本的完整数据备份：RuntimeStore、原生 journal、control 配置、source/recorded artifact、Core 及必要的绑定引用。凭据只在用户本机安全备份流程中处理，不进入本包/Git。不能只备 SQLite 就声称完整恢复。

代码回退与数据回退必须成对：pure extraction 可回 façade；数据格式升级后旧 host 必须拒读，不能让新旧进程共用同一数据目录。故障恢复测试使用独立合成目录，保留原始坏现场，不修复 evidence 后再声称没有故障。

## 8. 统一回执结构

```json
{
  "codeCommit": "<actual full SHA>",
  "dependencyLockSha256": "<computed locally>",
  "platform": "<actual OS / Node / Python>",
  "scope": "<exact features and protocols>",
  "fixtureManifest": "<actual refs and hashes>",
  "author": "<implementation author>",
  "reviewer": "<different verifier or explicit missing>",
  "tests": [{"caseId": "<real case>", "status": "pass|fail|not-run|blocked", "rawEvidence": "<path>"}],
  "providerRuns": [],
  "knownFailures": [],
  "productGates": {"G1": "not-run", "G2": "not-run", "G3": "not-run", "G4": "not-run", "G5": "not-run"}
}
```

这是回执模板，不是已生成的产品证据。允许的“无发现”必须附覆盖范围，不能变成全仓无缺陷。
