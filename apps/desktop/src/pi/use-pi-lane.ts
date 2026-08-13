import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  asPiLaneFailure,
  type PiLaneFailure,
  type PiLanePort,
  type PiLaneVerdict,
  type PiWorkspaceResult,
} from './pi-lane-port';
import {
  clearPiHistoryForContainer,
  priorSessionsFor,
  readPiHistory,
  writePiHistory,
  type PiHistoryBackend,
  type PiHistorySession,
} from './pi-history';
import { emptySessionView, foldPiRecords, type PiSessionView } from './pi-projection';
import { createRecordCoalescer } from './pi-stream';

/**
 * `PI-LANE-UI-1` · 一条 pi 工作的界面状态。
 *
 * 它把四件事接在一起，且**只**接这四件：端口（过桥）、合帧器（每帧至多一次、终态立即）、
 * 折叠器（账本→视图，唯一真源）、历史索引缓存（上一段工作稿的只读入口）。
 *
 * 累计行 → 全量重折：不另写增量 reducer。首版最多 12 回合，重折的代价可忽略，而
 * 「增量与全量会不会分叉」这个问题因此**不存在**（复杂度节制：能不引入的状态机就不引入）。
 */

export type PiLaneStatus = 'idle' | 'starting' | 'ready' | 'unavailable';

export interface PiLaneSessionOptions {
  readonly port: PiLanePort;
  readonly containerId: string | null;
  readonly grantId: string | null;
  readonly modelId: string;
  readonly maxTurns: number;
  readonly maxUsd: number | null;
  /** session id 的来源。默认按时间铸；测试注入确定值。 */
  readonly mintSessionId?: () => string;
  readonly historyBackend?: PiHistoryBackend;
}

export interface PiLaneSession {
  readonly status: PiLaneStatus;
  readonly failure: PiLaneFailure | null;
  readonly sessionId: string | null;
  readonly view: PiSessionView;
  readonly priorSessions: readonly PiHistorySession[];
  start(): Promise<void>;
  send(text: string): Promise<void>;
  stop(): Promise<void>;
  decide(operationId: string, verdict: PiLaneVerdict): Promise<void>;
  open(sessionId: string, logicalPath: string): Promise<PiWorkspaceResult>;
  /** 收摊当前这一段，回到未开工态。**不删任何东西**：账本与工作稿都还在盘上。 */
  restart(): Promise<void>;
}

function defaultBackend(): PiHistoryBackend {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  } catch {
    /* 隐私模式下 localStorage 会抛：历史入口缺席即可，不该因此拦住整条工作。 */
  }
  const memory = new Map<string, string>();
  return {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => void memory.set(key, value),
  };
}

let sessionCounter = 0;

function mintSessionIdDefault(): string {
  sessionCounter += 1;
  // SafeToken 文法（宿主侧再校一遍）：只用 ASCII 字母、数字与连字符。
  return `s-${Date.now().toString(36)}-${sessionCounter.toString(36)}`;
}

