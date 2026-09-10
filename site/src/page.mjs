// Render the page.
//
// One document, Chinese-led, no framework and no build-time templating engine:
// the copy is data (copy.mjs), this file arranges it, and every number it
// prints comes from the recorded evidence rather than from the copy.
import { PAPER_ENTRY, NAV, HERO, RAW_GOVERNED, MATTER, ARCHITECTURE, REVIEW, EVIDENCE, CLAIMS, BUILD, FOOTER } from "./copy.mjs";
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
  // Media are addressed by id, so a picture the copy asks for and the capture
  // never produced stops the build instead of becoming a broken image.
  const shot = (id, { alt, caption, theme = "light", viewport = "1440x900", eager = false }) => {
    const entries = pageMedia.media.filter((entry) => entry.id === id);
    const light = entries.find((entry) => entry.viewport === viewport && entry.theme === theme);
    if (!light) throw new Error(`media ${id} (${viewport}, ${theme}) was never captured`);
    const dark = entries.find((entry) => entry.viewport === viewport && entry.theme === "dark");
    const [w, h] = light.viewport.split("x");
    const source = dark
      ? `<source srcset="./media/${escape(path(dark))}" media="(prefers-color-scheme: dark)" />`
      : "";
    return `<figure class="shot">
          <picture>${source}
            <img src="./media/${escape(path(light))}" alt="${escape(alt)}" width="${w}" height="${h}" loading="${eager ? "eager" : "lazy"}" decoding="async" />
          </picture>
          <figcaption>${caption.replaceAll(identity.sha7, pageMedia.source_sha.slice(0, 7))} · <a href="./media/main/manifest.json">Capture record</a></figcaption>
        </figure>`;
  };
  const path = (entry) => entry.asset_path.replace("site/media/", "");
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
      ${primaryEntries()}
      ${currentHome(fill, shot)}
      ${rawGoverned(fill, recording)}
      ${matter(fill)}
      ${architecture(fill, diagram)}
      ${longWork(pageMedia.source_sha)}
      ${review(fill, shot)}
      ${evidenceSection(fill, evidence)}
      ${portability(fill)}
      ${renderPricing()}
      ${build(fill, shot)}
    </main>
    ${closingShot()}
    ${footer(fill, identity)}
    <script type="module" src="./site.mjs"></script>
  </body>
</html>
`.replaceAll(`${REPO}/blob/main/`, `${REPO}/blob/${identity.source_sha}/`)
    .replaceAll(`${REPO}/tree/main/`, `${REPO}/tree/${identity.source_sha}/`);
}

function header() {
  return `<header class="masthead">
      <a class="wordmark brand-lockup" href="#main" aria-label="CourtWork · 回到顶部">${brandIcon()}<span class="brand-name">Court<span>Work</span></span></a>
      <nav aria-label="Site">
        ${NAV.map((item) => `<a href="${escape(item.href)}">${escape(item.label)}</a>`).join("\n        ")}
      </nav>
    </header>`;
}

function hero(fill, shot) {
  return `<section class="hero" aria-labelledby="h1">
        <div class="hero-copy"><h1 id="h1"><span lang="en">${escape(HERO.h1[0])}</span><span>${escape(HERO.h1[1])}</span></h1>
        <p class="lede">${escape(HERO.lede)}</p>
        <p class="actions">${HERO.actions
          .map((a) => `<a href="${escape(a.href)}">${escape(a.label)}</a>`)
          .join("")}</p></div>
        <figure class="hero-object" data-figure="fig-00-matter-object" aria-labelledby="object-caption">
          <div class="object-register"><span>FIG. 00 / A MATTER, CONTINUED</span><span class="brand-lockup brand-lockup-small">${brandIcon()}<span class="brand-name">Court<span>Work</span></span></span></div>
          <div class="archive-stack" aria-hidden="true"><div class="archive-sheet sheet-source">01 / SOURCE<span>A starting point.</span></div><div class="archive-sheet sheet-candidate">02 / CANDIDATE<span>A possibility.</span></div><div class="archive-sheet sheet-work">03 / MATTER<span>The work<br>remains.</span><i>Source → Candidate → Decision</i></div></div>
          <figcaption id="object-caption">Concept study · 工作对象的视觉演绎</figcaption>
        </figure>
      </section>`;
}

function currentHome(fill, shot) {
  return `        <section class="home-capture-slot current-home" data-capture-slot="home" data-capture-status="captured" aria-labelledby="current-home-title">
          <div class="home-capture-heading"><div><p class="index">INSIDE COURTWORK / LOCAL APPLICATION</p><h2 id="current-home-title">A place to return.</h2><p>打开工作、查看用量，或与 Attention 继续对话。</p></div><a href="./tour.html">Explore the product tour →</a></div>
