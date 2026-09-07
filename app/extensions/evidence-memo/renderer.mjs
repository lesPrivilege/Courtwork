/*
 * Trusted local renderer for the development extension.
 *
 * The renderer only receives a projection and the host's typed dispatch
 * callback. It intentionally has no fetch, URL, storage, provider, or Core
 * access. User supplied strings are written with textContent so they cannot
 * become markup.
 */

function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function element(documentRef, tag, text = '', className = '') {
  const node = documentRef.createElement(tag);
  if (className) node.className = className;
  if (text !== '') node.textContent = String(text);
  return node;
}

function heading(documentRef, text, level = 2) {
  return element(documentRef, `h${level}`, text);
}

function fieldset(documentRef, title) {
  const section = element(documentRef, 'section', '', 'se-panel');
  section.append(heading(documentRef, title, 2));
  return section;
}

function valueOrEmpty(value) {
  return value === null || value === undefined ? '' : String(value);
}

function sourcePanel(documentRef, projection) {
  const section = fieldset(documentRef, 'Sources');
  const sources = Array.isArray(projection.sources) ? projection.sources : [];
  if (sources.length === 0) {
    section.append(element(documentRef, 'p', 'No approved source is available.'));
    return section;
  }
  for (const source of sources) {
    const article = element(documentRef, 'article', '', 'se-source');
    article.append(element(documentRef, 'strong', `${valueOrEmpty(source.id)} · revision ${valueOrEmpty(source.version)}`));
    const digest = element(documentRef, 'small', `digest ${valueOrEmpty(source.digest)}`);
    article.append(digest);
    article.append(element(documentRef, 'pre', valueOrEmpty(source.text)));
    section.append(article);
  }
  return section;
}

function evidencePanel(documentRef, projection) {
  const section = fieldset(documentRef, 'Evidence');
  const evidence = Array.isArray(projection.evidence) ? projection.evidence : [];
  if (evidence.length === 0) {
    section.append(element(documentRef, 'p', 'No Evidence has been proposed yet.'));
    return section;
  }
  const list = element(documentRef, 'ul');
  for (const item of evidence) {
    const label = `${valueOrEmpty(item.source_id)}:${valueOrEmpty(item.source_version)} `
      + `[${valueOrEmpty(item.start)}, ${valueOrEmpty(item.end)}] ${valueOrEmpty(item.quote)}`;
    list.append(element(documentRef, 'li', label));
  }
  section.append(list);
  return section;
}

function draftPanel(documentRef, projection, dispatch) {
  const section = fieldset(documentRef, 'Draft');
  const input = element(documentRef, 'textarea');
  input.name = 'draft';
  input.rows = 5;
  input.maxLength = 100_000;
  input.value = valueOrEmpty(projection.draft);
  const button = element(documentRef, 'button', 'Save draft');
  button.type = 'button';
  button.addEventListener('click', () => dispatch('save_draft', { text: input.value }));
  section.append(input, button);
  return section;
}

function reviewPanel(documentRef, projection, dispatch) {
  const section = fieldset(documentRef, 'Review');
  const candidates = Array.isArray(projection.candidates) ? projection.candidates : [];
  if (candidates.length === 0) {
    section.append(element(documentRef, 'p', 'No Candidate is available.'));
    return section;
  }
  for (const candidate of candidates) {
    const article = element(documentRef, 'article', '', 'se-candidate');
    article.append(element(documentRef, 'strong', `${valueOrEmpty(candidate.id)} · ${valueOrEmpty(candidate.status)}`));
    article.append(element(documentRef, 'pre', valueOrEmpty(candidate.artifact_text)));
    const evidenceCount = Array.isArray(candidate.evidence) ? candidate.evidence.length : 0;
    article.append(element(documentRef, 'p', `${evidenceCount} Evidence item(s)`));
    if (candidate.status === 'pending') {
      const reason = element(documentRef, 'textarea');
      reason.name = `reason-${valueOrEmpty(candidate.id)}`;
      reason.rows = 2;
      reason.placeholder = 'Reason required for Review';
      const actions = element(documentRef, 'div', '', 'se-actions');
      for (const action of ['accept', 'reject', 'request_evidence']) {
        const button = element(documentRef, 'button', action.replace('_', ' '));
        button.type = 'button';
        button.addEventListener('click', () => dispatch('decide', {
          request_id: `review-${valueOrEmpty(candidate.id)}-${action}`,
          candidate_id: candidate.id,
          base_version: candidate.base_version,
          action,
          reason: reason.value,
        }));
        actions.append(button);
      }
      article.append(reason, actions);
    }
    section.append(article);
  }
  return section;
}

function artifactPanel(documentRef, projection) {
  const section = fieldset(documentRef, 'Artifact');
  if (!projection.artifact) {
    section.append(element(documentRef, 'p', 'No accepted Artifact.'));
    return section;
  }
  section.append(element(documentRef, 'pre', valueOrEmpty(projection.artifact.content)));
  return section;
}

function renderRoot(documentRef, projection, dispatch) {
  const root = element(documentRef, 'div', '', 'se-extension');
  root.dataset.extension = 'evidence-memo';
  const matter = record(projection.matter) ? projection.matter : {};
  root.append(heading(documentRef, valueOrEmpty(projection.title || matter.id || 'Evidence Memo'), 1));
  root.append(element(documentRef, 'p', 'Development extension · human Review required'));
  root.append(sourcePanel(documentRef, projection));
  root.append(draftPanel(documentRef, projection, dispatch));
  root.append(evidencePanel(documentRef, projection));
  root.append(reviewPanel(documentRef, projection, dispatch));
  root.append(artifactPanel(documentRef, projection));
  return root;
}

export function mount({ container, projection, dispatch, signal } = {}) {
  if (!container || typeof container.replaceChildren !== 'function') throw new TypeError('container is required');
  if (typeof dispatch !== 'function') throw new TypeError('dispatch is required');
  const documentRef = container.ownerDocument ?? globalThis.document;
  if (!documentRef || typeof documentRef.createElement !== 'function') throw new TypeError('document is required');
  let disposed = false;
  let root = null;
  const onAbort = () => { disposed = true; };
  signal?.addEventListener?.('abort', onAbort, { once: true });

  const update = (nextProjection) => {
    if (disposed || signal?.aborted) return;
    root = renderRoot(documentRef, nextProjection ?? {}, (action, payload) => {
      if (!disposed && !signal?.aborted) dispatch(action, payload);
    });
    container.replaceChildren(root);
  };

  update(projection ?? {});
  return {
    update,
    dispose() {
      disposed = true;
      signal?.removeEventListener?.('abort', onAbort);
      root = null;
    },
  };
}

