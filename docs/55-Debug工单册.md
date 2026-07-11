# Debug 阶段工单册（2026-07-11 开册）

docs/11 为全项目总账；Debug 阶段（0.1.x 真机迭代）单据入本册，docs/11 留指针。判例与裁决仍落各权威 ADR。

## FIX-KC-1 凭证授权流修复（Grok，据 DBG-2 回报，架构已拍板）

```
你认领 Courtwork 的 FIX-KC-1：真机凭证授权流修复。依据：DBG-2 诊断（H1 ad-hoc CDHash/ACL 漂移主因成立、H3 错误折叠放大器、H2 双条目为放大副因、H4 环境共因）。架构批准五件合施，均在凭证 Rust/TS 热点内：

1. DBG-2.1 trace 日志（照诊断提案 5.2–5.4 规格）：KeychainOp/KeychainFailKind 内部枚举；点位=启动一次（cdhash/签名态）+ 每次 get/set/delete + credential_status/save 出口；一行 JSON 落 ~/Library/Logs/cn.courtwork.desktop/credential-probe.log，轮转 1MB；默认关闭，env COURTWORK_CRED_TRACE=1 开启；永不记录 secret/source 值/环境变量值；断言测试：日志路径全内容无 key 子串（docs/27 红线）。
2. F2 止血：save 路径改 delete_credential（忽略 NoEntry）→ set_password，整组重写，强制当前身份新建 ACL。
3. F4 错误分型：KeychainFailKind 从 KeyringError 的 source()/Display 解析 OSStatus（-128 canceled / -25293 auth_failed / -25315 no_access / -25308 interaction_not_allowed / NoStorageAccess / platform_other{os_status}）；诊断导出增 credentialFailKind 字段（无密钥、枚举值）；UI 文案按分型映射（照 DBG-2 F4 提案三句），对外保持零技术概念。
4. F5 恢复路径：设置页连接失败态辅助文案——H4 钥匙串密码指引 + 手动删除 cn.courtwork.desktop.provider 两项的指引（照 DBG-2 用户侧文案，文案级不改存储语义）。
5. F6 dev 隔离（显式批准的行为变更）：dev 构建 service 加后缀 .dev（cn.courtwork.desktop.provider.dev），防 dev 污染发行 ACL；判定方式用编译期 cfg/debug_assertions，不引运行时配置。

不做：F1 Developer ID 签名（用户手动项：证书就位后随 BUILD-2）；F3 单条目合并（后置）。

测试：Rust 分型解析单测（构造 OSStatus 样例）；TS mock 三态与文案映射；e2e failed 态文案呈现；trace 开关默认关断言；全门禁 + floor 禁降。显式路径提交，完工报告附：真机采集剧本（照 DBG-2 5.5，用户跑一轮回传 credential-probe.log + codesign 输出）。
```

## RP-2 增补条款（并入既有 RP-2 单，实施时同批）

批次四增补 #18′/#23/#24（docs/52）+ docs/49 四章再修：provider chip 归 composer 发送旁（状态条撤模型名）；双侧折叠钮 + 展开钮驻原位/收敛 bar；三列纵向贯通；composer 下声明与 feedback 小字（英文）。e2e 增：折叠往返、chip 三态在 composer 位、小字存在且不夺焦。

## RP-2 扩编转任命：UI 完全化（sol / Codex GPT-5.6，computer use）

