# CourtWork · 合流、双线迭代与发布面

2026-09-08 · 用户已明确本阶段次序与责任。本文件是当前阶段的执行与发布交接；工作状态仍由 [current](../../current.md) 和对应工单维护，长期能力与研究门仍在 [Roadmap](../../roadmap.md)。输入为用户本轮安排和 Chat《筹备两个仓库发布》（`6a9f20a0-898c-83ec-9813-a401199d00d2`）；Chat中的命名、结构和成熟性判断经过下述裁取，不直接授予发布状态。

## 当前顺序

| 顺序 | 责任与产出 | 完成证据 |
|---|---|---|
| UI独立施工 | Fable维护UI方向、Preview extensions编排的UI选型与唯一writer；Opus按已派发WO-RC、WO-WK9等边界施工。WK9画布选择后才转产品实现 | 固定候选SHA、设计选择/未决、实际修改路径、作者测试与gaps；画布交付不等于产品实现 |
| Fable竣工后双向追溯 | Astra从最终前端动作/投影追到harness契约与真实效果，再从harness能力/限制/恢复路径反查前端覆盖；补齐有界接缝 | [双向追溯与集成检查](integration.md)；固定交付SHA、调用路径、缺口及验证，不把中间整合回执当竣工 |
| 补齐后merge | 在隔离集成树合流最终UI与必要harness补充，复核祖先、冲突和受影响检查 | 固定merge SHA、干净提交、保留未检项；接收后才转移writer责任 |
| handoff fresh Astra | 合流后按 [fresh Astra交接包](fresh-astra-handoff.md)创建独立任务，绑定merge SHA与证据 | 新任务从交接包恢复，不依赖旧聊天记忆；此步不同于后续网页GPT Pro review |
| build后联调Web UI | fresh Astra按实际安装/校验/启动链建立同一SHA基线，再处理前后端往返、异常恢复与细粒度polish | 真实请求/回执、浏览器链和独立复核证据；未运行项显式保留 |
| 两笔完成后push | 推送上述集成候选至Courtwork远端候选分支；按用户本轮授权，在前置工作成立后执行，无需再重复询问同一候选推送 | 本地SHA=远端SHA，独立clone可复现，验证回执及未决同源；不把不完整候选推作已完成 |
| 双线继续 | 工程线持续改善runtime、harness Core与SE纵切；发布线维护对外口径、README/Docs、真实预览Pages与桌面发行路径 | 每次发布声称均有固定SHA/证据；发布面可先到experimental Web preview，不等待所有长期研究完成 |
| 独立网页GPT Pro review | 端云候选同步后交付 [完整review输入契约](review-handoff.md)，覆盖代码质量、harness Core、必要自研SE、UI接缝与发行 | 覆盖清单、源码定位、严重度、复现/反例和未检项；回收后由本地复现、修复、独验，不把review意见直接当实现事实 |

“端云同步”在本阶段指仓库源码、候选提交、构建/测试证据与review快照一致。产品数据同步、远程执行或多端工作状态协议是另一个产品能力，不能由Git同步或网页review推定已实现。

“build Web UI”落实为本仓实际安装/校验/启动链。当前原生MJS工程使用`npm --prefix app ci`、`npm --prefix app test`、`npm --prefix app start -- --data-dir <独立目录> --port <独立端口>`，没有凭空新增`npm run build`或迁栈要求；若后续所选实现新增构建步骤，应登记实际命令与产物。

## 两条长期线

| 工程迭代线 | 发布面线 |
|---|---|
| 真实runtime控制与执行、权限/资源、可追踪上下文、取消/恢复、模块加载与Preview编排 | 与真实能力一致的中英文定位、README信息架构、可复现quickstart、docs导航、版本与成熟度 |
| Core状态/Proposal/Decision与界面投影边界；H0–H5领域验证及必要自研 | 合流后真实截图/短演示，静态preview与live demo明确区分，预览Pages逐版绑定源码 |
| 社区机制优先、删除无收益抽象、依赖更新与回归、可维护性 | 安装/升级/恢复说明，桌面壳选择、可构建DMG，后续签名/公证和分发 |
| 独立review→本地反例→有界修复PR→独验→新候选 | 同步声明、下载与校验信息；撤回过期截图、坏链接或超出证据的用语 |

两线共享release SHA与证据，不共享发布节奏。后续代码变化可以先走候选，公众入口保持最后已核验版本；完整工作闭环未通过时，教程只演示真实成立的Run/工具/检查/恢复路径，把Matter闭环列为目标。

## 发行阶梯

1. **候选源码**：本轮两笔合流/联调后push，保留真实成熟度。候选同步沿既有`codex/fresh-courtwork`；legacy `main` takeover仍按既定迁移契约，独立记录default branch与发布改变。
2. **对外入口与preview**：[发布面说明](public-surface.md)先作为草稿消费；真实截图来自选定并合流的UI。Pages能展示产品及论文入口；静态站不承诺运行Node后端、访问本地文件或提供真实provider。
3. **Web体验**：给出实际可复现启动与首个工作路径。有托管演示时另定数据/会话/运行责任与部署配置；不由静态preview自动升级。
4. **可构建GUI DMG**：先以现有Node runtime和Web UI评估成熟桌面壳/打包器接缝，再择一做最小包装。选择须覆盖子进程启停、端口与本地访问边界、配置/数据目录、权限/文件选择、崩溃恢复与升级。DMG完成至少须干净环境build、安装/首次启动/退出/重开/数据保留/卸载边界、架构与系统版本记录、校验和及可复现产物。此阶段不等于已经签名公证或可广泛分发。
5. **可分发macOS版本**：在实际发行目标下完成适用的签名/公证、下载完整性与升级/回退验证。使用发行身份前确认其可用性；不先承诺具体系统版本、双架构或自动更新。

## 两仓边界

CourtWork对外发布产品/runtime与实现证据；SE对外发布可阅读、可引用的论文。Paper仍以 [PAPER.md](../../../PAPER.md)固定采用9.3 SHA；SE本地9.6候选不是自动采用或已发布版本。SE发布设计在其自身`papers/notes/publication-surface.md`维护，产品任务不复制过去。跨仓桥是原理→实现，以及有固定工程commit的泛化观察→Practice Index。

输入不采纳“Schema = model context = human review surface = persistent work state”的等号。正式状态、上下文和工作表面是有共同来源的不同对象/投影，公众图与文案不得以简写抹平owner和效力。CourtWork现阶段用“experimental implementation exploring Schema Engineering”，完整reference implementation承诺随实际覆盖收敛。

## 本次回执

本阶段安排已落盘；未因此宣称UI选型完成、runtime新缺口已实现、两笔已合流、已push、已部署Pages、已有DMG或已提交GPT review。本轮能独立完成的发布结构与review输入先行准备，其余依赖按上述顺序推进。[本地盘点](evidence/local.md)与[REEF限定溯源](evidence/reef.md)作为准备证据，不另建当前状态账本。

文档独立复核见 [final-review](evidence/final-review.md)：限定语义、顺序、链接/anchor与差异检查通过；不扩大为运行或发布验收。
