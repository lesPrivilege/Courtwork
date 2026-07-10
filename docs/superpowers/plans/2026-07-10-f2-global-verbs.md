# F-2 全局动词补全 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the five F-2 affordances in `apps/desktop` — ⌘K command palette, new-case creation, reversible case archiving, single-pane focus mode, and copy actions on AI callout/data-card — per `docs/46-控件全量清单.md`'s architecture ruling (十项拍板, items 1/3/6/7 + callout copy folded into item 5).

**Architecture:** New, small, single-responsibility component files under `apps/desktop/src/command-palette/` and `apps/desktop/src/case/`, wired into the existing `App.tsx` via minimal surgical edits (new state, one global keydown listener, a handful of render insertions). No new npm/Cargo dependencies, no Tauri capability changes — the "system folder picker" is the standard `<input type="file" webkitdirectory>` element (zero new permission surface), and "open output folder" is implemented as a declared-gap disabled row (same precedent as the existing "打开 Word 文档" button), since no real file is ever written to disk by this demo shell yet.

**Tech Stack:** React 19 + TypeScript, Vitest (unit), Playwright (e2e), plain CSS (tokens-driven, `apps/desktop/src/styles.css`), no new dependencies.

**Concurrency warning (read before every commit):** `apps/desktop/src/composer/` (untracked) and `apps/desktop/package.json` (modified) are mid-flight from a concurrent F-1 session (Grok) sharing this working tree. Never `git add` those paths. Before every commit: `git status` then `git diff --cached --name-only` and confirm the list is exactly the files this task touched. Use `git commit -m "..." -- <explicit paths>`, never `git add -A`/`git add .`.

---

## File Structure

**Create:**
- `apps/desktop/src/command-palette/fuzzy-match.ts` — pure fuzzy scoring + filtering, zero React
- `apps/desktop/src/command-palette/fuzzy-match.test.ts` — Vitest unit tests
- `apps/desktop/src/command-palette/CommandPalette.tsx` — the ⌘K palette UI
- `apps/desktop/src/case/types.ts` — `CaseSummary` shared type
- `apps/desktop/src/case/NewCaseDialog.tsx` — folder-pick → name → create modal
- `apps/desktop/src/case/ArchiveConfirmPopover.tsx` — light popover confirm (archive/unarchive)
- `apps/desktop/src/workbench/CopyButton.tsx` — hover-reveal copy-to-clipboard button
- `apps/desktop/tests/e2e/global-verbs.spec.ts` — Playwright coverage for all five items

**Modify:**
- `apps/desktop/src/App.tsx` — state, one global keydown listener, case-rail restructure (single card → list), focus-mode render branch, copy buttons on callout/data-card, palette wiring
- `apps/desktop/src/workbench/Icon.tsx` — add `archive`, `copy`, `check`, `focus` icon paths
- `apps/desktop/src/styles.css` — new rules for palette/dialog/popover/focus-mode/copy-button, plus `--motion-overlay` tokens
- `apps/desktop/scripts/assert-test-count.mjs` — bump `minimum` to the real new Playwright total
- `apps/desktop/SPEC.md` — new "F-2 全局动词补全" section
- `docs/46-控件全量清单.md` — flip the five rows this ticket closes from "待切单" to implemented, per the doc's own maintenance discipline (§维护纪律 item 6)

**Explicitly not touched:** `apps/desktop/src/composer/`, `apps/desktop/package.json`, `apps/desktop/src-tauri/**` (no new Tauri capability), `apps/desktop/src/workbench/Panels.tsx` internals (only its export surface is consumed, unchanged).

---

## Task 1: Fuzzy match utility (TDD)

**Files:**
- Create: `apps/desktop/src/command-palette/fuzzy-match.ts`
- Test: `apps/desktop/src/command-palette/fuzzy-match.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/desktop/src/command-palette/fuzzy-match.test.ts
import { describe, expect, it } from 'vitest';
import { filterCommands, fuzzyMatch } from './fuzzy-match';

describe('fuzzyMatch', () => {
  it('matches when query characters appear in order', () => {
    expect(fuzzyMatch('cp', 'Copy Path').matched).toBe(true);
  });

  it('rejects when a query character is missing', () => {
    expect(fuzzyMatch('xyz', 'Copy Path').matched).toBe(false);
  });

  it('treats an empty query as matching everything with score 0', () => {
    expect(fuzzyMatch('', 'anything')).toEqual({ matched: true, score: 0 });
  });

  it('is case-insensitive', () => {
    expect(fuzzyMatch('COPY', 'copy path').matched).toBe(true);
  });

  it('scores contiguous matches higher than scattered ones', () => {
    const contiguous = fuzzyMatch('copy', 'Copy Path');
    const scattered = fuzzyMatch('cy', 'Copy Path');
    expect(contiguous.score).toBeGreaterThan(scattered.score);
  });

  it('matches Chinese label substrings', () => {
    expect(fuzzyMatch('专注', '进入专注模式').matched).toBe(true);
    expect(fuzzyMatch('专注', '整理卷宗').matched).toBe(false);
  });
});

describe('filterCommands', () => {
  const items = [{ label: 'Copy Path' }, { label: 'Copy Link' }, { label: 'Rename' }];

  it('returns all items in original order for an empty query', () => {
    const result = filterCommands('', items, (item) => item.label);
    expect(result.map((item) => item.label)).toEqual(['Copy Path', 'Copy Link', 'Rename']);
  });

  it('filters out non-matching items', () => {
    const result = filterCommands('rename', items, (item) => item.label);
    expect(result.map((item) => item.label)).toEqual(['Rename']);
  });

  it('ranks better matches first', () => {
    const result = filterCommands('copy', items, (item) => item.label);
    expect(result.map((item) => item.label)).toEqual(['Copy Path', 'Copy Link']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @courtwork/desktop exec vitest run src/command-palette/fuzzy-match.test.ts`
Expected: FAIL — `Cannot find module './fuzzy-match'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/desktop/src/command-palette/fuzzy-match.ts
export interface FuzzyMatchResult {
  matched: boolean;
  score: number;
}

export function fuzzyMatch(query: string, target: string): FuzzyMatchResult {
  const q = query.trim().toLowerCase();
  const t = target.toLowerCase();
  if (q.length === 0) return { matched: true, score: 0 };

  let score = 0;
  let cursor = 0;
  let consecutive = 0;

  for (const char of q) {
    const foundAt = t.indexOf(char, cursor);
    if (foundAt === -1) return { matched: false, score: 0 };
    consecutive = foundAt === cursor ? consecutive + 1 : 1;
    score += consecutive * 2 - (foundAt - cursor);
    cursor = foundAt + 1;
  }

  return { matched: true, score };
}

export function filterCommands<T>(query: string, items: T[], getLabel: (item: T) => string): T[] {
  const scored = items
    .map((item) => ({ item, result: fuzzyMatch(query, getLabel(item)) }))
    .filter((entry) => entry.result.matched);
  if (query.trim().length === 0) return scored.map((entry) => entry.item);
  scored.sort((a, b) => b.result.score - a.result.score);
  return scored.map((entry) => entry.item);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @courtwork/desktop exec vitest run src/command-palette/fuzzy-match.test.ts`
Expected: PASS, 9/9

- [ ] **Step 5: Commit**

```bash
git status
git diff --cached --name-only
git add apps/desktop/src/command-palette/fuzzy-match.ts apps/desktop/src/command-palette/fuzzy-match.test.ts
git commit -m "$(cat <<'EOF'
feat(desktop): 命令面板模糊匹配纯函数（TDD）

F-2 第一步：fuzzyMatch/filterCommands 独立于 React，供后续 CommandPalette 消费。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)" -- apps/desktop/src/command-palette/fuzzy-match.ts apps/desktop/src/command-palette/fuzzy-match.test.ts
```

---

## Task 2: Icons — archive / copy / check / focus

**Files:**
- Modify: `apps/desktop/src/workbench/Icon.tsx`

- [ ] **Step 1: Before editing, confirm no concurrent edits**

```bash
git status apps/desktop/src/workbench/Icon.tsx
git diff apps/desktop/src/workbench/Icon.tsx
```
Expected: clean (no output) — this file belongs to no in-flight F-1 change as of plan-time.

- [ ] **Step 2: Extend `IconName` union and `paths` map**

Modify `apps/desktop/src/workbench/Icon.tsx:1`:

```typescript
type IconName = 'case' | 'conversation' | 'panels' | 'compare' | 'stack' | 'columns' | 'reset' | 'settings' | 'plus' | 'minus' | 'fit' | 'archive' | 'copy' | 'check' | 'focus';
```

Modify `apps/desktop/src/workbench/Icon.tsx:3-15`, add four entries to the `paths` map (insert before the closing `};` on line 15):

