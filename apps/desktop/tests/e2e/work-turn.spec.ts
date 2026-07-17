import { expect, test, type Page } from '@playwright/test';
import { connectProvider, openWorkbench } from './helpers';

/**
 * WORK-TURN-1（真机第三轮 G+H）：
 * G · caseId 去标题化——旧铸号把中文标题拼进 caseId，work_state.rs safe_token 只认 ASCII，
 *     中文标题案首次 commit 即「状态引用非法」红条。铸号改 UUID；存量非安全 id 案原位容忍 +
 *     场景运行前显式引导（不迁移：材料记录/授权/恢复指针跨层按 caseId 键控，重写号须触碰
 *     src-tauri，收益不抵风险——SPEC 留痕）。
 * H · workContextSegment——Work 面（case 绑定语境）自由输入经 sendChatTurn 注入案语境段
 *     （案根/材料清单/场景状态，账本确定性编译）；chat 面缺省不供给。
 *
 * 樁宿主不执行 Rust safe_token（形状强制在 src-tauri）——中文 id 在樁链可跑，故 G 的自动化
 * 红证走「持久 id 语法断言」与「守卫反馈断言」两条（真机 InvalidRef 红条由此结构性根除）。
 */

const GRANT_ID = 'grant-work-turn-1';
const CONTRACT = '# 设备采购合同\n\n第一条 付款：买方应于验收后三十日内付清全部款项。';
const QUOTE = '买方应于验收后三十日内付清全部款项。';
const SAFE_TOKEN_RE = /^[A-Za-z0-9._-]+$/;

type HostAuthHooks = {
  reset(): void;
  setGrants(grants: unknown[]): void;
  setNextAuthorize(result: unknown): void;
};
type MaterialHooks = { reset(): void; setFile(grantId: string, relativePath: string, bytes: Uint8Array): void };
type WorkHooks = { reset(): void; setTurnStub(stub: unknown): void };

async function resetHooks(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __courtworkHostAuth: HostAuthHooks; __courtworkMaterialHost: MaterialHooks; __courtworkWorkHooks: WorkHooks };
    w.__courtworkHostAuth.reset();
    w.__courtworkMaterialHost.reset();
    w.__courtworkWorkHooks.reset();
  });
}

async function seedContract(page: Page, grantId: string) {
  await page.evaluate(
    ({ gid, content }) => {
      const bytes = new TextEncoder().encode(content);
      (window as unknown as { __courtworkMaterialHost: MaterialHooks }).__courtworkMaterialHost.setFile(gid, '设备采购合同.md', bytes);
    },
    { gid: grantId, content: CONTRACT },
  );
}

async function createGrantCaseNamed(page: Page, label: string, grantId = GRANT_ID) {
  await page.evaluate(
    ({ gid, name }) => {
      (window as unknown as { __courtworkHostAuth: HostAuthHooks }).__courtworkHostAuth.setNextAuthorize({
        status: 'granted',
        grant: { grantId: gid, label: name },
      });
    },
    { gid: grantId, name: label },
  );
  await page.getByTestId('new-case-open').click();
  const dialog = page.getByTestId('new-case-dialog');
  await expect(dialog).toBeVisible();
  await page.getByTestId('new-case-authorize').click();
  await dialog.getByRole('button', { name: '创建案件' }).click();
  await expect(dialog).toBeHidden();
}

async function setSuccessTurnStub(page: Page, quote: string) {
  await page.evaluate((exactQuote) => {
    const hooks = (window as unknown as { __courtworkWorkHooks: WorkHooks }).__courtworkWorkHooks;
    hooks.setTurnStub((input: { turnId: string; providerRequestId: string; request: unknown }) => {
      const text = JSON.stringify(input.request);
      const match = text.match(/材料:开始 fileId=([\w-]+)/);
      const fileId = match ? match[1] : 'unknown';
      const artifact = {
        caseId: 'contract-review',
        risks: [
          {
            id: 'risk-1',
            description: '付款期限较长，回款风险偏高',
            level: 'high',
            basis: [{ citation: '第一条 付款', quoteClaims: [{ fileId, exactQuote }] }],
            dispositionStatus: 'pending',
          },
        ],
      };
      return {
        status: 'completed',
        turnId: input.turnId,
        providerRequestId: input.providerRequestId,
        providerId: 'e2e-stub',
        modelId: 'e2e-stub',
        reasoning: { status: 'absent' },
        assistantMessage: JSON.stringify({ target: { stepId: 'produce-risk-list', artifactType: 'legal.RiskList' }, artifact }),
        finishReason: 'stop',
        completedAt: '2026-07-17T00:00:00.000Z',
      };
    });
  }, quote);
}

async function ingestViaAddFolder(page: Page, label: string, grantId = GRANT_ID) {
  await seedContract(page, grantId);
  await page.evaluate(
    ({ gid, name }) => {
      (window as unknown as { __courtworkHostAuth: HostAuthHooks }).__courtworkHostAuth.setNextAuthorize({
        status: 'granted',
        grant: { grantId: gid, label: name },
      });
    },
    { gid: grantId, name: label },
  );
  await page.getByTestId('composer-plus').first().click();
  await page.getByTestId('composer-plus-folder').first().click();
  await expect(page.getByTestId('material-item').filter({ hasText: '设备采购合同.md' })).toHaveAttribute('data-status', 'ready');
}

