import { expect, test, type Page } from '@playwright/test';
import { connectProvider, openWorkbench } from './helpers';

/**
 * PILOT-LIVE-2 F（P0 · 范式）：case 语境上传入库路由。
 *
 * 真机第二轮现象：Work 面 composer 上传文档被 PILOT-LIVE-1 A 的「切 chat 面承接」一并带进纯 chat
 * 附件流，未进入该案材料库/项目目录。目标路由律：grant 绑定语境下，composer 附件走材料入库链——
 * 经既有 grant 写授权落入已授权项目文件夹（host_write_file）→ 按 grant+relativePath 入库
 * （material-ingress 原班 ingest，provenance/hash 复验天然成立）→ 入卷宗列表、场景可消费；
 * 即时提问经既有正文链引用该材料（不重复上传）。chat 附件只保留无案/轻量语境。
 * 红线：A 的「正文必达模型」零回退（本谱含断言）；原件只读、同名不覆写（fail-closed 显式态）。
 */

const GRANT_ID = 'grant-pilot2-upload';
const NOTE_MD = '# 上传备注\n\nPILOT2-F-READING-7Q4X 正文段落。';
const READING_MARKER = 'PILOT2-F-READING-7Q4X';
const TEXT_MARKER = 'PILOT2-F-TEXT-7Q4X';

type HostAuthHooks = {
  reset(): void;
  setNextAuthorize(result: unknown): void;
  setNextWrite(result: unknown): void;
};
type MaterialHooks = { reset(): void; setFile(grantId: string, relativePath: string, bytes: Uint8Array): void };

async function resetHooks(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __courtworkHostAuth: HostAuthHooks; __courtworkMaterialHost: MaterialHooks };
    w.__courtworkHostAuth.reset();
    w.__courtworkMaterialHost.reset();
  });
}

async function createGrantCase(page: Page) {
  await page.evaluate((grantId) => {
    (window as unknown as { __courtworkHostAuth: HostAuthHooks }).__courtworkHostAuth.setNextAuthorize({
      status: 'granted',
      grant: { grantId, label: '上传路由案卷' },
    });
  }, GRANT_ID);
  await page.getByTestId('new-case-open').click();
  const dialog = page.getByTestId('new-case-dialog');
  await expect(dialog).toBeVisible();
  await page.getByTestId('new-case-authorize').click();
  await dialog.getByRole('button', { name: '创建案件' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId('demo-case-badge')).toHaveCount(0);
}

async function captureChatRequests(page: Page) {
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
      yield { type: 'content_delta', requestId, seq: 1, delta: '已收到上传的材料与说明。' };
      yield { type: 'completed', requestId, seq: 2, finishReason: 'stop' };
    });
  });
}

async function attachAndSend(page: Page, fileName: string, content: string) {
  await page.getByTestId('composer-file-input').setInputFiles({
    name: fileName,
    mimeType: 'text/markdown',
    buffer: Buffer.from(content),
  });
  await expect(page.locator('[data-testid^="attachment-chip-"]').first()).toHaveAttribute('data-status', 'ready', {
    timeout: 15_000,
  });
  await page.getByTestId('composer-input').fill(TEXT_MARKER);
  await page.getByTestId('composer-send').click();
}

test('F 主红证：grant 案 work 面上传 → 落入项目文件夹并入库（卷宗可见）+ 正文仍必达模型', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  await connectProvider(page);
  await captureChatRequests(page);
  await createGrantCase(page);

  // 授权域内写放行（真机=写入已授权项目文件夹；浏览器桩成功时镜像至材料宿主，与真宿主同盘一致）。
  await page.evaluate(() => {
    (window as unknown as { __courtworkHostAuth: HostAuthHooks }).__courtworkHostAuth.setNextWrite({
      status: 'wrote',
      byteLength: 1,
    });
  });

  await attachAndSend(page, '上传备注.md', NOTE_MD);

  // ① 入库路由红证：卷宗列表出现该件且 ready（修复前红——纯 chat 附件流，材料库零记录）。
  await expect(page.getByTestId('material-item').filter({ hasText: '上传备注.md' })).toHaveAttribute(
    'data-status',
    'ready',
    { timeout: 15_000 },
  );

  // ② A 零回退：正文经既有正文链必达模型（逐字 marker）。
  await expect(page.getByTestId('workspace')).toHaveAttribute('data-view-segment', 'chat');
  await expect(page.getByTestId('chat-assistant-message')).toBeVisible();
  const messages = await page.evaluate(
    () => (window as typeof window & { __capturedMessages?: Array<{ role: string; content: string }> }).__capturedMessages ?? [],
  );
  const userMessage = [...messages].reverse().find((message) => message.role === 'user');
  expect(userMessage?.content).toContain(READING_MARKER);
  expect(userMessage?.content).toContain(TEXT_MARKER);
});

test('F 幂等：同名同内容已在项目文件夹 → 跳过写入、就地入库（不重复上传）', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  await connectProvider(page);
  await captureChatRequests(page);
  await createGrantCase(page);

  // 同名同内容原件已在文件夹；写路径保持默认失败态——入库仍应成功即证明写入被跳过（幂等）。
  await page.evaluate(
    ({ grantId, content }) => {
      const bytes = new TextEncoder().encode(content);
      (window as unknown as { __courtworkMaterialHost: MaterialHooks }).__courtworkMaterialHost.setFile(
        grantId,
        '上传备注.md',
        bytes,
      );
    },
    { grantId: GRANT_ID, content: NOTE_MD },
  );

  await attachAndSend(page, '上传备注.md', NOTE_MD);

  await expect(page.getByTestId('material-item').filter({ hasText: '上传备注.md' })).toHaveAttribute(
    'data-status',
    'ready',
    { timeout: 15_000 },
  );
});

test('F 拒绝覆写：同名异内容 → 显式拒绝反馈，零写入零入库（原件只读红线）', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  await connectProvider(page);
  await captureChatRequests(page);
  await createGrantCase(page);

  await page.evaluate(
    ({ grantId }) => {
      const bytes = new TextEncoder().encode('# 完全不同的既有原件内容');
      (window as unknown as { __courtworkMaterialHost: MaterialHooks }).__courtworkMaterialHost.setFile(
        grantId,
        '上传备注.md',
        bytes,
      );
    },
    { grantId: GRANT_ID },
  );

  await attachAndSend(page, '上传备注.md', NOTE_MD);

  // 显式拒绝（发生了什么+下一步），不静默覆写、不入库。
  await expect(page.getByTestId('system-open-feedback')).toContainText('同名');
  await expect(page.getByTestId('material-item')).toHaveCount(0);
});
