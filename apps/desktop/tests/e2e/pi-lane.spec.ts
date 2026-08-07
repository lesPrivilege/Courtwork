import { expect, test, type Page } from '@playwright/test';
import { openWorkbench } from './helpers';
import { expectNoOverlayResidue } from './overlay-residue';

/**
 * `PI-LANE-UI-1` · 通用工作稿面（Draft）的真跑面。
 *
 * 判据来自票面与 ADR-022 六-C.1／六-D，逐条落成一个用例：
 * 提案—授权—落盘的全链、拒绝、失败、无法确认、fail-closed、Stop、索引与只读查看、
 * 当前 hash 与已确认 hash 不符、上一段工作稿只读入口、上滚不夺回视口、键盘与残留。
 *
 * 宿主是 `browser-pi-lane` 的 scripted 樁（六-C harness 注入面）：它产的是**账本形状**的
 * 记录行，没有真 sidecar／真模型／真落盘。逐次授权是**真等**的——樁在 `tool_proposed`
 * 之后停住，直到 `pi_lane_decision` 投回执才继续，故这里测到的是「按钮只发 command、
 * 界面只认账本」这条真判据，不是一段动画。
 */

type PiHooks = {
  reset(): void;
  setStartFailure(failure: { code: string; message: string } | null): void;
  setScript(steps: unknown[]): void;
  setWorkspaceFile(
    logicalPath: string,
    file: { content: string; contentSha256: string; byteLength: number },
  ): void;
  setWorkspaceFailure(failure: { code: string; message: string } | null): void;
};

const SHA = 'e80ddeb170a3513e335ada586bec6f0068e8be8c66ab0845b38ec541edb888ba';
const NO_ABSOLUTE_PATH = /[/\\]Users[/\\]|[/\\]private[/\\]|[A-Za-z]:\\/;

const WRITE_SCRIPT = [
  { kind: 'text', delta: '先读案件材料。' },
  { kind: 'tool', toolCallId: 'tc_1', toolName: 'read' },
  { kind: 'toolEnd', toolCallId: 'tc_1', toolName: 'read' },
  { kind: 'tool', toolCallId: 'tc_2', toolName: 'write' },
  {
    kind: 'propose',
    toolCallId: 'tc_2',
    operationId: 'op_1',
    logicalPath: '纪要.md',
    byteLength: 37,
    contentSha256: SHA,
  },
  { kind: 'toolEnd', toolCallId: 'tc_2', toolName: 'write' },
  { kind: 'text', delta: '已写入 /workspace/纪要.md。' },
  { kind: 'usage', costUsd: 0.0012 },
  { kind: 'terminal', status: 'completed' },
];

/** 建一枚绑定了文件夹的案件，并切到 Draft 面。pi 线一条工作绑一枚容器＝一枚案件。 */
async function openDraftFace(page: Page) {
  await openWorkbench(page);
  await page.evaluate(() => {
    (window as unknown as { __courtworkPiLane: PiHooks }).__courtworkPiLane.reset();
  });
  await page.getByTestId('new-case-open').click();
  await page.evaluate(() => {
    (
      window as unknown as {
        __courtworkHostAuth: { setNextAuthorize(result: unknown): void };
      }
    ).__courtworkHostAuth.setNextAuthorize({
      status: 'granted',
      grant: { grantId: 'grant-pi-e2e', label: '设备采购案卷' },
    });
  });
  await page.getByTestId('new-case-authorize').click();
  await page.getByTestId('new-case-dialog').getByRole('button', { name: '创建案件' }).click();
  await page.getByTestId('segment-draft').click();
  await expect(page.getByTestId('draft-canvas')).toBeVisible();
}

async function setScript(page: Page, steps: unknown[]) {
  await page.evaluate((value) => {
    (window as unknown as { __courtworkPiLane: PiHooks }).__courtworkPiLane.setScript(value);
  }, steps);
}

async function setWorkspaceFile(
  page: Page,
  logicalPath: string,
  file: { content: string; contentSha256: string; byteLength: number },
) {
  await page.evaluate((value) => {
    (window as unknown as { __courtworkPiLane: PiHooks }).__courtworkPiLane.setWorkspaceFile(
      value.logicalPath,
      value.file,
    );
  }, { logicalPath, file });
}

