# Pages follow-up — Orchestra and composable Kits

2026-09-19 · Astra ruling; registered under the existing **13 / PS Pages** owner. **Status: deferred page implementation.** The current task revises development documentation and the bilingual README; it does not redesign, publish, or deploy Pages.

## Responsibility and basis

The [Orchestra ruling](../../research/architecture-node-2026-09-13/orchestra-direction-20260919.md) and [Praxis Kit direction](../../research/architecture-node-2026-09-13/praxis-kit-20260919.md) define the next R&D direction. [Product direction](../../product-direction.md) remains the product-semantic entry. This record consumes those decisions in the original [12–13 assignment](README.md); it adds no separate product roadmap and does not reorder 00–13 or the GUI grammar work.

Nearest precedents are the current Home narrative, Features architecture figure, Experts explanation, and Tour in [site source](../../../site/src/). Read the [UX Grammar](../../design/ux-grammar.md), [frontend contract](../../design/agent-interface-2026-09-10/frontend-contract.md), and [Pages ownership](../../../site/README.md) before visual implementation. UX-02/05/08 govern meaningful configuration, observed states, and authority; the current composition and motion rules govern the visual work.

## Registered page changes

| Surface | Intended change | Evidence and scope |
|---|---|---|
| Home | Explain CourtWork's local agent orchestra direction through a continuous work example: role, prepared context, execution, inspectable result, handoff | Show one meaningful sequence, with capability claims checked against the actual release; no fabricated users, savings, or live runtime connections |
| Features / architecture | Show the existing five responsibilities, reusable Runtime adapters, and local/hosted paths; separate execution environment from harness deployment | Host admission/events/effects, resource provenance, and Work Core decisions retain their owners; no sixth Orchestra Core or universal state store |
| Experts | Explain professional Kit composition plus a bound Agent instance; show one runtime with different coding Kits and the same portable Kit contract across two Runtime adapters | Map runtime-specific contributions explicitly and keep instances, grants, and sessions separate. Kit requirements do not grant permissions. Distinguish professional definitions, instances, runtime-native children, and CW-owned assignments |
| Attention / Chat / Tour | Explain Role as primary intent and runtime/model settings as secondary configuration; show Attention + Praxis and Spark only as supported by the selected build | Do not portray the current global model setting as per-Agent configuration; use actual UI captures after implementation |
| Praxis example | Present audience, expectation, requested action, stage, evidence posture, and unresolved tension before choosing document format | Narrative, demo, adoption, net workload reduction, and financial outcome have separate evidence. Source/customer material stays in its permitted scope |
| Run / Models / Data entry points | Align setup and runtime support descriptions with actual capabilities, versions, configuration scopes, and recovery limits | Keep published install/media pins intact until the release owner updates them with evidence |

The future visual design may use the existing campaign freedom. It must carry these relationships clearly and keep conceptual illustrations separate from product captures. The already published media remains pinned to its original product source; registration does not relabel it.

## README synchronization in this revision

The English [README](../../../README.md) and [Chinese README](../../../README.zh-CN.md) receive matching development-direction sections now. The existing English generator entry at [site/src/readme.mjs](../../../site/src/readme.mjs) is synchronized to the English document so a later regeneration cannot restore the old Chinese-only entry or remove the new direction. Chinese remains a paired authored document with the same commands, links, scope, and version facts.

This is an editorial generation-source correction for existing **N-11**, not the deferred page redesign. Preserve N-11's historical failure evidence in [node acceptance](node-acceptance-20260919.md); record the current source-parity/build result separately. Do not close release or deployment gaps because README generation succeeds.

## Completion evidence for the later Pages slice

- Trace page claims to the final architecture and the selected product's real support matrix.
- Check English/Chinese README parity and generator parity; preserve operational commands and current adoption/release pins.
- Run the existing Pages build and publication checks, inspect desktop/mobile, light/dark, keyboard, long content, and reduced motion where relevant.
- Use new captures only after the relevant product implementation exists; retain capture source SHA and actual verification scope.
- Record author and non-author review separately. Publishing requires its existing explicit authorization and release evidence.

