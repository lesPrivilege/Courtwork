import { createHash } from 'node:crypto';
import { compileControlContext, SCOPES } from './control-plane.mjs';
import { resolveRuntimeSource } from './source-resolver.mjs';

const HASH = /^[0-9a-f]{64}$/;
const KIT_ID = /^kit:[a-z0-9][a-z0-9._-]{0,79}$/;
const VERSION = /^[A-Za-z0-9._-]{1,80}$/;
const CONTENT_KINDS = new Set(['instruction', 'skill', 'reference', 'prompt_template']);
const MAX_KITS = 32;
const MAX_DESCRIPTOR_ENTRIES = 100;
const MAX_DESCRIPTOR_BYTES = 64 * 1024;
const MAX_EVIDENCE = 64;
const MAX_RESOURCE_ID = 200;

const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const sha256 = value => createHash('sha256').update(value, 'utf8').digest('hex');
const bytes = value => Buffer.byteLength(value, 'utf8');
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const copy = value => structuredClone(value);

function invalid(path, reason) {
  const error = new Error(`Invalid Kit input at ${path}: ${reason}`);
  error.code = 'invalid_kit_input';
  error.status = 400;
  error.path = path;
  error.reason = reason;
  throw error;
}

function object(value, allowed, path) {
  if (!plain(value)) invalid(path, 'plain-object-required');
  if (Object.getOwnPropertySymbols(value).length) invalid(path, 'plain-json-required');
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (!allowed.includes(key)) invalid(`${path}.${key}`, 'unsupported-field');
    if (!Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) invalid(`${path}.${key}`, 'data-property-required');
  }
}

function array(value, path, max, min = 0) {
  if (!Array.isArray(value) || value.length < min || value.length > max) invalid(path, 'array-bounds');
  if (Object.getOwnPropertySymbols(value).length) invalid(path, 'plain-json-required');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (let index = 0; index < value.length; index++) {
    const descriptor = descriptors[index];
    if (!descriptor) invalid(`${path}[${index}]`, 'dense-array-required');
    if (!Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) invalid(`${path}[${index}]`, 'data-property-required');
  }
  for (const key of Object.keys(descriptors)) {
    if (key === 'length') continue;
    if (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length) invalid(`${path}.${key}`, 'unsupported-field');
  }
}

function scalarText(value, path, { min = 1, max = Infinity, pattern = null } = {}) {
  if (typeof value !== 'string' || value.length < min || value.length > max) invalid(path, 'invalid-string');
  for (let index = 0; index < value.length; index++) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) invalid(path, 'invalid-unicode-scalar');
      index++;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) invalid(path, 'invalid-unicode-scalar');
  }
  if (pattern && !pattern.test(value)) invalid(path, 'invalid-format');
  return value;
}

function hash(value, path) {
  scalarText(value, path, { min: 64, max: 64 });
  if (!HASH.test(value)) invalid(path, 'invalid-sha256');
  return value;
}

function canonicalValue(value, path = '$', state = { seen: new WeakSet(), depth: 0 }) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) invalid(path, 'safe-integer-required');
    return value;
  }
  if (Array.isArray(value)) {
    if (state.depth >= 32) invalid(path, 'maximum-depth');
    if (state.seen.has(value)) invalid(path, 'cyclic-json');
    state.seen.add(value);
    for (let index = 0; index < value.length; index++) if (!Object.hasOwn(value, index)) invalid(`${path}[${index}]`, 'dense-array-required');
    const result = value.map((item, index) => canonicalValue(item, `${path}[${index}]`, { seen: state.seen, depth: state.depth + 1 }));
    state.seen.delete(value);
    return result;
  }
  if (!plain(value)) invalid(path, 'plain-json-required');
  if (state.depth >= 32) invalid(path, 'maximum-depth');
  if (state.seen.has(value)) invalid(path, 'cyclic-json');
  state.seen.add(value);
  const result = {};
  for (const key of Object.keys(value).sort(compare)) {
    if (value[key] === undefined || typeof value[key] === 'function' || typeof value[key] === 'symbol' || typeof value[key] === 'bigint') invalid(`${path}.${key}`, 'plain-json-required');
    result[key] = canonicalValue(value[key], `${path}.${key}`, { seen: state.seen, depth: state.depth + 1 });
  }
  state.seen.delete(value);
  return result;
}

