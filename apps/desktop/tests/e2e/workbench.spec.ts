import { expect, test, type Page } from '@playwright/test';

async function openWorkbench(page: Page) {
  await page.goto('/');
  const setup = page.getByTestId('provider-setup');
  if (await setup.isVisible()) await setup.getByRole('button', { name: '先查看演示' }).click();
}

test('完整工作台帧与三栏在 1440 视口可见', async ({ page }) => {
  await openWorkbench(page);
  await expect(page.getByTestId('workbench')).toBeVisible();
  await expect(page.getByRole('heading', { name: '案件', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '对话', exact: true })).toBeVisible();
  await expect(page.getByRole('tablist', { name: '结构化工作面' })).toBeVisible();
  await expect(page.getByTestId('usage-ring')).toBeVisible();
});

test('五工作面结构常驻且未接功能保留禁用入口与说明', async ({ page }) => {
  await openWorkbench(page);
  const tablist = page.getByRole('tablist', { name: '结构化工作面' });
  await expect(tablist.getByRole('tab')).toHaveCount(5);

  const routes = [
    ['timeline', 'timeline-panel'],
    ['graph', 'graph-panel'],
    ['matrix', 'matrix-panel'],
    ['revision', 'revision-panel'],
    ['draft', 'draft-panel'],
  ] as const;
  for (const [view, panel] of routes) {
    await page.getByTestId(`view-${view}`).click();
    await expect(page.getByTestId(panel)).toBeVisible();
  }

  const reviewLog = page.getByRole('button', { name: '审阅记录' });
  await expect(reviewLog).toBeDisabled();
  await expect(reviewLog).toHaveAttribute('title', '审阅记录 · 待生成');
  const exportDraft = page.getByRole('button', { name: '导出审阅稿' });
  await expect(exportDraft).toBeDisabled();
  await expect(exportDraft).toHaveAttribute('title', '导出审阅稿 · 待完成文书生成');
  await expect(page.getByRole('button', { name: '自由输入' })).toBeDisabled();

  await page.getByTestId('view-matrix').click();
  const matrixCells = page.locator('.matrix-wrap td button');
  expect(await matrixCells.count()).toBeGreaterThan(0);
  await expect(matrixCells.first()).toBeDisabled();
  await expect(matrixCells.first()).toHaveAttribute('title', '原文定位 · 卷宗原件待连接');

  await page.getByTestId('view-timeline').click();
  const sourceJump = page.getByTestId('timeline-panel').locator('.verified-block button');
  await expect(sourceJump).toBeDisabled();
  await expect(sourceJump).toHaveAttribute('title', '原文定位 · 卷宗原件待连接');
});

test('S1 摄取事件回放可进入时间线', async ({ page }) => {
  await openWorkbench(page);
  await page.getByTestId('flow-s1').click();
  await page.getByTestId('view-timeline').click();
  await expect(page.getByTestId('timeline-panel')).toBeVisible();
  await expect(page.getByText('摄取进行中 16 / 20')).toBeVisible();
  await expect(page.getByText('双方签订《精密铸造生产线设备采购合同》', { exact: false })).toBeVisible();
});

test('时间线只消费 markers 高亮矛盾事件', async ({ page }) => {
  await openWorkbench(page);
  await page.getByTestId('flow-s1').click();
  await page.getByTestId('view-timeline').click();
  const evt24 = page.locator('[data-event-id="evt-24"]');
  const evt25 = page.locator('[data-event-id="evt-25"]');
  await evt24.scrollIntoViewIfNeeded();
  await expect(evt24).not.toContainText('矛盾');
  await expect(evt24.locator('.signature-line')).toHaveAttribute('data-tone', 'attention');
  await expect(evt25).toContainText('矛盾');
  await expect(evt25.locator('.signature-line')).toHaveCount(0);
});

