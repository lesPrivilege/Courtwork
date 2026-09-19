# RD-006 DWB 首片独立复核 · 2026-09-14

## 范围与结论

复核对象为 `/private/tmp/courtwork-workspace-access-20260914` 的 `codex/workspace-access-20260914` 工作树。`HEAD` 与基线相同，为 `7e1a1ff047721e1ca6c871deba7f367ccea55a06`；交付仍是未提交的工作树差异。复核者没有改动产品文件、切换主线或触碰真实用户目录；仅以临时合成目录运行检查，并在该工作树新增本回执。

服务实现的主要隔离路径、绑定/撤权修订、同请求幂等、Run 快照、来源事件和 schema15→16 迁移在下列定向合成检查中通过。未发现 P0。当前**不建议推进外写或 GUI 片**：有一项同设备挂载别名的授权范围需要 Astra 按既定范围裁决明确处置；另有两处当前 API 文档与 schema16/受控仓库读取相冲突，应先修订。它们不是已确认的相对路径逃逸或认证绕过，但在处置前不能将整片标为通过。

## 对照的任务合同

读取了 `AGENTS.md`、`engineering/current.md`、RD-006 原合同与 `app/docs/repository-binding.md`。原 DWB-01/02 合同在 `engineering/research/deferred-workspace-binding-2026-09-12/pr-plan.md:5-27` 要求同 owner 的绑定与 Run  admission、显式撤权、独立只读工具、逐次路径/授权核验、来源记录、受限预算和旧 Host 拒读；RD-006 的本轮增量和责任/交付记录在 `engineering/research/RD-006-deferred-workspace-binding.md:47-75`。实现范围保持在 Host Session 外部目录读取；Core4、bridge5、managed `workspaceDir`、Pi cwd/journal、`ws_*` 根、外写和 UI 均未进入本片。

`app/docs/repository-binding.md:11-78` 明确 API-only：绑定与撤权走既有带 token 的 `/api/v5`，没有目录 picker；Run admission 冻结 binding，撤权阻断后续读取并取消 Run；`repo_list/read/grep` 只收相对路径。文档说明来源文本与绝对 Host 路径不写事件、已披露文本不能撤回；列明设备号/inode、`dir_fd`、`O_NOFOLLOW` 以及大小、遍历、输出和搜索限制。它明确说 helper 不是 OS sandbox、没有单独辨认同设备挂载别名。这里没有把它当成全系统路径隔离保证。

## 源码核查

认证和会话边界：`app/server/index.mjs:218-240` 对 `/api/v5` 除 bootstrap 外要求 `x-work-token`，并先核 `safeOrigin`；路由只将路径中的 Session ID 交给服务。`app/runtime/control-plane.mjs:161-170,193-203` 按当前 Session 是否有 active binding 决定 `repo_*` 暴露，不能靠普通工具 override 在未绑定 Session 打开。`app/server/service.mjs:2005-2016` 的工具闭包固定当前 Run 和其 Session；`app/server/store.mjs:749-781` 再以该 Run 的 Session、快照与当前 binding ID/revision/路径身份核实来源事件。独立测试中第二 Session 的三项 repo 工具保持隐藏。

幂等与竞态：`service.mjs:706-771` 在配置串行队列内处理绑定；对 bind 重放先查旧回执，错误 ID 重用映射为 409；Run admission 带 `expectedRepositoryBindingRevision`，Store 在自己的 mutation queue 中再次核对。`store.mjs:689-745` 用 operation、原始 rootPath 与 expectedRevision 构造请求 hash；相同 requestId/不同 payload 冲突。revoke 先持久化 revoked revision 与 Run 事件，再向活跃快照 Run 发取消；取消尚未解决时返回明确 503，而 binding 已失效。`recordRepositoryRead` 在同一串行写入内再次验证 Run 仍 open、binding/revision 仍匹配后才追加事件。

文件系统路径：`repository-fs-helper.py:66-115` 在连接和每次操作检查规范 root 的 device/inode；`117-159` 拒绝绝对路径、空/点/上跳分段，以 dirfd + `O_NOFOLLOW` 逐级打开目录；`205-247` 通过已打开描述符读取普通文件并核读期间元数据；`249-332` 对 grep 子树也逐级 dirfd 遍历并跳过 symlink。root identity 在 helper 返回前以及 Node 的来源记录前再核。Node 使用 `shell:false` 启动固定 helper，stdin 为 JSON，环境为 allowlist；helper 只实现 bind/verify/list/read/grep。审阅 helper imports/操作没有发现 mount 调用、shell 或由模型参数决定的可执行文件/根目录。

