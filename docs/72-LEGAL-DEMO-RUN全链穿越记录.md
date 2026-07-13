# LEGAL-DEMO-RUN 全链穿越记录（2026-07-13，Fable @ Code）

章程：docs/55「LEGAL-DEMO-RUN 章程（备发）」三件——全链穿越 / 防过拟合隔离审计（用户点名）/ chat 侧对接 debug。本册是完工记录与证据索引；实现留痕分别落 core / legal / demo-data / desktop 四册 SPEC。

## 一、全链穿越（合成卷宗 → 带修订 Word，首次全程）

通道：`pnpm --filter @courtwork/core demo:legal`（src/acceptance/run-legal-demo.ts）。双档同管线：Scripted 档剧本回放（缺省，本次实跑档）；真 key 档 `COURTWORK_S3_REAL=DeepSeek DEEPSEEK_API_KEY=… pnpm --filter @courtwork/core demo:legal`（**留用户手动项**，key 不在本会话环境；真 key 档另强制 assert-no-demo-in-real 四断言）。

逐站目击（Scripted 档实跑，退出码 0；每站结构化记录随产物落 workDir/legal-demo-evidence.json）：

| 站 | 目击要点 |
| --- | --- |
| 1 材料 | 生成 PDF 原件 174,219 B（sha256 cdae2812…）+ 信用查询单 md + docx 修订孪生 2,926 B（sha256 4c67811e…）——三件同源自 main-contract.md 权威语料 |
| 2 ReadingView | PDF 判定 ok、2 页 2 块、textLayerVersion `reading-view-pdf@1+7756…/+d455…`；md 15 块 |
| 3 运行时装配 | legal 包 ABI 准入 → legal.S3；provider=demo-scripted-provider（接缝 wire 目击器包裹） |
| 4 组装+模型+铸锚 | 1 次 generate；六段标记物逐一在场（握手契约/场景声明/租户/续行投影/材料信封/输出通道）；8 风险 11 引语 **11/11 首过公证**（retryRounds 0，outOfCoverage 0）；逐锚复算零违规 |
| 5 门禁暂停 | todo 快照先行 + confirmation_requested，gateLabel=包声明原文「确认风险清单后再生成修订与批注文书」 |
| 6 门禁逐条 | 8 条逐项处置：7 确认 + risk-05 驳回（律师理由留痕），8 枚 RevisionEvent 全量入账 |
| 7 编译修订 | 7 指令（驳回项不编译），目标 设备采购合同.docx |
| 8 修订 docx | redline.docx 4,674 B：**6 条 applied**（word/comments.xml 6 枚批注 + 逐条 commentRangeStart 锚定、仿宋批注字体）+ **1 条 locator_not_found 诚实跳过**（risk-08 首依据出自信用查询单，不在合同 docx 里——"定位失败跳过不错插"纪律的保留展示位） |

事件骨架（15 事件，黄金锁定）：artifact_produced → todo_snapshot → confirmation_requested → confirmation_resolved → revision_recorded×8 → artifact_produced → todo_snapshot → scenario_completed。

常驻化：legal-demo-run.integration.test.ts 把八站/骨架/citationStats/处置矩阵/双跑指令集字节稳定锁成门禁；黄金对照任一不符 CLI 非零退出。

素材新增：demo-data `设备采购合同.docx`（scripts/generate-contract-docx.mjs，同源 main-contract.md，零 npm 依赖手写 OOXML）——补 S3_RISK_LIST_RESPONSE 注释里如实记录的旧缺口（主合同无 docx 形态，旧 W4.1 挂账），材料/修订目标/剧本首次同源。剧本+考点：legal `S3_PDF_DOSSIER_DRAFT` + `S3_PDF_PRELOADED_ANCHOR_QUOTES`（7 考点门槛 5，住包不住机器）。

## 二、防过拟合隔离审计（用户点名）

