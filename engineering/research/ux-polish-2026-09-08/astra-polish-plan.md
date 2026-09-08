# Astra · build联调后的细粒度polish绘制

本页是研究切片清单，不是已派发工单。按 [index](index.md)定点读source，按 [本地快照](evidence/current.md)找实现；Fable最新选择和合流时真实SHA决定起点。下列PX仅是本页行号标识，不新增WK编号或并行状态账本。

## 联调前先排除结构缺陷

在固定整合SHA `2726805`，`app/web/styles.css:2840` 的desktop media未闭合；先由集成writer核对并修复，在390/1023/1024/1440确认Runtime和composer的规则作用域。若后续候选已修复，记录该修复SHA后继续；此项不是新的视觉选型，不用polish参数补偿错误CSS范围。

## 先做一个完整切片

固定一个合成工作：打开会话→阅读一条长输出→局部操作显现→打开连接卡/检查面→切换tab→关回原位置→继续接收输出。记录同一数据、viewport、theme、输入方式与实现SHA；先把这个切片的画面、行为与解释放在一起，再改变一个变量。

比较三种结果：当前基线；移除被考察效果；最小修正版。若删除后任务判断与操作连续性不变，优先删除。若问题来自错误状态或模块生命周期，先修runtime/adapter，不能以动画遮蔽。

## 切片与具体关系

| ID / 片段 | 可调的最小单元 | 绘制/联调顺序 | 通过关系与反例 |
|---|---|---|---|
| PX01 四种平面 | frame/panel/panel-muted的role映射、边界一条line、shadow只在浮层 | 同一Home/Work截图，先关掉全部浮层与动画；对照浅/深宗与长正文 | 用户能辨导航、阅读、检查，不把背景层画成更醒目的对象；不是给每张卡加阴影 |
| PX02 玻璃浮层 | background alpha、backdrop blur、rim、shadow分别控制 | 空白/稠密文字/高反差背景各开同一popover，先试不透明底，再逐项加回材质 | 浮层文字与边界稳定可读、背景关系可感；无blur仍完整可用；不得模糊前景文字 |
| PX03 modal与非modal | scrim、背景交互范围、focus及层叠，而非一个统一暗幕 | 同位置比较连接popover、真正dialog、窄屏sheet；检查点击外部/Escape/返回焦点 | 非模态检查不让正文失去可操作性；模态背景确实不可操作；opacity不是禁用协议 |
| PX04 消息操作显隐 | secondary toolbar的opacity/visibility、hover区域、focus-within、触屏显现 | pointer进入消息→进入toolbar→离开；Tab进入/退出；文字选中；无hover输入 | 按钮不逃离pointer、不因hover改行高；键盘到达即可见；关键授权/取消动作不能藏在hover里 |
| PX05 hover / pressed / selected | role颜色、内阴影或边线；必要时局部有限位移 | 同一控件展示default/hover/pressed/focus/selected/disabled；快速按下移出再松开 | hover表示可操作、pressed即时反馈、selected离开后保留、focus不被裁剪；按下反馈不能提前提交动作 |
| PX06 触发点popover | 实际placement、transform-origin、可中断的短进退及fallback | 靠窗口四边打开；打开后立刻Escape再打开；resize/滚动；reduced-motion | 进退与实际锚点一致，无可见跳点/闪烁/旧动画留层；显示/关闭和焦点不等待长动画 |
| PX07 segmented与tab | 指示器的位置/范围、选中事实、内容可见时机 | pointer与键盘快速切换，反向切换，重绘/服务回执，再检查窄宽度 | 指示器只反映已选择事实，不改变控件语义；键盘高频路径可以即时；不引入layout抖动 |
| PX08 导轨卡→pane→返回 | 宿主同一identity、tab带与内容展开，尺寸/opacity仅作投影过渡 | 三模块同层级开关；Escape展开→卡→关闭；删除模块/扩展冻结/缺席 | 文档/Run仍是同一对象，正文与选择/滚动不丢；视觉收起不dispose正式owner；未有后端fallback不能画成已可读取 |
| PX09 新输出与状态反馈 | 末尾跟随/离底暂停、局部新增提示、事实状态的文本/图标 | 从底部接收输出→上滚读旧文→继续输出→主动回到底部；waiting/completed/failed | 新输出不抢原阅读位置；waiting不闪成仍在工作；状态词与动作依Host事实，不用微光代替完成回执 |
| PX10 tooltip与局部提示 | 延迟/消失规则、溢出提示、focus出现与指针可达 | 短标签与截断长标签、keyboard焦点、鼠标从trigger移入提示；弹层附近 | 提示补充信息但不代替对象名/必要后果；可关闭、不挡主要动作、移入不意外消失；避免hover即触发业务 |
| PX11 输入/按钮的光学校正 | baseline、glyph实际轮廓、stroke和hit area，而非整体放大 | 16/20px图标与文字、圆形Send/Stop、窗口缩放与深浅宗逐一看 | 点击区足够而图形克制，字重/线重协调；不把44px触达目标误做44px图标；冻结anatomy不重画 |
| PX12 材质/动态降级 | opaque底、清楚border、无位移/无循环，以及隐藏元素的交互处理 | 不支持backdrop、reduced-motion、reduced-transparency、contrast/forced-colors分开测 | 每种条件下对象、动作与焦点仍可判断；兼容性开关不等于设备实测；避免只改一种媒体查询就声称全部通过 |

