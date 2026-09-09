# 可联调 UI + Harness Core 节点

2026-09-07，Astra 实现与行为验证；Luna 做来源、基线视觉 diff 和结构截图复核。独立工作树 `<isolated-checkout>`，分支 `codex/ui-maturity-surface`。接受的 Foundation R3 累计后端补丁已原样合入提交 `9213e3f`，此后只修改 UI、显式静态资产路由和验证材料。Claude 的 `<isolated-checkout>` 活动树未覆盖。

## 使用

当前合成验证服务：[本地工作台](http://127.0.0.1:8816)。重启时在此仓根运行：

```sh
npm ci --prefix app
npm --prefix app start -- --data-dir /private/tmp/se-ui-maturity-data-20260907 --port 8816
```

常用路径：Home → New session / Continue → 添加文本材料 → Send → 回答或写入授权 → 概览 → Run / File。默认 Local test 不调用外部模型。Settings 已连接真实 provider/model catalog、API key 和会话写入模式接口；真实模型调用由用户配置后测试，本轮付费 provider 调用为 0。

可用本地 fixture：`/fixture question` 验证回答；下面指令验证精确写入授权。它是本地确定性测试语法，不是模型能力演示：

```text
/fixture script [{"name":"ws_write","arguments":{"path":"out/example.md","text":"# Example\n\nA local verification file."}}]
```

开发入口与视觉替换规则见 [编排契约](../../../docs/ui-composition.md)。默认数据目录可以换到用户自己的持久目录；不要让两个服务同时持有同一目录。

## 实现结果

- 默认 Home；无会话时不占用 composer / 右栏。导航组独立开合，近期列表逐步展开。
- 正文、活动摘要、待处理决定、概览卡、完整检查栏有不同层级；处理后的授权与问题收回历史行。
- 原生 SVG 控件带名称、键盘提示、触控目标；Markdown 支持表格/代码复制并清理不允许的 HTML。
- 桌面可选三栏；窄屏独立导航与全幅工作面；同一 renderer 关闭重开保留未保存输入。
- 真 API 接线：材料 / 文件、ask_user、精确写入权限、Run usage / artifacts / notices、历史版本、provider/key 设置、幂等 Run 回执恢复。

## 验证证据

| 验证 | 结果与限制 |
|---|---|
| `npm --prefix app test` | 119/119，含接受的 R3、两条新纯投影用例；[日志](runtime-tests.txt) |
| 控制器反例 | 14/14：9 条覆盖层/焦点/renderer 保活，5 条回执身份、双击、跨会话迟到、token 更新与禁止不确定重放；[日志](controller-tests.txt)。这是作者 stub DOM / request 测试 |
| 真实 UI 主路 | CUA 创建会话、默认 ask、添加 brief.md、读材料并写 result.md、Allow、Run 使用量、记录版本与 Current file、Markdown 表格/代码；成功；另走通 ask_user → Answer → 已回答历史行，焦点停在对应 summary |
| 拒绝写入 | Deny 后历史记录可见；工作文件只有 brief.md 与 result.md，没有 denied.md |
| 连续性 | 原 composer 中文草稿保留；扩展 renderer 未保存文本在关闭/重开/放大后保留；材料 dialog → File tab 不回抢焦点 |
| 重启与刷新 | 服务优雅重启后不刷新浏览器直接 Refresh，token 更新、Home 保持、历史恢复；没有发起新 Run |
| 断点 | 390/430 全幅、768 覆盖、1024/1440 分栏；无横向 overflow；窄屏关闭目标 44px，桌面 32px。见 [稳定采样](viewport-checks.json) |
| Luna 非作者视觉 | [复核](visual-followup.md)：摘要到详情、局部收起、独立工作面与窄屏结构采样通过；不是全产品行为验收 |

复跑作者控制器：

```sh
node --test evidence/ui-maturity/surface-counterexamples.mjs evidence/ui-maturity/run-receipt-counterexamples.mjs
```

截图： [最终编排](composition-1440.png)、[Home](home-1440.png)、[会话概览](summary-1440.png)、[桌面文件](file-1440.png)、[390 记录版本](file-390.png)、[390 当前文件](current-file-390.png)、[430 当前文件](file-430.png)。源代码与证据 hash 见 manifest.json。

## 采样过程中的修正与未测

一次测试脚本把换行直接嵌入 JSON，fake provider 正常退回文字回显；改用 JSON.stringify 后工具链、Allow/Deny 均完成，该回显保留在合成历史中。

CUA 的旧 screenshot 导出在视口覆盖后错误缩放；改用稳定视口后的 getScreenshot 并从磁盘复看，Luna 撤回该假 P1。批量切视口立即读取也出现未稳定采样，已丢弃，viewport-checks.json 只记录后续独立稳定读取。

未执行：外部付费模型、真实 VoiceOver/IME/软键盘、真实触屏、200% 缩放，以及覆盖所有旧 GUI 工单的非作者整体验收。本节点用于用户开始 UI + Core 联调，不宣称全部产品、Paper、C3 最终合流或接管已通过。无远端 push / 部署。
