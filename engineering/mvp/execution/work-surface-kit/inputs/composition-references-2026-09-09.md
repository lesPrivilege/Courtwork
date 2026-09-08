# 版面参考与 composition law 输入（2026-09-09，用户转交，"仅供参考"）

两张成熟对照图（Fable / Cowork Home；ChatGPT Work）与一份版面法则草案。原图未入库；按可观察规律登记，裁决见 [intake-round-3 §4h](../intake-round-3.md)。

## 参考 A · Fable / Cowork Home

消费：**纵向重心**。大面积静区 → orientation → greeting → composer → context row → 32–48px → Scheduled / Continue / modules。dashboard 内容（Scheduled）出现在 composer 下方，不做成巨大 card；composer 不巨大，靠外部留白取得 prominence；Scheduled 不为"有数据"撑满全宽（ragged layout / intrinsic sizing）。

不消费：人格化 greeting、serif hero、左栏全摊历史会话的高密度、Cowork / Chat toggle。

登记标签：**Home vertical composition / composer prominence / modules-below-entry**。

## 参考 B · ChatGPT Work

消费：**进入工作后 Home 的一切消失**——只剩 navigation + reading / work + composer + 可选 contextual surface；composer 不是 hero，而是 reading column 的终端控件，正文很长时仍是明确底部锚点，既不缩成 toolbar 也不压迫正文。

登记标签：**active-work reading measure / bottom composer / dashboard evacuation**。

## 版面法则草案（原文要点）

三种 composition state：Home = 大面积静区 + 单一入口；Dashboard = 可组合背景信息；Work = 持续阅读列 + 底部输入 + 可选 contextual surface。**Home 是安静的工作入口，Dashboard 是可组合的背景信息，Work 才是产品主体。**

Home：composer 附近形成重心，dashboard modules 从它向下展开。1440×900 主区：顶部 orientation 80–120；composer 主区域 180–240；composer 宽 760–880；本体初始 92–112，输入增长再扩；下方主内容自页面高度约 48–55% 起；cards gap 16–20；大区块 gap 32–48。

Dashboard：card 是模块不是页面骨架；card 只承担"可独立理解的模块"与"可编排 / 隐藏 / 移动 / 展开的单位"两职责；card 内可以是无框内容，不做 nested card；Calendar 窄时 compact card，展开进入独立 surface。

Work：dashboard 全部退出；reading column 700–780 一级；composer 沉底与正文同 measure；Work Surface / Outputs / Review / File 二级；右侧 contextual surface 有内容才出现（collapsed floating card → expanded）。

层级：L0 canvas / 大留白最弱；L1 thread / composer / active work 最强；L2 dashboard card / floating work module 中；L3 overlay / expanded inspector 强但临时；chrome 稳定低对比。判断新 surface 的唯一问题：它是否真的跨了一层。

Composer 两种 variant，同一 primitive：

| | Home | Work |
|---|---|---|
| 角色 | primary entry | continuation control |
| 垂直位置 | optical center 附近 | viewport 底部 |
| 宽度 | 略宽于阅读列亦可 | 与 reading measure 同宽 |
| 初始高度 | 96–112 | 80–96 |
| 周围留白 | 很大 | 紧随 thread |
| dashboard | 下方可见 | 禁止出现 |
| controls | 可较完整 | 压成单层 |

机器可检查约束：Home 首屏 composer 中心不低于主区高 55%；composer 上方非 chrome 内容总高 ≤180；上带最多一个主要 module row；首屏下半部必须可见 Continue / work module；Work 态禁止渲染 Home dashboard primitive；card 内禁止无语义 nested card；同一 row 遵循 one-row anatomy；右侧 surface 出现时正文 measure 不低于约 640，不足则切 overlay / collapse。

运动方向：Home 从中心向下展开；Work 从顶部向底部推进。
