# HL-T3 synthetic trace fixture receipt

`app/tests/fixtures/attention-trace/` contains synthetic vectors and an executable validator (`node tests/fixtures/attention-trace/run-validation.mjs`, from `app`). It covers proposal edit → native draft → second human edit → verified effect; stale and duplicate decisions; unavailable times and unknown effects; duplicate surfacing; and unpresented sampled items whose labels explicitly prohibit scoring.

Run from `app`: `node --test tests/attention-trace-fixture.test.mjs`.

The runner validates only internally consistent fixture evidence. It is not the deferred production trace schema, persistent trace owner, analysis/report, preference learner, calibration calculation, or product acceptance. Missing labels remain non-scores and no vector claims an acceptance rate, accuracy, or calibration result.
