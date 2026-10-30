# -*- coding: utf-8 -*-
"""Prefab shells that screenFill and the hang sheets used to build at runtime.

Writes cell and modal prefabs, and patches the live layers so the node tree
already has the scroll, tab, parchment, and empty-state hosts. TypeScript only
looks those nodes up.
"""
import hashlib
import json
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RES = os.path.join(ROOT, "client", "assets", "resources")
UI = os.path.join(ROOT, "client", "assets", "prefabs", "ui")
FONT = "4ff55f31-773f-4ef9-99b6-466b5deeecb9"
LAYER = 33554432

SPRITES = {
    "hero_bg": "ui/hero/hero-icon_icon-bg-2.png",
    "hero_frame": "ui/hero/hero-icon_icon-frame-1.png",
    "hero_face": "ui/hero/hero-icon_spr-default.png",
    "hero_elem": "ui/hero/hero-icon_elem-0.png",
    "hero_star": "ui/hero/hero-info_spr-star-1.png",
    "hero_lock": "ui/hero/hero-icon_spr-lock.png",
    "hero_battle": "ui/hero/hero-icon_spr-battle.png",
    "skill_badge": "ui/hero/hero-info_spr-skill-level-bg.png",
    "bag_frame": "ui/bag/backpack_item-frame-1.png",
    "bag_icon": "ui/bag/backpack_spr-default.png",
    "dragon": "ui/dragon/dragon_btn-illustration.png",
    "dragon_lock": "ui/dragon/dragon_spr-lock.png",
    "tab": "ui/common/button_btn-tab-23.png",
    "close": "ui/common/button_btn-close-1.png",
    "reward": "ui/chapter-reward-lang/chapter-reward-lang_btn-reward-1.png",
    "mission": "ui/city/main-city_icon-main_mission.png",
    "white": "ui/common/loading_bg-white.png",
    "card": "ui/common/win-bg_block-bg-24.png",
}


def fid(seed):
    digest = hashlib.md5(seed.encode("utf-8")).digest()
    import base64

    text = base64.b64encode(digest).decode("ascii").replace("+", "A").replace("/", "B").rstrip("=")
    return (text + "xxxxxxxxxxxxxxxxxxxxxx")[:22]


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

    def node(self, name, parent, x, y, w, h, ax=0.5, ay=0.5, active=True):
        node_id = 1 if parent is None else self.add(None)
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
            "_lscale": vec3(1, 1, 1),
            "_mobility": 0,
            "_layer": LAYER,
            "_euler": vec3(),
            "_id": "",
        }
        if parent is not None:
            self.objs[parent]["_children"].append({"__id__": node_id})
        return node_id

    def sprite(self, node_id, frame, sliced=False, r=255, g=255, b=255, a=255):
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
            "_color": color(r, g, b, a),
            "_spriteFrame": None if frame is None else {"__uuid__": frame},
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

    def label(self, node_id, text, font_size, r, g, b, width, align=1):
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
            "_horizontalAlign": align,
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
            "_normalSprite": None if frame is None else {"__uuid__": frame},
            "_pressedSprite": None,
            "_hoverSprite": None if frame is None else {"__uuid__": frame},
            "_disabledSprite": None,
            "clickEvents": [],
            "_id": "",
        })
        info = self.add({"__type__": "cc.CompPrefabInfo", "fileId": fid(self.name + str(node_id) + "bt")})
        self.objs[comp]["__prefab"] = {"__id__": info}
        self.objs[node_id]["_components"].append({"__id__": comp})
        return comp

    def block(self, node_id):
        comp = self.add({
            "__type__": "cc.BlockInputEvents",
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": {"__id__": node_id},
            "_enabled": True,
            "__prefab": None,
            "_id": "",
        })
        info = self.add({"__type__": "cc.CompPrefabInfo", "fileId": fid(self.name + str(node_id) + "bk")})
        self.objs[comp]["__prefab"] = {"__id__": info}
        self.objs[node_id]["_components"].append({"__id__": comp})
        return comp

    def graphics(self, node_id, r, g, b, a):
        comp = self.add({
            "__type__": "cc.Graphics",
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": {"__id__": node_id},
            "_enabled": True,
            "__prefab": None,
            "_customMaterial": None,
            "_srcBlendFactor": 2,
            "_dstBlendFactor": 4,
            "_color": color(r, g, b, a),
            "_lineWidth": 1,
            "_strokeColor": color(r, g, b, a),
            "_lineJoin": 2,
            "_lineCap": 0,
            "_fillColor": color(r, g, b, a),
            "_miterLimit": 10,
            "_id": "",
        })
        info = self.add({"__type__": "cc.CompPrefabInfo", "fileId": fid(self.name + str(node_id) + "gf")})
        self.objs[comp]["__prefab"] = {"__id__": info}
        self.objs[node_id]["_components"].append({"__id__": comp})
        return comp

    def scroll(self, parent, name, x, y, w, h, ax, ay, vertical, content_ax, content_ay, content_x, content_y):
        host = self.node(name, parent, x, y, w, h, ax, ay)
        self.node("view", host, 0, 0, w, h, ax, ay)
        content = self.node("content", host, content_x, content_y, w, h, content_ax, content_ay)
        mask = self.add({
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
            "node": {"__id__": host},
        })
        mask_info = self.add({"__type__": "cc.CompPrefabInfo", "fileId": fid(self.name + name + "mask")})
        self.objs[mask]["__prefab"] = {"__id__": mask_info}
        self.objs[host]["_components"].append({"__id__": mask})
        view = self.add({
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
            "horizontal": not vertical,
            "vertical": vertical,
            "_horizontalScrollBar": None,
            "_verticalScrollBar": None,
            "cancelInnerEvents": True,
            "scrollEvents": [],
            "_id": "",
            "__prefab": None,
            "node": {"__id__": host},
        })
        view_info = self.add({"__type__": "cc.CompPrefabInfo", "fileId": fid(self.name + name + "sv")})
        self.objs[view]["__prefab"] = {"__id__": view_info}
        self.objs[host]["_components"].append({"__id__": view})
        return host, content

    def dump(self):
        if not isinstance(self.objs[1], dict) or self.objs[1].get("__type__") != "cc.Node":
            raise SystemExit(self.name + " root is not node 1")
        return self.objs


