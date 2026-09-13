# Final Frontend Attention Audit — Models

This bounded audit applies the supplied Frontend Attention Audit to the model picker and Models save explanation. The governing rule is to keep the default surface decision-ready—saved object, distinct draft, control, action and scope—and move provider plumbing or capability provenance behind a disclosure. Status remains a fact, not narration.

## Disposition

- The modal is titled **Model**. The saved model remains labeled **Saved**. A different selection stays visible as **Draft · [model name]** even while **Change model** is collapsed; when another provider has the same display name or model ID, the visible name also includes its existing connection/group label, falling back to provider ID. Unambiguous names stay plain. The repeated “Next runs” sentence is removed.
- Connection, API, saved/draft model IDs, context-window status, and reasoning-capability source or uncertainty sit in the collapsed **Model details** disclosure. Unknown or unsupported effort presents **Provider default** in the control and explains its provenance in details. An invalid saved effort remains an explicit unavailable option and still blocks saving until resolved.
- The action is **Set default**, with scope **All chats · future runs**. Model selection remains a draft until this action; its existing versioned configuration save remains in place and does not send a model prompt. Native dialog close and focus restoration are unchanged.
- The Models form explanation now says: **“Save and ask once sends one short prompt to the selected model. Nothing else is sent.”** This explicitly scopes the prompt to that action; **Save only** remains separate.

Implementation is limited to [model-picker.mjs](../../../app/web/model-picker.mjs#L39) and the scoped Models prompt notice in [settings-view.mjs](../../../app/web/settings-view.mjs#L862); no service or schema changes were made. The existing versioned config write and native close/focus restoration remain unchanged. The nearest precedent is the original `createModelPicker` Saved/Draft grammar in `model-picker.mjs`; this only extends that visible identity for cross-provider collisions.

The DOM regression uses two providers with the same model name and ID: Saved takes the registered endpoint host label, while Draft falls back to the other provider ID when its connection label is absent. Existing unambiguous Saved/Draft assertions remain plain.

The Context and Workspace observations in [the earlier browser review](attention-visual-review.md) were not changed by this slice. The report is a source/test verification; Astra owns the post-change browser capture. No real model request or browser session was run here.

## Verification

With Node v22.19.0, `node --test app/tests/model-picker-dom.test.mjs` passed 3/3 tests and `node --test app/tests/models-connections.test.mjs` passed 29/29. `node tools/lint-interaction.mjs`, `node --check` for the edited JavaScript files, `git diff --check`, and `node tools/check-doc-links.mjs` also passed. The DOM cases cover saved/draft identity, cross-provider name/ID ambiguity, collapsed details, unknown and unsupported provenance, provider-default presentation, and preservation of invalid saved effort.
