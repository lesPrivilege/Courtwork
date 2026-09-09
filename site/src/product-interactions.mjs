// No providers, process execution, storage, telemetry or background requests.
const dialog = document.querySelector('#preview-dialog');
const download = document.querySelector('[data-open-preview]');
if (dialog && download && typeof dialog.showModal === 'function') {
  download.hidden = false;
  download.addEventListener('click', () => dialog.showModal());
  document.querySelector('[data-close-preview]').addEventListener('click', () => dialog.close());
}
const copy = document.querySelector('[data-copy-command]');
if (copy) {
  copy.hidden = false;
  copy.addEventListener('click', async () => {
    const code = document.querySelector('#install-command');
    const status = document.querySelector('[data-copy-status]');
    try {
      await navigator.clipboard.writeText(code.textContent);
      status.textContent = 'Copied. Review the data directory before running.';
    } catch {
      const range = document.createRange(); range.selectNodeContents(code);
      const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
      status.textContent = 'Clipboard unavailable. Commands selected for manual copy.';
    }
  });
}
const form = document.querySelector('#cli-form');
if (form) {
  const record = JSON.parse(document.querySelector('#cli-record').textContent);
  const input = document.querySelector('#cli-input');
  const output = document.querySelector('#cli-output');
  const destination = document.querySelector('#cli-destination');
  const history = [];
  let historyAt = 0;
  const commands = {
    help: () => 'CLI concept / fixed offline recording\n\nhelp        Command reference\nstatus      Recorded matter summary\nopen nda    Select the synthetic matter\nreview      Inspect recorded candidates\nprovenance  Source identity and digest\nmodels      Model surface and its limits\nclear       Clear this terminal\n\nNo shell commands or decisions are executed.',
    status: () => `Matter      ${record.title}\nSources     ${record.sources.length}\nCandidates  ${record.candidates.length}\nDecisions   ${record.decisions}\nEvidence    ${record.sha}\n\nRecorded state, not a live runtime.`,
    'open nda': () => `Selected: ${record.title}\n\n${record.sources.length} recorded source · ${record.candidates.length} candidate\n\nUse courtwork review to inspect the pending candidate.`,
    review: () => record.candidates.map(c=>`Candidate   ${c.id}\nStatus      ${c.status}\nBase        ${c.baseVersion}`).join('\n\n')+'\n\nHuman review required in this recording.\nThis page cannot submit a decision.',
    provenance: () => `Evidence commit ${record.sha}\nState version   ${record.version}\n\n`+record.sources.map(s=>`Source   ${s.id}\nVersion  ${s.version}\nSHA-256  ${s.digest}`).join('\n\n'),
    models: () => 'Provider    Local deterministic fake\nReal model  Not used for this recording\n\nCompatible endpoint probes do not establish model execution support.\nOpen Models for the exact boundary.',
  };
  const run = raw => {
    const text = raw.trim(); if (!text) return;
    history.push(text); if(history.length>50) history.shift(); historyAt=history.length;
    const command = text.replace(/^courtwork\s+/i,'').toLowerCase();
    destination.hidden = true;
    if(command==='clear') output.textContent='Courtwork CLI concept · cleared';
    else {
      const result = Object.hasOwn(commands, command) ? commands[command]() : 'Unknown command. Use courtwork help.\nThis navigation study does not execute shell input.';
      output.textContent = (`${output.textContent}\n\n› ${text}\n${result}`).slice(-16000);
      if(['review','open nda','provenance','models'].includes(command)) {
        destination.hidden = false;
        destination.href = command==='models'?'./models.html':command==='provenance'?'./specimen/index.html#source':'./specimen/index.html#step-candidate';
        destination.textContent=command==='models'?'Open Models →':command==='provenance'?'Inspect recorded source →':'Open recorded review →';
      }
    }
    input.value=''; output.scrollTop=output.scrollHeight;
  };
  form.hidden = false;
  for (const button of document.querySelectorAll('[data-command]')) button.disabled = false;
  form.addEventListener('submit', event => { event.preventDefault(); run(input.value); });
  for(const button of document.querySelectorAll('[data-command]')) button.addEventListener('click',()=>{run(button.dataset.command); input.focus();});
  input.addEventListener('keydown',event=>{
    if(!['ArrowUp','ArrowDown'].includes(event.key)) return;
    event.preventDefault(); historyAt=Math.max(0,Math.min(history.length,historyAt+(event.key==='ArrowUp'?-1:1)));
    input.value=history[historyAt]??'';
  });
}
