# Workspace选择入口 · dogfooding反例

用户2026-09-14截图：菜单仅No workspace / New project，不能选择期待的project。

核对main 7e1a1ff及当前在途app.mjs：home-project-button打开时从state.projects中过滤preview后列项目；home-create-project仅打开名称表单。该入口选择的是Host项目，不是本机文件夹/仓库选择器，也未由Access移动施工新增仓库接入能力。截图能证明无可选项，不能单独证明Host数据库无项目（还可能是加载或preview过滤问题）。

原Composer交付的空间/权限控件验收不覆盖本项。此反例接原Workspace substrate与coding dogfooding接入owner：下一单应先核Host项目列表与前端加载，再核既有仓库接入合同和实际能力；明确“已有CW项目选择”和“本地仓库接入”的用户路径。创建同名空项目不能当成挂载Courtwork源码，不能以假项目消除本反例。

状态：已定位菜单实现边界，Host列表及仓库接入方案待核；不修改用户项目/数据。保留当前telemetry串行施工，本项排队待发，不声称已修复。

## 用户调整优先级：Access grammar与真实仓库接入

用户随后要求先对齐卡片并实现真实仓库挂载，本条替代上一段排队顺序。telemetry已通知在安全边界暂停留证。本地Luna workspace_access先核现有接缝，Astra裁决最小跨层方案后施工；非作者Luna与Chrome用户目验关闭，不由Astra重复验收。

Access采用现有read-only / ask / allow权限事实，统一Home和已有Chat的选项、必要范围说明、选中标记、键盘/Escape/返回焦点及紧凑触发器。参考截图只消费交互结构，不移植Full access或无限网络/文件权限。最近先例由施工记录固定，仍保留原权限owner与保存时点。

仓库接入验收必须是Host绑定真实目录、Agent通过现有受控工具读到该目录源码，允许写入时实际变更绑定范围内文件，并能撤销接入后阻止新的访问。目录选择/输入方式、持久身份、路径及symlink边界、已有工作树保护和重开恢复需根据现有owner核定。先用隔离合成仓库验读写与越界反例，再接真实dogfood隔离树；不将shell/test执行能力夹带为已实现。

目前状态：优先任务已派探索，尚未实现挂载或新卡片。
