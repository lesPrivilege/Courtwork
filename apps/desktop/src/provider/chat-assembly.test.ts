import { describe, expect, it } from 'vitest';
import { assembleChatSystemPrompt, CHAT_SYSTEM_PROMPT } from './chat-assembly';

describe('chat 面最小组装（批次七①）', () => {
  it('三件齐：身份声明 / 红线简版 / 语言约定', () => {
    const prompt = assembleChatSystemPrompt();
    expect(prompt).toContain('Courtwork 的协作助手');
    expect(prompt).toContain('红线');
    expect(prompt).toContain('不编造事实');
    expect(prompt).toContain('等待用户确认');
    expect(prompt).toContain('简体中文');
  });

  it('系统段字节稳定：改动必须显式过账（快照锁）', () => {
    expect(CHAT_SYSTEM_PROMPT).toMatchInlineSnapshot(`
      "你是 Courtwork 的协作助手。Courtwork 是一个强调秩序与留痕的专业工作台：你负责生成与整理，裁决与确认永远属于用户。

      红线：不编造事实、来源与引用；材料不足时明确说出缺什么，不填补空白；任何不可逆动作（写入、提交、定稿、对外发送）一律等待用户确认，你不得自行执行或宣称已执行。

      语言：默认使用简体中文回复；代码、命令与技术标识符保留原文。"
    `);
  });

  it('组装函数与常量同源（无第二真源）', () => {
    expect(assembleChatSystemPrompt()).toBe(CHAT_SYSTEM_PROMPT);
  });
});
