# Source intake and implementation boundaries

This index separates observed upstream behavior, adopted concepts, and unimplemented adapters. Supplied references are research input, not authority to change work-state ownership. Package versions below are pinned in the lockfile where used.

| Source / observed version | Adopted here | Not adopted / adapter risk |
|---|---|---|
| Pi `@earendil-works/pi-{agent-core,ai,coding-agent}@0.85.1`; public installed source | Existing AgentSession execution; public frontmatter parser; custom tool wrappers | No Pi fork or private SDK patch; no parallel execution owner |
| [MCP 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28), official [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk), `@modelcontextprotocol/client@2.0.0` | Explicit modern pin vs legacy negotiation, SDK descriptor validation and Streamable HTTP calls | No assumption that SDK v2 default means modern protocol; no OAuth/stdio, remote resource reads or prompt invocation |
| [Agent Skills specification](https://agentskills.io/specification), observed 2026-09-07 | Name/description first; body on explicit load; allowed-tools treated as experimental metadata | No execution grant from Markdown; no bundled script or package loader |
| [OpenCode permissions](https://opencode.ai/docs/permissions/), observed 2026-09-07 | Action/resource rules and last-match explanation inside a scope | Cross-scope semantics are intentionally restrictive host ceilings, not unrestricted last-wins |
| Goose and Cline entries in supplied intake | Candidate references for runtime surfaces, separation of loading/activation, scope/default presentation | Not independently pinned/implemented this turn; do not claim source-level parity or reuse their state owners |
| [tgrep v1.0.4](https://github.com/microsoft/tgrep/releases/tag/v1.0.4), commit `75894b124c4e53586032d7a41524168dfa02f480` | Internal backend seam and bounded lexical-search investigation; removed local full-file hash pre-scan from grep | No binary installed; no benchmark guarantee; initial empty index is not partial completeness; parity/lifecycle acceptance required |

## Adapter acceptance rules

Every later adapter must declare version/protocol, source provenance, owning scope, lifecycle owner, exposed capabilities, policy actions, health/unknown state, and acceptance evidence. Loading or connecting must not silently grant execution. Hot replacement must preserve the Run's bound generation and exact source. Cancellation and uncertain side effects must be handled before enabling retries. Resource descriptors must not pass untrusted executable UI or code through a declarative composition profile.

A future expert can bundle resource references, restrictive policy and supported UI-slot declarations. Its domain writes still flow through the existing extension's canonical owner and commit gate. Additional memory, registry, workflows, hooks, sandboxing or authenticated MCP require actual adapters and acceptance tests; adding a kind label alone does not implement them.

## Search follow-up

[Detailed pinned source report](search-reference.md) records the pre-change evidence. The subsequent implementation moves directory traversal and bounded reads into the cancellable worker, resolving the identified pre-scan issue. tgrep still requires binary provenance, per-workspace process/index ownership, cold-start and lag diagnostics, no-symlink/path policy parity, bounded output normalization and cancellation tests before adoption. Keep `ws_grep` stable while replacing internals.
