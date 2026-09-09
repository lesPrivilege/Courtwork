"""Non-author migration refusal probe; extracts fixed sources, uses only temp data."""
import hashlib, json, os, pathlib, subprocess, tempfile
ROOT = pathlib.Path(__file__).resolve().parents[2]
TARGET = os.environ.get('ATTENTION_CODE_SHA', 'de38eff022b1eea4eb705de51fe988eba3da12bd')
OLD = 'a7a08f035cc5a716b8c7a93024cdfe4e44e4c07d'
ES = '95cfb165ed368e8b4c6afca7ab5c8c838cb4653c'
EXPECTED_FIXED = os.environ.get('ATTENTION_EXPECT_FIXED') == '1'

def materialize(parent, label, sha, names):
    dest = parent / label; dest.mkdir()
    for name in names:
        (dest/name).write_bytes(subprocess.check_output(['git','show',sha+':app/core/'+name],cwd=ROOT))
    return dest

def open_db(source, db):
    proc = subprocess.run(['python3','-c', '''import bridge,json,sys
try:
 s=bridge.open_or_initialize(sys.argv[1]); v=s.conn.execute('PRAGMA user_version').fetchone()[0]; bridge.close_store(s); print(json.dumps({'status':'opened','version':v}))
except Exception as e: print(json.dumps({'status':'refused','code':getattr(e,'code',type(e).__name__),'detail':str(e)}))
''',str(db)],cwd=source,capture_output=True,text=True,timeout=15)
    assert proc.returncode == 0,proc.stderr
    return json.loads(proc.stdout)

with tempfile.TemporaryDirectory(prefix='cw-att-backup-negative-') as root:
    parent=pathlib.Path(root)
    old=materialize(parent,'old',OLD,['core.py','bridge.py'])
    es=materialize(parent,'es',ES,['core.py','bridge.py','file_candidates.py'])
    new=materialize(parent,'new',TARGET,['core.py','bridge.py','file_candidates.py','attention.py'])
    outcomes=[]
    for label,seed,suffix in [('legacy-file-backup',old,'.pre-file-core-v2-app-v3.bak'),('es-attention-backup',es,'.pre-attention-core-v3-app-v4.bak')]:
        location=parent/label;location.mkdir();db=location/'state.db'
        assert open_db(seed,db)['status']=='opened'
        before=hashlib.sha256(db.read_bytes()).hexdigest()
        link=pathlib.Path(str(db)+suffix); target=location/'must-remain-absent.db';link.symlink_to(target)
        result=open_db(new,db)
        outcome={'probe':label,'startup':result,'databaseUnchanged':hashlib.sha256(db.read_bytes()).hexdigest()==before,'linkPreserved':link.is_symlink(),'symlinkTargetCreated':target.exists()}
        outcomes.append(outcome)
    print(json.dumps({'target':TARGET,'sourceHashes':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in new.glob('*.py')},'outcomes':outcomes},indent=2))
    if EXPECTED_FIXED:
        for o in outcomes:
            assert o['startup']['status']=='refused' and o['databaseUnchanged'] and o['linkPreserved'] and not o['symlinkTargetCreated'],o
