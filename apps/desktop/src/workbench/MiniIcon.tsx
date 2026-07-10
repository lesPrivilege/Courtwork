/**
 * F-2 专用小图标：archive/copy/check/focus。独立于 workbench/Icon.tsx，
 * 因该文件当前由并行的图标体系工单实时重写（lucide-react + 生成式自定义图标），
 * 依赖其在途状态会造成不必要的耦合与冲突面——这四个图形自成一体，体量小，
 * 直接内联更稳妥。数值与线宽延续既有线框图标惯例（1.5px stroke，无 fill）。
 */

export function ArchiveGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="4" width="17" height="4" rx="1" />
      <path d="M5 8v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
      <path d="M10 12.5h4" />
    </svg>
  );
}

export function FocusGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4" />
    </svg>
  );
}

export function CopyGlyph({ copied }: { copied: boolean }) {
  if (copied) {
    return (
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12.5l4.5 4.5L19 7" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="8.5" y="8.5" width="12" height="12" rx="1.5" />
      <path d="M15.5 8.5V5.5a1 1 0 0 0-1-1H4.5a1 1 0 0 0-1 1V16a1 1 0 0 0 1 1h3" />
    </svg>
  );
}
