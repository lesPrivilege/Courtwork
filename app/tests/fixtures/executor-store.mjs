/** Explicit synthetic executor descriptors for Store tests whose purpose is
 * another owner. Production Session creation always receives its descriptor
 * from RuntimeService; this helper never enters app/server or a live Host. */
import { RuntimeStore as ProductRuntimeStore } from "../../server/store.mjs";
import {
  EXECUTOR_OPERATIONS, PI_EXECUTOR_ID, executorConfigurationRef, sparkAssignmentForSession,
} from "../../server/executor-choice-state.mjs";

export { SCHEMA_VERSION, validateState } from "../../server/store.mjs";

export function fixtureExecutor(adapterId = PI_EXECUTOR_ID) {
  const revision = "synthetic-store-fixture-v1";
  return {
    adapterId, revision,
    configurationRef: executorConfigurationRef({ adapterId, revision, protocol: "synthetic-store-fixture" }),
    capabilities: Object.fromEntries(EXECUTOR_OPERATIONS.map(operation => [operation, { supported: true }])),
  };
}

export class RuntimeStore extends ProductRuntimeStore {
  createSession(input) {
    return super.createSession({ ...input, executorDescriptor: input.executorDescriptor ?? fixtureExecutor() });
  }
  async createRun(input) {
    if (input.executorDescriptor || input.expectedExecutorChoice) return super.createRun(input);
    const session = this.getSession(input.sessionId);
    const child = Boolean(sparkAssignmentForSession(this.snapshot(), input.sessionId));
    if (child) return super.createRun(input);
    const excluded = session.scope === "global" || Boolean(session.extensionBinding);
    const adapterId = excluded ? session.executorChoice.adapterId : input.adapterId;
    const descriptor = fixtureExecutor(adapterId);
    if (!excluded && session.executorChoice.adapterId !== adapterId && !this.listRuns(input.sessionId).length &&
      session.hostSession === null && session.remoteBinding === null) {
      await super.changeExecutorChoice(input.sessionId, {
        expectedRevision: session.executorChoice.revision, executorDescriptor: descriptor,
      });
    }
    const choice = this.getSession(input.sessionId).executorChoice;
    return super.createRun({ ...input, adapterId, executorDescriptor: descriptor,
      expectedExecutorChoice: { revision: choice.revision, adapterId: choice.adapterId } });
  }
}
