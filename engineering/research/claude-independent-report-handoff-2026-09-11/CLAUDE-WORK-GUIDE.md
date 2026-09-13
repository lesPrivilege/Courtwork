# Claude work guide · independent technology profile

## Role

You are an independent technology writer. Read only the supplied package and produce a critical profile of the project represented by those materials. Do not infer an intended conclusion from the package title, the presence of a brand, or the ordering of sources.

## Assignment

Write a 1,200–2,000 word report about `les Privilege`, Courtwork, and Schema Engineering. Answer:

1. What problem does this project believe a model-based system must solve beyond generation?
2. Which objects and boundaries are intended to survive a model, runtime, or session change?
3. How do early Courtwork principles relate to the later Paper and current implementation?
4. What does the naming and visual system communicate to an outside reader?
5. Which claims are observed, which are attributed public claims, which are interpretations, and which remain open?

Use a serious, readable technology-report register. You may form independent interpretations from the material, but do not imitate or name any particular publication or company house style. Keep the report focused on the supplied evidence and do not discuss tools or access outside the report's source notes.

## Source discipline

Use these labels in `fact-ledger.md`:

- **Observed:** directly present in the supplied fixed project or Paper material;
- **Reported claim:** a public organization's own statement, explicitly attributed;
- **Interpretation:** a reasoned connection across observed material;
- **Open question:** unresolved, unsupported, conflicting, or requiring a source outside this package.

Rules:

- Do not invent employees, customers, funding, model access, legal identity, deployment, external interviews, or anonymous sources.
- Attribute Anthropic's public positions and allegations to Anthropic; do not present them as independently verified findings.
- Treat the conversation's reasoning/open-knowledge chronology and provider-routing discussion as open or reported material, not proof of causation or misconduct.
- Do not assert that Anthropic copied DeepSeek, that a provider misused user data, or that any model's provenance is known.
- Do not turn pages, screenshots, fixtures, author checks, or brand assets into product acceptance or real-world capability.
- Keep the distinction between project fact, naming material, literary association, and unresolved business status.

## Offline and filesystem boundaries

- Read only this package's allowlisted files.
- Do not browse, search, fetch URLs, call MCP/apps/providers, access the parent repository, inspect chat history, inspect credentials, install packages, or run a shell.
- Write only `out/report.md`, `out/fact-ledger.md`, `out/sources.md`, and `out/README.md`.
- Do not edit Paper, product, brand, schema, or deployment files; do not send messages, create commits, push, publish, or deploy.
- If the host cannot enforce the policy, return `NOT_RUN_BOUNDARY_UNAVAILABLE` and no report files.

## Completion contract

Completion means the report and its ledger are internally consistent and limitations are visible. It does not mean the project has been independently accepted, the report is ready for publication, or any real-world claim has been newly verified.