def write_prefab(folder, name, objs, meta_uuid):
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, name + ".prefab")
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


def load_prefab(rel):
    path = os.path.join(UI, rel)
    with open(path, encoding="utf-8") as handle:
        return path, json.load(handle)


def save_prefab(path, objs):
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(objs, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def find_ids(objs, name):
    found = []
    for i, obj in enumerate(objs):
        if isinstance(obj, dict) and obj.get("__type__") == "cc.Node" and obj.get("_name") == name:
            found.append(i)
    return found


def child_named(objs, parent, name):
    node = objs[parent]
    for ref in node.get("_children") or []:
        cid = ref.get("__id__")
        if isinstance(cid, int) and isinstance(objs[cid], dict) and objs[cid].get("_name") == name:
            return cid
    return None


class Patch(object):
    def __init__(self, objs, seed):
        self.objs = objs
        self.seed = seed

    def add(self, obj):
        self.objs.append(obj)
        return len(self.objs) - 1

    def node(self, name, parent, x, y, w, h, ax=0.5, ay=0.5, active=True, before=None):
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
        ui_info = self.add({"__type__": "cc.CompPrefabInfo", "fileId": fid(self.seed + name + "ui")})
        self.objs[ui]["__prefab"] = {"__id__": ui_info}
        info = self.add({
            "__type__": "cc.PrefabInfo",
            "root": {"__id__": 1},
            "asset": {"__id__": 0},
            "fileId": fid(self.seed + name + "node"),
            "instance": None,
            "targetOverrides": None,
            "nestedPrefabInstanceRoots": None,
        })
        self.objs[node_id] = {
            "__type__": "cc.Node",
            "_name": name,
            "_objFlags": 0,
            "__editorExtras__": {},
            "_parent": {"__id__": parent},
            "_children": [],
            "_active": active,
            "_components": [{"__id__": ui}],
            "_prefab": {"__id__": info},
            "_lpos": vec3(x, y, 0),
            "_lrot": quat(),
            "_lscale": vec3(1, 1, 1),
            "_mobility": 0,
            "_layer": LAYER,
            "_euler": vec3(),
            "_id": "",
        }
        kids = self.objs[parent]["_children"]
        ref = {"__id__": node_id}
        if before is None:
            kids.append(ref)
        else:
            index = 0
            for i, child in enumerate(kids):
                cid = child.get("__id__")
                if isinstance(cid, int) and self.objs[cid].get("_name") == before:
                    index = i
                    break
            kids.insert(index, ref)
        return node_id

    def sprite(self, node_id, frame, sliced=False, r=255, g=255, b=255, a=255):
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
            "_color": color(r, g, b, a),
            "_spriteFrame": None if frame is None else {"__uuid__": frame},
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
        info = self.add({"__type__": "cc.CompPrefabInfo", "fileId": fid(self.seed + str(node_id) + "sp")})
        self.objs[comp]["__prefab"] = {"__id__": info}
        self.objs[node_id]["_components"].append({"__id__": comp})

    def label(self, node_id, text, font_size, r, g, b, width, align=1):
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
            "_horizontalAlign": align,
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
        info = self.add({"__type__": "cc.CompPrefabInfo", "fileId": fid(self.seed + str(node_id) + "lb")})
        self.objs[comp]["__prefab"] = {"__id__": info}
        self.objs[node_id]["_components"].append({"__id__": comp})
        ui = self.objs[node_id]["_components"][0]["__id__"]
        self.objs[ui]["_contentSize"] = size(width, font_size + 10)

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
            "_normalSprite": None if frame is None else {"__uuid__": frame},
            "_pressedSprite": None,
            "_hoverSprite": None if frame is None else {"__uuid__": frame},
            "_disabledSprite": None,
            "clickEvents": [],
            "_id": "",
        })
        info = self.add({"__type__": "cc.CompPrefabInfo", "fileId": fid(self.seed + str(node_id) + "bt")})
        self.objs[comp]["__prefab"] = {"__id__": info}
        self.objs[node_id]["_components"].append({"__id__": comp})

    def vscroll(self, parent, name, x, y, w, h):
        if child_named(self.objs, parent, name) is not None:
            return child_named(self.objs, parent, name)
        host = self.node(name, parent, x, y, w, h, 0.5, 1)
        self.node("view", host, 0, 0, w, h, 0.5, 1)
        content = self.node("content", host, 0, 0, w, h, 0.5, 1)
        self._mask_scroll(host, content, True)
        empty = self.node("lbl_empty", host, 0, -h / 2, 360, 36, active=False)
        self.label(empty, "", 18, 122, 71, 45, 360)
        return host

    def hscroll(self, parent, name, x, y, w, h, content_anchor_x=0):
        if child_named(self.objs, parent, name) is not None:
            return child_named(self.objs, parent, name)
        host = self.node(name, parent, x, y, w, h, 0.5, 0.5)
        self.node("view", host, 0, 0, w, h, 0.5, 0.5)
        content_x = -w / 2 if content_anchor_x == 0 else 0
        content = self.node("content", host, content_x, 0, w, h, content_anchor_x, 0.5)
        self._mask_scroll(host, content, False)
        return host

    def _mask_scroll(self, host, content, vertical):
        mask = self.add({
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
            "node": {"__id__": host},
        })
        mask_info = self.add({"__type__": "cc.CompPrefabInfo", "fileId": fid(self.seed + str(host) + "mask")})
        self.objs[mask]["__prefab"] = {"__id__": mask_info}
        self.objs[host]["_components"].append({"__id__": mask})
        view = self.add({
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
            "horizontal": not vertical,
            "vertical": vertical,
            "_horizontalScrollBar": None,
            "_verticalScrollBar": None,
            "cancelInnerEvents": True,
            "scrollEvents": [],
            "_id": "",
            "__prefab": None,
            "node": {"__id__": host},
        })
        view_info = self.add({"__type__": "cc.CompPrefabInfo", "fileId": fid(self.seed + str(host) + "sv")})
        self.objs[view]["__prefab"] = {"__id__": view_info}
        self.objs[host]["_components"].append({"__id__": view})

    def tab(self, parent, name, title, x, y, w=100, h=36, active=True):
        if child_named(self.objs, parent, name) is not None:
            return
        node = self.node(name, parent, x, y, w, h, active=active)
        self.sprite(node, frames["tab"])
        self.button(node, frames["tab"])
        label = self.node("lbl_title", node, 0, 0, w - 8, 24)
        self.label(label, title, 14, 122, 71, 45, w - 8)

    def stars(self, parent, with_count=False, with_max=False):
        if child_named(self.objs, parent, "star0") is not None:
            return
        for i in range(5):
            star = self.node("star" + str(i), parent, (i - 2) * 16, 0, 22, 22, active=False)
            self.sprite(star, frames["hero_star"])
        if with_count and child_named(self.objs, parent, "lbl_count") is None:
            label = self.node("lbl_count", parent, 70, 0, 36, 22, active=False)
            self.label(label, "", 16, 255, 236, 190, 36)
        if with_max and child_named(self.objs, parent, "MaxStar") is None:
            label = self.node("MaxStar", parent, 0, 0, 80, 22, active=False)
            self.label(label, "已满星", 14, 122, 71, 45, 80)


