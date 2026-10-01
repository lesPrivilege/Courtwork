# Source card: `@anthropic-ai/sandbox-runtime`

Draft for the architect. Consumer: RD-009 check containment (`check_run`).
Follows the source-card fields in [this directory's README](README.md#来源卡要求).

| Field | Value |
|---|---|
| Source ID | `ECO-SANDBOX-RUNTIME` |
| Observation date | 2026-09-29 |
| URL | npm `@anthropic-ai/sandbox-runtime`; repository <https://github.com/anthropics/sandbox-runtime> |
| Original date | 0.0.77 published to npm 2026-09-18T22:13:36Z |
| Release / commit | npm `0.0.77`, tarball integrity `sha512-uOe6kkAbo91r5shXXBxZ1DKbOpWmnXkNDDujXrFJRaHSG7D7s8b7Yfsu0pGDkYFgKZ2ECtVCNisl6pCYcaMF7A==` (shasum `8f6575229c2733d9ce303967e0d8551bce2a7000`); upstream `refs/tags/v0.0.77` resolves to `6fa731368807419ee157f9a3fac955fefe1019c6`. The npm metadata carries no `gitHead`, so tarball-to-tag correspondence is not verified. |
| Retrieval | `npm view`, `npm install --save-exact`, reading the installed `dist/` JavaScript and `README.md`; `git ls-remote --tags` for the tag |
| License scope | Apache-2.0 (package). Runtime dependencies pulled in: `zod` 3.25.76 (MIT), `commander` 12.1.0 (MIT), `node-forge` 1.4.0 (BSD-3-Clause OR GPL-2.0), `@pondwader/socks5-server` 1.0.10 (MIT). Bundled binaries: `vendor/seccomp/{x64,arm64}/apply-seccomp`, `vendor/srt-win/*/srt-win.exe`, `vendor/java-proxy-agent/srt-proxy-agent.jar`. |
| Pin | Exact `"0.0.77"` in `app/package.json`, locked in `app/package-lock.json`. |
| Consumer | `app/runtime/check-sandbox.mjs`, called from the single spawn site in `app/runtime/check-runner.mjs`; contract in [`app/docs/check-recipes.md`](../../app/docs/check-recipes.md#environment-policy). RD: [RD-009](../research/RD-009-trusted-harness-extensions.md). |

## Facts (read from 0.0.77 source or observed on macOS)

- API used: `SandboxManager.wrapWithSandbox(command, binShell, customConfig)`
  returns a shell command string; `SandboxManager.checkDependencies()`,
  `isSupportedPlatform()`, `cleanupAfterCommand()`. `wrapWithSandboxArgv` exists
  but on macOS/Linux only returns `[shell, "-c", <same string>]`.
- Config is accepted per call (`customConfig`), so concurrent checks with
  different paths need no shared state. `initialize()` always starts an
  in-process mux HTTP/SOCKS proxy (`sandbox-manager.js` `initialize`), and on
  Linux `socat` bridge processes, even with no allowed domain. Courtwork never
  calls it; with no initialised config, `wrapWithSandbox` gets no proxy port
  and the macOS profile carries no network allowance at all (observed).
- Remaining module state without `initialize()`: a bounded (1024) map of
  command texts for violation attribution, and on Linux a count of active
  sandboxes that `cleanupAfterCommand()` decrements.
- macOS profile (`macos-sandbox-utils.js` `generateSandboxProfile`): `(deny
  default)` baseline; allows `process-exec`/`process-fork`, a fixed mach-lookup
  list (includes `com.apple.coreservices.launchservicesd`, not
  `coreservicesd` or `appleevents`), `appleevent-send` and `lsopen` only when
  `allowAppleEvents` is set (default off). Reads are allow-all then
  `denyRead` minus `allowRead`; writes are allow-only. The library always adds
  `/tmp/claude`, `/private/tmp/claude` and a few `/dev` nodes to the writable
  set, and sets `TMPDIR=/tmp/claude` (or `$CLAUDE_CODE_TMPDIR`) in the wrapper.
- macOS runs `/usr/bin/sandbox-exec` by absolute path; `checkDependencies()`
  reports no error on macOS and does not check that binary exists. The README
  lists ripgrep as a macOS requirement; the 0.0.77 code only checks it on Linux.
- Linux (`linux-sandbox-utils.js`, read, not run): `bwrap --new-session
  --die-with-parent`, `--unshare-pid` with a fresh `/proc`, `--unshare-user`,
  `--unshare-net` (with no proxy sockets the network is fully blocked), then
  `apply-seccomp` blocking `socket(AF_UNIX)` and io_uring (not `socketpair`).
  `checkDependencies()` requires `bwrap`, `socat` and `rg` and probes uid-0
  capability. Ubuntu 24.04+ needs `kernel.apparmor_restrict_unprivileged_userns=0`.
- Linux helper path (read): the wrapped command is `bwrap … -- /bin/sh -c
  '<apply-seccomp> /bin/sh -c <command>'`. The helper path comes from
  `getApplySeccompBinaryPath` (`generate-seccomp-filter.js`,
  `<package>/vendor/seccomp/<arch>/apply-seccomp`) and nothing binds it into
  the sandbox; each `denyRead` directory becomes a `--tmpfs` and only
  `allowRead` entries are restored with `--ro-bind`. A helper under a denied
  directory is therefore not visible. `seccompConfig.applyPath` is read only
  from an initialised config, which Courtwork never creates.
- Observed on GitHub `ubuntu-latest` (Runtime workflow on `6692b91`,
  2026-10-01, log only): with the repository under `/home/runner`, a check
  whose working directory is outside the repository fails its preflight with
  exit 127, `apply-seccomp: not found`; a check whose working directory
  encloses `node_modules` starts. `check-sandbox.mjs` re-allows the helper's
  directory on Linux through a deep import of that lookup
  (`dist/sandbox/generate-seccomp-filter.js`; the package entry does not
  export it, and the package declares no `exports` map). That change has not
  run on Linux ([review of `6692b91`](../reviews/first-principles-6692b91-2026-10-01/README.md#linux-ci-clusters)).
- Observed on GitHub `ubuntu-latest` with the helper directory re-allowed
  (Runtime workflow on branch `claude/review-6692b91-20261001` at `be8f63d`,
  2026-10-01, log only): checks start with the working directory outside the
  repository; no network, read-denial of the data directory and reaping of a
  left descendant pass their tests. A write to the data directory's path
  succeeds inside the sandbox: a read-denied directory is a `--tmpfs`
  (`pushReadDenyDirMounts`), writable and discarded with the sandbox. That the
  real directory is unchanged is read from that mechanism; the test's
  assertion on it did not run.
- Linux exit status (observed in the same log, mechanism not established): a
  recipe killed by a signal surfaces to the Host's guard as an exit code, and
  a recipe that signals its own process group ends with 129. The guard's
  direct child is the wrapper chain, not the recipe.
- Observed on macOS 27 / Node 25.9 with synthetic stand-ins (spike, 2026-09-29):
  data-directory, home and other-Session reads denied (`EPERM`) directly and via
  `cat`; writes outside the per-check directory denied; TCP (public and
  loopback), UDP bind and DNS fail; `osascript` (-600), `launchctl submit`
  (exit 1, no job; the same command outside created the job) and `open -g`
  (-10810) start nothing; a detached own-session child outlives the check but
  stays sandboxed.

## Inferences

- Using `wrapWithSandbox` without `initialize()` is a supported code path
  (the code handles an absent config as "most restrictive") but not the
  README's documented flow; a later release could make `initialize()`
  mandatory.
- On Linux, `--unshare-pid` plus `--die-with-parent` should end every
  descendant when the check's process group is killed or exits.

## Unverified

- Linux beyond the log observations above: bubblewrap behaviour, the
  `/tmp/claude` deny, `node --test` under `apply-seccomp`, how `bwrap` and
  `apply-seccomp` propagate a child's signal, and whether the Host's group
  signal reaches a recipe behind `--new-session`.
- Whether the tarball was built from tag `v0.0.77`.
- Behaviour on macOS versions other than 27.

## Re-check triggers

A new `@anthropic-ai/sandbox-runtime` release considered for adoption; any
change to `wrapWithSandbox`'s signature, the default write paths, the macOS
base profile, `allowAppleEvents` defaults, the location or export of
`getApplySeccompBinaryPath`, or a requirement to call `initialize()`; a macOS release that deprecates or removes `sandbox-exec`;
an Ubuntu runner image change around unprivileged user namespaces; a security
advisory against the package or its dependencies.
