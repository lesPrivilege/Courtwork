import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';

const source = (relativePath) => fileURLToPath(new URL(relativePath, import.meta.url));

export default {
  root: source('./src/turn/__vite__/'),
  build: {
    outDir: process.env.COURTWORK_TURN_PROTOCOL_OUT_DIR,
    emptyOutDir: true,
  },
};
