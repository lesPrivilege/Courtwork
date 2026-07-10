import { DEMO_ORIGINALS } from './demo-case-layout';
import { systemOpenClient } from './system-open-client';

interface OriginalsZoneProps {
  caseRoot: string;
  onFeedback: (message: string, ok: boolean) => void;
}

/**
 * 卷宗原件区：只读列表，无编辑入口（docs/23 原件只读红线）。
 * 仅允许 reveal / open（查看），不提供 contentEditable 或保存动作。
 */
export function OriginalsZone({ caseRoot, onFeedback }: OriginalsZoneProps) {
  return (
    <div className="originals-zone" data-testid="originals-zone" data-readonly="true">
      <p className="rail-label">卷宗原件</p>
      <ul className="originals-list" aria-label="卷宗原件（只读）">
        {DEMO_ORIGINALS.map((item) => (
          <li key={item.path} data-testid="original-item" data-readonly="true">
            <div className="original-meta">
              <span className="truncate" title={item.fileName}>{item.fileName}</span>
              <span className="original-hash mono truncate" title={`原始文件名 ${item.originalFileName} · 哈希 ${item.contentHash}`}>
                原名 {item.originalFileName}
              </span>
            </div>
            <span className="original-badge" title="原件不可编辑">只读</span>
            <button
              type="button"
              className="quiet-button original-open"
              data-testid="original-open"
              title="打开原件（只读）"
              onClick={() => {
                void systemOpenClient.openFile(item.path, caseRoot).then((feedback) => {
                  onFeedback(feedback.message, feedback.ok);
                });
              }}
            >
              打开
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
