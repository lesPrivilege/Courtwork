// One publication batch; pending slots never fall back to an older UI capture.
export const captureBatch = { status: 'pending', source_sha: null };
export const captureSlots = {
  home: { mediaId: null, legacyId: 'M1' },
  spark: { mediaId: null },
  running: { mediaId: null },
  attention: { mediaId: null },
  approval: { mediaId: null, legacyId: 'M2' },
  artifact: { mediaId: null, legacyId: 'M4' },
  matter: { mediaId: null },
  review: { mediaId: null, legacyId: 'M6' },
  continuity: { mediaId: null, legacyId: 'M5' },
  models: { mediaId: null, legacyId: 'M7' },
  integrations: { mediaId: null, legacyId: 'M9' },
  settings: { mediaId: null, legacyId: 'M10' },
  conversation: { mediaId: null, legacyId: 'M11' },
};
export function captureSlot(id) {
  const key = Object.keys(captureSlots).find(key => key === id || captureSlots[key].legacyId === id);
  if (!key) throw new Error(`Unknown capture slot: ${id}`);
  return { key, ...captureSlots[key] };
}
export function validateCaptureBatch(media, { publish = false } = {}) {
  if (captureBatch.status === 'pending') {
    if (publish) throw new Error('Screenshot batch is pending: capture and review the merged UI before publishing.');
    return;
  }
  if (captureBatch.status !== 'ready' || !/^[a-f0-9]{40}$/.test(captureBatch.source_sha ?? '') || media.source_sha !== captureBatch.source_sha) throw new Error('Screenshot batch must pin the matching merged product SHA.');
  for (const [key, slot] of Object.entries(captureSlots)) {
    if (!slot.mediaId || !media.media.some(entry => entry.id === slot.mediaId && entry.theme === 'light' && entry.viewport === '1440x900')) throw new Error(`Screenshot batch is incomplete: ${key}`);
  }
}
const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderCapture(media, id, { alt, caption = alt, eager = false, className = 'shot' }) {
  validateCaptureBatch(media);
  const slot = captureSlot(id);
  if (captureBatch.status === 'pending') return `<figure class="${className} capture-pending" data-capture-slot="${slot.key}" data-capture-status="pending"><div class="capture-space" role="img" aria-label="${escape(alt)}；截图留空"></div></figure>`;
  const entry = media.media.find(x => x.id === slot.mediaId && x.theme === 'light' && x.viewport === '1440x900');
  const dark = media.media.find(x => x.id === slot.mediaId && x.theme === 'dark' && x.viewport === entry.viewport);
  const asset = x => './media/' + escape(x.asset_path.replace('site/media/', ''));
  return `<figure class="${className}" data-capture-slot="${slot.key}" data-capture-status="captured"><picture>${dark ? `<source media="(prefers-color-scheme: dark)" srcset="${asset(dark)}">` : ''}<img src="${asset(entry)}" alt="${escape(alt)}" width="1440" height="900" loading="${eager ? 'eager' : 'lazy'}" decoding="async"></picture><figcaption>${caption} · <a href="./media/main/manifest.json">Synthetic demo</a></figcaption></figure>`;
}
