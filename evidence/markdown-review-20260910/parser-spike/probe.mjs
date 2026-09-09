import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';

// A bounded parser experiment, not the product's source-map implementation.
const processor = unified().use(remarkParse).use(remarkGfm);
const parse = (source) => processor.parse(source);
const digest = (s) => createHash('sha256').update(s).digest('hex');
const slice = (s, node) => s.slice(node.position.start.offset, node.position.end.offset);
const rows = [];
function probe(id, fn) {
  try { rows.push({ id, status: 'passed', observation: fn() }); }
  catch (error) { rows.push({ id, status: 'failed', error: error.message }); }
}

probe('P01-utf16-is-not-codepoints', () => {
  const source = '😀 **中文**';
  const leaf = parse(source).children[0].children[1].children[0];
  assert.equal(slice(source, leaf), '中文');
  assert.equal(leaf.position.start.offset, 5);
  assert.equal([...source.slice(0, 5)].length, 4);
  assert.equal(Buffer.byteLength(source.slice(0, 5)), 7);
  return { utf16: 5, codepoints: 4, utf8Bytes: 7 };
});

probe('P02-bom-naive-source-slice-is-wrong', () => {
  const source = '\uFEFF# 测试😀\r\n';
  const leaf = parse(source).children[0].children[0];
  const naive = slice(source, leaf);
  assert.notEqual(naive, leaf.value);
  // Explicitly omit exactly one leading BOM for parsing, retain original bytes.
  const parserInput = source.slice(1);
  const correctedLeaf = parse(parserInput).children[0].children[0];
  const corrected = source.slice(correctedLeaf.position.start.offset + 1, correctedLeaf.position.end.offset + 1);
  assert.equal(corrected, '测试😀');
  return { naive, corrected, sourceSha256: digest(source), parserInputSha256: digest(parserInput) };
});

probe('P03-crlf-source-is-not-normalized', () => {
  const source = '# 标题\r\n\r\n第一行\r\n第二行\r\n';
  const paragraph = parse(source).children[1];
  assert.equal(slice(source, paragraph), '第一行\r\n第二行');
  assert.notEqual(digest(source), digest(source.replaceAll('\r\n', '\n')));
  return { raw: slice(source, paragraph), sourceBytes: Buffer.byteLength(source) };
});

probe('P04-entity-node-range-is-not-character-map', () => {
  const source = 'A &amp; B';
  const node = parse(source).children[0].children[0];
  assert.equal(node.value, 'A & B');
  assert.equal(slice(source, node), source);
  assert.notEqual(node.value.length, node.position.end.offset - node.position.start.offset);
  return { displayed: node.value, raw: source };
});

probe('P05-code-delimiters-are-not-display-text', () => {
  const source = '```js\nconst x = 1;\n```\n';
  const code = parse(source).children[0];
  assert.equal(code.value, 'const x = 1;');
  assert.ok(slice(source, code).startsWith('```js'));
  assert.notEqual(code.value, slice(source, code));
  return { value: code.value, raw: slice(source, code) };
});

probe('P06-later-definition-changes-earlier-semantics', () => {
  const prefix = '[policy][p]\n\n';
  const complete = `${prefix}[p]: https://example.invalid/policy\n`;
  const before = parse(prefix).children[0].children[0];
  const after = parse(complete).children[0].children[0];
  assert.equal(before.type, 'text');
  assert.equal(after.type, 'linkReference');
  assert.equal(slice(prefix, before), slice(complete, after));
  return { before: before.type, after: after.type, consequence: 'closed visual blocks can still depend on later definitions' };
});

probe('P07-content-hash-does-not-identify-duplicate-block', () => {
  const source = 'Same clause.\n\nSame clause.\n';
  const [a, b] = parse(source).children;
  assert.equal(digest(slice(source, a)), digest(slice(source, b)));
  assert.notEqual(a.position.start.offset, b.position.start.offset);
  return { equalHash: true, offsets: [a.position.start.offset, b.position.start.offset] };
});

probe('P08-no-unicode-normalization-of-canonical-bytes', () => {
  const source = 'e\u0301';
  assert.equal(parse(source).children[0].children[0].value, source);
  assert.notEqual(digest(source), digest(source.normalize('NFC')));
  return { codepoints: [...source].length, normalizedCodepoints: [...source.normalize('NFC')].length };
});

probe('P09-gfm-table-has-syntax-outside-cell-text', () => {
  const source = '| A | B |\n| - | - |\n| 中 | 😀 |\n';
  const table = parse(source).children[0];
  assert.equal(table.type, 'table');
  assert.equal(table.children[1].children[1].children[0].value, '😀');
  assert.ok(slice(source, table).includes('| - | - |'));
  return { tableType: table.type, rows: table.children.length, raw: slice(source, table) };
});

probe('P10-ast-is-not-sanitization', () => {
  const source = '<script>window.bad = 1</script>\n';
  const node = parse(source).children[0];
  assert.equal(node.type, 'html');
  assert.ok(node.value.includes('<script>'));
  return { type: node.type, requiresSeparateRenderPolicy: true };
});

const lock = await readFile(new URL('./package-lock.json', import.meta.url));
const result = {
  schemaVersion: 1,
  author: 'Astra',
  scope: 'isolated parser behavior; no product implementation or browser acceptance',
  node: process.version,
  platform: `${process.platform}/${process.arch}`,
  dependencies: JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8')).dependencies,
  lockSha256: digest(lock),
  passed: rows.filter((r) => r.status === 'passed').length,
  total: rows.length,
  rows,
};
await writeFile(new URL('./results.json', import.meta.url), `${JSON.stringify(result, null, 2)}\n`);
console.log(`${result.passed}/${result.total} parser behavior probes passed`);
if (result.passed !== result.total) process.exitCode = 1;
