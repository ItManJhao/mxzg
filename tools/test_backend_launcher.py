"""Black-box checks: an occupied port never starts a second Maven/backend process."""
import os
import json
from pathlib import Path
import subprocess
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
import unittest

ROOT = Path(__file__).resolve().parents[1]


@unittest.skipUnless(os.name == "nt", "Windows PowerShell launcher")
class BackendLauncherTest(unittest.TestCase):
    def probe_occupied_port(self, status, catalog=None, feature_status=401, expected_exit=1):
        requests = []

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                requests.append(self.path)
                response_status = status
                body = b""
                if self.path == "/api/v1/servers" and catalog is not None:
                    response_status = 200
                    body = json.dumps(catalog).encode()
                elif self.path in ("/api/v1/inventory", "/api/v1/campaign"):
                    response_status = feature_status
                self.send_response(response_status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def log_message(self, *args):
                pass

        with ThreadingHTTPServer(("127.0.0.1", 0), Handler) as server:
            worker = Thread(target=server.serve_forever, kwargs={"poll_interval": 0.05}, daemon=True)
            worker.start()
            try:
                environment = dict(os.environ, MXZG_PORT=str(server.server_port))
                result = subprocess.run([
                    "powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass",
                    "-File", str(ROOT / "backend/dev.ps1"), "-Action", "run",
                ], cwd=ROOT, env=environment, capture_output=True, text=True,
                    encoding="utf-8", errors="replace", timeout=15)
            finally:
                server.shutdown()
                worker.join(timeout=2)
        if expected_exit == 0:
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        else:
            self.assertNotEqual(result.returncode, 0)
        expected_requests = ["/api/v1/heroes"]
        if status == 401:
            expected_requests.append("/api/v1/servers")
            if catalog:
                expected_requests.append("/api/v1/inventory")
                if feature_status != 404:
                    expected_requests.append("/api/v1/campaign")
        self.assertEqual(requests, expected_requests)
        output = result.stdout + result.stderr
        self.assertNotIn("Scanning for projects", output)
        return output

    def test_old_backend_explains_restart(self):
        output = self.probe_occupied_port(404)
        self.assertIn("OLD backend", output)
        self.assertIn("HTTP 404", output)
        self.assertIn("Ctrl+C", output)

    def test_authenticated_endpoint_keeps_existing_server(self):
        output = self.probe_occupied_port(401)
        self.assertIn("already in use", output)
        self.assertNotIn("OLD backend", output)

    def test_compatible_backend_is_reused_successfully(self):
        catalog = [{"id": "local-1", "regionId": "local", "regionName": "Local",
                    "name": "Development", "enabled": True},
                   {"id": "local-2", "regionId": "local", "regionName": "Local",
                    "name": "Development 2", "enabled": False}]
        output = self.probe_occupied_port(401, catalog=catalog, expected_exit=0)
        self.assertIn("[READY]", output)
        self.assertIn("Reusing the existing server", output)
        self.assertIn("will not stop the existing server", output)

    def test_incomplete_backend_requires_update(self):
        catalog = [{"id": "local-1", "regionId": "local", "regionName": "Local",
                    "name": "Development", "enabled": True}]
        output = self.probe_occupied_port(401, catalog=catalog, feature_status=404)
        self.assertIn("OLD backend", output)
        self.assertIn("/api/v1/inventory", output)

    def test_other_server_is_not_stopped(self):
        output = self.probe_occupied_port(200)
        self.assertIn("already in use", output)
        self.assertIn("does not stop other processes", output)


if __name__ == "__main__":
    unittest.main()
