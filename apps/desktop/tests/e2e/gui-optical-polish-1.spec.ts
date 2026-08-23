import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { openWorkbench } from './helpers';

/**
 * `GUI-OPTICAL-POLISH-1` · GOP-C01/GOP-C02 的 scripted browser projection。
 *
 * 这里只观察 Pi Work 的现有投影和 CaseRail 的现有包状态行，不引入新的产品 hook、copy
 * 或视觉值。截图链是实现回执的可复核材料，必须落在本票新目录，不能覆盖历史 release evidence。
 */

type PiHooks = {
  reset(): void;
  setScript(steps: unknown[]): void;
  setWorkspaceFile(
    logicalPath: string,
    file: { content: string; contentSha256: string; byteLength: number },
  ): void;
};

type Theme = 'light' | 'dark';
type CaptureState = 'empty' | 'proposal' | 'running' | 'succeeded';

const SHA = 'e80ddeb170a3513e335ada586bec6f0068e8be8c66ab0845b38ec541edb888ba';
const OUT_DIR = path.resolve(import.meta.dirname, '../../../..', 'release/evidence/gui-optical-polish-1-gop-c02-2026-08-23');
const CAPTURE = process.env.GUI_OPTICAL_CAPTURE === '1';

const WRITE_SCRIPT = [
  { kind: 'text', delta: '先读案件材料。' },
  { kind: 'tool', toolCallId: 'tc_optical_read', toolName: 'read' },
  { kind: 'toolEnd', toolCallId: 'tc_optical_read', toolName: 'read' },
  { kind: 'tool', toolCallId: 'tc_optical_write', toolName: 'write' },
  {
    kind: 'propose',
    toolCallId: 'tc_optical_write',
    operationId: 'op_optical_write',
    logicalPath: '光学核对.md',
    byteLength: 37,
    contentSha256: SHA,
  },
  { kind: 'toolEnd', toolCallId: 'tc_optical_write', toolName: 'write' },
  { kind: 'text', delta: '已写入 /workspace/光学核对.md。' },
  { kind: 'terminal', status: 'completed' },
];

async function openDraftFace(page: Page, label = '光学收口案') {
  await openWorkbench(page);
  await page.evaluate(() => {
    const hooks = (window as unknown as { __courtworkPiLane: PiHooks }).__courtworkPiLane;
    hooks.reset();
  });
  await page.getByTestId('new-case-open').click();
  await page.evaluate((value) => {
    (
      window as unknown as {
        __courtworkHostAuth: { setNextAuthorize(result: unknown): void };
      }
    ).__courtworkHostAuth.setNextAuthorize({
      status: 'granted',
      grant: { grantId: `grant-${value}`, label: value },
    });
  }, label);
  await page.getByTestId('new-case-authorize').click();
  await page.getByTestId('new-case-dialog').getByRole('button', { name: '创建案件' }).click();
  await page.getByTestId('segment-draft').click();
  await expect(page.getByTestId('draft-canvas')).toBeVisible();
}

async function startComposer(page: Page) {
  await page.getByTestId('pi-start').click();
  await expect(page.getByTestId('pi-composer')).toBeVisible();
}

async function runToProposal(page: Page) {
  await page.evaluate((steps) => {
    (window as unknown as { __courtworkPiLane: PiHooks }).__courtworkPiLane.setScript(steps);
  }, WRITE_SCRIPT);
  await page.evaluate((sha) => {
    (window as unknown as { __courtworkPiLane: PiHooks }).__courtworkPiLane.setWorkspaceFile(
      '光学核对.md',
      { content: '# 光学核对\n', contentSha256: sha, byteLength: 37 },
    );
  }, SHA);
  await page.getByTestId('pi-composer-input').fill('整理一份光学核对记录');
  await page.getByTestId('pi-send').click();
  await expect(page.getByTestId('pi-stop')).toBeVisible();
  await expect(page.getByTestId('pi-proposal')).toBeVisible();
}

