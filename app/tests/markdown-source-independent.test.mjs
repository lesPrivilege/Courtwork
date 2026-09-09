import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';

import {
  MarkdownReadError,
  coreFileSubjects,
  projectMarkdown,
  readCoreFile,
  readCoreManifest,
  sha256Text,
} from '../web/markdown-source.mjs';

const digest = value => createHash('sha256').update(Buffer.from(value, 'utf8')).digest('hex');
const bytes = value => Buffer.byteLength(value, 'utf8');
const codePoints = value => Array.from(value).length;
const cpSlice = (value, start, end) => Array.from(value).slice(start, end).join('');
const expectCode = async (promise, code) => {
  await assert.rejects(promise, error => error instanceof MarkdownReadError && error.code === code);
};

const CANDIDATE_DIGEST = digest('candidate-identity');
const BUNDLE_DIGEST = digest('bundle-identity');
const FILE_TEXT = '\uFEFF# Heading\r\n\r\n😀 **中文** e\u0301\r\n\r\nA &amp; B\r\n\r\nSame clause.\r\n\r\nSame clause.\r\n';
const FILE_DIGEST = digest(FILE_TEXT);
const FILE_REF = Object.freeze({
  kind: 'core-file',
  sessionId: 'session-1',
  matterId: 'matter-1',
  candidateId: 'candidate-1',
  candidateDigest: CANDIDATE_DIGEST,
  bundleDigest: BUNDLE_DIGEST,
  artifactId: null,
});
const fileEntry = (overrides = {}) => ({
  path: 'out/memo.md',
  bytes: bytes(FILE_TEXT),
  sha256: FILE_DIGEST,
  sessionId: 'session-1',
  runId: 'run-1',
  recordIndex: 0,
  kind: 'content-version',
  writtenAt: '2026-09-10T00:00:00.000Z',
  ...overrides,
});
const manifestPage = (ref = FILE_REF, overrides = {}) => ({
  schemaVersion: 1,
  candidateId: ref.candidateId,
  artifactId: ref.artifactId ?? null,
  candidateDigest: ref.candidateDigest,
  bundleDigest: ref.bundleDigest,
  files: [fileEntry()],
  offset: 0,
  end: 1,
  nextOffset: null,
  fileCount: 1,
  ...overrides,
});
const contentPage = (ref, text, options = {}) => {
  const offset = options.offset ?? 0;
  const length = options.codePointLength ?? codePoints(FILE_TEXT);
  const end = options.end ?? offset + codePoints(text);
  return {
    schemaVersion: 1,
    candidateId: ref.candidateId,
    artifactId: ref.artifactId ?? null,
    candidateDigest: ref.candidateDigest,
    bundleDigest: ref.bundleDigest,
    path: 'out/memo.md',
    fileDigest: FILE_DIGEST,
    byteLength: bytes(FILE_TEXT),
    text,
    offset,
    end,
    nextOffset: options.nextOffset ?? null,
    codePointLength: length,
    ...options,
  };
};

test('independent SHA-256 and code-point helpers agree with the browser source contract', async () => {
  assert.equal(await sha256Text(FILE_TEXT), FILE_DIGEST);
  assert.equal(bytes(FILE_TEXT), 82);
  assert.equal(codePoints(FILE_TEXT), 72);
  assert.equal(cpSlice(FILE_TEXT, 0, 1), '\uFEFF');
  assert.equal(cpSlice(FILE_TEXT, 23, 25), 'e\u0301');
  assert.equal(cpSlice(FILE_TEXT, 14, 15), '😀');
});

test('readCoreManifest returns verified file refs and sends a bounded candidate query', async () => {
  const calls = [];
  const files = await readCoreManifest(FILE_REF, {
    query: async params => {
      calls.push(params);
      return manifestPage();
    },
  });
  assert.deepEqual(calls, [{ kind: 'file-manifest', candidateId: 'candidate-1', offset: 0, limit: 16 }]);
  assert.deepEqual(files, [{
    ...FILE_REF,
    path: 'out/memo.md',
    sha256: FILE_DIGEST,
    bytes: bytes(FILE_TEXT),
  }]);
});

