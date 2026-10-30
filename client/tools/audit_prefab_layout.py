#!/usr/bin/env python3
"""扫描 client/assets 下全部 Prefab，标出字号和坐标异常，并可选地批量改正。

根因（对照 docs/prefab-1to1-*.md 的 ccbi 节点表，不是另一次手改）：

1. 九宫格 / 大底板的 `_lpos` 写的是 Cocos2d-x「忽略锚点」时的底左角，锚点却仍是中心。
   Creator 把这个坐标当成锚点，底板就偏到父框外。运行时 `sliceAnchorShift`
   （client/assets/scripts/ui/ccbiPlace.ts）挂上壳之后才平移。编辑器里打开仍是错的。
2. 普通 UILabelTTF 用「字号 ×2、节点缩放 0.5」做高清字，Prefab 里这两项都在，看起来正常。
   按钮上的 Label 只抄了字号（常见 40–64），缩放留在 1。字比按钮还高。
   运行时 `repairLabel` 对一部分改成 SHRINK，但字号属性没改，内容框又是 0。
3. 少数 `_lpos` 分量被写成字符串（`"-168"`、`"["`），Creator 读不成数。

`--apply` 只改这三类，而且和运行时同一条规则，改完再跑运行时不会再移一次：

- 九宫格：与 `sliceAnchorShift` 相同的判定，把偏移写进 `_lpos`。二次仍会再移的不动。
- 非九宫格、但是整块底板（当前只有一角落在父框里，平移后几乎整块进去）：同样写偏移。
- 按钮文字：本地缩放仍是 1、字号 ≥ 36 且装不下按钮时，字号和行高减半（减半后仍 ≥ 36 的不动，避免连跑两次再减）。
  减半后仍超出按钮的，改成 SHRINK 并写上内容框。不改缩放，避免运行时 `fitButton` 再设字号时缩两遍。
- 按钮锚点不在中心、文字却贴在 (0,0) 的，挪到按钮盒中心。规则同 `labelCenterInParent`。
- 坐标字符串能转成数字的转成数字；按钮文字上的 `"["` 这类垃圾值写成 0。

不改节点名、层级、fileId、组件 uuid。不改 .meta。仓库里没有 ccbi 导入器，所以改 Prefab，不重跑生成器。

用法（仓库根目录）：
  python3 client/tools/audit_prefab_layout.py
  python3 client/tools/audit_prefab_layout.py --apply

2026-10-26 在 main #260（e08f9471）上 `--apply` 一次，紧接着再跑是空操作：

  prefabs 614，labels 3497
  files-touched 442 -> 0
  bad-pos 31 -> 0
  sliced-shift 484 -> 0
  plate-shift 13 -> 0
  label-center 62 -> 0
  label-half 453 -> 0
  label-shrink 0，mirror-skip 0

对照 ccbi 表（11590 行）：改前位置和字号都能对上表（pos-mismatch 0，font-mismatch 0）。
改后 477 条位置是「表坐标 + 锚点×尺寸」，452 条字号是表字号的一半，font-mismatch 仍是 0。
"""

from __future__ import annotations

import argparse
import glob
import json
import math
import os
import re
import sys
from collections import defaultdict

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PREFAB_ROOT = os.path.join(ROOT, "client", "assets", "prefabs")
DOCS = os.path.join(ROOT, "docs")

PRIORITY_HINTS = (
    "ui/login/",
    "ui/city/",
    "ui/hero/HeroList",
    "ui/hero/HeroInfo",
    "ui/hero/HeroPage",
    "ui/hero/WireHero",
    "ui/bag/",
    "ui/backpack/Backpack",
    "ui/battle/BattlePanel",
    "ui/battle/BattlePage",
    "ui/battle/BattleEnd",
    "ui/battle/WireBattle",
    "ui/mainline/",
    "ui/quick-battle/QuickBattle",
    "ui/chapter/Chapter",
    "ui/common/Confirm",
    "ui/common/CConfirm",
    "ui/idle/",
)

