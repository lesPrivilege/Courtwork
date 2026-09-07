import { createEvidenceMemo } from './evidence-memo/index.mjs';
import { createProbe } from './probe/index.mjs';

export const catalog = Object.freeze({
  'evidence-memo': async ({ dataDir } = {}) => createEvidenceMemo({ dataDir }),
  probe: async ({ dataDir } = {}) => createProbe({ dataDir }),
});

export default catalog;

