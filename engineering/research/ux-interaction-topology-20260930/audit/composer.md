# Courtwork UX interaction-topology audit — Composer / chat thread / message actions / session header / Home & new-chat entry

Pinned: main 87e2207, worktree the audit worktree. Read-only; no repo file touched.
Paths are relative to `app/web/` unless prefixed (`app/server/...`). "obs" = observed in code (file:line). "inf" = inference. "not traced" = not followed to ground.
Depth counts disclosures/dialogs/page changes AFTER the trigger control itself (so a chip that opens one popover = depth 1). UX-11 (ux-grammar.md:36) is the reference: repeated choice ≤1 disclosure, flat list, real scope stated.

## 0. Map of the slice (obs)

Composer DOM: `index.html:295-385`. Controls row left to right, Chat with runs: Agent chip (prepended by `agent-chooser-view.mjs:36`, mount `app.mjs:7864`), Chat files paperclip (`index.html:325`), File-access chip (`index.html:341`), [context ring, `chat-measurements.mjs:164`], Model·Effort chip (`index.html:351`), Stop (`index.html:361`) / Send (`index.html:369`). On Home: Agent chip, Attachments paperclip (`app.mjs:7753`), File-access `<select>` (`index.html:335`), Model chip, Send. Above the field, only while the chat has no run: the Work-location strip (`index.html:305`, `app.mjs:6383-6418`; visible cond. `app.mjs:6385`).
Header: `index.html:197-247`: nav toggle, static `<h1>` title + mode/run badge (`app.mjs:3605-3627`), Chat overview button (`app.mjs:7428`), Open preview button (`app.mjs:7429`). Nothing in the header edits anything.
Message actions: `chat-actions.mjs` (rendered under user rows and under the final assistant row only, `user-message.mjs:62-69`, `app.mjs:3170`).

Scope table (obs) for every composer-adjacent control:
| Control | Real write | Scope | Where the UI says so |
|---|---|---|---|
| Send | POST /sessions/:id/runs `app.mjs:5644` | this turn (a run) | n/a |
| Agent chip | PUT /runtime-control, operation "profile", scope {type:"session"} `app.mjs:5481` (Home path; chat path in agent-choice.mjs, not read line-by-line) | this chat, future runs of it | inside popover only: "Works in: This chat…" `agent-chooser-view.mjs:92-97` |
| Model chip / Change model | PUT /provider-config `model-picker.mjs:185`, `app.mjs:6090` | Host-wide default, all chats, future runs | card: only under Reasoning effort `model-effort.mjs:114`; picker: `model-picker.mjs:378`; chip label says nothing |
| Effort segmented / `/effort` | PUT /provider-config `app.mjs:6090`; `commands.mjs:47-51` | same: Host-wide | `model-effort.mjs:114`, `app.mjs:5974` "all chats, future runs" |
| File-access chip (chat) | PUT /sessions/:id/permission-mode `app.mjs:5855` | this chat | card heading "File access · this chat" `settings-view.mjs:472` |
| File-access select (Home) | tab-local `state.homePermissionMode` `app.mjs:7737-7740`, stored in sessionStorage `app.mjs:388-392`, sent in POST /sessions `app.mjs:5372`; NOT reset after a send `app.mjs:5422-5427` | the next new chat(s) made in this tab | aria-label "File access for this chat" `index.html:338` (inaccurate: it also persists as the default for later chats in this tab) |
| Work location | POST/PUT repository-binding `workspace-card.mjs`, project fixed at creation | this chat (project fixed once chat exists, `workspace-card.mjs:PROJECT_FIXED`) | panel text |

Server freeze rules (obs): permission-mode is refused while THAT session has an active run (`app.mjs:5853`, `app/server/service.mjs:1601`). Provider config PUT is refused while ANY session has an active run or compaction (`service.mjs:2317`, `#busy()` `service.mjs:760`, `store.mjs:1092-1094` with no sessionId). The model card gates only on the open chat's run (`app.mjs:6042` `active: Boolean(currentRun())`).

---

## A. Composer

### CMP-01 Send the next message in an existing chat
- Surface & trigger: textarea + Send / Enter.
- Path: type in `#composer-input` (`index.html:310`); Enter (no Shift, no IME) -> `requestSubmit()` `app.mjs:7726-7736`; `submitRun` `app.mjs:5492` -> `submitSessionRun` `app.mjs:5497` -> POST run `app.mjs:5644-5647`. Draft autosaves per session (`app.mjs:7711-7724`).
- Depth: 0. No scan. No context switch. Memory burden: none.
- Effect scope: this turn (one run). UI states nothing; none needed.
- Frequency: very high (every turn) — inf (task structure).
- Reversibility: run can be stopped (CMP-13); message cannot be unsent.
- Mismatch: none.
- Direction: none. (Held-Send reasons from the Agent gate are shown in the notice slot `agent-chooser-view.mjs:286-305`; not audited further.)

### CMP-02 Send the first message from Home (creates the chat)
- Surface & trigger: Home composer; Send/Enter.
- Path: `submitRun` -> `submitHomeRun` `app.mjs:5341`: POST /sessions (title = first line, permissionMode from the Home select) `5368-5373` -> optional bind folder `5384-5394` -> apply Agent choice `5397/5460-5490` -> flush attachments `5403` -> persist draft `5408` -> `selectSession` `5417` -> `submitSessionRun` `5435`.
- Depth: 0 visible; up to 5 sequential Host writes hidden behind one click (obs). Failure leaves a real, unsent chat ("Your chat was made but not finished" `app.mjs:5304-5306`).
- Effect scope: creates a chat (object) with project/folder/agent/file-access/attachments captured at this moment; title is auto-derived and not editable here.
- Frequency: high (each new task).
- Reversibility: chat can be deleted (only from sidebar/Chat-page menu, see HDR-01).
- Mismatch: none for the click count. Note (inf): a "/" first message is created as a chat first (5368) and only then read as a command (`5534` inside `submitSessionRun`), so `/status` typed on Home can leave an empty chat titled "/status".
- Direction: not needed for topology; the slash edge is a correctness item.

