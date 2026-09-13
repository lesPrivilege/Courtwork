import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { startServer } from '../../../app/server/index.mjs';
import { FAKE_CREDENTIAL_KEY } from '../../../app/runtime/pi-session-runtime.mjs';
import { NORMAL_FACTS, SYNTHETIC_SOURCES } from '../../../app/domains/inbound-nda/fixtures.mjs';
import { buildReview } from '../../../app/domains/inbound-nda/index.mjs';

const OUTPUT_PREFIX = 'cw-release-preview-';
const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const HOME_PROMPT = "Review Project Cedar's delivery timing and flag what needs confirmation.";
const CHAT_PROMPT = 'The revised Project Cedar draft changes delivery from 30 to 45 days. What should I confirm before replying?';
const ATTENTION_PROMPT = 'Draft a short message asking which Project Cedar delivery date is current.';
const REVIEW_PROMPT = 'Review the Project Cedar NDA against the supplied information and prepare the review for inspection.';
const RUNNING_PROMPT = 'Compare the delivery dates in the two Project Cedar drafts and identify what needs confirmation.';
const DELIVERY_FACTS = [
  'The earlier draft states a 30-day delivery period; the revised draft states 45 days.',
  'The two drafts differ by 15 days: 30 in the earlier version and 45 in the revision.',
  'Delivery shifts from 30 to 45 days between the recorded draft versions.',
  'Version one gives 30 days after signature; version two gives 45 days after signature.',
  'The revised draft extends the delivery window from 30 days to 45 days.',
  'The earlier delivery period is 30 days; the later draft records a 45-day period.',
  'One version gives 30 days for delivery; the other gives 45 days.',
  'The recorded drafts provide different delivery windows, 30 and 45 days.',
];
const DELIVERY_CHECKS = [
  'Confirm which version controls before relying on a date.',
  'Check whether the period begins on signature in both versions.',
  'Ask whether dependent milestones move with the revised date.',
  'Compare the revised text against the executed copy.',
  'Keep the delivery date open until the controlling version is confirmed.',
  'Ask the sender whether the revision replaces the earlier term.',
  'Record the unresolved timing point for human review.',
  'Check whether any notice deadline changes with this delivery window.',
];
const RUNNING_TEXT = Array.from({ length: 288 }, (_, index) =>
  `${DELIVERY_FACTS[index % DELIVERY_FACTS.length]} ${DELIVERY_CHECKS[Math.floor(index / DELIVERY_FACTS.length) % DELIVERY_CHECKS.length]}`,
).join('\n');
const NDA_SOURCE_TEXT = SYNTHETIC_SOURCES[0].text.replace(
  /^SYNTHETIC INBOUND NON-DISCLOSURE AGREEMENT/u,
  'INBOUND NON-DISCLOSURE AGREEMENT',
);
const CREATED_AT = new Date().toISOString();
const FIXTURE_VERSION = 2;
let sourceSha = null;
try {
  sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPOSITORY_ROOT, encoding: 'utf8' }).trim();
} catch { /* The local preview still runs from a source archive without Git metadata. */ }
let reviewDomain = null;

function currentTurnToolCount(body) {
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  let start = 0;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === 'user') { start = index + 1; break; }
  }
  return messages.slice(start).filter((message) => message?.role === 'tool').length;
}

