# RD-009 · 受信Harness扩展接入

2026-09-13，Astra裁决，Luna只读explore。输入是[Harness下一轮提案与本地处置](../release/review-intake-2026-09-13/round-24bd954/README.md)，源码审查基线24bd954。本文登记真实执行/呈现接缝缺口，不新增产品实现，不替换P/DF/G或全局总registry。

## 已有归属与第一消费者

Pi 0.85.1继续持有模型/工具loop与原生会话，Host service持有准入与Run，Runtime Control持有资源/配置/绑定；Work Core/专业扩展持有正式工作。`hook`是已登记的adapter-required资源类；`uiSlots`是声明，不是可执行renderer注册。第二runtime继续P03/P04/DRT-03，scoped memory仍是P07，clean context仍是P08，不能把这些旧编号改义为hooks工单。

第一增量优先[DF-04](../release/harness-implementation-2026-09-12/harness-dogfooding.md)：独立合成coding仓库的一个Host托管检查recipe，复用已交付的文件读搜写、记录版本与Files比较。主版本NDA消费者没有自行执行仓库测试的声明，因此DF-04当前为Developer消费者触发，不改成G1–G5普遍前置。

## DF-04可施工合同

- 模型只选recipe ID与获准输入，不提供任意command/argv/cwd/env；可信Host manifest固定recipe版本、Node可执行入口、执行位置、输入文件版本、环境策略、超时与输出限额。
- 工具只在指定coding支持组合广告。现有`TOOLS`默认exposed、未知工具ceiling默认allow，故实现时必须给新能力独立ask/deny上限并由Host守住；不因注册即向全局开放。复用`governTools`的精确输入批准及配置冻结。
- 以Run.id + toolCallId/callId识别执行，不复用Run.commandId。批准展示实际执行recipe、文件版本/cwd、环境和限额；变换后参数必须重新检查。
- `spawn`采用shell:false，最小显式环境，不继承provider密钥或任意NODE_OPTIONS/PYTHONPATH；允许的代码仍具有普通OS用户权限。无个人数据、无共享写目录的合成fixture减少暴露，不构成OS沙箱。支持不受信程序之前须补真正隔离合同。
- 持久结算需独立于Pi普通tool.result：当前Cancel先关admission，普通迟到tool.*会被丢弃。Host必须保存取消后partial stdout/stderr、退出/信号、duration、限额触发与unknown；确认进程及其进程组终止后才称cancelled。停止未确认、派发后回执丢失不得自动重试。
- UI复用现有permission preview、工具调用卡与Inspector。返回stdout/stderr、exitCode、duration、truncated、terminal state及准确Run/call/source引用；进程结束不等于检查通过，退出0也不等于Work正式接受。

初始写权候选：`app/runtime/test-runner.mjs`（新执行器）、`app/server/service.mjs`（组合/settle）、`app/runtime/control-plane.mjs`（descriptor/ceiling）。只有现有approval不能表达精确recipe时才改store/投影/前端合同；Astra先冻结DTO，避免因一个工具扩通用schema。

验收顺序：合成recipe成功/非零退出→deny零执行→精确批准→超时/超输出→运行中取消/进程组回收→回执失败/unknown与重启不重放→下一Run挂起/恢复与旧binding拒绝→真实模型发起一次检查→精确diff及人检查→重开接续。每条保留独立数据、实际退出码和source hash；DF-03外部oracle不得改称agent自运行。

## Hook与其他贡献的后续片

第一hook必须有明确准备/检查/通知消费者，按观察、拦截、变换分型。观察失败可记录继续；权限守门失败不默许；变换后执行参数重新审批。登记触发映射、顺序、超时、取消、重入/派生事件去重、清理watcher/timer/连接/在途资源；撤注册不撤已发生副作用。这个新缺口归本RD，不能借P07 scoped memory覆盖。

前端控制面在Settings/Runtime显示用途、来源/scope、触发与生效边界；正常触发静默，影响流程才浮现；Run Inspector保留历史版本/binding及结果。纯后端贡献也必须有可理解的默认检查入口，不强制专用永久侧栏。

图片解释、屏幕采集、浏览器操作、桌面操作分别授权/验收；有界subagent引用现有[RD-005](RD-005-multi-agent-selection.md)与coordination合同，不能从本轮开发Luna协作推导产品已支持。Slash/manual继续[RD-008](RD-008-command-compaction.md)。受信源码/构建时组合/重启生效是合格扩展形式，不把任意第三方安装、热替换或统一跨runtime ABI设为第一消费者门槛。

