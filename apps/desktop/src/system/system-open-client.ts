import { createToolExecutor, type ToolEnvelope } from '@courtwork/tools/contract';
import {
  createCaseScopedOpenFileAdapter,
  createCaseScopedRevealAdapter,
  createMockSystemOpenHost,
  createOpenFileTool,
  createRevealInFolderTool,
  type MockSystemOpenLog,
  type SystemOpenHost,
  type RevealInFolderData,
  type OpenFileData,
} from '@courtwork/tools/system-open';

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

const browserLog: MockSystemOpenLog = { reveals: [], opens: [] };
const browserHost = createMockSystemOpenHost(browserLog);

/**
 * Tauri 宿主：只调 opener 的 reveal/open，零 shell。
 * 插件未装或调用失败时抛错，由执行器降级为 adapter_error。
 */
async function createTauriHost(): Promise<SystemOpenHost> {
  const opener = await import('@tauri-apps/plugin-opener');
  return {
    async revealInFolder(absolutePath) {
      await opener.revealItemInDir(absolutePath);
    },
    async openFile(absolutePath) {
      await opener.openPath(absolutePath);
    },
  };
}

let tauriHostPromise: Promise<SystemOpenHost> | undefined;

async function resolveHost(): Promise<{ host: SystemOpenHost; sourceId: string }> {
  if (!isTauriRuntime()) {
    return { host: browserHost, sourceId: 'mock' };
  }
  tauriHostPromise ??= createTauriHost();
  return { host: await tauriHostPromise, sourceId: 'tauri-opener' };
}

const executor = createToolExecutor();

export type SystemOpenFeedback =
  | { ok: true; message: string }
  | { ok: false; message: string };

function toFeedback(
  envelope: ToolEnvelope<RevealInFolderData> | ToolEnvelope<OpenFileData>,
  successMessage: (data: RevealInFolderData | OpenFileData) => string,
): SystemOpenFeedback {
  if (envelope.verified) {
    return { ok: true, message: successMessage(envelope.data) };
  }
  return { ok: false, message: envelope.message };
}

/**
 * UI 与 agent 共用的系统打开客户端。
 * 路径白名单在 tools 契约层强制；本客户端不另开旁路。
 */
export const systemOpenClient = {
  /** 测试用：浏览器 mock 调用记录 */
  getBrowserLog(): MockSystemOpenLog {
    return browserLog;
  },

  resetBrowserLog() {
    browserLog.reveals.length = 0;
    browserLog.opens.length = 0;
  },

  async revealInFolder(path: string, caseRoot: string): Promise<SystemOpenFeedback> {
    const { host, sourceId } = await resolveHost();
    const tool = createRevealInFolderTool(createCaseScopedRevealAdapter(host, sourceId));
    const envelope = await executor.execute(tool, { path, caseRoot });
    return toFeedback(envelope, (data) => (data as RevealInFolderData).feedbackMessage);
  },

  async openFile(path: string, caseRoot: string): Promise<SystemOpenFeedback> {
    const { host, sourceId } = await resolveHost();
    const tool = createOpenFileTool(createCaseScopedOpenFileAdapter(host, sourceId));
    const envelope = await executor.execute(tool, { path, caseRoot });
    return toFeedback(envelope, (data) => (data as OpenFileData).feedbackMessage);
  },
};
