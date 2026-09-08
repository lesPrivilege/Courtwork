"""Small trusted JSONL adapter around the frozen Core v2.

The application owns this process boundary.  The frozen ``core.py`` remains
the implementation of Candidate/Decision/Evidence invariants; this module
only adds safe empty initialization, application metadata and a narrow RPC
surface for the Node host.  It is deliberately not a public network server.
"""

from __future__ import annotations

import argparse
import os
import json
import sqlite3
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import fcntl
except ImportError:  # pragma: no cover - this slice targets POSIX hosts
    fcntl = None  # type: ignore[assignment]

from core import (
    CoreError,
    RunContext,
    SCHEMA,
    Store,
    TrustedReviewer,
    _exact_keys,
    _ident,
    _version,
    canonical_json,
    digest_source,
    parse_json,
)


APP_SCHEMA_VERSION = 1
CORE_SCHEMA_VERSION = 1
RUN_STATUSES = frozenset({"running", "stopping", "completed", "failed", "cancelled", "unknown"})
ACTIVE_RUN_STATUSES = frozenset({"running", "stopping"})
PUBLIC_PROVIDER_KEYS = frozenset({
    "provider", "model", "api", "baseUrl", "credentialStatus", "executionMode",
})
PUBLIC_CREDENTIAL_STATUSES = frozenset({"not_configured", "configured"})
PUBLIC_EXECUTION_MODES = frozenset({"simulation", "real"})

APP_SCHEMA = (
    """
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS app_matter (
      matter_id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      draft TEXT NOT NULL DEFAULT '',
      FOREIGN KEY(matter_id) REFERENCES matter(id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS app_run (
      id TEXT PRIMARY KEY,
      matter_id TEXT NOT NULL,
      base_version INTEGER NOT NULL CHECK(base_version >= 0),
      source_version INTEGER NOT NULL CHECK(source_version >= 0),
      contract_version TEXT NOT NULL,
      preset_version TEXT,
      session_ref TEXT,
      instruction TEXT NOT NULL,
      provider TEXT,
      model TEXT,
      provider_config_json TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL CHECK(status IN ('running','stopping','completed','failed','cancelled','unknown')),
      admission_open INTEGER NOT NULL CHECK(admission_open IN (0,1)),
      started_at TEXT NOT NULL,
      ended_at TEXT,
      error_json TEXT,
      candidate_id TEXT,
      FOREIGN KEY(matter_id) REFERENCES matter(id)
    )
    """,
)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def send(value: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False) + "\n")
    sys.stdout.flush()


def error_value(exc: Exception) -> dict[str, str]:
    if isinstance(exc, CoreError):
        return {"code": exc.code, "detail": exc.detail}
    if isinstance(exc, sqlite3.IntegrityError):
        return {"code": "CONFLICT", "detail": str(exc)}
    if isinstance(exc, sqlite3.Error):
        detail = str(exc)
        lowered = detail.lower()
        if "locked" in lowered or "busy" in lowered:
            return {"code": "BUSY_RETRYABLE", "detail": detail}
        return {"code": "CORE_ERROR", "detail": detail}
    return {"code": type(exc).__name__, "detail": str(exc)}


def request_payload(request: dict[str, Any], expected: set[str]) -> dict[str, Any]:
    if not isinstance(request, dict):
        raise CoreError("INVALID", "request must be object")
    _exact_keys({key: value for key, value in request.items() if key not in {"id", "op"}}, expected, "request")
    return {key: request[key] for key in expected}


def validate_source(source: Any) -> dict[str, Any]:
    if not isinstance(source, dict):
        raise CoreError("INVALID", "source must be object")
    _exact_keys(source, {"id", "version", "text", "digest"}, "source")
    _ident(source["id"], "source.id")
    _version(source["version"], "source.version")
    if not isinstance(source["text"], str) or not source["text"]:
        raise CoreError("INVALID", "source.text")
    if "\x00" in source["text"]:
        raise CoreError("INVALID", "source.text contains NUL")
    _ident(source["digest"], "source.digest")
    if digest_source(source["text"]) != source["digest"]:
        raise CoreError("INVALID", "source digest")
    return source


def validate_context(context: Any) -> dict[str, str]:
    _exact_keys(context, {"matter_id", "run_id"}, "context")
    _ident(context["matter_id"], "context.matter_id")
    _ident(context["run_id"], "context.run_id")
    return context


