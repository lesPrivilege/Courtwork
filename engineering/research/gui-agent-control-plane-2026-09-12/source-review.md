# 三项primary-source核验

2026-09-12。Luna独立有界网页读取，Astra消费结论；无上游运行测试。此记录核验讨论中最影响当前选型的三项，不声称完整供应商parity。

1. **Skill格式与发现路径分开。** [Agent Skills specification](https://agentskills.io/specification)规定目录中的SKILL.md、必要name/description frontmatter及可选scripts/references/assets；它不规定`.agents/skills`发现路径。[Codex文档](https://developers.openai.com/codex/skills)另规定仓库CWD到root、用户及admin的发现位置。CW目前语法解析不等于目录发现或完整包支持。立即采用格式兼容方向，发现/资产/脚本分别按adapter合同实施。
2. **MCP Registry是发现来源。** 官方[ecosystem文档](https://github.com/modelcontextprotocol/registry/blob/main/docs/design/ecosystem-vision.md)描述metadata及外部包地址，不托管代码/二进制；[publishing guide](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/quickstart.mdx)中的namespace/package匹配是来源校验。[aggregator文档](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/registry-aggregators.mdx)把安全扫描/评分放在下游。未见安全或执行成功认证保证；catalog条目不成为CW授权或可运行证明。
3. **OpenHands PR已合并，运行行为只作部分证据。** [agent-canvas PR1476](https://github.com/OpenHands/agent-canvas/pull/1476)显示2026-06-26合并11 commits，merge `9f23355`，页面记录v1.2.0；repo已归档。PR描述enabled设置经PATCH API与SDK使新conversation自动加载，但测试mock，完整E2E/build依赖当时未完成的client/router链。消费轻量service→query/view model→UI结构；不得把合并状态当运行独立验证或当前维护保证。

其余Letta、Dify、Docker、ToolHive、Open WebUI及六种控制面grammar的产品细节在本轮未逐一核实，保留为模式参考；示例数字、权限能力和状态枚举不进入CW事实。没有安装依赖或访问个人资源。
