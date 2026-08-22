import { expect, test, type Page } from '@playwright/test';
import { openWorkbench } from './helpers';

/**
 * `GUI-COMPOSITION-1` · Pi Work 面构图、密度与语料纠偏的真跑判据。
 *
 * 四枚硬断言对应票面第五节点名的四条目标形态：
 * `GC-C01-d`（同名标识一屏只现一次）、`GC-C01-c`（工具卡非满宽色块）、
 * `GC-C01-e`（placeholder 中性）、`GC-C01-h`（拒绝动作为次级）。
 * 另附 `GC-C01-b`（未成文区无成屏空场）、`GC-C01-f`（summary 用既有图标而非默认 marker）、
 * `GC-C01-a` 撤销后的守位断言（正文轴维持 760px 定值）。
 *
 * 宿主同 `pi-lane.spec.ts`：`browser-pi-lane` 的 scripted 樁，测的是界面对账本的投影。
 */

type PiHooks = {
  reset(): void;
  setScript(steps: unknown[]): void;
  setWorkspaceFile(
    logicalPath: string,
    file: { content: string; contentSha256: string; byteLength: number },
  ): void;
};

const SHA = 'e80ddeb170a3513e335ada586bec6f0068e8be8c66ab0845b38ec541edb888ba';
const MATTER = '设备采购案卷';

const WRITE_SCRIPT = [
  { kind: 'text', delta: '先读案件材料。' },
  { kind: 'tool', toolCallId: 'tc_1', toolName: 'read' },
  { kind: 'toolEnd', toolCallId: 'tc_1', toolName: 'read' },
  { kind: 'tool', toolCallId: 'tc_2', toolName: 'write' },
  {
    kind: 'propose',
    toolCallId: 'tc_2',
    operationId: 'op_1',
    logicalPath: '纪要.md',
    byteLength: 37,
    contentSha256: SHA,
  },
  { kind: 'toolEnd', toolCallId: 'tc_2', toolName: 'write' },
  { kind: 'text', delta: '已写入 /workspace/纪要.md。' },
  { kind: 'terminal', status: 'completed' },
];

async function openDraftFace(page: Page, label = MATTER) {
  await openWorkbench(page);
  await page.evaluate(() => {
    (window as unknown as { __courtworkPiLane: PiHooks }).__courtworkPiLane.reset();
  });
  await page.getByTestId('new-case-open').click();
  await page.evaluate((value) => {
    (
      window as unknown as {
        __courtworkHostAuth: { setNextAuthorize(result: unknown): void };
      }
    ).__courtworkHostAuth.setNextAuthorize({
      status: 'granted',
      grant: { grantId: 'grant-gc1', label: value },
    });
  }, label);
  await page.getByTestId('new-case-authorize').click();
  await page.getByTestId('new-case-dialog').getByRole('button', { name: '创建案件' }).click();
  await page.getByTestId('segment-draft').click();
  await expect(page.getByTestId('draft-canvas')).toBeVisible();
}

async function runToProposal(page: Page) {
  await page.evaluate((steps) => {
    (window as unknown as { __courtworkPiLane: PiHooks }).__courtworkPiLane.setScript(steps);
  }, WRITE_SCRIPT);
  await page.evaluate((sha) => {
    (window as unknown as { __courtworkPiLane: PiHooks }).__courtworkPiLane.setWorkspaceFile(
      '纪要.md',
      { content: '# 纪要\n', contentSha256: sha, byteLength: 37 },
    );
  }, SHA);
  await page.getByTestId('pi-start').click();
  await page.getByTestId('pi-composer-input').fill('整理一份纪要');
  await page.getByTestId('pi-send').click();
  await page.getByTestId('pi-proposal').waitFor();
}

/** `GC-C01-d`：一屏只出现一次同名标识。 */
test('GC-C01-d：binding pill 与段名重复的标识不再第二次出现', async ({ page }) => {
  await openDraftFace(page);
  const head = page.getByTestId('pi-work-head');
  await expect(head).toBeVisible();

  // pill 与 head 标题同名时隐去 pill。
  await expect(page.getByTestId('pi-binding-label')).toHaveCount(0);

  // 案件名在 Work 面头部只出现一次。
  const titleHits = await page.evaluate((matter) => {
    const face = document.querySelector('[data-testid="draft-canvas"]');
    if (!face) return -1;
    return Array.from(face.querySelectorAll('*')).filter(
      (el) => el.children.length === 0 && el.textContent?.trim() === matter,
    ).length;
  }, MATTER);
  expect(titleHits).toBe(1);

  // 段名 `Work` 已常驻左上，head 不再另说一遍「当前工作区」。
  await expect(page.getByTestId('draft-canvas')).not.toContainText('当前工作区');
});

/** `GC-C01-c`：工具卡是账行，不是满版心色块。 */
test('GC-C01-c：待决工具卡不以满版心色块承担', async ({ page }) => {
  await openDraftFace(page);
  await runToProposal(page);
  const geometry = await page.evaluate(() => {
    const card = document.querySelector('[data-testid="pi-tool-card"][data-state="proposed"]');
    const viewport = document.querySelector('.pi-thread-viewport');
    if (!(card instanceof HTMLElement) || !(viewport instanceof HTMLElement)) return null;
    const vs = getComputedStyle(viewport);
    const axis =
      viewport.clientWidth - parseFloat(vs.paddingLeft) - parseFloat(vs.paddingRight);
    const cs = getComputedStyle(card);
    return {
      axis,
      cardWidth: card.getBoundingClientRect().width,
      paddingInlineStart: parseFloat(cs.paddingInlineStart),
      borderInlineStartWidth: parseFloat(cs.borderInlineStartWidth),
    };
  });
  expect(geometry).not.toBeNull();
  // 色块不得再拉满正文轴：账行以缩进 + 细界线承担。
  expect(geometry!.cardWidth).toBeLessThan(geometry!.axis - 8);
  expect(geometry!.paddingInlineStart).toBeGreaterThan(0);
  expect(geometry!.borderInlineStartWidth).toBeGreaterThan(0);
});

