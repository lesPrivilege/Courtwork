# SD-ENTRY 独立节点

输入SD-FIX466bdfd + r2固定796c3a5，机械合接815bcfb。产品固定 `901d5f950daef85ca7e58a470a3d85f7785edd6e`，不合BE41于本节点，不声明主线接受。

采纳card-semantics/entry-grammar原有展示槽与真实Run reader，未接入项普通DIV、无数量、无执行动作；Runtime必须匹配session。适配D1显式opener传递至Entry host；修正换scope仍试图回焦到新条目的遗留路径，sameScope才保留焦点。新增反例覆盖确切opener、同scope重绘与换scope复位。首次测试用了TinyDOM不存在的document.body，修正测试夹具后22/22；不是产品失败。

固定901d5f9全量720/720（full-tests-901d5f9.txt）。作者CUA Chromium152：Activity/Context进入原Run并Escape返回各自data-focus-key；无Run会话Activity/Context变为empty普通行；切scope More复位。1440明暗、1280明暗、390明暗、1024strip展开均无页面横溢。使用actual width与moreOpen核账，不能按截图文件名断言尺寸/展开：早期entry-1280-dark和首个entry-390-dark记录实际1440，entry-390-light/entry-1280-light/entry-1024-light为收敛态；最终明确-expanded与entry-390-dark-return为适用展开证据。viewport曾作用于新开的基线tab，关闭基线/错误tab后重测；未将误投尺寸记录判为窄屏通过。1024 More展开隐藏旧glyph strip(display:none)，与原目录共用滚动；390最后Tools分组在内部可滚动范围，截图仅当前可见区域。

证据与原始JSON均属作者，不冒充非作者真机。SD-FIX原真实200%限于其产品节点；本ENTRY未重做真实200%、forced-colors、147、原生Courtwork宿主、IME/软键盘/VoiceOver。Q1/Q3及EX-IC2B/C、BE42等界限继续保留。未推送/部署、未真实provider。
