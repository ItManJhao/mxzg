#!/usr/bin/env python3
"""把底左排布的 ccbi 壳根节点挪到设计画面中心。

Creator 3.8 的 Canvas 锚点在中心，节点本身放在 (设计宽/2, 设计高/2)，
也就是 (360, 640)。设计框因此落在世界坐标 (0, 0)–(720, 1280)，左下角是原点。

1:1 壳的根锚点是 (0, 0)、位置是 (0, 0)，子节点仍按老 ccbi 的底左坐标写在
0..宽、0..高。根锚点就落在画面中心，整块壳偏到设计框右上方。

运行时 `centerInParent` 用的就是下面这个偏移。底板已经铺满根盒子时，
九宫格修正不会再把它平移，所以把同一偏移写进 Prefab，编辑器和运行时一致。

底板中心已经在根锚点上的壳（打开就在画面中间）不要动。列表 Cell 也不要动。

用法：
  python3 client/tools/fix_ccbi_root_place.py            # 只打印
  python3 client/tools/fix_ccbi_root_place.py --apply    # 改本批壳
  python3 client/tools/fix_ccbi_root_place.py --check    # 验收 BattleEndLayer
  python3 client/tools/fix_ccbi_root_place.py --all --apply  # 其余同类壳；已改过的会显示 already
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PREFAB_ROOT = os.path.join(ROOT, "client", "assets", "prefabs")
DESIGN_W = 720.0
DESIGN_H = 1280.0
CANVAS_X = DESIGN_W / 2.0
CANVAS_Y = DESIGN_H / 2.0

# 已接线、会在登录 / 主城 / 主线路径上打开的壳。战斗结算壳另按文件名纳入。
WIRED = [
    "ui/login/UserLoginLayer.prefab",
    "ui/login/ChooseServerLayer.prefab",
    "ui/login/NoticeLayer.prefab",
    "ui/login/LanguageSelectLayer.prefab",
    "ui/login/ErrorLayer.prefab",
    "ui/battle/BattlePanelLayer.prefab",
    "ui/hero/HeroListLayer.prefab",
    "ui/hero/HeroInfoLayer.prefab",
    "ui/hero/HeroPalaceLayer.prefab",
    "ui/hero/HeroPernuteLayer.prefab",
    "ui/summon/SummonLayer.prefab",
    "ui/smith/SmithLayer.prefab",
    "ui/backpack/BackpackLayer.prefab",
    "ui/mail/MailLayer.prefab",
    "ui/pvp/PvpLayer.prefab",
    "ui/fantasy-tower/FantasyTowerLayer.prefab",
    "ui/quick-battle/QuickBattleLayer.prefab",
    "ui/achievement/AchievementLayer.prefab",
    "ui/role/WorldLevelLayer.prefab",
    "ui/pet/PetInfoLayer.prefab",
    "ui/main-task/MainTaskLayer.prefab",
    "ui/ancient/AncientLayer.prefab",
    "ui/hero-creat/HeroCreatLayer.prefab",
    "ui/altar/AltarLayer.prefab",
    "ui/fantasy-land/FantasyLandMainLayer.prefab",
    "ui/exotic-adventure/ExoticAdventureLayer.prefab",
    "ui/magic-cube/MagicCubeLayer.prefab",
]


def num(value):
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return float(value)
    return None


def load_prefab(path):
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def index_prefab(data):
    nodes = {}
    transforms = {}
    sprites = {}
    for index, obj in enumerate(data):
        if not isinstance(obj, dict):
            continue
        kind = obj.get("__type__")
        if kind == "cc.Node":
            nodes[index] = obj
        elif kind == "cc.UITransform":
            node_id = (obj.get("node") or {}).get("__id__")
            transforms[node_id] = obj
        elif kind == "cc.Sprite":
            node_id = (obj.get("node") or {}).get("__id__")
            sprites[node_id] = obj
    root = next(index for index, node in nodes.items() if node.get("_parent") is None)
    return nodes, transforms, sprites, root


def root_box(nodes, transforms, root):
    ui = transforms.get(root)
    if not ui:
        return None
    pos = nodes[root].get("_lpos") or {}
    return {
        "name": nodes[root].get("_name") or "",
        "w": float(ui["_contentSize"]["width"]),
        "h": float(ui["_contentSize"]["height"]),
        "ax": float(ui["_anchorPoint"]["x"]),
        "ay": float(ui["_anchorPoint"]["y"]),
        "x": num(pos.get("x", 0)) or 0.0,
        "y": num(pos.get("y", 0)) or 0.0,
    }


def center_shift(box):
    return (-(0.5 - box["ax"]) * box["w"], -(0.5 - box["ay"]) * box["h"])


def is_menu(name, width, height, ax, ay):
    if "menu" in name.lower():
        return True
    return abs(width - 640) < 1 and abs(height - 960) < 1 and ax < 0.05 and ay < 0.05


def dominant_visual(nodes, transforms, sprites, root):
    """根锚点坐标系里面积最大的非菜单图。

    记录是 (area, name, cx, cy, w, h, sliced, node_id, ax, ay, x, y)。
    """
    found = []
    best = None

    def walk(index, origin_x, origin_y, depth):
        nonlocal best
        node = nodes[index]
        if depth == 0:
            local_x = 0.0
            local_y = 0.0
        else:
            pos = node.get("_lpos") or {}
            raw_x = num(pos.get("x", 0))
            raw_y = num(pos.get("y", 0))
            if raw_x is None or raw_y is None:
                return
            local_x = origin_x + raw_x
            local_y = origin_y + raw_y
        ui = transforms.get(index)
        if depth and ui:
            width = float(ui["_contentSize"]["width"])
            height = float(ui["_contentSize"]["height"])
            ax = float(ui["_anchorPoint"]["x"])
            ay = float(ui["_anchorPoint"]["y"])
            name = node.get("_name") or ""
            if width >= 40 and height >= 40 and not is_menu(name, width, height, ax, ay):
                center_x = local_x + (0.5 - ax) * width
                center_y = local_y + (0.5 - ay) * height
                area = width * height
                sprite = sprites.get(index)
                sliced = bool(sprite and sprite.get("_type") == 1)
                record = (area, name, center_x, center_y, width, height, sliced, index, ax, ay, local_x, local_y)
                found.append(record)
                if best is None or area > best[0]:
                    best = record
        for child in node.get("_children") or []:
            child_id = child.get("__id__")
            if depth == 0:
                walk(child_id, 0.0, 0.0, depth + 1)
            else:
                walk(child_id, local_x, local_y, depth + 1)

    walk(root, 0.0, 0.0, 0)
    return best, found


def visual_corners(x, y, ax, ay, width, height):
    corners = []
    for local_x, local_y in ((0, 0), (width, 0), (0, height), (width, height)):
        corners.append(
            (
                x + (local_x - ax * width),
                y + (local_y - ay * height),
            )
        )
    return corners


def inside_ratio(x, y, ax, ay, width, height, frame):
    corners = visual_corners(x, y, ax, ay, width, height)
    min_x = min(point[0] for point in corners)
    max_x = max(point[0] for point in corners)
    min_y = min(point[1] for point in corners)
    max_y = max(point[1] for point in corners)
    left = -frame["ax"] * frame["w"]
    bottom = -frame["ay"] * frame["h"]
    right = left + frame["w"]
    top = bottom + frame["h"]
    overlap_w = max(0.0, min(max_x, right) - max(min_x, left))
    overlap_h = max(0.0, min(max_y, top) - max(min_y, bottom))
    area = abs((max_x - min_x) * (max_y - min_y))
    if area < 1:
        return 1.0
    return (overlap_w * overlap_h) / area


def slice_would_move(visual, root_box_info):
    """和 ccbiPlace.sliceAnchorShift 同一规则。只对九宫格有意义。"""
    if not visual or not visual[6]:
        return False
    ax = visual[8]
    ay = visual[9]
    x = visual[10]
    y = visual[11]
    width = visual[4]
    height = visual[5]
    if width < 1 or height < 1 or (ax < 0.01 and ay < 0.01):
        return False
    frame = root_box_info
    current = inside_ratio(x, y, ax, ay, width, height, frame)
    if current >= 0.9:
        return False
    alt = inside_ratio(x + ax * width, y + ay * height, ax, ay, width, height, frame)
    return alt >= 0.8 and alt >= current + 0.2


def classify(path):
    data = load_prefab(path)
    nodes, transforms, sprites, root = index_prefab(data)
    box = root_box(nodes, transforms, root)
    if not box:
        return {"kind": "no-ui", "path": path}
    shift = center_shift(box)
    visual, visuals = dominant_visual(nodes, transforms, sprites, root)
    name = box["name"]
    if abs(box["x"] - shift[0]) < 1.5 and abs(box["y"] - shift[1]) < 1.5:
        kind = "already"
    elif abs(box["ax"]) > 0.2 or abs(box["ay"]) > 0.2:
        kind = "anchor"
    elif abs(box["x"]) > 3 or abs(box["y"]) > 3:
        kind = "custom-pos"
    elif name.endswith("Cell") or "Cell" in name:
        kind = "cell"
    elif box["w"] < 480:
        kind = "small"
    elif visual is None:
        kind = "no-visual"
    else:
        center_x = visual[2]
        near_anchor = max(48.0, box["w"] * 0.12)
        half = box["w"] * 0.5
        plate = abs(center_x - half) <= near_anchor and center_x > box["w"] * 0.25
        mixed = plate and any(
            item[7] != visual[7] and item[0] > visual[0] * 0.2 and abs(item[2]) <= near_anchor
            for item in visuals
        )
        weight = sum(item[0] for item in visuals)
        weighted_x = sum(item[0] * item[2] for item in visuals) / weight
        min_x = min(item[2] for item in visuals)
        # 没有整张底板、但按钮都落在正坐标、重心靠近盒子中线。铁匠、置换是这种。
        cluster = (
            min_x > 80
            and abs(weighted_x - half) <= max(80.0, box["w"] * 0.2)
            and abs(weighted_x) > abs(weighted_x - half)
        )
        if mixed:
            kind = "mixed"
        elif plate or cluster:
            kind = "SHIFT"
        elif abs(center_x) <= near_anchor:
            kind = "centered"
        else:
            kind = "unsure"
    return {
        "kind": kind,
        "path": path,
        "rel": os.path.relpath(path, PREFAB_ROOT),
        "box": box,
        "shift": shift,
        "visual": visual,
        "slice_moves": slice_would_move(visual, box) if visual else False,
    }


def iter_prefabs():
    return sorted(glob.glob(os.path.join(PREFAB_ROOT, "**", "*.prefab"), recursive=True))


def preset_paths():
    found = set(WIRED)
    for path in iter_prefabs():
        base = os.path.basename(path)
        if base.endswith("EndLayer.prefab") or "BattleEnd" in base:
            found.add(os.path.relpath(path, PREFAB_ROOT))
    return sorted(found)


def format_num(value):
    rounded = round(value)
    if abs(value - rounded) < 1e-6:
        return str(int(rounded))
    return ("%.4f" % value).rstrip("0").rstrip(".")


def write_shift(path, shift):
    """只改根节点 _lpos。整文件重排会吃掉多余的小数尾零。"""
    with open(path, "r", encoding="utf-8") as handle:
        original = handle.read()
    match = re.search(r'"_lpos": \{[^}]*\}', original)
    if not match:
        raise RuntimeError("no root _lpos in " + path)
    block = match.group(0)

    def replace_key(text, key, value):
        updated, count = re.subn(
            r'("%s": )(-?[0-9]+(?:\.[0-9]+)?)' % key,
            lambda found: found.group(1) + format_num(value),
            text,
            count=1,
        )
        if count != 1:
            raise RuntimeError("missing %s in root _lpos of %s" % (key, path))
        return updated

    block = replace_key(replace_key(block, "x", shift[0]), "y", shift[1])
    updated = original[: match.start()] + block + original[match.end() :]
    data = json.loads(updated)
    nodes, _transforms, _sprites, root = index_prefab(data)
    pos = nodes[root].get("_lpos") or {}
    got = (num(pos.get("x", 0)) or 0.0, num(pos.get("y", 0)) or 0.0)
    if abs(got[0] - shift[0]) > 0.01 or abs(got[1] - shift[1]) > 0.01:
        raise RuntimeError("root position write missed the root node in " + path)
    if updated == original:
        return
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(updated)


def content_bounds(path, root_offset):
    """非菜单节点在设计框世界坐标里的包围盒。根偏移是写进 Prefab 的位置。"""
    data = load_prefab(path)
    nodes, transforms, sprites, root = index_prefab(data)
    bounds = None

    def add(min_x, min_y, max_x, max_y):
        nonlocal bounds
        if bounds is None:
            bounds = [min_x, min_y, max_x, max_y]
            return
        bounds[0] = min(bounds[0], min_x)
        bounds[1] = min(bounds[1], min_y)
        bounds[2] = max(bounds[2], max_x)
        bounds[3] = max(bounds[3], max_y)

    def walk(index, origin_x, origin_y, depth):
        node = nodes[index]
        if depth == 0:
            local_x = root_offset[0]
            local_y = root_offset[1]
        else:
            pos = node.get("_lpos") or {}
            raw_x = num(pos.get("x", 0))
            raw_y = num(pos.get("y", 0))
            if raw_x is None or raw_y is None:
                return
            local_x = origin_x + raw_x
            local_y = origin_y + raw_y
        ui = transforms.get(index)
        if depth and ui:
            width = float(ui["_contentSize"]["width"])
            height = float(ui["_contentSize"]["height"])
            ax = float(ui["_anchorPoint"]["x"])
            ay = float(ui["_anchorPoint"]["y"])
            name = node.get("_name") or ""
            if width >= 8 and height >= 8 and not is_menu(name, width, height, ax, ay):
                left = CANVAS_X + local_x - ax * width
                bottom = CANVAS_Y + local_y - ay * height
                add(left, bottom, left + width, bottom + height)
        for child in node.get("_children") or []:
            child_id = child.get("__id__")
            if depth == 0:
                walk(child_id, local_x, local_y, depth + 1)
            else:
                walk(child_id, local_x, local_y, depth + 1)

    walk(root, 0.0, 0.0, 0)
    return bounds


def inside_design(bounds):
    if not bounds:
        return 0.0
    min_x, min_y, max_x, max_y = bounds
    overlap_w = max(0.0, min(max_x, DESIGN_W) - max(min_x, 0.0))
    overlap_h = max(0.0, min(max_y, DESIGN_H) - max(min_y, 0.0))
    area = max(1.0, (max_x - min_x) * (max_y - min_y))
    return (overlap_w * overlap_h) / area


def collect(paths):
    rows = []
    for rel in paths:
        path = rel if os.path.isabs(rel) else os.path.join(PREFAB_ROOT, rel)
        if not os.path.exists(path):
            rows.append({"kind": "missing", "rel": rel, "path": path})
            continue
        row = classify(path)
        rows.append(row)
    return rows


def format_row(row):
    visual = row.get("visual")
    box = row.get("box") or {}
    extra = ""
    if visual:
        extra = " plate %s center %.0f,%.0f" % (visual[1], visual[2], visual[3])
        if row.get("slice_moves"):
            extra += " slice-also-moves"
    if box:
        extra += " root %.0fx%.0f -> (%.1f, %.1f)" % (box["w"], box["h"], row["shift"][0], row["shift"][1])
    return "%-12s %s%s" % (row["kind"], row.get("rel", row.get("path")), extra)


def apply_rows(rows):
    changed = []
    for row in rows:
        if row["kind"] != "SHIFT":
            continue
        if row.get("slice_moves"):
            print("skip slice-also-moves " + row["rel"])
            continue
        write_shift(row["path"], row["shift"])
        changed.append(row["rel"])
    return changed


def check_battle_end():
    path = os.path.join(PREFAB_ROOT, "ui/battle/BattleEndLayer.prefab")
    row = classify(path)
    box = row["box"]
    shift = center_shift(box)
    if abs(box["x"] - shift[0]) > 0.1 or abs(box["y"] - shift[1]) > 0.1:
        raise SystemExit(
            "BattleEndLayer root is (%.1f, %.1f), expected (%.1f, %.1f)"
            % (box["x"], box["y"], shift[0], shift[1])
        )
    before = content_bounds(path, (0.0, 0.0))
    after = content_bounds(path, (box["x"], box["y"]))
    before_ratio = inside_design(before)
    after_ratio = inside_design(after)
    if after_ratio < 0.98:
        raise SystemExit(
            "BattleEndLayer content is not inside the design frame (inside %.3f) bounds %s"
            % (after_ratio, after)
        )
    # 主要内容的水平中心应落在设计框中线附近，而不是 750。
    center_x = (after[0] + after[2]) / 2.0
    if abs(center_x - DESIGN_W / 2.0) > 40:
        raise SystemExit("BattleEndLayer content center x %.1f is still off the design center" % center_x)
    print(
        "BattleEndLayer root (%.1f, %.1f); content world x %.0f–%.0f y %.0f–%.0f; inside %.2f -> %.2f"
        % (
            box["x"],
            box["y"],
            after[0],
            after[2],
            after[1],
            after[3],
            before_ratio,
            after_ratio,
        )
    )


def main(argv):
    parser = argparse.ArgumentParser(description="Center bottom-left ccbi shell roots in the design frame.")
    parser.add_argument("--apply", action="store_true", help="write prefab root positions")
    parser.add_argument("--all", action="store_true", help="include every non-cell shell, not only the wired batch")
    parser.add_argument("--check", action="store_true", help="verify BattleEndLayer sits in the design frame")
    args = parser.parse_args(argv)

    if args.check and not args.apply:
        check_battle_end()
        return 0

    if args.all:
        paths = [os.path.relpath(path, PREFAB_ROOT) for path in iter_prefabs()]
    else:
        paths = preset_paths()
    rows = collect(paths)
    for row in rows:
        print(format_row(row))
    if args.apply:
        changed = apply_rows(rows)
        print("applied %d" % len(changed))
        for rel in changed:
            print("  " + rel)
    if args.check or args.apply:
        check_battle_end()
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
