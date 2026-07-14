import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';

const source = (relativePath) => fileURLToPath(new URL(relativePath, import.meta.url));

export default {
  root: source('./src/work/__vite__/'),
  build: {
    outDir: process.env.COURTWORK_WORK_PROTOCOL_OUT_DIR,
    emptyOutDir: true,
  },
};
