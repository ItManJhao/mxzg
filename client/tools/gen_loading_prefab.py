# -*- coding: utf-8 -*-
"""Generate the boot loading and hot-update prefabs.

Writes:
  client/assets/prefabs/ui/login/LoadingLayer.prefab
  client/assets/prefabs/ui/login/UpdateLayer.prefab

Sprites point at resources sprite-frame uuids (@f9941). No PNG is copied.
There is no loading/update ccbi in the inventory, so the layout follows the
asset sizes (640-wide bar frames on a 720x1280 design) and is documented in
docs/prefab-1to1-deviations.md. An existing .meta uuid is kept.
"""
import base64
import hashlib
import json
import os
import uuid

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RES = os.path.join(ROOT, "client", "assets", "resources")
OUT_DIR = os.path.join(ROOT, "client", "assets", "prefabs", "ui", "login")
FONT_META = os.path.join(RES, "font", "FZCSJW-GB1-0.ttf.meta")

LAYER_UI = 33554432
SIMPLE = 0
SLICED = 1
TRANSITION_SCALE = 3

DESIGN_W = 720
DESIGN_H = 1280
BG_W = 768
BG_H = 1300
BG_COVER = max(DESIGN_W / float(BG_W), DESIGN_H / float(BG_H))
BG_DRAW_W = int(round(BG_W * BG_COVER))
BG_DRAW_H = int(round(BG_H * BG_COVER))
BAR_Y = -500
# Trim, not the 638px raw frame. Creator dropped the transparent edge.
FRAME_W = 617
FRAME_H = 37
TRACK_W = 532
TRACK_H = 32
FILL_W = 524
FILL_H = 24
HEAD_W = 18
HEAD_H = 27
SPINE_NATIVE_W = 275
SPINE_SCALE_X = round(FILL_W / float(SPINE_NATIVE_W), 4)

SPRITES = {
    "bg": "ui/login/bg-loading.jpg",
    "frame": "ui/common/loading_spr-bg-2.png",
    "track": "ui/common/loading_progress-bg.png",
    "fill": "ui/common/loading_progress.png",
    "head": "ui/common/loading_spr-progress-1.png",
    "plate": "ui/common/loading_text-bg.png",
    "retry": "ui/common/button_btn-orange-big-1.png",
    "retry_p": "ui/common/button_btn-orange-big-2.png",
}


def fid(seed):
    digest = hashlib.md5(seed.encode("utf-8")).digest()
    text = base64.b64encode(digest).decode("ascii").replace("+", "A").replace("/", "B").rstrip("=")
    return (text + "xxxxxxxxxxxxxxxxxxxxxx")[:22]


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


def ref(i):
    return {"__id__": i}


def uuid_ref(value):
    return {"__uuid__": value}


def load_sprite(rel):
    meta_path = os.path.join(RES, rel + ".meta")
    with open(meta_path, encoding="utf-8") as handle:
        data = json.load(handle)
    sub = data.get("subMetas", {}).get("f9941")
    if not sub or sub.get("importer") != "sprite-frame":
        raise SystemExit("missing sprite-frame " + meta_path)
    value = sub.get("uuid") or ""
    if not value.endswith("@f9941"):
        raise SystemExit("sprite uuid is not @f9941: " + rel)
    user = sub.get("userData") or {}
    borders = (
        user.get("borderTop", 0),
        user.get("borderBottom", 0),
        user.get("borderLeft", 0),
        user.get("borderRight", 0),
    )
    return {
        "uuid": value,
        "borders": borders,
        "trim": (user.get("width"), user.get("height")),
        "rel": rel,
    }


def load_font():
    with open(FONT_META, encoding="utf-8") as handle:
        data = json.load(handle)
    value = data.get("uuid") or ""
    if data.get("importer") != "ttf-font" or len(value) < 32:
        raise SystemExit("font meta missing uuid")
    return value


