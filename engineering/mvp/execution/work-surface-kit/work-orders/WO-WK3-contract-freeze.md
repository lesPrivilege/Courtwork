# WO-WK3 · 前端投影契约冻结（Fable）

状态：骨架；依赖 EX-WK1、EX-WK2。输出 `../contracts/review-projection.md` 与 `../contracts/review-projection.d.ts`（类型仅供前端与 fixture，不进 `app/runtime`）。

## 问题

在不新增后端状态、字段、端点的前提下，冻结 Review 纵切的类型与状态映射，使 inline 与 inbox 两投影读同一 store。对应索引 §12 Phase D，限 `ReviewItem` 与 `Decision` 的前端投影；`WorkEvent` 沿用现有 server-event 投影，不重定义；`Artifact` / `CapabilityRef` / `ExpertManifest` 不在本单。

## 冻结项

1. `ReviewProjection` 类型：kind ∈ permission / question / outcome；来源字段全部指向 EX-WK1 §3 已有字段；`无` 字段不出现。
2. 状态映射表：question 四态 × run 八态 → 三集合归属（Waiting for you / Continue / Needs a look），与 DC-2 一致，重叠允许。
3. 动作表：permission → allow / deny；question → answer；outcome → 无动作（WS-01 / A-4）。commit gate 只作类型占位，注明"待 Core 契约"。
4. 身份绑定：授权卡 questionId + toolCallId + path + bytes + sha256 + preview 不变；参数变化即新问题。
5. 不变量清单：inline 与 inbox 解决同一项后互相反映；已关闭项退灰字；失败不静默折叠；断连保留最后确认状态。

## 验证

契约文件通过 fixture 复核：对 8818 fixture 的四个会话（rich / waiting-permission / waiting-question / empty）逐项能填出投影且无 `无` 字段。真实 provider 列 `not_run`。

## 验收

Astra 复核契约不越 Core 边界；未通过则回本单，不带入 WO-WK4。