test('G 铸号红证：中文标题 grant 案的 caseId 恒过安全 token 语法，且场景全链可跑', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  await setSuccessTurnStub(page, QUOTE);
  await createGrantCaseNamed(page, '合成卷宗案');

  // 红证核心：持久案记录的 id 不得再携标题原文（修复前：case-<ts>-合成卷宗案 → 真机 InvalidRef）。
  const storedIds = await page.evaluate(() => {
    const raw = window.localStorage.getItem('courtwork.case-list.v1');
    if (!raw) return [];
    const envelope = JSON.parse(raw) as { entries?: Array<{ id: string }>; cases?: Array<{ id: string }> };
    return (envelope.entries ?? envelope.cases ?? []).map((item) => item.id);
  });
  expect(storedIds.length).toBeGreaterThan(0);
  for (const id of storedIds) {
    expect(id, `持久案 id 必须过 work_state 安全 token 镜像：${id}`).toMatch(SAFE_TOKEN_RE);
  }

  // 标题仍是展示字段：侧栏与标题栏照常显示中文名。
  await expect(page.getByTestId('titlebar-case-title')).toContainText('合成卷宗案');

  // 场景全链（樁 turn）：中文标题案审查合同可开、可跑、落审阅面——真机同链不再触发状态引用红条。
  await ingestViaAddFolder(page, '合成卷宗案');
  await page.getByTestId('scene-work-review').click();
  await page.getByTestId('s3-subject').fill('起云智能装备股份有限公司');
  await page.getByTestId('s3-run').click();
  await expect(page.getByTestId('revision-panel')).toContainText('付款期限较长');
});

test('G 存量守卫：旧版中文 id 案运行场景 → 显式引导（原位容忍），非技术红条', async ({ page }) => {
  const legacyId = 'case-1752736000000-合成卷宗案';
  await page.addInitScript(
    ({ id, gid }) => {
      window.localStorage.setItem(
        'courtwork.case-list.v1',
        JSON.stringify({ version: 1, cases: [{ id, title: '合成卷宗案', grantId: gid, label: '合成卷宗', kind: 'case' }] }),
      );
    },
    { id: legacyId, gid: GRANT_ID },
  );
  await openWorkbench(page);
  await resetHooks(page);
  await setSuccessTurnStub(page, QUOTE);
  await page.evaluate((gid) => {
    (window as unknown as { __courtworkHostAuth: HostAuthHooks }).__courtworkHostAuth.setGrants([{ grantId: gid, label: '合成卷宗' }]);
  }, GRANT_ID);

  // 选中存量旧 id 案（标题仍中文展示），入库材料后尝试运行场景。
  await page.getByTestId(`case-card-${legacyId}`).locator('button.case-card-main').click();
  await expect(page.getByTestId('titlebar-case-title')).toContainText('合成卷宗案');
  await ingestViaAddFolder(page, '合成卷宗');
  await page.getByTestId('scene-work-review').click();
  await page.getByTestId('s3-subject').fill('起云智能装备股份有限公司');
  await page.getByTestId('s3-run').click();

  // 守卫红证：显式中性引导（发生了什么+下一步），零审阅面、零技术措辞红条。
  const feedback = page.getByTestId('system-open-feedback');
  await expect(feedback).toContainText('新建案件');
  await expect(feedback).toHaveClass(/\binfo\b/);
  await expect(feedback).not.toContainText('引用');
  await expect(page.getByTestId('revision-panel')).toHaveCount(0);
});

test('H 案语境注入：Work 面自由输入携案根与材料清单；chat 面缺省不携（红证双向）', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
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
      yield { type: 'content_delta', requestId, seq: 1, delta: '卷宗内现有材料如清单所列。' };
      yield { type: 'completed', requestId, seq: 2, finishReason: 'stop' };
    });
  });
  await createGrantCaseNamed(page, '合成卷宗案');
  await ingestViaAddFolder(page, '合成卷宗案');

  // Work 面（case 绑定语境）自由输入：段在场——案根 + 材料清单投影（断 request body，不断模型智能）。
  await page.getByTestId('composer-input').fill('卷宗里有哪些文件？');
  await page.getByTestId('composer-send').click();
  await expect(page.getByTestId('chat-assistant-message')).toBeVisible();
  const workPrompt = await page.evaluate(
    () => (window as typeof window & { __capturedSystemPrompts?: string[] }).__capturedSystemPrompts?.at(-1) ?? '',
  );
  expect(workPrompt).toContain('案件语境');
  expect(workPrompt).toContain('合成卷宗案');
  expect(workPrompt).toContain('设备采购合同.md');
  await expect.poll(() => page.evaluate(
    () => (window as typeof window & { __capturedSystemPrompts?: string[] }).__capturedSystemPrompts?.length ?? 0,
  )).toBe(1);

  // chat 面直接发送：缺省不供给（chat 面/无案语境零段）。
  await expect(page.getByTestId('workspace')).toHaveAttribute('data-view-segment', 'chat');
  await page.getByTestId('composer-input').fill('随便聊聊。');
  await page.getByTestId('composer-send').click();
  await expect(page.getByTestId('chat-assistant-message').nth(1)).toBeVisible();
  await expect.poll(() => page.evaluate(
    () => (window as typeof window & { __capturedSystemPrompts?: string[] }).__capturedSystemPrompts?.length ?? 0,
  )).toBe(2);
  const chatPrompt = await page.evaluate(
    () => (window as typeof window & { __capturedSystemPrompts?: string[] }).__capturedSystemPrompts?.at(-1) ?? '',
  );
  expect(chatPrompt).not.toContain('案件语境');
});
