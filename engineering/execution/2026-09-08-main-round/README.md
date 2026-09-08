# Main 接管后的首轮架构与派单

2026-09-08。用户已授权下一轮 roadmap 施工，并指定 README/Pages 由 Claude Opus 建立；Astra 负责 current、架构、契约与派单。本包基线为 `d86eba49ca308fb9f47fc953fe440ffa3289da3e`，唯一主目录 `Courtwork`、主线 `main`。这是可交给执行者的工单包；本包完成不代表实施会话已启动或代码已验收。当前状态只在 [current](../../current.md) 更新。

最新派单覆盖下表启动顺序：[Fresh Astra Core实施交接](fresh-astra-core-handoff.md)整合H0–H3，建立通用底层并封装首个NDA场景；Fable同时从前端逆向。允许从现有样本提炼通用Core owner并保留兼容，不复制第二套可写状态；BE-5和完整Workbench后置。以下工单仍作范围输入，前端实际排期以Fable本轮分支回执为准。

## 本轮落点

用户进一步指定：本轮结束须达到 [G1–G5公开完成度](public-readiness.md)，足以修订resume并公开Pages。派单/契约交付是中间产物；BE-5或完整Workbench不挤占最小正式工作闭环的优先级。

主链是一个可审阅、可提交、可恢复的工作消费者。沿用 [H0–H5](../../research/experts-hotplug-2026-09-08/pr-plan.md) 的 Inbound NDA 合成实验，不同时开启第二垂类。通用运行与 UI 已有基线；不从头重建 loop、Core 或工作表面。

| 工单 | 开工条件 / 当前可交付 | 责任与写权 | 结束后交给谁 |
|---|---|---|---|
| [Opus 发布面](../../release/2026-09-08/opus-public-surface-handoff.md) | 现在可开工；事实与视觉分别取证 | Claude Opus：根 README、中英文入口、site、Pages workflow；不写 app | Astra 核对声称/版本；视觉按用户反馈裁定 |
| [WK10b](../../mvp/execution/work-surface-kit/work-orders/WO-WK10b-work-surface.md) 第一段 | 现在可做通用 glyph、Chat Flow、工作面生命周期和下带真实状态 | Claude Opus 沿用 Fable 已裁定语义；app/web 单写者 | Astra 检查服务端接缝；有界独验 |
| [WK11](../../mvp/execution/work-surface-kit/work-orders/WO-WK11-runtime-workbench.md) | WK10b 的共享 app.mjs 改动合流后；资源检查主体可按现有 API 编排 | Claude Opus：Runtime Workbench；不新增 API | Astra 检查 CAS、来源和 Context 解释 |
| H0 | 现在开契约/fixture单；先固定规则与对照，不先跑模型 | Astra；按既有 H0 写权。固定合成输入/gold，由非作者检查 | H1/H2/H5 消费固定hash |
| H1 | H0 获得可判定的固定输入后实施 | Astra：evidence-memo Core/adapter + 必要host接缝；不写通用web布局 | H2 与 H3 / WK10b 第二段 |
| [BE-5 / Runtime R2 服务接缝](WO-BE5-resolver-service.md) | 契约已收窄，后端单可接；与H1的service.mjs写入串行 | Astra后端；复用既有纯解析器，不取代主链 | WK11后续消费，R4/R5继续后置 |
| H2 / H3 | H1交付typed packet、动作与恢复证据之后 | Astra做执行/后端；Opus做领域renderer，沿WK10b第二段 | 有界fixture联调，再真实provider |
| H4 / H5 | 由H2/H3的实际缺口与H0对照触发 | 沿原PR plan；不提前建设包市场或并行scheduler | 下一次架构裁决 |

“可开工”是依赖裁定，不虚报已经派给某个运行中的会话。执行者接单后在工单回执记录实际 worktree/branch/端口；不复用旧 fresh checkout 或暂停作者的工作目录。

## 关键架构裁定

