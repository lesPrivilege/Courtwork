import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
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
