# Tessera

**Open-source, self-hostable code intelligence — served to your coding agents over MCP.**

Tessera indexes your repositories with [SCIP](https://github.com/sourcegraph/scip) (the same semantic indexers Sourcegraph uses) and exposes precise, cross-repo code navigation — symbol search, go-to-definition, find-references, find-implementations — through a [Model Context Protocol](https://modelcontextprotocol.io) server. Point Claude Code, Cursor, or any MCP-capable agent at it and your agent gets accurate, whole-codebase context that never leaves your infrastructure.

> Tessera began as an auto-documentation tool. It has been refocused into a code-intelligence platform: the documentation-generation features have been removed, and the SCIP indexing + MCP serving layer is now the product.

## Why Tessera

- **Context for coding agents.** Agents reason far better when they can resolve real symbols, definitions, and references across repos instead of grepping. Tessera delivers that over MCP.
- **Self-hosted and private.** Your code is cloned, indexed, and stored entirely within your own infrastructure. Nothing is sent to a third party.
- **Built on open standards.** SCIP indices, an S3-compatible object store, Postgres, and Redis — no proprietary lock-in.
- **Multi-language.** TypeScript/JavaScript, Python, Go, Java/Kotlin/Scala, Ruby, Rust, PHP, and C/C++ via the official Sourcegraph SCIP indexers.

## How it works

```
GitHub push / PR ──▶ webhook ──▶ Run ──▶ ┌─ SCIP index (per language) ─▶ SQLite ─▶ object storage (S3/MinIO)
                                         └─ Repository signals (REST/GraphQL/gRPC, events, deps)
                                                                                    │
   Coding agent ──▶ MCP (Bearer API token) ──▶ symbol search / defs / refs / impls ─┘
```

1. **Ingest.** A GitHub App receives webhooks on push/PR. Each event creates a *Run*.
2. **Index.** [GitHub Linguist](https://github.com/github-linguist/linguist) detects languages, the matching SCIP indexer runs, the result is converted to SQLite, compressed, and uploaded to object storage. Repository *signals* (API contracts, events, dependencies) are extracted in parallel.
3. **Serve.** The MCP server lazily downloads and caches the per-repo SQLite "brain" and answers code-intelligence queries, authenticated with a revocable API token.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full design.

## Components

| Component | Stack |
| --- | --- |
| **Backend API + workers** | NestJS, Prisma/PostgreSQL, BullMQ/Redis |
| **Frontend** | React 19, Vite, Tailwind, Radix |
| **Code intelligence** | GitHub Linguist, Sourcegraph SCIP indexers, `scip` CLI, better-sqlite3 |
| **MCP server** | `@modelcontextprotocol/sdk` |
| **Object storage** | Any S3-compatible store (MinIO by default) |
| **Auth** | Login with GitHub (OAuth) + revocable API tokens |

## Quick start (Docker Compose)

Prerequisites: Docker, and a [GitHub App](#github-app-setup).

```bash
git clone https://github.com/razasaad/tessera.git
cd tessera
cp .env.example .env
# Fill in GITHUB_APP_ID, GITHUB_PRIVATE_KEY, GITHUB_WEBHOOK_SECRET,
# GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, VITE_GITHUB_APP_NAME, and SESSION_SECRET.
docker compose up --build
```

This starts Postgres, Redis, MinIO (with the bucket auto-created), runs migrations, and brings up the API (`http://localhost:3000`) and frontend (`http://localhost:8080`).

> The server image is large (~2–4 GB): it bundles the language toolchains and SCIP indexers required to index your repos. Provision disk accordingly.

The **first user to log in with GitHub becomes the admin/owner**. Everyone who logs in afterward lands in a pending state until an admin approves them under **Members**.

## Connect your coding agent (MCP)

1. In the Tessera UI, open **API Tokens** and create a token (copy it — it's shown once).
2. Point your agent at the MCP endpoint `POST <backend>/v1/mcp` with `Authorization: Bearer <token>`.

For Claude Code:

```bash
claude mcp add tessera --transport http \
  --url http://localhost:3000/v1/mcp \
  --header "Authorization: Bearer <your-token>"
```

The server (`tessera-code-intelligence`) exposes these tools:

| Tool | Purpose |
| --- | --- |
| `resolve_repository` | Resolve a repo by name/id and revision |
| `list_indexed_revisions` | List indexed commits for a repo |
| `search_symbols` | Fuzzy symbol search |
| `get_definition` | Go to a symbol's definition |
| `find_references` | Find all references to a symbol |
| `find_implementations` | Find implementations of an interface/type |
| `get_file` | Read file contents at a revision |
| `get_repository_intelligence` | Repository signals (API contracts, events, dependencies) |

## Deploy on Kubernetes (Helm)

A chart lives in [`charts/tessera`](./charts/tessera). For evaluation it can bundle Postgres, Redis, and MinIO; for production, disable those and point at managed services.

```bash
helm dependency build charts/tessera
helm install tessera charts/tessera \
  --set secrets.data.GITHUB_APP_ID=... \
  --set secrets.data.GITHUB_CLIENT_ID=... \
  --set secrets.data.GITHUB_CLIENT_SECRET=... \
  --set secrets.data.SESSION_SECRET=... \
  --set ingress.enabled=true --set ingress.host=tessera.example.com
```

See [`charts/tessera/values.yaml`](./charts/tessera/values.yaml) for all options (external datastores, autoscaling, resources, ingress/TLS).

## GitHub App setup

1. Create a GitHub App (organization or personal).
2. Permissions: **Repository contents: Read**, **Metadata: Read**, **Webhooks**.
3. Webhook URL: `<backend public url>/v1/github/webhook`; set a webhook secret.
4. **User authorization callback URL** (for "Login with GitHub"): `<backend public url>/v1/auth/github/callback`.
5. Generate a private key.
6. Put the App ID, private key, webhook secret, client id/secret, and app slug into your `.env` / Helm values.

## Local development

```bash
npm run install:all
docker compose up -d postgres redis minio minio-init   # datastores only
cd server && npm run db:migrate:deploy && cd ..
npm run dev    # server on :3000, frontend on :3001
```

## Configuration

All settings are environment variables; see [`.env.example`](./.env.example) for the full list (Postgres, Redis, S3-compatible storage, GitHub App, and `SESSION_SECRET`).

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md) and our [Code of Conduct](./CODE_OF_CONDUCT.md). To report a vulnerability, see [SECURITY.md](./SECURITY.md).

## License

[GNU AGPL-3.0](./LICENSE). If you run a modified version as a network service, the AGPL requires you to make your modified source available to its users.
