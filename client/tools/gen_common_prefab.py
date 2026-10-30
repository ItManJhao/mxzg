# -*- coding: utf-8 -*-
"""Generate Creator 3.8.8 common UI prefabs (not wired).

Writes under client/assets/prefabs/ui/common/:
  CommonPanel.prefab
  CommonBtnPrimary.prefab
  CommonBtnSecondary.prefab
  CommonListRow.prefab
  CommonRedDot.prefab
and their .meta files, plus ui/common.meta if it is missing.

SpriteFrame uuids are read from client/assets/resources/**/*.meta (@f9941).
No PNG is copied into prefabs/. The five #66 nine-slice metas are read-only.

Shell scripts under client/assets/scripts/ui/common/ are not generated here.
This script only binds the @property node refs already declared on those shells.
It does not touch Boot, prefabLoad, USE_* flags, or protocol scripts.

Shell __type__ is compressUuid(meta uuid, false): reserved head defaults to 5,
23 characters, the same string Creator 3.8.8 passes to _RF.push. The 22-char
compressUuid(uuid, true) form is not a class id and is not written.

File ids are hashed from node paths, so the prefab body is stable.
An existing .meta uuid is kept, so a second run rewrites the same files.
"""
import base64
import hashlib
import json
import os
import uuid

from check_citychrome_shell_id import class_id, legacy_min_id

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RES = os.path.join(ROOT, "client", "assets", "resources")
OUT_DIR = os.path.join(ROOT, "client", "assets", "prefabs", "ui", "common")
DIR_META = OUT_DIR + ".meta"
SCRIPT_DIR = os.path.join(ROOT, "client", "assets", "scripts", "ui", "common")
FONT_META = os.path.join(RES, "font", "FZCSJW-GB1-0.ttf.meta")

LAYER_UI = 33554432
SIMPLE = 0
SLICED = 1
# cc.Button.Transition.SCALE. Matches the other ui prefabs.
TRANSITION_SCALE = 3

PANEL_W = 640
PANEL_H = 880
TITLE_BAR_W = 322
TITLE_BAR_H = 55
TITLE_BAR_Y = 392
CLOSE_W = 53
CLOSE_H = 56
CLOSE_X = 276
CLOSE_Y = 394
CONTENT_W = 592
CONTENT_H = 764
CONTENT_Y = -34

BTN_W = 240
BTN_H = 64

ROW_W = 640
ROW_H = 104
ICON_SIZE = 64
ICON_X = -268
TEXT_X = -46
TEXT_W = 348
ACTION_W = 168
ACTION_H = 64
ACTION_X = 224

DOT_ROOT = 18
DOT_SIZE = 16
DOT_POS = -9

SPRITE_FILES = {
    "frame": "ui/common/win-bg_win-bg-12.png",
    "title_bar": "ui/common/win-bg_title-bar.png",
    "close": "ui/common/button_btn-close-1.png",
    "btn_primary": "ui/common/button_btn-orange-big-1.png",
    "btn_primary_p": "ui/common/button_btn-orange-big-2.png",
    "btn_secondary": "ui/common/button_btn-blue-big-1.png",
    "btn_secondary_p": "ui/common/button_btn-blue-big-2.png",
    "icon": "ui/common/res-icon_res-bg.png",
    "dot": "ui/common/win-bg_spot-white.png",
}

# Read-only. PR #66 already set these borders. This script must not write them.
PROTECTED = {
    "ui/common/button_btn-blue-big-1.png.meta": (0, 0, 61, 57),
    "ui/common/button_btn-blue.png.meta": (0, 0, 97, 97),
    "ui/common/button_btn-green-big-1.png.meta": (0, 0, 63, 57),
    "ui/common/button_btn-orange-big-1.png.meta": (0, 0, 64, 59),
    "ui/common/win-bg_win-bg-12.png.meta": (20, 20, 15, 18),
}

