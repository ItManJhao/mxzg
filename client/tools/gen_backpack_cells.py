# -*- coding: utf-8 -*-
"""Bag chrome that BackpackLayer.ccbi did not ship as children.

Writes:
  prefabs/ui/backpack/BackpackItemCell.prefab
  prefabs/ui/backpack/BackpackTabButton.prefab
and patches BackpackLayer with node_portrait, lbl_talk, and spr_box/BagScroll.

Cells and tabs are templates. screenFill instantiates them into BagScroll/content
and only writes icon, count, and the language line. It does not build the slot
chrome or a second scroll host.
"""
import hashlib
import json
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RES = os.path.join(ROOT, "client", "assets", "resources")
OUT = os.path.join(ROOT, "client", "assets", "prefabs", "ui", "backpack")
FONT = "4ff55f31-773f-4ef9-99b6-466b5deeecb9"
LAYER = 33554432

CELL_UUID = "c4e8a1b2-7d33-4f61-9a20-6b5e0d4c8f11"
TAB_UUID = "d5f9b2c3-8e44-4072-ab31-7c6f1e5d9022"

SPRITES = {
    "frame": "ui/common/other_rare-0.png",
    "select": "ui/bag/backpack_spr-select.png",
    "icon": "ui/bag/backpack_spr-default.png",
    "tab": "ui/common/button_btn-tab-23.png",
}


def fid(seed):
    digest = hashlib.md5(seed.encode("utf-8")).digest()
    text = base64_url(digest)
    return (text + "xxxxxxxxxxxxxxxxxxxxxx")[:22]


def base64_url(digest):
    import base64

    return base64.b64encode(digest).decode("ascii").replace("+", "A").replace("/", "B").rstrip("=")


def sprite_uuid(rel):
    meta = os.path.join(RES, rel + ".meta")
    with open(meta, encoding="utf-8") as handle:
        data = json.load(handle)
    sub = data.get("subMetas", {}).get("f9941") or {}
    value = sub.get("uuid") or ""
    if not value.endswith("@f9941"):
        raise SystemExit("missing spriteFrame " + meta)
    return value


def vec3(x=0, y=0, z=0):
    return {"__type__": "cc.Vec3", "x": x, "y": y, "z": z}


def quat():
    return {"__type__": "cc.Quat", "x": 0, "y": 0, "z": 0, "w": 1}


def color(r, g, b, a=255):
    return {"__type__": "cc.Color", "r": r, "g": g, "b": b, "a": a}


def size(w, h):
    return {"__type__": "cc.Size", "width": w, "height": h}


def vec2(x, y):
    return {"__type__": "cc.Vec2", "x": x, "y": y}


