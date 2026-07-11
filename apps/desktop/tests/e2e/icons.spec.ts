import { expect, test } from '@playwright/test';

test('P-4 自绘图标在 16px/24px 审计板保持 1.35px 单色线框', async ({ page }) => {
  await page.goto('/icon-audit.html');
  const audit = page.getByTestId('icon-audit');
  await expect(audit).toBeVisible();
  await expect(page.locator('.icon-audit-card')).toHaveCount(20);
  await expect(page.locator('.icon-audit-card[data-icon-name^="split-gate-"]')).toHaveCount(3);

  const geometry = await page.locator('.icon-audit-card').evaluateAll((cards) => cards.map((card) => {
    const small = card.querySelector<SVGSVGElement>('.size-16 svg')!;
    const large = card.querySelector<SVGSVGElement>('.size-24 svg')!;
    return {
      name: card.getAttribute('data-icon-name'),
      small: small.getBoundingClientRect().width,
      large: large.getBoundingClientRect().width,
      stroke: small.getAttribute('stroke'),
      strokeWidth: small.getAttribute('stroke-width'),
      fill: small.getAttribute('fill'),
      color: getComputedStyle(small).color,
    };
  }));

  for (const icon of geometry) {
    expect(icon.small, `${icon.name} 16px`).toBe(16);
    expect(icon.large, `${icon.name} 24px`).toBe(24);
    expect(icon.stroke).toBe('currentColor');
    expect(icon.strokeWidth).toBe('1.35');
    expect(icon.fill).toBe('none');
    expect(icon.color).toBe('rgb(10, 37, 64)');
  }
});
