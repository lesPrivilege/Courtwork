// Order 3 frontend · browser-side measurement probe. Inject into the page
// (DevTools console or an automation tool) before starting a Run. It changes no
// product code: it wraps fetch to time event receipt, observes DOM mutations of
// the thread, samples paint with requestAnimationFrame, and records long
// animation frames. Read `window.__streamMeasure.report()` afterwards.
//
// Clock: Date.now() on the same machine as the fixture Host, so receipt can be
// joined with the Host's persistedAt by seq. Paint is the next animation frame
// after the DOM change, an approximation of the frame that shows it.
(() => {
  const m = { polls: [], doms: [], frames: [], loaf: [], started: Date.now() };
  const assistantText = (root) => [...root.querySelectorAll(".message.assistant .message-body, .attention-agent-message.is-assistant .markdown-body")].at(-1)?.textContent.length ?? 0;
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const url = String(args[0]?.url ?? args[0]);
    const sentAt = Date.now();
    const response = await originalFetch(...args);
    const receivedAt = Date.now(); // headers; the app reads the body next
    if (/\/events\?afterSeq=|\/sessions\/[^/?]+$/.test(url)) {
      response.clone().json().then((json) => {
        const events = (json.events || []).filter((e) => e.type?.startsWith("assistant."));
        if (!events.length) return;
        m.polls.push({ t: receivedAt, sentAt, kind: url.includes("afterSeq") ? "cursor" : "detail", minSeq: Math.min(...events.map((e) => e.seq)), maxSeq: Math.max(...events.map((e) => e.seq)), assistantEvents: events.length, lastChars: events.at(-1).data?.text?.length ?? 0, bytes: JSON.stringify(json).length });
      }).catch(() => {});
    }
    return response;
  };
  const observe = (root) => {
    if (!root) return;
    new MutationObserver((records) => {
      const t = Date.now();
      let added = 0, removed = 0;
      for (const r of records) { added += r.addedNodes.length; removed += r.removedNodes.length; }
      const entry = { t, root: root.id || root.className, records: records.length, added, removed, chars: assistantText(root) };
      m.doms.push(entry);
      requestAnimationFrame(() => { entry.paint = Date.now(); });
    }).observe(root, { childList: true, subtree: true, characterData: true });
  };
  observe(document.getElementById("message-stream"));
  const attention = () => document.querySelector(".attention-agent-stream, [data-attention-stream], #attention-agent-stream");
  const waitAttention = setInterval(() => { const node = attention(); if (node && !node.__observed) { node.__observed = true; observe(node); } }, 500);
  let last = performance.now();
  const frame = (now) => { m.frames.push(now - last); last = now; if (m.frames.length < 200000) requestAnimationFrame(frame); };
  requestAnimationFrame(frame);
  try {
    new PerformanceObserver((list) => { for (const e of list.getEntries()) m.loaf.push({ at: Math.round(performance.timeOrigin + e.startTime), duration: e.duration, blocking: e.blockingDuration ?? 0, render: e.renderStart ? e.startTime + e.duration - e.renderStart : null, script: (e.scripts || []).reduce((a, s) => a + s.duration, 0), hidden: document.hidden }); })
      .observe({ type: "long-animation-frame", buffered: false });
  } catch { m.loafUnsupported = true; }
  const pct = (xs, p) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return Math.round(s[Math.min(s.length - 1, Math.floor(p * s.length))]); };
  m.report = () => {
    // Pair each receipt with the first DOM change after it.
    const lags = [], paints = [];
    for (const poll of m.polls) {
      const dom = m.doms.find((d) => d.t >= poll.t);
      if (!dom) continue;
      poll.domAt = dom.t; poll.paintAt = dom.paint ?? null;
      lags.push(dom.t - poll.t);
      if (dom.paint) paints.push(dom.paint - poll.t);
    }
    const gaps = m.frames.slice(1);
    return {
      polls: m.polls.length,
      receiveToDom: { p50: pct(lags, 0.5), p95: pct(lags, 0.95), max: pct(lags, 1) },
      receiveToPaint: { p50: pct(paints, 0.5), p95: pct(paints, 0.95), max: pct(paints, 1) },
      frameGapMs: { p50: pct(gaps, 0.5), p95: pct(gaps, 0.95), max: pct(gaps, 1), over50: gaps.filter((g) => g > 50).length, frames: gaps.length },
      // Frames with script or blocking work; idle frames of a throttled pane are excluded.
      longFrames: (() => { const busy = m.loaf.filter((e) => e.script > 0 || e.blocking > 0); return { count: busy.length, totalMs: Math.round(busy.reduce((a, e) => a + e.duration, 0)), maxMs: Math.round(Math.max(0, ...busy.map((e) => e.duration))), scriptMs: Math.round(busy.reduce((a, e) => a + e.script, 0)), blockingMs: Math.round(busy.reduce((a, e) => a + e.blocking, 0)), idleEntries: m.loaf.length - busy.length, unsupported: Boolean(m.loafUnsupported) }; })(),
      domUpdates: { count: m.doms.length, addedNodes: m.doms.reduce((a, d) => a + d.added, 0), removedNodes: m.doms.reduce((a, d) => a + d.removed, 0) },
      samples: m.polls.map((p) => ({ t: p.t, kind: p.kind, minSeq: p.minSeq, maxSeq: p.maxSeq, lastChars: p.lastChars, bytes: p.bytes, domAt: p.domAt ?? null, paintAt: p.paintAt ?? null })),
    };
  };
  window.__streamMeasure = m;
  return "measure installed";
})();
