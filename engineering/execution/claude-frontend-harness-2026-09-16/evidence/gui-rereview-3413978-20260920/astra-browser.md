# Astra browser delta check — 2026-09-20

Candidate: `34139788b16f60866e4c7abc947f428ccdc1c8f5`, detached independent review tree. Baseline main remains `72c91a2f070cc8e134f1d09cebc7de735ff89415`.

OpenAI computer use opened an isolated local Host at port 8884 with a newly created synthetic data directory. No provider, personal credentials or production data were used. The in-app browser initially showed Projects 0 and Continue 0; opening the example showed Projects 2, Attention 1 and Continue 7. Clicking **Close the example** then showed Projects 0, Continue 0 and its condition sentence, with no Attention or Activity block, without reloading. This independently closes the originally reproduced F-01 example-exit failure. Project switching and asynchronous generation behavior are covered by Luna's source-path review, not claimed as live observations here.

The temporary browser tab was closed and the local Host stopped. The synthetic data directory is retained for later preservation/cleanup; its current local path is recorded outside the repository in `/tmp/cw-gui-rereview-341-data-path`. No zoom, burst, approval or broad matrix acceptance follows from this bounded observation.
