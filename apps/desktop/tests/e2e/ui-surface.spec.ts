import { expect, test } from '@playwright/test';
import { connectProvider, openWorkbench, openWorkingFolders } from './helpers';

/**
 * UI-SURFACE-1：Chat/Work 控件面对标补齐。
 * - 已接线控件行为测试：失败轮次末位重试（流中失败 → Retry → 复用同一请求正文重新提交 → 落位替换）。
 * - 未开通态显式态测试：disabled + 诚实文案 + `data-state="unwired"` 可测标记。
 */

type StreamContext = { requestId: string; providerId: string; modelId: string };
type StreamFactory = (context: StreamContext) => AsyncIterable<unknown>;

async function installFailThenSucceedStream(page: import('@playwright/test').Page, successContent: string) {
  await page.evaluate((content) => {
    let attempt = 0;
    const hooks = (window as typeof window & {
      __courtworkChatHooks?: { setStreamFactory(factory: StreamFactory | null): void };
    }).__courtworkChatHooks;
    if (!hooks) throw new Error('chat stream hooks missing');
    hooks.setStreamFactory(async function* ({ requestId, providerId, modelId }) {
      attempt += 1;
      let seq = 0;
      yield { type: 'started', requestId, seq: seq++, providerId, modelId };
      if (attempt === 1) {
        yield { type: 'failed', requestId, seq, kind: 'network', message: '暂时无法连接服务商，请检查网络后重试', retryable: true };
        return;
      }
      yield { type: 'content_delta', requestId, seq: seq++, delta: content };
      yield { type: 'completed', requestId, seq, finishReason: 'stop' };
    });
  }, successContent);
}

test.describe('UI-SURFACE-1 · Chat 失败轮次重试', () => {
  test('末位失败轮次可 Retry：复用同一正文重新提交，落位替换旧失败态', async ({ page }) => {
    await openWorkbench(page);
    await connectProvider(page);
    await page.getByTestId('segment-chat').click();
    await installFailThenSucceedStream(page, '第二次真的成功了。');

    await page.getByTestId('composer-input').fill('触发一次失败再重试');
    await page.getByTestId('composer-send').click();

    const failed = page.getByTestId('chat-assistant-failed');
    await expect(failed).toBeVisible();
    await expect(failed.getByTestId('chat-turn-failure')).toContainText('暂时无法连接服务商');

    const retry = failed.getByTestId('chat-retry');
    await expect(retry).toBeVisible();
    await expect(retry).toBeEnabled();
    // Retry 是已接线控件，不得携带未开通标记
    await expect(retry).not.toHaveAttribute('data-state', 'unwired');

    await retry.click();

    // 旧失败态从存活视图退场（journal 内该 turn 记录不受影响，只是不再渲染），
    // 新一轮在同一位置落位为成功态。
    await expect(page.getByTestId('chat-assistant-failed')).toHaveCount(0);
    const succeeded = page.getByTestId('chat-assistant-message');
    await expect(succeeded).toBeVisible();
    await expect(succeeded).toContainText('第二次真的成功了');
    // 仍是唯一一条 assistant 消息：重试是「替换」不是「追加一条新回复」
    await expect(page.locator('[data-testid="chat-assistant-message"], [data-testid="chat-assistant-failed"]')).toHaveCount(1);

    // 顺带核验完成态 MessageActions 的两枚既有未开通态（本单补 data-state 标记，不改行为）
    const actions = succeeded.locator('[data-testid^="message-actions-"]');
    const readAloud = actions.getByRole('button', { name: 'Read aloud' });
    await expect(readAloud).toBeDisabled();
    await expect(readAloud).toHaveAttribute('title', 'Coming later');
    await expect(readAloud).toHaveAttribute('data-state', 'unwired');

    const more = actions.getByRole('button', { name: 'More message actions' });
    await expect(more).toBeDisabled();
    await expect(more).toHaveAttribute('title', 'Message fork editing comes later');
    await expect(more).toHaveAttribute('data-state', 'unwired');

    // 两枚未开通消息动作即使被强制派发点击，也不得产生弹层、toast 或本地反馈状态。
    const dialogsBefore = await page.getByRole('dialog').count();
    const feedbackBefore = await page.evaluate(() => window.localStorage.getItem('courtwork.message-feedback-ledger'));
    await readAloud.click({ force: true });
    await more.click({ force: true });
    await expect(page.getByRole('dialog')).toHaveCount(dialogsBefore);
    expect(await page.evaluate(() => window.localStorage.getItem('courtwork.message-feedback-ledger'))).toBe(feedbackBefore);
  });

  test('未在途且非末位失败轮次不提供 Retry', async ({ page }) => {
    await openWorkbench(page);
    await connectProvider(page);
    await page.getByTestId('segment-chat').click();
    await installFailThenSucceedStream(page, '不会用到。');

    // 第一条先失败；此时它仍是末位，Retry 应在场。
    await page.getByTestId('composer-input').fill('第一条');
    await page.getByTestId('composer-send').click();
    const failed = page.getByTestId('chat-assistant-failed');
    await expect(failed.getByTestId('chat-retry')).toBeVisible();

    // 再发送一条并成功落位，使第一条失败消息成为历史中段；此时不得继续暴露 Retry。
    await page.getByTestId('composer-input').fill('第二条');
    await page.getByTestId('composer-send').click();
    await expect(page.getByTestId('chat-assistant-message')).toContainText('不会用到。');
    await expect(failed.getByTestId('chat-retry')).toHaveCount(0);
  });
});

test.describe('UI-SURFACE-1 · Work 侧未开通态可测标记', () => {
  test('原件阅读入口（未接入）显式未开通：disabled + 诚实文案 + 可测标记', async ({ page }) => {
    await openWorkbench(page);
    await openWorkingFolders(page);
    const entries = page.getByTestId('reader-entry');
    await expect(entries).toHaveCount(3);
    // 第一条（设备采购合同）已接入；后两条（催告函/验收记录扫描件）显式未开通。
    const unwired = entries.filter({ hasText: '催告函' });
    await expect(unwired).toBeDisabled();
    await expect(unwired).toHaveAttribute('title', '阅读视图待接入');
    await expect(unwired).toHaveAttribute('data-state', 'unwired');
    const dialogsBefore = await page.getByRole('dialog').count();
    await unwired.click({ force: true });
    await expect(page.getByRole('dialog')).toHaveCount(dialogsBefore);
    await expect(unwired).toBeDisabled();

    const wired = entries.filter({ hasText: '设备采购合同' });
    await expect(wired).toBeEnabled();
    await expect(wired).not.toHaveAttribute('data-state', 'unwired');
  });
});