SF = {key: load_sprite(rel) for key, rel in SPRITES.items()}
FONT = load_font()
WHITE = color(255, 255, 255, 255)
PERCENT = color(255, 248, 230, 255)
TIPS = color(255, 238, 178, 255)
MESSAGE = color(255, 244, 220, 255)


def sprite_type(sprite):
    if any(edge != 0 for edge in sprite["borders"]):
        return SLICED
    return SIMPLE


class Builder(object):
    def __init__(self, name):
        self.name = name
        self.objs = []
        self.path_of = {}
        self.add({
            "__type__": "cc.Prefab",
            "_name": name,
            "_objFlags": 0,
            "__editorExtras__": {},
            "_native": "",
            "data": {"__id__": 1},
            "optimizationPolicy": 0,
            "persistent": False,
        })

    def add(self, obj):
        self.objs.append(obj)
        return len(self.objs) - 1

    def make_node(self, name, parent_id, x, y, w, h, active=True, ax=0.5, ay=0.5, sx=1, sy=1):
        path = name if parent_id is None else self.path_of[parent_id] + "/" + name
        node = {
            "__type__": "cc.Node",
            "_name": name,
            "_objFlags": 0,
            "__editorExtras__": {},
            "_parent": None if parent_id is None else ref(parent_id),
            "_children": [],
            "_active": active,
            "_components": [],
            "_prefab": None,
            "_lpos": vec3(x, y, 0),
            "_lrot": quat(),
            "_lscale": vec3(sx, sy, 1),
            "_mobility": 0,
            "_layer": LAYER_UI,
            "_euler": vec3(0, 0, 0),
            "_id": "",
        }
        node_id = self.add(node)
        self.path_of[node_id] = path
        uit = {
            "__type__": "cc.UITransform",
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": ref(node_id),
            "_enabled": True,
            "__prefab": None,
            "_contentSize": size(w, h),
            "_anchorPoint": vec2(ax, ay),
            "_id": "",
        }
        uit_id = self.add(uit)
        cpi = self.add({"__type__": "cc.CompPrefabInfo", "fileId": fid(path + ":UITransform")})
        uit["__prefab"] = ref(cpi)
        node["_components"].append(ref(uit_id))
        pi = self.add({
            "__type__": "cc.PrefabInfo",
            "root": ref(1),
            "asset": ref(0),
            "fileId": fid(path + ":Node"),
            "instance": None,
            "targetOverrides": None,
            "nestedPrefabInstanceRoots": None,
        })
        node["_prefab"] = ref(pi)
        if parent_id is not None:
            self.objs[parent_id]["_children"].append(ref(node_id))
        return node_id

    def append_comp(self, node_id, comp, seed):
        cpi = self.add({"__type__": "cc.CompPrefabInfo", "fileId": fid(seed)})
        comp["__prefab"] = ref(cpi)
        comp["node"] = ref(node_id)
        cid = self.add(comp)
        self.objs[node_id]["_components"].append(ref(cid))
        return cid

    def add_sprite(self, node_id, sprite):
        spr = {
            "__type__": "cc.Sprite",
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": ref(node_id),
            "_enabled": True,
            "__prefab": None,
            "_customMaterial": None,
            "_srcBlendFactor": 2,
            "_dstBlendFactor": 4,
            "_color": WHITE,
            "_spriteFrame": uuid_ref(sprite["uuid"]),
            "_type": sprite_type(sprite),
            "_fillType": 0,
            "_sizeMode": 0,
            "_fillCenter": vec2(0, 0),
            "_fillStart": 0,
            "_fillRange": 0,
            "_isTrimmedMode": True,
            "_useGrayscale": False,
            "_atlas": None,
            "_id": "",
        }
        return self.append_comp(node_id, spr, self.path_of[node_id] + ":Sprite")

    def add_label(self, node_id, text, font_size, col, wrap=False):
        lab = {
            "__type__": "cc.Label",
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": ref(node_id),
            "_enabled": True,
            "__prefab": None,
            "_customMaterial": None,
            "_srcBlendFactor": 2,
            "_dstBlendFactor": 4,
            "_color": col,
            "_string": text,
            "_horizontalAlign": 1,
            "_verticalAlign": 1,
            "_actualFontSize": font_size,
            "_fontSize": font_size,
            "_fontFamily": "Arial",
            "_lineHeight": font_size + 6,
            "_overflow": 3 if wrap else 1,
            "_enableWrapText": wrap,
            "_font": uuid_ref(FONT),
            "_isSystemFontUsed": False,
            "_spacingX": 0,
            "_isItalic": False,
            "_isBold": False,
            "_isUnderline": False,
            "_underlineHeight": 2,
            "_cacheMode": 0,
            "_enableOutline": False,
            "_outlineColor": color(20, 16, 28, 220),
            "_outlineWidth": 2,
            "_enableShadow": False,
            "_shadowColor": color(0, 0, 0, 255),
            "_shadowOffset": vec2(2, -2),
            "_shadowBlur": 2,
            "_id": "",
        }
        return self.append_comp(node_id, lab, self.path_of[node_id] + ":Label")

    def add_button(self, node_id, normal, pressed):
        btn = {
            "__type__": "cc.Button",
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": ref(node_id),
            "_enabled": True,
            "__prefab": None,
            "clickEvents": [],
            "_interactable": True,
            "_transition": TRANSITION_SCALE,
            "_normalColor": WHITE,
            "_hoverColor": color(211, 211, 211, 255),
            "_pressedColor": color(200, 200, 200, 255),
            "_disabledColor": color(124, 124, 124, 255),
            "_normalSprite": uuid_ref(normal["uuid"]),
            "_hoverSprite": uuid_ref(normal["uuid"]),
            "_pressedSprite": uuid_ref(pressed["uuid"]),
            "_disabledSprite": uuid_ref(normal["uuid"]),
            "_duration": 0.1,
            "_zoomScale": 1.05,
            "_target": ref(node_id),
            "_id": "",
        }
        return self.append_comp(node_id, btn, self.path_of[node_id] + ":Button")

    def add_mask(self, node_id):
        mask = {
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
        }
        return self.append_comp(node_id, mask, self.path_of[node_id] + ":Mask")

    def add_block(self, node_id):
        block = {
            "__type__": "cc.BlockInputEvents",
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": ref(node_id),
            "_enabled": True,
            "__prefab": None,
            "_id": "",
        }
        return self.append_comp(node_id, block, self.path_of[node_id] + ":BlockInputEvents")


