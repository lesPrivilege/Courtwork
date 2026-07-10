import { useEffect, useRef, useState } from 'react';
import { CopyGlyph } from './MiniIcon';

interface CopyButtonProps {
  label: string;
  getText: () => string;
}

export function CopyButton({ label, getText }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(getText());
      setCopied(true);
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 剪贴板权限被拒——按钮保持可交互，不做破坏性兜底 */
    }
  };

  return (
    <button type="button" className="copy-button" onClick={() => void handleClick()} aria-label={label} title={label}>
      <CopyGlyph copied={copied} />
      <span>{copied ? '已复制' : '复制'}</span>
    </button>
  );
}
