# VS-00 baseline observations

Astra author audit · 2026-09-11 · product `590739f` integrated in `57eaa6b`. Actual in-app browser, 1440×1000, light, English. These are observations from screenshots and operated controls, not independent acceptance or usability-study results. Screenshots live in [baseline](baseline). Screenshot numbers identify the visited state; only 01 uses the rejected initial seed.

[fixture.mjs](fixture.mjs) boots an isolated real HTTP/Pi loopback/Core stack. Local synthetic data only, no personal store or paid provider. The first fixture mistakenly called nonexistent `write_artifact`; the corrected seed uses registered `ws_write` and produces a content-version file. Screenshot 01 is retained as a seed-error record and is excluded from before/after comparisons. Screenshots 02–11 use the corrected seed. Literal fixture command and SIMULATED response are intentionally visible test data, not product-copy defects.

| ID | Observed surface / evidence | Finding and next disposition | Owner / nearest precedent |
|---|---|---|---|
| VS-A01 | Home, 02 | In progress contains completed, waiting and no-run conversations. Today totals are current retained-work facts, not today's activity. Rename from data meaning; keep current status on each row. | work-summary-api / home-view |
| VS-A02 | Home, 02; Attention, 08–09 | Home's queue uses the same Attention title/glyph as the assistant, while the actual destination already says Attention items. Align the queue title and reserve assistant identity. | attention-agent / work-core attention / home modules |
| VS-A03 | Chat, 03 | Run summary/Workspace/Runtime use bounded disclosure and stable return paths. Reuse this structure; consume archived Chat-action work before new controls. | summary-disclosure, ui-controls |
| VS-A04 | Inspector, 04 | Eleven technical fields per model request expand by default, pushing Activity beyond the first viewport. Use request duration comparison plus optional exact fields; preserve all measurements and absence labels. | request-telemetry / telemetry-view |
| VS-A05 | Inspector, 04 | File hash is equally prominent as the file. Move exact version identity into reachable detail; retain current versus recorded target distinction. | inspector / markdown-source |
| VS-A06 | Settings General, 05 | Data has implementation commentary and low-frequency host metadata at default depth. Keep file-access scopes explicit; move host details under a named disclosure. | settingsRow / General |
| VS-A07 | Settings Models, 06 | In force repeats configuration and host internals; BE-12 appears in product help. Distinguish saved/default/bound facts with concise labels and technical details. | provider/runtime owner / createModelPicker |
| VS-A08 | Settings Tools, 07 | Six-step missing-feature essay fills most first viewport; raw null text appears before tools. Show actual resources first, group setup limitations and diagnose the null. Preserve exposure versus policy distinction. | runtime-view / resource lifecycle and policy |
| VS-A09 | Attention assistant, 08 | Conversation management starts expanded even in empty state, competing with the primary composer. Use existing disclosure grammar for low-frequency management. | attention-conversation / attention-agent-view |
| VS-A10 | Spark, 10 | Description explains Core maintenance internals rather than the user's freshness question. Rewrite from actual recorded source revision and stale/current facts. No new inference or reconstruction capability. | Spark BE41 DTO / spark-view |
| VS-A11 | Usage, 11 | Large seven-column grid lacks visible weekday/date orientation; exact model table and threshold/method paragraphs dominate. Keep existing accounting projection, add orientation and reduce default technical density. Preserve incomplete marks, UTC, snapshot drilldown and cache overlap. | usage-projection / usage-details / data-visualization |

Coverage so far: Home, completed Chat + file, Inspector, Settings General/Models/Tools, Attention empty assistant and populated queue/detail, Spark current overview, Usage overview. Additional settings, Work/Review, expanded requests/events, narrow/dark/keyboard, Pages and failure states remain to be visited. This table does not claim exhaustive VS-00 completion. DOM metric attempt on Usage overcounted children of closed details; it is excluded pending ancestor-aware visibility checks.


## Final disposition · product f99af46

The preceding table preserves the actual baseline observations. Final author judgement is local candidate completion, within the limitations in [delivery](README.md); it is not an exhaustive native/browser or independent visual acceptance claim.

| Finding | Implemented disposition | Evidence |
|---|---|---|
| VS-A01/02 | COMPRESS / clarify retained work and queue identity; reserve Attention/Spark text identities | [Home/Settings](../../engineering/execution/2026-09-11-semantic-polish/home-settings.md), final Home/Attention captures |
| VS-A03 | KEEP summary disclosure; ADAPT archived Chat actions with exact record identity and strict production capability admission | [Chat](../../engineering/execution/2026-09-11-semantic-polish/chat-actions.md), [non-author closure](chat-settings-independent-review.md) |
| VS-A04/05 | VISUALIZE host durations; DISCLOSE exact requests, trace and file version | [Inspector/Usage](../../engineering/execution/2026-09-11-semantic-polish/inspector-usage.md), [non-author closure](inspector-usage-independent-review.md) |
| VS-A06/07/08 | DISCLOSE Host/setup metadata; COMPRESS model and resource facts while keeping policy, scope and binding visible; guard null children | [Home/Settings](../../engineering/execution/2026-09-11-semantic-polish/home-settings.md), narrow Settings sweep and captures |
| VS-A09/10 | DISCLOSE Conversations; COMPRESS Spark explanation to existing source/freshness facts | Attention/Spark author browser checks; combined tests |
| VS-A11 | VISUALIZE Monday-first usage calendar/model comparison; DISCLOSE exact tables and method | Same-observation baseline 12 versus candidate Usage v2; snapshot/unknown/UTC tests and non-author fixes |

Further findings discovered during implementation—invalid observation/model membership, stale Chat identity/admission, Home null glyph and narrow scroll clipping—are recorded in the independent reviews and final delivery. No baseline evidence was overwritten.
