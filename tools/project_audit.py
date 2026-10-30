"""Read-only source inventory and incremental architecture boundary check.

This checks static relative TypeScript imports, not Prefab or dynamic references.
It must never be used alone to decide whether an asset can be deleted.
"""
import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "client/assets/scripts"
BASELINE = ROOT / "tools/architecture-baseline.json"
TOKENS = re.compile(r'"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'|//[^\n]*|/\*[\s\S]*?\*/')
IMPORTS = re.compile(r'\bfrom\s+["\'](\.[^"\']+)["\']|\bimport\s*["\'](\.[^"\']+)["\']')


def source_imports(text):
    clean = TOKENS.sub(lambda m: "" if m[0].startswith(("//", "/*")) else m[0], text)
    return [m[1] or m[2] for m in IMPORTS.finditer(clean)]


def inventory():
    files = sorted(SCRIPTS.rglob("*.ts"))
    edges, unresolved, sizes = [], [], []
    for path in files:
        text = path.read_text(encoding="utf-8-sig")
        name = path.relative_to(SCRIPTS).as_posix()
        sizes.append({"file": name, "lines": len(text.splitlines())})
        for spec in source_imports(text):
            target = path.parent / spec
            candidates = (Path(str(target) + ".ts"), target / "index.ts")
            resolved = next((p.resolve() for p in candidates if p.is_file()), None)
            if resolved is None:
                unresolved.append({"file": name, "import": spec})
                continue
            try:
                dest = resolved.relative_to(SCRIPTS).as_posix()
            except ValueError:
                unresolved.append({"file": name, "import": spec})
                continue
            edges.append((name, dest))
    violations = []
    for src, dest in sorted(set(edges)):
        reason = None
        if src.startswith("framework/") and dest.startswith(("features/", "module/", "ui/")):
            reason = "framework depends on business or legacy UI"
        elif src.startswith("module/") and dest.startswith(("ui/", "features/")):
            reason = "module depends on presentation or features"
        if reason:
            violations.append({"from": src, "to": dest, "reason": reason})
    accepted = json.loads(BASELINE.read_text(encoding="utf-8"))["exceptions"]
    allowed = {(v["from"], v["to"]) for v in accepted}
    current = {(v["from"], v["to"]) for v in violations}
    new = [v for v in violations if (v["from"], v["to"]) not in allowed]
    stale = [v for v in accepted if (v["from"], v["to"]) not in current]
    assets = ROOT / "client/assets/resources"
    resource_bytes, resource_files = 0, 0
    for path in assets.rglob("*"):
        if path.is_file() and path.suffix != ".meta":
            resource_bytes += path.stat().st_size
            resource_files += 1
    return {
        "scope": "static relative TypeScript imports; source assets excluding .meta; not build output",
        "script_files": len(files), "import_edges": len(set(edges)),
        "largest_files": sorted(sizes, key=lambda v: (-v["lines"], v["file"]))[:12],
        "prefabs": len(list((ROOT / "client/assets/prefabs").rglob("*.prefab"))),
        "resources": {"files": resource_files, "bytes": resource_bytes,
                      "mib": round(resource_bytes / 1024 / 1024, 2)},
        "boundary_exceptions": violations, "new_violations": new,
        "stale_exceptions": stale, "unresolved_imports": unresolved,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true", help="Print the complete inventory as JSON")
    args = parser.parse_args()
    report = inventory()
    if args.json:
        print(json.dumps(report, ensure_ascii=True, indent=2))
    else:
        print("Scripts: {script_files}; imports: {import_edges}; prefabs: {prefabs}".format(**report))
        print("Resources (source, excluding meta): {files} files, {mib} MiB".format(**report["resources"]))
        for row in report["largest_files"][:5]:
            print("  {lines:5} lines  {file}".format(**row))
        print("Accepted boundary debt: {}".format(len(report["boundary_exceptions"])))
        for key in ("new_violations", "stale_exceptions", "unresolved_imports"):
            for row in report[key]:
                print(key + ": " + json.dumps(row, ensure_ascii=True))
    return 1 if any(report[k] for k in ("new_violations", "stale_exceptions", "unresolved_imports")) else 0


if __name__ == "__main__":
    raise SystemExit(main())
