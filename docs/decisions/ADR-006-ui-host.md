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
