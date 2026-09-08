"""Run from an independent candidate clone; pass a separate evidence output directory."""
import hashlib, json, pathlib, subprocess, sys, tempfile, time, urllib.request
root = pathlib.Path.cwd()
out = pathlib.Path(sys.argv[1]).resolve()
commit = subprocess.check_output(['git','rev-parse','HEAD'], text=True).strip()
assert not subprocess.check_output(['git','status','--porcelain'], text=True).strip()
manifest = json.loads((root/'evidence/final-integration-20260908/source-manifest.json').read_text())
for name, expected in manifest['files'].items():
    assert hashlib.sha256((root/name).read_bytes()).hexdigest() == expected, name
results = {'testedCommit':commit, 'sourceCommit':manifest['sourceCommit'], 'sourceHashes':len(manifest['files']), 'commands':{}}
for key, command in [('install',['npm','--prefix','app','ci']), ('tests',['npm','--prefix','app','test']), ('smoke',['npm','--prefix','app','run','smoke'])]:
    with (out/f'remote-{key}.txt').open('w') as log:
        result = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT)
    results['commands'][key] = result.returncode
    assert result.returncode == 0, key
with tempfile.TemporaryDirectory(prefix='courtwork-remote-start-') as data:
    with (out/'remote-server.txt').open('w') as log:
        proc = subprocess.Popen(['npm','--prefix','app','start','--','--data-dir',data,'--port','19021'],stdout=log,stderr=subprocess.STDOUT, start_new_session=True)
        try:
            base='http://127.0.0.1:19021'
            for attempt in range(100):
                assert proc.poll() is None, 'server exited'
                try:
                    with urllib.request.urlopen(base, timeout=2) as response: html=response.read().decode(); break
                except OSError: time.sleep(.2)
            else: raise AssertionError('server not ready')
            assert 'app.mjs' in html
            results['http']={}
            for endpoint, mime in [('/', 'text/html'),('/web/app.mjs','text/javascript'),('/web/styles.css','text/css')]:
                with urllib.request.urlopen(base+endpoint) as response:
                    assert response.status == 200 and mime in response.headers['Content-Type']
                    results['http'][endpoint]={'status':response.status,'contentType':response.headers['Content-Type']}
            with urllib.request.urlopen(base+'/api/v5/bootstrap') as response: bootstrap=json.load(response)
            assert bootstrap['capabilities']['mode']=='local-fake'
            results['capabilities']=bootstrap['capabilities']
        finally:
            import os, signal
            os.killpg(proc.pid,signal.SIGTERM)
            proc.wait(timeout=20)
results['cleanCloneAfterChecks'] = not subprocess.check_output(['git','status','--porcelain'],text=True).strip()
assert results['cleanCloneAfterChecks']
(out/'remote-start.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results,indent=2))
