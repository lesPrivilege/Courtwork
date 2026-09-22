import assert from 'node:assert/strict';
import { test } from 'node:test';
import { planKitContext } from '../runtime/kit-context.mjs';
import { compileControlContext } from '../runtime/control-plane.mjs';
import { fixture, EXPECTED, GENERAL, CODING, PRAXIS, sha256, canonical, seal, pin, freeze, evidence, reseal, repinResource } from './fixtures/kit-context.mjs';

const clone = structuredClone;
const row = (input, id) => input.binding.resources.find(r => r.id === id);
const body = (input, id) => input.binding.content.find(r => r.id === id);
const general = input => input.kits.find(k => k.descriptor.id === 'kit:general');
const refuse = input => {
  const plan = planKitContext(input);
  assert.equal(plan.status, 'refused');
  assert.equal(plan.candidate, null, 'refused plans expose no partial executable text');
  assert.ok(plan.diagnostics.length > 0);
  return plan;
};
const invalid = input => assert.throws(() => planKitContext(input), e => e.code === 'invalid_kit_input' && typeof e.path === 'string');

test('Kit literal oracle: actual binding → plan → exact existing context, independent hashes and accounting', () => {
  const input = fixture();
  const plan = planKitContext(freeze(input));
  assert.equal(plan.status, 'compiled');
  assert.equal(plan.compatibility.status, 'unchecked');
  assert.equal(plan.candidate.text, EXPECTED);
  assert.equal(compileControlContext(input.binding), EXPECTED);
  assert.equal(plan.candidate.sha256, '48a0f0b2c527769ffbe1343487fb540a727d720926f8e75f86805ced8e0987ba');
  assert.equal(plan.candidate.bytes, 554);
  assert.equal(plan.candidate.characters, 552);
  assert.equal(plan.candidate.sha256, sha256(EXPECTED));
  let offset = 0;
  for (const segment of plan.candidate.segments) {
    assert.equal(segment.start, offset);
    assert.equal(segment.end, offset + segment.text.length);
    assert.equal(segment.text, EXPECTED.slice(segment.start, segment.end));
    assert.equal(segment.sha256, sha256(segment.text));
    assert.equal(segment.bytes, Buffer.byteLength(segment.text));
    assert.equal(segment.characters, segment.text.length);
    offset = segment.end;
  }
  assert.equal(plan.candidate.segments.map(s => s.text).join(''), EXPECTED);
  assert.equal(plan.candidate.segments.reduce((sum, s) => sum + s.bytes, 0), 554);
  assert.equal(plan.candidate.segments.reduce((sum, s) => sum + s.characters, 0), 552);
  const corePieces = ['\n\n[Instruction local:general]\n' + GENERAL, '\n\n[Instruction local:coding]\n' + CODING, '\n\n[Instruction local:praxis]\n' + PRAXIS];
  assert.equal(plan.accounting.coreBytes, corePieces.reduce((n, s) => n + Buffer.byteLength(s), 0));
  const { planSha256, ...record } = plan;
  assert.equal(planSha256, sha256(canonical(record)), 'independent canonical plan identity');
});

test('General/Coding/Praxis preserve shared attribution and defer bodies/templates', () => {
  const input = fixture(), plan = planKitContext(input);
  assert.equal(plan.candidate.text.split('[Instruction local:general]').length - 1, 1);
  const shared = plan.candidate.segments.find(s => s.resourceIds.includes('local:general'));
  assert.deepEqual(shared.kits.map(k => k.id), ['kit:general', 'kit:praxis']);
  assert.ok(plan.references.some(r => r.resourceId === 'local:notes' && r.status === 'deferred'));
  assert.ok(plan.references.some(r => r.resourceId === 'local:coding-skill' && r.status === 'deferred'));
  for (const sentinel of ['DEFERRED_PRAXIS_SENTINEL', 'DEFERRED_CODING_SENTINEL', 'TEMPLATE_SENTINEL']) assert.ok(!plan.candidate.text.includes(sentinel));
  const reference = plan.references.find(r => r.resourceId === 'local:notes');
  assert.equal(reference.identity.contentSha256, sha256(body(input, 'local:notes').content));
});

