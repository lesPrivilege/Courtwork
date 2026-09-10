import test from 'node:test';
import assert from 'node:assert/strict';
import { captureBatch, captureSlots, renderCapture, validateCaptureBatch } from '../src/capture-plan.mjs';

test('pending frames never disclose old UI or permit publication', () => {
  const saved = captureBatch.status;
  captureBatch.status = 'pending';
  try {
  const old = { source_sha: 'a'.repeat(40), media: [{ id: 'M1', theme: 'light', viewport: '1440x900', asset_path: 'site/media/old.png' }] };
  const html = renderCapture(old, 'M1', { alt: 'Home' });
  assert.match(html, /data-capture-slot="home"/);
  assert.match(html, /data-capture-status="pending"/);
  assert.doesNotMatch(html, /<img|old.png/);
  assert.throws(() => validateCaptureBatch(old, { publish: true }), /pending/);
  } finally { captureBatch.status = saved; }
});
test('ready is one complete batch pinned to one source', () => {
  const before = structuredClone(captureBatch);
  const slotsBefore = structuredClone(captureSlots);
  try {
    for (const slot of Object.values(captureSlots)) slot.mediaId = null;
    captureBatch.status = 'ready'; captureBatch.source_sha = 'b'.repeat(40);
    assert.throws(() => validateCaptureBatch({ source_sha: 'a'.repeat(40), media: [] }), /matching/);
    assert.throws(() => validateCaptureBatch({ source_sha: 'b'.repeat(40), media: [] }), /incomplete/);
    const media = { source_sha: captureBatch.source_sha, media: [] };
    for (const [key, slot] of Object.entries(captureSlots)) {
      slot.mediaId = key;
      media.media.push({ id: key, theme: 'light', viewport: '1440x900', asset_path: `site/media/main/${key}.jpg` });
    }
    assert.doesNotThrow(() => validateCaptureBatch(media, { publish: true }));
    assert.match(renderCapture(media, 'M1', { alt: 'Home' }), /main\/home.jpg/);
    media.media.pop();
    assert.throws(() => validateCaptureBatch(media, { publish: true }), /incomplete/);
  } finally {
    Object.assign(captureBatch, before);
    for (const key of Object.keys(captureSlots)) Object.assign(captureSlots[key], slotsBefore[key]);
  }
});
