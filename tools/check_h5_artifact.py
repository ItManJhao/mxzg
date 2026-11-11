"""发布前只读核验本地H5的Bundle表、远程输出及启动预载配置。

读取构建settings中登记的包名，不维护模块资源清单；被serve_remake_h5调用，失败禁止启动验收入口。
"""
import json
from pathlib import Path
import sys


def validate_bundle(config, name):
    """验证单包UUID、合并文件和重定向索引，返回UUID数量；不代表资源画面已验收。"""
    uuids = config.get("uuids")
    if not isinstance(uuids, list) or len(set(uuids)) != len(uuids):
        raise ValueError(f"{name}: missing or duplicate UUID table")
    known = set(uuids)

    def known_reference(reference):
        """允许Creator输出完整UUID或紧凑索引，拒绝超出本包表的引用。"""
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
    """按最终settings检查实际本地/远程包，缺包或本地启动依赖配置错误时拒绝整个产物。"""
    if not (directory / "index.html").is_file():
        raise ValueError("index.html is missing")
    files = list((directory / "src").glob("settings*.json"))
    if len(files) != 1:
        raise ValueError("Expected one build settings JSON")
    settings = json.loads(files[0].read_text(encoding="utf-8-sig"))
    if settings.get("launch", {}).get("launchScene") != "db://assets/scenes/Remake.scene":
        raise ValueError("Entry scene must be Remake.scene")
    assets = settings.get("assets", {})
    bundles = assets.get("projectBundles", [])
    if not isinstance(bundles, list) or not {"main", "bootstrap"}.issubset(bundles):
        raise ValueError("Required local startup bundles are missing")
    if any(not isinstance(name, str) or "/" in name or "\\" in name or ":" in name
           or name in ("", ".", "..") for name in bundles):
        raise ValueError("Invalid bundle name")
    if len(set(bundles)) != len(bundles):
        raise ValueError("Duplicate project bundle")
    remote = assets.get("remoteBundles", [])
    if not isinstance(remote, list) or any(name not in bundles for name in remote):
        raise ValueError("Remote bundle is not registered")
    if {"main", "bootstrap"}.intersection(remote):
        raise ValueError("Startup bundles must stay local")
    preloads = assets.get("preloadBundles", [])
    if not isinstance(preloads, list) or any(not isinstance(row, dict) for row in preloads):
        raise ValueError("Invalid startup preload list")
    if not {"main", "bootstrap"}.issubset({row.get("bundle") for row in preloads}):
        raise ValueError("Startup must preload main and bootstrap")
    for name in bundles:
        location = "remote" if name in remote else "assets"
        configs = list((directory / location / name).glob("config*.json"))
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
