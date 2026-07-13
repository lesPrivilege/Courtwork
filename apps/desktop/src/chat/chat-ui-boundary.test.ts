import { describe, expect, it } from 'vitest';
import app from '../App.tsx?raw';
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
});
