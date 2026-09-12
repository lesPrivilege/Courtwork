import {diffLines} from 'diff';

export const COMPARISON_LIMITS = Object.freeze({bytesPerVersion:65536,linesPerVersion:2000,maxEditLength:2000,timeoutMs:40});
const lineCount = text => text ? (text.match(/\n/g)?.length ?? 0) + (text.endsWith('\n') ? 0 : 1) : 0;

// Thin adapter over the pinned jsdiff public API. Intake has already checked
// both exact identities, scope and bytes; this function does not select latest,
// change adopted refs, infer effects or write a merged version.
export function compareSourceText(from, to) {
  const limits=COMPARISON_LIMITS;
  const identical=from.text===to.text;
  const limited=reason=>({status:'limited',identical,reason,rows:[],limits});
  if (from.bytes>limits.bytesPerVersion || to.bytes>limits.bytesPerVersion || lineCount(from.text)>limits.linesPerVersion || lineCount(to.text)>limits.linesPerVersion) return limited('These versions exceed the line comparison limit. Read either exact version separately.');
  const parts=diffLines(from.text,to.text,{ignoreWhitespace:false,stripTrailingCr:false,maxEditLength:limits.maxEditLength,timeout:limits.timeoutMs});
  if (!parts) return limited('This comparison exceeded its processing budget. Read either exact version separately.');
  let oldNo=1,newNo=1;
  const rows=[];
  for (const part of parts) {
    for (const raw of part.value.match(/[^\n]*\n|[^\n]+$/g) ?? []) {
      const kind=part.added?'add':part.removed?'del':'context';
      const row={kind,text:raw.endsWith('\n')?raw.slice(0,-1):raw,noNewline:!raw.endsWith('\n')};
      if (kind!=='add') row.oldNo=oldNo++;
      if (kind!=='del') row.newNo=newNo++;
      rows.push(row);
    }
  }
  return {status:'complete',identical,rows,limits};
}