## 本地PR准备与停止条件

后续PR文稿可以分为DF-04 recipe、首个hook消费者和必要共享reader三片；这是待开工文稿，不是已创建GitHub PR。每片按原owner提交代码/负例/升级与退出说明，独立非作者审核，再更新current。若普通扩展仍需改主loop或复制正式状态，先定位共享合同缺口，不靠重复一套前端语法绕过。

## 2026-09-16 · DF-04 首个 recipe 已接线（Claude 施工单 03）

按上文合同实现并登记于[03 记录](../execution/claude-frontend-harness-2026-09-16/03-check-recipe.md)与[实现合同](../../app/docs/check-recipes.md)。裁定要点：recipe 只在 Session 的私有 candidate 内执行，用户目录与托管 workspace 从不作为 cwd；catalog 固定于代码（node-test v1），模型只传 recipeId；`check_run` 在 read_only 下 deny、其余一律 ask，批准卡陈述实际命令、位置、时限、输出上限与最小环境；执行为 detached 进程组、shell:false、仅 PATH/临时 HOME/LANG；Host 以 `check.started` / `check.settled` 事件自行结算，取消只在进程组退出后落 cancelled，重启后未结算记 unknown 且不重放。作者证据：Host 定向 66/66，浏览器在同一 candidate 内走通 Exit 1 → 精确批准修复 → Exit 0。未做：Settings/Runtime 的 recipe 入口、真实模型从 GUI 发起、非作者复核；普通子进程仍不称 sandbox。

## 2026-09-19 · Orchestra direction disposition

The [Orchestra direction](architecture-node-2026-09-13/orchestra-direction-20260919.md) keeps ordinary Extensions behind this RD's explicit trusted registry, activation, policy, and evidence boundaries. The reference harness is Host governance composed around the locked Pi loop; it does not first become a universal plugin SDK, marketplace, hot-swap ABI, or second event/acceptance ledger. A Kit may place a small manifest/core constraint before task-relevant fragments and on-demand Skills in Context compilation, but it does not carry credentials, grant permissions, or execute Hermes/Pi/Codex-specific behavior without the relevant Adapter/Extension.

The first consumer remains the existing DF-04 path: real CW GUI read → edit → fixed Host check → exact result/artifact references → interrupt/reopen. Existing synthetic recipe evidence stays synthetic, and the real-model/non-author gates remain open. Browser, computer use, swarm, and broad third-party installation stay deferred until a concrete consumer and isolation contract exist.

## 2026-09-20 · Multica context-injection reference

The [Multica ruling](architecture-node-2026-09-13/multica-consumption-20260920.md) treats runtime-specific instructions/skills/MCP injection and preservation of native configuration as adapter/extension compatibility references. A managed marker is a file-update convention, not a trust or permission boundary. Any CW implementation must keep admitted content hashes/revisions, preserve unrelated bytes and surface conflicts; injected instructions cannot bypass Host grants. This is a future reference under existing owners, not a portable Kit ABI, source import or additional implementation slice.


## First post-integration core slice — 2026-09-20

Base: integrated/cleanup-receipt `main@83041d158cea01f2272f010c098d538617e0c3c6`; isolated branch `codex/harness-core-closure-20260920`. Astra owns the boundary decision and implementation; Luna independently verifies it. The delegated DeepSeek worker could not start because this account channel does not support its model; no credentials or paid-provider workaround is used. This consumes DF-04 / original slice 03 and supports N-02 without claiming to close its real-model evidence gap.

**Problem and invariant.** `createCheckTools` currently closes over the candidate write revision at Run admission and ignores the approved-context argument. A governed `repo_write` earlier in the same Run can therefore leave a later check's permission/started receipt naming the old revision. At check approval and process admission, the Host must describe the actual active candidate revision and refuse a candidate/binding change after approval, before executing unapproved inputs.

**Responsibility and nearest precedent.** Keep authoritative candidate state in RuntimeStore and admission in Host/service; use the existing `repo_write` approved-context and active-candidate checks as the implemented precedent. Reuse `check.started` / `check.settled`, the existing recipe catalog, and `governTools`' approved-context argument. No new loop, schema, registry, UI grammar, model parameter, or arbitrary command is introduced. The necessary seam is `check-tools` ↔ service candidate resolution; change the existing store admission method only if required to validate the start atomically. Existing cancellation/unknown settlement must remain independent of ordinary tool results.

