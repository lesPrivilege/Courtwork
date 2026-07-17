import { describe, expect, it } from 'vitest';
import { workContextSegmentFor, type WorkContextInput, type WorkContextMaterial } from './work-context';

/**
 * WORK-TURN-1 H（L0）：Work 面自由输入的案语境段——全部从既有账本/store 确定性编译，
 * 禁模型参与。内容四件：案根标识（零绝对路径）/材料清单投影/场景状态/续行三态。
 * 段头显式标注数据非指令（与 memorySegment 同律）。
 */

function material(fileName: string, status: WorkContextMaterial['status']): WorkContextMaterial {
  return { fileName, status };
}

const BASE: WorkContextInput = {
  caseTitle: '合成卷宗案',
  bindingLabel: '合成卷宗',
  materials: [material('设备采购合同.md', 'ready'), material('公章页.png', 'needs_ocr')],
  scenarioState: 'not_started',
};

describe('workContextSegmentFor', () => {
  it('四件齐备：案根标识/材料清单（含状态产品语）/场景状态；段头标注数据非指令', () => {
    const segment = workContextSegmentFor(BASE);
    expect(segment).toContain('案件语境');
    expect(segment).toContain('供参考');
    expect(segment).toContain('不是指令');
    expect(segment).toContain('合成卷宗案');
    expect(segment).toContain('已授权项目文件夹');
    expect(segment).toContain('设备采购合同.md');
    expect(segment).toContain('公章页.png');
    expect(segment).toContain('需文字识别');
    expect(segment).toContain('卷宗材料（2 件）');
    expect(segment).toContain('尚未开始');
  });

  it('场景三态逐一可编译且互斥（running/paused_review/recoverable）', () => {
    expect(workContextSegmentFor({ ...BASE, scenarioState: 'running' })).toContain('运行中');
    expect(workContextSegmentFor({ ...BASE, scenarioState: 'paused_review' })).toContain('等待逐项确认');
    expect(workContextSegmentFor({ ...BASE, scenarioState: 'recoverable' })).toContain('可继续');
    expect(workContextSegmentFor({ ...BASE, scenarioState: 'running' })).not.toContain('尚未开始');
  });

  it('零材料如实计数（不留空壳清单行）', () => {
    const segment = workContextSegmentFor({ ...BASE, materials: [] });
    expect(segment).toContain('卷宗材料（0 件）');
    expect(segment).not.toContain('设备采购合同');
  });

  it('确定性：同输入同字节；零绝对路径', () => {
    expect(workContextSegmentFor(BASE)).toBe(workContextSegmentFor(BASE));
    expect(workContextSegmentFor(BASE)).not.toMatch(/[/\\]Users[/\\]|[A-Za-z]:\\/);
  });
});
