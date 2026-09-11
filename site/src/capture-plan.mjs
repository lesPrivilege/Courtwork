// One publication batch; pending slots never fall back to an older UI capture.
export const captureBatch = { status: 'ready', source_sha: 'f1373cde341b5a17299fad6ba5921ba3fcc43824' };
export const captureSlots = {
  home: { mediaId: 'home', legacyId: 'M1' },
  spark: { mediaId: 'spark' },
  running: { mediaId: 'running' },
  attention: { mediaId: 'attention' },
  approval: { mediaId: 'approval', legacyId: 'M2' },
  artifact: { mediaId: 'artifact', legacyId: 'M4' },
  matter: { mediaId: 'matter' },
  review: { mediaId: 'review', legacyId: 'M6' },
  continuity: { mediaId: 'continuity', legacyId: 'M5' },
  models: { mediaId: 'models', legacyId: 'M7' },
  integrations: { mediaId: 'integrations', legacyId: 'M9' },
  settings: { mediaId: 'settings', legacyId: 'M10' },
  conversation: { mediaId: 'conversation', legacyId: 'M11' },
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
    if (!slot.mediaId) throw new Error(`Screenshot batch is incomplete: ${key}`);
    const pair = ['light', 'dark'].map(theme => media.media.filter(entry => entry.id === slot.mediaId && entry.theme === theme && entry.viewport === '1440x900'));
    if (pair.some(entries => entries.length !== 1)) throw new Error(`Screenshot batch is incomplete or ambiguous: ${key} requires one light/dark pair`);
    const [light, dark] = pair.map(entries => entries[0]);
    if ([light, dark].some(entry => entry.source_sha !== captureBatch.source_sha) || !light.state_id || light.state_id !== dark.state_id) throw new Error(`Screenshot pair must share the merged source and state: ${key}`);
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
  return `<figure class="${className}" data-capture-slot="${slot.key}" data-capture-status="captured"><picture>${dark ? `<source media="(prefers-color-scheme: dark)" srcset="${asset(dark)}">` : ''}<img src="${asset(entry)}" alt="${escape(alt)}" width="1440" height="900" loading="${eager ? 'eager' : 'lazy'}" decoding="async"></picture><figcaption>${caption}</figcaption></figure>`;
}
