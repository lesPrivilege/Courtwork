import { WorkExtension, CoreClientError } from '../work-adapter.mjs';
import { manifest } from './manifest.mjs';
const CONTRACT_VERSION = 'se-contract-v5.0';
const PRESET_VERSION = 'evidence-memo-development-1';
export function createEvidenceMemo({dataDir,core}) {
  return new WorkExtension({dataDir,core,manifest,contractVersion:CONTRACT_VERSION,presetVersion:PRESET_VERSION});
}
export {CONTRACT_VERSION,PRESET_VERSION,CoreClientError};
