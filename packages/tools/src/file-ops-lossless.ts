import * as z from 'zod';
import { assertRevealOrOpenAllowed, basenamePath } from './case-path.js';
import { defineTool, type ToolAdapter, type ToolDefinition } from './contract.js';
import type { FileOpsHost } from './file-ops-host.js';

/**
 * 无损级动词（docs/decisions/ADR-004-documents-and-files.md）：copy / mkdir —— 加法操作，可直执。
 * 路径白名单复用 F-3 case-path；目标已存在 = 拒绝（无覆盖）。
 */

export const CopyFileInputSchema = z.object({
  sourcePath: z.string().min(1),
  targetPath: z.string().min(1),
  caseRoot: z.string().min(1),
});
export type CopyFileInput = z.infer<typeof CopyFileInputSchema>;

export const CopyFileDataSchema = z.object({
  sourcePath: z.string().min(1),
  targetPath: z.string().min(1),
  contentHash: z.string().min(1),
  feedbackMessage: z.string().min(1),
});
export type CopyFileData = z.infer<typeof CopyFileDataSchema>;

export const MkdirInputSchema = z.object({
  path: z.string().min(1),
  caseRoot: z.string().min(1),
});
export type MkdirInput = z.infer<typeof MkdirInputSchema>;

export const MkdirDataSchema = z.object({
  path: z.string().min(1),
  feedbackMessage: z.string().min(1),
});
export type MkdirData = z.infer<typeof MkdirDataSchema>;

export type CopyFileAdapter = ToolAdapter<CopyFileInput, CopyFileData>;
export type MkdirAdapter = ToolAdapter<MkdirInput, MkdirData>;

const COPY_TOOL_ID = 'copy-file';
const MKDIR_TOOL_ID = 'mkdir';
const TIMEOUT_MS = 8_000;

function deny(toolId: string, caseRoot: string, path: string): string {
  const result = assertRevealOrOpenAllowed(caseRoot, path);
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.absolute;
}

export function createCopyFileTool(adapter: CopyFileAdapter): ToolDefinition<CopyFileInput, CopyFileData> {
  return defineTool(
    { id: COPY_TOOL_ID, inputSchema: CopyFileInputSchema, dataSchema: CopyFileDataSchema, timeoutMs: TIMEOUT_MS },
    adapter,
  );
}

export function createMkdirTool(adapter: MkdirAdapter): ToolDefinition<MkdirInput, MkdirData> {
  return defineTool(
    { id: MKDIR_TOOL_ID, inputSchema: MkdirInputSchema, dataSchema: MkdirDataSchema, timeoutMs: TIMEOUT_MS },
    adapter,
  );
}

export function createCaseScopedCopyAdapter(host: FileOpsHost, sourceId: string): CopyFileAdapter {
  return {
    sourceId,
    async run(input) {
      const source = deny(COPY_TOOL_ID, input.caseRoot, input.sourcePath);
      const target = deny(COPY_TOOL_ID, input.caseRoot, input.targetPath);
      if (!(await host.exists(source))) throw new Error('源文件不存在，无法复制。');
      if (await host.isDirectory(source)) throw new Error('当前仅支持复制文件，不支持复制文件夹。');
      if (await host.exists(target)) throw new Error('目标已存在，已拒绝覆盖。');
      const data = await host.readFile(source);
      await host.writeFile(target, data);
      const contentHash = await host.hash(target);
      return {
        sourcePath: source,
        targetPath: target,
        contentHash,
        feedbackMessage: `已复制〔${basenamePath(target)}〕`,
      };
    },
  };
}

export function createCaseScopedMkdirAdapter(host: FileOpsHost, sourceId: string): MkdirAdapter {
  return {
    sourceId,
    async run(input) {
      const path = deny(MKDIR_TOOL_ID, input.caseRoot, input.path);
      if (await host.exists(path)) throw new Error('目标已存在，已拒绝覆盖。');
      await host.mkdir(path);
      return {
        path,
        feedbackMessage: `已新建文件夹〔${basenamePath(path)}〕`,
      };
    },
  };
}

export function createMockCopyFileAdapter(host: FileOpsHost): CopyFileAdapter {
  return createCaseScopedCopyAdapter(host, 'mock');
}

export function createMockMkdirAdapter(host: FileOpsHost): MkdirAdapter {
  return createCaseScopedMkdirAdapter(host, 'mock');
}