frames = {}


def build_cells():
    folder = os.path.join(UI, "hero")
    hero = Builder("HeroIconCell")
    root = hero.node("HeroIconCell", None, 0, 0, 96, 104)
    hero.button(root, None)
    bg = hero.node("spr_bg", root, 0, 6, 84, 84)
    hero.sprite(bg, frames["hero_bg"])
    frame = hero.node("spr_frame", root, 0, 6, 88, 88)
    hero.sprite(frame, frames["hero_frame"])
    face = hero.node("spr_face", root, 0, 6, 72, 72)
    hero.sprite(face, frames["hero_face"])
    name = hero.node("lbl_name", root, 0, 6, 72, 36, active=False)
    hero.label(name, "", 14, 255, 236, 190, 72)
    elem = hero.node("spr_elem", root, -28, 32, 26, 26, active=False)
    hero.sprite(elem, frames["hero_elem"])
    for i in range(5):
        star = hero.node("star" + str(i), root, (i - 2) * 15, -40, 14, 14, active=False)
        hero.sprite(star, frames["hero_star"])
    level = hero.node("lbl_level", root, 22, -22, 36, 18, active=False)
    hero.label(level, "", 14, 255, 248, 220, 36)
    lock = hero.node("spr_lock", root, 28, 32, 28, 28, active=False)
    hero.sprite(lock, frames["hero_lock"])
    battle = hero.node("spr_battle", root, 30, 32, 28, 28, active=False)
    hero.sprite(battle, frames["hero_battle"])
    mark = hero.node("lbl_mark", root, 30, 36, 28, 28, active=False)
    hero.label(mark, "✓", 22, 70, 210, 90, 28)
    write_prefab(folder, "HeroIconCell", hero.dump(), "e7c1a4b0-6d28-4f53-9c11-2a8b7e6d5c40")

    cat = Builder("CatalogIconCell")
    root = cat.node("CatalogIconCell", None, 0, 0, 96, 96)
    cat.button(root, None)
    frame = cat.node("spr_frame", root, 0, 0, 88, 88)
    cat.sprite(frame, frames["bag_frame"])
    icon = cat.node("spr_icon", root, 0, 4, 72, 72)
    cat.sprite(icon, frames["bag_icon"])
    lock = cat.node("spr_lock", root, 28, 28, 28, 28, active=False)
    cat.sprite(lock, frames["hero_lock"])
    count = cat.node("lbl_count", root, 18, -30, 72, 22, active=False)
    cat.label(count, "", 16, 255, 248, 220, 72)
    write_prefab(folder, "CatalogIconCell", cat.dump(), "f8d2b5c1-7e39-4064-ad22-3b9c8f7e6d51")

    dragon = Builder("DragonCard")
    root = dragon.node("DragonCard", None, 0, 0, 100, 130)
    dragon.button(root, None)
    face = dragon.node("spr_face", root, 0, 18, 64, 64)
    dragon.sprite(face, frames["dragon"])
    lock = dragon.node("spr_lock", root, 26, 42, 32, 32)
    dragon.sprite(lock, frames["dragon_lock"])
    name = dragon.node("lbl_name", root, 0, -36, 96, 22)
    dragon.label(name, "", 14, 122, 71, 45, 96)
    tag = dragon.node("lbl_tag", root, 0, -54, 80, 18)
    dragon.label(tag, "图鉴", 12, 122, 71, 45, 80)
    write_prefab(folder, "DragonCard", dragon.dump(), "09e3c6d2-8f4a-4175-be33-4cad908f7e62")

    common = os.path.join(UI, "common")
    text = Builder("TextChip")
    root = text.node("TextChip", None, 0, 0, 200, 28)
    text.label(root, "", 18, 122, 71, 45, 200)
    write_prefab(common, "TextChip", text.dump(), "1af4d7e3-905b-4286-cf44-5dbe01908f73")

    dim = Builder("DimSheet")
    root = dim.node("DimSheet", None, 0, 0, 720, 1280)
    dim.block(root)
    plate = dim.node("dim", root, 0, 0, 720, 1280)
    dim.sprite(plate, frames["white"], r=8, g=16, b=32, a=170)
    dim.button(plate, frames["white"])
    write_prefab(common, "DimSheet", dim.dump(), "2b05e8f4-a16c-4397-d055-6ecf12a19084")

    info = Builder("InfoCard")
    root = info.node("InfoCard", None, 0, 0, 640, 960)
    plate = info.node("dim", root, 320, 480, 640, 960)
    info.sprite(plate, frames["white"], r=0, g=0, b=0, a=140)
    info.button(plate, frames["white"])
    card = info.node("card", root, 320, 500, 390, 300)
    info.block(card)
    bg = info.node("bg", card, 0, 0, 390, 300)
    info.sprite(bg, frames["card"], sliced=True)
    frame = info.node("spr_frame", card, -120, 70, 88, 88)
    info.sprite(frame, frames["bag_frame"])
    icon = info.node("spr_icon", card, -120, 74, 72, 72)
    info.sprite(icon, frames["bag_icon"])
    title = info.node("lbl_title", card, 30, 96, 220, 36)
    info.label(title, "", 22, 134, 236, 149, 220, align=0)
    kind = info.node("lbl_type", card, 30, 52, 220, 48)
    info.label(kind, "", 16, 255, 236, 190, 220, align=0)
    body = info.node("lbl_body", card, 0, -46, 340, 140)
    info.label(body, "", 16, 255, 249, 197, 340, align=0)
    close = info.node("btn_close", card, 165, 128, 44, 44)
    info.sprite(close, frames["close"])
    info.button(close, frames["close"])
    write_prefab(common, "InfoCard", info.dump(), "3c16f905-b27d-44a8-e166-7fd023b2a195")

    shell = Builder("PagePrefabShell")
    root = shell.node("PagePrefabShell", None, 0, 0, 720, 1280)
    shell.block(root)
    dim_node = shell.node("dim", root, 0, 0, 720, 1280, active=False)
    shell.graphics(dim_node, 8, 16, 32, 255)
    probe = shell.node("HangProbeHotspot", root, -320, 120, 72, 88, active=False)
    shell.graphics(probe, 0, 0, 0, 0)
    write_prefab(common, "PagePrefabShell", shell.dump(), "7a5a3d49-f6b1-48ec-85aa-b31467f6e5d9")

    back = Builder("ListBackdrop")
    root = back.node("ListBackdrop", None, 0, 0, 720, 1280)
    dim_node = back.node("ShellBackdropDim", root, 0, 0, 720, 1280)
    back.graphics(dim_node, 22, 16, 20, 255)
    art = back.node("ShellBackdrop", root, 0, 0, 720, 1280)
    back.sprite(art, None)
    write_prefab(common, "ListBackdrop", back.dump(), "5e381b27-d49f-46ca-a388-91f245d4c3b7")

    chip = Builder("HangMissionChip")
    root = chip.node("HangMissionChip", None, 0, 0, 196, 64)
    chip.button(root, None)
    icon = chip.node("icon", root, -64, 0, 56, 56)
    chip.sprite(icon, frames["mission"])
    label = chip.node("HangMissionLabel", root, 24, 0, 120, 40)
    chip.label(label, "", 16, 255, 236, 190, 120)
    write_prefab(os.path.join(UI, "battle"), "HangMissionChip", chip.dump(), "4d270a16-c38e-45b9-f277-80e134c3b2a6")

    stage = Builder("ChapterStageChip")
    root = stage.node("ChapterStageChip", None, 0, 0, 80, 40)
    stage.sprite(root, frames["tab"])
    stage.button(root, frames["tab"])
    label = stage.node("lbl_title", root, 0, 0, 76, 24)
    stage.label(label, "", 14, 122, 71, 45, 76)
    write_prefab(os.path.join(UI, "chapter"), "ChapterStageChip", stage.dump(), "6f492c38-e5a0-47db-b499-a20356e5d4c8")

    # Close sits 73.889 in from the right, 35.47 down from the top of a 640×1280 map.
    chapter = Builder("ChapterMapLayer")
    root = chapter.node("ChapterMap", None, 0, 0, 640, 1280)
    chapter.sprite(root, None)
    title = chapter.node("ChapterMapTitle", root, 0, 592.857, 420, 36)
    chapter.label(title, "", 22, 255, 236, 190, 420)
    close = chapter.node("MapClose", root, 246.111, 604.53, 55, 58)
    chapter.sprite(close, frames["close"])
    chapter.button(close, frames["close"])
    reward = chapter.node("MapReward", root, -246.111, 604.53, 136, 38)
    chapter.sprite(reward, frames["reward"])
    chapter.button(reward, frames["reward"])
    strip, _content = chapter.scroll(root, "StageStrip", 0, -580, 600, 52, 0.5, 0.5, False, 0, 0.5, -300, 0)
    empty = chapter.node("lbl_empty", strip, 0, 0, 280, 28, active=False)
    chapter.label(empty, "", 16, 255, 236, 190, 280)
    write_prefab(os.path.join(UI, "chapter"), "ChapterMapLayer", chapter.dump(), "8a6b4e50-17c2-49fd-96bb-c42578a7f6ea")


