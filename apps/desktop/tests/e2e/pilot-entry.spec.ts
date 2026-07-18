import { expect, test, type Page } from '@playwright/test';
import { connectProvider, createNamedCase, openWorkbench } from './helpers';

/**
 * PILOT-LIVE-1 A + C：真机首轮试点缺陷修复的红证谱。
 *
 * A：welcome / work 段 composer 此前只做 localMessages 纯回显（demo 排队分支之外），非 demo 案
 * 发送从不触达模型——真机用户在 work 画布发消息+附件，气泡与 chip 正常渲染，但 chat 段追问时
 * 模型答"你还没有上传任何文件"。本谱主红证验证：非 demo 案 work 段 composer 发送即走真实请求链
 * （assembleRequestContent 组装）。WORK-TURN-2 起回复留在 Work 面，不能再路由到 chat 面。
 *
 * C：NewCaseDialog 授权建案与 welcome/demo 态 composer-plus-folder 两处只绑 grant 不入库，
 * 用户建案/授权后仍见空卷宗，需再点一次「Add folder」才触发入库。本谱验证建案 on-bind 自动入库。
 */

type HostAuthHooks = { reset(): void; setNextAuthorize(result: unknown): void };
type MaterialHooks = { reset(): void; setFile(grantId: string, relativePath: string, bytes: Uint8Array): void };

async function resetHooks(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __courtworkHostAuth: HostAuthHooks; __courtworkMaterialHost: MaterialHooks };
    w.__courtworkHostAuth.reset();
    w.__courtworkMaterialHost.reset();
  });
}

async function setNextAuthorize(page: Page, result: unknown) {
  await page.evaluate((next) => {
    (window as unknown as { __courtworkHostAuth: HostAuthHooks }).__courtworkHostAuth.setNextAuthorize(next);
  }, result);
}

async function setFile(page: Page, grantId: string, relativePath: string, text: string) {
  await page.evaluate(
    ({ grantId: gid, path, content }) => {
      const bytes = new TextEncoder().encode(content);
      (window as unknown as { __courtworkMaterialHost: MaterialHooks }).__courtworkMaterialHost.setFile(gid, path, bytes);
    },
    { grantId, path: relativePath, content: text },
  );
}

const READING_MARKER = 'PILOT-A-READING-9K2M';
const TEXT_MARKER = 'PILOT-A-TEXT-9K2M';

test('A 主红证：非 demo 案 Work composer 发送携附件正文走真实请求，并在 Work 面承接回复', async ({ page }) => {
  await openWorkbench(page);
  await connectProvider(page);

  // 捕获真实请求体（同 chat-material.spec.ts 手法：从 __courtworkChatHooks 樁截 request.messages）。
  await page.evaluate(() => {
    type Message = { role: string; content: string };
    type Ctx = { request: { messages: Message[] }; requestId: string; providerId: string; modelId: string };
    const hooks = (window as typeof window & {
      __courtworkChatHooks?: { setStreamFactory(factory: ((context: Ctx) => AsyncIterable<unknown>) | null): void };
    }).__courtworkChatHooks;
    if (!hooks) throw new Error('chat hooks missing');
    hooks.setStreamFactory(async function* ({ request, requestId, providerId, modelId }) {
      (window as typeof window & { __capturedMessages?: unknown }).__capturedMessages = request.messages;
      yield { type: 'started', requestId, seq: 0, providerId, modelId };
      yield { type: 'content_delta', requestId, seq: 1, delta: '已收到你的附件与说明。' };
      yield { type: 'completed', requestId, seq: 2, finishReason: 'stop' };
    });
  });

  // 非 demo 案，建成即落 work 段（createCase 恒切 work）。
  await createNamedCase(page, 'PILOT-A 真实案');
  await expect(page.getByTestId('workspace')).toHaveAttribute('data-view-segment', 'work');
  await expect(page.getByTestId('demo-case-badge')).toHaveCount(0);

  await page.getByTestId('composer-file-input').setInputFiles({
    name: 'note.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(`# 附件说明\n\n${READING_MARKER}`),
  });
  const chip = page.locator('[data-testid^="attachment-chip-"]').first();
  await expect(chip).toHaveAttribute('data-status', 'ready', { timeout: 15_000 });

  await page.getByTestId('composer-input').fill(TEXT_MARKER);
  await page.getByTestId('composer-send').click();

  // ② WORK-TURN-2：Work 发送不切 chat 面。
  await expect(page.getByTestId('workspace')).toHaveAttribute('data-view-segment', 'work');
  // ③ 回复可见（证明请求真正发出且被处理，而非纯回显）。
  await expect(page.getByTestId('work-chat-assistant-message')).toBeVisible();

  // ① 捕获的请求 messages 末条 user content 含附件正文 + 用户文本逐字（assembleRequestContent 同源组装）。
  const messages = await page.evaluate(
    () => (window as typeof window & { __capturedMessages?: Array<{ role: string; content: string }> }).__capturedMessages ?? [],
  );
  const userMessage = [...messages].reverse().find((message) => message.role === 'user');
  expect(userMessage?.content).toContain(READING_MARKER);
  expect(userMessage?.content).toContain(TEXT_MARKER);
});

test('C2：NewCaseDialog 授权建案 → 材料随建案自动入库，无需再点一次 Add folder', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  const grantId = 'grant-pilot-c2-bind';

  // 先落地原件，再授权建案——验证「建案 on-bind」即触发入库（而非只有二次点击 Add folder 才入库）。
  await setFile(page, grantId, '委托合同.md', '# 委托合同\n\n第一条 概况。');
  await setNextAuthorize(page, { status: 'granted', grant: { grantId, label: '委托案卷' } });

  await page.getByTestId('new-case-open').click();
  const dialog = page.getByTestId('new-case-dialog');
  await expect(dialog).toBeVisible();
  await page.getByTestId('new-case-authorize').click();
  await dialog.getByRole('button', { name: '创建案件' }).click();
  await expect(dialog).toBeHidden();

  // 未点 composer-plus-folder，material-item 应直接 ready。
  await expect(page.getByTestId('material-item').filter({ hasText: '委托合同.md' }))
    .toHaveAttribute('data-status', 'ready', { timeout: 15_000 });
});

test('C2：welcome 态 composer-plus-folder 授权 → 自动建案 + 选中 + 材料入库（非只 toast 留悬空 grant）', async ({ page }) => {
  await page.goto('/');
  await resetHooks(page);
  // 真·欢迎态：无对话框、无选中案（page.goto 冷启不自动打开引导卡或选中样板案）。
  await expect(page.getByTestId('composer-case')).toContainText('Choose case');

  const grantId = 'grant-pilot-c2-welcome';
  await setFile(page, grantId, '委托合同.md', '# 委托合同\n\n第一条 概况。');
  await setNextAuthorize(page, { status: 'granted', grant: { grantId, label: '欢迎态案卷' } });

  await page.getByTestId('composer-plus').first().click();
  await page.getByTestId('composer-plus-folder').first().click();

  // 新案入栏并选中（案名取 grant label），不再是"只 toast、grant 悬空"。
  await expect(page.getByTestId('titlebar-case-title')).toContainText('欢迎态案卷');
  await expect(page.getByTestId('demo-case-badge')).toHaveCount(0);
  await expect(page.getByTestId('material-item').filter({ hasText: '委托合同.md' }))
    .toHaveAttribute('data-status', 'ready', { timeout: 15_000 });
});
