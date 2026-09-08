import { createEvidenceMemo } from './evidence-memo/index.mjs';
import { createProbe } from './probe/index.mjs';

export const catalog = Object.freeze({
  'evidence-memo': async ({ dataDir, core } = {}) => createEvidenceMemo({ dataDir, core }),
  probe: async ({ dataDir } = {}) => createProbe({ dataDir }),
});

export default catalog;

