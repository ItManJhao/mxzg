"""Real Windows stop/restart acceptance on a random port and isolated file database.

Requires backend/dev.ps1 package. Never accesses the developer's game database.
"""
import json
import os
from pathlib import Path
import socket
import subprocess
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
import time
from urllib.request import Request, urlopen
import uuid

ROOT = Path(__file__).resolve().parents[1]
JAVA = next((ROOT / "backend/.tools").glob("jdk-*/bin/java.exe"), None)
JAR = ROOT / "backend/target/mxzg-remake-0.1.0-SNAPSHOT.jar"
if os.name != "nt" or JAVA is None or not JAR.is_file():
    raise SystemExit("Requires Windows, local Java 21, and backend/dev.ps1 package.")
RUN = ROOT / "backend/.local" / ("control-check-" + uuid.uuid4().hex[:10])
RUN.mkdir(parents=True)
with socket.socket() as listener:
    listener.bind(("127.0.0.1", 0))
    PORT = listener.getsockname()[1]
ENV = dict(os.environ, MXZG_PORT=str(PORT),
           SPRING_DATASOURCE_URL="jdbc:h2:file:" + (RUN / "game").as_posix() +
           ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;WRITE_DELAY=0")
FLAGS = getattr(subprocess, "CREATE_NO_WINDOW", 0)


def control(action, environment=ENV):
    return subprocess.run(["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
                           str(ROOT / "backend/control.ps1"), "-Action", action],
                          cwd=ROOT, env=environment, capture_output=True, encoding="utf-8",
                          errors="replace", timeout=40, creationflags=FLAGS)


def api(path, data=None, token=None, origin=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    if origin:
        headers["Origin"] = origin
    request = Request(f"http://127.0.0.1:{PORT}/api/v1/{path}",
                      data=None if data is None else json.dumps(data).encode(), headers=headers)
    with urlopen(request, timeout=5) as response:
        return json.load(response), response.headers


def ready(process):
    deadline = time.monotonic() + 150
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise AssertionError(f"Backend exited early; see {RUN}")
        try:
            api("servers")
            return
        except OSError:
            time.sleep(.5)
    raise AssertionError(f"Backend startup timed out; see {RUN}")


class OtherService(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"other")

    def log_message(self, *args):
        pass


with ThreadingHTTPServer(("127.0.0.1", 0), OtherService) as other:
    worker = Thread(target=other.serve_forever, kwargs={"poll_interval": .05}, daemon=True)
    worker.start()
    result = control("stop", dict(ENV, MXZG_PORT=str(other.server_port)))
    assert result.returncode != 0 and "Refusing" in result.stderr, result.stdout + result.stderr
    with urlopen(f"http://127.0.0.1:{other.server_port}/", timeout=3) as response:
        assert response.read() == b"other"
    other.shutdown()
    worker.join(timeout=2)
print("PASS unrelated listener is refused and stays alive", flush=True)

process = None
restart = None
with (RUN / "java.log").open("w") as first_log, (RUN / "restart.log").open("w") as restart_log:
    try:
        result = control("stop")
        assert result.returncode == 0 and "[STOPPED]" in result.stdout
        process = subprocess.Popen([str(JAVA), "-jar", str(JAR), "--spring.profiles.active=local"],
                                   cwd=ROOT / "backend", env=ENV, stdout=first_log, stderr=first_log,
                                   creationflags=FLAGS)
        ready(process)
        login, _ = api("development/login", {"account": "control_acceptance", "serverId": "local-1"})
        token, role = login["session"]["accessToken"], login["role"]["id"]
        api("campaign/initialize", {}, token)
        result = control("status")
        assert result.returncode == 0 and "[READY]" in result.stdout, result.stdout + result.stderr
        result = control("stop")
        assert result.returncode == 0 and "port" in result.stdout, result.stdout + result.stderr
        process.wait(timeout=15)
        print("PASS packaged workspace backend status/stop", flush=True)
        restart = subprocess.Popen(["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
                                    str(ROOT / "backend/control.ps1"), "-Action", "restart"],
                                   cwd=ROOT, env=ENV, stdout=restart_log, stderr=restart_log,
                                   creationflags=FLAGS)
        ready(restart)
        assert api("roles/me", token=token)[0]["id"] == role
        assert api("campaign", token=token)[0]["initialized"]
        for origin in ("http://127.0.0.1:18081", "http://localhost:18081"):
            _, headers = api("servers", origin=origin)
            assert headers["Access-Control-Allow-Origin"] == origin
        result = control("stop")
        assert result.returncode == 0, result.stdout + result.stderr
        restart.wait(timeout=30)
        assert "[STOPPED]" in control("status").stdout
        print("PASS Maven restart loads current code; session/role/campaign survive; H5 CORS works", flush=True)
    finally:
        if (process and process.poll() is None) or (restart and restart.poll() is None):
            control("stop")
        for child in (process, restart):
            if child and child.poll() is None:
                try:
                    child.wait(timeout=15)
                except subprocess.TimeoutExpired:
                    child.terminate()
                    child.wait(timeout=10)
print(f"PASS backend control acceptance. Evidence: {RUN}", flush=True)
