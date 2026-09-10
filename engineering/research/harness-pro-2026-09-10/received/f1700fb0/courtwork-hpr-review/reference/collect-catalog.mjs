/** HPRO-0020 reference only. Not installed in Courtwork.
 * readPage must implement the selected SDK/protocol's cursor contract and use
 * a transport-level deadline/body cap. This helper bounds decoded catalogues;
 * it does not claim to bound allocation before the SDK parses a response.
 */
export class CatalogError extends Error {
  constructor(code) { super(code); this.name = 'CatalogError'; this.code = code; }
}

export async function collectCatalog(readPage, {
  field = 'tools', getId = item => item.name, signal,
  maxItems = 100, maxPages = 10, maxBytes = 200000,
} = {}) {
  if (typeof readPage !== 'function' || typeof getId !== 'function') throw new TypeError('Callable reader and identity selector required');
  for (const number of [maxItems, maxPages, maxBytes]) {
    if (!Number.isSafeInteger(number) || number < 1) throw new TypeError('Positive integer limits required');
  }
  const checkAbort = () => { if (signal?.aborted) throw new CatalogError('catalog_cancelled'); };
  const result = [], ids = new Set(), seenCursors = new Set();
  let cursor, cumulativeBytes = 0;
  for (let pageNumber = 0; pageNumber < maxPages; pageNumber++) {
    checkAbort();
    const page = await readPage(cursor === undefined ? {} : { cursor }, { signal });
    checkAbort();
    if (!page || typeof page !== 'object' || Array.isArray(page) || !Array.isArray(page[field])) throw new CatalogError('catalog_invalid_page');
    let serialized;
    try { serialized = JSON.stringify(page); } catch { throw new CatalogError('catalog_invalid_page'); }
    cumulativeBytes += Buffer.byteLength(serialized, 'utf8');
    if (cumulativeBytes > maxBytes) throw new CatalogError('catalog_too_large');
    for (const item of page[field]) {
      let id;
      try { id = getId(item); } catch { throw new CatalogError('catalog_invalid_identity'); }
      if (typeof id !== 'string' || !id.trim() || id.length > 4000 || /[\x00-\x1f\x7f]/.test(id)) throw new CatalogError('catalog_invalid_identity');
      if (ids.has(id)) throw new CatalogError('catalog_duplicate_identity');
      ids.add(id); result.push(item);
      if (result.length > maxItems) throw new CatalogError('catalog_too_many_items');
    }
    // An omitted or null nextCursor ends this reference contract. Empty string
    // is treated as malformed, not as a guessed end marker.
    if (page.nextCursor == null) return { items: result, complete: true, pages: pageNumber + 1, decodedBytes: cumulativeBytes };
    if (typeof page.nextCursor !== 'string' || !page.nextCursor || page.nextCursor.length > 4000) throw new CatalogError('catalog_invalid_cursor');
    if (seenCursors.has(page.nextCursor)) throw new CatalogError('catalog_cursor_cycle');
    seenCursors.add(page.nextCursor); cursor = page.nextCursor;
  }
  throw new CatalogError('catalog_too_many_pages');
}
