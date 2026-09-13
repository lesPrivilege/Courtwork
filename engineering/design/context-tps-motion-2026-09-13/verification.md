# Candidate verification

2026-09-13 · Astra author checks; base `93a8ac49f0a887bff430550441cddfa836690adf`, candidate source fixed by the enclosing commit. Luna's [bounded source audit](card-audit.md) is separate, with no independent browser claim. No production acceptance or replacement of a golden image.

## Browser evidence

The actual in-app browser loaded the repository's HTTP study at port 8852. All values are fixed synthetic inputs. At 1280×900 and 1440×1000 desktop, and 390×844 narrow, the containing conversation, composer and second-level cards were inspected. Light/dark were shown; final important states have the following candidate images:

- [06 light activity](evidence/06-light-activity.png), [07 dark throughput](evidence/07-dark-throughput.png), [08 current fields](evidence/08-current-fields.png).
- [09 narrow fallback](evidence/09-narrow-fallback.png), [10 narrow failed](evidence/10-narrow-failed.png), [11 expanded context](evidence/11-context-expanded.png).

`01-runtime-before.png` is a real synthetic-host inspector baseline at port 8847, not the same page with changed pixels. `02`/`03` are superseded placement iterations; `05` predates the equal 44px targets. `04` is the user's layout reference. None is a pixel-diff acceptance baseline.

| Check | Observed result |
|---|---|
| Narrow layout | 390px viewport and 390px document scroll width; ring/Send both 44×44 at x=38/308, equal vertical coordinates. Thinking and TPS summary centers both y=436.125 in final failure scene. No horizontal overflow. |
| Cards | Single-card mutual exclusion, outside dismissal, keyboard instant opening, Escape close + focus returned to its summary. Narrow TPS card x≈19.62…329.62, within viewport. Expanded context at 1440: x=400…720, height≈446, body text 10.5px. |
| Sample interaction | Request 1 selection reads 31.4, retains its new button focus and the open card. An earlier outside-click bug closed the card after chart DOM replacement; fixed by checking the event's composed path and retested. |
| Missing projection | Current mode: unfilled ring, estimate in second level, rate Unavailable, ambient word rotation observed (`Working`, `Putting it together`), CSS `ambient-breathe` active. No numeric waveform generated. |
| Reduced motion | Study control gives `Working`, `animation-name:none`, Unavailable rate and unknown ring. System media listener and stylesheet are present; OS preference change was not separately exercised. |
| Failure / unknown | Failed last request has a dash and a missing sample, earlier measured synthetic requests remain selectable. Fallback false; Failed label. No measurement scenario gives Connection unknown / Unavailable / fallback false. |
| Replay | Fixed eight-sample sequence reaches Completed, value 42.8, status “Completed · final sample frozen”. Source cancels pending timers on pause / mode / scenario / hidden / exit; final completion observed in browser. |
| Material | Solid `--float`, no new filter. Final shared shadow computed as rgba(28,32,36,0.08) 0 12px 30px in light. Radius/typography/focus corrections follow Luna's advice. |
| Console | One retained historical Unknown static icon error at 08:52:20Z was fixed during early iteration by using the shipped icon name. Subsequent reload/interaction log had no newer error. |

The initial full-page capture protocol produced an oversized canvas at the narrow viewport; final images use viewport screenshots and actual DOM geometry. Screenshots intentionally show the portion scrolled into view by interaction.

## Scope and checks

Fixture invariants exercise absent current-field capacity/TPS, distinct request/resource scopes, synthetic composition total, failed sample and missing observation handling. See [fixtures.test.mjs](fixtures.test.mjs). Full app tests are unnecessary for this isolated study: no product source, runtime or service changed.

Required static checks and exact results are in [checks.txt](evidence/checks.txt); color/material/interaction tools inspect their registered product scope, not every literal in this candidate. They are not evidence of complete study accessibility.

Not independently exercised: native desktop host, screen reader, actual 200% browser zoom, OS forced-colors/reduced-transparency, blur-unsupported environment, arbitrary long localized labels, real provider token timing, reload recovery of a real Run. Solid material has no blur capability dependency, but the forced-colors CSS still needs a native visual pass before product acceptance. No new paid or personal-data operation.

## Luna findings disposition

Astra retained solid material and adopted container radius/float shadow/16px padding, caption/meta roles, pill role for circular controls and 2px focus offset. WAAPI existed before the audit; the corrected audit distinguishes it from production anchored lifecycle reuse. This study controller has keyboard/Escape/outside and interruption handling; production integration should reuse the app's owner-backed anchored surface lifecycle. The source audit does not promote the candidate to canonical.