def validate_provider_config(value: Any) -> dict[str, Any]:
    """Accept only the non-secret public provider descriptor.

    The provider worker owns the persisted descriptor, but a Run must freeze a
    copy in Core.  Keeping this whitelist in the private bridge means a host
    bug cannot smuggle credentials or arbitrary nested configuration into the
    durable Run binding.
    """
    if not isinstance(value, dict):
        raise CoreError("INVALID", "run.provider_config must be object")
    extra = set(value) - PUBLIC_PROVIDER_KEYS
    if extra:
        raise CoreError("INVALID", f"run.provider_config has unsupported fields: {sorted(extra)}")
    result: dict[str, Any] = {}
    for key, raw in value.items():
        if not isinstance(raw, str):
            raise CoreError("INVALID", f"run.provider_config.{key} must be string")
        if not raw.strip() or len(raw) > 2048 or "\x00" in raw:
            raise CoreError("INVALID", f"run.provider_config.{key}")
        result[key] = raw
    if "provider" in result and result["provider"] == "":
        raise CoreError("INVALID", "run.provider_config.provider")
    if "credentialStatus" in result and result["credentialStatus"] not in PUBLIC_CREDENTIAL_STATUSES:
        raise CoreError("INVALID", "run.provider_config.credentialStatus")
    if "executionMode" in result and result["executionMode"] not in PUBLIC_EXECUTION_MODES:
        raise CoreError("INVALID", "run.provider_config.executionMode")
    return result


def required_tables(conn: sqlite3.Connection) -> set[str]:
    rows = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
    return {str(row[0]) for row in rows}


def ensure_app_schema(store: Store) -> None:
    tables = required_tables(store.conn)
    core_tables = {"meta", "matter", "source", "source_set", "candidate", "artifact", "request_result", "decision", "audit", "event"}
    if not core_tables.issubset(tables):
        missing = sorted(core_tables - tables)
        raise CoreError("SCHEMA_MISSING", f"missing Core tables: {missing}")

    store.conn.execute("BEGIN IMMEDIATE")
    try:
        for statement in APP_SCHEMA:
            store.conn.execute(statement)
        expected_columns = {
            "app_meta": {"key", "value"},
            "app_matter": {"matter_id", "title", "draft"},
            "app_run": {
                "id", "matter_id", "base_version", "source_version", "contract_version",
                "preset_version", "session_ref", "instruction", "provider", "model",
                "provider_config_json", "status", "admission_open", "started_at", "ended_at",
                "error_json", "candidate_id",
            },
        }
        for table, expected in expected_columns.items():
            actual = {row["name"] for row in store.conn.execute(f"PRAGMA table_info({table})").fetchall()}
            if actual != expected:
                raise CoreError("SCHEMA_INVALID", f"unsupported {table} columns")
        existing = store.conn.execute("SELECT value FROM app_meta WHERE key='schema_version'").fetchone()
        if existing is not None:
            try:
                version = int(existing[0])
            except (TypeError, ValueError) as exc:
                raise CoreError("SCHEMA_INVALID", "invalid app schema version") from exc
            if version != APP_SCHEMA_VERSION:
                raise CoreError("SCHEMA_NEWER", f"unsupported app_schema_version={version}")
        store.conn.execute(
            "INSERT OR IGNORE INTO app_meta(key,value) VALUES('schema_version',?)",
            (str(APP_SCHEMA_VERSION),),
        )
        store.conn.commit()
    except Exception:
        store.conn.rollback()
        raise


