import test from 'node:test';
import assert from 'node:assert/strict';
import {rm} from 'node:fs/promises';
import {boot} from './helpers.mjs';
import {NORMAL_FACTS, SYNTHETIC_SOURCES} from '../domains/inbound-nda/fixtures.mjs';

test('NDA producer receives the full submission schema and static reason contract on actual Pi wire', async () => {
  const h = await boot();
  try {
    await h.api('POST', '/extensions/inbound-nda/lifecycle', {action: 'load'});
    const session = await h.createSession();
    const bound = await h.api('POST', `/sessions/${session.id}/extension`, {extensionId: 'inbound-nda', input: {title: 'Producer contract', sourceText: SYNTHETIC_SOURCES[0].text, facts: NORMAL_FACTS}});
    assert.equal(bound.status, 200);
    const started = await h.api('POST', `/sessions/${session.id}/runs`, {commandId: 'inspect-contract', input: 'Inspect the available review contract.'});
    assert.equal(started.status, 200);
    await h.pollRun(started.json.run.id);
    const wire = h.runtime.fakeProvider.requests.at(-1).body;
    const schema = wire.tools.find(t => t.function?.name === 'se_submit_candidate').function.parameters.properties.domain;
    assert.deepEqual(schema.required, ['schemaVersion', 'contractVersion', 'playbookVersion', 'facts', 'findings', 'reconciliation']);
    assert.equal(schema.properties.schemaVersion.const, 1);
    assert.equal(schema.properties.findings.items.properties.evidence.items.properties.start.description.includes('Unicode code points'), true);
    assert.ok(schema.properties.reconciliation.required.includes('sourceAnchors'));
    // The host binds Work context as an explicit task-context message; it is not the generic system prompt.
    const context = JSON.stringify(wire.messages);
    assert.match(context, /canonicalReasonTemplates/);
    assert.match(context, /the intended use matches the synthetic transaction purpose/);
    assert.match(context, /recipient \{n\} is not both need-to-know and bound/);
    assert.match(context, /conflict.*unknown.*needs_review.*complete/);
    assert.doesNotMatch(context, /"gold"|"expectedReview"|"preparedReview"/);
  } finally { await h.runtime.close(); await rm(h.dataDir, {recursive: true, force: true}); }
});

test('a reference producer can submit from advertised vocabulary and approved sources without buildReview', async () => {
  const {producerContract, REVIEW_PROPOSAL_SCHEMA} = await import('../domains/inbound-nda/protocol.mjs');
  const {playbook} = await import('../domains/inbound-nda/index.mjs');
  const h = await boot();
  try {
    await h.api('POST', '/extensions/inbound-nda/lifecycle', {action: 'load'});
    const session = await h.createSession();
    const text = '🧪 Synthetic producer contract\n' + SYNTHETIC_SOURCES[0].text;
    const bound = await h.api('POST', `/sessions/${session.id}/extension`, {extensionId: 'inbound-nda', input: {title: 'Independent producer', sourceText: text, facts: NORMAL_FACTS}});
    assert.equal(bound.status, 200);
    const {projection} = (await h.api('GET', `/sessions/${session.id}/surface`)).json;
    const source = projection.sources[0];
    // This small reference consumer uses only the declared protocol, known
    // synthetic input facts, and an approved public source. It is not a model
    // quality test and never calls the domain's deterministic review builder.
    const groups = ['purpose', 'recipients', 'security', 'term'];
    const findings = playbook.rules.map((rule, i) => ({
      ruleId: rule.ruleId, status: 'pass',
      evidence: rule.sourceQuotes.map(quote => {
        const start16 = source.text.indexOf(quote);
        assert.ok(start16 >= 0);
        const start = Array.from(source.text.slice(0, start16)).length;
        return {source_id: source.id, source_version: source.version, start, end: start + Array.from(quote).length, quote, digest: source.digest};
      }),
      reason: producerContract.canonicalReasonTemplates[groups[i]].pass,
    }));
    const schema = REVIEW_PROPOSAL_SCHEMA.properties.domain.properties;
    const domain = {
      schemaVersion: schema.schemaVersion.const,
      contractVersion: schema.contractVersion.const,
      playbookVersion: schema.playbookVersion.const,
      facts: projection.domain.facts,
      findings,
      reconciliation: {
        status: 'complete', complete: true, coveredRuleIds: findings.map(f => f.ruleId),
        unresolvedRuleIds: [], conflictRuleIds: [], unknownRuleIds: [], missingRuleIds: [], deviationRuleIds: [],
        sourceAnchors: findings.flatMap(f => f.evidence.map(({quote, ...anchor}) => ({ruleId: f.ruleId, ...anchor}))),
      },
    };
    const started = await h.api('POST', `/sessions/${session.id}/runs`, {commandId: 'reference-producer', input: h.scriptInput([
      {name: 'se_read_source', arguments: {sourceId: source.id}},
      {name: 'se_submit_candidate', arguments: {domain}},
    ])});
    assert.equal(started.status, 200);
    await h.pollRun(started.json.run.id);
    const after = (await h.api('GET', `/sessions/${session.id}/surface`)).json.projection;
    assert.equal(after.candidates.length, 1);
    assert.deepEqual(after.candidates[0].domain, domain);
    assert.equal(after.candidates[0].status, 'pending');
    assert.equal(after.artifact, null, 'producer metadata grants no acceptance');
    const packetText = h.runtime.fakeProvider.requests.flatMap(r => r.body.messages).flatMap(m => typeof m.content === 'string' ? [m.content] : (m.content ?? []).map(c => c.text ?? '')).join(' ');
    assert.ok(packetText.includes(JSON.stringify(producerContract)), 'the same static contract is supplied on wire for a different source');
    assert.equal(JSON.stringify(producerContract).includes(source.digest), false, 'no current source or result is computed into static templates');
  } finally { await h.runtime.close(); await rm(h.dataDir, {recursive: true, force: true}); }
});
