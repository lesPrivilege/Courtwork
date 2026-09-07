# CW-BRAND-01 acceptance · 2026-09-08

Astra 接受本品牌单在声明范围内交付，可进入 fresh 集成；用户后续审美取舍可继续调整材质，但不影响独立包与迁移分工。

- Luna 非作者检查：13/13，见 `independent/court-symbol.acceptance.md`。使用 Node DOM/WAAPI stub；权限不自授予、大小降级、XSS/ID、取消/卸载/reduced-motion/后台行为。
- Astra 实际 Chromium 152 检查：10/10，见 `browser-results.json`。native SVG、三行0/40/80ms顺序（最长220ms）、native WAAPI完成/打断、属性更新、卸载、withdraw后record保留、commit不改变宿主状态、无动画残留、多实例ID与glyph降级。
- 首轮浏览器检查9/10，唯一失败来自测试用严格浮点相等判断：浏览器返回140 / 180.00000000000003 / 220.00000000000003ms。将测试误差界定为0.01ms后复跑10/10；未修改产品时长或放宽300ms产品门。首轮结果保留 `browser-results-first.json`。
- 1440与390两宽度、深浅色实际浏览器检查，未见横向溢出；16/20/24px实际为hierarchical，32/48/64px为glass，组件data-error=0。截图：light-1440、dark-1440、light-390、dark-390。
- 深色真实页面withdraw最终actor opacity=0，三行record opacity均为1；luminous ghost已归actor层，不残留独立actor光晕。
- build生成40个可编辑静态SVG；脚本/链接/本地模块可加载，无新增npm依赖。

未执行：系统级reduced-motion设置切换、forced-colors实测、Safari/Firefox、真实读屏/物理触控。减少动态路径已经过独立fixture验证，但不冒充操作系统切换实测。该包未接应用Runtime、不替代UI独验或真实provider/专业工作验收。
