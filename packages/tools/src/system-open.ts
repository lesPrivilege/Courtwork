import * as z from 'zod';
import { assertRevealOrOpenAllowed, basenamePath } from './case-path.js';
import {
  defineTool,
  type ToolAdapter,
  type ToolDefinition,
} from './contract.js';

/**
 * 系统打开宿主：由装配点注入（desktop 接 Tauri opener；测试注入 mock）。
 * 工具层永不执行任意 shell 命令——只调用这两个受限动词。
 */
export interface SystemOpenHost {
  revealInFolder(absolutePath: string): Promise<void>;
  openFile(absolutePath: string): Promise<void>;
}

export const RevealInFolderInputSchema = z.object({
  /** 要在访达中显示的文件或文件夹绝对路径 */
  path: z.string().min(1),
  /** 当前案件文件夹根路径（白名单边界） */
  caseRoot: z.string().min(1),
});
export type RevealInFolderInput = z.infer<typeof RevealInFolderInputSchema>;

export const RevealInFolderDataSchema = z.object({
  revealedPath: z.string().min(1),
  /** 零技术概念话术；macOS 称「访达」 */
  feedbackMessage: z.literal('已在访达中显示'),
});
export type RevealInFolderData = z.infer<typeof RevealInFolderDataSchema>;

export const OpenFileInputSchema = z.object({
  path: z.string().min(1),
  caseRoot: z.string().min(1),
});
export type OpenFileInput = z.infer<typeof OpenFileInputSchema>;

export const OpenFileDataSchema = z.object({
  openedPath: z.string().min(1),
  fileName: z.string().min(1),
  /** 例：已为您打开〔合同审查报告.docx〕 */
  feedbackMessage: z.string().min(1),
});
export type OpenFileData = z.infer<typeof OpenFileDataSchema>;

export type RevealInFolderAdapter = ToolAdapter<RevealInFolderInput, RevealInFolderData>;
export type OpenFileAdapter = ToolAdapter<OpenFileInput, OpenFileData>;

const REVEAL_TOOL_ID = 'reveal-in-folder';
const OPEN_FILE_TOOL_ID = 'open-file';
/** 系统动词应即时返回；过长通常意味着宿主异常。 */
const SYSTEM_OPEN_TIMEOUT_MS = 5_000;

export const REVEAL_FEEDBACK = '已在访达中显示' as const;

export function openFileFeedback(fileName: string): string {
  return `已为您打开〔${fileName}〕`;
}

export function createRevealInFolderTool(
  adapter: RevealInFolderAdapter,
): ToolDefinition<RevealInFolderInput, RevealInFolderData> {
  return defineTool(
    {
      id: REVEAL_TOOL_ID,
      inputSchema: RevealInFolderInputSchema,
      dataSchema: RevealInFolderDataSchema,
      timeoutMs: SYSTEM_OPEN_TIMEOUT_MS,
      // 副作用动词：绝不缓存
    },
    adapter,
  );
}

export function createOpenFileTool(
  adapter: OpenFileAdapter,
): ToolDefinition<OpenFileInput, OpenFileData> {
  return defineTool(
    {
      id: OPEN_FILE_TOOL_ID,
      inputSchema: OpenFileInputSchema,
      dataSchema: OpenFileDataSchema,
      timeoutMs: SYSTEM_OPEN_TIMEOUT_MS,
    },
    adapter,
  );
}

/**
 * 路径越界/拒绝时抛出的错误。执行器降级为 adapter_error（不新增 reason 枚举，
 * 避免契约拍板；消息面向用户，零技术黑话）。
 */
export class ToolPathDeniedError extends Error {
  constructor(
    public readonly toolId: string,
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'ToolPathDeniedError';
  }
}

function denyOrThrow(
  toolId: string,
  caseRoot: string,
  targetPath: string,
): { absolute: string } {
  const result = assertRevealOrOpenAllowed(caseRoot, targetPath);
  if (!result.ok) {
    throw new ToolPathDeniedError(toolId, result.message, result.code);
  }
  return { absolute: result.absolute };
}

/**
 * 案件文件夹白名单适配器：先校验路径，再调宿主。
 * sourceId 由装配点声明（'mock' / 'tauri-opener'）。
 */
export function createCaseScopedRevealAdapter(
  host: SystemOpenHost,
  sourceId: string,
): RevealInFolderAdapter {
  return {
    sourceId,
    async run(input) {
      const { absolute } = denyOrThrow(REVEAL_TOOL_ID, input.caseRoot, input.path);
      await host.revealInFolder(absolute);
      return {
        revealedPath: absolute,
        feedbackMessage: REVEAL_FEEDBACK,
      };
    },
  };
}

export function createCaseScopedOpenFileAdapter(
  host: SystemOpenHost,
  sourceId: string,
): OpenFileAdapter {
  return {
    sourceId,
    async run(input) {
      const { absolute } = denyOrThrow(OPEN_FILE_TOOL_ID, input.caseRoot, input.path);
      await host.openFile(absolute);
      const fileName = basenamePath(absolute);
      return {
        openedPath: absolute,
        fileName,
        feedbackMessage: openFileFeedback(fileName),
      };
    },
  };
}

export interface MockSystemOpenLog {
  reveals: string[];
  opens: string[];
}

/** 测试/浏览器演示用宿主：只记调用，不碰真实访达。 */
export function createMockSystemOpenHost(log?: MockSystemOpenLog): SystemOpenHost & { log: MockSystemOpenLog } {
  const records = log ?? { reveals: [], opens: [] };
  return {
    log: records,
    async revealInFolder(absolutePath) {
      records.reveals.push(absolutePath);
    },
    async openFile(absolutePath) {
      records.opens.push(absolutePath);
    },
  };
}

export function createMockRevealInFolderAdapter(
  host: SystemOpenHost = createMockSystemOpenHost(),
): RevealInFolderAdapter {
  return createCaseScopedRevealAdapter(host, 'mock');
}

export function createMockOpenFileAdapter(
  host: SystemOpenHost = createMockSystemOpenHost(),
): OpenFileAdapter {
  return createCaseScopedOpenFileAdapter(host, 'mock');
}
