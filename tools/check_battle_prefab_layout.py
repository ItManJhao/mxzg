"""检查战斗预制体的设计宽、九宫格资源边距及血条模式，防止导入时退回旧显示参数。"""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "client/assets"


def read(path):
    """读取编辑器 JSON，兼容 BOM，不修改资源。"""
    return json.loads(path.read_text(encoding="utf-8-sig"))


def validate_sliced_frame(frame, size, source=""):
    """验证九宫格边距；零边距仅允许原尺寸绘制，真实拉伸仍须有有效边距。"""
    borders = [frame.get("border" + side, 0) for side in ("Left", "Right", "Top", "Bottom")]
    assert all(value >= 0 for value in borders), (source, "九宫格边距不能为负")
    assert sum(borders[:2]) <= frame["rawWidth"] and sum(borders[2:]) <= frame["rawHeight"], (source, "边距超出原图")
    if not any(borders):
        # 旧MissionRewardInfoLayer.spr_title_bg就是184×67、四边0的Scale9；原尺寸无拉伸。
        # 只允许尺寸完全一致，避免新布局放大/缩小时用零边距破坏应保护的边缘。
        assert (math.isclose(size["width"], frame["rawWidth"], abs_tol=1e-6)
                and math.isclose(size["height"], frame["rawHeight"], abs_tol=1e-6)), (source, "零边距九宫格不得拉伸")


def check():
    """扫描战斗Bundle；资源缺失、非法拉伸九宫格或旧设计宽均终止检查，不改源资源。"""
    design = read(ROOT / "client/settings/v2/packages/project.json")["general"]["designResolution"]
    assert (design["width"], design["height"]) == (640, 1280), "设计分辨率必须为640×1280"
    frames = {}
    for path in (ASSETS / "bundles").rglob("*.meta"):
        meta = read(path)
        for key, sub in meta.get("subMetas", {}).items():
            if sub.get("importer") == "sprite-frame":
                frames[meta["uuid"] + "@" + key] = (path, sub["userData"])
    count = 0
    paths = sorted((ASSETS / "bundles/battle/prefabs").glob("*.prefab"))
    assert paths, "战斗预制体目录为空，不能以零扫描结果通过"
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
                # EditBox使用独立背景节点，输入组件上的空Sprite不绘制；仍要求对应背景有效。
                if ref is None and any(c["__type__"] == "cc.EditBox" for c in components):
                    parent = data[node["_parent"]["__id__"]]
                    background = next((data[r["__id__"]] for r in parent["_children"]
                                       if data[r["__id__"]].get("_name") == node["_name"] + "Background"), None)
                    assert background is not None, (path.name, node["_name"], "输入框缺少独立背景")
                    background_sprite = next((data[c["__id__"]] for c in background["_components"]
                                              if data[c["__id__"]]["__type__"] == "cc.Sprite"), None)
                    assert background_sprite and background_sprite.get("_type") == 1, (path.name, "输入框背景必须九宫格")
                    ref = (background_sprite.get("_spriteFrame") or {}).get("__uuid__")
                assert ref in frames, (path.name, node["_name"], "九宫格资源缺失")
                resource, frame = frames[ref]
                assert ui is not None, (path.name, node["_name"], "九宫格节点缺少尺寸")
                validate_sliced_frame(frame, ui["_contentSize"], (resource, path.name, node["_name"]))
                count += 1
            if path.stem == "BattlePage" and node["_name"] in ("BannerBg", "LogBg"):
                sprite = next(c for c in components if c["__type__"] == "cc.Sprite")
                assert sprite["_type"] == 1, (node["_name"], "可拉伸底板必须使用Sliced")
    battle = read(ASSETS / "bundles/battle/prefabs/BattlePage.prefab")
    idle = next(n for n in battle if n.get("_name") == "IdleLayout")
    anchors = {battle[r["__id__"]]["_name"]: battle[r["__id__"]] for r in idle["_children"]}
    # 旧挂机按队内序号而非八槽位置定位，我方前一后二；显示参数留在Prefab供人工修改。
    for index in range(1, 4):
        expected_x = 640 * (0.7 - 0.22 * (1 + index // 2) * 1.1) - 320
        expected_y = 637 * 0.9 * (0.5 + (0.2 if index == 2 else -0.2 if index == 3 else 0)) - 360
        point = anchors[f"Ally{index}"]["_lpos"]
        assert abs(point["x"] - expected_x) < 0.001
        assert abs(point["y"] - expected_y) < 0.001
    assert anchors["ModelScale"]["_lscale"]["x"] == 0.6
    for side in ("Ally", "Enemy"):
        for index in range(8):
            hp = next(n for n in battle if n.get("_name") == side + "Hp_" + str(index))
            names = {battle[r["__id__"]]["_name"] for r in hp["_children"]}
            assert {"Fill", "Label", "ElementIcon"} <= names, (side, index, "头顶挂点缺失")
    print(f"PASS {len(paths)} battle/settlement prefabs: 640 design width; {count} sliced sprites with valid borders or native-size zero borders")


if __name__ == "__main__":
    check()