test('S1 关系图谱提供关系选择与原文依据', async ({ page }) => {
  await openWorkbench(page);
  await page.getByTestId('flow-s1').click();
  await page.getByTestId('view-graph').click();
  await expect(page.getByTestId('graph-panel')).toBeVisible();
  await expect(page.getByRole('group', { name: '当事人关系图谱' })).toBeVisible();
  await expect(page.getByRole('button', { name: '全资控股母公司（持股100%） e-01' })).toBeVisible();
  await page.getByRole('button', { name: '临江精铸集团有限公司 p-linjiang-jt' }).click();
  await expect(page.getByTestId('graph-source-kind')).toHaveText('节点关联依据');
  await expect(page.locator('.relation-evidence q')).toContainText('临江精铸科技有限公司（持股100%）');
  await page.getByRole('button', { name: '全资控股母公司（持股100%） e-01' }).click();
  await expect(page.getByTestId('graph-source-kind')).toHaveText('关系依据');
});

test('G6 dagre 全量渲染 14 节点 15 边且节点标签零重叠', async ({ page }) => {
  await openWorkbench(page);
  await page.getByTestId('flow-s1').click();
  await page.getByTestId('view-graph').click();
  const panel = page.getByTestId('graph-panel');
  await expect(panel).toHaveAttribute('data-renderer', 'g6');
  await expect(panel).toHaveAttribute('data-layout', 'dagre');
  await expect(panel).toHaveAttribute('data-node-count', '14');
  await expect(panel).toHaveAttribute('data-edge-count', '15');
  await expect(panel).toHaveAttribute('data-layout-ready', 'true');

  const nodes = JSON.parse(await panel.getAttribute('data-layout-nodes') ?? '[]') as Array<{ id: string; label: string; x: number; y: number; width: number; height: number }>;
  expect(nodes).toHaveLength(14);
  for (const node of nodes) expect(node.label.length).toBeGreaterThan(0);
  for (let left = 0; left < nodes.length; left += 1) {
    for (let right = left + 1; right < nodes.length; right += 1) {
      const a = nodes[left];
      const b = nodes[right];
      const overlaps = Math.abs(a.x - b.x) < (a.width + b.width) / 2
        && Math.abs(a.y - b.y) < (a.height + b.height) / 2;
      expect(overlaps, `${a.id} 与 ${b.id} 的节点/标签几何重叠`).toBe(false);
    }
  }
});

test('无极缩放只在关系图谱沙盒内生效', async ({ page }) => {
  await openWorkbench(page);
  await page.getByTestId('flow-s1').click();
  await page.getByTestId('view-graph').click();
  const sandbox = page.getByTestId('graph-zoom-sandbox');
  await expect(page.getByTestId('graph-panel')).toHaveAttribute('data-layout-ready', 'true');
  const before = Number(await sandbox.getAttribute('data-zoom'));
  await sandbox.dispatchEvent('wheel', { deltaY: -180, ctrlKey: true, bubbles: true, cancelable: true });
  await expect.poll(async () => Number(await sandbox.getAttribute('data-zoom'))).toBeGreaterThan(before);
  expect(await sandbox.locator('canvas').count()).toBeGreaterThanOrEqual(1);
});

test('非图谱工作面拦截 Ctrl+滚轮且不改变视口', async ({ page }) => {
  await openWorkbench(page);
  await page.getByTestId('view-draft').click();
  const viewport = page.getByTestId('draft-static-viewport');
  const before = await viewport.boundingBox();
  const dispatchResult = await viewport.evaluate((element) => {
    const event = new WheelEvent('wheel', { deltaY: 160, ctrlKey: true, bubbles: true, cancelable: true });
    return element.dispatchEvent(event);
  });
  expect(dispatchResult).toBe(false);
  expect(await viewport.boundingBox()).toEqual(before);
  await expect(viewport).toHaveCSS('transform', 'none');
});

test('S3 高危或未核验条目展开依据前不可确认', async ({ page }) => {
  await openWorkbench(page);
  const panel = page.getByTestId('revision-panel');
  const confirm = panel.getByRole('button', { name: '确认', exact: true });
  await expect(confirm).toBeDisabled();
  await panel.getByRole('button', { name: /展开原文/ }).click();
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(panel.getByText('已确认', { exact: true })).toBeVisible();
});

