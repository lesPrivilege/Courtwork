import { createHash } from 'node:crypto';

// MR-A1a · raw-text coordinate base for the Markdown Review Surface.
//
// This module only turns one immutable UTF-8 byte buffer into raw text plus a
// three-way coordinate map over the ORIGINAL bytes. It never reads files, the
// network, a store or the clock, never normalizes Unicode, never strips BOM,
// CRLF or a trailing newline, and never treats replacement characters as
// repaired input. Astral code points, combining marks, BOM and CRLF are plain
// code points here; grapheme clusters, DOM/display text, Markdown AST spans and
// parser positions are out of scope. Consumers decide the AST/annotation/storage
// contracts on top of this bounded base.
//
// Coordinate semantics (raw text only):
//   utf8       byte offset in the original input (code-point boundaries only)
//   codePoint  code-point index over the decoded text (BOM counts as one)
//   utf16      UTF-16 code-unit offset over the decoded text (astral = 2 units)
// All three are right-unbounded half-open positions; the end of the source is a
// valid boundary. Offsets inside a multi-byte UTF-8 character or inside a
// UTF-16 surrogate pair are rejected, never auto-snapped.

export const SOURCE_COORDINATES = Object.freeze({
  version: 1,
  maxBytes: 65536,
  units: Object.freeze(['utf8', 'codePoint', 'utf16']),
});

const { maxBytes } = SOURCE_COORDINATES;
const UNITS = new Set(SOURCE_COORDINATES.units);
// ignoreBOM keeps a leading U+FEFF in the decoded text; internal U+FEFF is a
// normal code point either way. Decoding runs after strict validation, so the
// non-fatal decoder cannot silently repair anything.
const UTF8_DECODER = new TextDecoder('utf-8', { ignoreBOM: true });

function coordinatesError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

// Accepts Uint8Array, including Node Buffer and cross-realm Uint8Array views.
// Everything else (strings, ArrayBuffer, DataView, other typed arrays) is a
// caller contract violation and surfaces as a plain TypeError: it is not one of
// the frozen content/offset error codes.
function isByteSource(value) {
  return value instanceof Uint8Array ||
    (ArrayBuffer.isView(value) && Object.prototype.toString.call(value) === '[object Uint8Array]');
}

const isContinuation = (byte) => byte >= 0x80 && byte <= 0xbf;

// Strict UTF-8 structural scan (RFC 3629 / WHATWG well-formedness): rejects
// overlong forms, encoded surrogates, code points above U+10FFFF, stray
// continuation bytes and truncated trailing sequences. Returns the byte width
// of every code point; throws invalid_utf8 on the first malformed sequence.
function scanUtf8(bytes) {
  const widths = [];
  const n = bytes.length;
  let i = 0;
  while (i < n) {
    const b = bytes[i];
    let width = 0;
    if (b <= 0x7f) width = 1;
    else if (b >= 0xc2 && b <= 0xdf) width = i + 1 < n && isContinuation(bytes[i + 1]) ? 2 : 0;
    else if (b === 0xe0) width = i + 2 < n && bytes[i + 1] >= 0xa0 && bytes[i + 1] <= 0xbf && isContinuation(bytes[i + 2]) ? 3 : 0;
    else if (b >= 0xe1 && b <= 0xec) width = i + 2 < n && isContinuation(bytes[i + 1]) && isContinuation(bytes[i + 2]) ? 3 : 0;
    else if (b === 0xed) width = i + 2 < n && bytes[i + 1] >= 0x80 && bytes[i + 1] <= 0x9f && isContinuation(bytes[i + 2]) ? 3 : 0;
    else if (b >= 0xee && b <= 0xef) width = i + 2 < n && isContinuation(bytes[i + 1]) && isContinuation(bytes[i + 2]) ? 3 : 0;
    else if (b === 0xf0) width = i + 3 < n && bytes[i + 1] >= 0x90 && bytes[i + 1] <= 0xbf && isContinuation(bytes[i + 2]) && isContinuation(bytes[i + 3]) ? 4 : 0;
    else if (b >= 0xf1 && b <= 0xf3) width = i + 3 < n && isContinuation(bytes[i + 1]) && isContinuation(bytes[i + 2]) && isContinuation(bytes[i + 3]) ? 4 : 0;
    else if (b === 0xf4) width = i + 3 < n && bytes[i + 1] >= 0x80 && bytes[i + 1] <= 0x8f && isContinuation(bytes[i + 2]) && isContinuation(bytes[i + 3]) ? 4 : 0;
    if (width === 0) throw coordinatesError('invalid_utf8', `Invalid UTF-8 at byte offset ${i}.`);
    widths.push(width);
    i += width;
  }
  return widths;
}

