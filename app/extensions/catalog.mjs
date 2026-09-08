import { createEvidenceMemo } from './evidence-memo/index.mjs';
import { createInboundNda } from './inbound-nda/index.mjs';
import { createProbe } from './probe/index.mjs';

export const catalog = Object.freeze({
  'evidence-memo': async ({ dataDir, core } = {}) => createEvidenceMemo({ dataDir, core }),
  'inbound-nda': async ({dataDir,core}={}) => createInboundNda({dataDir,core}),
  probe: async ({ dataDir } = {}) => createProbe({ dataDir }),
});

export default catalog;

