# DF-03 / DF-05 · 长任务 coding dogfooding

2026-09-14后续环境探针：用户将P1 composer真实仓库工单贴回CW，Agent报告engineering不可达、仅5个out产物，且无git/exec/browser，正确未开工。这是当前托管workspace能力边界的真实反馈；不归因为模型coding不足，不通过扩大prompt绕过。P1改派本地隔离施工，结果不计作CW内部仓库编辑证明。仓库接入沿RD-006/DWB，测试执行沿DF-04/RD-009继续；独立合成产物dogfood证据仍有效。

2026-09-14，Astra任务裁定，Luna独立规格/oracle与复核。产品基线main `7e1a1ff047721e1ca6c871deba7f367ccea55a06`，原文档writer保留。

用户配置真实key后授权开始较长、边界清楚的coding任务。本轮采用已保存DeepSeek V4 Flash / high / openai-completions，Pi0.85.1，独立8859实例，纯合成任务及托管workspace。首实现、至多一次反馈修复及一次接续；Host每Run既有40 turns/600秒限制。这是执行上限，不是硬费用保证。

目标是零依赖JS任务依赖图调度库：校验、稳定拓扑排序、ready计算、失败阻塞传播、测试与交接。具体接口由spec.md冻结。CW模型写out/产物；Luna编写独立oracle，外部核查者执行。现有CW无DF-04检查执行器，故此轮只验DF-03产物与DF-05接续，不把外部检查写成Agent自运行，也不声称完整coding验收。

现有owner/先例为workspace-tools、文件版本/Artifacts、Host Run事件与DF既有外部oracle路径；无产品改动。反例覆盖无效输入、循环、重复/未知依赖、稳定顺序和终态传播。产物在运行前审读，只在独立合成工作目录运行、无需依赖安装或网络；普通子进程不称sandbox。

浏览器控制三次连接超时，8859服务HTTP200且configuration ready。为继续授权任务改用同一Host HTTP API创建Session/发Run，结果可由原UI查询；不声称GUI发起或本轮视觉验收。未读取key/凭据文件，API仅读取configured状态。

用户随后选择手动loop paste并回报结果。状态：待用户粘贴；仅创建空Session，未提交Run，session.json中的commandId仅预留、未派发。后续以用户提供的实际Session/Run为准，不对预建Session自动补发。本轮没有人的Core Decision。

## 首轮实际交付与外部检查

### v2复验

修复Run `6b4e9527-3988-4194-807e-ff33fbc5dc9f`，11 turns；五文件固定于delivered-v2/，身份/hash见observed-v2.json。原54测试文件字节不变，新增回归实际16项（模型报告10项有误）。Astra审读diff及回归后外部Node25实际执行70项：69通过/1失败，见self-tests-v2.log。两个实现根因已消除；剩余scheduler.test.mjs:164测试同时制造重复ID并断言第一错误为unknown，原合同不要求这种错误优先级。处置adjust：将输入修成单节点`graph(['a',[' a']])`以专测精确ID，不修改生产实现迎合错误断言。旧报告将全部10失败归为两个实现根因不完整，本条补正这一测试自身缺陷。尚未取得测试修订版，不称全部通过。

用户在原Chat手动提交，实际Session `c4d7a7c6-5d57-44c0-b3c0-9ff9f3d2619c`，真实Run `4f19530c-be78-4cd3-a12d-e35cd82423b6`，DeepSeek V4 Flash/high，13 turns，04:02:24.872Z–04:08:08.414Z completed。预建空Session未运行。Host提供的4文件bytes/hash与用户报告一致，保存于delivered/，身份/usage/版本见observed.json。

Astra审读实现和测试无I/O、外部依赖或命令调用后，以最小环境在固定副本执行Node v25.9.0自带测试：54项、44通过、10失败，退出1，见self-tests.log。两个已复现根因：未知依赖进入Tarjan导致意外TypeError；逆拓扑读取尚未计算的祖先blocked导致传递漏报。按原任务adopt，处置为交回产品模型修复，见repair-prompt.md；本地核查者不修改delivered原件。真实文件产出成立，正确性尚未通过；测试由外部执行，DF-04仍未实现。

## 2026-09-15 归档说明

`session.json`是预建空合成Session的固定创建API回执，预留command未派发；不是当前RuntimeStore或可恢复的运行数据。其中临时workspace路径仅保留采集来源，不作为读写、重放或本地接续入口。实际交付仍以observed/observed-v2的Session、Run与文件hash为准。

`delivered/`与`delivered-v2/`分别就是当时的`out/`根目录，原模型README中的`out/...`相对于当时托管workspace。复核归档时进入相应目录，使用该目录下的文件名运行，例如v2：`node --test scheduler.test.mjs scheduler.regressions.test.mjs`。原交付README及失败测试字节未改。
