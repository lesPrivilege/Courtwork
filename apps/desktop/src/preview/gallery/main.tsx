import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles.css';
import { installDesktopThemeController } from '../../settings/theme-controller';
import { freezeViewModel } from '../projection/view-model.js';
import {
  GALLERY_SPECIMEN_KINDS,
  VisualizationGallery,
  type VisualizationGalleryView,
} from './VisualizationGallery.js';

declare global {
  interface Window {
    __COURTWORK_VISUAL_GALLERY__?: VisualizationGalleryView;
  }
}

installDesktopThemeController();

const abstractLines = ['字段 A', '字段 B', '状态', '来源'];
const fallback: VisualizationGalleryView = {
  title: 'Schema Visualization Kit',
  provenance: '抽象结构 · implemented 证据由 test/demo composition 注入',
  specimens: GALLERY_SPECIMEN_KINDS.map((kind, index) => ({
    id: kind,
    kind,
    title: kind.replaceAll('_', ' '),
    state: index % 4 === 3 ? 'deferred' : 'candidate',
    lines: abstractLines,
  })),
};

const root = document.getElementById('root');
if (!root) throw new Error('Visual gallery root missing');
const view = freezeViewModel(window.__COURTWORK_VISUAL_GALLERY__ ?? fallback) as VisualizationGalleryView;
createRoot(root).render(<StrictMode><VisualizationGallery view={view} /></StrictMode>);
