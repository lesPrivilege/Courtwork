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

describe('generic-chat 组装（workContextSegment 案语境段，WORK-TURN-1 L0）', () => {
  const MEMORY = '[长期记忆]\n- 记住：项目代号 Courtwork';
  const WORK = '[案件语境]\n案根：《合成卷宗》\n卷宗材料（2 件）';

  it('缺省逐字节不变：只传 memory 与旧签名字节等同（既有消费面零影响）', () => {
    expect(assembleGenericChatSystemPrompt(MEMORY)).toBe(`${GENERIC_CHAT_SYSTEM_PROMPT}\n\n${MEMORY}`);
    expect(assembleGenericChatSystemPrompt()).toBe(GENERIC_CHAT_SYSTEM_PROMPT);
    expect(assembleGenericChatSystemPrompt(undefined, '')).toBe(GENERIC_CHAT_SYSTEM_PROMPT);
    expect(assembleGenericChatSystemPrompt(undefined, '  \n ')).toBe(GENERIC_CHAT_SYSTEM_PROMPT);
  });

  it('案语境段排 memory 之后（更易变段靠尾，稳定前缀律：memory 前缀字节不因 work 段而漂移）', () => {
    const both = assembleGenericChatSystemPrompt(MEMORY, WORK);
    expect(both).toBe(`${GENERIC_CHAT_SYSTEM_PROMPT}\n\n${MEMORY}\n\n${WORK}`);
    const memoryOnlyPrefix = assembleGenericChatSystemPrompt(MEMORY);
    expect(both.startsWith(memoryOnlyPrefix)).toBe(true);
  });

  it('无 memory 有案语境：段直接落基身份之后（不落悬垂分隔符）', () => {
    expect(assembleGenericChatSystemPrompt(undefined, WORK)).toBe(`${GENERIC_CHAT_SYSTEM_PROMPT}\n\n${WORK}`);
  });

  it('同输入同字节（确定性组装，禁模型参与的机器形态）', () => {
    expect(assembleGenericChatSystemPrompt(MEMORY, WORK)).toBe(assembleGenericChatSystemPrompt(MEMORY, WORK));
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
