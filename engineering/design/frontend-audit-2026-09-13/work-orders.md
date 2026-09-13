# 首轮裁决与消费工单

基线 `ad33118a56ae15f1c3244e97147bd63c234e6916`，用户授权当前main直接施工。Astra裁决/实现，Luna快速探索及后续非作者有界复核。状态随交付更新，不以登记关闭产品门。

| ID / 优先级 | 已确认的问题 / 证据 | 裁决与验收 | 状态 |
|---|---|---|---|
| FA-01 / P1 | 旧54006已断连；当前8847在线X可见，停止合成Host后重开Spark X消失。见01/02/03截图 | 共享 `icon()` 消费由原SVG生成的不可变ESM shape，去掉重绘时外部use解析；保持原图形/名称/尺寸/点击逻辑；在线/断连重开、Escape及焦点返回，源几何逐枚等价 | 已实现；断连浏览器通过；Luna非作者源码/测试复核通过 |
| FA-02 / P1 | Spark短视口滚动到Activity表底部，Close rect top=-137px。见12截图；Usage同构根滚动存在相同风险 | 复用Files“固定header+内部滚动body”关系到Spark/Usage；共享滚动body规则，保留各自内容宽度与native dialog生命周期。鼠标滚动底部仍可点X，Tab可达、Escape返回，重绘保持滚动/焦点 | 已实现；作者浏览器验证及Luna有界源码复核通过 |
| FA-03 / P2 | Attention页面重复YOUR WORKSPACE/标题/口号，未选详情用装饰标题。见08/09截图 | 删除两句装饰性header文本和空详情标题；保留对象名、选择提示、reason/next step/recorded context与真实动作；不更改Core语义 | 已实现；作者浏览器验证及Luna有界源码复核通过 |
| FA-04 / P2 | Memory设置大段重复说明“没有记忆”，并将所有Chat等同Temporary。见07截图 | 简述此设置面能力不可用、Sources独立且保留可用，不作“全产品无持久会话”的广泛承诺；保持零假开关。Keyboard等纯介绍句按同体例精简 | 已实现；作者浏览器验证及Luna有界源码复核通过 |

## 同级归类与保持的差异

- Spark/Usage属于只读观察dialog：对象标题+可见X，scope/filter→view switch→读面；内容solid，实际modal才加scrim。宽度880/1040保留为内容需要（事项行与图表/模型比较），不强求相同像素；共同退出/滚动规则必须相同。
- Files是带版本reader的资源dialog：共享退出稳定性，保留版本、来源、reader返回与scroll恢复。Settings是页面，Back to app不同于关闭临时面；Attention是查询/详情工作区，有返回项目入口及返回items两种明确目的地。
- 同层级一致不等于将filter按钮都标tab，也不把每个界面改成glass。当前material grammar内容solid、两类已登记blur消费者及回退继续有效。
- 较稳定功能定义（Spark副标题）、状态/范围/错误恢复/来源事实保留；装饰口号、重复对象名、重复无能力解释删除或按需披露。图标不能替代需要解释的风险/来源/未知语义。

## 依赖与最近先例

FA-01：`app/web/ui-controls.mjs:icon/setAction`、`tools/ui-vendor/build.mjs` 与 IC-1/IC-8；保持Lucide/域图标pin和license，新增生成输出不引入依赖或新glyph。原静态sprite继续作溯源/标本输出。无后端事实变更，仅静态ESM白名单。

FA-02：`app/web/index.html:#materials-dialog` 与 `styles.css:.runtime-dialog-inner/.runtime-dialog-body`，最近[Files修复](../../research/architecture-node-2026-09-13/ui/fixes.md)。影响placement/scroll/control，保持Spark/Usage各自projection与generation/focus owner，不建立通用状态库。

FA-03/04：`attention-view.mjs:render`、`settings-view.mjs:renderMemory/renderKeyboard`；[copy convention](../copy-convention.md) §1–4。皮肤与Review身份不变。截图为本轮候选证据，不自动替换既有golden。

## 待审计 / 后端反推登记

- FE-NAV-01/02/03：原[导航合同](../shell-control-plane-2026-09-12/navigation.md)继续持有跨对象访问轨迹/恢复缺口。当前Settings左端返回、Attention右端返回的放置差额纳入此单；已实测两级Attention返回焦点正确，不能因此称全局历史完成。
- FA-05（已消费）：Chat产品页删除重复eyebrow/长导语，将三席与说明放入默认收起的About chats；保留New chat、Continue及真实入口。修正会话行居中问题。最近先例为本页Attention编排与原生details；影响copy/disclosure/alignment；无新后端。Home与Attention agent文案列入下一批逐句裁定。
- FA-06（部分已验，P2待消费）：合成Usage日→run→Chat可达；Files r1 reader关闭回原修订且展开/焦点保留，r1→r2 diff可读。Usage下钻缺少返回原图表/触发点的显式动作，接FE-NAV局部恢复工单；保留同一snapshot，返回须废弃迟到响应、恢复触发点和scroll，不需新后端。
- FA-07（已消费）：summary.flow-row文字字符›替换为共享原生SVG chevron-right，旋转表示展开；几何等价与DOM测试通过。最近先例icon()/flowRow；影响icon/disclosure。
- FA-08（已消费）：暗色Usage高值格更亮，原Darker描述失真。改为Higher-contrast cells；不改量尺或数据。证据19/20；最终定向21/21通过；未另拍更新图例截图。
- FA-09（P2待复现裁决）：合成Files双版本比较已显示1 added/1 removed，按钮仍显示Comparing…（24截图）。检查materials-view比较按钮引用与重绘后更新，不能据此称请求仍运行；下一批先加入可复现回归再修复。
- Icon gap台账：当前确认的是渲染依赖缺口而非新图形语义。通用返回/刷新已有文字功能并非必须全部icon-only；需要glyph时先查canonical家族与semantic key，新增图形另记来源/几何/配文/可访问名称。
- 本轮FA-01～04不要求新后端。发现需要新事实的前端面仍先登记最小reader/capability与原owner，合成标本先验证，生产未知/失败态不填假值。

## IA串行接续状态（2026-09-13）

用户新授权及来源见[IA Plan](ia-plan.md)，后续证据见[IA交付](ia-delivery.md)。此段更新上方首批时点：

- FA-06局部Usage返回已实现：保持同一snapshot，恢复origin/view/scroll，退出递增generation拒绝迟到结果；分页不覆盖原图表返回点。真实日→记录→原日期格通过，其他触发点及分页由定向回归覆盖范围约束。全局FE-NAV未关闭。
- FA-09已复现并修复：Files reader隐藏时cancelRequests清空button map，而returnFromFile恢复原DOM，比较完成无法更新按钮。保留该scope DOM引用，session change/reset仍重建；先红后绿回归及同路径浏览器均通过。
- IA-2/3已消费：技术scope/revision披露、默认来源去重、无能力列表披露、Home revision后移、Attention agent空态去装饰。风险/权限/失败保持可见，来源详见ia-inventory与ia-data-surfaces。
- 真实200%仍未取得可核验百分比/截图；本轮Chrome原生菜单工具返回不完整，恢复缩放快捷键已尝试，不能称该项通过。390窄屏与键盘代表路径另有实测。
