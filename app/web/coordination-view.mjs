/* WO-MA2-02 · Thread consumer surface, inside the existing Attention dialog.
 *
 * MA2-D09: this is not a message centre. It is one collapsed panel in the one
 * global Attention conversation, mounted at the slot the withdrawn prototype
 * left behind (`dialog.append(header, toolbar, [here], stream, status,
 * composer)`). It starts no second entry point, no second composer and no
 * second `POST /sessions/:id/runs` path. Sending a message here never starts a
 * Run and never accepts anything into the Work Core.
 *
 * Two things this file exists to make visible (contract §Frontend handoff):
 *
 *   1. Source Session and target Thread are chosen EXPLICITLY, and only from
 *      lists the server published. The human mailbox route is not restricted by
 *      membership (MA2-D12), so the option list is the only boundary there is —
 *      a free-text Thread ID field would be a way to read someone else's inbox.
 *   2. A receipt object is built BEFORE the request leaves, held in a closure
 *      variable, and replayed byte-for-byte on retry. "Retain the exact message
 *      ID and payload after an unknown receipt" is implemented by object
 *      identity; re-deriving the payload on retry would be a different message.
 *
 * Shape validation lives in `coordination-projection.mjs`. This file owns DOM
 * and fetching, and nothing else.
 */
import { el } from './ui-controls.mjs';
import {
  MAILBOX_PAGE,
  attachableThreads,
  currentThreadFor,
  messageTargets,
  projectDirectory,
  projectMailbox,
  projectMessageReceipt,
  projectSessionOptions,
  projectThreadReceipt,
} from './coordination-projection.mjs';

/* Human sends are `request`. `reply` needs an already delivered message of the
 * reverse direction to name, and a reply picker is not part of this slice; the
 * kind is stated here rather than guessed per send. */
const HUMAN_KIND = 'request';
/* Said next to every settlement word, so the word is never read as execution. */
const NOT_EXECUTION = 'Delivery is not execution: this does not start a Run in the target conversation and is not a Work Core acceptance.';
const UNTITLED = 'Untitled conversation';
const UNKNOWN_THREAD = 'Retained Thread';