test('readCoreManifest uses the explicit Artifact selector and preserves its identity', async () => {
  const artifactRef = { ...FILE_REF, artifactId: 'artifact-1' };
  const calls = [];
  const files = await readCoreManifest(artifactRef, {
    query: async params => {
      calls.push(params);
      return manifestPage(artifactRef);
    },
  });
  assert.deepEqual(calls[0], { kind: 'file-manifest', artifactId: 'artifact-1', offset: 0, limit: 16 });
  assert.equal(files[0].artifactId, 'artifact-1');
  assert.equal(files[0].candidateId, 'candidate-1');
});

test('readCoreManifest rejects wrong identities, holes, duplicate paths and unsupported pages', async () => {
  const wrongIdentityFields = ['candidateId', 'artifactId', 'candidateDigest', 'bundleDigest'];
  for (const field of wrongIdentityFields) {
    const page = manifestPage();
    page[field] = field === 'artifactId' ? 'other-artifact' : 'other';
    await expectCode(readCoreManifest(FILE_REF, { query: async () => page }), 'integrity');
  }

  const hole = manifestPage(FILE_REF, { end: 0, nextOffset: null });
  await expectCode(readCoreManifest(FILE_REF, { query: async () => hole }), 'invalid_page');

  const duplicatePath = manifestPage(FILE_REF, {
    fileCount: 2,
    end: 2,
    nextOffset: null,
    files: [fileEntry({ path: 'out/memo.md' }), fileEntry({ path: 'OUT/MEMO.MD', recordIndex: 1 })],
  });
  await expectCode(readCoreManifest(FILE_REF, { query: async () => duplicatePath }), 'invalid_manifest');

  await expectCode(readCoreManifest(FILE_REF, {
    query: async () => ({ status: 'unsupported', schemaVersion: 1 }),
  }), 'unsupported');
});

test('readCoreFile assembles pages using server code-point cursors and an independent final hash', async () => {
  const long = '😀'.repeat(4001);
  const longRef = { ...FILE_REF, path: 'out/long.md', sha256: digest(long), bytes: bytes(long) };
  const first = cpSlice(long, 0, 4000);
  const second = cpSlice(long, 4000);
  const calls = [];
  const pageFor = {
    0: {
      ...contentPage(longRef, first, { offset: 0, end: 4000, nextOffset: 4000, codePointLength: 4001 }),
      path: longRef.path,
      fileDigest: longRef.sha256,
      byteLength: longRef.bytes,
    },
    4000: {
      ...contentPage(longRef, second, { offset: 4000, end: 4001, nextOffset: null, codePointLength: 4001 }),
      path: longRef.path,
      fileDigest: longRef.sha256,
      byteLength: longRef.bytes,
    },
  };
  const result = await readCoreFile(longRef, {
    query: async params => {
      calls.push(params);
      return pageFor[params.offset];
    },
  });
  assert.equal(result, long);
  assert.equal(digest(result), longRef.sha256);
  assert.deepEqual(calls, [
    { kind: 'file-content', candidateId: 'candidate-1', path: 'out/long.md', offset: 0, limit: 4000 },
    { kind: 'file-content', candidateId: 'candidate-1', path: 'out/long.md', offset: 4000, limit: 4000 },
  ]);
});

test('readCoreFile accepts an exact empty terminal page', async () => {
  const empty = { ...FILE_REF, path: 'out/empty.md', sha256: digest(''), bytes: 0 };
  const page = {
    ...contentPage(empty, '', { offset: 0, end: 0, nextOffset: null, codePointLength: 0 }),
    path: empty.path,
    fileDigest: empty.sha256,
    byteLength: 0,
  };
  assert.equal(await readCoreFile(empty, { query: async () => page }), '');
});

