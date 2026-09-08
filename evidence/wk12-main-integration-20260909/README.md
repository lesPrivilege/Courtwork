# WK12：main 合流复验

2026-09-09，Astra。输入main `79826634373a84e0c0183313a42fba9238cb6bce`；接收Opus实现 `7599a91`、Fable复核 `a2223e2`，作者基线 `429fdd6`。无冲突合流提交 `e2ec7f59e7098862e11429496c0b72e60872f877`，保留main后继Luna两单的文档与独立证据。

本次没有集成代码修补、没有allowlist请求；server/runtime/core、runtime-view与home-view无差异。原作者证据未覆写。Settings由对话框改为L3页面，主区导航与会话切换、设备偏好和Runtime挂载点按交付接收。

## 验证分列

| 执行者 | 结果 |
|---|---|
| Opus作者 | 204/204、lint、contrast、浏览器55/55；[交付 §8](../../engineering/mvp/execution/work-surface-kit/delivery-wk12.md) |
| Fable | 独立204/204与lint、范围检查、四张截图目视；同交付 §13与WK-87裁定 |
| Astra合流复跑 | [204/204](tests.log)、[lint](lint.log)、[contrast](contrast.log)、[smoke](smoke.log)通过；以下七支脚本55/55，页内异常0、记录到的4xx/5xx为0 |

| 脚本 | 结果 | 范围 |
|---|---|---|
| [shell](checks-shell.json) | 12/12 | 整页/侧栏、深链、Back/Escape还焦、导航、IME守卫、搜索 |
| [appearance](checks-appearance.json) | 11/11 | 宗、skin、字号、字体、reduced motion、非法token拒绝、设备持久化 |
| [noflash](checks-noflash.json) | 3/3 | body进场时首帧偏好已应用 |
| [groups](checks-groups.json) | 13/13 | 五组事实与既有provider保存、key保存/删除、extension lifecycle、Bind to session回归 |
| [FE-T09](checks-fe-t09.json) | 4/4 | 九条件下Settings/Home的事实与合法动作不变；焦点、命中区、横向溢出 |
| [FE-T10](checks-fe-t10.json) | 7/7 | Tab路径、展开、dialog、切会话先退出Settings、IME守卫、关闭工作面再进入Settings |
| [shots](shots.json) | 5/5 | 1440/390/等效200%几何与命中区、强制reduced motion；截图由脚本生成 |

groups中的X5b是对既有缺陷的记录断言：Bind to session交接时，异步loadProjectWork还没返回，焦点落body；并非“绑定焦点已修好”。合法绑定入口与Settings退出通过，但这一缺陷仍留存。

## 复跑条件

独立工作树 `codex/wk12-integration`，全新仓外数据目录，端口8898；不使用Opus8881或作者数据。安装完成后启动 `npm --prefix app start -- --data-dir <独立目录> --port 8898`。按顺序运行本目录 checks-shell、checks-appearance、checks-noflash、checks-groups、checks-fe-t09、checks-fe-t10、shots；环境 `APP_URL=http://127.0.0.1:8898`，`WK6_CDP_PORT`依次19820、19822、19824、19826、19828、19830、19832。

脚本复制自作者；harness仅调整browser导入相对路径，browser复制自既有final-integration；断言未改。每支新建浏览器profile，结果写入本目录。项目/会话仅经HTTP播种，groups以一次性合成key验证保存与删除，未读取个人凭据或请求真实模型。单元/smoke为local-fake。

## WK-87与WK11交接

- 接收This session行和当前无CSP环境下的内联首帧脚本。
- Appearance四预览收为组顶一块、用户skin接受前按contrast-report对照对警告且不阻止：已在WK11工单，不在合流时抢改。
- BE-16稳定工作区标识仍是登记请求，未实现。当前localStorage按origin分键，同端口先后挂不同数据目录会共享偏好，不宣称已按数据目录隔离。
- WK11工单旧基线已更正；从本次最终清洁main回执SHA建树，消费 [WK12 §10挂载点](../../engineering/mvp/execution/work-surface-kit/delivery-wk12.md#10-留给-wk11-的挂载点)，复用现有update通道与settings-row搜索。
- 空态Home的31vh留白原样保留，等用户裁定，不阻塞本次合流。

真实provider、触控、VoiceOver/NVDA、真实中文/日文IME、完整浏览器历史栈、桌面壳未验。200%为等效视口；截图生成与几何断言通过，不声称逐图视觉独验或用户四轴验收。产品G1–G5和发布门未关闭。