管理工作区与外部目录仍分离：`service.mjs:1981-1993` 的 `ws_*` 继续以 `entry.workspaceDir` 创建，`2065-2068` 的 Pi `cwd` 仍是该 managed 路径；`2005-2017` 另建 repo 工具闭包使用 Run 的 binding snapshot。外部源不被塞进初始 `currentContext`；Run 只获得工具描述，文件正文仅由成功的 `repo_read/grep` 工具结果返回。系统提示 `service.mjs:2211-2221` 把来源文件和工具输出限定为任务证据，不能覆盖用户请求或工具权限。来源事件按 Run envelope 记录相对路径、binding ID/revision、结果 hash 与源 hash；API 集成测试核实事件里没有绝对 root。

迁移：`store.mjs:31,543-583` 提升 Host RuntimeStore 到 schema16；先验证原 schema，再以原始字节的 SHA-256 名备份并原子写入；所有旧 Session 加 null binding/revision0/空命令，旧 Run 加 null snapshot。Core/bridge 没有改动。专用测试从提交 `7e1a1ff` archive 出实际 schema15 Host，生成旧 Session/Run，再检查新 schema、原文件精确备份、旧 Host 对 schema16 拒读且不改文件、独立目录可用 schema15 Host 恢复。该路径通过。

## 独立验证证据

| 检查 | 结果 |
|---|---|
| `cd app && node --test tests/repository-binding.test.mjs` | 4/4 通过：真实 schema15→16 迁移/旧 Host fence；合成目录读取、symlink/上跳、root 替换与 source hash；Store 幂等/revision/Run 快照/撤权；HTTP→Run→repo tools→事件及撤权取消。 |
| 独立 HTTP 探针 | 无 token GET 为 401 `unauthorized`；带 token 但恶意 Origin 为 403 `origin_denied`；带 token、允许 Origin 的 Session binding GET 为 200、空 binding/revision0。 |
| 独立资源限制探针 | 205 项目录列出200项并 `truncated:true`；大于512 KiB 文件拒为 `file_too_large`；`(a+)+$` 对合成长行在约2040 ms 以 `search_timeout` 结束。 |
| 独立 helper 超时探针 | `timeoutMs:1` 在约3 ms 返回 `operation_timeout`，子进程按取消路径回收。 |
| `git diff --check` | 通过。 |
| `node tools/check-doc-links.mjs` | 失败：1311份文档、7318个链接、11条缺失 source path；归因见下。 |

未重跑作者所记全量 `npm test` 1036/1036、迁移组79/79及 local-fake smoke；本轮用专用4测试验证最有判别力的迁移、Store、HTTP、Run与helper路径，没有真实 provider、真实 Agent 任务、UI、用户数据升级或外部挂载测试。合成限制探针覆盖 read/list/grep timeout 的代表性边界，不等同于每项预算的穷举。

## P0/P1 发现

**P0：无。** 定向 HTTP 与存储回归没有发现未认证 binding、跨 Session 工具暴露、ID 异 payload 重放、过期 revision 接受、旧 Host 读取升级文件、managed workspace 被换根或 root/symlink/`..` 相对路径逃逸。

**P1（范围裁决待定）：同设备挂载别名可能越过用户以为的物理目录边界。** `repository-fs-helper.py:135-153,178-200,249-305` 对子目录/文件只比较 `st_dev` 与 root device；不同 device 拒绝，但没有 mount ID 检查。具体反例：在 Linux 合成卷上绑定 `/repo`，事先把同一文件系统 `/private/vendor` bind-mount 到 `/repo/vendor`，其中有 `secret.txt`；模型只传受允许的相对路径 `vendor/secret.txt`，或者 `repo_grep(".")`，打开的 inode `st_dev` 与 `/repo` 相同，因此 helper 会读取并返回 mount source 的字节。`O_NOFOLLOW` 不挡 mount；同类预先存在的 alias 不需要 helper 或模型创建，也不需要读取绝对路径。**本复核未创建或实际运行 mount 测试**；这是根据 dirfd 与 st_dev 分支给出的最小反例。helper 不能创建 mount；该问题仅在目录 namespace 已包含此类 entry 时出现。

