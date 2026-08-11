import * as z from 'zod';
import { defineTool, ToolOutOfCoverageError, type ToolAdapter, type ToolDefinition } from './contract.js';

/**
 * 首批两枚可请求只读工具（TOOL-READ-1 裁定三）：`dossier-list` 列该容器的就绪材料清单，
 * `material-read` 读某件就绪材料的正文。两枚都是 `pure_read`。
 *
 * **领域无关**：本文件只定义契约与端口形状，不认识任何垂类语义；
 * 真实数据源（宿主 MaterialStore 的就绪判定与复验链）在装配点以适配器注入。容器身份
 * （哪个 matter）由装配点闭合进适配器——**模型无从点名另一个容器**，这条隔离不靠自觉。
 */

export const DOSSIER_LIST_TOOL_ID = 'dossier-list';
export const MATERIAL_READ_TOOL_ID = 'material-read';

const DOSSIER_LIST_TIMEOUT_MS = 3_000;
const MATERIAL_READ_TIMEOUT_MS = 8_000;

/** 系统投影字段（只报这三样）：清单里没有正文、没有宿主路径、没有内部哈希。 */
export const ReadyMaterialSummarySchema = z
  .object({
    materialId: z.string().min(1),
    fileName: z.string().min(1),
    mediaType: z.string().min(1),
  })
  .strict();
export type ReadyMaterialSummary = z.infer<typeof ReadyMaterialSummarySchema>;

export const DossierListInputSchema = z.object({}).strict();
export type DossierListInput = z.infer<typeof DossierListInputSchema>;

export const DossierListDataSchema = z.object({ materials: z.array(ReadyMaterialSummarySchema) }).strict();
export type DossierListData = z.infer<typeof DossierListDataSchema>;

export const MaterialReadInputSchema = z.object({ materialId: z.string().min(1) }).strict();
export type MaterialReadInput = z.infer<typeof MaterialReadInputSchema>;

export const MaterialReadDataSchema = ReadyMaterialSummarySchema.extend({
  /** 阅读视图 md 全文（模型阅读的「母语」，与语料段同一份产物）。 */
  readingMarkdown: z.string(),
}).strict();
export type MaterialReadData = z.infer<typeof MaterialReadDataSchema>;

/**
 * 就绪材料数据源端口：形状对齐宿主 `MaterialStore.resolveForProvider` 的 ready/blocked 判别联合。
 *
 * `reason` 取不透明字符串——拒因词表归宿主所有（`content_drift`/`revoked`/`needs_ocr`…），
 * tools 包只负责逐字转述，不复制第二份词表、也不解读它。
 */
export interface ReadySourcePort {
  list(): Promise<ReadyMaterialSummary[]>;
  read(materialId: string): Promise<
    | { status: 'ready'; material: MaterialReadData }
    | { status: 'blocked'; reason: string }
  >;
}

export type DossierListAdapter = ToolAdapter<DossierListInput, DossierListData>;
export type MaterialReadAdapter = ToolAdapter<MaterialReadInput, MaterialReadData>;

/**
 * 由一个就绪数据源端口派生两枚适配器。`sourceId` 固定为 `ready-source`——结果自我标识来源，
 * 与 mock/demo-fixture/真实适配器的既有身份律一致。
 */
export function createReadySourceAdapters(source: ReadySourcePort, sourceId = 'ready-source'): {
  dossierList: DossierListAdapter;
  materialRead: MaterialReadAdapter;
} {
  return {
    dossierList: {
      sourceId,
      async run() {
        return { materials: await source.list() };
      },
    },
    materialRead: {
      sourceId,
      async run(input) {
        const outcome = await source.read(input.materialId);
        if (outcome.status === 'ready') return outcome.material;
        // blocked 原样透出为工具失败，不降级：语义上「当前读不到」≠「这份材料没有内容」，
        // 拒因逐字进 message，消费方（含模型）看得见到底卡在哪一环。
        throw new ToolOutOfCoverageError(
          MATERIAL_READ_TOOL_ID,
          `材料 "${input.materialId}" 当前不可读取：${outcome.reason}。这是可用性判定，不构成对其内容的任何结论。`,
        );
      },
    },
  };
}

/** 不声明 cacheTtlMs：原件只读复验链每次重跑——缓存会让漂移/吊销在有效期内被吃掉。 */
export function createDossierListTool(adapter: DossierListAdapter): ToolDefinition<DossierListInput, DossierListData> {
  return defineTool(
    {
      id: DOSSIER_LIST_TOOL_ID,
      inputSchema: DossierListInputSchema,
      dataSchema: DossierListDataSchema,
      timeoutMs: DOSSIER_LIST_TIMEOUT_MS,
    },
    adapter,
  );
}

export function createMaterialReadTool(adapter: MaterialReadAdapter): ToolDefinition<MaterialReadInput, MaterialReadData> {
  return defineTool(
    {
      id: MATERIAL_READ_TOOL_ID,
      inputSchema: MaterialReadInputSchema,
      dataSchema: MaterialReadDataSchema,
      timeoutMs: MATERIAL_READ_TIMEOUT_MS,
    },
    adapter,
  );
}