def open_or_initialize(db_path: str | Path) -> Store:
    db = Path(db_path)
    if db.exists() and not db.is_file():
        raise CoreError("INVALID", "db path is not a regular file")
    existed = db.exists()
    db.parent.mkdir(parents=True, exist_ok=True)
    if fcntl is None:
        raise CoreError("CORE_UNAVAILABLE", "POSIX database locking is unavailable")
    lock_path = Path(f"{db}.lock")
    lock_fd: int | None = None
    try:
        lock_fd = os.open(lock_path, os.O_RDWR | os.O_CREAT, 0o600)
        fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError as exc:
        if lock_fd is not None:
            os.close(lock_fd)
        raise CoreError("DB_IN_USE", "database is already open") from exc
    except OSError as exc:
        if lock_fd is not None:
            os.close(lock_fd)
        raise CoreError("CORE_UNAVAILABLE", "database lock is unavailable") from exc
    store: Store | None = None
    try:
        store = Store(db, mode="b0")
        assert lock_fd is not None
        store._app_lock_fd = lock_fd
        if not existed:
            store.conn.executescript(SCHEMA)
            store.conn.execute("INSERT OR REPLACE INTO meta(key,value) VALUES('mode',?)", ("b0",))
            store.conn.execute("INSERT OR REPLACE INTO meta(key,value) VALUES('schema_version',?)", (str(CORE_SCHEMA_VERSION),))
            store.conn.execute(f"PRAGMA user_version={CORE_SCHEMA_VERSION}")
        else:
            user_version = int(store.conn.execute("PRAGMA user_version").fetchone()[0])
            if user_version != CORE_SCHEMA_VERSION:
                raise CoreError("SCHEMA_UNSUPPORTED", f"unsupported Core user_version={user_version}")
            meta_rows = {
                row["key"]: row["value"]
                for row in store.conn.execute("SELECT key,value FROM meta").fetchall()
            }
            if meta_rows.get("mode") != "b0" or meta_rows.get("schema_version") != str(CORE_SCHEMA_VERSION):
                raise CoreError("SCHEMA_UNSUPPORTED", "Core meta is not supported B0 schema v1")
        ensure_app_schema(store)
        recover_inflight_runs(store)
    except Exception:
        if store is not None:
            store.close()
        try:
            fcntl.flock(lock_fd, fcntl.LOCK_UN)
        finally:
            os.close(lock_fd)
        raise
    return store


def close_store(store: Store) -> None:
    lock_fd = getattr(store, "_app_lock_fd", None)
    try:
        store.close()
    finally:
        if lock_fd is not None:
            try:
                fcntl.flock(lock_fd, fcntl.LOCK_UN)
            finally:
                os.close(lock_fd)


def watch_parent_process(parent_pid: int) -> None:
    """Release the DB lock if the Node owner is killed without cleanup.

    A child process is not guaranteed to receive a signal when its Node parent
    is SIGKILLed.  Watching the parent PID keeps an orphaned bridge from
    holding the application lock forever on POSIX, while SQLite still gets to
    recover its journal on the next open.
    """
    while True:
        time.sleep(0.2)
        if os.getppid() != parent_pid:
            os._exit(0)


def recover_inflight_runs(store: Store) -> None:
    ended_at = now_iso()
    error = canonical_json({"code": "HOST_RESTARTED", "message": "Run ownership was lost during host restart"})
    store.conn.execute("BEGIN IMMEDIATE")
    try:
        store.conn.execute(
            "UPDATE app_run SET status='unknown', admission_open=0, ended_at=?, error_json=? "
            "WHERE status IN ('running','stopping')",
            (ended_at, error),
        )
        store.conn.commit()
    except Exception:
        store.conn.rollback()
        raise


def app_matter_row(store: Store, matter_id: str) -> sqlite3.Row | None:
    return store.conn.execute("SELECT * FROM app_matter WHERE matter_id=?", (matter_id,)).fetchone()


def run_from_row(row: sqlite3.Row) -> dict[str, Any]:
    error = None if row["error_json"] is None else parse_json(row["error_json"])
    try:
        provider_config = validate_provider_config(parse_json(row["provider_config_json"] or "{}"))
    except CoreError as exc:
        raise CoreError("SCHEMA_INVALID", "stored Run provider descriptor is invalid") from exc
    mode = provider_config.get("executionMode", "simulation")
    return {
        "id": row["id"],
        "matter_id": row["matter_id"],
        "base_version": row["base_version"],
        "source_version": row["source_version"],
        "contract_version": row["contract_version"],
        "preset_version": row["preset_version"],
        "session_ref": row["session_ref"],
        "instruction": row["instruction"],
        "provider": row["provider"],
        "model": row["model"],
        "mode": mode,
        "providerConfig": provider_config,
        "status": row["status"],
        "admissionOpen": bool(row["admission_open"]),
        "startedAt": row["started_at"],
        "endedAt": row["ended_at"],
        "error": error,
        "candidateId": row["candidate_id"],
    }


