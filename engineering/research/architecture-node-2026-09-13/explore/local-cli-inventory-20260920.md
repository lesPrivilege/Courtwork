# Installed local agent CLI inventory

2026-09-20 · Courtwork baseline: `main@72c91a2f070cc8e134f1d09cebc7de735ff89415`. This is a read-only local inventory for the Orchestra direction. It records installed command metadata and implementation surfaces; it does not accept a runtime, create a CW adapter, or start a provider lane.

## Scope and safety boundary

The controller checked `command -v`, `--version`, and help only. Each installed CLI received at most three binary invocations and the total was 15 binary invocations, below the 20-call limit. The checks did not pass a prompt, run `chat`, `run`, `exec`, `serve`, `auth`, `doctor`, `status`, `config`, or `session`, and did not inspect configuration, credentials, native transcripts, or personal session stores. No active Claude process or worktree was touched. The existing Hermes/Praxis consultation receipt was reused; it was not rerun.

The targeted metadata commands were: `codex --version`, `codex exec --help`, `codex --help`; `claude --version`, `claude --help` twice for filtered capture; `pi --version`, `pi --help` twice for filtered capture; `hermes --version`, `hermes --help`, `hermes acp --help`; and `opencode --version`, `opencode --help`, `opencode run --help`. `command -v` located all five binaries. No prompt-bearing invocation was made.

The repository was on `main` at the SHA above with the previously observed documentation work in progress. No product source or test file was changed by this inventory. The only authorized repository output from this task is this file.

## Installed command facts

| CLI | Installed path and version | Headless / structured surface observed locally | Continuation, cwd and permission surface | Boundary and adapter reading |
|---|---|---|---|---|
| **Codex** | `/Applications/ChatGPT.app/Contents/Resources/codex`; `codex-cli 0.155.0-alpha.9.2` | `codex exec` is explicitly non-interactive. Its help exposes `--json` as JSONL events, `--output-schema <FILE>`, and `resume` / `fork` subcommands. Top-level help lists `app-server` and `exec-server`; their protocols were not started or probed. | `resume` and `fork` are explicit. `-C/--cd <DIR>` sets the agent working root. `--sandbox` accepts `read-only`, `workspace-write`, or `danger-full-access`; approval flags are separate (`--ask-for-approval`, `--approve-for-me`, and the dangerous bypass option). No `--no-tools` option appeared in the selected `exec` help. | A process JSONL adapter and the separately exposed app-server are different candidates. Sandbox/approval do not prove CW tool admission or effect settlement. Do not revive the removed `codex mcp-server` path. |
| **Claude Code** | `/opt/homebrew/bin/claude`; `2.1.224 (Claude Code)` | `-p/--print` is non-interactive. Help exposes `--output-format text|json|stream-json`, `--input-format text|stream-json`, `--json-schema`, partial-message streaming, and replay of streamed input. No RPC command was listed. | `--continue`, `--resume`, and `--fork-session` are explicit. There is no dedicated `--cwd` flag in the observed help; invocation uses the process directory, with `--add-dir` for extra access and `--worktree` for a managed checkout. `--permission-mode`, `--tools`, allow/deny tool lists, and dangerous bypass flags are separate controls. The help advertises an empty `--tools` value for disabling built-in tools, but this is tool exposure, not an OS sandbox. | The stable local seam exposed here is a print/stream process adapter. Resume identity and permission mode remain Claude-owned facts until a bounded adapter proves their mapping. Do not interpret an idle or absent author process as a runtime capability result. |
| **Pi** | `/opt/homebrew/bin/pi`; installed package `/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent` `0.84.1` | `--print` plus `--mode json` is a JSON event stream. `--mode rpc` is a bidirectional JSON-over-stdin/stdout mode. The installed implementation documents strict LF-only JSONL framing, request IDs, `response` records, streamed `AgentSessionEvent` records, and extension UI requests (`dist/modes/rpc/rpc-mode.js:1-23,28-39`; `dist/modes/rpc/jsonl.js:3-18`). | `--continue`, `--resume`, `--session`, `--session-id`, `--fork`, and `--session-dir` are explicit. The process cwd is passed into the session manager; the source resolves the final cwd before creating cwd-bound services (`dist/main.js:525-534`). `--no-tools` maps to `noTools: "all"`, `--no-builtin-tools` maps to `"builtin"`, and allow/deny lists are parsed separately (`dist/cli/args.js:79-95`; `dist/main.js:417-424`). | This is the clearest local reference for a CW process Port and a native SDK seam. It is still trusted process code, not a sandbox: disabling the model tool registry does not establish OS isolation. The package exports `AgentSession`, `AgentSessionRuntime`, `createAgentSession`, coding/read-only tool factories, `runPrintMode`, and `runRpcMode` (`dist/index.d.ts:3,18,27`). |
| **Hermes** | `/Users/lesprivilege/.local/bin/hermes`; `Hermes Agent v0.21.3 (2026.9.14)`, upstream revision printed as `d7b836ab` | Top-level help exposes `-z/--oneshot` (final response text), `--resume`, `--continue`, `--in`, and a separate `acp` command. The prior bounded receipt used `chat --query-file ... --oneshot --format stream-json`; that result had one init, one terminal result, and zero tool-use/tool-result events. The current top-level help does not itself establish a stable JSONL wire contract. | `--in DIR` and `--no-restore-cwd` are explicit. `--resume` / `--continue` identify Hermes-native sessions. `--toolsets`, `--accept-hooks`, `--yolo`, `--ignore-user-config`, and `--safe-mode` are visible. `--oneshot` help says tools, memory, rules and `AGENTS.md` still load normally and approvals are auto-bypassed. | No documented `--no-tools` flag was observed. The earlier `--toolsets none` was verified as a version-specific empty selection, not a stable read-only or enforcement boundary; zero observed tool calls was only an observation. ACP is a possible transport, but the local help did not expose its message contract. Treat Hermes as a candidate Attention runtime pending an explicit transport and recovery fixture. |
| **OpenCode** | `/opt/homebrew/bin/opencode`; `1.18.11` | Help exposes `run`, `serve`, `attach`, `acp`, and `mcp`. `run --format json` is described as raw JSON events; the default is formatted output. `serve`/`attach` provide a long-lived server seam. | `--continue`, `--session`, and `--fork` are explicit. A project path is positional; `run --dir` is documented for a path on a remote server when attaching, rather than as a general `--cwd` contract. `--auto` auto-approves permissions not explicitly denied and is marked dangerous. `--pure` disables external plugins; it is not a no-tools mode. | Local help gives a process/server candidate but no native SDK export. The installed package metadata has no exports or SDK dependency. Agent permissions and server/session semantics remain OpenCode-owned until a wire-level fixture is authorized. |

