import { expect, test, type Page } from '@playwright/test';
import { openWorkbench } from './helpers';

/**
 * MATERIAL-INGRESS-1：Composer「Add folder」就地入库真实原件（原件原地不动、只读），
 * provider 前重验（核验）在原件漂移/删除时显式阻断。
 *
 * 浏览器 E2E 无原生 picker / 文件系统：授权由 `window.__courtworkHostAuth` 设定，
 * 就地原件字节由 `window.__courtworkMaterialHost` 内存宿主承载（DEV+E2E only）。
 * 断言只认结构化 `data-status` 与可见文案，且原件区绝无绝对路径。
 */

const GRANT_ID = 'grant-mi1';
const NO_ABSOLUTE_PATH = /[/\\]Users[/\\]|[/\\]private[/\\]|[A-Za-z]:\\/;

type HostAuthHooks = { reset(): void; setNextAuthorize(result: unknown): void };
type MaterialHooks = {
  reset(): void;
  setFile(grantId: string, relativePath: string, bytes: Uint8Array): void;
  deleteFile(grantId: string, relativePath: string): void;
};

async function resetHooks(page: Page) {
  await page.evaluate(() => {
    (window as unknown as { __courtworkHostAuth: HostAuthHooks }).__courtworkHostAuth.reset();
    (window as unknown as { __courtworkMaterialHost: MaterialHooks }).__courtworkMaterialHost.reset();
  });
}

async function setNextAuthorize(page: Page, result: unknown) {
  await page.evaluate((next) => {
    (window as unknown as { __courtworkHostAuth: HostAuthHooks }).__courtworkHostAuth.setNextAuthorize(next);
  }, result);
}

async function setFile(page: Page, relativePath: string, text: string) {
  await page.evaluate(
    ({ grantId, path, content }) => {
      const bytes = new TextEncoder().encode(content);
      (window as unknown as { __courtworkMaterialHost: MaterialHooks }).__courtworkMaterialHost.setFile(grantId, path, bytes);
    },
    { grantId: GRANT_ID, path: relativePath, content: text },
  );
}

async function deleteFile(page: Page, relativePath: string) {
  await page.evaluate(
    ({ grantId, path }) => {
      (window as unknown as { __courtworkMaterialHost: MaterialHooks }).__courtworkMaterialHost.deleteFile(grantId, path);
    },
    { grantId: GRANT_ID, path: relativePath },
  );
}

/** 建一个绑定到 GRANT_ID 的真实案（NewCaseDialog 经宿主原生 picker）。 */
async function createGrantCase(page: Page) {
  await page.getByTestId('new-case-open').click();
  await expect(page.getByTestId('new-case-dialog')).toBeVisible();
  await setNextAuthorize(page, { status: 'granted', grant: { grantId: GRANT_ID, label: '案卷夹' } });
  await page.getByTestId('new-case-authorize').click();
  await page.getByTestId('new-case-dialog').getByRole('button', { name: '创建案件' }).click();
  await expect(page.getByTestId('new-case-dialog')).toBeHidden();
  await expect(page.getByTestId('demo-case-badge')).toHaveCount(0);
}

/** Composer「+」→「Add folder」→ 就地入库授权文件夹的原件。 */
async function addFolderIngest(page: Page) {
  await setNextAuthorize(page, { status: 'granted', grant: { grantId: GRANT_ID, label: '案卷夹' } });
  await page.getByTestId('composer-plus').first().click();
  await page.getByTestId('composer-plus-folder').first().click();
}

test('Add folder 就地入库：真实原件按状态入卷，源中立无绝对路径', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  await createGrantCase(page);

  // 就地原件：一份可读 md（→ ready）、一张图片（→ needs_ocr，本单只阻断不做 OCR）
  await setFile(page, '设备采购合同.md', '# 设备采购合同\n\n第一条 付款：买方验收后 30 日内付清。\n\n第二条 验收标准。');
  await setFile(page, '公章页.png', 'PNG-BYTES-NO-TEXT-LAYER');

  await addFolderIngest(page);

  const zone = page.getByTestId('materials-zone');
  await expect(zone).toBeVisible();
  const items = page.getByTestId('material-item');
  await expect(items).toHaveCount(2);
  // md → ready，图片 → needs_ocr（诚实阻断，未做 OCR）
  await expect(items.filter({ hasText: '设备采购合同.md' })).toHaveAttribute('data-status', 'ready');
  await expect(items.filter({ hasText: '公章页.png' })).toHaveAttribute('data-status', 'needs_ocr');
  // 反馈诚实计数
  await expect(page.getByTestId('system-open-feedback')).toContainText('入库 1 件');
  // 原件区绝无绝对路径（source-neutral）
  expect(await zone.innerText()).not.toMatch(NO_ABSOLUTE_PATH);
});