**Exit evidence.** A deterministic same-Run governed write → check must show the incremented revision in permission and `check.started`, run the candidate's actual fixed recipe and retain the result after reopen. Negative cases must reject changed/revoked candidate or stale approved revision with zero process start; deny/read-only and cancellation/restart regression evidence must stay valid. Use synthetic repositories and the existing local provider, with no personal credentials or paid service. The current slice is start-boundary correctness, not a new filesystem snapshot/isolation contract or real-model coding acceptance. Preserve unexecuted browser/model evidence explicitly.

**Exploration disposition.** Adjust Luna's minimum fail-closed suggestion: simply rejecting every same-Run write → check would preserve the old admission snapshot but leave the dogfooding composition broken. Resolve the Host's current candidate before asking, bind execution to that exact approval, and retain fail-closed checks for subsequent changes. The runner's asynchronous temporary-HOME preparation also requires a synchronous final validation immediately before spawn; this is an internal callback, not an Extension hook API.

**Provider-availability clarification (user, 2026-09-20).** This local Codex setup has not registered CC Switch/DeepSeek; the observed delegation error belongs to the Codex account channel. Separately installed Pi and Hermes are different local runtime targets. Their model configuration and capability must not be inferred from this error; no native credentials or configuration were inspected or changed.


## Deferred local hook-management consumer — 2026-09-20

