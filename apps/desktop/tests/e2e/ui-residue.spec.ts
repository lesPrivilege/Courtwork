import { expect, test, type Locator, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectProvider, installChatStream, openWorkbench } from './helpers';
import {
  captureAnimationBaseline,
  captureClosureShot,
  expectClosureShotsMatch,
  expectNoOverlayResidue,
  suppressFocusRing,
  waitForVisualQuiescence,
} from './overlay-residue';

/**
 * UI-RESIDUE-1（批一）· 可逆交互零残留闭合门。
 *
 * 覆盖 apps/desktop/SPEC.md「疊层控件清单」修正版 17 行（消费 UI-SURFACE-1-FIX）：
 * 对每一可达行跑「初始截图 A → 开 → 中间态断言 → 关 → 截图 B，A≡B（同机运行时缓冲逐字节）+ 残留门」。
 * 另含：外点收敛的点击穿透反例（BENCH 语料）与门禁自证 mutation（不清 portal/不还 focus/不停动画必红）。
 *
 * 目标措辞：已枚举状态图内无已知残留/焦点丢失/状态串线，不作绝对零 bug 宣称。不做批二（状态代数与竞态）。
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureMd = path.resolve(here, '../fixtures/sample-brief.md');

/** 进入演示工作台并等待回放推进到「待用户确认」终点；此后页面静止，A≡B 才成立。 */
async function enterSettledDemo(page: Page): Promise<void> {
  // PILOT-LIVE-1-FIX #2：回放逐事件延时归零（residue 谱专用，main.tsx DEV+E2E 双门读取）——
  // 事件仍全量逐序发布、终点仍由下方条件等待把守，只消除「负载下 180ms×N 回放时长 < 30s 上限」
  // 的时序赌注（曾于 4-worker 全量轮实证超时于本函数的批量确认等待）。
  await page.addInitScript(() => {
    (window as { __courtworkDemoReplayDelayMs?: number }).__courtworkDemoReplayDelayMs = 0;
  });
  await openWorkbench(page);
  // 锚定精确名（批量确认 N 项动作钮）：裸 /批量确认/ 是潜伏歧义定位符——风险行 next-step 文案
  // 「可批量确认」同样命中，分步回放的中间帧曾掩住它，零延时一帧落齐后即 strict violation。
  await page.getByRole('button', { name: /^批量确认 \d+ 项$/ }).waitFor();
  await page.waitForTimeout(400);
}

type FocusExpectation = Locator | 'body' | 'observe';

interface ClosureSpec {
  label: string;
  /** 浮层定位器（可见/卸载断言）。 */
  overlay: Locator;
  open: () => Promise<void>;
  /** 可逆关闭（Escape / 外点 / 取消按钮——不产生副作用的那条）。 */
  close: () => Promise<void>;
  role?: string;
  /** Locator=断言焦点归还该元素；'body'=断言回到 body；'observe'=只留痕不断言。 */
  focus?: FocusExpectation;
  allowedDialogTestIds?: string[];
  mask?: Locator[];
}

/**
 * 开合闭合门：A → 开 → 中间态 → 关 → 残留门 → A≡B。
 * 前置：调用方已把页面带到静止基线态。
 */
async function runClosureGate(page: Page, spec: ClosureSpec): Promise<void> {
  const mask = spec.mask ?? [];
  await suppressFocusRing(page);
  // 取稳定基线 A 前先等页面视觉静止（演示回放终点/入场过渡落定）。
  await waitForVisualQuiescence(page, mask);
  // 焦点“指示”不入 A≡B：A/B 都归一到无焦点（焦点“位置”另由残留门断言）。
  // 否则 composer-shell:focus-within 等焦点态描边会让 A(基线可能聚焦) 与 B(收敛后)像素不等。
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  const shotA = await captureClosureShot(page, mask);
  const baselineAnimations = await captureAnimationBaseline(page);

  await spec.open();
  await expect(spec.overlay.first(), `[${spec.label}] 开：浮层应可见`).toBeVisible();
  if (spec.role) {
    await expect(spec.overlay.first(), `[${spec.label}] 开：role=${spec.role}`).toHaveAttribute('role', spec.role);
  }

  await spec.close();
  await expect(spec.overlay, `[${spec.label}] 关：浮层应卸载`).toHaveCount(0);

  const focus = spec.focus ?? 'observe';
  await expectNoOverlayResidue(page, {
    trigger: typeof focus === 'object' ? focus : undefined,
    baselineAnimations,
    allowedDialogTestIds: spec.allowedDialogTestIds,
    label: spec.label,
  });
  if (focus === 'body') {
    await expect(page.locator('body'), `[${spec.label}] 焦点应回到 body`).toBeFocused();
  }

  // 焦点位置已断言/留痕；把焦点指示从像素层归一后比 A≡B。
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  const shotB = await captureClosureShot(page, mask);
  await expectClosureShotsMatch(page, shotA, shotB, { label: spec.label });
}

