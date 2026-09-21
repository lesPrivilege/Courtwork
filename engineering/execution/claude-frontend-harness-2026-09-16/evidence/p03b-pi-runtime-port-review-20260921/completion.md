# P03-B integration and preservation completion

2026-09-21. Product merge `e2eaf6df30ba0541a8b43254c062335a9c8ff0ce`; accepted source `c2be5945b2a8eecd3e5213c0a345b7b1d00e2943`. Review/architecture main `85bd27a1517b6e98fae4f2314a3c1c9601efff77`. Integrated product files match the reviewed candidate, and actual-main runtime smoke exits 0. No user Host restart, push or deployment.

The released source tree is removed after all verification processes finished and no process had its cwd in that tree. Preservation includes 38,090 entries / 976,668,151 file bytes, ignored/untracked content, modes and symlink targets. Physical extraction matches its inventory; the source was rechecked before removal. All source commits are integrated; archive refs remain.

Archive location: `Projects/.archives/courtwork-dogfood-ready-20260920` relative to the operator's home.

- `courtwork-pi-runtime-port-20260921/files.tar.gz`: SHA-256 `fa11de27d1d69dfe2280d7ab6ee6ad8844e5b876067e4086befebfc51feaea87`.
- `courtwork-pi-runtime-port-20260921/files.json`: SHA-256 `9aaa2882321451d53fb11a0fe619a4a510193b1f8ebfefe0a185c0c5f9d257cb`.
- `p03b-increment.bundle`: SHA-256 `07ab2749873b5d925d17f62abf11f7b488cfdd0332b7924c2ab2e035f076abd8`. Required commits reported by bundle verification: `172118a0f8228ff0dca8be6341186911a3afe39f` and `c5de23cf2cfbfb0e90f1bf2b523283f38d0620ed`, both available in the existing physical restore repository. Bundle fetch restored both current-main and archive refs; connectivity fsck passed. This incremental bundle is not standalone.

Only the ended Pi port tree and branch were removed. Persistent Courtwork and Courtwork-legacy-frozen, whose `.git` is the shared database, are retained. The final inventory found a newly registered `courtwork-work-location-20260921` tree on `claude-work-location-20260921`, based at `3bf1e0b`; it is treated as the claimed Composer writer and preserved. This appeared during cleanup and is not an ended tree. Its author must consume the latest integrated main at delivery; no duplicate frontend writer or next runtime/core slice is started here. User services 8787/8899 remain available on the original processes.
