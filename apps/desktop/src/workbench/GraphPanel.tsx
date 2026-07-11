import { useCallback, useEffect, useMemo, useRef, useState, type WheelEvent } from 'react';
import type { PartyGraph } from '@courtwork/schemas';
import { Icon } from './Icon';
import { EmptyState, TierBadge } from './Panels';
import { EdgeEvent, Graph, GraphEvent, NodeEvent, registerCourtworkGraphRuntime, type IElementEvent } from './g6-runtime';
import { COURTWORK_GRAPH_THEME, graphGeometry, graphTokens, registerCourtworkGraphTheme } from './graph-theme';

const { nodeWidth: NODE_WIDTH, nodeHeight: NODE_HEIGHT } = graphGeometry;
const MIN_ZOOM = 0.45;
const MAX_ZOOM = 2.4;

type PartyEdge = PartyGraph['edges'][number];
type Selection = { kind: 'node' | 'edge'; id: string };
type LayoutNode = { id: string; label: string; x: number; y: number; width: number; height: number };

function hasContradictionMarker(edge: PartyEdge): boolean {
  return edge.markers?.includes('contradiction') ?? false;
}

function eventElementId(event: IElementEvent): string {
  return String(event.target.id);
}

function graphDisplayName(primaryName: string): string {
  return primaryName
    .replaceAll('（虚构）', '')
    .replaceAll('（云章）', '')
    .replace(/有限公司$/, '');
}

