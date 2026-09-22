import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, readFile, access, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createLocalPiBinding, executeLocalPi, prepareLocalPiInvocation } from '../runtime/local-pi-process.mjs';
import { runLocalPiProcess } from '../runtime/local-pi-transport.mjs';
import { localPiLoopback } from './fixtures/local-pi-loopback.mjs';

const sourceText = 'Pinned input 中文, version one.';
const source = { text: sourceText, ref: { kind: 'material', sourceId: 'source-1', revision: 1, path: 'source.txt', sha256: createHash('sha256').update(sourceText).digest('hex'), bytes: Buffer.byteLength(sourceText) } };
const invoke = (provider, extra = {}) => executeLocalPi({ binding: createLocalPiBinding(provider), executionId: 'attempt-1', brief: 'Read only the supplied source.', sources: [source], ...extra });

test('actual upstream Pi print process yields attributable exact bytes with complete terminal and exit', async () => {
  const provider = await localPiLoopback(() => ({ text: 'Exact findings 中文 [0].' }));
  const observed = [];
  try {
    const result = await invoke(provider, { onSpawn: p => observed.push(['spawn', p.pid]), onNative: n => observed.push(['native', n.sessionId]) });
    assert.equal(result.status, 'completed', JSON.stringify(result));
    assert.equal(result.process.exitCode, 0); assert.equal(result.terminal.settled, true);
    assert.equal(result.result.text, 'Exact findings 中文 [0].');
    assert.equal(result.result.bytes, Buffer.byteLength(result.result.text));
    assert.equal(result.result.sha256, createHash('sha256').update(result.result.text).digest('hex'));
    assert.equal(result.executionId, 'attempt-1'); assert.equal(result.packet.sourceCount, 1);
    assert.deepEqual(observed.map(o => o[0]), ['spawn', 'native']);
    assert.equal(provider.requests.length, 1); assert.deepEqual(provider.requests[0].body.tools ?? [], []);
    const content = provider.requests[0].body.messages.at(-1).content;
    const input = JSON.parse(typeof content === 'string' ? content : content.filter(c => c.type === 'text').map(c => c.text).join(''));
    assert.equal(input.sources[0].text, sourceText);
  } finally { await provider.close(); }
});

test('actual upstream excludes ambient instructions, executable extensions, skills, templates and project settings', async () => {
  const provider = await localPiLoopback(); const root = await mkdtemp(path.join(tmpdir(), 'cw-local-pi-sentinels-'));
  try {
    const launch = await prepareLocalPiInvocation({ binding: createLocalPiBinding(provider), root });
    const marker = path.join(root, 'extension-loaded');
    const extension = path.join(root, 'ambient.mjs');
    await writeFile(extension, `import {writeFileSync} from 'node:fs'; writeFileSync(${JSON.stringify(marker)},'BAD'); export default function(pi){pi.on('before_agent_start',()=>({systemPrompt:'AMBIENT_EXTENSION'}));}`);
    for (const directory of [root, path.join(root, 'agent'), launch.cwd]) await writeFile(path.join(directory, 'AGENTS.md'), 'AMBIENT_INSTRUCTION');
    for (const directory of [path.join(root, 'agent'), path.join(launch.cwd, '.pi')]) {
      await mkdir(path.join(directory, 'extensions'), { recursive: true });
      await writeFile(path.join(directory, 'extensions', 'ambient.mjs'), await readFile(extension));
      await mkdir(path.join(directory, 'skills', 'ambient'), { recursive: true });
      await writeFile(path.join(directory, 'skills', 'ambient', 'SKILL.md'), '---\nname: ambient\ndescription: AMBIENT_SKILL\n---\nAMBIENT_SKILL');
      await mkdir(path.join(directory, 'prompts'), { recursive: true });
      await writeFile(path.join(directory, 'prompts', 'ambient.md'), 'AMBIENT_TEMPLATE');
      await writeFile(path.join(directory, 'SYSTEM.md'), 'AMBIENT_SYSTEM');
      await writeFile(path.join(directory, 'APPEND_SYSTEM.md'), 'AMBIENT_APPEND');
      await writeFile(path.join(directory, 'settings.json'), JSON.stringify({ extensions: [extension], defaultTools: ['bash'], retry: { enabled: false }, compaction: { enabled: false }, ...(directory.endsWith('.pi') ? { defaultProvider: 'AMBIENT_PROVIDER', defaultModel: 'AMBIENT_MODEL' } : {}) }));
    }
    const events = [];
    const result = await runLocalPiProcess({ ...launch, input: 'Return a bounded synthetic reply.', onEvent: e => events.push(e), limits: { timeoutMs: 15000 } });
    assert.equal(result.exitCode, 0, JSON.stringify(result)); assert.equal(result.fault, null);
    assert.equal(provider.requests.length, 1);
    assert.doesNotMatch(JSON.stringify(provider.requests[0].body), /AMBIENT_/);
    assert.deepEqual(provider.requests[0].body.tools ?? [], []);
    await assert.rejects(access(marker));
    assert.equal(events.at(-1).type, 'agent_settled');
    await assert.rejects(access(path.join(root, 'sessions')));
  } finally { await provider.close(); await rm(root, { recursive: true, force: true }); }
});

