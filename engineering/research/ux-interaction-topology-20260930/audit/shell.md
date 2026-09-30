# Courtwork web UX audit · shell slice (interaction topology lens)

Repo: the audit worktree @ 87e2207 (read only). All paths below are under `app/web/` unless stated. "obs" = observed in code (file:line). "inf" = inference. "not traced" = not followed.
Frequency figures are inference throughout: the repo carries no usage telemetry for these controls; each states its basis.
Observations only; no rulings.

## 0. Topology map (obs)

- Left rail (index.html:73-195): brand link, [Back][Forward] Home [New chat] row (103-110), Chat / Attention / Spark buttons (115-122), name filter (123-147), Projects (149-168), Recent (169-172), Account footer (179-194). Rail is `display:none` when collapsed (styles.css:704-709) and not rendered on Settings (app.mjs:3593-3594). So Back/Forward/Home/New chat/Attention/Spark/all chat switching live only in a collapsible rail. No global keyboard shortcut exists for any of them: the only document key handlers are Escape (app.mjs:7183), j/k/o/Enter/Home/End on lists (7147) and the runtime finder (7128) (obs; native host menus not traced).
- Header (index.html:197-247): rail toggle, title, "Chat overview" and "Open preview" icon buttons.
- Composer row (index.html:323-378): paperclip "Chat files", file-access chip, model chip, Send.
- Right pane "Preview" (index.html:272-349): per-chat object tabs. Geometry: >=1680 three columns; 1024-1679 the pane REPLACES the chat column with a "Chat" back button; <1024 full sheet (app.mjs:133-140, 4227-4232, 4290-4301).
- Modal dialogs (showModal): Attention assistant (attention-agent-view.mjs:224), Usage (usage-view.mjs:128), Spark Explore (subagent-view.mjs, last line `open`), Chat files (app.mjs:7534-7537), Rename / Delete / New project (index.html:923-996).
- Pages that replace the main column: Settings, Attention items workspace, Chat page, Home.
- Backend facts that bound the topology (obs): sessions support only create / rename (title) / delete (server/index.mjs:183-187); projects support only list / create (server/index.mjs:181-182). No archive, pin, move, project rename or project delete route exists. Session listing is server-sorted by recorded activity (server/store.mjs:1074-1082).

---

## A. Navigation & lists

### NAV-01 Switch to another chat (desktop, rail open)
- Surface & trigger: rail Recent row or a project's session row, click.
- Path: click row -> `selectSession` (app.mjs:1523) via Recent (1938-1941) or `selectProject(projectId,{sessionId})` (2032, 2352-2354). 1 click.
- Depth: 0 disclosures, 0 dialogs, 1 in-place page change; no memory burden if the chat is visible in the rail; scan needed among up to 8 rows per list ("Show more" +10, 1946, 2361-2369). Two lists hold the same chat (Recent and its project).
- Effect scope: view only. Side effects observed: draft persisted (1546), Preview pane closed (1559, see NAV-03), project group auto-expands (1596-1597). UI says nothing about these.
- Frequency: high (several times per working session) — inf, chat switching is the core loop.
- Reversibility: fully reversible; trail entry pushed (1590).
- Mismatch: none for the click itself. Related ordering issue: Recent is server-ordered by last activity (store.mjs:1080-1082) but each project list is re-sorted by createdAt (app.mjs:2298), so one chat has two positions. Not a topology mismatch; noted for scan cost (inf).
- Candidate direction: none needed for the click; ordering key alignment is an owner question (Recent vs project list).

### NAV-02 Switch chat when rail is collapsed or viewport < 1024
- Surface & trigger: header rail toggle, then row.
- Path: header toggle (index.html:198-205; app.mjs:4200-4210) -> row click -> `closeNavigation` inside selectSession (1563). Below 1024 the rail is a modal overlay (4237-4264); Escape closes it (7229).
- Depth: 1 disclosure + 1 click = 2 steps. Context switch: rail covers chat.
- Effect scope: view only.
- Frequency: high on narrow/laptop layouts — inf (collapse is persisted via `sidebarCollapsed`, 7454-7463, 4206).
- Reversibility: full.
- Mismatch: FD (low-med) — the most frequent action (switch chat) costs a disclosure whenever the rail is hidden; the only keyboard route is Tab-walking to the toggle (no shortcut, see section 0).
- Candidate direction: a recent-chats affordance or shortcut that does not require the whole rail; needs owner fact: whether the native host owns menu shortcuts (not traced).

### NAV-03 Keep reading an artifact while switching chats
- Surface & trigger: Preview pane open, then click another chat.
- Path: `selectSession` sets `state.surface.open = false` at 1559 (also 1538, 1606, 1638). Tabs are kept per chat (`previewTabs.setScope`, 1560; preview-tabs.mjs:36-49) but the pane is hidden. To see chat B's remembered tabs: header "Open preview" (index.html:238-244; app.mjs:4002-4008).
- Depth: +1 click per chat switch to bring the pane back; pane geometry may also flip chat/preview (B geometry).
- Effect scope: view only; tabs are in memory, lost on reload (preview-tabs.mjs:11-13).
- Frequency: medium — inf, applies to anyone using Preview across more than one chat.
- Reversibility: full.
- Mismatch: FD (low-med) — per-chat tab sets exist, yet the pane's open state is not carried with them, so a frequent local re-open is forced. It is a deliberate rule (comment at 1535-1537 "the work surface opens for an object a person opened"); the cost is the extra click.
- Candidate direction: remember open/closed per chat scope alongside the tab set; owner: 06d Preview contract.

