# 当前工程状态

更新：2026-09-08。唯一开发入口为 `Courtwork`，主线 `main`。本次WK10b第二段合流读取main基线 `d879e2ff94d234120f902e15101c103943719e33`；此前合流已接收 Harness Core `d6247a8`（代码 `1332691`）与 Fable 文档 `99a9279`，实际合流证据见 [清洁节点回执](../evidence/harness-main-integration-20260908/README.md)。实际接单前重查HEAD与工作树，不按历史fresh/current路径继续。

## 本轮责任与完工节点

用户指定：**Claude Opus建立README/Pages；Astra负责current、架构、契约与下一轮派单。完工以足以修订resume并公开Pages的产品证据为准。** [本轮派单](execution/2026-09-08-main-round/README.md)已形成，[G1–G5完工条件](execution/2026-09-08-main-round/public-readiness.md)尚未满足，不以本轮文档交付或main接管关闭。

Core主单已交付：[Fresh Astra：通用Harness Core＋首个NDA场景](execution/2026-09-08-main-round/fresh-astra-core-handoff.md)，整合H0–H3进入实际实施；Fable在分支从前端逆向。Core允许从样本提炼通用owner，保持单写者并复用Pi运行循环；BE-5/完整Workbench后置。fresh指新任务上下文，不指退休目录。

| 面 | 本轮实际状态 | 下一步与owner |
|---|---|---|
| 对外口径 / README / Pages | 准备包和事实输入已固定；当前主线尚无新site/workflow，根README仍待Opus重写 | Claude Opus按 [发布面交接](release/2026-09-08/opus-public-surface-handoff.md)实现；Astra核对证据 |
| 通用工作面 / Workbench | WK10b两段已合流；第二段FE-T06/T08/T11复跑通过；WK13/12/11待实施 | 本次清洁main建树，Opus串行：WK13 → WK12 → WK11；[第三轮派单](mvp/execution/work-surface-kit/dispatch-round-3.md) |
| 领域主链 | H0–H3后端已实现：单一Core、NDA规则/候选/决定、来源历史、跨Session/删除保留、producer缺席读取 | Fable消费冻结契约；Review与续行GUI已通过合成浏览器复验；真实运行纵切仍待，不关闭G2/G3 |
| Runtime来源 | Runtime R2纯声明解析模块已合流；无HTTP/UI/model工具，locator获取未实现 | BE-5服务接缝单可接，串行避开H1的service写权；不阻塞最小公开纵切 |
| 真实模型 | 最终联调与远端clone使用local-fake/loopback；真实provider未跑 | 沿用户GUI配置与授权补G1/G2；不读取凭据、不假定现成配置 |
| 旧实现召回 | 已冻结并完成15条Luna只读索引，15/15路径核验 | 从 [召回索引](ecosystem/legacy-recall-index.md)定向读SHA/path，不默认继承旧代码 |
| Benchmark / SE 连续性 | Pro指出旧评分盲区与Context续行边界；现已修复观察关系/角色/raw绑定，E与普通S各六条开发符合性通过；Context v2引用+分页读与HTTP局部续行通过 | [Pro处置/证据](../evidence/pro-review-remediation-20260908/README.md)、[协议](research/se-continuity-2026-09-08/README.md)；D1/D2有界独立复核已完成，合流应用183/183与smoke通过；下一步冻结S/E差异与独立任务，后做有界模型pilot；真人/法律质量后置，不关闭产品门 |

Harness Core交付 `d6247a8` 已接收：代码 `1332691`，作者170/170与smoke通过，Core/adapter/abort与收尾恢复非作者复验有界通过，原始来源消费、Paper历史映射与Pro逐项处置见 [交付证据](../evidence/harness-core-20260908/README.md)。Pro初审针对旧 `e0d214d`，本轮修复收尾误报成功、未知结算恢复、partial tool事件与底层abort窗口，不冒充Pro已审新分支。

Fable文档交付 `claude/fable-settings` `99a9279` 已接收：WK-83按两分支合流后的清洁main开工，前端单一writer串行，WK10b第二段进入序2。Paper9.6、MIT与首屏文案既有裁定保留；Core历史9.3证据不重标为9.6验证。该清洁节点遗留的修订动作声明与renderer准入由下述Astra接缝单补齐；实际renderer由Opus第二段实现，其他新增静态路径仍由Astra串行处理。

WK10b第一段已接收：Opus代码 `84803ad`、作者回执 `f1ef5ae`、Fable复核 `d408961`，与main `7941bdb` 无冲突合流。Astra复跑浏览器22/22（含FE-T05/T07）、覆盖态5/5、全量174/174与smoke；合流时修正NDA renderer路径已声明但文件尚缺席的槽位失败状态，详见 [合流证据](../evidence/wk10b-main-integration-20260908/README.md)。第二段从本次清洁main建树。Astra后端前置交付 `codex/work-review-actions`，从同一main基线建独立树；版本化 `revise_candidate` 动作声明、NDA proposal schema与精确renderer准入已实现，代码 `3d97beb`，作者174/174与smoke通过，非作者接缝独验6/6；证据见 [本单回执](../evidence/work-review-actions-20260908/README.md)。该接缝已由第二段renderer消费，合成GUI证据见下；不关闭真实运行门。

