import { WorkExtension, CoreClientError } from '../work-adapter.mjs';
import { manifest } from './manifest.mjs';
import { FILE_MEMO_CONTRACT_VERSION, FILE_MEMO_PROFILE } from '../file-memo-policy.mjs';
const CONTRACT_VERSION = 'se-contract-v5.0';
const PRESET_VERSION = 'evidence-memo-development-1';
export function createEvidenceMemo({dataDir,core}) {
  // The base manifest remains the shared three-tool contract used by
  // inbound-nda. Evidence Memo's factory advertises the two file readers so
  // the host's declared-tool gate accepts the opt-in file-memo profile while
  // the NDA adapter does not inherit those tools.
  const fileMemoManifest = Object.freeze({
    ...manifest,
    declaredTools: [...manifest.declaredTools, 'se_read_candidate_file', 'se_read_artifact_file'],
  });
  return new WorkExtension({dataDir,core,manifest:fileMemoManifest,contractVersion:CONTRACT_VERSION,presetVersion:PRESET_VERSION});
}
export {CONTRACT_VERSION,PRESET_VERSION,FILE_MEMO_PROFILE,FILE_MEMO_CONTRACT_VERSION,CoreClientError};
