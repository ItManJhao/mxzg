"""Local preview isolation and Windows backend process ownership regression checks."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from threading import Thread
import unittest
from urllib.error import HTTPError
from urllib.request import urlopen

from serve_remake_h5 import PreviewServer, handler_for, read_build
from check_h5_artifact import validate_bundle

ROOT = Path(__file__).resolve().parents[1]


class StaticPreviewTest(unittest.TestCase):
    def test_bundle_pack_and_redirect_references(self):
        self.assertEqual(validate_bundle({"uuids": ["root", "image"], "packs": {"p": ["root", "image"]}}, "home"), 2)
        self.assertEqual(validate_bundle({"uuids": ["root"], "redirect": ["root", "0"], "deps": ["shared"]}, "home"), 1)
        with self.assertRaisesRegex(ValueError, "missing UUIDs"):
            validate_bundle({"uuids": ["root"], "packs": {"p": ["root", "missing"]}}, "home")
        with self.assertRaisesRegex(ValueError, "redirect"):
            validate_bundle({"uuids": ["root"], "redirect": ["root", 1], "deps": []}, "home")

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.parent = Path(self.temp.name)
        self.directory = self.parent / "build"
        self.directory.mkdir()
        self.build = {"application": "mxzg-remake-h5", "entryScene": "db://assets/scenes/Remake.scene",
                      "builtAt": "test"}
        (self.directory / "mxzg-build.json").write_text(json.dumps(self.build))
        (self.directory / "index.html").write_text("<html>Remake</html>")
        (self.directory / "assets").mkdir()
        (self.directory / "src").mkdir()
        bundles = ["resources", "main", "prefabs", "remake-home"]
        (self.directory / "src/settings.json").write_text(json.dumps({
            "launch": {"launchScene": "db://assets/scenes/Remake.scene"},
            "assets": {"projectBundles": bundles}}))
        for name in bundles:
            bundle = self.directory / "assets" / name
            bundle.mkdir()
            (bundle / "config.json").write_text(json.dumps({"uuids": ["root"], "packs": {}}))
        (self.parent / "private.txt").write_text("outside the build")
        self.server = PreviewServer(("127.0.0.1", 0), handler_for(self.directory))
        self.worker = Thread(target=self.server.serve_forever, kwargs={"poll_interval": .05}, daemon=True)
        self.worker.start()
        self.base = f"http://127.0.0.1:{self.server.server_port}"
        self.addCleanup(self.stop)

    def stop(self):
        self.server.shutdown()
        self.server.server_close()
        self.worker.join(timeout=2)

    def test_latest_entry_is_required(self):
        self.assertEqual(read_build(self.directory), self.build)
        self.build["entryScene"] = "db://assets/scenes/legacy/Boot.scene"
        (self.directory / "mxzg-build.json").write_text(json.dumps(self.build))
        with self.assertRaises(ValueError):
            read_build(self.directory)

    def test_index_and_identity_have_no_cache(self):
        with urlopen(self.base + "/") as response:
            self.assertEqual(response.read(), b"<html>Remake</html>")
            self.assertEqual(response.headers["Cache-Control"], "no-store")
        with urlopen(self.base + "/favicon.ico") as response:
            self.assertEqual(response.status, 204)
        with urlopen(self.base + "/__mxzg_preview__") as response:
            self.assertEqual(json.load(response)["build"], self.build)

    def test_cannot_list_or_escape_build(self):
        for path, status in [("/assets/", 404), ("/%2e%2e/private.txt", 403)]:
            with self.subTest(path=path), self.assertRaises(HTTPError) as error:
                urlopen(self.base + path)
            self.assertEqual(error.exception.code, status)

    def test_duplicate_listener_is_rejected(self):
        with self.assertRaises(OSError):
            PreviewServer(self.server.server_address, handler_for(self.directory))

    def test_repeated_launcher_reuses_server(self):
        result = subprocess.run([sys.executable, str(ROOT / "tools/serve_remake_h5.py"),
                                 "--root", str(self.directory), "--port", str(self.server.server_port), "--no-browser"],
                                capture_output=True, text=True, timeout=15)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("[READY] Reusing", result.stdout)


@unittest.skipUnless(os.name == "nt", "Windows process ownership checks")
class BackendOwnershipTest(unittest.TestCase):
    def test_entrypoint_profile_and_workspace_are_required(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            argument_file = directory / "java classpath.args"
            # Java quotes/escapes backslashes in Maven's argument file.
            argument_file.write_text('"' + str(ROOT / 'backend/target/classes').replace('\\', '\\\\') + ';other.jar"')
            script = directory / "ownership.ps1"
            script.write_text(r'''
param([string]$Root, [string]$ArgumentFile)
$ErrorActionPreference = 'Stop'
. (Join-Path $Root 'backend/BackendProcess.ps1')
$backend = Join-Path $Root 'backend'
$jar = Join-Path $backend 'target/mxzg-remake-0.1.0-SNAPSHOT.jar'
$cases = @(
    @{ name='java.exe'; command='java -jar "' + $jar + '" --spring.profiles.active=local'; accept=$true },
    @{ name='java.exe'; command='java -cp @"' + $ArgumentFile + '" com.funsgamex.mxzg.GameApplication --spring.profiles.active=local'; accept=$true },
    @{ name='java.exe'; command='java -jar "' + $jar + '" --spring.profiles.active=production'; accept=$false },
    @{ name='java.exe'; command='java -jar C:\other\mxzg-remake.jar --spring.profiles.active=local'; accept=$false },
    @{ name='java.exe'; command='java -jar target/mxzg-remake-0.1.0-SNAPSHOT.jar --spring.profiles.active=local'; accept=$false },
    @{ name='java.exe'; command='java OtherApplication --spring.profiles.active=local'; accept=$false },
    @{ name='python.exe'; command='python server.py'; accept=$false }
)
foreach ($case in $cases) {
    $accepted = $true
    try { Assert-WorkspaceBackend ([pscustomobject]@{Name=$case.name; CommandLine=$case.command}) $backend }
    catch { $accepted = $false }
    if ($accepted -ne $case.accept) { throw "Ownership check failed for: $($case.command)" }
}
Write-Host 'PASS 7 ownership cases'
''', encoding="utf-8")
            result = subprocess.run(["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass",
                                     "-File", str(script), "-Root", str(ROOT), "-ArgumentFile", str(argument_file)],
                                    capture_output=True, text=True, timeout=30)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertIn("PASS 7", result.stdout)


if __name__ == "__main__":
    unittest.main()