ROW_RE = re.compile(
    r"^\|\s*`(?P<path>/[^`]+)`\s*\|"
    r"(?P<cls>[^|]*)\|"
    r"\s*\[(?P<pos>-?[\d.]+(?:\s*,\s*-?[\d.]+)?)\]\s*\|"
    r"\s*\[(?P<anchor>-?[\d.]+(?:\s*,\s*-?[\d.]+)?)\]\s*\|"
    r"(?P<size>[^|]*)\|"
    r"\s*\[(?P<scale>-?[\d.]+(?:\s*,\s*-?[\d.]+)?)\]\s*\|"
    r"(?P<rest>.*)$"
)
PREF_RE = re.compile(r"`?((?:client/assets/)?prefabs/\S+?\.prefab)`?")
DIR_RE = re.compile(r"^\|\s*([A-Za-z][A-Za-z0-9_]*)\s*\|\s*`((?:client/assets/)?prefabs/\S+?\.prefab)`")
HEAD_RE = re.compile(r"^##\s+([A-Za-z][A-Za-z0-9_]*)")
FONT_RE = re.compile(r"」(\d+(?:\.\d+)?)(?:px)?")
SIZE_RE = re.compile(r"\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]")


def num(value):
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (int, float)):
        if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
            return None
        return float(value)
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            return None
    return None


def clean_num(value):
    rounded = round(float(value))
    if abs(float(value) - rounded) < 1e-6:
        return int(rounded)
    return round(float(value), 4)


def dumps(data):
    text = json.dumps(data, indent=2, ensure_ascii=False)
    if not text.endswith("\n"):
        text += "\n"
    return text


def is_priority(rel):
    return any(hint in rel for hint in PRIORITY_HINTS)


def load_prefab(path):
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def index_prefab(data):
    nodes = {}
    comps = defaultdict(list)
    for index, obj in enumerate(data):
        if not isinstance(obj, dict):
            continue
        kind = obj.get("__type__")
        if kind == "cc.Node":
            nodes[index] = obj
        else:
            node_id = (obj.get("node") or {}).get("__id__")
            if node_id is not None:
                comps[(node_id, kind)].append(obj)
    parent = {}
    for index, node in nodes.items():
        for child in node.get("_children") or []:
            if isinstance(child, dict) and "__id__" in child:
                parent[child["__id__"]] = index
    return nodes, comps, parent


def ui_of(comps, index):
    found = comps.get((index, "cc.UITransform"))
    return found[0] if found else None


def label_of(comps, index):
    found = comps.get((index, "cc.Label"))
    return found[0] if found else None


def sprite_of(comps, index):
    found = comps.get((index, "cc.Sprite"))
    return found[0] if found else None


def has_button(comps, index):
    return bool(comps.get((index, "cc.Button")))


def box_of(ui):
    if not ui:
        return None
    size = ui.get("_contentSize") or {}
    anchor = ui.get("_anchorPoint") or {}
    width = num(size.get("width"))
    height = num(size.get("height"))
    ax = num(anchor.get("x"))
    ay = num(anchor.get("y"))
    if None in (width, height, ax, ay):
        return None
    return {"w": width, "h": height, "ax": ax, "ay": ay}


def path_of(nodes, parent, index):
    parts = []
    seen = set()
    while index in nodes and index not in seen:
        seen.add(index)
        parts.append(nodes[index].get("_name") or "?")
        index = parent.get(index)
    return "/".join(reversed(parts))


def sized_ancestor(nodes, comps, parent, index):
    current = parent.get(index)
    seen = set()
    while current is not None and current not in seen:
        seen.add(current)
        ui = ui_of(comps, current)
        box = box_of(ui)
        if box and box["w"] > 1 and box["h"] > 1:
            return current, box
        current = parent.get(current)
    return None, None


