import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        app: resolve(import.meta.dirname, 'index.html'),
        visualGallery: resolve(import.meta.dirname, 'visual-gallery.html'),
      },
      treeshake: {
        moduleSideEffects: (id) => !id.includes('/@antv/g6/esm/') && !id.includes('/@antv/layout/'),
      },
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ['**/src-tauri/**'] },
  },
});
