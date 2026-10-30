"""Read-only source dependency inventory. This is not a build size or deletion oracle."""
import argparse
import hashlib
import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
UUID = re.compile(r"^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}(?:@[\w-]+)?$", re.I)
JSON_TYPES = {".json", ".prefab", ".scene", ".mtl", ".spriteatlas"}

def strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for item in value.values(): yield from strings(item)
    elif isinstance(value, list):
        for item in value: yield from strings(item)

def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))

def audit(assets, duplicates=False):
    assets = Path(assets)
    files = sorted(p for p in assets.rglob("*") if p.is_file() and p.suffix != ".meta")
    sizes = {p.relative_to(assets).as_posix(): p.stat().st_size for p in files}
    uuids, metadata, bundles, errors = {}, {}, {}, []
    for path in sorted(assets.rglob("*.meta")):
        try:
            data = read_json(path)
            name = path.relative_to(assets).as_posix()[:-5]
            metadata[name] = data
            for token in strings(data):
                if UUID.fullmatch(token) and token == data.get("uuid"):
                    uuids[token.split("@")[0]] = name
            if data.get("userData", {}).get("isBundle"):
                bundles[name] = data["userData"].get("bundleName", Path(name).name)
        except (ValueError, OSError) as error:
            errors.append({"file": str(path.relative_to(assets)), "error": str(error)})
    graph = {name: set() for name in sizes}
    unresolved = defaultdict(set)
    for name in sizes:
        path = assets / name
        payloads = [metadata.get(name, {})]
        if path.suffix in JSON_TYPES:
            try: payloads.append(read_json(path))
            except (ValueError, OSError) as error:
                errors.append({"file": name, "error": str(error)})
        for payload in payloads:
            for token in strings(payload):
                if not UUID.fullmatch(token): continue
                target = uuids.get(token.split("@")[0])
                if target in sizes and target != name: graph[name].add(target)
                elif target is None: unresolved[token].add(name)
        if path.suffix == ".atlas":
            for line in path.read_text(encoding="utf-8-sig").splitlines():
                if line and not line[0].isspace() and line.lower().endswith((".png", ".jpg", ".webp")):
                    target = (path.parent / line).relative_to(assets).as_posix()
                    if target in sizes: graph[name].add(target)
                    else: errors.append({"file": name, "error": "missing atlas page " + line})

    def owner(name):
        matches = [folder for folder in bundles if name.startswith(folder + "/")]
        return bundles[max(matches, key=len)] if matches else "main-or-unassigned"

    def closure(entry):
        seen, pending = set(), [entry]
        while pending:
            item = pending.pop()
            if item in seen or item not in graph: continue
            seen.add(item); pending.extend(graph[item] - seen)
        return {"entry": entry, "files": len(seen), "source_bytes": sum(sizes[n] for n in seen),
                "assets": sorted(seen)}

    totals = defaultdict(lambda: {"files": 0, "source_bytes": 0})
    for name, count in sizes.items():
        row = totals[owner(name)]; row["files"] += 1; row["source_bytes"] += count
    dynamic = []
    for path in sorted((assets / "scripts").rglob("*.ts")):
        for number, line in enumerate(path.read_text(encoding="utf-8-sig").splitlines(), 1):
            if re.search(r"\b(?:resources\.(?:load|preload)|loadPrefab|loadBundle)\s*(?:<[^>]+>)?\s*\(", line):
                dynamic.append({"file": path.relative_to(assets).as_posix(), "line": number, "source": line.strip()[:200]})
    duplicate_groups = []
    if duplicates:
        same_size = defaultdict(list)
        for name, count in sizes.items(): same_size[count].append(name)
        hashes = defaultdict(list)
        for group in same_size.values():
            if len(group) < 2: continue
            for name in group:
                hashes[hashlib.sha256((assets / name).read_bytes()).hexdigest()].append(name)
        for group in hashes.values():
            if len(group) > 1:
                duplicate_groups.append({"assets": group, "bytes_each": sizes[group[0]],
                                         "extra_source_bytes": sizes[group[0]] * (len(group)-1)})
        duplicate_groups.sort(key=lambda row: -row["extra_source_bytes"])
    scenes = [closure(name) for name in sizes if name.endswith(".scene")]
    return {
        "scope": "Source files excluding .meta; UUID metadata/serialized references and atlas pages. Not build/network/GPU size.",
        "limitations": ["Dynamic paths and script import dependencies are not included in closures.",
                       "Unresolved UUIDs may belong to engine built-ins. No automatic deletion decisions.",
                       "Bundles listed are authoring ownership, not final build dependency placement."],
        "files": len(sizes), "source_bytes": sum(sizes.values()), "bundles": dict(totals),
        "scenes": scenes, "references": {name: sorted(edges) for name, edges in graph.items() if edges},
        "largest": [{"asset": name, "bytes": count} for name, count in sorted(sizes.items(), key=lambda row: -row[1])[:20]],
        "unresolved_uuids": [{"uuid": key, "referenced_by": sorted(value)} for key, value in sorted(unresolved.items())],
        "dynamic_load_sites": dynamic, "duplicate_scan": duplicates, "duplicates": duplicate_groups, "errors": errors,
    }

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--assets", type=Path, default=ROOT / "client/assets")
    parser.add_argument("--output", type=Path, default=ROOT / "client/temp/resource-audit/report.json")
    parser.add_argument("--duplicates", action="store_true")
    args = parser.parse_args()
    report = audit(args.assets, args.duplicates)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print(f"Source inventory: {report['files']} files, {report['source_bytes']/1024/1024:.2f} MiB")
    for scene in report["scenes"]:
        print(f"{scene['entry']}: serialized closure {scene['files']} files, {scene['source_bytes']/1024/1024:.2f} source MiB")
    print(f"Dynamic load sites: {len(report['dynamic_load_sites'])}; parse/missing-atlas errors: {len(report['errors'])}")
    print(f"Report: {args.output}")
    return 1 if report["errors"] else 0

if __name__ == "__main__": raise SystemExit(main())