async function readOpticalGeometry(page: Page) {
  return page.evaluate(() => {
    const composer = document.querySelector('.pi-composer');
    const input = document.querySelector('.pi-composer-input');
    const proposal = document.querySelector('[data-testid="pi-tool-card"][data-state="proposed"]');
    const actions = document.querySelector('.pi-tool-actions');
    const deny = document.querySelector('[data-testid="pi-deny"]');
    const approve = document.querySelector('[data-testid="pi-approve"]');
    if (!(composer instanceof HTMLElement) || !(input instanceof HTMLElement)) return null;
    const read = (element: HTMLElement) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        borderRadius: style.borderRadius,
        paddingInline: `${style.paddingLeft} ${style.paddingRight}`,
        paddingBlock: `${style.paddingTop} ${style.paddingBottom}`,
        border: `${style.borderTopWidth} ${style.borderTopStyle} ${style.borderTopColor}`,
        display: style.display,
        justifyContent: style.justifyContent,
        transitionProperty: style.transitionProperty,
        transform: style.transform,
      };
    };
    const viewport = document.querySelector('.pi-thread-viewport');
    const panel = document.querySelector('.pi-panel');
    const viewportStyle = viewport instanceof HTMLElement ? getComputedStyle(viewport) : null;
    const panelRect = panel instanceof HTMLElement ? panel.getBoundingClientRect() : null;
    const viewportRect = viewport instanceof HTMLElement ? viewport.getBoundingClientRect() : null;
    const composerRect = composer.getBoundingClientRect();
    return {
      viewportWidth: window.innerWidth,
      documentOverflow: document.documentElement.scrollWidth > window.innerWidth || document.body.scrollWidth > window.innerWidth,
      composer: read(composer),
      input: read(input),
      proposal: proposal instanceof HTMLElement ? read(proposal) : null,
      actions: actions instanceof HTMLElement ? read(actions) : null,
      deny: deny instanceof HTMLElement ? read(deny) : null,
      approve: approve instanceof HTMLElement ? read(approve) : null,
      proposalHead: proposal?.querySelector('.pi-tool-head') !== null,
      viewportPadding: viewportStyle ? `${viewportStyle.paddingLeft} ${viewportStyle.paddingRight}` : null,
      composerBottomGap: panelRect ? panelRect.bottom - composerRect.bottom : null,
      viewportBottom: viewportRect?.bottom ?? null,
      composerTop: composerRect.top,
    };
  });
}

async function captureState(
  page: Page,
  theme: Theme,
  width: number,
  state: CaptureState,
  report: Array<Record<string, unknown>>,
) {
  const geometry = await readOpticalGeometry(page);
  expect(geometry).not.toBeNull();
  expect(geometry!.documentOverflow).toBe(false);
  expect(geometry!.composer.width).toBeLessThanOrEqual(width - 32 + 1);
  expect(geometry!.composerBottomGap).toBeGreaterThanOrEqual(15);
  expect(geometry!.composerBottomGap).toBeLessThanOrEqual(17);
  expect(geometry!.viewportBottom).toBeLessThanOrEqual(geometry!.composerTop + 1);
  expect(geometry!.composer.borderRadius).toBe('12px');
  expect(geometry!.input.borderRadius).toBe('6px');
  report.push({ theme, width, state, geometry });

  if (!CAPTURE) return;
  await mkdir(OUT_DIR, { recursive: true });
  const prefix = `w${width}-${theme}-${state}`;
  await page.screenshot({ path: path.join(OUT_DIR, `${prefix}.png`), fullPage: true });
  if (state === 'proposal') {
    const card = page.locator('[data-testid="pi-tool-card"][data-state="proposed"]');
    const box = await card.boundingBox();
    if (!box) throw new Error('proposal card disappeared before 240px squint capture');
    await page.screenshot({
      path: path.join(OUT_DIR, `${prefix}-squint-240.png`),
      clip: { x: box.x, y: box.y, width: Math.min(240, box.width), height: Math.min(240, box.height) },
    });
  }
}

test('GOP-C01-a/b：composer 收成版心内 L1，390px 仍同心且不横溢', async ({ page }) => {
  await openDraftFace(page);
  await startComposer(page);

  const desktop = await readOpticalGeometry(page);
  expect(desktop).not.toBeNull();
  expect(desktop!.composer.width).toBeLessThanOrEqual(1440 - 32);
  expect(desktop!.composer.borderRadius).toBe('12px');
  expect(desktop!.composer.paddingInline).toBe('6px 6px');
  expect(desktop!.input.borderRadius).toBe('6px');
  expect(desktop!.input.width).toBeGreaterThan(0);

  await page.setViewportSize({ width: 390, height: 900 });
  const narrow = await readOpticalGeometry(page);
  expect(narrow).not.toBeNull();
  expect(narrow!.documentOverflow).toBe(false);
  expect(narrow!.composer.width).toBeLessThanOrEqual(358);
  expect(narrow!.composer.right).toBeLessThanOrEqual(390);
  expect(narrow!.input.right).toBeLessThanOrEqual(narrow!.composer.right);
  expect(narrow!.approve).toBeNull();
});

