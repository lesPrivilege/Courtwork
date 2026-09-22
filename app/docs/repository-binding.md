# Session repository binding and private candidate tools

This Host slice lets one Session explicitly bind one external directory for a
Run's read-only repository tools and, separately, create one Host-owned
writable Git candidate from an explicit commit. The managed Session workspace
remains the Pi working directory and artifact/journal location. Binding an
external directory does not change project ownership, the managed workspace
or the existing `ws_*` tool root.

## API and persistence

These routes use the existing authenticated `/api/v5` Host API:

| Method and path | Request / response |
|---|---|
| `GET /sessions/:sessionId/repository-binding` | `{schemaVersion:1,binding,revision}` |
| `PUT /sessions/:sessionId/repository-binding` | Bind with exactly `{operation:"bind",requestId,expectedRevision,rootPath}` or revoke with exactly `{operation:"revoke",requestId,expectedRevision}`. Success returns `{receipt,binding,idempotent}`. |
| `GET /sessions/:sessionId/repository-candidate` | `{schemaVersion:1,candidate,revision}`; public summary omits Host filesystem paths. |
| `PUT /sessions/:sessionId/repository-candidate` | Create with `{operation:"create",requestId,expectedRevision,expectedBindingRevision,candidateId,baseCommit}` where `candidateId` is UUID v4; revoke with `{operation:"revoke",requestId,expectedRevision,expectedBindingRevision,candidateId}`. Success returns `{receipt,candidate,idempotent}`. |
| `GET /sessions/:sessionId/repository-candidate/diff` | The same bounded Host patch `repo_diff` builds for the model, minus per-file policy exclusion (the folder is the human's own, so the model's `admitPath` policy does not apply to this read); `{schemaVersion:1,candidateId,baseCommit,writeRevision,files,patch,patchBytes,patchSha256,truncated}`, 409 `no_repository_candidate` without an active candidate, 413 `candidate_diff_too_large` over the aggregate patch limit. |
| `GET /sessions/:sessionId/repository-candidate/effects` | Lists the Session's `repo_write` history for the human, newest first, as `{schemaVersion:1,candidateId,effects:[{id,runId,candidateId,path,status,bytes,contentSha256,expectedSha256,writeRevision,createdAt,settledAt}]}`; never includes `contentRef` or any Host path. |

`rootPath` is an absolute Host path accepted by the local service. Binding
canonicalizes it and stores a stable binding ID, root path, POSIX device and
inode identity, revision and status in the Session. The expected revision
starts at zero and advances on bind and revoke. A duplicate `requestId` with
the same payload returns its original receipt; a different payload using that
ID is rejected. Stale revisions and binding changes during an active Run are
rejected. A source bind/rebind is also rejected with
`repository_candidate_active` while a private candidate still belongs to the
current binding; revoke the candidate first, or revoke the source binding
(which also revokes its candidate), before connecting a new source. A
historical Session migrates to an empty binding without changing
its managed workspace or old Run records. RuntimeStore schema 19 (the binding
arrived in 16, the private candidate in 17) is separate
from Core user schema 4 and bridge app schema 5; the schema 15 exact-byte
backup and old-Host refusal boundary are covered by
[`repository-binding.test.mjs`](../tests/repository-binding.test.mjs).

At Run admission the Host freezes the active binding identity and revision in
`repositoryBindingSnapshot` and records a `repository.bound` event. Revocation
advances the Session revision, immediately makes subsequent repository calls
fail, records its event, and requests cancellation of active Runs using that
binding. A read is recorded as a `repository.read` event with Run attribution,
binding ID/revision, relative paths, byte counts and SHA-256 hashes; source text
and absolute host paths are not put in those events. Already disclosed text
cannot be withdrawn from a model's history.

