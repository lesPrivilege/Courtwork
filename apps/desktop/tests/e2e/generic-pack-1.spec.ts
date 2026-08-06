import { expect, test } from '@playwright/test';
import { connectProvider, openWorkbench } from './helpers';

/**
 * GENERIC-PACK-1（解耦相）专用 e2e：卸载态（未绑定 matter）与过渡默认的机器判据。
 *
 * 卸载态按 ADR-015 决定三补记经**测试构造点的未绑定 matter** 取证（packBinding: []），
 * 不入产品 UX——过渡期内新建 matter 默认绑定 Legal（`PACK-INTERACT-1` 销条）。
 */

const CASE_LIST_KEY = 'courtwork.case-list.v1';

test('卸载态：未绑定 matter 页签集零垂类（effective registry 派生）', async ({ page }) => {
  await page.addInitScript(({ key, payload }) => {
    localStorage.setItem(key, JSON.stringify(payload));
  }, {
    key: CASE_LIST_KEY,
    payload: {
      version: 1,
      cases: [{ id: 'unbound-1', title: '未绑定案', kind: 'case', packBinding: [] }],
    },
  });
  await page.goto('/');
  const setup = page.getByTestId('provider-setup');
  if (await setup.isVisible()) await setup.getByRole('button', { name: '先查看演示' }).click();
  await page.getByTestId('case-card-unbound-1').getByRole('button', { name: '未绑定案', exact: true }).click();
  await expect(page.getByTestId('scene-strip')).toBeVisible();
  // 卸载态起手引导（裁定二）：matter 规范文件提示＋Draft 入口，零垂类兜底——条内无任何垂类按钮。
  await expect(page.getByTestId('scene-unloaded-hint')).toBeVisible();
  await expect(page.getByTestId('scene-unloaded-hint')).toContainText('《场景规范.md》');
  for (const legalCopy of ['整理卷宗', '审查合同', '卷宗整理', '起草答辩状', '停止审查']) {
    await expect(page.getByTestId('scene-strip').getByRole('button', { name: legalCopy, exact: true })).toHaveCount(0);
  }
  // Draft 入口打开工作面预览（壳内通用起草画布，卸载态仍可用）。
  await page.getByTestId('scene-unloaded-draft').click();
  const tabs = page.getByRole('tablist', { name: '结构化工作面' });
  await expect(tabs).toBeVisible();
  // 四枚垂类页签标题一个都不许出现；通用起草画布在。
  for (const legalTab of ['时间线', '关系图谱', '矩阵审阅', '修订预览']) {
    await expect(tabs.getByRole('tab', { name: legalTab })).toHaveCount(0);
  }
  await expect(tabs.getByRole('tab', { name: '起草画布' })).toHaveCount(1);
  // 非 grant 卸载案的工作面是中性空态（1491 门）；grant 卸载案的起草面＝通用工作稿轨
  // 的断言随③全链谱（matter 创建→work→产物→回看）同批取证。
});

test('过渡默认：新建 matter 持久携 packBinding [legal]（PACK-INTERACT-1 销条）', async ({ page }) => {
  await openWorkbench(page);
  await page.getByTestId('new-case-open').click();
  const dialog = page.getByTestId('new-case-dialog');
  await dialog.getByRole('button', { name: '不使用文件夹，直接命名' }).click();
  await dialog.getByRole('textbox', { name: '案件名称' }).fill('过渡默认案');
  await dialog.getByRole('button', { name: '创建案件' }).click();
  await dialog.waitFor({ state: 'hidden' }).catch(() => undefined);
  const envelope = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as { cases?: Array<Record<string, unknown>> });
  }, CASE_LIST_KEY);
  const record = envelope?.cases?.find((item) => item.title === '过渡默认案');
  expect(record).toBeDefined();
  expect(record!.packBinding).toEqual(['legal']);
});

