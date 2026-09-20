# CW local secrets and hooks exploration

Date: 2026-09-20. Scope: bounded, read-only inspection of the current Courtwork main tree. The observed checkout is `main@83041d158cea01f2272f010c098d538617e0c3c6`. The working tree had only pre-existing untracked `.agents/`, `.obsidian/`, and `skills-lock.json`; this exploration did not read any personal data directory, credential value, provider endpoint, or external service, and did not edit the repository.

## Actual credential seam

- `app/server/credential-file.mjs:5-12,14-35` defines the current secret store: `$dataDir/credentials.json`, keyed by **connection ID**, separate from `runtime-state.json` and event/log records. Writes use a random temporary file, mode `0600`, then rename. The reader is internal JSON I/O, not a public readback API.
- `app/server/provider-connections.mjs:67-86` projects only `credentialStatus`; `:110-126` validates `apiKey` separately from the persisted connection record. The connection record stores endpoint, wire format, and model metadata while key bytes stay in the credential file.
- `app/server/service.mjs:193-202` has the central text redactor, replacing known secrets of length at least six with `[redacted]`. `:304-327` reads/migrates credential entries at startup and loads them into the Pi model runtime; `:1744-1777` activates a connection, writes keys, tracks credential generation/status, and returns public connection state. `:1836-1841` exposes provider configuration plus derived credential status, not key bytes.
- Runtime records retain references/epochs, not secret content: `app/server/store.mjs:81-129` validates descriptor provenance such as `credentialSource`, while `:581-592` validates `credentialGeneration`, provider configuration, and verification records. This is the binding-evidence seam, not a second secret vault.
- `app/runtime/pi-session-runtime.mjs:8,195-205` uses Pi's `InMemoryCredentialStore` and `envApiKeyAuth`; this is an in-process adapter handoff, not proof that CW can inspect, rotate, or safely export a user's native local-agent keys.

## Settings and Runtime/hook ownership

- The implemented provider/model Settings surface is `app/web/settings-view.mjs:142-194` (probe and save path), `:262-315` (connection rows/status), and `:487-505` (connection registry state). `providerProbeRequest` includes a key only when the user has entered one (`:183-194`); the UI renders status text such as “API key saved” (`:284-289`), never the key itself. The provider connection routes in `app/server/index.mjs` remain the host mutation/readback boundary.
- Runtime Control treats `secret` as a credential-status projection backed by the existing credential API and explicitly says there is no generic secret vault (`docs/runtime-control/INDEX.md:33-43`, especially `:36`). The `provider` resource is the existing provider configuration/lifecycle projection (`:33`); installed/running/exposed/permitted remain separate dimensions (`:43`). `docs/runtime-control/architecture.md:15` keeps provider/credential lifecycle and Run admission on the shared configuration queue, with active Runs frozen.
- Hooks appear in the Runtime Control resource vocabulary (`app/runtime/control-contract.d.ts` around the `hook`/`secret` resource definitions), while trusted extension catalog/lifecycle is owned by `app/runtime/extension-registry.mjs`. This supplies a possible Host-owned binding/policy seam; it does not establish a local-agent hook manager or an install path. Do not add implicit hooks to local Pi/Hermes or import CC Switch hook state from this evidence.
- The target hierarchy remains Agents → Agent profiles/Runtimes, with Models retaining provider configuration and Developer retaining diagnostics (`engineering/research/architecture-node-2026-09-13/local-agent-runtimes-20260920.md:64-77`). That ruling is future guidance and must not be read as an implemented local-key or hook manager.

## Existing CC Switch recall and what it can support

`engineering/research/architecture-node-2026-09-13/explore/cc-switch-consumption-20260920.md:1-5` pins CC Switch v3.20.3 at upstream SHA `d695a2d77fd9081eafd3e9eedcbf2a97b3410928` and records a read-only manual inspection. The report says provider profiles and native-file projection are distinct from runtime orchestration (`:9-25`) and explicitly rejects treating CC Switch as a CW gateway, credential owner, child scheduler, recovery authority, or cancellation authority (`:33-36`). The local runtime ruling consumes only explicit application/profile scope, visible native-file projection, and restart disclosure, then preserves CW's Provider owner and future-Run binding (`engineering/research/architecture-node-2026-09-13/local-agent-runtimes-20260920.md:137-143`). It is a documentation precedent, not an implementation or a safe import channel for local secrets.

The current checkout is `main@83041d…`, while the local runtime ruling records an observed CW source of `main@72c91a2…` at `:3`. Treat that source hash as the ruling's evidence baseline, not as the current code revision. The CC Switch upstream pin is independently explicit and remains usable for provenance.

## Recommended existing owner seams

1. Keep user-entered local/provider keys in the existing Provider/Models path: provider-connections validation, credential-file persistence, service activation, and `credentialStatus` projection. A future Settings control should reuse this configuration queue/CAS boundary and active-Run freeze rather than create an Agent-profile secret field.
2. Treat a local agent's native key store as external/native-owned unless a concrete adapter contract proves otherwise. CW may hold a reference/status and explicit permission/effect records; it should not copy native files, silently sync CC Switch profiles, or claim it can rotate/read back native secret bytes.
3. Put any future local-agent hook binding behind Runtime Control/Host admission and the trusted extension lifecycle owner. A hook declaration or Settings switch cannot grant executable authority; installed, connected, exposed, permitted, and actually enforced remain separate facts. The current technical Runtime surface remains Developer-owned until a real consumer exists.
4. Use CC Switch only for scope/projection/restart semantics. A switch should be described as affecting future configuration/next Run; native in-flight session rebinding, recovery, and cancellation remain unknown unless a runtime-specific adapter proves them.

## Insecure overclaims to avoid

- “API key saved” is a boolean/status projection, not key readback or proof of provider validity. Directory discovery/test sends the entered key to the endpoint (`app/web/settings-view.mjs:183-194`); it is not a no-leak guarantee.
- `readCredentialFile` is a private host reader, not a general vault API. `knownSecrets` redaction is defense-in-depth and only replaces tracked values of length at least six; it does not prove every child process, native log, hook, or imported file is scrubbed.
- A `credentialSource`, generation, verification receipt, or `configurationStatus` is evidence about binding/state, not the credential itself and not proof that an external Runtime or hook enforces permissions.
- CC Switch's documented local database/native projections must not be called CW credential management. The pinned recall leaves restore-to-native-file behavior and native-session rebinding unknown; no provider trial or personal-configuration inspection turns those unknowns into guarantees.

Conclusion: the existing Provider credential file + service activation + public status projection is the concrete owner seam. Runtime Control/Host and the trusted extension registry are the only existing places to hang a future hook contract. No new local-secret store, CC Switch registration, provider call, or product implementation is justified by this read-only evidence.