test.describe('开合闭合门 · 疊层清单', () => {
  test('user-menu · Dropdown（popover 锚定）', async ({ page }) => {
    await enterSettledDemo(page);
    const trigger = page.getByTestId('user-menu-trigger');
    await runClosureGate(page, {
      label: 'user-menu',
      overlay: page.getByTestId('user-menu'),
      role: 'menu',
      focus: trigger,
      open: () => trigger.click(),
      close: () => page.keyboard.press('Escape'),
    });
  });

  /**
   * PILOT-LIVE-1-FIX #2 · 墙钟稳定性自证：message-actions 的相对时间戳按设计随墙钟翻字
   * （just now→1m ago→…，MessageActions.tsx 30s interval），翻字落在 A→B 窗口内曾以
   * ~1/14 全量轮概率破 A≡B（2026-07-17 收割实证 274/275 于 model-config 例，与验收失败
   * 轮廓同款；慢机窗口更长故更频）。本例把翻字确定性注入 A→B 窗口：掩蔽缺席必红（红证），
   * 墙钟归一化（suppressFocusRing 注入 visibility:hidden，盒占位保留）后必绿——时间语义不属像素域，
   * 该元素的存在/位置仍受 DOM 残留门与全域比对约束（掩蔽矩形方案因 bbox 随文本变宽已证不可行）。
   */
  test('墙钟自证 · 相对时间戳在 A→B 窗口内翻字不得破 A≡B（墙钟归一化）', async ({ page }) => {
    await enterSettledDemo(page);
    const trigger = page.getByTestId('user-menu-trigger');
    await runClosureGate(page, {
      label: 'wall-clock-mask',
      overlay: page.getByTestId('user-menu'),
      role: 'menu',
      focus: trigger,
      open: async () => {
        // 确定性重演跨分钟界翻字（像素形态与真实翻字同构：同元素文本变更）。
        await page.evaluate(() => {
          document.querySelectorAll('[data-testid="message-relative-time"]').forEach((el) => {
            el.textContent = '59m ago';
          });
        });
        await trigger.click();
      },
      close: () => page.keyboard.press('Escape'),
    });
  });

  test('scene-more · Dropdown（popover 锚定）', async ({ page }) => {
    await enterSettledDemo(page);
    const trigger = page.getByTestId('scene-more');
    await runClosureGate(page, {
      label: 'scene-more',
      overlay: page.getByTestId('scene-more-popover'),
      focus: trigger,
      open: () => trigger.click(),
      close: () => page.keyboard.press('Escape'),
    });
  });

  test('composer-plus-menu · Dropdown（popover 锚定）', async ({ page }) => {
    await enterSettledDemo(page);
    const trigger = page.getByTestId('composer-plus');
    await runClosureGate(page, {
      label: 'composer-plus',
      overlay: page.getByTestId('composer-plus-menu'),
      role: 'menu',
      focus: trigger,
      open: () => trigger.click(),
      close: () => page.keyboard.press('Escape'),
    });
  });

  test('model-config-popover · Popover（popover 锚定）', async ({ page }) => {
    await enterSettledDemo(page);
    await connectProvider(page);
    const trigger = page.getByTestId('model-config-trigger');
    await runClosureGate(page, {
      label: 'model-config',
      overlay: page.getByTestId('model-config-popover'),
      role: 'dialog',
      focus: trigger,
      open: () => trigger.click(),
      close: () => page.keyboard.press('Escape'),
    });
  });

  test('command-palette · Command Palette（sheet 模态）', async ({ page }) => {
    await enterSettledDemo(page);
    await runClosureGate(page, {
      label: 'command-palette',
      overlay: page.getByTestId('command-palette'),
      role: 'dialog',
      focus: 'body',
      open: () => page.getByRole('button', { name: 'Search' }).click(),
      close: () => page.keyboard.press('Escape'),
    });
  });

  test('settings-page · Modal（sheet 模态）', async ({ page }) => {
    await enterSettledDemo(page);
    await runClosureGate(page, {
      label: 'settings',
      overlay: page.getByTestId('settings-page'),
      role: 'dialog',
      focus: 'body',
      open: async () => {
        await page.getByTestId('user-menu-trigger').click();
        await page.getByTestId('user-menu').getByRole('menuitem', { name: /Settings/ }).click();
      },
      close: () => page.getByTestId('settings-close').click(),
    });
  });

  test('new-case-dialog · Modal（sheet 模态）', async ({ page }) => {
    await enterSettledDemo(page);
    const trigger = page.getByTestId('new-case-open');
    await runClosureGate(page, {
      label: 'new-case',
      overlay: page.getByTestId('new-case-dialog'),
      role: 'dialog',
      focus: trigger,
      open: () => trigger.click(),
      close: () => page.keyboard.press('Escape'),
    });
  });

  test('archive-popover · Popover（popover 锚定·显式）', async ({ page }) => {
    await enterSettledDemo(page);
    const card = page.locator('.case-card').first();
    await runClosureGate(page, {
      label: 'archive',
      overlay: page.locator('.archive-popover'),
      role: 'dialog',
      focus: 'body',
      open: async () => {
        await card.hover();
        await card.getByTestId('archive-trigger').click();
      },
      close: () => page.locator('.archive-popover').getByRole('button', { name: '取消' }).click(),
    });
  });

  test('file-ops-undo-popover · Popover（popover 锚定·显式）', async ({ page }) => {
    await enterSettledDemo(page);
    await page.getByTestId('scene-more').click();
    await page.getByTestId('scene-more-popover').getByRole('button', { name: '卷宗整理' }).click();
    await page.getByTestId('file-ops-execute').click();
    await expect(page.getByTestId('file-ops-report')).toBeVisible();
    await runClosureGate(page, {
      label: 'file-ops-undo',
      overlay: page.locator('.file-ops-undo-popover'),
      role: 'dialog',
      focus: 'body',
      open: () => page.getByTestId('file-ops-undo').click(),
      close: () => page.locator('.file-ops-undo-popover').getByRole('button', { name: '取消' }).click(),
    });
  });

  test('compile-dialog · Modal（sheet 模态）', async ({ page }) => {
    await enterSettledDemo(page);
    await page.getByTestId('view-draft').click();
    const draft = page.getByTestId('draft-panel');
    await expect(draft).toBeVisible();
    await runClosureGate(page, {
      label: 'compile',
      overlay: page.locator('.compile-dialog'),
      role: 'dialog',
      focus: 'body',
      open: () => draft.getByRole('button', { name: '编译为 Word 文档' }).click(),
      close: () => page.locator('.compile-dialog').getByRole('button', { name: '取消' }).click(),
    });
  });

  test('scope-popover · Popover（popover 锚定·显式）', async ({ page }) => {
    await enterSettledDemo(page);
    await page.getByTestId('composer-file-input').setInputFiles(fixtureMd);
    const scopeBadge = page.locator('[data-testid^="attachment-scope-"]').first();
    await expect(scopeBadge).toBeVisible({ timeout: 15_000 });
    await runClosureGate(page, {
      label: 'scope',
      overlay: page.locator('[data-testid^="scope-popover-"]'),
      role: 'dialog',
      focus: 'body',
      open: () => scopeBadge.click(),
      close: () => page.locator('[data-testid^="scope-popover-"]').first().getByRole('button', { name: '取消' }).click(),
    });
  });

  test('store-chat-popover · Popover（popover 锚定）', async ({ page }) => {
    await openWorkbench(page);
    await page.getByTestId('segment-chat').click();
    await connectProvider(page);
    await installChatStream(page, { content: '已收到，稍后为你处理。' });
    await page.getByTestId('composer-input').fill('先聊一句再存入卷宗。');
    await page.getByTestId('composer-send').click();
    await expect(page.getByText('已收到，稍后为你处理。')).toBeVisible();
    const trigger = page.getByTestId('store-chat');
    await expect(trigger).toBeVisible();
    await page.waitForTimeout(400);
    await runClosureGate(page, {
      label: 'store-chat',
      overlay: page.getByTestId('store-chat-popover'),
      role: 'dialog',
      focus: trigger,
      open: () => trigger.click(),
      close: () => page.keyboard.press('Escape'),
    });
  });

  test('composer-case-menu · Dropdown（popover 锚定·未绑容器面）', async ({ page }) => {
    await page.goto('/');
    const setup = page.getByTestId('provider-setup');
    if (await setup.isVisible()) await setup.getByRole('button', { name: '先查看演示' }).click();
    const trigger = page.getByTestId('composer-case');
    await expect(trigger).toBeVisible();
    await runClosureGate(page, {
      label: 'composer-case',
      overlay: page.getByTestId('composer-case-menu'),
      role: 'listbox',
      focus: trigger,
      open: () => trigger.click(),
      close: () => page.keyboard.press('Escape'),
    });
  });

  test('settings-optin-confirm · Modal-over-modal（sheet 模态·嵌套）', async ({ page }) => {
    await enterSettledDemo(page);
    await page.getByTestId('user-menu-trigger').click();
    await page.getByTestId('user-menu').getByRole('menuitem', { name: /Settings/ }).click();
    await expect(page.getByTestId('settings-page')).toBeVisible();
    await page.getByTestId('settings-nav-privacy').click();
    await runClosureGate(page, {
      label: 'settings-optin',
      overlay: page.getByTestId('settings-optin-confirm'),
      role: 'dialog',
      focus: 'body',
      allowedDialogTestIds: ['settings-page'],
      open: () => page.getByTestId('settings-optin-on').click(),
      close: () =>
        page.getByTestId('settings-optin-confirm').getByRole('button', { name: /Cancel|取消/ }).click(),
    });
  });

  test('provider-setup · Modal（首启凭证·sheet 模态）', async ({ page }) => {
    // 基线 A=安静欢迎面；welcome-demo-start 开 provider-setup；Escape→onClose 退回欢迎面（非 skip 起演示）。
    await page.goto('/');
    await expect(page.getByTestId('welcome-state')).toBeVisible();
    const trigger = page.getByTestId('welcome-demo-start');
    await runClosureGate(page, {
      label: 'provider-setup',
      overlay: page.getByTestId('provider-setup'),
      role: 'dialog',
      focus: trigger,
      open: () => trigger.click(),
      close: () => page.keyboard.press('Escape'),
    });
  });
});