WK10b第二段已接收：Opus实现 `e118992`、作者回执 `10f185a`、Fable复核 `a60187e`，与main `d879e2f` 无冲突合流为 `bf44b8f`。Astra复跑全量178/178、浏览器26/26与缺席/历史11/11（FE-T06/T08/T11），授权卡与取消补验见 [第二段合流证据](../evidence/wk10b2-main-integration-20260908/README.md)。WK-85受信renderer静态kit导入与conflict唯一着色按复核裁定接收；绑定面顺序排入WK13。BE-14决定时刻、BE-15事项标题/最近决定时间保持已登记后端请求，未实现、不阻塞本段。WK13从本次最终清洁main SHA建树，具体SHA由合流回执给出；新增adapter精确静态准入仍由Astra接单，不扩大前端写权。

本表“可接单/下一步”不代表每张工单已有执行会话在运行。各作者回执记录实际开工SHA、worktree/端口、结果与未检项；Astra统一合流，不维护第二份产品状态表。

## 已成立的证据

| 范围 | 已有证据 | 支持边界 |
|---|---|---|
| Harness Core与NDA后端 | 170/170、smoke与独立Core/adapter/故障注入；固定代码1332691 | [回执](../evidence/harness-core-20260908/README.md)；合成/loopback、无真实provider或前端验收 |
| 本地/远端恢复 | 独立clone安装、146/146、runtime smoke与启动静态资源通过 | [联调同步](../evidence/final-integration-20260908/sync.md)；测试提交与当前产品app/tests/brand一致，非真实provider |
| Web↔后端主链 | 回答/精确工具授权、File身份、Preview、deny/Stop/断连恢复9/9；MCP unknown回执3/3；extension恢复6/6 | [联调回执](../evidence/final-integration-20260908/README.md)；fixture、实际HTTP与浏览器，不代表完整NDA/专业正确性 |
| Runtime控制面 | CAS、parent gate、Source/Effective、历史Context与MCP生命周期；RC契约20/20、反例9/9、视口36/36 | 同上；characters非tokens，安装/连接/曝光/许可分别成立 |
| 当前GUI与品牌 | Home空/列表、1440/390浅深几何8/8；既有L0–L3、悬浮工作面/composer；brand独立包 | [联调回执](../evidence/final-integration-20260908/README.md)、[品牌验收](../brand/evidence/ACCEPTANCE.md)；部分画面目视，不宣称全面视觉/读屏/触控验收 |
| Runtime R2解析 | inline六kind、exact hash、unverified来源、inspect-only与locator unsupported | [解析契约](../docs/runtime-control/source-resolver.md)、[证据](../evidence/runtime-resolver-20260908/README.md)；不是R3兼容矩阵或R4/R5安装方案 |
| Main谱系与目录 | replacement `d20fbc3`继承旧`f9ade85`，文档后继`d86eba4`已同步；原Courtwork目录检出main，迁目录后smoke通过 | [接管回执](../evidence/main-cutover-20260908/README.md)；不代表Pages/DMG发行或产品G1–G5已完成 |

146/146、9/9等是不同范围的既有回执，不累加成一个“产品完成度”数字；本次Core作者全量验证与独验按各自SHA/范围分列；合流验证见清洁节点回执。

## 仍未闭合

- G1真实provider仍not_run；可信执行身份贯通已由loopback验证。G2/G3后端闭环已成立，Review/新Session GUI已有合成复验；键盘主路径与真实运行纵切尚待；不以工具allow代替成果accept。
- H1历史来源归属与H3 producer缺席后端读取已实现。领域renderer与版本化修订动作声明已交付并通过合成复验；H4完整卸载/重装/升级矩阵仍按实际需要验证。
- BE-1/3 activity与UTC日过滤；BE-2多文档实例；BE-12模型effort；Runtime R2获取、R3兼容、R4 Proposal、R5事务apply/rollback、R6 Expert版本。分别消费既有契约，不为导航或演示造能力。
- VoiceOver/NVDA、IME/触控、桌面壳、200%缩放的完整产品验证及数据回退演练；旧135/1无栈flaky未复现，不称已修复。
- README/Pages真实媒体与发布；新DMG/签名公证/外部用户试点未完成。Paper已采用 [9.6固定SHA](../PAPER.md) `d78fd312955c1f594e59cbdcbb0d3074ac355940`（DEC-012）；版本采用不关闭产品验证门。

## 责任与历史

[架构](architecture.md)保持M01–M14所有权，[长期路线](roadmap.md)保持R0–R5与H0–H5；本轮不改Paper、不新增并行正式状态，此前已结束的Fable loop不自动覆盖用户本次新开工安排。过去的迁移条件已经由用户“先切main”的授权调整，不再当作当前分支门；其中真实验收/恢复要求继续由本轮产品完成度承接。

历史细节按需读 [第二节点](../evidence/node2-independent/README.md)、[最终联调](../evidence/final-integration-20260908/README.md)、[清账](../evidence/reconciliation-20260908/README.md)、[main接管](../evidence/main-cutover-20260908/README.md)。历史回执原文保留，其旧目录、等待状态与分支称呼不覆盖本页。
