# Local integration and preservation receipt

2026-09-21. Product merge `2c23272011f56ed1afc8f857c8f5b6bd832a57d6`; review/next-assignment main `c5de23cf2cfbfb0e90f1bf2b523283f38d0620ed`. Actual integrated four product modules match reviewed `17f57c0`; affected suite output is 40/40. No push or deployment.

The released answer-footer tree was archived after review services stopped. Inventory includes all 38,105 entries and 976,676,175 file bytes, ignored/untracked bytes, modes and symlink targets. File extraction was compared with the inventory, and the source was compared again immediately before removal. No unconsumed source commits remained. The branch/tree were removed only after these checks; the archive ref remains.

Local archive root: `Projects/.archives/courtwork-dogfood-ready-20260920` (relative to the operator's home).

- `courtwork-answer-footer-20260921/files.tar.gz`: SHA-256 `ac6fa126694748b3028ef090df0a2c505ba3b5b5603ce6f5cfd17de9f29ffd49`.
- `courtwork-answer-footer-20260921/files.json`: SHA-256 `0e3c31fda6c691e87f01dc9479a1c549ace99b2b8a20daab1893e088701f6163`.
- `answer-footer-increment.bundle`: SHA-256 `91fdd6a7ec2a9225ff922bc8e41162ad780023f02b8c15ba8d6b2723e026e3ff`; prerequisite `a3503fb2530a384d3a756de7cb0ccc246f97d3e0`, available in the existing restore repository. Verified bundle, fetched into the physical restore repository, checked both main/archive refs and ran connectivity fsck successfully. This incremental bundle is not advertised as standalone.

Persistent Courtwork and the frozen shared Git database remain. The active `courtwork-pi-runtime-port-20260921` tree remains with its writer; no cleanup of its work. User services 8787/8899 remain running with their original processes; independent 8951/8952 services and tab stopped. No credentials or paid service used. The [working-location assignment](../composer-entry-review-20260921/README.md) is ready for the next frontend writer, not started by Codex.
