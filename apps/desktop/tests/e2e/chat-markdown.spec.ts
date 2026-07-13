import { expect, test } from '@playwright/test';
import { connectProvider, installChatStream, openWorkbench } from './helpers';

/** 批次七②：chat 回复 md 富渲染——加重/列表/行内 code/围栏代码块（paste 块同凡例）/标题，星号等字面量不得漏出。 */
test('chat 回复富渲染：strong/列表/行内 code/代码块落成真实标签，零字面星号', async ({ page }) => {
  await openWorkbench(page);
  await connectProvider(page);
  await page.getByTestId('segment-chat').click();
  await installChatStream(page, {
    content: '# 审查要点\n\n这是**重点结论**与 `inline` 标识。\n\n- 条目一\n- 条目二\n\n1. 第一步\n2. 第二步\n\n```\nconst risk = review(contract);\n```\n\n收尾段落。',
  });
  await page.getByTestId('composer-input').fill('渲染验证');
  await page.getByTestId('composer-send').click();
  const message = page.getByTestId('chat-assistant-message');
  await expect(message).toBeVisible();
  const markdown = message.getByTestId('chat-markdown');
  await expect(markdown.locator('strong')).toHaveText('重点结论');
  await expect(markdown.locator('ul li')).toHaveCount(2);
  await expect(markdown.locator('ol li')).toHaveCount(2);
  await expect(markdown.locator('code').first()).toHaveText('inline');
  await expect(markdown.getByTestId('paste-block')).toBeVisible();
  await expect(markdown.locator('.md-h')).toHaveText('审查要点');
  const raw = await markdown.evaluate((element) => element.textContent ?? '');
  expect(raw).not.toContain('**');
  expect(raw).not.toContain('```');
  expect(raw).not.toContain('# ');
});
