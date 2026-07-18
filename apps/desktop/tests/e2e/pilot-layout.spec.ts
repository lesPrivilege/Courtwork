import { expect, test, type Page } from '@playwright/test';
import { createNamedCase, openModuleList, openWorkbench } from './helpers';

/**
 * PILOT-LIVE-1 D：双侧收敛居中 + 右栏默认窄态。
 *
 * 根因（已核实现状，SPEC 详列）：
 * 1) work 段正文测宽（--content-measure）此前只在双侧收拢（.left-collapsed.right-collapsed）
 *    与 chat 段套用；都开/仅左收/仅右收三态的 conversation-scroll/composer-stack/scene-strip
 *    随列宽 flex-stretch 铺满，未收敛到统一测宽基准，chat-titlebar/chat-case-head 的居中规则
 *    也只认 left-collapsed，与新收敛的正文列错位。
 * 2) 右栏默认恒宽（schema-min 560~1.25fr）——DEFAULT_MODULE_OPEN.progress=true 致
 *    compactLayout（rails-compact 窄轨）事实上恒不触发；即使触发也仅限左收+全折组合，
 *    不覆盖「都开/仅左收/仅右收」下 Preview 未展开的常态。
 *
 * mainArea 语义：work 段用 conversation-canvas 的 boundingBox（任意收拢组合下都是主区真值，
 * 即 grid 子项本身，非视口）；chat 段用 chat-canvas；welcome 内容寄居 work 段 conversation-canvas
 * 之内，同样以其为参照系。measure 固定用 --content-measure（当前 token 值 760）。
 */

const MEASURE = 760;
const WIDE_VIEWPORT = { width: 2400, height: 1000 };

interface Box { x: number; y: number; width: number; height: number }

/** 双证 helper：宽度证 + 中心证，容差 2px（子像素/滚动条误差）。 */
function expectMeasured(target: Box, mainArea: Box, measure: number) {
  const expectedWidth = Math.min(measure, mainArea.width - 32);
  expect(Math.abs(target.width - expectedWidth), `width ${target.width} vs expected ${expectedWidth}`)
    .toBeLessThanOrEqual(2);
  const targetCenterX = target.x + target.width / 2;
  const mainCenterX = mainArea.x + mainArea.width / 2;
  expect(Math.abs(targetCenterX - mainCenterX), `centerX ${targetCenterX} vs main centerX ${mainCenterX}`)
    .toBeLessThanOrEqual(2);
}

/** 都开态起手式：非 demo 案，跳过 provider-setup，不经过 demo replay（layout-converge.spec.ts 同式）。 */
async function freshNonDemoCase(page: Page, name: string) {
  await page.goto('/');
  const setup = page.getByTestId('provider-setup');
  if (await setup.isVisible()) await setup.getByRole('button', { name: '先查看演示' }).click();
  await page.mouse.move(0, 0);
  await createNamedCase(page, name);
  await expect(page.getByTestId('workspace')).toHaveAttribute('data-view-segment', 'work');
}