def run_row(store: Store, run_id: str) -> sqlite3.Row:
    _ident(run_id, "run_id")
    row = store.conn.execute("SELECT * FROM app_run WHERE id=?", (run_id,)).fetchone()
    if row is None:
        raise CoreError("NOT_FOUND", "run")
    return row


def check_run_binding(store: Store, context: dict[str, str], *, require_open: bool = True) -> sqlite3.Row:
    run = run_row(store, context["run_id"])
    if run["matter_id"] != context["matter_id"]:
        raise CoreError("BINDING_MISMATCH", "run belongs to another Matter")
    if require_open and (run["status"] != "running" or not bool(run["admission_open"])):
        raise CoreError("CANDIDATE_CLOSED", "Run admission is closed")
    return run


def current_sources(store: Store, matter_id: str, source_revision: int) -> list[dict[str, Any]]:
    rows = store.conn.execute(
        "SELECT s.id,s.version,s.text,s.digest FROM source AS s "
        "JOIN source_set AS ss ON ss.source_id=s.id AND ss.source_version=s.version "
        "WHERE ss.matter_id=? AND ss.revision=? ORDER BY s.id,s.version",
        (matter_id, source_revision),
    ).fetchall()
    return [dict(row) for row in rows]


def matter_view(store: Store, matter_id: str) -> dict[str, Any]:
    state = store.state_envelope(matter_id)
    matter = state["matter"]
    app = app_matter_row(store, matter_id)
    runs = [
        run_from_row(row)
        for row in store.conn.execute(
            "SELECT * FROM app_run WHERE matter_id=? ORDER BY started_at,id", (matter_id,)
        ).fetchall()
    ]
    return {
        "matter": matter,
        "sources": current_sources(store, matter_id, matter["source_version"]),
        "candidates": state["candidates"],
        "artifact": state["active_artifact"],
        "decisions": state["decisions"],
        "audits": state["audits"],
        "request_results": state["request_results"],
        "draft": "" if app is None else app["draft"],
        "title": matter_id if app is None else app["title"],
        "runs": runs,
        "core_state_digest": store.state_digest(matter_id),
    }


def list_matters(store: Store) -> list[dict[str, Any]]:
    rows = store.conn.execute("SELECT id,version,source_version,active_artifact FROM matter ORDER BY id").fetchall()
    result = []
    for row in rows:
        app = app_matter_row(store, row["id"])
        result.append({
            "id": row["id"],
            "title": row["id"] if app is None else app["title"],
            "version": row["version"],
            "source_version": row["source_version"],
            "active_artifact": row["active_artifact"],
        })
    return result


def create_matter(store: Store, payload: dict[str, Any]) -> dict[str, Any]:
    _exact_keys(payload, {"matter_id", "title", "source", "contract_version", "draft"}, "create_matter")
    _ident(payload["matter_id"], "matter_id")
    if not isinstance(payload["title"], str) or not payload["title"].strip() or len(payload["title"]) > 120:
        raise CoreError("INVALID", "title")
    if not isinstance(payload["draft"], str):
        raise CoreError("INVALID", "draft")
    _ident(payload["contract_version"], "contract_version")
    source = validate_source(payload["source"])
    if source["version"] != 1:
        raise CoreError("INVALID", "initial source version must be 1")
    if store.conn.execute("SELECT 1 FROM matter WHERE id=?", (payload["matter_id"],)).fetchone() is not None:
        raise CoreError("CONFLICT", "matter already exists")
    existing_source = store.conn.execute(
        "SELECT text,digest FROM source WHERE id=? AND version=?", (source["id"], source["version"])
    ).fetchone()
    if existing_source is not None and (existing_source["text"] != source["text"] or existing_source["digest"] != source["digest"]):
        raise CoreError("CONFLICT", "source id/version already has different content")
    store.conn.execute("BEGIN IMMEDIATE")
    try:
        store.conn.execute(
            "INSERT INTO matter(id,version,contract_version,source_version,active_artifact,obligations_json) VALUES(?,?,?,?,?,?)",
            (payload["matter_id"], 0, payload["contract_version"], 1, None, "[]"),
        )
        store.conn.execute(
            "INSERT OR IGNORE INTO source(id,version,text,digest) VALUES(?,?,?,?)",
            (source["id"], source["version"], source["text"], source["digest"]),
        )
        store.conn.execute(
            "INSERT INTO source_set(matter_id,source_id,source_version,revision) VALUES(?,?,?,?)",
            (payload["matter_id"], source["id"], source["version"], 1),
        )
        store.conn.execute(
            "INSERT INTO app_matter(matter_id,title,draft) VALUES(?,?,?)",
            (payload["matter_id"], payload["title"].strip(), payload["draft"]),
        )
        store.conn.commit()
    except Exception:
        store.conn.rollback()
        raise
    return {"matterId": payload["matter_id"], "source_revision": 1, "contract_version": payload["contract_version"]}


