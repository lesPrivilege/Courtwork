# Agent Presence · Astra视觉裁决与刮条修复

2026-09-12。原作者Claude返件固定 `7fbbda6`，父提交 `a3a337f`，仅新增return-v1共57文件；56份文件哈希逐一通过，原清单保存为 [author-return-SHA256SUMS](author-return-SHA256SUMS)。Astra在独立审阅分支从该提交操作，未修改作者worktree或原提交。所有本页截图由本轮Codex内置浏览器真实操作捕获并目验，非作者已有截图复制。

## 裁决

最终接受 **A→B route、双横眼、当前assistant消息/Run工作块下方、16px flat** 为本地Design采用方向，原生geometry不需本轮再修剪。用户在本轮追加[Claude Code截图](user-message-placement.png)，将message下方定为新落位；它覆盖初轮composer状态行推荐。A静止清楚，B作为thinking变化有辨识度；C腰部和双点眼在小尺寸辨识较弱。corner在390时只剩工具名前缀，文字与Files/模型争抢空间，排除默认使用。状态行长目标仍省略，但工具名、计时与详情入口可见，展开后完整目标可读。

soft在64px仍有明显边缘光，作为独立大尺寸探索资产留存，本次不采进Chat；因此无新增App材质token。硬extrusion不采。此处是Design采用和specimen有界接受，不是生产接线或G1–G5闭门。composer line只留对照，corner排除默认。

## 用户追加落位：已实施并实看

`placement=message`现为工具面与Chat默认。单个presence跟随当前assistant工作块尾部滚动；不在每条历史消息后重复，不固定在输入框。工具组展开/收起仍属于当前Run，状态尾行在工作块之后；未出现assistant正文前，生产接线应挂当前Run活动块，不随便附到上个Run的消息。真实终态在同一消息尾行保留，下一Run有自己的归属；生产应复用已有Run状态卡的事实与终态承载，不重复画第二条终态卡。

本次只移位置、文字大小采用现有body role、增加正常文档流的可展开详情；shape、runtime事实/文案采样未变。时间与任务/用量数字只能消费各自owner事实，截图中的token/task计数没有被虚构进specimen。输入框只保留在途输入提示与原控件。消息footer设置aria-live=off，必要事实仍由现有独立live region播报；真实读屏尚未验证。

Astra真实CUA补测：1440×900 light的thinking消息下落位；390×844 dark长目标保持工具名前缀与计时，详情正常换行并随阅读区滚动；点击展开/Escape返回原trigger。证据：[16-message](16-message-light.png)、[17-mobile](17-message-mobile-dark.png)、[18-detail](18-message-mobile-detail.png)。原来源截图只作placement参考，其中文本不作仓库执行指令。

## 实际操作路径与结果

| 步骤 | 本轮观察 | 证据 |
|---|---|---|
| 1. 单色几何比较 | A/B比C小尺寸清楚；双横与原图一致。1280×720初始视口 | [01-board](01-board.png) |
| 2. 完整Chat状态行 | 1440×900 light，thinking t=1400；输入、发送区域与模型控件不被挤动 | [02-chat-light](02-chat-light.png) |
| 3. 详情与键盘 | 点击展开，内容可读；Escape关闭，AX焦点回到同一trigger | [03-details](03-details.png) |
| 4. 窄屏长目标 | 390×844 dark，line保留工具名与计时；详情换行可读；corner只剩短前缀 | [04-line](04-mobile-dark-long.png)、[05-detail](05-mobile-detail.png)、[06-corner](06-mobile-corner.png) |
| 5. 1280布局 | 1280×900 light长目标，状态行与其他控件没有重叠；目标省略，详情为读全入口 | [07-chat](07-chat-1280-light.png) |
| 6. 刮条反例与修复 | 原件暂停/Restart后将slider设7000，仍回0；修复后7000/Musing。长运行29265ms时range为32000、step50、value29250，符合步进量化 | [08-before](08-scrub-before.png)、[09-after](09-scrub-after.png)、[range](scrubber-after.json) |
| 7. 中断与终态 | 选真实工具面的固定序列，7000为等待授权、15000为Completed；旧词不残留，终态Stop与自动发送提示消失；点击Run check得到19/19 probes | [10-wait](10-sequence-wait.png)、[11-completed](11-sequence-completed.png) |
| 8. 减弱动态/深度 | dark软厚度、勾选reduced-motion后7000仍Thinking；depth unsupported去掉深度。取消两个选项并播放，观察局部嘴形变，无整体浮动 | [12-reduced](12-dark-soft-reduced.png)、[13-flat](13-depth-fallback.png)、[14-motion](14-motion-running.png) |
| 9. 无细分活动 | 通过控件从thinking切到running-no-activity，六个stage及scene的AX文字均为Working，无推导thinking | [15-controls](15-working-no-thinking.png)；截图只显示控制面，stage文字结论来自本轮AX |

