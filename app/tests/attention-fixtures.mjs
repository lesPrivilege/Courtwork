/* Packet builders shared by the Attention view tests. They mirror what the Core
 * returns — no field is added that `attention.md` does not define — so a test
 * that passes here is a test against the recorded contract shape. */
export const NOW = '2026-09-10T12:00:00.000Z';

export function attentionItem(id, { title = id, status = 'needs_you', revision = 1, updated_at = NOW, freshness = 'current' } = {}) {
  return { schema_version: 1, attention_id: id, revision, descriptor: { title }, status, freshness, updated_at };
}

export function attentionPage(items, { count = items.length, offset = 0, next_offset = null, truncated = false } = {}) {
  return { schema_version: 1, items, count, offset, next_offset, truncated, disclosure: { count_scope: 'visible' } };
}

export function attentionDetail(id, options = {}) {
  const { reason = `${id} reason`, summary = null, next_action, human_actions, policy, ...rest } = options;
  return {
    ...attentionItem(id, rest),
    descriptor: { title: rest.title ?? id, summary },
    reason,
    seen: false,
    next_action: next_action ?? { kind: 'inspect', label: 'Read the recorded context', trigger: 'manual', due_at: null },
    ...(human_actions ? { human_actions } : {}),
    ...(policy ? { policy } : {}),
  };
}