SHELLS = {
    "CommonPanel": {
        "script": "CommonPanelShell.ts",
        "props": ("frame", "titleBar", "title", "btnClose", "content"),
        "nodes": {
            "frame": "CommonPanel/Frame",
            "titleBar": "CommonPanel/TitleBar",
            "title": "CommonPanel/Title",
            "btnClose": "CommonPanel/BtnClose",
            "content": "CommonPanel/Content",
        },
    },
    "CommonBtnPrimary": {
        "script": "CommonBtnPrimaryShell.ts",
        "props": ("label",),
        "nodes": {"label": "CommonBtnPrimary/Label"},
    },
    "CommonBtnSecondary": {
        "script": "CommonBtnSecondaryShell.ts",
        "props": ("label",),
        "nodes": {"label": "CommonBtnSecondary/Label"},
    },
    "CommonListRow": {
        "script": "CommonListRowShell.ts",
        "props": ("icon", "title", "subtitle", "action"),
        "nodes": {
            "icon": "CommonListRow/Icon",
            "title": "CommonListRow/Title",
            "subtitle": "CommonListRow/Subtitle",
            "action": "CommonListRow/Action",
        },
    },
    "CommonRedDot": {
        "script": "CommonRedDotShell.ts",
        "props": ("dot",),
        "nodes": {"dot": "CommonRedDot/Dot"},
    },
}

BASE64_KEYS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
BASE64_VALUES = {ord(ch): i for i, ch in enumerate(BASE64_KEYS)}
HEX_CHARS = "0123456789abcdef"


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


def compress_uuid(value, reserved=5):
    """compressUuid. Default reserved head is 5: the 23-char packer class id.

    reserved 2 is compressUuid(uuid, true), 22 characters. Prefab __type__
    must not use that form. Creator 3.8.8 _RF.push uses reserved head 5.
    """
    if reserved == 5:
        compressed = class_id(value)
    elif reserved == 2:
        compressed = legacy_min_id(value)
    else:
        raise SystemExit("reserved head must be 5 (class id) or 2 (legacy)")
    if decode_uuid(compressed) != value.lower():
        raise SystemExit("uuid compress did not round-trip: " + value)
    return compressed


def decode_uuid(compressed):
    if len(compressed) == 23:
        reserved = 5
    elif len(compressed) == 22:
        reserved = 2
    else:
        raise SystemExit("compressed uuid is not 22 or 23 chars")
    hex_chars = list(compressed[:reserved])
    for i in range(reserved, len(compressed), 2):
        lhs = BASE64_VALUES[ord(compressed[i])]
        rhs = BASE64_VALUES[ord(compressed[i + 1])]
        hex_chars.append(HEX_CHARS[lhs >> 2])
        hex_chars.append(HEX_CHARS[((lhs & 3) << 2) | (rhs >> 4)])
        hex_chars.append(HEX_CHARS[rhs & 0xF])
    raw = "".join(hex_chars)
    return "%s-%s-%s-%s-%s" % (raw[0:8], raw[8:12], raw[12:16], raw[16:20], raw[20:32])