def build(name):
    b = Builder(name)
    root = b.make_node(name, None, 0, 0, DESIGN_W, DESIGN_H)
    b.add_block(root)

    bg = b.make_node("Bg", root, 0, 0, BG_DRAW_W, BG_DRAW_H)
    b.add_sprite(bg, SF["bg"])

    message = b.make_node("Message", root, 0, -390, 660, 72)
    b.add_label(message, "", 24, MESSAGE, wrap=True)

    plate = b.make_node("PercentPlate", root, 0, -448, 84, 84)
    b.add_sprite(plate, SF["plate"])

    percent = b.make_node("Percent", root, 0, -448, 160, 36)
    b.add_label(percent, "0%", 22, PERCENT)

    frame = b.make_node("BarFrame", root, 0, BAR_Y, FRAME_W, FRAME_H)
    b.add_sprite(frame, SF["frame"])

    track = b.make_node("BarTrack", root, 0, BAR_Y, TRACK_W, TRACK_H)
    b.add_sprite(track, SF["track"])

    # Anchor on the left so runtime can grow the mask with the percent.
    mask = b.make_node("BarMask", root, -FILL_W / 2, BAR_Y, 0, FILL_H + 16, ax=0, ay=0.5)
    b.add_mask(mask)
    fill = b.make_node("BarFill", mask, FILL_W / 2, 0, FILL_W, FILL_H)
    b.add_sprite(fill, SF["fill"])
    b.make_node(
        "Spine",
        mask,
        FILL_W / 2,
        0,
        SPINE_NATIVE_W,
        39,
        sx=SPINE_SCALE_X,
        sy=1,
    )

    b.make_node("BarHead", root, -FILL_W / 2, BAR_Y, HEAD_W, HEAD_H)
    head_id = None
    for nid, path in b.path_of.items():
        if path.endswith("/BarHead"):
            head_id = nid
    b.add_sprite(head_id, SF["head"])

    tips = b.make_node("Tips", root, 0, -580, 660, 80)
    b.add_label(tips, "", 20, TIPS, wrap=True)

    retry_w, retry_h = SF["retry"]["trim"]
    if not retry_w or not retry_h:
        retry_w, retry_h = 195, 66
    retry = b.make_node("Retry", root, 0, -280, retry_w, retry_h, active=False)
    b.add_sprite(retry, SF["retry"])
    b.add_button(retry, SF["retry"], SF["retry_p"])
    label = b.make_node("Label", retry, 0, 0, retry_w - 24, retry_h - 12)
    b.add_label(label, "重试", 24, WHITE)

    known = {sprite["uuid"] for sprite in SF.values()}
    file_ids = []
    for obj in b.objs:
        if "fileId" in obj:
            file_ids.append(obj["fileId"])
            if len(obj["fileId"]) != 22:
                raise SystemExit("bad fileId")
        for key in ("_spriteFrame", "_font", "_normalSprite", "_hoverSprite", "_pressedSprite", "_disabledSprite"):
            val = obj.get(key)
            if isinstance(val, dict) and "__uuid__" in val:
                if key == "_font":
                    if val["__uuid__"] != FONT:
                        raise SystemExit("font drifted")
                elif val["__uuid__"] not in known or not val["__uuid__"].endswith("@f9941"):
                    raise SystemExit("sprite is not a resources frame")
    if len(file_ids) != len(set(file_ids)):
        raise SystemExit("duplicate fileId")
    if head_id is None:
        raise SystemExit("missing BarHead")
    return b


