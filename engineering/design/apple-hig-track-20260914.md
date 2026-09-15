# Apple HIG · 外部设计规范消费

2026-09-14，消费用户引用的ChatGPT讨论“Apple Design Guidance”（conversation 6aa78148-35c0-83ec-ac0c-9d894ea93fca）。已通过read_thread读取完整1 turn，hasMore=false，无附件。讨论是研究输入；其中外部事实、推论与建议不自动成为产品指令。

## 来源等级与核验

Apple官方HIG列为优先外部规范源，Courtwork的owner合同、UX Grammar和已采用先例仍决定产品行为。官方规范、第三方转译skill、ChatGPT讨论分列；本次读取apple-design skill辅助理解反馈/空间连续性/可中断动效，其代码与参数不作为Apple官方API或当前产品规范。

2026-09-14官方检索确认[Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles)包含Agency；[Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback)讨论界面内状态反馈；[Generative AI](https://developer.apple.com/design/human-interface-guidelines/generative-ai)含生成期间反馈和结果调整指导；[Motion](https://developer.apple.com/design/human-interface-guidelines/motion)将运动与状态/反馈关联。核验范围为官方检索可见内容，未声称所有动态正文逐条读全。

讨论中的2026更新日期、SF Symbols数量/语言数、toolbar最多三组等具体说法未逐项独立核验，不写入强制规则。Context menu此前仅取得动态壳，继续沿对象命令合同记录核验限制。后续按任务读取Loading/Progress、Toolbars、Sidebars、Search、Menus、SF Symbols及Liquid Glass官方对应页，不为登记一次性抓全站。

## 原工单处置

| 输入 | 裁决与消费owner |
|---|---|
| Agency、退出与恢复 | 采用可理解控制权；沿UX-06及既有Run取消/恢复合同。Undo/Resume/Retry须实际能力，不能承诺始终存在；退出popover不等于取消Run |
| 状态反馈靠近对象、减少打断 | 采用，接Copy短暂反馈与Run surface工单；真实事件仍保留。审批条件由原权限owner决定，不因设计参考新增风险模型或绕过ask |
| 具体生成状态 | 采用真实状态压缩呈现，接UX-05；模型叙述不能当Host确认状态。讨论所列queued/finishing等只是候选，不新增持久枚举 |
| Loading与活动动效 | 调整：活动、输出pulse、真实TPS分层沿telemetry合同，断流/未知如实呈现；动画不是存活证明，不伪造进度，reduced-motion保留静态反馈 |
| 后台生成 | 仅有实际生命周期支持时呈现；浏览到别处不赋予后台调度/可靠恢复能力 |
| Toolbar层级 | 采用逻辑分组、关键动作可达与窄屏优先，接既有shell/control-plane；不直接搬按钮顺序或新增无owner的导航动作 |
| Context commands | 接Object Command grammar，共享owner、多入口、可用条件与键盘；不逐row发明菜单 |
| SF Symbols | 仅消费语义/尺寸/状态一致性思路。保留现有Lucide canonical及独立brand包，不复制字形、不启动图标族迁移 |
| Liquid Glass | 后置材质研究；内容阅读面与控制面分层沿现有skin合同。此次不引入全站玻璃/blur或新动效依赖 |

## 执行与验收

本track是原工单的设计旁证索引，不建立另一份roadmap。Access/仓库接入继续当前串行施工；Object Command、Run surface及telemetry各沿原owner排队。实施者在具体交付记录引用所消费的原则与真实先例，验证作用域、失败恢复、键盘/焦点、宽窄明暗及适用的reduced-motion/contrast。

Luna作者检查与非作者验收分列，Chrome人类目验关闭视觉项；Astra仅架构/语义裁决。状态：来源与采用边界已登记，无产品改动、新能力声明或视觉接受。