function canonicalJson(value) { return JSON.stringify(canonicalValue(value)); }
const pinKey = pin => `${pin.id}\u0000${pin.version}\u0000${pin.descriptorSha256}`;
const pinCompare = (a, b) => compare(a.id, b.id) || compare(a.version, b.version) || compare(a.descriptorSha256, b.descriptorSha256);

function contentRef(value, path, deferred) {
  object(value, deferred ? ['resourceId', 'contentSha256', 'artifactSha256', 'required'] : ['resourceId', 'contentSha256', 'artifactSha256'], path);
  scalarText(value.resourceId, `${path}.resourceId`, { max: MAX_RESOURCE_ID });
  hash(value.contentSha256, `${path}.contentSha256`);
  hash(value.artifactSha256, `${path}.artifactSha256`);
  if (deferred && typeof value.required !== 'boolean') invalid(`${path}.required`, 'boolean-required');
  return {
    resourceId: value.resourceId,
    contentSha256: value.contentSha256,
    artifactSha256: value.artifactSha256,
    ...(deferred ? { required: value.required } : {}),
  };
}

function descriptor(value, path) {
  object(value, ['schemaVersion', 'id', 'version', 'core', 'deferred', 'requirements', 'conflicts'], path);
  if (value.schemaVersion !== 1) invalid(`${path}.schemaVersion`, 'unsupported-version');
  scalarText(value.id, `${path}.id`, { max: 84, pattern: KIT_ID });
  scalarText(value.version, `${path}.version`, { max: 80, pattern: VERSION });
  array(value.core, `${path}.core`, MAX_DESCRIPTOR_ENTRIES, 1);
  array(value.deferred, `${path}.deferred`, MAX_DESCRIPTOR_ENTRIES);
  array(value.requirements, `${path}.requirements`, MAX_DESCRIPTOR_ENTRIES);
  array(value.conflicts, `${path}.conflicts`, MAX_DESCRIPTOR_ENTRIES);
  const result = {
    schemaVersion: 1,
    id: value.id,
    version: value.version,
    core: value.core.map((item, index) => contentRef(item, `${path}.core[${index}]`, false)),
    deferred: value.deferred.map((item, index) => contentRef(item, `${path}.deferred[${index}]`, true)),
    requirements: value.requirements.map((item, index) => {
      const itemPath = `${path}.requirements[${index}]`;
      object(item, ['resourceId', 'required'], itemPath);
      scalarText(item.resourceId, `${itemPath}.resourceId`, { max: MAX_RESOURCE_ID });
      if (typeof item.required !== 'boolean') invalid(`${itemPath}.required`, 'boolean-required');
      return { resourceId: item.resourceId, required: item.required };
    }),
    conflicts: value.conflicts.map((item, index) => {
      scalarText(item, `${path}.conflicts[${index}]`, { max: 84, pattern: KIT_ID });
      if (item === value.id) invalid(`${path}.conflicts[${index}]`, 'self-conflict');
      return item;
    }),
  };
  if (bytes(canonicalJson(result)) > MAX_DESCRIPTOR_BYTES) invalid(path, 'descriptor-byte-limit');
  return result;
}