def existing_uuid(meta_path):
    if not os.path.exists(meta_path):
        return None
    with open(meta_path, encoding="utf-8") as handle:
        data = json.load(handle)
    value = data.get("uuid") or ""
    if not isinstance(value, str) or len(value) < 32:
        return None
    return value


def write_prefab(builder):
    path = os.path.join(OUT_DIR, builder.name + ".prefab")
    meta_path = path + ".meta"
    text = json.dumps(builder.objs, ensure_ascii=False, indent=2) + "\n"
    for banned in (".png", "resources/", "lbl-"):
        if banned in text:
            raise SystemExit("prefab embedded " + banned)
    with open(path, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)
    prefab_uuid = existing_uuid(meta_path) or str(uuid.uuid4())
    meta = {
        "ver": "1.1.50",
        "importer": "prefab",
        "imported": True,
        "uuid": prefab_uuid,
        "files": [".json"],
        "subMetas": {},
        "userData": {"syncNodeName": builder.name},
    }
    with open(meta_path, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(meta, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print(builder.name, prefab_uuid)
    return prefab_uuid


def main():
    if sprite_type(SF["fill"]) != SIMPLE:
        raise SystemExit("fill sprite unexpectedly sliced")
    if SF["frame"]["trim"] != (FRAME_W, FRAME_H):
        raise SystemExit("bar frame trim %s" % (SF["frame"]["trim"],))
    if SF["track"]["trim"] != (TRACK_W, TRACK_H):
        raise SystemExit("track trim %s" % (SF["track"]["trim"],))
    if SF["fill"]["trim"] != (FILL_W, FILL_H):
        raise SystemExit("fill trim %s" % (SF["fill"]["trim"],))
    if SF["head"]["trim"] != (HEAD_W, HEAD_H):
        raise SystemExit("head trim %s" % (SF["head"]["trim"],))
    if SF["plate"]["trim"] != (84, 84):
        raise SystemExit("plate trim %s" % (SF["plate"]["trim"],))
    write_prefab(build("LoadingLayer"))
    write_prefab(build("UpdateLayer"))


if __name__ == "__main__":
    main()