/**
 * ③ 卸载态成品全链（边界 ③ + ①附 联取）：测试构造点的未绑定 matter（grant 文件夹 + 显式
 * 零绑定）走 matter 创建→work→产物→回看；整面评审截图链入 release/evidence/
 * generic-pack-1-unloaded-2026-08-06/（评审对象是成品不是开关）。Work 面 prompt 同批断言
 * 零垂类语义（44caee5 义务，同一测试构造路径）。
 */
type PiHooks = {
  reset(): void;
  setScript(steps: unknown[]): void;
  setWorkspaceFile(logicalPath: string, file: { content: string; contentSha256: string; byteLength: number }): void;
};
const CHAIN_SHA = 'e80ddeb170a3513e335ada586bec6f0068e8be8c66ab0845b38ec541edb888ba';
const CHAIN_SCRIPT = [
  { kind: 'text', delta: '先读案件材料。' },
  { kind: 'tool', toolCallId: 'tc_1', toolName: 'read' },
  { kind: 'toolEnd', toolCallId: 'tc_1', toolName: 'read' },
  { kind: 'tool', toolCallId: 'tc_2', toolName: 'write' },
  { kind: 'propose', toolCallId: 'tc_2', operationId: 'op_1', logicalPath: '工作纪要.md', byteLength: 24, contentSha256: CHAIN_SHA },
  { kind: 'toolEnd', toolCallId: 'tc_2', toolName: 'write' },
  { kind: 'text', delta: '已写入 /workspace/工作纪要.md。' },
  { kind: 'usage', costUsd: 0.0012 },
  { kind: 'terminal', status: 'completed' },
];
const OUT_DIR = '../../release/evidence/generic-pack-1-unloaded-2026-08-06';

