# 输入转录：provider 抽象与模型面调研（2026-09-10）

用户 2026-09-10 随"认领 provider 前后端施工"转发。用户附言：仅供参考，并非全部事实。本页只作转录与证据分级，不作裁定；裁定见 [intake](../intake.md) §2。

## 1. 结构主张（转述，未核）

- DeepSeek Harness 的通用多 provider adapter 基于 `pi-ai`，并把 `provider` 与 `model` 分开；已有 provider 继承 pi 的 endpoint、wire protocol 与 model catalog，自定义 OpenAI 兼容网关只需配置。
- provider 层宜稳定为四个可替换对象：Provider identity → Auth → Model catalog/capabilities → Wire transport。
- 五条建议语义：① `{providerId, modelId}` 为路由主键；② AuthMethod 独立于协议（至少 `api_key` / `oauth` / `ambient_credentials`），UI 依 provider 返回的方式编排；③ model catalog 为唯一事实源，capability 作元数据；④ 每个 turn 冻结 provider snapshot；⑤ reasoning UI 用统一语义，wire 映射留给 provider。

对照现状：①③④⑤ 在 Courtwork 已成立（intake §1），②为本批次新增（PV-4）。

## 2. 前端主张（转述，未核）

两级模型面：一级在 composer，紧凑模型按钮加可选 effort 按钮，点击开可搜索 popover（顶部搜索，Recent/Favorites，按 provider 分组，行内挂稳定 capability），底部只留 Manage models 与 Connect provider 两个出口；完整 provider 管理在 Settings（Connected / Available / Custom）。称 OpenCode 已把这条路径串起来，Cline / Roo 在向统一 searchable model picker 收敛。

按 PV-8 作假说处理，须先有先例与 specimen。

## 3. 外部事实性说法（须核验，已交 EX-PV2）

| 说法 | 状态 |
|---|---|
| Google 于 2026-06-18 停止 consumer tier 经 Gemini CLI 的 "Login with Google"，该路径迁往 Antigravity | 待核 |
| Gemini CLI 官方条款载明：第三方软件直接利用其 OAuth 访问背后服务属违规使用 | 待核 |
| pi 已把 Vertex 作为 ambient credential provider，标准路径为 `gcloud auth application-default login` 加 project/location | 待核；本地 pi 0.85.1 源码可判 |

第三条的本地可判部分由 EX-PV2 直接读码回答。前两条的核验结果不改变 PV-5。

## 4. 首轮验证矩阵建议（转述）

建议首轮定为 DeepSeek API key 加 Google Vertex ADC / Gemini Flash：一条验 OpenAI 兼容加显式密钥，一条验 Google 原生加 ambient auth；本轮不做 fallback / router，先让每次调用显式可追溯地固定 provider / model / auth source，并记录 TTFT、TPS、cache、context、reasoning、usage 与 error class。

Fable 于 PV-12 改议首轮第二条为 `google` provider 的 Gemini API key，Vertex ADC 顺延第二轮；PV-13 采纳"先可追溯、后自动"。
