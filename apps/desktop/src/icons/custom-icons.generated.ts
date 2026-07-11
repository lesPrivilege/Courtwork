/* 此文件由 scripts/generate-custom-icons.mjs 从规范化 SVG 生成；请勿手改。 */
import { createLucideIcon, type IconNode, type LucideIcon } from 'lucide-react';

export const customIconNames = [
  "anchor-link",
  "archive-lock",
  "bound-folder",
  "brand-mark",
  "cards-play",
  "check-lines",
  "corner-badge",
  "crossed-paths",
  "document-snowflake",
  "nodes-linked",
  "ring-check",
  "sheets-funnel",
  "spark-lines",
  "split-gate-check",
  "split-gate-dot",
  "split-gate-slash",
  "split-text-arrows",
  "stacked-checks",
  "stepped-arrow",
  "tabbed-sheet"
] as const;
export type CustomIconName = typeof customIconNames[number];

const customIconNodes = {
  "anchor-link": [
    [
      "path",
      {
        "d": "m9.5 14.5-2 2a3 3 0 0 0 4.2 4.2l2-2m.8-9.2 2-2a3 3 0 0 0-4.2-4.2l-2 2M8.5 15.5l7-7",
        "key": "anchor-link-1"
      }
    ],
    [
      "circle",
      {
        "cx": "12",
        "cy": "12",
        "r": "1.5",
        "key": "anchor-link-2"
      }
    ]
  ],
  "archive-lock": [
    [
      "rect",
      {
        "width": "16",
        "height": "13",
        "x": "4",
        "y": "7",
        "rx": "2",
        "key": "archive-lock-1"
      }
    ],
    [
      "path",
      {
        "d": "M3 4h18v3H3zm5 7h5",
        "key": "archive-lock-2"
      }
    ],
    [
      "rect",
      {
        "width": "6",
        "height": "4",
        "x": "11",
        "y": "14",
        "rx": "1",
        "key": "archive-lock-3"
      }
    ],
    [
      "path",
      {
        "d": "M12.5 14v-1a1.5 1.5 0 0 1 3 0v1",
        "key": "archive-lock-4"
      }
    ]
  ],
  "bound-folder": [
    [
      "path",
      {
        "d": "M3 5h6l2 2h10v13H3zm4 0v15M5 10h2m-2 5h2",
        "key": "bound-folder-1"
      }
    ]
  ],
  "brand-mark": [
    [
      "path",
      {
        "d": "M8 5v14",
        "key": "brand-mark-1"
      }
    ],
    [
      "path",
      {
        "d": "M11.5 8H18",
        "key": "brand-mark-2"
      }
    ],
    [
      "path",
      {
        "d": "M11.5 12H18",
        "key": "brand-mark-3"
      }
    ],
    [
      "path",
      {
        "d": "M11.5 16h4",
        "key": "brand-mark-4"
      }
    ]
  ],
  "cards-play": [
    [
      "path",
      {
        "d": "M4 17V5a2 2 0 0 1 2-2h10",
        "key": "cards-play-1"
      }
    ],
    [
      "rect",
      {
        "width": "15",
        "height": "16",
        "x": "6",
        "y": "5",
        "rx": "2",
        "key": "cards-play-2"
      }
    ],
    [
      "path",
      {
        "d": "m11 10 5 3-5 3z",
        "key": "cards-play-3"
      }
    ]
  ],
  "check-lines": [
    [
      "path",
      {
        "d": "m3 7 2 2 4-4M3 15l2 2 4-4m3-6h9m-9 8h9m-9 4h6",
        "key": "check-lines-1"
      }
    ]
  ],
  "corner-badge": [
    [
      "rect",
      {
        "width": "16",
        "height": "16",
        "x": "4",
        "y": "4",
        "rx": "2",
        "key": "corner-badge-1"
      }
    ],
    [
      "path",
      {
        "d": "M14 4v6h6",
        "key": "corner-badge-2"
      }
    ],
    [
      "circle",
      {
        "cx": "9",
        "cy": "15",
        "r": "2",
        "key": "corner-badge-3"
      }
    ]
  ],
  "crossed-paths": [
    [
      "path",
      {
        "d": "M3 6h4c6 0 4 12 10 12h4",
        "key": "crossed-paths-1"
      }
    ],
    [
      "path",
      {
        "d": "M3 18h4c6 0 4-12 10-12h4",
        "key": "crossed-paths-2"
      }
    ],
    [
      "path",
      {
        "d": "m19 4 2 2-2 2m0 8 2 2-2 2",
        "key": "crossed-paths-3"
      }
    ]
  ],
  "document-snowflake": [
    [
      "path",
      {
        "d": "M5 3h9l5 5v13H5z",
        "key": "document-snowflake-1"
      }
    ],
    [
      "path",
      {
        "d": "M14 3v5h5m-7 2v8m-3.5-6 7 4m0-4-7 4",
        "key": "document-snowflake-2"
      }
    ]
  ],
  "nodes-linked": [
    [
      "path",
      {
        "d": "M6.5 12 12 6l5.5 6-5.5 6z",
        "key": "nodes-linked-1"
      }
    ],
    [
      "circle",
      {
        "cx": "12",
        "cy": "5",
        "r": "2",
        "key": "nodes-linked-2"
      }
    ],
    [
      "circle",
      {
        "cx": "19",
        "cy": "12",
        "r": "2",
        "key": "nodes-linked-3"
      }
    ],
    [
      "circle",
      {
        "cx": "12",
        "cy": "19",
        "r": "2",
        "key": "nodes-linked-4"
      }
    ],
    [
      "circle",
      {
        "cx": "5",
        "cy": "12",
        "r": "2",
        "key": "nodes-linked-5"
      }
    ]
  ],
  "ring-check": [
    [
      "circle",
      {
        "cx": "12",
        "cy": "11",
        "r": "7",
        "key": "ring-check-1"
      }
    ],
    [
      "path",
      {
        "d": "m8.5 11 2.4 2.4 4.8-5M8 20h8",
        "key": "ring-check-2"
      }
    ]
  ],
  "sheets-funnel": [
    [
      "rect",
      {
        "width": "14",
        "height": "4",
        "x": "3",
        "y": "3",
        "rx": "1",
        "key": "sheets-funnel-1"
      }
    ],
    [
      "rect",
      {
        "width": "12",
        "height": "4",
        "x": "4",
        "y": "9",
        "rx": "1",
        "key": "sheets-funnel-2"
      }
    ],
    [
      "path",
      {
        "d": "M6 15h8l-3 3v3H9v-3z",
        "key": "sheets-funnel-3"
      }
    ]
  ],
  "spark-lines": [
    [
      "path",
      {
        "d": "m7 3 .8 3.2L11 7l-3.2.8L7 11l-.8-3.2L3 7l3.2-.8z",
        "key": "spark-lines-1"
      }
    ],
    [
      "path",
      {
        "d": "M11 7h10",
        "key": "spark-lines-2"
      }
    ],
    [
      "path",
      {
        "d": "M7 12h12",
        "key": "spark-lines-3"
      }
    ],
    [
      "path",
      {
        "d": "M7 17h9",
        "key": "spark-lines-4"
      }
    ]
  ],
  "split-gate-check": [
    [
      "path",
      {
        "d": "M5 20V5h5m9 15V5h-5m-5 7 2 2 4-4",
        "key": "split-gate-check-1"
      }
    ]
  ],
  "split-gate-dot": [
    [
      "path",
      {
        "d": "M5 20V5h5m9 15V5h-5",
        "key": "split-gate-dot-1"
      }
    ],
    [
      "circle",
      {
        "cx": "12",
        "cy": "12",
        "r": "1.5",
        "key": "split-gate-dot-2"
      }
    ]
  ],
  "split-gate-slash": [
    [
      "path",
      {
        "d": "M5 20V5h5m9 15V5h-5M9 15l6-6",
        "key": "split-gate-slash-1"
      }
    ]
  ],
  "split-text-arrows": [
    [
      "path",
      {
        "d": "M4 6h9m-9 4h6m-6 8h9m-9-4h6m7-9v5l-2-2m2 2 2-2m-2 11v-5l-2 2m2-2 2 2",
        "key": "split-text-arrows-1"
      }
    ]
  ],
  "stacked-checks": [
    [
      "rect",
      {
        "width": "18",
        "height": "7",
        "x": "3",
        "y": "3",
        "rx": "1",
        "key": "stacked-checks-1"
      }
    ],
    [
      "rect",
      {
        "width": "18",
        "height": "7",
        "x": "3",
        "y": "14",
        "rx": "1",
        "key": "stacked-checks-2"
      }
    ],
    [
      "path",
      {
        "d": "M6 6.5 7.5 8l3-3M6 17.5 7.5 19l3-3M13 6.5h5m-5 11h5",
        "key": "stacked-checks-3"
      }
    ]
  ],
  "stepped-arrow": [
    [
      "path",
      {
        "d": "M3 19h5v-5h5V9h7",
        "key": "stepped-arrow-1"
      }
    ],
    [
      "path",
      {
        "d": "m17 6 3 3-3 3",
        "key": "stepped-arrow-2"
      }
    ]
  ],
  "tabbed-sheet": [
    [
      "path",
      {
        "d": "M5 5V3h7l2 2h5v16H5zm0 3h14M8 12h8m-8 4h6",
        "key": "tabbed-sheet-1"
      }
    ]
  ]
} as unknown as Record<CustomIconName, IconNode>;