### CMP-03 Choose the agent for this chat
- Surface & trigger: Agent chip (first control, composer controls row), visible in every ordinary chat (`app.mjs:3886-3900`, `agent-choice.mjs:467-475`).
- Path: chip click -> `openChooser` `agent-chooser-view.mjs:262-271` -> popover: listbox + reading of highlighted option `152-207` -> click/Enter row -> `commit` `222-226` (writes at once, closes).
- Depth: 1 popover. Scan: short listbox; no search. Context switch: none. Memory burden: low; the "When" sentence (applies to runs started after; running run keeps old agent) is only in the popover `agent-chooser-view.mjs:93-97`.
- Effect scope: this chat, future runs (obs: session-scoped runtime-control write `app.mjs:5481`; popover text `agent-chooser-view.mjs:92`). Chip label names the effective agent, not the scope. While a run is active the write is frozen ("A run is active…" `97`).
- Frequency: medium (per task type; inf).
- Reversibility: changeable between runs; a bound run keeps its agent.
- Mismatch: none. This is the reference-good pattern: flat list, one disclosure, honest scope.
- Direction: keep. Sibling controls should copy its scope sentence.

### CMP-04 Choose the agent before the first message (Home)
- Surface & trigger: same chip on Home (`app.mjs:3820-3825`).
- Path: chip -> popover, "chosen for the new chat" state (`agent-chooser-view.mjs:64`); Home lists only agents every chat can use, project agents "chosen in the chat once it exists" (`139`). Applied at first Send (`app.mjs:5460`).
- Depth: 1. Scope: the not-yet-existing chat; stated `agent-chooser-view.mjs:93-94`.
- Frequency: medium. Reversibility: pick is a draft until Send; locked once Send starts (`app.mjs:3822`).
- Mismatch: none. Small SL note (inf): a project agent cannot be chosen where the project is chosen (Work location strip); user must send, then choose in the new chat.
- Direction: none required.

### CMP-05 Change reasoning effort
- Surface & trigger: Model·Effort chip beside Send, label "`<model> · <effort>`" (`app.mjs:3682-3692`).
- Path: chip -> `openModelCard` `app.mjs:6060-6078` -> card `model-effort.mjs:65-119` -> segmented radio `102` -> `saveEffortFromCard` `app.mjs:6079-6105` (PUT /provider-config `6090`, expectedVersion CAS). Card stays open.
- Depth: 1 popover (best case). Scan: none (values from Host snapshot `model-effort.mjs:15-30`). Context switch: none.
- Effect scope (obs): Host-wide default for all chats' future runs. Card says "All chats · future runs" only as a small meta line under the segmented control `model-effort.mjs:114`; chip label carries no scope. Refused while ANY chat runs (`service.mjs:2317`/`760`), while the card only greys when THIS chat runs (`app.mjs:6042`); the resulting 409 is worded "Available after this run ends." (`app.mjs:6097`), which is inexact if the running chat is another one (inf).
- Frequency: medium-high if users vary effort by task (inf; the existence of a 1-click segmented control and a `/effort` command in the composer signals intended per-task use). Not measured.
- Reversibility: fully reversible, but it silently changes every other chat's next run and the Attention agent (`attentionAgent.controller.refresh()` `app.mjs:6094`).
- Mismatch: SL (high). A composer control that reads as "how hard this turn thinks" writes a Host-wide default. FD none (depth is already 1).
- Direction (not a ruling): (a) per-chat or per-turn effort override carried by the run request or the session Runtime Control (Agent choice already uses session scope, `app.mjs:5481`); or (b) keep global but relabel the chip/card as a default and show the scope at the chip. Owner/backend fact needed for (a): a session- or run-scoped effort field; `control-contract.d.ts:6-7,63` allows `session`/`invocation` scopes, but model/effort are not among the configurable resource kinds (`control-contract.d.ts:56-63`) — whether a session-scoped model/effort exists is NOT traced and looks absent.