```
你（sol）认领 Courtwork 的 RP-2/UI 完全化单（架构任命，B 阶段 UI 岗回归）。目标：参照 frontier work 界面把 UI 做全——用户会提供 frontier 截图作像素参照，你用 computer use 对自己的 build 截图对照自查，先做全再做细。前置：BUILD-1 已出 0.1.0；FIX-KC-1（凭证热点）可能并行在途，勿碰凭证 Rust/TS 文件。

必读：CLAUDE.md → docs/49 全章（含四章两次修正：声明位归 composer）→ docs/52 批次四全量（#18′–#26）→ docs/32 tokens/motion ladder → apps/desktop/SPEC.md。读完复述范围。

范围（批次四全量）：
1. #18′ provider chip 归 composer 下缘发送键旁：探针三态（connected=模型名·强度/failed=琥珀连接失败/pending=待连接），点开唯一 model-config popover；状态条撤模型名；假态零容忍 e2e。
2. #19 层级：wordmark 全 app 唯一；卷宗标题迁中栏 chat 区上方案件头（自动命名+行内可编辑持久化）。
3. #20 宽比定档：左栏收敛态右栏默认宽屏；档位值 SPEC 提案先行。
4. #21 chat 降噪：系统事件卡合并紧凑事件流；人机分辨=对齐+底色不靠框；artifact 卡保留；形制 SPEC 提案。
5. #23 双侧折叠：左右栏折叠钮；折叠后只剩 chat 底、展开钮驻原位或收敛视觉 bar；三列纵向贯通不分横带。
6. #24′ composer 下小字（一字不改）："Courtwork is an agent and can make mistakes. Please double-check responses." + "Give us feedback" 链接（小字英文不占视觉；feedback 路由预留可 mailto）。
7. #25 左下角用户位：负责人/用户菜单（设置 + 检查更新/下载 badge 路由设置页 + feedback）；非 demo 不显示律师名（#17 语义并入）。
8. #26 运行反馈阶梯（规格提案先行，架构过目后实现）：请求中/成功/失败三态即时反馈；reasoning 流动画；OCR/摄取长任务等待交互（进度或骨架）；全部在 motion ladder 纪律内（hover 120ms/数据区静止不破）。
纪律：TDD；floor 禁降只升；tokens 外零硬编码色；SPEC 提案（宽比档/降噪形制/反馈阶梯）先写后实现供架构过目；对照截图（改前/改后/frontier 参照）入 visual-audit；完工报告含提案全量。凭证文件与 packages/* 不许碰，跨层需求写对方 SPEC TODO。
```

## FIX-KC-1 验收（Claude Code，实现者 Grok，安全敏感件从严）

```
你认领 Courtwork 的 FIX-KC-1 验收（验收工程师，AGENTS.md 全判例；安全敏感件，主张逐条证伪不采信自述）。范围提交：815bf15（11 文件显式路径）。先读：docs/55 FIX-KC-1 工单 + DBG-2 诊断要点（H1 ACL 漂移/F2–F6 提案）+ docs/27 红线（key 永不进事件流日志）。

全局门：干净环境 pnpm -r build → Rust 单测（cargo test，9 例逐名核）→ Vitest → Playwright 90/90 + floor=90（禁降史 88→90）→ 四门禁 → git 卫生（仅 11 文件，他会话脏文件未动）。

安全主张逐条证伪（重点）：
1. trace 无泄漏：读 lib.rs 日志实现逐字段——secret 值/source 值/env 值必须无写入路径；**实测**：COURTWORK_CRED_TRACE=1 跑一轮 save+status（可 dev 环境 mock/真 keychain 任一），grep 日志无 sk-/密钥子串/env 值；断言测试确认存在且真断言（非空测）。
2. 默认关铁证：不设 env 冷启动 → 日志文件不创建不追加（实测文件系统，非只信单测）。
3. F6 双向核：读 cfg 判定代码——debug_assertions 下 service=.dev 后缀；**release 编译产物无后缀**（读代码逻辑 + release build 单测或 cargo test --release 任一证明；防反转 bug：release 带了 .dev 是灾难级）。
4. F4 分型不越权：failKind 只进状态 JSON/诊断导出（枚举值），UI 文案三句对外零技术概念（无 OSStatus/ACL 字样）；**SET-1 诊断导出回归**：新增 credentialFailKind 字段后重导一份实物，全载荷仍无密钥、路径仍 [configured]。
5. F2 顺序核：save 路径读实现——delete（忽略 NoEntry）先于 set，整组两条目都重写；失败中途的半写状态如何呈现（诚实 failed 即可，不许假 connected）。
6. F5 文案对表：settings-credential-recovery 与 DBG-2 用户侧文案语义一致（H4 钥匙串密码指引 + 手动删两项指引），仅 failed 态渲染。
7. e2e 回归红线：既有断言无放宽；新增用例覆盖分型文案与恢复指引呈现。

报告纯追加 apps/desktop/ACCEPTANCE.md「FIX-KC-1 验收」节（工作树若有前序未提交追加，先按判例链代提交）。结论：放行与否；真机采集剧本是否可直接交用户执行。
```
