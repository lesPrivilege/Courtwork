# Work Continuity · Evaluation Contract

Status: BM-01 design contract. Extends the existing [Continuity protocol](../engineering/research/se-continuity-2026-09-08/README.md) and [observation v2](continuity/observation-contract.md). Paper semantics remain pinned by [PAPER.md](../PAPER.md).

Work survives an execution only when its valid sources, accepted decisions and unfinished obligations remain usable by the next executor. These evaluations ask whether that happens, and what it costs.

## Evaluation families

| Family | Question | Observation |
|---|---|---|
| Continuity | Can work continue after a source changes or an executor leaves? | Valid completion, preserved obligations, current source basis |
| Core State Machine | Do combinations of legal and illegal actions preserve work semantics? | Whole operation history against an independent reference model |
| Fault & Replay | What survives interruption and an acknowledgement lost after commit? | Durable state, retry receipt and committed effect after restart |
| Disclosure | How much must a new executor read before acting correctly? | Correct first action, legal completion, disclosed bytes and full cost |

Concurrency, provenance and schema evolution extend these families through explicit scenario contracts. Performance comparisons follow correctness admission. Storage providers are optional treatments; LayerFS is not a new Core authority or a required dependency.

## Freeze before execution

Each versioned scenario declares claim, non-claims, task family/split, fixture digest, seed, authentic entrypoint, treatment, equal information and permissions, semantic disturbance checkpoint, setup/run/verification/cleanup boundaries, metrics and denominators, oracle, budgets, stopping rule and evidence layout. Requested inputs and resolved dependencies are recorded separately.

Changing a claim, oracle, treatment, fixture or measurement boundary creates a new scenario version. Keep prior failures and outputs under their original identities. Repeated seeds and checkpoints are not independent tasks; exposed memo/NDA fixtures remain development data.

## Authentic operation and independent observation

A Core claim uses the shipping Core client; a host claim uses the authenticated shipping HTTP boundary; a model claim uses the shipping model/tool/policy path. A trusted fixture client cannot establish host authorization or model competence. A graceful restart cannot establish crash durability. Test seams may schedule disturbances but may not replace production mutation paths.

Adapters expose durable raw state and complete operation histories. The oracle defines legal behavior without importing the production validator or inferring truth from a success flag. Preserve invocation, completion, failure, timeout and unknown outcome. Missing checkpoints fail admission; an unavailable process is not a correct refusal. Legal-completion controls prevent all-refuse systems from succeeding.

## Fair comparison

E is CourtWork Core; S is an ordinary persistent approval system with versions, authorization, transactions, CAS and payload-bound idempotency. Both passing current synthetic conformance is expected. T adds transcript/files/retrieval only when its actual implementation and information parity are frozen.

For comparative continuation, equalize source information, permissions, starting opportunity, model, tools and budgets. Record differences explicitly. Keep paired continuation separate from end-to-end state formation. Test projection P and domain admission G on shared safety facilities; disabling G never disables authorization or transaction safety. If treatments are semantically identical, cancel the causal comparison. A cheaper S/T with comparable outcomes weakens the case for E.

## Measurement and admission

Record correctness, legal completion, invalid effects, continuation and cost separately. No opportunity means not applicable. Unknown cost is null with a reason. Retain all preallocated attempts; infrastructure failures, timeouts and behavioral failures have distinct labels and remain visible. Aggregate by base matter/task family, not by steps. Model and human outcomes require separate evidence.

Timing excludes setup, oracle verification, cleanup and supervision, each reported in its own scope. End-to-end accounting additionally includes state preparation, retrieval, verifier, review and maintenance. A quick run with invalid evidence is inadmissible. Admission labels are admitted, rejected, incomplete and not_run; they are not product acceptance.

## Evidence bundle

A new run directory contains scenario.json, attempts.json, performance/raw.jsonl, verification/raw.jsonl, receipts/, run-status.json, run-manifest.json, report.json, report.md and evidence.sha256. The manifest binds scenario, source commit and dirty-content digest, runner, adapters, oracle, fixtures, environment, model/provider, seed and disturbance plan, all attempts and output digests. No credentials or personal paths enter public records.

Seal raw records before reporting. The report generator must reproduce report.json and report.md from sealed inputs with a deterministic ordering. Avoid circular digests: manifest lists evidence inputs/outputs excluding itself and evidence.sha256; evidence.sha256 finally hashes the manifest and all sealed files excluding itself. Rebuild verification compares bytes in a separate directory. Hashes establish identity, not independent authorship or truth.

## Publication

Product pages explain the evaluation question and design. Results identify their synthetic/model/human scope and link to reproducible evidence. Test totals are not product claims. Current synthetic Continuity is a development calibration; no model advantage, professional quality or human-takeover benefit follows from it. Planned families are named as evaluation design, not completed experiments.

Implementation sequence and reviewable PR bodies: [BM series](../engineering/execution/2026-09-10-benchmark-series/README.md).
