# CourtWork Fresh · motion / hover / surface behavior index

**核对日：** 2026-09-08（Asia/Singapore）  
**任务：** GUI review/runtime index 的局部机制与来源对账；只读。  
**固定实现入口：** `/Users/lesprivilege/Projects/Courtwork-fresh`，分支
`codex/fresh-courtwork`，`HEAD f8aff61be8ef7ed5e3a3d2b7a1fbb631197383fd`。

> Astra复核注：本卷检查的是fresh固定HEAD，不是最新整合候选；现状以current.md证据卷的固定整合SHA补齐。迁移中的d44fb28是历史祖先，不是比f8aff61更新的候选。WK15的140ms位于品牌材质/动词上下文，不据此认定普通120/180ms控件违反契约；保留现有token，只有实际片段需要时才校准。普通run事实指示点与已撤销的品牌在场符号分开，不能仅凭WK51把普通状态点判成违规或设置等待批准的门。下文两项“待owner裁定”是调查者疑问，不是本轮新增阻断。

This report binds observations to the checkout above. The worktree has unrelated
engineering edits/untracked files; no product file was changed and no browser,
test, provider, or credential path was run/read for this pass. The migration index
describes a later candidate (`engineering/migration/2026-09-08/evidence-index.md:18,38`,
`d44fb28`); that is not the source SHA used below. `engineering/current.md:3` is
the current-status summary, while the checked-out commit remains the fixed input.

## Provenance and authority

