# 通用 LLM Provider 切换/配置机制调研（2026-07-15）

范围：cc-switch、claude-code-router（CCR）、New API（one-api 系）、Cherry Studio。仅调研原稿，不具约束力。

## 1. cc-switch（farion1231/cc-switch，Tauri v2 桌面应用）

来源：`README_ZH.md`。字段级 TS schema 未能读取（SPA 空壳），从功能描述反推。

- 供应商条目（反推）：名称、CLI 工具归属（Claude Code/Codex/Gemini CLI 等五选一或"通用供应商"跨工具共享）、base URL/API key（写入各 CLI 原生配置文件）、通用配置片段（MCP/Prompts/Skills 可复用）。
- 切换机制：直接改写各 CLI 的原生配置文件（JSON/TOML/.env），Rust 端临时文件+rename 原子写入；多数需重启 CLI，Claude Code 声称热切换。
- 预设分发：内置 50+ 供应商预设一键导入；`ccswitch://` deep link 直接导入配置，无审核环节。
- 密钥存放：**明文 SQLite**（`~/.cc-switch/cc-switch.db`）+ 默认滚动保留 10 份明文备份。无 OS 钥匙串。

## 2. claude-code-router（musistudio/claude-code-router）

- 数据模型：`Providers[]` 含 `name`、`api_base_url`（完整端点）、`api_key`、`models[]`、可选 `transformer`；`Router` 按场景（default/background/think/longContext/webSearch/image）绑定 `"provider,model"`，支持运行时热切换与自定义路由脚本。
- **协议差异处理：声明式可组合命名 transformer**（最贴近 Courtwork 具名怪癖 profile 的实证）：`deepseek`、`gemini`、`openrouter`、`maxtoken`（max_tokens 语义/上限差异）、`tooluse`、`reasoning`（reasoning_content 字段差异）、`sampling`、`enhancetool`（工具参数容错，代价牺牲流式）、`cleancache`（清除不支持的 cache_control）等；**可 provider 级全局套用 + model 级叠加覆盖**，transformer 可带参数（如 `["maxtoken",{"max_tokens":65536}]`）。
- 预设分发：`ccr preset export/install`，manifest.json + 版本元数据；**导出时自动把密钥剥离为 `{{field}}` 占位符**（四家唯一）。
- 密钥：config.json 明文，支持 `$VAR` 环境变量插值——比纯明文前进一步，仍非钥匙串。

## 3. New API（QuantumNous/new-api，网关类）

- 渠道模型：provider type 枚举 + 名称 + Multi-Key（轮询/加权、失败跳过）+ 模型列表 + 可选 Base URL 覆盖 + 优先级/权重 + **Model Mapping**（请求模型名→上游真实名的 JSON 别名映射）+ Parameter Override（JSON 参数强改）+ Auto Disable。
- 能力差异：provider type 硬编码协议大类分支；细节交用户手填 JSON；Test Channel 只测连通性不测能力。
- 密钥存服务端 DB（网关架构，不落最终用户磁盘）；DB 是否加密未查到。

## 4. Cherry Studio（桌面客户端）

- 条目模型：显示名 + Provider type 四选一（OpenAI/Gemini/Anthropic/Azure，决定 wire 协议）+ API key（Check 按钮仅连通性）+ Base URL 根地址 + **模型 ID 纯手填**（无发现/校验）。
- 能力差异处理颗粒度最粗，接近裸 OpenAI 兼容假设；无社区预设包机制。
- 密钥：文档未提加密，推测本地明文（未经源码证实）。

## 对 Courtwork 的映射分析（仅建议）

1. **中间形态**：版本化 provider catalog 作为**纯数据分发**——profile = 固定端点/协议族 + 参数化能力声明（CCR transformer 清单的静态化）+ 怪癖映射表；社区 provider 以数据包提案、**经审核闸门**进 catalog（cc-switch/CCR 均无审核，这是要收紧的差异点）；descriptor 只带 providerId 引用，执行绑定仍只住 packages/provider。与 ADR-001/007 兼容，把"新增 provider"从改代码降为审数据包，不放开任意 URL。
2. **三个 profile schema 盲点**（待第二 provider 需求时立 ADR 吸收）：
   - 怪癖是**带参数的补丁**而非布尔开关（"支持但上限不同"需可表达）；
   - **双层粒度**：provider 级默认 + model 级覆盖；
   - **模型别名映射层**：请求名与上游真实名解耦，防上游改名静默断裂。
3. **密钥对比结论**：四家无一达到 OS 钥匙串水准；Courtwork「密钥只进宿主钥匙串」是相对严格做法，保留，不因社区惯例放松。CCR 的 preset 导出剥离密钥为占位符值得抄。

信息缺口：cc-switch 字段级接口、Cherry Studio 存储加密、New API 服务端 DB 加密——均未能证实，未编造。

来源：farion1231/cc-switch README_ZH.md；musistudio/claude-code-router README；docs.newapi.pro Channel Management；docs.cherry-ai.com Custom Provider。
