# Courtwork 工程总纲

Courtwork 是面向中国律所与企业法务的本地优先工作代理。产品与文档入口见 `docs/README.md`。

本文件是仓库最高工程说明；跨层语义由 `docs/decisions/` 的 Accepted ADR 展开。开工前必须阅读：本文件、相关 ADR、认领层的 `SPEC.md`。

## 架构边界

```text
apps/desktop                         产品壳与通用 UI 宿主
packages/legal / packages/pm-schemas 垂类 schema、场景、词表、投影、renderer
packages/core                         provider 无关执行器、harness、事件与门禁
packages/registry                     包 ABI、准入与运行注册表
packages/tools                        确定性工具与受限宿主动作
packages/output                       docx 编译、定位、修订与批注
packages/reading-view                 文档安全预检、阅读视图与锚点
packages/schemas                      领域无关 wire 契约
packages/demo-data                    虚构导览、测试与验收语料
eval                                  中性评测底座
services/ingest                        Python OCR/分类/实体对齐
```

依赖必须无环并向更稳定的契约层收敛。跨域绑定只允许出现在垂类 manifest、composition、acceptance 或 desktop host 边界；core 机器层、tools、reading-view、output 不得理解法律或其他垂类语义。详细规则见 `docs/decisions/ADR-001-package-abi.md`。

## 核心不变量

1. 模型只生成，不裁决；事实等级、坐标、schema、权限和不可逆动作由系统判断。
2. 无锚不落格；模型出引语，系统出坐标。
3. 留人确认；定稿、移动、授权、记忆写入和不可逆动作属于用户。
4. 静默降级零容忍；缺配置、缺覆盖、降档、拒载与失败都必须显式。
5. 契约先行；schema 变化必须同步所有生产者、消费者、JSON Schema 与机器门。
6. 原件永远只读；对话可分叉，历史不可涂改。
7. demo 与真实路径双向隔离；真实链不得读 demo 真值。
8. 案件内容永不训练；密钥不进前端明文、日志、事件流或遥测。

完整解释见 `docs/architecture/principles.md` 与 ADR 索引。

## 技术基线

- Node 22+、pnpm workspace、TypeScript strict、Vitest；desktop 为 Tauri v2 + React。
- ingest 是独立 Python 服务，uv 管理，通过 HTTP + JSON Schema 与 TS 边界通信。
- provider 无关，不在业务代码写死 provider/model；怪癖只住 provider quirk 层。
- agent loop 自研；场景是用户触发的声明式固定编排，不让模型自主选择不可逆流程。
- 产品代码与文档用中文说明，标识符用英文。

## 必须自研加固

OCR 印章/手写、跨文档实体对齐、docx/WPS 兼容、卷宗结构还原、法律垂类评测集。这些节点允许实现复杂，但不允许用假数据或静默降级绕过。

## 工程纪律

- TDD：先证明测试会红，再做最小实现。
- 每层带测试和 golden；读取、输出、schema 漂移与边界守卫必须能注入反例触红。
- 完工至少跑 `pnpm -r build`、`pnpm lint`、`pnpm test`；desktop 行为变更另跑隔离端口的完整 Playwright。
- 只做工单范围。跨层变化写提案，由架构角色拍板；实现会话不得自行改变 schema 语义或验收标准。
- Git、worktree、提交和验收纪律见 `AGENTS.md` 与 `docs/engineering/workflow.md`。
- 历史材料只在 `archive/`；现行文档、源码与脚本不得引用归档内容。
