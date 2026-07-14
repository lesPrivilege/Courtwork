import { Channel, invoke } from '@tauri-apps/api/core';
import type {
  ProviderTransport,
  ProviderTransportEvent,
  ProviderTransportRequest,
} from '@courtwork/provider/types';

export interface HostEventChannel<T> {
  onmessage: (event: T) => void;
}

export interface TauriProviderTransportDependencies {
  invoke(command: string, args?: Record<string, unknown>): Promise<unknown>;
  createChannel<T>(): HostEventChannel<T>;
}

class AsyncEventQueue implements AsyncIterable<ProviderTransportEvent> {
  private readonly values: ProviderTransportEvent[] = [];
  private readonly waiters: Array<(result: IteratorResult<ProviderTransportEvent>) => void> = [];
  private closed = false;

  push(value: ProviderTransportEvent) {
    const waiter = this.waiters.shift();
    if (waiter) waiter({ value, done: false });
    else this.values.push(value);
    if (value.type === 'end' || value.type === 'failed') this.close();
  }

  private close() {
    this.closed = true;
    for (const waiter of this.waiters.splice(0)) waiter({ value: undefined, done: true });
  }

  [Symbol.asyncIterator](): AsyncIterator<ProviderTransportEvent> {
    return {
      next: () => {
        const value = this.values.shift();
        if (value) return Promise.resolve({ value, done: false });
        if (this.closed) return Promise.resolve({ value: undefined, done: true });
        return new Promise((resolve) => this.waiters.push(resolve));
      },
    };
  }
}

const tauriDependencies: TauriProviderTransportDependencies = {
  invoke: (command, args) => invoke(command, args),
  createChannel: <T>() => new Channel<T>(),
};

function buildChatInvokeInput(request: ProviderTransportRequest) {
  return {
    requestId: request.requestId,
    providerId: request.providerId,
    modelId: request.modelId,
    reasoningBody: request.reasoningBody,
    body: request.body,
  };
}

/** Rust owns the endpoint, headers and keychain material; WebView submits only catalog ids and body. */
export function createTauriProviderTransport(
  dependencies: TauriProviderTransportDependencies = tauriDependencies,
): ProviderTransport {
  return {
    stream(request: ProviderTransportRequest): AsyncIterable<ProviderTransportEvent> {
      const queue = new AsyncEventQueue();
      const channel = dependencies.createChannel<ProviderTransportEvent>();
      channel.onmessage = (event) => queue.push(event);
      const abort = () => {
        void dependencies.invoke('cancel_provider_request', { requestId: request.requestId });
      };
      request.signal?.addEventListener('abort', abort, { once: true });
      void dependencies.invoke('provider_chat_request', {
        input: buildChatInvokeInput(request),
        onEvent: channel,
      }).catch(() => queue.push({
        type: 'failed',
        requestId: request.requestId,
        kind: 'network',
        message: '暂时无法连接服务商',
        retryable: false,
      })).finally(() => request.signal?.removeEventListener('abort', abort));
      return queue;
    },
  };
}

export function isTauriHostRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}
