# Settings resource management · 2026-09-13

用户同意按常规资源管理与底层宿主操作分层，并要求消除相近图标、使用稳定语义。基线 main `2d1ab6816e3dedcd613fee80a35bc61b2067d106`；Astra 在隔离分支实现。本片为作者检查，不宣告独立视觉接受或 Release 接受。

## 实现与边界

Settings 新增 Plugins，沿同一 Runtime 快照显示来源、Installed / Running / Exposed / Permitted，提供资源按需展开，链接 Tools、Skills、Permissions。Host-owned exposure 只读；不把已安装、已运行、已曝光和获准执行合为一个开关。Package update/removal 暂无后端契约，不绘制可用动作。

Developer 保留 Runtime composition、bindings、Host Extensions 的本地登记及 load/unload/reload/invalidate、执行绑定和诊断。两页互链；Tools 的 Inventory 仅列 MCP，hook/registry/workflow 限制在 Developer 披露。无 schema、权限或执行写权改动。

Plugins 导航与对象行共享 `plugin.object`，改用已固定 Lucide 1.41.0 commit 的 puzzle 原始 SVG；Models 保留 cpu。源文件、sha256、sprite、原生生成数据、manifest 与语义投影同链更新。旧自绘 runtime-plugin 源保留历史可重建性，不再用于 plugin.object。正文采用 Plugins / Host Extensions、登记/加载等各自合同词，不新增同义资源名称。

## 最近先例与 grammar

最近先例：[Settings 容器](../frontend-audit-2026-09-13/hierarchy-polish/README.md)、[Runtime 阅读区](../frontend-audit-2026-09-13/runtime-hierarchy/README.md)、[上一片导入组件](../developer-control-panel-2026-09-13/README.md)。实际复用 SETTINGS_GROUPS / createSettingsPage、createRuntimeView / resourceRow / scopeStrip、settings-section、runtime-kind、原生 details、现有图标生成链。改变页面归属及图标辨识度；维持共同快照、hash 导航、搜索、焦点、独立滚动与源/请求/生效/绑定分离。未新增颜色、材质、字体或 motion token。

## 作者验证

- [定向检查](evidence/targeted.log)：Settings、Runtime 阅读/失败恢复、host-owned 状态、现有本地扩展输入、图标与语义一致性。
- [浏览器记录](evidence/browser.json)与[可重跑脚本](browser-check.mjs)：独立合成数据/端口，1440/1280/390 × light/dark、插件状态、资源与权限导航、Developer 保留入口、搜索 Enter 开详情及返回完整 App。无浏览器异常，不调用模型。
- [1280 light](evidence/plugins-1280-light.png)、[390 dark](evidence/plugins-390-dark.png)、[完整 App](evidence/full-app.png)为作者截图；其余尺寸随目录保留。
- 颜色、材质、交互、对比度、语义消费者、文档链接与 runtime smoke 单独运行。原生 200% zoom、forced-colors、屏幕阅读器与完整无障碍矩阵未覆盖；不标作已通过。

新增“可自定义模块登记/检索/Create with agent”需求由 Luna 使用 Exa 独立调研，另交来源与实际能力映射；本片不把生成草稿冒充已登记/已安装/已执行。

## UX 审核、研究消费与追加登记入口

用户追加Luna审核新旧板块体例；[本次审计](audit/README.md)由Astra捕获iAB实际页面、Luna打开保存图独立审读。Plugins/Tools/Skills/Developer与Host Extension五个步骤分列；不拿作者旧截图充当本轮审计。发现本地编辑器关闭焦点丢失，已修复并由fresh浏览器确认回到入口；MCP Inventory空态用词也按实际配置对象统一。

[Exa调研](../../research/module-authoring-discovery-2026-09-13/README.md)核验五个上游系统的15个官方文档页。Astra本轮裁决消费第一片：在原Skills的runtime-intake内新增原生Resource type选择，Instruction/Reference/Prompt template与Skill共用Add/Review/Save/Edit；没有新模块中心、状态库或第二套搜索。选择类型保留各自草稿并归还焦点，编辑锁定身份/kind/scope。保存经同一resolver与CAS，首次保存exposed=false。文本资源登记是内容保存，不是取包安装。

追加[组合定向](evidence/followup-targeted.log)80/80；三种新增文本类型真实HTTP resolve/save/readback通过，均未曝光。iAB合成GUI完成Instruction输入→Review→Save→Search→Edit→Close；本次[预览](audit/06-instruction-preview.png)、[已登记搜索](audit/07-resource-search.png)、[编辑](audit/08-resource-edit.png)、[类型选择焦点](audit/09-resource-type-focus.png)与[本地编辑器退出修复](audit/10-local-editor-focus-fixed.png)保存原图。新表单的窄屏/深色完整矩阵未再跑，不把先前Plugins六组截图扩大为它的覆盖。

Build with agent的源草稿回流、删除UI和远端Registry检索仍未实现：后续应先保护原Chat草稿、形成可编辑待审源，再走同一校验/保存；不能因生成而自动登记、安装、加载、曝光或执行。本轮不增加无后端的功能按钮。

正文输入沿现有表单字体，Skill源编辑保留等宽；[末轮截图](audit/11-resource-prose.png)由iAB保存，Luna非作者审读另列审计报告。追加交付留在 `codex/settings-resource-management-20260913`，交由发布任务负责最终合流及组合验收；本任务不追加 main 合流、push 或部署。前一片 `c1bdaa9` 已进入 main，不重复接收。
