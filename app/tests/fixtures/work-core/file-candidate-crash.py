"""Real SIGKILL probe on independent synthetic file-candidate databases."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[3] / 'core'))
from bridge import open_or_initialize, close_store, create_matter, create_run, update_run
from core import HookController, TrustedReviewer, parse_json
packet=parse_json((Path(__file__).with_name('file-candidate-packets.json')).read_text())
store=open_or_initialize(sys.argv[1])
operation=sys.argv[2]
stage=sys.argv[3] if len(sys.argv)>3 else None
if operation in ('seed','save'):
    create_matter(store,packet['matter'])
    create_run(store,packet['run'])
    store.initialize_file_run(packet['context'],packet['input'])
    if operation=='save': store.hooks=HookController(kill_stage=stage)
    store.save_file_candidate(packet['payload'],packet['files'],packet['context'])
    update_run(store,packet['finish'])
else:
    store.hooks=HookController(kill_stage=stage)
    TrustedReviewer(store).decide(packet['decision'])
close_store(store)
