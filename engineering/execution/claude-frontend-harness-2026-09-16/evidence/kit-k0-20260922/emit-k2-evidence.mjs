// Offline synthetic report; no file writes, Host, provider or native runtime.
// Run from repository root with the exact source SHA as argv[2].
import { planKitContext } from '../../../../../app/runtime/kit-context.mjs';
import { fixture, freeze, evidence, reseal, repinResource } from '../../../../../app/tests/fixtures/kit-context.mjs';

const source = process.argv[2];
if (!/^[a-f0-9]{40}$/.test(source ?? '')) throw new Error('Supply the exact committed source SHA');
const summary = plan => ({
  status: plan.status, binding: plan.binding, kits: plan.kits,
  compatibility: plan.compatibility, requirements: plan.requirements,
  references: plan.references, budget: plan.budget, accounting: plan.accounting,
  diagnostics: plan.diagnostics, planSha256: plan.planSha256,
  candidate: plan.candidate,
});
const examples = Object.fromEntries(['general', 'coding', 'praxis'].map(mode => {
  const input = freeze(fixture(mode));
  return [mode, summary(planKitContext(input))];
}));
const historicalInput = freeze(fixture());
const historical = planKitContext(historicalInput);
const onlyGeneral = structuredClone(historicalInput);
onlyGeneral.kits = onlyGeneral.kits.filter(k => k.descriptor.id === 'kit:general');
const versionChanged = structuredClone(historicalInput);
versionChanged.kits[0].descriptor.version = '2'; reseal(versionChanged);
const deferredChanged = structuredClone(historicalInput);
deferredChanged.binding.content.find(r => r.id === 'local:notes').content += ' Changed retained reference.';
repinResource(deferredChanged, 'local:notes');
const missing = structuredClone(historicalInput);
missing.binding.content = missing.binding.content.filter(r => r.id !== 'local:general');
const overflow = structuredClone(historicalInput);
overflow.budget.maxContextBytes = historical.candidate.bytes - 1;
const supported = structuredClone(historicalInput);
supported.compatibilityEvidence = supported.kits.map(k => evidence(supported, k));
const unsupported = structuredClone(supported);
unsupported.compatibilityEvidence[0].result = 'unsupported';
const wrongRevision = structuredClone(supported);
wrongRevision.runtime.revision = 'fixture-v2';
const identity = plan => ({ status: plan.status, compatibility: plan.compatibility.status, planSha256: plan.planSha256, candidateSha256: plan.candidate?.sha256 ?? null, accounting: plan.accounting, diagnostics: plan.diagnostics });
console.log(JSON.stringify({
  source, node: process.version, evidenceKind: 'synthetic-only',
  limitation: 'Fixture compatibility is not runtime verification. Compilation is not action admission. Binding resources were validated and seeded in memory, then consumed by the existing RuntimeControlPlane.inspect/bind; no profile save or Run freeze is implemented.',
  examples,
  invariants: {
    historical: identity(historical),
    kitDeselectedInstructionsRemain: identity(planKitContext(onlyGeneral)),
    noKits: identity(planKitContext({ binding: historicalInput.binding, kits: [] })),
    versionChanged: identity(planKitContext(versionChanged)),
    deferredBodyChanged: identity(planKitContext(deferredChanged)),
    historicalRecompiled: identity(planKitContext(historicalInput)),
    requiredSourceMissing: identity(planKitContext(missing)),
    oneByteUnder: identity(planKitContext(overflow)),
    syntheticSupported: identity(planKitContext(supported)),
    syntheticUnsupported: identity(planKitContext(unsupported)),
    evidenceWrongRevision: identity(planKitContext(wrongRevision)),
  },
}, null, 2));
