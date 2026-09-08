"""Deterministic local Core experiment for MVP-03.

This module deliberately has no provider, network, GUI, shell, or global-state
dependency.  It is an experiment implementation, not the product Core.
"""

from __future__ import annotations

import hashlib
import json
import os
import signal
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Iterable


TRUSTED_ACTOR = {"kind": "local_reviewer", "id": "reviewer-1"}
ALLOWED_ACTIONS = {"accept", "reject", "request_evidence"}
HOOKS = (
    "before_begin",
    "after_audit",
    "after_artifact",
    "after_state",
    "before_commit",
    "after_commit_before_ack",
)
EVENT_TYPES = frozenset(("MatterCreated", "CandidateSaved", "SourceSetChanged", "DecisionRecorded"))


class CoreError(Exception):
    """A contract-level deterministic error."""

    def __init__(self, code: str, detail: str = "") -> None:
        self.code = code
        self.detail = detail
        super().__init__(f"{code}{': ' + detail if detail else ''}")


def _reject_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for key, value in pairs:
        if key in out:
            raise CoreError("INVALID", f"duplicate JSON key: {key}")
        out[key] = value
    return out


def parse_json(text: str) -> Any:
    try:
        return json.loads(text, object_pairs_hook=_reject_duplicate_keys,
                          parse_constant=lambda x: (_ for _ in ()).throw(CoreError("INVALID", x)))
    except CoreError:
        raise
    except (TypeError, ValueError, json.JSONDecodeError) as exc:
        raise CoreError("INVALID", str(exc)) from exc


def canonical_json(value: Any) -> str:
    try:
        return json.dumps(value, ensure_ascii=False, sort_keys=True,
                          separators=(",", ":"), allow_nan=False)
    except (TypeError, ValueError) as exc:
        raise CoreError("INVALID", str(exc)) from exc


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _ident(value: Any, name: str) -> str:
    if not isinstance(value, str) or not value:
        raise CoreError("INVALID", f"{name} must be non-empty string")
    return value


