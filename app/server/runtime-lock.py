#!/usr/bin/env python3
"""Small POSIX runtime lock holder.

The Node host keeps this process alive while it owns a runtime.  The lock is
held by the file descriptor, not by a marker file: the inode is deliberately
left in place so a later host cannot accidentally create a second lock file.
This helper is intentionally POSIX-only; the host must report unsupported
platforms instead of silently falling back to a weaker lock.
"""

from __future__ import annotations

import argparse
import errno
try:
    import fcntl
except ImportError:  # pragma: no cover - the adapter is explicitly POSIX-only
    fcntl = None  # type: ignore[assignment]
import json
import os
import select
import signal
import sys
from typing import Any


def send(value: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(value, sort_keys=True, separators=(",", ":")) + "\n")
    sys.stdout.flush()


def release(fd: int | None) -> None:
    if fd is None:
        return
    try:
        fcntl.flock(fd, fcntl.LOCK_UN)
    except OSError:
        pass
    try:
        os.close(fd)
    except OSError:
        pass


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--lock-path", required=True)
    parser.add_argument("--parent-pid", required=True, type=int)
    args = parser.parse_args()

    if os.name != "posix" or fcntl is None:
        send({"ready": False, "error": {"code": "LOCK_UNSUPPORTED", "message": "POSIX flock is required"}})
        return 2

    fd: int | None = None
    released = False

    def finish(signum: int | None = None, _frame: Any = None) -> None:
        nonlocal released
        if not released:
            released = True
            release(fd)
        # A signal handler must not continue the protocol after the owner is
        # gone.  0 is used for a normal EOF/release path; signal exits are
        # still observed as unexpected by the Node owner when applicable.
        if signum is None:
            raise SystemExit(0)
        raise SystemExit(128 + signum)

    signal.signal(signal.SIGTERM, finish)
    signal.signal(signal.SIGINT, finish)

    try:
        flags = os.O_RDWR | os.O_CREAT
        nofollow = getattr(os, "O_NOFOLLOW", 0)
        fd = os.open(args.lock_path, flags | nofollow, 0o600)
        try:
            os.fchmod(fd, 0o600)
        except OSError:
            pass
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            send({"ready": False, "error": {"code": "LOCK_BUSY", "message": "runtime lock is held"}})
            release(fd)
            fd = None
            return 3
        except OSError as exc:
            send({"ready": False, "error": {"code": "LOCK_UNAVAILABLE", "message": str(exc)}})
            release(fd)
            fd = None
            return 4

        send({"ready": True, "pid": os.getpid(), "path": os.path.abspath(args.lock_path)})
        stdin = sys.stdin.buffer
        while True:
            # EOF is the normal crash-safe release path when the Node owner is
            # killed.  The parent-PID check covers an unusual pipe/runtime
            # combination where EOF delivery is delayed after reparenting.
            if os.getppid() != args.parent_pid:
                finish()
            readable, _, _ = select.select([stdin], [], [], 0.25)
            if not readable:
                continue
            line = stdin.readline()
            if not line:
                finish()
            try:
                message = json.loads(line.decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError):
                send({"error": {"code": "LOCK_PROTOCOL", "message": "invalid command"}})
                continue
            if not isinstance(message, dict) or set(message) != {"op"}:
                send({"error": {"code": "LOCK_PROTOCOL", "message": "invalid command"}})
                continue
            if message["op"] == "release":
                released = True
                release(fd)
                fd = None
                send({"released": True})
                return 0
            if message["op"] == "ping":
                send({"pong": True})
                continue
            send({"error": {"code": "LOCK_PROTOCOL", "message": "unknown command"}})
    except FileExistsError as exc:
        send({"ready": False, "error": {"code": "LOCK_PATH", "message": str(exc)}})
        return 5
    except PermissionError as exc:
        send({"ready": False, "error": {"code": "LOCK_PERMISSION", "message": str(exc)}})
        return 6
    except OSError as exc:
        if exc.errno == errno.ENOENT:
            send({"ready": False, "error": {"code": "LOCK_PATH", "message": str(exc)}})
        else:
            send({"ready": False, "error": {"code": "LOCK_UNAVAILABLE", "message": str(exc)}})
        return 7
    finally:
        if not released:
            release(fd)


if __name__ == "__main__":
    raise SystemExit(main())