test('③ 卸载态成品全链：未绑定 matter 创建→work→产物→回看（整面评审截图链）', async ({ page }) => {
  await page.addInitScript(({ key, payload }) => {
    localStorage.setItem(key, JSON.stringify(payload));
  }, {
    key: CASE_LIST_KEY,
    payload: {
      version: 1,
      cases: [{ id: 'unbound-chain', title: '卸载全链案', kind: 'case', grantId: 'unbound-grant', label: '卸载卷宗夹', packBinding: [] }],
    },
  });
  await page.goto('/');
  const setup = page.getByTestId('provider-setup');
  if (await setup.isVisible()) await setup.getByRole('button', { name: '先查看演示' }).click();

  // ① matter 创建（测试构造点：持久面显式零绑定 + grant 文件夹）——选中即 Work 面。
  await page.getByTestId('case-card-unbound-chain').getByRole('button', { name: '卸载全链案', exact: true }).click();
  await expect(page.getByTestId('scene-strip')).toBeVisible();
  // 起手引导＝通用开场（matter 规范文件提示＋Draft 入口），零垂类兜底。
  await expect(page.getByTestId('scene-unloaded-hint')).toBeVisible();
  await expect(page.getByTestId('scene-strip').getByRole('button', { name: '审查合同', exact: true })).toHaveCount(0);
  await page.screenshot({ path: `${OUT_DIR}/01-matter-created-work-unloaded.png` });

  // ② work：Work 面 Chat 一回合——prompt 零垂类语义（44caee5，同构造路径）。
  // 测试构造点不走首启引导（评审对象是成品不是开关）：标记引导已阅＋直接置凭证为 verified。
  await page.evaluate(() => {
    localStorage.setItem('courtwork.onboarding.seen', '1');
    
    (window as unknown as {
      __courtworkCredentialHooks?: { setStatus(status: unknown): void };
    }).__courtworkCredentialHooks?.setStatus({
      credential: { phase: 'verified' },
      connection: { phase: 'ready' },
    });
  });
  await connectProvider(page);
  await page.evaluate(() => {
    type Message = { role: string; content: string };
    type Ctx = { request: { systemPrompt?: string; messages: Message[] }; requestId: string; providerId: string; modelId: string };
    const hooks = (window as typeof window & {
      __courtworkChatHooks?: { setStreamFactory(factory: ((context: Ctx) => AsyncIterable<unknown>) | null): void };
    }).__courtworkChatHooks;
    if (!hooks) throw new Error('chat hooks missing');
    const store = (window as typeof window & { __capturedSystemPrompts?: string[] });
    store.__capturedSystemPrompts = [];
    hooks.setStreamFactory(async function* ({ request, requestId, providerId, modelId }) {
      store.__capturedSystemPrompts!.push(request.systemPrompt ?? '');
      yield { type: 'started', requestId, seq: 0, providerId, modelId };
      yield { type: 'content_delta', requestId, seq: 1, delta: '材料清单如工作区所示。' };
      yield { type: 'completed', requestId, seq: 2, finishReason: 'stop' };
    });
  });
  await page.getByTestId('composer-input').fill('工作区里有哪些材料？');
  await page.getByTestId('composer-send').click();
  await expect(page.getByTestId('work-chat-assistant-message')).toBeVisible();
  const workPrompt = await page.evaluate(
    () => (window as typeof window & { __capturedSystemPrompts?: string[] }).__capturedSystemPrompts?.at(-1) ?? '',
  );
  expect(workPrompt).toContain('工作区语境');
  for (const verticalToken of ['合同审查', '风险', '当事人', '主合同', '核验', '律师', '答辩', '诉讼', '批注', '修订']) {
    expect(workPrompt).not.toContain(verticalToken);
  }
  await page.screenshot({ path: `${OUT_DIR}/02-work-chat-prompt-neutral.png` });

  // ③ 产物：Draft 面（pi 线通用工作稿面）——提案→允许→已写入→索引。
  await page.evaluate(() => {
    (window as unknown as { __courtworkPiLane: PiHooks }).__courtworkPiLane.reset();
    (window as unknown as { __courtworkPiLane: PiHooks }).__courtworkPiLane.setScript(
      JSON.parse(document.body.dataset.chainScript ?? '[]'),
    );
  });
  await page.evaluate((value) => {
    (window as unknown as { __courtworkPiLane: PiHooks }).__courtworkPiLane.setWorkspaceFile(
      value.logicalPath,
      value.file,
    );
  }, { logicalPath: '工作纪要.md', file: { content: '# 工作纪要\n要点已整理。\n', contentSha256: CHAIN_SHA, byteLength: 24 } });
  // 用字面量脚本（dataset 传递不可靠，直写）：
  await page.evaluate((script) => {
    (window as unknown as { __courtworkPiLane: PiHooks }).__courtworkPiLane.setScript(script);
  }, CHAIN_SCRIPT);
  await page.getByTestId('segment-draft').click();
  await expect(page.getByTestId('draft-canvas')).toBeVisible();
  await page.getByTestId('pi-start').click();
  await expect(page.getByTestId('pi-composer')).toBeVisible();
  await page.getByTestId('pi-composer-input').fill('把要点整理成一份工作纪要');
  await page.getByTestId('pi-send').click();
  await expect(page.getByTestId('pi-proposal')).toBeVisible();
  await page.screenshot({ path: `${OUT_DIR}/03-draft-proposal.png` });
  await page.getByTestId('pi-approve').click();
  const card = page.getByTestId('pi-tool-card').filter({ hasText: '工作纪要.md' });
  await expect(card).toHaveAttribute('data-state', 'succeeded');
  await expect(page.getByTestId('pi-drafts').getByTestId('pi-draft-open')).toHaveText('工作纪要.md');
  await page.screenshot({ path: `${OUT_DIR}/04-product-written.png` });

  // ④ 回看：索引→只读查看（hash 相符、零编辑入口）。
  await page.getByTestId('pi-drafts').getByTestId('pi-draft-open').click();
  const viewer = page.getByTestId('pi-viewer');
  await expect(viewer.getByTestId('pi-viewer-body')).toContainText('要点已整理');
  await expect(viewer.getByTestId('pi-viewer-hash-differs')).toHaveCount(0);
  await expect(viewer).toContainText('只读查看');
  await page.screenshot({ path: `${OUT_DIR}/05-review-readonly-viewer.png` });
});