def anchor_in(nodes, parent, index, ancestor):
    x = 0.0
    y = 0.0
    current = index
    seen = set()
    while current is not None and current != ancestor and current not in seen:
        seen.add(current)
        pos = nodes[current].get("_lpos") or {}
        px = num(pos.get("x"))
        py = num(pos.get("y"))
        if px is None or py is None:
            return None
        x += px
        y += py
        current = parent.get(current)
    if current != ancestor:
        return None
    return x, y


def inside_ratio(box, frame):
    xs = []
    ys = []
    for local_x, local_y in ((0, 0), (box["w"], 0), (0, box["h"]), (box["w"], box["h"])):
        xs.append(box["x"] + (local_x - box["ax"] * box["w"]) * box["sx"])
        ys.append(box["y"] + (local_y - box["ay"] * box["h"]) * box["sy"])
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
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


def slice_shift(box, frame):
    """与 ccbiPlace.sliceAnchorShift 同一条规则。返回要加到位置上的 (dx, dy)。"""
    if box["w"] < 1 or box["h"] < 1:
        return None
    if box["ax"] < 0.01 and box["ay"] < 0.01:
        return None
    current = inside_ratio(box, frame)
    if current >= 0.9:
        return None
    moved = dict(box)
    moved["x"] = box["x"] + box["ax"] * box["w"]
    moved["y"] = box["y"] + box["ay"] * box["h"]
    alt = inside_ratio(moved, frame)
    if alt < 0.8 or alt < current + 0.2:
        return None
    return (box["ax"] * box["w"], box["ay"] * box["h"])


def stable_shift(box, frame):
    shift = slice_shift(box, frame)
    if shift is None:
        return None
    again = dict(box)
    again["x"] = box["x"] + shift[0]
    again["y"] = box["y"] + shift[1]
    if slice_shift(again, frame) is not None:
        return None
    return shift


def label_center(parent_ax, parent_ay, parent_w, parent_h, child_x, child_y):
    if parent_w < 8 or parent_h < 8 or parent_w > 400:
        return None
    if abs(child_x) > 2 or abs(child_y) > 2:
        return None
    x = (0.5 - parent_ax) * parent_w
    y = (0.5 - parent_ay) * parent_h
    if abs(x) < 1 and abs(y) < 1:
        return None
    return (x, y)


def text_width(text, font):
    width = 0.0
    for char in text:
        if char.isspace():
            width += font * 0.33
        elif ord(char) > 127:
            width += font
        else:
            width += font * 0.55
    return width


def font_too_big(font, text, parent_w, parent_h):
    if font < 36:
        return False
    if parent_h >= 8 and font > parent_h * 0.62:
        return True
    if parent_w >= 8 and text.strip() and text_width(text, font) > parent_w * 0.92:
        return True
    return False


def half_font(font):
    halved = font / 2.0
    if abs(halved - round(halved)) < 1e-6:
        return int(round(halved))
    return round(halved, 2)


def self_check():
    notice = slice_shift(
        {"x": 38, "y": 90, "ax": 0.5, "ay": 0.5, "w": 526, "h": 520, "sx": 1, "sy": 1},
        {"ax": 0, "ay": 0, "w": 600, "h": 860},
    )
    if not notice or round(notice[0]) != 263 or round(notice[1]) != 260:
        raise SystemExit("notice plate shift drifted: %s" % (notice,))
    hero = slice_shift(
        {"x": 0, "y": 105.75, "ax": 0.5, "ay": 0.5, "w": 640, "h": 672, "sx": 1, "sy": 1},
        {"ax": 0, "ay": 0, "w": 640, "h": 960},
    )
    if not hero or round(hero[0]) != 320 or round(hero[1]) != 336:
        raise SystemExit("hero plate shift drifted: %s" % (hero,))
    login = slice_shift(
        {"x": 288, "y": 1.029, "ax": 0.5, "ay": 0, "w": 576, "h": 576, "sx": 1, "sy": 1},
        {"ax": 0, "ay": 0, "w": 576, "h": 576},
    )
    if login is not None:
        raise SystemExit("login background should stay put")
    tab = label_center(0.5, 0, 111, 43, 0, 0)
    if not tab or round(tab[1]) != 22:
        raise SystemExit("tab label center drifted: %s" % (tab,))
    if font_too_big(24, "战  斗", 197, 60):
        raise SystemExit("24px battle button must not be halved")
    if not font_too_big(48, "英  雄", 111, 43):
        raise SystemExit("48px hero tab must be halved")
    if not font_too_big(40, "确定", 136, 58):
        raise SystemExit("40px confirm button must be halved")
    if half_font(48) != 24 or half_font(54) != 27:
        raise SystemExit("half font drifted")


