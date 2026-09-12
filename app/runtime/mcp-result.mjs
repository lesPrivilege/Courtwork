import { createHash } from 'node:crypto';
import { StringDecoder } from 'node:string_decoder';

export const MCP_RESULT_MAX_BYTES = 1024 * 1024;
export const MCP_PROJECTION_MAX_BYTES = 32 * 1024;

/** Capture semantic result fields, not transport metadata or request secrets.
 * Limits are post-SDK-decode bounds, not a streaming transport memory limit. */
export function prepareMcpResult(result) {
  const semantic = {
    content: (result.content ?? []).map(({ _meta, ...block }) => block),
    ...(Object.hasOwn(result, 'structuredContent') ? { structuredContent: result.structuredContent } : {}),
    isError: result.isError === true,
  };
  const bytes = Buffer.from(JSON.stringify(semantic), 'utf8');
  if (bytes.length > MCP_RESULT_MAX_BYTES) throw new Error('MCP semantic result exceeds the supported byte limit');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const candidates = semantic.content.map(block => block.type === 'text'
    ? { type: 'text', text: block.text }
    : block.type === 'image' ? { type: 'image', data: block.data, mimeType: block.mimeType }
      : { type: 'text', text: `MCP ${block.type} content (JSON):\n${JSON.stringify(block)}` });
  if (Object.hasOwn(semantic, 'structuredContent')) candidates.push({ type: 'text', text: `MCP structuredContent (JSON):\n${JSON.stringify(semantic.structuredContent)}` });
  let remaining = MCP_PROJECTION_MAX_BYTES;
  let partial = false;
  const content = [];
  for (const block of candidates) {
    const size = Buffer.byteLength(JSON.stringify(block), 'utf8');
    if (size <= remaining) { content.push(block); remaining -= size; continue; }
    partial = true;
    // Never truncate an image's base64. Text truncation stays on UTF-8
    // boundaries; JSON may be a displayed excerpt, explicitly marked below.
    if (block.type === 'text' && remaining > 64) {
      let text = new StringDecoder('utf8').write(Buffer.from(block.text).subarray(0, remaining - 64));
      while (Buffer.byteLength(JSON.stringify({ type: 'text', text }), 'utf8') > remaining) text = new StringDecoder('utf8').write(Buffer.from(text).subarray(0, Math.floor(Buffer.byteLength(text) / 2)));
      content.push({ type: 'text', text }); remaining = 0;
    }
  }
  if (partial) content.push({ type: 'text', text: `MCP result projection is partial; full semantic result SHA-256 ${sha256}.` });
  return { bytes, sha256, content, partial, isError: semantic.isError };
}
