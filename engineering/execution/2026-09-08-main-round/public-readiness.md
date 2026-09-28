# 本轮完工节点：可用于简历与 Pages 的产品证据

2026-09-08，用户明确本轮架构的完工节点为“达到足以修订resume和公开Pages的完成度”。因此派单、main接管、构建通过或页面画完都不单独关闭本轮。Astra以本表收口产品证据，Claude Opus承接README/Pages表达；current仍是唯一工程状态入口。

## 要成立的最小公开叙事

一个人使用CourtWork处理一份合成专业材料，在可检查的运行中得到候选，核对来源与未决后由人作出正式决定，再用新的Session继续同一事项。代码可从main独立启动，公开演示、简历与源码中的能力指向同一版本。

首个消费者沿用已选的Inbound NDA合成playbook实验；不据此宣称法律专业准确性、真实客户采用、生产部署、任意Expert或完整多租户平台。企业经历、Motto与SE论文仍各自保留成果归属。

## 完工条件

| 门 | 必须可观察的结果 | 交付证据与责任 |
|---|---|---|
| G1 独立启动与真实运行 | 从独立clone按README启动；用户通过GUI配置已授权provider；至少一条真实模型/工具路径成立，失败/取消/重启后状态可检查 | 固定产品SHA、启动说明、真实/fixture分列；Astra组织验证。不得记录key或假定已有配置 |
| G2 最小正式工作闭环 | H0固定输入/gold；H1/H2产生绑定版本的候选与依据；人检查后接受/退回/要求补证据，正式成果与候选区分；旧版本、重复请求与伪造actor受约束 | H1/H2服务/Core反例、H3界面操作、Decision/Artifact回执；不以工具allow代替正式决定 |
| G3 连续性与可用界面 | 新Session恢复同一Matter的成果/依据/未决；关键路径键盘可操作、无主要遮挡/失真；断线、过时与错误可辨 | 同Matter换Session操作与前后快照；当前桌面主路径实测。完整移动/读屏/其他平台另记范围，不要求全部一次通过 |
| G4 可公开复现的产品演示 | 一条2–4分钟可理解的闭环，材料均为合成/可公开；真实UI与实际成果可核对，失败/未决不剪成成功 | Opus制作页面媒体，Astra核对源SHA、data kind、操作与hash。截图/fixture/真实录像标明身份 |
| G5 公开事实与简历消费 | 每条对外能力都有对应证据，README/Pages可运行入口正确，简历项目叙述和ownership不超范围 | Astra固定事实清单及未检项；Opus完成README/Pages；career-kit按repo→索引→唯一底稿→编译更新并核验 |

G1–G5需落在一个可复核的产品基线或明确记录源码等价关系；最终独立检查只覆盖实际运行范围。页面可以先以准确的experimental口径迭代，但不能据此宣称整个节点完成。架构工单只有在这些证据足以支持公开叙述时才收口。

## 不捆绑为本节点前置

完整WK11新布局、Runtime R2–R6、动态任意包、全部热插拔、多用户、多Agent调度、第二垂类、DMG/签名公证、全平台UI、模型质量提升数字、外部客户试点与全部legacy功能不默认阻塞本节点。

WK10b/WK11先做G2/G3所需部分。H4完整卸载/升级验证按失败和公开承诺触发；若发布面宣称“卸载后历史仍可读”或“版本升级不改旧结果”，对应H3/H4证据就成为该声称的前置。基础失败可解释性不能省略。

## 简历可以消费什么

完成后候选叙事可围绕三个可证实结果编订，而不是堆测试数：
- 定义并组织交付一个围绕材料、候选、人的裁决与持续工作状态的Agent产品；
- 将执行权限与成果接受分层，并通过版本、来源和恢复反例验证关键边界；
- 在合成专业场景跑通真实模型到可审阅成果的路径，提供可复现源码、界面和演示。

上述是待证据成立后才能采用的写作方向，不是本日已取得成果。本人职责继续写产品定义/架构/编排/终审，代码实现与上游能力如实归属。不给测试总量套“本人新增”，不把synthetic改成真实客户、把一次真实运行改成泛化效果提升。

## 收口与停点

每张工单交付要说明关闭哪个门、只支持什么范围、剩余缺口。Astra更新current并提供可公开事实交接；存在阻塞G1–G5的缺口时本轮保持未完工，不以“已派单”结案。Opus执行会话/真实provider配置由实际接单与用户GUI输入建立，未发生前保持待接单/not_run，不模拟完成或擅自替代其写权。


