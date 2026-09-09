// Ephemeral directory probes deliberately have no runtime/store/credential dependencies.
export const PREVIEW_LIMITS = Object.freeze({ timeoutMs: 5000, responseBytes: 262144, models: 1000, modelId: 240 });
export class PreviewInputError extends Error {}
const reasons = Object.freeze({
  ok: 'Model directory handshake succeeded; generation was not tested.',
  authentication_failed: 'The model directory rejected authentication.',
  unsupported: 'The target does not support this model directory endpoint.',
  http_error: 'The model directory returned an unsuccessful HTTP status.',
  redirect_rejected: 'The model directory redirected; redirects are not followed.',
  malformed_directory: 'The target did not return a supported model directory.',
  response_too_large: 'The model directory exceeded the response limit.',
  timeout: 'The model directory request timed out.',
  unreachable: 'The model directory could not be reached.',
});
function validate(input) {
  const invalid = () => { throw new PreviewInputError('Invalid provider preview request.'); };
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !['protocol', 'baseUrl', 'apiKey'].includes(k))) invalid();
  if (input.protocol !== 'openai-compatible') invalid();
  if (typeof input.baseUrl !== 'string' || input.baseUrl.length > 2048 || !/^https?:\/\//.test(input.baseUrl) || /[\s\\?#]/.test(input.baseUrl)) invalid();
  let url;
  try { url = new URL(input.baseUrl); } catch { invalid(); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || input.baseUrl.split('/')[2].includes('@')) invalid();
  if (input.apiKey !== undefined && (typeof input.apiKey !== 'string' || input.apiKey.length > 4096 || !/^[\x21-\x7e]+$/.test(input.apiKey))) invalid();
  url.pathname = url.pathname.replace(/\/+$/, '') + '/models';
  return { url, apiKey: input.apiKey };
}
export async function previewProvider(input, operation) {
  const { url, apiKey } = validate(input);
  const result = (status, models = []) => ({ operation, protocol: 'openai-compatible', check: 'model-directory', status, message: reasons[status], models });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PREVIEW_LIMITS.timeoutMs);
  let response;
  try {
    response = await fetch(url, { method: 'GET', redirect: 'manual', signal: controller.signal,
      headers: { accept: 'application/json', ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}) } });
    if (response.status >= 300 && response.status < 400) return result('redirect_rejected');
    if ([401, 403].includes(response.status)) return result('authentication_failed');
    if ([404, 405, 501].includes(response.status)) return result('unsupported');
    if (!response.ok) return result('http_error');
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body ?? []) {
      size += chunk.length;
      if (size > PREVIEW_LIMITS.responseBytes) return result('response_too_large');
      chunks.push(chunk);
    }
    let directory;
    try { directory = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))); }
    catch { return result('malformed_directory'); }
    if (!directory || !Array.isArray(directory.data) || directory.data.length > PREVIEW_LIMITS.models) return result('malformed_directory');
    const models = [];
    const ids = new Set();
    for (const model of directory.data) {
      // Only IDs are understood by this protocol. Reject echoed request secrets.
      if (!model || typeof model.id !== 'string' || !model.id.trim() || model.id.length > PREVIEW_LIMITS.modelId || /[\x00-\x1f\x7f]/.test(model.id) || (apiKey && model.id.includes(apiKey)) || ids.has(model.id)) return result('malformed_directory');
      ids.add(model.id);
      models.push({ id: model.id });
    }
    return result('ok', operation === 'discover' ? models : []);
  } catch {
    return result(controller.signal.aborted ? 'timeout' : 'unreachable');
  } finally {
    clearTimeout(timer);
    await response?.body?.cancel().catch(() => {});
  }
}
