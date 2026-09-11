# Frontend node · 2026-09-12

本节点收敛 Claude ONE-SHOT 1–5、用户侧栏/图标/红色澄清、统一示例预览和最后发布面。Astra负责消费、集成与裁决；Luna负责有界源码、原生截图和预览反例复核。目标是一个可单独交接并进入真实 API 验证的 Web UI 节点；长期后端与原生宿主门不随分支合流消失。

## 接收与修正

| 面 | Astra裁决 / 固定实现 | 证据与边界 |
|---|---|---|
| 图标与侧栏 | 消费 Fable方向A；接入静态Expert身份、Matter对象glyph；Home/New同排、横向hover范围和层级收敛 | [包及来源](../../design/product-icons-2026-09-11/README.md)、[侧栏合同](../../design/sidebar-product-model-2026-09-12/README.md)；Expert保持Planned，无伪路由；Matter不代替Project目录 |
| Chat与次级chrome | 接收53900a3及集成后的完整Chat页、安全矩形与工作面切换 | [原返件](../../research/claude-publication-return-2026-09-12/RETURN.md)108/108仅浏览器宿主包模拟；AppKit命中/拖拽/VoiceOver保留 |
| 控制体例 | 0768822按用户澄清撤去segmented红框，普通选项中性；红色switch on、Review、danger与diff各有职责 | [最新裁决](../ui-publication-closure-2026-09-11/DECISION.md)、[源/视觉证据](../../../evidence/publication-integrated-20260912/README.md)；不改双列diff行号 |
| 预览与真实工作 | 80f433c/a0221b8消费反例修复；4412391简短banner；004c148文档校正 | [有界复核](../../../evidence/publication-integrated-20260912/non-author-preview.md)；按匹配admission receipt退出、真实汇总不掺示例、示例ID写入隔离；无runtime静态壳仍不提供离线App |
| 导航提示 | ea6449e使用既有provider右侧placement，不遮下一行 | [原生复现及修正](../../../evidence/publication-integrated-20260912/navigation-tooltip.md)；保留hoverability/键盘/Escape |
| Figures与Pages | 消费F1–F5及叙事；2effc32过时检查更新已合流 | [媒体及浏览器验证](../../../evidence/publication-integrated-20260912/README.md)；13组明暗原生图，原1397b99批次留档；36/36当前产品页检查通过 |

原始RETURN/source.zip/source-manifest不改字节。原RETURN的预览completed触发、四项旧检查失败、尚未采集最终媒体等描述作为历史来源保留，由本节点的实际修正与回执覆盖。

## 分支裁决

- Courtwork的claude/ic2-controls-b与claude/publication-final-v1保留真实merge ancestry；合流前diff与tree核对证明没有重新引入被后续修正的源码。其他已消费开发分支按当前main祖先证明清理。
- Frozen Fresh 不重新合入当前实现。`archive/fresh-development-retired-20260912`固定34a87c2b92dc5819798ccac64b859fd9810da42e，覆盖本地b0173de/3926a5e和远端旧开发头；已推送并核对该tag后才退役旧开发ref。原archive refs保持。
- detached c2067ea的CS01/CI-BF handoff是NOT_READY合同/证据候选，保存在`archive/cs01-cibf-unaccepted-20260912`；2361a83是被e65cac1/d6c75ef重新实现取代的Chat WIP，保存在`archive/chat-actions-wip-20260911`。不把二者补合为产品实现。
- SE仅剩DSH observation索引分支有独有材料：Astra按index-only候选消费PI23，不把供应商说法升格为事实。SE本地main合到158de6f782eedf1697a7a1610fca1b17f6140b8e，三个来源校验通过；Canonical/Practice/CHANGELOG字节保持。删除7条已合本地开发分支，见[前态](se-branches-before.json)、[清理回执](se-branch-cleanup.json)。SE未push/build/release；Paper部署状态仍沿既有026d5cb接受。

已完成工单的worktree仅解除开发分支绑定；文件、未提交改动及历史截图保留。Courtwork是唯一持久开发入口，SE是论文来源；不新增Fresh开发线。当前PR状态：CW#1已merged，#2已closed且非merged；SE无open PR。Astra本地消费裁决不篡改历史PR状态。

## 进入真实runtime验证

用户自行在合流后的main Web UI配置真实连接；[定向prompts与观察标准](RUNTIME-VALIDATION.md)覆盖流式/消息、同Chat上下文、写入授权、版本、资源开关、停止、Work候选与纯UI。当前自动回归只使用独立合成目录和本地loopback，没有付费请求。

## 仍开放，另有owner

Session-turn指标契约、Spark受限profile/BE-41后续、跨provider/Memory/handoff、Expert实际routing/release/rollback、人类disclosure editor、原生AppKit/VoiceOver及长期G1–G5仍按各自合同推进。Run数不改称模型轮数，执行成功不等于候选被接受，静态Planned图标不等于能力已启用。真实200%浏览器缩放与全App forced-colors/reduced-motion矩阵未在本节点完整独验；Pages模拟检查不替代这些项。
