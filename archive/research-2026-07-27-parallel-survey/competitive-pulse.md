# 竞品态势脉搏（2026-07-27）

## OpenWork（different-ai/openwork）

scheduled/后台任务未发布：官方 roadmap「Long-running and background tasks」仍 Building、「Scheduled workflows」「Human approvals and resumable runs」仍 Next（openworklabs.com/roadmap，07-27 取回）。`approvalMode:"auto"` 于 dev 分支 `apps/desktop/electron/runtime.mjs` 现行确认（raw 取回），orchestrator 另带 `"--approval","auto"`——OPENWORKER 续档负面判例仍准。最近正式版 v0.17.32/0.17.33-alpha（07-17/18），此后无 release；07-26 后 commit 明细无法枚举（GitHub API 受限，UNVERIFIED）。旁支：同组织 opencode-scheduler 插件仓（launchd/systemd/schtasks，无正式 release）——定时能力以 opencode 插件先行，未并入桌面主线。

## opencode 与 pi（七月）

opencode v1.18.1–1.18.6：各 server 独立保存权限自动接受状态（1.18.0）、禁止子代理嵌套（1.18.2）；无新沙箱/队列特性（版本明细经第三方镜像，个别日期 UNVERIFIED）。pi 0.80.4→0.82.1：受约束工具采样（JSON Schema/grammar）、动态/延迟工具加载、本地 llama.cpp、会话感知 bash；无权限/沙箱/队列/通知类变更。可借鉴形：延迟工具加载、可复现构建校验。

## 「AI 同事」桌面品类（六款；三特性＝OS/推送通知·多会话并行·语音输入）

Anthropic Claude Cowork（01 发布、07-07 扩 Web/移动）：推送到手机有、并行视图未直陈（UNVERIFIED）、语音未见。OpenAI ChatGPT Work（**07-09 新发布**，合并 Chat/Work/Codex 桌面）：三项全有（07-23 Voice 进桌面），自带定时与变更监测触发。Google Antigravity 2.0（05-19 I/O）：并行管理与语音有、通知未见、另有 cron。Microsoft Copilot Cowork（06-16 GA）：主打租户管控，三项未见宣传（二手源，细节 UNVERIFIED）。Manus My Computer（Meta 收购后 03-18 桌面版）：每步须批准；云端有通知与并行，桌面未确证。OpenWork：三项均无发布证据。

**判读**：语音与并行视图正向标配移动（OpenAI、Google 5–7 月补齐）；完成通知以「推送到手机」跨端形态普及，纯桌面 OS 通知反非宣传点。**对本仓裁定的含义**：三项「已裁不做」的重启判据（试点提出／并发 run 出现／scheduled ADR 成立）均未触发，裁定不翻；市场位移如实登记，下次复核以本件为基线。中国侧：豆包/Qwen 个人代理 07-15 依新规下线（TechNode 07-06），国内桌面工作代理暂时降温；Kimi OK Computer 为云端形态。

## 法律线（四条）

Thomson Reuters CoCounsel 六月上线 Deep Research Verify（自动核验引用并高亮支持段落）——**来源核验从差异化项变成竞争面，TRACE 方向获 frontier 佐证；对外叙事宜由「独有」转「结构级 vs 检索级」**。Harvey Brief（07-17）：并行多任务＋结果告警；File as Column Context 属弱锚定，未推 citation 验证。Legora Series D $600M、估值 $5.6B（04-30）。LexisNexis Protégé（05 月）：agentic skills＋客户自持加密密钥——数据主权卖点与本地优先同向。中国侧合同审查溯源类无可确证重大发布（仅 SEO 内容，UNVERIFIED）。

## 来源

openworklabs.com/roadmap；different-ai/openwork raw runtime.mjs 与 releases；different-ai/opencode-scheduler；sst/opencode releases 与 gradually.ai changelog 镜像；pi.dev/news 与 earendil-works/pi releases；claude.com/blog/cowork-web-mobile 与 support.claude.com；OpenAI help release notes；antigravity.google I/O 2026；Digital Trends（Manus）；Windows Forum（Copilot Cowork）；TechNode 2026-07-06；Thomson Reuters CoCounsel June 2026；harvey.ai/blog Brief July 2026；TFN（Legora）；LawSites（LexisNexis）。