test('UI-SURFACE-1：真实材料的「在访达中显示」诚实未开通（宿主无按 grantId reveal 的命令）', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  await createGrantCase(page);
  await setFile(page, '设备采购合同.md', '# 设备采购合同\n\n第一条 付款。');
  await addFolderIngest(page);

  const item = page.getByTestId('material-item').filter({ hasText: '设备采购合同.md' });
  await expect(item).toHaveAttribute('data-status', 'ready');

  const reveal = item.getByTestId('material-reveal');
  await expect(reveal).toBeVisible();
  await expect(reveal).toBeDisabled();
  await expect(reveal).toHaveAttribute('title', '真实材料的访达显示即将开通');
  await expect(reveal).toHaveAttribute('data-state', 'unwired');

  const feedbackBefore = await page.getByTestId('system-open-feedback').innerText();
  const dialogsBefore = await page.getByRole('dialog').count();
  await reveal.click({ force: true });
  await expect(page.getByTestId('system-open-feedback')).toHaveText(feedbackBefore);
  await expect(page.getByRole('dialog')).toHaveCount(dialogsBefore);
  await expect(item).toHaveAttribute('data-status', 'ready');

  // 核验按钮保持既有真实接线，不受本单影响
  await expect(item.getByTestId('material-verify')).toBeEnabled();
});

test('核验＝provider 前重验：原件漂移与删除显式阻断', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  await createGrantCase(page);
  await setFile(page, '设备采购合同.md', '# 设备采购合同\n\n第一条 付款。');
  await addFolderIngest(page);

  const ready = page.getByTestId('material-item').filter({ hasText: '设备采购合同.md' });
  await expect(ready).toHaveAttribute('data-status', 'ready');
  const feedback = page.getByTestId('system-open-feedback');

  // 初始核验：通过
  await ready.getByTestId('material-verify').click();
  await expect(feedback).toContainText('校验通过');

  // 原件改一字节 → 阻断（content drift）
  await setFile(page, '设备采购合同.md', '# 设备采购合同（被篡改）\n\n第一条 付款。');
  await ready.getByTestId('material-verify').click();
  await expect(feedback).toContainText('已改动');

  // 原件删除 / 卷卸载 → 显式阻断，非静默
  await deleteFile(page, '设备采购合同.md');
  await ready.getByTestId('material-verify').click();
  await expect(feedback).toContainText('找不到原件');
});

/**
 * FILE-PREVIEW-1：非 demo 案原件阅读。
 *
 * READER-ISOLATION-1 曾把非 demo 案的右栏「原件阅读」整块诚实缺席——用户入卷 20 份材料
 * 一份也打不开。本组证明该缺口已闭，且三态诚实：可读渲染 / 需文字识别显式不渲染 /
 * 漂移与失效 fail-closed，全部复用既有阻断闭集与产品语言，零新错误形态。
 */
test('FILE-PREVIEW-1：真实案原件在应用内可读，内容来自入库时派生的阅读视图', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  await createGrantCase(page);
  await setFile(page, '设备采购合同.md', '# 设备采购合同\n\n第一条 付款：买方验收后 30 日内付清。');
  await addFolderIngest(page);

  // 阅读入口在真实案材料区（demo 案走 OriginalsZone，两条入口不共用）
  const item = page.getByTestId('material-item').filter({ hasText: '设备采购合同.md' });
  await item.getByTestId('material-read').click();

  const reader = page.getByTestId('reader-pane');
  await expect(reader).toBeVisible();
  // 断言依赖「应用真把阅读视图渲染出来」——不是只看面板开了（真渲判例）
  await expect(reader).toContainText('第一条 付款：买方验收后 30 日内付清。');
  // 节标走鱼尾记号（与 demo 阅读面同一渲染器，本单未分叉）
  await expect(reader.getByTestId('mark-fishtail').first()).toBeVisible();
  // 原件只读：阅读面零编辑入口
  await expect(reader.locator('[contenteditable="true"]')).toHaveCount(0);
  await expect(reader.getByRole('button', { name: /保存|编辑/ })).toHaveCount(0);
});

test('FILE-PREVIEW-1：需文字识别的原件显式不渲染，不开空白阅读面', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  await createGrantCase(page);
  await setFile(page, '公章页.png', 'PNG-BYTES-NO-TEXT-LAYER');
  await addFolderIngest(page);

  await page.getByTestId('material-item').filter({ hasText: '公章页.png' }).getByTestId('material-read').click();

  // 显式陈述 + 绝不开空白面：空白页会被读成「这份文件没内容」，那是另一种假事实
  await expect(page.getByTestId('system-open-feedback')).toContainText('需要文字识别');
  await expect(page.getByTestId('reader-pane')).toHaveCount(0);
});

test('FILE-PREVIEW-1：原件漂移后阅读 fail-closed，复用既有阻断文案', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  await createGrantCase(page);
  await setFile(page, '设备采购合同.md', '# 设备采购合同\n\n第一条 付款：买方验收后 30 日内付清。');
  await addFolderIngest(page);

  // 入库后原件字节被改（用户在访达里编辑了原件）→ 读取须阻断，不得渲染旧视图
  await setFile(page, '设备采购合同.md', '# 设备采购合同\n\n第一条 付款：买方验收后 7 日内付清。');
  await page.getByTestId('material-item').filter({ hasText: '设备采购合同.md' }).getByTestId('material-read').click();

  await expect(page.getByTestId('system-open-feedback')).toContainText('已改动');
  await expect(page.getByTestId('reader-pane')).toHaveCount(0);
});
