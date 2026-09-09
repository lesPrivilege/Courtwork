"""Synthetic Attention transaction crash probe; never used by the application."""

import json
import sys
from pathlib import Path


CORE_DIR = Path(__file__).resolve().parents[3] / "core"
sys.path.insert(0, str(CORE_DIR))

from attention import action
from bridge import close_store, open_or_initialize
from core import HookController


def main() -> int:
    if len(sys.argv) != 6:
        raise SystemExit("usage: attention-crash.py DB STAGE CONTEXT_JSON REQUEST_JSON PROVENANCE_JSON")

    db_path, stage, context_text, request_text, provenance_text = sys.argv[1:]
    store = open_or_initialize(db_path)
    store.hooks = HookController(kill_stage=stage)
    try:
        result = action(
            store,
            json.loads(context_text),
            json.loads(request_text),
            json.loads(provenance_text),
        )
        print(json.dumps(result, ensure_ascii=False, sort_keys=True))
        return 0
    finally:
        close_store(store)


if __name__ == "__main__":
    raise SystemExit(main())
