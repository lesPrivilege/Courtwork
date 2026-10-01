// Private Host integration for the built-in Work file consumer, not a plugin
// hook ABI. WorkAdapter owns semantic validation; these reads confer no grants.
export function createBuiltinWorkRunIntegration({
  extensionRun, sessionId, runId, binding, runtimeProfile,
  readRecordedArtifacts, readRunSessionId, readSessionBinding,
  isAdmissionOpen, historyIsEmpty, sessionRunCount, compactionEnabled, readHistory,
}) {
  const fileMemo = extensionRun?.fileMemo;
  if (!fileMemo) return { decorateWorkspaceTools: tools => tools };

  const cleanSession = historyIsEmpty() && sessionRunCount() === 1;
  const reasons = cleanSession ? [] : ['session_history'];
  // A compactor may deliver a summary before an awaited input hook.
  if (compactionEnabled) reasons.push('compaction_enabled');

  const readRecordedFiles = async selectors => {
    const selected = structuredClone(selectors);
    if (!isAdmissionOpen()) throw Object.assign(new Error('Run closed'), { code: 'CANDIDATE_CLOSED' });
    if (readRunSessionId() !== sessionId || readSessionBinding()?.binding?.matterId !== binding.binding.matterId) {
      throw Object.assign(new Error('Run binding mismatch'), { code: 'BINDING_MISMATCH' });
    }
    if (!Array.isArray(selected) || !selected.length || selected.length > 16) {
      throw Object.assign(new Error('file count'), { code: 'FILE_LIMIT' });
    }
    const records = structuredClone(readRecordedArtifacts());
    const files = [];
    for (const selector of selected) {
      if (!selector || Object.keys(selector).sort().join(',') !== 'path,sha256') {
        throw Object.assign(new Error('selector shape'), { code: 'INVALID' });
      }
      const recordIndex = records.findIndex(record => record.path === selector.path && record.sha256 === selector.sha256);
      const record = records[recordIndex];
      if (!record || record.kind !== 'content-version') {
        throw Object.assign(new Error('recorded version unavailable'), { code: 'BINDING_MISMATCH' });
      }
      if (record.bytes > 65536) throw Object.assign(new Error('file byte limit'), { code: 'FILE_LIMIT' });
      const bytes = await readHistory(record.sha256, record.bytes);
      let content;
      try { content = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); }
      catch { throw Object.assign(new Error('invalid file UTF-8'), { code: 'INVALID' }); }
      files.push({ ...record, sessionId, runId, recordIndex, content });
    }
    if (!isAdmissionOpen()) throw Object.assign(new Error('Run closed'), { code: 'CANDIDATE_CLOSED' });
    return files;
  };

  return {
    decorateWorkspaceTools: tools => tools.map(tool => tool.name !== 'ws_write' ? tool : {
      ...tool,
      execute: async (...args) => {
        const result = await tool.execute(...args);
        const details = result.details;
        // Placement warnings describe an occurred effect, never a recorded path.
        // Require the Host's durable record even if the tool omits that warning.
        const recorded = details && details.placement !== 'unconfirmed'
          && readRecordedArtifacts().some(record => record.kind === 'content-version'
            && record.path === details.path && record.sha256 === details.sha256 && record.bytes === details.bytes);
        if (!recorded) return result;
        return { ...result, content: [...result.content, { type: 'text', text: JSON.stringify({ recordedFile: details }) }] };
      },
    }),
    beforeInitialInput: ({ systemPrompt, currentContext, cleanHistory }) => fileMemo.initialize({
      input: {
        systemPrompt, currentContext, runtimeProfile,
        cleanSession: cleanSession && cleanHistory,
        reasons: cleanHistory ? reasons : [...reasons, 'runtime_history'],
      },
      readRecordedFiles,
    }),
    beforeTool: (name, args) => fileMemo.beforeTool(name, args),
    beforeExtraInput: reason => fileMemo.markUnknown(reason),
  };
}