```typescript
  archive: <><rect x="3.5" y="4" width="17" height="4" rx="1" /><path d="M5 8v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" /><path d="M10 12.5h4" /></>,
  copy: <><rect x="8.5" y="8.5" width="12" height="12" rx="1.5" /><path d="M15.5 8.5V5.5a1 1 0 0 0-1-1H4.5a1 1 0 0 0-1 1V16a1 1 0 0 0 1 1h3" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  focus: <path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4" />,
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @courtwork/desktop exec tsc -b --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git status
git diff --cached --name-only
git add apps/desktop/src/workbench/Icon.tsx
git commit -m "$(cat <<'EOF'
feat(desktop): 补齐 F-2 所需图标（归档/复制/勾选/专注）

沿用既有 24×24、1.35px stroke、无 fill 的图标规范。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)" -- apps/desktop/src/workbench/Icon.tsx
```

---

## Task 3: Case summary type

**Files:**
- Create: `apps/desktop/src/case/types.ts`

- [ ] **Step 1: Write the type (no test — pure data shape, exercised transitively by Task 5/6 tests)**

```typescript
// apps/desktop/src/case/types.ts
export interface CaseSummary {
  id: string;
  title: string;
  caseNumber?: string;
  fileCount: number;
  archived: boolean;
}
```

- [ ] **Step 2: Commit**

```bash
git status
git diff --cached --name-only
git add apps/desktop/src/case/types.ts
git commit -m "$(cat <<'EOF'
feat(desktop): 新增 CaseSummary 类型

字段命名呼应 packages/schemas 的 CaseFile（caseId 语义、files 计数），
供新建/归档案件两处组件共享。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)" -- apps/desktop/src/case/types.ts
```

---

## Task 4: Copy actions on AI callout / data-card

**Files:**
- Create: `apps/desktop/src/workbench/CopyButton.tsx`
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/styles.css`
- Create: `apps/desktop/tests/e2e/global-verbs.spec.ts` (start the file here; more `describe` blocks land in later tasks)

- [ ] **Step 1: Write the failing Playwright test**

Create `apps/desktop/tests/e2e/global-verbs.spec.ts`:

```typescript
import { expect, test, type Page } from '@playwright/test';

async function openWorkbench(page: Page) {
  await page.goto('/');
  const setup = page.getByTestId('provider-setup');
  if (await setup.isVisible()) await setup.getByRole('button', { name: '先查看演示' }).click();
}

