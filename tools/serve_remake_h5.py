"""Serve only the verified Remake build on loopback; no Creator or npm server needed."""
import argparse
import json
import mimetypes
import socket
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys
from urllib.parse import unquote, urlsplit
from urllib.request import urlopen
import webbrowser
from check_h5_artifact import validate_build

ROOT = Path(__file__).resolve().parents[1]
PREVIEW_ID = "mxzg-remake-preview"


class PreviewServer(ThreadingHTTPServer):
    # Windows SO_REUSEADDR permits multiple live listeners, unlike POSIX.
    allow_reuse_address = sys.platform != "win32"
    request_queue_size = 64

    def server_bind(self):
        if hasattr(socket, "SO_EXCLUSIVEADDRUSE"):
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()


def read_build(directory):
    try:
        build = json.loads((directory / "mxzg-build.json").read_text(encoding="utf-8-sig"))
        if not isinstance(build, dict) or build["application"] != "mxzg-remake-h5" or build["entryScene"] != "db://assets/scenes/Remake.scene":
            raise ValueError("Unexpected build identity or entry scene")
        if not (directory / "index.html").is_file():
            raise ValueError("index.html is missing")
        return build
    except (OSError, ValueError, KeyError) as error:
        raise ValueError("No verified Remake H5 build. Run scripts/build-remake-h5.bat first.") from error


def handler_for(directory):
    directory = directory.resolve()

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(directory), **kwargs)

        def end_headers(self):
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            super().end_headers()

        def do_GET(self):
            if urlsplit(self.path).path == "/__mxzg_preview__":
                try:
                    body = json.dumps({"application": PREVIEW_ID, "build": read_build(directory)}).encode()
                except ValueError:
                    self.send_error(503, "Build is incomplete")
                    return
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
            self.serve_file(False)

        def do_HEAD(self):
            self.serve_file(True)

        def serve_file(self, head):
            relative = unquote(urlsplit(self.path).path).lstrip("/")
            candidate = (directory / relative).resolve()
            if not candidate.is_relative_to(directory):
                self.send_error(403)
                return
            if relative == "favicon.ico" and not candidate.exists():
                # Browsers request this implicitly even when the mobile template has no icon.
                self.send_response(204)
                self.end_headers()
                return
            if candidate.is_dir() and not (candidate / "index.html").is_file():
                self.send_error(404)
                return
            if head:
                super().do_HEAD()
            else:
                super().do_GET()

    return Handler


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT / "client/build/remake-h5")
    parser.add_argument("--port", type=int, default=18081)
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()
    directory = args.root.resolve()
    build = read_build(directory)
    validate_build(directory)
    url = f"http://127.0.0.1:{args.port}/"
    mimetypes.add_type("application/wasm", ".wasm")
    mimetypes.add_type("application/javascript", ".js")
    try:
        server = PreviewServer(("127.0.0.1", args.port), handler_for(directory))
    except OSError:
        try:
            with urlopen(url + "__mxzg_preview__", timeout=3) as response:
                existing = json.load(response)
            if existing.get("application") != PREVIEW_ID or existing.get("build") != build:
                raise ValueError("Different preview or build")
        except (OSError, ValueError):
            raise ValueError(f"Port {args.port} is occupied by another service. It was not stopped.")
        print(f"[READY] Reusing the existing Remake H5 preview at {url}", flush=True)
        if not args.no_browser:
            webbrowser.open(url)
        return
    print(f"[READY] Remake H5: {url}\nBuilt: {build['builtAt']}\nBackend: http://127.0.0.1:18080\n"
          "Keep this window open. Ctrl+C stops only this H5 preview.", flush=True)
    if not args.no_browser:
        webbrowser.open(url)
    try:
        server.serve_forever(poll_interval=0.25)
    except KeyboardInterrupt:
        print("\n[STOPPED] H5 preview stopped.", flush=True)
    finally:
        server.server_close()


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError) as error:
        print(f"[ERROR] {error}", file=sys.stderr)
        sys.exit(1)
