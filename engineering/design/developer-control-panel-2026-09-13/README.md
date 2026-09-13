# Developer control panel · MCP / Skill / local Plugin

2026-09-13。Astra 按用户授权串行实现；隔离分支 `codex/developer-control-panel-20260913`，起点 `b038cb3` 合入 Runtime 阅读候选 `92dcec9` 与持久 main `4cf5ed9`。沿[原文裁决](../../research/developer-control-panel-2026-09-13/README.md)消费前三片和八种原生 SVG；Hook / Registry 仍明确 adapter-required。本片没有新增正式接受权、付费模型运行或部署。

## 实际交付

- MCP：Settings 的 Add / Edit 配置表单，Host 纯解析预览、已有 scope/CAS 保存。新资源与 exposure=false 同一次原子变更；保存、Connect/discovery、曝光、具体调用许可分开。沿既有 Streamable HTTP 协议适配器，HTTP 仅 loopback；无认证、OAuth、stdio。
- Skill：粘贴文本、原生 SKILL.md 文件选择和目录选择。只读根 SKILL.md；目录最多枚举200文件，name 须与目录名一致，支持文件列表明确为未导入，脚本不执行。Host 验证 frontmatter，包括 CRLF；保存关闭曝光，按需 runtime_load 沿绑定快照。读取、编辑、Session 切换和无效目录会使旧预览失效，保存失败保留草稿。
- 本地 Plugin：Developer 的绝对宿主路径 → Inspect → 显式 host trust → Register → 另行 Load。包格式沿既有 CW Host Extension manifest/createExtension ABI；预览和登记都不 import。预览固定已检查字节，登记复制到数据目录；加载前重算包哈希，再沿 ExtensionRegistry 生命周期与 Chat 绑定。没有新 tool owner 或领域 state owner。
- SVG：原生24网格、2px圆端点，tool/mcp/skill/plugin/host-extension/hook/registry/profile 进入现有源清单、sprite、白名单和语义生成链；用对象轮廓而非状态色，动作与文字可访问名称保留。

## 本地包合同与限制

[最小合成包](local-plugin-example/manifest.json)和[入口](local-plugin-example/index.mjs)可用于独立数据目录验证。必需 manifest.json 与 index.mjs；目录最多64常规文件、2 MB、四层嵌套，忽略隐藏文件及 node_modules，拒绝嵌套符号链接和越界路径。每Host最多32个本地包。预览在内存中保留5分钟、最多8份；过期/重复ID均须明确重试，没有自动覆盖。

这是普通宿主用户权限下的可信进程内执行，不提供 OS sandbox、签名、恶意代码隔离或依赖安装。登记的是检查时的字节快照；后来修改原目录不改变该包。加载时拒绝登记快照的字节变更；这不是对恶意宿主并发改写的隔离保证。自定义 UI renderer、版本替换/删除、marketplace、外部包格式转换尚未支持。已加载状态沿原生命周期在重启时恢复；unloaded 重启不执行该本地入口。实例 ABI 校验失败会尽力 dispose，原失败仍被保留。Load 与重启的 start 失败均清理实例；卸载/重载清理失败会持久标记 invalidated 并保留诊断，重启不自行恢复为 loaded。本地包索引在生命周期副作用前持久写入 suspended 标记，成功激活及回执保存后才清除；卸载回执写失败时，旧 loaded 记录也不能在重启后复活。Host 关闭逐个尝试清理所有实例，再汇总报告错误。

## 设计先例与 grammar

最近先例是[Settings 已接受容器](../frontend-audit-2026-09-13/hierarchy-polish/README.md)、[Runtime 对象阅读区](../frontend-audit-2026-09-13/runtime-hierarchy/README.md)和 [IC-6 图标几何](../icon-controls.md)。沿原表单字段、作用域tab、对象行、独立内容滚动与 quiet/primary 动作，不另建导航或材质体系。Plugin 标题与glyph组合，状态留在行尾。Settings 内容滚动面建立定位容器，防止绝对定位的 sr-only 标签逃逸撑高外层；390大字深色实测 shell 844/844、scroll 0、文档宽390。

## 验证与事实边界

[首轮全量](evidence/full-first.log)：972项，971通过；唯一旧 MCP 未交付说明断言失败，按新增入口更新。[复验全量](evidence/full-final.log)：972/972，通过，Node v25.9.0，合成 providers。随后补充 ABI 清理负例并依既有 lifecycle HTTP 409 合同修正，此前[定向](evidence/targeted-final.log)38/38；Luna 故障探针后修复启动/重启/卸载清理路径，最新[相邻定向](evidence/reviewed-targeted.log)66/66。新增 CSS 定位微调通过作者真实浏览器复验；不将它冒称在全量启动前已存在。

颜色、材质、形状、交互、语义消费者、产品文案、63项语义生成一致性和 runtime smoke 通过；完整日志随证据保存。全量保留原始输出，不覆盖失败记录。

真实浏览器操作了 MCP Add/Review/Save/Connect/Expose、Skill 粘贴/Review/Save/Expose、Plugin Inspect/Trust/Register/Load/Unload。随后 [HTTP 合成运行回执](evidence/live-flow.json)对这些实际导入资源连接、绑定 Plugin、执行精确 MCP deny/allow 和 runtime_load；该部分是 API 操作，不标作 GUI 权限点击。生命周期测试另证明未加载重开、篡改拒绝和旧源目录变更不影响快照。原生文件/目录分支由合成 DOM/Host 检查覆盖，未称自动化操作过 OS 文件选择器。

[桌面 MCP](evidence/mcp-preview-1440-light.png)、[桌面 Skill](evidence/skill-editor-1440-light.png)、[窄屏 Skill](evidence/skill-editor-390-dark-large.png)、[窄屏 Plugin](evidence/plugin-intake-390-dark-large.png)、[桌面 Plugin](evidence/plugin-loaded-desktop.png)、[窄屏几何](evidence/narrow-geometry.json)、[SVG 明暗16/18/20/24对照](evidence/glyph-contact-sheet.png)为 Astra 作者证据。八图形在小尺寸保留区分轮廓；完整屏幕阅读器、200%缩放与 forced-colors 未覆盖，非独立视觉接受。独立代码复核另记，不以作者测试代替。
