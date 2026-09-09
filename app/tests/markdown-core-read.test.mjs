import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {rm, writeFile} from 'node:fs/promises';
import test from 'node:test';

import {boot} from './helpers.mjs';
import {
  coreFileSubjects,
  projectMarkdown,
  readCoreFile,
  readCoreManifest,
} from '../web/markdown-source.mjs';

const hash = value => createHash('sha256').update(value, 'utf8').digest('hex');
const bytes = value => Buffer.byteLength(value, 'utf8');
const codePoints = value => Array.from(value).length;

// This is deliberately larger than one Core content page. The exact bytes,
// including BOM, CRLF, CJK, emoji, and a combining mark, are the test oracle.
const MARKDOWN = `\uFEFF# 证据记录\r\n\r\n${'审阅材料来自固定版本。😀\r\n'.repeat(170)}${'中文段落与 e\u0301 组合字符保持原样。\r\n'.repeat(100)}终止段落。\r\n`;
const MARKDOWN_PATH = 'out/memo.md';

function sourceEvidence(source) {
  return [{
    source_id: source.id,
    source_version: source.version,
    start: 0,
    end: codePoints(source.text),
    quote: source.text,
    digest: source.digest,
  }];
}

function queryFor(h, sessionId, observed = []) {
  return async params => {
    observed.push({...params});
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) query.set(key, String(value));
    }
    const response = await h.api('GET', `/sessions/${sessionId}/work-query?${query}`);
    if (response.status !== 200) {
      const error = new Error(JSON.stringify(response.json));
      error.status = response.status;
      error.code = response.json?.error?.code;
      throw error;
    }
    return response.json;
  };
}

async function bindFileMemo(h, title = 'Markdown reader A1') {
  const loaded = await h.api('POST', '/extensions/evidence-memo/lifecycle', {action: 'load'});
  assert.equal(loaded.status, 200, JSON.stringify(loaded.json));
  const session = await h.createSession();
  const bound = await h.api('POST', `/sessions/${session.id}/extension`, {
    extensionId: 'evidence-memo',
    input: {title, sourceText: 'Approved source.', profile: 'file-memo-v1'},
  });
  assert.equal(bound.status, 200, JSON.stringify(bound.json));
  const surface = await h.api('GET', `/sessions/${session.id}/surface`);
  assert.equal(surface.status, 200, JSON.stringify(surface.json));
  return {session, surface: surface.json, source: surface.json.projection.sources[0]};
}

async function createMarkdownCandidate(h, session, source) {
  const made = await h.api('POST', `/sessions/${session.id}/runs`, {
    commandId: 'markdown-reader-a1',
    input: h.scriptInput([
      {name: 'ws_write', arguments: {path: MARKDOWN_PATH, text: MARKDOWN}},
      {
        name: 'se_submit_candidate',
        arguments: {
          artifact_text: 'Source-backed Markdown memo.',
          evidence: sourceEvidence(source),
          obligations: [],
          recordedFiles: [{path: MARKDOWN_PATH, sha256: hash(MARKDOWN)}],
        },
      },
    ]),
  });
  assert.equal(made.status, 200, JSON.stringify(made.json));
  const finished = await h.pollRun(made.json.run.id);
  assert.equal(finished.status, 'completed', JSON.stringify(finished));
  const surface = await h.api('GET', `/sessions/${session.id}/surface`);
  assert.equal(surface.status, 200, JSON.stringify(surface.json));
  assert.equal(surface.json.projection.candidates.length, 1, JSON.stringify(surface.json));
  const candidate = surface.json.projection.candidates[0];
  assert.equal(candidate.files.coverage, 'complete', JSON.stringify(candidate));
  assert.equal(candidate.files.acceptable, true, JSON.stringify(candidate));
  return {candidate, surface: surface.json, runId: made.json.run.id};
}

function candidateRef(projection, sessionId) {
  const refs = coreFileSubjects(projection, sessionId);
  assert.equal(refs.length, 1, JSON.stringify({refs, projection}));
  assert.equal(refs[0].artifactId, null);
  return refs[0];
}