### CMP-06 Change the model
- Surface & trigger: same chip.
- Path: chip -> card popover (`model-effort.mjs:83-97`) -> "Change model" row `89` -> `modelPicker.open()` (`app.mjs:6046`; modal `<dialog>` `model-picker.mjs:14-25`) -> a closed `<details>` "Change model" `69-70,374-376` -> optional search + `<select size=7>` grouped by provider/connection `153-162` -> effort resets to default on model change `171` -> "Set default" `93,173-190`.
- Depth: 3 (popover -> modal -> disclosure) + choose + save = 5 interactions. Scan: yes, a grouped list (optgroup by provider/connection id, label resolved via a second fetch of connection registry `27-46`). Context switch: modal overlays the chat; the popover is closed first (`app.mjs:6046`). Memory: user must recall the model name; picker shows "Saved" model, Model ID, Connection/provider, API in a details block `65,75`.
- Also reachable via `/model` (client_ui, `commands.mjs:44`, `app.mjs:5971`) and via the File-access chip's card, whose first section is "Model & connection" with a "Model & effort" row (`settings-view.mjs:442-464`, `app.mjs:5844`). Third path: "Open Models settings" (`model-effort.mjs:91-96`, page change).
- Effect scope (obs): Host-wide default, all chats, future runs; the save button is literally "Set default" and the picker says "All chats · future runs" (`model-picker.mjs:93,378`). Scope is honest but appears only after 3 disclosures. Chip label and "Change model" row do not say it.
- Frequency: low-medium (set-and-forget vs per-task switching; inf). If users switch models per task it is high.
- Reversibility: reversible; same global blast radius as CMP-05; refused while any run/compaction is active.
- Mismatch: CL (med-high): the picker is organised as connection -> provider -> model -> capability (optgroups by connection identity, `model-picker.mjs:39-46,157-161`; custom "model ID not listed" needs a connection select `203-247`), for a choice that is already configured. FD: 3 disclosures for a repeated choice (UX-11 asks ≤1). SL: global default reached from the working surface.
- Direction: a flat "recently used / configured models" list in the card itself (name + light provider hint), selection = one click + explicit scope line; connection tree stays in Settings. Needs: the Host to expose the flat set of runnable (model, connection) pairs (the picker already builds it: `/provider-models`), and a decision whether model is per-chat (needs a session-scoped model owner fact, not traced/likely absent) or stays global (then label it a default).

### CMP-07 Change file access for this chat (chat with a session)
- Surface & trigger: chip "Ask before editing v" in the controls row (`app.mjs:3704-3712`).
- Path: chip -> `openConnectionCard` `app.mjs:5824-5870` -> popover titled "Connection" `settings-view.mjs:424-490`, first section "Model & connection" (Provider, Model, "Model & effort", "Open Models settings"), second section "File access · this chat" with 3-way segmented radio `466-487` -> radio saves at once `app.mjs:5855-5860`.
- Depth: 1 popover, one radio. Scan: must skip the model/connection section to reach the file-access section. Context switch: none.
- Effect scope: this chat (obs, `service.mjs:1601` per-session). Stated in the section heading. Frozen while this chat runs: help text "Available after this run ends." `settings-view.mjs:481-483`.
- Frequency: low-medium; but it is the natural answer to repeated approval prompts (see THR-06), which happen mid-run when the control is frozen.
- Reversibility: reversible between runs.
- Mismatch: SL (med): the chip's label is a chat fact, but the card behind it is titled "Connection" and leads with a Host-wide model/provider block (2 objects, 2 scopes in one card). Same underlying data on Home is a bare `<select>` (CMP-08): the same choice has two different widgets.
- Direction: card = "File access · this chat" alone, or the chip opens the segmented control directly; move the model rows out (they already have their own chip). No backend fact needed.

### CMP-08 Set file access before the first message (Home)
- Surface & trigger: `<select id="home-permission-input">` (`index.html:335-339`).
- Path: native select -> `app.mjs:7737-7740` (state + `storeHomeDraft`). Populated at `app.mjs:7979` loop (not read further).
- Depth: 0 disclosures (native popup). Scope: the next chat(s) created in this tab: sessionStorage `app.mjs:388-392,412` and NOT reset after Send `app.mjs:5422-5427`; the same value is written by Settings > General > "File access for new chats" (`app.mjs:7803-7809`, `settings-view.mjs:2881-2898`, copy "Used when a chat is created").
- Frequency: low (default seldom changed; inf).
- Mismatch: SL (low): control sits in the composer and is labelled "for this chat", but behaves as a tab-local default for future chats; the Settings row is not a persisted preference either (inf: sessionStorage is tab-scoped; not exercised). Also two ontologies for one choice (Home select vs chat popover, CMP-07).
- Direction: a single "File access" control with one implementation used on Home and in chats; decide whether the default is per-tab, per-device (localStorage) or a Host preference. Needs owner fact: is there a Host-stored "default file access for new chats"? Not traced (none seen).

### CMP-09 Choose project / folder before work starts (Work location)
- Surface & trigger: context strip chip "project · folder", plus non-actionable "Local" and "Branch · x" facts (`app.mjs:6383-6418`), shown on Home and in a chat with no run yet.
- Path: chip -> `openWorkspaceCard` `app.mjs:6337-6358` -> popover "Work location" `workspace-card.mjs`: on Home a project list (`projectChoice` `app.mjs:6264-6281`), then folder chooser: "Connect folder…" (native Host dialog, `workspace-card.mjs:400-407`), "Connected before" list `409-424`, "Enter a path instead" `<details>` `441`; then, for editing, a separate explicit "Start private candidate" `248/481`.
- Depth: 1 popover (+ OS dialog for a new folder; +1 `<details>` for typing a path; +1 further explicit command for edits). Scan: recent list.
- Effect scope (obs): project = organisation only and fixed once the chat exists (`workspace-card.mjs` PROJECT_FIXED); folder = read-only source for THIS chat; candidate = private copy for edits. On Home these are intents until Send binds them (`app.mjs:5384`). The card separates four owners deliberately (`workspace-card.mjs:1-30`), which is honest but means "let the agent edit repo X" = Work-location chip (folder) + Start private candidate + File-access chip (CMP-07): 3 controls in 2 different places for one intent (inf).
- Frequency: medium (once per chat; per project setup).
- Reversibility: disconnect available; folder cannot change while a candidate exists (`workspace-card.mjs` CHANGE_FOLDER_BLOCKED) or a run is active.
- Mismatch: none for locality (chip sits on the composer edge and names both facts); CL/FD (low) for the edit-intent split across three controls.
- Direction: none required for the chip; consider one "allow edits in this folder" composite that shows the three owners' facts in one place. Needs no new backend fact (all facts are already read).

