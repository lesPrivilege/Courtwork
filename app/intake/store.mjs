import { DatabaseSync } from 'node:sqlite';
import { mkdir, lstat } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';

const VERSION = 1, APPLICATION_ID = 1129793881;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const MAX_INTAKE_BYTES = 1024 * 1024;
export class IntakeError extends Error {
  constructor(code, message, status = 409) { super(message); this.code = code; this.status = status; }
}

// LG-01 owns retained uploads. This database has no Core acceptance fields,
// Runtime tool resources or artifact-history writes. Session membership is
// rechecked by the Host on every query, including cached/ref-only requests.
export class IntakeStore {
  constructor(dataDir) { this.directory = path.join(dataDir, 'intake'); this.filename = path.join(this.directory, 'sources.sqlite'); this.db = null; }
  async open() {
    await mkdir(this.directory, {recursive:true, mode:0o700});
    for (const target of [this.directory, this.filename, `${this.filename}-wal`, `${this.filename}-shm`]) {
      try { if ((await lstat(target)).isSymbolicLink()) throw new IntakeError('intake_unavailable','Retained source storage must not be a symbolic link.',503); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    const db = new DatabaseSync(this.filename, {enableForeignKeyConstraints:true, enableDoubleQuotedStringLiterals:false, allowExtension:false, timeout:1000});
    try {
      const version = db.prepare('PRAGMA user_version').get().user_version;
      const applicationId = db.prepare('PRAGMA application_id').get().application_id;
      if (version !== 0 && (version !== VERSION || applicationId !== APPLICATION_ID)) throw new IntakeError('intake_version_unsupported','Retained source storage has an unsupported version.',503);
      if (version === 0 && applicationId !== 0) throw new IntakeError('intake_version_unsupported','Unrecognized retained source storage.',503);
      if (version === 0 && db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").get()) throw new IntakeError('intake_version_unsupported','Unrecognized retained source storage.',503);
      db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;');
      if (version === 0) db.exec(`BEGIN IMMEDIATE;
        CREATE TABLE sources(id TEXT PRIMARY KEY, session_id TEXT NOT NULL, name TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(session_id,name)) STRICT;
        CREATE TABLE revisions(source_id TEXT NOT NULL REFERENCES sources(id), revision INTEGER NOT NULL CHECK(revision>0), sha256 TEXT NOT NULL, bytes INTEGER NOT NULL CHECK(bytes>=0 AND bytes<=1048576), content BLOB NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(source_id,revision)) STRICT;
        CREATE TABLE commands(session_id TEXT NOT NULL, command_id TEXT NOT NULL, payload_hash TEXT NOT NULL, source_id TEXT NOT NULL, revision INTEGER NOT NULL, workspace_state TEXT NOT NULL CHECK(workspace_state IN ('pending','written','superseded')), PRIMARY KEY(session_id,command_id), FOREIGN KEY(source_id,revision) REFERENCES revisions(source_id,revision)) STRICT;
        CREATE INDEX source_scope ON sources(session_id);
        PRAGMA application_id=${APPLICATION_ID}; PRAGMA user_version=${VERSION}; COMMIT;`);
      this.db = db;
      return this;
    } catch (error) { db.close(); throw error; }
  }
  close() { this.db?.close(); this.db = null; }
  #transaction(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  #command(sessionId, commandId) {
    return this.db.prepare(`SELECT c.*, s.name, r.sha256, r.bytes, r.created_at,
      (SELECT MAX(revision) FROM revisions WHERE source_id=c.source_id) AS latest_revision
      FROM commands c JOIN sources s ON s.id=c.source_id JOIN revisions r ON r.source_id=c.source_id AND r.revision=c.revision
      WHERE c.session_id=? AND c.command_id=? AND s.session_id=?`).get(sessionId,commandId,sessionId);
  }
  #receipt(row) {
    return {commandId:row.command_id, path:`materials/${row.name}`, bytes:row.bytes, sha256:row.sha256,
      retained:{kind:'retained-source',sessionId:row.session_id,sourceId:row.source_id,revision:row.revision,path:`materials/${row.name}`,sha256:row.sha256},
      workspaceState:row.workspace_state, latestRevision:row.latest_revision};
  }
  retain({sessionId,name,text,commandId,expectedRevision}) {
    const content = Buffer.from(text,'utf8');
    if (content.length > MAX_INTAKE_BYTES || !text.isWellFormed() || text.includes('\0')) throw new IntakeError('invalid_source','A supported UTF-8 text source is required.',400);
    const digest = hash(content), payloadHash = hash(JSON.stringify({name,text,expectedRevision:expectedRevision ?? null}));
    return this.#transaction(()=>{
      const existing = this.#command(sessionId,commandId);
      if (existing) {
        if (existing.payload_hash !== payloadHash) throw new IntakeError('command_conflict','This upload command was already used with different content.');
        this.read(sessionId,{sourceId:existing.source_id,revision:existing.revision,sha256:existing.sha256});
        if (existing.workspace_state === 'pending' && existing.latest_revision !== existing.revision) {
          this.db.prepare("UPDATE commands SET workspace_state='superseded' WHERE session_id=? AND command_id=?").run(sessionId,commandId);
          existing.workspace_state = 'superseded';
        }
        return this.#receipt(existing);
      }
      let source = this.db.prepare('SELECT * FROM sources WHERE session_id=? AND name=?').get(sessionId,name);
      const latest = source && this.db.prepare('SELECT revision,sha256,bytes FROM revisions WHERE source_id=? ORDER BY revision DESC LIMIT 1').get(source.id);
      if (expectedRevision !== undefined && expectedRevision !== (latest?.revision ?? 0)) throw new IntakeError('source_revision_conflict','The retained source changed. Refresh its versions before replacing it.');
      if (!source) {
        source={id:randomUUID()};
        this.db.prepare('INSERT INTO sources VALUES(?,?,?,?)').run(source.id,sessionId,name,new Date().toISOString());
      }
      let revision = latest?.revision ?? 0;
      if (latest && latest.sha256 === digest && latest.bytes === content.length) this.read(sessionId,{sourceId:source.id,revision:latest.revision,sha256:digest});
      if (!latest || latest.sha256 !== digest || latest.bytes !== content.length) {
        revision++;
        this.db.prepare('INSERT INTO revisions VALUES(?,?,?,?,?,?)').run(source.id,revision,digest,content.length,content,new Date().toISOString());
      }
      this.db.prepare("INSERT INTO commands VALUES(?,?,?,?,?,'pending')").run(sessionId,commandId,payloadHash,source.id,revision);
      return this.#receipt(this.#command(sessionId,commandId));
    });
  }
  markWritten(sessionId,commandId) {
    const row=this.#command(sessionId,commandId);
    if (!row) throw new IntakeError('command_missing','The upload receipt is unavailable.',404);
    if (row.workspace_state === 'pending') this.db.prepare("UPDATE commands SET workspace_state=? WHERE session_id=? AND command_id=?").run(row.latest_revision===row.revision?'written':'superseded',sessionId,commandId);
    return this.#receipt(this.#command(sessionId,commandId));
  }
  list(sessionId) {
    const rows=this.db.prepare(`SELECT s.id,s.name,s.created_at,MAX(r.revision) AS latestRevision
      FROM sources s JOIN revisions r ON r.source_id=s.id WHERE s.session_id=? GROUP BY s.id ORDER BY s.created_at,s.id LIMIT 201`).all(sessionId);
    return {sources:rows.slice(0,200).map(row=>({sourceId:row.id,name:row.name,path:`materials/${row.name}`,createdAt:row.created_at,latestRevision:row.latestRevision})),coverage:rows.length>200?'partial':'complete',limit:200};
  }
  versions(sessionId,sourceId) {
    const source=this.db.prepare('SELECT name FROM sources WHERE id=? AND session_id=?').get(sourceId,sessionId);
    if (!source) throw new IntakeError('not_found','Retained source not found.',404);
    const versions=this.db.prepare('SELECT revision,sha256,bytes,created_at AS createdAt FROM revisions WHERE source_id=? ORDER BY revision DESC LIMIT 201').all(sourceId);
    return {sourceId,name:source.name,path:`materials/${source.name}`,latestRevision:versions[0]?.revision,versions:versions.slice(0,200),coverage:versions.length>200?'partial':'complete',limit:200};
  }
  read(sessionId,{sourceId,revision,sha256}) {
    const row=this.db.prepare(`SELECT s.name,r.* FROM revisions r JOIN sources s ON s.id=r.source_id WHERE s.session_id=? AND s.id=? AND r.revision=?`).get(sessionId,sourceId,revision);
    if (!row) throw new IntakeError('not_found','Retained source version not found.',404);
    if (row.sha256 !== sha256) throw new IntakeError('source_version_mismatch','The requested hash does not match this source version.');
    const content=Buffer.from(row.content);
    if (content.length !== row.bytes || hash(content) !== row.sha256) throw new IntakeError('source_integrity_failed','The retained source failed its integrity check.',500);
    let text;
    try { text = new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(content); }
    catch { throw new IntakeError('source_integrity_failed','The retained source is not valid UTF-8.',500); }
    return {kind:'retained-source',sessionId,sourceId,revision,path:`materials/${row.name}`,sha256:row.sha256,bytes:row.bytes,text,truncated:false,createdAt:row.created_at,representation:'original-utf8-v1'};
  }
}
