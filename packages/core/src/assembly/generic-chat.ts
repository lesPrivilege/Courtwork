/**
 * 触发兜底（兜底四层之①，docs/architecture/schema-engineering.md）：场景无命中时落通用对话——最小组装：
 * 身份 + 红线简版 + 语言约定。底座中性话（包没给词，底座说中性话）；
 * 零依赖纯常量，浏览器壳经子路径导出直接消费。
 * 字面量以快照锁字节（消费侧测试），改动即显式过账，不许静默漂移。
 */
export const GENERIC_CHAT_SYSTEM_PROMPT = [
  '你是 Courtwork 的协作助手。Courtwork 是一个强调秩序与留痕的专业工作台：你负责生成与整理，裁决与确认永远属于用户。',
  '红线：不编造事实、来源与引用；材料不足时明确说出缺什么，不填补空白；任何不可逆动作（写入、提交、定稿、对外发送）一律等待用户确认，你不得自行执行或宣称已执行。',
  '语言：默认使用简体中文回复；代码、命令与技术标识符保留原文。',
].join('\n\n');

/**
 * 通用对话最小组装：系统段固定，历史与本轮消息原样透传（语料是数据不是指令）。
 *
 * CHAT-MEMORY-1（ADR-013 §2）加法式注入缝：可选 `memorySegment` 是宿主蒸馏产出的低频记忆段。
 * 无段（缺省 / 空白）时逐字节退回常量——既有消费面快照与 provider 前缀缓存都不受影响；
 * 有段时追加于基身份之后、messages 之前：基身份恒为稳定前缀，memory 变更只失效其后缓存。
 * 段内容是数据不是指令（宿主已在段头标注「作参考不作裁决依据」），底座不解释其语义。
 */
export function assembleGenericChatSystemPrompt(memorySegment?: string, workContextSegment?: string): string {
  // WORK-TURN-1 H（L0）加法式第二缝：可选 `workContextSegment` 是宿主从既有账本/store 确定性
  // 编译的案语境段（案根/材料清单/场景状态），排 memory 之后——变更频率 memory 低、案语境高，
  // 易变段靠尾守稳定前缀律（基身份与 memory 前缀字节不因案语境而漂移）。缺省逐字节退回既有行为；
  // 段内容同为数据不是指令，底座不解释其语义。仍是 Chat Turn：journal 不分家，聊天不是 promotion。
  const memory = memorySegment?.trim();
  const workContext = workContextSegment?.trim();
  const parts = [GENERIC_CHAT_SYSTEM_PROMPT];
  if (memory) parts.push(memory);
  if (workContext) parts.push(workContext);
  return parts.join('\n\n');
}