### NAV-04 Find a chat by name
- Surface & trigger: rail filter input "Find a chat" (index.html:123-147).
- Path: type -> `renderProjectList` (2160). Recent filter runs over all fetched chats (1920-1930, `/sessions` returns all non-global, 1660-1666); the project tree filter runs over loaded names only (2176-2199); status line says "Filtering loaded names only." (2175).
- Depth: 0 dialogs; scan of results across two sections (Recent + Projects) with duplicates.
- Effect scope: view.
- Frequency: medium — inf.
- Reversibility: full (clear button 7665-7670).
- Mismatch: none / low. The status string describes only the project tree (Recent is not limited to loaded names) — inf. No search inside chat content (not present).
- Candidate direction: none; copy accuracy only.

### NAV-05 Go back / forward to the previous place
- Surface & trigger: rail [Back][Forward] (index.html:104-107).
- Path: click -> `traverseHistory` (app.mjs:1730) -> `goHome` or `selectSession`; restores scroll anchor (1743-1747). Trail = Home + chats only, bounded at 50 (location-history.mjs:17); layers (Settings, Chat page, Attention) are excluded by design (location-history.mjs:3-8).
- Depth: 1 click if rail visible; else NAV-02 first (Back/Forward sit in the rail, and the rail is hidden when collapsed).
- Effect scope: view only. Not restored on return: Preview open state (NAV-03).
- Frequency: medium — inf.
- Reversibility: full; unavailable entries marked and skipped with a notice (1749-1757).
- Mismatch: FD (low) — a window-level navigation control lives inside a collapsible list rail. Engineering note already retains this candidate ("Native Back/Forward placement follow-up", shell-control-plane README 2026-09-22).
- Candidate direction: place Back/Forward in a chrome slot that survives rail collapse (header); needs native geometry facts (`shell-layout.mjs` supplies inset only).

### NAV-06 Go to Home / start a chat / open "Chat" page
- Surface & trigger: rail Home, New chat, brand link, Chat button.
- Path: Home, brand -> `goHome` (6655; 7465, 7470-7473). New chat -> `startNewSession` (6722; 7565) -> `goHome`. Chat -> `openChatPage` (6678; 7466) which lists the 8 latest chats (chat-page.mjs:53-63) plus a New chat button and "Return to <title>" (chat-page.mjs:70-77).
- Depth: 1 click each; four entries reach overlapping destinations (Home composer x3, a second chat list x1). index.html:111-113 comment says Chat "returns to the chat you were in ... creates nothing"; the code opens a list page (stale comment, obs).
- Effect scope: view; New chat creates nothing until first send (6722-6734, submitHomeRun 5341).
- Frequency: Home/New chat high, Chat page low — inf.
- Reversibility: full.
- Mismatch: none for Home/New chat. The Chat page duplicates Recent and Home Continue (three chat lists) — SL/CL leakage low: a product-facet page ("Chat / Attention / Spark" facets, chat-page.mjs:14-18, 105-116) exposes system ontology inside a navigation path.
- Candidate direction: none on frequency; consider whether the page earns a rail slot (owner: Astra chat-product-page decision).

### NAV-07 Switch chats while in Settings
- Surface & trigger: Settings page open (rail not rendered, app.mjs:3593-3594).
- Path: "Back to app" (index.html:209-216; 7588 `settings-back-button` -> `closeSettings`, 7052-7070) or Escape (7263-7268) -> then NAV-01.
- Depth: +1 page change. `selectSession` also calls `closeSettings` (1530) although the rail cannot be clicked then — comment at 1527-1529 says the rail is clickable while Settings is open, which contradicts 3593-3594 (obs, stale comment).
- Effect scope: view. Settings deep link via hash (7009-7023).
- Frequency: low.
- Reversibility: full.
- Mismatch: none (deliberate: Settings replaces navigation).
- Candidate direction: none.

---

## B. New session / project, objects, menus, dialogs

### PRJ-01 Start a new chat (top button)
- Surface & trigger: rail "New chat" (index.html:109).
- Path: click -> `startNewSession(event)` — the click event is passed as the options object, so `projectId` is undefined and `state.homeProjectId = null` (app.mjs:6731; 7565). -> `goHome`. The new chat is created on first Send (submitHomeRun 5341).
- Depth: 1 click to Home; choosing a project then costs PRJ-03.
- Effect scope: next chat only; project resets to "No project" even when the person is inside a project chat (inf from 6731 + 7565; behaviour not run).
- Frequency: high — inf.
- Reversibility: nothing created until Send.
- Mismatch: FD (med) — the project the person is working in is a known fact at click time, but New chat drops it; restoring it costs 2 more disclosures (PRJ-03), or use the per-project "+" (PRJ-02) which is hover-revealed.
- Candidate direction: default the new chat's project to the active chat's project (or last used); owner fact needed: whether "No project" is an intended default.

