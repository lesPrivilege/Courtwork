// Read only the recorded candidate's frozen source. This is an offline lookup,
// not a fallback to the Matter's current or latest source.
export async function readRecordedSource(projection, request) {
  const candidate = projection?.candidates?.find(item => item.id === request?.candidateId);
  if (!candidate) return null;
  const anchors = (candidate.evidence ?? []).filter(item =>
    item.source_id === request.sourceId && item.source_version === request.version);
  if (!anchors.length) return null;
  const source = projection.sources?.find(item => item.id === request.sourceId && item.version === request.version);
  if (!source || typeof source.text !== "string") return null;
  const bytes = new TextEncoder().encode(source.text);
  const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map(byte => byte.toString(16).padStart(2, "0")).join("");
  if (hash !== source.digest || anchors.some(anchor => anchor.digest !== hash)) return null;
  for (const anchor of anchors) {
    if (!Number.isInteger(anchor.start) || !Number.isInteger(anchor.end) || anchor.start < 0 || anchor.end > bytes.length || anchor.end < anchor.start) return null;
    if (new TextDecoder().decode(bytes.slice(anchor.start, anchor.end)) !== anchor.quote) return null;
  }
  return { text: source.text, version: source.version, digest: hash };
}
