// TOOL-READ-1 裁定三：首批两枚可请求只读工具（领域无关，数据源以适配器注入）。
import { describe, expect, it } from 'vitest';
import { createToolExecutor } from './contract.js';
import {
  createDossierListTool,
  createMaterialReadTool,
  createReadySourceAdapters,
  DOSSIER_LIST_TOOL_ID,
  MATERIAL_READ_TOOL_ID,
  type ReadySourcePort,
} from './dossier-read.js';

function port(overrides: Partial<ReadySourcePort> = {}): ReadySourcePort {
  return {
    async list() {
      return [
        { materialId: 'm-1', fileName: '合同.docx', mediaType: 'docx' },
        { materialId: 'm-2', fileName: '查询单.md', mediaType: 'md' },
      ];
    },
    async read(materialId) {
      if (materialId !== 'm-1') return { status: 'blocked', reason: 'not_found' };
      return {
        status: 'ready',
        material: { materialId: 'm-1', fileName: '合同.docx', mediaType: 'docx', readingMarkdown: '# 合同\n第一条 ……' },
      };
    },
    ...overrides,
  };
}

const executor = createToolExecutor();

describe('dossier-list（就绪材料清单）', () => {
  it('只报系统投影字段：id / 文件名 / 媒体类型，不带正文与宿主路径', async () => {
    const tool = createDossierListTool(createReadySourceAdapters(port()).dossierList);
    const envelope = await executor.execute(tool, {});
    expect(envelope.verified).toBe(true);
    if (!envelope.verified) return;
    expect(envelope.data).toEqual({
      materials: [
        { materialId: 'm-1', fileName: '合同.docx', mediaType: 'docx' },
        { materialId: 'm-2', fileName: '查询单.md', mediaType: 'md' },
      ],
    });
    expect(JSON.stringify(envelope.data)).not.toContain('readingMarkdown');
  });

  it('工具 id 与副作用面：领域无关命名，pure_read 语义（无 effect 入口）', () => {
    const tool = createDossierListTool(createReadySourceAdapters(port()).dossierList);
    expect(tool.id).toBe(DOSSIER_LIST_TOOL_ID);
    expect(tool.cacheTtlMs).toBeUndefined();
  });

  it('空清单如实返回空数组，不伪造条目', async () => {
    const tool = createDossierListTool(createReadySourceAdapters(port({ async list() { return []; } })).dossierList);
    const envelope = await executor.execute(tool, {});
    expect(envelope.verified).toBe(true);
    if (envelope.verified) expect(envelope.data).toEqual({ materials: [] });
  });
});

describe('material-read（读某就绪材料正文）', () => {
  it('就绪材料原样透出阅读视图正文', async () => {
    const tool = createMaterialReadTool(createReadySourceAdapters(port()).materialRead);
    const envelope = await executor.execute(tool, { materialId: 'm-1' });
    expect(envelope.verified).toBe(true);
    if (envelope.verified) {
      expect(envelope.data.readingMarkdown).toContain('第一条');
      expect(envelope.data.materialId).toBe('m-1');
    }
  });

  it('blocked 态原样透出为工具失败，不降级成空正文', async () => {
    const tool = createMaterialReadTool(createReadySourceAdapters(port()).materialRead);
    const envelope = await executor.execute(tool, { materialId: 'm-404' });
    expect(envelope.verified).toBe(false);
    if (!envelope.verified) {
      // 覆盖缺口不等于否定性结论：拒因逐字进 message，消费方看得见「为什么读不到」。
      expect(envelope.message).toContain('not_found');
      expect(envelope.reason).toBe('out_of_coverage');
    }
    expect('data' in envelope).toBe(false);
  });

  it('每一种 blocked 拒因都逐字透出，不归并成一句笼统失败', async () => {
    for (const reason of ['content_drift', 'reading_drift', 'revoked', 'needs_ocr', 'rejected', 'out_of_scope']) {
      const tool = createMaterialReadTool(
        createReadySourceAdapters(port({ async read() { return { status: 'blocked', reason }; } })).materialRead,
      );
      const envelope = await executor.execute(tool, { materialId: 'm-1' });
      expect(envelope.verified).toBe(false);
      if (!envelope.verified) expect(envelope.message).toContain(reason);
    }
  });

  it('缺 materialId 的入参在契约层被拒（模型给错入参不进适配器）', async () => {
    let touched = false;
    const tool = createMaterialReadTool(
      createReadySourceAdapters(port({ async read() { touched = true; return { status: 'blocked', reason: 'x' }; } })).materialRead,
    );
    await expect(executor.execute(tool, {})).rejects.toThrow();
    expect(touched).toBe(false);
  });

  it('工具 id 与不缓存约定：原件只读复验链每次重跑，绝不吃缓存', () => {
    const tool = createMaterialReadTool(createReadySourceAdapters(port()).materialRead);
    expect(tool.id).toBe(MATERIAL_READ_TOOL_ID);
    expect(tool.cacheTtlMs).toBeUndefined();
  });
});