test('readCoreFile rejects wrong IDs, hash swaps, path swaps and pagination holes', async () => {
  const identityFields = ['candidateId', 'artifactId', 'candidateDigest', 'bundleDigest'];
  for (const field of identityFields) {
    const page = contentPage(FILE_REF, FILE_TEXT);
    page[field] = field === 'artifactId' ? 'other-artifact' : 'other';
    await expectCode(readCoreFile({ ...FILE_REF, path: 'out/memo.md', sha256: FILE_DIGEST, bytes: bytes(FILE_TEXT) }, { query: async () => page }), 'integrity');
  }

  const swapped = contentPage(FILE_REF, FILE_TEXT.replace('Heading', 'Swapped'));
  await expectCode(readCoreFile({ ...FILE_REF, path: 'out/memo.md', sha256: FILE_DIGEST, bytes: bytes(FILE_TEXT) }, { query: async () => swapped }), 'integrity');

  const wrongPath = contentPage(FILE_REF, FILE_TEXT, { path: 'out/other.md' });
  await expectCode(readCoreFile({ ...FILE_REF, path: 'out/memo.md', sha256: FILE_DIGEST, bytes: bytes(FILE_TEXT) }, { query: async () => wrongPath }), 'invalid_page');

  const hole = contentPage(FILE_REF, FILE_TEXT, { end: codePoints(FILE_TEXT) - 1 });
  await expectCode(readCoreFile({ ...FILE_REF, path: 'out/memo.md', sha256: FILE_DIGEST, bytes: bytes(FILE_TEXT) }, { query: async () => hole }), 'invalid_page');
});

test('readCoreFile rejects a continuation replay or changed duplicate page', async () => {
  const long = 'x'.repeat(4001);
  const ref = { ...FILE_REF, path: 'out/replay.md', sha256: digest(long), bytes: bytes(long) };
  const first = contentPage(ref, long.slice(0, 4000), { offset: 0, end: 4000, nextOffset: 4000, codePointLength: 4001 });
  const replay = contentPage(ref, 'y'.repeat(4000), { offset: 0, end: 4000, nextOffset: 4000, codePointLength: 4001 });
  await expectCode(readCoreFile(ref, {
    query: async params => params.offset === 0 ? first : replay,
  }), 'invalid_page');
});

test('readCoreFile rejects a changed identity on any page and a wrong final digest', async () => {
  const long = 'x'.repeat(4001);
  const ref = { ...FILE_REF, path: 'out/hash.md', sha256: digest(long), bytes: bytes(long) };
  const first = contentPage(ref, long.slice(0, 4000), { offset: 0, end: 4000, nextOffset: 4000, codePointLength: 4001, fileDigest: ref.sha256, byteLength: ref.bytes, path: ref.path });
  const final = contentPage(ref, long.slice(4000), { offset: 4000, end: 4001, nextOffset: null, codePointLength: 4001, fileDigest: ref.sha256, byteLength: ref.bytes, path: ref.path });
  final.bundleDigest = digest('changed-bundle');
  await expectCode(readCoreFile(ref, {
    query: async params => params.offset === 0 ? first : final,
  }), 'integrity');

  const tamperedFirst = contentPage(ref, 'z'.repeat(4000), { offset: 0, end: 4000, nextOffset: 4000, codePointLength: 4001, fileDigest: ref.sha256, byteLength: ref.bytes, path: ref.path });
  const tamperedFinal = contentPage(ref, 'z', { offset: 4000, end: 4001, nextOffset: null, codePointLength: 4001, fileDigest: ref.sha256, byteLength: ref.bytes, path: ref.path });
  await expectCode(readCoreFile(ref, { query: async params => params.offset === 0 ? tamperedFirst : tamperedFinal }), 'integrity');
});

