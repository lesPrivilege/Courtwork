# Release preflight · 串行筹备

基线 `01f37f09b3b11d5c317ab9d45d31d1f9a87766ee`。本轮用户要求回到Release主线，由Luna探查Plan缺口、Astra串行施工。消费原[Plan](../../engineering/release/review-intake-2026-09-13/README.md)与[G1–G5](../../engineering/execution/2026-09-08-main-round/public-readiness.md)，不新增门。

## 干净安装与P11入口

独立 `git clone --no-hardlinks --no-local` 从本地Courtwork仓库检出该SHA；没有共享node_modules、数据或个人凭据。随后原README命令 `npm --prefix app ci` 成功，[日志](install.log)记录244个包、0个审计漏洞；[环境](environment.json)固定Node22.19.0、Python3.14.2、Git2.50.1与lockfile。clone来源是尚未发布的本地main，**不代表远端main已包含此版本**。

按README `npm --prefix app start -- --data-dir <独立仓外目录> --port 0` 启动CLI，URL由Host分配。关闭默认example后，所有项目、Chat、model保存与NDA生命周期/绑定由Astra操作真实GUI完成；没有API写入、手改store或预置extension/key。Local test由产品自己提供确定性能力，不调用外部模型。Settings→Developer的host-trusted Load是现有首版显式能力入口，Astra接受其作为无需文件/API代配的路径，不把Developer标签另立为发布阻断。

顺序：Models选Local test并Save and ask once →创建项目/Chat →首次普通Run →Developer加载Inbound NDA →Continue in Matter填写固定[开发语料](../../app/domains/inbound-nda/fixtures.mjs)source/facts →模型模拟提交Candidate →查看四条规则与来源/事实并填写合成reason→Enter接受→新建Chat→选择同Matter→读取accepted Artifact。实际Core/API/PI调用，无开发者代替保存绑定。

| 证据 | 实际范围 |
|---|---|
| [真实provider空key表单](fresh-model-key-form.png) | GUI能配置连接；未输入真实key，未声称真实调用通过 |
| [首次运行](fresh-gui-run.png)、[对应公开API](fresh-gui-run.json) | GUI保存local模型、新建项目并Run完成 |
| [绑定前Core](gui-matter-before.json)、[接受](fresh-gui-accepted.png)、[同Matter空Chat](fresh-gui-same-matter.png) | 精确来源、Candidate→Decision/Artifact和新Session绑定 |
| [重启前](gui-before-restart.json)、[重启后](gui-after-restart.json) | SIGINT正常退出，原CLI/同目录重开；两会话Candidate、Artifact、events、summary逐项相同。不是SIGKILL证据 |
| [重开界面](fresh-gui-reopened.png)、[接续](fresh-gui-continued.png)、[最终Run事件](gui-final-runs.json) | 第二Session在重启前后各一次`se_read_artifact`成功，终态可查 |

四个GUI Run：普通回复1、提交1、跨Session读成果1、重启后读成果1；另有一次Models连接测试，不算Run。模拟提交的domain由已有`buildReview`产生，只是确定性Provider脚本的输入；它**不证明模型可独立构造domain**。本片没有抓取fresh CLI的完整provider wire；runtime.bound/request/tool events与已有Pi wire测试各按实际范围留证。Enter打开Review/提交决定/返回，以及决定刷新后的稳定opener通过；这里只覆盖当前桌面，之前UI矩阵保持原候选身份。

## 迁移与恢复

在同一干净clone串行执行9个测试文件，[65/65结果及每文件hash](recovery-results.json)。Host3/4→13由async-recovery-independent；5→13由attention-agent；6/7→13由coordination；8/9→13由run-lineage；10→13由review-provider-publication-migration；11→13由provider-schema12-pending；12→13由model-capability-adaptation。各自断言原字节SHA命名backup；reopen/旧host拒绝/独立backup读回覆盖按原测试分别成立，不宣称每一pair都跑了全部回退矩阵。

Core3/app4→Core4/app5由governance-recovery验证独占原字节backup、旧host拒绝、独立副本恢复和迁移前/后SIGKILL旧/新原子性。release-mcp-failures补充独立的effect未知→封闭→重开不重放；它不是schema迁移。全部使用重建合成旧结构和独立目录，不使用用户数据。部分历史test标题仍写Runtime11/schema9，实际assert的当前schema为13。Luna首次探索漏掉5–12直接pair，Astra定位schema12原test后要求复核；已纠正，不据漏搜制造新工单。

## 探查后的施工顺序

1. P11干净GUI与上述迁移收证完成于01f37f0；真实Provider部分继续开放。
2. **NDA producer-contract缺口**：工具仅广告`domain: object`，运行context只含playbook/facts；`verifyReview`实际要求完整schema/reconciliation及逐字reason。既有buildReview预生成脚本未证明该模型输入充分。Luna只读确认，Astra补通用提交schema/静态reason模板及汇总规则；不注入当前inputs的gold答案、不放宽verify或Core接受。[修复产品4cc919c与证据](producer-contract.md)已交付，非作者18/18；完整产品检查在独立clone执行。
3. 固定新候选、完整产品检查与有界真实Provider探针（需用户在GUI配置连接）；真实NDA、G4 2–4分钟演示和G5最终声明映射在其后串行收口。

本片不签整体Release，不改私人简历，不push/tag/deploy。候选文件与最终检查另列，不能把本基线的65/65移称后续修改的新测试。

[公开事实映射](public-facts.md)与[真实探针/演示操作稿](live-probe-plan.md)作为下一串行节点的具体输入；它们不冒称调用或录制已完成。

## 最终检查与范围

独立clone固定`4cc919c41b661a7eff5a522e6057197c8fd7dc3b`运行原`npm --prefix app run check:product`：[原始完整日志](product-before-registry.log)记录934项、933通过、1失败，223.73秒。唯一失败为此前Core摘要刷新按钮未登记raw consumer；runner因此未执行后续smoke/links。保留失败，不称原完整命令通过。

`59fa20fd`只在语义ledger补录该现有按钮为named-read，未改产品、测试或守卫；它与4cc919c的`app/`内容逐文件相同。独立clone切到59fa20fd后，[守卫3/3](registry-after.tap)、[runtime smoke](smoke.log)与[文档链接6267项](doc-links.log)通过。其余933项沿上述固定产品源码结果；这是完整测试加唯一登记修正的定向复验，**没有重跑第二次全量**。新增证据文档入库前另跑链接检查。本轮没有远端CI或真实Provider结果。

Luna非作者另审阅本片证据与公开事实/演示稿的范围，未发现阻断性夸大：65/65保留01f37f0身份、GUI保留Local test身份，真实探针、演示录制和G5 owner收口仍开放。该文档审阅没有重跑测试；producer的18/18与作者完整检查分别记账。

Luna独立确认59fa20fd登记与实际`load()`的只读Core摘要请求及完整accessible name一致；未修改代码或重跑测试。最终新增文档链接检查6333项通过。

原始失败TAP的诊断空行保留Node输出中的空格；`git diff --check`仅对`producer-before.tap`、`producer-intermediate.tap`排除这项既存原字节格式，其余改动检查通过。manifest固定原始输出，不为消除格式告警改写失败证据。

本地main合流`6464df33`。同期UI writer也补了同一Work review刷新登记；集成仅统一reason措辞，file/source/disposition/semanticKeys与已测登记一致，保留其独立的测量控件和所有其他在途改动。被测`app/`的Git树与最终合流一致；共享工作树未提交UI不在固定候选测试范围。
