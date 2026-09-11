"""Read unchanged archived Design boards. Scripts blocked; no product runs."""
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path, PurePosixPath
from urllib.parse import urlsplit, unquote
import json
import mimetypes
import tarfile
ROOT = Path(__file__).resolve().parents[2]
ARCHIVE = ROOT / 'engineering/research/se-control-design-return-2026-09-11/source.tar.gz'
with tarfile.open(ARCHIVE) as package:
    FILES = {m.name.removeprefix('return-package/'): package.extractfile(m).read()
             for m in package.getmembers() if m.isfile() and m.name.startswith('return-package/')}
class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        name = unquote(urlsplit(self.path).path).lstrip('/') or 'artboards/Main.dc.html'
        if '..' in PurePosixPath(name).parts or name not in FILES:
            self.send_error(404)
            return
        body = FILES[name]
        self.send_response(200)
        self.send_header('Content-Type', mimetypes.guess_type(name)[0] or 'application/octet-stream')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src data: 'self'; font-src 'self'")
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(body)
server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
print(json.dumps({'url':f'http://127.0.0.1:{server.server_port}/artboards/Main.dc.html',
                  'source':'archive member bytes; scripts blocked; no layout rewriting'}), flush=True)
server.serve_forever()