### CMP-10 Change work location after the first run started
- Surface & trigger: the strip is hidden once `state.runs.length > 0` (`app.mjs:6385`, `3700`).
- Path: header "Chat overview" button (`app.mjs:7428`) -> `openContextSummary` `6430-6461` popover "This chat" -> Workspace row (`workspace-view.mjs:101-107`, folder name or "Choose workspace") -> `openWorkspaceCard($("show-run-button"))` `app.mjs:6456` -> second popover.
- Depth: 2 popovers, entry in the header (far from composer and from the message being written). Context switch: eyes move from composer to header.
- Effect scope: same as CMP-09. Project cannot be changed at all after creation.
- Frequency: low-medium (folder is usually set at start; correcting or adding a folder mid-chat is plausible; inf).
- Reversibility: as CMP-09.
- Mismatch: FD + SL (med): the control affecting the agent's next run leaves the composer after the first run and is moved to a header popover; a chat whose first run was sent without a folder has no path back that is in the composer.
- Direction: keep the strip (or a collapsed chip) after the first run; needs no backend fact.

### CMP-11 Attach files (Home)
- Surface & trigger: paperclip "Attachments" (`draft-attachments.mjs:7`).
- Path: click -> popover with `<input type=file multiple>` `9,14,19` -> OS file dialog -> staged in memory; flushed after chat creation (`app.mjs:5403`, `draft-attachments.mjs:63-76`).
- Depth: 1 popover + OS dialog. Constraints stated in popover: UTF-8 text only, 1 MB each, 4 MB total (`19,55`); a file name outside `[A-Za-z0-9._-]{1,200}` is rejected (`46`).
- Effect scope: this new chat's materials, written on Send (stated "saved with the chat when you send" `19`). No drag/drop or paste-a-file handler traced (grep found no `drop` listener in `app.mjs`, `composer-field.mjs`, `draft-attachments.mjs`). Pasting an image only produces a notice `composer-field.mjs unsupportedPasteNotice`, `app.mjs:7699-7704`.
- Frequency: medium (evidence-heavy legal work; inf).
- Mismatch: none for topology; capability gap (text only) is a product limit, not a placement issue.
- Direction: none.

### CMP-12 Add a file/material to an existing chat
- Surface & trigger: paperclip labelled "Chat files" (`app.mjs:7433`, `3649` hidden on Home).
- Path: click -> `materials-dialog` modal `app.mjs:7534-7537`, `index.html:865` (workspace file list + retained uploads first) -> collapsed `<details>` "Add text material" `index.html:884` -> "Or choose a text file" (OS dialog) which fills name+text fields `materials-view.mjs:714-731` -> "Add material" submit `index.html:915ff`.
- Depth: 2-3 (modal + details + form submit) + OS dialog; context switch: modal; the same paperclip icon on Home opens a 1-step popover (CMP-11), in a chat it opens a 3-step dialog whose first screen is a file list, not an add action. Multi-file is not offered here (single `files[0]`, `materials-view.mjs:715`), unlike Home (`multiple`).
- Effect scope: this chat's materials; the dialog names the chat (`index.html` eyebrow "Chat").
- Frequency: medium (adding evidence as a matter develops).
- Reversibility: adds are retained sources with revisions; removal not traced.
- Mismatch: FD (med): a frequent, local, reversible action needs a modal + disclosure; asymmetry with Home.
- Direction: make the chat paperclip open the same lightweight add popover as Home; keep the file list dialog as "Chat files" behind a secondary row. Needs: the Host materials endpoint already accepts `POST /sessions/:id/materials` (used by flush `draft-attachments.mjs:68`), so no new backend fact.

### CMP-13 Stop the current run
- Surface & trigger: "Stop working" replaces Send while a run is active (`app.mjs:3852-3855`).
- Path: click -> `cancelCurrentRun` `app.mjs:5732-5780` -> POST /runs/:id/cancel; button shows request label while pending; status word "Stopping" only when the Host reports it (`app.mjs:3767-3772` comment, `3741-3745`).
- Depth: 0, adjacent to the text field. No confirmation. No keyboard shortcut (Settings > Keyboard says so explicitly: "No key…" `settings-view.mjs:2855-2858`).
- Effect scope: the current run only.
- Frequency: low-medium; time-critical when needed.
- Reversibility: irreversible (a stopped run stays stopped) but low regret.
- Mismatch: none. The visible working hint is sr-only (`index.html:320`, `app.mjs:3753`); the sighted indicator is the activity row in the stream (`chat-measurements.mjs:167`).
- Direction: none.

### CMP-14 Type or send while a run is active
- Surface & trigger: textarea stays editable during a run (`app.mjs:3834-3835` comment "V7"); Send is hidden (`3852`).
- Path: Enter still calls `requestSubmit()` (`app.mjs:7735`) -> `submitSessionRun` returns silently at `5499-5505` (`currentRun()`), before any feedback.
- Depth: n/a. Effect: nothing happens; no message. The sighted hint "your input will not be sent automatically" is sr-only (`index.html:320`). Design records "no queue" (role-composer README:69) so this is intended, but the affordance (editable field + Enter) implies otherwise.
- Frequency: high-medium (typing the next instruction, or a correction, while the agent works; inf).
- Mismatch: SL (low-med): the field looks live, the action is a silent no-op; the correction path is Stop (CMP-13) then Send, or wait.
- Direction: show one visible line ("Send after this run ends") or queue/steer. Steering needs a Host fact: a supported "append/steer running run" operation (not present in the traced routes; `service.mjs:2910` "only one active run is allowed").

