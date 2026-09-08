# Claude Opus · README / GitHub Pages 交接

2026-09-08。用户已明确由 Claude Opus 建立发布面，Astra负责事实与架构。本单可开工；没有宣称页面已实现或已部署。产品事实基线 `d86eba49ca308fb9f47fc953fe440ffa3289da3e`，工作入口为 Courtwork/main；正文不向陌生读者讲本机迁移史。

## 要交付的阅读体验

CourtWork · **A place for expert work to take form.**

建议短定位：
> CourtWork is an experimental agent workspace for working with local materials, inspecting tool activity, and managing runtime capabilities.

中文同义：
> CourtWork 是一个实验中的 Agent 工作空间，用于处理本地材料、检查工具活动和管理运行能力。

首屏形成产品印象，紧接实际界面与一条可复现工作路径；之后是本地启动、支持范围、架构/roadmap、Paper。品牌仍来自 `brand/`，可更大胆处理字阶、记录标注和局部运动，权威状态与内容保持诚实。视觉决定由Opus结合真实截图与既有 [局部参考队列](pages-preparation/reference-index.json)作裁取，不默认照搬旧法律产品站。

文案入口：[public-copy](public-copy.md) 固定双语文案、状态三档与声称→证据表，Pages 与根 README 从它取词；本单其余边界不变。

## 可发布的事实与出处

| 可表达 | 固定基线来源 | 需要保留的范围 |
|---|---|---|
| Web UI、本地runtime、通用Agent运行、文件/Run检查 | README、app/README、app/server与app/web | 本地运行；默认local-fake不等于托管live app |
| Pi AgentSession、受限工具与显式权限 | app/runtime、docs/runtime-control/architecture.md | Pi固定0.85.1；尊重上游归属，不宣传自研整个harness |
| 资源来源、Context、MCP检查/曝光/调用边界 | docs/runtime-control/api.md、control-contract.d.ts | 安装/连接/曝光/许可分开；characters不冒充tokens |
| Web↔后端联调与远端可恢复 | evidence/final-integration-20260908/{README,sync}.md | 146/146是固定代码回归范围；local-fake/loopback与真实provider分列 |
| 领域提交样本Core | app/extensions/evidence-memo、engineering/architecture.md | 是开发样本，不写成通用NDA/法律审阅产品已完成 |
| 当前main与旧谱系 | evidence/main-cutover-20260908/README.md | 接管已完成；旧v0.1.2、旧测试量、旧DMG属于冻结历史 |
| Paper | PAPER.md | 当前采用 SE 9.6 / `d78fd31`（2026-09-08 发布并采用，DEC-012）；最新阅读入口单列 |

真实provider、完整NDA/跨Session/Review闭环、producer缺席历史fallback、Workbench新布局仍按current证据更新。不要把本轮派单、已存在的字段或品牌commit动效写成这些能力已经完成。

## 写权与产物

Opus拥有：根README（可保留README.md英文、README.zh-CN.md中文）、独立 `site/`、站点构建/校验、必要 `.github/workflows/` Pages工作流与发布回执。Astra本轮不改这些实现。不要改app、Core、brand源、Paper或内部career-kit材料；需要新品牌资产先提出明确用途。 许可证已定 MIT（根目录 LICENSE，DEC-012），README 与页脚据此写。

交付：双语README/页面、真实产品截图/媒体manifest、构建命令、本地预览、子路径检查、可发布artifact、GitHub Pages接线与实际结果。语言版本共用事实清单、分别核对语义；不要求复刻相同正文长度。

本轮只读核实GitHub Pages配置：地址 `https://lesprivilege.github.io/Courtwork/`，build_type=workflow，source为main，未配置自定义域。当前main无站点源码或Pages workflow；需要在新实现建立独立静态输出。执行时再核实远端，不能将旧Pages部署视为本次新页面。托管仍用GitHub Pages，不新建Sites/其他长期站点。

## 媒体与视觉输入

沿用 [准备包](pages-preparation/README.md) 的局部截图/反向滚动/移动端/reduced-motion取证办法；队列没有截图的条目仍是queued。原站、作者说明与本地推论分开。首轮抓取至少覆盖产品证据、editorial与语义motion三类，不为凑数量抓全站。

`evidence/final-integration-20260908/` 有实际合成数据截图，可作为产品输入；先目视并核对所示状态。其产品代码基线为 `0a3b9b22f47f5605ccedc227106b0c17a4df6120`，到本单d86eba4的app/tests/brand字节一致。不得将before图当最终图，也不伪称重新捕获。必要时从当前main启动独立合成数据重新截取。

媒体manifest保留SHA、捕获步骤/日期、viewport/theme、fixture/真实模式、文件hash与适用声称。静态截图、交互fixture和live app分别标注；没有新DMG不提供当前下载按钮。已有根README末尾“main takeover未通过”已过时，应随改稿纠正。

## 验收与返回

- 内容：陌生读者能看懂是什么、如何运行、什么已验证；不把内部工单编号塞进营销正文。
- 交互：核心链接、语言切换、媒体展开可用；键盘、触摸、200%缩放和reduced-motion有实际检查；无JS仍可读主要内容。
- 工程：`/Courtwork/`下资源/深链正确，产物不含server、数据目录或凭据；构建可复现，部署结果单独核对。
- 返回：固定源码SHA、公开URL或本地预览、媒体/文案hash、测试与未检项、选型裁取。Astra按本表核对事实；作者截图不冒充独立验收。

根README不再作为迁移工作日志。迁移、冻结召回与用户消息审计留在engineering/evidence，通过一条工程入口可发现即可。