test('S3 批量范围明确排除逐条条目', async ({ page }) => {
  await openWorkbench(page);
  const panel = page.getByTestId('revision-panel');
  await expect(panel.getByText('高危与未核验条目已拆出')).toBeVisible();
  await panel.getByRole('button', { name: '批量确认 4 项' }).click();
  await expect(panel.getByText('已确认', { exact: true })).toHaveCount(4);
});

test('法理之线只表达处置状态：R5 无线、确认转绿、驳回转灰', async ({ page }) => {
  await openWorkbench(page);
  const panel = page.getByTestId('revision-panel');
  const r5 = panel.locator('[data-risk-id="risk-05"]');
  await expect(r5.locator('.signature-line')).toHaveCount(0);

  const r2 = panel.locator('[data-risk-id="risk-02"]');
  await r2.click();
  await panel.getByRole('button', { name: '确认', exact: true }).click();
  await expect(r2.locator('.signature-line')).toHaveAttribute('data-tone', 'authority');

  const r4 = panel.locator('[data-risk-id="risk-04"]');
  await r4.click();
  await panel.getByRole('button', { name: '驳回', exact: true }).click();
  await expect(r4.locator('.signature-line')).toHaveAttribute('data-tone', 'neutral');
});

test('法理之线使用域只限右栏且图标保持品牌单色', async ({ page }) => {
  await openWorkbench(page);
  await expect(page.locator('.conversation .signature-line')).toHaveCount(0);
  const callout = page.locator('.generated-callout');
  await expect(callout).toHaveCSS('border-left-width', '1px');
  await expect(callout).toHaveCSS('background-color', 'rgb(250, 250, 250)');

  const lineAudit = await page.locator('.signature-line').evaluateAll((lines) => lines.map((line) => ({
    tone: line.getAttribute('data-tone'),
    inRightWorkbench: Boolean(line.closest('.right-workbench')),
  })));
  expect(lineAudit.length).toBeGreaterThan(0);
  expect(lineAudit.every(({ inRightWorkbench }) => inRightWorkbench)).toBe(true);
  expect(lineAudit.every(({ tone }) => ['danger', 'attention', 'revision', 'authority', 'neutral'].includes(tone ?? ''))).toBe(true);

  const iconColors = await page.locator('.line-icon').evaluateAll((icons) => [...new Set(icons.map((icon) => getComputedStyle(icon).color))]);
  expect(iconColors).toEqual(['rgb(100, 116, 139)']);
});

test('混合处置完成后确认响应按条目上报', async ({ page }) => {
  await openWorkbench(page);
  const panel = page.getByTestId('revision-panel');
  await panel.getByRole('button', { name: '驳回' }).click();
  await panel.getByRole('button', { name: '批量确认 4 项' }).click();
  await panel.locator('[data-risk-id="risk-01"]').click();
  await panel.getByRole('button', { name: /展开原文/ }).click();
  await panel.getByRole('button', { name: '修正' }).click();
  await expect(panel.getByRole('status')).toHaveText('6 项处置已逐条提交');
});

test('矩阵审阅使用样板案十份合同', async ({ page }) => {
  await openWorkbench(page);
  await page.getByTestId('view-matrix').click();
  await expect(page.getByTestId('matrix-panel')).toBeVisible();
  await expect(page.getByText('V01-卓越智造装备（云章）有限公司')).toBeVisible();
  await expect(page.getByText('10 份合同 · 7 个问题')).toBeVisible();
});

test('起草画布在编辑态只暴露渲染文书结构', async ({ page }) => {
  await openWorkbench(page);
  await page.getByTestId('view-draft').click();
  const draft = page.getByTestId('draft-panel');
  const editor = draft.getByRole('textbox', { name: '文书起草画布' });
  await expect(editor).toBeVisible();
  await expect(editor.locator('h2')).toHaveText('答辩意见');
  expect(await editor.innerText()).not.toContain('##');
  await expect(editor).toHaveAttribute('aria-multiline', 'true');
  await expect(page.locator('body')).not.toContainText('## 答辩意见');
});