### CMP-15 Use a slash command
- Surface & trigger: type `/` as the whole message (menu shows only for a lone slash word, `command-menu.mjs:12,15`).
- Path: menu of Host catalog `command-menu.mjs:74-103` (GET /sessions/:id/commands `108`) -> arrows/Enter/Tab/click `174-183` -> `pick` writes `/name ` into the field `151-159` -> Enter submits -> `readComposerCommand` `app.mjs:5947-5980` dispatches; result kinds: read -> command popover `6019`; client_ui -> model picker `5971`; setting -> global effort save `5972-5975`; control -> compaction follow-up `5977`.
- Depth: 0-1. Scan: 6 commands (`commands.mjs:38-57`). Memory: user must know to type `/`; argument enums are shown only inside the row label (`command-menu.mjs:25-28`), and the menu closes once a space is typed (`TRIGGER` regex `12`), so there is no argument picker.
- Effect scope: per command; `/effort` = Host-wide ("all chats, future runs", `commands.mjs:47-51`, feedback `app.mjs:5974`); `/model` opens the global picker; `/compact` = this chat (one model request, `commands.mjs:52-56`); `/status`, `/tools` read-only.
- Findings (obs): (1) commands marked `available` in the catalog while a run is active (`status`, `tools`, `commands.mjs:37-43`) cannot be executed: `submitSessionRun` returns at `app.mjs:5499-5505` before the slash branch `5534` (silent no-op). (2) inf, not run: the command menu's Enter handler (`command-menu.mjs:178-181`) does not stop propagation, and the composer's own Enter handler (`app.mjs:7726-7736`, registered later) does not check `defaultPrevented`, so Enter on a highlighted row likely picks and submits in one keystroke (`/compact` would start without a second Enter). (3) On Home the menu says "Commands work inside a chat." (`command-menu.mjs:10,78-81`).
- Frequency: low-medium; power-user path.
- Reversibility: read commands harmless; `/effort` and `/compact` change state (compaction is one-way in practice).
- Mismatch: SL (low): `/effort` (global) is stated only in its own descriptor text. FD none.
- Direction: none for topology; fix the active-run refusal for read commands (correctness).

### CMP-16 Compact a long chat when the context is filling
- Surface & trigger: context ring (`chat-measurements.mjs:164-166`), read-only popover "Request context" (`122-166`) with an "Inspect run" link (`142-145`).
- Path: ring click -> popover with usage numbers; no action. The only compaction action is typing `/compact` (`commands.mjs:52`, follow-up `app.mjs:6003-6018`).
- Depth: unbounded for a new user (no discoverable control); 0-1 for someone who knows `/compact`.
- Effect scope: this chat, adds a compaction entry, one model request (`commands.mjs:55`).
- Frequency: low, but time-sensitive when capacity is high (inf).
- Mismatch: SL/FD (low-med): readout and its remedy are separated; the remedy exists only as a hidden command.
- Direction: a "Compact" action inside the ring popover when capacity is known/high. Needs: none new (the command exists); optionally a Host threshold fact for when to suggest it.

### CMP-17 Read context/throughput details
- Surface & trigger: ring button and the activity glyph (`chat-measurements.mjs:164,167`).
- Path: click -> popover `147-157` (+ Refresh, Inspect run). Depth 1; read-only; scope this run's latest request; freq low; reversibility n/a. Mismatch: none.

### CMP-18 Paste an image / drop a file into the composer
- Path: paste handler `app.mjs:7699-7704` -> `composer-field.mjs unsupportedPasteNotice` says "Only text can be sent, so the image wasn't added." No drop handler traced. Depth 0; the notice is honest, the action does not exist. Mismatch: none (capability gap), but the paperclip is the only route (CMP-11/12). Frequency: medium (inf). Direction: none for topology.

---

## B. Chat thread and message actions

### THR-01 Copy the assistant's answer
- Surface & trigger: action row under the final assistant row only (`user-message.mjs:62-69`, `app.mjs:3170`, `messageActionRow` `app.mjs:2885-2896`).
- Path: hover/focus the message to reveal the row on fine pointers (`styles.css:6269-6281`: `opacity:0; pointer-events:none` until `.message:hover`/focus-within); click Copy -> `navigator.clipboard.writeText(row.text)` `app.mjs:2892` -> label flips to "Copied" `chat-actions.mjs:78,150-155`. Code blocks have their own per-block "Copy code" (`markdown-reader.mjs:44`, `ui-controls.mjs:303-304`).
- Depth: 0 (after hover). Not offered for narration rows before a tool, partial text, or failed/cancelled tails by design (`user-message.mjs:55-61`). Copies raw Markdown source (inf from `row.text`).
- Scope: this message. Frequency: high in a drafting workflow (inf). Reversibility: n/a.
- Mismatch: none. Hover-only reveal costs a discovery step on desktop (inf).
- Direction: none.

### THR-02 Copy my message / edit it as a new message
- Path: user row footer: Copy, Edit (`chat-actions.mjs:178`) -> Edit opens `edit-message-dialog` `app.mjs:5782-5789`, `index.html:766` with a second textarea -> "Use as draft" `app.mjs:5814-5821` replaces the composer text (warning if composer non-empty `5787`) -> user presses Send.
- Depth: 1 modal + 1 more action; context switch: modal with a duplicate editor, then back to the composer. The original stays in history (dialog copy `index.html:769`). `editDisabled` is never set (`chat-actions.mjs:74`, no caller passes it), so Edit is available during a run and the draft lands in the composer while Send is hidden (CMP-14).
- Scope: creates a NEW message/run; nothing is rewritten. Label "Edit as new message" (dialog title) states it; the row icon is just "Edit".
- Frequency: medium (re-asking with a tweak; inf).
- Mismatch: FD (low-med): the dialog editor is a detour; editing directly in the composer would be one step. Reason it exists is undocumented in code (inf: avoid clobbering an existing draft).
- Direction: put the text into the composer directly, with undo/"restore previous draft" if the composer was non-empty. No backend fact.

