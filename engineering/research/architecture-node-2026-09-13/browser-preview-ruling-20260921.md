# Preview, Browser and workspace shell — Astra selection

2026-09-21. Input: user-linked conversation **“撰写HRBP面试案例”**, id `6ab13811-af64-83ec-a1a7-ae7efbca5299`, whose actual topic here is embedded browsers and workspace panels. Its product claims are research leads, not evidence. The full text was retrieved; the referenced screenshots were not visually audited or copied. [Luna's bounded primary-source report](explore/browser-preview-precedents-20260921.md) supplies verified source facts and explicit limits. CW source map was read at main `9da0886`; Runtime-management source subsequently integrates at `4a3ac9e` without changing these browser/shell facts.

## Decision

**Keep CW's Node/Web Host and existing work surface. Select Playwright-controlled isolated Chromium as the first browser-control candidate, behind an RD-009/RD-001 Host-owned adapter.** This is a direction for the later finite execution slice, not an adopted package version, installation, live capability or completed browser. Do not introduce another browser-agent loop, Browser Use cloud dependency, Electron migration or global browser registry to obtain a panel.

| Primary reference | Consume | Boundary / disposition |
|---|---|---|
| [ZCode App shell at `872ad960`](https://github.com/zai-org/ZCode/blob/872ad960de7ec172591f7e1952f7849229f94521/packages/ui/src/App.tsx), Apache-2.0 | Explicit task/draft pane owner; toggle visibility separately from opening/closing tabs; shared UI with separate host assembly | Implementation/design reference. Newly public source is not an independently tested integration. No React/Zustand migration, imported shell or ZCode runtime dependency. |
| [VS Code integrated-browser architecture](https://raw.githubusercontent.com/microsoft/vscode/main/.github/skills/integrated-browser/SKILL.md), MIT source | Main-process native page ownership, renderer proxy, automation process, separate storage/session/group identities and human-priority sharing | Native-host reference only. Source read on this date but not SHA-pinned. It is a substantial Electron subsystem, not an embeddable CW component. |
| [Playwright contexts](https://playwright.dev/docs/browser-contexts), [lifecycle](https://playwright.dev/docs/api/class-browser) | Context isolation, page identity, explicit attach/dispose/close lifecycle | Preferred control-port candidate. Pin artifact/version/license and prove lifecycle before adoption. Do not equate an automation object with CW Session/Run. |
| [Browser Use lifecycle](https://docs.browser-use.com/cloud/quickstart) | Control attachment versus visual access versus stopping an owned browser | Semantic reference. Provider-specific cloud stop/disconnect semantics are not universal; no cloud purchase/account or Browser Use agent dependency. |
| [OpenHands ownership notes](https://raw.githubusercontent.com/OpenHands/OpenHands/main/AGENTS.md) | Frontend projection versus Agent Server; explicit fixture versus live-stack verification | Reference, not a shared API or imported state store. Current main was read, not release-pinned. |

If CW later adopts an Electron desktop host, **WebContentsView is the preferred embedding candidate** under that host's main-process ownership, following the [Electron API](https://github.com/electron/electron/blob/main/docs/api/web-contents-view.md). That conditional choice does not select Electron today. Native view bounds, z-order, focus, keyboard routing and popup ownership need real native tests.

The chat's Cursor details, precise ZCode side-pane dimensions/issue, Codex/ChatGPT profile behavior, dsh rail behavior and screenshot comparison were not independently established in this scan. Do not cite them as verified requirements. Source browsing does not prove any referenced implementation safe or compatible with CW.

## Three separate responsibilities

- **Preview:** a reading surface bound to an artifact, presentation instance/version or an explicitly owned development-server target. Preserve provenance, source version and unavailable target states. It is not necessarily synthetic and does not imply a browser-control session.
- **Browser surface:** a human-visible projection of a browser resource/tab, with truthful navigation, ownership and control state. Its DOM/panel visibility is not the resource's lifetime.
- **Browser execution/control adapter:** creates or attaches to an owned context/page, executes authorized actions, observes state and reports effects. Host owns CW scope, permissions, action identity, recovery and retained evidence. A browser page never grants authority through its content.

**Adjustment to Luna's closing wording:** “Preview” must not be reduced to a synthetic adapter/test seam. CW's `preview-layer.mjs` is the separate Example-data layer. Existing work Preview/presentation/file rendering can consume real Host facts. The new browser UI may initially use an explicit synthetic adapter, without redefining the product object.

## Existing CW map and necessary gaps

| Responsibility | Actual source / owner | Reuse or remaining work |
|---|---|---|
| Right-side surfaces | `app/web/surface-modules.mjs`; `app.mjs` surface state, tabs, expand/maximize/dispose | Reuse object-driven panes and existing renderer lifecycle. No replacement dashboard or tab system. Existing Preview is extension/work reading, not an arbitrary internet iframe. |
| Left navigation | `app.mjs` sidebarCollapsed / navigation overlay; existing location history | Left/right state already has separate owners. A persistent global rail plus a collapsible context list is the target to test, not proof of a newly missing state machine. Keep current destinations and history; do not invent Work/Matter navigation objects to resemble a donor. |
| Native geometry | `app/web/shell-layout.mjs` | Geometry injection only. It is not an Electron host or browser runtime. No such host was found in the inspected app package. |
| Runtime capability | `app/server/service.mjs` bootstrap/runtime capability projections | Browser/externalBrowser are currently false. No production Browser button, tab or success fallback should imply execution support from this research. |
| Browser actions, permissions and recovery | RD-009 / RD-001 / existing Host Run governance | Resource lifetime, native session locator, human takeover, command receipts, unknown outcomes, downloads and trace policy need a finite backend contract before execution. Keep these outside the current Agents API P03-C implementation. |

For Web-hosted CW, an arbitrary website iframe is not a general browser solution. A controlled Preview target may be embedded only with an explicit origin/content/sandbox policy; do not proxy arbitrary sites to bypass their embedding controls. The first real browser execution should use the adapter's managed browser/page and a supported human view. A hosted live view/stream can later project that same resource when its provider contract exists. Do not install noVNC, build screen streaming or borrow the person's Chrome profile merely to fill the right pane.

## Shell and lifecycle rules to validate

Target shell: stable work/composer, independent left context navigation, and an object-driven right work surface. Preview/Browser/Files/Review appear when their real or explicitly synthetic capability exists. A global rail exposes existing destinations while the context list collapses; it is not a miniature clipped project tree. Exact dimensions and final visual baseline await the next fixture review.

Pane, expanded view and supported pop-out must refer to the same owned page/context. Moving a view must not create another session or alter cookies, selected tab, draft or current work binding. A tab close, hiding a pane, disconnecting automation, stopping a browser and deleting a profile are separate commands. If same-resource pop-out is unsupported, say so; opening a URL in the default browser is a different identity domain, not equivalent continuity. Never default to shrinking a desktop page until text is unreadable; reflow/viewport, expansion and actual zoom have different meanings.

Browser resource/profile ownership belongs to the Host execution/resource contract, not automatically to Work Core Matter state. Bind it to the actual authorized work/session scope; a Matter is not required for every browser task. Managed isolated context is the default candidate. Reusing personal Chrome identity is a separate explicit capability/authorization, with no credential copying through Settings or prompts.

Control handoff must expose whether human or agent holds input, stop new agent actions on takeover, and preserve the outcome of any action already in flight. Do not silently replay an unresolved click/form submission. Raw page/network/console contents are untrusted, bounded telemetry with explicit retention and redaction; put selected diagnostics into context on demand. Chat records meaningful outcome/intervention/evidence references, not every browser trace entry. A screenshot is evidence of pixels, not proof of completed side effects.

## Implementation sequence after 06c

The user requested joint gap review after Claude's report. The reviewed [06c correction](../../execution/claude-frontend-harness-2026-09-16/evidence/runtime-management-final-20260921/README.md) is the integration prerequisite. The [next bounded frontend package](../../execution/claude-frontend-harness-2026-09-16/06d-surface-continuity-20260921.md) first closes the existing 06a optional-note/CE-F2 focus defects, then replaces the production right-card launcher with a tabbed Preview surface over existing real readers, using fixtures for verification. The user explicitly places real Browser integration in a later refactor; no Browser placeholder or left-rail implementation belongs to this first slice. One Opus writer, serial review; no concurrent `app.mjs` writers.

Production browser execution remains a separate RD-009/RD-001 contract and later vertical test: isolated context → governed action → human takeover → effect/unknown receipt → close/dispose, with no implicit paid service. Current P03-C Host remote-binding/read consumer remains the core lane; do not launch all runtime directions together. Role-first Composer stays in the original Agent-consumer queue; this intake adds no role/model behavior.