def ensure_parchment(rel, before_name):
    path, objs = load_prefab(rel)
    if find_ids(objs, "ParchmentPlate"):
        print(rel, "already has ParchmentPlate")
        return
    parents = find_ids(objs, before_name)
    if not parents:
        raise SystemExit(rel + " missing " + before_name)
    bg = parents[0]
    parent = objs[bg]["_parent"]["__id__"]
    pos = objs[bg]["_lpos"]
    ui = None
    for ref in objs[bg]["_components"]:
        comp = objs[ref["__id__"]]
        if comp.get("__type__") == "cc.UITransform":
            ui = comp
            break
    box = ui["_contentSize"]
    anchor = ui["_anchorPoint"]
    cx = pos["x"] + (0.5 - anchor["x"]) * box["width"]
    cy = pos["y"] + (0.5 - anchor["y"]) * box["height"]
    patch = Patch(objs, rel + "plate")
    plate = patch.node("ParchmentPlate", parent, cx, cy, box["width"], box["height"], before=before_name)
    patch.sprite(plate, frames["white"], r=244, g=228, b=196)
    save_prefab(path, objs)
    print("added ParchmentPlate", rel)


def patch_layers():
    path, objs = load_prefab("hero/HeroListHeroLayer.prefab")
    boxes = find_ids(objs, "spr_box")
    if not boxes:
        raise SystemExit("HeroListHeroLayer missing spr_box")
    patch = Patch(objs, "heroScroll")
    patch.vscroll(boxes[0], "HeroScroll", 0, -108, 540, 320)
    save_prefab(path, objs)
    print("HeroListHeroLayer HeroScroll")

    path, objs = load_prefab("hero/HeroInfoLayer.prefab")
    panels = find_ids(objs, "node_panel")
    if not panels:
        raise SystemExit("HeroInfoLayer missing node_panel")
    patch = Patch(objs, "detailBody")
    body = child_named(objs, panels[0], "DetailBody")
    if body is None:
        body = patch.node("DetailBody", panels[0], 0, 180, 520, 220)
    patch.vscroll(body, "DetailScroll", 0, 36, 460, 160)
    tabs = [("btn_gem_1", "攻击", -150), ("btn_gem_2", "生命", -64), ("btn_gem_3", "速度", 22)]
    gears = [("btn_gear_1", "戒指", -150), ("btn_gear_2", "耳环", -64), ("btn_gear_3", "披风", 22), ("btn_gear_4", "腰带", 108)]
    for name, title, x in tabs:
        patch.tab(body, name, title, x, 64, 72, 32, active=False)
    for name, title, x in gears:
        patch.tab(body, name, title, x, 64, 72, 32, active=False)
    scrolls = find_ids(objs, "scroll_view_tab")
    if not scrolls:
        raise SystemExit("HeroInfoLayer missing scroll_view_tab")
    names = [("btn_tab_grow", "育成", -165), ("btn_tab_star", "星UP", -55), ("btn_tab_gem", "宝石", 55), ("btn_tab_gear", "神装", 165)]
    for name, title, x in names:
        patch.tab(scrolls[0], name, title, x, 36, 100, 36)
    stars_host = find_ids(objs, "node_star")
    for host in stars_host:
        patch.stars(host, with_count=True)
    bats = find_ids(objs, "bat_node")
    if bats and child_named(objs, bats[0], "FightValue") is None:
        label = patch.node("FightValue", bats[0], 40, 0, 160, 28)
        patch.label(label, "—", 22, 255, 236, 190, 160)
    save_prefab(path, objs)
    print("HeroInfoLayer DetailBody")

    path, objs = load_prefab("hero/HeroInfoUpLevelLayer.prefab")
    menus = find_ids(objs, "skill_menu")
    if not menus:
        raise SystemExit("HeroInfoUpLevelLayer missing skill_menu")
    patch = Patch(objs, "skillSlot")
    menu = menus[0]
    for i in range(4):
        name = "skill" + str(i)
        if child_named(objs, menu, name) is not None:
            continue
        slot = patch.node(name, menu, (i - 1.5) * 70, 0, 48, 48, active=False)
        patch.sprite(slot, frames["hero_face"])
        patch.button(slot, None)
        badge = patch.node("badge", slot, -20, 20, 20, 20, active=False)
        patch.sprite(badge, frames["skill_badge"])
        label = patch.node("lbl", badge, 0, 0, 20, 20)
        patch.label(label, "", 14, 0, 0, 0, 20)
    save_prefab(path, objs)
    print("HeroInfoUpLevelLayer skill slots")

    path, objs = load_prefab("hero/HeroInfoUpStarLayer.prefab")
    patch = Patch(objs, "starHost")
    for host in find_ids(objs, "node_cur_star"):
        patch.stars(host)
    for host in find_ids(objs, "node_next_star"):
        patch.stars(host, with_max=True)
    scrolls = find_ids(objs, "scroll_view")
    if not scrolls:
        raise SystemExit("HeroInfoUpStarLayer missing scroll_view")
    scroll = scrolls[0]
    row = child_named(objs, scroll, "CostRow")
    if row is None:
        row = patch.node("CostRow", scroll, 24, 70, 420, 80)
        full = patch.node("lbl_full", row, 40, 0, 120, 22, active=False)
        patch.label(full, "已满星", 14, 122, 71, 45, 120)
        for i in range(4):
            cell = patch.node("cost" + str(i), row, i * 64, 10, 48, 48, active=False)
            patch.sprite(cell, frames["bag_frame"])
            icon = patch.node("spr_icon", cell, 0, 0, 40, 40)
            patch.sprite(icon, frames["bag_icon"])
            num = patch.node("lbl_num", row, i * 64, -28, 48, 16, active=False)
            patch.label(num, "", 12, 122, 71, 45, 48)
        need = patch.node("lbl_need", row, 250, 0, 160, 36, active=False)
        patch.label(need, "", 12, 122, 71, 45, 160)
    save_prefab(path, objs)
    print("HeroInfoUpStarLayer CostRow")

    path, objs = load_prefab("hero/HeroInfoAttrLayer.prefab")
    scrolls = find_ids(objs, "scroll_view")
    if not scrolls:
        raise SystemExit("HeroInfoAttrLayer missing scroll_view")
    # content sits beside view. Its anchor is the left edge, 185px left of the scroll center.
    content = child_named(objs, scrolls[0], "content")
    if content is None:
        raise SystemExit("HeroInfoAttrLayer scroll has no content")
    patch = Patch(objs, "attrLine")
    for i in range(5):
        name = "lbl_line" + str(i)
        if child_named(objs, content, name) is not None:
            continue
        label = patch.node(name, content, 185, -36 - i * 48, 280, 36, active=False)
        patch.label(label, "", 22, 122, 71, 45, 280, align=0)
    save_prefab(path, objs)
    print("HeroInfoAttrLayer lines")

    path, objs = load_prefab("hero/HeroSelectLayer.prefab")
    scrolls = find_ids(objs, "scroll_view_backpack")
    if not scrolls:
        raise SystemExit("HeroSelectLayer missing scroll_view_backpack")
    content = child_named(objs, scrolls[0], "content")
    if content is None:
        raise SystemExit("HeroSelectLayer scroll has no content")
    patch = Patch(objs, "formGrid")
    if child_named(objs, content, "FormGrid") is None:
        patch.node("FormGrid", content, 0, 0, 520, 40)
    for n in range(1, 10):
        for slot in find_ids(objs, "node_icon_" + str(n)):
            if child_named(objs, slot, "spr_face") is not None:
                continue
            face = patch.node("spr_face", slot, 0, 0, 64, 64, active=False)
            patch.sprite(face, frames["hero_face"])
            patch.button(face, None)
    save_prefab(path, objs)
    print("HeroSelectLayer FormGrid")

    path, objs = load_prefab("chapter/ChapterPreviewLayer.prefab")
    scrolls = find_ids(objs, "scroll_view")
    if not scrolls:
        raise SystemExit("ChapterPreviewLayer missing scroll_view")
    content = child_named(objs, scrolls[0], "content")
    if content is None:
        raise SystemExit("ChapterPreviewLayer scroll has no content")
    patch = Patch(objs, "previewDrops")
    if child_named(objs, content, "PreviewDrops") is None:
        row = patch.node("PreviewDrops", content, 280, -40, 460, 72)
        empty = patch.node("lbl_empty", row, 0, 0, 420, 36, active=False)
        patch.label(empty, "这一关没有掉落表", 18, 255, 236, 190, 420)
    save_prefab(path, objs)
    print("ChapterPreviewLayer PreviewDrops")

    path, objs = load_prefab("chapter/ChapterRewardLayer.prefab")
    boxes = find_ids(objs, "spr_box")
    if not boxes:
        raise SystemExit("ChapterRewardLayer missing spr_box")
    patch = Patch(objs, "rewardBoard")
    board = child_named(objs, boxes[0], "RewardBoard")
    if board is None:
        board = patch.node("RewardBoard", boxes[0], 0, 0, 570, 720)
    # Extra row sits near the top of the 720 box. List fills the rest.
    patch.hscroll(board, "ExtraRow", 0, 258, 554, 180)
    host = patch.vscroll(board, "RewardList", 0, -98, 570, 504)
    # vscroll anchor is top. The old list was center-anchored, so shift the host
    # so its center stays at y=-98: top anchor means position is the top edge.
    if host is not None:
        objs[host]["_lpos"]["y"] = -98 + 252
    if child_named(objs, board, "lbl_empty") is None:
        empty = patch.node("lbl_empty", board, 0, 0, 400, 36, active=False)
        patch.label(empty, "没有通关奖励表", 18, 122, 71, 45, 400)
    save_prefab(path, objs)
    print("ChapterRewardLayer RewardBoard")

    path, objs = load_prefab("backpack/BackpackInfoLayer.prefab")
    icons = find_ids(objs, "spr_icon")
    if not icons:
        raise SystemExit("BackpackInfoLayer missing spr_icon")
    icon = icons[0]
    parent = objs[icon]["_parent"]["__id__"]
    if child_named(objs, parent, "spr_rare") is None:
        patch = Patch(objs, "rareFrame")
        pos = objs[icon]["_lpos"]
        rare = patch.node("spr_rare", parent, pos["x"], pos["y"], 108, 108, before="spr_icon")
        patch.sprite(rare, frames["bag_frame"])
    save_prefab(path, objs)
    print("BackpackInfoLayer spr_rare")

    path, objs = load_prefab("chapter/ChapterExtraRewardCell.prefab")
    slots = find_ids(objs, "spr_reward_bg")
    if slots and child_named(objs, slots[0], "spr_icon") is None:
        patch = Patch(objs, "rewardIcon")
        icon = patch.node("spr_icon", slots[0], 0, 0, 72, 72)
        patch.sprite(icon, frames["bag_icon"])
        patch.button(icon, None)
        num = patch.node("lbl_num", slots[0], 16, -24, 48, 18, active=False)
        patch.label(num, "", 14, 255, 236, 190, 48)
        save_prefab(path, objs)
        print("ChapterExtraRewardCell spr_icon")


def main():
    global frames
    frames = {key: sprite_uuid(rel) for key, rel in SPRITES.items()}
    build_cells()
    ensure_parchment("hero/HeroListLayer.prefab", "spr_bg")
    ensure_parchment("backpack/BackpackLayer.prefab", "spr_bg")
    patch_layers()


if __name__ == "__main__":
    main()
