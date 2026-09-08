# 本阶段合流与前后端协同

状态与依赖见 [阶段安排](README.md)。以下是Astra实际施工/验收的边界，复用已有工单，不重新派发同名前端任务。

## 接收当前UI

- Fable交付选定方向、Preview extensions编排选择与对应typed projection；画布交付与产品竣工分别判定，须有最终交付与writer交接。RunSummary/FileList/WorkspaceList按WK37的真实字段消费，不能恢复无数据的Progress百分比或旧三卡语义。
- WO-RC交付固定分支/SHA、修改文件、`runtime-ui-gaps.md`与验收回执。控制UI由现有Opus writer维护；Astra只在交付后处理集成与后端接缝，不同时改其`app/web/**`。
- 接收候选时检查真实ancestor关系；WK6、WK8、RC可能共享已合入祖先，不能按文件名机械重复cherry-pick。WK7色彩分支独立；BR-1品牌候选为`d799a7fabceae2f84d70d00c504ecf6f88e269f9`，WK6已通过`f61120e`消费并以`adb2e01`补宿主映射，不能再次当未接入单重复施工。合流前复核最新祖先与交付。

## Fable竣工后的双向追溯

先接收最终交付SHA、范围、未决和writer退出说明；中间整合回执或单项测试通过不足以判定全部竣工。前端选型以最终工单/契约为准。

| 方向 | 逐项追溯 | 交付 |
|---|---|---|
| 前端 → harness | 用户动作/显示状态 → projection/adapter → API与事件 → runtime/Core owner → 持久化、权限与外部效果；覆盖成功、拒绝、取消、重连、unknown | 每条关键用户路径的固定SHA+源码位置+请求/回执；展示与真实能力不符处进入已有gap |
| harness → 前端 | 已有能力、资源来源、配置revision、上下文、权限、MCP lifecycle、错误与恢复 → 可理解且可操作的UI入口/反馈 | 标记已覆盖、缺UI、缺后端、刻意不暴露；不存在后端能力时保留限制，不能用虚构数据补齐 |
| 有界补齐 → merge | 在上述证据上补必要后端/adapter/前端接缝，保留最终设计与契约；超出范围的Planned能力继续记gap | 唯一writer接收责任后实施、运行受影响检查、解决冲突，固定merge SHA并填写交接包 |

完成双向追溯与补齐后才merge；merge后交给 [fresh Astra](fresh-astra-handoff.md)执行build及联调。已有作者测试是输入，不能替代新任务对合流结果的实际验证。

## Astra runtime与前端回溯落实表

| 接缝 | 实施/核对 | 判定依据 |
|---|---|---|
| 静态模块与路由 | 所选UI新增模块进入服务端显式allowlist；导入链、content-type、未知路径拒绝；不暴露任意源码或数据目录 | `app/server/index.mjs`与实际新增模块；新UI静态404应修服务准入，不用前端绕路 |
| Runtime control | 配置CAS/revision、资源来源、上下文recorded/next-run、权限解释与MCP lifecycle实际往返 | `app/runtime/control-contract.d.ts`、`docs/runtime-control/api.md`与`acceptance.md`；schema4按真实契约，非虚构UI字段 |
| 执行链与恢复 | Run启动/工具请求/allow或deny/返回，取消、断线重连、未知外部效果保持unknown | 同一次run/session/request的真实请求与回执；成功UI与持久状态一致 |
| Preview extensions编排 | 选择后的UI消费真实Run/File/Workspace identity；展开/关闭/返回、Escape次序、renderer卸载与fallback保留已有owner | 现有renderer registry、surface/actions与设计选择；Preview不取得Core写权或伪造accepted Artifact |
| 同源Review | question/permission/outcome按已冻结投影；outcome按实际实现验；Proposal/commit只有领域API成立才显示合法动作 | `contracts/review-projection.md`及Core现有契约；UI权限allow不等于成果接受 |
| 品牌与主题 | BR-1加宿主角色token映射；按最终选型检查实际背景、深浅色与窄屏；WK51已收敛为侧栏20px，不恢复已移除的工作页在场标记 | 品牌候选证据+本次集成真实页面；不因品牌fixture通过关闭应用验收 |
| 回溯实现 | 对Fable已接受的Canon/EX来源逐项标preserve/extract/adapt/replace与实际路径；未满足项进入对应gap | 活动WK/EX与`work-surface-boundaries.md`，不重新设计全部前端或依旧context扩scope |

目前无证据要求一次性实现WO-RC所有Planned能力。OAuth、stdio、插件隔离等在实际gap形成后，先做有界成熟机制溯源和接口裁定，再开最小后端工作单。不得因要发布而把所有计划控件一并启用。

## 合流验证与push记录

1. 在隔离集成树锁定最终UI、runtime、品牌和相关文档的SHA；保留活动writer树及其独立数据/端口。双向追溯、补齐和merge后填写交接包，由fresh Astra执行以下build联调。
2. 安装锁定依赖、执行与变更相称的既有测试、启动Web UI；记录源SHA、lockfile、环境、命令、fixture与输出。确认实际新增静态模块可加载后再做浏览器链。
3. 以同一代码版本覆盖首页→Run→工具授权/回答→检查/Preview→停止/重连与控制配置；深浅色、窄屏和关键键盘路径。真实provider按用户现有配置与授权执行，未运行时写`not_run`，不得借deterministic代替。
4. 独立review检查作者未覆盖的反例与边界；失败回到唯一writer或Astra后端责任，重跑受影响检查后收束。
5. 已完成两笔才push当前候选；记录目标remote/branch、local SHA、remote SHA、独立clone结果和仍未通过的产品门。推送授权已由本轮用户给出；不扩展为SE本地9.6发版、公开部署或legacy main替换。

快照必须区分：作者交付、集成通过、独立验证、真实provider证据、远端同步。一个状态不能自动替代下一个状态。

联调后的细粒度材质/层级、motion与hover绘制消费 [UX Polish切片清单](../../research/ux-polish-2026-09-08/astra-polish-plan.md)；先绑定当前合流SHA，再做同条件基线/删除/最小修正版比较。不得以装饰变化掩盖状态或恢复失败。


第二节点接收范围：用户已将WK10a + r2交Astra，后续WK10b / WK11依赖新的合流基线。本轮版面验收遵守交接包的最新用户边界：Desktop优先，composer沉底只属可暂缓的窄宗范式；Continue等位置留Fable后续处置。