The control plane exposes the `repo_*` descriptors only for a Session with an
active binding. `repo_list`, `repo_read` and `repo_grep` receive relative paths
only and always read the bound source checkout. The source remains read-only
when a candidate exists. The API still accepts a Host path directly; the
`host/choose-directory` and `repositories/*` routes below help the Connect UI
fill that path in, but binding itself stays the explicit `PUT` described above.
Runtime policy resource matching for `repo_*` and `candidate_*` path actions
ignores letter case, so a Host volume's case aliases cannot bypass a
path-specific deny or ask rule. On a case-sensitive volume this can make a
rule more restrictive for a
differently cased path.

Aggregate reads (`repo_grep`, `candidate_grep`, `repo_diff`) apply the same
per-path policy to every file they would otherwise disclose, not just to their
own call-site argument. For each candidate file, the Host takes the strictest
of the aggregate tool's own effect and the corresponding single-file read
tool's effect (`repo_read` for `repo_grep`; `candidate_read` for
`candidate_grep` and `repo_diff`) on that exact relative path, so a read-only
deny or ask rule on one file also removes it from search and diff results. A
denied or ask-gated file is filtered out before the model sees anything -
excluded from the search worker's input, from the diff's per-file patches and
file list, and from the recorded provenance sources - and never generates a
permission question of its own. The result JSON instead carries
`excludedByPolicy` and `excludedPendingApproval` counts so the model knows its
view was partial without learning which paths were withheld; request an
excluded file directly with `repo_read` or `candidate_read` to trigger its own
approval.

## Host helpers for the Connect UI

Three more authenticated `/api/v5` routes help the Connect UI fill in a
`rootPath` without granting anything themselves; binding remains the explicit
`PUT /sessions/:sessionId/repository-binding` above.

| Method and path | Request / response |
|---|---|
| `POST /host/choose-directory` | Body `{}` or `{prompt}` (≤120 chars, sanitized). Success `{rootPath}`; a dismissed dialog `{cancelled:true}`. |
| `GET /repositories/recent` | `{schemaVersion:1,entries:[{rootPath,lastConnectedAt,available,sessions,git}]}`, most recent first, deduped by exact `rootPath`, at most 12. |
| `GET /repositories/inspect?rootPath=` | `{rootPath,available,git}` for one path, computed live. |

`choose-directory` opens the Host's native folder dialog: on Darwin it spawns
`/usr/bin/osascript` with `shell:false`, a fixed AppleScript literal (the
prompt has quotes, backslashes and control characters stripped before
interpolation) and a minimal environment (`PATH`, `HOME`, `LANG` only -- no
provider credential ever reaches this child). Off Darwin it responds 501
`directory_picker_unavailable` rather than shelling out to a Linux dialog
tool. A dialog left open past 5 minutes is killed and reported as 504
`directory_picker_timeout`; the Cancel button resolves 200 `{cancelled:true}`,
detected from the -128 AppleScript error rather than treated as a failure.
Only one dialog may be open on a Host at a time; a second concurrent call gets
409 `directory_picker_busy` instead of queuing behind the first. Tests
substitute the real dialog with `SE_TEST_DIRECTORY_PICKER=<script path>`,
honoured only when `SE_TEST_MODE=1` (the same inert-by-default contract as the
crash-point hooks in `runtime/test-hooks.mjs`); the script receives the
sanitized prompt as its one argument and is expected to print a path or exit
non-zero with `User canceled` on stderr.

`repositories/recent` never scans the filesystem for candidates: it is
derived entirely from every Session's persisted repository-binding-command
receipts (each bind receipt now carries `at`, an ISO timestamp; commands
persisted before this field existed are treated as older than every
timestamped one, never guessed). `available` and the `git` object are the one
live fact each entry adds, via `fs.stat` and two `git rev-parse` calls, inside
a shared 2 second budget for the whole list -- once that budget is spent,
later entries simply get `available:false`/`git:null` rather than starting
more subprocesses. `rootPath` values are Host filesystem paths by design here,
the same as the existing `GET .../repository-binding` response; this slice
adds no new absolute-path disclosure.

