import { expect, test } from '@playwright/test';
import { createNamedCase } from './helpers';

/**
 * LAYOUT-CONVERGE-1（Grok 四准则审计 R4）：左栏撤卡后，窄轨网格不得再申请 48px 首列。
 * 修前 grid 为 `48px minmax(0,1fr) minmax(280px,320px)`，CaseRail 已卸载 → 正文列被自动排布挤进
 * 那条 48px 轨道（实测 conversation 宽仅 48px），末尾反留一条空列。
 *
 * 触发窄轨需「左收 + 八个模块全折」。样板案的 revision 由场景自动展开且无 outline
 * 折叠入口，故走新建非演示案：moduleOpen 停在 DEFAULT（仅 progress 开），折掉 progress 即全关。
 */
test.describe('LAYOUT-CONVERGE-1 收拢无残余', () => {
  test('窄轨（左收 + 模块全折）：撤卡后正文列不被 48px 幽灵列挤压', async ({ page }) => {
    await page.goto('/');
    const setup = page.getByTestId('provider-setup');
    if (await setup.isVisible()) await setup.getByRole('button', { name: '先查看演示' }).click();
    await page.mouse.move(0, 0);
    await createNamedCase(page, '布局收敛非演示案');

    // 左收（撤卡）+ 模块全折（默认仅 progress 开）→ 窄轨态
    await page.getByTestId('collapse-left-rail').click();
    await page.getByTestId('module-progress-toggle').click();

    const ws = page.getByTestId('workspace');
    await expect(ws).toHaveAttribute('data-right-narrow', 'true');
    // 撤卡：左栏零挂载（展开钮驻 chrome collapse-left-rail）
    await expect(page.getByTestId('case-rail')).toHaveCount(0);
    await expect(page.getByTestId('collapse-left-rail')).toBeVisible();

    // grid 首列不得为 48px 幽灵列（getBoundingClientRect 实测正文列未被挤压）
    const firstTrack = await ws.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ')[0]);
    expect(firstTrack).not.toBe('48px');
    const conv = (await page.getByTestId('conversation-canvas').boundingBox())!;
    expect(conv.x).toBeLessThanOrEqual(9); // 贴左缘（8px 外缘），非被幽灵列右推
    expect(conv.width).toBeGreaterThan(300); // 修前被挤压到 48px
  });
});
