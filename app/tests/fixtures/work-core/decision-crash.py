"""Test-only real Core process kill at a named transaction barrier."""
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[3] / 'core'))
from bridge import open_or_initialize
from core import HookController, TrustedReviewer

class Barrier(HookController):
    def hit(self, stage):
        if stage == sys.argv[2]:
            print('BARRIER ' + stage, flush=True)
        return super().hit(stage)

store = open_or_initialize(sys.argv[1])
store.hooks = Barrier(kill_stage=sys.argv[2])
TrustedReviewer(store).decide(json.loads(sys.argv[3]))
