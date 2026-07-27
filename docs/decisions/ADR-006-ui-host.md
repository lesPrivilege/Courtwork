# ADR-006：UI 宿主与设计系统

- 状态：Accepted
- 日期：2026-07-13
- 来源：`641cf31`、`d9de6f2`、`3fdfa96`、`0690430`、`55e7d21`、`f3f61d0`

## 决定

- desktop 是领域无关宿主：容器、对话、模块栈、preview host、确认门与系统权限桥是通用机制；字段、词表、领域卡片和 renderer 由包提供。
- `work` 与 `chat` 是顶层两面；schema 工作面只在容器化 `work` 中出现，两面以“存入”连接。
- 生成内容与确定事实在视觉上可区分；语义色是封闭集，普通层级主要靠冷调中性色、排版和留白。
- 数据区不做位移动画；反馈只使用受控的 transform、opacity、background-color、border-color。
- 设计真值集中在 `docs/design/tokens.json` 与配套规范；库默认皮肤不得绕过 token。

## 后果

UI 变更需要截图和门禁双证。设计探索、竞稿与历史验收不是规范；被采纳的规则必须进入 design 文档或可执行断言。

## 修订记录

- **2026-07-27（PANEL-BLUEPRINT-1 matrix 首枚，架构追认落痕）**：宿主 blueprint 判别联合的 `kind:'component'` 变体由 `view` 钉死 `'artifact'` 扩形为可持任意工作面 view——扩形属宿主契约演进，`kind` 三态语义未动；配套拒载语义一并入约：**具名工作面至多一枚 blueprint，同名争夺抛错而非 last-wins**。首个消费者 `legal.ReviewMatrix`（`courtwork.review-matrix.v1`，`kind:'component'` 携 renderer 全链）；追认坐标见 desktop ACCEPTANCE 同名节与 2026-07-27 架构追认件。

