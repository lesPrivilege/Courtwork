# Harness前后端接线与验收

本文件是[逐模型自适应登记](README.md)的施工差额，沿现PV/provider/Runtime owner。Astra定架构，Luna只读查证本地main `135492c7d7cf3c0ac634f9248c79530972c53004`；当前分支文档基线 `69c1a5c`。后续作者开工时必须重新读真实HEAD；以下是固定版本事实，不从历史交付状态推导今日源码。

## 已实现基础与实际缺口

| 当前源码 / 合同 | 固定版本事实 | 后续差额 |
|---|---|---|
| `app/server/service.mjs::getProviderModels`、`provider-connections.mjs` | catalog连接域为fake、DeepSeek、OpenAI；另有独立 `conn-*` 兼容连接，GET目录只投影known且ready身份下的安装Pi本地catalog与已注册连接模型 | Anthropic/Gemini官方研究不等于本Host已有原生连接/adapter准入。分别登记，不能把全Pi provider集合画成已可用 |
| `provider-fields.mjs`、`provider-connections.mjs`、`pi-session-runtime.mjs` | 自定义模型reasoning是true/false/null；注册只传布尔值；Pi在缺少精确thinkingLevelMap时可从true生成通用梯子 | 最小缺口：手工“Offers reasoning effort”不能证明具体档位，却会成为supportedEfforts；需要逐连接/model/API的精确能力来源与wire映射 |
| `app/web/model-picker.mjs::createModelPicker` | 消费supportedEfforts/defaultEffort，默认medium；保存选模时提交计算后的effort | 未知能力不出档位、不自动提交medium；缺省、关闭、明确档位分开；调整同一picker，不新增平行控件 |
| `app/web/provider-config.mjs`、Settings投影 | 已有共享provider-config装配，PUT仍是整体替换；picker并行读取目录/config/connections | 共享投影解决字段遗漏，不解决跨标签旧快照覆盖。增加预期版本校验，并使目录/配置能力版本可核对 |
| `service.mjs`配置队列与Run准入、`store.mjs` | Host-wide单配置作用于未来Run；配置/创建Run经过同队列；active Run时配置修改409；run.provider冻结descriptor | 继续保留队列和冻结；并发排队本身不防陈旧完整配置覆盖。当前Run输入无per-turn model/effort override，不能伪装成已有 |
| `providerConfigVersion`、`credentialGeneration`、verify receipt | 已有版本与凭据代际，并据变化判旧verify失效；GET config未回供CAS的版本、PUT未校验预期版本 | 首先评估复用现version作粗粒度CAS；它受任意连接变化影响，可保守多冲突。若改config-only revision另给迁移理由，不直接新增第二账本 |
| `pi-session-runtime.mjs`、`request-telemetry.mjs` | requestedEffort取descriptor，现effectiveEffort取Pi session.thinkingLevel；Provider返回model和SDK observedModel已经区分 | Pi选定档位属于SDK/Host配置，**不是Provider已证实的实际effort**。保留旧字段兼容，新增明确来源/可观察性，不把provider未返回值补成同值 |
| BE-17/18目录probe、BE-39已保存连接verify | 前者探目录；后者显式发一次短请求，有版本回执与错误分类 | 成功不证明全部effort/tool/streaming/multi-turn；按参数检查需独立request shape与覆盖证据，不扩大既有verify文案 |

相关现实现：[service](../../../../app/server/service.mjs)、[字段](../../../../app/server/provider-fields.mjs)、[连接](../../../../app/server/provider-connections.mjs)、[store](../../../../app/server/store.mjs)、[Pi适配](../../../../app/runtime/pi-session-runtime.mjs)、[模型选择](../../../../app/web/model-picker.mjs)、[配置投影](../../../../app/web/provider-config.mjs)、[telemetry](../../../../app/runtime/request-telemetry.mjs)。链接按当前检出供定位，精确事实以本节固定SHA为准。

## Adapter → Host → UI的数据合同

这是已有接口的扩展需求，不是已冻结或已实现的新生产schema。实现时由原provider owner决定最终字段名/迁移。Adapter不提交DOM或脚本，Host只接受闭集数据形状。