def create_run(store: Store, payload: dict[str, Any]) -> dict[str, Any]:
    expected = {
        "run_id", "matter_id", "base_version", "source_version", "contract_version",
        "preset_version", "session_ref", "instruction", "provider", "model", "provider_config",
    }
    _exact_keys(payload, expected, "create_run")
    for key in ("run_id", "matter_id", "contract_version", "instruction"):
        _ident(payload[key], f"run.{key}")
    for key in ("base_version", "source_version"):
        _version(payload[key], f"run.{key}")
    for key in ("preset_version", "session_ref", "provider", "model"):
        if payload[key] is not None and not isinstance(payload[key], str):
            raise CoreError("INVALID", f"run.{key}")
    provider_config = validate_provider_config(payload["provider_config"])
    if provider_config.get("provider") != payload["provider"] or provider_config.get("model") != payload["model"]:
        raise CoreError("BINDING_MISMATCH", "Run provider columns do not match frozen descriptor")
    if not payload["instruction"].strip():
        raise CoreError("INVALID", "instruction")
    matter = store._matter_row(payload["matter_id"])
    if payload["base_version"] != matter["version"]:
        raise CoreError("VERSION_CONFLICT", "run base version")
    if payload["source_version"] != matter["source_version"] or payload["contract_version"] != matter["contract_version"]:
        raise CoreError("STALE_INPUT", "run input binding")
    if store.conn.execute("SELECT 1 FROM app_run WHERE id=?", (payload["run_id"],)).fetchone() is not None:
        raise CoreError("CONFLICT", "run already exists")
    active = store.conn.execute(
        "SELECT id FROM app_run WHERE status IN ('running','stopping') ORDER BY started_at,id LIMIT 1"
    ).fetchone()
    if active is not None:
        raise CoreError("RUN_ACTIVE", "another Run is active")
    started_at = now_iso()
    store.conn.execute("BEGIN IMMEDIATE")
    try:
        store.conn.execute(
            "INSERT INTO app_run(id,matter_id,base_version,source_version,contract_version,preset_version,session_ref,instruction,provider,model,provider_config_json,status,admission_open,started_at,ended_at,error_json,candidate_id) "
            "VALUES(?,?,?,?,?,?,?,?,?,?,?, ?,1,?,?,?,?)",
            (
                payload["run_id"], payload["matter_id"], payload["base_version"], payload["source_version"],
                payload["contract_version"], payload["preset_version"], payload["session_ref"], payload["instruction"],
                payload["provider"], payload["model"], canonical_json(provider_config), "running", started_at, None, None, None,
            ),
        )
        store.conn.commit()
    except Exception:
        store.conn.rollback()
        raise
    return run_from_row(run_row(store, payload["run_id"]))