## 2026-09-27 · Bounded formal closure evidence update

[The actual browser/provider/Host/Core packet](../claude-frontend-harness-2026-09-16/evidence/production-closure-20260927/README.md) now supports the fixed H0 normal NDA path through an independently matched proposal, operator UI decision, accepted Artifact and a new Session's exact artifact read. Source input/gold stays fixed; both development extensions remain synthetic. Process-restart equality, real cancellation and decision replay/actor/closed-candidate refusals are separately recorded. EC-1 corrects a demonstrated generic proposal-schema omission and passes independent38/38 plus a fresh unassisted real submission after restart.

This adds bounded G1/G2/G3 evidence; it does not relabel operator review as end-user personal review, or close fresh-clone/GUI configuration, professional-quality, all accessibility, public media or claim-mapping requirements. [Prepared reproduction/media handoff](../claude-frontend-harness-2026-09-16/evidence/production-closure-20260927/walkthrough.md) is not a timed G4 recording or G5 publication. Existing frontend/media/publication assignments remain with their owners; no new release/deployment is authorized by this evidence update.


## 2026-09-28 · G5 evidence mapping author lease

The user prioritizes already registered work, assigning core/frontend construction to original Claude, disjoint work to Sol, and exploration to Luna/Sonnet. Astra releases the existing G5 fact-mapping preparation at inspected main `52532bf9a7b5b2f5623ac17ab8a8d60720734956`. This is an existing publication-owner input, not a new roadmap or permission to publish. Astra retains factual adjudication and acceptance; Claude retains README/Pages/media authoring.

**Sol responsibility:** prepare `g5-fact-map-20260928.md` beside this record. Inspect current English/Chinese README sources, the actual public Pages source/generation owner, the September27 production-closure packet, and only the specific accepted evidence needed to substantiate their concrete capability statements. Map each material present-tense capability/entry-point claim to exact source location, retained evidence/source identity, synthetic versus real-provider scope, and an adopt/adjust/defer recommendation with reason. Distinguish product intent from implemented capability. Include missing proof and a finite Claude handoff; do not dilute all product language into engineering disclaimers. Never infer full production, native Hermes, unrestricted runtime interchangeability or professional accuracy from narrower receipts.

**Boundary and precedent:** the existing G5 gate above owns public fact mapping; the September27 gate matrix and walkthrough are the nearest implemented evidence handoff. No runtime, schema, UI or publication source changes are necessary. Sol owns only the new map and its author-result subsection here; no raw historical evidence edits, private resume/credentials, README/Pages writes, current/dispatch edits, deployments or paid calls. Preserve all other writers. Work in the isolated `codex/registered-completion-20260928` checkout; commit explicit paths and release the writer after delivery.

**Verification:** source/evidence links must resolve, actual generated/public entry points must be identified from repository configuration, and English/Chinese statements compared where shared. Run the repository documentation-link check and whitespace check; no product suite is warranted for this mapping-only deliverable. Report exact checked source, findings and remaining coverage. This bounded author map cannot by itself close G5 or any other gate. Luna reviews the fixed delivery; Astra disposes findings in this owner before Claude consumes changes.

## 2026-09-28 · G5 Sol author result

Sol delivers the [bounded G5 delta and Claude handoff](g5-fact-map-20260928.md) from inspected clean `codex/registered-completion-20260928@a9694d09ecd04baaa3b265af8f3ae668e5821b42`. The original [September13 fact map](../../../evidence/release-preflight-20260913/public-facts.md) remains the existing release mapping entry; its product pin `01f37f0` is distinguished from the map's actual introduction `9ba2fd1`. No parallel gate/roadmap or factual acceptance is created.

The map covers 18 material claim groups across both READMEs and all Pages generation owners, with exact source locations, frozen install/replay/media/method identities, selected accepted receipts, synthetic/real-provider separation, recommendations, missing proof and a finite original-Claude consumption boundary. September27 formal closure supports an operator-mediated synthetic NDA/generic path, exact accepted-Artifact continuation, cancellation and graceful restart; coding dogfood supports private-candidate write/fixed-check/correction. Neither makes older media current, proves professional accuracy or enables native Hermes/production runtime replacement. Current support-doc API-only/no-picker/no-test-runner rows are returned as stale current-source wording; their pinned historical snapshot is preserved. P05/P06/DF-06 remain bounded accepted.

