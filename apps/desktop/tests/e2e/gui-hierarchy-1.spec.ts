import { expect, test, type Page } from '@playwright/test';
import { openWorkbench } from './helpers';

/**
 * `GUI-HIERARCHY-1` · 结构性层级的真跑断言。
 *
 * 这些断言只观察既有 CaseRail 与 Pi Work 投影；不引入第二套账本或视觉皮层。
 * 目标是让层级由字重、间距、对齐与密度承担，线与阴影只保留既有语汇。
 */

type PiHooks = {
  reset(): void;
  setScript(steps: unknown[]): void;
};

const MATTER = '结构层级核对案';

const PROPOSAL_SCRIPT = [
  { kind: 'text', delta: '先读取授权文件夹中的材料。' },
  { kind: 'tool', toolCallId: 'tc_read', toolName: 'read' },
  { kind: 'toolEnd', toolCallId: 'tc_read', toolName: 'read' },
  { kind: 'tool', toolCallId: 'tc_write', toolName: 'write' },
  {
    kind: 'propose',
    toolCallId: 'tc_write',
    operationId: 'op_hierarchy',
    logicalPath: '层级核对.md',
    byteLength: 24,
    contentSha256: 'a'.repeat(64),
  },
];

async function openDraftFace(page: Page) {
  await openWorkbench(page);
  await page.evaluate(() => {
    (window as unknown as { __courtworkPiLane: PiHooks }).__courtworkPiLane.reset();
  });
  await page.getByTestId('new-case-open').click();
  await page.evaluate((label) => {
    (
      window as unknown as {
        __courtworkHostAuth: { setNextAuthorize(result: unknown): void };
      }
    ).__courtworkHostAuth.setNextAuthorize({
      status: 'granted',
      grant: { grantId: 'grant-gui-hierarchy', label },
    });
  }, MATTER);
  await page.getByTestId('new-case-authorize').click();
  await page.getByTestId('new-case-dialog').getByRole('button', { name: '创建案件' }).click();
  await page.getByTestId('segment-draft').click();
  await expect(page.getByTestId('draft-canvas')).toBeVisible();
}

async function runToProposal(page: Page, script = PROPOSAL_SCRIPT) {
  await page.evaluate((steps) => {
    (window as unknown as { __courtworkPiLane: PiHooks }).__courtworkPiLane.setScript(steps);
  }, script);
  await page.getByTestId('pi-start').click();
  await page.getByTestId('pi-composer-input').fill('整理一份层级核对记录');
  await page.getByTestId('pi-send').click();
  await expect(page.getByTestId('pi-proposal')).toBeVisible();
}

test('GH-C01-a：CaseRail 父子层级用 510/400 与缩进表达，不画连接线', async ({ page }) => {
  await openWorkbench(page);
  const sample = page.getByTestId('rail-sample');
  await expect(sample).toBeVisible();
  const expand = sample.locator('[data-testid^="rail-expand-"]').first();
  if ((await expand.getAttribute('aria-expanded')) !== 'true') await expand.click();
  await expect(sample.locator('.rail-case-expand')).toBeVisible();
  const metrics = await sample.evaluate((node) => {
    const parent = node.querySelector('.case-card-main strong');
    const child = node.querySelector('.stage-row');
    const branch = node.querySelector('.rail-case-expand');
    if (!(parent instanceof HTMLElement) || !(child instanceof HTMLElement) || !(branch instanceof HTMLElement)) {
      return null;
    }
    const parentStyle = getComputedStyle(parent);
    const childStyle = getComputedStyle(child);
    const branchStyle = getComputedStyle(branch);
    return {
      parentWeight: parentStyle.fontWeight,
      childWeight: childStyle.fontWeight,
      parentLeft: parent.getBoundingClientRect().left,
      childLeft: child.getBoundingClientRect().left,
      branchBorderLeft: branchStyle.borderLeftWidth,
    };
  });
  expect(metrics).not.toBeNull();
  expect(metrics!.parentWeight).toBe('510');
  expect(metrics!.childWeight).toBe('400');
  expect(metrics!.childLeft).toBeGreaterThan(metrics!.parentLeft + 8);
  expect(metrics!.branchBorderLeft).toBe('0px');
});