function validateKitInputs(input) {
  object(input, ['binding', 'kits', 'runtime', 'compatibilityEvidence', 'budget'], '$');
  array(input.kits, '$.kits', MAX_KITS);
  const records = input.kits.map((record, index) => {
    const path = `$.kits[${index}]`;
    object(record, ['descriptor', 'descriptorSha256'], path);
    const parsed = descriptor(record.descriptor, `${path}.descriptor`);
    hash(record.descriptorSha256, `${path}.descriptorSha256`);
    return { descriptor: parsed, descriptorSha256: record.descriptorSha256 };
  });

  // Kit-present unknown readings are explicit owner inputs. Only the legacy
  // passthrough may omit/ignore these fields; malformed input is not evidence.
  if (!Object.hasOwn(input, 'runtime')) invalid('$.runtime', 'required');
  let runtime = null;
  if (input.runtime !== null) {
    object(input.runtime, ['adapterId', 'revision', 'bindingHash'], '$.runtime');
    scalarText(input.runtime.adapterId, '$.runtime.adapterId', { max: 200 });
    scalarText(input.runtime.revision, '$.runtime.revision', { max: 200 });
    hash(input.runtime.bindingHash, '$.runtime.bindingHash');
    runtime = { adapterId: input.runtime.adapterId, revision: input.runtime.revision, bindingHash: input.runtime.bindingHash };
  }

  const suppliedEvidence = input.compatibilityEvidence;
  array(suppliedEvidence, '$.compatibilityEvidence', MAX_EVIDENCE);
  const compatibilityEvidence = suppliedEvidence.map((record, index) => {
    const path = `$.compatibilityEvidence[${index}]`;
    object(record, ['kit', 'bindingHash', 'runtime', 'result', 'evidence'], path);
    object(record.kit, ['id', 'version', 'descriptorSha256'], `${path}.kit`);
    scalarText(record.kit.id, `${path}.kit.id`, { max: 84, pattern: KIT_ID });
    scalarText(record.kit.version, `${path}.kit.version`, { max: 80, pattern: VERSION });
    hash(record.kit.descriptorSha256, `${path}.kit.descriptorSha256`);
    hash(record.bindingHash, `${path}.bindingHash`);
    object(record.runtime, ['adapterId', 'revision'], `${path}.runtime`);
    scalarText(record.runtime.adapterId, `${path}.runtime.adapterId`, { max: 200 });
    scalarText(record.runtime.revision, `${path}.runtime.revision`, { max: 200 });
    if (!['supported', 'unsupported'].includes(record.result)) invalid(`${path}.result`, 'unsupported-result');
    object(record.evidence, ['ref', 'sha256'], `${path}.evidence`);
    scalarText(record.evidence.ref, `${path}.evidence.ref`, { max: 4000 });
    hash(record.evidence.sha256, `${path}.evidence.sha256`);
    return copy(record);
  });

  if (input.budget === undefined) invalid('$.budget', 'required');
  object(input.budget, ['maxCoreBytes', 'maxContextBytes', 'maxContextCharacters'], '$.budget');
  for (const key of ['maxCoreBytes', 'maxContextBytes', 'maxContextCharacters']) {
    if (!Number.isSafeInteger(input.budget[key]) || input.budget[key] < 0) invalid(`$.budget.${key}`, 'nonnegative-safe-integer-required');
  }
  if (input.budget.maxContextCharacters > 100000) invalid('$.budget.maxContextCharacters', 'host-character-limit');
  return { records, runtime, compatibilityEvidence, budget: copy(input.budget) };
}

function topLevel(input) {
  if (!plain(input)) invalid('$', 'plain-object-required');
  if (Object.getOwnPropertySymbols(input).length) invalid('$', 'plain-json-required');
  const descriptors = Object.getOwnPropertyDescriptors(input);
  for (const key of Object.keys(descriptors)) if (!['binding', 'kits', 'runtime', 'compatibilityEvidence', 'budget'].includes(key)) invalid(`$.${key}`, 'unsupported-field');
  for (const key of ['binding', 'kits']) {
    const descriptor = descriptors[key];
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) invalid(`$.${key}`, 'data-property-required');
  }
  return { binding: descriptors.binding.value, kits: descriptors.kits.value };
}

function bindingSummary(binding) {
  return { revision: binding?.revision, hash: binding?.hash, composition: copy(binding?.composition ?? null) };
}

