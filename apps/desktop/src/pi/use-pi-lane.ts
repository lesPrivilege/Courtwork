import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  asPiLaneFailure,
  type PiLaneFailure,
  type PiLanePort,
  type PiLaneVerdict,
  type PiWorkspaceResult,
} from './pi-lane-port';
import {
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
  const requestCounter = useRef(0);
  const coalescer = useRef<ReturnType<typeof createRecordCoalescer> | null>(null);

  useEffect(() => {
    return () => {
      coalescer.current?.dispose();
      coalescer.current = null;
    };
  }, []);

  // 切容器即换一条工作：旧段的界面状态不许漏到新容器上。
  useEffect(() => {
    coalescer.current?.dispose();
    coalescer.current = null;
    setStatus('idle');
    setFailure(null);
    setSessionId(null);
    setLines([]);
  }, [containerId]);

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
    setStatus('starting');
    setFailure(null);
    setLines([]);
    const sink = createRecordCoalescer({
      deliver: (batch) => setLines((previous) => [...previous, ...batch]),
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
      // 起步补齐与后续流不重叠：宿主在装 sink 之前落的那几枚由 `records` 一次性交出。
      setSessionId(nextSessionId);
      setLines([...reply.records]);
      setStatus('ready');
    } catch (error) {
      sink.dispose();
      coalescer.current = null;
      setFailure(asPiLaneFailure(error));
      setStatus('unavailable');
    }
  }, [containerId, grantId, maxTurns, maxUsd, mint, modelId, port]);

  const send = useCallback(
    async (text: string) => {
      if (!containerId || !sessionId) return;
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
    [containerId, port, sessionId],
  );

  const stop = useCallback(async () => {
    if (!containerId || !sessionId) return;
    try {
      await port.cancel({ containerId, sessionId });
    } catch (error) {
      setFailure(asPiLaneFailure(error));
    }
  }, [containerId, port, sessionId]);

  /**
   * 审批按钮的**全部**作用。界面状态一动不动——它等 `authorization_decided` 落账
   * （ADR-009 2026-08-05 窄修订：审批按钮只发 command，决定只认 journal）。
   */
  const decide = useCallback(
    async (operationId: string, verdict: PiLaneVerdict) => {
      if (!containerId || !sessionId) return;
      try {
        await port.decision({ containerId, sessionId, operationId, verdict });
      } catch (error) {
        setFailure(asPiLaneFailure(error));
      }
    },
    [containerId, port, sessionId],
  );

  const open = useCallback(
    async (targetSessionId: string, logicalPath: string): Promise<PiWorkspaceResult> => {
      if (!containerId) {
        return {
          ok: false,
          failure: { code: 'session_missing', message: '没有可查看的工作稿 · 请先开始一段工作' },
        };
      }
      return port.openWorkspaceMarkdown({
        containerId,
        sessionId: targetSessionId,
        logicalPath,
      });
    },
    [containerId, port],
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
    coalescer.current?.dispose();
    coalescer.current = null;
    setSessionId(null);
    setLines([]);
    setFailure(null);
    setStatus('idle');
  }, [containerId, port, sessionId]);

  const priorSessions = useMemo(
    () => (containerId ? priorSessionsFor(history, containerId, sessionId) : []),
    [containerId, history, sessionId],
  );

  return {
    status,
    failure,
    sessionId,
    view: sessionId ? view : emptySessionView(containerId ?? '', ''),
    priorSessions,
    start,
    send,
    stop,
    decide,
    open,
    restart,
  };
}
