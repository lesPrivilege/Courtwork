import type { ImportedResource } from './control-contract.js';

/** Runtime R2 local slice, not Roadmap R2 completion or an R3 adapter registry. */
export type InlineRuntimeSource = Pick<ImportedResource, 'kind' | 'title' | 'content'> & {
  type: 'inline';
  /** Caller assertion only: the resolver does not dereference or verify it. */
  origin?: { uri: string; version?: string };
};
export interface RuntimeSourceLocator {
  type: 'locator';
  locator: 'url' | 'repository' | 'package' | 'path' | 'manifest';
  value: string;
}
export interface ResolvedRuntimeArtifact {
  resolverVersion: 1;
  status: 'resolved';
  disposition: 'inspect-only';
  identity: { kind: ImportedResource['kind']; contentSha256: string; artifactSha256: string; bytes: number; characters: number };
  provenance: { type: 'supplied-inline'; verified: false; declaredOrigin?: { uri: string; version?: string } };
  portable: Pick<ImportedResource, 'kind' | 'title' | 'content'>;
  native: [];
  capabilities: { declared: {
    name?: string; description?: string; requestedTools?: unknown; compatibility?: unknown;
    resourceIds?: string[]; uiSlots?: string[]; transport?: 'streamable-http'; protocol?: '2026-07-28' | 'legacy-2025';
  }; granted: [] };
  requirements: Array<{ kind: 'resource'; id: string; status: 'unchecked' } | { kind: 'mcp-connection'; status: 'unchecked' }>;
  trust: 'unverified';
  adapters: Array<{ id: 'courtwork-declarative-source-v1'; kind: ImportedResource['kind']; status: 'syntax-accepted' }>;
  diagnostics: string[];
}
export interface UnsupportedRuntimeSource {
  resolverVersion: 1;
  status: 'unsupported';
  disposition: 'inspect-only';
  source: RuntimeSourceLocator;
  reason: 'source_acquisition_not_implemented';
  diagnostics: string[];
}
export function resolveRuntimeSource(input: InlineRuntimeSource | RuntimeSourceLocator): ResolvedRuntimeArtifact | UnsupportedRuntimeSource;