function measurement(text, segments, coreBytes, deferredBytes) {
  return { sha256: sha256(text), bytes: bytes(text), characters: text.length, coreBytes, deferredBytes };
}

function segment(kind, resourceIds, kits, text, start) {
  return {
    kind,
    resourceIds: [...resourceIds],
    kits: kits.map(copy),
    text,
    start,
    end: start + text.length,
    sha256: sha256(text),
    bytes: bytes(text),
    characters: text.length,
  };
}

function finalize(plan) {
  const result = copy(plan);
  result.planSha256 = sha256(canonicalJson(result));
  return result;
}

function passthrough(binding) {
  const text = compileControlContext(binding);
  const segments = [segment('legacy', [], [], text, 0)];
  const accounting = measurement(text, segments, 0, 0);
  return finalize({
    planVersion: 1,
    status: 'passthrough',
    binding: bindingSummary(binding),
    runtime: null,
    kits: [],
    compatibility: { status: 'not-applicable', kits: [] },
    references: [],
    requirements: [],
    diagnostics: [],
    budget: null,
    accounting,
    candidate: { text, sha256: accounting.sha256, bytes: accounting.bytes, characters: accounting.characters, segments },
  });
}

/**
 * Produce a bounded, immutable context plan over an already-admitted Runtime
 * Control binding. This function performs no discovery, persistence, loading,
 * permission evaluation, native projection, filesystem or network work.
 */
