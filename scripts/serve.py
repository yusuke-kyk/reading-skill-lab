import argparse
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
p = argparse.ArgumentParser()
p.add_argument('--host', default='127.0.0.1')
p.add_argument('--port', type=int, default=8000)
p.add_argument('--strictPort', action='store_true')
a = p.parse_args()
ThreadingHTTPServer((a.host,a.port),partial(SimpleHTTPRequestHandler,directory=str(Path(__file__).resolve().parent.parent))).serve_forever()
