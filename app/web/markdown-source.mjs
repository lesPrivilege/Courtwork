let parserModule; // Loaded only when a complete Markdown revision is opened.

export const MARKDOWN_PROFILE = 'cw-markdown-block-v1';
export const MAX_MARKDOWN_BYTES = 65_536;
const HASH = /^[a-f0-9]{64}$/;
export class MarkdownReadError extends Error {
  constructor(code, message) { super(message); this.name = 'MarkdownReadError'; this.code = code; }
}
const fail = (code, message) => { throw new MarkdownReadError(code, message); };
export const sha256Text = async (text) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map(b=>b.toString(16).padStart(2,'0')).join('');
export function checkSourceText(text) {
  if (typeof text !== 'string' || !text.isWellFormed() || text.includes('\0')) fail('invalid_source', 'This file does not contain supported UTF-8 text.');
  if (new TextEncoder().encode(text).length > MAX_MARKDOWN_BYTES) fail('too_large', 'This reader supports files up to 64 KiB. The source remains available.');
}

// Source positions exposed to consumers count original Unicode code points.
// The parser uses UTF-16 and omits one leading BOM. Neither changes source bytes.
function positionMap(source) {
  const map = new Map([[0,0]]); let units = 0, points = 0;
  for (const char of source) { units += char.length; map.set(units, ++points); }
  return map;
}
const textNode = text => ({tag:'text',text});
const element = (tag, children, attrs = {}) => ({tag,children,...attrs});
function safeHref(url) {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return null;
  try { const parsed = new URL(url); return ['http:','https:'].includes(parsed.protocol) ? parsed.href : null; } catch { return null; }
}