`repositories/inspect` answers the same live `available`/`git` pair for one
path outside the recent list (e.g. before a first bind). `git` is only ever
computed when `available` is true, by spawning `/usr/bin/git` directly
(`shell:false`, cwd `rootPath`, fixed argv, a minimal environment with hooks
and global/system config disabled, 5 second timeout) for
`rev-parse --abbrev-ref HEAD` and `rev-parse HEAD`; a non-repository or a
repository with no commits yet makes both fail closed to `git:null` rather
than showing a guessed branch. Neither this route nor the recent list persists
anything or grants a tool -- they are read-only UI conveniences alongside the
security-hardened `repo_*` path above, not a substitute for it.

## Private Git candidate

Candidate creation requires an active source binding to a complete local Git
repository and a full commit object ID. The Host creates one detached private
worktree from that commit beneath its data directory. Uncommitted and untracked
source files are never copied. Candidate identity, source binding/revision,
fixed base commit and write revision are stored on the Session; each new Run
freezes an active candidate snapshot. Source `repo_*` tools remain unchanged.
Public Session and Run projections expose the candidate summary but omit its
Host filesystem paths and staging identities; the dedicated candidate API uses
the same summary.
An active candidate adds `candidate_list`, `candidate_read`, `candidate_grep`,
`repo_write` and `repo_diff` for the Run. Candidate reads have their own
`repository.candidate.read` provenance events.

`repo_diff` returns a Host-generated text patch against the fixed creation
commit, only when the complete patch fits the 2 MiB aggregate review limit. An
oversized patch fails with `candidate_diff_too_large`; the Host stops collecting
per-file patches as soon as the remaining aggregate budget is exceeded. It
does not return a truncated patch or accept an arbitrary Git command or base.
Per-path policy admission (see above) is applied before any per-file patch is
generated, so a denied or ask-gated changed file is dropped from the tracked
and untracked path lists first and never consumes diff or patch-size budget;
its exclusion is reflected only in the `excludedByPolicy` /
`excludedPendingApproval` counts alongside the disclosed `files` and `patch`.
`repo_write` takes a bounded relative path and UTF-8 text. If `expectedSha256`
is omitted, the file must not exist; replacing an existing ordinary file
requires its exact prior hash. The Host stages a new inode and atomically
publishes it within the private worktree. It rejects traversal, `.git`
segments (case-insensitive), symlinks, nonregular files, paths under mounted
descendants and mount-table inspection failures. It checks the candidate
container's mount scope immediately after creation and before each Host Git,
config or filesystem operation that writes into it. Deletes, moves, shell
commands, source-tree writes, automatic merge and publication are unavailable.

The existing permission mode and policy govern `repo_write`: read-only denies;
ask-mode questions bind the tool-call ID, candidate and source-binding IDs and
revisions, relative target, candidate write revision, expected prior hash (or
absence), and the exact UTF-8 `text` bytes' size/hash/preview. After the decision,
the user response is awaited outside the Session effect gate. The Host then
rechecks Run admission, mode, binding/candidate identity and revisions, and
expected target state. It persists proposed bytes in the Session's
ArtifactHistory and records a `prepared` effect before calling the fixed file
helper. Same-session writes and revoke/configuration operations share the Host's
serialized gate. Candidate reads, diff and writes are serialized within a Run
so each read receipt carries the revision of the bytes it observed. Parallel
ask-mode write approvals freeze their candidate write revision; if an earlier
approved write advances it, the later approval is rejected and must be reviewed
again. Expected-hash plus rename is a single-writer contract, not atomic
compare-and-swap against a non-cooperating same-UID writer.

ArtifactHistory currently pins every distinct content version and has no
automatic reference deletion or garbage collection. Clearing an effect's
`contentRef` after `confirmed` or `failed` settles its outstanding-effect
budget; it does not delete the immutable content object. The 64 MiB outstanding
effect payload budget therefore is not a lifetime storage quota.

