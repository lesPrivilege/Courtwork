import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';

const source = (relativePath) => fileURLToPath(new URL(relativePath, import.meta.url));

export default {
  root: source('./src/__vite__/'),
  build: {
    outDir: process.env.COURTWORK_OUTPUT_OUT_DIR,
    emptyOutDir: true,
  },
};
