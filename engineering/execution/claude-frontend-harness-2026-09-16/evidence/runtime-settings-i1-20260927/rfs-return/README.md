# 06c production I1 · RFS-R1 / RFS-R2 return · author evidence — 2026-09-27

Author: Claude (Opus 5.5), original owner. Same branch `claude/runtime-settings-i1-20260927`; the fix is `6acad62`, on top of the reviewed `36f8357`. The input is the [parent review](../../runtime-settings-i1-review-20260927/README.md) on main `7b29ee7`. This is author evidence, not acceptance.

## RFS-R1 · malformed inventory

**Cause.** `inventoryOf` checked only `schemaVersion` and that `items` was an array. A row such as `null` was kept as the ready reading.

That caused three failures:
- The view threw while rendering the row, leaving "Reading again…" on screen.
- The bad reading replaced the last good one.
- Every later Refresh re-rendered that reading in its loading step before calling `read()`. It threw there first, so no request was sent.

**Correction** (`app/web/runtime-inventory.mjs`, `readInventory`). Every field the view reads is checked before a reading is kept.

Top level:
- `defaultAdapterId`: non-empty string;
- `items`: an array with unique ids.

Each row:
- `adapterId`: non-empty string;
- `configured`: boolean;
- `configurationOwner`: `"host"`;
- `liveStatus`: `"not_checked"`, because the page always says "Not checked" and must not say that over another value;
- `revision` and `configurationRef`: string or null;
- `capabilities`: null, or operations `{ supported: boolean, reason?: string|null }`;
- `availability`: `status` of `configured` or `unavailable`, plus a string-or-null `reasonCode` and `reason`.

Outcomes:
- **Malformed.** A supported version with contents the page can't read is a failed read: "This Host's runtime report could not be read." The last good reading, the page and the focus are kept.
- **Missing or old version.** Still "This Host did not report its execution runtimes."
- **Unknown but well-shaped values.** Adapter ids, operation names and reason codes remain data. Nothing is repaired or inferred.

## RFS-R2 · detail reading scale

`.runtime-inventory-reading` is set on the Status and Declared-operations lists, and `.runtime-inventory-reading-text` on the "Not reported" line. Their values and reasons take `--text-reading` with line-height 1.6, following the `.attention-reason` precedent, and the list aligns to the first baseline.

Unchanged:
- labels (`dt`) and Technical detail stay on the `.data-list` metadata role;
- global `.data-list`;
- controls, padding, wrapping and scrolling.

Measured (`browser/record.json`, `geometry`):

| State | Values / reasons | Labels, technical ids | Refresh / Back |
| --- | --- | --- | --- |
| 1280 light, Pi, technical open | 15px / 24px | 11.5px / 17.25px | 28 / 28 |
| 1280 dark, Agents API (not-reported line) | 15px / 24px | 11.5px / 17.25px | 28 / 28 |
| 390 dark, Pi, technical open (DPR 2, mobile emulation) | 15px / 24px | 11.5px / 17.25px | 44 / 44 |

At 1280 and 390, with the technical disclosure open, page scroll width equals the viewport and nothing is wider than the panel. The long operation reasons and the 64-hex fingerprint wrap.

## Before / after

| Check | `36f8357` (reviewed) | `6acad62` |
| --- | --- | --- |
| `tests/runtime-inventory-settings.test.mjs` with the new cases: the 17 malformed shapes the parent listed and more, from a detail, plus a malformed first reading | [13 pass / **18 fail**](before/controller-36f8357.log) | 31/31 |
| Browser: a detail, then Refresh answered 200 with `items:[null]` | [times out: no failed read ever shown](before/browser-36f8357.log) | `error` with "…could not be read. The values below are the last reading that succeeded.", Pi detail kept, focus on Refresh, **0** page exceptions ([screenshot](browser/refresh-malformed-1440-light.png)) |
| Browser: the next Refresh, request allowed | not reached | Reached the Host (inventory requests counted), `ready`, Pi detail and focus kept, 0 page exceptions |
| Detail values at 1280 / 390 | 11.5px (parent measured) | 15px, labels and technical 11.5px |

The "before" column ran the same new test file and browser script against `git archive 36f8357`. The test file's two message constants were inlined there, because that source has no `UNREADABLE` export.

## Checks on `6acad62`

- Targeted, [`targeted-tests.log`](targeted-tests.log): **124/124**. It covers the new controller/view cases, the browser run, Settings preferences, navigation and plugins, product icons, runtime-intake retry, the accepted synthetic `runtime-management`, and the backend `runtime-inventory`.
- Browser, [`browser/record.json`](browser/record.json): every step of the first delivery passes again. That covers the list before any Session, keyboard detail and Back, the transport failure and retry, 390 dark and light, and Escape and return. Page exceptions 0; Sessions 0 → 0; `runtime-state.json` unchanged.
- Screenshots: `detail-1280-light`, `detail-1280-dark`, `unavailable-1280-dark`, `pi-390-dark`, `pi-390-light`, `refresh-malformed-1440-light`, and the first delivery's set, regenerated.
- Lints, [`lints.log`](lints.log): eight tools, all exit 0.

Reused from the first delivery, not repeated:
- the full suite, 1738/1738 at `a6e07f8`;
- smoke.

The delta touches only the two I1 modules, one scoped CSS block and their tests and harness. Parent's RFS-D1/D2 decisions are applied as ruled; the double `runtime-info` read is unchanged.

Still unexecuted:
- native 200% zoom and text-spacing overrides;
- forced colours;
- screen reader;
- a browser-configured managed runtime;
- a long unknown runtime id.
