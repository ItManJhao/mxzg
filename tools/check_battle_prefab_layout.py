"""检查战斗预制体的设计宽、九宫格资源边距及血条模式，防止导入时退回旧显示参数。"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "client/assets"


def read(path):
    """读取编辑器 JSON，兼容 BOM，不修改资源。"""
    return json.loads(path.read_text(encoding="utf-8-sig"))


def check():
    """扫描战斗目录；资源缺失、零边距九宫格或旧设计宽均终止检查。"""
    design = read(ROOT / "client/settings/v2/packages/project.json")["general"]["designResolution"]
    assert (design["width"], design["height"]) == (640, 1280), "设计分辨率必须为640×1280"
    frames = {}
    for path in (ASSETS / "resources/ui").rglob("*.meta"):
        meta = read(path)
        for key, sub in meta.get("subMetas", {}).items():
            if sub.get("importer") == "sprite-frame":
                frames[meta["uuid"] + "@" + key] = (path, sub["userData"])
    count = 0
    paths = [*(ASSETS / "prefabs/ui/battle").glob("*.prefab"), ASSETS / "prefabs/ui/chapter/ChapterEndView.prefab"]
    for path in paths:
        data = read(path)
        for node in data:
            if node.get("__type__") != "cc.Node":
                continue
            components = [data[ref["__id__"]] for ref in node["_components"]]
            ui = next((c for c in components if c["__type__"] == "cc.UITransform"), None)
            if ui:
                assert ui["_contentSize"]["width"] != 720, (path.name, node["_name"], "残留720设计宽")
            for sprite in components:
                if sprite["__type__"] != "cc.Sprite" or sprite.get("_type") != 1:
                    continue
                ref = (sprite.get("_spriteFrame") or {}).get("__uuid__")
                assert ref in frames, (path.name, node["_name"], "九宫格资源缺失")
                resource, frame = frames[ref]
                borders = [frame.get("border" + side, 0) for side in ("Left", "Right", "Top", "Bottom")]
                assert all(v >= 0 for v in borders) and any(borders), (resource, "九宫格边距无效")
                assert sum(borders[:2]) <= frame["rawWidth"] and sum(borders[2:]) <= frame["rawHeight"], (resource, "边距超出原图")
                count += 1
            if path.stem == "BattlePage" and node["_name"] in ("BannerBg", "LogBg"):
                sprite = next(c for c in components if c["__type__"] == "cc.Sprite")
                assert sprite["_type"] == 1, (node["_name"], "可拉伸底板必须使用Sliced")
    battle = read(ASSETS / "prefabs/ui/battle/BattlePage.prefab")
    for side in ("Ally", "Enemy"):
        for index in range(8):
            hp = next(n for n in battle if n.get("_name") == side + "Hp_" + str(index))
            names = {battle[r["__id__"]]["_name"] for r in hp["_children"]}
            assert {"Fill", "Label", "ElementIcon"} <= names, (side, index, "头顶挂点缺失")
    print(f"PASS {len(paths)} battle/settlement prefabs: 640 design width; {count} sliced sprites with valid margins")


if __name__ == "__main__":
    check()