### PRJ-02 New chat inside a project
- Surface & trigger: per-project "+" in the Projects list (app.mjs:2249-2258) or project row context menu "New chat" (object-commands.mjs:32-38).
- Path: "+" -> `runObjectCommand("project.new-chat")` (2249) -> `startNewSession({projectId})` (1804-1806; 6722) -> Home with project chosen.
- Depth: 1 click; the "+" is opacity 0 until row hover/focus on pointer devices (styles.css:3114-3122; coarse pointers always visible 3127-3131).
- Effect scope: next chat only, named in label "New chat in <project>" (2248).
- Frequency: high for project-based users — inf.
- Reversibility: nothing created until Send.
- Mismatch: none (good locality); discoverability cost on hover-only devices (inf).
- Candidate direction: none. Note the project context menu (right-click / Menu key only; `more:false`, 2243) contains this one command, a duplicate of the "+" (obs).

### PRJ-03 Choose or change the project for the chat being started
- Surface & trigger: Home composer strip chip "Work location" (app.mjs:6377-6383, 6383-6418; index.html:305).
- Path: click chip -> popover `workspace-popover` (6337) -> Project section radio list "No project / <projects> / New project..." (workspace-card.mjs:361-383) -> pick. The same popover also holds the folder choice.
- Depth: 1 disclosure + 1 pick = 2 steps; project names not visible until opened (chip shows current only). Side effect: `onChoose` calls `invalidateHomeAttentionScope()` (app.mjs:6270) — see ATT-03.
- Effect scope: next chat only; after creation project is fixed (workspace-card.mjs:88, 384: "A chat keeps its project"). UI states this only once the chat exists.
- Frequency: medium-high (every unassigned start) — inf.
- Reversibility: choice reversible until first Send; after that not changeable at all (no Host route, see OBJ-04).
- Mismatch: FD (med) + SL (med). FD: a per-start decision sits two layers deep inside a panel that also owns folder binding. SL: the same choice silently rescopes Home's Attention block (6270, 6555-6561) — a control for "where the chat goes" changes what Attention shows.
- Candidate direction: surface the project as a first-class selector in the composer strip or reuse the rail; decouple Attention scope from the new-chat project; owner: Home/Attention scope rule (6555-6561).

### PRJ-04 Create a project
- Surface & trigger: "+" at the Projects heading (index.html:156-161), or "New project..." in the Work location panel (workspace-card.mjs:377-380).
- Path: click -> `openDialog("project-dialog")` (7552-7556) -> type name -> Create -> `createEntity` (7282) -> `admitCreatedEntity` (7386) selects the project (`selectProject`, 2032).
- Depth: 1 dialog, 1 field; recoverable uncertain-create protocol (7336-7361).
- Effect scope: global object, permanent (no delete/rename route, server/index.mjs:181-182); dialog text "A place for related chats and their files." (index.html:936).
- Frequency: low.
- Reversibility: none available in product (obs backend); state not stated in dialog.
- Mismatch: none for placement. Note (SL, low): irreversibility of a project record is not stated where it is created.
- Candidate direction: none for placement; project rename/delete are absent capabilities (owner: Host).

### PRJ-05 Rename / delete / archive a project
- Surface & trigger: none exists.
- Path: project rows expose only expand/collapse (2222-2238) and a single-item context menu (object-commands.mjs:32-38). No PATCH/DELETE for projects (app.mjs grep; server/index.mjs:181-182).
- Depth: n/a. Frequency: low-medium — inf (typos, retiring projects).
- Mismatch: none as a topology issue; an absent capability. Recorded so the inventory is complete.
- Candidate direction: needs Host routes before any placement question.

### OBJ-01 Rename a chat
- Surface & trigger: row "..." (hover/focus reveal, styles.css:6626-6628; coarse: always) or right-click / Menu key (app.mjs:1813-1835).
- Path: More -> menu (object-menu.mjs:99-114) -> "Rename" -> dialog `rename-dialog` (1836-1845; index.html:959-980) -> type -> Rename -> PATCH (1857).
- Depth: 1 menu + 1 dialog = 2 disclosures; requires the row to be in the rail (title in header is not editable, index.html:219-222).
- Effect scope: object (chat title), all lists, history trail retitled (1866-1872). Dialog subject says "In <project>" (1839).
- Frequency: low-medium — inf (auto title "Untitled chat" may prompt renames).
- Reversibility: reversible (rename again).
- Mismatch: FD (low-med) — a frequent-ish, local, reversible edit needs menu + dialog and cannot happen where the name is shown (header h1).
- Candidate direction: in-place rename on the header title or row; owner: none needed (same PATCH).

### OBJ-02 Delete a chat
- Surface & trigger: as OBJ-01; menu group "destructive" (object-commands.mjs:39-47).
- Path: More -> Delete -> `delete-dialog` (app.mjs:1874-1880; index.html:982-996) -> Delete -> DELETE (1890); toast "Deleted ... Its workspace files are kept." (1913).
- Depth: 1 menu + 1 confirm. Disabled row during active run with reason (object-commands.mjs:45; object-menu.mjs:31-35).
- Effect scope: catalog record removed, workspace bytes kept; the confirmation says so (index.html:989); usage history for the chat also disappears (usage-view.mjs:117 text "Deleted chats remove their records" — inside Usage details, not in the delete dialog; obs).
- Frequency: low.
- Reversibility: irreversible; no Undo. The button is `primary-button`, not destructive style (index.html:993) (obs).
- Mismatch: SL (low) — the dialog states files are kept but not that Usage records go with it.
- Candidate direction: name usage-record loss in the confirm; owner fact: work-usage retention rule (server/usage-details.mjs, not traced).