test('起草画布经显式冻结仪式转为只读', async ({ page }) => {
  await openWorkbench(page);
  await page.getByTestId('view-draft').click();
  const draft = page.getByTestId('draft-panel');
  await draft.getByRole('button', { name: '编译为 Word 文档' }).click();
  await expect(page.getByRole('dialog', { name: '编译为 Word 文档' })).toBeVisible();
  await page.getByRole('button', { name: '确认定稿并编译' }).click();
  await expect(draft.getByText('已定稿 · 2026-07-10 17:40')).toBeVisible();
  await expect(draft.getByRole('textbox', { name: '文书起草画布' })).toHaveCount(0);
});

test('Split-Tab Grid 默认上下对切并让宽 200px 以上', async ({ page }) => {
  await openWorkbench(page);
  const right = page.locator('.right-workbench');
  const before = await right.boundingBox();
  await page.getByTestId('split-start').click();
  const split = page.getByTestId('split-grid');
  await expect(split).toHaveAttribute('data-direction', 'rows');
  await expect(page.getByTestId('workspace')).toHaveAttribute('data-comparing', 'true');
  const rail = await page.locator('.case-rail').boundingBox();
  const after = await right.boundingBox();
  expect(rail?.width).toBeLessThanOrEqual(50);
  expect((after?.width ?? 0) - (before?.width ?? 0)).toBeGreaterThanOrEqual(200);
  await page.getByTestId('split-reset').click();
  await expect(page.getByTestId('workspace')).toHaveAttribute('data-comparing', 'false');
});

test('1600px 以上解锁左右对照', async ({ page }) => {
  await page.setViewportSize({ width: 1700, height: 900 });
  await openWorkbench(page);
  await page.getByTestId('split-start').click();
  const columns = page.getByRole('button', { name: '左右对照' });
  await expect(columns).toBeEnabled();
  await columns.click();
  await expect(page.getByTestId('split-grid')).toHaveAttribute('data-direction', 'columns');
});

test('按压态 70ms 且数据卡零位移零缩放', async ({ page }) => {
  await openWorkbench(page);
  const action = page.getByRole('button', { name: '整理卷宗', exact: true });
  const dataCard = page.locator('.data-card').first();
  await expect(action).toHaveCSS('transition-duration', '0.12s, 0.12s');
  await action.hover();
  await page.mouse.down();
  await expect(action).toHaveCSS('transition-duration', '0.07s, 0.07s');
  await expect(action).toHaveCSS('background-color', 'rgb(233, 238, 244)');
  await expect(action).toHaveCSS('transform', 'none');
  await expect(dataCard).toHaveCSS('transform', 'none');
  await page.mouse.up();
});

test('Tab 指示器 100ms、内容与面板 0ms 瞬切', async ({ page }) => {
  await openWorkbench(page);
  const matrixTab = page.getByTestId('view-matrix');
  const indicator = matrixTab.locator('.tab-indicator');
  await expect(indicator).toHaveCSS('transition-duration', '0.1s');
  await matrixTab.click();
  await expect(matrixTab).toHaveAttribute('aria-selected', 'true');
  await expect(indicator).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  await expect(page.locator('.view-content')).toHaveCSS('transition-duration', '0s');
  await expect(page.locator('.view-content')).toHaveCSS('animation-name', 'none');
  await expect(page.getByTestId('revision-panel')).toHaveCount(0);
  await expect(page.getByTestId('matrix-panel')).toBeVisible();
});