export const AnchorLinkIcon: LucideIcon = createLucideIcon('AnchorLink', customIconNodes['anchor-link']);
export const ArchiveLockIcon: LucideIcon = createLucideIcon('ArchiveLock', customIconNodes['archive-lock']);
export const BoundFolderIcon: LucideIcon = createLucideIcon('BoundFolder', customIconNodes['bound-folder']);
export const BrandMarkIcon: LucideIcon = createLucideIcon('BrandMark', customIconNodes['brand-mark']);
export const CardsPlayIcon: LucideIcon = createLucideIcon('CardsPlay', customIconNodes['cards-play']);
export const CheckLinesIcon: LucideIcon = createLucideIcon('CheckLines', customIconNodes['check-lines']);
export const CornerBadgeIcon: LucideIcon = createLucideIcon('CornerBadge', customIconNodes['corner-badge']);
export const CrossedPathsIcon: LucideIcon = createLucideIcon('CrossedPaths', customIconNodes['crossed-paths']);
export const DocumentSnowflakeIcon: LucideIcon = createLucideIcon('DocumentSnowflake', customIconNodes['document-snowflake']);
export const NodesLinkedIcon: LucideIcon = createLucideIcon('NodesLinked', customIconNodes['nodes-linked']);
export const RingCheckIcon: LucideIcon = createLucideIcon('RingCheck', customIconNodes['ring-check']);
export const SheetsFunnelIcon: LucideIcon = createLucideIcon('SheetsFunnel', customIconNodes['sheets-funnel']);
export const SparkLinesIcon: LucideIcon = createLucideIcon('SparkLines', customIconNodes['spark-lines']);
export const SplitGateCheckIcon: LucideIcon = createLucideIcon('SplitGateCheck', customIconNodes['split-gate-check']);
export const SplitGateDotIcon: LucideIcon = createLucideIcon('SplitGateDot', customIconNodes['split-gate-dot']);
export const SplitGateSlashIcon: LucideIcon = createLucideIcon('SplitGateSlash', customIconNodes['split-gate-slash']);
export const SplitTextArrowsIcon: LucideIcon = createLucideIcon('SplitTextArrows', customIconNodes['split-text-arrows']);
export const StackedChecksIcon: LucideIcon = createLucideIcon('StackedChecks', customIconNodes['stacked-checks']);
export const SteppedArrowIcon: LucideIcon = createLucideIcon('SteppedArrow', customIconNodes['stepped-arrow']);
export const TabbedSheetIcon: LucideIcon = createLucideIcon('TabbedSheet', customIconNodes['tabbed-sheet']);

export const customIcons: Record<CustomIconName, LucideIcon> = {
  'anchor-link': AnchorLinkIcon,
  'archive-lock': ArchiveLockIcon,
  'bound-folder': BoundFolderIcon,
  'brand-mark': BrandMarkIcon,
  'cards-play': CardsPlayIcon,
  'check-lines': CheckLinesIcon,
  'corner-badge': CornerBadgeIcon,
  'crossed-paths': CrossedPathsIcon,
  'document-snowflake': DocumentSnowflakeIcon,
  'nodes-linked': NodesLinkedIcon,
  'ring-check': RingCheckIcon,
  'sheets-funnel': SheetsFunnelIcon,
  'spark-lines': SparkLinesIcon,
  'split-gate-check': SplitGateCheckIcon,
  'split-gate-dot': SplitGateDotIcon,
  'split-gate-slash': SplitGateSlashIcon,
  'split-text-arrows': SplitTextArrowsIcon,
  'stacked-checks': StackedChecksIcon,
  'stepped-arrow': SteppedArrowIcon,
  'tabbed-sheet': TabbedSheetIcon,
};
