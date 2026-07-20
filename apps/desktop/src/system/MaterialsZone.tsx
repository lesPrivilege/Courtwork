import type { MaterialStatus, StoredMaterial } from '../material/material-ref';

/**
 * 真实案卷宗原件区（MATERIAL-INGRESS-1）：只读列表，无编辑入口
 * （docs/decisions/ADR-004-documents-and-files.md 原件只读红线）。
 * 每件材料显示状态徽标与「核验」——核验即 provider 前重验（再读原件、比对哈希），
 * 漂移/删除/需 OCR 显式呈现。原件永远只读、原地不动，此处不提供保存或编辑。
 */

const STATUS_COPY: Record<MaterialStatus, string> = {
  ready: '就绪',
  needs_ocr: '需文字识别',
  rejected: '不可用',
};

interface MaterialsZoneProps {
  materials: StoredMaterial[];
  onVerify: (materialId: string) => void;
  /** FILE-PREVIEW-1：在应用内打开只读阅读面。原件不动，读的是入库时派生并经重验的阅读视图。 */
  onRead: (materialId: string) => void;
}

export function MaterialsZone({ materials, onVerify, onRead }: MaterialsZoneProps) {
  return (
    <div className="originals-zone" data-testid="materials-zone" data-readonly="true">
      <p className="rail-label">卷宗原件 · 只读</p>
      <ul className="originals-list" aria-label="卷宗原件（只读）">
        {materials.map((material) => (
          <li
            key={material.materialId}
            data-testid="material-item"
            data-status={material.status}
            data-readonly="true"
          >
            <div className="original-meta">
              <span className="truncate" title={material.fileName}>{material.fileName}</span>
              <span
                className="original-hash mono truncate"
                title={`内容哈希 ${material.contentSha256}`}
              >
                {material.byteLength} 字节 · {STATUS_COPY[material.status]}
              </span>
            </div>
            <span className="original-badge" data-status={material.status} title="原件不可编辑">只读</span>
            <button
              type="button"
              className="quiet-button original-open"
              data-testid="material-reveal"
              data-state="unwired"
              disabled
              title="真实材料的访达显示即将开通"
            >
              在访达中显示
            </button>
            <button
              type="button"
              className="quiet-button original-open"
              data-testid="material-read"
              title="在应用内打开只读阅读面"
              onClick={() => onRead(material.materialId)}
            >
              阅读
            </button>
            <button
              type="button"
              className="quiet-button original-open"
              data-testid="material-verify"
              title="核验原件是否仍与入库时一致"
              onClick={() => onVerify(material.materialId)}
            >
              核验
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