The local version of Pi is **0.84.1**, while Courtwork's application dependencies remain pinned to Pi packages **0.85.1** in `app/package.json:19-21`; the ecosystem report also used the 0.85.1 upstream pin (`orchestra-ecosystem-20260919.md:9`). The local OpenCode is **1.18.11**, whereas that report's documented source pin is **1.18.31** (`orchestra-ecosystem-20260919.md:13`). Hermes has the same displayed release as the prior receipt, but the local receipt records revision `d7b836ab…` while the ecosystem report cites a different source pin (`orchestra-ecosystem-20260919.md:10`). These are installed-versus-research differences, not upgrade recommendations. A CW adapter must pin and report the executable/package revision it actually uses; a global CLI must not silently stand in for the locked in-process Pi dependency.

## Protocol comparison

The installed surfaces fall into three useful classes:

1. **One-shot/event streams.** Codex `exec --json`, Claude `--print --output-format stream-json`, Pi `--mode json`, and OpenCode `run --format json` produce structured process output. This is suitable for capture and projection only after the event schema, exit semantics, continuation identity, and stderr policy are pinned. A JSON event stream alone is not a recovery protocol.
2. **Bidirectional JSONL control.** Pi `--mode rpc` is the strongest locally inspectable example. Its installed source reads one JSON command per LF-delimited record and writes correlated responses plus events. It includes prompt, steer, follow-up, abort, session, model, compaction, export and state-oriented commands in the RPC switch. This is closer to a reusable local Runtime Port than parsing assistant text.
3. **Long-lived server or native client surfaces.** Codex exposes `app-server` in the local CLI and its official SDK documentation describes TypeScript control of local threads and Python control of the local app-server over JSON-RPC. The official page also says `codex mcp-server` and the standalone binary were removed, and that the SDK can start, continue and resume local threads: <https://developers.openai.com/codex/sdk>. OpenCode exposes `serve`/`attach`; Hermes exposes ACP; neither was started here. These are separate server/client contracts, not aliases for the one-shot JSON streams.

The most reusable CW seam is therefore the existing small Port vocabulary—describe/admit binding, start/continue, observe/recover, reply/tool-result, interrupt/cancel, and dispose—mapped per transport. The adapter must preserve native references and expose unsupported operations before dispatch. It should not convert a process's output stream into a second scheduler, invent a portable private transcript, or treat a native child tree as CW-owned state.