### OBJ-03 Archive or pin a chat
- Surface & trigger: none. Backend has no route (server/index.mjs:183-187). Chat menu shows only Open / Rename / Delete (object-commands.mjs:17-47).
- Mismatch: none as topology; the only removal path is the irreversible Delete (OBJ-02), so "get this off my list" and "destroy this" share one control (SL, inf).
- Candidate direction: needs Host archive semantics first.

### OBJ-04 Move a chat to another project
- Surface & trigger: none. Explicitly refused in product copy: "The Host can rename a chat but has no command that moves it" (workspace-card.mjs:81-88, 384).
- Path: n/a. Frequency: medium — inf (chats often start unassigned via PRJ-01 then need a home).
- Mismatch: interacts with PRJ-01/03: the project decision is forced at a moment when the person may not know it yet, and cannot be corrected later (FD/CL, inf).
- Candidate direction: owner fact needed: Host `PATCH /sessions/:id` to allow projectId, or an explicit stance that projects are immutable.

### OBJ-05 Open the row menu from keyboard / pointer variants
- Surface & trigger: right-click, "..." button, Menu key or Shift+F10 (app.mjs:1820-1832).
- Path: as OBJ-01; Escape closes and restores focus (object-menu.mjs:70-83). Menu item "Open" is disabled with reason "This chat is already open." (object-commands.mjs:22-23) although the row click already opens it.
- Depth: 1. Frequency: n/a.
- Mismatch: none; "Open" row is redundant with click (low, cosmetic).

### OBJ-06 Project row click semantics
- Surface & trigger: click a project name.
- Path: toggles expand/collapse and lazily loads its chats (app.mjs:2222-2238). It never selects the project or shows a project view; there is no project page. Attention, Usage and Spark each carry their own project selector instead (attention-view.mjs:240-243; usage-view.mjs:43-45; spark-view.mjs:310-320).
- Effect scope: view.
- Frequency: high (expand to find chats) — inf.
- Reversibility: full.
- Mismatch: CL (low-med) — project-scoped tools each re-ask "which project" through their own dropdown instead of inheriting the project the person is working in (see ATT-04, USG-02).
- Candidate direction: a shared "current project" default for project-scoped tools; owner: shell state (`state.activeProjectId`, app.mjs:1592-1596).

---

## C. Preview tabs, artifacts, materials, inspector

### PRV-01 Open an artifact the agent produced
- Surface & trigger: file row in the chat thread (app.mjs:3425-3450) or Run row chevron "Inspect this run" (3477-3482).
- Path: click -> `openFile({kind:"content-version",...})` (4478-4485) -> `openPreviewObject` (4458-4466) -> `previewTabs.open` + `showPreview` (3981-4000). Key includes path + sha + run (preview-tabs.mjs:23-34) so re-opening reselects.
- Depth: 1 click; Preview appears beside the chat only at >=1680; at 1024-1679 it replaces the chat column (4290-4301).
- Effect scope: view only; closing a tab cancels nothing (preview-tabs.mjs:6-8).
- Frequency: high in Work chats — inf.
- Reversibility: full; Escape hides pane (7228-7234).
- Mismatch: none for the open; SL/FD (low-med) at the common laptop width: opening an artifact hides the conversation that produced it, so read-then-reply needs the "Chat" back button (4297-4306) each time.
- Candidate direction: none prescriptive; note the geometry threshold (1680) as the topology switch.

### PRV-02 Close a tab, hide the pane, return to the chat
- Surface & trigger: tab x, pane "Hide preview", "Chat" back button, Escape, Delete/Backspace on a tab (preview-tabs.mjs:184-208).
- Path: tab x -> `closePreviewTab` (4110-4133); last close hides pane (4120-4123); hide keeps tabs (4175-4194).
- Depth: 1.
- Effect scope: view; "Hide" and "Close tab" are different verbs on adjacent controls: hide keeps tabs and reads, close drops that tab's reads (4134-4140 comment).
- Frequency: high — inf.
- Reversibility: hide fully; a closed tab re-opens through its original entry (thread row, Files dialog), not a "reopen closed tab" affordance (no such control, obs).
- Mismatch: none / low.
- Candidate direction: none.

