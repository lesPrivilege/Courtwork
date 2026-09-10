# Independent fixed-tree verification

This directory records a bounded, non-author rerun of the fixed Spark / BE-41
tree. It contains raw command output only; it is not a browser or product
acceptance record.

## Inputs

- Spark / BE-41 fixed tree: `0cbbf7e64fd145c5047c724fe7a24b599726cf49`
  (`0cbbf7e`). The detached worktree was clean apart from the read-only
  `app/node_modules` symlink used for dependencies.
- Entry disclosure fixed tree: `901d5f950daef85ca7e58a470a3d85f7785edd6e`
  (`901d5f9`). This is the separate Entry source named by the construction
  record; it is not silently treated as part of `0cbbf7e`.

## Results

The Spark / BE-41 command ran the five Spark frontend test files plus the two
BE-41 compatibility files:

```text
node --test app/tests/spark-live.test.mjs app/tests/spark-projection.test.mjs app/tests/spark-routing.test.mjs app/tests/spark-samples.test.mjs app/tests/spark-view.test.mjs app/tests/work-derivations.test.mjs app/tests/work-derivations-compatibility.test.mjs
```

It passed **77/77**, with zero failures, cancellations, skips, or todos. The
raw output is [spark-be41-targeted.log](spark-be41-targeted.log).

The Entry command ran against `901d5f9`:

```text
node --test app/tests/card-disclosure.test.mjs app/tests/summary-disclosure.test.mjs
```

It passed **22/22** (5 card-disclosure plus 17 summary-disclosure), with zero
failures, cancellations, skips, or todos. The raw output is
[entry-targeted-22.log](entry-targeted-22.log).

Syntax and whitespace checks also passed for the fixed Spark modules and the
two product diffs. The commands and their empty-success output are in
[static-checks.log](static-checks.log).

## Review boundary

This is deterministic Node-test evidence, including the compatibility tests'
synthetic authenticated loopback HTTP cases. It did not use a paid provider,
personal data, deployment, or an external service. It did not independently
accept the visual/native product surface: no CUA/browser matrix, real
Chromium 147 run, native CourtWork host, 200% zoom, forced-colors, IME,
soft-keyboard, VoiceOver, Q1/Q3 synchronization, or real BE-41 provider
service was exercised here. Those limits remain open from the construction
record.
