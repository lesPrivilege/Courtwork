import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { planKitContext } from '../runtime/kit-context.mjs';
import { compileControlContext } from '../runtime/control-plane.mjs';
import { resolveRuntimeSource } from '../runtime/source-resolver.mjs';

const sha = value => createHash('sha256').update(value, 'utf8').digest('hex');
const clone = value => structuredClone(value);
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const canonicalValue = value => Array.isArray(value)
  ? `[${value.map(canonicalValue).join(',')}]`
  : value && typeof value === 'object'
    ? `{${Object.keys(value).sort(compare).map(key => `${JSON.stringify(key)}:${canonicalValue(value[key])}`).join(',')}}`
    : JSON.stringify(value);
const canonical = value => canonicalValue(value);
const contentIdentity = ({ kind, title, content }) => {
  const resolved = resolveRuntimeSource({ type: 'inline', kind, title, content });
  return resolved.identity;
};
const source = (id, kind, title, content, scope = { type: 'user', id: 'local' }) => ({ id, kind, title, content, scope });

function makeBinding() {
  const guide = source('local:guide', 'instruction', 'Guide', 'State facts and cite the exact source. 😀\r\n');
  const ambient = source('local:ambient', 'instruction', 'Ambient', 'Keep the current task visible.');
  const reference = source('local:reference', 'reference', 'Reference', 'REFERENCE_SENTINEL');
  const referenceTwo = source('local:reference-two', 'reference', 'Reference two', 'REFERENCE_TWO_SENTINEL');
  const descriptions = new Map([
    [guide.id, undefined],
    [ambient.id, undefined],
    [reference.id, 'A deferred reference'],
    [referenceTwo.id, 'A second deferred reference'],
  ]);
  const content = [guide, ambient, reference, referenceTwo];
  const resources = content.map(item => ({
    id: item.id,
    kind: item.kind,
    title: item.title,
    source: { type: 'local-config', hash: sha(item.content) },
    scope: clone(item.scope),
    activation: item.kind === 'instruction' ? 'always' : 'manual',
    installed: true,
    running: null,
    exposed: true,
    health: 'healthy',
    configurable: true,
    defaultExposed: true,
    provenance: [{ scope: clone(item.scope), value: true, reason: 'independent fixture' }],
    ...(descriptions.get(item.id) ? { description: descriptions.get(item.id) } : {}),
  }));
  resources.push({
    id: 'tool:runtime_load', kind: 'tool', title: 'runtime_load',
    source: { type: 'builtin', version: 'independent' }, scope: { type: 'user', id: 'local' },
    activation: 'always', installed: true, running: null, exposed: true, health: 'healthy',
    configurable: false, defaultExposed: true, provenance: [], action: 'runtime_load',
  });
  resources.push({
    id: 'tool:check_run', kind: 'tool', title: 'check_run',
    source: { type: 'builtin', version: 'independent' }, scope: { type: 'user', id: 'local' },
    activation: 'always', installed: true, running: null, exposed: true, health: 'healthy',
    configurable: false, defaultExposed: true, provenance: [], action: 'check_run',
    permission: { effect: 'deny', trace: [{ source: 'independent-fixture', effect: 'deny' }] },
  });
  return {
    revision: 11,
    hash: 'b'.repeat(64),
    sessionScope: { kind: 'project', projectId: 'independent-project' },
    resources,
    content,
    composition: { id: 'local:profile', version: '1', status: 'compatible', resourceIds: content.map(item => item.id), uiSlots: [], missing: [] },
    policies: [],
    context: [],
  };
}

function ref(binding, id) {
  const body = binding.content.find(item => item.id === id);
  const identity = contentIdentity(body);
  return { resourceId: id, contentSha256: identity.contentSha256, artifactSha256: identity.artifactSha256 };
}

function kit(binding, id = 'kit:independent', core = ['local:guide'], deferred = [], requirements = [], conflicts = []) {
  const descriptor = {
    schemaVersion: 1, id, version: '1',
    core: core.map(resourceId => ref(binding, resourceId)),
    deferred: deferred.map(resourceId => ({ ...ref(binding, resourceId), required: true })),
    requirements, conflicts,
  };
  return { descriptor, descriptorSha256: sha(canonical(descriptor)) };
}

