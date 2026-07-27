import { expect, test, type Page } from '@playwright/test';
import { connectProvider, openWorkbench } from './helpers';

/**
 * DEBT-DOSSIER-1：入卷语义与材料计数同源。
 *
 * 件一（入库判据）：grant 案发送附件时，只有 `scope==='dossier'` 的 ready 附件进入既有
 * `ingestComposerUploads`；message-only 附件仍逐字进入本轮请求，但零写授权目录、零 MaterialStore 记录。
 * 修复前：grant 案把**全部** ready 上传一律入库——「存入卷宗」按不按都一样，那颗 badge 说的话不作数。
 *
 * 件二（计数同源）：CaseRail 件数、Working folders badge 与原件列表读同一份 `listForCase` 结果；
 * 未派生时显示「未统计」而非伪造 0。
 *
 * **已知边界（登记在 SPEC）**：现行 composer 的 `admitEntry` 每次只收一个附件
 * （`attachments.length === 0 && files.length === 1`），故「双 scope 附件同一条消息同发」在 UI 上
 * 结构性不可达；此处以同一案两次发送覆盖两侧，混合批的判据由 `case-ingest.test.ts` 单测穷举。
 */

const GRANT_ID = 'grant-debt-dossier';
const DOSSIER_MD = '# 存卷件\n\nDOSSIER-BODY-9K2M 正文段落。';
const MESSAGE_ONLY_MD = '# 随手问\n\nMESSAGE-ONLY-BODY-4T7P 正文段落。';

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
      grant: { grantId, label: '入卷判据案卷' },
    });
  }, GRANT_ID);
  await page.getByTestId('new-case-open').click();
  const dialog = page.getByTestId('new-case-dialog');
  await expect(dialog).toBeVisible();
  await page.getByTestId('new-case-authorize').click();
  await dialog.getByRole('button', { name: '创建案件' }).click();
  await expect(dialog).toBeHidden();
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
      const w = window as typeof window & { __capturedMessages?: unknown[] };
      w.__capturedMessages = [...(w.__capturedMessages ?? []), ...request.messages];
      yield { type: 'started', requestId, seq: 0, providerId, modelId };
      yield { type: 'content_delta', requestId, seq: 1, delta: '已收到。' };
      yield { type: 'completed', requestId, seq: 2, finishReason: 'stop' };
    });
  });
}

async function allowWrite(page: Page) {
  await page.evaluate(() => {
    (window as unknown as { __courtworkHostAuth: HostAuthHooks }).__courtworkHostAuth.setNextWrite({
      status: 'wrote',
      byteLength: 1,
    });
  });
}

async function attach(page: Page, fileName: string, content: string) {
  await page.getByTestId('composer-file-input').setInputFiles({
    name: fileName,
    mimeType: 'text/markdown',
    buffer: Buffer.from(content),
  });
  await expect(page.locator('[data-testid^="attachment-chip-"]').first()).toHaveAttribute('data-status', 'ready', {
    timeout: 15_000,
  });
}

async function commitToDossier(page: Page) {
  await page.locator('[data-testid^="attachment-scope-"]').first().click();
  await page.locator('[data-testid^="scope-confirm-"]').first().click();
  await expect(page.locator('[data-testid^="attachment-chip-"]').first()).toHaveAttribute('data-scope', 'dossier');
  await expect(page.locator('[data-testid^="attachment-scope-"]').first()).toHaveText('随本条存入卷宗');
}

async function send(page: Page, text: string) {
  await page.getByTestId('composer-input').fill(text);
  await page.getByTestId('composer-send').click();
  await expect(page.locator('[data-testid^="attachment-chip-"]')).toHaveCount(0);
}

async function capturedUserContent(page: Page): Promise<string> {
  const messages = await page.evaluate(
    () => (window as typeof window & { __capturedMessages?: Array<{ role: string; content: string }> }).__capturedMessages ?? [],
  );
  return messages
    .filter((message) => message.role === 'user')
    .map((message) => message.content)
    .join('\n');
}

