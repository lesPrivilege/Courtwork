# Astra delta observations — 2026-09-20

Candidate: `213ef4d55073996cb25cd717dc2905e775d6f560`; delta from `3413978`. The review checkout is detached; the author tree has only its dependency symlink untracked. Main remains `72c91a2`. No author source, personal data, provider or browser session was changed by this review.

The supplied `chat-burst-single-run-1440-light.png` visibly contains one Execution summary naming 26 successful tool actions, a failed ws_read, a Recorded version artifact row, and a separate pending write approval. Astra inspected that image, not a new live run. The manifest and author report attribute this to a 28-call run and record scrollTop 0 across reload. This supports the bounded rendered composition; it does not prove a ≥100-call single run or deep-scroll restoration.

Source inspection also finds that `goHome()` still assigns `state.home.filter = null` (app/web/app.mjs:6443), despite the new report claiming continuity is kept. Both new capture scripts import named `tmpdir` from node:os but evaluate `os.tmpdir()` in their default scratch path. Their committed default startup is therefore broken; environmental override can hide this. Fixing the default does not invalidate already-observed PNG content, but the portable script must not be represented as byte-identical to the originally executed version without supporting evidence.

The accompanying reviewed-source.json pins current inspected bytes only. Historical capture attribution remains the author's attestation: the first 19 images at the working tree committed as 3413978, later cells at its dirty successor committed as 213ef4d, with portable script edits afterward. No review-time hash is retroactive proof of capture-time bytes.
