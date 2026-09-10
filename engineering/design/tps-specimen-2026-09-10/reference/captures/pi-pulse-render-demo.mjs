import { createMeter } from './dist/meter.js';

// Minimal theme: no color codes, so output is plain text for the capture file.
const theme = { fg: (_name, text) => text };

let clock = 0;
const meter = createMeter({ now: () => clock });

function log(label) {
  console.log(`--- ${label} (t=${clock}ms) ---`);
  console.log('live:  ' + meter.renderLive(theme));
  console.log('final: ' + meter.renderFinal(theme));
}

// Message 1: dispatch -> TTFT 400ms -> stream ~120 tokens (480 chars) over 2000ms -> end.
meter.startAssistantMessage();
clock = 400;
meter.addDelta('text_delta', 'x'.repeat(40)); // first delta arrives, stops TTFT timer
log('mid-stream, first delta just arrived');
clock = 1200;
meter.addDelta('text_delta', 'x'.repeat(200));
log('mid-stream, more deltas');
clock = 2400;
meter.addDelta('text_delta', 'x'.repeat(240));
meter.endAssistantMessage();
log('message 1 complete (idle/frozen)');

// Message 2: faster stream, dispatched right after.
meter.startAssistantMessage();
clock = 2500;
meter.addDelta('text_delta', 'x'.repeat(20));
clock = 3000;
meter.addDelta('text_delta', 'x'.repeat(400));
meter.endAssistantMessage();
log('message 2 complete (idle/frozen, graph now has 2 samples)');

// Idle for a long time: sparkline still shows old bars, but windowed stats (10 min) still valid here.
clock = 3000 + 11 * 60 * 1000; // 11 minutes later, past the 10-minute ALL_TIME_WINDOW_MS
log('idle 11 minutes later (TPS/TTFT stats should have aged out of the 10-min window)');
