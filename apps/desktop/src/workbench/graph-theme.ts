import { ExtensionCategory, getExtension, register } from './g6-runtime';

export const COURTWORK_GRAPH_THEME = 'courtwork-light';

// Mirrors docs/design/tokens.json. G6 receives no library palette defaults.
export const graphTokens = {
  background: '#FFFFFF',
  surface: '#F3F4F5',
  hover: '#ECEEEF',
  selected: '#DDE2E4',
  ink: '#24303C',
  textSecondary: '#53616E',
  border: '#DCE0E2',
  borderStrong: '#C8CED1',
  slate: '#53616E',
  amber: '#8F6420',
} as const;

export const graphGeometry = {
  nodeWidth: 160,
  nodeHeight: 44,
} as const;

/* GUP-S01 图谱排印：字栈与功能轨同源（tokens.json typography.family.ui）。
   此前取 'Inter, "Noto Sans SC", system-ui'——Inter 不在任一在册字栈内，也不随包，
   实为第二套字栈在 canvas 上静默生效；排印门①只扫 CSS 的 font-family，扫不到 JS 属性。
   labelMinPx 是可读下限，取 tokens.json scale.meta「12px 以下禁用」的同一值：
   fitView 为把图塞进窄面会把 label 缩到 9px（实测 0.56x），缩到看不清不是适配而是静默降级，
   故 fit 后按 labelMinPx / labelFontSize 抬回下限，溢出交既有 drag-canvas 与 minimap 承接。 */
export const graphTypography = {
  labelFontFamily: '-apple-system, "Segoe UI", "PingFang SC", "MiSans", "Microsoft YaHei", "Noto Sans SC", "Helvetica Neue", Arial, sans-serif',
  labelFontSize: 14,
  labelLineHeight: 18,
  labelMinPx: 12,
} as const;

export const graphMinFitZoom = graphTypography.labelMinPx / graphTypography.labelFontSize;

const courtworkTheme = {
  background: graphTokens.background,
  node: {
    style: {
      size: [graphGeometry.nodeWidth, graphGeometry.nodeHeight] as [number, number],
      radius: 6,
      fill: graphTokens.background,
      fillOpacity: 1,
      stroke: graphTokens.borderStrong,
      strokeOpacity: 1,
      lineWidth: 1,
      halo: false,
      icon: false,
      badge: false,
      label: true,
      labelPlacement: 'center' as const,
      labelFill: graphTokens.ink,
      labelFillOpacity: 1,
      labelFontFamily: graphTypography.labelFontFamily,
      labelFontSize: graphTypography.labelFontSize,
      labelFontWeight: 500,
      labelLineHeight: graphTypography.labelLineHeight,
      labelMaxWidth: 144,
      labelWordWrap: true,
      labelWordWrapWidth: 144,
      labelTextAlign: 'center' as const,
      labelTextBaseline: 'middle' as const,
      cursor: 'pointer' as const,
      zIndex: 2,
    },
    state: {
      selected: {
        fill: graphTokens.selected,
        stroke: graphTokens.ink,
        lineWidth: 1,
        halo: false,
      },
      active: {
        fill: graphTokens.hover,
        stroke: graphTokens.borderStrong,
        lineWidth: 1,
        halo: false,
      },
      inactive: {
        fill: graphTokens.background,
        fillOpacity: 1,
        stroke: graphTokens.borderStrong,
        strokeOpacity: 1,
        labelFill: graphTokens.ink,
        labelFillOpacity: 1,
      },
      disabled: {
        fill: graphTokens.surface,
        stroke: graphTokens.border,
        labelFill: graphTokens.textSecondary,
      },
    },
    animation: false as const,
  },
  edge: {
    style: {
      stroke: graphTokens.slate,
      strokeOpacity: 1,
      lineWidth: 1,
      increasedLineWidthForHitTesting: 5,
      halo: false,
      label: false,
      badge: false,
      cursor: 'pointer' as const,
      endArrow: true,
      zIndex: 1,
    },
    state: {
      selected: {
        stroke: graphTokens.ink,
        lineWidth: 2,
        halo: false,
      },
      active: {
        stroke: graphTokens.ink,
        lineWidth: 1,
        halo: false,
      },
      inactive: {
        stroke: graphTokens.slate,
        strokeOpacity: 1,
        lineWidth: 1,
      },
      disabled: {
        stroke: graphTokens.borderStrong,
        strokeOpacity: 1,
      },
    },
    animation: false as const,
  },
  combo: {
    style: {
      fill: graphTokens.surface,
      stroke: graphTokens.borderStrong,
      lineWidth: 1,
      halo: false,
      labelFill: graphTokens.ink,
    },
    state: {
      selected: {
        fill: graphTokens.selected,
        stroke: graphTokens.ink,
        lineWidth: 1,
        halo: false,
      },
    },
    animation: false as const,
  },
};

let registered = false;

export function registerCourtworkGraphTheme() {
  if (registered) return;
  if (!getExtension(ExtensionCategory.THEME, COURTWORK_GRAPH_THEME)) {
    register(ExtensionCategory.THEME, COURTWORK_GRAPH_THEME, courtworkTheme);
  }
  registered = true;
}