async function startAndSend(page: Page, text = '把合同编号整理成一份纪要') {
  await page.getByTestId('pi-start').click();
  await expect(page.getByTestId('pi-composer')).toBeVisible();
  await page.getByTestId('pi-composer-input').fill(text);
  await page.getByTestId('pi-send').click();
}

test('未绑定文件夹：诚实拦在开始之前，不假装可以开工', async ({ page }) => {
  await openWorkbench(page);
  await page.getByTestId('segment-draft').click();
  const empty = page.getByTestId('pi-empty');
  await expect(empty).toContainText('还没有绑定文件夹');
  await expect(page.getByTestId('pi-start')).toBeDisabled();
});

test('全链：提案 → 允许 → 已写入 → 索引 → 只读查看（hash 相符）', async ({ page }) => {
  await openDraftFace(page);
  await setScript(page, WRITE_SCRIPT);
  await setWorkspaceFile(page, '纪要.md', {
    content: '# 纪要\n合同编号 HT-2024-081。\n',
    contentSha256: SHA,
    byteLength: 37,
  });
  await startAndSend(page);

  // 提案卡在场，且此刻账上还没有决定——两枚按钮都在。
  const proposal = page.getByTestId('pi-proposal');
  await expect(proposal).toBeVisible();
  await expect(proposal).toContainText('待你决定');
  const card = page.getByTestId('pi-tool-card').filter({ hasText: '纪要.md' });
  await expect(card).toHaveAttribute('data-state', 'proposed');
  await expect(card).toContainText('37');

  await page.getByTestId('pi-approve').click();
  await expect(card).toHaveAttribute('data-state', 'succeeded');
  await expect(card).toContainText('已新建工作稿');

  // 索引只从 succeeded fold。
  const drafts = page.getByTestId('pi-drafts');
  await expect(drafts.getByTestId('pi-draft-open')).toHaveText('纪要.md');

  await drafts.getByTestId('pi-draft-open').click();
  const viewer = page.getByTestId('pi-viewer');
  await expect(viewer.getByTestId('pi-viewer-body')).toContainText('HT-2024-081');
  await expect(viewer.getByTestId('pi-viewer-hash-differs')).toHaveCount(0);
  // 只读：面内没有任何编辑/保存/删除入口，也不泄露物理路径。
  await expect(viewer).toContainText('只读查看');
  expect(await viewer.innerText()).not.toMatch(NO_ABSOLUTE_PATH);
  for (const forbidden of ['保存', '编辑', '删除', '重命名']) {
    await expect(viewer.getByRole('button', { name: forbidden })).toHaveCount(0);
  }
});

test('拒绝写入：账上留驳回，索引与 effect 都不出现', async ({ page }) => {
  await openDraftFace(page);
  await setScript(page, WRITE_SCRIPT);
  await startAndSend(page);

  await expect(page.getByTestId('pi-proposal')).toBeVisible();
  await page.getByTestId('pi-deny').click();

  const card = page.getByTestId('pi-tool-card').filter({ hasText: '纪要.md' });
  await expect(card).toHaveAttribute('data-state', 'denied');
  await expect(card).toContainText('已拒绝写入');
  await expect(page.getByTestId('pi-drafts-empty')).toBeVisible();
});

test('无法确认：不进索引、可核验当前文件，且核验结果不补写成成功', async ({ page }) => {
  await openDraftFace(page);
  await setScript(page, [
    { kind: 'tool', toolCallId: 'tc_2', toolName: 'write' },
    {
      kind: 'propose',
      toolCallId: 'tc_2',
      operationId: 'op_1',
      logicalPath: '纪要.md',
      byteLength: 37,
      contentSha256: SHA,
      effect: 'uncertain',
    },
    { kind: 'terminal', status: 'completed' },
  ]);
  await setWorkspaceFile(page, '纪要.md', {
    content: '# 纪要\n（半份）\n',
    contentSha256: 'b'.repeat(64),
    byteLength: 12,
  });
  await startAndSend(page);
  await page.getByTestId('pi-approve').click();

  const card = page.getByTestId('pi-tool-card').filter({ hasText: '纪要.md' });
  await expect(card).toHaveAttribute('data-state', 'uncertain');
  await expect(page.getByTestId('pi-drafts-empty')).toBeVisible();

  await page.getByTestId('pi-verify-uncertain').click();
  const viewer = page.getByTestId('pi-viewer');
  await expect(viewer).toHaveAttribute('data-verify', 'true');
  await expect(viewer.getByTestId('pi-viewer-unverified')).toBeVisible();
  // 核验之后索引仍然是空的——核验不是补写。
  await expect(page.getByTestId('pi-drafts-empty')).toBeVisible();
});

