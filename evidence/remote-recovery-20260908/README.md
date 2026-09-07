# Remote recovery acceptance · 2026-09-08

A fresh shallow clone of origin `codex/fresh-courtwork` resolved to `9f13ca35e3cdada0ad5d2067a74d9c107c2e44c8`, tree `b744e545801f55759d1a27057274bf26c9f5c108`, exactly matching source archive `c0c4d811044b08d1982ebd6ad23d50658a05e300`. Dependencies were installed in the new clone; no legacy checkout or old runtime data was needed.

- Install: 277 packages; audit reported zero vulnerabilities.
- Backend: 134/134 passed.
- Local runtime smoke: material read → write → artifact → close/reopen → continuation → revision → historical bytes passed.
- Real provider: not run. This is candidate recoverability, not final product acceptance or main takeover.

The following commit adds receipts and the 10-file, source-fingerprinted Claude preparation kit. It changes no product files. See receipt.json and the exact command outputs beside this file. Legacy main stayed at `f9ade85b72e5abcdc64c3a6c43ed3a13a2292476`.
