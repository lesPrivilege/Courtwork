# Interface component contract

2026-09-07. This consolidates the composer, message flow and workspace hierarchy after the user's latest screenshot and request. Main composition remains Navigator / Work / Inspector. Earlier reading-mark color experiments are superseded.

## Shape and controls

| Token            | Value | Responsibility                                     |
| ---------------- | ----- | -------------------------------------------------- |
| radius-small     | 4px   | Inline code, compact tooltip                       |
| radius-control   | 8px   | Buttons, inputs, navigation selection              |
| radius-card      | 12px  | Independent workspace and overview modules         |
| radius-container | 16px  | Composer, message bubble, dialog, overview popover |
| radius-pill      | 999px | Compact floating return-to-latest control          |

The round send control remains a circle because it is square. Desktop controls have 32px hit regions; below the navigation breakpoint they have 44px hit regions. Glyphs are separately sized: ordinary controls 18px, response copy 16px, message copy/edit and run disclosure 14px. Visual glyph size must not shrink the hit region. Primary actions use fill, secondary actions a border, repeatable local utilities flat buttons. Focus visibility and accessible names remain mandatory; an icon's appearance is not its accessible name.

## Chat composition

User input is an immutable message record aligned right, sized to its content with an 82% desktop / 88% narrow maximum. Its bubble encloses only the text. A quiet footer contains recorded run-start time and always-available copy/edit utilities. The backend has no separate message timestamp; the time's accessible label and full-date title explicitly identify it as run start. No current-clock or inferred message time is fabricated.

Each agent run is a semantic section containing its tools, permission requests, answers, output and completion footer. The section is visually open so prose remains a continuous reading surface. Cards are reserved for actionable requests and independent workspace modules, not every runtime row.

`Edit as new message` opens a native dialog and prepares a new draft. Original message and run remain intact. Cancel preserves the composer. `Use as draft` replaces it explicitly, queues the existing draft persistence and returns focus to the composer; it never sends. An existing composer draft is disclosed before replacement. A stale editor cannot write into another session or a readonly submission. Unconfirmed command IDs and their original input are preserved.

## Workspace composition

The workspace file view groups paths by their actual parent directory. Folder cards have one heading/count and simple file rows; directory names are not reinterpreted as review states. Add material opens the existing material form. Existing extension-renderer ownership remains intact.

The session overview separates Workspace, Runs and Session settings into modules. Run history exposes recorded runs already loaded for the session and links to the existing authoritative run inspector. It does not claim additional review, fork, history rewrite, search or archive capabilities.

## Ownership

- `user-message.mjs`: input record presentation and callback-only copy/edit actions.
- `workspace-view.mjs`: file groups, session overview and run-history presentation.
- `thread-projection.mjs`: server-event projection, including recorded run-start time.
- `app.mjs`: sole owner of session state, async generations, run admission/recovery, draft persistence, navigation, dialog/renderer lifetime.

Views do not own a second session store or independently fetch data. Run grouping does not duplicate or reorder the server event projection. Existing renderer and unsaved extension state survive surface close/reopen.

## Verification

119 backend tests pass; 14 pre-existing surface/receipt counterexamples pass; four added edit/focus counterexamples cover cross-session, readonly admission, unresolved-command preservation and disabling a focused Stop control. Actual browser verifies cancel preserving a draft; using an edit changes only the composer while original input and five existing runs remain; history opens the selected run; workspace directory cards link into file inspection and material management. Synthetic UI verification makes no paid provider calls.

Run details now include the session title, recorded start time and an input excerpt, so a historical run remains identifiable after navigation. The composer swaps Send and Cancel in the same circular slot; an actual local waiting run confirmed a 44×44 Stop region, then cancelled successfully. Request cards use the neutral 12px card radius, without a colored side rule. A final keyboard cancellation check after reconnect confirmed focus returns to `composer-input`, Send is restored and interrupted tools no longer display working.