### THR-03 Regenerate / like / dislike / read aloud / fork / share / pin
- Path (obs): the assistant action row lists copy, read-aloud, stop-reading (hidden), like, dislike, regenerate + a More menu with fork, share, pin (`chat-actions.mjs:178-181`). Production admits only `copy`, `edit`, `copy-path`, `copy-hash` (`25`); everything else is rendered but `aria-disabled` with tooltip "`<label>` — unavailable" (`paint()` `85-104`, tooltips `101`), and clicking prints a "not available in this app yet" sentence (`9-21,114-118`). The same for user rows (More = fork/share/pin).
- Depth: 0-1 to discover that they do nothing. Scope: this message.
- Frequency of the intended actions: regenerate/retry high; like/dislike medium; others low (inf).
- Mismatch: SL/FD (med): 4 of the 6 visible answer icons (read aloud, like, dislike, regenerate) and all 3 overflow items (fork, share, pin) are dead affordances; the real "try again" workflow (THR-05) has no working control while a dead "Regenerate" occupies its place. Scan cost and false expectation on every answer.
- Direction: hide unadmitted actions (grammar elsewhere: "no capability -> not drawn", `object-commands.mjs:4-10`); ship regenerate as a real run. Needs: a Host operation to re-run from a given user message (supersede exists for runs: `service.mjs:2905-2909` SUPERSEDE_* errors, so a backend seam may exist; not traced for UI use).

### THR-04 Recover from a failed or unconfirmed Send
- Path: failure text goes to `#draft-status` (`app.mjs:686-736`). Only two `nextAction`s render a control: `retry-run` -> "Recover" (`716-724`), `view-history` -> "View history" (`725-733`). `run:rejected` maps to nextAction `retry` (`752-763`) and `draft:*` to `retry-edit` (`775-784`), which have no button (obs: `renderFeedbackLine` handles neither). The draft is kept (`5696-5700`), so retry = press Send again.
- Depth: 0-1. Scope: this turn. Frequency: low. Reversibility: idempotent by commandId (`5573-5579`, `6953-6959`).
- Mismatch: none significant; copy says "retry" without a button (low).
- Direction: none.

### THR-05 Re-run after a failed/cancelled run, or ask again
- Path: no Retry/Regenerate control works (THR-03). Options: Edit as new message (THR-02: modal -> Use as draft -> Send), or copy-paste, or retype. Run-status card offers "Inspect this run" (`app.mjs:3481`).
- Depth: 3 interactions via Edit; context switch to a modal. Scope: new run. Frequency: medium (agents fail/are stopped; inf). Reversibility: fine.
- Mismatch: FD (med): a frequent local reversible action has no direct control. Direction: a Retry on the failed/cancelled run row that re-sends the same input as a new run (same run pipeline, new commandId). Backend fact: none needed for "new run with same text"; "supersede/continue" semantics (`service.mjs:2905-2908`) are separate and not traced.

### THR-06 Approve or deny an agent's tool action
- Path: inline permission card in the thread (`app.mjs:6784-6945`): two buttons "Deny this <noun>" / "Approve this <noun>" `6886-6889`; POST `/runs/:id/questions/:id {decision}` `6918-6921`. A details `<summary>` shows the exact identity/hash `6858-6866`.
- Depth: 0 (inline, sits where the agent stopped). Scan: preview of the exact write + size.
- Effect scope (obs): this exact call only ("Approval for this exact <noun> only" `6851`); history row repeats "Approval recorded for this exact…" `6812`.
- Frequency: high in "Ask before editing" mode (every write; inf).
- Reversibility: irreversible for that write; deny is non-destructive.
- Mismatch: FD/SL (med-high): the repeated per-call decision has no "allow the rest of this run / this chat" option at the card, and the chat-level knob (CMP-07) is frozen while the run is active (`settings-view.mjs:481-483`, `service.mjs:1601`). To reduce approval prompts the user must stop the run, open the chip's "Connection" card, change the mode, and start over (inf). Decision scope (one call) and setting scope (chat) are on opposite sides of a freeze.
- Direction: an "Approve and allow edits for this chat" secondary action, only if the Host allows changing permission mode mid-run for later calls (a Host fact that does not exist today: mode frozen during a run per `service.mjs:1601`). Otherwise show "change file access after this run" on the card.

### THR-07 Answer the agent's question
- Path: inline `question-card` with input + "Answer" `app.mjs:3236-3404`; POST `/runs/:id/questions/:id {answer}` `3374-3377`. Depth 0; scope this question; freq medium; irreversible once sent. Mismatch: none.

### THR-08 Open a run/tool detail
- Path: "Execution" disclosure group per run `app.mjs:3099-3144` (open state remembered in `state.toolOpen`), per-tool `<details>` `3185`, "Inspect this run" chevron on the run-status card `3481` opening the right-hand preview pane (`openRun`, `app.mjs:4470`). Depth 1-2; context switch to a side pane (not a page change). Scope: read-only. Frequency: medium. Mismatch: none.

### THR-09 Open a produced file / copy its path or hash
- Path: artifact row button -> `openFile` `app.mjs:3441-3449`; file actions Copy path / Copy hash in a row plus a More menu (download, open-with, reveal are dead: `chat-actions.mjs:18-20,179`). Depth 1 (preview pane). Mismatch: SL low: the More menu on file rows holds three unavailable actions (same dead-affordance pattern as THR-03).

