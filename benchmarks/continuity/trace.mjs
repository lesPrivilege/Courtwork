import {createHash} from 'node:crypto';
export function traceHash({sha256,...entry}) {
  return createHash('sha256').update(JSON.stringify(entry)).digest('hex');
}
export function seal(entry) {return {...entry,sha256:traceHash(entry)};}