test.describe('AI 消息复制', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('data-card 复制按钮悬停显现并写入含来源标记的纯文本', async ({ page }) => {
    await openWorkbench(page);
    const card = page.locator('.data-card').first();
    const copyButton = card.locator('.copy-button');
    await expect(copyButton).toHaveCSS('opacity', '0');
    await card.hover();
    await expect(copyButton).toHaveCSS('opacity', '1');
    await copyButton.click();
    await expect(copyButton).toContainText('已复制');
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain('卷宗整理已启动');
    expect(clipboardText.startsWith('D20')).toBe(true);
  });

  test('generated-callout 复制按钮写入提示全文', async ({ page }) => {
    await openWorkbench(page);
    const callout = page.locator('.generated-callout');
    await callout.hover();
    await callout.locator('.copy-button').click();
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain('审阅提示');
    expect(clipboardText).toContain('先核对验收条款的原文依据');
  });

  test('按压态落在 60–80ms 区间且不整卡缩放', async ({ page }) => {
    await openWorkbench(page);
    const card = page.locator('.data-card').first();
    await card.hover();
    const copyButton = card.locator('.copy-button');
    await copyButton.hover();
    await page.mouse.down();
    await expect(copyButton).toHaveCSS('transition-duration', '0.07s, 0.07s');
    await expect(copyButton).toHaveCSS('transform', 'none');
    await expect(card).toHaveCSS('transform', 'none');
    await page.mouse.up();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @courtwork/desktop exec playwright test global-verbs.spec.ts -g "AI 消息复制"`
Expected: FAIL — `.copy-button` not found (0 elements)

- [ ] **Step 3: Implement `CopyButton`**

```typescript
// apps/desktop/src/workbench/CopyButton.tsx
import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

interface CopyButtonProps {
  label: string;
  getText: () => string;
}

export function CopyButton({ label, getText }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number>();

  useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(getText());
      setCopied(true);
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard permission denied — no destructive fallback, button stays interactive */
    }
  };

  return (
    <button type="button" className="copy-button" onClick={() => void handleClick()} aria-label={label} title={label}>
      <Icon name={copied ? 'check' : 'copy'} />
      <span>{copied ? '已复制' : '复制'}</span>
    </button>
  );
}
```

- [ ] **Step 4: Wire into `App.tsx`**

Modify `apps/desktop/src/App.tsx` — add import near the other workbench imports (after line 15, `import { Icon } from './workbench/Icon';`):

```typescript
import { CopyButton } from './workbench/CopyButton';
```

Modify the two `.data-card` blocks and the `.generated-callout` block inside `conversation-scroll` (currently `App.tsx:261-270`). Replace:

```tsx
            <article className="data-card">
              <div className="card-heading"><span className="domain-badge">{flow === 'S1' ? 'D20' : 'D04'}</span><strong>{flow === 'S1' ? '卷宗整理已启动' : '合同审查已完成'}</strong></div>
              <p>{flow === 'S1' ? '已按卷宗顺序识别文书，并把事件与主体关系交叉核对。' : '已完成条款抽取与当事人核对，审查结果已送达右侧工作面。'}</p>
            </article>
            {session.progress.map((message, index) => <div className="progress-card" key={`${message}-${index}`}><span className="progress-pulse" />{message}</div>)}
            <article className="data-card compact-result">
              <div className="card-heading"><span className="domain-badge">{flow === 'S3' ? 'R' : 'E'}</span><strong>{flow === 'S3' ? '发现 6 项合同风险' : '时间线与关系图谱已生成'}</strong></div>
              <p>{flow === 'S3' ? '高危 2 项、中危 3 项、低危 1 项。高危与未核验条目需要逐条展开。' : '已形成 47 个事件、14 个主体和 15 条关系；4 处矛盾等待核对。'}</p>
            </article>
            <aside className="generated-callout"><strong>审阅提示</strong><p>{flow === 'S3' ? '先核对验收条款的原文依据，再决定是否接受对应修订。' : '催告主体、收款账户与验收结论存在交叉矛盾，建议优先核对。'}</p></aside>
```

with:

```tsx
            <article className="data-card">
              <div className="card-heading"><span className="domain-badge">{flow === 'S1' ? 'D20' : 'D04'}</span><strong>{flow === 'S1' ? '卷宗整理已启动' : '合同审查已完成'}</strong></div>
              <p>{flow === 'S1' ? '已按卷宗顺序识别文书，并把事件与主体关系交叉核对。' : '已完成条款抽取与当事人核对，审查结果已送达右侧工作面。'}</p>
              <CopyButton label="复制卡片内容" getText={() => `${flow === 'S1' ? 'D20' : 'D04'}\n${flow === 'S1' ? '卷宗整理已启动' : '合同审查已完成'}\n${flow === 'S1' ? '已按卷宗顺序识别文书，并把事件与主体关系交叉核对。' : '已完成条款抽取与当事人核对，审查结果已送达右侧工作面。'}`} />
            </article>
            {session.progress.map((message, index) => <div className="progress-card" key={`${message}-${index}`}><span className="progress-pulse" />{message}</div>)}
            <article className="data-card compact-result">
              <div className="card-heading"><span className="domain-badge">{flow === 'S3' ? 'R' : 'E'}</span><strong>{flow === 'S3' ? '发现 6 项合同风险' : '时间线与关系图谱已生成'}</strong></div>
              <p>{flow === 'S3' ? '高危 2 项、中危 3 项、低危 1 项。高危与未核验条目需要逐条展开。' : '已形成 47 个事件、14 个主体和 15 条关系；4 处矛盾等待核对。'}</p>
              <CopyButton label="复制卡片内容" getText={() => `${flow === 'S3' ? 'R' : 'E'}\n${flow === 'S3' ? '发现 6 项合同风险' : '时间线与关系图谱已生成'}\n${flow === 'S3' ? '高危 2 项、中危 3 项、低危 1 项。高危与未核验条目需要逐条展开。' : '已形成 47 个事件、14 个主体和 15 条关系；4 处矛盾等待核对。'}`} />
            </article>
            <aside className="generated-callout">
              <strong>审阅提示</strong>
              <p>{flow === 'S3' ? '先核对验收条款的原文依据，再决定是否接受对应修订。' : '催告主体、收款账户与验收结论存在交叉矛盾，建议优先核对。'}</p>
              <CopyButton label="复制审阅提示" getText={() => `审阅提示\n${flow === 'S3' ? '先核对验收条款的原文依据，再决定是否接受对应修订。' : '催告主体、收款账户与验收结论存在交叉矛盾，建议优先核对。'}`} />
            </aside>
```

- [ ] **Step 5: Add CSS**

Modify `apps/desktop/src/styles.css`. In the `:root` block (after line 39, `--motion-continuation: 240ms;`), add:

```css
  --motion-overlay: 120ms;
  --motion-overlay-ease: cubic-bezier(0.25, 0.46, 0.45, 0.94);
```

After the existing `.generated-callout p { margin: 2px 0 0; }` rule (`styles.css:123`), add:

```css
.data-card, .generated-callout { position: relative; }
.copy-button { position: absolute; top: 6px; right: 6px; display: flex; align-items: center; gap: 4px; height: 22px; padding: 0 6px; border: 1px solid var(--border-strong); border-radius: 4px; background: #fff; color: var(--text-tertiary); cursor: pointer; font-size: 11px; opacity: 0; transition: opacity var(--motion-hover) ease-out, background-color var(--motion-hover) ease-out; }
.data-card:hover .copy-button, .data-card:focus-within .copy-button,
.generated-callout:hover .copy-button, .generated-callout:focus-within .copy-button { opacity: 1; }
.copy-button:hover { background: var(--bg-hover); }
.copy-button .line-icon { width: 12px; height: 12px; }
```

Note: `.data-card` already has `position: relative` declared at `styles.css:106` (`.data-card, .detail-card { position: relative; ...}`) — the new rule only *adds* `position: relative` to `.generated-callout`, which currently lacks it. Do not duplicate the `.data-card` declaration; only add `.generated-callout` to that selector list, i.e. edit line 106 in place:

Replace `apps/desktop/src/styles.css:106`:
```css
.data-card, .detail-card { position: relative; width: 100%; padding: 8px 12px; border: 1px solid var(--border-strong); border-radius: 6px; background: #fff; overflow: hidden; }
```
with:
```css
.data-card, .detail-card, .generated-callout { position: relative; }
.data-card, .detail-card { width: 100%; padding: 8px 12px; border: 1px solid var(--border-strong); border-radius: 6px; background: #fff; overflow: hidden; }
```
(then the standalone `.data-card, .generated-callout { position: relative; }` block described above is redundant — skip adding it a second time.)

- [ ] **Step 6: Run Playwright test to verify it passes**

Run: `pnpm --filter @courtwork/desktop exec playwright test global-verbs.spec.ts -g "AI 消息复制"`
Expected: PASS, 3/3

- [ ] **Step 7: Run full existing suite to check no regression**

Run: `pnpm --filter @courtwork/desktop exec playwright test`
Expected: all prior tests still pass (`.data-card` gained a child button — verify no existing test asserts exact child count of `.data-card`)

- [ ] **Step 8: Commit**

```bash
git status
git diff --cached --name-only
git add apps/desktop/src/workbench/CopyButton.tsx apps/desktop/src/App.tsx apps/desktop/src/styles.css apps/desktop/tests/e2e/global-verbs.spec.ts
git commit -m "$(cat <<'EOF'
feat(desktop): AI callout/数据卡补复制动作（F-2 第五项）

hover 显现的复制按钮，press 态复用既有 --motion-press（70ms）；
复制内容为纯文本，data-card 保留 domain-badge 作为溯源标记。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)" -- apps/desktop/src/workbench/CopyButton.tsx apps/desktop/src/App.tsx apps/desktop/src/styles.css apps/desktop/tests/e2e/global-verbs.spec.ts
```

---

## Task 5: New case creation + case list restructure

**Files:**
- Create: `apps/desktop/src/case/NewCaseDialog.tsx`
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/styles.css`
- Modify: `apps/desktop/tests/e2e/global-verbs.spec.ts`

This task also converts the case rail from a single hardcoded `<article className="case-card selected">` into a `cases.map(...)`, because "new case" is meaningless without a real list to append to. Task 6 (archive) builds directly on this same list, so both tasks share the `cases` state introduced here.

- [ ] **Step 1: Write the failing Playwright tests**

Append to `apps/desktop/tests/e2e/global-verbs.spec.ts` (after the `AI 消息复制` describe block):

```typescript
test.describe('新建案件', () => {
  test('左栏入口创建案件并自动进入，工作面显示空态', async ({ page }) => {
    await openWorkbench(page);
    await page.getByTestId('new-case-open').click();
    const dialog = page.getByTestId('new-case-dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: '不使用文件夹，直接命名' }).click();
    const nameInput = dialog.getByRole('textbox', { name: '案件名称' });
    await nameInput.fill('张三诉李四买卖合同纠纷');
    await dialog.getByRole('button', { name: '创建案件' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator('.case-card.selected')).toContainText('张三诉李四买卖合同纠纷');
    await expect(page.locator('.right-workbench .empty-state')).toBeVisible();
    await expect(page.locator('.right-workbench')).not.toContainText('47 件');
  });

  test('文件夹选择派生案件名称建议', async ({ page }) => {
    await openWorkbench(page);
    await page.getByTestId('new-case-open').click();
    const dialog = page.getByTestId('new-case-dialog');
    const fileInput = dialog.locator('input[type="file"]');
    await fileInput.setInputFiles({ name: '王五诉赵六侵权纠纷/合同.pdf', mimeType: 'application/pdf', buffer: Buffer.from('demo') });
    await expect(dialog.getByRole('textbox', { name: '案件名称' })).toHaveValue(/王五诉赵六侵权纠纷/);
  });

  test('取消关闭对话框且不新增案件', async ({ page }) => {
    await openWorkbench(page);
    await page.getByTestId('new-case-open').click();
    const dialog = page.getByTestId('new-case-dialog');
    await dialog.getByRole('button', { name: '不使用文件夹，直接命名' }).click();
    await dialog.getByRole('button', { name: '取消' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator('.case-card')).toHaveCount(1);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @courtwork/desktop exec playwright test global-verbs.spec.ts -g "新建案件"`
Expected: FAIL — `new-case-open` testid not found

- [ ] **Step 3: Implement `NewCaseDialog`**

```typescript
// apps/desktop/src/case/NewCaseDialog.tsx
import { useRef, useState } from 'react';

interface NewCaseDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (input: { title: string; fileCount: number }) => void;
}

export function NewCaseDialog({ open, onClose, onCreate }: NewCaseDialogProps) {
  const [step, setStep] = useState<'folder' | 'name'>('folder');
  const [fileCount, setFileCount] = useState(0);
  const [name, setName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const reset = () => {
    setStep('folder');
    setFileCount(0);
    setName('');
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleFolderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const relativePath = (files[0] as File & { webkitRelativePath?: string }).webkitRelativePath ?? '';
    const folderName = relativePath.split('/')[0] || '新案件';
    setFileCount(files.length);
    setName(folderName);
    setStep('name');
  };

  const skipFolder = () => {
    setFileCount(0);
    setName('');
    setStep('name');
  };

  const confirm = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate({ title: trimmed, fileCount });
    reset();
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="new-case-dialog" role="dialog" aria-modal="true" aria-labelledby="new-case-title" data-testid="new-case-dialog">
        <h2 id="new-case-title">新建案件</h2>
        {step === 'folder' && <>
          <p>选择案件对应的文件夹，Courtwork 会用文件夹名称作为案件名称建议。</p>
          <button type="button" className="folder-pick-button" onClick={() => fileInputRef.current?.click()}>
            选择案件文件夹
          </button>
          <input
            ref={fileInputRef}
            type="file"
            // @ts-expect-error -- webkitdirectory/directory are non-standard but widely supported attributes
            webkitdirectory="true"
            directory=""
            multiple
            style={{ display: 'none' }}
            onChange={handleFolderChange}
          />
          <button type="button" className="folder-skip-link" onClick={skipFolder}>不使用文件夹，直接命名</button>
          <footer><button className="quiet-button" onClick={close}>取消</button></footer>
        </>}
        {step === 'name' && <>
          <label className="credential-field">
            <span>案件名称</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
              aria-label="案件名称"
              placeholder="例如：张三诉李四买卖合同纠纷"
            />
          </label>
          {fileCount > 0 && <p className="setup-step">已选择 {fileCount} 份文件</p>}
          <footer>
            <button className="quiet-button" onClick={close}>取消</button>
            <button className="primary-button" onClick={confirm} disabled={!name.trim()}>创建案件</button>
          </footer>
        </>}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Restructure case rail in `App.tsx`**

Add import near other case-adjacent imports (after `import { CopyButton } from './workbench/CopyButton';`):

```typescript
import { NewCaseDialog } from './case/NewCaseDialog';
import type { CaseSummary } from './case/types';
```

Add module-scope constant, placed after `const VIEWS = ...` (`App.tsx:40`):

```typescript
const DEMO_CASE: CaseSummary = { id: 'demo-linjiang', title: '临江精铸 诉 起云智能 设备采购合同纠纷', caseNumber: '(2025)云章03民初472号', fileCount: 20, archived: false };
```

Add state, inside `App()` near the other `useState` calls (after `const [providerSetupOpen, setProviderSetupOpen] = useState(true);` at `App.tsx:72`):

```typescript
  const [cases, setCases] = useState<CaseSummary[]>([DEMO_CASE]);
  const [selectedCaseId, setSelectedCaseId] = useState(DEMO_CASE.id);
  const [newCaseOpen, setNewCaseOpen] = useState(false);
```

Add derived values and handler, after the existing derived-values block (after `const usage = flow === 'S3' ? 91 : 18;` at `App.tsx:133`):

```typescript
  const selectedCase = cases.find((item) => item.id === selectedCaseId) ?? cases[0];
  const isDemoCase = selectedCase.id === DEMO_CASE.id;

  const createCase = ({ title, fileCount }: { title: string; fileCount: number }) => {
    const newId = `case-${cases.length}-${title}`;
    setCases((current) => [...current, { id: newId, title, fileCount, archived: false }]);
    setSelectedCaseId(newId);
    setNewCaseOpen(false);
  };
```

(`newId` is derived from `cases.length` + title rather than `Date.now()` so the flow stays deterministic under test; a title collision within one session is an acceptable MVP limitation, not a correctness bug for this ticket's scope.)

Modify `renderView` to short-circuit for non-demo cases. Replace `App.tsx:179`:
```tsx
  const renderView = (view: WorkbenchView) => {
    if (view === 'timeline') return <TimelinePanel timeline={timeline} grade={session.evidenceGrades[0]?.grade} />;
```
with:
```tsx
  const renderView = (view: WorkbenchView) => {
    if (!isDemoCase) return <div className="empty-state" role="status">{selectedCase.title} 刚建立，尚无卷宗内容 · 从对话或场景开始整理</div>;
    if (view === 'timeline') return <TimelinePanel timeline={timeline} grade={session.evidenceGrades[0]?.grade} />;
```

Modify the conversation transcript to gate on `isDemoCase`. Replace `App.tsx:260-270`:
```tsx
            <div className="user-message">{flow === 'S1' ? '整理全套卷宗，标出事件矛盾并核对当事人关系。' : '审查这份设备采购合同，重点看付款、验收与违约责任。'}</div>
            <article className="data-card">
```
with:
```tsx
            {!isDemoCase && <div className="empty-state" role="status">{selectedCase.title} 刚建立，尚无对话记录 · 从场景按钮开始</div>}
            {isDemoCase && <>
            <div className="user-message">{flow === 'S1' ? '整理全套卷宗，标出事件矛盾并核对当事人关系。' : '审查这份设备采购合同，重点看付款、验收与违约责任。'}</div>
            <article className="data-card">
```
and close the fragment right after the callout's closing `</aside>` (`App.tsx:270`, end of the block edited in Task 4) by appending `</>}` immediately after it.

Replace the entire case-rail `<aside>` block (`App.tsx:235-255`):
```tsx
        <aside className="case-rail">
          <div className="case-expanded">
            <PanelHead title="案件" count="1" />
            <div className="case-scroll">
              <article className="case-card selected">
                <strong className="truncate" title="临江精铸 诉 起云智能 设备采购合同纠纷">临江精铸 诉 起云智能 设备采购合同纠纷</strong>
                <span className="case-number">(2025)云章03民初472号</span>
                <span>卷宗 20 件 · 已归档摄取</span>
              </article>
              <p className="rail-label">阶段</p>
              <button className={`stage-row ${flow === 'S1' ? 'selected' : ''}`} onClick={() => selectFlow('S1')} data-testid="flow-s1"><Icon name="panels" />阶段一 · 阅卷整理<span>已归档</span></button>
              <button className={`stage-row ${flow === 'S3' ? 'selected' : ''}`} onClick={() => selectFlow('S3')} data-testid="flow-s3"><Icon name="panels" />阶段二 · 合同审查<span>{Object.keys(dispositions).length}/6</span></button>
            </div>
            <div className="rail-footer">主办律师 · 林律师</div>
          </div>
          <nav className="collapsed-case-icons" aria-label="折叠的案件栏">
            <button aria-label="当前案件" title="临江精铸案"><Icon name="case" /><span className="unread-count">1</span></button>
            <button aria-label="阅卷整理" title="阅卷整理" onClick={() => selectFlow('S1')}><Icon name="panels" /></button>
            <button aria-label="合同审查" title="合同审查" onClick={() => selectFlow('S3')}><Icon name="conversation" /></button>
          </nav>
        </aside>
```
with (archive button/popover left as plain markup here — Task 6 adds `ArchiveConfirmPopover` in place of the comment marker):
```tsx
        <aside className="case-rail">
          <div className="case-expanded">
            <PanelHead title="案件" count={String(cases.length)} action={<button className="rail-add-button" onClick={() => setNewCaseOpen(true)} data-testid="new-case-open" aria-label="新建案件" title="新建案件"><Icon name="plus" /></button>} />
            <div className="case-scroll">
              {cases.map((item) => (
                <article key={item.id} className={`case-card ${item.id === selectedCaseId ? 'selected' : ''} ${item.archived ? 'archived' : ''}`} data-testid={`case-card-${item.id}`}>
                  <button className="case-card-select" onClick={() => setSelectedCaseId(item.id)}>
                    <strong className="truncate" title={item.title}>{item.title}</strong>
                    {item.caseNumber && <span className="case-number">{item.caseNumber}</span>}
                    <span>卷宗 {item.fileCount} 件{item.archived ? ' · 已归档' : ''}</span>
                  </button>
                  {/* ARCHIVE_BUTTON_PLACEHOLDER_TASK6 */}
                </article>
              ))}
              {isDemoCase && <>
                <p className="rail-label">阶段</p>
                <button className={`stage-row ${flow === 'S1' ? 'selected' : ''}`} onClick={() => selectFlow('S1')} data-testid="flow-s1"><Icon name="panels" />阶段一 · 阅卷整理<span>已归档</span></button>
                <button className={`stage-row ${flow === 'S3' ? 'selected' : ''}`} onClick={() => selectFlow('S3')} data-testid="flow-s3"><Icon name="panels" />阶段二 · 合同审查<span>{Object.keys(dispositions).length}/6</span></button>
              </>}
            </div>
            <div className="rail-footer">主办律师 · 林律师</div>
          </div>
          <nav className="collapsed-case-icons" aria-label="折叠的案件栏">
            {cases.map((item) => (
              <button key={item.id} aria-label={item.title} title={item.title} onClick={() => setSelectedCaseId(item.id)}>
                <Icon name="case" />
                {item.id === DEMO_CASE.id && <span className="unread-count">1</span>}
              </button>
            ))}
            {isDemoCase && <>
              <button aria-label="阅卷整理" title="阅卷整理" onClick={() => selectFlow('S1')}><Icon name="panels" /></button>
              <button aria-label="合同审查" title="合同审查" onClick={() => selectFlow('S3')}><Icon name="conversation" /></button>
            </>}
          </nav>
        </aside>
```
(the `{/* ARCHIVE_BUTTON_PLACEHOLDER_TASK6 */}` comment is a real, temporary marker you will replace in Task 6 — do not leave it in the final code; Task 6's step 3 replaces it.)

Update `PanelHead` to accept an optional `action` slot. Replace `App.tsx:321-323`:
```tsx
function PanelHead({ title, count, shortcut }: { title: string; count: string; shortcut?: string }) {
  return <header className="panel-head"><h2>{title}</h2><span>{count}</span><i />{shortcut && <small>{shortcut}</small>}</header>;
}
```
with:
```tsx
function PanelHead({ title, count, shortcut, action }: { title: string; count: string; shortcut?: string; action?: React.ReactNode }) {
  return <header className="panel-head"><h2>{title}</h2><span>{count}</span><i />{shortcut && <small>{shortcut}</small>}{action}</header>;
}
```

Render the dialog near `<ProviderSetup ...>` at the end of the component (after `App.tsx:316`, inside the closing `</main>`):

```tsx
      <NewCaseDialog open={newCaseOpen} onClose={() => setNewCaseOpen(false)} onCreate={createCase} />
```

- [ ] **Step 5: Update CSS**

Replace `apps/desktop/src/styles.css:94-95`:
```css
.case-card { display: flex; flex-direction: column; gap: 3px; padding: 8px 10px; border: 1px solid var(--border-strong); border-radius: 6px; background: var(--bg-raised); font-size: 12px; color: var(--text-tertiary); }
.case-card strong { color: var(--text-primary); font-size: 13px; font-weight: 510; line-height: 1.5; }
```
with:
```css
.case-card { position: relative; border: 1px solid var(--border-strong); border-radius: 6px; background: var(--bg-raised); overflow: hidden; }
.case-card + .case-card { margin-top: 6px; }
.case-card.selected { background: var(--bg-selected); }
.case-card.archived { opacity: .6; }
.case-card-select { width: 100%; display: flex; flex-direction: column; gap: 3px; padding: 8px 28px 8px 10px; border: 0; background: transparent; cursor: pointer; text-align: left; font: inherit; color: var(--text-tertiary); font-size: 12px; }
.case-card-select strong { color: var(--text-primary); font-size: 13px; font-weight: 510; line-height: 1.5; }
.rail-add-button { width: 22px; height: 22px; display: grid; place-items: center; padding: 0; border: 1px solid var(--border-strong); border-radius: 4px; background: #fff; cursor: pointer; }
.rail-add-button:hover { background: var(--bg-hover); }
.rail-add-button .line-icon { width: 14px; height: 14px; }
```

Add after the `.compile-dialog > div { ... }` rule (`styles.css:284`):
```css
.new-case-dialog { width: min(460px, calc(100vw - 32px)); padding: 16px; border: 1px solid var(--border-strong); border-radius: 6px; background: #fff; }
.new-case-dialog h2 { margin: 0 0 10px; font-size: 18px; font-weight: 510; }
.new-case-dialog p { margin: 0 0 12px; color: var(--text-secondary); line-height: 1.55; }
.folder-pick-button { width: 100%; min-height: 72px; display: flex; align-items: center; justify-content: center; border: 1px dashed var(--border-strong); border-radius: 6px; background: var(--bg-surface); cursor: pointer; color: var(--text-secondary); font-size: 13px; }
.folder-pick-button:hover { background: var(--bg-hover); }
.folder-skip-link { display: block; margin: 10px auto 0; border: 0; background: transparent; color: var(--text-tertiary); cursor: pointer; font-size: 12px; text-decoration: underline; }
.new-case-dialog footer { display: flex; justify-content: flex-end; gap: 7px; margin-top: 16px; }
```

- [ ] **Step 6: Run tests to verify green**

Run: `pnpm --filter @courtwork/desktop exec tsc -b --noEmit && pnpm --filter @courtwork/desktop exec playwright test global-verbs.spec.ts`
Expected: all pass (including Task 4's tests, still green)

Run: `pnpm --filter @courtwork/desktop exec playwright test workbench.spec.ts`
Expected: still all green — the `PanelHead`/case-card changes must not break the existing `完整工作台帧` or `de-slop 基线` tests (both touch `.case-card`).

- [ ] **Step 7: Commit**

```bash
git status
git diff --cached --name-only
git add apps/desktop/src/case/NewCaseDialog.tsx apps/desktop/src/App.tsx apps/desktop/src/styles.css apps/desktop/tests/e2e/global-verbs.spec.ts
git commit -m "$(cat <<'EOF'
feat(desktop): 新建案件（左栏入口 + 系统文件夹选择器 + 命名）

F-2 第二项。案件列表从单例改为可增长数组；文件夹选择走标准
input[webkitdirectory]（零 Tauri capability 变更）；新案件进入后
工作面与对话流显示诚实空态，不冒充样板案数据。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)" -- apps/desktop/src/case/NewCaseDialog.tsx apps/desktop/src/App.tsx apps/desktop/src/styles.css apps/desktop/tests/e2e/global-verbs.spec.ts
```

---

## Task 6: Archive / unarchive case

**Files:**
- Create: `apps/desktop/src/case/ArchiveConfirmPopover.tsx`
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/styles.css`
- Modify: `apps/desktop/tests/e2e/global-verbs.spec.ts`

- [ ] **Step 1: Write the failing Playwright tests**

Append to `global-verbs.spec.ts`:

```typescript
test.describe('归档案件', () => {
  test('popover 轻确认归档并可逆', async ({ page }) => {
    await openWorkbench(page);
    const card = page.locator('.case-card').first();
    await card.hover();
    await card.getByTestId('archive-trigger').click();
    await expect(page.locator('.archive-popover')).toBeVisible();
    await page.locator('.archive-popover').getByRole('button', { name: '归档', exact: true }).click();
    await expect(card).toHaveClass(/archived/);
    await card.hover();
    await card.getByTestId('archive-trigger').click();
    await page.locator('.archive-popover').getByRole('button', { name: '取消归档', exact: true }).click();
    await expect(card).not.toHaveClass(/archived/);
  });

  test('取消不改变归档状态', async ({ page }) => {
    await openWorkbench(page);
    const card = page.locator('.case-card').first();
    await card.hover();
    await card.getByTestId('archive-trigger').click();
    await page.locator('.archive-popover').getByRole('button', { name: '取消', exact: true }).click();
    await expect(page.locator('.archive-popover')).toHaveCount(0);
    await expect(card).not.toHaveClass(/archived/);
  });

  test('案件卡片无删除入口', async ({ page }) => {
    await openWorkbench(page);
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /删除案件/ })).toHaveCount(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @courtwork/desktop exec playwright test global-verbs.spec.ts -g "归档案件"`
Expected: FAIL — `archive-trigger` testid not found

- [ ] **Step 3: Implement `ArchiveConfirmPopover` and wire it in**

```typescript
// apps/desktop/src/case/ArchiveConfirmPopover.tsx
interface ArchiveConfirmPopoverProps {
  caseTitle: string;
  archived: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ArchiveConfirmPopover({ caseTitle, archived, onConfirm, onCancel }: ArchiveConfirmPopoverProps) {
  return (
    <div className="archive-popover" role="dialog" aria-label={archived ? '取消归档确认' : '归档确认'}>
      <p>
        {archived
          ? `取消归档《${caseTitle}》？取消后将恢复到案件列表的常规视图。`
          : `归档《${caseTitle}》？归档后仍可随时取消归档，案件内容不会被删除。`}
      </p>
      <footer>
        <button className="quiet-button" onClick={onCancel}>取消</button>
        <button className="primary-button" onClick={onConfirm}>{archived ? '取消归档' : '归档'}</button>
      </footer>
    </div>
  );
}
```

In `App.tsx`, add import (alongside the `NewCaseDialog` import):

```typescript
import { ArchiveConfirmPopover } from './case/ArchiveConfirmPopover';
```

Add state (alongside `newCaseOpen`):

```typescript
  const [archiveConfirmCaseId, setArchiveConfirmCaseId] = useState<string | null>(null);
```

Add handler (alongside `createCase`):

```typescript
  const toggleArchive = (caseId: string) => {
    setCases((current) => current.map((item) => (item.id === caseId ? { ...item, archived: !item.archived } : item)));
    setArchiveConfirmCaseId(null);
  };
```

Replace the `{/* ARCHIVE_BUTTON_PLACEHOLDER_TASK6 */}` marker left in Task 5 with:

```tsx
                  <button
                    className="case-archive-button"
                    onClick={() => setArchiveConfirmCaseId(item.id)}
                    aria-label={item.archived ? '取消归档' : '归档'}
                    title={item.archived ? '取消归档' : '归档'}
                    data-testid="archive-trigger"
                  >
                    <Icon name="archive" />
                  </button>
                  {archiveConfirmCaseId === item.id && (
                    <ArchiveConfirmPopover
                      caseTitle={item.title}
                      archived={item.archived}
                      onConfirm={() => toggleArchive(item.id)}
                      onCancel={() => setArchiveConfirmCaseId(null)}
                    />
                  )}
```

- [ ] **Step 4: Add CSS**

Append after the `.rail-add-button .line-icon { ... }` rule added in Task 5:

```css
.case-archive-button { position: absolute; top: 6px; right: 6px; width: 20px; height: 20px; display: grid; place-items: center; padding: 0; border: 1px solid transparent; border-radius: 4px; background: transparent; color: var(--text-tertiary); cursor: pointer; opacity: 0; transition: opacity var(--motion-hover) ease-out, background-color var(--motion-hover) ease-out; }
.case-card:hover .case-archive-button, .case-card:focus-within .case-archive-button { opacity: 1; }
.case-archive-button:hover { border-color: var(--border-strong); background: var(--bg-hover); }
.case-archive-button .line-icon { width: 14px; height: 14px; }
.archive-popover { position: absolute; z-index: 5; top: 100%; right: 6px; width: 220px; margin-top: 4px; padding: 10px; border: 1px solid var(--border-strong); border-radius: 6px; background: #fff; color: var(--text-secondary); font-size: 12px; line-height: 1.55; animation: overlay-in var(--motion-overlay) var(--motion-overlay-ease) both; }
.archive-popover footer { display: flex; justify-content: flex-end; gap: 6px; margin-top: 8px; }
@keyframes overlay-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
```

- [ ] **Step 5: Run tests to verify green**

Run: `pnpm --filter @courtwork/desktop exec tsc -b --noEmit && pnpm --filter @courtwork/desktop exec playwright test global-verbs.spec.ts`
Expected: all pass

Run: `pnpm --filter @courtwork/desktop exec node scripts/assert-motion-properties.mjs`
Expected: PASS — `overlay-in` keyframe only touches `opacity`/`transform`, both allowed.

- [ ] **Step 6: Commit**

```bash
git status
git diff --cached --name-only
git add apps/desktop/src/case/ArchiveConfirmPopover.tsx apps/desktop/src/App.tsx apps/desktop/src/styles.css apps/desktop/tests/e2e/global-verbs.spec.ts
git commit -m "$(cat <<'EOF'
feat(desktop): 归档案件（popover 轻确认，可逆，无删除入口）

F-2 第三项。归档态可视但降权（opacity），列表内 toggle，
不提供任何删除路径（数据保全裁决）。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)" -- apps/desktop/src/case/ArchiveConfirmPopover.tsx apps/desktop/src/App.tsx apps/desktop/src/styles.css apps/desktop/tests/e2e/global-verbs.spec.ts
```

---

## Task 7: Focus mode

**Files:**
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/styles.css`
- Modify: `apps/desktop/tests/e2e/global-verbs.spec.ts`

- [ ] **Step 1: Write the failing Playwright tests**

Append to `global-verbs.spec.ts`:

```typescript
test.describe('专注模式', () => {
  test('进入后左中栏隐藏、右栏独占且 0ms 硬切', async ({ page }) => {
    await openWorkbench(page);
    const workspace = page.getByTestId('workspace');
    await expect(workspace).toHaveCSS('transition-duration', '0s');
    await page.getByTestId('focus-toggle').click();
    await expect(workspace).toHaveAttribute('data-focus-mode', 'true');
    await expect(page.locator('.case-rail')).toHaveCount(0);
    await expect(page.locator('.conversation')).toHaveCount(0);
    await expect(page.locator('.right-workbench')).toBeVisible();
  });

  test('Esc 退出专注模式恢复三栏', async ({ page }) => {
    await openWorkbench(page);
    await page.getByTestId('focus-toggle').click();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('workspace')).toHaveAttribute('data-focus-mode', 'false');
    await expect(page.locator('.case-rail')).toBeVisible();
    await expect(page.locator('.conversation')).toBeVisible();
  });

  test('专注态按钮显示 Esc 提示且对照控件隐藏', async ({ page }) => {
    await openWorkbench(page);
    await page.getByTestId('focus-toggle').click();
    await expect(page.getByTestId('focus-toggle')).toContainText('Esc');
    await expect(page.getByTestId('split-start')).toHaveCount(0);
  });

  test('对照态进入专注模式会重置为单栏', async ({ page }) => {
    await openWorkbench(page);
    await page.getByTestId('split-start').click();
    await expect(page.getByTestId('workspace')).toHaveAttribute('data-comparing', 'true');
    await page.getByTestId('focus-toggle').click();
    await expect(page.getByTestId('workspace')).toHaveAttribute('data-comparing', 'false');
    await expect(page.getByTestId('workspace')).toHaveAttribute('data-focus-mode', 'true');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @courtwork/desktop exec playwright test global-verbs.spec.ts -g "专注模式"`
Expected: FAIL — `focus-toggle` testid not found

- [ ] **Step 3: Implement in `App.tsx`**

Add state (alongside `archiveConfirmCaseId`):

```typescript
  const [focusMode, setFocusMode] = useState(false);
```

Add handler, after `resetComparison` (`App.tsx:157-161`):

```typescript
  const toggleFocusMode = () => {
    setFocusMode((current) => {
      const next = !current;
      if (next) { setSecondaryView(undefined); setSplitDirection('rows'); setSplitRatio(50); }
      return next;
    });
  };
```

Modify the `.workspace` div and its three children. Replace `App.tsx:234-255` opening/closing structure — the div tag itself:
```tsx
      <div className={`workspace ${comparing ? 'comparing' : ''}`} data-testid="workspace" data-comparing={comparing ? 'true' : 'false'}>
        <aside className="case-rail">
```
with:
```tsx
      <div className={`workspace ${comparing ? 'comparing' : ''} ${focusMode ? 'focus-mode' : ''}`} data-testid="workspace" data-comparing={comparing ? 'true' : 'false'} data-focus-mode={focusMode ? 'true' : 'false'}>
        {!focusMode && <aside className="case-rail">
```
and the matching closing `</aside>` (end of the block Task 5/6 edited) becomes `</aside>}`.

Similarly wrap the `<section className="conversation">...</section>` block: its opening tag becomes `{!focusMode && <section className="conversation">` and its closing `</section>` becomes `</section>}`.

The `<section className="right-workbench">` block is unchanged — it always renders.

Modify the view-tabs row. Replace `App.tsx:281-286`:
```tsx
            {!comparing && <button className="view-action" onClick={startComparison} data-testid="split-start" title="开始上下对照"><Icon name="compare" />对照</button>}
            {comparing && <>
              <button className={`icon-button ${splitDirection === 'rows' ? 'active' : ''}`} aria-label="上下对照" title="上下对照" aria-pressed={splitDirection === 'rows'} onClick={() => setSplitDirection('rows')}><Icon name="stack" /></button>
              <button className={`icon-button ${splitDirection === 'columns' ? 'active' : ''}`} aria-label="左右对照" title={wideSplitAvailable ? '左右对照' : '窗口宽度达到 1600 后可用'} aria-pressed={splitDirection === 'columns'} disabled={!wideSplitAvailable} onClick={() => setSplitDirection('columns')}><Icon name="columns" /></button>
              <button className="view-action" onClick={resetComparison} data-testid="split-reset" title="退出对照并恢复三栏"><Icon name="reset" />复位</button>
            </>}
```
with:
```tsx
            {!focusMode && !comparing && <button className="view-action" onClick={startComparison} data-testid="split-start" title="开始上下对照"><Icon name="compare" />对照</button>}
            {!focusMode && comparing && <>
              <button className={`icon-button ${splitDirection === 'rows' ? 'active' : ''}`} aria-label="上下对照" title="上下对照" aria-pressed={splitDirection === 'rows'} onClick={() => setSplitDirection('rows')}><Icon name="stack" /></button>
              <button className={`icon-button ${splitDirection === 'columns' ? 'active' : ''}`} aria-label="左右对照" title={wideSplitAvailable ? '左右对照' : '窗口宽度达到 1600 后可用'} aria-pressed={splitDirection === 'columns'} disabled={!wideSplitAvailable} onClick={() => setSplitDirection('columns')}><Icon name="columns" /></button>
              <button className="view-action" onClick={resetComparison} data-testid="split-reset" title="退出对照并恢复三栏"><Icon name="reset" />复位</button>
            </>}
            <button className="view-action" onClick={toggleFocusMode} data-testid="focus-toggle" aria-pressed={focusMode} title={focusMode ? '退出专注模式' : '专注模式 · 单工作面全窗'}>
              <Icon name="focus" /><span>{focusMode ? '退出专注' : '专注'}</span>{focusMode && <kbd>Esc</kbd>}
            </button>
```

- [ ] **Step 4: Add CSS**

Append after the `.workspace.comparing { ... }` rule (`styles.css:78`):

```css
.workspace.focus-mode { grid-template-columns: minmax(0, 1fr); }
```

- [ ] **Step 5: Run tests to verify green**

Run: `pnpm --filter @courtwork/desktop exec tsc -b --noEmit && pnpm --filter @courtwork/desktop exec playwright test global-verbs.spec.ts`
Expected: all pass

Run: `pnpm --filter @courtwork/desktop exec playwright test workbench.spec.ts`
Expected: still all green — `Split-Tab Grid` tests must be unaffected since focus mode is off by default.

- [ ] **Step 6: Commit**

```bash
git status
git diff --cached --name-only
git add apps/desktop/src/App.tsx apps/desktop/src/styles.css apps/desktop/tests/e2e/global-verbs.spec.ts
git commit -m "$(cat <<'EOF'
feat(desktop): 专注模式（单工作面全窗独占，Esc 退出，0ms 硬切）

F-2 第四项。左中栏改为条件渲染（非 CSS 隐藏），天然满足 0ms
无 crossfade；进入专注自动清空对照态，避免双态叠加歧义。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)" -- apps/desktop/src/App.tsx apps/desktop/src/styles.css apps/desktop/tests/e2e/global-verbs.spec.ts
```

---

## Task 8: ⌘K command palette

**Files:**
- Create: `apps/desktop/src/command-palette/CommandPalette.tsx`
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/styles.css`
- Modify: `apps/desktop/tests/e2e/global-verbs.spec.ts`

This lands last because its command list references actions from Tasks 5–7 (new case, archive, focus mode).

- [ ] **Step 1: Write the failing Playwright tests**

Append to `global-verbs.spec.ts`:

```typescript
test.describe('命令面板', () => {
  test('⌘K 打开命令面板，Esc 关闭', async ({ page }) => {
    await openWorkbench(page);
    await expect(page.getByTestId('command-palette')).toHaveCount(0);
    await page.keyboard.press('Meta+K');
    await expect(page.getByTestId('command-palette')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('command-palette')).toHaveCount(0);
  });

  test('模糊匹配过滤场景与操作', async ({ page }) => {
    await openWorkbench(page);
    await page.keyboard.press('Meta+K');
    const input = page.getByRole('textbox', { name: '搜索场景、案件或操作' });
    await input.fill('专注');
    await expect(page.getByRole('option', { name: /进入专注模式/ })).toBeVisible();
    await expect(page.getByRole('option', { name: '整理卷宗' })).toHaveCount(0);
  });

  test('选择场景条目触发对应场景并关闭面板', async ({ page }) => {
    await openWorkbench(page);
    await page.keyboard.press('Meta+K');
    await page.getByRole('option', { name: '审查合同' }).click();
    await expect(page.getByTestId('command-palette')).toHaveCount(0);
    await expect(page.getByTestId('flow-s3')).toHaveClass(/selected/);
  });

  test('⌘K 触发新建案件对话框', async ({ page }) => {
    await openWorkbench(page);
    await page.keyboard.press('Meta+K');
    await page.getByRole('option', { name: '新建案件' }).click();
    await expect(page.getByTestId('new-case-dialog')).toBeVisible();
  });

  test('⌘K 触发专注模式并可再次通过面板退出', async ({ page }) => {
    await openWorkbench(page);
    await page.keyboard.press('Meta+K');
    await page.getByRole('option', { name: '进入专注模式' }).click();
    await expect(page.getByTestId('workspace')).toHaveAttribute('data-focus-mode', 'true');
    await page.keyboard.press('Meta+K');
    await page.getByRole('option', { name: '退出专注模式' }).click();
    await expect(page.getByTestId('workspace')).toHaveAttribute('data-focus-mode', 'false');
  });

  test('打开产出文件夹为已声明缺口禁用态', async ({ page }) => {
    await openWorkbench(page);
    await page.keyboard.press('Meta+K');
    const item = page.getByRole('option', { name: '打开产出文件夹' });
    await expect(item).toHaveAttribute('aria-disabled', 'true');
    await expect(item).toHaveAttribute('title', /即将支持/);
  });

  test('方向键在结果间移动高亮', async ({ page }) => {
    await openWorkbench(page);
    await page.keyboard.press('Meta+K');
    const first = page.getByRole('option').first();
    await expect(first).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowDown');
    await expect(first).toHaveAttribute('aria-selected', 'false');
  });

  test('案件切换命令列出新建案件并可选中', async ({ page }) => {
    await openWorkbench(page);
    await page.getByTestId('new-case-open').click();
    const dialog = page.getByTestId('new-case-dialog');
    await dialog.getByRole('button', { name: '不使用文件夹，直接命名' }).click();
    await dialog.getByRole('textbox', { name: '案件名称' }).fill('周七诉吴八借款纠纷');
    await dialog.getByRole('button', { name: '创建案件' }).click();
    await page.keyboard.press('Meta+K');
    await page.getByRole('option', { name: '临江精铸', exact: false }).click();
    await expect(page.locator('.case-card.selected')).toContainText('临江精铸');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @courtwork/desktop exec playwright test global-verbs.spec.ts -g "命令面板"`
Expected: FAIL — `command-palette` testid not found, ⌘K does nothing yet

- [ ] **Step 3: Implement `CommandPalette`**

```typescript
// apps/desktop/src/command-palette/CommandPalette.tsx
import { useEffect, useRef, useState } from 'react';
import { filterCommands } from './fuzzy-match';

export interface PaletteCommand {
  id: string;
  section: string;
  label: string;
  disabled?: boolean;
  disabledReason?: string;
  onRun: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  commands: PaletteCommand[];
  onClose: () => void;
}

export function CommandPalette({ open, commands, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setHighlighted(0);
    inputRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const results = filterCommands(query, commands, (command) => command.label);

  const runAt = (index: number) => {
    const command = results[index];
    if (!command || command.disabled) return;
    command.onRun();
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setHighlighted((index) => Math.min(index + 1, results.length - 1)); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setHighlighted((index) => Math.max(index - 1, 0)); }
    else if (event.key === 'Enter') { event.preventDefault(); runAt(highlighted); }
  };

  let lastSection = '';

  return (
    <div className="modal-backdrop palette-backdrop" role="presentation">
      <section className="command-palette" role="dialog" aria-modal="true" aria-label="命令面板" data-testid="command-palette">
        <input
          ref={inputRef}
          className="palette-input"
          value={query}
          onChange={(event) => { setQuery(event.target.value); setHighlighted(0); }}
          onKeyDown={onInputKeyDown}
          placeholder="搜索场景、案件或操作…"
          aria-label="搜索场景、案件或操作"
        />
        <div className="palette-results" role="listbox" aria-label="命令结果">
          {results.length === 0 && <p className="palette-empty">没有找到匹配项</p>}
          {results.map((command, index) => {
            const showHeader = command.section !== lastSection;
            lastSection = command.section;
            return (
              <div key={command.id}>
                {showHeader && <p className="palette-section">{command.section}</p>}
                <button
                  type="button"
                  role="option"
                  aria-selected={index === highlighted}
                  aria-disabled={command.disabled || undefined}
                  className={`palette-item ${index === highlighted ? 'active' : ''}`}
                  onMouseEnter={() => setHighlighted(index)}
                  onClick={() => runAt(index)}
                  title={command.disabled ? command.disabledReason : undefined}
                  data-disabled={command.disabled ? 'true' : 'false'}
                >
                  <span>{command.label}</span>
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Wire into `App.tsx`**

Add import:

```typescript
import { CommandPalette, type PaletteCommand } from './command-palette/CommandPalette';
```

Add state (alongside `focusMode`):

```typescript
  const [paletteOpen, setPaletteOpen] = useState(false);
```

Add the global keydown effect. Place after the existing `useEffect` that syncs `splitDirection` with `wideSplitAvailable` (`App.tsx:85-87`):

```typescript
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (event.key === 'Escape') {
        if (paletteOpen) { setPaletteOpen(false); return; }
        if (newCaseOpen) { setNewCaseOpen(false); return; }
        if (archiveConfirmCaseId) { setArchiveConfirmCaseId(null); return; }
        if (focusMode) { toggleFocusMode(); return; }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [paletteOpen, newCaseOpen, archiveConfirmCaseId, focusMode]);
```

Add the command list, computed each render just above the `return (` statement (after `const comparing = ...` / `const usage = ...` block, and after `createCase`/`toggleArchive`/`toggleFocusMode` are defined):

```typescript
  const paletteCommands: PaletteCommand[] = [
    { id: 'scene-s1', section: '场景', label: '整理卷宗', onRun: () => { selectFlow('S1'); setPaletteOpen(false); } },
    { id: 'scene-s3', section: '场景', label: '审查合同', onRun: () => { selectFlow('S3'); setPaletteOpen(false); } },
    { id: 'scene-draft', section: '场景', label: '起草答辩状', onRun: () => { choosePrimaryView('draft'); setPaletteOpen(false); } },
    ...cases.map((item) => ({
      id: `case-${item.id}`,
      section: '案件',
      label: item.archived ? `${item.title}（已归档）` : item.title,
      onRun: () => { setSelectedCaseId(item.id); setPaletteOpen(false); },
    })),
    { id: 'action-new-case', section: '操作', label: '新建案件', onRun: () => { setPaletteOpen(false); setNewCaseOpen(true); } },
    {
      id: 'action-archive',
      section: '操作',
      label: selectedCase.archived ? '取消归档当前案件' : '归档当前案件',
      onRun: () => { setPaletteOpen(false); setArchiveConfirmCaseId(selectedCase.id); },
    },
    {
      id: 'action-focus',
      section: '操作',
      label: focusMode ? '退出专注模式' : '进入专注模式',
      onRun: () => { setPaletteOpen(false); toggleFocusMode(); },
    },
    {
      id: 'action-output-folder',
      section: '操作',
      label: '打开产出文件夹',
      disabled: true,
      disabledReason: '产出文件夹即将支持 · 当前可在起草画布内查看产出',
      onRun: () => {},
    },
  ];
```

Render it near `<ProviderSetup ...>`:

```tsx
      <CommandPalette open={paletteOpen} commands={paletteCommands} onClose={() => setPaletteOpen(false)} />
```

Also update the titlebar `⌘K` hint (`App.tsx:222`) to actually open the palette on click, turning the static hint into a real trigger:

Replace:
```tsx
        <span className="shortcut"><kbd>⌘</kbd><kbd>K</kbd> 场景与检索</span>
```
with:
```tsx
        <button className="shortcut shortcut-trigger" onClick={() => setPaletteOpen(true)}><kbd>⌘</kbd><kbd>K</kbd> 场景与检索</button>
```

- [ ] **Step 5: Add CSS**

Append after the `.split-divider span { ... }` block or any convenient spot — place after `.modal-backdrop { ... }` (`styles.css:280`):

```css
.palette-backdrop { align-items: flex-start; padding-top: 96px; }
.command-palette { width: min(560px, calc(100vw - 64px)); max-height: 60vh; display: flex; flex-direction: column; border: 1px solid var(--border-strong); border-radius: 6px; background: #fff; overflow: hidden; animation: overlay-in var(--motion-overlay) var(--motion-overlay-ease) both; }
.palette-input { width: 100%; height: 46px; padding: 0 14px; border: 0; border-bottom: 1px solid var(--border); background: transparent; color: var(--text-primary); font-size: 15px; }
.palette-input:focus-visible { outline: none; }
.palette-results { flex: 1; min-height: 0; padding: 6px; overflow: auto; }
.palette-empty { margin: 0; padding: 14px; color: var(--text-tertiary); font-size: 13px; text-align: center; }
.palette-section { margin: 8px 8px 2px; color: var(--text-tertiary); font: 11px/1.5 var(--mono); font-variant-numeric: tabular-nums; text-transform: uppercase; }
.palette-item { width: 100%; min-height: 32px; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 8px; border: 0; border-radius: 4px; background: transparent; cursor: pointer; text-align: left; font-size: 13px; color: var(--text-primary); }
.palette-item.active { background: var(--bg-selected); }
.palette-item[data-disabled="true"] { color: var(--text-disabled); cursor: not-allowed; }
```

Also add a tiny rule so the titlebar hint-turned-button doesn't look like a generic button (keeps existing visual):
```css
.shortcut-trigger { border: 0; background: transparent; cursor: pointer; }
```
(this sits right after the existing `.shortcut { ... }` rule at `styles.css:63`)

Note: `@keyframes overlay-in` already exists from Task 6 — do not redeclare it.

- [ ] **Step 6: Run full verification**

Run: `pnpm --filter @courtwork/desktop exec tsc -b --noEmit`
Expected: no errors

Run: `pnpm --filter @courtwork/desktop exec playwright test`
Expected: every test in both `workbench.spec.ts` and `global-verbs.spec.ts` passes

Run: `pnpm --filter @courtwork/desktop exec node scripts/assert-motion-properties.mjs`
Run: `pnpm --filter @courtwork/desktop exec node scripts/assert-signature-line.mjs`
Run: `pnpm --filter @courtwork/desktop exec node scripts/assert-graph-theme.mjs`
Expected: all three PASS unchanged (none of this task's files are in their scan scope in a way that should introduce violations — confirm by reading output, not assumption)

- [ ] **Step 7: Commit**

```bash
git status
git diff --cached --name-only
git add apps/desktop/src/command-palette/CommandPalette.tsx apps/desktop/src/App.tsx apps/desktop/src/styles.css apps/desktop/tests/e2e/global-verbs.spec.ts
git commit -m "$(cat <<'EOF'
feat(desktop): ⌘K 最小命令面板（场景+案件切换+全局动作）

F-2 第一项，收尾实现：兑现标题栏已上屏的 KBD 承诺。命令列表引用
Task 5-7 落地的新建案件/归档/专注模式动作；模糊匹配复用 Task 1
的纯函数；打开产出文件夹沿用"打开 Word 文档"同款已声明缺口禁用态
（demo shell 当前不写任何真实产出文件到磁盘，非本工单遗漏）。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)" -- apps/desktop/src/command-palette/CommandPalette.tsx apps/desktop/src/App.tsx apps/desktop/src/styles.css apps/desktop/tests/e2e/global-verbs.spec.ts
```

---

## Task 9: Fake-green guard, vitest count, visual audit

**Files:**
- Modify: `apps/desktop/scripts/assert-test-count.mjs`
- Modify: `apps/desktop/tests/e2e/global-verbs.spec.ts` (only if counts differ from estimate)
- New screenshots under: `apps/desktop/visual-audit/`

- [ ] **Step 1: Get the real Playwright count**

Run: `pnpm --filter @courtwork/desktop exec playwright test --list`
Read the `Total: N tests` line — this is the authoritative number, not the plan's estimate.

- [ ] **Step 2: Update the guard**

Modify `apps/desktop/scripts/assert-test-count.mjs:9`, replace `const minimum = 26;` with the real `N` from Step 1 (do not round down or guess).

- [ ] **Step 3: Run the full desktop verification chain**

Run: `pnpm --filter @courtwork/desktop test` (Vitest — expect 6 existing + 9 new fuzzy-match = 15/15)
Run: `pnpm --filter @courtwork/desktop test:e2e` (runs all four lint scripts + assert-test-count + Playwright)
Run: `pnpm --filter @courtwork/desktop build`
Expected: everything green, build succeeds

- [ ] **Step 4: Capture before/after screenshots via the browser preview tools**

Use `preview_start`/`preview_screenshot` (never Bash/curl) at 1440×900 for:
- `14-f2-command-palette-1440.png` — palette open, showing 场景/案件/操作 sections
- `15-f2-new-case-dialog-1440.png` — naming step of the new-case dialog
- `16-f2-archive-popover-1440.png` — archive confirm popover open on a case card
- `17-f2-focus-mode-1440.png` — focus mode active, right workbench full width
- `18-f2-copy-hover-1440.png` — data-card hovered with copy button visible, ideally right after a click showing "已复制"

Save into `apps/desktop/visual-audit/` with those exact filenames (continuing the numbering already at 13 from P-3).

- [ ] **Step 5: Commit**

```bash
git status
git diff --cached --name-only
git add apps/desktop/scripts/assert-test-count.mjs apps/desktop/visual-audit/14-f2-command-palette-1440.png apps/desktop/visual-audit/15-f2-new-case-dialog-1440.png apps/desktop/visual-audit/16-f2-archive-popover-1440.png apps/desktop/visual-audit/17-f2-focus-mode-1440.png apps/desktop/visual-audit/18-f2-copy-hover-1440.png
git commit -m "$(cat <<'EOF'
test(desktop): F-2 假绿防护下限更新 + 视觉走查截图

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)" -- apps/desktop/scripts/assert-test-count.mjs apps/desktop/visual-audit/14-f2-command-palette-1440.png apps/desktop/visual-audit/15-f2-new-case-dialog-1440.png apps/desktop/visual-audit/16-f2-archive-popover-1440.png apps/desktop/visual-audit/17-f2-focus-mode-1440.png apps/desktop/visual-audit/18-f2-copy-hover-1440.png
```

---

## Task 10: SPEC.md and docs/46 bookkeeping

**Files:**
- Modify: `apps/desktop/SPEC.md`
- Modify: `docs/46-控件全量清单.md`

- [ ] **Step 1: Add an "F-2 全局动词补全" section to `apps/desktop/SPEC.md`**

Insert after the P-3 section (after the line `验证：pnpm --filter @courtwork/desktop test:e2e 26/26；...`, before `## 验证记录`). Content must state, concretely (fill in real numbers from Task 9's actual run, not placeholders):
- The five deliverables and where each lives (file paths from this plan's File Structure section).
- The two implementation decisions that deviate from a literal reading of the ticket text, with rationale: (a) folder picker uses `input[webkitdirectory]`, not a new Tauri dialog capability; (b) "打开产出文件夹" ships as a declared-gap disabled row, matching the existing "打开 Word 文档" precedent, because no real file is written to disk anywhere in this shell yet.
- Updated Playwright/Vitest totals.
- Screenshot references (the five files from Task 9 step 4).

- [ ] **Step 2: Update `docs/46-控件全量清单.md` rows**

Per the doc's own maintenance discipline (§维护纪律 item 6: "工单归属滚动更新"), update these five rows' **MVP 处置** and **工单归属** columns from their current "待切单" state to reflect real implementation, referencing `apps/desktop/SPEC.md`'s new F-2 section as the 规格出处:
- Row 24 (`⌘K 场景与检索提示`) and row 25 (`命令面板本体`) — both in §一.
- Row 47 (`AI 消息 / callout hover：复制生成文本`) — in §二.
- Row 53 (`artifact "放大/全屏"（专注模式）`) — in §二.
- Row 87 (`新建案件`) and row 88 (`归档案件`) — in §四.

Do not touch row 45 (用户消息 hover 复制原文) — it is explicitly out of this ticket's scope (item 5 only covers AI callout/data-card, not user messages) and stays "待切单".

- [ ] **Step 3: Commit**

```bash
git status
git diff --cached --name-only
git add apps/desktop/SPEC.md docs/46-控件全量清单.md
git commit -m "$(cat <<'EOF'
docs(desktop): F-2 完工记录 + 控件清单状态回填

按 docs/46 维护纪律回填五行状态；SPEC.md 记录实现决策
（webkitdirectory 免 Tauri capability、打开产出文件夹沿用
既有已声明缺口先例）与真实验证数字。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)" -- apps/desktop/SPEC.md docs/46-控件全量清单.md
```

---

## Self-Review Notes (already applied above, kept for executor visibility)

1. **Spec coverage** — all five ticket items map to tasks: ⌘K → Task 8; new case → Task 5; archive → Task 6; focus mode → Task 7; copy actions → Task 4. Fuzzy matching (explicit sub-requirement of item 1) → Task 1. `surface-popover` tokens (`motion.overlay`) → introduced in Task 4, reused in Tasks 6 and 8.
2. **Concurrency** — every task's commit step opens with `git status` + `git diff --cached --name-only` and an explicit pathspec on `git add`/`git commit`, per the standing F-1/F-2 shared-index risk noted at the top of this plan.
3. **No silent scope drift** — two deliberate boundary calls are called out explicitly (folder picker mechanism, output-folder disabled state) rather than silently implemented; Task 10 documents both instead of leaving them implicit.
4. **Assert-test-count** — Task 9 reads the real `--list` output rather than trusting this plan's ~26-test estimate, avoiding the exact "假绿" failure mode AGENTS.md's precedents warn about repeatedly.
