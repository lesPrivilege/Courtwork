# M1 inherited-property isolation scene

`isolation.html` is evidence scaffolding, not a product page. It imports the production `settingsRow`, `createRuntimeManagementController` and `createRuntimeManagementView`, plus the existing synthetic Runtime adapter. It renders:

- one labeled sibling Settings control in ordinary `.settings-block` containers;
- one untouched Runtime list;
- one Pi Runtime detail using the candidate boundary.

Each column prints its computed `--settings-group-gap`. Parent browser inspection confirmed root, Runtime mount/list, and sibling Settings remain `40px`; baseline Runtime detail is `40px`; candidate Runtime detail is `16px`; the final block retains `margin-bottom: 0`. This establishes inheritance containment in a rendered scene without adding a fake product form or changing shared CSS. It does not substitute for the full Runtime state matrix or prove other Settings pages visually accepted.

Reproduction uses `serve-preview.mjs` from `reproduce-previews.sh`, then opens `/isolation.html` on each printed URL.
