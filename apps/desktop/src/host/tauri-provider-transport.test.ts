import { describe, expect, it, vi } from 'vitest';
import type {
  ProviderTransportEvent,
  ProviderTransportRequest,
} from '@courtwork/provider/types';
import {
  createTauriProviderTransport,
  type HostEventChannel,
  type TauriProviderTransportDependencies,
} from './tauri-provider-transport';

function request(signal?: AbortSignal): ProviderTransportRequest {
  return {
    requestId: 'request-1',
    providerId: 'deepseek',
    modelId: 'deepseek-v4-pro',
    reasoningBody: { thinking: { type: 'enabled' } },
    body: '{"stream":true}',
    ...(signal ? { signal } : {}),
  };
}

async function collect(iterable: AsyncIterable<ProviderTransportEvent>) {
  const events: ProviderTransportEvent[] = [];
  for await (const event of iterable) events.push(event);
  return events;
}

function fakeHost(
  invoke: TauriProviderTransportDependencies['invoke'],
) {
  const channel: HostEventChannel<ProviderTransportEvent> = { onmessage: () => undefined };
  const dependencies: TauriProviderTransportDependencies = {
    invoke,
    createChannel<T>() {
      return channel as HostEventChannel<T>;
    },
  };
  return { channel, dependencies };
}

describe('Tauri provider transport adapter', () => {
  it('forwards the unchanged narrow input and streams raw host events', async () => {
    const invoke = vi.fn<TauriProviderTransportDependencies['invoke']>(async (command, args) => {
      expect(command).toBe('provider_chat_request');
      expect(args).toEqual({
        input: {
          requestId: 'request-1',
          providerId: 'deepseek',
          modelId: 'deepseek-v4-pro',
          reasoningBody: { thinking: { type: 'enabled' } },
          body: '{"stream":true}',
        },
        onEvent: expect.any(Object),
      });
      const channel = args?.onEvent as HostEventChannel<ProviderTransportEvent>;
      channel.onmessage({ type: 'response_started', requestId: 'request-1', status: 200, contentType: 'text/event-stream' });
      channel.onmessage({ type: 'chunk', requestId: 'request-1', bytes: [100, 97, 116, 97] });
      channel.onmessage({ type: 'end', requestId: 'request-1' });
    });
    const { dependencies } = fakeHost(invoke);

    await expect(collect(createTauriProviderTransport(dependencies).stream(request()))).resolves.toEqual([
      { type: 'response_started', requestId: 'request-1', status: 200, contentType: 'text/event-stream' },
      { type: 'chunk', requestId: 'request-1', bytes: [100, 97, 116, 97] },
      { type: 'end', requestId: 'request-1' },
    ]);
    expect(invoke).toHaveBeenCalledOnce();
  });

  it('maps AbortSignal to the existing cancel command for the same request id', async () => {
    let releaseRequest!: () => void;
    const requestPending = new Promise<void>((resolve) => { releaseRequest = resolve; });
    const invoke = vi.fn<TauriProviderTransportDependencies['invoke']>(async (command) => {
      if (command === 'provider_chat_request') await requestPending;
    });
    const { channel, dependencies } = fakeHost(invoke);
    const controller = new AbortController();
    const pending = collect(createTauriProviderTransport(dependencies).stream(request(controller.signal)));

    controller.abort();
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith('cancel_provider_request', { requestId: 'request-1' }));
    channel.onmessage({ type: 'end', requestId: 'request-1' });
    releaseRequest();
    await expect(pending).resolves.toEqual([{ type: 'end', requestId: 'request-1' }]);
  });

  it('turns invoke rejection into the typed non-retryable network failure', async () => {
    const invoke = vi.fn<TauriProviderTransportDependencies['invoke']>(async () => {
      throw new Error('host unavailable');
    });
    const { dependencies } = fakeHost(invoke);

    await expect(collect(createTauriProviderTransport(dependencies).stream(request()))).resolves.toEqual([{
      type: 'failed',
      requestId: 'request-1',
      kind: 'network',
      message: '暂时无法连接服务商',
      retryable: false,
    }]);
  });
});
