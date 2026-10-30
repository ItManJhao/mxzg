"""Verify the packaged backend across forced Windows process restarts.

Uses a unique H2 file and a random loopback port. Never opens the developer's
game database, prints session credentials, or stops a pre-existing process.
Run after: powershell.exe -NoProfile -ExecutionPolicy Bypass -File backend/dev.ps1 -Action package
"""
import json
import pathlib
import socket
import subprocess
import time
import urllib.request
import uuid

ROOT = pathlib.Path(__file__).resolve().parents[1]
LOCAL = ROOT / "backend/.local"
LOCAL.mkdir(exist_ok=True)
JAVA = next((ROOT / "backend/.tools").glob("jdk-*/bin/java.exe"), None)
JAR = ROOT / "backend/target/mxzg-remake-0.1.0-SNAPSHOT.jar"
if JAVA is None or not JAR.exists():
    raise SystemExit("Run backend/dev.ps1 package with local Java 21 first.")

with socket.socket() as listener:
    listener.bind(("127.0.0.1", 0))
    PORT = listener.getsockname()[1]
BASE = f"http://127.0.0.1:{PORT}/api/v1/"
DATABASE = LOCAL / ("night-verify-" + uuid.uuid4().hex[:12])
LOG_PATH = LOCAL / "database-restart-check.log"


class Backend:
    def __init__(self, log):
        self.log = log
        self.process = None

    def start(self):
        arguments = [str(JAVA), "-jar", str(JAR), "--spring.profiles.active=local",
                     f"--server.port={PORT}", "--spring.datasource.url=jdbc:h2:file:" +
                     DATABASE.as_posix() + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;WRITE_DELAY=0"]
        self.process = subprocess.Popen(
            arguments, cwd=ROOT / "backend", stdout=self.log, stderr=self.log,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        for _ in range(180):
            if self.process.poll() is not None:
                raise RuntimeError(f"Backend exited; inspect {LOG_PATH}")
            try:
                request("servers")
                return
            except (OSError, ValueError):
                time.sleep(0.5)
        raise RuntimeError(f"Backend startup timed out; inspect {LOG_PATH}")

    def stop(self):
        if self.process and self.process.poll() is None:
            # Windows TerminateProcess deliberately bypasses JVM shutdown hooks.
            self.process.terminate()
            self.process.wait(timeout=20)
        self.process = None

    def restart(self):
        self.stop()
        self.start()


def request(path, data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    body = None if data is None else json.dumps(data).encode()
    query = urllib.request.Request(BASE + path, data=body, headers=headers)
    with urllib.request.urlopen(query, timeout=10) as response:
        return json.load(response)


def verify(backend):
    backend.start()
    login = request("development/login", {"account": "restart_acceptance", "serverId": "local-1"})
    token = login["session"]["accessToken"]
    role = login["role"]["id"]
    other = request("development/login", {"account": "restart_acceptance", "serverId": "local-2"})
    assert other["role"]["id"] != role
    state = request("campaign/initialize", {}, token)
    assert state["initialized"] and len(state["units"]) == 4
    inventory = request("inventory", token=token)
    assert len(inventory) == 2
    key = str(uuid.uuid4())
    battle = request("campaign/battles", {"requestId": key}, token)
    assert battle["won"]
    assert request("campaign/battles", {"requestId": key}, token) == battle

    backend.restart()
    assert request("roles/me", token=token)["id"] == role
    assert request("campaign", token=token)["pending"]["id"] == battle["id"]
    assert request("inventory", token=token) == inventory
    path = "campaign/battles/" + battle["id"] + "/claim"
    claim = request(path, {}, token)
    assert claim["role"]["gold"] == 4000 and claim["stageId"] == 2
    assert request(path, {}, token) == claim

    backend.restart()
    assert request("roles/me", token=token)["gold"] == 4000
    assert request("campaign", token=token)["stageId"] == 2
    assert request("campaign", token=token)["pending"] is None
    assert request("inventory", token=token) == claim["inventory"]
    assert request("inventory", token=other["session"]["accessToken"]) == []
    print("PASS real jar + H2 file: world isolation, starter, pending battle across forced restart;")
    print("claim once; wallet, inventory, stage and session survive the second forced restart.")


if __name__ == "__main__":
    with LOG_PATH.open("w", encoding="utf8") as log:
        backend = Backend(log)
        try:
            verify(backend)
        finally:
            backend.stop()
