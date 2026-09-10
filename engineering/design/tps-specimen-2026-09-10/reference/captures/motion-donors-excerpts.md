# Motion donors — raw excerpts (curl + HTML-strip / DOM read, captured 2026-09-10)

## transitions.dev (https://transitions.dev/)
Card list includes (title / one-line description, text-stripped from live HTML):
- "Number pop-in" — "Digit flip with blur and stagger"
- "Notification badge" — "Diagonal slide with spring pop-in"
- "Spinning counter" — "Digits spin like a reel to the value"
- "Thinking states" — "Status line shimmers, then swaps to the next"
- "Reasoning stream" — "Agent reasoning scrolls by two lines"
- "Streaming text" — "Words resolve through a soft cross-blur"

Reduced-motion pattern (grep of raw HTML found 9 separate
`@media (prefers-reduced-motion: reduce)` blocks, one per animated component).
Example (brand mark hover, representative of the site-wide pattern):
```css
.brand, .brand-mark { transition: transform 400-500ms cubic-bezier(0.22,1,0.36,1); }
@media (prefers-reduced-motion: reduce) {
  .brand, .brand-mark { transition: none; }
  .brand:hover, .brand:hover .brand-mark { transform: none; }
}
```
→ site-wide convention: reduced-motion sets `transition: none` and cancels the transform,
i.e. a hard snap to the end state, not a shortened animation.

## beui.dev (https://beui.dev/components/motion/number)
Page intro: "Animated number primitives for count-up values, rolling tickers, and
fixed-slot digit swaps."

Component "Number Ticker" (`number-ticker.tsx`) — "Slot-machine rolling digits with
staggered entry." Source-level comment found in the page's embedded code sample:
```
// Stagger is an entrance flourish. Once the reveal has played, value
// changes roll every digit immediately — a per-digit delay on live updates
// reads as lag.
```
Default props read from the same page: `duration` 0.18s per glyph, `stagger` 0.006s
between glyphs (Digit Swap primitive); reduced-motion handling in the transition object:
```
duration: reduceMotion ? Math.min(duration, 0.12) : duration,
delay: reduceMotion ? 0 : position * stagger,
```
→ reduced-motion here clamps to a short duration (≤120ms) and removes stagger delay,
rather than transitions.dev's harder `transition: none` snap. Two different reduced-motion
conventions exist across these donors; do not average them into a single number.

Component "Dynamic Island" (`/components/blocks/dynamic-island`) — "iOS-style island pill
that morphs between live activity views with bouncy shell resize and blur crossfades."
(state-transition precedent for a status readout moving between streaming/idle/error
shapes, not a numeric-value precedent.)

## 60fps.design (https://60fps.design/)
Tag index (full alphabetical list parsed from live HTML) confirms "Counter" and "Ticker"
exist among the 108 tags, alongside the previously-verified set (AI / Apple / Badge /
Blur / Bottom Sheet / Button / Chat / Drag / Loading / Morph / Onboarding / Scroll /
Shimmer / Tabs). Per WK-124/scout ruling, only behavior is taken from this donor, no
screen recordings are copied; this pass confirmed the tags exist and did not open
individual Counter/Ticker storyboards (video-level behavior of any single shot is not
claimed as verified here).
