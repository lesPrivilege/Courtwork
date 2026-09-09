# MR-T1 · Markdown reader browser baseline

Construction baseline: `a243a6c`. This is Terra's author evidence for the isolated read-only component; it does not claim host wiring, Core reads, annotation mutation, or product acceptance.

The fixture imports the actual `app/web/markdown-source.mjs` projector and `app/web/markdown-reader.mjs` component. Its source includes a leading BOM, CRLF, CJK, emoji, repeated text, HTML-looking input, HTTP and `javascript:` links, a long table, and Mermaid code. The fixture runs from static port `8978`; `browser.mjs` starts a fresh headless Chrome profile using CDP `20278` and terminates it after each run.

```sh
node evidence/markdown-reader-a1-20260910/terra/static-server.mjs
node evidence/markdown-reader-a1-20260910/terra/checks.mjs
```

`checks.json` records 28 passing assertions: the projector's source/position contract; inert semantic DOM; nested-link and copy-button keyboard behavior; stubbed-clipboard exact code/source copies; shared served SVG copy sprite and visible geometry; unique repeated source blocks; selection/raw inspection; outline focus; ArrowDown and Control-F focus return; find; source-mode disabled Find and focus return; detached build listeners; container-width layout (including no hidden inspector column and inline source panel); find exclusion for reader controls; unsupported-profile rejection; destroy; dark scheme; 390px overflow; internal table overflow; 200% scale; and no runtime exception.

The screenshots are rendered reader views at 1440 light/dark and 390 light/dark at 200%; `reader-1440-light-source.png` additionally records full raw source mode. The fixture makes no application API request; its static server maps `/web/` to `app/web/` so the shared SVG sprite loads on the same route used by the product host.

Additional author verification: `node --check app/web/markdown-reader.mjs`; `git diff --check`; `node tools/lint-colors.mjs`; `node tools/lint-materials.mjs`; and `npm --prefix app test` (**308 passed**).
