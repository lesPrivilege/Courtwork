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

/**
 * CHAT-MD-TABLE-1：审慎 GFM 子集扩围——管道表格 + `---` hr。真机 DeepSeek 高频输出管道表格
 * 曾被现渲染器降级为段落（PILOT-LIVE-2 E 提案区发现）；本单落地表格/hr 渲染，「宁缺毋滥」
 * 边界收窄不废除——畸形/歧义语法仍降级回段落，零猜测补全。
 */
test('合法管道表格渲染为真实 table：表头/对齐/单元格内联加重生效（①）', async ({ page }) => {
  await openWorkbench(page);
  await connectProvider(page);
  await page.getByTestId('segment-chat').click();
  await installChatStream(page, {
    content: '| 风险项 | 等级 |\n| --- | :---: |\n| **逾期违约金** | 高 |\n| 管辖条款缺失 | 中 |',
  });
  await page.getByTestId('composer-input').fill('给我一张风险表');
  await page.getByTestId('composer-send').click();
  const markdown = page.getByTestId('chat-assistant-message').getByTestId('chat-markdown');
  const table = markdown.getByTestId('chat-markdown-table');
  await expect(table).toBeVisible();
  await expect(table.locator('thead th')).toHaveCount(2);
  await expect(table.locator('tbody tr')).toHaveCount(2);
  await expect(table.locator('tbody tr').first().locator('td').first().locator('strong')).toHaveText('逾期违约金');
  const raw = await markdown.evaluate((element) => element.textContent ?? '');
  expect(raw).not.toContain('|');
  expect(raw).not.toContain('---');
});

test('畸形表格（分隔行缺失）降级回段落，零猜测补全（红证反例）', async ({ page }) => {
  await openWorkbench(page);
  await connectProvider(page);
  await page.getByTestId('segment-chat').click();
  await installChatStream(page, { content: '| 甲 | 乙 |\n| 1 | 2 |' });
  await page.getByTestId('composer-input').fill('给我一张表');
  await page.getByTestId('composer-send').click();
  const markdown = page.getByTestId('chat-assistant-message').getByTestId('chat-markdown');
  await expect(markdown.getByTestId('chat-markdown-table')).toHaveCount(0);
  await expect(markdown.locator('p')).toContainText('| 甲 | 乙 |');
});

/**
 * MD-CONVERGE-1+：解析器换 remark 后的扩围五项真机渲染对照。图片与公式明确除外——
 * 除外项不静默吞，仍以字面量原样透出（无多模态管线时渲染图片即造能力幻觉）。
 */
test('扩围五项落真实标签；图片/公式/原始 HTML 原样透出不静默吞', async ({ page }) => {
  await openWorkbench(page);
  await connectProvider(page);
  await page.getByTestId('segment-chat').click();
  await installChatStream(page, {
    content: [
      '依据 [民法典第五百七十七条](https://example.com/577) 与 *补充约定*：',
      '',
      '> 违约方应当承担继续履行的责任。',
      '',
      '- [x] 已核验付款条款',
      '- [ ] 待核验验收条款',
      '',
      '~~原第八条~~ 已废止。',
      '',
      '附图 ![条款截图](https://example.com/x.png) 与公式 $E=mc^2$。',
    ].join('\n'),
  });
  await page.getByTestId('composer-input').fill('扩围渲染验证');
  await page.getByTestId('composer-send').click();
  const markdown = page.getByTestId('chat-assistant-message').getByTestId('chat-markdown');
  await expect(markdown).toBeVisible();

  // ① 链接：可见文字落 span.md-link，且零 <a href>（打开能力挂 EXPLORE-RAIL-1 权限位）
  await expect(markdown.locator('.md-link')).toHaveText('民法典第五百七十七条');
  await expect(markdown.locator('a')).toHaveCount(0);
  // ② 单星号斜体 ③ 引用 ④ 删除线
  await expect(markdown.locator('em')).toHaveText('补充约定');
  await expect(markdown.locator('blockquote')).toContainText('继续履行');
  await expect(markdown.locator('del')).toHaveText('原第八条');
  // ⑤ 任务清单：勾选态可读且非可交互控件
  await expect(markdown.locator('li.md-task')).toHaveCount(2);
  await expect(markdown.locator('li.md-task[data-checked="true"]')).toHaveCount(1);
  await expect(markdown.locator('input')).toHaveCount(0);

  const raw = await markdown.evaluate((element) => element.textContent ?? '');
  // 扩围语法的字面标记不得漏出。注意：不能泛断言「无 `](`」——被刻意除外的图片字面量
  // 本就含该子串，那样写会与下方「图片原样透出」互相矛盾。故只锁链接自身的标记。
  expect(raw).not.toContain('](https://example.com/577)');
  expect(raw).not.toContain('~~');
  expect(raw).not.toContain('[x]');
  // 明确除外项：不渲染为元素，但原文可见（不静默吞）
  await expect(markdown.locator('img')).toHaveCount(0);
  expect(raw).toContain('![条款截图](https://example.com/x.png)');
  expect(raw).toContain('$E=mc^2$');
});

test('--- 独占一行渲染为 hr（②）', async ({ page }) => {
  await openWorkbench(page);
  await connectProvider(page);
  await page.getByTestId('segment-chat').click();
  await installChatStream(page, { content: '首段。\n\n---\n\n次段。' });
  await page.getByTestId('composer-input').fill('分隔一下');
  await page.getByTestId('composer-send').click();
  const markdown = page.getByTestId('chat-assistant-message').getByTestId('chat-markdown');
  await expect(markdown.locator('hr')).toHaveCount(1);
  const raw = await markdown.evaluate((element) => element.textContent ?? '');
  expect(raw).not.toContain('---');
});