Each Session retains at most 512 candidate lifecycle receipts and 512 write
effect receipts; receipts are never evicted to make room for replay. New
candidate creation stops at 511 receipts, leaving one durable slot to revoke a
candidate that is already active. If the ledger is full, source-binding revoke
still disables access even when a candidate receipt cannot be added. Writes
are rejected before their ArtifactHistory payload is pinned if they would
exceed the effect-count or 64 MiB outstanding payload budget, and the durable
prepare step repeats the check before recording the effect.

Effects are `prepared`, `confirmed`, `failed` or `unknown`. On restart, every
persisted `prepared` effect becomes `unknown`; no write is replayed or claimed
successful from a matching hash alone. Unknown effects close their Run and
write-close that candidate. This slice has no effect-resolution endpoint:
inspection and retry do not unblock it, and the Host does not infer success.
After review, a user may revoke that candidate and create a separate candidate
from an explicit source commit; the old candidate remains retained. Source
revoke also revokes the candidate and cancels Runs that hold either snapshot.
Revoke does not delete the private candidate or write it back to the source.

## Filesystem boundary

The Host starts one fixed Python standard-library helper with `shell:false`,
bounded JSON input and a fixed operation enum. Model parameters never select a
command, environment or root path. On POSIX hosts with directory-relative
`open`, `O_DIRECTORY` and `O_NOFOLLOW`, the helper opens the bound root,
compares its descriptor and current named path with the persisted device/inode
identity, walks descendants relative to directory descriptors, and does not
follow symbolic links. It checks the root identity again before returning the
read result. The Host checks binding status again before persisting provenance
and returning tool output. A replaced root, denied path, malformed relative
path or revoked binding fails closed.

Paths reject absolute forms, backslashes and `..` segments. The read scope is
the content reachable by ordinary relative paths beneath the selected root in
the Host filesystem namespace, subject to the helper's path checks: symbolic
links are never followed, and nested filesystems with a different device
identity are not traversed. Pre-existing same-device mounted descendants are
in scope. The helper does not separately identify those mount boundaries, so
this contract does not promise physical underlying-directory isolation; it
also does not detect or block malicious mount-namespace changes. Root identity,
no-follow path traversal and current binding/revocation checks still apply. Any
future Connect UI must explain this namespace-visible scope before binding.
This contract grants the three source read tools. `repo_write` is authorized
only for the Host-owned private candidate described above; it never writes the
selected source directory. A Host check recipe (`check_run`) also runs only
inside this same private candidate worktree, never the connected source
directory or the managed workspace; see [`check-recipes.md`](check-recipes.md).

The helpers require the configured Python 3 runtime and POSIX filesystem
primitives. Reads are implemented on supported POSIX hosts. Candidate Git and
write operations require Darwin or Linux dirfd, no-follow and mount-table
primitives; unsupported hosts and unavailable mount checks fail closed. The
current synthetic runtime verification was performed on Darwin 25.6 arm64,
Node 25.9 and Git 2.50.1; Linux runtime behavior has not been exercised. None
of these tools sandbox the Host, restrict OS permissions, make extensions safe,
or add arbitrary shell execution.

`repo_read` returns at most 512 KiB of UTF-8 text. `repo_list` reports at most
200 direct entries. `repo_grep` caps traversal at 500 files, 5 MiB, 24 directory
levels, 10,000 entries and 200 matches; its regex runs in a worker that can be
terminated on timeout or cancellation. Search results are explicitly marked
partial when a scan limit is reached. Symlinks are listed but skipped by
search and never followed.

Synthetic fixtures exercise schema15→16 and schema16→17 migrations, exact
backups, old-host refusal, independent restore, source/candidate path and `.git`
guards, dirty source isolation, fixed-base diffs, permission allow/deny,
expected-hash conflict after the approval wait, write receipts, source/candidate
revocation and Run cancellation, and restart conversion of prepared effects to
unknown. They establish tested Host/service behavior on this environment; they
do not establish GUI usability, real-agent task success, non-cooperating-writer
CAS, Linux behavior or OS-level isolation.