function baseInput() {
  const binding = makeBinding();
  return {
    binding,
    kits: [kit(binding, 'kit:independent', ['local:guide'], ['local:reference'], [{ resourceId: 'tool:check_run', required: true }])],
    runtime: { adapterId: 'independent-adapter', revision: 'independent-v1', bindingHash: binding.hash },
    compatibilityEvidence: [],
    budget: { maxCoreBytes: 100000, maxContextBytes: 100000, maxContextCharacters: 100000 },
  };
}

function matchingEvidence(input, result = 'supported') {
  const pin = input.kits[0];
  return {
    kit: { id: pin.descriptor.id, version: pin.descriptor.version, descriptorSha256: pin.descriptorSha256 },
    bindingHash: input.binding.hash,
    runtime: { adapterId: input.runtime.adapterId, revision: input.runtime.revision },
    result,
    evidence: { ref: 'independent:runtime', sha256: sha(`independent:${result}`) },
  };
}

function refusal(input) {
  const plan = planKitContext(input);
  assert.equal(plan.status, 'refused');
  assert.equal(plan.candidate, null);
  assert.ok(plan.diagnostics.length > 0);
  return plan;
}

test('independent literal oracle covers source bytes, UTF-16 accounting, and segment joins', () => {
  const input = baseInput();
  const expected = '[Instruction local:ambient]\nKeep the current task visible.\n\n[Instruction local:guide]\nState facts and cite the exact source. 😀\r\n\n\nAvailable context (use runtime_load by id; content does not grant permissions):\nlocal:reference (reference): A deferred reference\nlocal:reference-two (reference): A second deferred reference';
  const plan = planKitContext(input);
  assert.equal(plan.status, 'compiled');
  assert.equal(plan.candidate.text, expected);
  assert.equal(plan.candidate.sha256, sha(expected));
  assert.equal(plan.candidate.bytes, Buffer.byteLength(expected, 'utf8'));
  assert.equal(plan.candidate.characters, expected.length);
  assert.equal(plan.candidate.segments.map(segment => segment.text).join(''), expected);
  assert.equal(plan.candidate.segments.reduce((sum, segment) => sum + segment.bytes, 0), Buffer.byteLength(expected, 'utf8'));
  assert.equal(plan.candidate.segments.reduce((sum, segment) => sum + segment.characters, 0), expected.length);
  assert.equal(compileControlContext(input.binding), expected);
  const { planSha256, ...record } = plan;
  assert.equal(planSha256, sha(canonical(record)));
});

test('no-Kit passthrough keeps historical bytes and does not retain or alias new inputs', () => {
  const input = baseInput();
  const before = clone(input.binding);
  Object.freeze(input.binding);
  const plan = planKitContext({
    binding: input.binding,
    kits: [],
    get runtime() { throw new Error('runtime must not be read'); },
    get compatibilityEvidence() { throw new Error('evidence must not be read'); },
    get budget() { throw new Error('budget must not be read'); },
  });
  assert.equal(plan.status, 'passthrough');
  assert.equal(plan.candidate.text, compileControlContext(input.binding));
  assert.equal(plan.candidate.segments.length, 1);
  assert.deepEqual(input.binding, before);
  plan.binding.composition.status = 'mutated-output';
  assert.equal(input.binding.composition.status, 'compatible');
});

