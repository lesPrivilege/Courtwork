import {el} from './ui-controls.mjs';
import {coreFileSubjects, readCoreManifest, sha256Text} from './markdown-source.mjs';
import {workPacket, renderWorkPacket} from './surface-modules.mjs';

export function recordedChatFiles(rows, sessionId) {
  const files = new Map();
  for (const row of rows) {
    const file = row.file;
    if (row.kind !== 'artifact' || file?.kind !== 'content-version' || !/^[a-f0-9]{64}$/.test(file.sha256 || '') || !row.runId) continue;
    const ref = {kind:'content-version',sessionId,runId:row.runId,path:file.path,sha256:file.sha256};
    files.set(JSON.stringify(ref),ref);
  }
  return [...files.values()];
}

export function frozenChatSources(projection) {
  const refs = new Map();
  for (const candidate of projection?.candidates ?? []) for (const evidence of candidate.evidence ?? []) {
    if (typeof candidate.id !== 'string' || typeof evidence.source_id !== 'string' || !Number.isSafeInteger(evidence.source_version) || !/^[a-f0-9]{64}$/.test(evidence.digest || '')) continue;
    const ref = {candidateId:candidate.id,sourceId:evidence.source_id,version:evidence.source_version,digest:evidence.digest};
    refs.set(JSON.stringify(ref),ref);
  }
  return [...refs.values()];
}

