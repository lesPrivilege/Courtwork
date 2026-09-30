# S2/S3 visual evidence

Later slices capture before merge with the same [harness](harness.mjs): S4 in [`capture-s4.mjs`](capture-s4.mjs) and [`captures-s4/`](captures-s4/report.json), recorded in [s4.md](../s4.md).

2026-09-30 · Claude (Opus), after a review noted that S2 and S3 were merged without the captures the [rulings](../rulings.md#implementation-order) require ("desktop and 390px, light and dark, with CJK fixture names"). Author evidence: it shows what renders and records the fixes it caused. It is not visual or accessibility acceptance.

## How it was made

[`capture.mjs`](capture.mjs) starts a disposable Host in-process with a temporary data dir. It seeds through the app's own API and drives headless Chrome over CDP, following [the chat-controls capture](../../../design/chat-controls-2026-09-10/inventory/captures/capture.mjs):

- **Fixture.** Projects "租约审阅 Harborview" and "证据整理"; chats "续期条款核对 · Lease renewal" and "合同红线（待确认）"; one Local test run with a Chinese prompt. A synthetic DeepSeek key is stored on that Host only, so the chooser has usable rows. No model call is made.
- **In force.** DeepSeek V4 Flash, chosen through the chooser before the captures.
- **Files.** One batch: `lease-summary.md`, which saves; `Harborview 续期条款.md`, refused before sending; `evidence-export.txt` at 1.1 MB, refused before sending.
- **Viewports.** 1440×900 at 1×, and 390×844 at 2× as a mobile device. Light and dark come from `prefers-color-scheme`.

```bash
node engineering/research/ux-interaction-topology-20260930/evidence/capture.mjs
```

[`captures/report.json`](captures/report.json) records, for each scene, the open popover's box and each composer control's box, visible label, and whether the label is cut (the rendered text is wider than its box).

| Scene | Slice | Captures |
|---|---|---|
| Chat with the composer | S2, S3 | `chat-{1440,390}-{light,dark}.png` |
| Model & effort chooser | S2 | `s2-model-chooser-*.png` |
| Settings › Models, unlisted model ID | S2 | `s2-settings-model-id-*.png` |
| Home composer, which shares the controls row | S2 | `home-*.png` |
| File access · this chat | S3 | `s3-file-access-card-*.png` |
| Add files to this chat, after the batch | S3 | `s3-add-files-*.png` |
| Chat overview, File access row | S3 | `s3-chat-overview-*.png` |

## What the first captures showed, and dispositions

| Finding | Disposition | Landing |
|---|---|---|
| E1 · The file access card opened at the viewport's top-left, far from the chip or overview row that opened it, at every size. The popover had never been anchored: the former Connection card had the same gap, and S3 kept it. | **Adopt**. The card follows its opener (top-start, fitted), and the chip's `aria-expanded` says whether it is open. | `app.mjs`; test; captures: at 1440 the card sits above the chip at y 585 |
| E2 · The composer chip and the effort heading showed the model ID (`deepseek-v4-flash`) while the chooser's rows show the catalogue name (DeepSeek V4 Flash). | **Adopt**. Chip, effort heading and the Agent chooser's model reading use the catalogue name, and fall back to the ID only for a model the catalogue does not list. Config and catalogue share one version: the chip reads the catalogue once per config version, each chooser hands over its own read, and an older read never replaces a newer one. | `model-effort.mjs`, `model-chooser.mjs`, `app.mjs`; test with a mutation check |
| E3 · At 390 the composer controls were cut to a letter: file access read "A ⌄" at 46 px, the model "deepse…" at 90 px, the Agent chip showed only its glyph. | **Adjust ruling 128** ([S2 record](../s2.md#visual-evidence)). Below 768 px the controls wrap: the chat's context (Agent, paperclip, file access) keeps the first row, and model, Stop and Send take a second, right-aligned. An icon-only model chip was not built: `cpu` is registered single-purpose for the Settings › Models group, and IC-10 forbids a configuration glyph on a runtime choice. | `styles.css`; test; report: at 390 no label is cut except the model's last letters |
| E4 · At 390 the model label "DeepSeek V4 Flash · Provider default" is 202.4 px of text in a 202 px box, so it ends "Provider defa…". The second row is exactly full (236 + 8 + 44 + 8 + 44 = 340). | **Accept**. This is ordinary overflow on a full row. The name is whole, and the accessible name and chooser carry the effort. | — |
| E5 · Chinese file names are refused before sending ("Use a filename with letters, numbers, dots, underscores or hyphens."), in the paperclip popover, the Files form and Home drafts. The Host's material name contract is `[A-Za-z0-9._-]+` (`app/server/service.mjs`), and the client mirrors it. | **Defer** to the Host materials owner ([rulings, Deferred](../rulings.md#deferred)). Renaming or transliterating on the client would invent a second name for the same file. | — |
| E6 · Chat overview said "1 model turns". | **Adopt** (plural). | `workspace-view.mjs` |
| E7 · Behind popover titles, the translucent material shows what lies beneath. In dark mode a bright message bubble leaves a glow behind "This chat". | **Defer** to the material owner ([visual-spatial grammar](../../../design/visual-spatial-grammar.md)); it is not a topology or icon question. | — |
| E8 · At 390 the chat header truncates the project to "租约…", and a gap separates it from "· 续期条款核对 · Lea…". | **Defer** to S6 (header rename, HDR). | S6 |
| E9 · CJK names in the rail, header, project line, chooser and outcome list align with Latin text on the same baseline. The Settings section title is sticky and covers the rows above the model-ID entry, as designed. | No change | — |

## Review

A Sonnet non-author review of the fixes (uncommitted diff) found no high-severity defect.

| Finding | Disposition | Landing |
|---|---|---|
| 1 · the chip names a model on a local connection differently from its row | **Reject**: not reachable. `connectionPathOfKind` is "local" only for the `fake-openai-loopback` identity, and a row's connection is matched by `providerIdentity === model.provider`. The row's local branch is therefore the provider check `visibleModelName` already makes; its comment now says so | `model-effort.mjs` comment |
| 2 · one extra catalogue read per config version | **Accept**: bounded, one read per version, no loop | — |
| 3 · a failed catalogue read is not retried at that version | **Reject** a retry on render: the chip renders often, and a Host that is down would be polled. Opening either chooser supplies the catalogue, and the next version reads again | — |
| 4 · a catalogue older than the config can stay | **Reject**: it only gives a name to the same ID; a newer read replaces it | — |
| 5 · the Agent chooser's model line is not redrawn when the catalogue arrives | **Reject**: it is read each time that popover renders | — |
| 6 · the wrap also applies to Home under 768px | **Adopt as intended**, now captured: on Home at 390 the model and Send take the second row, right-aligned, and the model name is whole. The Home file-access select still ends "Ask before editi…" at its existing `min(150px, 37vw)` cap; its options show the whole value | `home-*.png`; report |
| 7 · tests pin source text | **Accept** in part: `visibleModelName` and the effort heading are behaviour tests; anchoring and wrapping are evidenced by the captures and the report's boxes, which the tiny DOM cannot lay out | — |

## Checks

- `npm --prefix app run check:product` → exit 0: bounded suite 1866/1866, local deterministic runtime smoke, documentation links. After it, the review's disposition changed one code comment in `model-effort.mjs`; `tests/model-effort.test.mjs` then passed 16/16.
- A mutation check on the catalogue-name lookup fails its test.
- `node tools/check-doc-links.mjs` passes.

## Not run

- Screen reader.
- Real providers.
- Zoom and text-scale.
- The Attention chooser at 390.
- Touch input: the 390 captures emulate a mobile device, but interaction ran through DOM clicks.