test('No-Kit is exact historical passthrough and ignores new inputs without inspecting them', () => {
  const input = fixture();
  for (const context of input.binding.context) { delete context.admittedCharacters; delete context.deferredCharacters; }
  freeze(input.binding);
  const before = clone(input.binding);
  const plan = planKitContext({ binding: input.binding, kits: [], get budget() { throw Error('must not read'); }, get runtime() { throw Error('must not read'); }, get compatibilityEvidence() { throw Error('must not read'); } });
  assert.equal(plan.status, 'passthrough');
  assert.equal(plan.candidate.text, compileControlContext(input.binding));
  assert.equal(plan.candidate.segments.length, 1);
  assert.equal(plan.runtime, null);
  assert.equal(plan.budget, null);
  assert.equal(plan.compatibility.status, 'not-applicable');
  assert.deepEqual(input.binding, before);
  assert.equal(planKitContext({ binding: input.binding, kits: [] }).planSha256, plan.planSha256);
});

test('Changing/deselecting Kits never removes already-admitted instructions from a binding', () => {
  const input = fixture();
  const all = planKitContext(input);
  input.kits = [general(input)];
  const onlyGeneral = planKitContext(input);
  const none = planKitContext({ binding: input.binding, kits: [] });
  assert.equal(onlyGeneral.candidate.text, all.candidate.text);
  assert.equal(none.candidate.text, all.candidate.text);
  assert.ok(onlyGeneral.candidate.text.includes(PRAXIS));
  assert.notEqual(onlyGeneral.planSha256, all.planSha256);
});

test('Frozen input and returned data have no aliases in either direction', () => {
  const input = fixture(), original = clone(input), plan = planKitContext(freeze(input));
  assert.deepEqual(input, original);
  plan.binding.composition.resourceIds.push('mutate:output');
  plan.kits[0].version = 'mutate-output';
  plan.candidate.segments[0].resourceIds.push('mutate:segment');
  const requirement = plan.requirements.find(r => r.resourceId === 'tool:check_run');
  requirement.reading.permission.trace.push({ source: 'output', effect: 'allow' });
  assert.deepEqual(input, original);
  const mutable = fixture(), result = planKitContext(mutable), resultBefore = clone(result);
  mutable.binding.composition.resourceIds.push('mutate:input');
  mutable.kits[0].descriptor.version = 'new';
  row(mutable, 'tool:check_run').permission.trace.push({ source: 'input', effect: 'deny' });
  assert.deepEqual(result, resultBefore);
});

test('Object/Kit/evidence permutations are deterministic; catalog order is meaningful', () => {
  const input = fixture();
  input.compatibilityEvidence = input.kits.flatMap(k => [evidence(input, k, 'supported', '-b'), evidence(input, k, 'supported', '-a')]);
  const expected = planKitContext(input);
  const reverseKeys = x => Array.isArray(x) ? x.map(reverseKeys) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).reverse().map(([k, v]) => [k, reverseKeys(v)])) : x;
  const other = reverseKeys(input);
  other.kits.reverse(); other.compatibilityEvidence.reverse();
  assert.deepEqual(planKitContext(other), expected);
  other.binding.resources.reverse();
  assert.notEqual(planKitContext(other).candidate.sha256, expected.candidate.sha256);
});

test('Exact duplicate Kits, references and evidence deduplicate without extra text or core budget', () => {
  const input = fixture(), base = planKitContext(input);
  input.kits.push(clone(input.kits[0]));
  assert.deepEqual(planKitContext(input), base);
  input.kits.pop();
  general(input).descriptor.core.push(clone(general(input).descriptor.core[0]));
  reseal(input);
  const duplicated = planKitContext(input);
  assert.equal(duplicated.candidate.sha256, base.candidate.sha256);
  assert.equal(duplicated.accounting.coreBytes, base.accounting.coreBytes);
  input.compatibilityEvidence = input.kits.map(k => evidence(input, k));
  const one = planKitContext(input);
  input.compatibilityEvidence.push(clone(input.compatibilityEvidence[0]));
  assert.deepEqual(planKitContext(input), one);
});

for (const which of ['maxCoreBytes', 'maxContextBytes', 'maxContextCharacters']) test(`Exact ${which} boundary passes; one-under refuses without partial text`, () => {
  const input = fixture();
  const rendered = planKitContext(input);
  const n = which === 'maxCoreBytes' ? rendered.accounting.coreBytes : which === 'maxContextBytes' ? 554 : 552;
  input.budget[which] = n;
  assert.equal(planKitContext(input).status, 'compiled');
  input.budget[which]--;
  const refused = refuse(input);
  assert.equal(refused.accounting.sha256, rendered.candidate.sha256);
  assert.equal(refused.accounting.bytes, 554);
  assert.ok(!JSON.stringify(refused).includes(GENERAL), 'refusal retains counts and digests, not source text');
});

