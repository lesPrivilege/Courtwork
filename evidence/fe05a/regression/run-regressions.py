"""FE-05a · 逐字复制自 evidence/cc-d0a/run-regressions.py 与同目录脚本，只改端口
（8905→8909、8906→8910、CDP 20030/20031→20070/20071）与数据目录。断言一字未动。

CC-D0-a · local synthetic regression runner; each group owns a new data directory.
Copied from evidence/cc-w-main-integration-20260909/run-regressions.py, ports only
(8966→8909, 8967→8910, CDP 19986/19987→20070/20071), plus the groups that runner did
not carry: shell, fe-t07, counterexamples (FE-T03) and cc-s-checks."""
import json, os, pathlib, shutil, subprocess, tempfile, time, urllib.request

OUT = pathlib.Path(__file__).resolve().parent
ROOT = OUT.parent.parent.parent  # evidence/fe05a/regression → 仓根
SOURCE = OUT
results = []

def run(name, command, env, output):
    with (output / (name + '.log')).open('w') as log:
        result = subprocess.run(command, cwd=ROOT, env={**os.environ, **env}, stdout=log, stderr=subprocess.STDOUT, timeout=600)
    results.append({'name':name,'group':output.name,'exitCode':result.returncode})
    print(name, result.returncode, flush=True)
    if result.returncode: raise RuntimeError(name)

def group(name, steps, port=8909, rc=False):
    selected = os.environ.get('CW_GROUPS')
    if selected and name not in selected.split(','): return
    output = OUT / name
    output.mkdir(exist_ok=True)
    for source in SOURCE.glob('*.mjs'):
        (output/source.name).write_text(source.read_text().replace('"../../app/', '"../../../../app/'))
    if rc:
        (output / 'rc').mkdir(exist_ok=True)
        for pattern in ('*.mjs', '*.js'):
            for source in (SOURCE/'rc').glob(pattern): shutil.copy2(source, output/'rc'/source.name)
    env = {'APP_URL':f'http://127.0.0.1:{port}','WK10B2_BASE':f'http://127.0.0.1:{port}', 'WK6_CDP_PORT':'20070', 'RC_APP':f'http://127.0.0.1:{port}/','RC_PORT':str(port),'MCP_PORT':'8910','RC_CDP_PORT':'20071','RC_CHROME_DIR':tempfile.mkdtemp(prefix='cw-fe05a-rc-profile-')}
    data = tempfile.mkdtemp(prefix='cw-fe05a-'+name+'-', dir='/private/tmp/se-agent-fe05a-data')
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
    used = {script for _,script,_ in steps} | {'browser.mjs'}
    for script in output.glob('*.mjs'):
        if script.name not in used:script.unlink()

try:
    group('settings', [('seed','seed.mjs',{}),('models','models-checks.mjs',{}),('rows','fe-t01.mjs',{'T01_CASE':'rows'}),('probe','probe-checks.mjs',{})])
    group('empty',[('empty','fe-t01.mjs',{'T01_CASE':'empty'})])
    group('primitive',[('seed','primitive-seed.mjs',{}),('primitive','primitive-checks.mjs',{})])
    group('history',[('seed','work-seed.mjs',{}),('fe-t11','fe-t11.mjs',{})])
    group('shell',[('seed','work-seed.mjs',{}),('shell','shell-checks.mjs',{})])
    group('fe-t07',[('seed','work-seed.mjs',{}),('fe-t07','fe-t07.mjs',{})])
    # cc-s 需要播种后 SIGKILL 停服再起才能得到 unknown 终态（见 evidence/cc-s/README.md），
    # 这个编排 group() 做不到，单独跑：见本目录 README 的 cc-s 一节。
    group('final-layout',[('seed','seed.mjs',{}),('composition','composition-checks.mjs',{})])
    group('final-behavior',[('seed','cc-w-seed.mjs',{}),('behavior','cc-w-checks.mjs',{})])
    group('runtime',[('seed','rc/seed-fixture.mjs',{}),('verify','rc/verify.mjs',{})],rc=True)
finally:
    (OUT/'regression-exits.json').write_text(json.dumps(results,indent=2)+'\n')