### PRV-03 Open a chat file or user-supplied material
- Surface & trigger: composer paperclip "Chat files", Chat overview "Chat files" row, or Preview Workspace tab.
- Path: paperclip (index.html:326-331) -> `materials-dialog` modal (app.mjs:7534-7537; materials-view.mjs:144-181) -> file row -> `dialog.close()` then `onOpenFile` (materials-view.mjs:173-176). Alternative: header "Chat overview" -> "Chat files" -> dialog (workspace-view.mjs:115; app.mjs:6443-6449) = 3 disclosures. Alternative: Preview Workspace tab lists the same files (workspace-view.mjs:8-60; app.mjs:4771).
- Depth: 1 modal + 1 pick = 2; the dialog closes on pick, so opening a second file repeats the whole path unless a retained-version return applies (materials-view.mjs:850-865, only for retained sources, app.mjs:4096-4108).
- Effect scope: view only.
- Frequency: medium-high in chats with materials — inf.
- Reversibility: full.
- Mismatch: FD (med) — the file list is a modal that closes on every pick, although Preview already has a Workspace tab that is a persistent list; the frequent "read several files in turn" loop pays the modal round trip each time.
- Candidate direction: route file picking to the persistent Preview Workspace list; keep the dialog for adding. No owner fact needed.

### PRV-04 Add a file or text material to a running chat
- Surface & trigger: composer paperclip (in a chat) vs paperclip on Home.
- Path in chat: paperclip -> modal -> expand `<details id="material-add">` "Add text material" (index.html:884-885) -> file input or paste -> Add (materials-view.mjs:714-835). Path on Home: paperclip -> popover with a file input focused (draft-attachments.mjs:7-13, 24) = 1 disclosure.
- Depth: chat = 2 disclosures + 1 form (3 layers); Home = 1.
- Effect scope: persistent material of the chat (retained source with revisions, materials-view.mjs:19-28; POST /sessions/:id/materials, server/index.mjs:205). Glyph is a paperclip (attachment-to-message metaphor) and the label is "Chat files" (app.mjs:7432); the same glyph on Home means "attach to first message" (draft-attachments.mjs:9-13, 30). Two scopes, one glyph.
- Frequency: medium — inf (attaching material is core to "work agent").
- Reversibility: revisions retained; cannot delete a material (no route, server/index.mjs:202-205).
- Mismatch: FD (med) for depth vs Home; SL (med) for glyph/scope ambiguity (per-message attach vs chat-level standing material).
- Candidate direction: same one-step attach pattern in chats as on Home; name the persistent scope in the trigger. Owner fact: whether a per-message attachment concept exists in the Host for started chats (not traced; server exposes only materials).

### PRV-05 Open the run inspector / work history
- Surface & trigger: run row chevron; Chat overview "Latest ..." or "Work history" -> dialog (app.mjs:6462-6473); Usage drill (7988).
- Path: row chevron 1 click -> Run tab. From overview: header "Chat overview" -> popover -> row = 2; "Work history" -> `run-history-dialog` -> pick = 3.
- Effect scope: view; the inspector shows the run's recorded context (4492-4507).
- Frequency: medium — inf.
- Reversibility: full.
- Mismatch: none / low. The header icon "Chat overview" (index.html:231-237) hides a hub of five different destinations (Files, Workspace preview, Run, History, Settings > Permissions) — a mixed-scope launcher (inf).

### PRV-06 Read request telemetry for a turn
- Surface & trigger: `renderRequestMeasurements` (telemetry-view.mjs:51-111) reached from the Connection card (app.mjs:5832-5834, compact) and chat measurements (app.mjs:3777).
- Path: file-access chip -> Connection popover -> `<details>` summary (telemetry-view.mjs:63-65) = 2 disclosures for the compact form.
- Effect scope: per request/run of the latest run (`state.runs.at(-1)`, 5834); the card that hosts it is titled "Connection" and also holds global model and per-chat file access (settings-view.mjs:428-486).
- Frequency: low (diagnostic).
- Mismatch: SL (low) — per-request timing shown inside a chat-level permission chip's popover (inf).
- Candidate direction: place beside the run it measures (Run tab); owner: none.

---

## D. Attention, Spark, Home surfaces

### ATT-01 Notice that something needs me
- Surface & trigger: none ambient. Rail Attention and Spark carry no badge (Spark: index.html:117-121 says so; Attention: app.mjs sets only aria-current, 3680; no count binding found). Rail chat rows show a Work tag only, no run/wait state (2266-2282, 1930-1937).
- Path: Home shows sets "waiting for you", Continue and Attention count (6475-6530; home-view.mjs:252-300, 302-323) — only when the person is on Home and `homeLayout === "modules"` (6490, settings default "modules", settings-view.mjs:1848).
- Depth: from inside a chat, page change to Home (1 click) then scan blocks.
- Effect scope: global summary, but the Attention block reads ONE project (6555-6561, 6573-6590).
- Frequency: high (checking) — inf.
- Reversibility: n/a.
- Mismatch: FD (high) — a frequent, cheap-to-answer question (anything waiting?) has no ambient signal; it needs a page change and a scan. Notifications are documented as absent (shell-control-plane README §"P3 FE-NOTIFY", "toast, Run notice, Attention are not a persistent notification center").
- Candidate direction: an ambient count/dot on the rail row or chat rows; owner fact: Host read/unread and cross-project attention count (backend-requests, README).

