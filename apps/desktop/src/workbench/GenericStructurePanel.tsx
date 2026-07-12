import { toStructureRows } from './generic-structure.js';

/**
 * 通用结构视图（渲染兜底③）：无 renderer 声明的 artifact 的只读保底面。
 * 可读不可美：dense 行 + 缩进层级 + 等宽值——不猜语义、不配色、不交互，
 * 但永不白屏。诚实降级三态在渲染层的形态。
 */
export function GenericStructurePanel({ entries }: { entries: Array<{ typeId: string; artifact: unknown }> }) {
  return (
    <div className="generic-structure" data-testid="generic-structure-panel">
      <p className="generic-structure-note" role="note">
        该产出暂无专用工作面，以下为结构化只读视图（字段名为包内标识符）。
      </p>
      {entries.map((entry) => (
        <section key={entry.typeId} className="generic-structure-entry" data-testid={`generic-entry-${entry.typeId}`}>
          <h3 className="generic-structure-title">{entry.typeId}</h3>
          <div className="dense-table">
            {toStructureRows(entry.artifact).map((row, index) => (
              <div className="dense-row generic-structure-row" key={index} style={{ paddingLeft: `${row.depth * 16}px` }}>
                <span className="generic-structure-label">{row.label}</span>
                {row.value !== undefined && <span className="generic-structure-value">{row.value}</span>}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