test('readCoreFile aborts before and after a delayed page, without returning partial source', async () => {
  const ref = { ...FILE_REF, path: 'out/abort.md', sha256: FILE_DIGEST, bytes: bytes(FILE_TEXT) };
  const already = new AbortController();
  already.abort();
  await assert.rejects(readCoreFile(ref, { query: async () => { throw new Error('query must not run'); }, signal: already.signal }), error => error.name === 'AbortError');

  const controller = new AbortController();
  let release;
  const delayed = new Promise(resolve => { release = resolve; });
  const pending = readCoreFile(ref, {
    query: async () => {
      await delayed;
      return contentPage(ref, FILE_TEXT);
    },
    signal: controller.signal,
  });
  controller.abort();
  release();
  await assert.rejects(pending, error => error.name === 'AbortError');
});

test('coreFileSubjects exposes only supported, scoped Core file refs', () => {
  const projection = {
    contractVersion: 'se-file-memo-v1',
    fileCapability: { schemaVersion: 1, contractVersion: 'se-file-memo-v1', queries: ['file-manifest', 'file-content'] },
    matter: { id: 'matter-1' },
    candidates: [
      { id: 'candidate-1', files: { schemaVersion: 1, candidateDigest: CANDIDATE_DIGEST, bundleDigest: BUNDLE_DIGEST } },
      { id: 'unsupported', files: { schemaVersion: null, candidateDigest: CANDIDATE_DIGEST, bundleDigest: BUNDLE_DIGEST } },
    ],
    artifact: { candidate_id: 'candidate-1', id: 'artifact-1' },
  };
  assert.deepEqual(coreFileSubjects(projection, 'session-1'), [{
    kind: 'core-file',
    sessionId: 'session-1',
    matterId: 'matter-1',
    candidateId: 'candidate-1',
    candidateDigest: CANDIDATE_DIGEST,
    bundleDigest: BUNDLE_DIGEST,
    artifactId: 'artifact-1',
  }]);
  assert.deepEqual(coreFileSubjects({ ...projection, fileCapability: { ...projection.fileCapability, queries: ['file-manifest'] } }, 'session-1'), []);
  assert.deepEqual(coreFileSubjects({ ...projection, contractVersion: 'se-contract-v5.0' }, 'session-1'), []);
});

test('projectMarkdown preserves BOM, CRLF, combining marks, duplicate block ranges and safe semantic nodes', async () => {
  const identity = { ...FILE_REF, path: 'out/memo.md', sha256: FILE_DIGEST, bytes: bytes(FILE_TEXT) };
  const projection = await projectMarkdown(FILE_TEXT, identity);
  assert.equal(projection.schemaVersion, 1);
  assert.equal(projection.profile, 'cw-markdown-block-v1');
  assert.equal(projection.readOnly, true);
  assert.equal(projection.source, FILE_TEXT);
  assert.equal(projection.byteLength, bytes(FILE_TEXT));
  assert.equal(projection.codePointLength, codePoints(FILE_TEXT));
  assert.equal(projection.blocks.length, 5);
  for (const block of projection.blocks) {
    assert.equal(block.raw, cpSlice(FILE_TEXT, block.start, block.end));
    assert.equal(block.id, 'mr-' + projection.key + '-' + block.start + '-' + block.end);
  }
  assert.equal(projection.blocks[0].start, 1);
  assert.equal(projection.blocks[0].raw, '# Heading');
  assert.equal(projection.outline[0].text, 'Heading');
  assert.equal(projection.blocks[1].nodes[0].children[0].tag, 'text');
  assert.equal(projection.blocks[1].nodes[0].children[1].tag, 'strong');
  assert.deepEqual(projection.blocks.slice(3).map(block => block.raw), ['Same clause.', 'Same clause.']);
  assert.notEqual(projection.blocks[3].id, projection.blocks[4].id);
});

