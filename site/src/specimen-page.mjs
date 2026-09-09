// The document that carries the specimen. It is generated rather than written
// by hand so that the eight sentences exist in exactly one place (steps.mjs)
// and the no-script fallback cannot drift from the interactive one.
import { STEPS, REPLAY_NOTE } from "./steps.mjs";

const escape = (text) =>
  String(text).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export function renderSpecimenPage({ identity }) {
  const steps = STEPS.map(
    (step, position) => `      <li>
        <p class="fallback-seen">${position + 1}. ${escape(step.seen)}</p>
        <p class="fallback-text">${escape(step.text)}</p>
        <p class="fallback-status is-mono">${escape(step.status)}</p>
      </li>`,
  ).join("\n");

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>A matter in motion · CourtWork ${identity.sha7}</title>
    <!-- The product's own stylesheet, copied at build time. The specimen draws
         the work surface with the product's code, so it must also carry the
         product's material. -->
    <link rel="stylesheet" href="./vendor-product/web/styles.css" />
    <link rel="stylesheet" href="./specimen.css" />
  </head>
  <body class="specimen-page">
    <div
      id="specimen"
      data-recording="./${identity.sha7}.json"
      data-sha7="${identity.sha7}"
    >
      <noscript>
        <p class="specimen-label is-mono">Replay · synthetic data · recorded at CourtWork ${identity.sha7}</p>
        <p class="fallback-lead">这一段记录下来的工作，在没有 JavaScript 时按步骤读。</p>
        <ol class="specimen-fallback">
${steps}
        </ol>
        <p class="fallback-note">${escape(REPLAY_NOTE[0])}</p>
        <p class="fallback-note">${escape(REPLAY_NOTE[1])}</p>
        <p class="fallback-note"><a href="./${identity.sha7}.json">Open in source</a></p>
      </noscript>
    </div>
    <script type="module" src="./shell.mjs"></script>
  </body>
</html>
`;
}