function fakeResponder({ body, requestNumber, mode }) {
  const tools = body?.tools ?? [];
  const turnToolCount = currentTurnToolCount(body);
  if (mode === REVIEW_PROMPT) {
    if (turnToolCount === 0 && reviewDomain) {
      return {
        kind: 'tool', id: `release-review-${requestNumber}`, created: 1,
        toolCallId: `release-review-candidate-${requestNumber}`, name: 'se_submit_candidate',
        arguments: { domain: reviewDomain },
      };
    }
    if (turnToolCount > 0) {
      return { kind: 'text', id: `release-review-${requestNumber}`, created: 1, text: 'I prepared the review summary and left it for your inspection.' };
    }
  }
  if (tools.some((tool) => tool?.function?.name === 'spark_source')) {
    const toolResults = turnToolCount;
    if (toolResults < 2) {
      return {
        kind: 'tool', id: `release-spark-${requestNumber}`, created: 1,
        toolCallId: `release-spark-source-${requestNumber}`, name: 'spark_source',
        arguments: { index: toolResults },
      };
    }
    if (toolResults === 2) {
      return {
        kind: 'tool', id: `release-spark-${requestNumber}`, created: 1,
        toolCallId: `release-spark-note-${requestNumber}`, name: 'spark_note',
        arguments: {
          title: 'Delivery term comparison',
          text: 'The earlier draft says 30 days after signature; the later draft says 45. Confirm which version controls before replying.',
        },
      };
    }
    return {
      kind: 'text', id: `release-spark-${requestNumber}`, created: 1,
      text: 'The earlier version sets delivery at 30 days after signature; the later version says 45. Confirm which version controls before replying. I checked only these two drafts.',
    };
  }
  if (mode === RUNNING_PROMPT) {
    return { kind: 'text', id: `release-running-${requestNumber}`, created: 1, slow: true, text: RUNNING_TEXT };
  }
  if (mode === HOME_PROMPT) {
    return { kind: 'text', id: `release-home-${requestNumber}`, created: 1, text: 'The earlier draft states 30 days; the revised draft states 45. Confirm which version controls and when the period begins before replying.' };
  }
  if (mode === CHAT_PROMPT) {
    return { kind: 'text', id: `release-chat-${requestNumber}`, created: 1, text: 'Confirm which version controls, when the delivery period begins, and whether dependent milestones change. The two drafts alone do not answer those questions.' };
  }
  if (mode === ATTENTION_PROMPT) {
    return { kind: 'text', id: `release-attention-${requestNumber}`, created: 1, text: 'Could you confirm whether delivery is due 30 or 45 days after signature, and whether the revised draft replaces the earlier version?' };
  }
  return null;
}

async function startHost(dataDir) {
  let lastError;
  for (const port of [58410, 58411]) {
    try {
      return await startServer({
        dataDir,
        host: '127.0.0.1',
        port,
        fakeResponder,
        logger: () => {},
      });
    } catch (error) {
      if (error?.code !== 'EADDRINUSE') throw error;
      lastError = error;
    }
  }
  throw new Error(`Synthetic preview ports 58410 and 58411 are both busy (${lastError?.code ?? 'unknown'}).`);
}

function installShutdown(runtime, dataDir, { removeOnShutdown, beforeClose = async () => {} }) {
  let closing = false;
  async function shutdown(signal) {
    if (closing) return;
    closing = true;
    try {
      await beforeClose();
    } catch (error) {
      console.error(`Synthetic preview pre-shutdown action failed: ${error?.message ?? error}`);
    }
    try {
      await runtime.close();
    } catch (error) {
      console.error(`Synthetic preview cleanup failed: ${error?.message ?? error}`);
      process.exitCode = 1;
    } finally {
      if (removeOnShutdown) await rm(dataDir, { recursive: true, force: true }).catch((error) => {
        console.error(`Synthetic preview temporary data cleanup failed: ${error?.message ?? error}`);
        process.exitCode = 1;
      });
    }
    console.log(`Synthetic preview stopped (${signal}); ${removeOnShutdown ? 'temporary data removed' : 'synthetic data retained'}.`);
  }
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void shutdown(signal).then(() => process.exit()); });
}

function closeApprovalRun(api, approval) {
  return async () => {
    if (!approval.runId || !approval.permissionQuestionId) return;
    let current = (await api('GET', `/runs/${encodeURIComponent(approval.runId)}`)).run;
    if (current.status !== 'waiting_user') return;
    await api('POST', `/runs/${encodeURIComponent(approval.runId)}/questions/${encodeURIComponent(approval.permissionQuestionId)}`, { decision: 'deny' });
    const deadline = Date.now() + 10000;
    while (!['completed', 'failed', 'cancelled', 'unknown'].includes(current.status)) {
      if (Date.now() > deadline) throw new Error(`Synthetic permission Run did not settle during shutdown (status: ${current.status}).`);
      await new Promise((resolve) => setTimeout(resolve, 25));
      current = (await api('GET', `/runs/${encodeURIComponent(approval.runId)}`)).run;
    }
  };
}

