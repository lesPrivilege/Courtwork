import { expect, test } from '@playwright/test';
import { createNamedCase, openModuleList, openWorkbench } from './helpers';

/**
 * READER-ISOLATION-1：demo 语料入口只属 demo 案（核心不变量 7「demo 与真实路径双向隔离」的 UI 面）。
 * 真机试点后 PILOT-LIVE-1 提案区上报、架构采纳成单：grant/unbound 案右栏「原件阅读」此前无条件
 * 渲染硬编码演示语料入口（设备采购合同 → 点击注入 demo 原文进 Preview），演示语料对真实案可见即违规。
 */

test('非 demo 案右栏零 demo 语料入口（隔离红证）', async ({ page }) => {
  await openWorkbench(page);
  await createNamedCase(page, 'READER-ISO 真实案');
  await expect(page.getByTestId('demo-case-badge')).toHaveCount(0);

  await openModuleList(page);
  await page.getByTestId('module-working-folders-toggle').click();

  // 红证断言：非 demo 案不得出现任何演示语料阅读入口（在场即不变量 7 UI 面违规）。
  await expect(page.getByTestId('reader-entry')).toHaveCount(0);
  await expect(page.getByTestId('right-module-stack')).not.toContainText('设备采购合同');
  // 空入口时不留悬空「原件阅读」标头（诚实缺席，非空壳装饰）。
  await expect(page.getByTestId('reader-entries')).toHaveCount(0);
});

test('demo 案原件阅读入口保持原行为（对照锁：三入口在场、点击进入只读阅读）', async ({ page }) => {
  await openWorkbench(page);
  await openModuleList(page);
  await page.getByTestId('module-working-folders-toggle').click();

  await expect(page.getByTestId('reader-entry')).toHaveCount(3);
  await page.getByTestId('reader-entry').first().click();
  await expect(page.getByTestId('preview-host')).toContainText('设备采购合同');
});