// A reader of existing Session file and Core Work contracts, never a Broker or inbox.
export function createChatSources({session, request, isCurrent, onOpenFile, onOpenWork}) {
  let files = [], generation = 0, destroyed = false;
  const root = el('details', {className:'chat-sources', attrs:{'data-reading-key':JSON.stringify([session.id,'sources'])}},
    el('summary', {text:'Sources and work versions', attrs:{'data-focus-key':`chat-sources:${session.id}`}}));
  const body = el('div', {className:'surface-block'}), status = el('p',{className:'form-help',attrs:{role:'status'}});
  const refresh = el('button',{className:'text-button',text:'Refresh sources',attrs:{type:'button'}});
  const live = own => !destroyed && own === generation && isCurrent();
  const fileButton = ref => {
    const button = el('button',{className:'secondary-button',text:ref.path,attrs:{type:'button'}});
    button.addEventListener('click',()=>{if(isCurrent()) onOpenFile(ref,button);});
    return el('div',{className:'surface-block'},button,el('span',{className:'form-help',text:`Recorded version ${ref.sha256.slice(0,12)}`}));
  };
  async function load() {
    const own = ++generation;
    body.replaceChildren(...files.map(fileButton));
    status.textContent = session.extensionBinding ? 'Loading work sources…' : files.length ? 'Recorded files from this conversation.' : 'No recorded sources in this conversation.';
    if (!session.extensionBinding) return;
    refresh.disabled = true;
    try {
      const response = await request(`/sessions/${encodeURIComponent(session.id)}/surface`);
      if (!live(own)) return;
      const projection = response?.projection, packet = workPacket(projection);
      const changedSources = Number.isSafeInteger(packet?.sourceVersion) && packet.candidates.some(candidate=>Number.isSafeInteger(candidate.sourceVersion) && candidate.sourceVersion !== packet.sourceVersion);
      root.querySelector('summary').textContent = changedSources ? 'Sources and work versions · Source revision changed' : 'Sources and work versions';
      if (packet?.matterId) {
        body.append(renderWorkPacket(packet, {onReadSource:async input=>{
          const answer = await request(`/sessions/${encodeURIComponent(session.id)}/work-query?${new URLSearchParams({kind:'source',candidateId:input.candidateId,sourceId:input.sourceId,version:input.version})}`);
          if (!live(own)) throw new Error('This source view is no longer current.');
          return answer?.source ?? null;
        }}));
        const open = el('button',{className:'text-button',text:'Open work review',attrs:{type:'button'}});
        open.addEventListener('click',()=>{if(live(own)) onOpenWork(open);});body.append(open);
      }
      for (const ref of frozenChatSources(projection)) {
        const detail = el('details', {className:'version-details'}, el('summary',{text:`Read source ${ref.sourceId} · version ${ref.version}`}));
        const content = el('div',{className:'surface-block'});detail.append(content);body.append(detail);
        let readGeneration = 0;
        detail.addEventListener('toggle',async()=>{
          const readOwn = ++readGeneration;
          if (!detail.open) {content.replaceChildren();return;}
          content.replaceChildren(el('p',{className:'form-help',text:'Reading fixed source…'}));
          try {
            const answer = await request(`/sessions/${encodeURIComponent(session.id)}/work-query?${new URLSearchParams({kind:'source',candidateId:ref.candidateId,sourceId:ref.sourceId,version:ref.version})}`);
            const source = answer?.source;
            if (!live(own) || readOwn !== readGeneration || !detail.open) return;
            if (source?.id !== ref.sourceId || source.version !== ref.version || source.digest !== ref.digest || typeof source.text !== 'string' || await sha256Text(source.text) !== ref.digest) throw new Error('The source does not match this recorded version.');
            if (!live(own) || readOwn !== readGeneration || !detail.open) return;
            content.replaceChildren(el('p',{className:'form-help',text:`Candidate ${ref.candidateId} · complete text, ${[...source.text].length} code points. Model use is not recorded by this read.`}),el('pre',{className:'file-text',text:source.text}));
          } catch(error) {if(live(own) && readOwn === readGeneration) content.replaceChildren(el('p',{className:'form-help',text:`Source unavailable: ${error.message}`}));}
        });
      }
      for (const subject of coreFileSubjects(projection,session.id)) {
        const group = el('div',{className:'surface-block'});
        const button = el('button',{className:'text-button',text:subject.artifactId?'Read accepted artifact files':'Read candidate files',attrs:{type:'button'}});
        button.addEventListener('click',async()=>{
          button.disabled=true;
          try {
            const entries = await readCoreManifest(subject,{query:(input,signal)=>request(`/sessions/${encodeURIComponent(session.id)}/work-query?${new URLSearchParams(input)}`,{signal})});
            if (!live(own)) return;
            const restoreFocus = group.contains(document.activeElement);
            group.replaceChildren(...entries.map(fileButton));
            if (restoreFocus) group.querySelector("button")?.focus({preventScroll:true});
          } catch(error) {if(live(own)){group.append(el('p',{className:'form-help',text:error.message}));button.disabled=false;}}
        });group.append(button);body.append(group);
      }
      status.textContent = packet?.matterId ? `${changedSources ? 'Candidate sources differ from the current source revision. Open work review to check. ' : ''}Work versions read from the bound work record. Opening a source does not record model use or a review decision.` : 'No Core work sources are exposed by this conversation.';
    } catch(error) {if(live(own)) status.textContent=`Work sources unavailable: ${error.message}`;}
    finally {if(live(own)) refresh.disabled=false;}
  }
  refresh.addEventListener('click',load);
  root.addEventListener('toggle',event=>{if(event.target && event.target !== root) return; if(root.open) void load();else ++generation;});
  root.append(status,refresh,body);
  return {root, update(rows){files=recordedChatFiles(rows,session.id);}, destroy(){destroyed=true;++generation;}};
}

export function quoteRecordedFile({ref,text}) {
  if (!ref || !['core-file','content-version'].includes(ref.kind) || typeof ref.path !== 'string' || !/^[a-f0-9]{64}$/.test(ref.sha256 || '') || typeof text !== 'string') throw new Error('A recorded file is required.');
  const origin = ref.kind === 'core-file' ? `Candidate: ${ref.candidateId}${ref.artifactId ? ` · artifact ${ref.artifactId}` : ''}` : `Run: ${ref.runId}`;
  return `Source: ${ref.path}\nSession: ${ref.sessionId}\n${origin}\nRecorded version: ${ref.sha256}\n\n${text.split('\n').map(line=>`> ${line}`).join('\n')}`;
}