test.describe('疊层清单 · 一次性链式仪式（无对称基线，dismiss 残留门）', () => {
  test('containerize-popover · Popover（先聊后建·一次性链式·dismiss 无残留）', async ({ page }) => {
    await page.goto('/');
    const setup = page.getByTestId('provider-setup');
    if (await setup.isVisible()) await setup.getByRole('button', { name: '先查看演示' }).click();
    await expect(page.getByTestId('composer-case')).toBeVisible();
    await page.getByTestId('composer-file-input').setInputFiles(fixtureMd);
    const chip = page.locator('[data-testid^="attachment-chip-"]').first();
    await expect(chip).toHaveAttribute('data-status', 'ready', { timeout: 15_000 });
    await page.locator('[data-testid^="attachment-scope-"]').first().click();
    await page.locator('[data-testid^="scope-confirm-"]').first().click();
    const overlay = page.getByTestId('containerize-popover');
    await expect(overlay).toBeVisible();
    await expect(overlay).toHaveAttribute('role', 'dialog');
    const baselineAnimations = await captureAnimationBaseline(page);
    await overlay.getByRole('button', { name: '取消' }).click();
    await expect(overlay).toHaveCount(0);
    await expectNoOverlayResidue(page, { baselineAnimations, label: 'containerize' });
  });

  // 疊层清单第 6 行「容器化仪式（rail 未归档行）」在 demo harness 内结构性不可达：
  // 单一 <CaseRail> 挂载恒收 unfiled={[]}（App.tsx:1771），unfiled-store-* 触发行永不渲染；
  // 其 containerize-popover 组件与第 5 行（composer 挂载）同 testid、同 dismiss 力学，已由上例覆盖。
  // 死线索登记见 SPEC 复杂度扫描提案区，本单不复活该 prop 通路。
});