test('确认与驳回本体硬切并叠加 150ms 非对称光效', async ({ page }) => {
  await openWorkbench(page);
  const panel = page.getByTestId('revision-panel');
  const r2 = panel.locator('[data-risk-id="risk-02"]');
  await r2.click();
  await panel.getByRole('button', { name: '确认', exact: true }).click();
  await expect(r2.locator('.gate-state')).toHaveCSS('transition-duration', '0s');
  const confirmFlash = r2.getByTestId('settle-flash-risk-02');
  await expect(confirmFlash).toHaveAttribute('data-kind', 'confirmed');
  await expect(confirmFlash).toHaveAttribute('data-duration', '150');

  const r4 = panel.locator('[data-risk-id="risk-04"]');
  await r4.click();
  await panel.getByRole('button', { name: '驳回', exact: true }).click();
  const rejectFlash = r4.getByTestId('settle-flash-risk-04');
  await expect(rejectFlash).toHaveAttribute('data-kind', 'rejected');
  await expect(rejectFlash).toHaveAttribute('data-duration', '150');
  const timing = await rejectFlash.evaluate((element) => {
    const animation = element.getAnimations()[0];
    return animation ? animation.effect?.getComputedTiming().duration : 0;
  });
  expect(timing).toBe(150);
});

test('首启引导始终掩码且不把凭证写入页面存储或运行输出', async ({ page }) => {
  const consoleMessages: string[] = [];
  page.on('console', (message) => consoleMessages.push(message.text()));
  await page.goto('/');
  const dialog = page.getByTestId('provider-setup');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Courtwork 不会查找其他应用的设置');
  const secret = 'cw-test-secret-42';
  const input = dialog.getByRole('textbox', { name: '访问凭证' });
  await expect(input).toHaveAttribute('type', 'password');
  await input.fill(secret);
  await dialog.getByRole('button', { name: '完成连接' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: /模型服务 · 已连接/ })).toBeVisible();
  const browserStorage = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
  expect(browserStorage).not.toContain(secret);
  expect(consoleMessages.join('\n')).not.toContain(secret);
  expect(await page.locator('body').innerText()).not.toContain(secret);
});

test('临界用量提供一键续行', async ({ page }) => {
  await openWorkbench(page);
  await expect(page.getByTestId('usage-ring')).toContainText('本阶段用量 91%');
  const continuation = page.getByRole('button', { name: '继续本案工作' });
  await continuation.click();
  await expect(continuation).toBeVisible();
  await expect(continuation).toBeDisabled();
  const note = page.getByText('已开启下一阶段');
  await expect(note).toBeVisible();
  await expect(note).toHaveCSS('animation-duration', '0.24s');
});

test('状态圆盘可展开当前阶段用量明细', async ({ page }) => {
  await openWorkbench(page);
  const ring = page.getByTestId('usage-ring');
  await expect(ring).toHaveAttribute('aria-expanded', 'false');
  await ring.click();
  await expect(ring).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('卷宗占用 62%')).toBeVisible();
  await expect(page.getByText('对话占用 23%')).toBeVisible();
  await expect(page.getByText('可整理内容 6%')).toBeVisible();
});

test('控件字体简写不清除全域等宽数字特性', async ({ page }) => {
  await openWorkbench(page);
  await expect(page.getByTestId('usage-ring')).toHaveCSS('font-variant-numeric', 'tabular-nums');
  await expect(page.getByTestId('view-revision')).toHaveCSS('font-variant-numeric', 'tabular-nums');
  await expect(page.locator('.titlebar .case-number')).toHaveCSS('font-variant-numeric', 'tabular-nums');
});

test('de-slop 基线：无语义线、零投影、紧凑行、细滚动条与线框图标', async ({ page }) => {
  await openWorkbench(page);
  await expect(page.locator('.data-card').first().locator('.signature-line')).toHaveCount(0);
  await expect(page.locator('.case-card')).toHaveCSS('box-shadow', 'none');
  await expect(page.locator('.case-card')).toHaveCSS('border-radius', '6px');
  const row = page.locator('.risk-list .dense-row').first();
  const height = (await row.boundingBox())?.height ?? 0;
  expect(height).toBeGreaterThanOrEqual(28);
  expect(height).toBeLessThanOrEqual(34);
  await expect(page.getByTestId('workbench')).toHaveCSS('font-variant-numeric', 'tabular-nums');
  await expect(page.locator('.line-icon').first()).toHaveAttribute('fill', 'none');
  const scrollbarWidth = await page.locator('.conversation-scroll').evaluate((element) => getComputedStyle(element, '::-webkit-scrollbar').width);
  expect(scrollbarWidth).toBe('5px');
});
