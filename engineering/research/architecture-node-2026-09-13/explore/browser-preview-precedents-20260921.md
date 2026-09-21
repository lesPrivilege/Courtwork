# Browser, preview, and shell precedents — Luna external verification

Date: 2026-09-21
Scope: primary public sources only. No plugin installation, authentication, browser profile, provider, local repository, or application changes were used. The report records source facts and bounded design guidance; it does not claim visual equivalence to Codex or ChatGPT layouts.

## Selection

### 1. VS Code Integrated Browser — strongest browser ownership precedent

Sources:

- [Integrated Browser architecture source](https://raw.githubusercontent.com/microsoft/vscode/main/.github/skills/integrated-browser/SKILL.md), read 2026-09-21. The source branch was verified; an exact current main SHA was not retrieved.
- [VS Code source license](https://raw.githubusercontent.com/microsoft/vscode/main/LICENSE.txt): MIT.
- [Electron WebContentsView API](https://github.com/electron/electron/blob/main/docs/api/web-contents-view.md).

Verified facts:

- A real Chromium page is an Electron WebContentsView, created, owned, and positioned only by the Electron main process.
- Renderer/workbench code owns a model/proxy and reaches main through IPC. It does not hold or read the native page directly.
- Playwright and automation run in a shared process, also reaching main over IPC.
- Main owns authoritative page state, sessions, trust, permissions, history, CDP and screenshots; the renderer owns the editor pane and lightweight proxies.
- Session, group, and CDP are separate identities. Sessions own cookies/cache/storage and permission boundaries; groups determine which views a client can see; a protocol-aware CDP proxy joins views that come and go.
- The native page paints above the DOM. Bounds, z-order, focus, keyboard routing and screenshot masking require explicit workbench coordination.
- Agents share the user’s page only through a sharing/availability gate. Human interaction can collide with automation; the source explicitly resolves conflicts in the user’s favor. Page content is treated as untrusted model input.

Maturity/limits: this is a mature, desktop-only, multi-process subsystem. The source itself warns that features and tools churn and points maintainers to live code. The architecture is a useful boundary precedent, not a small embeddable widget.

Disposition: **Adopt the boundary pattern, reference the implementation, reject transplanting the subsystem.** For CW, keep native browser/session ownership in the host/runtime owner; expose typed state and operations to GUI surfaces through a narrow controller/adapter. Preserve separate identities for storage/profile, visible page set, and automation connection. Treat browser overlay/focus as a native integration responsibility if CW later embeds a real browser.

### 2. ZCode — newly public workspace/CLI/desktop/web reference

Repository identity is verified as zai-org/ZCode, not another zcode-named project. The public main ref resolved to commit:

872ad960de7ec172591f7e1952f7849229f94521

Pinned primary sources:

- [README.en.md at the verified commit](https://github.com/zai-org/ZCode/blob/872ad960de7ec172591f7e1952f7849229f94521/README.en.md).
- [Shared UI package](https://github.com/zai-org/ZCode/blob/872ad960de7ec172591f7e1952f7849229f94521/packages/ui/package.json).
- [UI exports](https://github.com/zai-org/ZCode/blob/872ad960de7ec172591f7e1952f7849229f94521/packages/ui/src/index.ts).
- [Workspace shell App](https://github.com/zai-org/ZCode/blob/872ad960de7ec172591f7e1952f7849229f94521/packages/ui/src/App.tsx).
- [Web entry](https://github.com/zai-org/ZCode/blob/872ad960de7ec172591f7e1952f7849229f94521/packages/web/src/main.tsx).
- [Desktop package](https://github.com/zai-org/ZCode/blob/872ad960de7ec172591f7e1952f7849229f94521/packages/desktop/package.json).
- [Desktop Electron main](https://github.com/zai-org/ZCode/blob/872ad960de7ec172591f7e1952f7849229f94521/packages/desktop/src/main/index.ts).
- [License](https://github.com/zai-org/ZCode/blob/872ad960de7ec172591f7e1952f7849229f94521/LICENSE): Apache-2.0.

Verified facts:

- README describes one workspace with Desktop Electron, Web/ZCode CLI distribution, and a terminal Agent CLI/runtime. It identifies packages/ui as shared React components/hooks/Zustand state, packages/web as the Web client, packages/desktop as Electron Main/Host/Renderer, and apps/zcode-cli as Agent CLI/TUI/runtime.
- The UI App is explicitly a shell orchestrator. Its source comment says it concentrates workspace-level state, navigation, Git-derived data and shell wiring.
- Side-pane ownership is task-scoped: activeTaskId is used when a task exists and a stable draftSessionId is used while a conversation is still a draft. The source derives sidePaneOwnerId from those values so a new draft does not inherit the previous conversation’s pane tabs.
- useAppPanels supplies browser, Git, terminal, code viewer, whiteboard, subagent and workflow operations. The shell has explicit close, activate, reorder, reopen, and collapse handlers.
- Toggling the side pane changes container visibility and does not implicitly create or switch a tab; an empty pane is handled as an explicit empty state.
- The Web entry imports Root and the shared UI package and uses a Vite/React client; the desktop package depends on Playwright Core and Electron and imports browser-view wiring in main.
- The desktop main source contains browser guest ownership, viewport/visibility IPC, suspend/restore callbacks, browser command dispatch, and an explicit comment that browser shell/page state is not restored across a complete process exit.
- ZCode’s README documents Web mode as a local Vite/backend/Agent arrangement and a unified CLI distribution. It does not establish an independent visual preview harness or a stable external browser-control contract.

Maturity/limits: the repository page reports only two commits at the verified public opening, despite a substantial codebase. This is a newly public implementation, so source structure and behavior should be treated as an early reference rather than a settled API. The source pages verify shell and side-pane ownership; they do not provide an independent acceptance capture for the visual layout or a standalone preview adapter. No screenshot claim is made.

Disposition: **Adopt as a design/reference precedent for CW’s shell and task-scoped panel identity.** The useful pattern is the explicit owner ID for draft versus active work, a shared UI package, and adapters/handlers behind a shell. **Do not copy the shell or make ZCode a runtime dependency.** Keep CW Agent/Kit/Runtime/Provider/Model ownership in its existing contracts. Treat ZCode’s Agent CLI/runtime packaging as an ecosystem reference only.

## Minimal control/lifecycle references

### Browser Use

Primary sources:

- [Browser Use open-source browser parameters](https://docs.browser-use.com/open-source/customize/browser/all-parameters).
- [Browser Use agent parameters](https://docs.browser-use.com/open-source/customize/agent/all-parameters).
- [Browser Use quickstart and cloud lifecycle](https://docs.browser-use.com/cloud/quickstart).
- [Browser Use BrowserProfile source](https://github.com/browser-use/browser-use/blob/main/browser_use/browser/profile.py).
- [Browser Use BrowserSession source](https://github.com/browser-use/browser-use/blob/main/browser_use/browser/session.py).

Verified facts:

- Browser settings expose CDP attachment, headless/window/viewport/device scale, allowed/prohibited domains, user data directory, profile directory, storage state, permissions, proxy, downloads, HAR, traces and video.
- Browser Use distinguishes a local browser from a remote browser and exposes explicit lifecycle timeouts, including browser start/stop, CDP connection, tab close and storage-state operations.
- Agent settings separate tools/skills/browser, structured output, screenshots/vision, file paths, conversation persistence, step/action limits and callbacks.
- The cloud quickstart explicitly separates the Browser Use run API from browser infrastructure. A managed browser can be reached by Playwright/Puppeteer over CDP; disconnecting CDP does not stop the managed browser, and the owner must call the provider’s stop operation.
- The official example puts browser stop in finally after CDP disconnect, even when navigation or connection fails.

Disposition: **Adopt the lifecycle distinction and profile/permission configuration as adapter facts.** Model connect/disconnect, browser stop, page close, storage profile and automation attachment as separate operations with explicit ownership. **Reject Browser Use as CW’s state authority or default runtime.** Cloud API, browser profiles, agent skills and raw traces have provider-specific semantics; wrap them behind a CW Runtime Adapter and durable Host receipts.

### Playwright

Primary sources:

- [BrowserContext isolation](https://playwright.dev/docs/browser-contexts).
- [Browser lifecycle API](https://playwright.dev/docs/api/class-browser).

Verified facts:

- BrowserContext is the isolation unit for cookies, local storage and session storage; contexts can be created independently in one browser for multi-user scenarios.
- Playwright recommends explicitly closing contexts before closing a browser so pages close gracefully and artifacts such as HAR/video flush.
- Browser.close on a connected browser disconnects from the server and clears created contexts; it is not the same as stopping the external browser process.
- Playwright exposes browser connectivity, CDP sessions, context creation and explicit emulation/security settings.

Disposition: **Adopt as the minimum automation-port vocabulary and test model.** CW should distinguish Browser/Profile/Context/Page/AutomationConnection and keep dispose/close/stop semantics explicit. Use isolated synthetic contexts for tests. **Reject treating Playwright’s browser object as the durable CW Session or Run owner.** It is an automation transport; Host state and receipts remain authoritative.

### OpenHands Agent Canvas

Primary sources:

- [OpenHands frontend ownership notes](https://raw.githubusercontent.com/OpenHands/OpenHands/main/AGENTS.md).
- [OpenHands repository license](https://raw.githubusercontent.com/OpenHands/OpenHands/main/LICENSE): MIT.
- [OpenHands frontend README search result](https://github.com/All-Hands-AI/OpenHands/blob/main/frontend/README.md).
- [OpenHands server boundary](https://github.com/All-Hands-AI/OpenHands/blob/main/openhands/server/README.md).

Verified facts:

- The frontend is Agent Canvas; frontend UI/state consumes backend APIs. Agent behavior, tools, conversations, workspaces and canonical API endpoints belong to the Agent Server/SDK. Typed API access belongs to the separate TypeScript client.
- Skills are loaded from an extensions catalog and merged with user/project skills through a centralized enablement allow-list.
- Browser tools can be omitted from new conversation payloads through an explicit feature flag.
- The repository separates mocked MSW frontend development from real-stack/live Playwright E2E. The live path is opt-in, uses isolated ports/state, and documents credential and artifact redaction boundaries.
- The server README describes a WebSocket agent server with explicit initialize/start/read/write actions and observations.

Maturity/limits: this is a useful frontend/backend ownership precedent, but it is a multi-repository system. It does not define a CW-compatible Runtime Port or a native browser shell.

Disposition: **Adopt ownership separation and test-lane separation.** Keep CW frontend projections thin; route runtime, tool and skill facts through the owning Host/adapter contracts. Copy the idea of explicit synthetic/mock versus real-stack E2E lanes and separate credentials/artifacts. **Reject importing its API or skill catalog directly.**

## Cross-source selection for CW

The smallest coherent reference set is:

1. VS Code for native browser ownership, IPC, session/group/privacy boundaries, and overlay/focus lifecycle.
2. ZCode for task-scoped workspace shell, draft-to-active identity, shared UI/runtime packaging, and explicit side-pane controls.
3. Playwright for automation contexts and disposal vocabulary.
4. Browser Use for adapter-level profile/permission/CDP/trace configuration and stop semantics.
5. OpenHands for frontend/backend/typed-client ownership and mock-versus-live verification lanes.

The sources support a narrow CW boundary: a shell owns navigation and panel projection; a Runtime Adapter reports capabilities and controls; a Host owns durable binding, permissions, run identity, recovery and receipts; browser automation is a replaceable transport. They do not support a new global registry, an implicit browser/profile authority, or a second scheduler.

No external source verified a stable, portable “preview adapter” protocol shared by these projects. Treat Preview as CW’s explicit synthetic adapter/test seam, not as an ecosystem-standard contract.



## CW mapping constraint

The external precedents do not authorize an Electron or Tauri migration. CW's current Node/Web shell and existing surface modules remain the implementation boundary. VS Code's WebContentsView material applies only if CW later chooses a native browser host; ZCode's Electron desktop package is a reference implementation, not a dependency or target platform. Keep the current CW preview/adapter seam and Host-owned state while consuming these precedents.
