export type PreviewMarkerTone = 'danger' | 'attention' | 'revision' | 'authority' | 'neutral';

export interface PreviewProgressMarker {
  id: string;
  /** 0–1 的宿主滚动位置；领域含义由 renderer 声明。 */
  position: number;
  label: string;
  tone?: PreviewMarkerTone;
}

export interface PreviewProgressModel {
  kind: 'scroll';
  markers?: readonly PreviewProgressMarker[];
}