test('actual upstream no-tools rejects a model-issued bash call at native tool registry', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'cw-local-pi-deny-')); const marker = path.join(root, 'forbidden');
  const provider = await localPiLoopback((_request, count) => count === 1 ? { tool: { name: 'bash', args: { command: `touch '${marker}'` } } } : { text: 'Denied tool, no findings claimed.' });
  try {
    const launch = await prepareLocalPiInvocation({ binding: createLocalPiBinding(provider), root }); const events = [];
    const result = await runLocalPiProcess({ ...launch, input: 'Synthetic malicious tool response test.', onEvent: e => events.push(e), limits: { timeoutMs: 15000 } });
    assert.equal(result.exitCode, 0, JSON.stringify(result)); await assert.rejects(access(marker));
    assert.equal(provider.requests.length, 2);
    assert.deepEqual(provider.requests[0].body.tools ?? [], []);
    const denied = events.find(e => e.type === 'tool_execution_end');
    assert.equal(denied?.isError, true, JSON.stringify(events));
    assert.match(JSON.stringify(denied), /not found|not available|unknown tool/i);
  } finally { await provider.close(); await rm(root, { recursive: true, force: true }); }
});

test('actual upstream provider failure does not become success on JSON print exit zero', async () => {
  const provider = await localPiLoopback(() => ({ status: 400 }));
  try { const result = await invoke(provider); assert.notEqual(result.status, 'completed'); assert.equal(result.result, null); }
  finally { await provider.close(); }
});

test('actual upstream model tool request is an explicit no-tool adapter refusal after owned process closes', async () => {
  const provider = await localPiLoopback(() => ({ tool: { name: 'bash', args: { command: 'echo synthetic-denied' } } }));
  try {
    const result = await invoke(provider);
    assert.equal(result.status, 'refused', JSON.stringify(result));
    assert.equal(result.reason, 'local_pi_tool_request'); assert.equal(result.result, null);
    assert.throws(() => process.kill(result.process.pid, 0), { code: 'ESRCH' });
  } finally { await provider.close(); }
});

test('actual upstream pending request cancellation waits for process close and rejects late provider reply', async () => {
  let ready; const requested = new Promise(resolve => { ready = resolve; }); let release;
  const held = new Promise(resolve => { release = resolve; });
  const provider = await localPiLoopback(async () => { ready(); await held; return { text: 'Late reply must not publish.' }; });
  const controller = new AbortController();
  try {
    const work = invoke(provider, { signal: controller.signal }); await requested; controller.abort();
    const result = await work; release();
    assert.equal(result.status, 'cancelled', JSON.stringify(result)); assert.equal(result.result, null);
    assert.throws(() => process.kill(result.process.pid, 0), { code: 'ESRCH' });
  } finally { release(); await provider.close(); }
});

test('actual upstream crash without terminal stays unknown; oversized result is never truncated into success', async () => {
  let childPid; let ready; const requested = new Promise(resolve => { ready = resolve; });
  const provider = await localPiLoopback(() => { ready(); return null; });
  try {
    const work = invoke(provider, { onSpawn: ({ pid }) => { childPid = pid; } }); await requested; process.kill(childPid, 'SIGKILL');
    const result = await work; assert.equal(result.status, 'unknown', JSON.stringify(result)); assert.equal(result.result, null);
  } finally { await provider.close(); }
  const large = await localPiLoopback(() => ({ text: 'x'.repeat(32769) }));
  try { const result = await invoke(large); assert.notEqual(result.status, 'completed'); assert.equal(result.result, null); }
  finally { await large.close(); }
});

test('actual ready upstream frozen after provider dispatch requires bounded SIGKILL escalation', async () => {
  let childPid; let ready; const requested = new Promise(resolve => { ready = resolve; });
  const provider = await localPiLoopback(() => { ready(); return null; });
  const controller = new AbortController();
  try {
    const work = invoke(provider, { signal: controller.signal, onSpawn: ({ pid }) => { childPid = pid; } });
    await requested; // Print-mode handler and model loop are demonstrably ready.
    process.kill(childPid, 'SIGSTOP'); controller.abort();
    const result = await work;
    assert.equal(result.status, 'cancelled', JSON.stringify(result));
    assert.equal(result.process.escalated, true); assert.equal(result.process.signal, 'SIGKILL');
    assert.throws(() => process.kill(childPid, 0), { code: 'ESRCH' });
  } finally { await provider.close(); }
});