def update_run(store: Store, payload: dict[str, Any]) -> dict[str, Any]:
    expected = {"run_id", "status", "admission_open", "error", "candidate_id", "ended_at"}
    _exact_keys(payload, expected, "update_run")
    _ident(payload["run_id"], "run_id")
    if payload["status"] not in RUN_STATUSES:
        raise CoreError("INVALID", "run.status")
    if not isinstance(payload["admission_open"], bool):
        raise CoreError("INVALID", "run.admission_open")
    if payload["error"] is not None and not isinstance(payload["error"], dict):
        raise CoreError("INVALID", "run.error")
    if payload["candidate_id"] is not None:
        _ident(payload["candidate_id"], "run.candidate_id")
    if payload["ended_at"] is not None:
        _ident(payload["ended_at"], "run.ended_at")
    row = run_row(store, payload["run_id"])
    terminal = payload["status"] in {"completed", "failed", "cancelled", "unknown"}
    if terminal and payload["admission_open"]:
        raise CoreError("INVALID", "terminal Run cannot keep admission open")
    if not bool(row["admission_open"]) and payload["admission_open"]:
        raise CoreError("CONFLICT", "Run admission cannot be reopened")
    allowed_next = {
        "running": RUN_STATUSES,
        "stopping": frozenset({"stopping", "completed", "failed", "cancelled", "unknown"}),
        "completed": frozenset({"completed"}),
        "failed": frozenset({"failed"}),
        "cancelled": frozenset({"cancelled"}),
        "unknown": frozenset({"unknown"}),
    }
    if payload["status"] not in allowed_next[row["status"]]:
        raise CoreError("CONFLICT", "invalid Run status transition")
    if row["status"] in {"completed", "failed", "cancelled", "unknown"} and payload["status"] != row["status"]:
        raise CoreError("CONFLICT", "Run is already terminal")
    ended_at = payload["ended_at"]
    if terminal and ended_at is None:
        ended_at = now_iso()
    error_json = None if payload["error"] is None else canonical_json(payload["error"])
    store.conn.execute("BEGIN IMMEDIATE")
    try:
        store.conn.execute(
            "UPDATE app_run SET status=?,admission_open=?,ended_at=?,error_json=?,candidate_id=? WHERE id=?",
            (
                payload["status"], int(payload["admission_open"]), ended_at, error_json,
                payload["candidate_id"] if payload["candidate_id"] is not None else row["candidate_id"],
                payload["run_id"],
            ),
        )
        store.conn.commit()
    except Exception:
        store.conn.rollback()
        raise
    return run_from_row(run_row(store, payload["run_id"]))


def save_candidate(store: Store, payload: dict[str, Any]) -> dict[str, Any]:
    expected = {"payload", "context"}
    _exact_keys(payload, expected, "save_candidate")
    context = validate_context(payload["context"])
    candidate = payload["payload"]
    if not isinstance(candidate, dict):
        raise CoreError("INVALID", "candidate payload")
    # Core owns the exact Candidate schema and its idempotency hash.  Existing
    # idempotent retries remain queryable even after a Run has closed.
    existing = store.conn.execute("SELECT id FROM candidate WHERE id=?", (candidate.get("id"),)).fetchone()
    if existing is None:
        run = check_run_binding(store, context, require_open=True)
        if candidate.get("matter_id") != run["matter_id"] or candidate.get("run_id") != run["id"]:
            raise CoreError("BINDING_MISMATCH", "candidate is outside trusted Run")
        if candidate.get("base_version") != run["base_version"] or candidate.get("source_version") != run["source_version"] or candidate.get("contract_version") != run["contract_version"]:
            raise CoreError("STALE_INPUT", "candidate is outside trusted input binding")
    else:
        # Let frozen Core compare the canonical payload and return its original
        # result; do not turn a legitimate retry into CANDIDATE_CLOSED.
        store._matter_row(context["matter_id"])
    return store.save_candidate(candidate, context=RunContext(context["matter_id"], context["run_id"]))


def read_source(store: Store, payload: dict[str, Any]) -> dict[str, Any]:
    expected = {"source_id", "version", "context"}
    _exact_keys(payload, expected, "read_source")
    context = validate_context(payload["context"])
    run = check_run_binding(store, context, require_open=True)
    matter = store._matter_row(context["matter_id"])
    if run["source_version"] != matter["source_version"]:
        raise CoreError("STALE_INPUT", "source revision changed")
    _ident(payload["source_id"], "source_id")
    _version(payload["version"], "source_version")
    return store.read_source(payload["source_id"], payload["version"], matter_id=context["matter_id"])


def trusted_decide(store: Store, payload: dict[str, Any], reviewer: TrustedReviewer) -> dict[str, Any]:
    _exact_keys(payload, {"request"}, "trusted_decide")
    request = payload["request"]
    if not isinstance(request, dict):
        raise CoreError("INVALID", "decision request")
    # TrustedReviewer supplies the only capability.  No actor field is
    # accepted here; Store.decide uses its fixed trusted actor by default.
    return reviewer.decide(request)


