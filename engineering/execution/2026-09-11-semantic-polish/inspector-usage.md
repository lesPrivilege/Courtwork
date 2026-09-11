# VS-02 / VS-03 · Inspector and Usage candidate

Astra author · based on product `590739f`, registry `272a2f1`. This implements findings VS-A04/05/11 in [the baseline audit](../../../evidence/semantic-polish-20260911/audit.md); visual checks are author observations, not independent acceptance.

## Reuse and changed grammar

| Consumer | Closest implemented precedent | Disposition / changed relationship |
|---|---|---|
| Inspector request measurements | `telemetry-view.requestMeasurements`, request-telemetry contract; existing native details in Inspector | Reuse measurement selection and owner facts. Adapt per-request property lists into collapsed exact details with a comparative host-duration graphic. Each request starts at its own zero; no global waterfall, provider TTFT, TPS, capacity or cache partition is invented. |
| Inspector files and usage | `inspector.renderRun`, content-version target and cache fields | Recorded/current targets unchanged; full hash moves into Version details. Input/output/model turns become a three-column definition list; independent cache counts remain in a disclosure. Partial/unknown values retain their labels. |
| Tool activity / diagnostic events | `thread-projection.projectThread` / `toolStateWord` and Inspector's event detail list | Reuse exact tool grouping and lifecycle words for an ordered tool list. Raw diagnostic records remain under Event trace. No dependency tree is inferred from event order. |
| Usage calendar | `home-view` Monday-first column-wise calendar; `usage-projection` quantiles | Adapt the same orientation and keyboard directions, add weekday/date labels and bounded horizontal scroll. 44px cells on narrow screens. Existing quantile thresholds and exact values remain accessible. |
| Usage hierarchy | `modelSeries`, existing Overview/Models tabs and snapshot drilldown; local data-viz header/content/footer precedent | Reuse model grouping/top-four+Other membership; interval rank bars accompany the calendar. Daily/model tables and accounting definitions use native disclosure. Scope, incomplete usage, interval and UTC remain visible. |
| Narrow surface header | existing fixed `--band-top` and 44px touch tab | Fix pre-existing padding reducing the tab list to 23px while its child was 44px. Zero block padding now leaves a measured 47px list and tab in the 48px header. |

The semantic registry does not own these measurements. App Runtime/Core remain unchanged. New chart fill exceptions are exact selectors in `lint-colors`; they classify measured marks, not surface backgrounds. Existing neutral timing and usage series roles are retained.

## Author checks

- Registry 8/8; request-telemetry 5/5; Inspector/presentation 5/5; Usage 7/7 including real synthetic HTTP snapshot rejection. Initial Inspector integration test caught misuse of `projectThread`'s return shape; fixed to `.rows` before browser use. Original failures remain in tool history.
- Colour, interaction and material lint pass; contrast report retained with the evidence. No new provider or backend schema.
- In-app CUA at 1440 light and 390 light; Inspector 1280 dark with a request expanded. Screenshots under [candidate](../../../evidence/semantic-polish-20260911/candidate). These are intermediate candidates, not accepted baselines.
- Actual Usage ArrowRight advances one week; End reaches the last day; Enter reads the two matching runs from the same observation; Escape closes and returns focus to Activity.
- Actual Inspector expanded request remains open after Refresh. Version/current file target distinction is covered by direct render tests. Narrow header clipping reproduced (23px list/44px tab), fixed and measured (47px/47px).

Restarting the synthetic host cancelled the seed's pending run and settled additional partial accounting (5→7 reported tokens). The original screenshots retain that earlier lifecycle state. [baseline-proxy.mjs](../../../evidence/semantic-polish-20260911/baseline-proxy.mjs) serves exact `590739f` static source against the same current synthetic read-only API, avoiding a second host/data writer; screenshot `12-usage-same-observation-1440.jpg` is the matched numeric baseline. Its POST restriction intentionally prevents mutations; it is not a production deployment or full runtime baseline.

Remaining for combined acceptance: non-author fixed source review; complete state/multi-model/long-path/browser matrix, forced-colors and 200% reflow, plus end-to-end final visual comparison after the remaining slices. No completion of BE-42, native/IME/VoiceOver or overall product gates is claimed here.
