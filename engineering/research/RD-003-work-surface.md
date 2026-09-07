# RD-003 · Context、Review 与最小 Extension

状态：designed；实验未运行。方案作者：当前 Agent；执行者、Reviewer：待指定；采纳者：用户。

## 问题与样本

一个薄 GUI 是否能从同一正式状态呈现运行、候选、证据和裁决后果，并在换 Session 后继续工作？首选候选场景为带来源的调研备忘录；最终样本由用户裁定。Courtwork 的法律工作包与 Career kit 的 ATS/规则研究用于构造责任结构不同的后续场景，不复制个人案件或投递信息。

先用合成或明确获准的脱敏材料验证机制；专业质量结论需真实代表样本与有资格 Reviewer。固定错误清单但对 Reviewer 隐藏：来源不支持、错版本、否定遗漏、未完义务被宣称完成。

## GUI 与 Extension 最小输入

GUI 的信息结构可从 Matter 列表、运行/问题区、Candidate + Evidence + Review 区开始；具体组织由 [Design 候选](../design/directions.md) 比较，不提前冻结三栏布局。trace 按需展开。基础输入、附件、配置、长输出、停止、断线与错误须覆盖 [GUI 完成面](../design/completion-surface.md) 的适用 P0 路径，不能只实现 Review 面。Extension manifest 声明 identity/version、适用范围、Contract、工具依赖、权限、Context policy、renderer、验证器和退出方式；首版固定 preset，不做动态组合或插件市场。

未覆盖任务返回明确 Candidate-only/人工路径。允许只有 catalog 描述而不可执行的包，但 GUI 必须显示不可运行，不能把预览当完整 Extension。

## 验证顺序

1. 静态 Review packet：比较非结构输出、完整 trace 与结构化 packet；记录发现错误、补证据、判断时间与未发现问题。首次可作探索，不据小样本给稳定提升百分比。
2. Context：同一状态编译工作集，检查 active version、义务、冲突、否定、来源；比较 State-only 与按需 History，不能以 token 更少代替充分性。
3. 运行连接：刷新/断线/重复事件/过期页面/取消迟到；GUI 重新取权威 snapshot，pending 项不丢，重复点击不重复提交。
4. 裁决闭环：候选→退回/补证据→修订→接受→新 Session；检查新版成果和未完义务先进入下一 Context。
5. 更换 renderer 或直接 API 作出同一 Decision：验证状态后果一致。增大来源和能力库存，观察遗漏、跨 Matter 污染及激活权限。

步骤 1–2 可独立研究；步骤 3–4 的实际联调依赖 RD-001/002 的相关门槛。[Prototype D0–D3](../design/prototype-plan.md) 的视觉和状态模拟可提前并行，暴露需求后返回本 RD；D4 才接真实链。用 mock 展示不能冒充真实 runtime、系统焦点/可访问性或模型链通过。

## 接受与范围

Reviewer 必须知道接受的是哪个版本及尚未解决的问题；模型运行结束不触发完成。单人 demo 只证明声明条件下闭环；第二任务族与第二宿主另给配对记录，不能复用同一改写样本声称独立验证。

## 证据与未完义务

尚无独立Review任务执行记录。合成样本、错误清单及brief已有产物（见下文）；等内容视觉、用户选择、交互Prototype与盲测仍未通过，不预先采纳组件库。

## 2026-09-05 · 输入与D2静态候选

MVP04/05已交付 [合成样本（历史路径：`../mvp/execution/samples-v1.json`）](../migration/2026-09-08/evidence-index.md)、[Review脚本（历史路径：`../mvp/execution/samples-and-review.md`）](../migration/2026-09-08/evidence-index.md) 与 [fresh brief（历史路径：`../mvp/execution/design-brief.md`）](../migration/2026-09-08/evidence-index.md)。有独立来源hash/坐标检查，版本变更后需重查。未运行人的盲测判断任务、模型链或GUI操作。

D2三方向各有四状态静态图，见 [manifest（历史路径：`../mvp/execution/design-candidates/manifest.json`）](../migration/2026-09-08/evidence-index.md) 与 [作者自检限制（历史路径：`../mvp/execution/design-candidates/assessment.md`）](../migration/2026-09-08/evidence-index.md)。实际像素不足预设viewport、缩短内容、生成来源文字和状态偏差尚未通过独立检查。用户偏好待答，不据此关闭09/10/11，不宣称已消融得到最小界面。
