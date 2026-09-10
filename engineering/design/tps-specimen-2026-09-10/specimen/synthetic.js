/* WO-TPS-01 · SYNTHETIC DATA GENERATOR. Nothing in this file is a measurement.
 *
 * Purpose: produce a reproducible, obviously invented token stream so the specimen can
 * show what a decode-rate readout would look like IF an owner one day reported a token
 * clock. Courtwork has no such owner today (app/docs/request-telemetry.md line 9:
 * decodeTokensPerSecond is null, missing ['provider_token_timing','token_deltas']).
 *
 * Reproducibility: every number is a pure function of (scenario, seed). Run
 *   node engineering/design/tps-specimen-2026-09-10/specimen/synthetic.js
 * to print the scenario summaries the page renders.
 *
 * Distributions (all times in synthetic owner-clock milliseconds):
 *   PRNG ........ mulberry32(seed); normal draws by Box–Muller from the same stream
 *   time to first token per request ... 400 + Exp(mean 500), clamped to <= 2500
 *   base decode rate per request ...... Normal(40, 6) tok/s, clamped to [18, 70]
 *   output tokens per request ......... uniform integer [minTokens, maxTokens]
 *   chunk size ........................ uniform integer 1..6 tokens (provider batching)
 *   gap before a chunk ................ size / rate * U(0.5, 1.5) seconds
 *   stall ............................. with p = 0.04 per chunk, + U(250, 800) ms
 *   gap between requests (tool work) .. U(500, 1400)
 * The chunk list is the hidden "truth". The page never shows it directly; it only
 * shows the two sample streams an owner might emit (see README · assumed contract):
 *   perRequest ... one terminal record per request: {requestId, phase, decodeTokens,
 *                  decodeMs} where decode = tokens after the first chunk / owner time
 *                  from the first chunk to the last chunk (time to first token excluded)
 *   interval ..... {requestId, seq, tMs, outputTokensCumulative} every intervalMs of
 *                  owner clock from the first chunk while the request is open, plus
 *                  one closing sample at the last chunk
 * Terminal scenarios: `failAt` / `cancelAt` end request k after a fraction of its
 * tokens; that request gets phase failed/cancelled and decode fields null.
 */
(function (root) {
  'use strict';

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const SCENARIOS = {
    // Played live on the page: short enough to watch at 1x owner clock.
    live:      { seed: 20260910, requests: 6,  minTokens: 70,  maxTokens: 200 },
    // Static snapshots for the width / form comparisons: fills a 60px (15-slot) locus.
    long:      { seed: 20260911, requests: 16, minTokens: 90,  maxTokens: 320 },
    failed:    { seed: 20260912, requests: 5,  minTokens: 70,  maxTokens: 200, failAt: { request: 5, fraction: 0.45 } },
    cancelled: { seed: 20260913, requests: 4,  minTokens: 70,  maxTokens: 200, cancelAt: { request: 4, fraction: 0.3 } },
  };

  function generate(name, { intervalMs = 500 } = {}) {
    const spec = SCENARIOS[name];
    if (!spec) throw new Error(`unknown scenario ${name}`);
    const rand = mulberry32(spec.seed);
    const uniform = (lo, hi) => lo + (hi - lo) * rand();
    const int = (lo, hi) => Math.floor(uniform(lo, hi + 1));
    const normal = (mean, sd) => {
      const u = Math.max(rand(), 1e-12), v = rand();
      return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    const exp = mean => -mean * Math.log(Math.max(rand(), 1e-12));

    const requests = [];
    let clock = 0;
    for (let id = 1; id <= spec.requests; id++) {
      const dispatchMs = clock;
      const ttft = Math.min(2500, 400 + exp(500));
      const rate = Math.min(70, Math.max(18, normal(40, 6)));
      const total = int(spec.minTokens, spec.maxTokens);
      const stop = spec.failAt?.request === id ? { phase: 'failed', at: Math.round(total * spec.failAt.fraction) }
        : spec.cancelAt?.request === id ? { phase: 'cancelled', at: Math.round(total * spec.cancelAt.fraction) }
        : null;
      const limit = stop ? stop.at : total;
      const chunks = [];
      let t = dispatchMs + ttft, count = 0;
      while (count < limit) {
        const size = Math.min(int(1, 6), limit - count);
        if (chunks.length) {
          t += (size / rate) * 1000 * uniform(0.5, 1.5);
          if (rand() < 0.04) t += uniform(250, 800);
        }
        count += size;
        chunks.push({ tMs: Math.round(t), cumulative: count });
      }
      const endMs = stop ? Math.round(t + uniform(120, 400)) : chunks.at(-1).tMs;
      const first = chunks[0], last = chunks.at(-1);
      const phase = stop ? stop.phase : 'completed';
      const decodeTokens = phase === 'completed' ? last.cumulative - first.cumulative : null;
      const decodeMs = phase === 'completed' ? last.tMs - first.tMs : null;

      // Interval stream: owner timer from the first chunk; cumulative = tokens seen by then.
      const interval = [];
      let seq = 0;
      for (let s = first.tMs; s < last.tMs; s += intervalMs) {
        let c = 0;
        for (const ch of chunks) if (ch.tMs <= s) c = ch.cumulative; else break;
        interval.push({ requestId: id, seq: seq++, tMs: s, outputTokensCumulative: c });
      }
      interval.push({ requestId: id, seq: seq++, tMs: last.tMs, outputTokensCumulative: last.cumulative });

      requests.push({
        requestId: id, dispatchMs, firstTokenMs: first.tMs, endMs, phase, baseRate: rate,
        chunks, interval,
        terminal: { requestId: id, tMs: endMs, phase, decodeTokens, decodeMs, outputTokens: last.cumulative },
      });
      clock = endMs + uniform(500, 1400);
    }
    return { name, seed: spec.seed, intervalMs, requests, endMs: requests.at(-1).endMs };
  }

  const rateOf = terminal => terminal.decodeMs > 0 ? terminal.decodeTokens / (terminal.decodeMs / 1000) : null;

  function median(values) {
    if (!values.length) return null;
    const s = [...values].sort((a, b) => a - b), m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  const api = { SCENARIOS, generate, rateOf, median, mulberry32 };
  root.TPSSynthetic = api;
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
    if (require.main === module) {
      for (const name of Object.keys(SCENARIOS)) {
        const run = generate(name);
        const rates = run.requests.map(r => rateOf(r.terminal)).filter(v => v !== null);
        console.log(JSON.stringify({
          scenario: name, seed: run.seed, synthetic: true,
          requests: run.requests.map(r => ({ id: r.requestId, phase: r.phase, outputTokens: r.terminal.outputTokens,
            decodeTokens: r.terminal.decodeTokens, decodeMs: r.terminal.decodeMs,
            rate: rateOf(r.terminal) === null ? null : Number(rateOf(r.terminal).toFixed(2)),
            chunks: r.chunks.length, intervalSamples: r.interval.length })),
          min: rates.length ? Math.min(...rates).toFixed(2) : null,
          median: rates.length ? median(rates).toFixed(2) : null,
          max: rates.length ? Math.max(...rates).toFixed(2) : null,
          endMs: run.endMs,
        }));
      }
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
