/**
 * 「引用必解析」的唯一错误族：场景（声明期 `toolIds` 或可请求 `requestableToolIds`）点名了
 * 未在工具注册表中登记的工具。
 *
 * 独立成文件只为让 `executor.ts` 与 `tool-request.ts` 共用同一个类而不形成模块环——
 * 不是新增概念：两条引用路径共守同一条律，不造第二个同名错误族。
 */
export class UnknownToolError extends Error {
  constructor(scenarioId: string, toolId: string) {
    super(`场景 ${scenarioId} 引用了未在工具注册表中登记的工具 "${toolId}"`);
    this.name = 'UnknownToolError';
  }
}
