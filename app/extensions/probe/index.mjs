const manifest = Object.freeze({
  schemaVersion: 1,
  id: 'probe',
  version: '0.1.0',
  title: 'Lifecycle Probe (development)',
  kind: 'development-extension',
  releaseStatus: 'development',
  owner: 'schema-engineering',
  applicability: 'Lifecycle and isolation fixture only.',
  exclusions: ['No domain fields, tools, provider access or formal state.'],
  declaredTools: [],
  surface: null,
  bindingFields: [],
  stateCompatibility: 'v5-probe-v1',
  rollback: 'Future activations only.',
  deprecation: null,
  evalObligations: ['Must remain free of business effects.'],
});

function exactEmpty(value, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== 0) {
    const error = new Error(`${label} must be an empty object`);
    error.code = 'INVALID_INPUT';
    throw error;
  }
}

class ProbeExtension {
  get manifest() { return manifest; }

  async start() { return manifest; }

  async createBinding(input) {
    exactEmpty(input, 'probe binding');
    return {};
  }

  async projection(binding) {
    exactEmpty(binding, 'probe binding');
    return { extension: { id: manifest.id, version: manifest.version, releaseStatus: manifest.releaseStatus } };
  }

  async begin(input) {
    if (!input || typeof input !== 'object' || typeof input.runId !== 'string' || typeof input.sessionId !== 'string') {
      const error = new Error('probe begin identity is required');
      error.code = 'INVALID_INPUT';
      throw error;
    }
    return {
      context: 'Lifecycle probe; no business tools.',
      tools: [],
      close: async () => undefined,
      finish: async () => undefined,
    };
  }

  async humanAction() {
    const error = new Error('probe has no human actions');
    error.code = 'UNSUPPORTED_ACTION';
    throw error;
  }

  async dispose() { return undefined; }
}

export function createProbe() {
  return new ProbeExtension();
}

export { manifest };