test('GOP-C01-a/b/d：proposal 只给 6px 卡片，决定顺序与 primary press 语义可见', async ({ page }) => {
  await openDraftFace(page);
  await startComposer(page);
  await runToProposal(page);

  const proposal = await readOpticalGeometry(page);
  expect(proposal).not.toBeNull();
  expect(proposal!.proposal?.borderRadius).toBe('6px');
  expect(proposal!.proposalHead).toBe(false);
  expect(proposal!.actions?.justifyContent).toBe('flex-end');
  expect(proposal!.deny!.right).toBeLessThanOrEqual(proposal!.approve!.left);
  expect(proposal!.approve!.right).toBeCloseTo(proposal!.actions!.right, 0);
  expect(proposal!.deny!.height).toBeGreaterThanOrEqual(proposal!.approve!.height);
  expect(proposal!.approve!.height).toBeGreaterThanOrEqual(32);
  expect(proposal!.approve!.transitionProperty).toContain('transform');
  expect(proposal!.approve!.transitionProperty).toContain('background-color');
  expect(proposal!.approve!.transitionProperty).toContain('border-color');

  const approve = page.getByTestId('pi-approve');
  const box = await approve.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(24);
  const pressed = await page.evaluate(() => {
    const element = document.querySelector('[data-testid="pi-approve"]');
    return element instanceof HTMLElement ? getComputedStyle(element).transform : null;
  });
  expect(pressed).not.toBe('none');
  await page.mouse.up();
  await expect(page.locator('[data-testid="pi-tool-card"][data-state="succeeded"]')).toBeVisible();
  await expect(page.getByTestId('pi-deny')).toHaveCount(0);
  const completed = await page.evaluate(() => {
    const card = document.querySelector('[data-testid="pi-tool-card"][data-state="succeeded"]');
    if (!(card instanceof HTMLElement)) return null;
    const style = getComputedStyle(card);
    return { radius: style.borderRadius, shadow: style.boxShadow, transform: style.transform };
  });
  expect(completed).toEqual({ radius: '0px', shadow: 'none', transform: 'none' });
});

