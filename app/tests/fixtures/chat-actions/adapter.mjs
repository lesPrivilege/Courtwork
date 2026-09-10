// Synthetic-only adapter. Never imported by a production route.
export function createDemoActionAdapter({ mode = () => 'success', delay = 450 } = {}) {
  const calls = [];
  return {
    calls,
    availability() { return mode() === 'unavailable' ? {available:false, reason:'Demo: this host does not provide the action.'} : {available:true}; },
    async invoke(intent, target, context = {}) {
      calls.push({intent, target:{...target}, operation:context.operation});
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, mode() === 'busy' ? 2500 : delay);
        context.signal?.addEventListener('abort', () => {clearTimeout(timer); reject(new Error('Demo cancelled.'));}, {once:true});
      });
      if (mode() === 'error') throw new Error('Demo failure. Try again; the previous selection is retained.');
      if (intent === 'like' || intent === 'dislike') return {state:'selected', selection: context.selection === intent ? null : intent, message:'Demo feedback updated.'};
      if (intent === 'pin') return {state:'selected', pinned:!context.pinned, message:context.pinned?'Demo pin removed.':'Demo message pinned.'};
      if (intent === 'read-aloud') return {state:context.operation === 'pause'?'paused':'playing', message:'Demo playback state only; no audio service.'};
      if (intent === 'stop-reading') return {state:'idle', message:'Demo playback stopped.'};
      return {state:'success', message: intent === 'regenerate'?'Demo attempt created; original response retained.':intent === 'fork'?'Demo fork starts after this message.':intent === 'share'?'Demo sharing state; no link published.':'Demo action completed.'};
    },
  };
}
