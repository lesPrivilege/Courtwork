import { pathToFileURL } from 'node:url';
import path from 'node:path';
const { RuntimeStore } = await import(pathToFileURL(path.join(process.env.CW_DIAGNOSTIC_ROOT ?? process.cwd(), 'app/server/store.mjs')));
const fail = RuntimeStore.prototype.failRepositoryCandidate;
RuntimeStore.prototype.failRepositoryCandidate = function(...args) { console.error('CANDIDATE_FAILURE', JSON.stringify(args)); return fail.apply(this,args); };
const activate = RuntimeStore.prototype.activateRepositoryCandidate;
RuntimeStore.prototype.activateRepositoryCandidate = async function(...args) { try { return await activate.apply(this,args); } catch(error) { console.error('CANDIDATE_ACTIVATION_ERROR', error.code, error.message); throw error; } };
