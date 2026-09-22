import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createLocalPiBinding, createLocalPiTranscript, localPiPacket, verifyLocalPiExecutable } from '../runtime/local-pi-process.mjs';

const message = { role: 'assistant', content: [{ type: 'text', text: 'finding 中文' }], stopReason: 'stop' };
const events = () => [
  { type: 'session', id: 'native-session', version: 3 }, { type: 'agent_start' }, { type: 'turn_start' },
  { type: 'message_end', message }, { type: 'turn_end', message, toolResults: [] },
  { type: 'agent_end', messages: [message], willRetry: false }, { type: 'agent_settled' },
];
test('local Pi input packet verifies exact UTF-8 source bytes and binds CW identity', () => {
  const text = 'source 中文';
  const ref = { path: 'source.txt', sha256: createHash('sha256').update(text).digest('hex'), bytes: Buffer.byteLength(text) };
  const packet = localPiPacket({ executionId: 'attempt:1', brief: 'Analyze source.', sources: [{ ref, text }] });
  assert.equal(packet.bytes, Buffer.byteLength(packet.input));
  assert.equal(JSON.parse(packet.input).executionId, 'attempt:1');
  assert.equal(packet.sourceCount, 1);
  assert.throws(() => localPiPacket({ executionId: 'attempt:1', brief: 'Analyze.', sources: [{ ref, text: text + '!' }] }), /source_integrity/);
  assert.throws(() => localPiPacket({ executionId: 'bad\nidentity', brief: 'Analyze.' }), /identity/);
});
test('local Pi completion requires matching terminal and settled, not prose or agent_end', () => {
  const reader = createLocalPiTranscript();
  for (const event of events().slice(0, -1)) reader.observe(event);
  assert.equal(reader.result().complete, false);
  reader.observe(events().at(-1));
  assert.equal(reader.result().complete, true);
  assert.equal(reader.result().text, 'finding 中文');
  assert.throws(() => reader.observe(events().at(-1)), /late_or_invalid/);
});
test('local Pi refuses missing/conflicting identity, terminal mismatch and retries', () => {
  assert.throws(() => createLocalPiTranscript().observe({ type: 'agent_start' }), /missing_identity/);
  for (const changed of [
    { type: 'agent_end', messages: [{ ...message, content: [{ type: 'text', text: 'different' }] }], willRetry: false },
    { type: 'agent_end', messages: [message], willRetry: true },
  ]) {
    const reader = createLocalPiTranscript();
    for (const event of events().slice(0, 5)) reader.observe(event);
    assert.throws(() => reader.observe(changed), /terminal/);
  }
  const reader = createLocalPiTranscript(); reader.observe(events()[0]);
  assert.throws(() => reader.observe({ ...events()[0], id: 'other' }), /native_identity/);
});
test('local Pi rejects tool requests and oversized results without accepting partial text', () => {
  for (const content of [[{ type: 'toolCall', name: 'bash', arguments: { command: 'no' } }], [{ type: 'text', text: '123456789' }]]) {
    const reader = createLocalPiTranscript({ maxOutputBytes: 8 });
    for (const event of events().slice(0, 3)) reader.observe(event);
    assert.throws(() => reader.observe({ type: 'message_end', message: { ...message, content } }), /tool_request|result_limit/);
    assert.equal(reader.result().complete, false);
  }
});
test('local Pi native error remains failure even when print process can exit zero', () => {
  const reader = createLocalPiTranscript();
  const failed = { ...message, stopReason: 'error' };
  for (const e of events()) reader.observe(e.type === 'agent_end' ? { ...e, messages: [failed] } : e.message ? { ...e, message: failed } : e);
  assert.equal(reader.result().complete, false);
  assert.equal(reader.result().nativeFailure, 'error');
});
test('local Pi binding admits explicit loopback only; locked executable includes bundle chunks', async () => {
  assert.equal(createLocalPiBinding({ baseUrl: 'http://127.0.0.1:12345/v1' }).model, 'fake-model');
  for (const baseUrl of ['https://example.com/v1', 'http://localhost:12345/v1', 'http://user@127.0.0.1:12345/v1', 'http://127.0.0.1:12345/v1?key=x']) assert.throws(() => createLocalPiBinding({ baseUrl }));
  assert.equal((await verifyLocalPiExecutable()).version, '0.85.1');
});
