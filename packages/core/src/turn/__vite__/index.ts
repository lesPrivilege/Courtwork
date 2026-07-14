import {
  createMemoryTurnStore,
  createTurnHarnessRuntime,
} from '@courtwork/core/turn-protocol';

// Keep the facade and its complete browser runtime graph reachable in Rollup output.
Object.assign(globalThis, {
  __courtworkTurnProtocolSmoke: {
    createMemoryTurnStore,
    createTurnHarnessRuntime,
  },
});
