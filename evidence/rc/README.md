# evidence/rc · WO-RC runtime control UI

Base `9ef1710`, branch `claude/rc-runtime-ui`, worktree `/private/tmp/se-agent-rc`.
App on port 8850 with data dir `/private/tmp/se-agent-rc-data` (fresh, runtime
schema 4). Node v25.9.0. Real provider: **not_run** — this host reports
`capabilities.mode = "local-fake"`, and no real provider was configured or called.

## How to reproduce

```sh
npm --prefix app ci
npm --prefix app start -- --data-dir /private/tmp/se-agent-rc-data --port 8850 &
node evidence/rc/mcp-fixture.mjs &          # loopback Streamable HTTP MCP server, port 8851
node evidence/rc/seed-fixture.mjs           # project, session, one resource per supported kind
node evidence/rc/verify.mjs                 # all three suites -> the three JSON files here
node evidence/rc/shoot.mjs                  # the PNGs here
```

`seed-fixture.mjs` writes the MCP server pointing at `https://example.org/mcp`;
to exercise the lifecycle buttons, re-import it against `http://127.0.0.1:8851`
(HTTP is allowed on loopback only) and connect it once.

## Files

| File | What it is |
|---|---|
| `seed-fixture.mjs` | Creates the project, the session and one resource of every locally supported kind, through the app's own HTTP API only. |
| `mcp-fixture.mjs` | A loopback Streamable HTTP MCP wire fixture with two tools, one resource and one prompt. Not a service. |
| `runtime-ui-checks.mjs` / `.json` | One row per obligation in `docs/runtime-control/acceptance.md` "New frontend contract", asserted against the rendered DOM. 19/19. |
| `runtime-ui-counterexamples.mjs` / `.json` | Nine failing conditions created through the API, then driven through the product's own controls: the two 409s, inherit, MCP lifecycle, prompt draft, source inspector, absence of a retry. 9/9. |
| `runtime-ui-viewport.mjs` / `.json` | Overflow, touch targets, keyboard, reduced motion and Escape order at 1440 and 390, each in light, dark and reduced motion. 36/36. |
| `verify.mjs` | Runs the three suites in headless Chrome over CDP with the emulated media, and writes the JSON. The suites are plain page scripts and can also be pasted into a real browser. |
| `shoot.mjs` | Captures the PNGs below, driving the same controls. |
| `planned-fixture.html` | A static mock of the capabilities that were drawn and then removed (WK-27). **Not linked from the product and not in the server's STATIC allowlist**, so it is not reachable from the app. |
| `app-tests.txt` | `npm --prefix app test` tail: 134 pass, 0 fail — the same count as the backend acceptance record. |

## Screenshots

| File | View |
|---|---|
| `runtime-module-1440-light.png` / `-dark.png` | The runtime module in the inspector at 1440×900. |
| `runtime-module-390-light.png` / `-dark.png` | The same module as a full-width work surface at 390×844. |
| `runtime-mcp-1440-light.png` | The MCP server object row, its state words, its lifecycle buttons and its indented remote tools. |
| `settings-context-1440-light.png` / `-dark.png`, `settings-context-390-*.png` | The Settings entry point and the next-run context bar. |
| `settings-planned-1440-light.png` | The Planned disclosure, opened. |
| `run-recorded-context-1440-light.png` | The recorded runtime binding inside the existing Run inspector. |

The dark files are byte-identical to their light counterparts at 390 and nearly
so at 1440: the product fixes `color-scheme: light` in `styles.css:2` and has no
dark palette at this base. The runtime module adds no colour of its own, so it
follows the product in both media rather than leaking half a dark theme. Recorded
as gap B-7 in `engineering/mvp/execution/work-surface-kit/runtime-ui-gaps.md`.
