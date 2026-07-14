import type { SessionEvent } from '@courtwork/core';
import type { WorkProjectionPort, WorkSessionRef } from './client.js';

export type WorkReplayPresenter = (
  events: SessionEvent[],
  publish: (event: SessionEvent) => void,
) => Promise<void>;

/** UI orchestration stays mechanical: query a projection, then publish its events. */
export async function replayWorkProjection(
  projection: WorkProjectionPort,
  present: WorkReplayPresenter,
  query: WorkSessionRef & { afterSeq?: number },
  publish: (event: SessionEvent) => void,
) {
  const replay = await projection.replay(query);
  await present(replay.events, publish);
  return replay;
}