def _version(value: Any, name: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise CoreError("INVALID", f"{name} must be non-negative integer")
    return value


def _exact_keys(value: Any, expected: set[str], name: str) -> None:
    if not isinstance(value, dict):
        raise CoreError("INVALID", f"{name} must be object")
    got = set(value)
    if got != expected:
        extra = sorted(got - expected)
        missing = sorted(expected - got)
        raise CoreError("INVALID", f"{name} keys extra={extra} missing={missing}")


def digest_source(text: str) -> str:
    """Source.digest is the SHA-256 of the original UTF-8 bytes."""
    return sha256_text(text)


def validate_evidence(evidence: Any) -> dict[str, Any]:
    _exact_keys(evidence, {"source_id", "source_version", "start", "end", "quote", "digest"}, "evidence")
    _ident(evidence["source_id"], "evidence.source_id")
    _version(evidence["source_version"], "evidence.source_version")
    for key in ("start", "end"):
        _version(evidence[key], f"evidence.{key}")
    if evidence["end"] < evidence["start"]:
        raise CoreError("INVALID", "evidence range is reversed")
    _ident(evidence["quote"], "evidence.quote")
    _ident(evidence["digest"], "evidence.digest")
    return evidence


def validate_obligation(value: Any) -> dict[str, Any]:
    _exact_keys(value, {"id", "text", "status", "blocking", "evidence_refs"}, "obligation")
    _ident(value["id"], "obligation.id")
    _ident(value["text"], "obligation.text")
    if value["status"] not in {"open", "resolved"}:
        raise CoreError("INVALID", "obligation.status")
    if not isinstance(value["blocking"], bool):
        raise CoreError("INVALID", "obligation.blocking")
    if not isinstance(value["evidence_refs"], list):
        raise CoreError("INVALID", "obligation.evidence_refs")
    for ref in value["evidence_refs"]:
        validate_evidence(ref)
    return value


def validate_candidate_payload(value: Any) -> dict[str, Any]:
    expected = {
        "id", "matter_id", "run_id", "base_version", "contract_version",
        "source_version", "artifact_text", "evidence", "obligations",
    }
    _exact_keys(value, expected | (set(value) & {"domain", "supersedes", "provenance"}), "candidate")
    if "domain" in value:
        domain = value["domain"]
        if not isinstance(domain, dict) or domain.get("schemaVersion") != 1:
            raise CoreError("CONTRACT_UNSUPPORTED", "domain envelope version")
    if "provenance" in value:
        p = value["provenance"]
        _exact_keys(p, {"kind", "actor"}, "provenance")
        if p != {"kind":"human_revision", "actor":"local-user"}:
            raise CoreError("INVALID", "provenance")
    if "supersedes" in value:
        _ident(value["supersedes"], "candidate.supersedes")
    for key in ("id", "matter_id", "run_id", "contract_version"):
        _ident(value[key], f"candidate.{key}")
    for key in ("base_version", "source_version"):
        _version(value[key], f"candidate.{key}")
    if not isinstance(value["artifact_text"], str) or not value["artifact_text"]:
        raise CoreError("INVALID", "candidate.artifact_text")
    if ("\x00" in value["artifact_text"] or value["artifact_text"].startswith("/")
            or "../" in value["artifact_text"] or "..\\" in value["artifact_text"]
            or "://" in value["artifact_text"]):
        raise CoreError("INVALID", "candidate.artifact_text cannot reference an external path")
    if not isinstance(value["evidence"], list):
        raise CoreError("INVALID", "candidate.evidence")
    for item in value["evidence"]:
        validate_evidence(item)
    if not isinstance(value["obligations"], list):
        raise CoreError("INVALID", "candidate.obligations")
    for item in value["obligations"]:
        validate_obligation(item)
    # The contract keeps the evidence order and does not Unicode-normalize it.
    return value


def validate_decision_request(value: Any) -> dict[str, Any]:
    _exact_keys(value, {"request_id", "matter_id", "candidate_id", "base_version", "action", "reason"}, "decision")
    for key in ("request_id", "matter_id", "candidate_id", "reason"):
        _ident(value[key], f"decision.{key}")
    _version(value["base_version"], "decision.base_version")
    if value["action"] not in ALLOWED_ACTIONS:
        raise CoreError("INVALID", "decision.action")
    return value


SCHEMA = """
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS matter (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL CHECK(version >= 0),
  contract_version TEXT NOT NULL,
  source_version INTEGER NOT NULL CHECK(source_version >= 0),
  active_artifact TEXT,
  obligations_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS source (
  id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK(version >= 0),
  text TEXT NOT NULL,
  digest TEXT NOT NULL,
  PRIMARY KEY(id, version)
);
CREATE TABLE IF NOT EXISTS source_set (
  matter_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_version INTEGER NOT NULL,
  revision INTEGER NOT NULL CHECK(revision >= 0),
  PRIMARY KEY(matter_id, source_id),
  FOREIGN KEY(matter_id) REFERENCES matter(id),
  FOREIGN KEY(source_id, source_version) REFERENCES source(id, version)
);
CREATE TABLE IF NOT EXISTS source_history (
  matter_id TEXT NOT NULL, source_id TEXT NOT NULL, source_version INTEGER NOT NULL, revision INTEGER NOT NULL,
  PRIMARY KEY(matter_id,revision,source_id),
  FOREIGN KEY(matter_id) REFERENCES matter(id),
  FOREIGN KEY(source_id,source_version) REFERENCES source(id,version)
);
CREATE TRIGGER IF NOT EXISTS retain_source_membership AFTER INSERT ON source_set BEGIN
  INSERT OR IGNORE INTO source_history VALUES(NEW.matter_id,NEW.source_id,NEW.source_version,NEW.revision);
END;
CREATE TABLE IF NOT EXISTS candidate (
  id TEXT PRIMARY KEY,
  matter_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  base_version INTEGER NOT NULL CHECK(base_version >= 0),
  contract_version TEXT NOT NULL,
  source_version INTEGER NOT NULL CHECK(source_version >= 0),
  artifact_text TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  obligations_json TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  save_result_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending','accepted','rejected','needs_evidence')),
  FOREIGN KEY(matter_id) REFERENCES matter(id)
);
CREATE TABLE IF NOT EXISTS artifact (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  candidate_hash TEXT NOT NULL,
  content TEXT NOT NULL,
  content_digest TEXT NOT NULL,
  FOREIGN KEY(candidate_id) REFERENCES candidate(id)
);
CREATE TABLE IF NOT EXISTS request_result (
  request_id TEXT PRIMARY KEY,
  request_hash TEXT NOT NULL,
  result_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS decision (
  request_id TEXT PRIMARY KEY,
  matter_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  action TEXT NOT NULL,
  reason TEXT NOT NULL,
  actor_json TEXT NOT NULL,
  scope_json TEXT NOT NULL,
  result_json TEXT NOT NULL,
  FOREIGN KEY(matter_id) REFERENCES matter(id),
  FOREIGN KEY(candidate_id) REFERENCES candidate(id)
);
CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL UNIQUE,
  matter_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_json TEXT NOT NULL,
  scope_json TEXT NOT NULL,
  result_json TEXT NOT NULL,
  FOREIGN KEY(matter_id) REFERENCES matter(id),
  FOREIGN KEY(candidate_id) REFERENCES candidate(id)
);
CREATE TABLE IF NOT EXISTS event (
  event_id TEXT PRIMARY KEY,
  event_version INTEGER NOT NULL CHECK(event_version = 1),
  event_type TEXT NOT NULL CHECK(event_type IN ('MatterCreated','CandidateSaved','SourceSetChanged','DecisionRecorded')),
  identity_json TEXT NOT NULL,
  payload_json TEXT NOT NULL
);
"""


def _row_json(conn: sqlite3.Connection, query: str, args: Iterable[Any] = ()) -> Any:
    row = conn.execute(query, tuple(args)).fetchone()
    return None if row is None else parse_json(row[0])


@dataclass
class HookController:
    kill_stage: str | None = None
    callback: Callable[[str], None] | None = None

    def hit(self, stage: str) -> None:
        if self.callback:
            self.callback(stage)
        if self.kill_stage == stage:
            # This is intentionally a real SIGKILL.  The parent process records
            # the -9 exit and reopens the DB to inspect SQLite recovery.
            os.kill(os.getpid(), signal.SIGKILL)


@dataclass(frozen=True)
class RunContext:
    """Trusted binding supplied by the host for a model tool surface."""

    matter_id: str
    run_id: str

    def __post_init__(self) -> None:
        _ident(self.matter_id, "run_context.matter_id")
        _ident(self.run_id, "run_context.run_id")


class Store:
    """B0 State+audit or B1 event-authority+projection store."""

    def __init__(self, db_path: str | Path, mode: str = "b0", hooks: HookController | None = None) -> None:
        if mode not in {"b0", "b1"}:
            raise ValueError(mode)
        self.db_path = Path(db_path)
        self.mode = mode
        self.hooks = hooks or HookController(os.environ.get("CORE_KILL_HOOK"))
        self.conn = sqlite3.connect(self.db_path, timeout=5.0, isolation_level=None,
                                    check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self._configure()
        schema_version = self.conn.execute("PRAGMA user_version").fetchone()[0]
        if schema_version > 1:
            self.conn.close()
            raise CoreError("SCHEMA_NEWER", f"unsupported user_version={schema_version}")

    def _configure(self) -> None:
        self.conn.execute("PRAGMA journal_mode=DELETE")
        self.conn.execute("PRAGMA synchronous=FULL")
        self.conn.execute("PRAGMA foreign_keys=ON")
        self.conn.execute("PRAGMA busy_timeout=5000")
        self.conn.execute("PRAGMA locking_mode=NORMAL")

    def pragma_values(self) -> dict[str, Any]:
        names = ("journal_mode", "synchronous", "foreign_keys", "busy_timeout", "locking_mode")
        return {name: self.conn.execute(f"PRAGMA {name}").fetchone()[0] for name in names}

    @classmethod
    def create_initial(cls, db_path: str | Path, fixture_path: str | Path, mode: str = "b0",
                       initial_obligations: list[dict[str, Any]] | None = None) -> "Store":
        db = Path(db_path)
        db.parent.mkdir(parents=True, exist_ok=True)
        if db.exists():
            db.unlink()
        store = cls(db, mode=mode)
        fixture = json.loads(Path(fixture_path).read_text(encoding="utf-8"))
        store.conn.executescript(SCHEMA)
        store.conn.execute("INSERT OR REPLACE INTO meta(key,value) VALUES('mode',?)", (mode,))
        store.conn.execute("INSERT OR REPLACE INTO meta(key,value) VALUES('schema_version','1')")
        store.conn.execute("PRAGMA user_version=1")
        initial = fixture["initial"]
        if initial_obligations is not None:
            initial = dict(initial)
            initial["obligations"] = initial_obligations
        store._obligation_map(initial["obligations"])
        source = fixture["source"]
        store.conn.execute("BEGIN IMMEDIATE")
        try:
            store.conn.execute(
                "INSERT INTO matter(id,version,contract_version,source_version,active_artifact,obligations_json) VALUES(?,?,?,?,?,?)",
                (initial["matter_id"], initial["version"], initial["contract_version"],
                 initial["source_revision"], None, canonical_json(initial["obligations"])),
            )
            store.conn.execute("INSERT INTO source(id,version,text,digest) VALUES(?,?,?,?)",
                               (source["id"], source["version"], source["text"], source["digest"]))
            store.conn.execute("INSERT INTO source_set(matter_id,source_id,source_version,revision) VALUES(?,?,?,?)",
                               (initial["matter_id"], source["id"], source["version"], initial["source_revision"]))
            if mode == "b1":
                store._insert_event(
                    "matter:m-1", "MatterCreated",
                    {"matter": {"id": initial["matter_id"], "version": initial["version"],
                                 "contract_version": initial["contract_version"],
                                 "source_version": initial["source_revision"],
                                 "active_artifact": None, "obligations": initial["obligations"]}},
                    {"matter_id": initial["matter_id"]},
                )
                store._insert_event(
                    "source-set:m-1:1", "SourceSetChanged",
                    {"matter_id": initial["matter_id"], "source_revision": initial["source_revision"],
                     "sources": [source]},
                    {"matter_id": initial["matter_id"], "source_revision": initial["source_revision"]},
                )
            store.conn.commit()
        except Exception:
            store.conn.rollback()
            store.close()
            raise
        return store

    def close(self) -> None:
        self.conn.close()

    def _insert_event(self, event_id: str, event_type: str, payload: Any, identity: Any) -> None:
        self.conn.execute(
            "INSERT INTO event(event_id,event_version,event_type,identity_json,payload_json) VALUES(?,?,?,?,?)",
            (event_id, 1, event_type, canonical_json(identity), canonical_json(payload)),
        )

    def _begin(self) -> None:
        self.hooks.hit("before_begin")
        try:
            self.conn.execute("BEGIN IMMEDIATE")
        except sqlite3.OperationalError as exc:
            if "locked" in str(exc).lower() or "busy" in str(exc).lower():
                raise CoreError("BUSY_RETRYABLE", str(exc)) from exc
            raise

    def _rollback(self) -> None:
        try:
            self.conn.rollback()
        except sqlite3.Error:
            pass

    def _matter_row(self, matter_id: str) -> sqlite3.Row:
        row = self.conn.execute("SELECT * FROM matter WHERE id=?", (matter_id,)).fetchone()
        if row is None:
            raise CoreError("NOT_FOUND", "matter")
        return row

    def _candidate_row(self, candidate_id: str) -> sqlite3.Row:
        row = self.conn.execute("SELECT * FROM candidate WHERE id=?", (candidate_id,)).fetchone()
        if row is None:
            raise CoreError("NOT_FOUND", "candidate")
        return row

    @staticmethod
    def _candidate_from_row(row: sqlite3.Row) -> dict[str, Any]:
        return {
            "id": row["id"], "matter_id": row["matter_id"], "run_id": row["run_id"],
            "base_version": row["base_version"], "contract_version": row["contract_version"],
            "source_version": row["source_version"], "artifact_text": row["artifact_text"],
            "evidence": parse_json(row["evidence_json"]),
            "obligations": parse_json(row["obligations_json"]), "status": row["status"],
            **{k: v for k, v in parse_json(row["payload_json"]).items() if k in {"domain", "supersedes", "provenance"}},
        }

    def save_candidate(self, payload: dict[str, Any], context: RunContext | None = None) -> dict[str, Any]:
        validate_candidate_payload(payload)
        if context is not None:
            if (payload["matter_id"] != context.matter_id
                    or payload["run_id"] != context.run_id):
                raise CoreError("BINDING_MISMATCH", "candidate is outside trusted Run context")
            self._matter_row(context.matter_id)
        # status is server-derived, never a client field.
        payload_text = canonical_json(payload)
        payload_hash = sha256_text(payload_text)
        result = {"candidate_id": payload["id"], "status": "pending"}
        result_text = canonical_json(result)
        self._begin()
        try:
            existing = self.conn.execute("SELECT payload_hash,save_result_json FROM candidate WHERE id=?",
                                         (payload["id"],)).fetchone()
            if existing is not None:
                if existing["payload_hash"] != payload_hash:
                    raise CoreError("IDEMPOTENCY_CONFLICT", "candidate id has different canonical payload")
                self.conn.commit()
                return parse_json(existing["save_result_json"])
            if payload.get("supersedes"):
                parent = self._candidate_row(payload["supersedes"])
                if parent["matter_id"] != payload["matter_id"] or parent["id"] == payload["id"]:
                    raise CoreError("BINDING_MISMATCH", "candidate lineage")
            self.conn.execute(
                "INSERT INTO candidate(id,matter_id,run_id,base_version,contract_version,source_version,artifact_text,evidence_json,obligations_json,payload_json,payload_hash,save_result_json,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (payload["id"], payload["matter_id"], payload["run_id"], payload["base_version"],
                 payload["contract_version"], payload["source_version"], payload["artifact_text"],
                 canonical_json(payload["evidence"]), canonical_json(payload["obligations"]),
                 payload_text, payload_hash, result_text, "pending"),
            )
            if self.mode == "b1":
                self._insert_event(
                    f"candidate:{payload['id']}", "CandidateSaved",
                    {"candidate": payload | {"status": "pending"}, "save_result": result},
                    {"candidate_id": payload["id"]},
                )
            self.conn.commit()
            return result
        except Exception:
            self._rollback()
            raise

    def read_source(self, source_id: str, version: int, matter_id: str | None = None, revision: int | None = None) -> dict[str, Any]:
        _ident(source_id, "source_id")
        _version(version, "source_version")
        if matter_id is None:
            row = self.conn.execute("SELECT id,version,text,digest FROM source WHERE id=? AND version=?",
                                    (source_id, version)).fetchone()
        else:
            _ident(matter_id, "matter_id")
            matter = self._matter_row(matter_id)
            row = self.conn.execute(
                "SELECT s.id,s.version,s.text,s.digest FROM source AS s "
                "JOIN source_history AS ss ON ss.source_id=s.id AND ss.source_version=s.version "
                "WHERE ss.matter_id=? AND ss.revision=? AND s.id=? AND s.version=?",
                (matter_id, matter["source_version"] if revision is None else revision, source_id, version),
            ).fetchone()
            if row is None:
                exists = self.conn.execute("SELECT 1 FROM source WHERE id=? AND version=?",
                                           (source_id, version)).fetchone()
                if exists is not None:
                    raise CoreError("BINDING_MISMATCH", "source is outside trusted Matter")
        if row is None:
            raise CoreError("NOT_FOUND", "source")
        return dict(row)

    def seed_matter_for_fixture(self, matter_id: str, source: dict[str, Any],
                                version: int = 0, contract_version: str = "contract-1",
                                source_revision: int = 1,
                                obligations: list[dict[str, Any]] | None = None) -> None:
        """Trusted fixture setup; this method is never exposed to model JSON."""
        _ident(matter_id, "matter_id")
        _version(version, "matter.version")
        _ident(contract_version, "matter.contract_version")
        _version(source_revision, "matter.source_version")
        if obligations is None:
            obligations = []
        self._obligation_map(obligations)
        if not isinstance(source, dict) or set(source) != {"id", "version", "text", "digest"}:
            raise CoreError("INVALID", "fixture source shape")
        _ident(source["id"], "source.id")
        _version(source["version"], "source.version")
        if not isinstance(source["text"], str) or not isinstance(source["digest"], str):
            raise CoreError("INVALID", "fixture source text/digest")
        if digest_source(source["text"]) != source["digest"]:
            raise CoreError("INVALID", "fixture source digest")
        self._begin()
        try:
            self.conn.execute(
                "INSERT INTO matter(id,version,contract_version,source_version,active_artifact,obligations_json) VALUES(?,?,?,?,?,?)",
                (matter_id, version, contract_version, source_revision, None, canonical_json(obligations)),
            )
            self.conn.execute("INSERT OR IGNORE INTO source(id,version,text,digest) VALUES(?,?,?,?)",
                              (source["id"], source["version"], source["text"], source["digest"]))
            self.conn.execute("INSERT INTO source_set(matter_id,source_id,source_version,revision) VALUES(?,?,?,?)",
                              (matter_id, source["id"], source["version"], source_revision))
            if self.mode == "b1":
                self._insert_event(
                    f"matter:{matter_id}", "MatterCreated",
                    {"matter": {"id": matter_id, "version": version, "contract_version": contract_version,
                                 "source_version": source_revision, "active_artifact": None,
                                 "obligations": obligations}},
                    {"matter_id": matter_id},
                )
                self._insert_event(
                    f"source-set:{matter_id}:{source_revision}", "SourceSetChanged",
                    {"matter_id": matter_id, "source_revision": source_revision, "sources": [source]},
                    {"matter_id": matter_id, "source_revision": source_revision},
                )
            self.conn.commit()
        except Exception:
            self._rollback()
            raise

    def replace_source_set(self, matter_id: str, sources: list[dict[str, Any]], revision: int) -> None:
        """Trusted source-set mutation used by the stale-input fixture."""
        if not isinstance(sources, list) or not sources:
            raise CoreError("INVALID", "source set must be non-empty list")
        _version(revision, "source_revision")
        for source in sources:
            if not isinstance(source, dict) or set(source) != {"id", "version", "text", "digest"}:
                raise CoreError("INVALID", "source shape")
            _ident(source["id"], "source.id")
            _version(source["version"], "source.version")
            if not isinstance(source["text"], str) or digest_source(source["text"]) != source["digest"]:
                raise CoreError("INVALID", "source digest")
        self._begin()
        try:
            matter = self._matter_row(matter_id)
            if revision <= matter["source_version"]:
                raise CoreError("VERSION_CONFLICT", "source revision must increase")
            for source in sources:
                prior = self.conn.execute("SELECT text,digest FROM source WHERE id=? AND version=?", (source["id"],source["version"])).fetchone()
                if prior and (prior["text"] != source["text"] or prior["digest"] != source["digest"]):
                    raise CoreError("IDEMPOTENCY_CONFLICT", "immutable source bytes")
                self.conn.execute("INSERT OR IGNORE INTO source(id,version,text,digest) VALUES(?,?,?,?)",
                                  (source["id"], source["version"], source["text"], source["digest"]))
            self.conn.execute("DELETE FROM source_set WHERE matter_id=?", (matter_id,))
            for source in sources:
                self.conn.execute("INSERT INTO source_set(matter_id,source_id,source_version,revision) VALUES(?,?,?,?)",
                                  (matter_id, source["id"], source["version"], revision))
            self.conn.execute("UPDATE matter SET source_version=? WHERE id=?", (revision, matter_id))
            if self.mode == "b1":
                self._insert_event(
                    f"source-set:{matter_id}:{revision}", "SourceSetChanged",
                    {"matter_id": matter_id, "source_revision": revision, "sources": sources},
                    {"matter_id": matter_id, "source_revision": revision},
                )
            self.conn.commit()
        except Exception:
            self._rollback()
            raise

    def inject_source_revision_in_transaction(self, matter_id: str, revision: int) -> None:
        """Trusted fault-injector operation; caller must already own a tx."""
        _version(revision, "source_revision")
        self.conn.execute("UPDATE matter SET source_version=? WHERE id=?", (revision, matter_id))

    def _scope_for(self, request: dict[str, Any], candidate: sqlite3.Row) -> dict[str, Any]:
        return {
            "matter_id": candidate["matter_id"], "run_id": candidate["run_id"],
            "candidate_id": candidate["id"], "base_version": candidate["base_version"],
        }

    def _check_cas(self, request: dict[str, Any], candidate: sqlite3.Row, matter: sqlite3.Row) -> None:
        if request["base_version"] != matter["version"] or candidate["base_version"] != matter["version"]:
            raise CoreError("VERSION_CONFLICT", "matter CAS mismatch")

    @staticmethod
    def _validate_actor(actor: dict[str, Any]) -> dict[str, Any]:
        _exact_keys(actor, {"kind", "id"}, "actor")
        _ident(actor["kind"], "actor.kind")
        _ident(actor["id"], "actor.id")
        return actor

    def _decision_hash(self, request: dict[str, Any], scope: dict[str, Any],
                       actor: dict[str, Any] = TRUSTED_ACTOR) -> str:
        return sha256_text(canonical_json({"request": request, "actor": actor, "scope": scope}))

    def _check_existing_request(self, request: dict[str, Any], scope: dict[str, Any],
                                actor: dict[str, Any] = TRUSTED_ACTOR) -> dict[str, Any] | None:
        row = self.conn.execute("SELECT request_hash,result_json FROM request_result WHERE request_id=?",
                                (request["request_id"],)).fetchone()
        if row is None:
            return None
        if row["request_hash"] != self._decision_hash(request, scope, actor):
            raise CoreError("IDEMPOTENCY_CONFLICT", "request id has different payload/actor/scope")
        return parse_json(row["result_json"])

    def _verify_evidence(self, evidence: list[Any], current_source_revision: int,
                         matter_id: str | None = None) -> None:
        for raw in evidence:
            item = validate_evidence(raw)
            row = self.conn.execute("SELECT text,version,digest FROM source WHERE id=? AND version=?",
                                    (item["source_id"], item["source_version"])).fetchone()
            if row is None:
                raise CoreError("EVIDENCE_INVALID", "source version missing")
            if matter_id is not None:
                bound = self.conn.execute(
                    "SELECT 1 FROM source_set WHERE matter_id=? AND source_id=? AND source_version=? AND revision=?",
                    (matter_id, item["source_id"], item["source_version"], current_source_revision),
                ).fetchone()
                if bound is None:
                    raise CoreError("EVIDENCE_INVALID", "source is not in current approved set")
            if row["digest"] != item["digest"]:
                raise CoreError("EVIDENCE_INVALID", "source digest mismatch")
            text = row["text"]
            if text[item["start"]:item["end"]] != item["quote"]:
                raise CoreError("EVIDENCE_INVALID", "coordinate does not resolve to quote")

    def _recheck_binding(self, request: dict[str, Any], candidate: sqlite3.Row,
                         checked_matter: sqlite3.Row) -> None:
        """Re-read mutable bindings after the audit hook and before state commit."""
        current = self._matter_row(request["matter_id"])
        if current["version"] != checked_matter["version"] or candidate["base_version"] != current["version"]:
            raise CoreError("VERSION_CONFLICT", "matter changed after precheck")
        if (candidate["contract_version"] != current["contract_version"]
                or candidate["source_version"] != current["source_version"]):
            raise CoreError("STALE_INPUT", "source/contract changed after precheck")

    @staticmethod
    def _obligation_map(raw: list[Any]) -> dict[str, dict[str, Any]]:
        out: dict[str, dict[str, Any]] = {}
        for item in raw:
            validate_obligation(item)
            if item["id"] in out:
                raise CoreError("OBLIGATION_INVALID", "duplicate obligation id")
            out[item["id"]] = item
        return out

    def _check_obligations(self, existing_raw: list[Any], proposed_raw: list[Any], action: str,
                           matter_id: str | None = None, source_revision: int = 1) -> list[dict[str, Any]]:
        existing = self._obligation_map(existing_raw)
        proposed = self._obligation_map(proposed_raw)
        if action != "accept":
            # A reject or request-for-evidence does not mutate Matter obligations.
            return existing_raw
        for oid, old in existing.items():
            new = proposed.get(oid)
            if new is None:
                raise CoreError("OBLIGATION_INVALID", f"existing obligation omitted: {oid}")
            if new["text"] != old["text"] or new["blocking"] != old["blocking"]:
                raise CoreError("OBLIGATION_INVALID", f"obligation identity changed: {oid}")
            if old["status"] == "open" and new["status"] == "resolved":
                if not new["evidence_refs"]:
                    raise CoreError("OBLIGATION_INVALID", f"unjustified closure: {oid}")
                try:
                    self._verify_evidence(new["evidence_refs"], source_revision, matter_id)
                except CoreError as exc:
                    raise CoreError("OBLIGATION_INVALID", f"invalid closure evidence: {oid}") from exc
            if old["status"] == "resolved" and new["status"] == "open":
                raise CoreError("OBLIGATION_INVALID", f"resolved obligation reopened: {oid}")
        if any(item["status"] == "open" and item["blocking"]
               and proposed[item["id"]]["status"] == "open"
               for item in existing.values()):
            raise CoreError("OBLIGATION_OPEN", "blocking obligation remains open")
        # Candidate obligations are proposals.  A trusted accept promotes new
        # open proposals atomically, while a resolved proposal is only valid
        # for an existing obligation with source-backed closure evidence above.
        transitions = [
            proposed[oid] if existing[oid]["status"] == "open"
            and proposed[oid]["status"] == "resolved" else old
            for oid, old in existing.items()
        ]
        additions: list[dict[str, Any]] = []
        for oid, item in proposed.items():
            if oid in existing:
                continue
            if item["status"] != "open":
                raise CoreError("OBLIGATION_INVALID", f"new obligation must start open: {oid}")
            additions.append(item)
        return transitions + additions

    def _active_artifact(self, artifact_id: str | None) -> dict[str, Any] | None:
        if artifact_id is None:
            return None
        row = self.conn.execute("SELECT * FROM artifact WHERE id=?", (artifact_id,)).fetchone()
        return None if row is None else {
            "id": row["id"], "candidate_id": row["candidate_id"],
            "candidate_hash": row["candidate_hash"], "content": row["content"],
            "content_digest": row["content_digest"],
        }

    def _full_state(self, matter_id: str) -> dict[str, Any]:
        m = self._matter_row(matter_id)
        candidates = [self._candidate_from_row(r) for r in self.conn.execute(
            "SELECT * FROM candidate WHERE matter_id=? ORDER BY id", (matter_id,)).fetchall()]
        decisions = [dict(r) for r in self.conn.execute(
            "SELECT request_id,matter_id,candidate_id,action,reason,actor_json,scope_json,result_json FROM decision WHERE matter_id=? ORDER BY request_id",
            (matter_id,)).fetchall()]
        for d in decisions:
            d["actor"] = parse_json(d.pop("actor_json"))
            d["scope"] = parse_json(d.pop("scope_json"))
            d["result"] = parse_json(d.pop("result_json"))
        audits = [dict(r) for r in self.conn.execute(
            "SELECT request_id,matter_id,candidate_id,action,actor_json,scope_json,result_json FROM audit WHERE matter_id=? ORDER BY id",
            (matter_id,)).fetchall()]
        for a in audits:
            a["actor"] = parse_json(a.pop("actor_json"))
            a["scope"] = parse_json(a.pop("scope_json"))
            a["result"] = parse_json(a.pop("result_json"))
        return {
            "matter": {
                "id": m["id"], "version": m["version"], "contract_version": m["contract_version"],
                "source_version": m["source_version"], "active_artifact": m["active_artifact"],
                "obligations": parse_json(m["obligations_json"]),
            },
            "active_artifact": self._active_artifact(m["active_artifact"]),
            "candidates": candidates,
            "decisions": decisions,
            "audits": audits,
            # request_result is globally keyed for idempotency, but a Matter
            # snapshot must not expose another Matter's results.
            "request_results": [dict(r) for r in self.conn.execute(
                "SELECT request_id,request_hash,result_json FROM request_result ORDER BY request_id").fetchall()
                if parse_json(r["result_json"]).get("matter_id") == matter_id],
        }

    def state_envelope(self, matter_id: str = "m-1") -> dict[str, Any]:
        return self._full_state(matter_id)

    def state_digest(self, matter_id: str = "m-1") -> str:
        return sha256_text(canonical_json(self._full_state(matter_id)))

    def _decision_event_payload(self, request: dict[str, Any], scope: dict[str, Any], result: dict[str, Any],
                                matter_id: str, artifact: dict[str, Any] | None,
                                actor: dict[str, Any] = TRUSTED_ACTOR) -> dict[str, Any]:
        return {
            "request": request, "actor": actor, "scope": scope, "result": result,
            "new_state": self._full_state(matter_id), "artifact": artifact,
        }

    def decide(self, request: dict[str, Any], capability: object | None = None,
               actor: dict[str, Any] | None = None) -> dict[str, Any]:
        validate_decision_request(request)
        if capability is None:
            raise CoreError("AUTHORITY_DENIED", "trusted capability required")
        effective_actor = TRUSTED_ACTOR if actor is None else self._validate_actor(actor)
        self._begin()
        try:
            candidate = self._candidate_row(request["candidate_id"])
            scope = self._scope_for(request, candidate)
            replay = self._check_existing_request(request, scope, effective_actor)
            if replay is not None:
                self.conn.commit()
                return replay
            if candidate["matter_id"] != request["matter_id"]:
                raise CoreError("BINDING_MISMATCH", "candidate belongs to another matter")
            if candidate["status"] != "pending":
                raise CoreError("CANDIDATE_CLOSED", candidate["status"])
            matter = self._matter_row(request["matter_id"])
            self._check_cas(request, candidate, matter)
            if candidate["contract_version"] != matter["contract_version"] or candidate["source_version"] != matter["source_version"]:
                raise CoreError("STALE_INPUT", "candidate contract/source revision is stale")
            candidate_obj = self._candidate_from_row(candidate)
            if request["action"] == "accept":
                self._verify_evidence(candidate_obj["evidence"], matter["source_version"], request["matter_id"])
            old_obligations = parse_json(matter["obligations_json"])
            new_obligations = self._check_obligations(old_obligations, candidate_obj["obligations"], request["action"],
                                                      request["matter_id"], matter["source_version"])
            next_version = matter["version"] + 1
            artifact_id: str | None = matter["active_artifact"]
            artifact: dict[str, Any] | None = None
            if request["action"] == "accept":
                artifact_id = f"artifact-{candidate['id']}-{next_version}"
            status = {"accept": "accepted", "reject": "rejected", "request_evidence": "needs_evidence"}[request["action"]]
            result = {
                "request_id": request["request_id"], "matter_id": request["matter_id"],
                "candidate_id": request["candidate_id"], "action": request["action"],
                "version": next_version, "active_artifact": artifact_id,
            }
            # Audit is written before the remaining state updates, matching the
            # documented hook ordering; all rows still share this transaction.
            self.conn.execute(
                "INSERT INTO audit(request_id,matter_id,candidate_id,action,actor_json,scope_json,result_json) VALUES(?,?,?,?,?,?,?)",
                (request["request_id"], request["matter_id"], request["candidate_id"], request["action"],
                 canonical_json(effective_actor), canonical_json(scope), canonical_json(result)),
            )
            self.hooks.hit("after_audit")
            self._recheck_binding(request, candidate, matter)
            if request["action"] == "accept":
                digest = sha256_text(candidate["artifact_text"])
                content = candidate["artifact_text"]
                content_digest = digest
                if os.environ.get("CORE_TRUNCATE_ARTIFACT") == "1":
                    content = content[:-1]
                self.conn.execute(
                    "INSERT INTO artifact(id,candidate_id,candidate_hash,content,content_digest) VALUES(?,?,?,?,?)",
                    (artifact_id, candidate["id"], candidate["payload_hash"], content, content_digest),
                )
                self.hooks.hit("after_artifact")
                artifact = self._active_artifact(artifact_id)
                if artifact is None or sha256_text(artifact["content"]) != artifact["content_digest"]:
                    raise CoreError("INTEGRITY_REFUSAL", "artifact readback digest mismatch")
            self.conn.execute("UPDATE candidate SET status=? WHERE id=?", (status, candidate["id"]))
            self.conn.execute(
                "UPDATE matter SET version=?,active_artifact=?,obligations_json=? WHERE id=?",
                (next_version, artifact_id, canonical_json(new_obligations), request["matter_id"]),
            )
            self.conn.execute(
                "INSERT INTO decision(request_id,matter_id,candidate_id,action,reason,actor_json,scope_json,result_json) VALUES(?,?,?,?,?,?,?,?)",
                (request["request_id"], request["matter_id"], request["candidate_id"], request["action"], request["reason"],
                 canonical_json(effective_actor), canonical_json(scope), canonical_json(result)),
            )
            self.conn.execute("INSERT INTO request_result(request_id,request_hash,result_json) VALUES(?,?,?)",
                              (request["request_id"], self._decision_hash(request, scope, effective_actor), canonical_json(result)))
            if self.mode == "b1":
                event_payload = self._decision_event_payload(request, scope, result, request["matter_id"], artifact,
                                                              effective_actor)
                self._insert_event(
                    f"decision:{request['request_id']}", "DecisionRecorded", event_payload,
                    {"request_id": request["request_id"], "candidate_id": request["candidate_id"]},
                )
            self.hooks.hit("after_state")
            self.hooks.hit("before_commit")
            self.conn.commit()
            self.hooks.hit("after_commit_before_ack")
            return result
        except Exception:
            self._rollback()
            raise

    def query_request(self, request_id: str) -> dict[str, Any] | None:
        row = self.conn.execute("SELECT result_json FROM request_result WHERE request_id=?", (request_id,)).fetchone()
        return None if row is None else parse_json(row["result_json"])

    def integrity(self) -> dict[str, Any]:
        integrity = self.conn.execute("PRAGMA integrity_check").fetchone()[0]
        foreign = [dict(r) for r in self.conn.execute("PRAGMA foreign_key_check").fetchall()]
        return {"integrity_check": integrity, "foreign_key_check": foreign}

    def backup_to(self, destination: str | Path) -> None:
        """Create a SQLite backup in a fresh file; caller validates the copy."""
        destination = Path(destination)
        destination.parent.mkdir(parents=True, exist_ok=True)
        if destination.exists():
            destination.unlink()
        target = sqlite3.connect(destination, timeout=5.0, isolation_level=None)
        try:
            self.conn.backup(target)
        finally:
            target.close()

    def rebuild_projection(self) -> None:
        if self.mode != "b1":
            raise CoreError("INVALID", "projection rebuild only applies to B1")
        self._begin()
        try:
            for table in ("audit", "decision", "request_result", "artifact", "candidate", "source_set", "source_history", "source", "matter"):
                self.conn.execute(f"DELETE FROM {table}")
            for row in self.conn.execute("SELECT event_version,event_type,payload_json FROM event ORDER BY rowid").fetchall():
                if row["event_version"] != 1:
                    raise CoreError("UNKNOWN_EVENT_VERSION", f"event_version={row['event_version']}")
                typ = row["event_type"]
                if typ not in EVENT_TYPES:
                    raise CoreError("UNKNOWN_EVENT_TYPE", f"event_type={typ}")
                payload = parse_json(row["payload_json"])
                if typ == "MatterCreated":
                    m = payload["matter"]
                    self.conn.execute("INSERT INTO matter VALUES(?,?,?,?,?,?)",
                                      (m["id"],m["version"],m["contract_version"],m["source_version"],m["active_artifact"],canonical_json(m["obligations"])))
                elif typ == "SourceSetChanged":
                    for s in payload["sources"]:
                        self.conn.execute("INSERT OR REPLACE INTO source VALUES(?,?,?,?)", (s["id"],s["version"],s["text"],s["digest"]))
                    self.conn.execute("DELETE FROM source_set WHERE matter_id=?", (payload["matter_id"],))
                    for s in payload["sources"]:
                        self.conn.execute("INSERT OR REPLACE INTO source_set VALUES(?,?,?,?)",
                                          (payload["matter_id"],s["id"],s["version"],payload["source_revision"]))
                    self.conn.execute("UPDATE matter SET source_version=? WHERE id=?",
                                      (payload["source_revision"],payload["matter_id"]))
                elif typ == "CandidateSaved":
                    c = payload["candidate"]
                    self._insert_candidate_projection(c, payload["save_result"])
                elif typ == "DecisionRecorded":
                    self._apply_decision_projection(payload)
            self.conn.commit()
        except Exception:
            self._rollback()
            raise

    def _insert_candidate_projection(self, c: dict[str, Any], result: dict[str, Any]) -> None:
        payload = {k: c[k] for k in c if k != "status"}
        self.conn.execute(
            "INSERT OR REPLACE INTO candidate(id,matter_id,run_id,base_version,contract_version,source_version,artifact_text,evidence_json,obligations_json,payload_json,payload_hash,save_result_json,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (c["id"],c["matter_id"],c["run_id"],c["base_version"],c["contract_version"],c["source_version"],c["artifact_text"],canonical_json(c["evidence"]),canonical_json(c["obligations"]),canonical_json(payload),sha256_text(canonical_json(payload)),canonical_json(result),c.get("status","pending")),
        )

    def _apply_decision_projection(self, payload: dict[str, Any]) -> None:
        req = payload["request"]
        result = payload["result"]
        state = payload["new_state"]
        m = state["matter"]
        self.conn.execute("UPDATE matter SET version=?,source_version=?,active_artifact=?,obligations_json=? WHERE id=?",
                          (m["version"],m["source_version"],m["active_artifact"],canonical_json(m["obligations"]),m["id"]))
        c = next(x for x in state["candidates"] if x["id"] == req["candidate_id"])
        self.conn.execute("UPDATE candidate SET status=? WHERE id=?", (c["status"],c["id"]))
        art = payload.get("artifact")
        if art is not None:
            self.conn.execute("INSERT OR REPLACE INTO artifact(id,candidate_id,candidate_hash,content,content_digest) VALUES(?,?,?,?,?)",
                              (art["id"],art["candidate_id"],art["candidate_hash"],art["content"],art["content_digest"]))
        self.conn.execute("INSERT OR REPLACE INTO audit(request_id,matter_id,candidate_id,action,actor_json,scope_json,result_json) VALUES(?,?,?,?,?,?,?)",
                          (req["request_id"],req["matter_id"],req["candidate_id"],req["action"],canonical_json(payload["actor"]),canonical_json(payload["scope"]),canonical_json(result)))
        self.conn.execute("INSERT OR REPLACE INTO decision(request_id,matter_id,candidate_id,action,reason,actor_json,scope_json,result_json) VALUES(?,?,?,?,?,?,?,?)",
                          (req["request_id"],req["matter_id"],req["candidate_id"],req["action"],req["reason"],canonical_json(payload["actor"]),canonical_json(payload["scope"]),canonical_json(result)))
        self.conn.execute("INSERT OR REPLACE INTO request_result(request_id,request_hash,result_json) VALUES(?,?,?)",
                          (req["request_id"],self._decision_hash(req,payload["scope"],payload["actor"]),canonical_json(result)))


class ModelDispatcher:
    """Only read_source and submit_candidate are reachable from model JSON."""

    def __init__(self, store: Store, context: RunContext) -> None:
        self.store = store
        self.context = context
        self.store._matter_row(context.matter_id)

    def call(self, tool: str, payload: dict[str, Any]) -> dict[str, Any]:
        if tool == "read_source":
            _exact_keys(payload, {"source_id", "version"}, "read_source")
            return self.store.read_source(payload["source_id"], payload["version"],
                                          matter_id=self.context.matter_id)
        if tool == "submit_candidate":
            # A model cannot smuggle actor, authority, action, SQL or paths
            # through the Candidate handler because the schema is exact.
            return self.store.save_candidate(payload, context=self.context)
        raise CoreError("AUTHORITY_DENIED", f"unknown model tool: {tool}")


class TrustedReviewer:
    """A private capability wrapper used only by the trusted test entry."""

    def __init__(self, store: Store) -> None:
        self._store = store
        self.__capability = object()

    def decide(self, request: dict[str, Any]) -> dict[str, Any]:
        return self._store.decide(request, capability=self.__capability)


def open_store(db_path: str | Path, mode: str = "b0", hooks: HookController | None = None) -> Store:
    return Store(db_path, mode=mode, hooks=hooks)
