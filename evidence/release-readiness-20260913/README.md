# Release readiness · 2026-09-13

当前：9eece81组合Node22完整957/957、smoke与链接通过；真实模型提交一个待审NDA候选，G2人的决定尚待。未发布。

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

[普通build](pages-build.log)、[链接](pages-links.log)、[浏览器](browser/verify.json)36/36通过。作者查看Get桌面截图；文本沿已有容器，无新增色值/材质/控件/motion。该浏览器脚本覆盖的桌面、窄屏、键盘和交互范围以原JSON为准，不称完整a11y。后续改动复验另记，不用脚本绿灯代替语义审阅。

## 真实GUI / DeepSeek

用户明确安排真实验证并在独立GUI自己输入key。独立合成数据保存在Git外；本轮不读取或复制credential store。固定93864ca运行Node22.19.0，DeepSeek V4 Flash，保存high；SDK配置与Provider实际生效仍分开。每Run最多8turn、180000ms、compaction limit1，总探针不超过6Run。收集器仅GET合成项目投影并去除token/本地路径；实际记录见[run1](live/run1.json)、[run2](live/run2.json)、[run4](live/run4.json)、[run5](live/run5.json)。

| Run | 实际结果 |
| --- | --- |
| 7ee223b3 · 普通回复 | completed，1turn |
| bf4be3be · Deny ws_write | 精确拒绝，无文件、不重试，completed 2turn；Run完成不等于写入成功 |
| 44b40387 · Approve写后读 | GUI批准out/approved-probe.txt，模型读回，completed 3turn |
| dfba0914 · 取消观察 | 模型很快完成/拒绝冗长填充任务，未成功点击Stop；取消竞态未观察，不重试冒充通过 |
| 505bbd74 · NDA提交 | 0token/0turn，Host扩展初始化拒绝，界面runtime failed；无候选，无接受。定位为reasoningEffort泄漏到严格扩展provider descriptor，需修复并保留失败原件 |

run5不构成Provider质量失败：没有请求/工具事件证据，根因在Host扩展输入校验；也不能把0token误称成功NDA验证。该次运行尚无候选；后续第6Run结果见下。G1–G3最终路径、G4真实2–4分钟媒体、G5最终源码/公开事实接受继续开放。剩余探针与修复后记录接续本页。

## 新入口反馈

[BE-23/DWB-05](../../engineering/research/deferred-workspace-binding-2026-09-12/recent-onboarding-20260913.md)采用未分配普通Chat进入Recent、发送前可选组织工作区、标题后生成。现global只代表Attention；本轮不把它伪装为普通Chat，不改运行中候选的数据schema。目录连接另有原资源合同。此项已登记、未生产施工。

## 初始化错误修复

修复cb5ca683将Work provider描述符改为明确字段投影，reasoningEffort及capability/provenance保留在原Run/transport层。Luna编写实际Service→Inbound NDA→loopback回归，在独立93864ca worktree复现相同runtime failed；修复后1/1通过，未触碰真实数据/凭据。Astra检查测试并运行Node22相关四文件[10/10](extension-node22.log)，另一次默认Node25定向[9/9](extension-targeted.log)仅为辅助，不替代支持版本验证。该修复不放宽扩展schema或Core候选检查。

Luna发布面复核确认安装pin、支持说明相对链接、生成README和三种源码身份一致；指出开头“调整分工”可能误读为已实现通用多Agent，Astra已在66f46b3标为产品方向并改为调整指令。此前pin的GitHub404仅说明未push，不能发布未可达安装入口。最终build仍是本地准备。

## 真实候选与流式投影接续

修复提交的精确身份以[源码等价记录](source-equivalence.json)为准（短SHA cb5ca683）。正常退出原Host，升级独立clone至该修复提交，保留同一Git外数据；GUI新建Session3079940e并选择原Matter1da563d3。第6Run b293f25e最终completed，5turn；读取原source成功，猜测的artifact引用被BINDING_MISMATCH拒绝，随后模型自行提交一个pending候选，未将buildReview答案注入请求。GUI额外批准合成摘要精确写入，文件记录与正式接受分开。

[原观察JSON gzip](live/run6.json.gz)、[完成态JSON gzip](live/run6-completed.json.gz)保持原导出字节的可逆压缩；[摘要及解压hash](live/run6-summary.json)包含实际用量、候选ID和四项source版本/digest/offset/quote逐项相同检查。最终10,546条assistant.delta中8,541条为空；其余是累积文本快照，不等于2,005个独立正文增量。Luna确认Pi thinking/tool-call原生更新被旧mapSessionEvent误投影为文本事件，存在大量无意义journal/GUI更新；本轮未量化GUI卡顿的独立性能归因。

9eece81修复为仅原生text_delta/text_end进入正文流；无原生type的兼容调用保留非空快照。message_end、工具事件、telemetry不变，旧事件不删除不重写。Luna测试在cb5ca68上1/2（隐藏更新反例失败），修复2/2；Astra检查后Node22定向[10/10](stream-projection-node22.log)。原169b9a1组合检查因这项新修复被主动中止(exit130)，[原日志](integrated-product-node22-interrupted.log)不当完整测试结果。9eece81组合全量[957/957、smoke、6623链接](integrated-product-node22.log)通过。

真实候选已在[GUI审阅页](live/candidate-review-gui.png)展开四条依据，尚无Decision/Artifact。按G2向用户请求真实人审决定；自动化操作者未冒充人的审阅。G1真实模型/工具路径已观察，取消子项仍未观察；G2人审与G3接受后接续尚待，G4真实闭环影片未录制，G5公网pin可达及简历消费未执行。因此本轮修复可以合main，整个公开完工节点仍未关闭。

正式Core、NDA、Service、Chat与work-review-summary路径在真实运行cb5ca68与最终9eece81之间完全相同；adapter流投影及并行Attention UI变化另记，不能声称9eece81已重跑付费模型。用户追加的composer左下附件/workspace分离、Attention仅附件且不限定工作区，已接BE-23/DWB-05；本轮没有上线Recent或projectless身份。

## 最终组合与本地合流准备

完整产品9eece81f1b90729388d4fd4ffec162264d2eaa4c：Node22.19.0 [957/957 + smoke + links](integrated-product-node22.log)；Node24.13.0最后两项修复及相邻链[10/10](final-targeted-node24.log)。Node24全量942/942仅适用于前述93864ca，不冒称最终957重跑。最终[Pages 36/36](browser-final/verify.json)、普通build与links通过；作者查看最终Get桌面截图。安装pin9eece81及其四项Git blob hashes见[source-preview validation](source-preview-validation.json)，历史媒体身份未改变。

本轮独立分支先合main11cfe4a（含另一路已接受的Attention UI02和Court定位登记），唯一架构索引末尾冲突保留双方增量。未改写共享历史，未暂存并行writer的current或历史证据。当前与G2人审回执由最终合流后更新，未push/tag/部署。
