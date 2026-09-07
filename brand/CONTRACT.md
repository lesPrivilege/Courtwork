# Symbol contract

## Geometry / material / motion

`geometry/mark.svg` 是新包的几何源；它对冻结 `docs/design/icon-light.svg` 的四枚核心 rect 作 `(x−112,y−104) × .2`，删除应用图标底盘，不改变母题。原始底盘源稿完整保存在 `sources/legacy/`，原 React/HTML 思考组件仅作已披露的历史参考。

五材质共享同一几何：mono 是单色；hierarchical 区分 actor 与 record；glass 使用线性面光、边缘高光及限定范围阴影；depth 加浅层偏移；luminous 在暗色品牌场景增加很薄的局部光晕。玻璃是 SVG 内部材质模拟，**不折射或模糊页面背后的 DOM**。本单不引入 displacement/WebGL/截图式玻璃。

所有新作用域/检索/对照线是明确的关系层，不能变成第二套核心品牌几何。16–24 px 不使用材质滤镜；普通 wordmark 用 mono，日常信息区不自动循环，不让被阅读的内容随图形移动。

## Host-owned state

| 属性 | 值 | 责任 |
|---|---|---|
| concept | summon / take-floor / write / retrieve / scope / commit / review / withdraw | 选择示例结构与默认动词 |
| presence | available / present / active / absent | 参与者在场状态；absent只隐藏actor，record不消失 |
| authority | none / requested / scoped / revoked | 准入事实由宿主提供；徽标与边界只显示，不授权 |
| activity | idle / thinking / complete | 宿主的当前活动状态；complete不是普遍的成果接受 |
| material | mono / hierarchical / glass / depth / luminous | 场景材质选择，不作为真假/合法性判据 |
| theme | light / dark | 明确背景约定，不读取应用全局状态 |
| label | 文本 | 可访问名称；装饰用途由消费方作正确隐藏 |

`play('commit')` 不将 `activity` 改为 complete，也不发送命令。只有宿主将 commit concept 的 activity 设为 complete，已落定的静态标记才显示。这里表示宿主已经提供了相应事实，不证明本项目实现过真实 Review → commitment。

## 八个动词

| 动词 | 动作 | 必须保持 |
|---|---|---|
| summon | actor轻移入、变清晰 | record静止 |
| take-floor | actor极轻抬升，peer层暂时退让 | 不改变权限；不弹跳 |
| write | 三行左至右依次揭示 | stem静止；不表达论证有效性 |
| retrieve | 来源点沿可见路线回流 | 来源层不被当成accepted evidence |
| scope | 边界揭示 | 显示与权限分离 |
| commit | proposal层下落到稳定底板 | 状态先由宿主接受；无自动成功 |
| review | 两层对照趋齐，修改线显露 | 原对照可追溯；不自动删除diff |
| withdraw | actor移出淡去 | record与trace持续存在 |

## Motion lifetime

功能为状态指示；默认每次140ms，书写40ms错开，总220ms；仅显式解释模式440ms、100ms错开，总640ms。采用既有强 ease-out 值 `cubic-bezier(.23,1,.32,1)`，WAAPI 只驱动 transform/opacity/clipPath；静态阴影和blur不逐帧动画。不使用长期 rAF 或轮询。

下一次 `play`、任何属性更新、`stop`、卸载、document hidden、系统切换 reduced-motion 都取消旧 animation；旧 Promise 以 interrupted 返回，不再改变新播放标记。`prefers-reduced-motion` 初始启用时直接显示宿主最终静态状态，不播放。无悬停自动运动；触摸与键盘只显式播放说明，不将按键导航做成动画。

语义回调只发 `symbol-motion-end`，不发 work.completed、permission.granted 等业务事件。CSS/SVG不能自行声明它们。

## Compatibility

目标为支持 Custom Elements、Shadow DOM、WAAPI 与SVG的现代浏览器；实际测试矩阵见 evidence。forced-colors 将复杂填色收敛至 CanvasText；静态SVG可独立使用。Motion/Rive/Figma API 只作为来源模型，不是本包依赖；当前 fresh 是原生JS，不依据旧React实现选型。
