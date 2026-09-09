"""Synthetic process-death fixture; no production clock or failure API."""
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / 'core'))
from bridge import open_or_initialize, close_store
from core import HookController
import governance

mode, db, stage = sys.argv[1:4]
if mode == 'migration':
    os.environ['CORE_KILL_HOOK'] = stage
    store = open_or_initialize(db)
else:
    store = open_or_initialize(db)
    store.hooks = HookController(kill_stage=stage)
    governance.action(store, json.loads(sys.argv[4]), json.loads(sys.argv[5]))
close_store(store)
