# OpenRouter model page — chart library DOM check

URL: https://openrouter.ai/anthropic/claude-sonnet-4.5
Method: Claude Browser tool, `javascript_tool` executed against the live rendered page (real browser, JS hydrated). Captured 2026-09-10.

## Script 1 — chart library presence
```js
const svgs = document.querySelectorAll('svg.recharts-surface, svg[class*="recharts"], canvas');
JSON.stringify({svgCount: svgs.length, hasRecharts: !!document.querySelector('[class*="recharts"]')});
```
Result: `{"svgCount":10,"hasRecharts":true}`

## Script 2 — series shape per chart instance
```js
const wrappers = document.querySelectorAll('.recharts-wrapper');
const out = [];
wrappers.forEach(w => {
  out.push({
    lines: w.querySelectorAll('.recharts-line').length,
    areas: w.querySelectorAll('.recharts-area').length,
    bars: w.querySelectorAll('.recharts-bar').length,
    dots: w.querySelectorAll('.recharts-dot').length,
    tooltip: !!w.querySelector('.recharts-tooltip-wrapper'),
  });
});
JSON.stringify(out);
```
Result:
```json
[{"lines":14,"areas":0,"bars":0,"dots":0,"tooltip":true},
 {"lines":3,"areas":0,"bars":0,"dots":0,"tooltip":true},
 {"lines":3,"areas":0,"bars":0,"dots":0,"tooltip":true},
 {"lines":3,"areas":0,"bars":0,"dots":0,"tooltip":true},
 {"lines":3,"areas":0,"bars":0,"dots":0,"tooltip":true},
 {"lines":3,"areas":0,"bars":0,"dots":0,"tooltip":true},
 {"lines":3,"areas":0,"bars":0,"dots":0,"tooltip":true},
 {"lines":2,"areas":0,"bars":0,"dots":0,"tooltip":true},
 {"lines":0,"areas":0,"bars":3,"dots":0,"tooltip":true},
 {"lines":0,"areas":0,"bars":4,"dots":0,"tooltip":true}]
```

## Reading
Ten separate Recharts instances on the model detail page: multi-line time-series charts (up to 14 lines — likely one per competing provider endpoint) with hover tooltips, plus two bar-chart instances (pricing/uptime-style). This is a dashboard-scale historical comparison surface, not an inline live sparkline. A pixel screenshot could not be captured in this pass because the Browser pane was hidden (headless) during this research session; DOM/JS-execution evidence stands in its place. Section copy captured from the same page (`document` text, same load): "Throughput is how fast the model writes (tokens per second — higher is better). Latency is total round-trip time (lower is better). TTFT is time-to-first-token — how long before you see anything appear (lower is better)." and "Uptime is the percentage of the past 3 days that at least one provider was responding to requests."
