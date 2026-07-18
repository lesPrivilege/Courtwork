import { ExtensionCategory, getExtension, register } from './g6-runtime';

export const COURTWORK_GRAPH_THEME = 'courtwork-light';

// Mirrors docs/design/tokens.json. G6 receives no library palette defaults.
export const graphTokens = {
  background: '#FFFFFF',
  surface: '#F2F4F7',
  hover: '#E6E8EC',
  selected: '#D9E3F6',
  ink: '#232B38',
  textSecondary: '#55617A',
  border: '#D5DAE3',
  borderStrong: '#C3CAD6',
  slate: '#55617A',
  amber: '#8F6420',
} as const;

export const graphGeometry = {
  nodeWidth: 160,
  nodeHeight: 44,
} as const;

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
      labelFontFamily: 'Inter, "Noto Sans SC", system-ui, sans-serif',
      labelFontSize: 16,
      labelFontWeight: 500,
      labelLineHeight: 16,
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