### THR-10 Get back to the latest message
- Path: "Back to latest" button (`index.html:286-293`, `app.mjs:7674`), auto-follow when near bottom `app.mjs:534-556`. Depth 0. Mismatch: none.

---

## C. Session header

### HDR-01 Rename the chat I am in
- Surface & trigger: the header title is static text (`index.html:219-222`, `app.mjs:3605-3609`); no click/edit handler on it (grep of `session-title` in `app.mjs` shows only focus and text writes).
- Path: open the sidebar if collapsed/overlay (`app.mjs:4200-4210`) -> locate the row in Recent or under its project -> right-click / Menu key / row "..." (which is opacity 0 until hover on pointer devices, `styles.css:6626-6628`) -> menu `object-menu.mjs` -> "Rename" `object-commands.mjs:26-31` -> `rename-dialog` `app.mjs:1836-1845` -> Rename -> PATCH `1857`. The Chat page rows carry the same menu (`chat-page.mjs:` attachCommands, `app.mjs:7999`).
- Depth: 3 (find row + menu + dialog), +1 if the sidebar is closed. Scan: yes (locate the current row among others). Context switch: eyes leave the header to the sidebar. Memory: user must know the menu exists (row "..." is hover-revealed).
- Effect scope: this chat's title. Titles are auto-derived from the first line of the first message (`app.mjs:5371`), so renames matter for long instructions (inf).
- Frequency: low-medium (once per chat, often skipped; inf).
- Reversibility: fully.
- Mismatch: SL (med): the control sits far from the object it names; the object's own title is inert.
- Direction: editable title in the header (click/F2 or a small pencil), keeping the sidebar menu as an alternate. No backend fact (PATCH /sessions/:id exists, `app.mjs:1857`).

### HDR-02 Open "This chat" overview
- Path: header button (icon "text-align-start", label "Chat overview", `app.mjs:7428`) -> popover `app.mjs:6430-6461`, `workspace-view.mjs:64-140`: Workspace (folder, Chat files, Browse workspace/Open work preview), Work history (Latest, Work history), Chat settings.
- Depth 1; scope: reading and navigation to other surfaces. It is a launcher: 5 of its 8 rows open another popover/dialog/page (`onMaterials`, `onWorkspace`, `onRun`, `onHistory`, `onPermissions`, `onRepository`). Mismatch: none by itself; see HDR-03/04.

### HDR-03 Open the preview / workspace pane
- Path: header "Open preview" (`app.mjs:7429,4002-4008`) -> right pane; also overview "Browse workspace" (2 steps). Depth 1; scope read/browse; freq medium. Mismatch: none.

