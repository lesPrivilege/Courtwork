import {
  BriefcaseBusiness,
  Camera,
  Cog,
  Columns2,
  File,
  FileText,
  FolderOpen,
  Image,
  MessageSquareText,
  Mic,
  Minus,
  PanelsTopLeft,
  Paperclip,
  Plus,
  RotateCcw,
  RotateCw,
  Rows2,
  Scan,
  SendHorizontal,
  X,
  type LucideIcon,
} from 'lucide-react';

const standardIcons = {
  'briefcase-business': BriefcaseBusiness,
  'message-square-text': MessageSquareText,
  'panels-top-left': PanelsTopLeft,
  'rows-two': Rows2,
  'columns-two': Columns2,
  'rotate-counter-clockwise': RotateCcw,
  // 过渡别名：并发案件工作流提交后删除。
  case: BriefcaseBusiness,
  conversation: MessageSquareText,
  panels: PanelsTopLeft,
  settings: Cog,
  compare: Rows2,
  stack: Rows2,
  columns: Columns2,
  reset: RotateCcw,
  cog: Cog,
  plus: Plus,
  minus: Minus,
  'scan-frame': Scan,
  paperclip: Paperclip,
  'folder-open': FolderOpen,
  'send-horizontal': SendHorizontal,
  camera: Camera,
  mic: Mic,
  x: X,
  'file-text': FileText,
  file: File,
  image: Image,
  'rotate-clockwise': RotateCw,
} satisfies Record<string, LucideIcon>;

type StandardIconName = keyof typeof standardIcons;
type IconName = StandardIconName;

export function Icon({ name }: { name: IconName }) {
  const Component = standardIcons[name];
  return <Component className="line-icon" aria-hidden="true" />;
}

export type { IconName };