test('GOP-C01-c：rail 包状态和管理入口在同一网格行，短动作贴右上', async ({ page }) => {
  await openWorkbench(page);
  await page.getByTestId('new-case-open').click();
  const dialog = page.getByTestId('new-case-dialog');
  await dialog.getByRole('button', { name: '不使用文件夹，直接命名' }).click();
  await dialog.getByTestId('new-case-pack-legal').check();
  await dialog.getByRole('textbox', { name: '案件名称' }).fill('光学 rail 案');
  await dialog.getByRole('button', { name: '创建案件' }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.getByTestId('segment-work').click();
  const section = page.locator('.rail-pack-section').first();
  await expect(section).toBeVisible();
  const metrics = await section.evaluate((node) => {
    const style = getComputedStyle(node);
    const label = node.querySelector('.rail-label');
    const state = node.querySelector('.rail-pack-state');
    const manage = node.querySelector('.rail-pack-manage');
    if (!(label instanceof HTMLElement) || !(state instanceof HTMLElement) || !(manage instanceof HTMLElement)) return null;
    return {
      columns: style.gridTemplateColumns,
      labelColumn: getComputedStyle(label).gridColumn,
      stateColumn: getComputedStyle(state).gridColumn,
      manageColumn: getComputedStyle(manage).gridColumn,
      stateTop: state.getBoundingClientRect().top,
      manageTop: manage.getBoundingClientRect().top,
      manageRight: manage.getBoundingClientRect().right,
      sectionRight: node.getBoundingClientRect().right,
    };
  });
  expect(metrics).not.toBeNull();
  expect(metrics!.columns.split(' ')).toHaveLength(2);
  expect(metrics!.labelColumn).toBe('1 / -1');
  expect(metrics!.stateColumn).toBe('1');
  expect(metrics!.manageColumn).toBe('2');
  expect(metrics!.manageTop).toBe(metrics!.stateTop);
  expect(metrics!.manageRight).toBeLessThanOrEqual(metrics!.sectionRight);
});

async function runVisualMatrix(page: Page, width: number) {
  const report: Array<Record<string, unknown>> = [];
  // 1180/390 可能触发宿主侧栏收拢；建案固定在 1440 完成，再观察目标 viewport。
  await page.setViewportSize({ width: 1440, height: 900 });
  await openDraftFace(page, `光学矩阵 ${width}`);
  await page.setViewportSize({ width, height: 900 });
  await startComposer(page);
  for (const theme of ['light', 'dark'] as const) {
    await page.evaluate((nextTheme) => {
      document.documentElement.dataset.theme = nextTheme;
    }, theme);
    await captureState(page, theme, width, 'empty', report);
  }
  await page.evaluate((steps) => {
    (window as unknown as { __courtworkPiLane: PiHooks }).__courtworkPiLane.setScript(steps);
  }, WRITE_SCRIPT);
  await page.evaluate((sha) => {
    (window as unknown as { __courtworkPiLane: PiHooks }).__courtworkPiLane.setWorkspaceFile(
      '光学核对.md',
      { content: '# 光学核对\n', contentSha256: sha, byteLength: 37 },
    );
  }, SHA);
  await page.getByTestId('pi-composer-input').fill('整理一份光学核对记录');
  await page.getByTestId('pi-send').click();
  await expect(page.getByTestId('pi-stop')).toBeVisible();
  for (const theme of ['light', 'dark'] as const) {
    await page.evaluate((nextTheme) => {
      document.documentElement.dataset.theme = nextTheme;
    }, theme);
    await captureState(page, theme, width, 'running', report);
  }
  await expect(page.getByTestId('pi-proposal')).toBeVisible();
  for (const theme of ['light', 'dark'] as const) {
    await page.evaluate((nextTheme) => {
      document.documentElement.dataset.theme = nextTheme;
    }, theme);
    await captureState(page, theme, width, 'proposal', report);
  }
  await page.getByTestId('pi-approve').click();
  await expect(page.locator('[data-testid="pi-tool-card"][data-state="succeeded"]')).toBeVisible();
  for (const theme of ['light', 'dark'] as const) {
    await page.evaluate((nextTheme) => {
      document.documentElement.dataset.theme = nextTheme;
    }, theme);
    await captureState(page, theme, width, 'succeeded', report);
  }
  expect(report).toHaveLength(8);
  if (CAPTURE) {
    await mkdir(OUT_DIR, { recursive: true });
    await writeFile(path.join(OUT_DIR, `matrix-w${width}.json`), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }
}

test('GOP-C02 gate/viewer：start gate 与只读查看面保留 icon-only chrome', async ({ page }) => {
  await openDraftFace(page, '光学 gate/viewer 案');
  for (const width of [1180, 1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['light', 'dark'] as const) {
      await page.evaluate((nextTheme) => {
        document.documentElement.dataset.theme = nextTheme;
      }, theme);
      await expect(page.getByTestId('pi-panel')).toBeVisible();
      await expect(page.getByTestId('pi-composer')).toHaveCount(0);
      const gateButton = page.getByTestId('pi-start');
      await expect(gateButton).toHaveText('');
      await expect(gateButton.locator('svg')).toHaveCount(1);
      await expect(gateButton).toHaveAttribute('aria-label', /.+/);
      await expect(gateButton).toHaveAttribute('title', /.+/);
      if (CAPTURE) {
        await mkdir(OUT_DIR, { recursive: true });
        await page.screenshot({ path: path.join(OUT_DIR, `w${width}-${theme}-gate.png`), fullPage: true });
      }
    }
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await startComposer(page);
  await runToProposal(page);
  await page.getByTestId('pi-approve').click();
  await expect(page.getByTestId('pi-draft-open')).toBeVisible();
  await page.getByTestId('pi-draft-open').click();
  await expect(page.getByTestId('pi-viewer')).toBeVisible();
  const close = page.getByTestId('pi-viewer-close');
  await expect(close).toHaveText('');
  await expect(close.locator('svg')).toHaveCount(1);
  await expect(close).toHaveAttribute('aria-label', /.+/);
  await expect(close).toHaveAttribute('title', /.+/);
  for (const theme of ['light', 'dark'] as const) {
    await page.evaluate((nextTheme) => {
      document.documentElement.dataset.theme = nextTheme;
    }, theme);
    if (CAPTURE) {
      await mkdir(OUT_DIR, { recursive: true });
      await page.screenshot({ path: path.join(OUT_DIR, `w1440-${theme}-viewer.png`), fullPage: true });
    }
  }
});

test('GOP-C02 visual matrix：light/dark × 1180 × empty/running/proposal/succeeded', async ({ page }) => {
  test.slow();
  await runVisualMatrix(page, 1180);
});

test('GOP-C02 visual matrix：light/dark × 1440 × empty/running/proposal/succeeded', async ({ page }) => {
  test.slow();
  await runVisualMatrix(page, 1440);
});

test('GOP-C02 visual matrix：light/dark × 390 × empty/running/proposal/succeeded', async ({ page }) => {
  test.slow();
  await runVisualMatrix(page, 390);
});
