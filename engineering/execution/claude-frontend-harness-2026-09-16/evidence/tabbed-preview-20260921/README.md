# 06d evidence · A1, A2 (CE-F2) and tabbed Preview

Author: Claude (Opus). Branch `claude-tabbed-preview-20260921`, worktree `.worktrees/courtwork-tabbed-preview-20260921`, base `b714c08`.

| Commit | Scope |
|---|---|
| `90be9af` | A1 · an absent Agent profile model note appends nothing |
| `dfc90b7` | A2 · CE-F2 Work location opens at its title, not on Disconnect |
| `736e0f7` | B · tabbed Preview replaces the right-side card launcher (**source SHA for review**) |

Change record (written before B's code): [06d § Author change record](../../06d-surface-continuity-20260921.md#author-change-record--written-before-bs-code-2026-09-21-opus).

## Tests

- Full suite at `736e0f7`: **1388/1388**, exit 0 — [logs/full-2.log](logs/full-2.log). The first full run had one failure (`spark-routing` injects the removed `activateSurface`); fixed in the same commit.
- A1: regression fails on old source (prints `…no model request.nullRuntime detail`) — [a1-before.log](logs/a1-before.log); passes after — [a1-after.log](logs/a1-after.log). The test swaps in a platform-faithful `append` (null → "null") so it doesn't inherit tiny-dom's null filtering.
- A2: `workspace-card.test.mjs` 20/20 — [f2-after.log](logs/f2-after.log); neighbouring owner suites 86/86 — [a2-owner.log](logs/a2-owner.log).
- B: `preview-tabs.test.mjs` (12) covers identity, duplicate open, recorded versions, close active/inactive/last, crossed Work, strip roles/keys/focus, words from owner facts, and late reads through the real `createFileView`.
- `tools/check-doc-links`, `lint-colors`, `lint-interaction`, `lint-materials` and `contrast-report` all pass.

## Browser (real Host, real page, headless Chrome with a throwaway profile, CDP mouse and keys)

Fixture: the built-in Local test provider's `/fixture script` makes real objects through the Host's own `ws_write`/`cw_present`. No key, no paid call, no real site.

```bash
app/../engineering/execution/claude-frontend-harness-2026-09-16/evidence/tabbed-preview-20260921/harness/run.sh <tree>/app tabs after <out> <scratch> 8963
```

Replace `tabs` with `location` for CE-F2, or with `launcher` (before tree only) for the old card rail. The runner refuses 8787/8899 and any port already in use, and stops its Host afterwards. For a manual look, run `node harness/start.mjs --app <tree>/app --data <dir> --folder-root <dir> --port 8963` and open `http://127.0.0.1:8963`.

- **B journey: 34/34** — [checks](browser/tabs-after-checks.json), [measurements](browser/tabs-after-measurements.json). Steps: Workspace from the header entry → long current file (name truncated on the tab, full path in its accessible name) → recorded v1 from Chat → ← Chat plus a composer draft → presentation as a second tab → ArrowLeft back, reading position 1200 restored → close the unselected tab → Escape (draft and thread position intact) → reopen the same row (no duplicate, reading restored) → late v2 read after a switch doesn't paint → late read after Delete-close doesn't recreate the tab → Work B shows none of A's tabs and opens its own Workspace → back in A, tabs, selection, reading and draft are A's → Settings over Preview and back. Also covered: 1920 three-pane, Expand → Restore (first Escape) → hide (second Escape); the 390 modal sheet; dark mode.
- **Before B** (`b714c08`): [card rail](browser/launcher-before-01-cards-1440.png); [a second recorded version replaces the first](browser/launcher-before-03-second-version-replaces-1440.png).
- **CE-F2 before/after**, 1440 and 390, long path: [before](browser/location-before-measurements.json) vs [after](browser/location-after-measurements.json) (21/21 checks). Before: a staged, prepared or bound panel starts on Remove/Disconnect, scrolled 87–343 px with title and Close out of view, and preparing/unknown panels leave the keyboard outside on the chip. After: each starts on Close with scrollTop 0 and title and Close in view. A fresh Home still starts on the chosen project, and an unbound chat on Connect folder. Escape still returns to the entry, a deliberate click on the composer keeps its focus, and the locks and their reasons are unchanged.

## Not executed

Native (WKWebView) shell geometry, real 200% zoom, reader mode, forced-colors, VoiceOver, touch. The 390 capture uses viewport emulation, not a device. OpenAI computer use is not available here; Codex retains that pass.

## Follow-up registered, not done

User question 2026-09-21: put Back/Forward in the top-left title band after macOS window controls (Claude/Codex pattern). The existing `--native-controls-inset` / `--native-toolbar-height` reservation (`shell-layout.mjs`, `html[data-shell="desktop"]` rules) is the hook. This is a left-navigation change, which 06d defers, so it's for the separately accepted left-rail increment.
