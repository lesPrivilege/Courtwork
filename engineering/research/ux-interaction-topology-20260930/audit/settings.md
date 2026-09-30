# UX interaction-topology audit — Settings & configuration surfaces

Repo: the audit worktree @ 87e2207 (read only). Rule lens: `engineering/design/ux-grammar.md` UX-11.
Method: static reading of client (`app/web/**`) and Host (`app/server/**`, `app/runtime/commands.mjs`). No browser run. Every claim is tagged **[obs file:line]** (observed in code) or **[inf]** (inference) or **[not traced]**.
Paths below are relative to the repo root. `web/` = `app/web/`, `srv/` = `app/server/`.

## 0. Cross-cutting facts (referenced by the records)

F1. **One global model/effort fact, no per-chat one.** The Host keeps a single `providerConfig` `{provider, model, api, baseUrl?, reasoningEffort?}` plus `providerConfigVersion` in the store state [obs srv/store.mjs:68-70, srv/service.mjs:285-290]. A `session` record's exact key set has no model/provider/effort field; it has `permissionMode` and `executorChoice` [obs srv/store.mjs:459]. A run gets a frozen copy of the global config at creation (`run.provider`) [obs srv/store.mjs:1665, srv/service.mjs:2785-2810]. So "model for this chat's next turn" == "the global default at Send time". There is no separate fact for "this chat/next turn" anywhere in client or Host [obs, by absence in the above key sets; client grep for a per-session model found none].
F2. **Write path.** Every model/effort save in the client is `PUT /api/v5/provider-config` (whole-object replace, CAS `expectedVersion`) [obs web/provider-config.mjs:1-12, srv/index.mjs:260-261, srv/service.mjs:2316-2348]. Callers: composer effort card (`web/app.mjs:6079`), picker "Set default" (`web/model-picker.mjs:185`), picker custom-ID (`:319`), Settings › Models form (`web/settings-view.mjs:1441,1463`), `/effort` (`srv/service.mjs:734-738`). Everything says or implies "all chats · future runs" at some point, but not uniformly (see SET-04).
F3. **Freeze is global, client gating is per-chat.** Host refuses `PUT /provider-config`, connection/credential edits, runtime-control edits and extension lifecycle with 409 `active_run` when *any* run in *any* chat (or a compaction) is active: `#busy()` = `store.hasActiveRun()` with no sessionId + `hasActiveOperation()` [obs srv/service.mjs:760, srv/store.mjs:1092-1098, 2317]. The composer card disables effort only when `currentRun()` (this chat's `state.runs`) is active [obs web/app.mjs:589-591, 6043]; the picker has no client gate at all [obs web/model-picker.mjs:173-190].
F4. **Model catalogue is not filtered by credential.** `GET /provider-models` returns models for every connection whose *configuration* is ready, whether or not a key is saved [obs srv/service.mjs:454-460]. `PUT /provider-config` does not require a key either [obs srv/service.mjs:2316-2348]. The missing key is discovered when the run starts: the run is created, then fails with `credential_missing` [obs srv/service.mjs:3083-3086].
F5. **Settings IA mirrors storage/API schema in several places.** 13 groups [obs web/settings-view.mjs:1732-1750] (the HTML comment still says "nine", web/index.html:391). Models = connection registry (`/provider-connections`) list + one form whose fields are Provider → API key → Model → Advanced(API format, Base URL, context window, supported effort values) [obs web/settings-view.mjs:933-943, 837-857]. Tools & Integrations / Skills / Plugins / (Agent profiles inside Developer › Composition) are projections of the runtime-control `resources[]` by `kind` [obs web/runtime-view.mjs:31-76, web/index.html `data-wk11-mount` attributes]. Scope tabs User / Workspace / Session (the runtime-control scope enum) are a first-class control in Developer, Plugins, Permissions [obs web/runtime-view.mjs:624-690].
F6. **Specimen-only modules.** `web/agent-profiles.mjs`, `web/agent-profiles-view.mjs`, `web/runtime-management.mjs`, `web/runtime-management-view.mjs` (the "Agent profiles" and "Runtimes management" journeys) are served statically [obs srv/index.mjs:25] but not imported by `app.mjs`, `runtime-view.mjs` or `settings-view.mjs`; only tests/fixtures import them [obs grep of app/web, app/tests]. **[inf]** they are not reachable in the production UI. The production Agents surfaces are `runtime-inventory*.mjs` (read-only), `agent-choice.mjs`/`agent-chooser-view.mjs` (composer), `profile-editor*.mjs` and `runtime-view.mjs` (Developer).
F7. **Runtime (executor) choice has no client surface.** Host exposes `GET/PUT /sessions/:id/executor-choice` [obs srv/index.mjs:188-189]; no file in `app/web` references it [obs grep]. Settings › Agents › Runtimes is read-only ("Settings reads it and cannot change it") [obs web/runtime-inventory-view.mjs:22, 208].
F8. **Comparator that does it right.** File access has two distinct facts with two homes: default for new chats (Settings › General › New chats, `web/settings-view.mjs:2882-2897`) and this chat's value (composer connection card `web/settings-view.mjs:466-483`, Settings › General › This chat `:1620-1640`, store field `session.permissionMode`). Model/effort has only the first kind but is presented on the second kind's surface.

---

## 1. Records

### SET-01 Change reasoning effort before the next message
- **Surface & trigger**: composer model chip `#model-settings-button` (label `<model> · <effort>`), opens `#model-popover` [obs web/index.html:352-360, web/app.mjs:2803-2805, 7474]. Alt trigger: type `/effort <value>` (command menu) [obs srv/service.mjs:734-738, web/app.mjs:5972-5976].
- **Path**: (1) click chip → `openModelCard` `web/app.mjs:6060`; card = `renderModelEffortCard` `web/model-effort.mjs:65`; (2) click a radio in the "Reasoning effort" segmented control `:102` → `saveEffortFromCard` `web/app.mjs:6079` → immediate PUT (no Save button). Slash path: 1 keystroke `/` + select + value.
- **Depth; scan/search; context switch; memory burden**: depth 2 (popover). Scan: ≤ ~5 segments (Provider default + declared values). No context switch. No memory burden (reads current value on the card). When the model's capability is `unknown`/`unsupported` the control is replaced by the text "Provider default" and an explanation `web/model-effort.mjs:101-111` [obs].
- **Effect scope**: `PUT /api/v5/provider-config` body `{provider, model, api, baseUrl?, reasoningEffort?, expectedVersion}` → store `providerConfig.reasoningEffort` + `providerConfigVersion` [obs web/app.mjs:6079-6093, srv/service.mjs:2316-2348]. Scope = all chats, all future runs, also the Attention agent [obs web/attention-agent-view.mjs:165-169]. The card states it in small text at the end of the effort section: "All chats · future runs" (`web/model-effort.mjs:114`); the saved feedback repeats "all chats, future runs" (`web/app.mjs:6094`).
- **Frequency**: high (per task/matter) [inf: effort trades cost/latency; the design gives it a one-click home].
- **Reversibility / danger**: fully reversible (re-select); affects cost/latency of every chat's next run. Low danger.
- **Mismatch**: SL (minor) — the chip label `model · effort` sits in the composer of *one chat* and reads as this chat's state, while the scope sentence is only inside the popover, in the effort section, below the fold of the model section (see SET-04). Frozen-state message is wrong-scoped (see SET-08). Otherwise placement is right (UX-11-compliant: 2 steps, real scope stated).
- **Candidate direction**: keep the one-disclosure card; make the scope word visible where the chip is read (chip tooltip or a "default" marker) or provide a genuinely per-chat fact (needs Host: a session-level `reasoningEffort` override field with run-binding, currently absent — F1).

### SET-02 Switch to a model from another provider
- **Surface & trigger**: composer chip → card → picker dialog. Other triggers: `/model` command → `client_ui` → `modelPicker.open()` [obs web/app.mjs:5971, app/runtime/commands.mjs:44-46]; connection popover row "Model & effort" [obs web/settings-view.mjs:455, web/app.mjs:5844]; Attention dialog button "Model" [obs web/attention-agent-view.mjs:95-96, 165-166].
- **Path**: (1) click chip `web/app.mjs:7474`; (2) card row "Change model" `web/model-effort.mjs:89` → `modelPicker.open()` `web/app.mjs:6046` (card closes, **modal `<dialog>` opens** `web/model-picker.mjs:14,25`); (3) expand the collapsed `<details>` "Change model" (closed by default, no `open` set) `:69-70,375` — the initial `search.focus()` at `:379` targets an input inside a closed details **[inf: focus lands nowhere useful until expanded]**; (4) find the model: type in "Find a model…" `:51` or scan a 7-row native `<select>` grouped by `optgroup` = provider label (`:157-160`; label = connection host for user connections, raw provider id for catalogue ones except openai/deepseek/local which have friendly labels, `web/settings-view.mjs:96-100,240-251`); select → handler sets `effort = undefined` `:171`; (5) optionally re-pick effort in the `<select>` "Reasoning effort" (`:110-117`); (6) click **Set default** `:93,173-190`; dialog closes on success `:187`. Minimum 5 actions (chip, Change model, expand, pick, Set default); +1–2 with effort re-pick or search typing.
- **Depth; scan/search; context switch; memory burden**: three nested layers (popover → modal → collapsed details) then a flat-but-mixed list. Models of all providers are in one list; the model's provider appears only as the group header, or as ` · <label>` suffix only when another provider has an identically named/id'd model (`:42-47`). Provider, API, endpoint, context window are in a second collapsed details "Model details" (`:74-75,130-132`). Modal → the composer is inert while choosing (draft stays). Memory burden: the user must remember which effort they had — switching model **always clears the effort** (`:171` → `projectProviderConfig(..., {reasoningEffort: effort=undefined})` explicit clear, `:180-182`, `web/provider-config.mjs:68-85`) even if the new model supports the same value; it is not carried and not previewed as lost.
- **Effect scope**: same `PUT /provider-config` as SET-01, now replacing provider+model(+api) and dropping `baseUrl` when provider changes [obs web/provider-config.mjs:73-74]. Scope = all chats, future runs. Copy is honest here: button "Set default" and the line "All chats · future runs" `:377-378` [obs]. Also changes the model used by the Attention agent (F1).
- **Frequency**: high for a user who compares/steps models per task; **[inf]** moderate for a single-model user.
- **Reversibility / danger**: reversible. But it changes **which vendor receives the matter's content** for every chat (data-egress boundary). The dialog shows the provider only as a group header/optional detail; there is no egress wording and no confirmation. Not blocked when the target provider has no key (F4) → SET-07.
- **Mismatch**: **CL** (a repeated choice among already-configured models crosses popover → modal → disclosure and is organised as provider groups, i.e. the configuration tree is re-exposed on the execution plane; UX-11 says ≤ 1 disclosure, flat list, provider as metadata). **SL** (the same global "default" is edited through a "Change model" verb; the effort loss is a side effect).
- **Candidate direction** (not a ruling): one anchored disclosure from the chip listing enabled models flat (name, provider as secondary text, key/ready state), search inline, effort next to the selected row; commit on pick or with an explicit "Set as default" if scope stays global. Owner facts needed: a per-model/connection "usable now" flag on `/provider-models` (credential + configuration status are already computed server-side, F4); whether effort should be remembered per model (no such field today: single `reasoningEffort` in `providerConfig`).

### SET-03 Change model/effort from Settings › Models (Configure → Save)
- **Surface & trigger**: avatar/account menu → Settings (opens on last section) `web/app.mjs:5932`; or from the composer card "Open Models settings" chevron with `connectionId` `web/model-effort.mjs:94`, `web/app.mjs:6046-6051,7023-7047`.
- **Path**: (1) account button; (2) row "Settings"; (3) group "Models" (13-group nav, `web/settings-view.mjs:1732-1750`); (4) on the connection row click **Configure** `:1026` (it re-aims the form below, does not select anything) → provider select changes, `model` select refilled `:1091-1109`; (5) pick model in `Model` select `:935`; (6) **Save and ask once** `:866` or **Save only** `:871`; (7) Back to app. From the card the path is chip → chevron → Configure → pick → Save → Back.
- **Depth; scan/search; context switch; memory burden**: page-level navigation away from the chat; Settings replaces the main area (`web/app.mjs:7023-7047`), draft stays. Model select is per-provider (no cross-provider search). Effort is **not editable here**; the only mention is the read-only row in the collapsed "Saved model and host details" [obs web/runtime-view.mjs:2686-2692,2767-2790]. If the current effort is unsupported by the new route the save throws "Choose Provider default in Model & effort before changing this endpoint." `web/settings-view.mjs:1392-1398,1438,1461` — a Settings error that sends the user back to the composer card (cross-surface dependency; also the wording talks about "endpoint" though the user changed a model). The picker instead silently drops effort (SET-02): same fact, two different rules.
- **Effect scope**: non-compatible connection: `PUT /provider-config` [obs `:1461-1475`]. Compatible connection: `PUT|POST /provider-connections[/:id]` then `PUT /provider-config` [obs `:1400-1450`]. In both cases **saving the connection form also selects it as the in-force default for all chats** (badge "In force" `:983`). Only the help line under Model says "Used for future runs in all chats" (`:935`); the button names do not mention selecting.
- **Frequency**: low for switching models (composer is the frequent home, but is 3-layer, see SET-02); moderate during first-time setup.
- **Reversibility / danger**: reversible; but editing/correcting *any* connection (e.g. fixing a Base URL of provider B) silently makes B the default model for every chat **[obs `:1461-1475`; inf: user intent was configuration only]**. Whole form is disabled while any run is active `:1215-1218` (F3).
- **Mismatch**: **SL** (Save connection == Set default; a configuration edit has a global execution effect); **CL** (rows show model *counts* and windows, `:1064-1069`, not the task "use this one"; the only per-row verb is Configure). **FD** in the other direction is fine (rare config deep).
- **Candidate direction**: separate "Save connection" from "Use this model by default" (row-level "Use" or a checkbox default-on only for the first connection); show the model list on the row. Owner fact: `PUT /provider-connections` and `PUT /provider-config` are already separate endpoints; the coupling is client-side (`web/settings-view.mjs:1438-1450, 1461`).

### SET-04 Know which model/effort the next turn will use (and whether it is per chat)
- **Surfaces**: composer chip text `web/app.mjs:2803-2805, 3688`; model card `web/model-effort.mjs`; connection popover ("Model & connection" Provider/Model rows) `web/settings-view.mjs:436-459`; agent chooser reading "Model X, from Models · All chats · future runs. This agent has no model of its own." `web/agent-chooser-view.mjs:79-80`; Attention dialog "configured for the next Run" `web/attention-agent-view.mjs:169`; `/status` command `app/runtime/commands.mjs:36-38` (description: "This chat's model, effort, file access…"), value read from `this.providerConfig` `srv/service.mjs:712-722`.
- **Path**: chip is always visible (0 steps); everything else 1–2 steps.
- **Depth; scan**: visible at 0 depth; but the label is `model · effort` next to per-chat controls (File access chip, Agent chip) `web/index.html:334-360`. The connection card and Agent chooser correctly say "all chats"; the card's **model** section has no scope sentence (only the effort section does, `web/model-effort.mjs:83-97 vs 114`); `/status` labels the global value as "This chat's model".
- **Effect scope**: read-only projection of the single global config (F1). **[obs]** no Host field distinguishes "default for future chats" from "this chat's next turn"; they are the same fact. The distinction the user needs (change *only* this chat) cannot be expressed anywhere.
- **Frequency**: read constantly (chip), so its wording is high-traffic.
- **Reversibility**: n/a.
- **Mismatch**: **SL** — the control sits with per-chat siblings (Agent, File access) and reads as this chat's state, while its effect scope is global; defaults and current choice are conflated by construction (F1). Partially mitigated by scope text inside cards.
- **Candidate direction**: decide whether a per-chat model/effort override is wanted. If not: mark the chip as "default" or keep chip but say scope in the card's model section too. If yes: needs an owner fact — session-level provider override in the session schema (`srv/store.mjs:459`) and run binding (already frozen per run, `:1665`), plus a Host rule for precedence and for the `active_run` freeze becoming per-session.

### SET-05 Choose a model when the provider has no key yet (can it run?)
- **Surface & trigger**: picker list (SET-02) / Settings Model select (SET-03).
- **Path**: same as SET-02. The option text is `model.name || model.id` only [obs web/model-picker.mjs:159]; no credential/ready indicator. Credential state appears only afterwards: the card says "No API key on this connection." for the in-force connection [obs web/model-effort.mjs:91-92]; the connection row says "No API key saved" [obs web/settings-view.mjs:289].
- **Effect scope**: `PUT /provider-config` accepts it (no key check, F4); the failure is a **run** that is created and then ends with `credential_missing` at Send [obs srv/service.mjs:3083-3086]. How that error is presented in the thread: **[not traced]**.
- **Frequency**: happens whenever the catalogue lists providers the user never configured (likely every first switch) **[inf]**.
- **Reversibility / danger**: reversible; cost is a failed turn and a misleading "Set default" success.
- **Mismatch**: **CL** — configuration state (credential) is not projected into the execution-plane choice; the user must hold "which providers did I set up in Settings?" in memory. **SL** — "Set default" succeeds for something that cannot run.
- **Candidate direction**: list only usable models (or disable/annotate with the reason and a link to that connection). Owner fact exists: `credentialStatus` per connection on `/provider-connections` and `/provider-config` (`credentialStatus`), the picker already fetches connections (`web/model-picker.mjs:34`) and already filters the custom-ID connection select by it (`:241-243`).

### SET-06 First use of a new provider: add key, then use it
- **Surface & trigger**: card "Add provider"/"Open Models settings" → Settings › Models; or picker custom-ID path.
- **Path**: Settings › Models → row Configure (or "Add provider" details `web/settings-view.mjs:880`) → Provider select → API key input (placed before Model, `:934`) → **Save key** (own submit, `:912-914,1500-1530`) → Model select → Save.
- **Traps observed**: (a) On the catalogue path the key typed into the field is **not part of the connection save**: the primary button "Save and ask once" PUTs only provider-config (`:1461-1475`) and then clears the field `key.value = ""` (`:1482`); the key is sent with the save only for a *new compatible endpoint* (`:1400-1415`). **[inf]** a user who types key + picks model + clicks the primary button loses the key silently, then "Ask" fails `credential_missing` (`srv/service.mjs:2247`). (b) Conversely, pressing Save key after touching any other field is refused: "Save this connection before adding its key." (`:1505-1512`, `dirty` flag). The form order (Provider → Key → Model → Save) suggests one pass; the code requires save-then-key or key-then-nothing-else.
- **Effect scope**: `PUT /provider-credential {connectionId, apiKey}` (per connection) [obs `:1519-1524`]; then Save selects the model globally (SET-03).
- **Frequency**: rare per provider (once), but it is the entry to the frequent SET-02.
- **Reversibility / danger**: key stored on device; key not shown again. Low.
- **Mismatch**: **CL** (the first-run path traverses provider → connection → key → model in one page, then a second page/dialog to actually use it); **SL** (primary button reads as saving everything).
- **Candidate direction**: make key + model one atomic "Add and use" for catalogue providers (Host already accepts key with compatible connections; catalogue key endpoint is separate). Or disable the primary button until a key exists and say why.

### SET-07 Use a model ID that is not in the list (custom ID from the picker)
- **Surface & trigger**: picker → "Use a model ID that is not listed…" `web/model-picker.mjs:195-199,248-251`.
- **Path**: chip → Change model → (dialog) → expand Change model → toggle "Use a model ID…" → Model ID + Connection select + optional effort list (free text `off, low, …`) → **Use and ask once** / **Use without asking** `:213-226`.
- **Effect scope**: one click performs three writes: `PUT /provider-connections/:id` (mutates the connection's saved model list, a configuration object) → `PUT /provider-config` (global default) → optionally `POST …/verify` (one model request) [obs `:260-264,300,319,351`]. The help states the consequence ("Saves the ID on that connection, uses it for next runs, and sends one short prompt…" `:218-221`).
- **Frequency**: rare-to-occasional. **Reversibility**: connection entry can be re-saved but there is no "remove model" affordance in the picker **[not traced elsewhere]**; global default already switched.
- **Mismatch**: **FD (inverse)** — a configuration-plane edit (extend a connection's model list, declare reasoning capability) is exposed on the execution surface, inside a modal three layers from the chip; it also writes the global default. Honest wording mitigates. **CL** — user must pick a *connection* (schema object) to type a model name.
- **Candidate direction**: keep rare path but reachable from the model row in Settings › Models; from the picker, offer "Add a model…" as a jump to that connection. Owner fact: none new.

### SET-08 Change model/effort while another chat is running
- **Surface**: chip card, picker, Settings form.
- **Path**: as SET-01/02.
- **Effect / behaviour**: Host refuses with 409 `active_run` if *any* chat has a run/compaction [obs srv/service.mjs:760,2317]. Card: disabled only if **this chat** has an active run, text "Available after this run ends." `web/model-effort.mjs:112`; if the run is elsewhere the control is enabled, the PUT fails, and the same sentence is shown `web/app.mjs:6097` — wrong locality (there is no run "here"). Picker: Set default enabled, error shown as raw host message ("provider config is frozen during a run") in the status line `web/model-picker.mjs:188`. Settings: whole form disabled by `info.activeRuns` (global) with "A run is active…" `web/settings-view.mjs:1215,1258-1259` (correct scope wording). `/effort` availability from `facts.activeRun` **[not traced whether global or per chat]** `app/runtime/commands.mjs:33`.
- **Frequency**: moderate for multi-chat users (background runs). **Reversibility**: n/a (blocked, no data loss).
- **Mismatch**: **SL** — client says "this run", freeze is global; three surfaces, three phrasings; also a Host consequence of F1 (a single global setting must be frozen globally to stay consistent).
- **Candidate direction**: say "A run in another chat is active" (owner fact: the 409 payload could name the session; **not traced** whether it does), or make the value per-run-bound so no freeze is needed for other chats (Host change).

### SET-09 Remove a saved API key
- **Surface & trigger**: Settings › Models › key row, button "Remove" `web/settings-view.mjs:915-919,1541-1560`.
- **Path**: Settings → Models → Configure the connection → Remove. **No confirmation**, immediate `DELETE /provider-credential {connectionId}` [obs `:1541-1552`]. Enabled whenever a key is saved, including for the connection currently in force [obs `:1245`], with no note that runs will then fail `credential_missing`.
- **Frequency**: rare. **Reversibility**: the key is never shown again [obs `:1252-1254`]; recovery needs the original secret. Medium danger for the in-force connection.
- **Mismatch**: **FD** — location (deep) is right for a rare action; friction is absent for a not-recoverable action on the active connection. (Design docs say low-risk resets need no confirm, `:1963-1964`; a key removal is not that class **[inf]**.)
- **Candidate direction**: state the consequence when the connection is in force; consider an undo window or explicit confirm. Owner fact: none.

### SET-10 Retire / delete a connection
- **Surface**: none. Host has `DELETE /provider-connections/:id` (refuses if selected, 409 `connection_in_use`) [obs srv/index.mjs:258, srv/service.mjs:2194-2200]; the client never calls it (only `DELETE` in web is credential and session) [obs grep web/*.mjs].
- **Mismatch**: gap rather than topology mismatch; noted because the Host error text for a recovery path says "remove the compatible connection" (`srv/service.mjs:1956`) while the UI has no such action. **Mismatch**: none/SL (advice points to a non-existent control). Severity low.
- **Candidate direction**: row-level "Remove connection" in Settings › Models; needs no backend change.

### SET-11 Choose the agent (profile) for this chat
- **Surface & trigger**: composer "Agent" chip `web/agent-chooser-view.mjs:32-36`; visible only for an ordinary chat with a session, and on Home as intent `:333-338`.
- **Path**: (1) click chip; (2) arrow/click an option → commit `:222-226` → one CAS `PUT /runtime-control` `operation:"profile", scope:{type:"session",id}` [obs web/agent-choice.mjs:145-149 `liveAgentChoiceAdapter.select`]. The popover pairs the list with the full reading of the highlighted option (runtime, model owner, Kits, scope, when) `:70-100`.
- **Depth; scan**: 2; flat list; secondary facts (runtime, Kit, scope) are in the right pane only for disambiguation; the Agent chip label shows the effective agent (`:307-315`). Also says outright "Works in: this chat…", "Selecting applies to runs started after it in this chat" `:92-97`.
- **Effect scope**: **this chat**, next runs; running run keeps its binding [obs `:93-97`]. Store: runtime-control `profileSelections[{scope:{type:session,id}}]` [obs web/agent-choice.mjs:38-40]. Frozen by any active run (`srv/service.mjs:596`, F3) — text: "A run is active. The selection cannot change until it ends" `:95`; client `activeRuns` there is the runtime snapshot's count [obs web/agent-choice.mjs:33]. **[not traced]** whether it is global or per-session.
- **Frequency**: moderate–high (role per task). **Reversibility**: reversible, no change to running run.
- **Mismatch**: none — this is the pattern UX-11 asks for (≤1 disclosure, flat, real scope stated, per-chat fact with an owner field). Also the model line inside honestly says the agent "has no model of its own" `:80`.
- **Candidate direction**: none; use as the reference shape for model selection.

### SET-12 Edit an agent profile's source
- **Surface & trigger**: Agent chooser → "Edit ⟨profile⟩ source in Settings" `web/agent-chooser-view.mjs:193-201`; or Settings › Developer › Composition → profile row (K5 editor) `web/runtime-view.mjs:1251-1255,2886-2903`.
- **Path**: (1) chip; (2) highlight the profile; (3) click "Edit … in Settings" (only for the profile *this chat selected for itself*; otherwise the label is "View") → `openSettings("developer")` + `openResource(id,{edit:true})` [obs web/app.mjs:7886-7889] → (4) edit JSON textarea (`web/profile-editor-view.mjs:60-80`) → (5) Preview → (6) Save source. Eligibility: `editEligibility` requires the profile to be selected at *session* scope for this chat, non-builtin, not the Attention (global) session [obs web/profile-editor.mjs:60-69]. So to edit a profile you must first select it for the chat.
- **Depth; scan; context switch; memory burden**: page switch away from the chat; JSON source editing; the preview reads Kit/compat/permission facts. Draft persists across navigation [obs web/app.mjs:7903-7906 comment].
- **Effect scope**: the resource's **own** scope, not the chat: "Saves the source for this chat only" if session-scope, else "Saves the user/workspace-scope source… Other chats that select this profile use the saved text in their next runs" `web/profile-editor-view.mjs:31-35,166` [obs]. Endpoint `PUT /runtime-control?sessionId` `operation:"put"` [obs web/profile-editor.mjs:44-56]. Whole-config CAS revision; frozen during any run.
- **Frequency**: rare (authoring). **Reversibility**: revert-to-saved before save; after save no history/undo **[not traced]**.
- **Mismatch**: **SL** (entry is from a per-chat chooser, effect can be workspace/user-wide; mitigated by the scope sentence at Save) and **CL** (edit rights coupled to "selected in this chat"; to edit profile B you must first make it this chat's agent). Otherwise FD-appropriate (rare → deep).
- **Candidate direction**: an object-level "Edit" on the profile row in a profile list that does not depend on selecting it; keep the scope sentence. Owner fact: `editEligibility` is display gating only ("the Host's preview and save remain the authority", `web/profile-editor.mjs:58-59`) so relaxation is client-side.

### SET-13 Create a new agent profile
- **Surface & trigger**: Settings › Developer › Composition › collapsed `<details>` "Package Runtime configuration" `web/runtime-view.mjs:1713-1750`.
- **Path**: account menu → Settings → Developer → scroll to Composition → expand → Configuration name, Profile ID (`local:profile-xxxx` prefilled), Version, tick resources (all *exposed* resources pre-ticked, `:1717`) → **Save profile** → then select it in the "Selected profile" `<select>` above (`:1776-1790`) or in the composer chip. Note text: "Saving does not activate it" `:1725,1747`.
- **Effect scope**: `PUT /runtime-control operation:"put" resource{kind:"agent_profile",…}` at the *active scope tab* (User/Workspace/Session) [obs `:1745`].
- **Frequency**: rare. **Reversibility**: new resource, not applied; no delete/rename **[not traced]**.
- **Mismatch**: **CL** (a task, "make a new agent", is expressed as "package runtime configuration" over resource kinds, with a raw ID and JSON-oriented vocabulary); **SL** (saved into whichever scope tab happens to be active, see SET-14). FD acceptable.
- **Candidate direction**: name it as the task ("New agent") in the Agent surface; scope as an explicit choice with default. No backend fact needed.

### SET-14 Set/inherit the agent profile at User/Workspace/Session scope in Settings
- **Surface & trigger**: Settings › Developer › Composition "Profile" `<select>` with "Inherit the wider layer" `web/runtime-view.mjs:1776-1790`; scope tabs above in "Chat runtime" `:624-690`.
- **Path**: Settings → Developer → (scope tab) → select.
- **Effect scope**: depends on the tab. Default tab is the **narrowest scope** for the current entry: `activeScope()` = chosen `scopeType` or `scopes.at(-1)` [obs `:321-326`]; entering from Home (no chat) yields user scope, entering from a chat yields session scope [obs comment `:1541-1544`; `load()` resets `scopeType=null` on session change `:2940-2960`]. Same page, same control, different write target by entry route; the tab selection is shared by Overview, Plugins, Permissions (single `scopeType`) [obs]. The composer chip (SET-11) always writes *session*.
- **Frequency**: rare (defaults). **Reversibility**: reversible ("Inherit").
- **Mismatch**: **SL** — same object, two homes; the Settings one has an entry-dependent default scope; the labels ("Profile", "Composition", "Chosen in the session layer") are storage vocabulary.
- **Candidate direction**: in Settings say "Default agent for new chats" (user scope) and "Agent for this chat" as two named rows instead of a scope tab; owner facts already present: `profileSelections` by scope.

### SET-15 See / manage runtimes (Pi etc.)
- **Surface & trigger**: Settings › Agents › Runtimes list → row detail `web/runtime-inventory-view.mjs:103-137,166-232`; chooser line "Runs on Pi (adapter id), the Host's runtime for this chat" `web/agent-chooser-view.mjs:78`; Developer › Chat runtime "Adapter" `web/runtime-view.mjs:1589`; Models › "Saved model and host details" "Runtime adapter" `:2767-2790`; General › Data › Host details.
- **Path**: Settings → Agents → row → Details (3 steps).
- **Effect scope**: read-only, Host-scoped; "Live status: Not checked" [obs web/runtime-inventory-view.mjs:195-197]. Runtime choice per chat has a Host endpoint, no client control (F7).
- **Frequency**: rare (diagnostic). **Reversibility**: n/a.
- **Mismatch**: none for topology (read-only, rare, deep). Findings: (a) the same runtime fact appears in four places (list, Developer, Models details, General Host details) — schema-mirroring **CL**-lite; (b) the "Agents" group contains no agents (only runtimes; the comment admits "Only Runtimes is here so far", `web/settings-view.mjs:1740-1742`), agent profiles live under Developer › Composition (SET-13/14). Severity low.
- **Candidate direction**: put profiles under the Agents group; keep Runtimes as a read-only sub-block. Owner fact needed only if runtime choice becomes a user action (needs client for `/sessions/:id/executor-choice`, revision expectation already on the Send path `srv/service.mjs:2773-2775`).

### SET-16 Register and load a local extension (plugin)
- **Surface & trigger**: Settings › Developer › "Host Extensions" › "Add local Plugin" `web/local-extension-view.mjs:10-12`.
- **Path**: Settings → Developer → Add local Plugin → type absolute folder path → **Inspect folder** → read manifest/files → tick "I trust this package to run in this host process." → **Register Plugin** → then per row **Load** (separate) `web/app.mjs:2419-2434`; toast: "Plugin registered without loading. Use Load when ready." `web/app.mjs:7949-7952`. Inspect/Register are disabled when this chat has a run (`disabled: () => Boolean(currentRun())`, `web/app.mjs:7949`); Host refuses for any run (`srv/service.mjs:2438,2454`).
- **Effect scope**: Host-wide, user scope, in-process code [obs `web/local-extension-view.mjs:21,33`]. Resources it provides are then inspected/exposed in group **Plugins** (per-scope), whose only path back to Load/Unload is a link "Host extension management → Developer" `web/runtime-view.mjs:2477-2481`.
- **Frequency**: rare. **Reversibility**: "Invalidate" exists; no uninstall ("Package updates and removal are not supported yet", `:2478`). Danger is high (unsandboxed code) and friction is proportionate (path typed, manifest shown, trust checkbox, separate Load) — good.
- **Mismatch**: none for FD (deep and slow is right). **CL** (mild): lifecycle (Developer) vs exposure/resources (Plugins/Tools/Skills) are split by schema layer, so one plugin's story spans three groups. Client-side run gate is per-chat vs global Host gate (same as SET-08).
- **Candidate direction**: one Plugin object page with lifecycle + provided resources. Owner facts present (`extension.status`, `resource.parent`).

### SET-17 Kits
- **Surface**: no Kit management surface exists. Kits appear only as (a) `kits: [{descriptor:{id,version}}]` inside a profile's source JSON, (b) a "Kits" line in the Agent chooser reading with "(compatibility with Pi not checked)" `web/agent-chooser-view.mjs:81-88`, (c) preview result rows in the profile editor `web/profile-editor-view.mjs:~205-230`, (d) `projectProfileSource` `web/agent-choice.mjs:113-125`. Adding a Kit = editing JSON (SET-12).
- **Mismatch**: none (not a working-surface control). Note: nothing on the working surface says a Kit is missing/incompatible except the Send gate reason text `web/agent-choice.mjs:~185-195` [obs]. **[not traced]** whether there is any Kit picker planned. Severity: n/a.

### SET-18 Change theme / palette / custom skin
- **Surface & trigger**: account menu → "Preferences" (`web/app.mjs:5930`) → Settings › Preferences.
- **Path**: (1) avatar; (2) Preferences; Theme/Text size/Reduced motion segmented are top-level rows; Palette is inside collapsed "Advanced" `web/settings-view.mjs:2755-2772`; custom skin = paste a token block into a textarea, validated (forbidden `url(`, `@`, `\`…, contrast warnings not blocking) `web/skin-policy.js:40-57,web/settings-view.mjs:1765-1785,2598-2626`.
- **Effect scope**: this device only; `localStorage cw:prefs`, never sent to Host; each row shows "Default / Changed on this device" [obs web/settings-view.mjs:1839-1893, 1879-1885]. No Host field.
- **Frequency**: rare (set-and-forget). **Reversibility**: per-row reset, "Remove" for custom skin, no confirm (documented low risk).
- **Mismatch**: none. Scope words are accurate and the control sits at a proportionate depth. (Note: no quick theme toggle on a working surface; **[inf]** acceptable given frequency.)
- **Candidate direction**: none.

### SET-19 Find where a setting lives (Settings IA and search)
- **Surface & trigger**: Settings page nav (13 groups) + "Search settings…" that filters rows of the current page [obs web/index.html:391-411, web/settings-view.mjs:1732-1750; search cross-group behaviour **[not traced]**].
- **Observations** (task → home): "use a different model" → Models (form of the connection registry, not a picker); "make an agent" → Developer › Composition (not Agents); "add a tool/MCP" → Tools & Integrations; "add a skill/instruction" → Skills; "register a plugin" → Developer › Host Extensions, "inspect/expose a plugin" → Plugins; "who can write files" → Permissions (policy editor per scope) plus General › New chats and per-chat controls; "runtime adapter" → 4 places (SET-15). "Profile" is a Settings group for the person (identity) while Developer › Composition also has a control labelled "Profile" (agent profile) `web/settings-view.mjs:1736 vs web/runtime-view.mjs:1776-1790` [obs].
- **Mismatch**: **CL** — groups follow resource kinds/scope/connection schema (F5); the same user task (use an agent, use a model) needs different groups than the nouns suggest. Naming collisions: Agent / Agent profile / Profile / Composition / Runtime configuration / Role (design docs).
- **Candidate direction**: name groups by task ("Models", "Agents" holding profiles + runtimes, "Tools & plugins" incl. lifecycle), reserve Developer for diagnostics; use scope as a secondary filter not a first-class tab. No backend fact needed.

### SET-20 Comparator: File access default vs this chat
- **Surfaces**: Settings › General › New chats "File access" (default for new chats) `web/settings-view.mjs:2882-2897`; composer connection card & Settings › General › This chat (per chat) `:466-483,1620-1640`; Home composer select `web/index.html:328-333`.
- **Effect scope**: default → client `home.get/set` (stored per device, **[not traced]**), this chat → `PUT /sessions/:id/permission-mode` (`session.permissionMode`, `srv/store.mjs:459`); copy distinguishes them ("Used when a chat is created. Existing chats keep their file access." `:2893`).
- **Mismatch**: none. This is the two-fact pattern that model/effort lacks (F8).

---

## 2. Answers to the specific questions

1. **Are "default model/effort for future chats" and "model/effort for this session/next turn" distinct facts?** No. One store field (`providerConfig` + `providerConfigVersion`), one endpoint (`PUT /api/v5/provider-config`), no session-level field; runs freeze a copy at creation (F1, F2). The client surfaces in the composer (chip, card, picker) all write that one global; their copy varies between "Set default", "All chats · future runs" (honest) and a bare `model · effort` chip (ambiguous). `/status` calls the global value "this chat's".
2. **Steps to switch to a model of another provider**: composer path 5 actions across popover → modal → collapsed details, plus effort re-pick because effort is cleared on every model change (SET-02); Settings path 6–7 actions with a page change and a Save that also becomes the global default (SET-03); first-time provider adds a separate key step with two traps (SET-06); models of unconfigured providers are selectable and fail only at Send (SET-05).
3. **Do Settings sections mirror the storage schema?** Partly yes: Models = connection registry form (provider/key/model/API format/Base URL/context window/effort declaration); Tools/Skills/Plugins/Agent-profile block = `resources[]` by `kind`; scope tabs = scope enum; Runtime info repeated in four places; "Agents" holds runtimes only. Preferences/Account/General file access are task-shaped (F5, SET-19).

## 3. Summary table

| ID | Action | Mismatch | Severity |
|---|---|---|---|
| SET-01 | Change reasoning effort (composer card / `/effort`) | SL (minor) | Low |
| SET-02 | Switch to a model from another provider (composer picker) | CL, SL | High |
| SET-03 | Change model in Settings › Models (Configure → Save) | SL, CL | Medium |
| SET-04 | Know what the next turn will use / is it per chat | SL | High |
| SET-05 | Choose a model whose provider has no key | CL, SL | Medium |
| SET-06 | First use of a new provider (key then model) | CL, SL | Medium |
| SET-07 | Use a model ID not in the list (custom ID in picker) | FD (inverse), CL | Low–Medium |
| SET-08 | Change model/effort while another chat runs | SL | Medium |
| SET-09 | Remove a saved API key | FD | Low–Medium |
| SET-10 | Delete a connection | none (gap; SL in Host advice) | Low |
| SET-11 | Choose the agent for this chat (chip) | none (reference pattern) | — |
| SET-12 | Edit an agent profile's source | SL, CL | Medium |
| SET-13 | Create an agent profile | CL, SL | Low |
| SET-14 | Set/inherit agent profile by scope in Settings | SL | Medium |
| SET-15 | See runtimes / adapter | none (CL-lite: repeated in 4 places) | Low |
| SET-16 | Register and load a local plugin | none FD (CL mild) | Low |
| SET-17 | Kits | none (no surface; JSON only) | — |
| SET-18 | Theme / palette / custom skin | none | — |
| SET-19 | Find where a setting lives (IA, naming) | CL | Medium |
| SET-20 | File access default vs this chat (comparator) | none | — |
