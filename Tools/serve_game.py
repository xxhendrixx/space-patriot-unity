"""Local-only server for the Unity browser build, including compressed WebAssembly."""
import argparse
import functools
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

class Handler(SimpleHTTPRequestHandler):
    def guess_type(self, path):
        if path.endswith('.gz'): path=path[:-3]
        if path.endswith('.wasm'): return 'application/wasm'
        if path.endswith('.data'): return 'application/octet-stream'
        return super().guess_type(path)
    def end_headers(self):
        if self.path.split('?',1)[0].endswith('.gz'): self.send_header('Content-Encoding','gzip')
        self.send_header('Cache-Control','no-cache')
        super().end_headers()

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8791);args=parser.parse_args()
    root=Path(__file__).resolve().parents[2]/'Browser'
    handler=functools.partial(Handler,directory=str(root))
    print(f'Space Patriot: http://127.0.0.1:{args.port}',flush=True)
    ThreadingHTTPServer(('127.0.0.1',args.port),handler).serve_forever()
