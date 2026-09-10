# R2-SD03 · 先立入口，再接事实

用户21:43明确入口体例先于稳定业务语义，可渐进呈现或保留兜底行；覆盖此前“未接类别只留文档、不出现在生产目录”的局部策略。21:50指出紧凑模式旧卡暴露，本片同时修正。此授权不扩展ChatSpace/composer、后台能力、域状态或部署。

## 呈现合同

常驻已接对象仍用原卡；其后仅一条默认收敛的More。展开为Work / Information / Tools分组，内含Activity、Tasks、Explore、Changes、Context、Sources、Browser、Computer use。分组与名称是可修订展示槽位，不成为Task/Source/Thread等领域同义词；不重复登记后端能力。未来修改分类沿本表与已有语义登记共同更新，不从视觉名称推导authority。

一条入口有三种深度：名称及当前可读性；按需局部信息；明确打开原reader。尚无数据/reader的条目是普通文本行“Not available yet.”，不是disabled执行按钮，也不补数量。当前Activity与Context可读现有Run reader，其文案说明阅读位置；无Run时“无Run记录”，不是能力不存在。零对象、未读、读取失败、版本不兼容与未接入分开。

## 可消费接缝

生产[summary-disclosure.mjs](../../../app/web/summary-disclosure.mjs)导出`surfaceEntryDefinitions`与`createSurfaceEntryDirectory({getSnapshot})`，已由[app.mjs](../../../app/web/app.mjs)使用，无动态代码加载、后端注册或新依赖。

`getSnapshot()`返回`{schemaVersion:1, scope, entries}`；scope由host给当前Session与读代际。`entries[id]`仅限已登记展示槽：`state`为ready/loading/empty/error/unavailable/unsupported，`detail`为安全纯文本，`identity`为owner对象身份，`revision`为实际已提供版本（没有则不补），`open`为host注入的阅读函数。缺槽使用兜底行；未知schema/state不能执行；ready无身份/reader也不生成按钮。未知id不自动冒出导航项。

点击前重新取snapshot，schema/scope/identity/revision和ready必须仍匹配，才调用最新host reader；无缓存权限、乐观接受或写动作。读取/权限/取消/错误/renderer生命周期留给原owner与host。后续producer接入需同时提供真实映射、错误/空/不可用语义与独立测试，不因填一个open函数就声称能力后端完成。目录自身只记当前scope的展开与焦点，换scope复位。

## 响应式修正

宽屏More与既有模块共用一个目录边界。紧凑模式展开More时隐藏原glyph strip，防止外层加宽把旧strip拉成空大卡；收起后恢复原入口。窄屏sheet也用同一分组目录，去掉原每模块一张浮卡的边框/阴影，保留sheet标题/关闭/焦点与内部滚动。展开目录可能覆盖紧凑聊天区，属于显式按需阅读；不据此改变正文/composer尺寸或新增modal权限。

## 证据

36项针对通过，包含兜底无按钮、未知版本、注入reader迟到/换scope/换revision、展开记忆。颜色/交互/材质/形状lint通过。作者真实CUA：1024旧glyph strip不再显示、单一目录且无页面横溢；Activity进入原Run，Escape返回surface-entry:activity并保持More；1440目录共存；390内部卡无独立阴影/圆角、外层滚动且无横溢。此轮浅色有界检查，未重跑全部明暗/高对比/200%矩阵，不称独立视觉接受。修复前图作为反例保留。