test('件一：message-only 附件零入库但正文必达；同案 dossier 附件恰一件入库', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  await connectProvider(page);
  await captureChatRequests(page);
  await createGrantCase(page);
  await allowWrite(page);

  // ① message-only（不点「存入卷宗」）：修复前此件也会入库——本断言即红证。
  await attach(page, '随手问.md', MESSAGE_ONLY_MD);
  await expect(page.locator('[data-testid^="attachment-chip-"]').first()).toHaveAttribute('data-scope', 'message_only');
  await send(page, '这份先不入卷，只想问一句。');
  await expect(page.getByTestId('work-chat-assistant-message').first()).toBeVisible();
  await expect(page.getByTestId('material-item')).toHaveCount(0);
  expect(await capturedUserContent(page)).toContain('MESSAGE-ONLY-BODY-4T7P');

  // ② 同一案改点「存入卷宗」：入库恰一件，且入的正是这一件。
  await allowWrite(page);
  await attach(page, '存卷件.md', DOSSIER_MD);
  await commitToDossier(page);
  await send(page, '这份请存入卷宗。');
  await expect(page.getByTestId('material-item')).toHaveCount(1, { timeout: 15_000 });
  await expect(page.getByTestId('material-item').first()).toContainText('存卷件.md');
  expect(await capturedUserContent(page)).toContain('DOSSIER-BODY-9K2M');
});

test('件二：三处件数读同一份 listForCase——CaseRail / Working folders / 原件列表逐件同源', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  await connectProvider(page);
  await captureChatRequests(page);
  await createGrantCase(page);

  // 入库前：件数为 0（已派生），不是「未统计」，也不是别处硬编码的 '0'。
  await expect(page.getByTestId('case-file-count').last()).toHaveText('卷宗 0 件');

  await allowWrite(page);
  await attach(page, '存卷件.md', DOSSIER_MD);
  await commitToDossier(page);
  await send(page, '存入卷宗。');

  await expect(page.getByTestId('material-item')).toHaveCount(1, { timeout: 15_000 });
  await expect(page.getByTestId('case-file-count').last()).toHaveText('卷宗 1 件');
  await expect(page.getByTestId('module-working-folders-toggle')).toContainText('1');
  // 原件列表条数即真源条数——三处同为 1 件（badge 与 listForCase 脱钩即在此翻红）。
  await expect(page.getByTestId('material-item')).toHaveCount(1);
});

test('件二：demo 固定计数与 production 派生物理分流——样板案不查生产 store', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);

  // 样板案的件数来自内置内容包常量，与 MaterialStore 无关（reset 后 store 为空仍是 20 件）。
  await expect(page.getByTestId('case-file-count').first()).toHaveText('卷宗 20 件');
  await expect(page.getByTestId('materials-zone')).toHaveCount(0);
});

/**
 * 本例锁的是**件数分格**：两案件数并存且互不串数（共享单一计数即翻红）。
 * 它**不**证明「逐案派生」——甲案的清单在它被选中时已由入库回灌落格，切走后仍在，
 * 故把派生面缩到「只有选中案」本例照样绿（已实测）。逐案派生由
 * `material-count.test.ts` 的 `casesNeedingMaterialCount` 单测把守（缩面即红）；
 * 浏览器桩的材料宿主是内存态、reload 即清，跨重启多案计数在 e2e 层结构性不可观测（登记在 SPEC）。
 */
test('件二：多案件数分格——甲案入库不改乙案件数，两案并存互不串数', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  await connectProvider(page);
  await captureChatRequests(page);

  // 甲案：入库一件。
  await createGrantCase(page);
  await allowWrite(page);
  await attach(page, '甲案存卷件.md', DOSSIER_MD);
  await commitToDossier(page);
  await send(page, '存入卷宗。');
  await expect(page.getByTestId('material-item')).toHaveCount(1, { timeout: 15_000 });

  // 乙案：另起一案，零入库。
  await page.evaluate(() => {
    (window as unknown as { __courtworkHostAuth: HostAuthHooks }).__courtworkHostAuth.setNextAuthorize({
      status: 'granted',
      grant: { grantId: 'grant-debt-dossier-2', label: '第二案卷' },
    });
  });
  await page.getByTestId('new-case-open').click();
  const dialog = page.getByTestId('new-case-dialog');
  await page.getByTestId('new-case-authorize').click();
  await dialog.getByRole('button', { name: '创建案件' }).click();
  await expect(dialog).toBeHidden();

  // 两案件数各自成立：非选中案的件数此前恒为 0（只有选中案查过 store），本断言即那条缺口的红证。
  const counts = page.getByTestId('case-file-count');
  await expect(counts.filter({ hasText: '卷宗 1 件' })).toHaveCount(1);
  await expect(counts.filter({ hasText: '卷宗 0 件' })).toHaveCount(1);
});
