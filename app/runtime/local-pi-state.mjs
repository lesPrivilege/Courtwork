// Strict schema20 Run-event receipts. No process/native payload is a Store
// command; only the Host constructs these records after checking its owners.
import { LOCAL_PI_ADAPTER } from './local-pi-process.mjs';

const TYPES = new Set(['local_pi.dispatch', 'local_pi.spawn', 'local_pi.native', 'local_pi.result', 'local_pi.terminal']);
const assert = (condition, message) => { if (!condition) throw Object.assign(new Error('invalid runtime state: local Pi ' + message), { code: 'LOCAL_PI_INVALID' }); };
const plain = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const keys = (v, fields) => assert(plain(v) && Object.keys(v).sort().join(',') === fields.sort().join(','), 'fields');
const text = (v, max = 200) => assert(typeof v === 'string' && v.length > 0 && v.length <= max, 'text');
const integer = (v, min, max) => assert(Number.isSafeInteger(v) && v >= min && v <= max, 'integer');
const hash = v => assert(typeof v === 'string' && /^[a-f0-9]{64}$/.test(v), 'digest');
const canonical = v => Array.isArray(v) ? v.map(canonical) : plain(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v;
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const eventsFor = (state, runId) => state.events.filter(e => e.runId === runId && e.type.startsWith('local_pi'));

export function localPiReceipt(state, runId) {
  return Object.fromEntries(eventsFor(state, runId).map(e => [e.type.slice(9), e.data]));
}

export function localPiRunUnresolved(state, runId) {
  const run = state.runs.find(r => r.id === runId);
  if (run?.adapterId !== LOCAL_PI_ADAPTER.id) return false;
  const receipt = localPiReceipt(state, runId);
  return run.status === 'unknown' || !receipt.terminal || receipt.terminal.status === 'unknown';
}

function identity(state, event) {
  const run = state.runs.find(r => r.id === event.runId);
  const a = state.subagents.assignments.find(a => a.id === event.data.assignmentId);
  const attempt = a?.attempts[event.data.attempt - 1];
  assert(run?.adapterId === LOCAL_PI_ADAPTER.id && run.sessionId === event.sessionId, 'Run adapter/session');
  assert(attempt?.runId === run.id && attempt.sessionId === run.sessionId && event.data.dispatchId === run.id, 'attempt/dispatch association');
  integer(event.data.attempt, 1, 8);
  return { run, a, attempt };
}

export function validateLocalPiEvents(state, schema = state.schemaVersion) {
  const localEvents = state.events.filter(e => e.type.startsWith('local_pi'));
  if (schema < 20) {
    assert(!localEvents.length && !state.runs.some(r => r.adapterId === LOCAL_PI_ADAPTER.id), 'schema20 required');
    return;
  }
  const seen = new Map();
  for (const event of localEvents) {
    assert(TYPES.has(event.type), 'event type');
    assert(plain(event.data), 'event data');
    const { run, a } = identity(state, event), d = event.data;
    const receipt = seen.get(run.id) ?? {};
    seen.set(run.id, receipt);
    const kind = event.type.slice(9);
    assert(!receipt[kind] && !receipt.terminal, 'duplicate or late receipt');
    const common = ['assignmentId', 'attempt', 'dispatchId'];
    switch (kind) {
      case 'dispatch': {
        keys(d, [...common, 'binding', 'packet']);
        keys(d.binding, ['adapter', 'executable', 'provider', 'model', 'baseUrl', 'configVersion']);
        assert(same(d.binding.adapter, LOCAL_PI_ADAPTER), 'adapter pin');
        text(d.binding.executable, 4000);
        assert(d.binding.provider === 'fake-openai-loopback' && d.binding.model === 'fake-model', 'synthetic provider binding');
        assert(run.provider.provider === d.binding.provider && run.provider.model === d.binding.model && run.provider.baseUrl === d.binding.baseUrl && run.provider.realProvider === false, 'Run provider binding');
        let url; try { url = new URL(d.binding.baseUrl); } catch { assert(false, 'URL'); }
        assert(url.protocol === 'http:' && url.hostname === '127.0.0.1' && url.port && !url.username && !url.password && !url.search && !url.hash && url.pathname === '/v1', 'loopback binding');
        integer(d.binding.configVersion, 0, Number.MAX_SAFE_INTEGER);
        assert(d.binding.configVersion === a.providerSelection.configVersion, 'provider revision');
        keys(d.packet, ['sha256', 'bytes', 'sourceCount', 'sources', 'sourceRevisions']);
        hash(d.packet.sha256); integer(d.packet.bytes, 1, 2 * 1024 * 1024);
        integer(d.packet.sourceCount, 0, 16);
        assert(same(d.packet.sources, a.sources) && d.packet.sourceCount === a.sources.length, 'packet sources');
        assert(Array.isArray(d.packet.sourceRevisions) && d.packet.sourceRevisions.length === a.sources.length, 'source revisions');
        for (let i = 0; i < a.sources.length; i++) {
          if (a.sources[i].kind === 'material') integer(d.packet.sourceRevisions[i], a.sources[i].revision, Number.MAX_SAFE_INTEGER);
          else assert(d.packet.sourceRevisions[i] === null, 'artifact source revision');
        }
        break;
      }
      case 'spawn': keys(d, [...common, 'pid']); assert(receipt.dispatch, 'spawn before dispatch'); integer(d.pid, 1, 2 ** 31 - 1); break;
      case 'native': keys(d, [...common, 'sessionId']); assert(receipt.spawn, 'native before spawn'); text(d.sessionId, 160); assert(/^[a-zA-Z0-9-]+$/.test(d.sessionId), 'native identity'); break;
      case 'result':
        keys(d, [...common, 'sha256', 'bytes', 'packetSha256', 'nativeSessionId']);
        assert(receipt.native && d.nativeSessionId === receipt.native.sessionId && d.packetSha256 === receipt.dispatch.packet.sha256, 'result identity');
        hash(d.sha256); integer(d.bytes, 1, 32768); break;
      case 'terminal': {
        keys(d, [...common, 'status', 'reason', 'process', 'nativeSessionId', 'settled', 'turns']);
        assert(['completed', 'failed', 'refused', 'cancelled', 'unknown'].includes(d.status), 'terminal status');
        assert(d.reason === null || (typeof d.reason === 'string' && /^[a-zA-Z0-9_:-]{1,100}$/.test(d.reason)), 'terminal reason');
        assert(typeof d.settled === 'boolean', 'settled'); integer(d.turns, 0, 8);
        assert(d.nativeSessionId === (receipt.native?.sessionId ?? null), 'terminal native identity');
        if (d.process === null) {
          assert(['refused', 'cancelled', 'unknown'].includes(d.status) && !receipt.spawn && !receipt.result && !d.settled, 'missing process evidence');
          if (!receipt.dispatch) assert(d.status !== 'unknown', 'unknown before intent');
        } else {
          keys(d.process, ['pid', 'spawned', 'inputComplete', 'exitCode', 'signal', 'cancelled', 'timedOut', 'escalated', 'fault']);
          const p = d.process;
          assert(receipt.dispatch, 'terminal before intent');
          for (const field of ['spawned', 'inputComplete', 'cancelled', 'timedOut', 'escalated']) assert(typeof p[field] === 'boolean', field);
          assert(p.pid === (receipt.spawn?.pid ?? null), 'terminal pid');
          assert(p.spawned === Boolean(receipt.spawn), 'spawn evidence');
          assert(p.exitCode === null || Number.isInteger(p.exitCode), 'exit code');
          assert(p.signal === null || ['SIGTERM', 'SIGKILL', 'SIGINT', 'SIGHUP', 'SIGABRT', 'SIGSEGV', 'SIGPIPE', 'SIGBUS', 'SIGQUIT'].includes(p.signal), 'exit signal');
          assert(p.fault === null || (typeof p.fault === 'string' && /^[a-z_]{1,100}$/.test(p.fault)), 'fault');
          if (p.spawned) assert(p.exitCode !== null || p.signal !== null, 'process must close');
          if (d.status === 'completed') assert(receipt.result && d.settled && p.inputComplete && p.exitCode === 0 && p.signal === null && p.fault === null && d.reason === null, 'completed evidence');
          if (d.status === 'cancelled') assert((p.cancelled || p.timedOut) && !p.fault && !receipt.result, 'cancellation evidence');
          if (d.status === 'refused') assert(!p.spawned || (d.reason === 'local_pi_tool_request' && p.fault === 'callback_failed' && !receipt.result), 'refused after spawn');
        }
        if (d.status === 'completed') assert(receipt.result && receipt.native, 'completion missing retained result');
        else assert(!receipt.result || d.status === 'unknown', 'result with noncompletion');
        break;
      }
    }
    receipt[kind] = d;
  }
  for (const a of state.subagents.assignments) for (const r of a.results) {
    const run = state.runs.find(run => run.id === r.runId);
    if (run?.adapterId !== LOCAL_PI_ADAPTER.id) continue;
    const receipt = seen.get(run.id);
    assert(receipt?.terminal?.status === 'completed' && receipt.result?.sha256 === r.sha256 && receipt.result?.bytes === r.bytes, 'published result receipt');
  }
  for (const run of state.runs.filter(r => r.adapterId === LOCAL_PI_ADAPTER.id)) {
    const owners = state.subagents.assignments.filter(a => a.attempts.some(t => t.runId === run.id && t.sessionId === run.sessionId));
    assert(owners.length === 1, 'local Run must belong to one child attempt');
    assert(run.hostSession === null && run.remoteBinding === null, 'local native ownership');
    assert(!owners[0].sourceReads.some(r => r.actor === 'runtime' && r.runId === run.id), 'packet inclusion is not a source read');
    if (run.status === 'completed') assert(seen.get(run.id)?.terminal?.status === 'completed', 'completed Run without process completion');
  }
}

/** Called only within RuntimeStore._mutate. Duplicate identical observations
 * return their receipt; a caller must never infer permission to relaunch. */
export function appendLocalPiEvent(state, { runId, type, data }, append) {
  assert(TYPES.has(type), 'unsupported writer type');
  const run = state.runs.find(r => r.id === runId);
  assert(run, 'missing Run');
  const previous = state.events.find(e => e.runId === runId && e.type === type);
  if (previous) { assert(same(previous.data, data), 'conflicting replay'); return { recorded: false, event: structuredClone(previous) }; }
  const event = { runId, sessionId: run.sessionId, type, data: structuredClone(data) };
  const { a, attempt } = identity(state, event);
  assert(a.status === 'active' && a.attempts.at(-1) === attempt && ['running', 'waiting_user', 'stopping'].includes(run.status), 'closed writer');
  if (['local_pi.dispatch', 'local_pi.result'].includes(type)) assert(run.admissionOpen && !a.cancelRequested, 'admission closed');
  if (type === 'local_pi.dispatch') assert(!state.runs.some(r => r.id !== runId && localPiRunUnresolved(state, r.id)), 'another unresolved process');
  append(state, event);
  validateLocalPiEvents(state);
  return { recorded: true, event: structuredClone(state.events.at(-1)) };
}