async function main() {
  const configuredDataDir = process.env.CW_RELEASE_PREVIEW_DATA_DIR?.trim();
  const dataDir = configuredDataDir
    ? path.resolve(configuredDataDir)
    : await mkdtemp(path.join(tmpdir(), OUTPUT_PREFIX));
  let createdConfiguredDataDir = false;
  let runtime;
  try {
    if (configuredDataDir) {
      try {
        await stat(dataDir);
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
        await mkdir(dataDir, { recursive: true });
        createdConfiguredDataDir = true;
      }
    }
    const manifestPath = path.join(dataDir, 'fixture.json');
    let existingFixture = null;
    try {
      existingFixture = JSON.parse(await readFile(manifestPath, 'utf8'));
    } catch (error) {
      if (error?.code !== 'ENOENT') throw new Error(`Existing synthetic fixture manifest is invalid: ${error?.message ?? error}`);
    }
    runtime = await startHost(dataDir);
    const headers = { 'content-type': 'application/json', 'x-work-token': runtime.token };

    async function api(method, route, payload) {
      const response = await fetch(`${runtime.url}/api/v5${route}`, {
        method,
        headers,
        body: payload === undefined ? undefined : JSON.stringify(payload),
      });
      const text = await response.text();
      const json = text ? JSON.parse(text) : null;
      if (!response.ok) {
        throw new Error(`${method} ${route} failed (${response.status}): ${json?.error?.code ?? 'unknown'} ${json?.error?.message ?? ''}`);
      }
      return json;
    }

    async function createApprovalRun(sessionId, commandId) {
      const approvalRun = (await api('POST', `/sessions/${encodeURIComponent(sessionId)}/runs`, {
        input: `/fixture script ${JSON.stringify([{ name: 'ws_write', arguments: { path: 'out/approval-draft.txt', text: 'Draft delivery date: 30 days. Confirm against the executed version before sending.' } }])}`,
        commandId,
      })).run;
      const deadline = Date.now() + 10000;
      let status = approvalRun.status;
      while (status !== 'waiting_user') {
        if (['completed', 'failed', 'cancelled', 'unknown'].includes(status) || Date.now() > deadline) {
          throw new Error(`Approval fixture did not pause for permission (status: ${status}).`);
        }
        await new Promise((resolve) => setTimeout(resolve, 25));
        status = (await api('GET', `/runs/${encodeURIComponent(approvalRun.id)}`)).run.status;
      }
      const events = (await api('GET', `/sessions/${encodeURIComponent(sessionId)}/events`)).events;
      const questionId = events.findLast((event) => event.type === 'permission.open')?.data?.id ?? null;
      return { run: approvalRun, status, questionId };
    }

    if (existingFixture) {
      if (existingFixture.synthetic !== true || existingFixture.fixtureVersion !== FIXTURE_VERSION || !existingFixture.sessions?.approval?.id || !Array.isArray(existingFixture.slots)) {
        throw new Error(`The configured data directory does not contain a version ${FIXTURE_VERSION} synthetic release preview fixture. Use a new empty data directory for a clean seed.`);
      }
      const approval = await createApprovalRun(
        existingFixture.sessions.approval.id,
        `release-approval-restart-${randomUUID()}`,
      );
      existingFixture.hostUrl = runtime.url;
      existingFixture.sourceSha = sourceSha;
      existingFixture.restartedAt = new Date().toISOString();
      existingFixture.approval = {
        runId: approval.run.id,
        status: approval.status,
        permissionQuestionId: approval.questionId,
        control: 'Use the product permission control after capturing this state; that completes the Run and frees the one-Run-at-a-time lane.',
      };
      const approvalSlot = existingFixture.slots.find((slot) => slot.id === 'approval');
      if (approvalSlot) {
        approvalSlot.runId = approval.run.id;
        approvalSlot.permissionQuestionId = approval.questionId;
      }
      existingFixture.running = {
        prompt: RUNNING_PROMPT,
        expectedDurationSeconds: 180,
        instructions: 'Enter this exact prompt in Delivery plan review and capture while the Run is active. The fake local stream completes after about 180 seconds unless stopped in the UI.',
      };
      existingFixture.reuseCount = (existingFixture.reuseCount ?? 0) + 1;
      await writeFile(manifestPath, `${JSON.stringify(existingFixture, null, 2)}\n`, { mode: 0o600 });
      console.log(JSON.stringify({ synthetic: true, reused: true, url: runtime.url, dataDir, fixturePath: manifestPath, slots: existingFixture.slots.length }));
      installShutdown(runtime, dataDir, {
        removeOnShutdown: !configuredDataDir,
        beforeClose: closeApprovalRun(api, { runId: approval.run.id, permissionQuestionId: approval.questionId }),
      });
      return;
    }

    async function createSession(projectId, title, permissionMode = 'draft') {
      const result = await api('POST', '/sessions', { projectId, title, permissionMode });
      return result.session;
    }

    async function runToTerminal(session, input, commandId) {
      const result = await api('POST', `/sessions/${encodeURIComponent(session.id)}/runs`, { input, commandId });
      const started = result.run;
      const deadline = Date.now() + 15000;
      let current = started;
      while (!['completed', 'failed', 'cancelled', 'unknown', 'waiting_user'].includes(current.status)) {
        if (Date.now() > deadline) throw new Error(`Run ${started.id} did not settle in time (status: ${current.status}).`);
        await new Promise((resolve) => setTimeout(resolve, 25));
        current = (await api('GET', `/runs/${encodeURIComponent(started.id)}`)).run;
      }
      return current;
    }

    const project = (await api('POST', '/projects', { name: 'Project Cedar' })).project;
    await api('PUT', '/provider-credential', {
      connectionId: 'catalog-fake-openai-loopback',
      apiKey: FAKE_CREDENTIAL_KEY,
    });

    const sessions = {};
    sessions.home = await createSession(project.id, 'Overview');
    sessions.chat = await createSession(null, 'Delivery question');
    sessions.artifact = await createSession(project.id, 'Delivery note');
    sessions.review = await createSession(project.id, 'Inbound NDA · Cedar');
    sessions.continuity = await createSession(project.id, 'Cedar follow-up');
    sessions.spark = await createSession(project.id, 'Compare Cedar drafts');
    sessions.running = await createSession(project.id, 'Delivery plan review');
    sessions.approval = await createSession(project.id, 'Approve delivery note', 'ask');

    await runToTerminal(sessions.home, HOME_PROMPT, 'release-home-seed');
    await runToTerminal(sessions.chat, CHAT_PROMPT, 'release-chat-seed');

    await api('POST', `/sessions/${encodeURIComponent(sessions.artifact.id)}/materials`, {
      name: 'delivery-brief.txt',
      text: 'Project Cedar delivery planning. Draft a short note that preserves the 30-day delivery assumption for review.\n',
    });
    const artifactRun = await runToTerminal(
      sessions.artifact,
      `/fixture script ${JSON.stringify([
        { name: 'ws_read', arguments: { path: 'materials/delivery-brief.txt' } },
        { name: 'ws_write', arguments: { path: 'out/delivery-note.md', text: '# Delivery note\n\nDraft assumption: delivery in 30 days. Confirm against the executed version before sending.\n' } },
      ])}`,
      'release-artifact-seed',
    );

    await api('POST', '/extensions/inbound-nda/lifecycle', { action: 'load' });
    await api('POST', `/sessions/${encodeURIComponent(sessions.review.id)}/extension`, {
      extensionId: 'inbound-nda',
      input: {
        title: 'Inbound NDA · Project Cedar',
        sourceText: NDA_SOURCE_TEXT,
        facts: NORMAL_FACTS,
      },
    });
    const surface = (await api('GET', `/sessions/${encodeURIComponent(sessions.review.id)}/surface`)).projection;
    const domain = buildReview({ sources: surface.sources, facts: surface.domain.facts });
    reviewDomain = domain;
    const reviewRun = await runToTerminal(
      sessions.review,
      REVIEW_PROMPT,
      'release-candidate-seed',
    );
    const reviewSurface = (await api('GET', `/sessions/${encodeURIComponent(sessions.review.id)}/surface`)).projection;
    const reviewCandidate = reviewSurface.candidates.find((candidate) => candidate.status === 'pending');
    const decisionAction = reviewSurface.humanActions.find((action) => action.action === 'decide'
      && action.payloadSchema?.properties?.candidate_id?.const === reviewCandidate?.id);
    if (reviewRun.status !== 'completed' || !reviewCandidate || reviewSurface.readOnly || !decisionAction
      || !decisionAction.payloadSchema.properties.action.enum.includes('accept')) {
      throw new Error('The seeded candidate is not pending and reviewable before another Host Run starts.');
    }
    const matterId = surface.matter.id;
    await api('POST', `/sessions/${encodeURIComponent(sessions.continuity.id)}/extension`, {
      extensionId: 'inbound-nda',
      input: { existingMatterId: matterId },
    });

    await api('POST', `/sessions/${encodeURIComponent(sessions.spark.id)}/materials`, {
      name: 'cedar-draft-v1.txt',
      text: 'Project Cedar · draft 1\nDelivery: 30 days after signature.\n',
    });
    await api('POST', `/sessions/${encodeURIComponent(sessions.spark.id)}/materials`, {
      name: 'cedar-draft-v2.txt',
      text: 'Project Cedar · draft 2\nDelivery: 45 days after signature.\n',
    });
    const directory = await api('GET', `/subagents/source-directory?sessionId=${encodeURIComponent(sessions.spark.id)}`);
    const sources = directory.entries.slice(0, 2).map((entry) => entry.ref);
    if (sources.length !== 2) throw new Error('The Spark fixture could not find both exact synthetic source revisions.');
    const sparkCreate = await api('POST', '/subagents', {
      id: randomUUID(),
      parentSessionId: sessions.spark.id,
      brief: 'Compare the two Project Cedar drafts. Tell me how the delivery date changed, cite each version, and note what still needs confirmation.',
      sources,
    });
    const assignmentId = sparkCreate.assignment.id;
    const sparkDeadline = Date.now() + 15000;
    let assignment;
    do {
      await new Promise((resolve) => setTimeout(resolve, 50));
      const listed = await api('GET', `/subagents?sessionId=${encodeURIComponent(sessions.spark.id)}`);
      assignment = listed.assignments.find((entry) => entry.id === assignmentId);
      if (!assignment) throw new Error('Spark assignment disappeared while the local fixture was running.');
      if (Date.now() > sparkDeadline) throw new Error(`Spark assignment did not finish in time (status: ${assignment.status}).`);
    } while (assignment.status === 'queued' || assignment.status === 'active');

    const attentionId = 'release-preview-attention';
    await api('POST', '/attention', {
      projectId: project.id,
      request: {
        schema_version: 1,
        request_id: randomUUID(),
        attention_id: attentionId,
        expected_revision: 0,
        action: 'create',
        payload: {
          descriptor: { title: 'Delivery date changed', summary: 'The drafts specify 30 and 45 days.' },
          reason: 'Inspect both retained versions and confirm which date controls.',
          next_action: { kind: 'decide', label: 'Compare the retained delivery terms', trigger: 'manual', due_at: null },
          source_refs: [],
          relation_refs: [],
        },
      },
    });

    const conversation = (await api('POST', '/attention/conversations', { conversationId: randomUUID() })).session;
    const conversationRun = await runToTerminal(
      conversation,
      ATTENTION_PROMPT,
      'release-attention-conversation-seed',
    );

    const approvalState = await createApprovalRun(sessions.approval.id, 'release-approval-seed');
    const approvalRun = approvalState.run;

    const settingsPath = (section) => `#settings/${section}`;
    const slots = [
      { id: 'home', stateId: 'release-preview-home', path: '#', journey: 'Home', sessionId: sessions.home.id },
      { id: 'spark', stateId: 'release-preview-spark-completed', path: '#', journey: 'Open Compare Cedar drafts; inspect the completed assignment and exact sources.', sessionId: sessions.spark.id, assignmentId },
      { id: 'running', stateId: 'release-preview-running-active', path: '#', journey: 'Open Delivery plan review; enter the exact RUNNING prompt below.', sessionId: sessions.running.id },
      { id: 'attention', stateId: 'release-preview-attention-item', path: '#', journey: 'Open Attention and inspect the synthetic delivery timing item.', attentionId },
      { id: 'approval', stateId: 'release-preview-approval-pending', path: '#', journey: 'Open Approve delivery note; keep waiting_user visible for both screenshots.', sessionId: sessions.approval.id, runId: approvalRun.id, permissionQuestionId: approvalState.questionId },
      { id: 'artifact', stateId: 'release-preview-artifact-recorded', path: '#', journey: 'Open Delivery note; open out/delivery-note.md.', sessionId: sessions.artifact.id, runId: artifactRun.id },
      { id: 'matter', stateId: 'release-preview-cedar-matter', path: '#', journey: 'Open Cedar follow-up; inspect its bound Project Cedar Matter.', sessionId: sessions.continuity.id, matterId },
      { id: 'review', stateId: 'release-preview-nda-candidate-pending', path: '#', journey: 'Open Inbound NDA · Cedar; inspect the pending candidate. Do not record a decision.', sessionId: sessions.review.id, runId: reviewRun.id, matterId },
      { id: 'continuity', stateId: 'release-preview-continuity-same-matter', path: '#', journey: 'Open Cedar follow-up; confirm identity remains the same across Sessions.', sessionId: sessions.continuity.id, matterId },
      { id: 'models', stateId: 'release-preview-local-model-settings', path: settingsPath('models'), journey: 'Models settings; the only configured route is the local fake provider.' },
      { id: 'integrations', stateId: 'release-preview-local-integrations', path: settingsPath('tools'), journey: 'Tools / integrations settings; inspect local extension state only.' },
      { id: 'settings', stateId: 'release-preview-appearance-default', path: settingsPath('appearance'), journey: 'Appearance settings; keep the same configuration for the light/dark screenshot pair.' },
      { id: 'conversation', stateId: 'release-preview-attention-conversation', path: '#', journey: 'Open the Attention conversation.', sessionId: conversation.id, runId: conversationRun.id },
    ];

    const fixture = {
      synthetic: true,
      fixtureVersion: FIXTURE_VERSION,
      sourceSha,
      generatedAt: CREATED_AT,
      hostUrl: runtime.url,
      dataDir,
      provider: 'fake-openai-loopback',
      project: { id: project.id, name: project.name },
      sessions: Object.fromEntries(Object.entries(sessions).map(([key, session]) => [key, { id: session.id, title: session.title, scope: session.scope }])),
      attentionConversation: { id: conversation.id, title: conversation.title, scope: conversation.scope },
      matterId,
      attentionId,
      spark: { assignmentId, status: assignment.status, sourceRefs: sources },
      artifact: { runId: artifactRun.id, status: artifactRun.status, path: 'out/delivery-note.md' },
      workReview: {
        runId: reviewRun.id,
        status: reviewRun.status,
        candidateId: reviewCandidate.id,
        candidateStatus: reviewCandidate.status,
        seededBeforeActiveRun: true,
        initialReadOnly: reviewSurface.readOnly,
        initialActions: reviewSurface.humanActions.map((action) => ({
          action: action.action,
          choices: action.payloadSchema?.properties?.action?.enum ?? [],
        })),
        matterId,
        liveNote: 'Any active Host Run makes the Work Review surface read-only until the Run settles.',
      },
      approval: { runId: approvalRun.id, status: approvalState.status, permissionQuestionId: approvalState.questionId, control: 'Use the product permission control after capturing this state; that completes the Run and frees the one-Run-at-a-time lane.' },
      running: {
        prompt: RUNNING_PROMPT,
        expectedDurationSeconds: 180,
        instructions: 'Enter this exact prompt in Delivery plan review and capture while the Run is active. The fake local stream completes after about 180 seconds unless stopped in the UI.',
      },
      slots,
      cautions: [
        'All names, source text, project work, Runs, candidate, Matter, Attention item, and conversation are synthetic local preview state.',
        'The pending candidate is not a human decision; Run completion is not acceptance.',
        'The fake provider performs no external model call. The saved credential is a fixed local test marker, not a real secret.',
        'No token, auth value, or real credential is stored in this manifest.',
      ],
    };
    await writeFile(manifestPath, `${JSON.stringify(fixture, null, 2)}\n`, { mode: 0o600 });
    console.log(JSON.stringify({ synthetic: true, url: runtime.url, dataDir, fixturePath: manifestPath, slots: slots.length }));
    installShutdown(runtime, dataDir, {
      removeOnShutdown: !configuredDataDir,
      beforeClose: closeApprovalRun(api, { runId: approvalRun.id, permissionQuestionId: approvalState.questionId }),
    });
  } catch (error) {
    await runtime?.close().catch(() => {});
    if (!configuredDataDir || createdConfiguredDataDir) await rm(dataDir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

main().catch((error) => {
  console.error(error?.stack ?? error);
  process.exitCode = 1;
});