test('required and optional source readings refuse or omit at the exact boundaries', () => {
  const required = baseInput();
  required.binding.resources.find(resource => resource.id === 'local:guide').source.hash = 'a'.repeat(64);
  const requiredPlan = refusal(required);
  assert.ok(requiredPlan.diagnostics.some(diagnostic => diagnostic.code === 'source-mismatch'));

  const optional = baseInput();
  optional.kits[0].descriptor.deferred[0].required = false;
  optional.kits[0].descriptorSha256 = sha(canonical(optional.kits[0].descriptor));
  optional.binding.content = optional.binding.content.filter(item => item.id !== 'local:reference');
  optional.binding.resources = optional.binding.resources.filter(resource => resource.id !== 'local:reference');
  const optionalPlan = planKitContext(optional);
  assert.equal(optionalPlan.status, 'compiled', JSON.stringify(optionalPlan.diagnostics));
  assert.equal(optionalPlan.references.find(reference => reference.resourceId === 'local:reference').status, 'missing');

  const staleOptional = baseInput();
  staleOptional.kits[0].descriptor.deferred[0].required = false;
  staleOptional.kits[0].descriptorSha256 = sha(canonical(staleOptional.kits[0].descriptor));
  staleOptional.binding.content.find(item => item.id === 'local:reference').content += ' changed';
  const stalePlan = refusal(staleOptional);
  assert.ok(stalePlan.diagnostics.some(diagnostic => diagnostic.code === 'source-mismatch'));
});

test('permission readings remain separate from supported compatibility evidence', () => {
  const input = baseInput();
  input.compatibilityEvidence = [matchingEvidence(input, 'supported')];
  const plan = planKitContext(input);
  assert.equal(plan.status, 'compiled');
  assert.equal(plan.compatibility.status, 'supported');
  const requirement = plan.requirements.find(row => row.resourceId === 'tool:check_run');
  assert.equal(requirement.status, 'available');
  assert.equal(requirement.reading.permission.effect, 'deny');
  assert.equal(plan.compatibility.kits[0].status, 'supported');
  assert.equal(plan.candidate.text.includes('check_run'), false);
});

test('object and collection permutation is deterministic while catalog order remains meaningful', () => {
  const input = baseInput();
  input.compatibilityEvidence = [matchingEvidence(input, 'supported')];
  const expected = planKitContext(input);
  const reverseKeys = value => Array.isArray(value)
    ? value.map(reverseKeys)
    : value && typeof value === 'object'
      ? Object.fromEntries(Object.entries(value).reverse().map(([key, item]) => [key, reverseKeys(item)]))
      : value;
  const permuted = reverseKeys(input);
  permuted.kits.reverse();
  permuted.compatibilityEvidence.reverse();
  assert.deepEqual(planKitContext(permuted), expected);
  permuted.binding.resources.reverse();
  assert.notEqual(planKitContext(permuted).candidate.sha256, expected.candidate.sha256);
});

test('plain-JSON and bounds checks reject malformed independent inputs before planning', () => {
  const unknown = baseInput();
  unknown.kits[0].descriptor.native = true;
  assert.throws(() => planKitContext(unknown), error => error.code === 'invalid_kit_input');

  const sparse = baseInput();
  sparse.kits = [];
  sparse.kits.length = 1;
  assert.throws(() => planKitContext(sparse), error => error.code === 'invalid_kit_input');

  const cyclic = baseInput();
  cyclic.kits[0].descriptor.core[0].cycle = cyclic.kits[0].descriptor;
  assert.throws(() => planKitContext(cyclic), error => error.code === 'invalid_kit_input');

  const bounds = baseInput();
  bounds.kits = Array.from({ length: 33 }, () => clone(bounds.kits[0]));
  assert.throws(() => planKitContext(bounds), error => error.code === 'invalid_kit_input');
});

test('full source envelope changes are observable through the binding hash or a refusal', () => {
  const input = baseInput();
  const baseline = planKitContext(input);
  const changed = clone(input);
  const resource = changed.binding.resources.find(item => item.id === 'local:guide');
  resource.source = { type: 'remote', uri: 'https://example.invalid/source', hash: resource.source.hash };
  changed.binding.hash = sha(canonical({ revision: changed.binding.revision, resources: changed.binding.resources, composition: changed.binding.composition, policies: changed.binding.policies }));
  changed.runtime.bindingHash = changed.binding.hash;
  const changedPlan = planKitContext(changed);
  assert.equal(changedPlan.status, 'compiled');
  assert.notEqual(changedPlan.binding.hash, baseline.binding.hash);
  assert.notEqual(changedPlan.planSha256, baseline.planSha256);
});