def parse_pair(text):
    parts = [part.strip() for part in text.split(",")]
    if len(parts) != 2:
        return None
    x = num(parts[0])
    y = num(parts[1])
    if x is None or y is None:
        return None
    return (x, y)


def norm_prefab(path):
    path = path.strip("`")
    if path.startswith("client/assets/"):
        path = path[len("client/assets/") :]
    if path.startswith("prefabs/"):
        path = path[len("prefabs/") :]
    return path


def load_doc_rows():
    rows = []
    missed = 0
    for path in sorted(glob.glob(os.path.join(DOCS, "prefab-1to1-*.md"))):
        if path.endswith("prefab-1to1-deviations.md") or path.endswith("mxzg-prefab-1to1-inventory.md"):
            continue
        catalog = {}
        current = None
        with open(path, "r", encoding="utf-8") as handle:
            for line in handle:
                directory = DIR_RE.match(line)
                if directory:
                    catalog[directory.group(1)] = norm_prefab(directory.group(2))
                heading = HEAD_RE.match(line)
                if heading and heading.group(1) in catalog:
                    current = catalog[heading.group(1)]
                pref = PREF_RE.search(line)
                if pref and (heading or "→" in line or "->" in line):
                    current = norm_prefab(pref.group(1))
                if not line.startswith("| `/"):
                    continue
                match = ROW_RE.match(line.rstrip("\n"))
                if not match:
                    missed += 1
                    continue
                pos = parse_pair(match.group("pos"))
                anchor = parse_pair(match.group("anchor"))
                scale = parse_pair(match.group("scale"))
                size_match = SIZE_RE.search(match.group("size"))
                size = None
                if size_match:
                    size = (float(size_match.group(1)), float(size_match.group(2)))
                font_match = FONT_RE.search(match.group("rest"))
                font = float(font_match.group(1)) if font_match else None
                if not current or not pos or not anchor or not scale:
                    missed += 1
                    continue
                rows.append(
                    {
                        "prefab": current,
                        "path": match.group("path").lstrip("/"),
                        "pos": pos,
                        "anchor": anchor,
                        "scale": scale,
                        "size": size,
                        "font": font,
                    }
                )
    return rows, missed


def near(a, b, tol=1.0):
    return abs(a - b) <= tol


