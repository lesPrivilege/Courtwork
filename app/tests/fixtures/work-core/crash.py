"""Synthetic subprocess fault probe; never used by the application."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[3] / 'core'))
from bridge import open_or_initialize
from core import HookController, TrustedReviewer
store = open_or_initialize(sys.argv[1])
store.hooks = HookController(kill_stage=sys.argv[2])
TrustedReviewer(store).decide(dict(request_id='crash-request',matter_id='m',candidate_id='c',base_version=0,action='accept',reason='Synthetic review'))
