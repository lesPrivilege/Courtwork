// Render the page.
//
// One document, Chinese-led, no framework and no build-time templating engine:
// the copy is data (copy.mjs), this file arranges it, and every number it
// prints comes from the recorded evidence rather than from the copy.
import { NAV, HERO, RAW_GOVERNED, MATTER, ARCHITECTURE, REVIEW, EVIDENCE, CLAIMS, BUILD, FOOTER } from "./copy.mjs";
import { STEPS, REPLAY_NOTE } from "./steps.mjs";

const REPO = "https://github.com/lesPrivilege/Courtwork";
const BLOB = (p) => `${REPO}/blob/main/${p}`;
const TREE = (p) => `${REPO}/tree/main/${p.replace(/\/$/, "")}`;

const escape = (text) =>
  String(text).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** Backticks become <code>; nothing else in the copy is markup. */
function inline(text, fill) {
  return escape(fill(String(text)))
    .split("`")
    .map((part, index) => (index % 2 ? `<code>${part}</code>` : part))
    .join("");
}

/** Turn a repository path in the copy into a link a reader can open. */
function entryLink(entry, fill) {
  const text = inline(entry, fill);
  if (!/^[A-Za-z0-9_.\-]+(\/|$)/.test(entry) || entry.startsWith("npm ") || entry === "—") return text;
  const href = entry.endsWith("/") ? TREE(entry) : BLOB(entry);
  return `<a href="${escape(href)}"><code>${escape(entry)}</code></a>`;
}

const STATUS_CLASS = (status) =>
  status.startsWith("verified") ? "is-verified" : status.startsWith("runs") ? "is-local" : "is-not-yet";