/**
 * buildSourceCoordinates(bytes)
 *
 * Accepts only a Uint8Array (Buffer included). The input is copied before any
 * processing, so later caller mutation never affects the returned object, its
 * mappings or later conversions. Empty input is allowed; inputs over
 * maxBytes are rejected with `source_too_large`.
 *
 * Returns a frozen object:
 *   text            decoded UTF-8 text, BOM and all original code points kept
 *   contentSha256   SHA-256 (hex) of the original input bytes
 *   byteLength      input length in bytes
 *   codePointLength code-point count (BOM counts as one)
 *   utf16Length     UTF-16 code-unit count (astral code points count as two)
 *   toOffset(offset, from, to)  maps a boundary offset between utf8 / codePoint /
 *                   utf16; rejects interior offsets, out-of-range offsets,
 *                   non-integers and unknown units with `invalid_offset` /
 *                   `invalid_coordinate_unit`.
 */
export function buildSourceCoordinates(value) {
  if (!isByteSource(value)) {
    throw new TypeError('buildSourceCoordinates expects a Uint8Array (Buffer is accepted) of UTF-8 bytes.');
  }
  const byteLength = value.byteLength;
  if (byteLength > maxBytes) {
    throw coordinatesError('source_too_large', `Source is ${byteLength} bytes; the limit is ${maxBytes} bytes.`);
  }
  const bytes = new Uint8Array(byteLength);
  bytes.set(value); // copy: the caller's buffer stays fully ours to mutate later
  const widths = scanUtf8(bytes);
  const codePointCount = widths.length;

  // Boundary tables: byteStart[cp] / utf16Start[cp] are the utf8 byte offset and
  // utf16 unit offset of the start of code point cp; the final entry is the end
  // of the source in both coordinate systems.
  const byteStart = new Int32Array(codePointCount + 1);
  const utf16Start = new Int32Array(codePointCount + 1);
  let byteCursor = 0;
  let utf16Cursor = 0;
  for (let cp = 0; cp < codePointCount; cp += 1) {
    byteStart[cp] = byteCursor;
    utf16Start[cp] = utf16Cursor;
    byteCursor += widths[cp];
    utf16Cursor += widths[cp] === 4 ? 2 : 1; // 4-byte UTF-8 => astral => surrogate pair
  }
  byteStart[codePointCount] = byteCursor;
  utf16Start[codePointCount] = utf16Cursor;

  // Reverse lookup: which code point starts at a given byte/utf16 offset (-1 =
  // interior or absent). Sized from the scanned totals, so the utf8/utf16 ends
  // are always present.
  const byteToCp = new Int32Array(byteCursor + 1).fill(-1);
  const utf16ToCp = new Int32Array(utf16Cursor + 1).fill(-1);
  for (let cp = 0; cp <= codePointCount; cp += 1) {
    byteToCp[byteStart[cp]] = cp;
    utf16ToCp[utf16Start[cp]] = cp;
  }

  const text = UTF8_DECODER.decode(bytes);

  const source = Object.freeze({
    text,
    contentSha256: createHash('sha256').update(bytes).digest('hex'),
    byteLength: bytes.length,
    codePointLength: codePointCount,
    utf16Length: utf16Cursor,
    toOffset(offset, from, to) {
      if (!UNITS.has(from)) throw coordinatesError('invalid_coordinate_unit', `Unknown source unit '${String(from)}'; expected one of ${SOURCE_COORDINATES.units.join(', ')}.`);
      if (!UNITS.has(to)) throw coordinatesError('invalid_coordinate_unit', `Unknown target unit '${String(to)}'; expected one of ${SOURCE_COORDINATES.units.join(', ')}.`);
      if (!Number.isSafeInteger(offset) || offset < 0) throw coordinatesError('invalid_offset', 'Offset must be a safe non-negative integer.');

      let cp;
      if (from === 'codePoint') {
        if (offset > codePointCount) throw coordinatesError('invalid_offset', `codePoint offset ${offset} is outside 0..${codePointCount}.`);
        cp = offset;
      } else if (from === 'utf8') {
        if (offset > bytes.length) throw coordinatesError('invalid_offset', `utf8 offset ${offset} is outside 0..${bytes.length}.`);
        cp = byteToCp[offset];
        if (cp < 0) throw coordinatesError('invalid_offset', `utf8 offset ${offset} falls inside a multi-byte character; only code-point boundaries are valid.`);
      } else {
        if (offset > utf16Cursor) throw coordinatesError('invalid_offset', `utf16 offset ${offset} is outside 0..${utf16Cursor}.`);
        cp = utf16ToCp[offset];
        if (cp < 0) throw coordinatesError('invalid_offset', `utf16 offset ${offset} falls inside a surrogate pair; only code-point boundaries are valid.`);
      }

      if (to === 'codePoint') return cp;
      if (to === 'utf8') return byteStart[cp];
      return utf16Start[cp];
    },
  });
  return source;
}
