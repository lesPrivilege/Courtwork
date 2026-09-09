# MR-A1a · Astra integration review

2026-09-10. Main integration baseline: `a0ebcf026d20b052c5cab7b1ad8b0a5f7ad63b73`. Submitted code: `570fda858febf7d1b14b7f60c27385ff64841442`; author evidence: `7a6db4a0ba8c6a438218e12ae15e6f5551e5a6c8`. Their common ancestor with main is `ecccac2e3d51f276b4f0fe31be430ef675e2b1c9`. Integration in an isolated checkout was conflict-free; the shared checkout's pre-existing evidence edit was preserved.

## Scope and decisions

Accept only the bounded raw-text coordinate foundation: immutable copied UTF-8 bytes, original-byte hash, UTF-8/code-point/UTF-16 boundary conversions, strict decoding, preserved BOM/CRLF and a 65,536-byte limit. This Node utility does not provide grapheme, DOM, parser or Markdown display coordinates and currently has no product consumer.

Astra accepts plain `TypeError` for input-type contract violations, the four declared content/offset codes, and size-before-UTF-8 validation precedence. Unit validation precedes offset validation. Future HTTP consumers must map internal errors through their own service contract; this utility does not establish an HTTP error surface or acquire source/annotation authority.

The existing MR-A1/T1 fixed-file reader is already on main. This foundation does not replace its source identity or pagination, and is not a new claim that full Markdown review, annotations, reanchoring or Output Review are delivered. No dependency, schema, UI, provider, personal data or Pages change is part of this integration.

## Review findings and correction

Astra's non-author code review and new [boundary probes](boundary-check.mjs) found two failures in the submitted implementation:

1. An incompatible typed array with a forged `Symbol.toStringTag` passed the fallback type check and silently produced different bytes (`Uint16Array([65])` became `A` plus NUL).
2. An invalid coordinate-unit object whose string conversion fails produced an unclassified exception, rather than `invalid_coordinate_unit`.

Astra's repair `dc564bd` uses Node's internal Uint8Array type predicate (including Buffer and cross-realm support), and never coerces invalid unit values while constructing the error. [Before](before.json): 3/5 probes; [after](after.json): 5/5. Two regression tests were added. Input-copy, boundary, hash and decoder algorithms were unchanged.

## Validation and attribution

The original author's evidence remains [separate](../source-coordinates/README.md): 17/17 targeted, 378/378 full suite and the submitted UTF-8 probe. Those counts belong to the earlier author baseline.

- Astra independently read the delivered module and designed the five probes above. Re-running author tests does not make their test design independent.
- Astra’s repair and regression tests are author work. Luna independently verified the exact repaired source hash: [8/8 boundary checks](luna-independent.json), then [two real forged-tag cases against both commits](luna-spoof-comparison.json), passing 0/2 on original `570fda8` and passing 2/2 on `dc564bd`. The first eight-case report’s “spoofed and wrong” label covered ordinary wrong types only; the separate same-realm/cross-realm forged-tag comparison supplies that missing execution evidence. This bounded non-author review accepts the two integration repairs.
- Astra integration checkout: [targeted 19/19](targeted.log), [combined application suite 405/405](tests.log), [local-fake smoke passed](smoke.log), and [1,114,368-sequence UTF-8 parity](utf8-parity.log). [Summary](summary.json) binds the product and baseline SHAs.

The source-coordinate module's product consumers, parser/display mappings and actual model/UI behavior remain outside this bounded acceptance. No personal workspace was migrated, no real provider ran, and no deployment was requested or performed by this task.

## Re-run the independent forged-tag comparison

The [probe source](spoof-independent.mjs) is retained byte-for-byte from Luna. It accepts module paths or file URLs and emits the observed JSON (inspect each module’s summary; old-code failures are intentional). From the repository root, run against current source:

```sh
node evidence/markdown-review-20260910/source-coordinates-integration/spoof-independent.mjs app/runtime/source-coordinates.mjs
```

For the before/after comparison, export `app/runtime/source-coordinates.mjs` from the two frozen commits above into separate temporary `.mjs` files and pass both paths. The broader eight-case run is a one-off independent observation; the retained author regression suite and the two focused independent cases provide reproducible ongoing checks.
