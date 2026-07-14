import { describe, expect, it } from 'vitest';
import app from '../App.tsx?raw';
import main from '../main.tsx?raw';
import turnCard from './TurnCard.tsx?raw';
import chatClient from '../provider/chat-client.ts?raw';

describe('CHAT-UI-1 static boundaries', () => {
  it('App/TurnCard 不含垂类问题、选项或 template 字段表', () => {
    const genericSurface = `${app}\n${turnCard}`;
    expect(genericSurface).not.toContain('是否继续聚焦付款与验收条款');
    expect(genericSurface).not.toContain('focus-payment-acceptance');
    expect(genericSurface).not.toContain('legal.risk-evidence-confirmation');
    expect(genericSurface).not.toMatch(/options=\{\[\s*\{\s*(?:value|id):/);
  });

  it('chat 实际路径没有 Typewriter、fake timer 或最终结果 responder', () => {
    expect(app).not.toContain("./chat/Typewriter");
    expect(app).not.toContain('<Typewriter');
    expect(chatClient).not.toContain('ChatTurnResult');
    expect(chatClient).not.toContain('setResponder');
    expect(chatClient).not.toMatch(/provider\.generate\s*\(/);
  });

  it('desktop turn 客户端只从 browser-safe core subpath 消费协议', () => {
    expect(chatClient).toContain("@courtwork/core/turn-protocol");
    expect(chatClient).not.toMatch(/@courtwork\/core(?:['"]|\/src)/);
    expect(chatClient).not.toContain('replayTurnEntries');
  });

  it('chat 业务编排不依赖 Tauri host API 或 Rust command 名', () => {
    expect(chatClient).not.toContain('@tauri-apps/api');
    expect(chatClient).not.toMatch(/\b(?:Channel|invoke)\b/);
    expect(chatClient).not.toMatch(/provider_chat_request|cancel_provider_request/);
  });

  it('desktop composition root 只在 Tauri runtime 注入 provider transport', () => {
    expect(main).toContain('isTauriHostRuntime() ? createTauriProviderTransport() : undefined');
    expect(main).toContain('<App providerTransport={providerTransport} />');
    expect(app).toContain('providerTransport?: ProviderTransport');
    expect(app).toContain('transport: providerTransport');
  });
});