export function renderPage({ identity, evidence, recording, diagram }) {
  // Placeholders the copy carries, filled from the release identity.
  const fill = (text) =>
    text
      .replaceAll("{sha7}", identity.sha7)
      .replaceAll("{site_sha7}", identity.site_sha7)
      .replaceAll("{source_sha}", identity.source_sha);

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CourtWork · ${escape(HERO.h1[0])}</title>
    <meta name="description" content="${escape(HERO.lede)}" />
    <link rel="stylesheet" href="./tokens.css" />
    <link rel="stylesheet" href="./site.css" />
  </head>
  <body>
    <a class="skip" href="#main">跳到正文</a>
    ${header()}
    <main id="main">
      ${hero(fill)}
      ${rawGoverned(fill, recording)}
      ${matter(fill)}
      ${architecture(fill, diagram)}
      ${review(fill)}
      ${evidenceSection(fill, evidence)}
      ${build(fill)}
    </main>
    ${footer(fill, identity)}
    <script type="module" src="./site.mjs"></script>
  </body>
</html>
`;
}

function header() {
  return `<header class="masthead">
      <p class="wordmark">${escape(HERO.wordmark)}<span class="tagline">${escape(HERO.tagline)}</span></p>
      <nav aria-label="Site">
        ${NAV.map((item) => `<a href="${escape(item.href)}">${escape(item.label)}</a>`).join("\n        ")}
      </nav>
    </header>`;
}

function hero(fill) {
  return `<section class="hero" aria-labelledby="h1">
        <h1 id="h1"><span lang="en">${escape(HERO.h1[0])}</span><span>${escape(HERO.h1[1])}</span></h1>
        <p class="lede">${escape(HERO.lede)}</p>
        <p class="actions">${HERO.actions
          .map((a) => `<a href="${escape(a.href)}">${escape(a.label)}</a>`)
          .join("")}</p>
        <figure class="shot">
          <img src="./media/home-1440-light.png" alt="CourtWork Home：两个 Project，Today 带三格，一个 Chat 在 Waiting for you。" width="1440" height="900" />
          <figcaption>${inline(
            "CourtWork `{sha7}` · synthetic data · local deterministic provider · 1440×900 light · Home：两个 Project，一个 Chat 在等待一次写入批准。",
            fill,
          )}</figcaption>
        </figure>
      </section>`;
}

/** The three layers, filled with a real excerpt of the recording. */
function rawGoverned(fill, recording) {
  const runA = recording.runOrder[0];
  const events = recording.events[runA].events;
  const projection = recording.surface.pending.projection;
  const context = recording.context[runA];

  const excerpts = {
    events: events
      .slice(0, 14)
      .map((event) => `${String(event.seq).padStart(3, "0")}  ${event.type}`)
      .join("\n"),
    surface: [
      `matter        ${projection.title}`,
      `sources       ${projection.sources.length}`,
      `candidates    ${projection.candidates.length}`,
      `decisions     ${projection.decisions.length}`,
      `stateVersion  ${projection.stateVersion}`,
    ].join("\n"),
    context: [
      `mode          ${context.mode}`,
      `revision      ${context.binding.revision}`,
      `hash          ${context.binding.hash}`,
      `resources     ${context.binding.resources.length}`,
      `loaded        ${context.loaded.length}`,
      `tokenUsage    input ${context.tokenUsage.input} · output ${context.tokenUsage.output} · turns ${context.tokenUsage.turns}`,
    ].join("\n"),
  };

  return `<section class="section" id="layers" aria-labelledby="layers-title">
        <p class="index">${RAW_GOVERNED.index}</p>
        <h2 id="layers-title" lang="en">${escape(RAW_GOVERNED.title)}</h2>
        <blockquote class="pull">
          <p lang="en">${escape(RAW_GOVERNED.quote[0])}</p>
          <p>${escape(RAW_GOVERNED.quote[1])}</p>
        </blockquote>
        <p class="lede">${escape(RAW_GOVERNED.lede)}</p>
        <div class="tabs" data-tabs="layers">
          <div class="tab-strip" role="tablist" aria-label="${escape(RAW_GOVERNED.title)}">
            ${RAW_GOVERNED.tabs
              .map(
                (tab, index) =>
                  `<button type="button" role="tab" id="tab-${tab.id}" aria-controls="panel-${tab.id}" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}" lang="en">${escape(tab.label)}</button>`,
              )
              .join("\n            ")}
          </div>
          ${RAW_GOVERNED.tabs
            .map(
              (tab) => `<section class="tab-panel" id="panel-${tab.id}" role="tabpanel" aria-labelledby="tab-${tab.id}">
            <h3 lang="en">${escape(tab.label)}</h3>
            <p>${escape(tab.text)}</p>
            <p class="status ${STATUS_CLASS(tab.status)}">${escape(tab.status)}</p>
            <pre class="excerpt"><code>${escape(excerpts[tab.id])}</code></pre>
          </section>`,
            )
            .join("\n          ")}
        </div>
        <p class="caption">${escape(fill(RAW_GOVERNED.caption))}</p>
      </section>`;
}

function matter(fill) {
  return `<section class="section" id="matter" aria-labelledby="matter-title">
        <p class="index">${MATTER.index}</p>
        <h2 id="matter-title" lang="en">${escape(MATTER.title)}</h2>
        <blockquote class="pull"><p>${escape(MATTER.quote)}</p></blockquote>
        <p class="label is-mono">${escape(fill(MATTER.label))}</p>
        <iframe
          class="specimen-frame"
          src="./specimen/index.html"
          title="${escape(MATTER.title)}"
          loading="lazy"
        ></iframe>
        <p class="note">${escape(MATTER.note)}</p>
        <ol class="steps">
          ${STEPS.map(
            (step, index) => `<li>
            <p class="step-seen"><span class="step-number">${index + 1}</span><span lang="en">${escape(step.seen)}</span></p>
            <p>${escape(step.text)}</p>
            <p class="status ${STATUS_CLASS(step.status)}">${escape(step.status)}</p>
          </li>`,
          ).join("\n          ")}
        </ol>
        <p class="caption" lang="en">${escape(REPLAY_NOTE[0])}</p>
        <p class="caption">${escape(REPLAY_NOTE[1])}</p>
      </section>`;
}

function architecture(fill, diagram) {
  return `<section class="section editorial" id="architecture" aria-labelledby="architecture-title">
        <p class="index">${ARCHITECTURE.index}</p>
        <h2 id="architecture-title"><span lang="en">${escape(ARCHITECTURE.title[0])}</span><span class="zh">${escape(ARCHITECTURE.title[1])}</span></h2>
        ${ARCHITECTURE.paragraphs
          .map(
            (text, index) =>
              // Which part of the picture each paragraph is about. The third
              // paragraph is about the loop as a whole, so it sharpens nothing
              // and dims nothing.
              `<p class="prose" data-layers="${["commit", "input output", ""][index]}">${escape(text)}</p>`,
          )
          .join("\n        ")}
        <figure class="diagram">
          <figcaption class="diagram-title" lang="en">${escape(ARCHITECTURE.figureTitle)}</figcaption>
          ${diagram}
          <figcaption>${escape(ARCHITECTURE.caption)}</figcaption>
        </figure>
        <p class="prose closing">${inline(ARCHITECTURE.closing, fill)}</p>
        <p class="actions">${ARCHITECTURE.links
          .map((link) => `<a href="${escape(link.href)}" lang="en">${escape(link.label)}</a>`)
          .join("")}</p>
      </section>`;
}

function review(fill) {
  return `<section class="section" id="review" aria-labelledby="review-title">
        <p class="index">${REVIEW.index}</p>
        <h2 id="review-title" lang="en">${escape(REVIEW.title)}</h2>
        <blockquote class="pull"><p>${escape(REVIEW.quote)}</p></blockquote>
        <dl class="words">
          ${REVIEW.words
            .map((entry) => `<dt lang="en">${escape(entry.word)}</dt><dd>${escape(entry.text)}</dd>`)
            .join("\n          ")}
        </dl>
        <p class="note">${escape(REVIEW.distinction)}</p>
        <figure class="shot">
          <img src="./media/review-1440-light.png" alt="Work Review：一条候选待决定，依据与来源版本可见。" width="1440" height="900" />
          <figcaption>${inline(
            "CourtWork `{sha7}` · synthetic data · local deterministic provider · 1440×900 light · Work Review：一条候选待决定。",
            fill,
          )}</figcaption>
        </figure>
      </section>`;
}

function evidenceSection(fill, evidence) {
  const { benchmark, tests } = evidence;
  const testEntry = `npm --prefix app test · ${tests.pass} passed, ${tests.fail} failed`;

  return `<section class="section" id="evidence" aria-labelledby="evidence-title">
        <p class="index">${EVIDENCE.index}</p>
        <h2 id="evidence-title" lang="en">${escape(EVIDENCE.title)}</h2>
        <blockquote class="pull"><p>${escape(EVIDENCE.quote)}</p></blockquote>

        <table class="table">
          <thead><tr><th>项</th><th>文案</th><th>入口</th></tr></thead>
          <tbody>
            ${EVIDENCE.list
              .map((row) => {
                const entry = row.item === "Tests" ? escape(testEntry) : entryLink(row.entry, fill);
                return `<tr><th scope="row" lang="en">${escape(row.item)}</th><td>${inline(row.text, fill)}</td><td>${entry}</td></tr>`;
              })
              .join("\n            ")}
          </tbody>
        </table>

        <h3 lang="en">Eval</h3>
        <p class="note">${escape(EVIDENCE.evalIntro)}</p>
        <dl class="eval">
          ${EVIDENCE.eval
            .map((entry) => `<dt lang="en">${escape(entry.question)}</dt><dd>${inline(entry.text, fill)}</dd>`)
            .join("\n          ")}
        </dl>
        <p class="record is-mono">E ${benchmark.conditions.E.passed}/${benchmark.conditions.E.attempted} · S ${benchmark.conditions.S.passed}/${benchmark.conditions.S.attempted} · ${escape(benchmark.protocol)} · CourtWork ${escape(benchmark.git.head.slice(0, 7))} · model ${benchmark.model === null ? "null" : escape(String(benchmark.model))}</p>
        <p class="note">${escape(EVIDENCE.evalFooter)}</p>
        <p class="actions">${EVIDENCE.evalActions
          .map((a) => `<a href="${escape(a.href)}" lang="en">${escape(a.label)}</a>`)
          .join("")}</p>

        <h3>声称表</h3>
        <table class="table claims">
          <thead><tr><th>可写的声称</th><th>状态</th><th>证据入口</th></tr></thead>
          <tbody>
            ${CLAIMS.map(
              ([claim, status, entry]) =>
                `<tr><th scope="row">${escape(claim)}</th><td><span class="status ${STATUS_CLASS(status)}">${escape(status)}</span></td><td>${entryLink(entry, fill)}</td></tr>`,
            ).join("\n            ")}
          </tbody>
        </table>
        <p class="note">${escape(EVIDENCE.claimsNote)}</p>
      </section>`;
}

function build(fill) {
  return `<section class="section" id="build" aria-labelledby="build-title">
        <p class="index">${BUILD.index}</p>
        <h2 id="build-title" lang="en">${escape(BUILD.title)}</h2>
        <pre class="commands"><code>${BUILD.commands.map(escape).join("\n")}</code></pre>
        <p class="note">${escape(BUILD.note)}</p>
        <table class="table">
          <thead><tr><th>入口</th><th>文案</th></tr></thead>
          <tbody>
            ${BUILD.entries
              .map(([name, text, target]) => `<tr><th scope="row">${entryLink(target, fill)}</th><td>${escape(text)}</td></tr>`)
              .join("\n            ")}
          </tbody>
        </table>
        <dl class="words">
          ${BUILD.components
            .map(([name, text]) => `<dt lang="en">${escape(name)}</dt><dd>${escape(text)}</dd>`)
            .join("\n          ")}
        </dl>
        <p class="note">${inline(BUILD.upstream, fill)}</p>
      </section>`;
}

function footer(fill, identity) {
  return `<footer class="footer">
      <p>${FOOTER.items
        .map((item) => {
          const text = fill(item);
          if (item === "Source on GitHub") return `<a href="${REPO}" lang="en">${escape(text)}</a>`;
          if (item === "MIT License") return `<a href="${BLOB("LICENSE")}" lang="en">${escape(text)}</a>`;
          if (item === "Schema Engineering 9.6")
            return `<a href="${BLOB("PAPER.md")}" lang="en">${escape(text)}</a>`;
          return `<span class="is-mono">${escape(text)}</span>`;
        })
        .join('<span class="dot">·</span>')}</p>
    </footer>`;
}