test('projectMarkdown parses complete definitions, keeps unsafe links inert, and emits bounded warnings', async () => {
  const source = '[policy][p]\n\n[p]: https://example.invalid/policy\n\n![alt](https://example.invalid/image.png)\n\n<script>window.bad=1</script>\n\n[bad](javascript:alert(1))\n';
  const identity = { ...FILE_REF, path: 'out/links.md', sha256: digest(source), bytes: bytes(source) };
  const projection = await projectMarkdown(source, identity);
  const nodes = projection.blocks.flatMap(block => block.nodes);
  const anchors = [];
  const walk = node => {
    for (const child of node.children ?? []) {
      if (child.tag === 'a') anchors.push(child);
      walk(child);
    }
  };
  nodes.forEach(walk);
  assert.equal(anchors.length, 2);
  assert.equal(anchors[0].href, 'https://example.invalid/policy');
  assert.equal(Object.hasOwn(anchors[1], 'href'), false);
  assert.deepEqual(projection.warnings.sort(), ['HTML is shown as source text.', 'Images are shown as descriptions; no image is loaded.']);
});

test('projectMarkdown refuses malformed identity, source text, and size', async () => {
  const identity = { ...FILE_REF, path: 'out/memo.md', sha256: FILE_DIGEST, bytes: bytes(FILE_TEXT) };
  await expectCode(projectMarkdown(FILE_TEXT.replace('Heading', 'Other'), identity), 'integrity');
  await expectCode(projectMarkdown(FILE_TEXT, { ...identity, sha256: '0'.repeat(64) }), 'integrity');
  await expectCode(projectMarkdown(FILE_TEXT, { ...identity, bytes: bytes(FILE_TEXT) + 1 }), 'integrity');
  await expectCode(projectMarkdown(FILE_TEXT, { ...identity, path: '../memo.md' }), 'invalid_identity');
  await expectCode(projectMarkdown(FILE_TEXT, { ...identity, path: 'out/memo!.md' }), 'invalid_identity');
  await expectCode(projectMarkdown(FILE_TEXT, { ...identity, path: 'out/my memo.md' }), 'invalid_identity');
  await expectCode(projectMarkdown('\ud800', { ...identity, sha256: digest('\ud800'), bytes: 3 }), 'invalid_source');
});

test('projectMarkdown creates a revision-local key and never claims writable review state', async () => {
  const candidateIdentity = { ...FILE_REF, path: 'out/memo.md', sha256: FILE_DIGEST, bytes: bytes(FILE_TEXT) };
  const artifactIdentity = { ...candidateIdentity, kind: 'core-file', artifactId: 'artifact-1' };
  const candidate = await projectMarkdown(FILE_TEXT, candidateIdentity);
  const artifact = await projectMarkdown(FILE_TEXT, artifactIdentity);
  assert.notEqual(candidate.key, artifact.key);
  assert.equal(candidate.identity.kind, 'core-file');
  assert.equal(artifact.identity.artifactId, 'artifact-1');
  assert.equal(candidate.readOnly, true);
  assert.equal(artifact.readOnly, true);
});

test('sha256Text does not silently normalize source', async () => {
  const combining = 'e\u0301';
  assert.notEqual(await sha256Text(combining), await sha256Text(combining.normalize('NFC')));
});

test('readCoreFile propagates producer absence as an exact read, not a fallback', async () => {
  const artifactRef = { ...FILE_REF, artifactId: 'artifact-1', path: 'out/memo.md', sha256: FILE_DIGEST, bytes: bytes(FILE_TEXT) };
  let calls = 0;
  const source = await readCoreFile(artifactRef, {
    query: async params => {
      calls++;
      assert.equal(params.artifactId, 'artifact-1');
      assert.equal(params.candidateId, undefined);
      return contentPage(artifactRef, FILE_TEXT);
    },
  });
  assert.equal(source, FILE_TEXT);
  assert.equal(calls, 1);
});