class Builder(object):
    def __init__(self, name):
        self.name = name
        self.objs = [None, None]
        self.objs[0] = {
            "__type__": "cc.Prefab",
            "_name": name,
            "_objFlags": 0,
            "__editorExtras__": {},
            "_native": "",
            "data": {"__id__": 1},
            "optimizationPolicy": 0,
            "persistent": False,
        }

    def add(self, obj):
        self.objs.append(obj)
        return len(self.objs) - 1

    def node(self, name, parent, x, y, w, h, ax=0.5, ay=0.5, sx=1, sy=1, active=True):
        if parent is None:
            node_id = 1
        else:
            node_id = self.add(None)
        ui = self.add({
            "__type__": "cc.UITransform",
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": {"__id__": node_id},
            "_enabled": True,
            "__prefab": None,
            "_contentSize": size(w, h),
            "_anchorPoint": vec2(ax, ay),
            "_id": "",
        })
        ui_info = self.add({"__type__": "cc.CompPrefabInfo", "fileId": fid(self.name + name + "ui")})
        self.objs[ui]["__prefab"] = {"__id__": ui_info}
        info = self.add({
            "__type__": "cc.PrefabInfo",
            "root": {"__id__": 1},
            "asset": {"__id__": 0},
            "fileId": fid(self.name + name + "node"),
            "instance": None,
            "targetOverrides": None,
            "nestedPrefabInstanceRoots": None,
        })
        self.objs[node_id] = {
            "__type__": "cc.Node",
            "_name": name,
            "_objFlags": 0,
            "__editorExtras__": {},
            "_parent": None if parent is None else {"__id__": parent},
            "_children": [],
            "_active": active,
            "_components": [{"__id__": ui}],
            "_prefab": {"__id__": info},
            "_lpos": vec3(x, y, 0),
            "_lrot": quat(),
            "_lscale": vec3(sx, sy, 1),
            "_mobility": 0,
            "_layer": LAYER,
            "_euler": vec3(),
            "_id": "",
        }
        if parent is not None:
            self.objs[parent]["_children"].append({"__id__": node_id})
        return node_id

    def dump(self):
        if not isinstance(self.objs[1], dict) or self.objs[1].get("__type__") != "cc.Node":
            raise SystemExit(self.name + " root is not node 1")
        return self.objs

    def sprite(self, node_id, frame, sliced=False):
        comp = self.add({
            "__type__": "cc.Sprite",
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": {"__id__": node_id},
            "_enabled": True,
            "__prefab": None,
            "_customMaterial": None,
            "_srcBlendFactor": 2,
            "_dstBlendFactor": 4,
            "_color": color(255, 255, 255),
            "_spriteFrame": {"__uuid__": frame},
            "_type": 1 if sliced else 0,
            "_fillType": 0,
            "_sizeMode": 0,
            "_fillCenter": vec2(0, 0),
            "_fillStart": 0,
            "_fillRange": 0,
            "_isTrimmedMode": False,
            "_useGrayscale": False,
            "_atlas": None,
            "_id": "",
        })
        info = self.add({"__type__": "cc.CompPrefabInfo", "fileId": fid(self.name + str(node_id) + "sp")})
        self.objs[comp]["__prefab"] = {"__id__": info}
        self.objs[node_id]["_components"].append({"__id__": comp})
        return comp

    def label(self, node_id, text, font_size, r, g, b, width):
        comp = self.add({
            "__type__": "cc.Label",
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": {"__id__": node_id},
            "_enabled": True,
            "__prefab": None,
            "_customMaterial": None,
            "_srcBlendFactor": 2,
            "_dstBlendFactor": 4,
            "_color": color(r, g, b),
            "_string": text,
            "_font": {"__uuid__": FONT},
            "_isSystemFontUsed": False,
            "_fontFamily": "Arial",
            "_overflow": 2,
            "_horizontalAlign": 1,
            "_verticalAlign": 1,
            "_enableWrapText": True,
            "_cacheMode": 0,
            "_underlineHeight": 2,
            "_isItalic": False,
            "_isBold": False,
            "_isUnderline": False,
            "_spacingX": 0,
            "_lineHeight": font_size + 4,
            "_fontSize": font_size,
            "_actualFontSize": font_size,
            "_enableOutline": False,
            "_outlineWidth": 2,
            "_outlineColor": color(0, 0, 0),
            "_enableShadow": False,
            "_shadowBlur": 2,
            "_shadowOffset": vec2(2, -2),
            "_shadowColor": color(0, 0, 0),
            "_id": "",
        })
        info = self.add({"__type__": "cc.CompPrefabInfo", "fileId": fid(self.name + str(node_id) + "lb")})
        self.objs[comp]["__prefab"] = {"__id__": info}
        self.objs[node_id]["_components"].append({"__id__": comp})
        ui = self.objs[node_id]["_components"][0]["__id__"]
        self.objs[ui]["_contentSize"] = size(width, font_size + 10)
        return comp

    def button(self, node_id, frame):
        comp = self.add({
            "__type__": "cc.Button",
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": {"__id__": node_id},
            "_enabled": True,
            "__prefab": None,
            "_interactable": True,
            "_transition": 0,
            "_zoomScale": 1,
            "_duration": 0.1,
            "_target": {"__id__": node_id},
            "_normalColor": color(255, 255, 255),
            "_pressedColor": color(200, 200, 200),
            "_hoverColor": color(211, 211, 211),
            "_disabledColor": color(124, 124, 124),
            "_normalSprite": {"__uuid__": frame},
            "_pressedSprite": None,
            "_hoverSprite": {"__uuid__": frame},
            "_disabledSprite": None,
            "clickEvents": [],
            "_id": "",
        })
        info = self.add({"__type__": "cc.CompPrefabInfo", "fileId": fid(self.name + str(node_id) + "bt")})
        self.objs[comp]["__prefab"] = {"__id__": info}
        self.objs[node_id]["_components"].append({"__id__": comp})
        return comp

