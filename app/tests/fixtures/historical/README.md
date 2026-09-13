# Fixed historical test inputs

`manifest.mjs` is consumed by the compatibility tests and `app/scripts/check-historical-fixtures.mjs`. Its paths are relative to `app/`; the named commits are ancestors of the review baseline `24bd9545936dd19a498fc6b7eed5de106ac0d5e8`. Use a full-history clone. Missing commit/path objects fail the preflight before the suite; tests are never skipped.

`schema3/manifest.json` pins the original five-file dependency closure from `b26670c8975bd9bd2666a856be55b80fcb2963fc`, with a SHA-256 for each unmodified file. This commit is not a main ancestor; a surviving archive ref may expose it, but ordinary main history is not a sufficient input contract. Committed bytes let the actual old host open a separate schema3 backup without relying on that archive branch. These are read-only historical implementation fixtures under the repository license, not production code or replacement current implementations.

Preserve source commit, paths and hashes when adding a historical input. Do not remove migration/rejection assertions to accommodate missing history. Temporary stores use the OS temporary directory, close their locks, and remove synthetic data on completion, including assertion failure.