def compare_docs(prefabs):
    """prefabs: rel -> {path: [node records]}"""
    rows, missed = load_doc_rows()
    stats = defaultdict(int)
    stats["doc-rows"] = len(rows)
    stats["doc-unparsed"] = missed
    samples = defaultdict(list)

    def add_sample(key, text):
        if len(samples[key]) < 8:
            samples[key].append(text)

    for row in rows:
        nodes = prefabs.get(row["prefab"])
        if not nodes:
            stats["doc-prefab-missing"] += 1
            continue
        exact = nodes.get(row["path"]) or []
        if not exact:
            suffix = "/" + row["path"]
            for node_path, group in nodes.items():
                if node_path.endswith(suffix) or node_path == row["path"]:
                    exact = group
                    break
        if not exact:
            stats["doc-unmatched"] += 1
            continue
        if len(exact) == 1:
            node = exact[0]
        else:
            node = min(exact, key=lambda item: (item["x"] - row["pos"][0]) ** 2 + (item["y"] - row["pos"][1]) ** 2)
            stats["doc-ambiguous"] += 1
        stats["doc-matched"] += 1
        if not near(node["ax"], row["anchor"][0], 0.02) or not near(node["ay"], row["anchor"][1], 0.02):
            stats["anchor-mismatch"] += 1
            add_sample("anchor-mismatch", "%s %s prefab (%.2f,%.2f) doc (%.2f,%.2f)" % (
                row["prefab"], row["path"], node["ax"], node["ay"], row["anchor"][0], row["anchor"][1]))
        if not near(node["sx"], row["scale"][0], 0.02) or not near(node["sy"], row["scale"][1], 0.02):
            stats["scale-mismatch"] += 1
            add_sample("scale-mismatch", "%s %s prefab (%.2f,%.2f) doc (%.2f,%.2f)" % (
                row["prefab"], row["path"], node["sx"], node["sy"], row["scale"][0], row["scale"][1]))
        else:
            stats["scale-equal"] += 1
        dx = node["x"] - row["pos"][0]
        dy = node["y"] - row["pos"][1]
        explained_x = row["anchor"][0] * (row["size"][0] if row["size"] else node["w"])
        explained_y = row["anchor"][1] * (row["size"][1] if row["size"] else node["h"])
        root_x = -(0.5 - node["ax"]) * node["w"]
        root_y = -(0.5 - node["ay"]) * node["h"]
        center = None
        if node["button_parent"]:
            center = label_center(node["pax"], node["pay"], node["pw"], node["ph"], row["pos"][0], row["pos"][1])
        if near(dx, 0, 0.6) and near(dy, 0, 0.6):
            stats["pos-equal"] += 1
        elif near(dx, explained_x, 0.8) and near(dy, explained_y, 0.8) and (abs(explained_x) > 1 or abs(explained_y) > 1):
            stats["pos-explained-bottom-left"] += 1
        elif node["root"] and near(node["x"], root_x, 1.5) and near(node["y"], root_y, 1.5):
            stats["pos-explained-root"] += 1
        elif center and near(node["x"], center[0], 1.0) and near(node["y"], center[1], 1.0):
            stats["pos-explained-label-center"] += 1
        else:
            stats["pos-mismatch"] += 1
            if len(samples["pos-mismatch"]) < 15:
                add_sample("pos-mismatch", "%s %s prefab (%.1f,%.1f) doc (%.1f,%.1f)" % (
                    row["prefab"], row["path"], node["x"], node["y"], row["pos"][0], row["pos"][1]))
        if row["font"] is None or node["font"] is None:
            continue
        stats["font-compared"] += 1
        if near(node["font"], row["font"], 0.6):
            stats["font-equal"] += 1
        elif near(node["font"] * 2, row["font"], 0.6):
            stats["font-explained-half"] += 1
        else:
            stats["font-mismatch"] += 1
            add_sample("font-mismatch", "%s %s prefab %s doc %s %s" % (
                row["prefab"], row["path"], node["font"], row["font"], node["text"][:12]))
    return stats, samples


def node_record(nodes, comps, parent, index):
    ui = ui_of(comps, index)
    box = box_of(ui) or {"w": 0, "h": 0, "ax": 0.5, "ay": 0.5}
    pos = nodes[index].get("_lpos") or {}
    scale = nodes[index].get("_lscale") or {}
    label = label_of(comps, index)
    font = num(label.get("_fontSize")) if label else None
    text = (label.get("_string") or "") if label else ""
    parent_id = parent.get(index)
    parent_box = box_of(ui_of(comps, parent_id)) if parent_id is not None else None
    return {
        "x": num(pos.get("x", 0)) or 0.0,
        "y": num(pos.get("y", 0)) or 0.0,
        "ax": box["ax"],
        "ay": box["ay"],
        "w": box["w"],
        "h": box["h"],
        "sx": num(scale.get("x", 1)) or 1.0,
        "sy": num(scale.get("y", 1)) or 1.0,
        "font": font,
        "text": text,
        "root": parent_id is None,
        "button_parent": parent_id is not None and has_button(comps, parent_id),
        "pw": parent_box["w"] if parent_box else 0,
        "ph": parent_box["h"] if parent_box else 0,
        "pax": parent_box["ax"] if parent_box else 0.5,
        "pay": parent_box["ay"] if parent_box else 0.5,
    }