${shot("M1", { alt: "Courtwork 当前 Home：项目、用量与 Attention 入口。", caption: inline("Recorded Home · `{sha7}` · synthetic data · local deterministic provider · 1440×900", fill), eager: true })}
          <nav class="home-product-links" aria-label="Explore the product">
            <a href="./tour.html">Product tour <span>看看实际界面</span></a>
            <a href="./get.html">Get Courtwork <span>从源码在本地运行</span></a>
            <a href="./cli.html">CLI study <span>探索录制数据</span></a>
            <a href="./changelog.html">Changelog <span>沿提交查看变化</span></a>
            <a href="./models.html">Models <span>配置你的模型</span></a>
            <a href="./data.html">Data boundaries <span>了解数据的去向</span></a>
          </nav>
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
          <a href="#tab-surface">Matter state</a><span aria-hidden="true">→</span>
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
        <iframe
          class="specimen-frame"
          name="matter-replay"
          src="./specimen/index.html"
          title="${escape(MATTER.title)}"
          loading="lazy"
        ></iframe>
        <p class="note">${escape(MATTER.note)}</p>
        <details class="replay-index"><summary>Explore all 8 recorded steps</summary><ol class="steps">
          ${STEPS.map(
            (step, index) => `<li>
            <p class="step-seen"><span class="step-number">${index + 1}</span><span lang="en">${escape(step.seen)}</span></p>
            <p>${escape(step.text)}</p>
            <p class="status ${STATUS_CLASS(step.status)}">${escape(step.status)}</p>
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

function longWork(sourceSha) {
  const researchSha = "370b891b33338988a29f50a7c475f9d7e7225577";
  return `<section class="section long-work" id="long-work" aria-labelledby="long-work-title">
    <p class="index">RESEARCH DIRECTION / 本轮核心自研理念</p>
    <h2 id="long-work-title"><span lang="en">A longer life<br>for the work.</span><span class="zh">让长期工作，有自己的秩序。</span></h2>
    <p class="lede">从资料治理，到可重建的发现与上下文，再到重要变化出现时的介入。我们希望工作持续积累，而人和模型每次只需关注当下相关的部分。</p>
    ${figure("pipeline", "plate", "Concept · Schema Engineering 9.6 §5.4 的输入侧：存量持续增长，单次工作集的宽度不随之增长。概念示意，不表示产品已具备完整的四段。")}
    <div class="long-work-stages">
      <section><p class="index">01 / GROUND</p><h3>Deterministic foundations.</h3><p>先确定材料来自哪里、属于哪个版本、可以被谁读取。即使没有模型，资料仍能查找、核对与更新。</p></section>
      <section><p class="index">02 / REBUILD</p><h3>Rebuildable Spark.</h3><p>Spark 负责资料与派生维护：整理发现、重建当前上下文。旧摘要可以退出，来源、正式判断、未完义务与冲突仍须留下。</p>${figure("spark", "object", RESEARCH)}</section>
      <section><p class="index">03 / ATTEND</p><h3>Selective Attention.</h3><p>把重要变化送到人面前。关联事件、合并重复、控制介入频率，让每次提醒都有明确的理由与可采取的行动。</p>${figure("attention", "object", RESEARCH)}</section>
    </div>
    <div class="long-work-columns">
      <section><p class="index">ROLES & EXECUTION</p><h3>Clear roles. Adaptable execution.</h3><p>Expert 表达承担的角色；runtime 承担执行。角色、配置与权限分别说明，沿 Pi 薄集成起步，有实际需要时再逐一验证其他执行入口。</p>${figure("roles", "object", RESEARCH)}</section>
      <section><p class="index">QUALITY & COST</p><h3>Measure the whole life.</h3><p>从首次整理、资料更新，到恢复、审阅与维护，检验成果质量和总成本。可删除、可重建的派生层，要靠真实收益证明价值。</p></section>
    </div>
    <p class="caption" id="long-work-status">以上为本轮研究理念与施工方向。Spark 自动维护、通用恢复与自动唤醒尚未交付；长期质量和成本收益仍待验证。</p>
    <p class="actions"><a href="${REPO}/blob/${researchSha}/engineering/research/multi-experts-2026-09-10/pr-plan.md">Explore the research roadmap →</a><a href="./tour.html#assistant">See the current product →</a></p>
    <p class="caption">当前基础：版本化来源与审阅、<a href="${REPO}/blob/${sourceSha}/app/docs/run-attempts.md">有界 Run 续行</a>、<a href="${REPO}/blob/${sourceSha}/app/docs/coordination.md">Thread 本地通信</a>；实录版本 ${sourceSha.slice(0, 7)}。</p>
  </section>`;
}

// Research figures carry the section's own status line rather than a new
// claim: the words point at the caption that says what is not yet delivered.
const RESEARCH = "Research sketch · 研究方向示意，尚未交付；见本节末说明。";

function figure(id, grammar, caption) {
  const describedBy = caption === RESEARCH ? ' aria-describedby="long-work-status"' : "";
  return `<figure class="figure figure-${grammar}" data-figure="${id}"${describedBy}>
      <div class="figure-scroll">${figureSvg(id)}</div>
      <figcaption>${escape(caption)}</figcaption>
    </figure>`;
}

function review(fill, shot) {
  return `<section class="section" id="review" aria-labelledby="review-title">
        <p class="index">${REVIEW.index}</p>
        <h2 id="review-title" lang="en">${escape(REVIEW.title)}</h2>
        <blockquote class="pull"><p>${escape(REVIEW.quote)}</p></blockquote>
        <dl class="words">
          ${REVIEW.words
            .map((entry) => `<dt lang="en"${entry.word === "Provenance" ? ' id="review-provenance"' : ""}>${escape(entry.word)}</dt><dd>${escape(entry.text)}</dd>`)
            .join("\n          ")}
        </dl>
        <p class="note">${escape(REVIEW.distinction)}</p>
<p class="review-attention" data-attention="review"><span aria-hidden="true"></span>待人审阅 <small>· 录制中的候选状态</small></p>
${shot("M6", {
          alt: "Work Review：一条候选待决定，依据与来源版本可见。",
          caption: inline(
            "CourtWork `{sha7}` · synthetic data · local deterministic provider · 1440×900 light · Work Review：一条候选待决定。",
            fill,
          ),
        })}
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
                const entry = row.item === "Tests"
                  ? escape(testEntry)
                  : row.href
                    ? `<a href="${escape(row.href)}">${escape(row.entry)}</a>`
                    : entryLink(row.entry, fill);
                return `<tr><th scope="row" lang="en">${escape(row.item)}</th><td>${inline(row.text, fill)}</td><td>${entry}</td></tr>`;
              })
              .join("\n            ")}
          </tbody>
        </table>

        <div class="eval-scoreboard"><p class="index">CONTINUITY / RECORDED RESULT</p><p class="eval-headline">Same score.<br>Different structure.</p><div class="eval-scores">${["E", "S"].map(key => `<div><span>${key}</span><strong>${benchmark.conditions[key].passed}<small> / ${benchmark.conditions[key].attempted}</small></strong></div>`).join("")}</div><p class="note">Synthetic conformance · no real model · 固定快照 ${escape(benchmark.git.head.slice(0, 7))}。本结果不证明 E 优于 S。</p></div><h3 lang="en">Eval</h3>
        <p class="note">${escape(EVIDENCE.evalIntro)}</p>
        <dl class="eval">
          ${EVIDENCE.eval
            .map((entry) => `<dt lang="en">${escape(entry.question)}</dt><dd>${inline(entry.text, fill)}</dd>`)
            .join("\n          ")}
        </dl>
        <p class="record is-mono">E ${benchmark.conditions.E.passed}/${benchmark.conditions.E.attempted} · S ${benchmark.conditions.S.passed}/${benchmark.conditions.S.attempted} · ${escape(benchmark.protocol)} · CourtWork ${escape(benchmark.git.head.slice(0, 7))} · model ${benchmark.model === null ? "null" : escape(String(benchmark.model))}</p>
        <p class="note">${escape(EVIDENCE.evalFooter)}</p>
        <p class="actions">${EVIDENCE.evalActions
          .map((a) => `<a href="${escape(fill(a.href))}" lang="en">${escape(a.label)}</a>`)
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

function portability(fill) {
  return `<section class="section" id="portability" aria-labelledby="portability-title">
        <p class="index">06</p>
        <h2 id="portability-title"><span lang="en">Architecture &amp; portability</span><span class="zh">工作可以留下，智能可以迁移</span></h2>
        <dl class="words">
          ${BUILD.components
            .map(([name, text]) => `<dt lang="en">${escape(name)}</dt><dd>${escape(text)}</dd>`)
            .join("\n          ")}
        </dl>
        <p class="note">${inline(BUILD.upstream, fill)}</p>
        <p class="note"><strong>Model usage is separate.</strong> 模型请求发往你配置的 provider 或本地模型；CourtWork 不经手模型账单。</p>
      </section>`;
}

function build(fill, shot) {
  return `<section class="section" id="build" aria-labelledby="build-title">
        <p class="index">${BUILD.index}</p>
        <h2 id="build-title" lang="en">${escape(BUILD.title)}</h2>
        <pre class="commands"><code>${BUILD.commands.map(escape).join("\n")}</code></pre>
        <p class="note">${escape(BUILD.note)}</p>
        ${shot("M7", {
          alt: "Settings › Models：Add provider 的 Compatible endpoint 一行，Test connection 与 Fetch models 在场。",
          caption: inline(
            "CourtWork `{sha7}` · synthetic data · local deterministic provider · 1440×900 light · Settings › Models：Compatible endpoint 的两个探测控件在场，未填写端点，未存任何密钥。",
            fill,
          ),
        })}
        <table class="table">
          <thead><tr><th>入口</th><th>文案</th></tr></thead>
          <tbody>
            ${BUILD.entries
              .map(([name, text, target]) => `<tr><th scope="row">${entryLink(target, fill)}</th><td>${escape(text)}</td></tr>`)
              .join("\n            ")}
          </tbody>
        </table>

      </section>`;
}

function footer(fill, identity) {
  return `<footer class="footer">
      <nav class="product-footer-links" aria-label="Explore Courtwork"><a href="./tour.html">Product tour</a><a href="./get.html">Get Courtwork</a><a href="./cli.html">CLI study</a><a href="./changelog.html">Changelog</a><a href="./models.html">Models</a><a href="./data.html">Data boundaries</a></nav>
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

function closingShot() { return `<section class="closing-shot" aria-label="Courtwork"><p>The model can leave.<br><em>The work remains.</em></p><a href="#main" aria-label="Courtwork · Back to top">COURTWORK<span aria-hidden="true">↗</span></a></section>`; }

// Static mono use of brand/geometry/mark.svg. Exact canonical rectangles;
// this lockup conveys identity, never review or acceptance state.
export function brandIcon() { return `<svg class="brand-icon" viewBox="0 0 64 64" width="32" height="32" aria-hidden="true" focusable="false" fill="currentColor"><rect x="7.2" y="4" width="11.2" height="52.8" rx="2"/><rect x="28" y="7.2" width="28" height="9.6" rx="2.8"/><rect x="28" y="25.6" width="28" height="9.6" rx="2.8"/><rect x="28" y="44" width="19.2" height="9.6" rx="2.8"/></svg>`; }

function primaryEntries() {
  return `<section class="primary-entries" aria-label="Paper 理念与 Tour 编排">
    <div class="entry-heading"><p class="index">TWO WAYS INTO COURTWORK</p></div>
    <div class="entry-grid">
      <details class="entry-chapter entry-paper" id="paper" >
        <summary><span class="entry-kicker">01 / THE IDEAS</span><span class="entry-title">Paper<span>理念</span></span><span class="entry-description">工作的状态、来源与判断，如何持续存在。</span><span class="entry-cover entry-cover-paper" aria-hidden="true"><span>EVENT</span><span>STATE</span><span>CONTEXT</span></span><span class="entry-toggle"><span class="entry-closed">展开理念</span><span class="entry-open">收起理念</span><span class="entry-sign" aria-hidden="true"></span></span></summary>
        <div class="entry-content"><h3>The thinking behind the work.</h3><p>Schema Engineering 将长期工作组织为三个相互连接的层次。</p><dl class="entry-principles"><div><dt>Event</dt><dd>记录行动与变化，保留工作的来路。</dd></div><div><dt>State</dt><dd>保存当前事实、正式判断与未完事项。</dd></div><div><dt>Context</dt><dd>从当前工作中组织下一次运行需要的材料。</dd></div></dl><p class="entry-actions"><a href="${PAPER_ENTRY.href}">阅读 Paper ↗</a><a href="${PAPER_ENTRY.baseline}">Canonical · 9.6 ↗</a></p><div class="entry-next"><p class="index">COURTWORK / RESEARCH DIRECTION</p><p>资料有出处，发现可重建，重要变化进入人的视野。确定性治理、Spark 与 Attention 构成长久工作的研究方向。</p><a href="#long-work">长期工作的理念 →</a></div></div>
      </details>
      <article class="entry-chapter entry-tour"><details id="tour">
        <summary><span class="entry-kicker">02 / THE ORCHESTRATION</span><span class="entry-title">Tour<span>编排</span></span><span class="entry-description">从一次行动，到人的介入，再到留下的工作。</span><span class="entry-cover entry-cover-tour" aria-hidden="true"><span>START</span><i>→</i><span>ACT</span><i>→</i><span>REVIEW</span><i>→</i><span>CONTINUE</span></span><span class="entry-toggle"><span class="entry-closed">查看路径说明</span><span class="entry-open">收起路径说明</span><span class="entry-sign" aria-hidden="true"></span></span></summary>
        <div class="entry-extra"><p>从 Home 找到工作，在执行中处理权限，带着依据审阅成果，再沿事项继续推进。</p></div></details>
        <nav class="entry-content entry-toc" aria-label="Tour 简明目录"><h3>In this tour.</h3><ol class="entry-flow"><li><a href="./tour.html#home"><span>01</span><strong>开始工作</strong><span aria-hidden="true">↗</span></a></li><li><a href="./tour.html#attention"><span>02</span><strong>执行与介入</strong><span aria-hidden="true">↗</span></a></li><li><a href="./tour.html#review"><span>03</span><strong>查看成果与依据</strong><span aria-hidden="true">↗</span></a></li><li><a href="./tour.html#continuity"><span>04</span><strong>把工作继续下去</strong><span aria-hidden="true">↗</span></a></li></ol><p class="entry-actions"><a href="./tour.html">进入完整 Tour →</a></p></nav>
      </article>
    </div>
  </section>`;
}
