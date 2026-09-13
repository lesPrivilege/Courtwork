# Exa source verification · Harness extension references

Checked 2026-09-13 for the extension exploration. Exa was used to locate the upstream material; each source below was then opened at its official documentation or pinned source location. This is a bounded mechanism review, not a security audit, benchmark, or endorsement of adopting another runtime.

| Source | Verified material | Relevance and limit |
| --- | --- | --- |
| [Pi extensions, v0.85.1](https://github.com/earendil-works/pi/blob/v0.85.1/packages/coding-agent/docs/extensions.md) | The pinned docs describe in-process TypeScript extensions, event hooks, tools/commands, lifecycle callbacks, and cleanup such as `session_shutdown`. Extension code runs with the host process's permissions. | Directly relevant to the already selected Pi adapter and its lifecycle seam. It supports the need for host-trusted code and cleanup; it does not make arbitrary extensions sandboxed or justify exposing Pi's entire extension API to model-authored code. |
| [DeepSeek Harness architecture, pinned commit `d347e703908d0406b7a7ef80e3a0e594d86b2215`](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/docs/architecture.md) | The pinned architecture material documents plugin composition and scoped effects, and separates session facts, agent events, and capability events. | Useful vocabulary for ordered composition, reversible registration, and distinguishing durable state from live execution signals. It is an architecture donor only; this does not establish a need to import its plugin tree or build a second registry. |
| [OpenCode stable plugin docs](https://opencode.ai/docs/plugins/) | The stable guide describes plugin-contributed tools, event subscriptions, and hooks. | A second example of consumer-facing hooks/tools at a host boundary. It is comparative evidence, not a replacement-runtime decision or a CourtWork contract. |
| [OpenCode V2 plugin docs](https://opencode.ai/v2/docs/build/plugins) | The V2 guide describes setup/cleanup and scoped hooks/transforms; the guide identifies V2 as beta and calls out migration from V1. | Useful for cleanup and scope patterns only. Beta/migration status makes it unsuitable as a stability or compatibility promise. |

## Applied conclusion

For CourtWork, keep Pi `0.85.1` as the selected model/tool loop and let the Host own composition, permission ceilings, durable Run/call identity, and cleanup. Treat hook registration as adapter-required until a real consumer needs a typed hook. For the first coding consumer, the existing DF-04 direction—a fixed Host-advertised check recipe—has a smaller surface than importing arbitrary extension execution. The recipe still runs with ordinary OS-user authority unless separate OS isolation is implemented; a fixed command/cwd is not a sandbox.

The upstream references were read as documentation/source pages; no donor code was copied or executed. These references do not prove CourtWork behavior, safety, release readiness, or compatibility with newer upstream versions.