| 内容 | 必须表达的事实 | 原责任 |
|---|---|---|
| 身份 | connectionId、Provider协议身份、model原始ID/已知revision、API格式、endpoint依赖、adapter版本 | 连接/Runtime；UI不靠展示名解析 |
| 能力 | 每项kind：离散enum、thinking模式、token budget或不支持/未知；合法值、顺序（若有）、单位/边界、默认/省略/关闭语义、条件互斥与工具/API限制 | Adapter解析官方或上游capability，Host校验；值不由前端制造 |
| 来源 | upstream metadata、固定官方合同、SDK registry、人工精确声明分别标明；文档/registry revision、发现时间、依赖版本与检查覆盖 | Provider owner；手工或SDK来源不标为上游协商 |
| 可操作性 | 当前连接可用性、adapter是否能编码、来源是否过期/冲突、不可用原因、允许的配置作用域 | Host准入；UI投影不扩权 |
| 选择意图 | 当前模型、合法设置值或明确省略、expected配置/能力版本 | 现provider-config命令；仅保存不自动发探测 |
| 编译与绑定 | requested意图、解析后native字段的无密钥摘要、adapter/capability/config版本、run binding | Runtime在网络前冻结；不得保存Authorization/header secrets |
| 观察 | 请求成功/失败、Provider实际返回的model/设置/usage与其来源；未返回设unknown | Adapter解码＋现telemetry，不能从延迟/措辞/思考token倒推配置 |

Adapter内部可采用 `discover / describe / validate / encode / observe` 五项职责；名称是架构职责，不要求先建立五个新endpoint或通用插件平台。映射代码留在经过版本管理的adapter内；投影只收静态数据和Host认可的控件kind。Host过滤未知字段、非法组合与超界值，重新校验保存和Run启动时的配置，不能信任浏览器送回的capability列表。

能力注册的可用值是：有来源的该连接/model/API支持集 ∩ 当前adapter确实可编码的集合 ∩ Host当前准入条件。上游运行时metadata若与SDK/静态文档冲突，保留冲突来源并拒绝冲突参数；不以最后写入或取并集扩权。静态规则没有精确型号匹配时不做family名称猜测；网关不得继承官方endpoint的全部声明。

检查回执继续复用原版本/凭据代际机制，并增加所测model/API/参数组合的覆盖与适配版本依赖。网络失败是检查不可用，不是能力不支持；400必须有结构化参数错误或限定证据才能归因。没有实际响应证据时只写请求已发送/成功，Provider effective值仍未知。

## 现有接缝的最小改动位置

`provider-preview.mjs::previewProvider`已有有界目录发现（目前OpenAI-compatible）；扩展时先由协议dispatcher产生受限发现结果，再由Host `validateProviderModels` / `validateConnectionInput`校验。`registrationInput/registrationExtras`继续把获准connection描述送入 `registerConnectionProvider/registerCatalogExtraModels`，不新增上游可写的注册库。

`RuntimeService.getProviderModels()`是UI的公开能力投影口；`#admissibleModel`保持config/Run/verify共同准入，扩展参数条件校验。`createIsolatedModelRuntime`与 `createSessionRun`承接锁定Pi provider/API模块；需要新协议时只加入Host许可的adapter代码，不要求把所有Provider改造成新runtime。

`observeRequestStream`继续承接请求观测；`#verifyProviderConnection`控制有界探测和回执。Adapter提供结构化协议结果，Host决定是否保存、是否过期和如何投影。这里注册的是现connection/model事实及获准Pi adapter，不注册任意上游代码。

## 有界实施顺序

| 片 | 交付与责任 | 退出条件 |
|---|---|---|
| 1 · 精确能力及旧数据 | 原provider字段/store/Runtime adapter writer；为OpenAI、DeepSeek现连接先给精确描述，兼容连接按独立identity处理 | 旧reasoning=true保留“曾人工声明推理、档位未知”；false保留原人工声明/关闭意图，不证明Provider不能推理；null保持未知。没有补造默认梯子，历史Run不重写 |
| 2 · 准入、映射与版本 | 原service/provider-config/adapter；复用配置队列，校验expected revision，保存和Run共用校验 | 非法值/过期capability/陈旧保存明确拒绝；失败保留现配置/草稿；生效配置与冻结Run可追溯，silent clamp须显式规则及投影说明 |
| 3 · 统一UI投影 | 既有model-picker、Settings、provider-config projector；按model显示enum/mode/budget/default及来源 | 未知不显示假档位；模型切换不沿用不兼容值；键盘/窄屏与关闭返回保持；不改Host-wide范围为session/turn |
| 4 · 检查与观测 | 既有BE-39/telemetry owner；参数探测只在显式有界动作下进行，保存/打开菜单不触发 | 回执说明exact请求覆盖，HTTP200≠每参数生效；Provider缺字段仍unknown；当前SDK effective名称的证据层级得到纠正 |
| 5 · 新Provider/native API | Anthropic/Gemini逐个准入，先确认锁定Pi与SDK能表达原生参数/metadata；必要时有界adapter扩展 | 正确注册、请求形状、工具/流式与恢复负例、独立验收齐备后才进入可用集合；不把文档矩阵当安装清单 |

