# Audit rulings · interaction topology and icons in context

2026-09-30 · Claude (Opus), ruling under the user's assignment of this UX class. Inputs: four read-only Sonnet slices — [composer](audit/composer.md) (CMP/THR/HDR/HOM), [shell](audit/shell.md) (NAV/PRJ/OBJ/PRV/ATT/USG/CTX), [settings](audit/settings.md) (SET), [icons](audit/icons.md) (ICN) — and a separate [non-finder verification](audit/verification.md) of the sixteen claims that drive the larger rulings (all confirmed; five corrected in precision). Code baseline `main@87e2207`; nothing was run in a browser, so every visual ruling below carries its own capture obligation.

Rules applied: [UX-11](../../design/ux-grammar.md) and [IC-10](../../design/icon-controls.md#ic-10--review-in-context-and-optical-correction-2026-09-30), with UX-01/02/03/04 and IC-1/3/6/8 where named.

## What the audit found, generalized

1. **Defaults written from the working surface.** Model and effort are one global Host fact (V4), yet they are chosen beside per-chat controls (Agent, file access) whose scope is the chat. The honest "all chats, future runs" wording exists only inside the card, and only for effort.
2. **Configuration tree on the execution path.** Changing the model from the Composer costs five actions through a modal built for connection registration (V1); a Settings connection save silently changes every chat's model (V5).
3. **Client gates that disagree with Host authority.** The Host locks provider config and file access while *any* run is active (V3, V12); the client gates only on the open chat, so controls look available and then fail with misleading copy.
4. **One intent, two drawings.** The paperclip attaches to a message on Home but opens a modal of chat files in a chat (V15); New chat keeps or drops the project depending on which button (V8); Refresh/Retry, disclosure and Back are each drawn several ways (ICN-25).
5. **Unavailable affordances on every row.** Four unavailable message actions and three menu items appear on every answer (V16); they explain themselves on click, but they spend the densest surface on capabilities that do not exist (UX-01).
6. **Icon size and meaning drift.** `icon()`'s size argument never reaches the page and the 14px tier is dead (V10); `settings-2` means seven different things and several Settings tabs reuse glyphs of unrelated actions (ICN-24).

The Agent chooser (CMP-03, SET-11) and file access's default-vs-this-chat split (SET-20) already follow UX-11 and are the precedents for the fixes below.

## Rulings

`A` adopt · `J` adjust · `R` reject · `D` defer (owner and trigger in the next section). Slice numbers refer to the implementation order below.

### Model and effort

| Findings | Ruling | Reason | Slice |
|---|---|---|---|
| CMP-06, SET-02, V1 | **A.** One anchored popover from the Composer chip: a flat list of configured models (connection/provider shown as trailing metadata, and only as a disambiguator in the name), then the effort segments of the highlighted model from the Host's exact capability, then one scope line. Commit on pick. The composer path no longer opens the modal picker; `/model` and the Attention assistant's model entry open the same popover. Custom model IDs and connection registration live in Settings › Models only, and the modal picker is retired rather than kept as a second path | Repeated choice among configured models, ≤1 disclosure (UX-11); the Agent chooser is the precedent | S2 |
| CMP-05, SET-01, SET-04, CTX-01 | **A.** The popover's scope line reads the real scope for both model and effort ("All chats · future runs"); the chip keeps `model · effort` and gains a disclosure mark, not a gear. `/status` stops calling the global value "this chat's model" | Honest scope on the trigger's surface (UX-11); per-chat scope is deferred, not simulated | S2 |
| V2 | **A.** Changing the model keeps the saved effort when the new model's ladder contains it; otherwise it falls back to Provider default and says so | Needless loss of a repeated choice | S1 |
| SET-05, V7 | **J.** Models whose connection has no key stay listed but cannot be committed; the row says "No API key" and links to that connection in Settings, reusing the existing locate-and-return path | Selecting a model that must fail at Send is a trap; hiding it would hide the fix | S2 |
| CMP-05, SET-08, V3 | **J.** Until the Host exposes a global busy fact, the client handles 409 `active_run` with correct copy ("Another chat is running; available when it ends") and a link to the running chat, in the popover and in Settings. A proactive gate waits for that fact (deferred) | The client must not claim a scope it cannot see; the lock itself is a Host rule | S1 |
| SET-03, V5 | **A.** Saving a connection and making it the default become separate actions; editing a URL or key never changes the in-force model | Configuration plane must not write the execution choice as a side effect | S6 |
| SET-06, V6 | **A.** Correctness: the primary save on a catalogue provider stores the typed key (or does not clear it), and "Save key" is not blocked by unrelated dirty fields | Data loss on first use | S1 |
| SET-09 | **A.** Removing a key that the in-force connection uses asks for confirmation and names the consequence | Global, disruptive, rare: friction belongs here (UX-11) | S6 |

### The chat's working context

| Findings | Ruling | Reason | Slice |
|---|---|---|---|
| CMP-07 | **A.** The Composer file-access control holds only this chat's file access; the Host-wide model block leaves that card (it lives in the model popover) | A chat-scoped control must not open on a global one (UX-11) | S3 |
| HDR-04 | **A.** The Chat overview's file-access row opens the same chat control, not the layered policy editor in Settings › Permissions | Row names a chat fact, destination must be that fact | S3 |
| PRV-04, CMP-12, V15, ICN-24 (paperclip) | **A.** In a chat, adding material is one popover with the Home picker's multi-file input; the popover says where the files go ("This chat's files"), distinct from Home's message attachment. The modal remains the list/manage view, reached from Chat overview | Frequent, local; same glyph must not hide two scopes. Multi-file uploads as repeated single-file calls if the Host accepts one file per request | S3 |
| CMP-14, V11 | **A.** While a run is active, a visible line beside Stop says the draft is kept and cannot be sent until the run ends; the dead `.composer-run-hint` CSS is removed or wired | Silent no-op on Enter (UX-04) | S1 |
| CMP-10 | **R.** Work location after the first run stays in Chat overview | Rare action; one extra step is proportionate (UX-11) | — |
| THR-06, V12 | **D** (Host) | Widening access mid-run needs run-bound authority | — |

### Navigation and chat objects

| Findings | Ruling | Reason | Slice |
|---|---|---|---|
| PRJ-01, PRJ-03, HOM-02, V8 | **A.** Every generic New chat derives its project from the open chat (or keeps the one already chosen on Home) | Semantic locality; the per-project "+" already does this | S1 |
| NAV-03, V9 | **A.** Returning to a chat restores its preview open state along with its tabs | The tabs are per chat; closing them on each switch contradicts that | S1 |
| HDR-01, OBJ-01 | **A.** The chat title in the header is the rename affordance (existing rename route); the row menu keeps Rename | The object's own header is where it is named (UX-11 locality) | S6 |
| THR-05 | **J.** A failed or cancelled run offers "Edit and resend" inline, placing the prompt in the Composer with the existing Use-as-draft logic, without the modal | Re-run is frequent after failure; no new Host capability | S6 |
| CMP-15 | **A.** Correctness: commands the catalogue marks available and read-only run during an active run; Enter on a highlighted menu row picks without also submitting (verify first) | Documented availability contradicted by the submit guard | S1 |
| CMP-16 | **A.** The context popover offers the existing Compact action | Readout without its action (UX-02) | S6 |
| NAV-02, NAV-05 | **D** (shell) | Rail collapse and global shortcuts belong to the shell navigation pass | — |
| OBJ-03, OBJ-04, PRJ-05, SET-10 | **D** (Host) | No archive, pin, move or project edit routes exist; the frontend cannot draw them | — |
| Stale comments and dead markup (shell obs. 5, HOM-03) | **A.** Remove `session-dialog` markup if unreachable after checking, and correct the stale comments at `index.html:111-113` and `app.mjs:1527-1529` | Code must not describe behaviour it lacks | S5 |

### Attention and project-scoped tools

| Findings | Ruling | Reason | Slice |
|---|---|---|---|
| ATT-01, ATT-05 | **A.** The rail Attention entry carries a count, and a chat row waiting on the person carries a mark, both from the same owner facts Home already reads; no unread state is invented | Ambient signal for the one thing that needs the person (UX-10) | S4 |
| ATT-02, V13 | **A.** The rail Attention entry opens the item queue, as the Home block already does; the assistant is one action inside the queue | The frequent task is handling items; the assistant is secondary | S4 |
| ATT-04, OBJ-06 | **J.** Project-scoped tools (Attention, Usage, Spark, Home block) default to the working project — the open chat's, else Home's — with "All projects" as an explicit choice | One rule for "which project" instead of three defaults | S4 |
| ATT-06 | **D** (Spark) | Spark's entry is a product-definition question | — |
| USG-01…04, NAV-06, PRV-06 | **R** | Low frequency; current depth is proportionate | — |

### Settings information architecture

| Findings | Ruling | Reason | Slice |
|---|---|---|---|
| SET-19 (name collisions) | **A.** "Profile" names only the person's account; agent profiles are called Agent profiles; the "Agents" group label matches what it holds | Two meanings for one word | S6 |
| SET-19 (schema-shaped groups), SET-12, SET-13, SET-14, SET-15 | **D** (Settings) | Regrouping by user task is a whole-Settings pass | — |
| Settings F6 (specimen-only modules) | **D** (UX lane) | Confirm whether `agent-profiles*.mjs` and `runtime-management*.mjs` are live before removing them | — |
| SET-07, SET-16, SET-17, SET-18, SET-20 | **R** / no change | Proportionate or already correct | — |

### Icons

| Findings | Ruling | Reason | Slice |
|---|---|---|---|
| ICN-10, ICN-11, ICN-23, V10 | **A.** One size source: the size passed to `icon()` is the rendered size, and roles map to the visual/spatial tiers (micro 14, compact and rows 16, Settings and sidebar navigation 16). 18 stays only where a before/after capture records it as an optical exception. The dead 14px rules are removed or made real; the test asserts computed size | Size must be decided in one place (IC-10 Set) | S5 |
| ICN-24, ICN-15, ICN-16 | **A.** `settings-2` only opens Settings or a configuration surface; the model chip uses a disclosure mark. Account is not `house`, the person's profile is not `square-pen`, Sign out is not `external-link`, and the account menu has one settings entry. Replacements come from the Lucide subset | One glyph, one meaning within a set (IC-10) | S5 |
| ICN-25 | **A.** Retry loading keeps visible text (IC-1); custom disclosures use one chevron mechanism, and a surface does not mix it with native `<details>` markers; copy success changes glyph and label, not colour only | Existing IC-1 requirement; one intent, one drawing | S5 |
| THR-03, ICN-13, V16 | **A.** Unavailable message actions and menu items are not drawn on production rows until an owner capability exists; the reason table stays for when they return | UX-01; EX-IC2 registers missing backends without drawing them | S5 |
| ICN-20, ICN-21, ICN-22 | **A.** Captures with CJK, Latin and mixed names verify icon-to-title alignment (IC-10 Component); two-line rows align the glyph to the title line; `flowRow` uses the blank spacer when a tool has no glyph | Alignment is judged on rendered text | S5 |
| ICN-02, ICN-04, ICN-07 | **A.** Measure the hand-drawn runtime-* bbox band (IC-8); remove zero-use glyphs from the shipping allowlist; regenerate the glyph manifest and correct stale comments | Unmet IC-8 obligation and drift | S5 |
| ICN-26, ICN-17 | **A.** The navigation toggle's name follows its action; preview tabs drop the duplicate native `title` (IC-3) | IC-1, IC-3 | S5 |
| ICN-05 | **J.** Tab activity, run activity and the context ring are status indicators, not glyphs: IC-6 geometry does not apply, IC-1 "status not by shape or colour alone" does | Clarifies scope of IC-6 | — |
| ICN-30, ICN-31 | **D** (capture) | Per-row and heading glyphs are decided surface by surface on captures in S5 | S5 |

## Implementation order

The UX lane holder (original Claude) implements unless the user reassigns; each slice records the affected rule IDs, nearest precedent and verification in the existing change template, and is reviewed by a non-author. Visual slices capture desktop and 390px, light and dark, with CJK fixture names.

| Slice | Content | Kind |
|---|---|---|
| S1 | Key loss (V6), 409 copy and link (V3/V12), effort kept on model change (V2), New chat project (V8), preview restore (V9), read-only slash during a run (CMP-15), visible run hint (V11) | Correctness, small |
| S2 | Model and effort popover; modal picker retired from the composer path; unkeyed models; scope wording including `/status` | Topology |
| S3 | Chat file-access control split; overview row target; chat paperclip popover | Topology |
| S4 | Attention count and waiting marks; rail opens the queue; working-project default | Topology |
| S5 | Icon size source and tiers; glyph meanings; Retry text; disclosure; unavailable actions removed; alignment captures; manifest and allowlist hygiene; stale comments | Icons, hygiene |
| S6 | Header rename; Edit and resend; Compact from the context popover; separate connection save from default; Remove-key confirmation; Settings name collisions | Topology, small |

## Deferred

| Question | Owner | Trigger |
|---|---|---|
| Chat- or session-scoped model/effort | Host provider-config owner ([composer-pr](../models-provider-registration-2026-09-14/composer-pr.md#2026-09-30--deferred-chat-scoped-model-and-effort)) | A Host contract for that fact |
| Why provider config and file access lock while *any* run is active, given runs freeze a copy at creation; and a global busy fact for proactive gating | Astra (Host) | S1 implementation, or the next Host service revision touching `#busy()` |
| Widening file access from an approval card for the rest of a run | Astra, RD-009 run-bound authority | Run-bound authority contract |
| Archive, pin, move chat; project rename/delete; delete connection UI | Host session/project and connection owners | A product need for list or connection management |
| Rail collapse and global keyboard shortcuts | [Shell control plane](../../design/shell-control-plane-2026-09-12/README.md) | The native Back/Forward placement pass |
| Settings regrouped by user task; agent-profile selection homes; runtime choice UI | Settings resource management; 06c | The next Settings pass; 06c's runtime-management API |
| Spark entry | Spark product owner | Next Spark definition change |
| Specimen-only modules | UX lane | Before S6 |
