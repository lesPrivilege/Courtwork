import { renderCapture } from './capture-plan.mjs';
// Render the page.
//
// One document, Chinese-led, no framework and no build-time templating engine:
// the copy is data (copy.mjs), this file arranges it, and every number it
// prints comes from the recorded evidence rather than from the copy.
import { PAPER_ENTRY, NAV, HERO, RAW_GOVERNED, MATTER, ARCHITECTURE, REVIEW, BUILD, FOOTER } from "./copy.mjs";
import { renderPricing } from "./pricing.mjs";
import { STEPS, REPLAY_NOTE } from "./steps.mjs";
import { figureSvg } from "./assets/figures/figures.mjs";

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

export function renderPage({ identity, evidence, recording, diagram, media, pageMedia }) {
  const shot = (id, options) => renderCapture(pageMedia, id, options);
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
    <link rel="icon" href="./icon.svg" type="image/svg+xml" />
    <title>CourtWork · ${escape(HERO.h1[0])}</title>
    <meta name="description" content="${escape(HERO.lede)}" />
    <link rel="stylesheet" href="./tokens.css" />
    <link rel="stylesheet" href="./site.css" />
    <link rel="stylesheet" href="./pricing.css" />
  </head>
  <body>
    <a class="skip" href="#main">跳到正文</a>
    ${header()}
    <main id="main">
      ${hero(fill, shot)}
      ${currentHome(fill, shot)}
      ${productAtoms()}
      ${matter(fill)}
      ${longWork()}
      ${review(fill, shot)}
      ${portability(fill)}
      ${evidenceSection(fill, evidence)}
      ${renderPricing()}
      ${build(fill, shot)}
      <details class="research-depth" id="research"><summary>Research &amp; architecture</summary>
        ${primaryEntries()}
        ${architecture(fill, diagram)}
        ${rawGoverned(fill, recording)}
        ${figure("pipeline", "plate", "从工作状态组织当前执行需要的上下文。")}
        ${figure("roles", "object", "技术视图：责任、绑定与执行的分层。")}
        ${figure("spark", "object", "知识派生的概念视图。 ")}
        ${figure("attention", "object", "工作变化与人的介入。 ")}
      </details>
    </main>
    ${closingShot()}
    ${footer(fill, identity)}
    <script type="module" src="./site.mjs"></script>
  </body>
</html>
`.replaceAll(`${REPO}/blob/main/`, `${REPO}/blob/${identity.source_sha}/`)
    .replaceAll(`${REPO}/tree/main/`, `${REPO}/tree/${identity.source_sha}/`);
}

export function primaryNav({ home = false, current = null } = {}) {
  return `<nav class="global-nav" aria-label="Primary" lang="en">${NAV.map(item => `<a href="${escape(!home && item.href.startsWith('#') ? './index.html' + item.href : item.href)}"${item.href === `./${current}.html` ? ' aria-current="page"' : ''}>${escape(item.label)}</a>`).join('')}</nav>`;
}

function header() {
  return `<header class="masthead">
      <a class="wordmark brand-lockup" href="#main" aria-label="CourtWork · 回到顶部">${brandIcon()}<span class="brand-name">Court<span>Work</span></span></a>
      ${primaryNav({ home: true })}
    </header>`;
}

function hero(fill, shot) {
  return `<section class="hero" aria-labelledby="h1">
        <div class="hero-copy"><h1 id="h1"><span lang="en">${escape(HERO.h1[0])}</span><span>${escape(HERO.h1[1])}</span></h1>
        <p class="lede">${escape(HERO.lede)}</p>
        <p class="actions hero-actions" lang="en">${HERO.actions
          .map((a) => `<a class="hero-action${a.primary ? " hero-action-primary" : ""}" href="${escape(a.href)}">${escape(a.label)}</a>`)
          .join("")}</p></div>
        <figure class="hero-object" data-figure="fig-00-matter-object" aria-labelledby="object-caption">
          <div class="object-register"><span>FIG. 00 / A MATTER, CONTINUED</span><span class="brand-lockup brand-lockup-small">${brandIcon()}<span class="brand-name">Court<span>Work</span></span></span></div>
          <div class="archive-stack" aria-hidden="true"><div class="archive-sheet sheet-source">01 / SOURCE<span>A starting point.</span></div><div class="archive-sheet sheet-candidate">02 / CANDIDATE<span>A possibility.</span></div><div class="archive-sheet sheet-work">03 / MATTER<span>The work<br>remains.</span><i>Source → Candidate → Decision</i></div></div>
          <figcaption id="object-caption">The work remains.</figcaption>
        </figure>
      </section>`;
}

function currentHome(fill, shot) {
  return `        <section class="home-capture-slot current-home" data-capture-slot="home" aria-labelledby="current-home-title">
          <div class="home-capture-heading"><div><p class="index">INSIDE COURTWORK / LOCAL APPLICATION</p><h2 id="current-home-title">A place to return.</h2><p>打开工作、查看用量，或与 Attention 继续对话。</p></div><a href="./tour.html">Explore the product tour →</a></div>
${shot("M1", { alt: "Courtwork 当前 Home：项目、用量与 Attention 入口。", caption: inline("回到项目，继续工作。", fill), eager: true })}

        </section>`;
}

/** The three layers, filled with a real excerpt of the recording. */
function rawGoverned(fill, recording) {
  const runId = recording.runOrder[1];
  const events = recording.events[runId].events;
  const projection = recording.surface.pending.projection;
  const context = recording.context[runId];

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

  return `<section class="section anatomy" id="layers" aria-labelledby="layers-title">
        <p class="index">${RAW_GOVERNED.index}</p>
        <h2 id="layers-title"><span lang="en">${escape(RAW_GOVERNED.title)}</span><span class="zh">${escape(RAW_GOVERNED.subtitle)}</span></h2>
        <nav class="anatomy-links" aria-label="Anatomy of a governed matter">
          <a href="./specimen/index.html#source" target="matter-replay">Source</a><span aria-hidden="true">→</span>
          <a href="#tab-events">Event</a><span aria-hidden="true">→</span>
          <a href="#tab-surface">Work state</a><span aria-hidden="true">→</span>
          <a href="./specimen/index.html#step-run" target="matter-replay">Run</a><span aria-hidden="true">→</span>
          <a href="#review">Review</a><span aria-hidden="true">→</span>
          <a href="./specimen/index.html#step-candidate" target="matter-replay">Decision</a><span aria-hidden="true">→</span>
          <a href="#review-provenance">Provenance</a>
        </nav>
        <blockquote class="pull">
          <p lang="en">${escape(RAW_GOVERNED.quote[0])}</p>
          <p>${escape(RAW_GOVERNED.quote[1])}</p>
        </blockquote>
        <p class="lede">${escape(RAW_GOVERNED.lede)}</p>
        <div class="tabs instrument" data-tabs="layers">
          <div class="instrument-object" data-figure="anatomy-instrument" aria-hidden="true"><span class="instrument-id">MATTER / 01</span><div class="projection-lines"><i></i><i></i><i></i><i></i><i></i><i></i></div><span class="projection-caption">ONE MATTER · THREE PROJECTIONS</span></div>
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


          </section>`,
            )
            .join("\n          ")}
        </div>
        <p class="caption">${escape(fill(RAW_GOVERNED.caption))}</p>
      </section>`;
}

