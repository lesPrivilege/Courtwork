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

- **2026-08-07（GENERIC-PACK-1 清账，架构落痕）**：component blueprint 增可选声明 `handlesEmpty`——产出缺席时仍进 renderer 并收到 `payload: undefined`，空态归 renderer 画；不声明者照旧落宿主空态。首个消费者 `courtwork.risk-review.v1`：`revision` 面在产出到来前是场景起跑面（选主合同、填标的、恢复上次），非「尚未生成」。**拒载语义一字未动**：具名工作面至多一枚 blueprint、同名争夺抛错、payload 漂移仍由 `safeParse` 整面拒绝——本旗只解「空态归谁画」。红证 M13（撤 `handlesEmpty` 即单测红）；坐标见 `apps/desktop/specs/GENERIC-PACK-1.md` 步骤⑤与 desktop ACCEPTANCE 同名节。同票四枚具名工作面（timeline/graph/matrix/revision）全部走 `kind:'component'` 全链，App if 链清零；具名 view 的页签标题与默认落点入宿主注册表（`HostNamedViewPresentation`：缺 `label` 整条派生显式失败、`preferred` 至多一枚第二枚拒载）。