export default function GraphPanel({ graph, grade }: { graph: PartyGraph; grade?: 'A' | 'B' | 'C' }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const [layoutNodes, setLayoutNodes] = useState<LayoutNode[]>([]);
  const [zoom, setZoom] = useState(1);
  const [selection, setSelection] = useState<Selection>(() => ({ kind: 'edge', id: graph.edges[0]?.id ?? '' }));

  const edgesById = useMemo(() => new Map(graph.edges.map((edge) => [edge.id, edge])), [graph.edges]);
  const firstEdgeByNode = useMemo(() => {
    const result = new Map<string, PartyEdge>();
    for (const edge of graph.edges) {
      if (!result.has(edge.sourcePartyId)) result.set(edge.sourcePartyId, edge);
      if (!result.has(edge.targetPartyId)) result.set(edge.targetPartyId, edge);
    }
    return result;
  }, [graph.edges]);
  const selectedEdge = selection.kind === 'edge'
    ? edgesById.get(selection.id)
    : firstEdgeByNode.get(selection.id);
  const contradictionCount = graph.edges.filter(hasContradictionMarker).length;

  const selectNode = useCallback((id: string) => setSelection({ kind: 'node', id }), []);
  const selectEdge = useCallback((id: string) => setSelection({ kind: 'edge', id }), []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !graph.nodes.length) return;

    let active = true;
    let instance: Graph | null = null;
    let renderPromise: Promise<void> | null = null;
    const startFrame = requestAnimationFrame(async () => {
      if (!active) return;
      await registerCourtworkGraphRuntime();
      if (!active) return;
      registerCourtworkGraphTheme();
      const current = new Graph({
      container: host,
      autoResize: true,
      animation: false,
      background: graphTokens.background,
      data: {
        nodes: graph.nodes.map((node) => ({
          id: node.id,
          data: { kind: node.kind, primaryName: node.primaryName },
          style: { labelText: graphDisplayName(node.primaryName) },
        })),
        edges: graph.edges.map((edge) => ({
          id: edge.id,
          source: edge.sourcePartyId,
          target: edge.targetPartyId,
          data: { contradiction: hasContradictionMarker(edge), relationType: edge.relationType },
        })),
      },
      layout: {
        type: 'dagre',
        rankdir: 'LR',
        nodesep: 18,
        ranksep: 32,
        nodeSize: [NODE_WIDTH, NODE_HEIGHT],
        controlPoints: true,
        animation: false,
      },
      theme: COURTWORK_GRAPH_THEME,
      node: {
        type: 'rect',
        animation: false,
        style: {
          size: [NODE_WIDTH, NODE_HEIGHT],
        },
      },
      edge: {
        type: 'polyline',
        animation: false,
        style: (datum) => ({
          stroke: datum.data?.contradiction ? graphTokens.amber : graphTokens.slate,
          lineWidth: 1,
          endArrow: true,
        }),
      },
      behaviors: [{ type: 'drag-canvas', animation: false }],
      plugins: [{
        type: 'minimap',
        key: 'minimap',
        size: [120, 72],
        padding: 7,
        position: 'right-bottom',
        className: 'courtwork-minimap',
        // docs/52 #9：禁用库默认蓝系，全部吃 Courtwork tokens
        containerStyle: {
          background: graphTokens.background,
          border: `1px solid ${graphTokens.borderStrong}`,
          borderRadius: '4px',
          overflow: 'hidden',
        },
        maskStyle: {
          border: `1px solid ${graphTokens.ink}`,
          background: 'rgba(233, 238, 244, 0.36)',
          // 显式压掉 G6 默认蓝色描边/填充
          stroke: graphTokens.ink,
          fill: graphTokens.selected,
          fillOpacity: 0.36,
        },
      }],
      zoomRange: [MIN_ZOOM, MAX_ZOOM],
      });
      instance = current;
      graphRef.current = current;

      current.on(NodeEvent.CLICK, (event: IElementEvent) => selectNode(eventElementId(event)));
      current.on(EdgeEvent.CLICK, (event: IElementEvent) => selectEdge(eventElementId(event)));
      current.on(GraphEvent.AFTER_TRANSFORM, () => {
        if (active && current.rendered) setZoom(current.getZoom());
      });

      renderPromise = current.render();
      void renderPromise.then(async () => {
        if (!active) return;
        await current.fitView({ when: 'always', direction: 'both' }, false);
        if (!active) return;
        setZoom(current.getZoom());
        setLayoutNodes(graph.nodes.map((node) => {
          const [x, y] = current.getElementPosition(node.id);
          return { id: node.id, label: node.primaryName, x, y, width: NODE_WIDTH, height: NODE_HEIGHT };
        }));
      });
    });

    return () => {
      active = false;
      cancelAnimationFrame(startFrame);
      graphRef.current = null;
      if (!instance) return;
      if (instance.rendered) instance.destroy();
      else void renderPromise?.finally(() => instance?.destroy());
    };
  }, [graph, selectEdge, selectNode]);

  useEffect(() => {
    const instance = graphRef.current;
    if (!instance || !layoutNodes.length) return;
    const states = Object.fromEntries([
      ...graph.nodes.map((node) => [node.id, selection.kind === 'node' && selection.id === node.id ? ['selected'] : []]),
      ...graph.edges.map((edge) => [edge.id, selection.kind === 'edge' && selection.id === edge.id ? ['selected'] : []]),
    ]);
    void instance.setElementState(states, false);
  }, [graph.edges, graph.nodes, layoutNodes.length, selection]);

  if (!graph.nodes.length) return <div className="graph-layout"><EmptyState noun="关系节点" shortcut="⌘I" /></div>;

  const changeZoom = async (ratio: number) => {
    const instance = graphRef.current;
    if (!instance) return;
    await instance.zoomBy(ratio, false);
    setZoom(instance.getZoom());
  };
  const fitGraph = async () => {
    const instance = graphRef.current;
    if (!instance) return;
    await instance.fitView({ when: 'always', direction: 'both' }, false);
    setZoom(instance.getZoom());
  };
  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    void changeZoom(Math.exp(-event.deltaY * .002));
  };

  return <div
    className="graph-layout"
    data-testid="graph-panel"
    data-renderer="g6"
    data-layout="dagre"
    data-node-count={graph.nodes.length}
    data-edge-count={graph.edges.length}
    data-contradiction-count={contradictionCount}
    data-layout-ready={layoutNodes.length === graph.nodes.length}
    data-layout-nodes={JSON.stringify(layoutNodes)}
  >
    <div
      className="graph-canvas"
      role="group"
      aria-label="当事人关系图谱"
      data-testid="graph-zoom-sandbox"
      data-zoom={zoom.toFixed(3)}
      onWheel={handleWheel}
    >
      <div ref={hostRef} className="g6-host" aria-hidden="true" />
      <div className="graph-controls" aria-label="图谱视图控制">
        <button aria-label="放大图谱" title="放大" onClick={() => void changeZoom(1.15)}><Icon name="plus" /></button>
        <button aria-label="缩小图谱" title="缩小" onClick={() => void changeZoom(1 / 1.15)}><Icon name="minus" /></button>
        <button aria-label="复位图谱" title="适应窗口" onClick={() => void fitGraph()}><Icon name="scan-frame" /></button>
      </div>
    </div>
    <div className="relation-list">
      <h3>主体</h3>
      {graph.nodes.map((node) => <button
        key={node.id}
        title={node.primaryName}
        className={selection.kind === 'node' && selection.id === node.id ? 'selected' : ''}
        onClick={() => selectNode(node.id)}
      ><span>{node.primaryName}</span><small>{node.id}</small></button>)}
      <h3>关系</h3>
      {graph.edges.map((edge) => <button
        key={edge.id}
        title={edge.relationType}
        className={selection.kind === 'edge' && selection.id === edge.id ? 'selected' : ''}
        data-contradiction={hasContradictionMarker(edge) || undefined}
        onClick={() => selectEdge(edge.id)}
      ><span>{edge.relationType}</span><small>{edge.id}</small></button>)}
    </div>
    {selectedEdge && <article className="verified-block relation-evidence">
      <header data-testid="graph-source-kind">{selection.kind === 'node' ? '节点关联依据' : '关系依据'}</header>
      <TierBadge grade={grade} />
      <button disabled title="原文定位 · 卷宗原件待连接">{selectedEdge.sourceAnchors[0]?.fileId}</button>
      <q>{selectedEdge.sourceAnchors[0]?.quote}</q>
    </article>}
  </div>;
}
