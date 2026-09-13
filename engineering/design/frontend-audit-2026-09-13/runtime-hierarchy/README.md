# Runtime 对象详情层级 M1

2026-09-13。Astra 作者；Luna 探索及非作者源码复核。基线 `e9a1c05`，独立分支 `codex/runtime-inspector-hierarchy-20260913`，继承用户已目验的 Settings `4833e11`，未合 main、push 或部署。

## 变更记录

最近实现先例：[Settings M1](../hierarchy-polish/README.md)、[既有 Runtime Control](../../../../docs/runtime-control/INDEX.md)。本片影响 RuntimeRead / Settings 对象披露 grammar。外层沿已接受实色配置面；每个对象标题和授权维度外置，展开详情使用现有 panel/line/radius/space token，最高320px或45dvh，具名可聚焦 group。没有新浮层、Glass、状态或权限。

详情内部按说明与动作、权限解释、记录源码、来源/策略/descriptor顺序阅读。源码取消第三层滚动；窄屏标题与来源换行。position:relative 将源码复制按钮的隐藏可访问文本约束在详情容器，修复长源码撑高 shell。去除说明文字装饰左边线。资源DOM ID使用保留唯一性的编码，避免合法点号/下划线ID相撞。每项阅读位置与焦点在重绘/异步源码完成后保留；切 Session 关闭旧详情；边缘继续正常外层滚动。

## 作者证据

- 基线工具展开/滚动：[初始](before-tool-expanded-1440-light.png)、[向下阅读](before-tool-scrolled-1440-light.png)。相同合成工具对象；基线是未修改的 e9a1c05。
- 候选工具：[展开](candidate-tool-expanded-1440-light.png)、[滚动](candidate-tool-scrolled-1440-light.png)、[权限解释就近显示](after-permission-explanation-1440-light.png)。展开/滚动工具图先于最终 group/源码标题微调；权限解释图已在最终代码重拍，仍属候选。
- 长源码：[1440 light](after-source-1440-light.png)、[滚动](after-source-scrolled-1440-light.png)、[390 dark large](after-source-390-dark-large.png)、[键盘阅读](after-source-scrolled-390-dark-large.png)、[两对象1280](after-two-resources-1280-light.png)。长源码由[独立种子脚本](seed-source.mjs)生成，不含个人数据。源码图是候选扩充数据，不伪称与基线同一fixture。
- [窄屏几何](narrow-geometry.json)：页面390/390，shell844/844且scrollTop0，详情322/322无横向溢出，PageDown后内部298。1440长源码shell900/900；1280两对象各自阅读位置194/298。窄屏焦点进入详情时外层可正常移位，超长对象标题不保证始终完整在屏内。
- 新阅读行为5项；相关 Runtime/Control 22项，共27/27通过，见[日志](runtime-tests.txt)。Settings相邻35/35检查见[日志](settings-tests.txt)。新增读取位置探针在旧基线2项失败，见[原始失败](baseline-reading-probe.txt)；该探针不证明像素布局。
- colors/materials/interaction/shapes、semantic-consumers、product-copy、contrast检查通过。最终源码复核见[luna-review](luna-review.md)。

## 复现及边界

从仓库根启动已有 `engineering/design/attention-ui-handoff-2026-09-13/astra-acceptance/runtime-fixture.mjs`；本轮独立 localhost60792。创建合成 Chat 后对该独立Host运行 seed-source.mjs。浏览器 Settings → Tools & Integrations / Skills，打开详情及 View source；Tab/PageDown、展开另一个对象、切 Appearance再返回。测试：`node --test app/tests/runtime-detail-reading.test.mjs app/tests/runtime-workbench.test.mjs app/tests/runtime-projection.test.mjs app/tests/control-plane.test.mjs`。

未运行付费provider；未重复全量suite。200% zoom、forced-colors、真实屏幕阅读器、真实Host断线与active-run UI状态本片未重新实测，保留原门开放；active-run冻结与scope/policy由相关后端测试覆盖。用户目验待回执，作者截图不代替接受。新增开发者控制面板参考在[独立消费记录](../../../research/developer-control-panel-2026-09-13/README.md)登记，不把本片层级改动称为接入adapter实现。

## 已知异步协调后续

Luna另发现既有inspectSource/explainPermission共用generation：源码仍pending时点击Explain，源码响应可能被忽略且Loading保留。本片修复已完成源码与解释的布局顺序，没有重写请求生命周期；下一Runtime交互片需分离请求令牌，并补并发、失败、切Session后迟到回执测试。本片5项阅读测试不覆盖这项并发，不声称所有异步状态通过。
