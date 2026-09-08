"""Independent test observer: SQLite read-only, no production imports."""
import json
import sqlite3
import sys
from pathlib import Path
c = sqlite3.connect(Path(sys.argv[1]).resolve().as_uri() + '?mode=ro', uri=True)
c.row_factory = sqlite3.Row
c.execute('BEGIN')
work = dict(c.execute('SELECT * FROM matter WHERE id=?',(sys.argv[2],)).fetchone())
artifact = c.execute('SELECT * FROM artifact WHERE id=?',(work['active_artifact'],)).fetchone()
def rows(table):
    return [dict(r) for r in c.execute('SELECT * FROM '+table+' WHERE matter_id=?',(sys.argv[2],))]
receipts = [dict(r) for r in c.execute('SELECT * FROM request_result') if json.loads(r['result_json'])['matter_id'] == sys.argv[2]]
print(json.dumps(dict(work=work,artifact=None if artifact is None else dict(artifact),decisions=rows('decision'),audits=rows('audit'),receipts=receipts)))
c.close()