def operation(store: Store, request: dict[str, Any], reviewer: TrustedReviewer) -> Any:
    op = request.get("op")
    if not isinstance(op, str):
        raise CoreError("INVALID", "missing operation")
    if op == "create_matter":
        return create_matter(store, request_payload(request, {"matter_id", "title", "source", "contract_version", "draft"}))
    if op == "list_matters":
        request_payload(request, set())
        return {"matters": list_matters(store)}
    if op == "get_matter":
        payload = request_payload(request, {"matter_id"})
        _ident(payload["matter_id"], "matter_id")
        store._matter_row(payload["matter_id"])
        return matter_view(store, payload["matter_id"])
    if op == "save_draft":
        payload = request_payload(request, {"matter_id", "text"})
        _ident(payload["matter_id"], "matter_id")
        if not isinstance(payload["text"], str) or len(payload["text"]) > 100_000 or "\x00" in payload["text"]:
            raise CoreError("INVALID", "draft")
        store._matter_row(payload["matter_id"])
        store.conn.execute("BEGIN IMMEDIATE")
        try:
            updated = store.conn.execute("UPDATE app_matter SET draft=? WHERE matter_id=?", (payload["text"], payload["matter_id"])).rowcount
            if updated != 1:
                raise CoreError("NOT_FOUND", "app matter")
            store.conn.commit()
        except Exception:
            store.conn.rollback()
            raise
        return {"saved": True}
    if op == "create_run":
        return create_run(store, request_payload(request, {
            "run_id", "matter_id", "base_version", "source_version", "contract_version",
            "preset_version", "session_ref", "instruction", "provider", "model", "provider_config",
        }))
    if op == "get_run":
        payload = request_payload(request, {"run_id"})
        return run_from_row(run_row(store, payload["run_id"]))
    if op == "update_run":
        return update_run(store, request_payload(request, {"run_id", "status", "admission_open", "error", "candidate_id", "ended_at"}))
    if op == "read_source":
        return read_source(store, request_payload(request, {"source_id", "version", "context"}))
    if op == "save_candidate":
        return save_candidate(store, request_payload(request, {"payload", "context"}))
    if op == "trusted_decide":
        return trusted_decide(store, request_payload(request, {"request"}), reviewer)
    if op == "query_request":
        payload = request_payload(request, {"request_id"})
        _ident(payload["request_id"], "request_id")
        return store.query_request(payload["request_id"])
    if op == "snapshot":
        payload = request_payload(request, {"matter_id"}) if "matter_id" in request else request_payload(request, set())
        if payload:
            _ident(payload["matter_id"], "matter_id")
            store._matter_row(payload["matter_id"])
            return matter_view(store, payload["matter_id"])
        return {
            "matters": [matter_view(store, item["id"]) for item in store.conn.execute("SELECT id FROM matter ORDER BY id").fetchall()],
            "pragmas": store.pragma_values(),
            "integrity": store.integrity(),
        }
    if op == "close":
        request_payload(request, set())
        return {"closed": True}
    raise CoreError("INVALID", f"unknown bridge operation: {op}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", required=True)
    parser.add_argument("--mode", choices=("b0",), default="b0")
    args = parser.parse_args()
    threading.Thread(target=watch_parent_process, args=(os.getppid(),), daemon=True).start()
    store: Store | None = None
    try:
        store = open_or_initialize(Path(args.db))
        reviewer = TrustedReviewer(store)
        send({"ready": True, "mode": "b0", "core_schema_version": CORE_SCHEMA_VERSION, "app_schema_version": APP_SCHEMA_VERSION})
        for line in sys.stdin:
            if not line.strip():
                continue
            request: dict[str, Any] | None = None
            try:
                request = parse_json(line)
                if not isinstance(request, dict):
                    raise CoreError("INVALID", "request must be object")
                if set(request) < {"id", "op"}:
                    raise CoreError("INVALID", "wire request requires id and op")
                _ident(request.get("id"), "request.id")
                result = operation(store, request, reviewer)
                send({"id": request["id"], "ok": True, "result": result})
                if request.get("op") == "close":
                    break
            except Exception as exc:
                request_id = request.get("id") if isinstance(locals().get("request"), dict) else None
                send({"id": request_id, "ok": False, "error": error_value(exc)})
    except Exception as exc:
        send({"ready": False, "error": error_value(exc)})
        return 1
    finally:
        if store is not None:
            close_store(store)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