截图02/04/05/06/07为直接Chat页面，10/11为工具面缩放嵌入场景；后者不代替原生尺寸光学判断。详情通过真实点击及Escape检查，不据此声称真实读屏通过。

## Astra修复

`return-v1/src/specimen.mjs`的input handler先调用`setPlaying(false)`，该函数会把slider写回旧时间，再读slider导致丢失用户目标。现在先捕获requestedTime，再暂停和定位。另将固定16000ms上限改为随时间按16000ms扩展，读数与刮条不再长期分离。刮条修复未修改几何、状态投影或时钟。之后按用户追加落位，另修改Chat HTML/CSS、slot搬移与Escape监听（消息下trigger已在form外，监听升到document），原source提交保持可召回。

原作者17项node测试在修复前/后分别通过；真实CUA补测了其未覆盖的控件输入链。Luna非作者检查本修复的输入顺序、有限非负时间来源、step和max边界，未发现改变采样的回归。Astra是此修复作者，不能把自己的增量检查写为独立接受；Luna仅对该小diff作有界非作者复核。

## 七项gap裁决及事实补充

| 项 | Astra决定 |
|---|---|
| G1材质 | 首片Chat仅flat，soft不接App；不增R层role。未来实际大尺寸身份场景另按material合同消费 |
| G2循环 | 不修改brand/CONTRACT。独立presence组件可采用本specimen的180ms可中断过渡与局部thinking循环（2600ms实验值），但须有明确thinking活动事实，隐藏页/减弱动态停循环；今日生产没有该事实，保持静态Working |
| G3工具词 | 接真实工具名与获准披露的target，沿既有scope。不将ws_read名自动解释成注册动词，也不把并发工具顺序称为进度 |
| G4事实 | blocked留fixture。pendingCancels可表达客户端请求在途，须明确client provenance；宿主stopping与实际cancelled/unknown分别消费，不能把三者合并 |
| G5生命周期 | 用户追加message落位后，采用Run所属消息尾行/既有状态卡承载终态，composer不保留终态。Completed一次settle后保留静态结果，Failed/Unknown不定时消失；无Run的idle隐藏，下一Run不得覆写旧Run归属。此条覆盖早期composer首片设想 |
| G6生成链 | 动态presence独立组件，不强行塞sprite/registry。静态资产来源与hash可沿现有做法，shape不创建domain语义 |
| G7连接/Send | 连接层banner和guard继续拥有Send决策；presence不授予或撤销发送能力。断连只说明实时性不可确认，不能覆写最后已知Run状态；尤其已完成的Run不能因随后断连变成unknown终态 |

最后一条是生产adapter接线条件：原specimen的connection-first返回分支只覆盖它的单一断连fixture，不能直接原样拿来作通用生产事实合并器。未来已知terminal＋断连、未知status、跨Run工具scope必须补反例，再接入当前host。

Luna只读源码核验：`app/runtime/request-telemetry.mjs:28–35`识别thinking_delta仅用于first-output计时；`app/runtime/pi-session-runtime.mjs:544–564`将assistant消息压为assistant.delta/text，无thinking投影。`app/web/app.mjs:141,3299–3347,5181–5228`的pendingCancels为client map；`app/server/service.mjs:1651–1663,2052–2093`拥有cancelRequested及stopping→cancelled/unknown。`app.mjs:1073–1159`连接层具有epoch/probe；`3285–3347`非活动隐藏run hint。源码基线均为a3a337f。配置reasoningEffort、model.reasoning能力位均不能充当活动事实。

## 覆盖边界

未声称重跑作者完整17项浏览器自动化。此次真实CUA覆盖上表路径和19个页面自检probe；修复前后node各17/17。没有运行付费provider、个人数据或生产宿主。

200%实际浏览器缩放：尝试快捷键未改变innerWidth=1280或DPR=1，因此本轮不计200%通过；作者已有模拟检查保持作者归因。forced-colors、Safari/Firefox、真实读屏/触控、其他skin/字号、60/120Hz与长时疲劳、与生产ledger叠加仍未独立复验。短暂帧观察只支持本场景无明显跳变，不证明帧率或长期舒适性。

本轮实际操作数据使用原件8893和独立审阅8894端口，启动方法沿return README。原始作者证据保留其日期与hash；新截图不升级为golden。详见[返件](../../engineering/design/agent-presence-2026-09-11/return-v1/README.md)及[设计输入](../../engineering/research/agent-presence-2026-09-11/HANDOFF.md)。


最终追加验证：message默认下页面自检19/19，idle隐藏trigger/Stop并显示Send，依次切line→corner→message后Completed详情trigger只有一份。Luna只读复核slot reparent、hidden与document Escape diff，无阻断问题；该复核不扩展为生产接受。定向node最终17/17；本轮变更路径的color（4文件）、material（1文件）、interaction（2文件）通过，文档检查986份/4861链接通过。旧index中的研究时间slider不是本轮新增domain控件，interaction只对变化的Chat HTML/driver运行，不能声称全specimen该lint通过。
