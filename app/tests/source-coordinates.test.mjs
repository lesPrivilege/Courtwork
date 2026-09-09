import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { buildSourceCoordinates, SOURCE_COORDINATES } from '../runtime/source-coordinates.mjs';

// ---------------------------------------------------------------------------
// MR-A1a tests. Expected values come from an INDEPENDENT oracle below, never
// from echoing the implementation: validity is judged by a fatal TextDecoder,
// and boundary tables are derived by decoding to characters first and then
// measuring the encoded width of each character. The implementation instead
// scans the raw byte stream. The fixture corpus under
// fixtures/source-coordinates/ was also generated with stdlib only.
// ---------------------------------------------------------------------------

const UNITS = ['utf8', 'codePoint', 'utf16'];
const FATAL_DECODER = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
const ORACLE_DECODER = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

// Throws TypeError when bytes are not well-formed UTF-8 (independent validity oracle).
function oracleDecode(bytes) {
  return ORACLE_DECODER.decode(bytes);
}

// Independent boundary model: decode to text, then walk characters with
// codePointAt, measuring each character's UTF-8 byte width by re-encoding it.
// cpByte[cp] is the byte offset of code point cp; cpUtf16[cp] its UTF-16 offset.
function oracleTables(bytes) {
  const text = oracleDecode(bytes);
  const cpByte = [];
  const cpUtf16 = [];
  let byte = 0;
  let utf16 = 0;
  for (let i = 0; i < text.length; ) {
    cpByte.push(byte);
    cpUtf16.push(utf16);
    const cp = text.codePointAt(i);
    const w16 = cp > 0xffff ? 2 : 1;
    byte += Buffer.byteLength(String.fromCodePoint(cp), 'utf8');
    utf16 += w16;
    i += w16;
  }
  cpByte.push(byte);
  cpUtf16.push(utf16);
  return { text, byteLength: bytes.byteLength, cpCount: cpByte.length - 1, utf16Length: utf16, cpByte, cpUtf16 };
}

const fromHex = (hex) => Uint8Array.from(hex.match(/../g) ?? [], (pair) => parseInt(pair, 16));
const shaOf = (bytes) => createHash('sha256').update(bytes).digest('hex');
const bytesOf = (text) => Uint8Array.from(Buffer.from(text, 'utf8'));

function hasCode(error, code) {
  return error instanceof Error && error.code === code;
}

// Full parity check between the module and the independent oracle for one
// well-formed byte buffer: text, lengths, hash, every boundary in all three
// units, every interior/out-of-range rejection and all round trips.
function assertParity(bytes) {
  const ref = oracleTables(bytes);
  const got = buildSourceCoordinates(bytes);

  assert.equal(got.text, ref.text);
  assert.equal(got.byteLength, ref.byteLength, 'byteLength matches oracle');
  assert.equal(got.codePointLength, ref.cpCount, 'codePointLength matches oracle');
  assert.equal(got.utf16Length, ref.utf16Length, 'utf16Length matches oracle');
  assert.equal(got.utf16Length, got.text.length, 'utf16Length equals decoded text length');
  assert.equal(got.byteLength, bytes.byteLength, 'byteLength equals input length');
  assert.equal(got.contentSha256, shaOf(bytes), 'contentSha256 is the SHA-256 of the input bytes');

  // Byte-preserving round trip: re-encoding the reported text restores the input.
  assert.deepEqual(Uint8Array.from(Buffer.from(got.text, 'utf8')), bytes, 'text re-encodes to the original bytes');

  // codePoint -> utf8 / utf16 on every code point.
  for (let cp = 0; cp <= ref.cpCount; cp += 1) {
    assert.equal(got.toOffset(cp, 'codePoint', 'utf8'), ref.cpByte[cp], `codePoint ${cp} -> utf8`);
    assert.equal(got.toOffset(cp, 'codePoint', 'utf16'), ref.cpUtf16[cp], `codePoint ${cp} -> utf16`);
  }

  // utf8 / utf16 boundary -> codePoint on every boundary.
  for (let cp = 0; cp <= ref.cpCount; cp += 1) {
    assert.equal(got.toOffset(ref.cpByte[cp], 'utf8', 'codePoint'), cp, `utf8 boundary ${ref.cpByte[cp]} -> codePoint`);
    assert.equal(got.toOffset(ref.cpUtf16[cp], 'utf16', 'codePoint'), cp, `utf16 boundary ${ref.cpUtf16[cp]} -> codePoint`);
  }

  // Every non-boundary byte offset and every non-boundary UTF-16 offset is rejected.
  for (let b = 0; b <= ref.byteLength; b += 1) {
    if (ref.cpByte.includes(b)) continue;
    assert.throws(() => got.toOffset(b, 'utf8', 'codePoint'), (e) => hasCode(e, 'invalid_offset'), `utf8 interior ${b}`);
  }
  for (let u = 0; u <= ref.utf16Length; u += 1) {
    if (ref.cpUtf16.includes(u)) continue;
    assert.throws(() => got.toOffset(u, 'utf16', 'codePoint'), (e) => hasCode(e, 'invalid_offset'), `utf16 interior ${u}`);
  }

  // Every in-range codePoint offset is a boundary (identity mapping).
  for (let cp = 0; cp <= ref.cpCount; cp += 1) {
    assert.equal(got.toOffset(cp, 'codePoint', 'codePoint'), cp);
  }

  // Round trips through every ordered unit pair on every boundary of the source unit.
  const boundaries = { utf8: ref.cpByte, codePoint: [...Array(ref.cpCount + 1).keys()], utf16: ref.cpUtf16 };
  for (const from of UNITS) {
    for (const start of boundaries[from]) {
      for (const to of UNITS) {
        const mid = got.toOffset(start, from, to);
        assert.equal(got.toOffset(mid, to, from), start, `${from} ${start} -> ${to} ${mid} -> ${from}`);
        assert.equal(got.toOffset(mid, to, to), mid, `${to} ${mid} is a boundary (identity)`);
      }
    }
  }
}