function matter(fill) {
  return `<section class="section" id="matter" data-semantic-key="matter.object" aria-labelledby="matter-title">
        <p class="index">${MATTER.index}</p>
        <h2 id="matter-title" lang="en">${escape(MATTER.title)}</h2>
        <blockquote class="pull"><p>${escape(MATTER.quote)}</p></blockquote>
        <iframe
          class="specimen-frame"
          name="matter-replay"
          src="./specimen/index.html"
          title="${escape(MATTER.title)}"
          loading="lazy"
        ></iframe>
        <p class="note">${escape(MATTER.note)}</p>
        <details class="replay-index"><summary>Explore all ${STEPS.length} steps</summary><ol class="steps">
          ${STEPS.map(
            (step, index) => `<li>
            <p class="step-seen"><span class="step-number">${index + 1}</span><span lang="en">${escape(step.seen)}</span></p>
            <p>${escape(step.text)}</p>
          </li>`,
          ).join("\n          ")}
        </ol></details>
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
        <figure class="diagram" data-figure="state-to-commit">
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

function productAtoms() {
  return `<section class="product-atoms" aria-label="Spark and Attention" data-product-story="current" data-motion="instant">
    <article class="product-atom atom-spark" data-semantic-key="spark.surface" aria-labelledby="spark-title">
      <p class="index">SPARK</p>
      <h2 id="spark-title">Knowledge,<br><em>rebuilt.</em></h2>
      <p class="atom-thesis">来源更新，发现随之重建。<br>知识保持新鲜，决定保留来路。</p>
      <div class="atom-diagram spark-diagram" aria-hidden="true">
        <svg viewBox="0 0 520 190" focusable="false">
          <path class="atom-wire" d="M88 94H185M185 94V42H286M185 94H286M185 94V146H286"/>
          <rect class="source-base" x="46" y="55" width="78" height="78" rx="4"/>
          <path class="source-mark" d="M67 78H103M67 94H97M67 110H87"/>
          <g class="derived-view view-a"><rect x="286" y="22" width="182" height="40" rx="4"/><path d="M308 42H409"/></g>
          <g class="derived-view view-b"><rect x="286" y="74" width="152" height="40" rx="4"/><path d="M308 94H386"/></g>
          <g class="derived-view view-c"><rect x="286" y="126" width="170" height="40" rx="4"/><path d="M308 146H404"/></g>
          <circle class="source-change" cx="124" cy="55" r="7"/>
        </svg>
        <div class="atom-axis"><span>Sources</span><span>Derived knowledge</span></div>
      </div>
      <div class="atom-bottom"><p class="atom-state" data-spark-state>当前来源，当前发现。</p><button type="button" class="atom-control" data-story-toggle aria-pressed="false" aria-label="演示来源变化对 Spark 与 Attention 的影响" hidden>更新来源 <span aria-hidden="true">↗</span></button></div>
    </article>
    <article class="product-atom atom-attention" data-semantic-key="attention.agent" aria-labelledby="attention-title">
      <p class="index">ATTENTION</p>
      <h2 id="attention-title">Attention,<br><em>well spent.</em></h2>
      <p class="atom-thesis">让工作持续推进。<br>把你的注意力留给重要变化。</p>
      <div class="atom-diagram attention-diagram" aria-hidden="true">
        <svg viewBox="0 0 520 190" focusable="false">
          <g class="signal-stream"><path d="M44 35H204M74 65H228M30 94H264M92 123H204M55 153H230"/><circle cx="84" cy="35" r="3"/><circle cx="125" cy="65" r="3"/><circle cx="67" cy="94" r="3"/><circle cx="157" cy="123" r="3"/><circle cx="101" cy="153" r="3"/></g>
          <path class="attention-boundary" d="M292 22V168"/>
          <path class="attention-path" d="M102 94H442"/>
          <circle class="attention-target" cx="414" cy="94" r="23"/>
          <path class="attention-target-mark" d="M414 83V96M414 104V105"/>
        </svg>
        <div class="atom-axis"><span>Work in motion</span><span>Human judgment</span></div>
      </div>
      <div class="atom-bottom"><p class="atom-state" data-attention-state>工作继续。</p><a class="atom-more" href="./features.html">Explore the ideas <span aria-hidden="true">↗</span></a></div>
    </article>
    <p class="visually-hidden" role="status" data-story-announcement></p>
  </section>`;
}

function longWork() {
  return `<section class="section long-work" id="long-work" aria-labelledby="long-work-title" data-semantic-key="expert.role">
    <p class="index">EXPERTS</p>
    <h2 id="long-work-title"><span lang="en">Different expertise.<br>The same work.</span><span class="zh">各有所长，共同推进一件事。</span></h2>
    <p class="lede">Expert 围绕明确的责任处理材料，提出有依据的候选。Matter 保留共同来源，成果进入 Review，下一步沿已有决定继续。</p>
    <dl class="words"><dt>Matter</dt><dd>找到同一件工作的材料、决定与未完事项。</dd><dt>Experts</dt><dd>让专业责任与本次工作的范围相匹配。</dd><dt>Review</dt><dd>带着来源与证据，决定哪些成果可以留下。</dd></dl>
    <p class="actions"><a href="./experts.html">Explore Experts →</a></p>
  </section>`;
}

// Figure maturity and source identity live in the engineering registry.


function figure(id, grammar, caption) {

  return `<figure class="figure figure-${grammar}" data-figure="${id}">
      ${grammar === "plate" ? '<p class="figure-scroll-hint">Scroll to explore →</p>' : ''}
      <div class="figure-scroll" role="region" tabindex="0" aria-label="${escape(id)} diagram">${figureSvg(id)}</div>
      <figcaption>${escape(caption)}</figcaption>
    </figure>`;
}

function review(fill, shot) {
  return `<section class="section" id="review" data-semantic-key="review.open" aria-labelledby="review-title">
        <p class="index">${REVIEW.index}</p>
        <h2 id="review-title" lang="en">${escape(REVIEW.title)}</h2>
        <blockquote class="pull"><p>${escape(REVIEW.quote)}</p></blockquote>
        <dl class="words">
          ${REVIEW.words
            .map((entry) => `<dt lang="en"${entry.word === "Provenance" ? ' id="review-provenance"' : ""}>${escape(entry.word)}</dt><dd>${escape(entry.text)}</dd>`)
            .join("\n          ")}
        </dl>
        <p class="note">${escape(REVIEW.distinction)}</p>
<p class="review-attention" data-attention="review"><span aria-hidden="true"></span>待人审阅 </p>
${shot("M6", {
          alt: "Work Review：一条候选待决定，依据与来源版本可见。",
          caption: inline(
            "候选与依据，一起进入审阅。",
            fill,
          ),
        })}
      </section>`;
}

function evidenceSection() {
  return `<section class="section" id="evidence" aria-labelledby="evidence-title">
    <p class="index">EVAL &amp; PRIVACY</p><h2 id="evidence-title">Work you can examine.</h2>
    <div class="boundary-pair"><section><h3>Can the work continue?</h3><p>来源变化、执行中断、换人接手之后，检验哪些工作仍然有效。</p><p class="actions"><a href="./eval.html">Explore the evals →</a></p></section><section><h3>Where does the work go?</h3><p>工作保存在本地。模型请求与工具按你的配置连接外部服务。</p><p class="actions"><a href="./data.html">Data &amp; privacy →</a></p></section></div>
  </section>`;
}

function portability(fill) {
  return `<section class="section" id="portability" aria-labelledby="portability-title">
    <p class="index">MODELS &amp; TOOLS</p><h2 id="portability-title">Choose what the work needs.</h2>
    <p class="lede">连接你选择的模型，按能力调整推理设置与工具。模型可以变化，Matter 中的来源与决定持续保留。</p>
    <p class="note">模型请求发往你配置的 provider 或本地模型；模型用量由对应服务单独计费。</p>
    <p class="actions"><a href="./models.html">Explore models →</a><a href="./tour.html#integrations">Tools &amp; connections →</a></p>
  </section>`;
}

function build(fill, shot) {
  return `<section class="section" id="build" aria-labelledby="build-title">
    <p class="index">DOWNLOAD</p><h2 id="build-title">Bring the work home.</h2>
    <p class="lede">打开自己的工作空间，从第一份材料开始。</p>
    <p class="actions"><a href="./get.html">Get CourtWork →</a><a href="./get.html#source">Run from source →</a></p>
  </section>`;
}

function footer(fill, identity) {
  return `<footer class="footer">
      <nav class="product-footer-links" aria-label="Explore Courtwork"><a href="${PAPER_ENTRY.href}">Paper</a><a href="#research">Research</a><a href="./features.html">Features</a><a href="./eval.html">Eval</a><a href="./experts.html">Experts</a><a href="./tour.html">Product tour</a><a href="./get.html">Get Courtwork</a><a href="./cli.html">CLI study</a><a href="./changelog.html">Changelog</a><a href="./models.html">Models</a><a href="./data.html">Data boundaries</a></nav>
      <p>${FOOTER.items
        .map((item) => {
          const text = fill(item);
          if (item === "Source on GitHub") return `<a href="${REPO}" lang="en">${escape(text)}</a>`;
          if (item === "MIT License") return `<a href="${BLOB("LICENSE")}" lang="en">${escape(text)}</a>`;
          if (item === "Schema Engineering 9.6")
            return `<a href="${PAPER_ENTRY.href}" lang="en">${escape(text)}</a>`;
          return `<span class="is-mono">${escape(text)}</span>`;
        })
        .join('<span class="dot">·</span>')}</p>
    </footer>`;
}

function closingShot() { return `<section class="closing-shot" aria-label="Courtwork"><p>The model can leave.<br><em>The work remains.</em></p><a href="#main" aria-label="Courtwork · Back to top">COURTWORK<span aria-hidden="true">↗</span></a></section>`; }

// Static mono use of brand/geometry/mark.svg. Exact canonical rectangles;
// this lockup conveys identity, never review or acceptance state.
export function brandIcon() { return `<svg class="brand-icon" viewBox="0 0 64 64" width="32" height="32" aria-hidden="true" focusable="false" fill="currentColor"><rect x="7.2" y="4" width="11.2" height="52.8" rx="2"/><rect x="28" y="7.2" width="28" height="9.6" rx="2.8"/><rect x="28" y="25.6" width="28" height="9.6" rx="2.8"/><rect x="28" y="44" width="19.2" height="9.6" rx="2.8"/></svg>`; }

function primaryEntries() {
  return `<section class="primary-entries" aria-label="Paper 理念与 Tour 编排">
    <div class="entry-heading"><p class="index">TWO WAYS INTO COURTWORK</p></div>
    <div class="entry-grid">
      <details class="entry-chapter entry-paper" id="paper">
        <summary><span class="entry-kicker">01 / THE IDEAS</span><span class="entry-title">Paper</span><span class="entry-description">工作的状态、来源与判断，如何持续存在。</span><span class="entry-cover entry-cover-paper" aria-hidden="true"><span>EVENT</span><span>STATE</span><span>CONTEXT</span></span><span class="entry-toggle"><span class="entry-closed">Explore ideas</span><span class="entry-open">Close ideas</span><span class="entry-sign" aria-hidden="true"></span></span></summary>
        <div class="entry-content"><h3>The thinking behind the work.</h3><p>Schema Engineering 将长期工作组织为三个相互连接的层次。</p><dl class="entry-principles"><div><dt>Event</dt><dd>记录行动与变化，保留工作的来路。</dd></div><div><dt>State</dt><dd>保存当前事实、正式判断与未完事项。</dd></div><div><dt>Context</dt><dd>从当前工作中组织下一次运行需要的材料。</dd></div></dl><nav class="entry-actions" aria-label="Paper volumes" lang="en"><a href="${PAPER_ENTRY.href}?mode=canonical#paper-canonical">Canonical ↗</a><a href="${PAPER_ENTRY.href}?mode=practice#paper-practice">Practice ↗</a><a href="${PAPER_ENTRY.href}?mode=index#paper-index">Index ↗</a></nav><div class="entry-next"><p class="index">COURTWORK</p><p>资料有出处，发现可重建，重要变化进入人的视野。确定性治理、Spark 与 Attention 让工作长久延续。</p><a href="#long-work">Explore the ideas →</a></div></div>
      </details>
      <article class="entry-chapter entry-tour"><details id="tour">
        <summary><span class="entry-kicker">02 / THE ORCHESTRATION</span><span class="entry-title">Tour</span><span class="entry-description">从一次行动，到人的介入，再到留下的工作。</span><span class="entry-cover entry-cover-tour" aria-hidden="true"><span>START</span><i>→</i><span>ACT</span><i>→</i><span>REVIEW</span><i>→</i><span>CONTINUE</span></span><span class="entry-toggle"><span class="entry-closed">Explore the path</span><span class="entry-open">Close the path</span><span class="entry-sign" aria-hidden="true"></span></span></summary>
        <div class="entry-extra"><p>从 Home 找到工作，在执行中处理权限，带着依据审阅成果，再沿事项继续推进。</p></div></details>
        <nav class="entry-content entry-toc" aria-label="Tour 简明目录"><h3>In this tour.</h3><ol class="entry-flow"><li><a href="./tour.html#home"><span>01</span><strong>Start work</strong><span aria-hidden="true">↗</span></a></li><li><a href="./tour.html#attention"><span>02</span><strong>Act and intervene</strong><span aria-hidden="true">↗</span></a></li><li><a href="./tour.html#review"><span>03</span><strong>Review work and evidence</strong><span aria-hidden="true">↗</span></a></li><li><a href="./tour.html#continuity"><span>04</span><strong>Continue the work</strong><span aria-hidden="true">↗</span></a></li></ol><p class="entry-actions"><a href="./tour.html">Explore the full tour →</a></p></nav>
      </article>
    </div>
  </section>`;
}