def write_prefab(name, objs, meta_uuid):
    path = os.path.join(OUT, name + ".prefab")
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(objs, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    meta_path = path + ".meta"
    if os.path.exists(meta_path):
        with open(meta_path, encoding="utf-8") as handle:
            meta = json.load(handle)
        meta_uuid = meta.get("uuid") or meta_uuid
    meta = {
        "ver": "1.1.50",
        "importer": "prefab",
        "imported": True,
        "uuid": meta_uuid,
        "files": [".json"],
        "subMetas": {},
        "userData": {"syncNodeName": name},
    }
    with open(meta_path, "w", encoding="utf-8") as handle:
        json.dump(meta, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    return meta_uuid


def build_cell(frames):
    b = Builder("BackpackItemCell")
    root = b.node("BackpackItemCell", None, 0, 0, 96, 96)
    frame = b.node("spr_frame", root, 0, 0, 96, 96)
    b.sprite(frame, frames["frame"])
    select = b.node("spr_select", root, 0, 0, 96, 96, active=False)
    b.sprite(select, frames["select"])
    icon = b.node("spr_icon", root, 0, 6, 72, 72, active=False)
    b.sprite(icon, frames["icon"])
    count = b.node("lbl_count", root, 18, -30, 72, 22)
    b.label(count, "", 16, 255, 248, 220, 72)
    return b.dump()


def build_tab(frames):
    b = Builder("BackpackTabButton")
    root = b.node("BackpackTabButton", None, 0, 0, 108, 40)
    b.sprite(root, frames["tab"])
    b.button(root, frames["tab"])
    title = b.node("lbl_title", root, 0, 0, 96, 28)
    b.label(title, "道具", 18, 122, 71, 45, 96)
    return b.dump()


def append_node(objs, name, parent, x, y, w, h, ax, ay, sx=1, sy=1):
    def add(obj):
        objs.append(obj)
        return len(objs) - 1

    node_id = add(None)
    ui = add({
        "__type__": "cc.UITransform",
        "_name": "",
        "_objFlags": 0,
        "__editorExtras__": {},
        "node": {"__id__": node_id},
        "_enabled": True,
        "__prefab": None,
        "_contentSize": size(w, h),
        "_anchorPoint": vec2(ax, ay),
        "_id": "",
    })
    ui_info = add({"__type__": "cc.CompPrefabInfo", "fileId": fid("layer" + name + "ui")})
    objs[ui]["__prefab"] = {"__id__": ui_info}
    info = add({
        "__type__": "cc.PrefabInfo",
        "root": {"__id__": 1},
        "asset": {"__id__": 0},
        "fileId": fid("layer" + name + "node"),
        "instance": None,
        "targetOverrides": None,
        "nestedPrefabInstanceRoots": None,
    })
    objs[node_id] = {
        "__type__": "cc.Node",
        "_name": name,
        "_objFlags": 0,
        "__editorExtras__": {},
        "_parent": {"__id__": parent},
        "_children": [],
        "_active": True,
        "_components": [{"__id__": ui}],
        "_prefab": {"__id__": info},
        "_lpos": vec3(x, y, 0),
        "_lrot": quat(),
        "_lscale": vec3(sx, sy, 1),
        "_mobility": 0,
        "_layer": LAYER,
        "_euler": vec3(),
        "_id": "",
    }
    objs[parent]["_children"].append({"__id__": node_id})
    return node_id


def ensure_bag_scroll(objs):
    """Item grid host under spr_box. Matches the other backpack scrolls: mask on the host, view + content beside it."""
    for obj in objs:
        if isinstance(obj, dict) and obj.get("__type__") == "cc.Node" and obj.get("_name") == "BagScroll":
            return False
    box = None
    for i, obj in enumerate(objs):
        if isinstance(obj, dict) and obj.get("__type__") == "cc.Node" and obj.get("_name") == "spr_box":
            box = i
            break
    if box is None:
        raise SystemExit("BackpackLayer missing spr_box")

    def add(obj):
        objs.append(obj)
        return len(objs) - 1

    # Box is 520×565, anchor top-center. Scroll sits 5px under that top; height is box.height - 10.
    scroll = append_node(objs, "BagScroll", box, 0, -5, 520, 555, 0.5, 1)
    append_node(objs, "view", scroll, 0, 0, 520, 555, 0.5, 1)
    content = append_node(objs, "content", scroll, 0, 0, 520, 555, 0.5, 1)
    mask = add({
        "__type__": "cc.Mask",
        "_name": "",
        "_objFlags": 0,
        "_enabled": True,
        "__editorExtras__": {},
        "_type": 0,
        "_inverted": False,
        "_segments": 64,
        "_alphaThreshold": 0.1,
        "_id": "",
        "__prefab": None,
        "node": {"__id__": scroll},
    })
    mask_info = add({"__type__": "cc.CompPrefabInfo", "fileId": fid("layerBagScrollmask")})
    objs[mask]["__prefab"] = {"__id__": mask_info}
    objs[scroll]["_components"].append({"__id__": mask})
    scroll_view = add({
        "__type__": "cc.ScrollView",
        "_name": "",
        "_objFlags": 0,
        "_enabled": True,
        "__editorExtras__": {},
        "bounceDuration": 1,
        "brake": 0.5,
        "elastic": True,
        "inertia": True,
        "_content": {"__id__": content},
        "horizontal": False,
        "vertical": True,
        "_horizontalScrollBar": None,
        "_verticalScrollBar": None,
        "cancelInnerEvents": True,
        "scrollEvents": [],
        "_id": "",
        "__prefab": None,
        "node": {"__id__": scroll},
    })
    scroll_info = add({"__type__": "cc.CompPrefabInfo", "fileId": fid("layerBagScrollview")})
    objs[scroll_view]["__prefab"] = {"__id__": scroll_info}
    objs[scroll]["_components"].append({"__id__": scroll_view})
    return True


def patch_layer():
    path = os.path.join(OUT, "BackpackLayer.prefab")
    with open(path, encoding="utf-8") as handle:
        objs = json.load(handle)
    names = [obj.get("_name") for obj in objs if isinstance(obj, dict)]
    changed = False
    if "node_portrait" in names and "lbl_talk" in names:
        print("BackpackLayer already has portrait and talk")
    else:
        changed = True

    def add(obj):
        objs.append(obj)
        return len(objs) - 1

    def blank_node(name, parent, x, y, w, h, ax, ay, sx=1, sy=1):
        node_id = add(None)
        ui = add({
            "__type__": "cc.UITransform",
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": {"__id__": node_id},
            "_enabled": True,
            "__prefab": None,
            "_contentSize": size(w, h),
            "_anchorPoint": vec2(ax, ay),
            "_id": "",
        })
        ui_info = add({"__type__": "cc.CompPrefabInfo", "fileId": fid("layer" + name + "ui")})
        objs[ui]["__prefab"] = {"__id__": ui_info}
        info = add({
            "__type__": "cc.PrefabInfo",
            "root": {"__id__": 1},
            "asset": {"__id__": 0},
            "fileId": fid("layer" + name + "node"),
            "instance": None,
            "targetOverrides": None,
            "nestedPrefabInstanceRoots": None,
        })
        objs[node_id] = {
            "__type__": "cc.Node",
            "_name": name,
            "_objFlags": 0,
            "__editorExtras__": {},
            "_parent": {"__id__": parent},
            "_children": [],
            "_active": True,
            "_components": [{"__id__": ui}],
            "_prefab": {"__id__": info},
            "_lpos": vec3(x, y, 0),
            "_lrot": quat(),
            "_lscale": vec3(sx, sy, 1),
            "_mobility": 0,
            "_layer": LAYER,
            "_euler": vec3(),
            "_id": "",
        }
        objs[parent]["_children"].append({"__id__": node_id})
        return node_id

    if "node_portrait" not in names:
        # Large shopkeeper behind the bag plate. spine/shangcheng root sits under spr_bg.
        portrait = blank_node("node_portrait", 1, 200, 600, 520, 420, 0.5, 0, 1, 1)
        kids = objs[1].get("_children") or []
        objs[1]["_children"] = [{"__id__": portrait}] + [row for row in kids if row.get("__id__") != portrait]
        print("added node_portrait", portrait)
    host = None
    for i, obj in enumerate(objs):
        if isinstance(obj, dict) and obj.get("_name") == "CCNode_1" and obj.get("__type__") == "cc.Node":
            host = i
            break
    if host is None:
        raise SystemExit("BackpackLayer missing CCNode_1")
    if "lbl_talk" not in [obj.get("_name") for obj in objs if isinstance(obj, dict)]:
        talk = blank_node("lbl_talk", host, 150, 109, 220, 56, 0.5, 0.5)
        comp = add({
            "__type__": "cc.Label",
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": {"__id__": talk},
            "_enabled": True,
            "__prefab": None,
            "_customMaterial": None,
            "_srcBlendFactor": 2,
            "_dstBlendFactor": 4,
            "_color": color(141, 89, 58),
            "_string": "欢迎光临～",
            "_font": {"__uuid__": FONT},
            "_isSystemFontUsed": False,
            "_fontFamily": "Arial",
            "_overflow": 2,
            "_horizontalAlign": 1,
            "_verticalAlign": 1,
            "_enableWrapText": True,
            "_cacheMode": 0,
            "_underlineHeight": 2,
            "_isItalic": False,
            "_isBold": False,
            "_isUnderline": False,
            "_spacingX": 0,
            "_lineHeight": 32,
            "_fontSize": 28,
            "_actualFontSize": 28,
            "_enableOutline": False,
            "_outlineWidth": 2,
            "_outlineColor": color(0, 0, 0),
            "_enableShadow": False,
            "_shadowBlur": 2,
            "_shadowOffset": vec2(2, -2),
            "_shadowColor": color(0, 0, 0),
            "_id": "",
        })
        info = add({"__type__": "cc.CompPrefabInfo", "fileId": fid("layer lbl_talk label")})
        objs[comp]["__prefab"] = {"__id__": info}
        objs[talk]["_components"].append({"__id__": comp})
        print("added lbl_talk", talk)
    if ensure_bag_scroll(objs):
        print("added BagScroll under spr_box")
        changed = True
    if not changed:
        print("BackpackLayer already has portrait, talk, and BagScroll")
        return
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(objs, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def main():
    layer_path = os.path.join(OUT, "BackpackLayer.prefab")
    if os.path.exists(layer_path):
        with open(layer_path, encoding="utf-8") as source:
            if any("overrideCellSize" in row for row in json.load(source)):
                raise SystemExit("BackpackLayer is manually authored with SuperContent. Edit its Prefabs in Creator; this legacy generator must not overwrite them.")
    frames = {key: sprite_uuid(rel) for key, rel in SPRITES.items()}
    cell_uuid = write_prefab("BackpackItemCell", build_cell(frames), CELL_UUID)
    tab_uuid = write_prefab("BackpackTabButton", build_tab(frames), TAB_UUID)
    patch_layer()
    print("cell", cell_uuid)
    print("tab", tab_uuid)


if __name__ == "__main__":
    main()
