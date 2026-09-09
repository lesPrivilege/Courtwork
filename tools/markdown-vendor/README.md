# Fixed Markdown parser build

Run `npm ci` then `npm run build` in this directory. The lockfile pins every dependency; `app/web/vendor/markdown-parser-manifest.json` records its hash, packages and generated artifact hashes. No CDN or production package lookup is used. The accompanying LICENSES file includes all parser dependency notices; esbuild is build tooling only.

The bundle uses unified 11.0.5, remark-parse 11.0.0 and remark-gfm 4.0.1. The named-character decoder aliases the upstream dictionary entry so the same artifact runs in browsers and Node without a DOM. Upstream syntax parsing is retained; the host projects a closed semantic tree as `cw-markdown-block-v1`.

This profile intentionally differs from Chat's Marked/DOMPurify rendering: HTML is literal text, images are descriptions, only HTTP(S) links are actionable, and code has no executable plugins. BOM and CRLF remain in the original source; parser UTF-16 offsets map to original Unicode code-point positions. Tests cover references, duplicates, Unicode, unsafe content and read integrity. Neither AST nor block IDs are persistent review facts. See `docs/markdown-reader.md` at the repository root.
