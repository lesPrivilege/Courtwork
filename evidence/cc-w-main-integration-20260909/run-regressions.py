"""Local synthetic regression runner; each group owns a new data directory."""
import json, os, pathlib, shutil, subprocess, tempfile, time, urllib.request

OUT = pathlib.Path(__file__).resolve().parent
ROOT = OUT.parent.parent
SOURCE = ROOT / 'evidence/cc-w'
results = []

def run(name, command, env, output):
    with (output / (name + '.log')).open('w') as log:
        result = subprocess.run(command, cwd=ROOT, env={**os.environ, **env}, stdout=log, stderr=subprocess.STDOUT, timeout=240)
    results.append({'name':name,'group':output.name,'exitCode':result.returncode})
    print(name, result.returncode, flush=True)
    if result.returncode: raise RuntimeError(name)

def group(name, steps, port=8966, rc=False):
    selected = os.environ.get('CW_GROUPS')
    if selected and name not in selected.split(','): return
    output = OUT / name
    output.mkdir(exist_ok=True)
    for source in SOURCE.glob('*.mjs'):
        (output/source.name).write_text(source.read_text().replace('"../../app/', '"../../../app/'))
    if rc:
        (output / 'rc').mkdir(exist_ok=True)
        for pattern in ('*.mjs', '*.js'):
            for source in (SOURCE/'rc').glob(pattern): shutil.copy2(source, output/'rc'/source.name)
    env = {'APP_URL':f'http://127.0.0.1:{port}','WK10B2_BASE':f'http://127.0.0.1:{port}', 'WK6_CDP_PORT':'19986', 'RC_APP':f'http://127.0.0.1:{port}/','RC_PORT':str(port),'MCP_PORT':'8967','RC_CDP_PORT':'19987','RC_CHROME_DIR':tempfile.mkdtemp(prefix='cw-ccw-rc-profile-')}
    data = tempfile.mkdtemp(prefix='cw-ccw-'+name+'-')
    with (output/'server.log').open('w') as log:
        server = subprocess.Popen(['node','app/server/index.mjs','--data-dir',data,'--port',str(port)],cwd=ROOT,stdout=log,stderr=subprocess.STDOUT)
        mcp = None
        try:
            for _ in range(100):
                try:
                    urllib.request.urlopen(env['APP_URL']+'/api/v5/bootstrap',timeout=1).close();break
                except Exception:time.sleep(.1)
            if rc:
                mcp = subprocess.Popen(['node',str(output/'rc/mcp-fixture.mjs')],env={**os.environ,**env},stdout=log,stderr=subprocess.STDOUT)
                time.sleep(.5)
            for label, script, overrides in steps:
                run(label,['node',str(output/script)],{**env,**overrides},output)
        finally:
            for child in (server,mcp):
                if child:
                    child.terminate()
                    try:child.wait(timeout=10)
                    except subprocess.TimeoutExpired:child.kill();child.wait()
    # Only retain the scripts actually used and their browser helper.
    used = {script for _,script,_ in steps} | {'browser.mjs'}
    for script in output.glob('*.mjs'):
        if script.name not in used:script.unlink()

try:
    group('settings', [('seed','seed.mjs',{}),('models','models-checks.mjs',{}),('rows','fe-t01.mjs',{'T01_CASE':'rows'}),('probe','probe-checks.mjs',{})])
    group('empty',[('empty','fe-t01.mjs',{'T01_CASE':'empty'})])
    group('primitive',[('seed','primitive-seed.mjs',{}),('primitive','primitive-checks.mjs',{})])
    group('history',[('seed','work-seed.mjs',{}),('fe-t11','fe-t11.mjs',{})])
    group('final-layout',[('seed','seed.mjs',{}),('composition','composition-checks.mjs',{})])
    group('final-behavior',[('seed','cc-w-seed.mjs',{}),('behavior','cc-w-checks.mjs',{})])
    group('runtime',[('seed','rc/seed-fixture.mjs',{}),('verify','rc/verify.mjs',{})],rc=True)
finally:
    (OUT/'regression-exits.json').write_text(json.dumps(results,indent=2)+'\n')