export function planKitContext(input) {
  const direct = topLevel(input);
  array(direct.kits, '$.kits', MAX_KITS);
  if (direct.kits.length === 0) return passthrough(direct.binding);

  const { records, runtime, compatibilityEvidence, budget } = validateKitInputs(input);
  const diagnostics = [];
  const fatalCodes = new Set();
  const diagnose = (code, fields = {}, fatal = false) => {
    const diagnostic = {
      code,
      kitId: fields.kitId ?? null,
      resourceId: fields.resourceId ?? null,
      required: fields.required ?? null,
      ...Object.fromEntries(Object.entries(fields).filter(([key]) => !['kitId', 'resourceId', 'required'].includes(key))),
    };
    diagnostics.push(diagnostic);
    if (fatal) fatalCodes.add(canonicalJson(diagnostic));
  };

  const uniqueRecords = new Map();
  for (const record of records) {
    const actual = sha256(canonicalJson(record.descriptor));
    const pin = { id: record.descriptor.id, version: record.descriptor.version, descriptorSha256: record.descriptorSha256 };
    if (actual !== record.descriptorSha256) diagnose('descriptor-sha256-mismatch', { kitId: pin.id, actual, supplied: record.descriptorSha256 }, true);
    const key = `${pinKey(pin)}\u0000${actual}`;
    if (!uniqueRecords.has(key)) uniqueRecords.set(key, { ...record, pin });
  }
  const selected = [...uniqueRecords.values()].sort((a, b) => pinCompare(a.pin, b.pin)
    || compare(canonicalJson(a.descriptor), canonicalJson(b.descriptor)));
  const kits = selected.map(item => copy(item.pin));
  const versionsById = new Map();
  for (const item of selected) {
    const identities = versionsById.get(item.pin.id) ?? new Set();
    identities.add(`${item.pin.version}\u0000${item.pin.descriptorSha256}`);
    versionsById.set(item.pin.id, identities);
  }
  for (const [kitId, identities] of versionsById) if (identities.size > 1) diagnose('kit-pin-conflict', { kitId }, true);
  const selectedIds = new Set(kits.map(kit => kit.id));
  for (const item of selected) for (const targetKitId of new Set(item.descriptor.conflicts)) {
    if (selectedIds.has(targetKitId)) diagnose('kit-conflict', { kitId: item.pin.id, targetKitId }, true);
  }

  const refMap = new Map();
  function addReference(ref, role, pin, required) {
    const prior = refMap.get(ref.resourceId);
    if (prior && prior.role !== role) {
      diagnose('content-role-conflict', { kitId: pin.id, resourceId: ref.resourceId, required }, true);
      return;
    }
    if (prior && (prior.contentSha256 !== ref.contentSha256 || prior.artifactSha256 !== ref.artifactSha256)) {
      diagnose('content-pin-conflict', { kitId: pin.id, resourceId: ref.resourceId, required }, true);
      return;
    }
    const entry = prior ?? {
      resourceId: ref.resourceId,
      role,
      contentSha256: ref.contentSha256,
      artifactSha256: ref.artifactSha256,
      required: false,
      owners: new Map(),
    };
    entry.required ||= required;
    entry.owners.set(pinKey(pin), copy(pin));
    refMap.set(ref.resourceId, entry);
  }
  const requirementMap = new Map();
  for (const item of selected) {
    for (const ref of item.descriptor.core) addReference(ref, 'core', item.pin, true);
    for (const ref of item.descriptor.deferred) addReference(ref, 'deferred', item.pin, ref.required);
    for (const requirement of item.descriptor.requirements) {
      const key = `${pinKey(item.pin)}\u0000${requirement.resourceId}`;
      const prior = requirementMap.get(key);
      requirementMap.set(key, { pin: copy(item.pin), resourceId: requirement.resourceId, required: Boolean(prior?.required || requirement.required) });
    }
  }

  let renderable = true;
  const binding = input.binding;
  const resources = Array.isArray(binding?.resources) ? binding.resources : null;
  const content = Array.isArray(binding?.content) ? binding.content : null;
  if (!resources || !content) {
    diagnose('binding-shape-mismatch', {}, true);
    renderable = false;
  }
  if (!plain(binding?.composition) || binding.composition.status !== 'compatible') {
    diagnose('binding-composition-incompatible', {}, true);
    renderable = false;
  }

  const resourcesById = new Map();
  const contentById = new Map();
  if (resources) for (const resource of resources) {
    if (typeof resource?.id !== 'string') { diagnose('binding-resource-mismatch', {}, true); renderable = false; continue; }
    if (resourcesById.has(resource.id)) { diagnose('duplicate-binding-resource', { resourceId: resource.id }, true); renderable = false; }
    else resourcesById.set(resource.id, resource);
  }
  if (content) for (const item of content) {
    if (typeof item?.id !== 'string') { diagnose('binding-content-mismatch', {}, true); renderable = false; continue; }
    if (contentById.has(item.id)) { diagnose('duplicate-binding-content', { resourceId: item.id }, true); renderable = false; }
    else contentById.set(item.id, item);
  }

  const loader = resourcesById.get('tool:runtime_load');
  const referenceRows = [];
  const resolvedRefs = new Map();
  for (const entry of [...refMap.values()].sort((a, b) => compare(a.resourceId, b.resourceId))) {
    const owners = [...entry.owners.values()].sort(pinCompare);
    const resource = resourcesById.get(entry.resourceId);
    const body = contentById.get(entry.resourceId);
    let status = 'missing';
    let identity = null;
    let source = resource?.source ? copy(resource.source) : null;
    let mismatch = false;
    if (resource && body) {
      const expectedKind = entry.role === 'core' ? 'instruction' : null;
      const kindMatches = expectedKind ? resource.kind === expectedKind && body.kind === expectedKind
        : ['skill', 'reference'].includes(resource.kind) && body.kind === resource.kind;
      const scopeMatches = plain(resource.scope) && plain(body.scope)
        && resource.scope.type === body.scope.type && resource.scope.id === body.scope.id;
      const envelopeMatches = resource.id === body.id && resource.title === body.title && scopeMatches;
      let resolved = null;
      try { resolved = resolveRuntimeSource({ type: 'inline', kind: body.kind, title: body.title, content: body.content }); }
      catch { mismatch = true; }
      identity = resolved?.identity ? copy(resolved.identity) : null;
      const digestMatches = identity?.contentSha256 === entry.contentSha256
        && identity?.artifactSha256 === entry.artifactSha256
        && resource.source?.hash === entry.contentSha256;
      const activationMatches = entry.role !== 'core' || resource.activation === 'always';
      if (!kindMatches || !envelopeMatches || !digestMatches || !activationMatches) mismatch = true;
      if (mismatch) status = 'mismatch';
      else if (!resource.exposed || (entry.role === 'deferred' && !loader?.exposed)) status = 'not-exposed';
      else status = entry.role === 'core' ? 'instructions' : 'deferred';
    } else if (resource && !body) {
      const kindMatches = entry.role === 'core' ? resource.kind === 'instruction' : ['skill', 'reference'].includes(resource.kind);
      const digestMatches = resource.source?.hash === entry.contentSha256;
      const activationMatches = entry.role !== 'core' || resource.activation === 'always';
      if (!kindMatches || !digestMatches || !activationMatches) { status = 'mismatch'; mismatch = true; }
      else if (!resource.exposed) status = 'not-exposed';
    } else if (!resource && body) {
      const kindMatches = entry.role === 'core' ? body.kind === 'instruction' : ['skill', 'reference'].includes(body.kind);
      let resolved = null;
      try { resolved = resolveRuntimeSource({ type: 'inline', kind: body.kind, title: body.title, content: body.content }); }
      catch { mismatch = true; }
      identity = resolved?.identity ? copy(resolved.identity) : null;
      if (!kindMatches || identity?.contentSha256 !== entry.contentSha256 || identity?.artifactSha256 !== entry.artifactSha256) {
        status = 'mismatch'; mismatch = true;
      }
    }

    if (status === 'mismatch') {
      diagnose('source-mismatch', { kitId: owners[0]?.id ?? null, resourceId: entry.resourceId, required: entry.required }, true);
      renderable = false;
    } else if (status === 'missing') {
      diagnose('source-missing', { kitId: owners[0]?.id ?? null, resourceId: entry.resourceId, required: entry.required }, entry.required);
      if (entry.required) renderable = false;
    } else if (status === 'not-exposed') {
      const code = entry.role === 'deferred' && resource?.exposed && !loader?.exposed ? 'deferred-loader-unavailable' : 'source-not-exposed';
      diagnose(code, { kitId: owners[0]?.id ?? null, resourceId: entry.resourceId, required: entry.required }, entry.required);
      if (entry.required) renderable = false;
    }
    const row = { resourceId: entry.resourceId, kind: entry.role === 'core' ? 'instruction' : resource?.kind ?? null, required: entry.required, status, kits: owners, identity, source };
    referenceRows.push(row);
    resolvedRefs.set(entry.resourceId, row);
  }

  const requirementRows = [];
  for (const requirement of [...requirementMap.values()].sort((a, b) => pinCompare(a.pin, b.pin) || compare(a.resourceId, b.resourceId))) {
    const resource = resourcesById.get(requirement.resourceId);
    let status = 'available';
    if (!resource) status = 'missing';
    else if (CONTENT_KINDS.has(resource.kind)) status = 'content-ref-required';
    else if (!resource.exposed) status = 'not-exposed';
    const reading = resource ? {
      kind: resource.kind,
      title: resource.title,
      source: resource.source ? copy(resource.source) : null,
      installed: resource.installed ?? null,
      exposed: resource.exposed ?? null,
      running: resource.running ?? null,
      health: resource.health ?? null,
      permission: resource.permission ? copy(resource.permission) : null,
    } : null;
    requirementRows.push({ kitId: requirement.pin.id, resourceId: requirement.resourceId, required: requirement.required, status, reading });
    if (status === 'content-ref-required') diagnose('requirement-content-ref-required', { kitId: requirement.pin.id, resourceId: requirement.resourceId, required: requirement.required }, true);
    else if (status === 'missing') diagnose('requirement-missing', { kitId: requirement.pin.id, resourceId: requirement.resourceId, required: requirement.required }, requirement.required);
    else if (status === 'not-exposed') diagnose('requirement-not-exposed', { kitId: requirement.pin.id, resourceId: requirement.resourceId, required: requirement.required }, requirement.required);
  }

  if (runtime && runtime.bindingHash !== binding?.hash) diagnose('runtime-binding-mismatch', {}, true);
  const evidenceMap = new Map();
  for (const evidence of compatibilityEvidence) evidenceMap.set(canonicalJson(evidence), evidence);
  const uniqueEvidence = [...evidenceMap.values()].sort((a, b) => compare(canonicalJson(a), canonicalJson(b)));
  const compatibilityKits = [];
  for (const pin of kits) {
    const matching = [];
    for (const evidence of uniqueEvidence) {
      const applies = evidence.kit.id === pin.id && evidence.kit.version === pin.version
        && evidence.kit.descriptorSha256 === pin.descriptorSha256
        && evidence.bindingHash === binding?.hash
        && runtime !== null && runtime.bindingHash === binding?.hash
        && evidence.runtime.adapterId === runtime.adapterId && evidence.runtime.revision === runtime.revision;
      if (applies) matching.push(evidence);
    }
    const results = new Set(matching.map(item => item.result));
    let status = results.size === 1 ? [...results][0] : 'unchecked';
    if (results.size > 1) {
      diagnose('compatibility-evidence-conflict', { kitId: pin.id }, true);
      status = 'unchecked';
    }
    const evidence = matching
      .map(item => ({ ref: item.evidence.ref, sha256: item.evidence.sha256, result: item.result }))
      .sort((a, b) => compare(a.ref, b.ref) || compare(a.sha256, b.sha256) || compare(a.result, b.result));
    compatibilityKits.push({ ...copy(pin), status, evidence });
    if (status === 'unsupported') diagnose('runtime-unsupported', { kitId: pin.id }, true);
  }
  for (const evidence of uniqueEvidence) {
    const applies = compatibilityKits.some(item => item.id === evidence.kit.id && item.version === evidence.kit.version
      && item.descriptorSha256 === evidence.kit.descriptorSha256
      && evidence.bindingHash === binding?.hash && runtime !== null && runtime.bindingHash === binding?.hash
      && evidence.runtime.adapterId === runtime.adapterId && evidence.runtime.revision === runtime.revision);
    if (!applies) diagnose('evidence-not-applicable', {
      kitId: evidence.kit.id,
      evidence: copy(evidence),
    });
  }
  const compatibilityStatus = uniqueEvidence.some(evidence => compatibilityKits.some(item => item.id === evidence.kit.id
      && item.version === evidence.kit.version && item.descriptorSha256 === evidence.kit.descriptorSha256
      && evidence.bindingHash === binding?.hash && runtime !== null && runtime.bindingHash === binding?.hash
      && evidence.runtime.adapterId === runtime.adapterId && evidence.runtime.revision === runtime.revision)
      && evidence.result === 'unsupported') ? 'unsupported'
    : compatibilityKits.some(item => item.status === 'unchecked') ? 'unchecked' : 'supported';

  let accounting = null;
  let candidate = null;
  if (renderable && resources && content) {
    const instructions = content.filter(item => item.kind === 'instruction');
    for (const item of instructions) {
      try {
        scalarText(item.id, `binding.content.${item.id}.id`, { max: MAX_RESOURCE_ID });
        scalarText(item.content, `binding.content.${item.id}.content`);
        scalarText(item.scope?.type, `binding.content.${item.id}.scope.type`, { max: 200 });
      } catch {
        diagnose('render-text-invalid', { resourceId: typeof item?.id === 'string' ? item.id : null }, true);
        renderable = false;
      }
      if (!SCOPES.includes(item.scope?.type)) { diagnose('instruction-scope-mismatch', { resourceId: item.id }, true); renderable = false; }
    }
    const catalogResources = resources.filter(resource => resource.exposed && ['skill', 'reference'].includes(resource.kind));
    for (const resource of catalogResources) {
      try {
        scalarText(resource.id, `binding.resources.${resource.id}.id`, { max: MAX_RESOURCE_ID });
        scalarText(resource.kind, `binding.resources.${resource.id}.kind`, { max: 200 });
        scalarText(resource.description ?? resource.title, `binding.resources.${resource.id}.description`, { max: 100000 });
      } catch {
        diagnose('render-text-invalid', { resourceId: typeof resource?.id === 'string' ? resource.id : null }, true);
        renderable = false;
      }
    }
    if (renderable) {
      instructions.sort((a, b) => SCOPES.indexOf(a.scope.type) - SCOPES.indexOf(b.scope.type) || compare(a.id, b.id));
      const segments = [];
      let offset = 0;
      for (const instruction of instructions) {
        const raw = compileControlContext({ content: [instruction], resources: [] });
        if (!raw) continue;
        const prefix = segments.length ? '\n\n' : '';
        const text = prefix + raw;
        const owners = resolvedRefs.get(instruction.id)?.status === 'instructions' ? resolvedRefs.get(instruction.id).kits : [];
        const item = segment('instruction', [instruction.id], owners, text, offset);
        segments.push(item);
        offset = item.end;
      }
      const rawCatalog = compileControlContext({ content: [], resources });
      if (rawCatalog) {
        const prefix = segments.length ? '\n\n' : '';
        const text = prefix + rawCatalog;
        const resourceIds = catalogResources.map(resource => resource.id);
        const ownerMap = new Map();
        for (const id of resourceIds) for (const pin of resolvedRefs.get(id)?.status === 'deferred' ? resolvedRefs.get(id).kits : []) ownerMap.set(pinKey(pin), pin);
        const item = segment('catalog', resourceIds, [...ownerMap.values()].sort(pinCompare), text, offset);
        segments.push(item);
      }
      const text = segments.map(item => item.text).join('');
      const coreBytes = segments.filter(item => item.kind === 'instruction' && item.kits.length).reduce((total, item) => total + item.bytes, 0);
      const deferredBytes = referenceRows.filter(item => item.status === 'deferred').reduce((total, item) => total + item.identity.bytes, 0);
      accounting = measurement(text, segments, coreBytes, deferredBytes);
      candidate = { text, sha256: accounting.sha256, bytes: accounting.bytes, characters: accounting.characters, segments };
      if (accounting.coreBytes > budget.maxCoreBytes) diagnose('core-budget-exceeded', { actual: accounting.coreBytes, limit: budget.maxCoreBytes }, true);
      if (accounting.bytes > budget.maxContextBytes) diagnose('context-byte-budget-exceeded', { actual: accounting.bytes, limit: budget.maxContextBytes }, true);
      if (accounting.characters > budget.maxContextCharacters) diagnose('context-character-budget-exceeded', { actual: accounting.characters, limit: budget.maxContextCharacters }, true);
    }
  }

  const diagnosticMap = new Map();
  for (const diagnostic of diagnostics) diagnosticMap.set(canonicalJson(diagnostic), diagnostic);
  const normalizedDiagnostics = [...diagnosticMap.values()].sort((a, b) => compare(a.kitId ?? '', b.kitId ?? '')
    || compare(a.resourceId ?? '', b.resourceId ?? '') || compare(a.code, b.code) || compare(canonicalJson(a), canonicalJson(b)));
  const refused = fatalCodes.size > 0;
  return finalize({
    planVersion: 1,
    status: refused ? 'refused' : 'compiled',
    binding: bindingSummary(binding),
    runtime: runtime ? copy(runtime) : null,
    kits,
    compatibility: { status: compatibilityStatus, kits: compatibilityKits },
    references: referenceRows,
    requirements: requirementRows,
    diagnostics: normalizedDiagnostics,
    budget: copy(budget),
    accounting,
    candidate: refused ? null : candidate,
  });
}
