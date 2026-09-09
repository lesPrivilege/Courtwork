// MR-A1a independent probe: exhaustive byte-window parity between the module's
// strict UTF-8 validator and a fatal TextDecoder oracle. Never used to produce
// test expectations; it is a one-off cross-check artifact.
import { buildSourceCoordinates } from '../../../app/runtime/source-coordinates.mjs';

const FATAL = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

function oracleThrows(bytes) {
  try { FATAL.decode(bytes); return false; } catch { return true; }
}
function moduleThrows(bytes) {
  try { buildSourceCoordinates(bytes); return false; } catch (e) { return e.code === 'invalid_utf8'; }
}

const mismatches = [];
function check(label, bytes) {
  const o = oracleThrows(bytes);
  const m = moduleThrows(bytes);
  if (o !== m) mismatches.push(`${label} ${Buffer.from(bytes).toString('hex')} oracleInvalid=${o} moduleInvalid=${m}`);
}

let n = 0;
for (let a = 0; a <= 0xff; a += 1) { check('1B', Uint8Array.of(a)); n += 1; }
for (let a = 0; a <= 0xff; a += 1) {
  for (let b = 0; b <= 0xff; b += 1) { check('2B', Uint8Array.of(a, b)); n += 1; }
}
// Tricky 3-byte windows: 0xE0 (overlong floor), 0xED (surrogate ceiling),
// 0xF0 (astral floor), 0xF4 (U+10FFFF ceiling) x every second/third byte.
for (const lead of [0xe0, 0xed, 0xf0, 0xf4]) {
  for (let b = 0; b <= 0xff; b += 1) {
    for (let c = 0; c <= 0xff; c += 1) { check(`3B:${lead.toString(16)}`, Uint8Array.of(lead, b, c)); n += 1; }
  }
}
// Tricky 4-byte windows around the astral/U+10FFFF edges, sampled thirds.
for (const lead of [0xf0, 0xf4]) {
  for (let b = 0; b <= 0xff; b += 1) {
    for (const c of [0x80, 0x8f, 0x90, 0x9f, 0xa0, 0xbf]) {
      for (let d = 0; d <= 0xff; d += 1) { check(`4B:${lead.toString(16)}:${c.toString(16)}`, Uint8Array.of(lead, b, c, d)); n += 1; }
    }
  }
}

console.log(`checked ${n} byte sequences`);
if (mismatches.length === 0) {
  console.log('PARITY OK: module validator and fatal TextDecoder agree on every probe');
  process.exit(0);
} else {
  console.log(`MISMATCHES: ${mismatches.length}`);
  for (const m of mismatches.slice(0, 50)) console.log(' ', m);
  process.exit(1);
}
