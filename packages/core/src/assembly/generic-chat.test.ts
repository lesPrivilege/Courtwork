import { describe, expect, it } from 'vitest';
import { GENERIC_CHAT_SYSTEM_PROMPT, assembleGenericChatSystemPrompt } from './generic-chat.js';

/**
 * CHAT-MEMORY-1（ADR-013 §2）：memory 作为 generic-chat 的低频前缀段注入。
 * 本文件锁「加法式注入缝」的契约：无段等价旧行为（快照不动）；有段时基身份是稳定前缀
 * （不因注入 memory 而漂移），memory 追加其后、messages 之前——吃 provider 缓存红利。
 */
describe('generic-chat 组装（无 memory：向后兼容）', () => {
  it('无参调用逐字节等于常量（既有消费面快照不动）', () => {
    expect(assembleGenericChatSystemPrompt()).toBe(GENERIC_CHAT_SYSTEM_PROMPT);
  });

  it('空 memory 段等价无段（不落悬垂分隔符）', () => {
    expect(assembleGenericChatSystemPrompt('')).toBe(GENERIC_CHAT_SYSTEM_PROMPT);
    expect(assembleGenericChatSystemPrompt('   \n  ')).toBe(GENERIC_CHAT_SYSTEM_PROMPT);
  });
});

describe('generic-chat 组装（memory 低频前缀段）', () => {
  const MEMORY = '[长期记忆]\n- 记住：项目代号 Courtwork';

  it('基身份是稳定前缀：注入 memory 不动前缀字节', () => {
    const injected = assembleGenericChatSystemPrompt(MEMORY);
    // 基身份逐字节仍是结果的前缀——memory 变更只失效其后缓存，基前缀恒命中。
    expect(injected.startsWith(GENERIC_CHAT_SYSTEM_PROMPT)).toBe(true);
    expect(injected.slice(0, GENERIC_CHAT_SYSTEM_PROMPT.length)).toBe(GENERIC_CHAT_SYSTEM_PROMPT);
  });

  it('memory 段落于基身份之后（低频段追加，非改写前缀）', () => {
    expect(assembleGenericChatSystemPrompt(MEMORY)).toBe(`${GENERIC_CHAT_SYSTEM_PROMPT}\n\n${MEMORY}`);
  });

  it('同 memory 同字节（确定性组装）', () => {
    expect(assembleGenericChatSystemPrompt(MEMORY)).toBe(assembleGenericChatSystemPrompt(MEMORY));
  });

  it('不同 memory 只动基身份之后的尾字节', () => {
    const a = assembleGenericChatSystemPrompt('[长期记忆]\n- A');
    const b = assembleGenericChatSystemPrompt('[长期记忆]\n- B');
    expect(a.slice(0, GENERIC_CHAT_SYSTEM_PROMPT.length)).toBe(b.slice(0, GENERIC_CHAT_SYSTEM_PROMPT.length));
    expect(a).not.toBe(b);
  });
});
