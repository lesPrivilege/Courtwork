import {
  createEventLog,
  createInMemoryConfirmationStore,
  createInMemoryRevisionEventStore,
  createToolRegistry,
  replaySession,
  runScenario,
} from '@courtwork/core/work-protocol';

// Keep the exported browser surface reachable so Rollup cannot tree-shake the executor graph.
Object.assign(globalThis, {
  __courtworkWorkProtocolSmoke: {
    createEventLog,
    createInMemoryConfirmationStore,
    createInMemoryRevisionEventStore,
    createToolRegistry,
    replaySession,
    runScenario,
  },
});