1. **既有样本 Core 继续承重。** `evidence-memo` 已有 Matter/Candidate/Decision、可信本地 Reviewer、CAS 和幂等决定；H1补NDA逐规则数据、修订、绑定与投影，不再造第二套Review存储。host运行Artifact与领域接受Artifact各自保留身份。
2. **跨Session是明确缺口。** 当前 `createBinding` 每次新建 matterId，不能用“同Session重启”冒充“新Session继续同一Matter”。H1先确定同一项目/本地用户内的已有Matter重新绑定契约、版本检查与归属校验，再交UI；不能仅接受任意客户端matterId。
3. **没有producer时读历史是后端问题。** 当前 `getSurface` 无registry record会返回空projection；只换前端placeholder不构成H3。先给出不执行旧producer的版本化历史读取能力，再由前端呈现只读fallback，缺合法动作就不画动作。

4. **历史依据必须保留可验证归属。** Core的`replace_source_set`保留source字节却删除旧source_set；带Matter的`read_source`只校验当前revision。H1应保留历史成员关系，或提供可核验的不可变packet，让H3能按候选绑定版本读取；不得通过不带matter_id的裸读绕过归属检查。测试覆盖更新材料后旧候选仍可读、其他Matter不能越界读取。
5. **真实执行的领域记录不能沿用simulation。** `coreProviderConfig`当前固定写`executionMode=simulation`、`credentialStatus=not_configured`。H2必须从宿主可信运行记录映射准确且不含凭据的来源/模式，保留旧样本的simulation身份；真实provider证据需同时核对Run与领域记录。

现有通用 `ReviewProjection` 仍为 permission/question/outcome。H1交付前不往它里补 accepted。领域样本现有 `decide` 能力也不意味着通用 Review 或 NDA 已交付。

## H0 首张交付的边界

H0沿原 [验证设计](../../research/experts-hotplug-2026-09-08/validation.md) 收窄为纯文本合成NDA、明确被代表方、交易事实、固定playbook/fallback。首张单选3–5条可机械核对的合成规则，必须同时有正常命中、缺失、冲突/无法判断；规则不声称是法律通则。

交付 Contract说明、原始输入、source坐标、gold、开发/holdout分离与hash、反例清单。逐规则认识状态与Candidate处置/Artifact效力分开。H0先让第三人能独立推出预期；H1开始时再把稳定字段映射进现有Core，不在本包虚构已冻结的NDA payload ABI。

H1至少给出：修改产生新候选、过时base拒绝、同键异内容拒绝、可信actor、答复丢失后查询、同Matter换Session继续的具体输入/输出和非作者反例。各字段如需改变既有ABI，交付有版本契约与旧记录兼容策略后才放行H3。

## 写权与合流

- Opus发布面与产品UI可在独立工作树制作，但只发布源码允许清单；网站不调用本地runtime、不接收凭据，不把演示按钮做成正式提交。
- WK10b/WK11涉及 `app/web/app.mjs`、styles、renderer host的部分串行。H3 renderer等待H1契约；不因页面先画完而反推后端状态。
- H1与BE-5都可能触及 `app/server/service.mjs`；先固定其中一单再合另一单，不让两个writer直接共享修改。
- 使用从当前main建立的隔离worktree和仓外合成数据，端口由接单者记录实际值，不照抄历史885x/190xx。施工分支用任务名，不再建fresh/current长期线。
- 交付固定SHA、diff范围、实际命令/结果、失败与未检项。作者自测和独立验收分列；只按受影响行为补测试，不堆镜像断言。
- Astra按固定交付合流main；README/Pages与产品版本可以不同，媒体声明必须绑定实际产品代码。页面部署、产品发行、真实模型与专业质量是不同验收。

## 首轮返回包

Opus返回可运行页面/GUI、实际截图、选型裁取与未决；Astra后端返回可复现契约和反例。真实provider只能沿用户Web UI配置与已有授权运行，未就绪保持not_run；不影响合成fixture和界面编排继续。三方不另维护一份current，结果进入对应delivery，再由Astra更新唯一current。