test('未能写入：朱砂现形，索引不收', async ({ page }) => {
  await openDraftFace(page);
  await setScript(page, [
    { kind: 'tool', toolCallId: 'tc_2', toolName: 'write' },
    {
      kind: 'propose',
      toolCallId: 'tc_2',
      operationId: 'op_1',
      logicalPath: '纪要.md',
      byteLength: 37,
      contentSha256: SHA,
      effect: 'failed',
      failureCode: 'symlink_forbidden',
    },
    { kind: 'terminal', status: 'completed' },
  ]);
  await startAndSend(page);
  await page.getByTestId('pi-approve').click();

  const card = page.getByTestId('pi-tool-card').filter({ hasText: '纪要.md' });
  await expect(card).toHaveAttribute('data-state', 'failed');
  await expect(page.getByTestId('pi-drafts-empty')).toBeVisible();
});

test('当前内容与已确认版本不同：明说，不拿当前内容冒充历史成功版本', async ({ page }) => {
  await openDraftFace(page);
  await setScript(page, WRITE_SCRIPT);
  await setWorkspaceFile(page, '纪要.md', {
    content: '# 纪要\n（外部已改动）\n',
    contentSha256: 'c'.repeat(64),
    byteLength: 21,
  });
  await startAndSend(page);
  await page.getByTestId('pi-approve').click();
  await page.getByTestId('pi-drafts').getByTestId('pi-draft-open').click();

  await expect(page.getByTestId('pi-viewer-hash-differs')).toContainText('已不同于已确认版本');
});

test('工作稿已不在：宿主说没有就是没有，索引救不回来', async ({ page }) => {
  await openDraftFace(page);
  await setScript(page, WRITE_SCRIPT);
  await startAndSend(page);
  await page.getByTestId('pi-approve').click();
  await page.getByTestId('pi-drafts').getByTestId('pi-draft-open').click();

  await expect(page.getByTestId('pi-viewer-failure')).toContainText('已经不在了');
  await expect(page.getByTestId('pi-viewer-body')).toHaveCount(0);
});

test('Stop：运行中停止，悬置提案随之收束为拒绝', async ({ page }) => {
  await openDraftFace(page);
  await setScript(page, WRITE_SCRIPT);
  await startAndSend(page);

  await expect(page.getByTestId('pi-proposal')).toBeVisible();
  await page.getByTestId('pi-stop').click();

  const card = page.getByTestId('pi-tool-card').filter({ hasText: '纪要.md' });
  await expect(card).toHaveAttribute('data-state', 'denied');
  await expect(page.getByTestId('pi-drafts-empty')).toBeVisible();
  await expect(page.getByTestId('pi-running')).toHaveCount(0);
});

test('认不出的记录：整条会话显式失败，不静默跳过', async ({ page }) => {
  await openDraftFace(page);
  await setScript(page, [
    { kind: 'text', delta: '开始。' },
    {
      kind: 'raw',
      line: JSON.stringify({
        schemaVersion: 1,
        eventId: 'event_x',
        seq: 99,
        containerId: 'x',
        sessionId: 'x',
        leg: 1,
        requestId: 'r-1',
        type: 'tool_promoted',
        recordedAt: 99,
        payload: {},
      }),
    },
    { kind: 'terminal', status: 'completed' },
  ]);
  await startAndSend(page);

  await expect(page.getByTestId('pi-decode-failure')).toContainText('无法识别');
  await expect(page.getByTestId('pi-assistant-turn')).toHaveCount(0);
});