for (const mutation of [
  input => { input.binding.content = input.binding.content.filter(r => r.id !== 'local:general'); },
  input => { input.binding.resources = input.binding.resources.filter(r => r.id !== 'local:general'); },
  input => { row(input, 'local:general').exposed = false; },
  input => { body(input, 'local:general').content += 'changed'; },
  input => { body(input, 'local:general').title = 'changed'; },
  input => { body(input, 'local:general').scope.id = 'changed'; },
  input => { row(input, 'local:general').activation = 'manual'; },
  input => { row(input, 'local:general').kind = 'skill'; },
  input => { row(input, 'local:general').source.hash = 'a'.repeat(64); },
  input => { input.binding.composition.status = 'incompatible'; },
]) test(`Required fragment/envelope failure ${mutation.toString()}`, () => { const input = fixture(); mutation(input); refuse(input); });

test('Optional missing/deactivated deferred sources are reported; digest mismatch still refuses', () => {
  const input = fixture();
  const praxis = input.kits.find(k => k.descriptor.id === 'kit:praxis');
  praxis.descriptor.deferred[0].required = false; reseal(input);
  input.binding.resources = input.binding.resources.filter(r => r.id !== 'local:notes');
  input.binding.content = input.binding.content.filter(r => r.id !== 'local:notes');
  const optional = planKitContext(input);
  assert.equal(optional.status, 'compiled');
  assert.equal(optional.references.find(r => r.resourceId === 'local:notes').status, 'missing');
  const stale = fixture();
  stale.kits.find(k => k.descriptor.id === 'kit:praxis').descriptor.deferred[0].required = false;
  body(stale, 'local:notes').content += '!'; reseal(stale); refuse(stale);
});

test('Missing/disabled runtime_load is not exposure or permission, and required wins duplicate optional', () => {
  for (const missing of [true, false]) {
    const input = fixture();
    if (missing) input.binding.resources = input.binding.resources.filter(r => r.id !== 'tool:runtime_load');
    else row(input, 'tool:runtime_load').exposed = false;
    refuse(input);
    for (const k of input.kits) k.descriptor.deferred.forEach(r => { r.required = false; });
    reseal(input);
    const optional = planKitContext(input);
    assert.equal(optional.status, 'compiled');
    assert.ok(optional.references.filter(r => r.status === 'not-exposed').length >= 2);
  }
  const input = fixture(), praxis = input.kits.find(k => k.descriptor.id === 'kit:praxis');
  praxis.descriptor.deferred.push({ ...praxis.descriptor.deferred[0], required: false });
  input.binding.content = input.binding.content.filter(r => r.id !== 'local:notes'); reseal(input); refuse(input);
});

test('Non-content requirements copy owner permission readings without grants/evaluation', () => {
  for (const effect of ['ask', 'deny', 'allow', null]) {
    const input = fixture(), tool = row(input, 'tool:check_run');
    if (effect === null) delete tool.permission;
    else tool.permission = { effect, resourceSpecific: true, trace: [{ source: 'synthetic-owner', effect, action: 'check_run', resource: 'specific/file' }] };
    const plan = planKitContext(input), requirement = plan.requirements.find(r => r.resourceId === tool.id);
    assert.equal(plan.status, 'compiled', 'compilation is not action readiness');
    assert.deepEqual(requirement.reading.permission, tool.permission ?? null);
    assert.equal(plan.compatibility.status, 'unchecked');
    assert.equal(plan.granted, undefined);
    assert.equal(plan.permission, undefined);
  }
});

for (const id of ['local:general', 'local:notes', 'local:coding-skill', 'local:template']) test(`Unpinned content requirement cannot bypass source pins: ${id}`, () => {
  const input = fixture();
  general(input).descriptor.requirements.push({ resourceId: id, required: false }); reseal(input);
  assert.ok(refuse(input).diagnostics.some(d => d.code === 'requirement-content-ref-required'));
});

test('Missing/not-exposed requirements distinguish required refusal from optional omission', () => {
  const input = fixture();
  general(input).descriptor.requirements.push({ resourceId: 'tool:absent', required: false }); reseal(input);
  assert.equal(planKitContext(input).status, 'compiled');
  general(input).descriptor.requirements[0].required = true; reseal(input); refuse(input);
  const hidden = fixture(); row(hidden, 'tool:check_run').exposed = false; refuse(hidden);
});