test.describe('PILOT-LIVE-1 D · work 段全收拢组合正文测宽收敛', () => {
  test('都开：composer-stack/scene-strip 双证（右栏恒宽致正文列未封顶测宽）', async ({ page }) => {
    await page.setViewportSize(WIDE_VIEWPORT);
    await freshNonDemoCase(page, 'PILOT-D 都开');

    const mainArea = (await page.getByTestId('conversation-canvas').boundingBox())!;
    const composer = (await page.locator('.composer-stack').boundingBox())!;
    const scene = (await page.locator('.scene-strip').boundingBox())!;
    expectMeasured(composer, mainArea, MEASURE);
    expectMeasured(scene, mainArea, MEASURE);

    // conversation-empty 自身带固定 margin:24px 16px 二次内缩，不适合做宽度证，只做中心证。
    const empty = (await page.getByTestId('conversation-empty').boundingBox())!;
    const emptyCenterX = empty.x + empty.width / 2;
    const mainCenterX = mainArea.x + mainArea.width / 2;
    expect(Math.abs(emptyCenterX - mainCenterX)).toBeLessThanOrEqual(2);
  });

  test('仅左收：composer-stack/scene-strip 双证 + chat-titlebar 居中跟随', async ({ page }) => {
    await page.setViewportSize(WIDE_VIEWPORT);
    await freshNonDemoCase(page, 'PILOT-D 仅左收');

    await page.getByTestId('collapse-left-rail').click();
    await expect(page.getByTestId('workspace')).toHaveAttribute('data-left-collapsed', 'true');
    await expect(page.getByTestId('workspace')).toHaveAttribute('data-right-collapsed', 'false');

    const mainArea = (await page.getByTestId('conversation-canvas').boundingBox())!;
    const composer = (await page.locator('.composer-stack').boundingBox())!;
    const scene = (await page.locator('.scene-strip').boundingBox())!;
    expectMeasured(composer, mainArea, MEASURE);
    expectMeasured(scene, mainArea, MEASURE);

    // 2026-07-17 产品拍板：案件标题改左对齐 composer 左边界（不再居中），
    // padding-inline 仍跟随同一 --content-measure 基准，故左边界与 composer-stack 对齐。
    const titlebar = page.getByTestId('conversation-canvas').locator('.chat-titlebar');
    await expect(titlebar).toHaveCSS('justify-content', 'flex-start');
  });

  test('仅右收：composer-stack/scene-strip 双证', async ({ page }) => {
    await page.setViewportSize(WIDE_VIEWPORT);
    await freshNonDemoCase(page, 'PILOT-D 仅右收');

    await page.getByTestId('collapse-right-rail').click();
    await expect(page.getByTestId('workspace')).toHaveAttribute('data-right-collapsed', 'true');
    await expect(page.getByTestId('workspace')).toHaveAttribute('data-left-collapsed', 'false');

    const mainArea = (await page.getByTestId('conversation-canvas').boundingBox())!;
    const composer = (await page.locator('.composer-stack').boundingBox())!;
    const scene = (await page.locator('.scene-strip').boundingBox())!;
    expectMeasured(composer, mainArea, MEASURE);
    expectMeasured(scene, mainArea, MEASURE);

    // 2026-07-17 产品拍板：案件标题改左对齐 composer 左边界，见「仅左收」用例注释。
    const titlebar = page.getByTestId('conversation-canvas').locator('.chat-titlebar');
    await expect(titlebar).toHaveCSS('justify-content', 'flex-start');
  });

  test('双收：composer-stack/scene-strip 双证（回归锁，既有 LAYOUT-CONVERGE-1 P1-3 升级为双证）', async ({ page }) => {
    await page.setViewportSize(WIDE_VIEWPORT);
    await freshNonDemoCase(page, 'PILOT-D 双收');

    await page.getByTestId('collapse-left-rail').click();
    await page.getByTestId('collapse-right-rail').click();
    await expect(page.getByTestId('workspace')).toHaveAttribute('data-left-collapsed', 'true');
    await expect(page.getByTestId('workspace')).toHaveAttribute('data-right-collapsed', 'true');

    const mainArea = (await page.getByTestId('conversation-canvas').boundingBox())!;
    const composer = (await page.locator('.composer-stack').boundingBox())!;
    const scene = (await page.locator('.scene-strip').boundingBox())!;
    expectMeasured(composer, mainArea, MEASURE);
    expectMeasured(scene, mainArea, MEASURE);
  });
});

test.describe('PILOT-LIVE-1 D · 右栏默认窄态', () => {
  test('非 demo 案默认视口：右栏窄轨 ≤340px；Preview 展开后回宽轨；返回大纲复窄', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await freshNonDemoCase(page, 'PILOT-D 右栏窄态');

    const rail = page.getByTestId('right-module-stack');
    await expect(rail).toBeVisible();
    const narrowBox = (await rail.boundingBox())!;
    expect(narrowBox.width).toBeLessThanOrEqual(340);

    // Preview 手风琴默认展开（outlineOpen 初值 true，App.tsx:408），直接点一条大纲行进入浏览器态。
    await page.getByTestId('outline-timeline').click();
    await expect(page.getByTestId('preview-host')).toBeVisible();
    const wideBox = (await rail.boundingBox())!;
    expect(wideBox.width).toBeGreaterThan(480);

    // 返回大纲：previewOpen 复位，右栏复窄。
    await page.getByTestId('preview-back').click();
    await expect(page.getByTestId('utility-rail')).toBeVisible();
    const renarrowedBox = (await rail.boundingBox())!;
    expect(renarrowedBox.width).toBeLessThanOrEqual(340);
  });

  test('compactLayout 不得与 previewOpen 同时生效（左收+全折+Preview 开时不得压窄轨）', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await freshNonDemoCase(page, 'PILOT-D compact 与 preview 互斥');

    await page.getByTestId('collapse-left-rail').click();
    await page.getByTestId('module-progress-toggle').click(); // 默认仅 progress 开，折掉即全折

    await expect(page.getByTestId('workspace')).toHaveAttribute('data-compact', 'true');

    // Preview 手风琴默认展开（outlineOpen 初值 true）；compactLayout 只管其余 8 个 moduleOpen，
    // 不影响 Preview 自身可点，直接进入浏览器态。
    await page.getByTestId('outline-timeline').click();
    await expect(page.getByTestId('preview-host')).toBeVisible();

    // previewOpen=true 时 compactLayout 必须让位（不得继续用 rails-compact 窄轨压 Preview）。
    await expect(page.getByTestId('workspace')).toHaveAttribute('data-compact', 'false');
    const rail = page.getByTestId('right-module-stack');
    const box = (await rail.boundingBox())!;
    expect(box.width).toBeGreaterThan(480);
  });
});

