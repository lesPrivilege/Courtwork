# Runtime implementation and API

This page routes to the document that owns each topic. Status, versions and support
levels are stated in the target documents, not here.

## Runtime foundation

- [Runtime foundation](runtime-foundation.md): Host, Pi integration, model and capability interfaces, shutdown and recovery.
- [Commands and compaction](commands-and-compaction.md): slash commands, manual and automatic compaction, and their boundaries.
- [HTTP base contract](api-v6.md): the `/api/v5` routes for sessions, Runs, credentials, files and events.
- [Historical files and compaction](api-runtime-mx-r1.md): MX-R1 interface additions.
- [Runtime data and migration](../README.md#store-schema): RuntimeStore schema, upgrade and backups.
- [Permission CAS](permission-cas.md): payload and version conditions for approved actions.
- [Supported use](supported-preview.md): usage table for the source preview.

## Work and Run projections

- [Work summary](work-summary-api.md): work index and summaries.
- [Bound Core Review summary](work-review-summary.md): Session-bound Core pending counts, versions and read-only boundary.
- [Activity and Usage](work-metrics.md): recorded Run metrics.
- [Usage detail and snapshot drilldown](usage-details.md): daily, model and exact Run reads.
- [Async read tasks](async-tasks.md): task state, cancellation, recovery and consumption.
- [Run attempts and lineage](run-attempts.md): explicit Run succession (`supersedes`), valid targets and unbranched chains.
- [Model effort and request measurements](request-telemetry.md): reasoning effort and request telemetry.
- [Runtime Control Plane](../../docs/runtime-control/INDEX.md): resources, policy, source resolution and MCP.
- [Governed objects](../../docs/work-core/governance.md): Attention/Matter directory, disclosure policy, exact source and result reads.
- [Work Core](../../docs/work-core/README.md): candidates, sources, decisions and domain work.

## Sessions, repositories and agents

- [Repository binding and candidate tools](repository-binding.md): explicit external directory binding, private candidate and write effects.
- [Host check recipes](check-recipes.md): fixed Host-owned checks against a private candidate.
- [Optional workspace chats](projectless-chat.md): Chat without a Project.
- [Attention global agent](attention-agent.md): global conversation, progressive history reads and shared Runtime configuration.
- [Thread and local messaging](coordination.md): durable work threads, local outbox/inbox, permissions and child conformance.
- [Spark](spark-agent.md): independent Explore Agent.
- [Runtime proposals](runtime-proposals.md): declarative Skill proposals.
- [Hermes API runs adapter](hermes-api-runs.md): standalone adapter contract.

## Walkthroughs and examples

- [First work: synthetic NDA review](first-work.md): GUI setup, fixed public input, formal Review and same-Matter continuation.
- [The example workspace](example-workspace.md): the synthetic story shown through product projections.

## Integration and sources

- [Pi / MCP integration](upstream-integration.md)
- [Per-turn ownership](turn-ownership-review.md)
- [Dependency ledger](dependency-ledger.json)
- [Historical API proposal](runtime-api-proposal.md)

For module locations see the [application entry](../README.md#modules); for verification records and delivery status see [engineering status](../../engineering/current.md).
