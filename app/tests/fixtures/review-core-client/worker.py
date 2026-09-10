#!/usr/bin/env python3
"""Synthetic Core bridge used by the Q01 lifecycle regression tests.

This worker never opens a CourtWork database.  Its scenario is encoded in the
database filename so the CoreClient's normal subprocess invocation remains
unchanged and no test-specific environment is passed through the client.
"""

import json
import signal
import sys
import time
from pathlib import Path


def argument(name: str, default: str = "") -> str:
    try:
        return sys.argv[sys.argv.index(name) + 1]
    except (ValueError, IndexError):
        return default


def increment_generation(db_path: str) -> int:
    marker = Path(f"{db_path}.starts")
    try:
        generation = int(marker.read_text(encoding="utf-8")) + 1
    except (FileNotFoundError, ValueError):
        generation = 1
    marker.write_text(str(generation), encoding="utf-8")
    return generation


def emit(message: object) -> None:
    sys.stdout.write(json.dumps(message, separators=(",", ":")) + "\n")
    sys.stdout.flush()


def hold() -> None:
    while True:
        time.sleep(1)


db_path = argument("--db")
scenario = Path(db_path).stem
generation = increment_generation(db_path)

if scenario in {"no-ready", "startup-hold"}:
    hold()

emit({"ready": True, "generation": generation, "scenario": scenario})

if scenario == "late-events" and generation == 1:
    # Let the parent observe a late frame while the failed generation is still
    # alive.  SIGTERM is deliberately ignored so a correct client must fence
    # this generation and then escalate to its configured kill deadline.
    signal.signal(signal.SIGTERM, lambda _signum, _frame: None)

for raw_line in sys.stdin:
    try:
        request = json.loads(raw_line)
    except json.JSONDecodeError:
        continue

    operation = request.get("op")
    request_id = request.get("id")

    if scenario in {"no-response", "close-no-ack", "pending-cap"}:
        continue

    if scenario == "close-reopen" and generation == 1:
        # The first generation has a queued request and deliberately does not
        # acknowledge either it or close.  The client must invalidate both,
        # reap this child, and only then admit generation two.
        continue

    if scenario == "partial-frame":
        sys.stdout.write('{"id":"partial')
        sys.stdout.flush()
        hold()

    if scenario == "invalid-json":
        sys.stdout.write("this is not JSON\n")
        sys.stdout.flush()
        hold()

    if scenario == "oversized-no-newline":
        sys.stdout.write("x" * 1_600_001)
        sys.stdout.flush()
        hold()

    if scenario == "stderr-flood":
        sys.stderr.write("e" * 2_000_000)
        sys.stderr.flush()
        hold()

    if scenario in {"restartable", "late-events"} and generation == 1:
        sys.stdout.write("invalid old-generation frame\n")
        sys.stdout.flush()
        if scenario == "late-events":
            time.sleep(0.01)
            emit({"ready": True, "generation": 1, "late": True})
        hold()

    if operation == "close":
        emit({"id": request_id, "ok": True, "result": {"closed": True, "generation": generation}})
        break

    emit({"id": request_id, "ok": True, "result": {"generation": generation, "operation": operation}})