test('起不来时给的是下一步，不是错误码', async ({ page }) => {
  await openDraftFace(page);
  await page.evaluate(() => {
    (window as unknown as { __courtworkPiLane: PiHooks }).__courtworkPiLane.setStartFailure({
      code: 'credential_unconfigured',
      message: '尚未连接模型服务 · 请先在设置里完成连接',
    });
  });
  await page.getByTestId('pi-start').click();
  await expect(page.getByTestId('pi-failure')).toContainText('请先在设置里完成连接');
});

test('上一段工作稿（只读）：新一段 workspace 为空，旧一段仍可只读打开', async ({ page }) => {
  await openDraftFace(page);
  await setScript(page, WRITE_SCRIPT);
  await setWorkspaceFile(page, '纪要.md', {
    content: '# 纪要\n上一段留下的。\n',
    contentSha256: SHA,
    byteLength: 37,
  });
  await startAndSend(page);
  await page.getByTestId('pi-approve').click();
  await expect(page.getByTestId('pi-drafts').getByTestId('pi-draft-open')).toHaveText('纪要.md');

  // 另起一段：这一条收摊、回到未开工态；上一段的工作稿仍在只读入口里。
  await page.getByTestId('pi-restart').click();
  await expect(page.getByTestId('pi-start')).toBeVisible();
  const prior = page.getByTestId('pi-prior-drafts');
  await expect(prior).toContainText('上一段工作稿');
  await prior.getByTestId('pi-prior-draft-open').click();
  await expect(page.getByTestId('pi-viewer-body')).toContainText('上一段留下的');
});

test('用户上滚读史后，流态与终态都不夺回视口', async ({ page }) => {
  await openDraftFace(page);
  const long = Array.from({ length: 40 }, (_, index) => ({
    kind: 'text',
    delta: `第 ${index + 1} 段正文，用来把视口撑出滚动条。\n\n`,
  }));
  await setScript(page, [...long, { kind: 'usage', costUsd: 0.001 }, { kind: 'terminal', status: 'completed' }]);
  await startAndSend(page);
  await expect(page.getByTestId('pi-assistant-turn')).toBeVisible();

  // 真滚轮：程序化 scrollTo 未必被自动跟随判为「用户在读史」，滚轮才是这条判据的真形。
  const viewport = page.getByTestId('pi-viewport');
  // 前提之前的前提：正文得先多到撑出滚动条。`pi-assistant-turn` 可见只说明首个 delta 到了，
  // 此刻取样滚轮会滚在不可滚的视口上（max−top 恒 0）——判据没被验到，却以「断言红」示人。
  await expect
    .poll(
      () => viewport.evaluate((node) => node.scrollHeight - node.clientHeight),
      { message: '视口须先被正文撑出可滚区，否则滚轮无从离底' },
    )
    .toBeGreaterThan(400);
  await viewport.hover();
  await page.mouse.wheel(0, -4000);
  const before = await viewport.evaluate((node) => ({
    top: node.scrollTop,
    max: node.scrollHeight - node.clientHeight,
  }));
  // 前提：确实离开了底部。判据是相对的——绝对像素随内容长度漂，而「有没有被夺回去」不漂。
  expect(before.max - before.top, '先得真的滚上去，否则这条判据没被验到').toBeGreaterThan(200);

  // 其余记录继续到达并以终态收束——视口一格都不许被夺回去。
  await expect(page.getByTestId('pi-running')).toHaveCount(0);
  await expect(page.getByTestId('pi-drafts')).toBeVisible();
  const after = await viewport.evaluate((node) => node.scrollTop);
  expect(after).toBe(before.top);
});

test('只读查看面：Escape 关闭、焦点归还、零残留', async ({ page }) => {
  await openDraftFace(page);
  await setScript(page, WRITE_SCRIPT);
  await setWorkspaceFile(page, '纪要.md', {
    content: '# 纪要\n正文。\n',
    contentSha256: SHA,
    byteLength: 37,
  });
  await startAndSend(page);
  await page.getByTestId('pi-approve').click();

  const trigger = page.getByTestId('pi-drafts').getByTestId('pi-draft-open');
  await trigger.click();
  await expect(page.getByTestId('pi-viewer')).toBeVisible();
  // 打开即把焦点交给关闭钮（读屏可达）。
  await expect(page.getByTestId('pi-viewer-close')).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pi-viewer')).toHaveCount(0);
  await expectNoOverlayResidue(page);
});