这是现PV/Runtime工作中的消费顺序，不重排已授权Harness dogfooding或替换Pi core。不得为收纳UI先升级全部SDK或实现全平台hot swap；需要升级时说明锁定版本的具体缺口和回归面。单turn override独立后置，另冻结作用域优先级与Run记录，不夹带在本轮UI投影中。

## 可证伪验收矩阵

1. 目录有ID但无能力：可显示候选，不出现可用effort梯子；布尔true迁移不生成medium；默认省略不冒充Off。
2. OpenAI `gpt-6-astra`在Responses/Chat Completions不支持none（[官方reasoning指南](https://developers.openai.com/api/docs/guides/reasoning#reasoning-effort)）：对这两个精确组合，保存和Run准入都拒绝none；其Chat Completions function calling限制单独核查。不将此规则泛化到其他型号。
3. DeepSeek Responses API的兼容输入minimal→low、medium/xhigh→high（[endpoint合同](https://api-docs.deepseek.com/api/create-response/)）：新增该路由适配时只提供合法且有意义的离散选项，记录requested与encoded。当前Pi 0.85.1已对DeepSeek V4 Flash给low/high/max、V4 Pro给high/max，未在这两项本地目录发现七档同义投影；此验收防新增适配误把上游兼容别名当不同强度，不声称现DeepSeek目录已有该缺陷。
4. Anthropic adaptive/extended/budget与模型互斥条件、Gemini level/budget代际差异：原生参数编码正确，不混用或把预算当枚举。
5. 同名model在两个connection/endpoint、不同凭据代际：能力/检查不串用；更新后旧回执失效。旧异步目录结果不能覆盖当前选择。
6. 两个设置页面从同一版本保存：第二次陈旧保存冲突，不覆盖第一处；active Run配置409与run/config队列仍成立；重启恢复保留绑定。
7. 200但字段被忽略、响应不回显、alias变化、缺usage：请求结果和Provider观察分别记录，未知不补成有效或零；401/403/404/429/网络错误按原分类与覆盖处理。
8. tool/stream多轮参数与Provider私有连续性字段：沿DRT-02/既有adapter合同验证，不因单请求检查成功跳过；不用思考正文当握手证据。
9. UI统一入口：模型菜单/设置合法值、部分/失败/过期、保存前后、运行中；1440/1280/390、浅深色、键盘/触屏、200%、焦点返回。没有真实有序schema时不出现滑杆。

定向回归优先沿 `provider-open-admission.test.mjs`、`provider-connections.test.mjs`、`models-connections.test.mjs`、`request-telemetry.test.mjs`、`provider-config-module.test.mjs` 及实际adapter wire/恢复测试；具体文件以开工HEAD核实。先独立合成fixture/mock检查payload与版本，不触达个人数据。真实Provider测试按既有显式授权路径固定连接、模型、预算、请求覆盖；本次未运行。

## 本轮检查与接受上限

本轮仅登记：源码为Luna只读核查，官方文档/上游源码分别列明日期/固定SHA；Astra整合责任和实施顺序。截图hash与文档链接校验，不改源码所以不运行生产测试。作者研究与合同不自称已实现或独立产品接受，真实参数生效仍需上述证据。


独立文字核对：Luna复核README blob `ace9b6df8dea0bf67b7ad7ed1f468deca5ad8c07`、本文件初稿 `732c6c9683d988deb20a7e12ab4643175e52592b`，未发现结构性阻塞；指出OpenAI反例需固定型号/API、DeepSeek官方兼容映射不能误称当前Pi目录缺陷，以及目录ready过滤需明确。Astra已据官方来源和本地主线事实逐项修正。复核是合同/代码证据准确性检查，未运行产品测试或接受新adapter实现。


执行节奏按用户追加要求：Luna独立有界探索并集中回报，等待期采用异步等待；Astra仅处理架构边界、证据冲突、集成与最终接受。探索发现不是作者自验，也不因节省quota省略必要验收。本轮全部为当前任务的子工作，不新增定时自动化或独立用户任务。
