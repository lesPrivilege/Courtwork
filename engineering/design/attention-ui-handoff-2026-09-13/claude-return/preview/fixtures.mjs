/* WO-ATT-UI02 · fixed synthetic fixtures. Every project, title, locator and id
 * below is invented for this preview; nothing is read from a user workspace, a
 * provider or the Courtwork runtime. The shapes follow docs/work-core/attention.md
 * (detail = registry fields + descriptor/reason/next_action/seen/last_event_id,
 * source_refs, relation_refs, policy, basis, human_actions). `human_actions` is
 * not stored here: the mock core derives it from status exactly like
 * app/core/attention.py `human_actions(state)`. */

export const FIXED_NOW = Date.parse('2026-09-13T09:00:00.000Z');
const ago = minutes => new Date(FIXED_NOW - minutes * 60_000).toISOString();
const ahead = hours => new Date(FIXED_NOW + hours * 3_600_000).toISOString();

const next = (kind, label, trigger = 'manual', due_at = null) => ({ kind, label, trigger, due_at });
const core = (n, locator, role = 'supports') => ({ kind: 'core', matter_id: 'matter-synthetic-harbor', source_id: `src-${n}`,
  version: 1, locator, role, digest: `${String(n).padStart(2, '0')}`.repeat(32) });
const external = (n, locator, role = 'reports') => ({ kind: 'external', matter_id: null, source_id: `ext-${n}`,
  version: 1, locator, role, digest: null });

function item(id, fields) {
  return {
    schema_version: 1, attention_id: id, revision: fields.revision ?? 1, status: fields.status,
    freshness: fields.freshness ?? 'current', updated_at: fields.updated_at,
    descriptor: { title: fields.title, summary: fields.summary ?? null },
    reason: fields.reason, next_action: fields.next_action ?? next('inspect', 'Inspect'),
    seen: fields.seen ?? false, last_event_id: `attevt-${id}-r${fields.revision ?? 1}`,
    source_refs: fields.source_refs, relation_refs: fields.relation_refs ?? [],
    policy: { version: 1, grant: fields.grant ?? null },
  };
}

const harbor = [
  item('att-0101', { status: 'needs_you', updated_at: ago(12), revision: 4, seen: false,
    title: 'Confirm the rent-review clause before counsel replies',
    summary: 'Two synthetic drafts disagree on the review interval.',
    reason: 'Draft B moves the rent review from five years to three. The earlier summary assumed five, so the reply to counsel depends on which draft is current.',
    next_action: next('decide', 'Choose which draft the reply should follow'),
    source_refs: [core(1, 'drafts/lease-b.md#clause-7'), core(2, 'drafts/lease-a.md#clause-7', 'contradicts')],
    relation_refs: [{ kind: 'matter', id: 'matter-synthetic-harbor', relation: 'about' }] }),
  item('att-0102', { status: 'investigating', updated_at: ago(47), revision: 2, seen: true,
    title: 'Exhibit index is missing two schedules',
    summary: null,
    reason: 'The generated exhibit index lists Schedules 1–4, but the bundle references Schedules 5 and 6.',
    next_action: next('inspect', 'Compare the bundle against the index'),
    source_refs: [core(3, 'bundle/exhibit-index.md')] }),
  item('att-0103', { status: 'waiting', updated_at: ago(180), revision: 3, seen: true,
    title: 'Landlord’s surveyor report',
    summary: 'Requested through the synthetic external mailbox.',
    reason: 'The dilapidations position cannot be checked until the surveyor report arrives.',
    next_action: next('wait', 'Wait for the surveyor report', 'external'),
    source_refs: [external(1, 'https://example.invalid/synthetic/surveyor-request')],
    grant: { adapter_id: 'synthetic-adapter', purpose: 'attention-runtime', fields: ['registry', 'details'], expires_at: ahead(20) } }),
  item('att-0104', { status: 'later', updated_at: ago(60 * 26), revision: 2, seen: true,
    title: 'Service charge reconciliation',
    summary: null,
    reason: 'Not needed until the quarter closes.',
    next_action: next('follow_up', 'Reconcile the service charge schedule', 'at', ahead(72)),
    source_refs: [] }),
  item('att-0105', { status: 'resolved', updated_at: ago(60 * 50), revision: 5, seen: true,
    title: 'Break clause notice period',
    summary: 'Resolved after reading both drafts.',
    reason: 'Both drafts carry the same six-month notice period.',
    next_action: next('none', 'No next action'),
    source_refs: [core(4, 'drafts/lease-b.md#clause-12')] }),
  item('att-0106', { status: 'needs_you', updated_at: ago(3), revision: 1, seen: false, freshness: 'unknown',
    title: 'Guarantor details differ between drafts',
    summary: null,
    reason: 'A synthetic signal recorded a different guarantor company number in Draft B.',
    next_action: next('inspect', 'Inspect'),
    source_refs: undefined }),
  item('att-0107', { status: 'investigating', updated_at: ago(95), revision: 1, seen: false,
    title: 'Insurance rider wording',
    summary: null,
    reason: 'The rider quotes a policy form that is not in the bundle.',
    next_action: next('inspect', 'Find the quoted policy form', 'after'),
    source_refs: [] }),
];

