# Release readiness · 2026-09-13

Astra实现/集成，Luna有界探索和非作者复核。输入/裁决见[24bd954轮](../../engineering/release/review-intake-2026-09-13/round-24bd954/README.md)。本记录区分固定源码、作者检查和独立审阅；没有远端CI、tag、发行或Pages部署回执。

## 固定测试输入修复

产品基线24bd9545936dd19a498fc6b7eed5de106ac0d5e8；修复提交93864cac4cf85da83dbd78c9d076b747413ef545。CI读取完整历史，五个历史测试共用commit/path/hash manifest，pretest及load入口先验证历史输入。schema3所需五文件按原SHA原字节打包，避免依赖非main祖先b26670c可达；它不是改写旧host。RuntimeStore测试用OS临时目录并在失败/关闭时清理。

独立single-branch浅clone的负例[preflight](shallow-preflight.log)失败；补完整main历史后[验证](full-history-preflight.log)通过（b26670c仍不在clone中，bundled fixture生效）。破坏一个fixture字节的[负例](corrupt-preflight.log)拒绝，随后恢复原字节。身份见[clone inputs](clone-inputs.json)，[安装](clean-install.log)使用npm ci --ignore-scripts。

| 实测 | 结果与范围 |
| --- | --- |
| macOS / Node22.19.0 / Python3.14.2 check:product | [942/942、smoke、links](clean-product-node22.log)，固定93864ca |
| macOS / Node24.13.0 / Python3.14.2 check:product | [942/942、smoke、links](clean-product-node24.log)，同一干净clone |
| 历史定向 | [53/53](historical-targeted-node22.tap)，原断言保留 |
| Ubuntu Actions | 本轮未运行，不从macOS通过推导Linux已通过 |

Luna非作者检查确认manifest五份bundled bytes与原SHA相同、其余四历史SHA可达，临时目录清理正确，无阻断发现；这些是有界测试基础设施接受，不能替代真实产品Release接受。

## 发布面

README生成源保留check:product及并发说明；[supported preview](../../app/docs/supported-preview.md)区分实际能力与Chat/Spark/Attention/Harness方向。源码安装pin与历史截图pin分离，builder验证安装SHA下README、package、支持说明和first-work存在并记录hash。截图、specimen仍保留各自历史source_sha。源码pin只有本地可达时，不能声称公网安装已可用。

[普通build](pages-build.log)、[链接](pages-links.log)、[浏览器](browser/verify.json)36/36通过。作者查看Get整页截图；文本沿已有容器，无新增色值/材质/控件/motion。该浏览器脚本覆盖的桌面、窄屏、键盘和交互范围以原JSON为准，不称完整a11y。后续改动复验另记，不用脚本绿灯代替语义审阅。

## 真实GUI / DeepSeek

用户明确安排真实验证并在独立GUI自己输入key。独立合成数据保存在Git外；本轮不读取或复制credential store。固定93864ca运行Node22.19.0，DeepSeek V4 Flash，保存high；SDK配置与Provider实际生效仍分开。每Run最多8turn、180000ms、compaction limit1，总探针不超过6Run。收集器仅GET合成项目投影并去除token/本地路径；实际记录见[run1](live/run1.json)、[run2](live/run2.json)、[run4](live/run4.json)、[run5](live/run5.json)。

| Run | 实际结果 |
| --- | --- |
| 7ee223b3 · 普通回复 | completed，1turn |
| bf4be3be · Deny ws_write | 精确拒绝，无文件、不重试，completed 2turn；Run完成不等于写入成功 |
| 44b40387 · Approve写后读 | GUI批准out/approved-probe.txt，模型读回，completed 3turn |
| dfba0914 · 取消观察 | 模型很快完成/拒绝冗长填充任务，未成功点击Stop；取消竞态未观察，不重试冒充通过 |
| 505bbd74 · NDA提交 | 0token/0turn，Host扩展初始化拒绝，界面runtime failed；无候选，无接受。定位为reasoningEffort泄漏到严格扩展provider descriptor，需修复并保留失败原件 |

run5不构成Provider质量失败：没有请求/工具事件证据，根因在Host扩展输入校验；也不能把0token误称成功NDA验证。尚无真实候选供正式决定，G1–G3最终路径、G4真实2–4分钟媒体、G5最终源码/公开事实接受继续开放。剩余探针与修复后记录接续本页。

## 新入口反馈

[BE-23/DWB-05](../../engineering/research/deferred-workspace-binding-2026-09-12/recent-onboarding-20260913.md)采用未分配普通Chat进入Recent、发送前可选组织工作区、标题后生成。现global只代表Attention；本轮不把它伪装为普通Chat，不改运行中候选的数据schema。目录连接另有原资源合同。此项已登记、未生产施工。

## 初始化错误修复

修复cb5ca683将Work provider描述符改为明确字段投影，reasoningEffort及capability/provenance保留在原Run/transport层。Luna编写实际Service→Inbound NDA→loopback回归，在独立93864ca worktree复现相同runtime failed；修复后1/1通过，未触碰真实数据/凭据。Astra检查测试并运行Node22相关四文件[10/10](extension-node22.log)，另一次默认Node25定向[9/9](extension-targeted.log)仅为辅助，不替代支持版本验证。该修复不放宽扩展schema或Core候选检查。

Luna发布面复核确认安装pin、支持说明相对链接、生成README和三种源码身份一致；指出开头“调整分工”可能误读为已实现通用多Agent，Astra已在66f46b3标为产品方向并改为调整指令。此前pin的GitHub404仅说明未push，不能发布未可达安装入口。最终build仍是本地准备。
