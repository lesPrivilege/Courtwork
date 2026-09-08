# REEF release-surface source note

**Access date:** 2026-09-08. **Repository:** `Human-Agent-Society/reef`.
`main`/`HEAD` at inspection was
[`8e87829572b210572cad2008c28d39888b2b8396`](https://github.com/Human-Agent-Society/reef/tree/8e87829572b210572cad2008c28d39888b2b8396),
commit `2026-09-07T14:01:58-04:00`. I used a shallow clone and read-only
commands; no repository files were changed. The docs site navigation currently
labels itself `v0.0.2`; the repository tag `v0.0.2` points to a different
commit (`21b0a7d...`). This is a release-surface fact, not evidence that the
site and HEAD are interchangeable.

## Information architecture

The pinned [English README](https://github.com/Human-Agent-Society/reef/blob/8e87829572b210572cad2008c28d39888b2b8396/README.md#L46-L74)
maps the loop to Serve → Observe → Grow → Commit and names the corresponding
`service/`, `records.py`, `recipe/`, `train/evaluation/`, `artifact/`, and
`surface/` areas. The [official quickstart](https://www.reefinfra.ai/docs/getting-started/quickstart/)
uses the related request → receipt → report → learn → evolve → update sequence,
and defines scenario, receipt, report, recipe, artifact, and release. These are
documented boundaries and vocabulary; they do not establish publication
maturity or prove every listed path is release-ready.

## Bilingual synchronization

The [English and Chinese READMEs](https://github.com/Human-Agent-Society/reef/blob/8e87829572b210572cad2008c28d39888b2b8396/README.md#L15-L30)
and [`README.zh.md`](https://github.com/Human-Agent-Society/reef/blob/8e87829572b210572cad2008c28d39888b2b8396/README.zh.md#L15-L30)
link to each other and keep the same visible navigation/loop structure. The
[i18n checker](https://github.com/Human-Agent-Society/reef/blob/8e87829572b210572cad2008c28d39888b2b8396/.github/scripts/check_readme_i18n.py#L103-L170)
compares heading levels, list markers, table shapes, link/HTML targets, and
fenced-code blocks; [`README.i18n.yaml`](https://github.com/Human-Agent-Society/reef/blob/8e87829572b210572cad2008c28d39888b2b8396/README.i18n.yaml#L1-L5)
stores the two current Git blob hashes. Running `python3
.github/scripts/check_readme_i18n.py` at this SHA passed. The check is structural:
it does not prove translation quality or semantic parity, and `--write` is
documented as following human review.

## Candidate, commitment, and evidence governance

These are two distinct mechanisms. Issue [#25, Reef 2026 Q3 roadmap](https://github.com/Human-Agent-Society/reef/issues/25)
is an active quarterly governance record: unassigned means candidate, assigned
and accepted means committed for the quarter, KIV is optional, and `Checked`
means outcome plus acceptance evidence are complete. Tracking issue labels/state
are declared authoritative. A learning-recipe outcome may be `Done` only with a
pinned reproduction command/configuration, raw per-version results, a learning
curve, and an explicit acceptance criterion. The issue's end-of-quarter fields
were still `TBD` at access, so it is not a completion or maturity claim.

For an artifact candidate, the pinned [Python API contract](https://github.com/Human-Agent-Society/reef/blob/8e87829572b210572cad2008c28d39888b2b8396/docs/reference/python-api.rst#L450-L519)
separates propose/evaluate/decide, requires evaluate-then-decide ordering, and
requires a selection decision to carry the exact evaluation result. Rejection
or an exception leaves the incumbent/aborts the candidate; evaluation is to be
idempotent by `candidate_id`. The [state model](https://github.com/Human-Agent-Society/reef/blob/8e87829572b210572cad2008c28d39888b2b8396/docs/advanced_topics/state-model.rst#L23-L79)
then gives publication its own durable boundary: releases have parents and
separate release/content/runtime identities; scenario commit logs are append-only
JSONL with an `fsync` append as commit point; stale publication conflicts rather
than overwrites. A winning candidate can still be held for review and promoted
later according to the documented evolution policy.

Therefore “quarterly commitment” in issue #25 must not be conflated with an
artifact's publication commit. The sources support a candidate → measured
evidence → selection decision → release/commit record sequence, while leaving
the roadmap active and its final outcomes unverified.

## Bounded release use

For a release note, pin the repository SHA and state which docs-site version was
read; update both READMEs, run the structural checker, and retain the human
review step before refreshing the blob-hash record. For any claimed candidate or
recipe outcome, link the pinned reproduction/config, raw per-version evidence,
curve, and acceptance criterion, then distinguish pending review from served
publication. These are source-grounded release checks, not a recommendation
that CourtWork or Schema Engineering adopt REEF or its implementation.

