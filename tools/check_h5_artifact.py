"""Reject malformed Creator Bundle configuration before publishing a local H5."""
import json
from pathlib import Path
import sys


def validate_bundle(config, name):
    uuids = config.get("uuids")
    if not isinstance(uuids, list) or len(set(uuids)) != len(uuids):
        raise ValueError(f"{name}: missing or duplicate UUID table")
    known = set(uuids)

    def known_reference(reference):
        if reference in known:
            return True
        return ((isinstance(reference, int) or isinstance(reference, str) and reference.isdigit())
                and 0 <= int(reference) < len(uuids))

    for pack, entries in config.get("packs", {}).items():
        if not isinstance(entries, list):
            raise ValueError(f"{name}: invalid pack {pack}")
        missing = [item for item in entries if not known_reference(item)]
        if missing:
            raise ValueError(f"{name}: pack {pack} references {len(missing)} missing UUIDs; first: {missing[0]}")
    redirects = config.get("redirect", [])
    dependencies = config.get("deps", [])
    if len(redirects) % 2:
        raise ValueError(f"{name}: invalid redirect table")
    for asset, dependency in zip(redirects[::2], redirects[1::2]):
        numeric = isinstance(dependency, int) or isinstance(dependency, str) and dependency.isdigit()
        if not known_reference(asset) or not numeric or not 0 <= int(dependency) < len(dependencies):
            raise ValueError(f"{name}: invalid redirect dependency")
    return len(uuids)


def validate_build(directory):
    if not (directory / "index.html").is_file():
        raise ValueError("index.html is missing")
    files = list((directory / "src").glob("settings*.json"))
    if len(files) != 1:
        raise ValueError("Expected one build settings JSON")
    settings = json.loads(files[0].read_text(encoding="utf-8-sig"))
    if settings.get("launch", {}).get("launchScene") != "db://assets/scenes/Remake.scene":
        raise ValueError("Entry scene must be Remake.scene")
    bundles = settings.get("assets", {}).get("projectBundles", [])
    if not {"resources", "main", "prefabs", "remake-home"}.issubset(bundles):
        raise ValueError("Required Remake bundles are missing")
    for name in bundles:
        configs = list((directory / "assets" / name).glob("config*.json"))
        if len(configs) != 1:
            raise ValueError(f"{name}: expected one bundle configuration")
        config = json.loads(configs[0].read_text(encoding="utf-8-sig"))
        count = validate_bundle(config, name)
        print(f"PASS H5 bundle {name}: {count} UUIDs, pack references and redirects valid")


if __name__ == "__main__":
    try:
        validate_build(Path(sys.argv[1]).resolve())
    except (ValueError, KeyError, OSError) as error:
        print(f"FAIL H5 artifact: {error}", file=sys.stderr)
        sys.exit(1)