No new screenshots, website UI, runtime implementation, live provider calls, or deployment are included in this registration.

## Current documentation verification

Astra checked exact English generator/README equality, matching shell blocks and matching link targets across the English/Chinese README, and reviewed their scope and version wording. `node site/build.mjs` passed on the isolated revision based on `72c91a2`; the earlier N-11 source mismatch is corrected in this candidate. The build retained the existing release/media pins and produced local output only. This is author evidence for documentation/build consistency, not visual or release acceptance.

Luna subsequently repeated generator/bilingual parity and independently passed the Pages build, local-link and material checks without changing tracked files. Astra adopts that result for the N-11 source/build correction only; the [owner record](node-acceptance-20260919.md#n-11-independent-build-verification--2026-09-19) pins the verified source hashes. The correction is still uncommitted; visual implementation, CI/deployment and release scope remain separate.

## 2026-09-20 · Runtime management narrative follow-up

The [local-runtime ruling](../../research/architecture-node-2026-09-13/local-agent-runtimes-20260920.md) adds a later setup/Tour explanation: upstream-maintained executors connect through CW adapters; Agent profiles compose Role/Kits and select Runtime bindings; Models manages provider configuration, with runtime-native ownership disclosed. The target Settings → Agents → Runtimes surface supports connection/admission management, not automatic installation or replacement of active work. Use conceptual diagrams until this UI is implemented, and real captures only from the verified release. CC Switch is a provider-control precedent, not a shipped dependency. This remains within the existing Pages owner and adds no implementation or publishing step now.

## 2026-09-20 · Pi naming and brief product introduction

Use Pi as the public upstream runtime name. Existing native IDs and historical captures remain unchanged. The future setup/Tour should explain the product through one work example: choose an agent, add a Kit if needed, use a connected Runtime/model within permission scope, inspect and continue. Keep these names and action meanings aligned with Composer, Settings and both READMEs; link implementation status rather than duplicating another capability ledger. Technical paths/protocols belong in relevant details. Apply the [comprehension checks](../../research/architecture-node-2026-09-13/local-agent-runtimes-20260920.md#comprehension-presentation-and-document-ownership) when the surface exists; no new guided flow, screenshots or usability acceptance is claimed now.

## Pi naming / comprehension revision verification (2026-09-20)

After the Pi/public-vocabulary revision, Astra rechecked exact English generator/README equality and bilingual shell-command/link parity; `node site/build.mjs`, document links (1,415 documents / 8,060 links) and `git diff --check` passed. This is new author evidence for the revised text; the earlier N-11 independent receipt keeps its original source hashes. No visual captures, usability acceptance, product/runtime identity changes or deployment are claimed.

| Revised source | SHA-256 |
|---|---|
| `README.md` | `9f57382a2cb5a933eca507ee80893abc279f3fe013743e97e6cc2dabdf0835b5` |
| `README.zh-CN.md` | `551a927d2744b639d89a31606604a51715ff0b46026d61319dbf750ccf168319` |
| `site/src/readme.mjs` | `528609ccc8684e0042cf932e2f36c1007d01dab7a608c56372993de4465d7fc2` |


## Deferred personal management explanation — 2026-09-20

README and its English generator now explain the [personal credential/hook management direction](../../research/architecture-node-2026-09-13/local-agent-runtimes-20260920.md#personal-credentials-hooks-and-browser-dogfooding--2026-09-20). Later Models/Agents/Tour page work must distinguish upstream-owned native authentication from CW-managed references, and configured hooks from enabled/approved execution. Do not advertise encrypted storage, hook isolation, universal native integration or completed browser dogfood before implementation evidence exists. Enterprise employee/gateway management remains separate FDE work. This extends the current Pages registration; no page redesign or deployment occurs here.