/** `GC-C01-e`：placeholder 中性，且不与任何示范语料逐字相同。 */
test('GC-C01-e：composer placeholder 不含案件语料', async ({ page }) => {
  await openDraftFace(page);
  await page.getByTestId('pi-start').click();
  const placeholder = await page
    .getByTestId('pi-composer-input')
    .getAttribute('placeholder');
  expect(placeholder).toBeTruthy();
  expect(placeholder).not.toBe('例如：把案件材料里的合同编号与金额整理成一份纪要');
  expect(placeholder).not.toContain('例如');
  expect(placeholder).not.toContain('合同编号');
  expect(placeholder).not.toContain('金额');
  expect(placeholder).not.toContain('纪要');
});

/** `GC-C01-h`：拒绝写入是次级动作，仍可 focus-visible 且点击面积不缩。 */
test('GC-C01-h：拒绝写入降为次级动作', async ({ page }) => {
  await openDraftFace(page);
  await runToProposal(page);
  const styles = await page.evaluate(() => {
    const approve = document.querySelector('[data-testid="pi-approve"]');
    const deny = document.querySelector('[data-testid="pi-deny"]');
    if (!(approve instanceof HTMLElement) || !(deny instanceof HTMLElement)) return null;
    const read = (el: HTMLElement) => {
      const cs = getComputedStyle(el);
      return {
        classes: el.className,
        background: cs.backgroundColor,
        borderColor: cs.borderTopColor,
        borderWidth: parseFloat(cs.borderTopWidth),
        fontWeight: cs.fontWeight,
        height: el.getBoundingClientRect().height,
        minHeight: cs.minHeight,
      };
    };
    return { approve: read(approve), deny: read(deny) };
  });
  expect(styles).not.toBeNull();
  // 次级语汇：无实心底、无描边围合——与主动作不再是对称的两枚 CTA。
  expect(styles!.deny.classes).toContain('pi-button-quiet');
  expect(styles!.deny.borderWidth === 0 || styles!.deny.borderColor === 'rgba(0, 0, 0, 0)').toBe(
    true,
  );
  expect(Number(styles!.deny.fontWeight)).toBeLessThan(Number(styles!.approve.fontWeight));
  // 点击面积不小于既有最小值（与主动作等高）。
  expect(styles!.deny.height).toBeGreaterThanOrEqual(styles!.approve.height);

  await page.getByTestId('pi-deny').focus();
  const focusOutline = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el.dataset.testid !== 'pi-deny') return null;
    return getComputedStyle(el).outlineWidth;
  });
  expect(focusOutline).not.toBeNull();
  expect(parseFloat(focusOutline!)).toBeGreaterThan(0);
});

/** `GC-C01-b`：运行中与待决态不留成屏空场。 */
test('GC-C01-b：未成文区正文块与 composer 之间不留成屏空场', async ({ page }) => {
  await openDraftFace(page);
  await runToProposal(page);
  const gap = await page.evaluate(() => {
    const viewport = document.querySelector('.pi-thread-viewport');
    const composer = document.querySelector('.pi-composer');
    if (!(viewport instanceof HTMLElement) || !(composer instanceof HTMLElement)) return null;
    // 正文区最后一块**内容**（工具账行之后还有运行状态行），量的是它与 composer 之间的净空。
    const last = viewport.lastElementChild;
    if (!(last instanceof HTMLElement)) return null;
    return composer.getBoundingClientRect().top - last.getBoundingClientRect().bottom;
  });
  expect(gap).not.toBeNull();
  // 上限＝一个既有 section 间距（--home-section-gap: 20px）；实测为 viewport 的 16px 下内距。
  expect(gap!).toBeLessThanOrEqual(20);
});

/** `GC-C01-f`：pi 的 details summary 抑制默认 marker，改用既有图标。 */
test('GC-C01-f：运行详情折叠符是既有图标而非默认 marker', async ({ page }) => {
  await openDraftFace(page);
  await runToProposal(page);
  const marker = await page.evaluate(() => {
    const summary = document.querySelector('[data-testid="pi-tool-details"] > summary');
    if (!(summary instanceof HTMLElement)) return null;
    return {
      listStyle: getComputedStyle(summary).listStyleType,
      display: getComputedStyle(summary, '::marker').display,
      svgCount: summary.querySelectorAll('svg').length,
    };
  });
  expect(marker).not.toBeNull();
  expect(marker!.listStyle).toBe('none');
  expect(marker!.svgCount).toBeGreaterThan(0);
});

/** `GC-C01-a` 已撤销：正文轴须维持 760px 定值，本票不得改动。 */
test('GC-C01-a 撤销守位：正文轴维持 760px 定值', async ({ page }) => {
  await openDraftFace(page);
  const measure = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--pi-content-measure').trim(),
  );
  expect(measure).toBe('760px');
});
