"""离线工具按Creator目录meta发现Bundle，不把普通归档父目录或历史物理路径当成包名。

只读取当前assets；历史证据中的bundles/包名路径可解析到现有目录，证据内容保持原样。
配置导出、Prefab审查和资源检查共用此入口，不维护另一份模块/资源包分组表。
"""
import json
from functools import lru_cache
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "client/assets"


@lru_cache(maxsize=8)
def _bundle_index(assets_root: Path) -> dict[str, Path]:
    """读取真实目录的Bundle声明并拒绝重复包名或越界目录；每个工具进程缓存一次。"""
    base = assets_root.resolve()
    bundles = {}
    for meta in sorted(base.rglob("*.meta")):
        directory = Path(str(meta)[:-5])
        if not directory.is_dir():
            continue
        data = json.loads(meta.read_text(encoding="utf-8-sig"))
        settings = data.get("userData", {})
        if settings.get("isBundle") is not True:
            continue
        directory = directory.resolve()
        if not directory.is_relative_to(base):
            raise ValueError("Bundle目录越出assets：" + str(directory))
        name = settings.get("bundleName") or directory.name
        if not isinstance(name, str) or not name or any(char in name for char in "/\\"):
            raise ValueError("Bundle名称非法：" + str(meta))
        if name in bundles:
            raise ValueError("Bundle名称重复：" + name)
        bundles[name] = directory
    return bundles


def discover_bundles(assets_root: Path = ASSETS) -> dict[str, Path]:
    """返回当前包名到绝对目录的副本，调用方修改结果不会污染后续工具解析。"""
    return dict(_bundle_index(Path(assets_root).resolve()))


def bundle_directory(name: str, assets_root: Path = ASSETS) -> Path:
    """取得已声明Bundle的当前目录；缺失包直接拒绝，不创建目录或猜测分组。"""
    bundles = discover_bundles(assets_root)
    if name not in bundles:
        raise ValueError("未发现Bundle：" + name)
    return bundles[name]


def bundle_asset_path(name: str, relative: str | Path, assets_root: Path = ASSETS) -> Path:
    """拼接包内相对资源路径并拒绝目录穿越；仅定位文件，不加载或生成资源。"""
    path = PurePosixPath(str(relative).replace("\\", "/"))
    if path.is_absolute() or ".." in path.parts or any(":" in part for part in path.parts):
        raise ValueError("包内路径必须是安全相对路径：" + str(relative))
    return bundle_directory(name, assets_root).joinpath(*path.parts)


def resolve_asset_path(value: str | Path, assets_root: Path = ASSETS) -> Path:
    """只读解析当前或历史资源地址，旧bundles/包名路径按当前meta定位；缺失文件仍保持缺失。

    接受绝对路径、client/assets开头的项目路径和bundles开头的assets相对路径。
    其他项目文件正常返回原定位，当前物理路径不作宽松匹配或按文件名搜索。
    """
    base = Path(assets_root).resolve()
    path = Path(value)
    if not path.is_absolute():
        parts = PurePosixPath(str(value).replace("\\", "/")).parts
        path = base.joinpath(*parts) if parts and parts[0] == "bundles" else ROOT.joinpath(*parts)
    path = path.resolve()
    if not path.is_relative_to(base):
        return path
    relative = path.relative_to(base)
    if path.exists() or len(relative.parts) < 2 or relative.parts[0] != "bundles":
        return path
    bundles = discover_bundles(base)
    # 历史扁平地址及两种约定分组均按meta身份重定位，分组本身不是Bundle。
    parts = list(relative.parts[1:])
    if parts[0] in ("module", "resources"):
        parts = parts[1:]
    if not parts:
        return path
    # 旧战斗特效的物理证据按独立effects身份重定位；运行时逻辑加载键不经过本入口。
    if parts[0] == "battle" and len(parts) > 1 and (parts[1] == "effects" or parts[1:] == ["effects.meta"]):
        effects = bundles.get("effects")
        if effects is None:
            return path
        if parts[1] == "effects.meta":
            return Path(str(effects) + ".meta")
        return bundle_asset_path("effects", Path(*parts[2:]), base)
    name = parts[0]
    if name in bundles:
        return bundle_asset_path(name, Path(*parts[1:]), base)
    return path
