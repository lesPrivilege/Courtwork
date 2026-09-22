# Tabbed Preview — final functional acceptance

2026-09-22 · Parent Astra. Accept PV-R1 source `4698d8b` and the complete 06d B delivery through packet tip `31c09e54d83e34137b9e6467d84233460ef47e4f`. Product merge: `6c0bd32aba284d097315fb969c16380efd35be11`. A1/A2 were already accepted separately; their evidence is not rerun or relabelled by this receipt.

## PV-R1 disposition

**Adopt, closed.** Active and inactive Workspace-tab closure retire its surface fetch, renderer context/request identity and tree generation using existing owners. Reopening creates fresh reads. Hiding a retained Preview is still distinct from closing its tab; no Run/candidate/draft is cancelled or discarded.

[Luna delta review](cw-pv-r1-final.md) and [log](cw-pv-r1-final.log): 50/50, exit 0. [Integrated-main suites](integrated-tests.log): 65/65, exit 0. App bytes match the reviewed tip. The only merge conflict joined independent-review/density notes and author/delivery additions to order06d; both sides were retained. Author full1389/1389 and34/34 browser campaign remain separately attributed in the original packet.

Astra reused an independently started real Host fixture on8977 and a [response-holding proxy](cw-pv-r1-final-gate.mjs) on8978. OpenAI in-app browser actions reproduced active close, and file-select → inactive Workspace close, while each real `/surface` response waited. [Network trace](cw-pv-r1-final-gate.jsonl) records both client disconnects **before release**, with `clientDestroyed:true` when released; the previous review recorded false. No private browser application state or patched page fetch was used. [Inactive-close DOM](inactive-close.dom.txt) retains the selected recorded file; [reopened Workspace](reopened.dom.txt) and [capture](reopened.jpg) show a fresh view with files.

The fixture has no contributed renderer. Late import/mount rejection remains source/generation evidence and the author's source-level regression, not a claimed independent visual execution of that branch. The tree request's generation rejection is separately covered by author page-route evidence; this proxy directly tests the surface request. Prior version/draft/reading/cross-Chat checks remain at their original source in the [first review](../tabbed-preview-review-20260922/README.md).

## Local development Host handoff

The running8787 Host retained the old static allowlist and returned404 for the new module. Before a graceful restart, all6 Runs across3 Sessions were terminal, global activeRuns was0 and no compaction was running. The same data directory/port were reopened on accepted main; [verification](host-restart-verified.json) confirms equality of all complete Session detail responses and HTTP200/module bytes matching accepted source. No credential store was inspected/exported, no provider call was initiated, and no schema migration occurred. The user browser tab was not reloaded or closed. This follows the prior idle-Host preparation-module handoff; it is not deployment or a new dogfood claim.

Density, narrow/coarse mapping and native Back/Forward remain the separately recorded Design owners; real zoom, reader/forced-colors/touch/native-shell acceptance remains open. No real Browser capability is introduced. Owned review Host/proxy/tab were stopped. [Preservation and cleanup](completion.md).

The IAB screenshot bytes are JPEG; the .jpg suffix reflects the detected format without changing image bytes.
