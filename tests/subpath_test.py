"""GitHub Pages相当のサブパスで静的ファイルを取得する確認。"""
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
from urllib.request import urlopen
import json
root = Path(__file__).resolve().parent.parent
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(root.parent)))
Thread(target=server.serve_forever, daemon=True).start()
try:
    base = f'http://127.0.0.1:{server.server_port}/{root.name}/'
    for path in ['index.html', 'styles.css', 'app.js', 'progress.js', 'quiz.js', 'data/questions.json']:
        with urlopen(base + path) as response:
            assert response.status == 200
            body = response.read()
            if path.endswith('.json'):
                assert len(json.loads(body)['questions']) == 14
    print('サブパス配下のHTML・CSS・JavaScript・14問JSON: すべて取得成功')
finally:
    server.shutdown()
    server.server_close()