The [personal Settings ruling](architecture-node-2026-09-13/local-agent-runtimes-20260920.md#personal-credentials-hooks-and-browser-dogfooding--2026-09-20) makes hooks a concrete future management consumer under this RD. Preserve native/Host hook distinction, trusted source/hash, typed minimal payloads, explicit data/effect grants, future-run binding and cancellation/disposal. Key storage stays with the Host credential owner; hook configuration cannot carry ambient secrets or gain permissions through prompt text. This is documentation registration only and does not expand the current check-revision slice.

**First-slice result.** [Same-Run approval and final cancellation correction](../execution/claude-frontend-harness-2026-09-16/evidence/core-check-revision-20260920/README.md) is independently accepted for local integration: author 82/82, Luna 27/27. F-01's pre-spawn cancellation is adopted/fixed; no-child cancellation settles once with null exit/signal. Real-model N-02, subsequent hook consumer and Runtime/child implementation remain open.


## Browser consumer intake — 2026-09-21

[Verified precedent selection and lifecycle boundary](architecture-node-2026-09-13/browser-preview-ruling-20260921.md) register the user-requested Browser consumer under RD-009/RD-001. Host must own scoped page/context identity, authorization, human control handoff, effect/unknown receipts and trace/download policy; automation dispose, page close and browser stop are distinct. Current source capabilities stay false. [06d](../execution/claude-frontend-harness-2026-09-16/06d-surface-continuity-20260921.md) implements Preview tabs over current objects only; no browser tool, profile access or execution is enabled. Real Browser remains a later finite vertical slice, separate from the active P03-C Host contract.


## 2026-09-22 · Prepared Kit context contract/compiler candidate

The [parallel Kit K0→K2 handoff](../execution/claude-frontend-harness-2026-09-16/kit-context-core-20260922.md) consumes the existing Runtime Control/source/compiler owners through a bounded Luna source map. It first defines the missing minimal descriptor/context-plan contract under this RD, then permits disjoint pure-module implementation after parent disposition. It does not replace profile CAS, resource loading, permission decisions, Work context or child state, and does not claim a production Kit registry/mount. [Claude06e](../execution/claude-frontend-harness-2026-09-16/06e-role-composer-selection-20260922.md) separately explores the Role-first consumer as an explicit specimen. No new task/process or Host writer was dispatched by this registration.


## 2026-09-22 · Reference-only Kit context planner accepted

[K1/K2 final adoption](../execution/claude-frontend-harness-2026-09-16/evidence/kit-final-20260922/README.md) adds `app/runtime/kit-context.mjs` over already-admitted Runtime Control resources, reusing `compileControlContext` and `resolveRuntimeSource`. Exact pins, deterministic budgeted context, deferred bodies, evidence-qualified compatibility and copied permission readings are checked independently. This is a pure compiler plus synthetic consumer, not a new Kit runtime/catalog or a saved selection→Run transaction. Resource import/removal, profile CAS and frozen Host/Adapter identity remain with their existing owners; native contributions and permissions cannot be created by a compiled plan.


## 2026-09-24 · Canonical cancelled check settlement

The original DF-04 contract retained the child process's exit code or signal on an in-flight cancellation. P03-E exposed that Node can observe the same Host cancellation as either a handled `SIGTERM` followed by exit code 1 or direct `SIGTERM` termination. The Host contract now treats `cancelled` as the canonical check outcome and records null `exitCode`/`signal` after the process group is confirmed exited, while retaining captured partial stdout/stderr and duration. The process runner still reports its actual close tuple internally; the Host deliberately does not persist that race-sensitive detail. Completed and timed-out checks continue to retain observed exit facts. The exact-one-settlement invariant remains required. This narrows persisted process telemetry to keep Host records stable across the Pi and Agents consumers and supported Node versions; no schema change is needed because both fields are already nullable.


## 2026-09-27 · RL-1 bounded runtime_load recovery (real CW author)

Status: authorized and ready for the real CourtWork coding author on product `9fb8dbb`. Parent Astra owns this contract, integration and acceptance; Luna owns non-author verification. The author may change only `app/runtime/control-tools.mjs` and add `app/tests/runtime-load-recovery.test.mjs`. Other production authors (Runtime inventory I1 and Claude UI) retain their assignments. This is a runtime context-tool diagnostic change, not a new Core tool, resource catalog, permission or execution path.

Trigger: the real 2026-09-20 and 2026-09-27 coding dogfoods attempted `runtime_load` as catalog/recipe discovery and got only “Context resource is not exposed to this run”. Existing Runtime Control binding owns admission and exposed content; `createRuntimeLoadTool` owns model-facing recovery text. Nearest precedents are its successful load receipt and `control-plane.test.mjs`'s real Host context-loading test. No schema, UI, provider, package, registry or binding-hash change is needed.

External precedent checked 2026-09-27: [MCP TypeScript SDK tool errors](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/servers/errors.md) explicitly illustrates a missing-ID tool error containing known IDs so the model can recover. Adopt the explanatory pattern only. Retain Pi's current thrown-error → model-visible `isError` conversion; do not import MCP transport behavior into this local tool or install a dependency.

Contract:

1. The tool description and id parameter explain that this loads one admitted skill/reference by its exact ID, not a catalog/list/check-recipe command. No special meaning for the literal `catalog`; if it were a real admitted resource ID it must remain loadable.
2. A missing lookup still throws an Error starting with the existing sentence. Append a useful recovery hint from **this Run's supplied frozen binding only**. Hint IDs must be skill/reference content with a matching exposed descriptor of the same kind. Never include unexposed/wrong-kind/other-scope IDs, resource bodies, source URIs, titles or the caller's untrusted input.
3. Sort/deduplicate IDs deterministically. Include at most 8 complete JSON-quoted IDs and bound the complete error to 1200 UTF-16 code units. State when additional IDs were omitted; never truncate inside an ID. If none is loadable, explicitly say none is available in this Run and that this tool cannot discover check recipes. Do not call onLoad or mutate a binding on a failed lookup.
4. Successful payload bytes, details/revision, onLoad metadata and governTools permission/error semantics stay unchanged. This work does not promise that prompts prevent all invalid calls.
5. Test the original missing-ID failure, useful allowed-ID hint, empty catalog, hidden/wrong-kind/body/URI non-disclosure, deterministic bounded odd/long IDs, no mutation/no onLoad on failure and unchanged successful loading. Add one public-HTTP/fake-Pi integration case showing invalid-ID tool error then admitted-ID success and exactly one runtime.context.loaded event. Follow existing helpers; synthetic independent data/ports only.

Execution: use CW's ordinary source/candidate tools and exact per-write approval. This full-repository candidate cannot run a narrow test selection through the current `node-test` recipe (fixed `node --test` at root); **do not invoke check_run or claim tests ran**. Parent supplies dependencies and runs `node --test --test-concurrency=1 tests/runtime-load-recovery.test.mjs tests/control-plane.test.mjs tests/runtime-proposals.test.mjs` from candidate `app/`, then existing fake runtime smoke if accepted. Report implementation and unrun checks honestly. Preserve all unrelated files. No arbitrary bash, upstream patch, product service restart, push or deployment. Parent review/integration remain required before production behavior changes.


RL-1 parent integration boundary (2026-09-27): author `263ddcd` correctly flagged the AM-C retained request golden. Parent reproduces its one failing test: only runtime_load description and id.description differ. Adopt the finding; preserve `request-baseline.json` historical bytes. Parent owns an explicit expected-description delta in `app/tests/architecture-maintenance.test.mjs`, following its existing separately asserted added-tool precedent. This adds test-consumption work only, not another production owner or relaxed wire equality. Luna verifies the three AM-C cases at the final fixed SHA in addition to RL-1/Control/proposal checks.


RL-1 disposition: **adopt**, independently reviewed and integrated into local main `3b274a4`. [Evidence](../execution/claude-frontend-harness-2026-09-16/evidence/runtime-load-recovery-20260927/README.md) separates CW real-provider authorship from Luna external 30/30 + AM-C3/3 / permission probe and parent fake smoke. Retained golden bytes are unchanged; two approved source/test writes and one denied extra workspace write are recorded. This closes only the diagnostic task; native edit/bash, configurable recipes, model efficiency and formal Core acceptance are not claimed. Running user Host was not restarted, so it retains the previously loaded implementation.

## 2026-10-02 · Handoff to Astra: three check tests red on Linux

Status: open, for Astra to rule. Prepared by the Claude (Opus) session that built the work of the [review of `6692b91`](../reviews/first-principles-6692b91-2026-10-01/README.md#package-5--as-built). It rules nothing here: check containment is this RD's, and each item below is a choice between changing the product and changing the contract.

### What is red

`main` at `f07b423` (product head `0047a12`). The Runtime workflow on GitHub `ubuntu-latest` fails the same three tests in both Node jobs (22.19.0 and 24.x): 2124 tests, 2105 pass, 3 fail, 16 skipped. Three runs of the same product tree gave the same result: [36878792989](https://github.com/lesPrivilege/Courtwork/actions/runs/36878792989) (review branch, `be8f63d`), 36880628501 (`main`, `9a73da2`), [36885961247](https://github.com/lesPrivilege/Courtwork/actions/runs/36885961247) (`main`, `f07b423`). On macOS the suite is 2124/2124. The workflow's smoke and link steps run and pass; only the test step fails.

All three were among the 23 that failed on `6692b91`. They are what remains once a check can start on Linux at all (the sandbox helper was hidden from the sandbox; fixed in `18d4487`). No test was changed to hide them.

| # | Test | Linux result | Contract sentence it tests |
|---|---|---|---|
| L1 | `check-runner-group-kill.test.mjs` · "the recipe's own exit signal is reported, including signals the guard's Node runtime handles" (recipe `kill -USR1 $$`, then PIPE, TERM) | First case: `result.signal` is `null`, expected `SIGUSR1`. The exit code was not printed; PIPE and TERM did not run | "the result carries the recipe's own exit code or signal" ([check recipes](../../app/docs/check-recipes.md#timeout-and-output-limits)) |
| L2 | same file · "a recipe that signals its own group and handles it reports its own exit" (recipe `trap 'exit 0' HUP; kill -HUP 0; sleep 5`, then INT, QUIT) | First case: `result.exitCode` is `129`, expected `0`. INT and QUIT did not run | the same sentence |
| L3 | `check-sandbox.test.mjs` · "the candidate, its Git metadata and the data directory are read-only; the check's own temporary directory is writable" | The probe prints `DENIED new EROFS`, `DENIED existing EROFS`, `DENIED git EROFS`, `WROTE data`, `WROTE tmp`: the write to `<data directory>/written.txt` succeeds inside the sandbox. The test stops there, so its later assertion that the real data directory still lists only `credentials.json` and `repository-candidates` did not run | "**Write** only its own temporary directory" ([environment policy](../../app/docs/check-recipes.md#environment-policy)) |

### L1, L2 · the Host does not see the recipe's own exit on Linux

Established by reading (`app/runtime/check-guard.mjs`, `check-runner.mjs`, and the pinned library's `dist/sandbox/linux-sandbox-utils.js`; [source card](../ecosystem/sandbox-runtime-source-card.md)):

- The guard reports the exit of its direct child. That child is `/bin/sh -c <wrapped command>`, and on Linux the wrapped command is `bwrap --new-session --die-with-parent … --unshare-pid … -- /bin/sh -c '<apply-seccomp> /bin/sh -c <recipe>'`. `apply-seccomp` makes a nested user and PID namespace and is PID 1 in it; the recipe is its descendant. On macOS the wrapper is `sandbox-exec` and both tests pass: there the status the guard sees is the recipe's.
- So on Linux the status the Host records is the wrapper chain's, not the recipe's. L1 shows a signal death arriving without a signal. L2's 129 equals 128 + SIGHUP.

Not established: which process turns the signal into an exit code (bubblewrap's source is not in the tree, `apply-seccomp` ships as a binary); what L1's exit code is; in L2, which process the group-wide HUP kills, given that the recipe itself traps it.

Options:

1. **Recover the recipe's own status.** A Host-owned shim inside the sandbox runs the recipe as its child and writes its code and signal where the Host reads them (the check's temporary directory, or a descriptor passed through). It touches the guard, the runner and the sandbox policy (the shim must be readable inside the sandbox, like the Node installation), and the recipe's command line changes on both platforms unless the shim is Linux-only. The contract sentence stays true.
2. **State the Linux behaviour.** On Linux a recipe that dies of signal *n* is recorded as `exitCode: 128 + n, signal: null`, and a recipe that signals its own group may be recorded as killed. The two tests become platform-conditional with the observed codes. `check.settled.signal` then means different things per platform, and a recipe that exits 129 by itself is indistinguishable from one killed by HUP.
3. Mapping `128 + n` back to a signal in the runner: not recommended, for the ambiguity just named.

Either way a `cancelled` check is unaffected: it records null `exitCode` and `signal` by the [2026-09-24 ruling](#2026-09-24--canonical-cancelled-check-settlement).

### L3 · a check can write where the data directory was

Established by reading: the library replaces each `denyRead` directory with `--tmpfs <dir>` (`pushReadDenyDirMounts`, about line 1200 of `linux-sandbox-utils.js`) and binds the `allowRead` entries back read-only. The tmpfs is writable. The home directory is denied the same way, so the same holds there. On macOS the policy has no such shadow and the write is refused.

By that mechanism the write lands in memory inside the sandbox's mount namespace and is gone with it; the real directory is not written. That is a reading, not an observation: the assertion that would show it did not run on Linux.

Two things follow that the contract does not say: on Linux a check sees empty, writable directories at the home and data paths, and what it writes there is memory it takes for the life of the check (no size is set on the tmpfs).

Adding the two directories to `denyWrite` does not look like a way out: the library re-applies the tmpfs after a `denyWrite` bind that would re-expose a denied directory (about lines 2286–2300), which leaves it writable again. This too is read, not run.

Options:

1. **Make the shadow read-only.** Needs something the library does not offer today: an upstream change or option, or Courtwork rewriting the bubblewrap arguments it gets back. The second couples the Host to the library's argument layout.
2. **State the Linux behaviour** in the environment policy: denied directories are empty in-memory directories inside the sandbox; nothing written there reaches the Host; and bound it if a bound is wanted. The test then asserts on Linux what matters, that the real home and data directories are unchanged, and accepts either a refusal or a discarded write from the probe.

### What a ruling needs first

One Linux run of a small probe, not more reading. No Linux host or container runtime exists on the development machine; the only Linux available is the GitHub runner, and each run needs a push the user authorizes. A probe test file, skipped off Linux, could print in one run:

- for each of USR1, PIPE, TERM, HUP, INT, QUIT: the runner result's `exitCode` and `signal`;
- during a check, `ps -A -o pid,ppid,pgid,sid,args` from the Host, to see which processes share the guard's group and session;
- after the L3 probe, a listing of the real data directory and of a synthetic directory under the real home;
- the L3 probe again with the two directories added to `denyWrite`, and whether a read of a synthetic file under them is still refused.

### Same owner, same run

Not failing tests, but open under the same contract and answerable by the same probe ([review record](../reviews/first-principles-6692b91-2026-10-01/README.md#package-5--as-built)):

- The runner confirms that the guard's process group is gone. `--new-session` puts the sandboxed tree outside that group, so on Linux a check may settle before its last process is reaped. The tests that scan the Host's process table at settle passed in all three runs; that is not a proof of the ordering. "Process lifetime" in the contract still carries *Not run* for Linux.
- The Host's stop is a `SIGTERM` to the guard's group. It does not reach a recipe behind `--new-session`; the recipe ends by `SIGKILL` through `--die-with-parent`. The contract's timeout paragraph reads as if the recipe received `SIGTERM`.
- An install reached through a symlink under the home directory (`npm link`, pnpm) hides the helper again: the policy re-allows the helper's real directory, the library runs the unresolved path.

### Boundaries

No real provider, no person's files: every probe above uses synthetic files, as the existing sandbox tests do. Acceptance of whatever is ruled stays with Astra; this section is an input, and the author of the review work does not accept it.

