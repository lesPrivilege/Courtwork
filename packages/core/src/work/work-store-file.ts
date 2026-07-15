/**
 * Node-only entry for the Work file adapters (三段同步 file adapter + WORK-STORE-1 的异步
 * whole-envelope host adapter）。Browser consumers must import @courtwork/core/work-protocol instead.
 */
export * from '../events/event-log-file.js';
export * from '../session/confirmation-store-file.js';
export * from '../revision/revision-store-file.js';
export * from '../work-state/work-state-host-file.js';
