import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { planKitContext } from './kit-context.mjs';
import { KIT_BINDING_LIMITS, validateKitBinding } from './kit-binding-state.mjs';
import { PI_RUNTIME_ADAPTER_ID, PI_RUNTIME_ADAPTER_REVISION } from './pi-runtime-port.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
function refuse(code, message, status = 400) { throw Object.assign(new Error(message), { code, status }); }
const budget = () => Object.fromEntries(['maxCoreBytes', 'maxContextBytes', 'maxContextCharacters'].map(key => [key, KIT_BINDING_LIMITS[key]]));

/** Host admission consumes the existing compiler; storage precedes Run authority. */
export async function retainKitContext({ binding, session, spark, adapter, history }) {
  const kits = binding.composition.kits ?? [];
  if (!kits.length) return null;
  const scope = binding.composition.selectionScope;
  if (scope?.type !== 'session' || scope.id !== session.id || session.scope === 'global' || session.extensionBinding || spark) {
    refuse('kit_scope_unsupported', 'Kits require an explicit Session selection for ordinary Chat', 409);
  }
  if (adapter?.id !== PI_RUNTIME_ADAPTER_ID || adapter.revision !== PI_RUNTIME_ADAPTER_REVISION
    || adapter.kitContext?.format !== 'reference-only-v1') {
    refuse('kit_runtime_unsupported', 'This Runtime has no verified reference-only Kit context interface', 409);
  }
  const plan = planKitContext({ binding, kits, runtime: { adapterId: adapter.id, revision: adapter.revision, bindingHash: binding.hash },
    compatibilityEvidence: adapter.kitContext.compatibilityEvidence, budget: budget() });
  if (plan.status !== 'compiled') refuse('kit_context_refused', `Kit context refused: ${[...new Set(plan.diagnostics.map(item => item.code))].join(', ')}`);
  const planBytes = Buffer.from(JSON.stringify(plan), 'utf8');
  const contextBytes = Buffer.from(plan.candidate.text, 'utf8');
  if (planBytes.length > KIT_BINDING_LIMITS.maxPlanBytes || planBytes.length + contextBytes.length > KIT_BINDING_LIMITS.maxPayloadBytes) {
    refuse('kit_payload_budget', 'Kit binding payload exceeds the Host retention limit');
  }
  const summary = {
    version: 1,
    profile: { id: binding.composition.id, version: binding.composition.version, sourceSha256: binding.composition.hash },
    controlRevision: binding.revision, bindingHash: binding.hash,
    kits: plan.kits, planVersion: plan.planVersion, compiler: 'kit-context-v1',
    adapter: { id: adapter.id, revision: adapter.revision }, compatibility: plan.compatibility,
    policy: 'reference-only-pi-unchecked-v1', limits: { ...KIT_BINDING_LIMITS }, planSha256: plan.planSha256,
    planPayload: { sha256: digest(planBytes), bytes: planBytes.length },
    contextPayload: { sha256: digest(contextBytes), bytes: contextBytes.length, characters: plan.candidate.characters },
  };
  validateKitBinding(summary);
  await history.save(session.id, planBytes, summary.planPayload.sha256);
  await history.save(session.id, contextBytes, summary.contextPayload.sha256);
  return summary;
}

/** Read a recorded Run without consulting mutable Runtime Control state. */
export async function readKitContext(history, sessionId, summary) {
  validateKitBinding(summary);
  if (!summary) refuse('kit_payload_invalid', 'Recorded Kit binding is absent', 409);
  const [planBytes, contextBytes] = await Promise.all([
    history.read(sessionId, summary.planPayload.sha256, summary.planPayload.bytes),
    history.read(sessionId, summary.contextPayload.sha256, summary.contextPayload.bytes),
  ]);
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
    const text = decoder.decode(contextBytes);
    const plan = JSON.parse(decoder.decode(planBytes));
    const { planSha256, ...unsigned } = plan;
    const expectedProfile = { id: plan.binding.composition.id, version: plan.binding.composition.version, sourceSha256: plan.binding.composition.hash };
    if (digest(planBytes) !== summary.planPayload.sha256 || digest(contextBytes) !== summary.contextPayload.sha256
      || plan.status !== 'compiled' || plan.planVersion !== summary.planVersion
      || planSha256 !== summary.planSha256 || digest(JSON.stringify(canonical(unsigned))) !== planSha256
      || !isDeepStrictEqual(expectedProfile, summary.profile)
      || plan.binding.hash !== summary.bindingHash || plan.binding.revision !== summary.controlRevision
      || !isDeepStrictEqual(plan.runtime, { adapterId: summary.adapter.id, revision: summary.adapter.revision, bindingHash: summary.bindingHash })
      || !isDeepStrictEqual(plan.kits, summary.kits) || !isDeepStrictEqual(plan.compatibility, summary.compatibility)
      || !isDeepStrictEqual(plan.budget, budget()) || plan.candidate.text !== text
      || plan.candidate.sha256 !== summary.contextPayload.sha256 || plan.candidate.bytes !== contextBytes.length
      || plan.candidate.characters !== text.length || text.length !== summary.contextPayload.characters
      || plan.accounting.sha256 !== summary.contextPayload.sha256 || plan.accounting.bytes !== contextBytes.length
      || plan.accounting.characters !== text.length || plan.accounting.coreBytes > summary.limits.maxCoreBytes
      || plan.candidate.segments.map(item => item.text).join('') !== text) throw new Error('payload disagreement');
    return { text, plan };
  } catch {
    refuse('kit_payload_invalid', 'Recorded Kit payload disagrees with its frozen binding', 409);
  }
}