export function usePiLaneSession(options: PiLaneSessionOptions): PiLaneSession {
  const { port, containerId, grantId, modelId, maxTurns, maxUsd } = options;
  const backend = useMemo(
    () => options.historyBackend ?? defaultBackend(),
    [options.historyBackend],
  );
  const mint = options.mintSessionId ?? mintSessionIdDefault;

  const [status, setStatus] = useState<PiLaneStatus>('idle');
  const [failure, setFailure] = useState<PiLaneFailure | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lines, setLines] = useState<readonly string[]>([]);
  const [history, setHistory] = useState<readonly PiHistorySession[]>(() => readPiHistory(backend));
  const identityKey = `${containerId ?? ''}\u0000${grantId ?? ''}`;
  const identityRef = useRef(identityKey);
  const [stateIdentity, setStateIdentity] = useState(identityKey);
  if (identityRef.current !== identityKey) identityRef.current = identityKey;
  const identityOwnsState = stateIdentity === identityKey;
  const previousIdentity = useRef({ containerId, grantId, key: identityKey });
  const activeSession = useRef<{ containerId: string; sessionId: string; identityKey: string } | null>(null);
  const requestCounter = useRef(0);
  const coalescer = useRef<ReturnType<typeof createRecordCoalescer> | null>(null);

  useEffect(() => {
    return () => {
      coalescer.current?.dispose();
      coalescer.current = null;
    };
  }, []);

  // container 与 grant 共同定义授权身份；任一变化都先收旧段，再清投影与 GUI 历史缓存。
  useEffect(() => {
    const previous = previousIdentity.current;
    const active = activeSession.current;
    if (active && active.identityKey !== identityKey) {
      void port.teardown({ containerId: active.containerId, sessionId: active.sessionId });
      activeSession.current = null;
    }
    coalescer.current?.dispose();
    coalescer.current = null;
    requestCounter.current = 0;
    setStateIdentity(identityKey);
    setStatus('idle');
    setFailure(null);
    setSessionId(null);
    setLines([]);
    if (
      containerId &&
      previous.containerId === containerId &&
      previous.grantId !== grantId
    ) {
      setHistory(clearPiHistoryForContainer(backend, containerId));
    } else {
      setHistory(readPiHistory(backend));
    }
    previousIdentity.current = { containerId, grantId, key: identityKey };
  }, [backend, containerId, grantId, identityKey, port]);

  const view = useMemo(
    () => foldPiRecords(containerId ?? '', sessionId ?? '', [...lines]),
    [containerId, sessionId, lines],
  );

  // 索引一变就记进历史缓存：Stop、失败与触顶之后仍找得回这一段的工作稿。
  const draftSignature = view.drafts
    .map((draft) => `${draft.logicalPath}:${draft.contentSha256}`)
    .join('|');
  useEffect(() => {
    if (!containerId || !sessionId || view.drafts.length === 0) return;
    setHistory(
      writePiHistory(backend, {
        containerId,
        sessionId,
        recordedAt: Date.now(),
        drafts: view.drafts,
      }),
    );
    // `draftSignature` 是 drafts 的取值摘要：内容没变就不写盘。
  }, [backend, containerId, sessionId, draftSignature, view.drafts]);

  const start = useCallback(async () => {
    if (!containerId || !grantId) {
      setFailure({
        code: 'unbound_case',
        message: '这个案件还没有绑定文件夹 · 请先绑定后再开始',
      });
      setStatus('unavailable');
      return;
    }
    const nextSessionId = mint();
    const startIdentity = identityKey;
    setStateIdentity(startIdentity);
    setStatus('starting');
    setFailure(null);
    setLines([]);
    const sink = createRecordCoalescer({
      deliver: (batch) => {
        if (identityRef.current !== startIdentity) return;
        setLines((previous) => [...previous, ...batch]);
      },
      schedule: (callback) => window.requestAnimationFrame(callback),
      cancel: (handle) => window.cancelAnimationFrame(handle),
    });
    coalescer.current?.dispose();
    coalescer.current = sink;
    try {
      const reply = await port.start(
        {
          containerId,
          sessionId: nextSessionId,
          grantId,
          modelId,
          limits: { maxTurns, maxUsd },
        },
        (line) => sink.push(line),
      );
      if (identityRef.current !== startIdentity) {
        sink.dispose();
        await port.teardown({ containerId, sessionId: nextSessionId }).catch(() => undefined);
        return;
      }
      // 起步补齐与后续流不重叠：宿主在装 sink 之前落的那几枚由 `records` 一次性交出。
      activeSession.current = { containerId, sessionId: nextSessionId, identityKey: startIdentity };
      setSessionId(nextSessionId);
      setLines([...reply.records]);
      setStatus('ready');
    } catch (error) {
      sink.dispose();
      if (identityRef.current !== startIdentity) return;
      if (coalescer.current === sink) coalescer.current = null;
      setFailure(asPiLaneFailure(error));
      setStatus('unavailable');
    }
  }, [containerId, grantId, identityKey, maxTurns, maxUsd, mint, modelId, port]);

  const send = useCallback(
    async (text: string) => {
      if (!containerId || !sessionId || !identityOwnsState) return;
      requestCounter.current += 1;
      try {
        await port.prompt({
          containerId,
          sessionId,
          requestId: `r-${requestCounter.current}`,
          text,
        });
      } catch (error) {
        setFailure(asPiLaneFailure(error));
      }
    },
    [containerId, identityOwnsState, port, sessionId],
  );

  const stop = useCallback(async () => {
    if (!containerId || !sessionId || !identityOwnsState) return;
    try {
      await port.cancel({ containerId, sessionId });
    } catch (error) {
      setFailure(asPiLaneFailure(error));
    }
  }, [containerId, identityOwnsState, port, sessionId]);

  /**
   * 审批按钮的**全部**作用。界面状态一动不动——它等 `authorization_decided` 落账
   * （ADR-009 2026-08-05 窄修订：审批按钮只发 command，决定只认 journal）。
   */
  const decide = useCallback(
    async (operationId: string, verdict: PiLaneVerdict) => {
      if (!containerId || !sessionId || !identityOwnsState) return;
      try {
        await port.decision({ containerId, sessionId, operationId, verdict });
      } catch (error) {
        setFailure(asPiLaneFailure(error));
      }
    },
    [containerId, identityOwnsState, port, sessionId],
  );

  const open = useCallback(
    async (targetSessionId: string, logicalPath: string): Promise<PiWorkspaceResult> => {
      const allowed = identityOwnsState && (
        targetSessionId === sessionId ||
        history.some((entry) => entry.containerId === containerId && entry.sessionId === targetSessionId)
      );
      if (!containerId || !allowed) {
        return {
          ok: false,
          failure: { code: 'invalid_scope', message: '这份工作稿不属于当前授权 · 请在原授权工作区查看' },
        };
      }
      return port.openWorkspaceMarkdown({
        containerId,
        sessionId: targetSessionId,
        logicalPath,
      });
    },
    [containerId, history, identityOwnsState, port, sessionId],
  );

  /**
   * 另起一段。
   *
   * 12 回合是 session 级硬顶，触顶即这一条 logical session 终态；而新 session 的 workspace
   * 初始为空、索引只认同 session 账本——所以「另起一段」必须同时把上一段的工作稿入口留下，
   * 那正是 `priorSessions`（2026-08-05 架构裁定：GUI 侧保留同 container 历史 sessionId，
   * 经只读通道呈现；「新 session workspace 初始为空」这条冻结语义不动）。
   */
  const restart = useCallback(async () => {
    if (containerId && sessionId) {
      try {
        await port.teardown({ containerId, sessionId });
      } catch {
        // 收摊失败不该拦住用户另起一段：宿主侧那一条要么已经收了，要么随进程退出收。
      }
    }
    activeSession.current = null;
    coalescer.current?.dispose();
    coalescer.current = null;
    setSessionId(null);
    setLines([]);
    setFailure(null);
    setStatus('idle');
  }, [containerId, port, sessionId]);

  const priorSessions = useMemo(
    () => (containerId && identityOwnsState ? priorSessionsFor(history, containerId, sessionId) : []),
    [containerId, history, identityOwnsState, sessionId],
  );

  const exposedSessionId = identityOwnsState ? sessionId : null;
  const exposedView = exposedSessionId
    ? view
    : emptySessionView(containerId ?? '', '');

  return {
    status: identityOwnsState ? status : 'idle',
    failure: identityOwnsState ? failure : null,
    sessionId: exposedSessionId,
    view: exposedView,
    priorSessions,
    start,
    send,
    stop,
    decide,
    open,
    restart,
  };
}
