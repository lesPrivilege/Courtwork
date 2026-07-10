import { Archive, Check, Copy, Focus } from 'lucide-react';

export function ArchiveGlyph() {
  return <Archive size={14} aria-hidden="true" />;
}

export function FocusGlyph() {
  return <Focus size={14} aria-hidden="true" />;
}

export function CopyGlyph({ copied }: { copied: boolean }) {
  const Component = copied ? Check : Copy;
  return <Component size={12} aria-hidden="true" />;
}
