import { describe, expect, it } from 'vitest';
import { CASE_ZONE_DIRS, originalPath, outputPath, workDraftPath } from './case-path.js';
import { createToolExecutor, ToolInputValidationError } from './contract.js';
import {
  createMockOpenFileAdapter,
  createMockRevealInFolderAdapter,
  createMockSystemOpenHost,
  createOpenFileTool,
  createRevealInFolderTool,
  openFileFeedback,
  REVEAL_FEEDBACK,
} from './system-open.js';

const ROOT = '/tmp/courtwork-cases/临江案';
const OUTPUT_DOCX = outputPath(ROOT, '合同审查报告.docx');
const ORIGINAL_PDF = originalPath(ROOT, '设备采购合同.pdf');

describe('reveal-in-folder', () => {
  it('reveals a path inside the case folder and returns user-facing feedback', async () => {
    const host = createMockSystemOpenHost();
    const tool = createRevealInFolderTool(createMockRevealInFolderAdapter(host));
    const executor = createToolExecutor();

    const result = await executor.execute(tool, { path: OUTPUT_DOCX, caseRoot: ROOT });

    expect(result.verified).toBe(true);
    if (result.verified) {
      expect(result.data.feedbackMessage).toBe(REVEAL_FEEDBACK);
      expect(result.data.revealedPath).toBe(OUTPUT_DOCX);
      expect(result.source).toBe('mock');
    }
    expect(host.log.reveals).toEqual([OUTPUT_DOCX]);
  });

  it('allows revealing originals (read path, not write)', async () => {
    const host = createMockSystemOpenHost();
    const tool = createRevealInFolderTool(createMockRevealInFolderAdapter(host));
    const result = await createToolExecutor().execute(tool, { path: ORIGINAL_PDF, caseRoot: ROOT });
    expect(result.verified).toBe(true);
    expect(host.log.reveals).toEqual([ORIGINAL_PDF]);
  });

  it('denies out-of-case paths with adapter_error — never silent', async () => {
    const host = createMockSystemOpenHost();
    const tool = createRevealInFolderTool(createMockRevealInFolderAdapter(host));
    const result = await createToolExecutor().execute(tool, {
      path: '/etc/passwd',
      caseRoot: ROOT,
    });

    expect(result.verified).toBe(false);
    if (!result.verified) {
      expect(result.reason).toBe('adapter_error');
      expect(result.message).toContain('不在本案文件夹内');
      expect(result.message).not.toMatch(/path|whitelist|errno/i);
    }
    expect(host.log.reveals).toEqual([]);
  });

  it('rejects invalid input at the contract boundary', async () => {
    const tool = createRevealInFolderTool(createMockRevealInFolderAdapter());
    await expect(createToolExecutor().execute(tool, { path: '', caseRoot: ROOT })).rejects.toBeInstanceOf(
      ToolInputValidationError,
    );
  });

  it('does not cache side-effect results', async () => {
    const host = createMockSystemOpenHost();
    const tool = createRevealInFolderTool(createMockRevealInFolderAdapter(host));
    const executor = createToolExecutor();
    await executor.execute(tool, { path: OUTPUT_DOCX, caseRoot: ROOT });
    await executor.execute(tool, { path: OUTPUT_DOCX, caseRoot: ROOT });
    expect(host.log.reveals).toHaveLength(2);
  });
});

describe('open-file', () => {
  it('opens a case file and returns filename feedback with fullwidth brackets', async () => {
    const host = createMockSystemOpenHost();
    const tool = createOpenFileTool(createMockOpenFileAdapter(host));
    const result = await createToolExecutor().execute(tool, { path: OUTPUT_DOCX, caseRoot: ROOT });

    expect(result.verified).toBe(true);
    if (result.verified) {
      expect(result.data.fileName).toBe('合同审查报告.docx');
      expect(result.data.feedbackMessage).toBe(openFileFeedback('合同审查报告.docx'));
      expect(result.data.feedbackMessage).toBe('已为您打开〔合同审查报告.docx〕');
    }
    expect(host.log.opens).toEqual([OUTPUT_DOCX]);
  });

  it('allows opening originals for viewing only', async () => {
    const host = createMockSystemOpenHost();
    const tool = createOpenFileTool(createMockOpenFileAdapter(host));
    const result = await createToolExecutor().execute(tool, { path: ORIGINAL_PDF, caseRoot: ROOT });
    expect(result.verified).toBe(true);
    expect(host.log.opens).toEqual([ORIGINAL_PDF]);
  });

  it('denies parent escape without invoking host', async () => {
    const host = createMockSystemOpenHost();
    const tool = createOpenFileTool(createMockOpenFileAdapter(host));
    const sneaky = `${ROOT}/../outside.docx`;
    const result = await createToolExecutor().execute(tool, { path: sneaky, caseRoot: ROOT });
    expect(result.verified).toBe(false);
    if (!result.verified) {
      expect(result.reason).toBe('adapter_error');
      expect(result.message).toContain('不在本案文件夹内');
    }
    expect(host.log.opens).toEqual([]);
  });
});

describe('system-open structural guarantees', () => {
  it('tool ids are stable for scene tool slots', () => {
    const reveal = createRevealInFolderTool(createMockRevealInFolderAdapter());
    const open = createOpenFileTool(createMockOpenFileAdapter());
    expect(reveal.id).toBe('reveal-in-folder');
    expect(open.id).toBe('open-file');
  });

  it('never exposes a shell/exec surface on the host interface', () => {
    const host = createMockSystemOpenHost();
    expect(Object.keys(host).sort()).toEqual(['log', 'openFile', 'revealInFolder']);
    expect('exec' in host).toBe(false);
    expect('runCommand' in host).toBe(false);
  });

  it('work-draft zone helper paths stay under case root', () => {
    const draft = workDraftPath(ROOT, '庭前.md');
    expect(draft.startsWith(ROOT)).toBe(true);
    expect(draft).toContain(CASE_ZONE_DIRS.workDraft);
  });
});
