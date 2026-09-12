# 04 · 实施片、依赖与 Spark / Attention 首个场景

以下 A–F 是本增量的局部阅读标签，不抢占仓库 RD/DEC/BE 编号，也不是 GitHub PR 号。均 proposed-not-created。实际落位按 P00 和现 owner 裁定，工程状态只回填 current。

## 1. 与 v2 主线关系

```text
原主线：Pi + DeepSeek GUI ──► Runtime 替换 ──► Work 小闭环

本增量：A 接入/资料合同 ──► B 离线投影 ──► C 受治理读取 ──► D 官方只读 bridge
            └──────────► E 容器 spike（独立、可退）              │
                                                               ▼
                                                 F Spark / Attention 资料场景
```

F 使用已接受的必要 Runtime 能力和现 Work 合同；不要求所有 Runtime 都已接好，也不越过 v2 的 Work 产品验收。第一条 GUI 主线不等待 Chat 容器，不因本增量重排在途 writer。

## 2. A · 冻结最小 source / channel / authority 合同

**消费入口：** 既有 Chat Broker/薄能力、BE-19/20/23、RD-007、LG-01/02、DS/BG。

**产出：** 来源与目的通道分开的 channel registry；用两个 synthetic 来源冻结 identity/revision/coverage、collection/ref、grant 和 delivery evidence。选择实际官方导出样本必须由用户明确提供，并保存 sample provenance 与敏感范围，不扫描账号/机器凭据。

**非目标：** 新桌面框架、新 memory 引擎、新 Core schema。只预留现 owner 消费字段，不把所有未来 object 类型一次实现。

**接受：** 账户/来源/正文哈希分离；read authorization ≠ local retention ≠ formal acceptance；审定“Chat 不开放 coding 功能”能在后端能力表落实。发布分发政策未确认不能登记 approved。

## 3. B · 离线导入与 Conversation Projection

**消费入口：** LG-01、RG-BE-01/02/03；Chat 身份沿 BE-23，临时模式沿 BE-20。

**范围：** 官方导出文件/主动提供片段 → 预览 → 明确选择 → raw/projection → 稳定引用。先一个导入器成立，再增加第二 Provider；不把两个来源的 synthetic schema 冒充官方格式。

**GUI：** 复用已有资料列表/来源 Inspector；显示来源账号、原生引用可得性、本地保存时间、版本、原件/仅metadata/部分；“打开原会话”与“读本地保存版本”分开。不要先新建全局资料管理导航。

**负例：** 重复导入、同名同 ID 跨账号、编辑分支、缺件、Zip Slip/路径逃逸/解压放大、未知版本、temporary 模式、只选一个会话却泄漏整包。

**退出：** 仅证明本地 projection，无实时 sync、无原生网页反向写入。回退保留原件与回执，不重写旧 index 成功事实。

## 4. C · 受控 grep / exact read 与可重建索引

**消费入口：** LG-02、RG-BE-04、DS 重建和 BG 披露；Runtime 仅作 reader consumer。

**范围：** 先窄 literal search/range read/provenance inspect，后按规模加 FTS。无任意路径/SQL/shell，principal 由 host 绑定。

**接受：** 03 文档中的负例；索引删除后从同原件重建；中文短词、撤权/缓存/游标、部分coverage、版本锚点均真实。逻辑允许的 corpus 与最终返回匹配，不以小样本声称绝对无侧信道。

**退出：** C 可在纯本地 Inspector 和合成调用器中成立，不等待任何官方 Chat 连接。若需迁移，由 owner 明确版本/备份/旧 host 拒新；不与大重构合一提交。

## 5. D · 一个官方只读 Chat bridge

**消费入口：** 现 Broker 和 GUI 控制面；新增服务端通道不能误认现 MCPManager client 已实现它。

**首选 probe：** 经用户授权，Claude Desktop 本地只读 MCP；或在实际账号支持时 ChatGPT read/fetch MCP。选一个完成真实 E2E，再加另一个。不得偷偷替用户安装、登录、开放公网或执行付费验证。

**接受：** Host 注入可信请求身份；只返回获准集合；原生 Chat 真实调用 → CW 实际 read → 精确引用 → 回执与失败可见。用户关闭 grant 后新的 call 拒绝；不能清除已披露历史，UI 解释一致。

**负例：** 伪造 scope/conversationId、错误 OAuth principal、过期 grant、缺 source、恶意查询、未知工具请求、真实网络失联、connector manifest 版本变化。

**可降级：** 没有官方通道时保留本地检索与用户主动复制/导出上下文片段。此路径记录 prepared/user-exported，不伪造目的 Provider 接收证据。

## 6. E · 原生容器有界试验

**依赖：** A 的政策/支持集合即可；不阻塞 B/C/D。

**范围：** 一个 Provider 的人操作原生入口、账号隔离、导航/权限/下载。没有 DOM 自动归档、后台发 prompt 或私有 API。候选 Electron WebContentsView 不构成整个产品宿主选型接受。

**接受：** 正常路径可用、无特权泄漏、有 external-browser fallback；需要突破上游保护或政策无法支持时停止此渠道。应用壳可更换，已获准的来源与 reader 不应受其影响。

## 7. F · 从资料变化长出 Spark / Attention

**依赖：** C 的来源/读取合同，现被接受的相关 runtime 和 Work owner 能力；D 仅在需要原生 Chat E2E 演示时必需，E 永不成为数据场景前置。

**合成场景：** 两段不同 Provider 的获准讨论引用同一份来源 r1。用户在 CW 建集合并选取一项工作，形成有证据要求的候选；随后导入 r2。

Spark 只读取获准 r1/r2 及关系，准备变化清单、引用、无法覆盖的部分和需要补查的线索。机械差异先确定性处理，必要语义判断再交模型；输出按原 owner 保存候选。不是把“读完了”当成专业核查完成。

Attention 读取工作义务/回执，发现该工作仍引用旧版本或缺少证据，按既有授权提出待处理事项；用户可以要求补证、继续适用旧版本或作正式决定。新版本出现不自动使旧决定无效；Spark 的检查也不自动 close。

最终由新的 Session 或另一已验证 Runtime 通过相同 source refs、决定和未决项继续，不需要上一 Agent 的私有记忆。四角色仍是可组合职责，不强制同时运行四个 Agent。

**接受分轴：** 采集正确性、查询权限、来源/版本准确、候选正确性、人的决定、接续、GUI 表达。先人工触发一次完整流程；随后才决定周期/并发/自动升级。小片可以接受，不能冒称完整自动治理。

## 8. 实际 PR 与并行约束

研究、fixture、容器 spike 可以在独立路径并行；共享 source/RuntimeStore/Core/control-plane 的实现、schema 迁移及 main 接收串行。每张 PR 声明唯一 writer、允许路径、输入 SHA、合同版本、真正关闭的门、not-run 和回退。

不要求所有 A–F 都完成才使 B/C 对用户有用。每个公开能力按自身证据放行；保留原 G1–G5，原 Pi+DeepSeek 测试仍是独立主线。
