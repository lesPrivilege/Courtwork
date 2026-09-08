# 当前工程状态

更新：2026-09-08。唯一开发入口为 `Courtwork`，主线 `main`。本轮读取基线 `d86eba49ca308fb9f47fc953fe440ffa3289da3e`；产品代码等价于已联调 `0a3b9b22f47f5605ccedc227106b0c17a4df6120`，后续main接管及索引提交只改变文档。实际接单前重查HEAD与工作树，不按历史fresh/current路径继续。

## 本轮责任与完工节点

用户指定：**Claude Opus建立README/Pages；Astra负责current、架构、契约与下一轮派单。完工以足以修订resume并公开Pages的产品证据为准。** [本轮派单](execution/2026-09-08-main-round/README.md)已形成，[G1–G5完工条件](execution/2026-09-08-main-round/public-readiness.md)尚未满足，不以本轮文档交付或main接管关闭。

| 面 | 本轮实际状态 | 下一步与owner |
|---|---|---|
| 对外口径 / README / Pages | 准备包和事实输入已固定；当前主线尚无新site/workflow，根README仍待Opus重写 | Claude Opus按 [发布面交接](release/2026-09-08/opus-public-surface-handoff.md)实现；Astra核对证据 |
| 通用工作面 / Workbench | WK10a+r2、收尾与联调已在main；WK10b/WK11未按本轮工单实施 | Opus先WK10b第一段，再串行处理共享web文件的WK11；[工单入口](execution/2026-09-08-main-round/README.md) |
| 领域主链 | evidence-memo样本Core可复用；NDA逐规则、同Matter换Session、独立历史读取仍缺实现/验收 | Astra沿H0→H1→H2/H3；Opus领域renderer等待H1契约 |
| Runtime来源 | Runtime R2纯声明解析模块已合流；无HTTP/UI/model工具，locator获取未实现 | BE-5服务接缝单可接，串行避开H1的service写权；不阻塞最小公开纵切 |
| 真实模型 | 最终联调与远端clone使用local-fake/loopback；真实provider未跑 | 沿用户GUI配置与授权补G1/G2；不读取凭据、不假定现成配置 |
| 旧实现召回 | 已冻结并完成15条Luna只读索引，15/15路径核验 | 从 [召回索引](ecosystem/legacy-recall-index.md)定向读SHA/path，不默认继承旧代码 |

本表“可接单/下一步”不代表已有执行会话在运行。各作者回执记录实际开工SHA、worktree/端口、结果与未检项；Astra统一合流，不维护第二份产品状态表。

## 已成立的证据

| 范围 | 已有证据 | 支持边界 |
|---|---|---|
| 本地/远端恢复 | 独立clone安装、146/146、runtime smoke与启动静态资源通过 | [联调同步](../evidence/final-integration-20260908/sync.md)；测试提交与当前产品app/tests/brand一致，非真实provider |
| Web↔后端主链 | 回答/精确工具授权、File身份、Preview、deny/Stop/断连恢复9/9；MCP unknown回执3/3；extension恢复6/6 | [联调回执](../evidence/final-integration-20260908/README.md)；fixture、实际HTTP与浏览器，不代表完整NDA/专业正确性 |
| Runtime控制面 | CAS、parent gate、Source/Effective、历史Context与MCP生命周期；RC契约20/20、反例9/9、视口36/36 | 同上；characters非tokens，安装/连接/曝光/许可分别成立 |
| 当前GUI与品牌 | Home空/列表、1440/390浅深几何8/8；既有L0–L3、悬浮工作面/composer；brand独立包 | [联调回执](../evidence/final-integration-20260908/README.md)、[品牌验收](../brand/evidence/ACCEPTANCE.md)；部分画面目视，不宣称全面视觉/读屏/触控验收 |
| Runtime R2解析 | inline六kind、exact hash、unverified来源、inspect-only与locator unsupported | [解析契约](../docs/runtime-control/source-resolver.md)、[证据](../evidence/runtime-resolver-20260908/README.md)；不是R3兼容矩阵或R4/R5安装方案 |
| Main谱系与目录 | replacement `d20fbc3`继承旧`f9ade85`，文档后继`d86eba4`已同步；原Courtwork目录检出main，迁目录后smoke通过 | [接管回执](../evidence/main-cutover-20260908/README.md)；不代表Pages/DMG发行或产品G1–G5已完成 |

146/146、9/9等是不同范围的既有回执，不累加成一个“产品完成度”数字；本次架构派单没有重跑或新增产品测试。

## 仍未闭合

- G1真实provider及领域记录中准确的执行模式（样本当前固定simulation）；G2 NDA候选→审阅→正式决定；G3新Session恢复同Matter。已有Core样本、同Session续跑与权限批准不能替代这些纵切。
- H1历史source revision的归属读取（当前只读现用revision）；H3 producer缺席历史read path；H4按实际需要的卸载/重装/版本兼容。现renderer缺席fixture不关闭整个H3/H4。
- BE-1/3 activity与UTC日过滤；BE-2多文档实例；BE-12模型effort；Runtime R2获取、R3兼容、R4 Proposal、R5事务apply/rollback、R6 Expert版本。分别消费既有契约，不为导航或演示造能力。
- VoiceOver/NVDA、IME/触控、桌面壳、200%缩放的完整产品验证及数据回退演练；旧135/1无栈flaky未复现，不称已修复。
- README/Pages真实媒体与发布；新DMG/签名公证/外部用户试点未完成。Paper当前仍采用 [9.3固定SHA](../PAPER.md)，本地9.6候选不自动取得发布地位。

## 责任与历史

[架构](architecture.md)保持M01–M14所有权，[长期路线](roadmap.md)保持R0–R5与H0–H5；本轮不改Paper、不新增并行正式状态，不重启已结束的Fable loop。过去的迁移条件已经由用户“先切main”的授权调整，不再当作当前分支门；其中真实验收/恢复要求继续由本轮产品完成度承接。

历史细节按需读 [第二节点](../evidence/node2-independent/README.md)、[最终联调](../evidence/final-integration-20260908/README.md)、[清账](../evidence/reconciliation-20260908/README.md)、[main接管](../evidence/main-cutover-20260908/README.md)。历史回执原文保留，其旧目录、等待状态与分支称呼不覆盖本页。