Author checks: exact English generator/README equality passes; bilingual shell blocks and all 44 shared link targets match, with no material semantic scope divergence found. `node tools/check-doc-links.mjs` passes with zero unresolved repository-source links; `git diff --check` passes. Checks cover source/evidence mapping and documentation only. No fresh clone/configuration, product suite, browser, paid provider, private files, README/Pages/product/current/dispatch edits, push or deployment occurred. The assigned writer is released after the explicit two-path commit. Fixed-delivery Luna review and Astra disposition remain pending; G1/G4/G5 retain the documented missing proof.

## 2026-09-28 · G5 support-table correction lease and disposition

Astra independently confirms and **adopts** the map's two concrete stale current-source findings: the External repository row's API-only/no-picker/no-real-provider wording and the Commands row's unavailable-check-runner wording in `app/docs/supported-preview.md`. This continues the original G5 owner; it does not wait for or replace Luna's independent review of the fixed mapping `52bcb5da94666ad2a72d0f9ad403b6dbf978029b`.

**Responsibility / owner / nearest precedent:** Sol owns only those two current support-table rows and this correction/result subsection; RuntimeService/repository binding, fixed check recipes and CMD-01/CMP-01 retain capability authority, Astra factual adjudication, original Claude README/Pages/media authorship. Nearest implemented precedents are the [repository GUI/API contract](../../../app/docs/repository-binding.md), [accepted lease-queue real-provider journey](../claude-frontend-harness-2026-09-16/evidence/lease-queue-dogfood-20260927/README.md) at product `9fb8dbb`, [fixed Host check contract](../../../app/docs/check-recipes.md) and [Attention recipe acceptance](../claude-frontend-harness-2026-09-16/evidence/attention-check-recipe-20260927/parent-review/README.md) at `75027fc`. The [current command/compaction contract](../../../app/docs/commands-and-compaction.md#current-support-2026-09-16--cmd-01--cmp-01-first-slices), Host `dispatchCommand`/`compactSession` and [original07 record](../claude-frontend-harness-2026-09-16/07-commands-compaction.md) confirm typed `/status`, `/tools`, `/model`, `/effort` and idle-only `/compact`; the corrected Commands row must not retain their old blanket unavailability.

**Scope before edits:** describe actual GUI preparation/working-folder binding, optional explicit-base private candidate and bounded real-provider synthetic coding; retain source/candidate separation, unchanged selected source, no automatic merge, path/mount/isolation limits and exact approvals. Describe model-invoked fixed recipe IDs only inside the active private candidate after approval, with no arbitrary shell/arguments. Preserve unavailable `/model <id>`, skill/prompt expansion and third-party slash scope. This is a documentation correction only: no semantic/projection/control/schema/runtime/UI/dependency change or cross-layer construction is necessary. No historical snapshot/receipt, commands-and-compaction, README/Pages, product/current/dispatch, private-file, browser/provider, suite, push or deployment writes are leased. The original map findings remain at their inspected `a9694d0` source. Verify repository links and whitespace, commit explicit paths, then release the writer for fixed independent review.

**Sol author result:** the two rows now describe actual GUI Working folder preparation and optional private candidate, the accepted real-provider synthetic coding example, typed commands/idle-only manual compaction, and model-requested fixed recipes with exact approval. Filesystem/mount/isolation limits, source immutability/no automatic merge and unavailable arbitrary shell/command expansion remain explicit. All other `supported-preview.md` bytes and the fixed G5 map are unchanged. Repository documentation links pass (1,698 documents / 10,383 checked links, zero problems); whitespace checks pass. Verification is documentation/source-contract reading only, with no new command, compaction, GUI or provider execution. Original07 author evidence is not relabelled independent acceptance. The separate correction commit releases Sol's writer; independent review/parent integration remain pending, and no G gate is closed.


### Astra disposition and independent receipt · 2026-09-28

Accept Sol's fixed mapping `52bcb5d` and support correction `6ca2c96`. Luna independently reviewed the fixed map/source pins and sampled E1 receipt identities, then checked the two corrected support rows against repository GUI, typed command/compaction and fixed recipe/permission owners; no remaining actionable issue. Parent separately read the support diff, current command contract and E2's actual Host check evidence. These are documentation/source checks, not new execution or browser results.

**C01–C18 disposition:** adopt the map as bounded factual input with its scope qualifiers; retain the existing fictional-commercial product brief (C17) without treating it as operation evidence. Adopt and implement only the exact current support-document corrections identified in C10/C11 and the final owner return, including the already-supported typed commands/manual compaction. Defer public generator/README wording changes, the concrete C14 CLI identity correction and C13 media wording to original Claude's serial publication lane after its active B2 handoff; no competing frontend writer. Defer public source/media repinning until the existing G1/G4 candidate/capture requirements are met. The map's unknown/professional/native-runtime limits remain limits, not new product gates. Original historical fact-map and capture bytes remain unchanged.

The integrated documentation must pass link and whitespace checks; author generation/bilingual parity was scoped to unchanged public sources. G5 mapping preparation and the two current support corrections are complete. G1 fresh configuration, G4 timed media, final public artifact fact consumption and whole-product acceptance remain open. No private resume, online artifact, user Host, provider credentials, push or deployment was changed.


### Claude serial G5 C13/C14 correction · 2026-09-28

After B2 acceptance at main `e5f404b`, release only two concrete findings from the accepted G5 delta to original Claude. Public source identity belongs to the existing build/replay/media owners; nearest precedent is `renderProductPages` already receiving both validated replay `identity` and separate screenshot `media`. In `site/src/product-pages.mjs`, make `cliData.sha` name the replay source that produced `recording.surface.pending.projection` (the build already validates matching release/capture identity), rather than `pageSha7` from screenshot media. In `site/src/page.mjs`, remove the unsupported current-version implication from M1's alt text (`Courtwork 当前 Home`), while preserving its image, descriptive content and layout. No other public prose, source/media/install pin, manifest, replay bytes, README or product files are leased. Preserve historical snapshots and the fictional-commercial brief.

This is a publication-generator fact correction with no layout/control/authority changes; Claude records consumed UX/frontend precedents in this existing owner, using the released isolated B2 checkout after fast-forward to this fixed contract or another suitable free checkout. Read the contract and source before editing. Validate by the normal Pages build plus targeted output inspection: CLI record identity equals validated replay source, screenshot/install identities remain unchanged, M1 alt no longer implies current-version media. Run doc links/whitespace; no new implementation-mirroring unit test or whole product suite is required. Report exact source and output checks, commit explicit paths and release writer. Astra/Luna independently review before integration; no publication, deployment, user Host restart or provider use.

**Claude author result · C13/C14.** Source commit `33db5d8`, from the released B2 checkout fast-forwarded to `01da1d0`.
- **C14:** `site/src/product-pages.mjs` sets `cliData.sha` to `identity.sha7`, following the precedent of `renderProductPages` already receiving the validated replay `identity` apart from the screenshot `media`. `build.mjs` validates the recording it renders (`capture.source_sha === release.source_sha`). I removed the now-unused `pageSha7`; `pageSha` still names screenshot and editorial links.
- **C13:** `site/src/page.mjs` M1 alt now reads `Courtwork Home：项目、活动与 Attention 入口。`, with the same image, caption and layout.
- **Scope:** no other public prose or pin, manifest, replay bytes, README or product file changed.
- **Frontend guidance applied:** the frontend contract's Semantic rule (requested, effective and bound identities are not merged) and the existing separation of replay and media owners. This is not a layout or control change.

Author checks:
- `node site/build.mjs` succeeds before and after the change. The CLI record (`#cli-record` in `dist/cli.html`) changes only its `sha`, from `fd96f96` (page media) to `9e5384f` (release/capture replay source); title, version, sources, candidates and decisions are byte-identical.
- The only generated files that differ from the baseline are `cli.html`, `index.html` and `build-manifest.json`: file hashes for those two pages, the zh-CN locale hash and the input-digest `site_sha`. `release.source_sha` stays `9e5384f`, and page media/install `source_sha` stays `fd96f96`. `get.html` and all media are unchanged.
- The M1 alt no longer contains `当前`.
- Site checks: `check-links` and `check-material` pass. `node tools/check-doc-links.mjs`: 10,399 links, zero problems. `git diff --check` passes.
- Not run: a new unit test, the full product suite, the browser, deployment, user Host/provider use, or the Hermes server.

Writer released for Astra/Luna review.
