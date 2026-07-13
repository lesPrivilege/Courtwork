import { useEffect, useRef, useState } from 'react';
import { filterCommands } from './fuzzy-match';

export interface PaletteCommand {
  id: string;
  section: string;
  label: string;
  disabled?: boolean;
  disabledReason?: string;
  onRun: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  commands: PaletteCommand[];
  onClose: () => void;
}

/**
 * ⌘K 最小命令面板：场景触发 + 案件切换 + 全局动作。
 * 模糊匹配复用 fuzzy-match；Esc 由外层 App 统一收口关闭。
 */
export function CommandPalette({ open, commands, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setHighlighted(0);
    // 下一帧聚焦，避免与打开动画抢焦点
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  if (!open) return null;

  const results = filterCommands(query, commands, (command) => command.label);

  const runAt = (index: number) => {
    const command = results[index];
    if (!command || command.disabled) return;
    command.onRun();
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlighted((index) => Math.min(index + 1, Math.max(results.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      runAt(highlighted);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  let lastSection = '';

  return (
    <div
      className="modal-backdrop palette-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        data-testid="command-palette"
      >
        <input
          ref={inputRef}
          autoFocus
          className="palette-input"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlighted(0);
          }}
          onKeyDown={onInputKeyDown}
          placeholder="Search scenes, cases, or actions…"
          aria-label="Search scenes, cases, or actions"
        />
        <div className="palette-results" role="listbox" aria-label="Command results">
          {results.length === 0 && <p className="palette-empty">No matches</p>}
          {results.map((command, index) => {
            const showHeader = command.section !== lastSection;
            lastSection = command.section;
            return (
              <div key={command.id}>
                {showHeader && <p className="palette-section">{command.section}</p>}
                <button
                  type="button"
                  role="option"
                  aria-selected={index === highlighted}
                  aria-disabled={command.disabled || undefined}
                  className={`palette-item ${index === highlighted ? 'active' : ''}`}
                  onMouseEnter={() => setHighlighted(index)}
                  onClick={() => runAt(index)}
                  title={command.disabled ? command.disabledReason : undefined}
                  data-disabled={command.disabled ? 'true' : 'false'}
                >
                  <span>{command.label}</span>
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