## No-tools and permission conclusions

“No model tool calls were observed” is not equivalent to “the runtime enforces no tools.” The local evidence supports the following narrower conclusions:

- **Pi:** `--no-tools` is an explicit model-tool registry switch and the installed source maps it to all built-in and extension tools. It is still not process isolation, and extension/runtime code remains a trusted local boundary.
- **Claude:** `--tools` with allow/deny controls is documented, including an empty selection for built-in tools. Permission modes and dangerous bypass flags are separate. No execution was performed to test the interaction between tool selection and stream output.
- **Codex:** the observed contract exposes sandbox and approval controls, but no no-tools switch. An `environment:none` or function-only hosted contract belongs to the separate Agents API work and cannot be inferred from this local CLI help.
- **Hermes:** `--toolsets` is an invocation selection, but `none` is not documented by the current top-level help as a reserved no-tools value. The prior consultation's zero tool events remains a bounded observation. A future no-tools claim requires a deterministic enforcement fixture or an explicitly authorized live run.
- **OpenCode:** `--pure` concerns plugin loading and `--auto` concerns permission approval. Neither is a no-tools contract in the observed help.

None of these switches grants CW authority. CW still needs Host admission, capability intersection, effect/result receipts, cancellation and recovery evidence, and a separate distinction between a process boundary and an execution Environment.

## Profile, cwd, auth and Settings ownership

The upstream CLI owns its own profile/configuration, native session store, provider authentication and native transcript. This inventory did not read any of those stores. The observed ownership split for a future CW adapter is:

| Concern | Upstream CLI/runtime owns | CW Host owns |
|---|---|---|
| Profile and native session | Codex `CODEX_HOME`/CLI profile, Claude settings and session identity, Pi `~/.pi/agent` session/config roots, Hermes named profiles and native session persistence, OpenCode project/session database | A reference to the admitted Runtime binding and native identity; no copied private transcript or implicit session migration |
| cwd / Environment | The CLI's process cwd and its own `--cd`, `--in`, project, `--add-dir`, or `--dir` interpretation | The declared action/tool location and Environment constraints for the CW Run; this is separate from where the harness process is installed |
| Provider / auth | The CLI's provider/model selection and credentials | CW's provider binding metadata, capability/permission intersection, budget and diagnostic status; never credential migration by implication |
| Runtime / plugin | Runtime process, protocol, native extensions and native plugins | CW Runtime Adapter admission and lifecycle; a Runtime is not a Provider or a CW Plugin |

The current UI has Settings groups **Models**, **Tools & Integrations**, **Skills**, **Plugins**, **Permissions**, and **Developer**; the source explicitly says Runtime is an architecture term currently placed under Developer (`app/web/settings-view.mjs:1673-1691`; the Runtime block is projected from Settings → Developer in `app/web/app.mjs:4427`). The current control-plane contract says the local Host composes runtime resources, permissions, context, model connections and MCP, while configuration remains with the Host (`docs/runtime-control/INDEX.md:3,20-45`; `app/docs/runtime-foundation.md:12-31`). The proposed **Settings → Agents → Runtimes** placement is a direction for future GUI work, not an implemented surface. It should keep Runtime selection/admission separate from Provider credentials and Plugin package lifecycle; Developer can remain the technical diagnostics surface during the transition.

## Next bounded samples

No sample below was started in this inventory. The next useful evidence can be collected in this order, with an isolated directory, synthetic transport where possible, and explicit provider authorization before any model call:

1. **Pi RPC parity fixture.** Use the CW-locked Pi `0.85.1` package rather than the globally installed `0.84.1`. With a deterministic/fake model or a non-inference protocol fixture, capture LF JSONL request/response/event framing, correlation IDs, state inspection, abort and dispose. Separately prove what `--no-tools` removes from the model-visible registry; do not call it a sandbox result.
2. **Codex local contract pin.** Pin the installed `codex-cli` revision and generated app-server schema before trying the app-server. A later authorized sample should compare `exec --json` with the bidirectional app-server lifecycle, using `-C` and read-only approval/sandbox settings. Do not use the removed MCP server command.
3. **Hermes transport/no-tools fixture.** First inspect the current `chat` subcommand help in a metadata-only pass if the structured invocation is needed. Then use either a deterministic offline transport or an explicitly authorized inference run to prove tool denial, cwd behavior, continuation and recovery. The existing Praxis receipt is evidence of a configured one-shot consultation, not of those boundaries.
4. **Claude and OpenCode process/server fixtures.** Capture their structured event schemas, exit/unknown behavior, native session references and permission changes in isolated synthetic lanes. Do not infer resume or permission parity from flags alone, and do not promote either CLI to a CW Runtime until a non-author review records the mapping.

