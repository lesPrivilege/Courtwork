import {
  DagreLayout,
  DragCanvas,
  EdgeEvent,
  ExtensionCategory,
  Graph,
  GraphEvent,
  Minimap,
  NodeEvent,
  Polyline,
  Rect,
  getExtension,
  register,
  type IElementEvent,
} from '@antv/g6';

export { EdgeEvent, ExtensionCategory, Graph, GraphEvent, NodeEvent, getExtension, register };
export type { IElementEvent };

let registered = false;

/** Register only the G6 extensions used by the graph route; never load the all-in preset. */
export async function registerCourtworkGraphRuntime() {
  if (registered) return;
  if (!getExtension(ExtensionCategory.NODE, 'rect')) register(ExtensionCategory.NODE, 'rect', Rect);
  if (!getExtension(ExtensionCategory.EDGE, 'polyline')) register(ExtensionCategory.EDGE, 'polyline', Polyline);
  if (!getExtension(ExtensionCategory.LAYOUT, 'dagre')) register(ExtensionCategory.LAYOUT, 'dagre', DagreLayout);
  if (!getExtension(ExtensionCategory.BEHAVIOR, 'drag-canvas')) register(ExtensionCategory.BEHAVIOR, 'drag-canvas', DragCanvas);
  if (!getExtension(ExtensionCategory.PLUGIN, 'minimap')) register(ExtensionCategory.PLUGIN, 'minimap', Minimap);
  if (!getExtension(ExtensionCategory.TRANSFORM, 'update-related-edges')) {
    const {
      ArrangeDrawOrder,
      CollapseExpandCombo,
      CollapseExpandNode,
      GetEdgeActualEnds,
      UpdateRelatedEdge,
    } = await import('@antv/g6/esm/transforms');
    // The package's deep-transform declarations duplicate BaseExtension's protected type;
    // runtime constructors still come from this same G6 5.1.1 module graph.
    register(ExtensionCategory.TRANSFORM, 'update-related-edges', UpdateRelatedEdge as never);
    register(ExtensionCategory.TRANSFORM, 'collapse-expand-node', CollapseExpandNode as never);
    register(ExtensionCategory.TRANSFORM, 'collapse-expand-combo', CollapseExpandCombo as never);
    register(ExtensionCategory.TRANSFORM, 'get-edge-actual-ends', GetEdgeActualEnds as never);
    register(ExtensionCategory.TRANSFORM, 'arrange-draw-order', ArrangeDrawOrder as never);
  }
  registered = true;
}
