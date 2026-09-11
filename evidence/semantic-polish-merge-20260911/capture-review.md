# Independent capture review

Date: 2026-09-11

This is an independent review of the 13-slot product capture set. Astra operated the in-app browser and wrote the media; Luna performed this review. The browser surface was not available to this reviewer, so this report does not claim Luna-operated screenshots. The fixture data is synthetic and uses the local compatible loopback/Pi/Core path described by the fixture evidence; no paid or external provider call is implied.

## Set-level checks

- `observations.json` contains 26 entries: exactly one light and one dark entry for each of `settings`, `models`, `integrations`, `home`, `spark`, `attention`, `matter`, `review`, `continuity`, `artifact`, `conversation`, `approval`, and `running`.
- Every entry reports `source_sha=f1373cde341b5a17299fad6ba5921ba3fcc43824`, `width=1440`, `height=900`, and `dpr=1`.
- Every referenced asset was checked with `file`: all 26 are JPEG images with 1440x900 dimensions. No missing asset or duplicate light/dark state was found.
- Each slot's light/dark entries share the same `state_id`; the only intended pair change is theme. The recorded state IDs are preserved in `observations.json`.
- I viewed every final light/dark pair with `view_image` at original resolution. Text, controls, overlays, and running/approval indicators were readable; no visual acceptance blocker was found.

## Slot findings

| Slot | Independent visual finding |
|---|---|
| settings | Appearance page is clear in both themes: Light/Dark selection, Medium text, default code font, Follow system motion, and preview are visible and coherent. |
| models | Local test is in force, Fake local model is selected, and the no-external-request statement is readable. Light/dark layout matches. |
| integrations | User scope, Configurable view, six built-in tools, and exposed/allowed controls are visible. No imported server is implied. |
| home | Project Cedar and Northside synthetic work, Attention, Activity, composer, and Your work counts are visible. Long sidebar titles truncate with ellipses without breaking hierarchy. |
| spark | Modal clearly shows source revision 3, `Pending · 1 stale / 0 current`, and `Revision 2 → 3 · 1 replaced`; the up-to-date Matter is separately shown. |
| attention | Global Attention page has project selector, filters, one Investigating item, detail/reason/next-step/actions. Both themes preserve contrast and hierarchy. |
| matter | Inbound NDA workspace shows source revision 1, pending candidate, four passing rules, recorded facts, reason field, and unused decision controls. |
| review | Purpose-limitation evidence is expanded with source locator/quote while the remaining rules and decision controls remain available. |
| continuity | Continued Project Cedar session is selected and shows the same bound Matter/candidate/source context. |
| artifact | Recorded `out/project-cedar-review.md` is shown as 184 B with outline, raw-source/find controls, and the explicit note that acceptance is not recorded there. |
| conversation | Corrected global Attention conversation shows resolved disclosure question, successful `attention_projects`, `attention_list`, and `attention_inspect`, plus the pending-human-review answer. |
| approval | Exact `out/exhibit-index.md` 47 B write is waiting for user approval; Deny/Approve controls and exact-write scope are visible and untouched. |
| running | `Source inspection • Running` is visible with prior workspace preparation, successful workspace artifact context, partial streamed inspection response, working timer, model label, and stop control. |

## Runtime/API cross-check

I independently queried the live 60985 fixture through `/api/v5/bootstrap` and the authenticated HTTP routes, without changing state. The Matter and Spark runs were `completed` with no run error or tool-result error. The work-derivation response reported the expected split: the Project Cedar Matter had `current=1, stale=0, sourceVersion=1`; the Spark Matter had `current=0, stale=1, sourceVersion=3`, with the pending candidate based on source version 2 and replacement 2→3. The corrected conversation session/run was `completed` with no run error, and its `ask_user`, `attention_projects`, `attention_list`, and `attention_inspect` tool results were all `isError=false`.

The Attention registry was reread after the corrected conversation's disclosure grant and therefore showed revision 2/status `investigating`. The Attention images are intentionally recorded at the earlier `attention-c476d0bf-revision-1-inspected` state; they must be interpreted as temporal evidence before that later disclosure revision, not relabeled as revision 2.

Approval provenance in the capture manifest records a permission event for the exact 47-byte `out/exhibit-index.md` write and leaves it `waiting_user`. Running provenance is in [running-state.json](running-state.json): `ws_list` and `ws_read` both succeeded against `out/project-cedar-review.md`, and the captured light/dark timestamps precede the recorded run completion. The report preserves that temporal distinction and does not claim a contemporaneous API read at each screenshot shutter.

## Ruling

The final 26-image set is visually coherent and complete as a capture artifact: all 13 slots have valid light/dark pairs, fixed viewport metadata, and consistent state IDs. The product states shown are legible and match the synthetic fixture scenarios. This is an independent capture review, not product acceptance, deployment authorization, or approval of any pending user action.