export function createCoordinationView({ request }) {
  const summary = el('summary', { text: 'Threads & messages' });
  const root = el('details', { className: 'coordination-view' }, summary);
  const body = el('div', { className: 'coordination-body' });
  root.append(body);

  const feedback = el('p', { className: 'coordination-status', attrs: { role: 'status' } });
  const source = el('select', { attrs: { 'aria-label': 'Working conversation' } });
  const title = el('input', { attrs: { type: 'text', 'aria-label': 'New Thread title', placeholder: 'Thread title', maxlength: '200' } });
  const join = el('select', { attrs: { 'aria-label': 'Thread to continue' } });
  const target = el('select', { attrs: { 'aria-label': 'Message destination Thread' } });
  const message = el('textarea', { attrs: { 'aria-label': 'Message another Thread', rows: '3', maxlength: '16000', placeholder: 'Message to the other Thread' } });
  const list = el('div', { className: 'coordination-mailbox', attrs: { 'aria-label': 'Thread mailbox' } });

  // Verbs carry words. IC-1: Answer / Allow / Deny and their peers are never
  // icon-only, and this surface adds no glyph to the frozen 24-icon set.
  const button = (text, onClick, className) => {
    const node = el('button', { text, className, attrs: { type: 'button' } });
    node.addEventListener('click', onClick);
    return node;
  };

  let threads = [], sessions = [], current = null, capabilities = null;
  let mailOffset = 0, generation = 0, busy = false, active = false;
  // The two retained receipts. Never re-derived; cleared only on a receipt that
  // proves the record exists, or on a 4xx that proves it never will.
  let createReceipt = null, sendReceipt = null;
  // Unsent text survives collapsing the panel and switching source conversation.
  const drafts = new Map();

  const refresh = button('Refresh', () => void load());
  const create = button('Create Thread', () => mutate(async () => {
    createReceipt ??= { threadId: crypto.randomUUID(), sessionId: source.value, title: title.value };
    const thread = projectThreadReceipt(await request('/coordination/threads', { method: 'POST', body: createReceipt }));
    if (!thread || thread.id !== createReceipt.threadId || thread.creation.sessionId !== createReceipt.sessionId || thread.creation.title !== createReceipt.title)
      throw new Error('Thread receipt unavailable. Retry the same creation; the ID and title are retained.');
    createReceipt = null; title.value = '';
    feedback.textContent = 'Thread created. Members share its inbox; no conversation history is imported.';
  }));
  const attach = button('Continue in Thread', () => mutate(async () => {
    const chosen = threads.find((t) => t.id === join.value);
    if (!chosen) throw new Error('Choose a Thread from the list.');
    const sessionId = source.value;
    const thread = projectThreadReceipt(await request(`/coordination/threads/${encodeURIComponent(chosen.id)}/attach`,
      { method: 'POST', body: { sessionId, expectedRevision: chosen.revision } }));
    if (!thread || thread.id !== chosen.id || !thread.sessionIds.includes(sessionId))
      throw new Error('Membership receipt unavailable. Refresh to reconcile before retrying.');
    feedback.textContent = 'Conversation attached to the Thread. Membership shares an inbox; it copies no permissions and no model history.';
  }));
  const send = button('Send message', () => mutate(async () => {
    const chosen = threads.find((t) => t.id === target.value);
    if (!sendReceipt && (!chosen || !current)) throw new Error('Choose a destination Thread from the list.');
    sendReceipt ??= {
      messageId: crypto.randomUUID(),
      sourceThreadId: current.id,
      targetThreadId: chosen.id,
      sourceSessionId: source.value,
      expectedTargetRevision: chosen.revision,
      kind: HUMAN_KIND,
      text: message.value,
      replyTo: null,
    };
    const settled = projectMessageReceipt(await request('/coordination/messages', { method: 'POST', body: sendReceipt }), sendReceipt.sourceThreadId);
    if (!settled || settled.id !== sendReceipt.messageId)
      throw new Error('Message receipt unavailable. Retry the same message; its ID and text are retained.');
    // The server's own settlement word, unchanged, with what it does not mean.
    feedback.textContent = `Message ${settled.status}. ${NOT_EXECUTION}`;
    sendReceipt = null; message.value = ''; drafts.delete(source.value);
  }), 'coordination-primary');

  /* Capabilities are the server's own answer, not this file's claim. Until the
   * directory has been read they are unknown, and unknown is said as unknown. */
  const capabilityNote = el('p', { className: 'form-help', text: 'Capabilities are read from the runtime when this panel is expanded.' });
  const registration = el('div', { className: 'coordination-row' }, title, create, join, attach);
  const composer = el('div', { className: 'coordination-row is-stacked' }, target, message, send);
  body.append(
    el('p', { className: 'form-help', text: 'Create a durable working Thread, or continue one with another conversation. Members share its inbox; sending does not wake an agent, start a Run or import another conversation’s model transcript.' }),
    el('div', { className: 'coordination-row' }, source, refresh),
    registration, composer, feedback, list, capabilityNote,
  );

  function controls() {
    for (const node of [source, refresh, title, create, join, attach, target, message, send]) node.disabled = busy;
    // While a receipt is retained the payload is frozen: a retry must repeat it.
    source.disabled ||= Boolean(sendReceipt || createReceipt);
    title.disabled ||= Boolean(createReceipt);
    message.readOnly = Boolean(sendReceipt);
    target.disabled ||= Boolean(sendReceipt);
    registration.hidden = Boolean(current) && !createReceipt;
    composer.hidden = !current && !sendReceipt;
    create.disabled ||= !source.value || !title.value.trim();
    attach.disabled ||= !join.value;
    if (!sendReceipt) send.disabled ||= capabilities?.message !== true || !current?.available || !target.value || !message.value.trim();
    if (capabilities) {
      const off = ['explore', 'handoff', 'workflow'].filter((name) => !capabilities[name]);
      capabilityNote.textContent = off.length
        ? `This runtime reports ${off.join(', ')} as not connected to this surface. Messaging is ${capabilities.message ? 'available' : 'unavailable'}.`
        : 'This runtime reports every coordination capability as connected.';
    }
    send.textContent = sendReceipt ? 'Retry the same message' : 'Send message';
    create.textContent = createReceipt ? 'Retry the same creation' : 'Create Thread';
  }

  async function mutate(fn) {
    if (busy) return;
    busy = true; generation++; feedback.textContent = 'Working…'; controls();
    try { await fn(); }
    catch (error) {
      feedback.textContent = error.message;
      // A refusal is a known outcome; only an unknown one is worth retaining.
      if (error.status >= 400 && error.status < 500) { sendReceipt = null; createReceipt = null; }
    }
    finally { busy = false; await load(); controls(); }
  }

  async function load() {
    if (busy || !active) return;
    const own = ++generation, sourceId = source.value;
    refresh.disabled = true;
    try {
      const [rawDirectory, rawSessions] = await Promise.all([request('/coordination'), request('/sessions')]);
      if (own !== generation || !active) return;
      const directory = projectDirectory(rawDirectory);
      const known = projectSessionOptions(rawSessions);
      if (!directory || !known) throw new Error('This runtime published a Thread directory this surface does not recognise.');
      threads = directory.threads; sessions = known; capabilities = directory.capabilities;

      if (createReceipt) {
        const confirmed = threads.find((t) => t.id === createReceipt.threadId
          && t.creation.sessionId === createReceipt.sessionId && t.creation.title === createReceipt.title);
        if (confirmed) { createReceipt = null; feedback.textContent = 'Thread creation confirmed.'; }
      }

      source.replaceChildren(el('option', { text: 'Choose working conversation', attrs: { value: '' } }),
        ...sessions.map((s) => el('option', {
          text: `${s.title ?? UNTITLED} · ${s.scope.kind === 'global' ? 'Attention' : 'Project'} · ${s.id.slice(0, 8)}`,
          attrs: { value: s.id },
        })));
      if (sessions.some((s) => s.id === sourceId)) source.value = sourceId;
      const chosenSession = sessions.find((s) => s.id === source.value) ?? null;
      current = currentThreadFor(threads, chosenSession);

      const previousTarget = target.value;
      target.replaceChildren(el('option', { text: 'Choose destination Thread', attrs: { value: '' } }),
        ...messageTargets(threads, current?.id ?? null).map((t) => el('option', { text: `${t.title} · ${t.id.slice(0, 8)}`, attrs: { value: t.id } })));
      if (threads.some((t) => t.id === previousTarget && t.available && t.id !== current?.id)) target.value = previousTarget;

      join.replaceChildren(el('option', { text: 'Choose existing Thread', attrs: { value: '' } }),
        ...attachableThreads(threads, chosenSession).map((t) => el('option', { text: t.title, attrs: { value: t.id } })));

      list.replaceChildren();
      if (current) await renderMailbox(own);
    } catch (error) {
      if (own === generation) { feedback.textContent = error.message; current = null; list.replaceChildren(); }
    } finally { if (own === generation) controls(); }
  }

  async function renderMailbox(own) {
    const raw = await request(`/coordination/threads/${encodeURIComponent(current.id)}?offset=${mailOffset}&limit=${MAILBOX_PAGE}`);
    if (own !== generation || !active) return;
    const mailbox = projectMailbox(raw, current.id);
    if (!mailbox) throw new Error('This runtime published a mailbox page this surface does not recognise.');
    list.append(el('h3', { text: mailbox.thread.title }));
    list.append(el('p', {
      className: 'form-help',
      text: mailbox.total === 0
        ? 'No messages yet. Incoming messages appear here only once they are delivered.'
        : `${mailbox.total} retained messages · showing ${mailbox.offset + 1}–${mailbox.offset + mailbox.messages.length}`,
    }));
    for (const item of mailbox.messages) {
      const other = threads.find((t) => t.id === item.otherThreadId);
      const heading = `${item.direction === 'outgoing' ? 'To' : 'From'} ${other?.title ?? UNKNOWN_THREAD}`;
      // Status is a word, never a colour alone (FN-28), and it is the server's
      // word: queued / delivered / stale_target / target_unavailable.
      list.append(el('article', { className: 'coordination-message' },
        el('div', { className: 'coordination-message-heading' },
          el('strong', { text: heading }),
          el('span', { className: 'coordination-message-status', text: `${item.kind} · ${item.status}` })),
        el('p', { className: 'coordination-message-text', text: item.text }),
        el('p', { className: 'form-help', text: item.deliveredAt === null
          ? `Sent ${item.createdAt} · not delivered`
          : `Sent ${item.createdAt} · delivered ${item.deliveredAt}` })));
    }
    const pager = el('div', { className: 'coordination-row' });
    if (mailbox.previousOffset !== null)
      pager.append(button('Previous messages', () => { mailOffset = mailbox.previousOffset; void load(); }));
    if (mailbox.nextOffset !== null)
      pager.append(button('More messages', () => { mailOffset = mailbox.nextOffset; void load(); }));
    if (pager.children.length) list.append(pager);
  }

  source.addEventListener('change', () => {
    feedback.textContent = ''; mailOffset = 0;
    message.value = drafts.get(source.value) ?? '';
    void load();
  });
  message.addEventListener('input', () => { drafts.set(source.value, message.value); controls(); });
  for (const node of [title, target, join]) node.addEventListener('input', controls);
  // Fetching is bound to disclosure: expanding loads, collapsing stops. A
  // collapsed panel never polls and never lands a late response on screen.
  root.addEventListener('toggle', () => {
    active = root.open;
    if (active) void load(); else generation++;
  });
  controls();

  return {
    root,
    deactivate() { active = false; generation++; root.open = false; },
  };
}