`packages/core/src/no-demo-in-harness.test.ts`，与 assert-no-demo-in-real **成对**：real 侧守"真跑里没有 demo"，本守卫守"机器里没有 demo"。

- 机器层（composition/acceptance 白名单外全部 src）**零 demo 素材指纹**：夹具文件名/样板案主体名/案号/装配点标识共 11 枚禁词，全库扫描零命中。
- **零 fixture 特调分支**：`(fileId|caseId|sessionId|artifactId) === '字面量'` 正则指纹零命中——机器对样板案走捷径的形态学关口。
- **golden 考点住 demo 包不住机器**：docx 档 + PDF 档 14 条考点引语，机器层零内嵌；考点在包侧存在性反向断言（防禁词表悬空）。
- **防空转**：扫描器植入样本自检 + 施工期真实变异 2/2 红（resolver 植入素材名、executor 植入 fileId 字面分支，均被咬后还原）。另：desktop 契约机器锁施工期首咬即中（录制 citationStats 手填 6，被 anchorCount=8 断言当场抓获）——守卫先咬实现者自己，非空转旁证。

## 三、chat 侧对接 debug（事件 → turn 卡调用链逐段核）

调用链：SessionEvent（录制/真跑同契约）→ protocol/client.projectSession（机械投影）→ App.tsx demo turn 段 → TurnCard 五类（event/artifact/file/gate/question）。逐段结论：

1. **citationStats 呈现（章程点名）**：投影层原样丢弃——已修（SessionProjection 纯增 + 续行重发保留），呈现于 artifact 卡摘要「引语公证 8/8」chip；UI 实拍确认。
2. **事件到卡不丢不错位**：artifact 卡标题/摘要原为硬编码字面量（"发现 6 项合同风险"/"47 个事件 · 14 个主体"）——已改投影派生（demo 兜底行为不变故呈现字节不变，真事件流下卡随事件取数）；S3 录制契约层（事件序/todo 步 id 与标签/gateLabel/citationStats）逐字段对齐包声明与 executor 语义，契约测试以 LEGAL_PACKAGE 为源机器锁定，防再漂移。progress 事件为演示旁白，注释明示分界（真 S3 首跑不发 progress）。
3. **思考流摘要来源**：ThinkingStream content = progress 事件序列原文（UI 实拍：Thought process 展开即录制 progress 消息）——来源正确；reasoningContent（Scripted 剧本已回携）到思考流的接线属 T-provider.1 挂账，本单不造新 UI。
4. UI 走查（dev server 实机）：五类卡齐列、gate 卡标签为声明原文、右侧修订预览批量/逐条/驳回/修正/确认全景、console 全程零错误告警。

**台账（移交，详见 desktop SPEC 同日节）**：①S1 录制事件序仍为演示节奏（越门禁产出），随 S1 真接线对齐；②session.todo 投影无 UI 消费方，归 docs/53 提案④ steps 载体化落地面；③锚点消费方契约判例——textRange 为块内坐标系（PDF 页内偏移跨页重叠），溯源面接真 PDF 必须按 textLayerVersion/page 选块（本次跑器复算器首跑即踩中，判例入 core SPEC）。

## 四、判例遵守与数字语境

- 验证命令一律单独执行、退出码亲验（假绿判例）；变异必红后还原；逐锚复算不采信 resolver 自述（luna 判例）；docx zip 级哈希不作断言对象（fflate 条目携时钟 mtime——B 阶段"安装包级哈希不可复现，用内容级校验"判例同族），确定性断言落在指令集字节与部件内容。
- **完工数字取 clean detached worktree 实测**（数字语境判例），见下节验收数字；共享树预检数字不入册。

## 五、clean worktree 验收数字（detached @ 完工 tip）

见本册末尾「验收数字」段——由干净 worktree 实测后填写（build 全包 / 包域测试 / desktop 测试 / demo:legal 退出码 / demo:s3 兼容回归）。

## 验收数字（clean detached worktree 实测，2026-07-13）

- （随提交后干净树实跑填写）