Astra 已裁决本片不是 OS sandbox，允许排除恶意同权限进程改变 mount namespace 的防护；但“预先存在、普通相对路径可遍历的 mounted subtree 是否属于用户显式绑定 root 的授权范围”仍未在合同中定清。`app/docs/repository-binding.md:57-63` 只说不同 device 不跨越、同 device alias 未辨认；没有说明 alias 会作为绑定目录内容正常披露。若第一片授权定义是“root 下所有普通可见子路径”，可由 Astra 明确将既有 mounted descendants 纳入披露范围并在未来连接界面显明；若声明要避免读取物理 root 之外的 mounted source，当前实现不满足，需平台可用的 mount identity/fail-closed 路径及合成回归。处置前不把范围安全问题默认记为通过。

**P1（文档当前指针不一致）：** `app/docs/api-v6.md:290` 仍称“current state file is schemaVersion 5”，而 Host RuntimeStore 当前已是16；同页 `:294-297` 仍称 build 内不存在“path outside the session workspace”，与显式绑定后可用的 `repo_list/read/grep` 矛盾。新 `app/docs/repository-binding.md:11-78` 与 `app/README.md:7-8,173-177` 的具体合同/范围是准确的，但 `app/README.md:3` 还把 api-v6列为当前 HTTP 合同入口，旧的全局断言仍对读者有效。建议收窄为“没有绑定时，managed workspace 工具不出 Session workspace；显式 repository binding 是独立受控只读例外”，并把 current schema 更新为16（注明 schema5 是 asyncTasks 的历史引入版本）。`app/docs/supported-preview.md:9` 只描述 Files UI 的材料/managed workspace，最好补充 API-only 绑定、无 UI 的状态，不暗示已有 folder picker。

## 11 条缺失文档链接的归因

`node tools/check-doc-links.mjs` 的全部11条问题都来自隔离树的 `engineering/current.md`：9个唯一目标里，`polish-slices-20260914.md` 与 `dogfood-long-20260914/README.md` 各被引用两次。9个目标分别是：

- `engineering/design/context-tps-motion-2026-09-13/telemetry-p1-20260914.md`
- `engineering/design/chat-flow-2026-09-10/composer-access-delivery.md`
- `engineering/design/chat-flow-2026-09-10/polish-slices-20260914.md`
- `engineering/design/chat-flow-2026-09-10/copy-feedback-p0.md`
- `engineering/design/chat-flow-2026-09-10/run-surface-pr-20260914.md`
- `engineering/release/harness-implementation-2026-09-12/evidence/dogfood-long-20260914/README.md`
- `engineering/research/models-provider-registration-2026-09-14/composer-pr.md`
- `engineering/research/agents-api-first-2026-09-14/README.md`
- `engineering/release/independent-review-2026-09-14/README.md`

复核了共享 main checkout 的 `git status --short --untracked-files=all`：以上九个唯一目标全部标为 `??`。同一组精确引用出现在 main 的脏 `engineering/current.md`，并以相同内容进入本隔离树；两个完整文件的 SHA-256 不同，故没有把它们描述成整文件字节复制。归因成立的边界是：doc checker 无法把 main checkout 另有的 untracked 文件当作本分支的 repository source；并非本片新增 repository-binding/test 合同链接目标缺失。本分支的链接检查仍是红灯，不能报告 pass。建议在原 owner/current 记录作 **adjust**：集成时移除/合并不属于本片的 dirty-main 指针，或将相应 source 文件纳入同一交付，再重跑链接核查；本复核不触碰这些其他 writer 文件。

## 处置建议与未覆盖

- **Adopt：** Host 仍拥有唯一 RuntimeStore；显式 Session binding 与 managed workspace 分离；固定只读 dirfd helper；Run 快照、requestId/revision、来源事件及 schema15→16 的严格备份/旧 Host fence。当前有针对性合成证据支持这些行为。
- **Adjust：** 修订 `api-v6.md` 的 schema/路径说法、补齐当前 supported-preview 的 API-only 描述；为已存在同 device mount alias 的授权范围写出 Astra 明确处置；处理 dirty-main 指针造成的11条源链接错误，不要把 checker 红灯笼统豁免。
- **Defer：** `repo_write`、Access/UI、真实 Agent 任务、实际用户数据升级、完整 GUI/可访问性接受均仍待原队列；本复核没有验证或接受它们。

本复核支持“代码与 Host 合成读取链在上述定向范围内通过”；P1文档差额是确定问题，mount alias是已举出反例但需 Astra 定义授权语义的条件 blocker。以上两项在原任务/owner记录处置前，不给出进入外写施工的整片通过回执。