### ATT-02 Open the Attention items queue from the rail
- Surface & trigger: rail "Attention" (index.html:116).
- Path: click -> `attentionAgent.open()` (app.mjs:7467) = modal of the ASSISTANT ("Attention · Your global assistant", attention-agent-view.mjs:38-40; registry says "distinct from its item queue", product-semantics.generated.mjs:153) -> toolbar text button "Attention items" among six controls (attention-agent-view.mjs:47-56) -> `onItems` -> `openAttentionWorkspace()` (7992; 6641-6654) -> page. From the page, "Open Attention" returns to the assistant (attention-view.mjs:226-233).
- Depth: 1 modal + 1 button + 1 page change = 3 layers to reach the queue; two surfaces share the word "Attention" and differ in meaning.
- Effect scope: view; but `openAttentionWorkspace()` with no args scopes to `state.homeAttention.projectId || homeProjectId()` (6641), not the project of the open chat (inf: Home state, not `state.activeProjectId`).
- Frequency: high — inf.
- Reversibility: full; "Back to workspace" (attention-view.mjs:235).
- Mismatch: CL (high) — the person-level task "see items that need me" sits behind the system-level assistant object; the assistant seat owns the top-level name. Also SL: default project scope is the Home draft's project.
- Candidate direction: rail entry opens the queue; the assistant becomes a secondary entry; queue defaults to the current project. Owner: attention product naming (`attention.agent` semantic key, product-semantics.generated.mjs:152-153).

### ATT-03 Handle an Attention item from Home
- Surface & trigger: Home "Attention" block rows (home-view.mjs:302-323).
- Path: row click -> `openAttentionWorkspace(projectId, id, trigger)` (6500) -> page with item inspected (attention-view.mjs:851) -> choose action (`Mark as seen`, `Resume`, `Set waiting`, `Snooze`, `Resolve`, `Reopen`, attention-view.mjs:40-41, 400-427) -> for field-bearing actions an editor -> submit (attention-view.mjs:552-590) -> receipt line (429-436).
- Depth: 1 page change + 1 action click (`Mark as seen` immediate, no fields) or + editor + submit for the rest.
- Effect scope: this Attention item only, said next to `Resolve` (attention-view.mjs:47-49 `ACTION_CONSEQUENCE`: "Records your decision on this item only. Nothing outside Courtwork is approved or changed.") — obs, well placed.
- Frequency: medium-high — inf.
- Reversibility: `Reopen` exists for resolved; "seen does not come back" (attention-view.mjs:436-440 comment).
- Mismatch: none for the action grammar. Block only appears if count > 0 and shows 3 rows of ONE project (home-view.mjs:307, 317; HOME_ROWS=3, home-view.mjs:41) — see ATT-04.
- Candidate direction: none for the action itself.

### ATT-04 See Attention items across projects / switch project scope
- Surface & trigger: `select[aria-label="Attention workspace project"]` in the queue (attention-view.mjs:240-243).
- Path: the queue is single-project (query has projectId, attention-view.mjs:710, 739). Cross-project totals do not exist in UI; each project is visited via dropdown, `load()` on change.
- Depth: 1 select per project; memory burden: the person must remember which projects had items (no per-project counts in the options, 241).
- Effect scope: view scope = one project; label states it ("Attention workspace project").
- Frequency: medium — inf.
- Reversibility: full.
- Mismatch: CL (med) — user's task ("what needs me anywhere") is answered through the project ontology. Same pattern in Usage (USG-02) and Spark (`select` 'Spark project', spark-view.mjs:310-320).
- Candidate direction: cross-project list with project as a column/filter; owner fact: Host attention query without projectId (server contract not traced; request bodies always carry projectId).

### ATT-05 Answer a question or approval that is waiting in another chat
- Surface & trigger: Home "waiting" set rows (home-view.mjs:252-286, `pendingItems`) -> `call("onSession", item, {question:true})` (6524-6528) or inline cards in the chat (handled by chat thread, not traced).
- Path: Home row click -> `selectSession(item.sessionId)` (6525). List keys j/k/o (7147-7180).
- Depth: 1 page change from Home + 1 click; from other chats: Home first.
- Effect scope: the question in that chat; the pane says "Waiting for you".
- Frequency: high in agent workflows — inf.
- Reversibility: decisions in-thread; not traced.
- Mismatch: FD (med) — same cause as ATT-01: no way to jump to the waiting chat from any other chat except via Home.

### ATT-06 Open Spark
- Surface & trigger: rail "Spark" (index.html:122; label from `spark.surface`).
- Path: click -> `subagentView.open(currentSession())` (app.mjs:7468) = "Spark · Explore" modal (create exploration task; subagent-view.mjs:1-70) -> "Source maintenance" button (subagent-view.mjs:70, `button('Source maintenance'...)`) -> `sparkView.open(currentProject()?.id)` (7989), the Matter-drift read the rail comment describes (index.html:117-121; chat-page.mjs:17).
- Depth: 1 modal, then 1 more to reach the surface whose description the rail comment gives; two different Spark objects (Explore tasks vs derivation maintenance) share the rail seat.
- Effect scope: the Explore modal starts a Host-side task with "your current model" on a chosen parent chat (subagent-view.mjs:42-46 text) — an action surface behind a label the rail comment describes as a read-only maintenance count.
- Frequency: low — inf.
- Mismatch: CL (med) — internal split (subagent vs derivation view) leaks into the entry path; SL (low) note: label describes maintenance, click lands on task creation.
- Candidate direction: separate entries or land on the read surface; owner: Spark naming (WO-SP1-FE).

---

## E. Usage & telemetry views