| Source | Fixed coordinate | What it establishes | Disposition |
|---|---|---|---|
| Current vanilla-MJS implementation | `app/web/styles.css`, `app/web/app.mjs`, `app/web/ui-controls.mjs`, `app/web/user-message.mjs`, `app/web/settings-view.mjs` at `f8aff61`; SHA-256 respectively `5a9b7c0b…`, `08d818c8…`, `d71f6002…`, `f15f404d…`, `540ce9f0…` | Actual DOM/CSS/event behavior below | Current local source of truth |
| Polish history | `891aa13c57443e6458f2b12bc1a5fa329887d8cd` → `e6bab95b26d53c3aa3f2da640ea456b4e24ddf70` → `f8e3c19c05b0fcd8b52c02140db855699e1fd898` → `4fab4bd861d27cb42958047a63dc394b07ec6283` → `dd65d2bec49768e8e7b594e3d2e79f5c6018e957` | Token/state layer; message actions/card/settings rows; timestamp with footer actions; segmented thumb/working clock/ledger shimmer; full-width permission row. Delivery record: `engineering/migration/2026-09-08/ui-design-polish-delivery.md:13-18,33-51` | Historical provenance; its recorded Chromium results are claims, not rerun here |
| WSK GUI review/runtime index | `engineering/mvp/execution/work-surface-kit/inputs/courtwork_se_gui_review_runtime_index_2026-09-08.md`, SHA-256 `814ab9b0878f8ffeed851c7b9bd2a782c0aad3a7e1c32bf7618f595d30872d48` | BoardUI and assistant-ui are P0 references; BoardUI reuse/reverse, assistant-ui thread mechanics above CourtWork semantics (`:271-371`); motion/a11y validation comes after semantic convergence (`:1477-1479`) | Index/reference only; not a dependency or product contract |
| Surface hierarchy / Radix | `engineering/design/surface-hierarchy.md:46-60,80-82`; Radix source fixed at `1faff10ac26ae17f09944d418c6949b93fc6b566`, `packages/radix-ui-themes/src/styles/tokens/shadow.css` | Hover, pressed, focus-visible, selected, disabled and loading are distinct; hover must not move layout; tooltip is not sole information; no spring library is implied | SE rule and source pin for shadows, not installed CSS |
| Upstream behavior references | assistant-ui [architecture](https://www.assistant-ui.com/docs/runtimes/concepts/architecture) and [package boundaries](https://github.com/assistant-ui/assistant-ui/blob/main/AGENTS.md#package-boundaries--public-surface), recorded in `engineering/research/frontend-intake-2026-09-08/evidence/upstream.md:12-40`; [Base UI React quick-start](https://base-ui.com/react/overview/quick-start) and local Emil heuristic `/Users/lesprivilege/.codex/skills/emil-design-eng/SKILL.md` | Headless/runtime layering, React boundary, origin-aware popover/press/transition heuristics | Behavior reference only; no React migration, no Base UI/Motion install. BoardUI source/MCP was not independently inspected; treat its index entry as unverified source-level input |

The migration index says the candidate payload includes `dd65d2b` and later
integration. The concrete checkout still wins for source coordinates. The
historical chain is useful for explaining why a rule exists, not for asserting
that an unpinned screenshot or private execution directory is reproducible.

## Mechanism map (current source)

| Fragment | Current mechanism and coordinates | Boundary / review consequence |
|---|---|---|
| Message actions: hover, focus, touch | `user-message.mjs:3-43` emits an immutable user article, timestamp, Copy and Edit actions. `styles.css:2321-2342` keeps `.user-message-actions` and assistant header icon actions at `opacity:0`; `:hover` or `:focus-within` sets `1`; `@media (hover:none)` keeps them visible. | Opacity does not reflow the message. Focus is independent of hover and touch has a visible path. Real IME, screen reader, physical touch and 200% zoom remain unverified. |
| Pressed feedback | `styles.css:214-250,420-484,644-658,2033-2047` uses hover/pressed surfaces and a pressed inset shadow for primary controls. There is no explicit JS pointerdown state and no scale transform. | Satisfies a low-motion surface cue. Emil's optional `.97` press heuristic is not adopted; do not report a spring/scale mechanism that is absent. |
| Tooltips | `ui-controls.mjs:210-321`: pointerover waits 400 ms, pointerout closes after 120 ms, `focus-visible` opens immediately, touch pointerover is ignored, capture-phase pointerdown and Escape hide. `ui-controls.mjs:239-243` suppresses a tooltip when a label is not truncated. | Tooltip is supplemental; required permission, error cause and next action must remain in visible text or a real popover. |
| Connection/context popover | `index.html:112-135,409-420` uses a real button and native `popover`. `app.mjs:3788-3827,3839-3867,4378-4399` renders, positions and toggles it; `ui-controls.mjs:192-208` uses Floating UI `fixed` positioning, 8 px offset, `flip()` and `shift({padding:8})`. Connection close/Escape returns focus to its opener (`app.mjs:3800-3803,4177-4183`); context Escape focuses the run control (`:4186-4191`). | Positioning and focus behavior are source-grounded. `styles.css:2245-2266` gives a 4 px upward entrance; there is no origin-aware transform variable or explicit leave state. Test top/bottom/edge placements and interruption if this is extended. |
| Segmented permission control | `settings-view.mjs:17-52` uses native radios and disables the fieldset while async `onChange` settles. `styles.css:2377-2453` moves a single thumb using `translate` (`calc(100% + 2px)`, `calc(200% + 4px)`), preserves focus-visible outline, and `:2490-2507` makes the settings version full-width. | Native keyboard/form semantics are retained. Current transition is `--duration:180ms` (`styles.css:84-86`); it differs from WK-15's generic 140 ms action reference and needs owner confirmation before any retune. |
| Work-surface tabs | `index.html:300-360` declares `tablist`, `tab`, and `tabpanel`. `app.mjs:2836-2860` keeps selected tab `tabIndex=0` and hides unselected panels; `:4413-4432` implements Arrow/Home/End and focuses the chosen tab. `styles.css:1047-1070` distinguishes hover and selected underline. | Selected state survives pointer movement and is not only hover. No evidence here of a tab animation; preserve the existing immediate state change unless a bounded need is demonstrated. |
| Streaming/new output and reading position | `app.mjs:361-383` treats within 48 px of bottom as follow-latest and shows the jump control otherwise; `:575-580` jumps to latest. `:2086-2110` snapshots focus/selection before rerender; `:2576-2590` restores bottom-following or clamps prior `scrollTop`; `:4545-4549` records scroll intent. | This directly supports “new output does not steal scroll” and focus/selection continuity. It is stateful anchoring, not a visual scroll animation. |
| Run status | `inspector.mjs:1-10` labels Starting, Running, Waiting for you, Stopping, Completed, Cancelled, Failed and Unknown. `thread-projection.mjs:88-130` projects status/error rows; `app.mjs:2520-2534` renders the status row. `styles.css:558-577,2197-2218` maps running/waiting to accent, failed/unknown to danger, completed to muted, with a running pulse dot. `app.mjs:2631-2672` updates “Working” / “Waiting for you” / “Stopping” plus elapsed time. | Completion, waiting and failure have distinct words and color roles. WK-51 removes the brand presence mark and says status is carried by run text; the remaining run-state dot is a semantic status cue, not the brand mark, but strict text-only interpretation should be resolved by the integration owner. |

## Motion parameters and bounds

- The current tokens are `--duration-fast:120ms`, `--duration:180ms`, and
  `--ease-out:cubic-bezier(0.2,0,0,1)` (`styles.css:84-86`). The polish layer
  limits movement to color, opacity and transform (`:2154-2174`); row layout and
  message geometry do not move on hover.
- Entrances use CSS transitions plus `@starting-style` for toast, jump-latest,
  dialogs, popovers and narrow panels (`styles.css:2228-2284`). The running dot
  pulse is 1.6 s and the ledger shimmer is 1.8 s (`:2207-2218,2548-2569`).
- `styles.css:1814-1821,2313-2319,2570-2579` disables transitions/animations for
  reduced motion, pauses the pulse and makes the ledger title static. Delivery
  notes report fake-provider Chromium checks for these behaviors
  (`ui-design-polish-delivery.md:35-41`), but this task did not rerun them.
- Intake WK-15 (`intake-round-2.md:24-30`) fixes ≤24 px mono, 32–40 px
  hierarchy, glass only on hero/floating surfaces, one 640 ms hero summon, and
  140 ms non-looping product actions. The source's 120/180 ms tokens are the
  observed implementation; whether 180 ms is accepted for segmented/popover
  transitions is pending a contract decision, not a reason to add a motion lib.

## Accepted, revoked, and pending references

- **Observed and aligned with the cited rules (owner acceptance still separate):** opacity-only message utility reveal with
  `focus-within`; native controls; explicit pressed surface; anchored native
  popover with focus return; selected-vs-hover tab state; scroll anchoring; words
  and role colors for run status; reduced-motion fallback.
- **Revoked by current WSK裁定:** `WK-51` (`intake-round-2.md:180-188`) removes
  the header presence mark and all eight-verb brand playback from work UI;
  `WK-54` (`:184-188`) admits the Lucide `plug` glyph at `bca7e75` and revokes
  the earlier “reuse presence dot” direction. Do not reintroduce brand motion or
  use a presence dot as brand identity. The running status dot needs the narrow
  text-vs-cue clarification above.
- **Pending/reference only:** BoardUI source/MCP was not inspected in this
  bounded pass; assistant-ui's layered runtime docs do not provide Matter,
  authorization, persistence or commit semantics. Base UI is React-only in the
  checked official entry. Motion JavaScript is an optional complex-motion
  reference; current simple hover/entrance behavior is CSS/native and no spring
  library is present. None authorizes a React migration or new runtime dependency.

## Parent handoff

Use the fixed local HEAD and exact paths above for any follow-up review. Treat
historical delivery claims as bounded fake-provider evidence, not complete device
or accessibility acceptance. The only unresolved source-level contract surfaced
here is whether the semantic running dot is permitted under WK-51's text-led
status rule, and whether the 180 ms segmented/popover duration is retained under
WK-15's 140 ms generic action guidance. Both require owner adjudication before a
code change; this report makes no architecture or schema decision.