test('MR-A1a: meta contract — version, units and byte limit are explicit', () => {
  assert.equal(SOURCE_COORDINATES.version, 1);
  assert.deepEqual([...SOURCE_COORDINATES.units], UNITS);
  assert.equal(SOURCE_COORDINATES.maxBytes, 65536);
  assert.equal(Object.isFrozen(SOURCE_COORDINATES), true);
});

test('MR-A1a: plain ASCII — counts, hash and identity conversions', () => {
  const bytes = bytesOf('Hello, world!\n');
  const got = buildSourceCoordinates(bytes);
  assert.equal(got.text, 'Hello, world!\n');
  assert.equal(got.byteLength, 14);
  assert.equal(got.codePointLength, 14);
  assert.equal(got.utf16Length, 14);
  assert.equal(got.contentSha256, shaOf(bytes));
  assert.equal(got.toOffset(7, 'utf8', 'codePoint'), 7);
  assert.equal(got.toOffset(7, 'utf8', 'utf16'), 7);
  assert.equal(got.toOffset(7, 'codePoint', 'utf8'), 7);
  assert.equal(got.toOffset(14, 'utf8', 'utf8'), 14); // end boundary
});

test('MR-A1a: empty content is allowed and every offset except 0 is rejected', () => {
  const got = buildSourceCoordinates(new Uint8Array(0));
  assert.equal(got.text, '');
  assert.equal(got.byteLength, 0);
  assert.equal(got.codePointLength, 0);
  assert.equal(got.utf16Length, 0);
  assert.equal(got.contentSha256, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  for (const unit of UNITS) {
    assert.equal(got.toOffset(0, unit, unit), 0);
    assert.equal(got.toOffset(0, unit, 'codePoint'), 0);
    assert.throws(() => got.toOffset(1, unit, 'codePoint'), (e) => hasCode(e, 'invalid_offset'));
  }
});

test('MR-A1a: BOM is preserved, counted as one code point, never stripped', () => {
  const bytes = bytesOf('\uFEFF# 标题\n正文\r\n');
  const got = buildSourceCoordinates(bytes);
  assert.equal(got.text[0], '\uFEFF', 'leading BOM is preserved in text');
  assert.equal(got.codePointLength, 10, 'BOM counts as one code point');
  assert.equal(got.byteLength, 20);
  // Code point 0 is the BOM; code point 1 starts after its three bytes.
  assert.equal(got.toOffset(1, 'codePoint', 'utf8'), 3);
  assert.equal(got.toOffset(1, 'codePoint', 'utf16'), 1);
  assert.equal(got.toOffset(3, 'utf8', 'codePoint'), 1);
  assert.equal(got.toOffset(3, 'utf8', 'utf16'), 1);
  assert.deepEqual(Uint8Array.from(Buffer.from(got.text, 'utf8')), bytes);

  const mid = buildSourceCoordinates(bytesOf('a\uFEFFb'));
  assert.equal(mid.text, 'a\uFEFFb');
  assert.equal(mid.codePointLength, 3);
  assert.equal(mid.toOffset(1, 'codePoint', 'utf8'), 1);
  assert.equal(mid.toOffset(2, 'codePoint', 'utf8'), 4); // internal FEFF is 3 bytes

  const only = buildSourceCoordinates(bytesOf('\uFEFF'));
  assert.equal(only.text, '\uFEFF');
  assert.equal(only.codePointLength, 1);
  assert.equal(only.utf16Length, 1);
  assert.equal(only.byteLength, 3);
});

test('MR-A1a: CRLF and trailing newline are literal code points, not normalized', () => {
  const bytes = bytesOf('line1\r\nline2\r\n');
  const got = buildSourceCoordinates(bytes);
  assert.equal(got.text, 'line1\r\nline2\r\n');
  assert.equal(got.codePointLength, 14, 'CR and LF count separately');
  assert.equal(got.utf16Length, 14);
  assert.equal(got.byteLength, 14);
  assert.deepEqual(Uint8Array.from(Buffer.from(got.text, 'utf8')), bytes);
  // CR starts at code point 5, LF at 6, LF at 13 (trailing newline preserved).
  assert.equal(got.toOffset(6, 'codePoint', 'utf8'), 6);
  assert.equal(got.toOffset(13, 'codePoint', 'utf8'), 13);
  assert.equal(got.text.at(-1), '\n');
});

test('MR-A1a: combining characters are preserved; no Unicode normalization happens', () => {
  const bytes = bytesOf('e\u0301\u0323'); // e + U+0301 + U+0323, never NFC-folded
  const got = buildSourceCoordinates(bytes);
  assert.equal(got.text, 'e\u0301\u0323');
  assert.notEqual(got.text, 'e\u0301\u0323'.normalize('NFC'), 'input must not be NFC-folded');
  assert.equal(got.codePointLength, 3);
  assert.equal(got.utf16Length, 3);
  assert.equal(got.byteLength, 5); // 1 + 2 + 2
  assert.equal(got.toOffset(1, 'codePoint', 'utf8'), 1);
  assert.equal(got.toOffset(2, 'codePoint', 'utf8'), 3);

  const mixed = buildSourceCoordinates(bytesOf('é e\u0301')); // precomposed and decomposed coexist
  assert.equal(mixed.text, 'é e\u0301');
  assert.equal(mixed.codePointLength, 4);
  assert.deepEqual(Uint8Array.from(Buffer.from(mixed.text, 'utf8')), bytesOf('é e\u0301'));
});

test('MR-A1a: emoji/astral — surrogate-pair interiors are rejected, never snapped', () => {
  const bytes = bytesOf('a😀'); // 0x61 F0 9F 98 80
  const got = buildSourceCoordinates(bytes);
  assert.equal(got.text, 'a😀');
  assert.equal(got.byteLength, 5);
  assert.equal(got.codePointLength, 2);
  assert.equal(got.utf16Length, 3);
  assert.equal(got.text.length, 3);
  // utf8 boundaries: 0, 1, 5. Interiors 2, 3, 4 must be rejected.
  for (const interior of [2, 3, 4]) {
    assert.throws(() => got.toOffset(interior, 'utf8', 'codePoint'), (e) => hasCode(e, 'invalid_offset'), `utf8 interior ${interior}`);
    assert.throws(() => got.toOffset(interior, 'utf8', 'utf16'), (e) => hasCode(e, 'invalid_offset'));
  }
  // utf16 boundaries: 0, 1, 3. Interior 2 (inside the pair) must be rejected.
  assert.throws(() => got.toOffset(2, 'utf16', 'codePoint'), (e) => hasCode(e, 'invalid_offset'));
  assert.throws(() => got.toOffset(2, 'utf16', 'utf8'), (e) => hasCode(e, 'invalid_offset'));
  assert.equal(got.toOffset(1, 'utf8', 'utf16'), 1);
  assert.equal(got.toOffset(5, 'utf8', 'utf16'), 3);
  assert.equal(got.toOffset(3, 'utf16', 'codePoint'), 2);
  assert.equal(got.toOffset(2, 'codePoint', 'utf16'), 3);
  assert.equal(got.toOffset(2, 'codePoint', 'utf8'), 5);
  assert.equal(got.toOffset(1, 'codePoint', 'utf16'), 1);
});

test('MR-A1a: strict UTF-8 — malformed and truncated input is rejected with invalid_utf8', () => {
  const invalidHexes = [
    'e4', 'e4b8', 'f09f98',               // truncated 2/3/4-byte tails
    '80', '618062', '8041',               // stray / interleaved continuations
    'c080', 'c1bf', 'e08080',             // overlong encodings
    'eda080', 'edbfbf',                   // encoded surrogate code points
    'f4908080', 'f5808080', 'ff',         // above U+10FFFF / illegal leads
    'c228a1', 'e228a1', '41e4b8',         // structurally broken sequences
  ];
  for (const hex of invalidHexes) {
    const bytes = fromHex(hex);
    assert.throws(() => oracleDecode(bytes), undefined, `oracle rejects ${hex}`);
    assert.throws(() => buildSourceCoordinates(bytes), (e) => hasCode(e, 'invalid_utf8'), `module rejects ${hex}`);
  }
  // A single bad byte among valid content still rejects the whole buffer.
  const mixed = Uint8Array.from([...bytesOf('ok '), 0xe4, ...bytesOf(' after')]);
  assert.throws(() => buildSourceCoordinates(mixed), (e) => hasCode(e, 'invalid_utf8'));
});

test('MR-A1a: size boundaries — 65536 bytes accepted, 65537 rejected as source_too_large', () => {
  const full = new Uint8Array(65536).fill(0x61); // 'a'
  const got = buildSourceCoordinates(full);
  assert.equal(got.byteLength, 65536);
  assert.equal(got.codePointLength, 65536);
  assert.equal(got.utf16Length, 65536);
  assert.equal(got.text.length, 65536);
  assert.equal(got.contentSha256, shaOf(full));

  const over = new Uint8Array(65537).fill(0x61);
  assert.throws(() => buildSourceCoordinates(over), (e) => hasCode(e, 'source_too_large'));

  // Multi-byte characters still count against the byte budget.
  const atLimit = new Uint8Array(65534).fill(0x61);
  const tail = bytesOf('é');
  const combined = new Uint8Array(65536);
  combined.set(atLimit);
  combined.set(tail, 65534);
  const got2 = buildSourceCoordinates(combined);
  assert.equal(got2.byteLength, 65536);
  assert.equal(got2.codePointLength, 65535);

  const over2 = new Uint8Array(65535).fill(0x61);
  const combined2 = new Uint8Array(65537);
  combined2.set(over2);
  combined2.set(tail, 65535);
  assert.throws(() => buildSourceCoordinates(combined2), (e) => hasCode(e, 'source_too_large'));

  // The size gate is deterministic and precedes decoding: an oversized buffer
  // that is also malformed still reports source_too_large, not invalid_utf8.
  const hugeBad = new Uint8Array(70000).fill(0xff);
  assert.throws(() => buildSourceCoordinates(hugeBad), (e) => hasCode(e, 'source_too_large'));
});

test('MR-A1a: offset validation — unsafe integers, wrong ranges and bad units', () => {
  const bytes = bytesOf('a😀'); // byteLength 5, codePointLength 2, utf16Length 3
  const got = buildSourceCoordinates(bytes);

  for (const bad of [NaN, Infinity, -Infinity, -1, 1.5, '0', null, undefined, {}, 2 ** 53]) {
    assert.throws(() => got.toOffset(bad, 'codePoint', 'utf8'), (e) => hasCode(e, 'invalid_offset'), `non-safe offset ${String(bad)}`);
  }
  // Out of range in every unit.
  assert.throws(() => got.toOffset(3, 'codePoint', 'utf8'), (e) => hasCode(e, 'invalid_offset'));
  assert.throws(() => got.toOffset(6, 'utf8', 'codePoint'), (e) => hasCode(e, 'invalid_offset'));
  assert.throws(() => got.toOffset(4, 'utf16', 'codePoint'), (e) => hasCode(e, 'invalid_offset'));

  for (const badUnit of ['bytes', 'codePoints', 'UTF8', 'utf-8', 'grapheme', '', 'utf16le']) {
    assert.throws(() => got.toOffset(0, 'codePoint', badUnit), (e) => hasCode(e, 'invalid_coordinate_unit'), `target unit ${badUnit}`);
    assert.throws(() => got.toOffset(0, badUnit, 'codePoint'), (e) => hasCode(e, 'invalid_coordinate_unit'), `source unit ${badUnit}`);
  }
  assert.throws(() => got.toOffset(0, 'codePoint', 'utf16x'), (e) => hasCode(e, 'invalid_coordinate_unit'));

  // A UTF-16 offset inside a surrogate pair is rejected as invalid_offset,
  // distinct from an unknown-unit error.
  assert.throws(() => got.toOffset(2, 'utf16', 'utf8'), (e) => hasCode(e, 'invalid_offset'));
});

test('MR-A1a: input is copied — later mutation never reaches the built coordinates', () => {
  const bytes = bytesOf('# 标题\n正文\r\n结尾😀\n');
  const snapshot = new Uint8Array(bytes);
  const hash = shaOf(bytes);
  const got = buildSourceCoordinates(bytes);

  // Building must not mutate the caller's buffer.
  assert.deepEqual(bytes, snapshot);

  const expectedText = got.text;
  const expected = (u) => got.toOffset(2, u, 'utf8');
  const probeBefore = got.toOffset(9, 'codePoint', 'utf8');
  const probeBeforeUtf16 = got.toOffset(9, 'codePoint', 'utf16');

  bytes.fill(0x61); // caller overwrites the original buffer with a different, still-valid stream
  assert.equal(got.text, expectedText, 'text unchanged after input mutation');
  assert.equal(got.contentSha256, hash, 'hash unchanged after input mutation');
  assert.equal(got.byteLength, snapshot.byteLength);
  assert.equal(got.toOffset(9, 'codePoint', 'utf8'), probeBefore);
  assert.equal(got.toOffset(9, 'codePoint', 'utf16'), probeBeforeUtf16);

  // A fresh build from the destroyed buffer is independent of the first result.
  const fresh = buildSourceCoordinates(bytes);
  assert.notEqual(fresh.contentSha256, hash);
  assert.equal(fresh.byteLength, snapshot.byteLength);
  assert.notEqual(fresh.text, expectedText);
  assert.equal(expected('codePoint'), got.toOffset(2, 'codePoint', 'utf8'), 'old result keeps converting correctly');
});

test('MR-A1a: Buffer and offset views are accepted and measured by their own bytes', () => {
  const text = '条款 🙂 结束';
  const buf = Buffer.from(text, 'utf8');
  const got = buildSourceCoordinates(buf);
  assert.equal(got.text, text);
  assert.equal(got.byteLength, buf.byteLength);
  assert.equal(got.contentSha256, shaOf(new Uint8Array(buf)));

  // A subarray view: only the visible range is read, hashed and mapped.
  const pool = Buffer.alloc(64, 0xff); // surrounding padding is not valid UTF-8
  pool.set(buf, 10);
  const view = pool.subarray(10, 10 + buf.byteLength);
  const gotView = buildSourceCoordinates(view);
  assert.equal(gotView.text, text);
  assert.equal(gotView.byteLength, buf.byteLength);
  assert.equal(gotView.contentSha256, got.contentSha256);
  assert.throws(() => buildSourceCoordinates(pool), (e) => hasCode(e, 'invalid_utf8'), 'the surrounding padding is not part of the view');

  // A plain Uint8Array over a larger ArrayBuffer with a byteOffset.
  const backing = new ArrayBuffer(32);
  const region = new Uint8Array(backing, 4, 5); // 'Hello' written below
  region.set(bytesOf('Hello'));
  const gotRegion = buildSourceCoordinates(region);
  assert.equal(gotRegion.text, 'Hello');
  assert.equal(gotRegion.byteLength, 5);
});

test('MR-A1a: wrong input types are a caller contract violation (TypeError)', () => {
  for (const bad of ['text', Buffer.from('x', 'utf8').toString('latin1'), 42, null, undefined, {}, [], new DataView(new ArrayBuffer(4)), new Int8Array([65]), new Uint16Array([65]), new Float64Array([1]), new Uint8ClampedArray([65])]) {
    assert.throws(() => buildSourceCoordinates(bad), TypeError, `rejects ${Object.prototype.toString.call(bad)}`);
  }
});

test('MR-A1a: returned object is frozen; output metadata edits cannot pollute conversions', () => {
  const bytes = bytesOf('A😀B');
  const got = buildSourceCoordinates(bytes);
  assert.equal(Object.isFrozen(got), true);

  const probe = got.toOffset(2, 'codePoint', 'utf8');
  assert.throws(() => { got.byteLength = 0; }, TypeError);
  assert.throws(() => { got.text = 'x'; }, TypeError);
  assert.throws(() => { got.contentSha256 = 'x'; }, TypeError);
  assert.throws(() => { got.codePointLength = 0; }, TypeError);
  assert.throws(() => { got.toOffset = () => 0; }, TypeError);
  assert.throws(() => { delete got.text; }, TypeError);
  assert.throws(() => { got.extra = 1; }, TypeError);

  // toOffset keeps working after failed writes and does not depend on `this`.
  assert.equal(got.toOffset(2, 'codePoint', 'utf8'), probe);
  const { toOffset } = got;
  assert.equal(toOffset(2, 'codePoint', 'utf8'), probe);
  assert.equal(toOffset(1, 'codePoint', 'utf8'), 1);
  assert.throws(() => toOffset(2, 'utf16', 'utf8'), (e) => hasCode(e, 'invalid_offset')); // inside the 😀 pair
});

test('MR-A1a: repeated builds are deterministic and independent of each other', () => {
  const bytes = bytesOf('# 标题\r\n- 项目 😀\n');
  const a = buildSourceCoordinates(bytes);
  const b = buildSourceCoordinates(bytes);
  assert.equal(a.text, b.text);
  assert.equal(a.contentSha256, b.contentSha256);
  assert.equal(a.byteLength, b.byteLength);
  assert.equal(a.toOffset(4, 'codePoint', 'utf16'), b.toOffset(4, 'codePoint', 'utf16'));
  assert.notEqual(a, b);
  // A second build is not polluted by writes attempted on the first.
  assert.throws(() => { a.toOffset = null; }, TypeError);
  assert.equal(b.toOffset(4, 'codePoint', 'utf16'), b.toOffset(4, 'codePoint', 'utf16'));
});

test('MR-A1a: fixture corpus parity — module equals the independent oracle and the static expectations', async () => {
  const fixture = JSON.parse(await readFile(new URL('./fixtures/source-coordinates/corpus.json', import.meta.url), 'utf8'));
  assert.equal(fixture.schemaVersion, 1);
  assert.ok(fixture.cases.length >= 12, `expected a broad corpus, got ${fixture.cases.length}`);

  for (const entry of fixture.cases) {
    const bytes = fromHex(entry.hex);
    const got = buildSourceCoordinates(bytes);
    assertParity(bytes); // oracle cross-check, exhaustive on boundaries/rejections
    // Static independent expectations from the stdlib-only generator.
    assert.equal(got.byteLength, entry.expected.byteLength, `${entry.id} byteLength`);
    assert.equal(got.codePointLength, entry.expected.codePointLength, `${entry.id} codePointLength`);
    assert.equal(got.utf16Length, entry.expected.utf16Length, `${entry.id} utf16Length`);
    assert.equal(got.contentSha256, entry.expected.contentSha256, `${entry.id} contentSha256`);
    assert.equal(got.text, entry.text, `${entry.id} text`);
  }

  for (const entry of fixture.invalidCases) {
    const bytes = fromHex(entry.hex);
    assert.throws(() => oracleDecode(bytes), undefined, `oracle rejects fixture ${entry.id}`);
    assert.throws(() => buildSourceCoordinates(bytes), (e) => hasCode(e, 'invalid_utf8'), `module rejects fixture ${entry.id}`);
  }
});

test('MR-A1a: NUL and control characters are ordinary code points, never trimmed', () => {
  const bytes = bytesOf('a\x00b\x1f\x7f\x01');
  const got = buildSourceCoordinates(bytes);
  assert.equal(got.text, 'a\x00b\x1f\x7f\x01');
  assert.equal(got.codePointLength, 6);
  assert.equal(got.byteLength, 6);
  assert.equal(got.toOffset(1, 'codePoint', 'utf8'), 1);
  assert.deepEqual(Uint8Array.from(Buffer.from(got.text, 'utf8')), bytes);
});