test.describe('PILOT-LIVE-1 D · chat 段 / welcome 中心回归锁', () => {
  test('chat 段 composer 与 chat-canvas 同轴；welcome-home 与 conversation-canvas 同轴', async ({ page }) => {
    await page.setViewportSize(WIDE_VIEWPORT);
    await freshNonDemoCase(page, 'PILOT-D chat 段回归锁');

    // chat 段：既有 .chat-segment .composer-stack 基线（styles.css，回归锁，非新增行为）。
    await page.getByTestId('segment-chat').click();
    await expect(page.getByTestId('workspace')).toHaveAttribute('data-view-segment', 'chat');
    const chatMain = (await page.getByTestId('chat-canvas').boundingBox())!;
    const chatComposer = (await page.locator('.composer-stack').boundingBox())!;
    expectMeasured(chatComposer, chatMain, MEASURE);

    // welcome：composer-plus/新建案入口触发的欢迎态，测宽单源 --home-welcome-measure（560），
    // 中心须与 work 段 conversation-canvas 同轴（P2-4 既有基线，本单不改其测宽值）。
    // 冷启（goto '/'）不自动选中案件（pilot-entry.spec.ts C2 welcome 用例同式），直接落 welcome。
    await page.goto('/');
    await expect(page.getByTestId('welcome-state')).toBeVisible();
    const welcomeMain = (await page.getByTestId('conversation-canvas').boundingBox())!;
    const welcomeMeasure = await page.evaluate(() =>
      Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--home-welcome-measure')));
    expect(welcomeMeasure).toBeGreaterThan(0);
    const welcomeHome = (await page.getByTestId('welcome-state').boundingBox())!;
    expectMeasured(welcomeHome, welcomeMain, welcomeMeasure);
  });
});

test.describe('PILOT-LIVE-1 D · 右栏窄态可用性目检（视觉留证）', () => {
  test('非 demo 案：progress/working-folders/context 全展开 + Preview 大纲展开，零横向溢出', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await freshNonDemoCase(page, 'PILOT-D 窄态目检非演示案');
    await openModuleList(page);
    for (const id of ['progress', 'working-folders', 'context']) {
      const open = await page.getByTestId(`module-${id}`).getAttribute('data-open');
      if (open !== 'true') await page.getByTestId(`module-${id}-toggle`).click();
    }
    // Preview 手风琴默认展开（outlineOpen 初值 true，App.tsx:408）；防御性核查，非默认态才点。
    const previewOpenState = await page.getByTestId('module-preview').getAttribute('data-open');
    if (previewOpenState !== 'true') await page.getByTestId('module-preview-toggle').click();

    const overflows = await page.evaluate(() => {
      const bad: string[] = [];
      document.querySelectorAll('.rail-module-body, .preview-outline-row, .right-rail-modules, .rail-module-head')
        .forEach((el) => { if (el.scrollWidth > el.clientWidth + 1) bad.push(el.className); });
      return bad;
    });
    expect(overflows).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('non-demo-narrow-all-open.png') });
  });

  test('demo 案：四模块 + 四工作面大纲 + 原件阅读入口全展开，零横向溢出', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openWorkbench(page);
    await openModuleList(page);
    for (const id of ['progress', 'working-folders', 'context']) {
      const open = await page.getByTestId(`module-${id}`).getAttribute('data-open');
      if (open !== 'true') await page.getByTestId(`module-${id}-toggle`).click();
    }
    // Preview 手风琴默认展开（outlineOpen 初值 true，App.tsx:408）；防御性核查，非默认态才点。
    const previewOpenState = await page.getByTestId('module-preview').getAttribute('data-open');
    if (previewOpenState !== 'true') await page.getByTestId('module-preview-toggle').click();

    const overflows = await page.evaluate(() => {
      const bad: string[] = [];
      document.querySelectorAll('.rail-module-body, .preview-outline-row, .right-rail-modules, .rail-module-head, .rail-reader-entries')
        .forEach((el) => { if (el.scrollWidth > el.clientWidth + 1) bad.push(el.className); });
      return bad;
    });
    expect(overflows).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('demo-narrow-all-open.png') });
  });
});