test('Version/source/deferred-only changes have separate plan and output identities; history remains frozen', () => {
  const input = freeze(fixture()), original = planKitContext(input);
  const version = clone(input); general(version).descriptor.version = '2'; reseal(version);
  assert.equal(planKitContext(version).candidate.sha256, original.candidate.sha256);
  assert.notEqual(planKitContext(version).planSha256, original.planSha256);
  const deferred = clone(input); body(deferred, 'local:notes').content += '!'; repinResource(deferred, 'local:notes');
  assert.equal(planKitContext(deferred).candidate.sha256, original.candidate.sha256);
  assert.notEqual(planKitContext(deferred).planSha256, original.planSha256);
  const changed = clone(input); body(changed, 'local:general').content += '!'; repinResource(changed, 'local:general');
  assert.notEqual(planKitContext(changed).candidate.sha256, original.candidate.sha256);
  assert.notEqual(planKitContext(changed).planSha256, original.planSha256);
  assert.deepEqual(planKitContext(input), original);
});

test('Exact runtime evidence: supported/unsupported/unchecked and conflicts remain independent of permissions', () => {
  const input = fixture();
  assert.equal(planKitContext(input).compatibility.status, 'unchecked');
  input.compatibilityEvidence = input.kits.map(k => evidence(input, k));
  assert.equal(planKitContext(input).compatibility.status, 'supported');
  const unsupported = clone(input); unsupported.compatibilityEvidence[0].result = 'unsupported';
  assert.equal(refuse(unsupported).compatibility.status, 'unsupported');
  const conflicting = clone(input); conflicting.compatibilityEvidence.push(evidence(input, input.kits[0], 'unsupported', '-conflict'));
  const conflictPlan = refuse(conflicting);
  assert.ok(conflictPlan.diagnostics.some(d => d.code === 'compatibility-evidence-conflict'));
  assert.equal(conflictPlan.compatibility.status, 'unsupported');
  for (const part of ['runtime', 'bindingHash', 'kit', 'missing-runtime']) {
    const other = clone(input);
    if (part === 'runtime') other.compatibilityEvidence[0].runtime.revision = 'different';
    if (part === 'bindingHash') other.compatibilityEvidence[0].bindingHash = 'a'.repeat(64);
    if (part === 'kit') other.compatibilityEvidence[0].kit.descriptorSha256 = 'a'.repeat(64);
    if (part === 'missing-runtime') other.runtime = null;
    const plan = planKitContext(other);
    assert.equal(plan.status, 'compiled');
    assert.equal(plan.compatibility.status, 'unchecked');
    assert.ok(plan.diagnostics.some(d => d.code === 'evidence-not-applicable'));
  }
  const wrongBinding = fixture(); wrongBinding.runtime.bindingHash = 'a'.repeat(64); refuse(wrongBinding);
});

test('Selected conflicts and contradictory pins refuse; absent targets do not', () => {
  const input = fixture(); general(input).descriptor.conflicts.push('kit:absent'); reseal(input);
  assert.equal(planKitContext(input).status, 'compiled');
  general(input).descriptor.conflicts.push('kit:praxis'); reseal(input); refuse(input);
  const versions = fixture(), another = clone(general(versions)); another.descriptor.version = '2'; versions.kits.push(seal(another.descriptor)); refuse(versions);
  const hashes = fixture(); hashes.kits[0].descriptor.core[0].contentSha256 = 'a'.repeat(64); reseal(hashes); refuse(hashes);
});

test('Code-unit ordering is explicit for punctuation; scope order still wins', () => {
  const input = fixture();
  const added = ['local:a_z', 'local:a.z', 'local:a-z'].map(id => ({ ...clone(body(input, 'local:ambient')), id, content: id }));
  for (const r of added) { input.binding.content.push(r); input.binding.resources.push({ ...clone(row(input, 'local:ambient')), id: r.id, source: { type: 'local-config', hash: sha256(r.content) } }); }
  const text = planKitContext(input).candidate.text;
  assert.ok(text.indexOf('[Instruction local:a-z]') < text.indexOf('[Instruction local:a.z]'));
  assert.ok(text.indexOf('[Instruction local:a.z]') < text.indexOf('[Instruction local:a_z]'));
  assert.ok(text.indexOf('[Instruction local:general]') < text.indexOf('[Instruction local:coding]'));
});