def file_sha(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        digest.update(handle.read())
    return digest.hexdigest()


def snapshot_protected():
    hashes = {}
    for rel, borders in PROTECTED.items():
        path = os.path.join(RES, rel)
        with open(path, encoding="utf-8") as handle:
            data = json.load(handle)
        sub = data.get("subMetas", {}).get("f9941", {}).get("userData", {})
        got = (
            sub.get("borderTop"),
            sub.get("borderBottom"),
            sub.get("borderLeft"),
            sub.get("borderRight"),
        )
        if got != borders:
            raise SystemExit("%s borders %s != protected %s" % (rel, got, borders))
        hashes[path] = file_sha(path)
    return hashes


def assert_protected_unchanged(before):
    for path, digest in before.items():
        if file_sha(path) != digest:
            raise SystemExit("protected meta was rewritten: " + path)


def load_sprite(rel):
    if "lbl" in rel.lower():
        raise SystemExit("refusing Japanese lbl bitmap: " + rel)
    meta_path = os.path.join(RES, rel + ".meta")
    with open(meta_path, encoding="utf-8") as handle:
        data = json.load(handle)
    sub = data.get("subMetas", {}).get("f9941")
    if not sub or sub.get("importer") != "sprite-frame":
        raise SystemExit("missing sprite-frame f9941 in " + meta_path)
    value = sub.get("uuid") or ""
    if not value.endswith("@f9941"):
        raise SystemExit("spriteFrame uuid is not @f9941: " + meta_path)
    user = sub.get("userData") or {}
    borders = (
        user.get("borderTop", 0),
        user.get("borderBottom", 0),
        user.get("borderLeft", 0),
        user.get("borderRight", 0),
    )
    trim = (user.get("width"), user.get("height"))
    return {"uuid": value, "borders": borders, "trim": trim, "rel": rel}


def load_font_uuid():
    with open(FONT_META, encoding="utf-8") as handle:
        data = json.load(handle)
    value = data.get("uuid") or ""
    if data.get("importer") != "ttf-font" or len(value) < 32:
        raise SystemExit("font meta missing uuid: " + FONT_META)
    return value


def load_shell(prefab_name):
    spec = SHELLS[prefab_name]
    ts_path = os.path.join(SCRIPT_DIR, spec["script"])
    meta_path = ts_path + ".meta"
    with open(ts_path, encoding="utf-8") as handle:
        text = handle.read()
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("//") or stripped.startswith("*") or stripped.startswith("/*"):
            continue
        for banned in ("USE_", "Boot", "prefabLoad", "protocol", "WireSession"):
            if banned in stripped:
                raise SystemExit("%s shell references %s" % (spec["script"], banned))
    for prop in spec["props"]:
        needle = prop + ": Node | null = null;"
        if needle not in text:
            raise SystemExit("%s missing property %s" % (spec["script"], prop))
    with open(meta_path, encoding="utf-8") as handle:
        meta = json.load(handle)
    value = meta.get("uuid") or ""
    if meta.get("importer") != "typescript" or len(value) < 32:
        raise SystemExit("shell meta missing uuid: " + meta_path)
    # Default reserved head 5. Same string as _RF.push / compressUuid(uuid, false).
    compressed = compress_uuid(value)
    legacy = compress_uuid(value, reserved=2)
    if len(compressed) != 23 or compressed == legacy or len(legacy) != 22:
        raise SystemExit("shell class id drifted: " + compressed)
    return {
        "type": compressed,
        "legacy": legacy,
        "uuid": value,
        "props": spec["props"],
        "nodes": spec["nodes"],
    }


SF = {key: load_sprite(rel) for key, rel in SPRITE_FILES.items()}
FONT = load_font_uuid()

WHITE = color(255, 255, 255, 255)
TITLE_COLOR = color(255, 228, 170, 255)
ROW_TITLE = color(92, 58, 32, 255)
ROW_SUB = color(128, 102, 74, 255)
RED = color(214, 40, 40, 255)


class Builder(object):
    def __init__(self, prefab_name):
        self.prefab_name = prefab_name
        self.objs = []
        self.path_of = {}
        self.add({
            "__type__": "cc.Prefab",
            "_name": prefab_name,
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

    def make_node(self, name, parent_id, x, y, w, h, active=True, ax=0.5, ay=0.5):
        if parent_id is None:
            path = name
        else:
            path = self.path_of[parent_id] + "/" + name
        if path in self.path_of.values():
            raise SystemExit("duplicate node path " + path)
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
            "_lscale": vec3(1, 1, 1),
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

    def append_comp(self, node_id, comp_obj, seed):
        cpi = self.add({"__type__": "cc.CompPrefabInfo", "fileId": fid(seed)})
        comp_obj["__prefab"] = ref(cpi)
        comp_obj["node"] = ref(node_id)
        cid = self.add(comp_obj)
        self.objs[node_id]["_components"].append(ref(cid))
        return cid

    def add_sprite(self, node_id, sprite, typ, col=None):
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
            "_color": col or WHITE,
            "_spriteFrame": uuid_ref(sprite["uuid"]),
            "_type": typ,
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

    def add_label(self, node_id, text, font_size, col, h_align=1, outline=False):
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
            "_horizontalAlign": h_align,
            "_verticalAlign": 1,
            "_actualFontSize": font_size,
            "_fontSize": font_size,
            "_fontFamily": "Arial",
            "_lineHeight": font_size + 8,
            "_overflow": 1,
            "_enableWrapText": False,
            "_font": uuid_ref(FONT),
            "_isSystemFontUsed": False,
            "_spacingX": 0,
            "_isItalic": False,
            "_isBold": False,
            "_isUnderline": False,
            "_underlineHeight": 2,
            "_cacheMode": 0,
            "_enableOutline": outline,
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

    def add_shell(self, node_id, shell):
        comp = {
            "__type__": shell["type"],
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": ref(node_id),
            "_enabled": True,
            "__prefab": None,
            "_id": "",
        }
        for prop, path in shell["nodes"].items():
            comp[prop] = ref(self.id_of(path))
        return self.append_comp(node_id, comp, self.path_of[node_id] + ":Shell")

    def make_label_node(self, name, parent_id, x, y, w, h, text, font_size, col, h_align=1, outline=False):
        nid = self.make_node(name, parent_id, x, y, w, h)
        self.add_label(nid, text, font_size, col, h_align=h_align, outline=outline)
        return nid

    def make_sprite_node(self, name, parent_id, x, y, w, h, sprite, typ, col=None):
        nid = self.make_node(name, parent_id, x, y, w, h)
        self.add_sprite(nid, sprite, typ, col=col)
        return nid

    def id_of(self, path):
        for nid, node_path in self.path_of.items():
            if node_path == path:
                return nid
        raise SystemExit("missing node " + path)

    def node(self, path):
        return self.objs[self.id_of(path)]

    def comp(self, path, type_name):
        node = self.node(path)
        for cref in node["_components"]:
            comp = self.objs[cref["__id__"]]
            if comp.get("__type__") == type_name:
                return comp
        raise SystemExit("missing %s on %s" % (type_name, path))

    def transform(self, path):
        uit = self.objs[self.node(path)["_components"][0]["__id__"]]
        if uit.get("__type__") != "cc.UITransform":
            raise SystemExit("first component is not UITransform on " + path)
        return uit

    def expect(self, path, x, y, w, h, ax=0.5, ay=0.5):
        node = self.node(path)
        pos = node["_lpos"]
        if pos["x"] != x or pos["y"] != y:
            raise SystemExit("%s position %s,%s != %s,%s" % (path, pos["x"], pos["y"], x, y))
        uit = self.transform(path)
        box = uit["_contentSize"]
        if box["width"] != w or box["height"] != h:
            raise SystemExit("%s size %s" % (path, box))
        anchor = uit["_anchorPoint"]
        if anchor["x"] != ax or anchor["y"] != ay:
            raise SystemExit("%s anchor %s" % (path, anchor))

    def expect_sprite(self, path, sprite, typ, tint):
        comp = self.comp(path, "cc.Sprite")
        if comp["_spriteFrame"]["__uuid__"] != sprite["uuid"]:
            raise SystemExit("%s sprite drifted" % path)
        if comp["_type"] != typ:
            raise SystemExit("%s sprite type %s" % (path, comp["_type"]))
        got = comp["_color"]
        if (got["r"], got["g"], got["b"], got["a"]) != (tint["r"], tint["g"], tint["b"], tint["a"]):
            raise SystemExit("%s tint %s" % (path, got))
        sliced = any(edge != 0 for edge in sprite["borders"])
        if typ == SLICED and not sliced:
            raise SystemExit("%s is sliced but %s has zero borders" % (path, sprite["rel"]))
        if typ == SIMPLE and sliced:
            raise SystemExit("%s is simple but %s has borders" % (path, sprite["rel"]))

    def expect_label(self, path, text, font_size, h_align):
        comp = self.comp(path, "cc.Label")
        if comp["_string"] != text or comp["_fontSize"] != font_size or comp["_horizontalAlign"] != h_align:
            raise SystemExit("%s label drifted" % path)
        if comp["_font"]["__uuid__"] != FONT:
            raise SystemExit("%s font drifted" % path)

    def expect_button(self, path, normal, pressed):
        comp = self.comp(path, "cc.Button")
        if comp.get("clickEvents") != [] or comp.get("_transition") != TRANSITION_SCALE:
            raise SystemExit("%s is not a scale button with empty clickEvents" % path)
        if comp["_normalSprite"]["__uuid__"] != normal["uuid"]:
            raise SystemExit("%s normal sprite drifted" % path)
        if comp["_pressedSprite"]["__uuid__"] != pressed["uuid"]:
            raise SystemExit("%s pressed sprite drifted" % path)
        if comp["_zoomScale"] != 1.05:
            raise SystemExit("%s zoom drifted" % path)

    def expect_shell(self, path, shell):
        found = None
        for cref in self.node(path)["_components"]:
            comp = self.objs[cref["__id__"]]
            if comp.get("__type__") == shell["type"]:
                found = comp
        if found is None:
            raise SystemExit("missing shell on " + path)
        for prop, node_path in shell["nodes"].items():
            got = found.get(prop)
            if not got or got.get("__id__") != self.id_of(node_path):
                raise SystemExit("%s shell prop %s is not %s" % (path, prop, node_path))


def sprite_type(sprite):
    return SLICED if any(edge != 0 for edge in sprite["borders"]) else SIMPLE


def build_panel(shell):
    b = Builder("CommonPanel")
    root = b.make_node("CommonPanel", None, 0, 0, PANEL_W, PANEL_H)
    if root != 1:
        raise SystemExit("root id drifted")
    b.add_block(root)
    b.make_sprite_node("Frame", root, 0, 0, PANEL_W, PANEL_H, SF["frame"], sprite_type(SF["frame"]))
    b.make_node("Content", root, 0, CONTENT_Y, CONTENT_W, CONTENT_H)
    b.make_sprite_node(
        "TitleBar", root, 0, TITLE_BAR_Y, TITLE_BAR_W, TITLE_BAR_H,
        SF["title_bar"], sprite_type(SF["title_bar"]),
    )
    b.make_label_node(
        "Title", root, 0, TITLE_BAR_Y, 260, 40, "标题", 28, TITLE_COLOR, outline=True,
    )
    close = b.make_node("BtnClose", root, CLOSE_X, CLOSE_Y, CLOSE_W, CLOSE_H)
    b.add_sprite(close, SF["close"], sprite_type(SF["close"]))
    b.add_button(close, SF["close"], SF["close"])
    b.add_shell(root, shell)
    check_panel(b, shell)
    return b


def build_button(name, shell, normal_key, pressed_key, text):
    b = Builder(name)
    root = b.make_node(name, None, 0, 0, BTN_W, BTN_H)
    if root != 1:
        raise SystemExit("root id drifted")
    b.add_sprite(root, SF[normal_key], sprite_type(SF[normal_key]))
    b.add_button(root, SF[normal_key], SF[pressed_key])
    b.make_label_node("Label", root, 0, 0, BTN_W - 24, BTN_H - 12, text, 24, WHITE, outline=True)
    b.add_shell(root, shell)
    check_button(b, shell, normal_key, pressed_key, text)
    return b


def build_row(shell):
    b = Builder("CommonListRow")
    root = b.make_node("CommonListRow", None, 0, 0, ROW_W, ROW_H)
    if root != 1:
        raise SystemExit("root id drifted")
    b.make_sprite_node("Bg", root, 0, 0, ROW_W, ROW_H, SF["frame"], sprite_type(SF["frame"]))
    b.make_sprite_node("Icon", root, ICON_X, 0, ICON_SIZE, ICON_SIZE, SF["icon"], sprite_type(SF["icon"]))
    b.make_label_node(
        "Title", root, TEXT_X, 16, TEXT_W, 36, "标题", 22, ROW_TITLE, h_align=0,
    )
    b.make_label_node(
        "Subtitle", root, TEXT_X, -18, TEXT_W, 28, "副标题", 18, ROW_SUB, h_align=0,
    )
    b.make_node("Action", root, ACTION_X, 0, ACTION_W, ACTION_H)
    b.add_shell(root, shell)
    check_row(b, shell)
    return b


def build_dot(shell):
    b = Builder("CommonRedDot")
    root = b.make_node("CommonRedDot", None, 0, 0, DOT_ROOT, DOT_ROOT, ax=1, ay=1)
    if root != 1:
        raise SystemExit("root id drifted")
    dot = b.make_node("Dot", root, DOT_POS, DOT_POS, DOT_SIZE, DOT_SIZE)
    b.add_sprite(dot, SF["dot"], sprite_type(SF["dot"]), col=RED)
    b.add_shell(root, shell)
    check_dot(b, shell)
    return b


def check_panel(b, shell):
    root = "CommonPanel"
    b.expect(root, 0, 0, PANEL_W, PANEL_H)
    if b.comp(root, "cc.BlockInputEvents") is None:
        raise SystemExit("panel missing BlockInputEvents")
    b.expect(root + "/Frame", 0, 0, PANEL_W, PANEL_H)
    b.expect_sprite(root + "/Frame", SF["frame"], SLICED, WHITE)
    b.expect(root + "/Content", 0, CONTENT_Y, CONTENT_W, CONTENT_H)
    if len(b.node(root + "/Content")["_components"]) != 1:
        raise SystemExit("Content must stay an empty anchor")
    if b.node(root + "/Content")["_children"]:
        raise SystemExit("Content must stay empty")
    b.expect(root + "/TitleBar", 0, TITLE_BAR_Y, TITLE_BAR_W, TITLE_BAR_H)
    b.expect_sprite(root + "/TitleBar", SF["title_bar"], SIMPLE, WHITE)
    if (TITLE_BAR_W, TITLE_BAR_H) != SF["title_bar"]["trim"]:
        raise SystemExit("title bar is stretched past its trim")
    b.expect(root + "/Title", 0, TITLE_BAR_Y, 260, 40)
    b.expect_label(root + "/Title", "标题", 28, 1)
    b.expect(root + "/BtnClose", CLOSE_X, CLOSE_Y, CLOSE_W, CLOSE_H)
    b.expect_sprite(root + "/BtnClose", SF["close"], SIMPLE, WHITE)
    if (CLOSE_W, CLOSE_H) != SF["close"]["trim"]:
        raise SystemExit("close button is stretched past its trim")
    b.expect_button(root + "/BtnClose", SF["close"], SF["close"])
    if b.node(root + "/BtnClose")["_children"]:
        raise SystemExit("close button should not carry a hidden label")
    names = [b.node(path)["_name"] for path in (
        root + "/Frame", root + "/Content", root + "/TitleBar", root + "/Title", root + "/BtnClose",
    )]
    child_names = [b.objs[c["__id__"]]["_name"] for c in b.node(root)["_children"]]
    if child_names != names:
        raise SystemExit("panel child order drifted: %s" % child_names)
    b.expect_shell(root, shell)
    check_common(b)


def check_button(b, shell, normal_key, pressed_key, text):
    root = b.prefab_name
    b.expect(root, 0, 0, BTN_W, BTN_H)
    b.expect_sprite(root, SF[normal_key], SLICED, WHITE)
    b.expect_button(root, SF[normal_key], SF[pressed_key])
    b.expect(root + "/Label", 0, 0, BTN_W - 24, BTN_H - 12)
    b.expect_label(root + "/Label", text, 24, 1)
    if SF[normal_key]["borders"][0] != 0 or SF[normal_key]["borders"][1] != 0:
        raise SystemExit(normal_key + " vertical border is set; height 64 needs a revisit")
    if SF[normal_key]["borders"][2] <= 0 or SF[normal_key]["borders"][3] <= 0:
        raise SystemExit(normal_key + " is missing horizontal nine-slice")
    b.expect_shell(root, shell)
    check_common(b)


def check_row(b, shell):
    root = "CommonListRow"
    b.expect(root, 0, 0, ROW_W, ROW_H)
    b.expect(root + "/Bg", 0, 0, ROW_W, ROW_H)
    b.expect_sprite(root + "/Bg", SF["frame"], SLICED, WHITE)
    b.expect(root + "/Icon", ICON_X, 0, ICON_SIZE, ICON_SIZE)
    b.expect_sprite(root + "/Icon", SF["icon"], SIMPLE, WHITE)
    b.expect(root + "/Title", TEXT_X, 16, TEXT_W, 36)
    b.expect_label(root + "/Title", "标题", 22, 0)
    b.expect(root + "/Subtitle", TEXT_X, -18, TEXT_W, 28)
    b.expect_label(root + "/Subtitle", "副标题", 18, 0)
    b.expect(root + "/Action", ACTION_X, 0, ACTION_W, ACTION_H)
    if len(b.node(root + "/Action")["_components"]) != 1 or b.node(root + "/Action")["_children"]:
        raise SystemExit("Action must stay an empty slot")
    child_names = [b.objs[c["__id__"]]["_name"] for c in b.node(root)["_children"]]
    if child_names != ["Bg", "Icon", "Title", "Subtitle", "Action"]:
        raise SystemExit("row child order drifted: %s" % child_names)
    b.expect_shell(root, shell)
    check_common(b)


def check_dot(b, shell):
    root = "CommonRedDot"
    b.expect(root, 0, 0, DOT_ROOT, DOT_ROOT, ax=1, ay=1)
    if len(b.node(root)["_components"]) != 2:
        raise SystemExit("red-dot root should only be the mount plus the shell")
    b.expect(root + "/Dot", DOT_POS, DOT_POS, DOT_SIZE, DOT_SIZE)
    b.expect_sprite(root + "/Dot", SF["dot"], SIMPLE, RED)
    if b.node(root)["_children"] != [ref(b.id_of(root + "/Dot"))]:
        raise SystemExit("red dot picked up extra children")
    b.expect_shell(root, shell)
    check_common(b)


def check_common(b):
    file_ids = []
    known_sprites = {sprite["uuid"] for sprite in SF.values()}
    for obj in b.objs:
        if "fileId" in obj:
            file_ids.append(obj["fileId"])
            if len(obj["fileId"]) != 22:
                raise SystemExit("bad fileId " + obj["fileId"])
        if obj.get("__type__") == "cc.Button" and obj.get("clickEvents") != []:
            raise SystemExit("button clickEvents must stay empty")
        if obj.get("__type__") == "cc.Graphics":
            raise SystemExit("prefab must not embed Graphics")
        for key in ("_spriteFrame", "_font", "_normalSprite", "_hoverSprite", "_pressedSprite", "_disabledSprite"):
            val = obj.get(key)
            if isinstance(val, dict) and "__uuid__" in val:
                if key == "_font":
                    if val["__uuid__"] != FONT:
                        raise SystemExit("unknown font " + val["__uuid__"])
                else:
                    if val["__uuid__"] not in known_sprites:
                        raise SystemExit("sprite is not a resources frame: " + val["__uuid__"])
                    if not val["__uuid__"].endswith("@f9941"):
                        raise SystemExit("sprite uuid is not @f9941")
        if obj.get("__type__") == "cc.Node" and obj["_parent"] is not None:
            parent = b.objs[obj["_parent"]["__id__"]]
            child_ids = [c["__id__"] for c in parent["_children"]]
            if b.objs.index(obj) not in child_ids:
                raise SystemExit("parent missing child " + obj["_name"])
    if len(file_ids) != len(set(file_ids)):
        raise SystemExit("duplicate fileId in " + b.prefab_name)
    n = len(b.objs)
    for obj in b.objs:
        walk_refs(obj, n)


def walk_refs(obj, n):
    if isinstance(obj, dict):
        if set(obj.keys()) == {"__id__"}:
            if not isinstance(obj["__id__"], int) or obj["__id__"] < 0 or obj["__id__"] >= n:
                raise SystemExit("dangling __id__")
        for value in obj.values():
            walk_refs(value, n)
    elif isinstance(obj, list):
        for value in obj:
            walk_refs(value, n)


def existing_uuid(meta_path):
    if not os.path.exists(meta_path):
        return None
    with open(meta_path, encoding="utf-8") as handle:
        data = json.load(handle)
    value = data.get("uuid") or ""
    if not isinstance(value, str) or len(value) < 32:
        return None
    return value


def assert_script_types(builder, legacy):
    found = 0
    for obj in builder.objs:
        type_name = obj.get("__type__")
        if not isinstance(type_name, str) or type_name.startswith("cc."):
            continue
        found += 1
        if type_name == legacy or len(type_name) == 22:
            raise SystemExit(
                "%s still uses 22-char script type %s" % (builder.prefab_name, type_name)
            )
        if len(type_name) != 23:
            raise SystemExit(
                "%s script __type__ must be 23 chars, got %s" % (builder.prefab_name, type_name)
            )
    if found != 1:
        raise SystemExit("%s must contain one shell __type__" % builder.prefab_name)


def write_prefab(builder, shell):
    path = os.path.join(OUT_DIR, builder.prefab_name + ".prefab")
    meta_path = path + ".meta"
    assert_script_types(builder, shell["legacy"])
    text = json.dumps(builder.objs, ensure_ascii=False, indent=2) + "\n"
    type_needle = '"__type__": "%s"' % shell["type"]
    legacy_needle = '"__type__": "%s"' % shell["legacy"]
    if text.count(type_needle) != 1 or legacy_needle in text:
        raise SystemExit("refusing to write 22-char script type into " + path)
    for banned in (".png", "resources/", "USE_", "lbl-"):
        if banned in text:
            raise SystemExit("prefab embedded %s" % banned)
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
        "userData": {"syncNodeName": builder.prefab_name},
    }
    with open(meta_path, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(meta, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print("Wrote", path)
    print("UUID", prefab_uuid)
    return prefab_uuid


def write_dir_meta():
    if os.path.exists(DIR_META):
        print("Keep", DIR_META)
        return
    meta = {
        "ver": "1.2.0",
        "importer": "directory",
        "imported": True,
        "uuid": "62bab32a-8280-4cc2-8227-2508cba28469",
        "files": [],
        "subMetas": {},
        "userData": {},
    }
    with open(DIR_META, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(meta, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print("Wrote", DIR_META)


def main():
    before = snapshot_protected()
    os.makedirs(OUT_DIR, exist_ok=True)
    write_dir_meta()
    shells = {name: load_shell(name) for name in SHELLS}
    pages = [
        build_panel(shells["CommonPanel"]),
        build_button("CommonBtnPrimary", shells["CommonBtnPrimary"], "btn_primary", "btn_primary_p", "确定"),
        build_button("CommonBtnSecondary", shells["CommonBtnSecondary"], "btn_secondary", "btn_secondary_p", "取消"),
        build_row(shells["CommonListRow"]),
        build_dot(shells["CommonRedDot"]),
    ]
    for page in pages:
        write_prefab(page, shells[page.prefab_name])
    pngs = [name for name in os.listdir(OUT_DIR) if name.lower().endswith(".png")]
    if pngs:
        raise SystemExit("png landed in prefabs/ui/common: %s" % pngs)
    assert_protected_unchanged(before)
    print("OK")


if __name__ == "__main__":
    main()