### HDR-04 Change this chat's file access from the overview
- Path: overview "Chat settings" row whose label is the chat's current file access text (`workspace-view.mjs:134-137`) -> `openSettings("permissions")` `app.mjs:6455` -> Settings PAGE (page change; global sidebar removed, `app.mjs:3589-3597`) -> Settings > Permissions = the runtime "Policy" editor with scope tabs (user/workspace/agent/session layers) `runtime-view.mjs:2747-2760,624-650`.
- Depth: popover + page change; context switch: full page; scan: layered policy vocabulary (requested/effective/ceiling/frozen, `runtime-view.mjs:2754`).
- Effect scope: the row label states a per-chat fact ("Ask before editing"); the destination edits runtime policy rules by scope, not that chat-level mode (inf: the chat's mode is set only by the composer chip / Home select; the Permissions page was not traced for a `permissionMode` control and none was seen).
- Frequency: low-medium (changing file access) but it is the row that looks like the path.
- Mismatch: CL + SL (med): configuration ontology (policy layers) behind a row that reads as a simple chat setting; the fast path exists 1 step away in the composer (CMP-07).
- Direction: make this row open the same segmented control as CMP-07 (or drop the row); leave policy layers to Settings. No backend fact.

### HDR-05 Delete the current chat
- Path: same route as HDR-01 (sidebar menu -> Delete -> confirm dialog `app.mjs:1874-1918`); disabled while a run is active (`object-commands.mjs:45`). Depth 3. Frequency low; rare and destructive so distance is acceptable. Mismatch: none.

---

## D. Home and new-chat entry

### HOM-01 Start a new chat
- Path: sidebar icon-only "New chat" (`index.html:109`, `app.mjs:7449,7565`) -> `startNewSession` `app.mjs:6722-6734` -> `goHome` `6655-6671` (persists the current draft first, clears the active session, loads Home). Also "Home" text button (`index.html:108`), and "Chat" nav -> Chat page -> primary "New chat" (`chat-page.mjs`, `openChatPage` `app.mjs:6678`).
- Depth: 1 click if the sidebar is visible; +1 if collapsed/overlay. Page change: yes (lands on Home, which is also the activity dashboard; the composer is the anchor `app.mjs:3666-3679`). No global keyboard shortcut traced (only modifier filters at `app.mjs:7131,7147`).
- Effect scope: creates nothing until Send (CMP-02). If a prepared/unfinished chat exists, "New chat" refuses and returns Home with a toast (`6723-6728`).
- Frequency: high.
- Reversibility: drafts are kept (`persistCurrentDraft`, `6662`).
- Mismatch: none for depth. Note: the icon-only control has no visible word (name is aria-label/tooltip; `nameHistoryControl`-style icon).
- Direction: a keyboard shortcut and visible label are the candidates (not a topology change).

### HOM-02 Start a new chat in the same project as the one I'm in
- Path: (a) sidebar project row "+" "New chat in <project>" `app.mjs:2250-2258` (1 click if the project group is visible; not in the header); (b) general New chat (HOM-01) sets `homeProjectId = null` (`app.mjs:6731`) so the current chat's project is dropped; project must then be re-chosen in Work location (CMP-09: chip -> popover -> project list).
- Depth: 1 (a) / 2 (b). Effect: chat organised under that project. Frequency: medium (matters run as several chats; inf).
- Mismatch: SL (low-med): the one control that carries project context ("+") is in the sidebar, while the header/composer's New chat does not inherit it; the project name is not shown in the header when the sidebar is open (`app.mjs:3603-3604` "only when the sidebar cannot show it").
- Direction: New chat from an open project chat defaults to that project (visible in the Work-location chip). No backend fact.

### HOM-03 "Chat" nav entry versus New chat versus Home
- Obs: three entries lead to a composer: Home, New chat, Chat page > New chat. `index.html:111-113` says the Chat button "returns to the chat you were in or the most recent one … It creates nothing", but `openChatPage` (`app.mjs:6678-6690`) opens a list page with a "New chat" button and a "Return to <title>" button (`chat-page.mjs:` actions). Comment and code disagree (inf: comment is stale).
- Depth for "return to my last chat": Chat nav -> page -> Return = 2, or sidebar Recent row = 1. Mismatch: none by topology; naming/stale comment only (low).

### HOM-04 Change the default File access for new chats
- Path: Settings page > General > "New chats" segmented control (`settings-view.mjs:2881-2898`) writes `state.homePermissionMode` (`app.mjs:7803-7809`), the same tab-local state as the Home select (CMP-08). Depth: page change. Frequency: very low. Scope: tab (inf) though the copy reads like a standing default. Mismatch: SL (low): see CMP-08.

### HOM-05 Slash commands on Home
- Path: `command-menu.mjs:10,78-81` says "Commands work inside a chat." Home has no session; a typed "/" message is created as a chat then interpreted (CMP-02 note). Depth 0. Mismatch: none; low.

### HOM-06 Start with an example workspace
- Path: banner `index.html:263-277`, "Start with your own work" runs `leavePreview` then `startNewSession` `app.mjs:7438-7441`. Not a repeated action. Mismatch: none.

---

## E. Summary table

| ID | Action | Mismatch | Severity |
|---|---|---|---|
| CMP-01 | Send in chat | none | - |
| CMP-02 | Send first message from Home | none (slash edge noted) | low |
| CMP-03 | Choose agent (chat) | none (reference-good) | - |
| CMP-04 | Choose agent (Home) | none | - |
| CMP-05 | Change reasoning effort | SL (global default from working surface; frozen by any chat's run) | high |
| CMP-06 | Change model | CL + FD + SL (3 disclosures, connection tree, global) | high |
| CMP-07 | Change file access (chat) | SL (chat fact inside a "Connection" card with global model block) | med |
| CMP-08 | File access on Home | SL (tab-local default labelled per chat; two widgets for one choice) | low |
| CMP-09 | Set work location before start | none (edit-intent split across 3 controls: CL low) | low |
| CMP-10 | Change work location after first run | FD + SL (strip disappears; 2 popovers via header) | med |
| CMP-11 | Attach files (Home) | none | - |
| CMP-12 | Add material to existing chat | FD (modal + details; asymmetric with Home) | med |
| CMP-13 | Stop a run | none | - |
| CMP-14 | Type/send during a run | SL (live-looking field, silent no-op; hint sr-only) | med |
| CMP-15 | Slash commands | SL low; correctness: no-op on active run; Enter may pick+run (inf) | low |
| CMP-16 | Compact when context fills | SL/FD (readout without its action) | low |
| CMP-17 | Context/throughput details | none | - |
| CMP-18 | Paste/drop image | none (capability gap) | low |
| THR-01 | Copy answer | none | - |
| THR-02 | Edit my message as new | FD (modal detour) | low |
| THR-03 | Regenerate/like/read aloud/fork/share/pin | SL/FD (dead affordances on every answer) | med |
| THR-04 | Recover failed send | none | low |
| THR-05 | Re-run after failed/cancelled run | FD (no direct control; 3 steps) | med |
| THR-06 | Approve/deny tool action | FD + SL (per-call decision vs frozen chat-level setting) | high |
| THR-07 | Answer question | none | - |
| THR-08 | Inspect run/tool details | none | - |
| THR-09 | Open file / copy path,hash | SL low (dead menu items) | low |
| THR-10 | Back to latest | none | - |
| HDR-01 | Rename current chat | SL (title inert; 3+ steps in sidebar) | med |
| HDR-02 | Open chat overview | none (launcher) | - |
| HDR-03 | Open preview | none | - |
| HDR-04 | Change file access from overview | CL + SL (label per-chat; destination = runtime policy page) | med |
| HDR-05 | Delete chat | none (rare, destructive) | - |
| HOM-01 | Start new chat | none | - |
| HOM-02 | New chat in same project | SL (project context dropped) | low-med |
| HOM-03 | Chat nav vs New chat vs Home | none (stale comment) | low |
| HOM-04 | Default file access for new chats | SL (tab-local) | low |
| HOM-05/06 | Slash on Home / example entry | none | - |

Not traced: Attention composer (excluded from slice), agent-choice.mjs controller internals for the chat write path, provider-config.mjs projection, `session.repositoryCandidate` flows beyond the card, desktop-host shortcuts, real-browser behavior (no runtime was executed).