## 值、结构、行为同时冻结

每个被选片段只填一张卡，内容要足以让不在场的实现者接手：

```text
片段 / 对应现有工单 / source permalink或访问日
合流SHA / 文件路径 / selector或renderer / token及computed值
任务与初始状态 / pointer、keyboard、touch的触发与退出
基线值 → 本次唯一改变 → 为什么会改善具体关系
结构：anchor、overflow/stacking、mount/dispose、真实输入输出owner
行为：持续时间、easing、触发点、中断/重进、焦点/scroll恢复
减少动态/透明、forced-colors和不支持特性的替代
前后同条件画面 + 交互短录像/逐步证据 + 原始测量
消融：删除后丢失的判断；没丢则删
已验 / 未验 / 回退方式
```

当前值由真实候选的computed style与源码共同记录；source示例值与本地值分栏。来源没有给出适用参数时标“待本地校准”，不伪造来自Apple/BoardUI的统一处方。blur半径、alpha、shadow扩散/位移、duration和easing各有不同职责，不把所有参数一起改来掩盖因果。

高频hover、键盘导航与选择优先保证即时反馈；仅为了表达必要空间变化才保留motion。进入/退出可用已有CSS/WAAPI机制时不新增库；只有真实gesture重定向需求且本地机制不足时才比较成熟spring实现。无输入锁定，无动作结束前必须等动画的隐含门。

## 后端联调中的验收区别

- 材质/hover验证：真实合成页面在固定CSS和数据下观察；通过具体视觉关系，不能由属性存在推断。
- 交互验证：需要真实DOM、焦点、事件与滚动；截图不能证明Escape、触屏或中断正确。
- runtime/Core验证：断线、陈旧版本、双击、unknown effect、扩展缺席与active-run冻结必须来自真实契约或明确fixture；polish不可改变结果。
- 性能验证：在目标大小、长内容、多浮层/频繁切换上采样，比较基线/消融/修正版的帧与绘制；不把“用了transform”或平均FPS当作全部顺滑证明。默认不做大面积、持续逐帧blur或预置所有元素will-change。
- 设计判断：与Fable统一语法对齐并交用户四轴；回归通过与视觉选择分别记录。最终桌面壳成立后再校准真实Mac窗口材质、缩放与输入，Web模拟不提前替代该检查。

优先交付PX01–06的一个纵切，再按真实缺口覆盖PX07–12。不得为完成清单给每处都加效果；每项允许结论为“现状已足够”或“删除”。