test('Empty catalog and exact Unicode/CRLF sources keep complete instruction bytes', () => {
  const input = fixture();
  input.kits = [general(input)];
  input.binding.resources = input.binding.resources.filter(r => !['skill', 'reference'].includes(r.kind));
  input.binding.content = input.binding.content.filter(r => !['skill', 'reference'].includes(r.kind));
  const plan = planKitContext(input);
  assert.ok(!plan.candidate.text.includes('Available context'));
  assert.ok(plan.candidate.text.includes(GENERAL));
  assert.equal(plan.candidate.segments.length, 4);
});

test('Descriptor integrity, exact schema, dependencies/native contributions and bounds reject before compilation', () => {
  for (const key of ['dependencies', 'requiresKits', 'native', 'scope', 'granted']) {
    const input = fixture(); general(input).descriptor[key] = []; reseal(input); invalid(input);
  }
  for (const change of [
    input => { general(input).descriptor.schemaVersion = 2; },
    input => { general(input).descriptor.version = '^1'; },
    input => { general(input).descriptor.core = []; },
    input => { general(input).descriptor.conflicts = ['kit:general']; },
    input => { general(input).descriptor.core[0].contentSha256 = 'A'.repeat(64); },
    input => { general(input).descriptor.core[0].extra = true; },
    input => { general(input).descriptor.requirements = Array(101).fill({ resourceId: 'tool:test', required: false }); },
    input => { general(input).descriptor.deferred = [{ resourceId: 'local:notes', required: 'yes', contentSha256: 'a'.repeat(64), artifactSha256: 'b'.repeat(64) }]; },
  ]) { const input = fixture(); change(input); reseal(input); invalid(input); }
  const digest = fixture(); general(digest).descriptorSha256 = 'a'.repeat(64); refuse(digest);
  const count = fixture(); count.kits = Array(33).fill(count.kits[0]); invalid(count);
  const sparse = fixture(); sparse.kits = Array(2); invalid(sparse);
  const cyclic = fixture(); general(cyclic).descriptor.core[0].cycle = general(cyclic).descriptor; invalid(cyclic);
  const callback = fixture(); general(callback).descriptor.core[0].resourceId = () => 'local:general'; invalid(callback);
  const undefinedField = fixture(); general(undefinedField).descriptor.conflicts = undefined; invalid(undefinedField);
  for (const budget of [{maxCoreBytes:-1,maxContextBytes:1,maxContextCharacters:1},{maxCoreBytes:0,maxContextBytes:NaN,maxContextCharacters:1},{maxCoreBytes:0,maxContextBytes:1,maxContextCharacters:100001}]) { const input = fixture(); input.budget = budget; invalid(input); }
});

test('Duplicate binding IDs and core/deferred role contradictions refuse deterministically', () => {
  for (const key of ['resources', 'content']) { const input = fixture(); input.binding[key].push(clone(input.binding[key][0])); refuse(input); }
  const input = fixture(); general(input).descriptor.deferred.push({ ...general(input).descriptor.core[0], required: false }); reseal(input); refuse(input);
});

test('Lone surrogates in Kit metadata and all rendered text are rejected rather than normalized', () => {
  const metadata = fixture(); general(metadata).descriptor.core[0].resourceId = 'local:\ud800'; invalid(metadata);
  for (const location of ['core', 'ambient', 'catalog']) {
    const input = fixture();
    if (location === 'core') body(input, 'local:general').content += '\ud800';
    if (location === 'ambient') body(input, 'local:ambient').content += '\udfff';
    if (location === 'catalog') row(input, 'local:notes').title += '\ud800';
    const rejected = refuse(input);
    assert.equal(rejected.accounting, null, 'malformed source has no normalized candidate identity');
  }
});

test('Optional missing counterpart cannot hide a known source pin mismatch', () => {
  const input = fixture();
  input.kits.find(k => k.descriptor.id === 'kit:praxis').descriptor.deferred[0].required = false;
  input.binding.content = input.binding.content.filter(r => r.id !== 'local:notes');
  row(input, 'local:notes').source.hash = 'a'.repeat(64); reseal(input);
  refuse(input);
});

test('New descriptor accessors are rejected without executing caller code', () => {
  const input = fixture(); let invoked = false;
  Object.defineProperty(general(input).descriptor, 'version', { enumerable: true, get() { invoked = true; return '1'; } });
  invalid(input);
  assert.equal(invoked, false);
});