This report is exploration only. It does not implement an adapter, modify Settings, register a Runtime, install a package, invoke a provider, or close any RD/DF/runtime acceptance gate.

## Motto / local worker check (2026-09-20)

### Observed installation and launcher

`command -v motto` reported `/Users/lesprivilege/bin/motto`; `command -v moto` reported no result. In this shell, invoking the bare `motto` name then returned `command not found`, so the PATH entry is not treated as a reliable executable contract. The visible wrapper is a symlink to `/Users/lesprivilege/Projects/Motto/scripts/maint/motto`, which delegates to `/Users/lesprivilege/Projects/Motto/scripts/maint/launchers/motto`. The direct launcher was executable and returned the following identity block without starting an agent or provider:

```text
Motto Pi
base: 0.85.1
upstream: d981de1229ef899957bbe968bc8dcda02a21f477
patchset: motto.single-repo (20 applied patches + 2 upstreamed)
release: 2026-09-09.0
```

The launcher reported the downstream build at `packages/coding-agent/dist/cli.js` as present and delegates to it with `node`; this is not the documented zero-build fallback to the official Pi executable. Public package metadata identifies `@earendil-works/pi-coding-agent` `0.85.1`, `piConfig.name = motto`, `piConfig.configDir = .pi`, `main = ./dist/index.js`, the CLI bundle entry `dist/bundle/cli.js`, and public `./rpc-entry` and `./client` exports. The package requires Node `>=22.19.0`.

### Interface facts visible in help and metadata

Motto exposes the Pi-style non-interactive and structured surfaces:

- `-p/--print` for non-interactive execution;
- `--mode text|json|rpc`;
- `--continue`, `--resume`, `--session`, `--session-id`, `--fork`, `--session-dir`, and `--no-session`;
- `--no-tools`, `--no-builtin-tools`, `--tools`, and `--exclude-tools`;
- `--approve` and `--no-approve`, which control trust of project-local files;
- `--no-extensions`, `--no-skills`, `--no-context-files`, and `--offline`.

There is no dedicated `--cwd` flag in the observed help. The launcher does not change directory, so the process working directory must be supplied by the parent subprocess/Host. `--session-dir` controls session lookup/storage independently of that working directory. The help gives a read-only example using `--tools read,grep,find,ls`, but no isolated proof run was performed; the actual tool boundary, RPC record schema, continuation semantics, and interrupt behavior therefore remain unverified. `motto auth` and credential-printing examples were not invoked. Provider credentials and profiles remain downstream Motto/Pi concerns; CW should admit a binding and record the executable/version, without reading or importing those credentials.

### Smallest reproducible Codex-to-worker bridge

A provisional Codex `exec` worker bridge can be made reproducible with these recorded inputs and receipts:

1. Pin the absolute Motto launcher/downstream path and capture the full Motto identity block before dispatch.
2. Set the subprocess working directory explicitly from the Host and use an isolated session directory or `--no-session`; do not rely on the caller's ambient cwd.
3. Select `--mode json` or `--mode rpc` only after a fixture confirms the exact input/output records. Keep stdout as the structured channel, stderr as diagnostics, and retain exit code, timeout, interruption, and process termination facts.
4. Start from `--no-tools` or an explicit allowlist such as `--tools read,grep,find,ls`; add `--no-extensions`, `--no-skills`, and `--no-context-files` when deterministic admission is required. Treat `--approve/--no-approve` as project-file trust controls, not as a complete sandbox contract.
5. For continuation, persist and bind the exact session path/ID and version; never use an ambient `--continue` session. A worker result is complete only with the structured result, exit/interrupt observation, and artifact/result references.

This is a process bridge that Codex can launch or supervise through `exec`; it is not yet a CW-controlled child. A future CW-controlled child must separately bind a Host Run/Session, admitted runtime and permissions, explicit lifecycle (`start`, `continue`, `observe/recover`, `reply/tool-result`, `interrupt/cancel`, `dispose`), and receipts/result references. The native Motto session remains a runtime reference owned by the adapter; CW must not create a second scheduler or duplicate cancellation authority. No Motto agent, server, provider, structured exchange, or continuation was started in this inventory.