/** Produces a closed semantic tree, not HTML. All derived IDs are revision-local. */
export async function projectMarkdown(source, identity) {
  checkSourceText(source);
  if (!identity || !HASH.test(identity.sha256)) fail('invalid_identity','A recorded file identity is required.');
  if (identity.kind === 'core-file') {
    validateRef(identity);
    if (identity.bytes !== new TextEncoder().encode(source).length) fail('integrity','The file length does not match its manifest.');
  } else if (identity.kind !== 'content-version' || !['sessionId','runId'].every(k=>typeof identity[k] === 'string' && identity[k])) fail('invalid_identity','A recorded file identity is required.');
  if (!(identity.kind === 'core-file' ? validPath(identity.path) : typeof identity.path === 'string' && identity.path.length > 0 && !identity.path.includes('\0'))) fail('invalid_identity','A supported file path is required.');
  const digest = await sha256Text(source);
  if (digest !== identity.sha256) fail('integrity','The file does not match its recorded version.');
  const bom = source.startsWith('\uFEFF') ? 1 : 0;
  const { parseMarkdownAst } = await (parserModule ??= import('./vendor/markdown-parser.mjs'));
  const tree = parseMarkdownAst(source.slice(bom));
  const positions = positionMap(source), definitions = new Map(), warnings = new Set();
  let count = 0;
  function visit(node, depth = 0) {
    if (++count > 20_000 || depth > 100) fail('too_complex','This document is too complex for the reader. The source remains available.');
    if (node.type === 'definition' && !definitions.has(node.identifier)) definitions.set(node.identifier, node);
    for (const child of node.children ?? []) visit(child, depth + 1);
  }
  visit(tree);
  function nodes(node) {
    const children = () => (node.children ?? []).flatMap(nodes);
    switch (node.type) {
      case 'text': return [textNode(node.value)];
      case 'paragraph': return [element('p',children())];
      case 'heading': return [element(`h${node.depth}`,children())];
      case 'strong': return [element('strong',children())];
      case 'emphasis': return [element('em',children())];
      case 'delete': return [element('del',children())];
      case 'inlineCode': return [element('code',[textNode(node.value)])];
      case 'code': return [element('pre',[element('code',[textNode(node.value)])])];
      case 'break': return [element('br',[])];
      case 'thematicBreak': return [element('hr',[])];
      case 'blockquote': return [element('blockquote',children())];
      case 'list': return [element(node.ordered ? 'ol' : 'ul', children(), node.ordered && Number.isSafeInteger(node.start) ? {start:node.start} : {})];
      case 'listItem': return [element('li', [...(typeof node.checked === 'boolean' ? [textNode(node.checked ? '[x] ' : '[ ] ')] : []), ...children()])];
      case 'link':
      case 'linkReference': {
        const target = node.type === 'link' ? node : definitions.get(node.identifier);
        const href = safeHref(target?.url);
        return [element('a',children(),href ? {href} : {})];
      }
      case 'image':
      case 'imageReference': warnings.add('Images are shown as descriptions; no image is loaded.'); return [textNode(node.alt ?? '')];
      case 'html': warnings.add('HTML is shown as source text.'); return [element('code',[textNode(node.value)])];
      case 'definition': return [];
      case 'table': return [element('table',[
        element('thead',[element('tr',(node.children[0]?.children ?? []).map(cell=>element('th',(cell.children ?? []).flatMap(nodes))))]),
        element('tbody',node.children.slice(1).map(row=>element('tr',row.children.map(cell=>element('td',(cell.children ?? []).flatMap(nodes))))))
      ])];
      default: warnings.add('Some syntax is shown as source text.'); return [textNode(source.slice((node.position?.start.offset ?? 0) + bom,(node.position?.end.offset ?? 0) + bom))];
    }
  }
  const key = await sha256Text(JSON.stringify([MARKDOWN_PROFILE,identity.kind,identity.sessionId,identity.matterId ?? null,identity.candidateId ?? null,identity.artifactId ?? null,identity.candidateDigest ?? null,identity.bundleDigest ?? null,identity.runId ?? null,identity.path,identity.sha256]));
  const blocks = [];
  for (const node of tree.children) {
    const a = node.position.start.offset + bom, b = node.position.end.offset + bom;
    if (!positions.has(a) || !positions.has(b) || a > b) fail('invalid_position','A source position could not be verified.');
    const semantic = nodes(node);
    if (!semantic.length) continue;
    blocks.push({id:`mr-${key}-${positions.get(a)}-${positions.get(b)}`,type:node.type,depth:node.type === 'heading' ? node.depth : null,start:positions.get(a),end:positions.get(b),raw:source.slice(a,b),nodes:semantic});
  }
  const plain = nodes => nodes.map(n=>n.tag === 'text' ? n.text : plain(n.children ?? [])).join('');
  return {schemaVersion:1,profile:MARKDOWN_PROFILE,key,identity:{...identity},source,byteLength:new TextEncoder().encode(source).length,codePointLength:[...source].length,blocks,outline:blocks.filter(b=>b.type === 'heading').map(b=>({id:b.id,depth:b.depth,text:plain(b.nodes)})),warnings:[...warnings],readOnly:true};
}

const abort = signal => signal?.throwIfAborted();
function validateRef(ref) {
  if (!ref || ref.kind !== 'core-file' || !['sessionId','matterId','candidateId'].every(k=>typeof ref[k] === 'string' && ref[k].length > 0) || !['candidateDigest','bundleDigest'].every(k=>HASH.test(ref[k])) || (ref.artifactId != null && (typeof ref.artifactId !== 'string' || !ref.artifactId))) fail('invalid_identity','A Core file version is required.');
}
function checkPage(page, ref) {
  if (page?.status === 'unsupported') fail('unsupported','This file version uses an unsupported format.');
  if (!page || page.schemaVersion !== 1 || page.candidateId !== ref.candidateId || page.artifactId !== (ref.artifactId ?? null) || page.candidateDigest !== ref.candidateDigest || page.bundleDigest !== ref.bundleDigest || page.truncated === true) fail('integrity','The file response does not match the selected version.');
}
const selector = ref => ref.artifactId ? {artifactId:ref.artifactId} : {candidateId:ref.candidateId};
const validPath = path => typeof path === 'string' && /^[A-Za-z0-9._/-]{1,240}$/.test(path) && !path.includes('\\') && path.split('/').every(p=>p && p !== '.' && p !== '..');