test('GH-C01-b：Pi Work 节间距至少是节内行距的三倍', async ({ page }) => {
  await openDraftFace(page);
  await runToProposal(page);
  const rhythm = await page.evaluate(() => {
    const viewport = document.querySelector('[data-testid="pi-viewport"]');
    const turn = document.querySelector('.pi-turn');
    if (!(viewport instanceof HTMLElement) || !(turn instanceof HTMLElement)) return null;
    const viewportStyle = getComputedStyle(viewport);
    const turnStyle = getComputedStyle(turn);
    return {
      sectionGap: parseFloat(viewportStyle.rowGap || viewportStyle.gap),
      innerGap: parseFloat(turnStyle.rowGap || turnStyle.gap),
    };
  });
  expect(rhythm).not.toBeNull();
  expect(rhythm!.innerGap).toBeGreaterThan(0);
  expect(rhythm!.sectionGap / rhythm!.innerGap).toBeGreaterThanOrEqual(3);
});

test('GH-C01-c：多事实集合使用对齐列，不用边框或竖线画列', async ({ page }) => {
  await openDraftFace(page);
  await runToProposal(page);
  const facts = await page.evaluate(() => {
    const element = document.querySelector('[data-testid="pi-tool-card"][data-state="proposed"] .pi-tool-facts');
    if (!(element instanceof HTMLElement)) return null;
    const style = getComputedStyle(element);
    return {
      display: style.display,
      columns: style.gridTemplateColumns,
      borderLeft: style.borderLeftWidth,
      childCount: element.children.length,
    };
  });
  expect(facts).not.toBeNull();
  expect(facts!.display).toBe('grid');
  expect(facts!.columns).not.toBe('none');
  expect(facts!.columns.split(' ').length).toBeGreaterThanOrEqual(3);
  expect(facts!.borderLeft).toBe('0px');
  expect(facts!.childCount).toBeGreaterThanOrEqual(3);
});

test('GH-C01-d：层级只消费既有唯一 elevation shadow，禁止第二档阴影', async ({ page }) => {
  await openWorkbench(page);
  const elevation = await page.evaluate(async () => {
    const css = await (await fetch('/src/styles.css')).text();
    const values = [...css.matchAll(/box-shadow\s*:\s*([^;]+);/g)].map((match) => match[1].trim());
    return values.filter((value) => value !== 'none' && value !== 'none !important');
  });
  expect(elevation).toEqual(['var(--elevation-shadow)']);
});

test('GH-C01-e：1440×900 下一屏保留至少八行真实工作信息', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openDraftFace(page);
  const denseScript = Array.from({ length: 12 }, (_, index) => [
    { kind: 'tool', toolCallId: `tc_dense_${index}`, toolName: 'read' },
    { kind: 'toolEnd', toolCallId: `tc_dense_${index}`, toolName: 'read' },
  ]).flat();
  await runToProposal(page, [
    { kind: 'text', delta: '按顺序核对每一项材料。' },
    ...denseScript,
    ...PROPOSAL_SCRIPT.slice(1),
  ]);
  const visibleRows = await page.evaluate(() => {
    const viewport = document.querySelector('[data-testid="pi-viewport"]');
    if (!(viewport instanceof HTMLElement)) return 0;
    const bounds = viewport.getBoundingClientRect();
    return Array.from(viewport.querySelectorAll('[data-testid="pi-tool-card"]'))
      .map((node) => node.getBoundingClientRect())
      .filter((rect) => rect.top >= bounds.top && rect.bottom <= bounds.bottom).length;
  });
  expect(visibleRows).toBeGreaterThanOrEqual(8);
});
