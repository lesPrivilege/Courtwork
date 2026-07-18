import { expect, test, type Page } from '@playwright/test';
import { connectProvider, installChatStream, openWorkbench } from './helpers';

/**
 * PILOT-LIVE-2 E（P1）：回复折叠纪律。
 *
 * 真机第二轮现象：最新回复正文中段被自动折叠置灰（表格截半、Show more）——阅读主体被截，
 * 非用户主动收起。裁定：最新回复默认全文展开；折叠仅限历史轮次且显式展开态；表格/结构块不得截半。
 * 折叠机制出处：RP-2.11 ⑧ CollapsibleMessage（行数阈值 clamp + 渐隐遮罩 + Show more），
 * App 对全部助手回复（含最新）statically lines=12 包裹——本谱红证其对最新回复的误伤。
 */

const TAIL_MARKER = 'PILOT2-E-TAIL-3Z8R';
const TABLE_ROWS = Array.from({ length: 16 }, (_, i) => `| 条目 ${i + 1} | 说明列 ${i + 1} |`).join('\n');
const LONG_REPLY = [
  '首段结论。',
  '',
  '| 列甲 | 列乙 |',
  '| --- | --- |',
  TABLE_ROWS,
  '',
  '表后补充段落一。',
  '表后补充段落二。',
  `结尾锚段 ${TAIL_MARKER}。`,
].join('\n');

async function enterChat(page: Page) {
  await openWorkbench(page);
  await connectProvider(page);
  await page.getByTestId('segment-chat').click();
  await expect(page.getByTestId('workspace')).toHaveAttribute('data-view-segment', 'chat');
}

async function sendAndSettle(page: Page, text: string) {
  await page.getByTestId('composer-input').fill(text);
  await page.getByTestId('composer-send').click();
  await expect(page.getByTestId('chat-assistant-message').last()).toHaveAttribute('data-status', 'completed');
}

test('最新回复默认全文展开：长回复（含表格）不得出现折叠（红证）', async ({ page }) => {
  await enterChat(page);
  await installChatStream(page, { content: LONG_REPLY });
  await sendAndSettle(page, '请给出完整清单。');

  const latest = page.getByTestId('chat-assistant-message').last();
  // 最新回复零折叠：无 Show more 钮、无折叠容器（裸全文渲染），结尾锚段真实可见。
  await expect(latest.getByTestId('collapse-toggle')).toHaveCount(0);
  await expect(latest.getByTestId('collapsible-message')).toHaveCount(0);
  await expect(latest.getByText(new RegExp(TAIL_MARKER))).toBeVisible();
});

test('历史回复折叠可展开回看，且折叠裁线不得截半表格（块界对齐）', async ({ page }) => {
  await enterChat(page);
  await installChatStream(page, { content: LONG_REPLY });
  await sendAndSettle(page, '请给出完整清单。');
  await installChatStream(page, { content: '第二轮简短回复。' });
  await sendAndSettle(page, '继续。');

  const history = page.getByTestId('chat-assistant-message').first();
  const collapsed = history.getByTestId('collapsible-message').last();
  await expect(collapsed).toHaveAttribute('data-overflowing', 'true');

  // 块界对齐：折叠态可视裁窗必须完整容纳跨裁线的结构块（不得截半）。
  // CHAT-MD-TABLE-1 落地前 ChatMarkdown 刻意不渲染 <table>（宁缺毋滥条款）——管道表格落为
  // 单个多行段落块，结构单元即该 <p>。CHAT-MD-TABLE-1 已扩表格渲染：本谱的管道表格 fixture
  // 现落为真实 <table>（.md-table-wrap 包裹）；块界算法本通用于 .chat-markdown 任意直接子
  // 节点（不认标签名），零改动天然覆盖新结构块——下方 isTableBlock 断言实证覆盖生效。
  const intact = await collapsed.evaluate((root) => {
    const body = root.querySelector('.collapsible-body');
    const block = [...root.querySelectorAll('.chat-markdown > *')].find((el) => el.textContent?.includes('条目 1'));
    if (!body || !block) return { hasBlock: false, isTableBlock: false, intact: false, peekPx: 0 };
    const clip = body.getBoundingClientRect();
    const rect = block.getBoundingClientRect();
    return {
      hasBlock: true,
      isTableBlock: block.querySelector('table') !== null,
      intact: rect.bottom <= clip.bottom + 1,
      peekPx: clip.bottom - rect.bottom,
    };
  });
  expect(intact.hasBlock).toBe(true);
  expect(intact.isTableBlock).toBe(true);
  expect(intact.intact).toBe(true);
  expect(intact.peekPx).toBeGreaterThanOrEqual(48);

  // 显式展开态：Show more → 全文（结尾锚段可见）→ Show less 收回。
  const toggle = history.getByTestId('collapse-toggle');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(history.getByText(new RegExp(TAIL_MARKER))).toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('发送在途窗口：running assistant 不抢 latest 席位，上一条完整回复不瞬时坍缩', async ({ page }) => {
  await enterChat(page);
  await installChatStream(page, { content: LONG_REPLY });
  await sendAndSettle(page, '请给出完整清单。');
  await page.evaluate(() => {
    type Ctx = { requestId: string; providerId: string; modelId: string };
    const scope = window as typeof window & {
      __courtworkChatHooks?: { setStreamFactory(factory: ((context: Ctx) => AsyncIterable<unknown>) | null): void };
      __resolvePilot2Pending?: () => void;
    };
    scope.__courtworkChatHooks?.setStreamFactory(async function* ({ requestId, providerId, modelId }) {
      yield { type: 'started', requestId, seq: 0, providerId, modelId };
      await new Promise<void>((resolve) => { scope.__resolvePilot2Pending = resolve; });
      yield { type: 'content_delta', requestId, seq: 1, delta: '第二轮完成。' };
      yield { type: 'completed', requestId, seq: 2, finishReason: 'stop' };
    });
  });
  await page.getByTestId('composer-input').fill('继续。');
  await page.getByTestId('composer-send').click();
  await expect(page.getByTestId('composer-send')).toBeDisabled();
  const previous = page.getByTestId('chat-assistant-message').first();
  await expect(previous.getByTestId('collapsible-message')).toHaveCount(0);
  await expect(previous.getByText(new RegExp(TAIL_MARKER))).toBeVisible();
  await page.evaluate(() => (window as typeof window & { __resolvePilot2Pending?: () => void }).__resolvePilot2Pending?.());
  await expect(page.getByTestId('chat-assistant-message').last()).toHaveAttribute('data-status', 'completed');
});
