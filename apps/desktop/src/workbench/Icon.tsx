/**
 * 线框图标集：Lucide 通用隐喻路径，全局 stroke 1.35px（de-slop #3 + 工单裁决）。
 * 不引入 lucide-react 运行时依赖——路径内联，避免额外包与默认 stroke 覆盖。
 */
type IconName =
  | 'case'
  | 'conversation'
  | 'panels'
  | 'compare'
  | 'stack'
  | 'columns'
  | 'reset'
  | 'settings'
  | 'plus'
  | 'minus'
  | 'fit'
  | 'paperclip'
  | 'folderOpen'
  | 'send'
  | 'camera'
  | 'mic'
  | 'x'
  | 'fileText'
  | 'file'
  | 'image'
  | 'rotateCw';

const paths: Record<IconName, React.ReactNode> = {
  case: (
    <>
      <path d="M3.5 6.5h17v12h-17z" />
      <path d="M7 6.5V4.2h6l2 2.3" />
    </>
  ),
  conversation: (
    <>
      <path d="M4 5h16v11H9l-4 3v-3H4z" />
      <path d="M8 9h8M8 12h5" />
    </>
  ),
  panels: (
    <>
      <rect x="3.5" y="4" width="17" height="16" rx="1.5" />
      <path d="M3.5 9h17M9 9v11" />
    </>
  ),
  compare: (
    <>
      <rect x="3.5" y="4" width="17" height="16" rx="1.5" />
      <path d="M3.5 12h17" />
    </>
  ),
  stack: (
    <>
      <rect x="4" y="3.5" width="16" height="17" rx="1.5" />
      <path d="M4 12h16" />
    </>
  ),
  columns: (
    <>
      <rect x="4" y="3.5" width="16" height="17" rx="1.5" />
      <path d="M12 3.5v17" />
    </>
  ),
  reset: (
    <>
      <path d="M5.5 8.5A7 7 0 1 1 5 15" />
      <path d="M5.5 4.5v4h4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  fit: (
    <>
      <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" />
      <rect x="8" y="8" width="8" height="8" rx="1" />
    </>
  ),
  // Lucide paperclip
  paperclip: <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />,
  // Lucide folder-open
  folderOpen: (
    <>
      <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
    </>
  ),
  // Lucide send-horizontal
  send: (
    <>
      <path d="M3.714 3.048a.498.498 0 0 0-.683.627l2.843 7.627a2 2 0 0 1 0 1.396l-2.842 7.627a.498.498 0 0 0 .682.627l18-8.5a.5.5 0 0 0 0-.904z" />
      <path d="M6 12h16" />
    </>
  ),
  // Lucide camera
  camera: (
    <>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </>
  ),
  // Lucide mic
  mic: (
    <>
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </>
  ),
  x: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
  fileText: (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </>
  ),
  file: (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    </>
  ),
  image: (
    <>
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </>
  ),
  rotateCw: (
    <>
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </>
  ),
};

export function Icon({ name }: { name: IconName }) {
  return (
    <svg
      className="line-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

export type { IconName };