const LONG_TITLE = 'Reconcile the synthetic landlord’s schedule of condition photographs against the tenant’s own photographic record before the dilapidations response is drafted for review';
const longText = [
  item('att-0201', { status: 'needs_you', updated_at: ago(8), revision: 7, seen: false,
    title: LONG_TITLE.slice(0, 200),
    summary: 'The schedule of condition runs to 184 synthetic photographs, and the tenant record was taken on a different date with a different numbering scheme, so a one-to-one reading is not possible without a mapping table that nobody has recorded yet.',
    reason: Array.from({ length: 9 }, (_, i) => `Paragraph ${i + 1} of the synthetic reason: the photographs in bay ${i + 3} were captured under different light, and the recorded mapping between the landlord’s numbering and the tenant’s numbering is incomplete for this bay.`).join(' '),
    next_action: next('decide', 'Decide whether the mapping table must be completed before the dilapidations response, or whether the response can proceed on the photographs that already match one-to-one and note the remainder as an open point', 'at', ahead(30)),
    source_refs: Array.from({ length: 6 }, (_, i) => core(10 + i, `photographs/schedule-of-condition/bay-${i + 3}/very/long/synthetic/path/that/keeps/going/for/wrapping/checks/index.md`)),
    relation_refs: [{ kind: 'matter', id: 'matter-synthetic-harbor', relation: 'about' }, { kind: 'session', id: 'session-synthetic-7f3a', relation: 'origin' }] }),
  item('att-0202', { status: 'waiting', updated_at: ago(400), revision: 2, seen: true,
    title: 'Short title',
    reason: 'A short reason next to a long neighbour.',
    next_action: next('wait', 'Wait', 'external'), source_refs: [] }),
];

const TITLES = ['Rent deposit deed', 'Alienation clause', 'Repair covenant', 'Yield-up schedule', 'Access for works',
  'Signage consent', 'Utilities apportionment', 'Parking licence', 'Service road easement', 'Fire strategy note'];
const STATES = ['investigating', 'needs_you', 'waiting', 'later', 'resolved'];
const paged = Array.from({ length: 47 }, (_, i) => item(`att-${String(300 + i).padStart(4, '0')}`, {
  status: STATES[(i * 3) % 5], updated_at: ago(15 + i * 37), revision: 1 + (i % 3), seen: i % 4 !== 0,
  title: `${TITLES[i % TITLES.length]} · synthetic ${i + 1}`,
  reason: `Synthetic paged reason ${i + 1}.`,
  next_action: STATES[(i * 3) % 5] === 'resolved' ? next('none', 'No next action') : next('inspect', 'Inspect'),
  source_refs: [],
}));

export const PROJECTS = [
  { id: 'p-harbor', name: 'Synthetic · Harbor lease review', items: harbor },
  { id: 'p-long', name: 'Synthetic · Long text', items: longText },
  { id: 'p-paged', name: 'Synthetic · 47 items', items: paged },
  { id: 'p-empty', name: 'Synthetic · Empty project', items: [] },
  { id: 'p-down', name: 'Synthetic · Registry unavailable', items: [], unavailable: true },
];

export const freshFixtures = () => structuredClone(PROJECTS);