### USG-01 Open Usage
- Surface & trigger: Home only: "Open Usage" inside the collapsible Activity block (home-view.mjs:379, inside `<details>` 397-405; app.mjs:6494, 6502, 7988).
- Path: Home -> (expand Activity if collapsed, home-view.mjs:397-404, pref `homeActivity`) -> "Open Usage" -> modal `usageView.open` (usage-view.mjs:128).
- Depth: Home page change + optional disclosure + modal = 2-3; the block is absent when the widest period is empty (home-view.mjs:361-365) and when `homeLayout` is "simple" (6490, 6597). No entry from Settings (settings-view.mjs mentions usage only in copy, lines 22, 2500) or from the rail.
- Effect scope: read-only view of retained runs.
- Frequency: low-medium — inf.
- Reversibility: n/a.
- Mismatch: FD (low) — a read-only lookup with no stable address; SL (low) — the entry hangs off "Activity" (28/84-day runs) but opens a different instrument (tokens, UTC, models).
- Candidate direction: a stable entry (rail footer / Settings) independent of Home layout; owner: none.

### USG-02 Filter usage by project / period / metric
- Surface & trigger: three selects + Refresh at the top of the Usage modal (usage-view.mjs:42-52).
- Path: each change reloads (`load`, 8-13); project select defaults to "All retained work" (44) regardless of the current project; state lives in the view closure across openings (usage-view.mjs:6) but not across reload.
- Depth: 1 select per filter; metric change is client-side, project/period trigger a fetch and reset any drill (9).
- Effect scope: view; stated: "Retained runs · reported tokens" and interval/UTC line (41, 66).
- Frequency: low-medium.
- Reversibility: full.
- Mismatch: CL (low) — project scope asked again although the person is inside a project (ATT-04/OBJ-06 pattern); the Overview/Models "tabs" (53-56) are a second layer for the same data.
- Candidate direction: default the project filter to the current project when opened from a chat; owner: none.

### USG-03 From a usage figure to the run behind it
- Surface & trigger: heatmap day, model rank row, stacked segment, table row (usage-view.mjs:74, 90, 100, 102, 107, 112).
- Path: click -> `inspect` (14-24) shows a "Matching runs" list inside the modal -> click a run -> `dialog.close(); onOpenRun` (121) -> `selectSession(sessionId)` + `openRun(runId)` (app.mjs:7988).
- Depth: 2 clicks inside the modal, then a chat switch and Preview open; the modal closes on landing, so returning to the same drill requires reopening Usage and re-drilling (drill/return state is cleared on close and reload, 7, 9).
- Effect scope: view; navigates to a chat (side effect: rail selection, Preview state per NAV-03).
- Frequency: low.
- Reversibility: `Back to usage` inside; not after leaving (119).
- Mismatch: none / low (FD low): return trip costs a full re-drill.
- Candidate direction: none.

### USG-04 Understand "what did the last turn cost"
- Surface & trigger: no per-turn cost figure on the working surface; Connection popover measurement disclosure (PRV-06) and Usage modal aggregates by UTC day (usage-view.mjs:66, 117 text).
- Path: 2 disclosures for per-request tokens; Usage modal for totals.
- Frequency: medium for cost-aware users — inf.
- Mismatch: FD (low) — per-turn usage is available (telemetry-view.mjs:101-102) but only inside a popover disclosure; totals only in a Home-hosted modal.
- Candidate direction: none prescriptive.

---

## F. Composer-adjacent controls that carry scope (dialogs/popovers)

### CTX-01 Change model or reasoning effort
- Surface & trigger: composer model chip "<model> · <effort>" (app.mjs:3688-3691; index.html:352-360).
- Path: chip -> Model & effort card (6032-6076) -> effort segmented control saves immediately (saveEffortFromCard, 6079-6108) or "Change model" -> picker dialog (model-picker.mjs:378) or "Connections" -> Settings > Models (6047-6054). Second entry: file-access chip -> Connection popover -> "Model & effort" (settings-view.mjs:451-453).
- Depth: effort = 1 disclosure + 1 pick; model = 2 disclosures + save.
- Effect scope (obs): PUT /provider-config, "Saved · <effort> · all chats, future runs" (app.mjs:6096; model-effort.mjs:114; model-picker.mjs:378) — global and future runs, but the control lives in the composer of one chat and is blocked while a run is active ("Available after this run ends", model-effort.mjs:113). The scope sentence appears inside the card, not on the trigger.
- Frequency: medium — inf.
- Reversibility: reversible; no per-chat or per-turn override exists.
- Mismatch: SL (high) — a chat-local placement for a global, future-run setting; the trigger label shows the value, not the scope, so per-chat expectations are plausible before opening (inf). FD (low-med) for model choice.
- Candidate direction: state the scope on the trigger or move the global part out of the composer; or add a per-chat scope. Owner fact: whether Host supports per-session model (only /provider-config is present, server not traced).

