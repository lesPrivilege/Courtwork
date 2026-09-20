# CC Switch consumption note

**Lookup date:** 2026-09-20. **Upstream pin:** CC Switch v3.20.3, commit `d695a2d77fd9081eafd3e9eedcbf2a97b3410928`. **Method:** read-only inspection of the pinned first-party user manual; no CC Switch installation, provider call, switch, OAuth flow, or personal credential/config inspection was performed. This is a bounded consumption of the existing Provider-plane direction, not a CW implementation or acceptance claim.

Primary sources: [Add Provider](https://github.com/farion1231/cc-switch/blob/d695a2d77fd9081eafd3e9eedcbf2a97b3410928/docs/user-manual/en/2-providers/2.1-add.md) and [Switch Provider](https://github.com/farion1231/cc-switch/blob/d695a2d77fd9081eafd3e9eedcbf2a97b3410928/docs/user-manual/en/2-providers/2.2-switch.md). Local constraints are [the pinned ecosystem exploration](orchestra-ecosystem-20260919.md) and [the Provider-plane ruling](../orchestra-direction-20260919.md).

## 1. Provider and configuration objects; storage, writeback, backup

CC Switch is organized around provider profiles for application targets, not around a portable agent registry. The pinned Add Provider manual lists app-specific profiles for Claude Code, Claude Desktop, Codex, Gemini, OpenCode, OpenClaw, and Hermes. It also has a Universal Provider object. Universal providers have a name, API key, endpoint, and selected target apps; the documented sync targets are Claude Code, Codex, and Gemini. Presets, custom JSON/TOML, optional notes, and model fetching are profile inputs. The form can query an OpenAI-compatible `/v1/models` endpoint, but that is model discovery for a configured endpoint, not runtime discovery.

The documented native config shapes are target-specific. Claude uses environment variables such as `ANTHROPIC_API_KEY` and `ANTHROPIC_BASE_URL`. Codex separates `~/.codex/auth.json` (`OPENAI_API_KEY`) from `~/.codex/config.toml`, whose fields include `model_provider`, `model`, `model_reasoning_effort`, `disable_response_storage`, and `[model_providers.<id>]` with `base_url`, `wire_api`, and auth requirements. Gemini uses `.env` plus `settings.json`. Exact OpenCode, OpenClaw, and Hermes field schemas, and the internal database location/schema/encryption, are **unknown from the inspected pages**.

The control-plane storage and target-app projections are separate concerns. CC Switch stores provider configurations in an internal database that can be exported/imported as SQL; the documented backup includes all provider configs, MCP configs, prompt presets, and usage logs. Import overwrites the existing database after confirmation. Switching writes target files: Claude `~/.claude/settings.json`, Codex `~/.codex/auth.json` and sometimes `config.toml`, and Gemini `~/.gemini/.env` and `settings.json`. Per-app views are isolated for ordinary switching. Universal `Save` does not sync immediately; `Save and Sync` or manual Sync overwrites linked app providers, and deleting a universal provider deletes linked app configurations. The pages do not state whether restoring the SQL database re-projects every live app file, so that restore-to-file behavior is **unknown**. The manual says OAuth refresh tokens remain in the local data directory and are not exportable; this was not independently inspected.

## 2. What a switch affects

The source contract is configuration activation: enable a profile, update the config file, and mark it active. Claude hot-reloads; Gemini rereads `.env` per request; Codex requires closing and reopening the terminal. This establishes a reload/restart boundary for subsequent application use. It does **not** establish whether an in-flight request, resumed native session, or historical transcript changes provider/model, and the inspected docs are silent on that point.

CW should therefore consume the fact as a future-run configuration change. The existing CW precedent remains authoritative: model scope is “all chats · future runs,” saves use an expected version, and an active Run keeps its admitted binding frozen. A provider/model switch must disclose the new binding and any restart requirement; it must not be described as mutating an existing native session. Native-session rebinding, in-flight behavior, and post-switch continuation are **unknown** and require a runtime-specific adapter contract before support.

## 3. Runtime control boundary

The pinned manual documents provider CRUD, model-list fetching, local protocol-routing modes, tray residency, OAuth polling, and a user-facing Codex restart instruction. Those are configuration, routing, or CC Switch process behaviors. I found no documented contract here for installing or discovering agent runtimes, spawning or supervising worker processes, persisting CW-owned child state, recovering a native session after process loss, or interrupting/cancelling a run. The manual's instruction to restart Codex is not process orchestration, and a local Responses/Chat Completions conversion is not a runtime lifecycle.

Accordingly CC Switch cannot be used as evidence that CW has runtime orchestration. Runtime ownership remains with the upstream runtime and its adapter; CW retains binding, capability, permissions, effects, results, recovery facts, and explicit unknown outcomes.

## 4. CW disposition

| Disposition | Consume | Boundary |
|---|---|---|
| **Adopt** | Explicit app/profile scope; per-app active status; visible file writeback; live-reload versus restart disclosure; provider protocol conversion as a named adapter fact; model-list discovery as provider metadata. | Keep Provider and Model as execution configuration, separate from Role, Kit, Runtime, grants, and Run identity. |
| **Adjust** | Universal-provider opt-in sync and SQL export/import are useful control-plane patterns. | Put them behind CW provider-control ownership, configuration revision/CAS, explicit target scope, and confirmation. Backups must be config/profile metadata only; credentials, sessions, permissions, effects, and result history remain separately owned. Restore must state whether projections are rewritten. |
| **Reject** | Treating CC Switch as a CW gateway, default dependency, credential owner, global config rewriter, child scheduler, recovery authority, or cancellation authority; treating “OpenAI-compatible” or converted protocol as model/capability equivalence; silent cross-provider fallback. | These conflict with the Provider-plane ruling and the existing Host/Runtime contracts. |
| **Defer** | A live CC Switch connector, runtime install/discovery/supervision, native-session recovery/cancel integration, and per-agent provider scope. | Astra’s current Settings ruling keeps Agent profiles/Runtimes distinct from Models’ existing provider configuration; the runtime technical surface remains with Developer until a concrete consumer and adapter evidence exist. |

The practical conclusion is narrow: CC Switch is a useful precedent for an explicit provider control plane and its projection/restart disclosures. It is not a runtime orchestra, and its config switch must never be presented as one.
