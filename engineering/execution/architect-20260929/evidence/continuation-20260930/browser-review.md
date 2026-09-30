# Independent browser review

Parent-operated Codex in-app browser, 2026-09-30. The [fixture](browser-fixture.mjs) started the real Host/Pi plumbing from clean `0ae5ae2`, using only Local test and an explicitly injected synthetic unknown RuntimePort outcome. [Startup identity](browser-fixture-info.json). Frontend files were reloaded after the R30-2 changes at `5c03d78`; these changes did not alter the running Host code. No user Host, personal data or paid model was used.

## Observed outcomes

- Home showed the synthetic unknown Run under "Needs a look" as **Unknown**. Its chat showed the retained unknown-outcome reason; Chat overview showed **Latest · Unknown**, not Failed. The inline measurement row said "Status unavailable"; no token/usage fact was inferred from that label.
- Opened the real private-candidate `check_run` approval and approved it through the UI. The known failing synthetic pagination test returned **Exit 1**, while the enclosing scripted Run completed. The [HTTP readback](browser-checks.json) records one `check.started`, one completed check with exit code 1 and a completed Run. Passing execution does not mean passing assertions or formal acceptance.
- Sent another check through the UI and used **Stop working** while its approval was pending. The card became **Check closed**, the Run became **Cancelled**, and Send returned. HTTP readback confirms zero check starts for that Run.
- After reloading R30-2, the decided check's scope stated the recorded **minimal environment**, with no inferred historical sandbox.
- Sent a valid synthetic `repo_write` plus `check_run` sequence. Approved only the write to `review-note.md` in the private candidate. The live check card named that file/hash and stated this Host's sandbox. Denied the check. The expanded historical card read: "This approval names 1 file the model wrote; the execution environment was not recorded:". It did not claim the denied check ran. HTTP readback confirms one confirmed write and zero check starts for this Run.
- The browser error log was empty at cleanup. The tab was closed and the owned fixture received SIGTERM; it exited 0, closed its Host, removed its temporary Host/repository roots and retained only [result metadata](browser-fixture-results.json).

One attempted fixture prompt contained an unescaped newline inside JSON. The Local test provider treated it as ordinary text and performed no tool call. It is the extra completed, zero-write/zero-check Run in the HTTP record, not product or capability evidence. It was corrected with structured JSON serialization.

## Limits

Actual browser behavior and screenshots were inspected in this chat; image files are not retained in this packet. The durable evidence is the reproducible fixture, source identity and token-free HTTP/result readings. No arbitrary DSH GUI operation, alias-conflict Settings browser scene, lost HTTP acknowledgement, Host restart in this browser pass, real-provider capability, physical touch, accessibility matrix or whole-product UX acceptance is claimed. Older source-pinned restart tests remain separate evidence. The subsequent Work integration extraction requires its own checks.
