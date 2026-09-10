# RV26-OPT02 · Google Auth路线的固定版本准入与实现

审查基线：`0c60f4ffe0e4d939712df3910d2404c226e8bfdf`。状态：**conditional**。优先级：P2。

映射原路线：BE-36/37, Google dogfood。建议owner：Provider作者；独验人不得是作者。

依赖：RV26-PV01, RV26-HC04。

**条件门：选定的官方/公开OAuth路线与锁定SDK兼容，且用户明确授权真实登录。**

## 目标

保留用户Google Auth意图，不把API key或目录握手冒充OAuth。

## 写权白名单

- `docs/runtime-control/google-auth-admission.md（新）`
- `app/runtime/google-auth-adapter.mjs（准入后新）`
- `app/tests/review-google-auth.test.mjs（准入后新）`

## 实现步骤

1. 检查锁定Pi0.85.1实际公开Google auth入口与官方支持的授权产品；确认模型、project/region、scope、token刷新与使用条款，选定一种明确路线。
2. Google OAuth、Vertex/ADC、Gemini API key是不同配置与授权；不能默认为同一权益，不能冒用官方私有client身份。
3. 准入后实现单连接auth lifecycle、token私有存储、credentialGeneration、撤销/过期/refresh失败；callback仅允许明确绑定state/PKCE及本地端点。
4. 真实登录与生成由用户显式触发；不抓浏览器cookie、不读取未授权CLI凭据。不能证实时维持unsupported并给出阻塞证据。

## 必须命中的反例

1. 取消登录、错误state、过期回调、scope不足、模型不可用、refresh失败、重启、撤销。

## 验收

1. auth成功与该模型生成成功分别留receipt；没有自动扩大provider允许集。

## 回退

撤销新连接token并禁用route；现有provider继续可用，未知任务不盲重发。

## 必读源头

- [S10 · engineering/mvp/execution/work-surface-kit/backend-requests.md](https://github.com/lesPrivilege/Courtwork/blob/0c60f4ffe0e4d939712df3910d2404c226e8bfdf/engineering/mvp/execution/work-surface-kit/backend-requests.md)
- [S19 · app/runtime/pi-session-runtime.mjs](https://github.com/lesPrivilege/Courtwork/blob/0c60f4ffe0e4d939712df3910d2404c226e8bfdf/app/runtime/pi-session-runtime.mjs)
- [S26 · app/package.json](https://github.com/lesPrivilege/Courtwork/blob/0c60f4ffe0e4d939712df3910d2404c226e8bfdf/app/package.json)

## 每单通用执行纪律

本编号是审查派工别名，不替代仓库正式编号。开工前读取实际AGENTS、current、关联原工单与本单sources；检查新HEAD是否已经完成其中内容。只能在明确分配的独立worktree与合成dataDir施工。上述“新”路径均为建议落点，先确认未被后续分支占用；调整路径需写回派工清单。

实现步骤是本次建议，**不是现有API声明**。任何schema/action变更先由唯一owner预留版本、冻结合法/非法fixture、迁移与回退。一个共享文件同一时刻只有一个writer；backend/Core修改串行合流，前端沿原单writer队列。不得整仓format、升级整套Pi、改Paper、扫描个人目录、读取凭据、调用真实provider或发布站点。

验收必须在作者之外的独立树执行：逐项写command、expected、actual、code SHA、fixture hash及not_run。作者自测不叫独验；mock不证明真实模型质量，process-kill不证明断电耐久性，功能合流不等于产品发布。每张PR关联一个语义单元，可包含紧耦合测试与合同，不能以“改动行数少”替代边界。

## 交付回执

```yaml
status: proposed | implemented | verified | blocked
base_sha: <actual>
code_sha: <actual>
original_work_order: <repo-id and path>
author: <name/session>
independent_reviewer: <different person/session>
worktree: <isolated>
fixture_hashes: []
commands: []
negative_cases: []
schema_changes: []
rollback_exercised: false
not_run: []
limitations: []
```