test.describe('点击穿透反例 · 外点收敛不得穿透底层可交互控件', () => {
  test('user-menu 外点 new-case：只收敛不穿透', async ({ page }) => {
    await enterSettledDemo(page);
    await page.getByTestId('user-menu-trigger').click();
    await expect(page.getByTestId('user-menu')).toBeVisible();
    await page.getByTestId('new-case-open').click();
    await expect(page.getByTestId('user-menu'), 'user-menu 应被外点收敛').toBeHidden();
    await expect(
      page.getByTestId('new-case-dialog'),
      '同一次 pointer 不得穿透激活底层 new-case-open（WorkBuddy Settings→search 反例）',
    ).toBeHidden();
  });

  test('composer-plus 外点 user-menu-trigger：只收敛不穿透', async ({ page }) => {
    await enterSettledDemo(page);
    await page.getByTestId('composer-plus').click();
    await expect(page.getByTestId('composer-plus-menu')).toBeVisible();
    await page.getByTestId('user-menu-trigger').click();
    await expect(page.getByTestId('composer-plus-menu'), 'composer-plus 应被外点收敛').toBeHidden();
    await expect(page.getByTestId('user-menu'), '同一次 pointer 不得穿透打开 user-menu').toBeHidden();
  });
});

test.describe('门禁自证 · mutation 必红（全绿≠无 bug）', () => {
  test('不清 portal（孤儿 dialog）→ 残留门必红', async ({ page }) => {
    await enterSettledDemo(page);
    const baselineAnimations = await captureAnimationBaseline(page);
    await page.evaluate(() => {
      const ghost = document.createElement('div');
      ghost.setAttribute('role', 'dialog');
      ghost.setAttribute('data-testid', 'injected-ghost-portal');
      ghost.style.cssText = 'position:fixed;left:40px;top:40px;width:120px;height:80px;background:#fff;';
      ghost.textContent = 'ghost';
      document.body.appendChild(ghost);
    });
    await expect(
      expectNoOverlayResidue(page, { baselineAnimations, label: 'inject-portal' }),
    ).rejects.toThrow(/孤儿浮层/);
  });

  test('不还 focus（落别处）→ 残留门必红', async ({ page }) => {
    await enterSettledDemo(page);
    const baselineAnimations = await captureAnimationBaseline(page);
    const trigger = page.getByTestId('user-menu-trigger');
    await page.getByTestId('new-case-open').focus();
    await expect(
      expectNoOverlayResidue(page, { trigger, baselineAnimations, label: 'inject-focus' }),
    ).rejects.toThrow(/焦点未归还/);
  });

  test('不停动画（无限动画）→ 残留门必红', async ({ page }) => {
    await enterSettledDemo(page);
    const baselineAnimations = await captureAnimationBaseline(page);
    await page.evaluate(() => {
      const host = document.querySelector('[data-testid="workbench"]') as HTMLElement | null;
      (host ?? document.body).animate([{ opacity: 1 }, { opacity: 0.985 }], {
        duration: 700,
        iterations: Infinity,
      });
    });
    await expect(
      expectNoOverlayResidue(page, { baselineAnimations, label: 'inject-anim' }),
    ).rejects.toThrow(/动画未归零/);
  });
});