def coerce_pos(pos, key, fallback):
    value = pos.get(key, 0)
    if isinstance(value, bool):
        return False
    if isinstance(value, (int, float)):
        if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
            pos[key] = fallback
            return True
        return False
    if isinstance(value, str):
        parsed = num(value)
        pos[key] = clean_num(parsed) if parsed is not None else fallback
        return True
    return False


def scan(apply):
    self_check()
    counts = defaultdict(int)
    samples = defaultdict(list)
    changed_files = []
    before_index = defaultdict(lambda: defaultdict(list))
    after_index = defaultdict(lambda: defaultdict(list))
    priority_changes = defaultdict(int)

    def snapshot(bucket, rel, nodes, comps, parent):
        by_path = bucket[rel]
        for index in nodes:
            record = node_record(nodes, comps, parent, index)
            if record["font"] is None:
                for child in nodes[index].get("_children") or []:
                    child_id = child.get("__id__") if isinstance(child, dict) else None
                    child_label = label_of(comps, child_id) if child_id is not None else None
                    if child_label:
                        record["font"] = num(child_label.get("_fontSize"))
                        record["text"] = child_label.get("_string") or ""
                        break
            by_path[path_of(nodes, parent, index)].append(record)

    def note(kind, rel, detail):
        counts[kind] += 1
        if len(samples[kind]) < 12 or (is_priority(rel) and len(samples[kind]) < 24):
            samples[kind].append(rel + " " + detail)

    for path in sorted(glob.glob(os.path.join(PREFAB_ROOT, "**", "*.prefab"), recursive=True)):
        rel = os.path.relpath(path, PREFAB_ROOT)
        with open(path, "r", encoding="utf-8") as handle:
            original = handle.read()
        data = json.loads(original)
        nodes, comps, parent = index_prefab(data)
        counts["prefabs"] += 1
        counts["labels"] += sum(1 for index in nodes if label_of(comps, index))
        snapshot(before_index, rel, nodes, comps, parent)
        dirty = False

        for index, node in nodes.items():
            pos = node.get("_lpos")
            if not isinstance(pos, dict):
                continue
            label = label_of(comps, index)
            fallback = 0
            for key in ("x", "y", "z"):
                if key not in pos:
                    continue
                before = pos.get(key)
                if coerce_pos(pos, key, fallback):
                    dirty = True
                    note("bad-pos", rel, "%s %s -> %s" % (path_of(nodes, parent, index), before, pos.get(key)))

        for index in list(nodes):
            node = nodes[index]
            if index not in parent:
                continue
            ui = ui_of(comps, index)
            box = box_of(ui)
            if not box:
                continue
            ancestor, frame = sized_ancestor(nodes, comps, parent, index)
            if ancestor is None:
                continue
            summed = anchor_in(nodes, parent, index, ancestor)
            if summed is None:
                continue
            scale = node.get("_lscale") or {}
            sx = num(scale.get("x", 1))
            sy = num(scale.get("y", 1))
            if sx is None or sy is None:
                continue
            placed = {
                "x": summed[0],
                "y": summed[1],
                "ax": box["ax"],
                "ay": box["ay"],
                "w": box["w"],
                "h": box["h"],
                "sx": sx,
                "sy": sy,
            }
            if sx < 0 or sy < 0:
                if slice_shift(placed, frame):
                    note("mirror-skip", rel, path_of(nodes, parent, index))
                continue
            sprite = sprite_of(comps, index)
            sliced = bool(sprite) and sprite.get("_type") == 1
            shift = stable_shift(placed, frame) if sliced else None
            kind = None
            if shift and sliced:
                kind = "sliced-shift"
            elif not sliced and sprite and not has_button(comps, index):
                loose = slice_shift(placed, frame)
                if loose and stable_shift(placed, frame):
                    current = inside_ratio(placed, frame)
                    moved = dict(placed)
                    moved["x"] = placed["x"] + loose[0]
                    moved["y"] = placed["y"] + loose[1]
                    alt = inside_ratio(moved, frame)
                    if current <= 0.35 and alt >= 0.95 and box["w"] >= 80 and box["h"] >= 30:
                        shift = loose
                        kind = "plate-shift"
            if kind and shift:
                local = node.get("_lpos") or {}
                lx = num(local.get("x", 0)) or 0.0
                ly = num(local.get("y", 0)) or 0.0
                local["x"] = clean_num(lx + shift[0])
                local["y"] = clean_num(ly + shift[1])
                dirty = True
                note(kind, rel, "%s (%.1f,%.1f)->(%.1f,%.1f)" % (
                    path_of(nodes, parent, index), lx, ly, local["x"], local["y"]))

        for index, node in nodes.items():
            label = label_of(comps, index)
            if not label:
                continue
            parent_id = parent.get(index)
            if parent_id is None or not has_button(comps, parent_id):
                font = num(label.get("_fontSize")) or 0
                scale = node.get("_lscale") or {}
                sy = num(scale.get("y", 1)) or 1
                if font >= 48 and abs(sy - 1) < 0.05:
                    note("free-large-label", rel, "%s fs=%s %s" % (
                        path_of(nodes, parent, index), font, (label.get("_string") or "")[:12]))
                continue
            parent_box = box_of(ui_of(comps, parent_id))
            if not parent_box:
                continue
            pos = node.get("_lpos") or {}
            cx = num(pos.get("x", 0))
            cy = num(pos.get("y", 0))
            if cx is None or cy is None:
                continue
            center = label_center(parent_box["ax"], parent_box["ay"], parent_box["w"], parent_box["h"], cx, cy)
            if center and (abs(center[0] - cx) > 0.05 or abs(center[1] - cy) > 0.05):
                pos["x"] = clean_num(center[0])
                pos["y"] = clean_num(center[1])
                dirty = True
                note("label-center", rel, "%s -> (%.1f,%.1f)" % (path_of(nodes, parent, index), center[0], center[1]))
            scale = node.get("_lscale") or {}
            sx = num(scale.get("x", 1)) or 1
            sy = num(scale.get("y", 1)) or 1
            if abs(sx - 1) > 0.05 or abs(sy - 1) > 0.05:
                continue
            font = num(label.get("_fontSize"))
            if font is None:
                continue
            text = label.get("_string") or ""
            if not font_too_big(font, text, parent_box["w"], parent_box["h"]):
                if font >= 36:
                    note("button-font-large-but-fits", rel, "%s fs=%s box=%dx%d %s" % (
                        path_of(nodes, parent, index), font, round(parent_box["w"]), round(parent_box["h"]), text[:12]))
                continue
            if font / 2.0 >= 36:
                note("button-font-too-big-to-half", rel, "%s fs=%s" % (path_of(nodes, parent, index), font))
                continue
            new_font = half_font(font)
            label["_fontSize"] = new_font
            if "_actualFontSize" in label:
                label["_actualFontSize"] = new_font
            line = num(label.get("_lineHeight"))
            if line is not None and line > 0:
                if abs(line - font) <= 2:
                    label["_lineHeight"] = new_font
                else:
                    label["_lineHeight"] = clean_num(line * (new_font / font))
            dirty = True
            note("label-half", rel, "%s %s -> %s %s" % (path_of(nodes, parent, index), font, new_font, text[:12]))
            if font_too_big(new_font, text, parent_box["w"], parent_box["h"]) and label.get("_overflow") != 2:
                label["_overflow"] = 2
                child_ui = ui_of(comps, index)
                if child_ui is not None:
                    size = child_ui.setdefault("_contentSize", {"__type__": "cc.Size"})
                    size["width"] = clean_num(max(8, parent_box["w"] - 8))
                    size["height"] = clean_num(max(8, parent_box["h"] - 4))
                note("label-shrink", rel, path_of(nodes, parent, index))

        snapshot(after_index, rel, nodes, comps, parent)

        if not dirty:
            continue
        updated = dumps(data)
        if updated == original:
            continue
        baseline = dumps(json.loads(original))
        if baseline != original:
            # 只有 LoginPanel 的空对象换行和 UserLoginLayer 的尾零对不齐。
            # 能只替换坏坐标就不动其余格式。
            patched = original
            patched = patched.replace('"x": "-168"', '"x": -168', 1)
            if dumps(json.loads(patched)) == updated or json.loads(patched) == data:
                updated = patched
            elif baseline.replace("-251.712\n", "-251.7120\n") == original or original.count("-251.7120") == 1:
                updated = updated.replace("-251.712\n", "-251.7120\n")
        if updated == original:
            continue
        if apply:
            with open(path, "w", encoding="utf-8") as handle:
                handle.write(updated)
        changed_files.append(rel)
        if is_priority(rel):
            priority_changes[rel] += 1

    before_stats, before_samples = compare_docs(before_index)
    after_stats, after_samples = compare_docs(after_index)
    print("prefabs %d" % counts["prefabs"])
    print("labels %d" % counts["labels"])
    print("files-touched %d%s" % (len(changed_files), "" if apply else " (dry-run)"))
    for key in (
        "bad-pos",
        "sliced-shift",
        "plate-shift",
        "label-center",
        "label-half",
        "label-shrink",
        "mirror-skip",
        "button-font-large-but-fits",
        "button-font-too-big-to-half",
        "free-large-label",
    ):
        print("%s %d" % (key, counts[key]))
    print("--- docs before -> after (in-memory; --apply writes the after state) ---")
    for key in (
        "doc-rows",
        "doc-unparsed",
        "doc-matched",
        "doc-unmatched",
        "doc-ambiguous",
        "doc-prefab-missing",
        "anchor-mismatch",
        "scale-equal",
        "scale-mismatch",
        "pos-equal",
        "pos-explained-bottom-left",
        "pos-explained-root",
        "pos-explained-label-center",
        "pos-mismatch",
        "font-compared",
        "font-equal",
        "font-explained-half",
        "font-mismatch",
    ):
        print("%s %d -> %d" % (key, before_stats[key], after_stats[key]))
    doc_samples = before_samples
    doc_samples.update({("after " + key): rows for key, rows in after_samples.items() if key in ("anchor-mismatch", "pos-mismatch", "font-mismatch")})
    print("--- priority files with edits ---")
    for rel in sorted(priority_changes):
        print(rel)
    print("--- samples ---")
    for key, rows in samples.items():
        if key in ("button-font-large-but-fits",) and len(rows) > 15:
            pri = [row for row in rows if is_priority(row.split(" ", 1)[0])]
            print("#", key, "priority")
            for row in pri[:20]:
                print(row)
            continue
        print("#", key)
        for row in rows[:12]:
            print(row)
    for key, rows in doc_samples.items():
        print("# doc", key)
        for row in rows:
            print(row)
    return 0


def main(argv):
    parser = argparse.ArgumentParser(description="Audit and batch-correct prefab font size and bottom-left positions.")
    parser.add_argument("--apply", action="store_true", help="write the batch corrections")
    args = parser.parse_args(argv)
    return scan(args.apply)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