export function coreFileSubjects(projection, sessionId) {
  const cap = projection?.fileCapability;
  if (projection?.contractVersion !== 'se-file-memo-v1' || cap?.schemaVersion !== 1 || cap.contractVersion !== 'se-file-memo-v1' || !['file-manifest','file-content'].every(k=>cap.queries?.includes(k)) || typeof projection.matter?.id !== 'string') return [];
  return (Array.isArray(projection.candidates) ? projection.candidates : []).flatMap(candidate => {
    if (candidate.files?.schemaVersion !== 1) return [];
    const ref = {kind:'core-file',sessionId,matterId:projection.matter.id,candidateId:candidate.id,candidateDigest:candidate.files.candidateDigest,bundleDigest:candidate.files.bundleDigest,artifactId:projection.artifact?.candidate_id === candidate.id ? projection.artifact.id : null};
    try { validateRef(ref); } catch { return []; }
    return [ref];
  });
}

/** query is a host-scoped GET callback. It is not an arbitrary URL dispatcher. */
export async function readCoreManifest(ref, {query,signal}) {
  validateRef(ref); let offset = 0, total = null; const files = [], paths = new Set();
  do {
    abort(signal);
    const page = await query({kind:'file-manifest',...selector(ref),offset,limit:16},signal);
    abort(signal); checkPage(page,ref);
    if (!Number.isInteger(page.fileCount) || page.fileCount < 1 || page.fileCount > 16 || (total !== null && total !== page.fileCount) || !Array.isArray(page.files) || page.files.length < 1 || page.offset !== offset || page.end !== offset + page.files.length || page.end > page.fileCount || page.nextOffset !== (page.end < page.fileCount ? page.end : null)) fail('invalid_page','The file list is incomplete.');
    total = page.fileCount;
    for (const file of page.files) {
      if (!validPath(file.path) || paths.has(file.path.toLowerCase()) || !HASH.test(file.sha256) || !Number.isSafeInteger(file.bytes) || file.bytes < 0 || file.bytes > MAX_MARKDOWN_BYTES || file.kind !== 'content-version') fail('invalid_manifest','The file list could not be verified.');
      paths.add(file.path.toLowerCase());files.push({...ref,path:file.path,sha256:file.sha256,bytes:file.bytes});
    }
    offset = page.nextOffset;
  } while (offset !== null);
  if (files.reduce((sum,f)=>sum+f.bytes,0) > 131_072) fail('invalid_manifest','The file bundle exceeds the supported size.');
  return files;
}

export async function readCoreFile(ref, {query,signal}) {
  validateRef(ref);
  if (!validPath(ref.path) || !HASH.test(ref.sha256) || !Number.isSafeInteger(ref.bytes) || ref.bytes < 0 || ref.bytes > MAX_MARKDOWN_BYTES) fail('invalid_identity','A verified manifest file is required.');
  let offset = 0, length = null; const chunks = [];
  do {
    abort(signal);
    const page = await query({kind:'file-content',...selector(ref),path:ref.path,offset,limit:4000},signal);
    abort(signal);checkPage(page,ref);checkSourceText(page.text);
    const count = [...page.text].length;
    if (page.path !== ref.path || page.fileDigest !== ref.sha256 || page.byteLength !== ref.bytes || !Number.isSafeInteger(page.codePointLength) || page.codePointLength < 0 || page.codePointLength > ref.bytes || (length !== null && length !== page.codePointLength) || page.offset !== offset || count > 4000 || page.end !== offset + count || page.end > page.codePointLength || (count === 0 && page.codePointLength !== 0) || page.nextOffset !== (page.end < page.codePointLength ? page.end : null)) fail('invalid_page','The file is incomplete or its version changed.');
    length = page.codePointLength;chunks.push(page.text);offset=page.nextOffset;
  } while (offset !== null);
  const source = chunks.join('');
  if (new TextEncoder().encode(source).length !== ref.bytes || await sha256Text(source) !== ref.sha256) fail('integrity','The complete file does not match its recorded version.');
  abort(signal);return source;
}