### CTX-02 Change file access (permission mode)
- Surface & trigger: Home: select (index.html:335-339); chat: chip (index.html:341-348).
- Path: chip -> popover "File access · this chat" segmented (settings-view.mjs:468-486) -> PUT permission-mode (app.mjs:5849-5868); toast confirms. From Chat overview a second route goes to Settings > Permissions (6455).
- Depth: 1 disclosure + 1 pick.
- Effect scope: this chat, future runs; a run in flight keeps its value and the control is disabled with text (settings-view.mjs:475, 481).
- Frequency: medium — inf.
- Reversibility: full.
- Mismatch: none (scope stated in heading, placement local). Note (SL low): the popover mixing this per-chat card with the global Model & connection card and per-request telemetry under one title "Connection" (428-431, 448-455).

### CTX-03 Change the folder or repository of a chat after work started
- Surface & trigger: chip in composer strip only until first run (app.mjs:6383-6386, `visible` = no runs); afterwards via Chat overview.
- Path: header "Chat overview" -> "Workspace" -> folder row -> `openWorkspaceCard` (6455) = 3 steps.
- Effect scope: session binding; blocked while a private candidate exists (workspace-card.mjs:80).
- Frequency: low.
- Mismatch: none / low.

### SET-01 Reach Settings sections
- Surface & trigger: rail footer account button -> account popover (index.html:179-194; app.mjs:5918-5945).
- Path: click -> popover with Profile, Preferences, Account, Settings -> `openSettings(section)` (7023); the composer paths above go to Settings > Models/Permissions/Developer.
- Depth: 1 popover + 1 page change.
- Effect scope: global.
- Frequency: low.
- Mismatch: none.

---

## Summary table

| ID | Action | Mismatch | Severity |
|---|---|---|---|
| NAV-01 | Switch chat (rail visible) | none | low |
| NAV-02 | Switch chat, rail collapsed/narrow | FD | med |
| NAV-03 | Keep Preview across chat switch | FD | med |
| NAV-04 | Find chat by name | none | low |
| NAV-05 | Back / Forward | FD | low |
| NAV-06 | Home / New chat / Chat page entries | CL (Chat page) | low |
| NAV-07 | Switch chat from Settings | none | low |
| PRJ-01 | New chat (top button drops project) | FD | high |
| PRJ-02 | New chat in project ("+") | none | low |
| PRJ-03 | Choose project for a new chat | FD + SL | high |
| PRJ-04 | Create project | none (SL note) | low |
| PRJ-05 | Rename/delete project | absent capability | low |
| OBJ-01 | Rename chat | FD | med |
| OBJ-02 | Delete chat | SL | low |
| OBJ-03 | Archive / pin chat | absent capability (SL: Delete only removal) | med |
| OBJ-04 | Move chat between projects | absent capability (FD/CL) | med |
| OBJ-05 | Row menu variants | none | low |
| OBJ-06 | Project row semantics / tool scopes | CL | med |
| PRV-01 | Open agent artifact | SL/FD at 1024-1679 | med |
| PRV-02 | Close tab / hide pane / back | none | low |
| PRV-03 | Open chat file / material | FD | med |
| PRV-04 | Add material to a started chat | FD + SL | high |
| PRV-05 | Open run inspector / history | none (launcher note) | low |
| PRV-06 | Read request telemetry | SL | low |
| ATT-01 | Notice something needs me | FD | high |
| ATT-02 | Open Attention items queue | CL + SL | high |
| ATT-03 | Handle an Attention item | none | low |
| ATT-04 | Attention across projects | CL | med |
| ATT-05 | Answer a waiting question in another chat | FD | med |
| ATT-06 | Open Spark | CL | med |
| USG-01 | Open Usage | FD/SL | low |
| USG-02 | Filter usage | CL | low |
| USG-03 | Usage figure to run | FD | low |
| USG-04 | Per-turn cost | FD | low |
| CTX-01 | Change model/effort | SL (+FD) | high |
| CTX-02 | Change file access | none | low |
| CTX-03 | Change folder after work | none | low |
| SET-01 | Reach Settings | none | low |

Severity key: high = frequent and >=2 layers or wrong scope; med; low.

## Cross-cutting observations (obs unless marked)
1. One rail hosts window-level navigation (Back/Forward/Home/New chat), tool entries (Chat/Attention/Spark) and object lists; collapsing it removes all of them, and there are no global shortcuts (section 0, NAV-02, NAV-05).
2. Project-scoped tools (Attention, Usage, Spark, Home Attention block) each maintain their own project selector with different defaults: Attention = Home draft project or first project (app.mjs:6555-6561), Usage = all, Spark = current project (7989). Only Spark inherits the working project (OBJ-06, ATT-04).
3. Scope is often stated inside the opened surface rather than on the trigger (model chip, paperclip, Spark, Attention).
4. Capability gaps shape topology: no archive/pin/move/project-edit routes (server/index.mjs:181-187), so "remove from my list", "reassign" and "fix a project name" have no home.
5. Stale comments (index.html:111-113 Chat button; app.mjs:1527-1529 rail clickable in Settings; dead `session-dialog` markup index.html:998-1030 with `newSessionProjectId` never set, app.mjs:171, 7298) — inf that `createSession` path is unreachable; not verified by running.
6. Not traced: native host menus/shortcuts, `settings-view.mjs` internals beyond the entries above, `surface-modules.mjs` per-kind panes, `coordination-view.mjs`, `home-preparation.mjs` internals, `agent-choice`, rendered CSS behaviour at runtime (no browser run).