test('real HTTP candidate pages preserve Markdown bytes, and wrong Matter scope is refused', async () => {
  const h = await boot();
  try {
    const {session, source} = await bindFileMemo(h);
    const {candidate, surface: pending, runId} = await createMarkdownCandidate(h, session, source);
    const ref = candidateRef(pending.projection, session.id);
    const manifestCalls = [];
    const candidateQuery = queryFor(h, session.id, manifestCalls);

    const manifest = await readCoreManifest(ref, {query: candidateQuery});
    assert.equal(manifest.length, 1);
    assert.deepEqual(manifest[0], {
      ...ref,
      path: MARKDOWN_PATH,
      sha256: hash(MARKDOWN),
      bytes: bytes(MARKDOWN),
    });
    assert.deepEqual(manifestCalls[0], {kind: 'file-manifest', candidateId: candidate.id, offset: 0, limit: 16});
    const rawManifest = await candidateQuery({kind: 'file-manifest', candidateId: candidate.id, offset: 0, limit: 16});
    assert.equal(rawManifest.files[0].sessionId, session.id);
    assert.equal(rawManifest.files[0].runId, runId);
    assert.equal(rawManifest.files[0].kind, 'content-version');

    const contentCalls = [];
    const content = await readCoreFile(manifest[0], {query: queryFor(h, session.id, contentCalls)});
    assert.equal(content, MARKDOWN);
    assert.equal(hash(content), manifest[0].sha256);
    assert.equal(bytes(content), manifest[0].bytes);
    assert.equal(codePoints(content) > 4000, true);
    assert.equal(content.startsWith('\uFEFF'), true);
    assert.match(content, /\r\n/u);
    assert.match(content, /中文/u);
    assert.match(content, /😀/u);
    assert.match(content, /e\u0301/u);
    assert.deepEqual(contentCalls.map(call => call.offset), [0, 4000]);
    assert.deepEqual(contentCalls.map(call => call.limit), [4000, 4000]);

    const projection = await projectMarkdown(content, manifest[0]);
    assert.equal(projection.readOnly, true);
    assert.equal(projection.source, MARKDOWN);
    assert.equal(projection.byteLength, bytes(MARKDOWN));
    assert.equal(projection.codePointLength, codePoints(MARKDOWN));
    assert.equal(projection.blocks[0].start, 1);
    assert.equal(projection.blocks[0].raw.startsWith('# 证据记录'), true);

    const wrong = await h.createSession();
    const wrongBinding = await h.api('POST', `/sessions/${wrong.id}/extension`, {
      extensionId: 'evidence-memo',
      input: {title: 'Wrong Matter', sourceText: 'Other source.', profile: 'file-memo-v1'},
    });
    assert.equal(wrongBinding.status, 200, JSON.stringify(wrongBinding.json));
    await assert.rejects(
      readCoreManifest(ref, {query: queryFor(h, wrong.id)}),
      error => error.status === 409 && error.code === 'BINDING_MISMATCH',
    );
  } finally {
    await h.runtime.close();
    await rm(h.dataDir, {recursive: true, force: true});
  }
});

test('accepted Artifact pages remain exact after producer deletion and extension unload', async () => {
  const h = await boot();
  try {
    const {session, source} = await bindFileMemo(h, 'Markdown reader A1 artifact');
    const {candidate, surface: pending} = await createMarkdownCandidate(h, session, source);
    const decision = await h.api('POST', `/sessions/${session.id}/actions`, {
      extensionId: 'evidence-memo',
      generation: pending.extension.generation,
      fileCapabilityVersion: 1,
      action: 'decide',
      payload: {
        request_id: 'markdown-reader-a1-accept',
        candidate_id: candidate.id,
        base_version: 0,
        action: 'accept',
        reason: 'Read the fixed Markdown bytes.',
      },
    });
    assert.equal(decision.status, 200, JSON.stringify(decision.json));
    const artifactId = decision.json.result.active_artifact;
    assert.equal(typeof artifactId, 'string');
    const artifactProjection = decision.json.projection;
    const artifactRefs = coreFileSubjects(artifactProjection, session.id);
    assert.equal(artifactRefs.length, 1, JSON.stringify(artifactProjection));
    const artifactRef = artifactRefs[0];
    assert.equal(artifactRef.artifactId, artifactId);
    const artifactManifest = await readCoreManifest(artifactRef, {query: queryFor(h, session.id)});
    assert.equal(artifactManifest.length, 1);
    assert.equal(artifactManifest[0].artifactId, artifactId);

    await writeFile(`${session.workspaceDir}/${MARKDOWN_PATH}`, 'MUTATED CURRENT WORKSPACE\n', 'utf8');
    const beforeContinuation = await readCoreFile(artifactManifest[0], {query: queryFor(h, session.id)});
    assert.equal(beforeContinuation, MARKDOWN);

    const continuation = await h.createSession();
    const attach = await h.api('POST', `/sessions/${continuation.id}/extension`, {
      extensionId: 'evidence-memo',
      input: {existingMatterId: pending.projection.matter.id},
    });
    assert.equal(attach.status, 200, JSON.stringify(attach.json));
    const deleted = await h.api('DELETE', `/sessions/${session.id}`);
    assert.equal(deleted.status, 200, JSON.stringify(deleted.json));
    const unloaded = await h.api('POST', '/extensions/evidence-memo/lifecycle', {action: 'unload'});
    assert.equal(unloaded.status, 200, JSON.stringify(unloaded.json));

    const absentSurface = await h.api('GET', `/sessions/${continuation.id}/surface`);
    assert.equal(absentSurface.status, 200, JSON.stringify(absentSurface.json));
    assert.equal(absentSurface.json.extension?.id, 'evidence-memo');
    assert.equal(absentSurface.json.extension?.status, 'unloaded');
    assert.equal(absentSurface.json.projection.readOnly, true);
    assert.deepEqual(absentSurface.json.projection.humanActions, []);
    const absentRefs = coreFileSubjects(absentSurface.json.projection, continuation.id);
    assert.equal(absentRefs.length, 1, JSON.stringify(absentSurface.json.projection));
    assert.equal(absentRefs[0].artifactId, artifactId);
    const absentManifest = await readCoreManifest(absentRefs[0], {query: queryFor(h, continuation.id)});
    assert.equal(absentManifest.length, 1);
    const afterProducerAbsent = await readCoreFile(absentManifest[0], {query: queryFor(h, continuation.id)});
    assert.equal(afterProducerAbsent, MARKDOWN);
  } finally {
    await h.runtime.close();
    await rm(h.dataDir, {recursive: true, force: true});
  }
});
