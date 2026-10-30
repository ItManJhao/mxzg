# -*- coding: utf-8 -*-
"""Regenerate CityChrome.prefab and install the city-chrome PNG pack.

Design canvas is 720×1280, origin at the center, matching CityHub and the
previous CityChrome. Source frames are about 640 wide and are stretched to
the canvas the same way the old bottom bar was.

The script:
  - copies ui/city and ui/common PNGs out of the chrome zip when it is present
  - writes Creator 3.8 image metas for new files, and refreshes trim on
    overwritten files without changing their uuid
  - never writes the five #66 nine-slice metas
  - never references a Japanese lbl bitmap
  - binds CityChromeShell property refs only

It does not touch Boot, prefabLoad flags, or protocol scripts.
"""
import base64
import hashlib
import json
import os
import sys
import uuid
import zipfile

from PIL import Image, ImageDraw, ImageFont

from check_citychrome_shell_id import class_id

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RES = os.path.join(ROOT, "client", "assets", "resources")
OUT_DIR = os.path.join(ROOT, "client", "assets", "prefabs", "ui", "city")
PREFAB_PATH = os.path.join(OUT_DIR, "CityChrome.prefab")
FONT_META = os.path.join(RES, "font", "FZCSJW-GB1-0.ttf.meta")
FONT_FILE = os.path.join(RES, "font", "FZCSJW-GB1-0.ttf")
SHELL_TS = os.path.join(ROOT, "client", "assets", "scripts", "ui", "CityChromeShell.ts")
BIND_TS = os.path.join(ROOT, "client", "assets", "scripts", "ui", "CityChrome.ts")
PREVIEW = "/tmp/city-chrome-preview.png"

LAYER_UI = 33554432
SIMPLE = 0
TRANSITION_SCALE = 3

PROTECTED = {
    "ui/common/button_btn-blue-big-1.png.meta": (0, 0, 61, 57),
    "ui/common/button_btn-blue.png.meta": (0, 0, 97, 97),
    "ui/common/button_btn-green-big-1.png.meta": (0, 0, 63, 57),
    "ui/common/button_btn-orange-big-1.png.meta": (0, 0, 64, 59),
    "ui/common/win-bg_win-bg-12.png.meta": (20, 20, 15, 18),
}

ZIP_CANDIDATES = [
    os.path.join(
        os.path.expanduser("~"),
        ".cursor/projects/workspace/uploads/mxzg-city-chrome_c8af.zip",
    ),
    "/home/ubuntu/.cursor/projects/workspace/uploads/mxzg-city-chrome_c8af.zip",
]

SHELL_NODES = {
    "topBar": "CityChrome/TopBar",
    "avatar": "CityChrome/TopBar/Avatar",
    "lblName": "CityChrome/TopBar/LblName",
    "lblLevel": "CityChrome/TopBar/LblLevel",
    "lblSub": "CityChrome/TopBar/LblSub",
    "powerSlot": "CityChrome/TopBar/PowerSlot",
    "currencyGold": "CityChrome/TopBar/CurrencyGold",
    "currencyGem": "CityChrome/TopBar/CurrencyGem",
    "btnAddGold": "CityChrome/TopBar/CurrencyGold/BtnAddGold",
    "btnAddGem": "CityChrome/TopBar/CurrencyGem/BtnAddGem",
    "actGroup": "CityChrome/ActGroup",
    "btnActExpand": "CityChrome/ActGroup/BtnActExpand",
    "monthCard": "CityChrome/MonthCard",
    "utilityRow": "CityChrome/UtilityRow",
    "btnReplay": "CityChrome/UtilityRow/BtnReplay",
    "btnFriend": "CityChrome/UtilityRow/BtnFriend",
    "btnMail": "CityChrome/UtilityRow/BtnMail",
    "btnRank": "CityChrome/UtilityRow/BtnRank",
    "btnMore": "CityChrome/UtilityRow/BtnMore",
    "bottomBar": "CityChrome/BottomBar",
    "tabCity": "CityChrome/BottomBar/TabCity",
    "tabHero": "CityChrome/BottomBar/TabHero",
    "tabBag": "CityChrome/BottomBar/TabBag",
    "tabBattle": "CityChrome/BottomBar/TabBattle",
    "tabDungeon": "CityChrome/BottomBar/TabDungeon",
    "tabClan": "CityChrome/BottomBar/TabClan",
    "tabFetter": "CityChrome/BottomBar/TabFetter",
    "btnActivity": "CityChrome/BtnActivity",
    "btnMorePanel": "CityChrome/BtnMorePanel",
}

BIND_PATHS = [
    "TopBar/LblName",
    "TopBar/LblSub",
    "TopBar/CurrencyGold/Value",
    "TopBar/CurrencyGem/Value",
    "BottomBar/Bg",
    "BottomBar/TabCity",
    "BottomBar/TabHero",
    "BottomBar/TabBag",
    "BottomBar/TabBattle",
    "BottomBar/TabDungeon",
    "BottomBar/TabClan",
    "BottomBar/TabFetter",
]

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
    """compressUuid. Default reserved head is 5 (false): the 23-char class id."""
    hex_str = value.replace("-", "").lower()
    if len(hex_str) != 32 or any(ch not in HEX_CHARS for ch in hex_str):
        raise SystemExit("script uuid is not a canonical uuid: " + value)
    if reserved != 5:
        raise SystemExit("script __type__ reserved head must stay 5, got %s" % reserved)
    chars = [hex_str[:reserved]]
    i = reserved
    while i < 32:
        h1 = int(hex_str[i], 16)
        h2 = int(hex_str[i + 1], 16)
        h3 = int(hex_str[i + 2], 16)
        chars.append(BASE64_KEYS[(h1 << 2) | (h2 >> 2)])
        chars.append(BASE64_KEYS[((h2 & 3) << 4) | h3])
        i += 3
    compressed = "".join(chars)
    if len(compressed) != 23 or decode_uuid(compressed) != value.lower():
        raise SystemExit("uuid compress did not round-trip: " + value)
    return compressed


def decode_uuid(compressed):
    if len(compressed) != 23:
        raise SystemExit("compressed uuid is not 23 chars")
    hex_chars = list(compressed[:5])
    for i in range(5, 23, 2):
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


def trim_box(png_path):
    image = Image.open(png_path).convert("RGBA")
    raw_w, raw_h = image.size
    alpha = image.getchannel("A")
    mask = alpha.point(lambda value: 255 if value > 1 else 0)
    bbox = mask.getbbox()
    if not bbox:
        return raw_w, raw_h, 0, 0, raw_w, raw_h
    left, top, right, bottom = bbox
    return raw_w, raw_h, left, top, right - left, bottom - top


def sprite_user_data(raw_w, raw_h, trim_x, trim_y, trim_w, trim_h, borders, image_uuid):
    offset_x = trim_x + trim_w / 2.0 - raw_w / 2.0
    offset_y = raw_h / 2.0 - (trim_y + trim_h / 2.0)
    half_w = trim_w / 2.0
    half_h = trim_h / 2.0
    raw_position = [
        -half_w, -half_h, 0,
        half_w, -half_h, 0,
        -half_w, half_h, 0,
        half_w, half_h, 0,
    ]
    bl = (trim_x, trim_y + trim_h)
    br = (trim_x + trim_w, trim_y + trim_h)
    tl = (trim_x, trim_y)
    tr = (trim_x + trim_w, trim_y)
    uv = [bl[0], bl[1], br[0], br[1], tl[0], tl[1], tr[0], tr[1]]
    nuv = []
    for px, py in (tl, tr, bl, br):
        nuv.append(px / float(raw_w))
        nuv.append(py / float(raw_h))
    return {
        "trimThreshold": 1,
        "rotated": False,
        "offsetX": offset_x,
        "offsetY": offset_y,
        "trimX": trim_x,
        "trimY": trim_y,
        "width": trim_w,
        "height": trim_h,
        "rawWidth": raw_w,
        "rawHeight": raw_h,
        "borderTop": borders[0],
        "borderBottom": borders[1],
        "borderLeft": borders[2],
        "borderRight": borders[3],
        "packable": True,
        "pixelsToUnit": 100,
        "pivotX": 0.5,
        "pivotY": 0.5,
        "meshType": 0,
        "vertices": {
            "rawPosition": raw_position,
            "indexes": [0, 1, 2, 2, 1, 3],
            "uv": uv,
            "nuv": nuv,
            "minPos": [-half_w, -half_h, 0],
            "maxPos": [half_w, half_h, 0],
        },
        "isUuid": True,
        "imageUuidOrDatabaseUri": image_uuid + "@6c48a",
        "atlasUuid": "",
        "trimType": "auto",
    }


def fresh_meta(png_path, image_uuid):
    name = os.path.splitext(os.path.basename(png_path))[0]
    raw_w, raw_h, trim_x, trim_y, trim_w, trim_h = trim_box(png_path)
    return {
        "ver": "1.0.27",
        "importer": "image",
        "imported": True,
        "uuid": image_uuid,
        "files": [".json", ".png"],
        "subMetas": {
            "6c48a": {
                "importer": "texture",
                "uuid": image_uuid + "@6c48a",
                "displayName": name,
                "id": "6c48a",
                "name": "texture",
                "userData": {
                    "wrapModeS": "clamp-to-edge",
                    "wrapModeT": "clamp-to-edge",
                    "imageUuidOrDatabaseUri": image_uuid,
                    "isUuid": True,
                    "visible": False,
                    "minfilter": "linear",
                    "magfilter": "linear",
                    "mipfilter": "none",
                    "anisotropy": 0,
                },
                "ver": "1.0.22",
                "imported": True,
                "files": [".json"],
                "subMetas": {},
            },
            "f9941": {
                "importer": "sprite-frame",
                "uuid": image_uuid + "@f9941",
                "displayName": name,
                "id": "f9941",
                "name": "spriteFrame",
                "userData": sprite_user_data(
                    raw_w, raw_h, trim_x, trim_y, trim_w, trim_h, (0, 0, 0, 0), image_uuid
                ),
                "ver": "1.0.12",
                "imported": True,
                "files": [".json"],
                "subMetas": {},
            },
        },
        "userData": {
            "type": "sprite-frame",
            "fixAlphaTransparencyArtifacts": False,
            "hasAlpha": True,
            "redirect": image_uuid + "@6c48a",
        },
    }


def refresh_meta(png_path):
    meta_path = png_path + ".meta"
    raw_w, raw_h, trim_x, trim_y, trim_w, trim_h = trim_box(png_path)
    if os.path.exists(meta_path):
        with open(meta_path, encoding="utf-8") as handle:
            data = json.load(handle)
        image_uuid = data.get("uuid") or ""
        sub = data.get("subMetas", {}).get("f9941")
        if not image_uuid or not sub or not str(sub.get("uuid", "")).endswith("@f9941"):
            raise SystemExit("existing meta is not a sprite-frame: " + meta_path)
        user = sub.get("userData") or {}
        borders = (
            user.get("borderTop", 0),
            user.get("borderBottom", 0),
            user.get("borderLeft", 0),
            user.get("borderRight", 0),
        )
        fresh = sprite_user_data(raw_w, raw_h, trim_x, trim_y, trim_w, trim_h, borders, image_uuid)
        same_trim = True
        for key in (
            "trimX", "trimY", "width", "height", "rawWidth", "rawHeight",
            "offsetX", "offsetY", "borderTop", "borderBottom", "borderLeft", "borderRight",
        ):
            if float(user.get(key, 0)) != float(fresh[key]):
                same_trim = False
                break
        if same_trim:
            return "keep"
        user.update(fresh)
        sub["userData"] = user
        if "userData" not in data:
            data["userData"] = {}
        data["userData"]["hasAlpha"] = True
        text = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
        with open(meta_path, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(text)
        return "refresh"
    image_uuid = str(uuid.uuid4())
    text = json.dumps(fresh_meta(png_path, image_uuid), ensure_ascii=False, indent=2) + "\n"
    with open(meta_path, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)
    return "create"


def find_zip():
    for candidate in ZIP_CANDIDATES:
        if os.path.isfile(candidate):
            return candidate
    return None


def install_zip(zip_path, protected_paths):
    protected_png = {rel[:-5] if rel.endswith(".meta") else rel for rel in PROTECTED}
    # PROTECTED keys are *.png.meta. The png path is the key without .meta.
    protected_png = {rel[:-5] for rel in PROTECTED}
    with zipfile.ZipFile(zip_path) as archive:
        names = []
        for info in archive.infolist():
            name = info.filename.replace("\\", "/")
            if name.endswith("/"):
                continue
            if not name.lower().endswith(".png"):
                continue
            if "lbl" in os.path.basename(name).lower():
                raise SystemExit("zip contains a lbl bitmap: " + name)
            if name in protected_png:
                raise SystemExit("zip tried to overwrite a protected nine-slice: " + name)
            names.append((info, name))
        written = []
        for info, name in names:
            dest = os.path.join(RES, name)
            parent = os.path.dirname(dest)
            if not os.path.isdir(parent):
                raise SystemExit("missing resources folder for " + name)
            blob = archive.read(info)
            previous = None
            if os.path.isfile(dest):
                with open(dest, "rb") as handle:
                    previous = handle.read()
            same = previous == blob
            if not same:
                with open(dest, "wb") as handle:
                    handle.write(blob)
            if dest + ".meta" in protected_paths:
                raise SystemExit("refusing to touch protected meta for " + name)
            if not same or not os.path.isfile(dest + ".meta"):
                refresh_meta(dest)
                written.append(name)
    return written


def load_sprite(rel):
    base = os.path.basename(rel).lower()
    if "lbl" in base:
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
    return {"uuid": value, "borders": borders, "rel": rel}


def load_font_uuid():
    with open(FONT_META, encoding="utf-8") as handle:
        data = json.load(handle)
    value = data.get("uuid") or ""
    if data.get("importer") != "ttf-font" or len(value) < 32:
        raise SystemExit("font meta missing uuid: " + FONT_META)
    return value


def load_shell():
    with open(SHELL_TS, encoding="utf-8") as handle:
        text = handle.read()
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("//") or stripped.startswith("*") or stripped.startswith("/*"):
            continue
        for banned in ("USE_", "Boot", "prefabLoad", "protocol", "WireSession"):
            if banned in stripped:
                raise SystemExit("shell references %s" % banned)
    for prop in SHELL_NODES:
        needle = prop + ": Node | null = null;"
        if needle not in text:
            raise SystemExit("shell missing property %s" % prop)
    meta_path = SHELL_TS + ".meta"
    with open(meta_path, encoding="utf-8") as handle:
        meta = json.load(handle)
    value = meta.get("uuid") or ""
    if meta.get("importer") != "typescript" or len(value) < 32:
        raise SystemExit("shell meta missing uuid")
    compressed = compress_uuid(value)
    # Same string Creator 3.8.8 passes to _RF.push: compressUuid(uuid, false).
    if compressed != class_id(value) or len(compressed) != 23:
        raise SystemExit("shell class id drifted: " + compressed)
    return {"type": compressed, "uuid": value}


WHITE = color(255, 255, 255, 255)
NAME_COLOR = color(255, 246, 224, 255)
SUB_COLOR = color(186, 210, 230, 255)
LEVEL_COLOR = color(255, 236, 170, 255)
GOLD_COLOR = color(255, 224, 140, 255)
GEM_COLOR = color(186, 236, 255, 255)
POWER_COLOR = color(255, 244, 220, 255)
TAB_COLOR = color(255, 246, 226, 255)


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

    def make_node(self, name, parent_id, x, y, w, h, active=True):
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
            "_anchorPoint": vec2(0.5, 0.5),
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

    def add_sprite(self, node_id, sprite):
        # 有边距的图也按 SIMPLE 画。不改 .meta，也不把九宫格拉进 Prefab。
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
            "_type": SIMPLE,
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

    def add_label(self, node_id, text, font_size, col, h_align=1, outline=False, overflow=1):
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
            "_lineHeight": font_size + 6,
            "_overflow": overflow,
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
            "_outlineColor": color(36, 22, 16, 220),
            "_outlineWidth": 2,
            "_enableShadow": False,
            "_shadowColor": color(0, 0, 0, 255),
            "_shadowOffset": vec2(2, -2),
            "_shadowBlur": 2,
            "_id": "",
        }
        return self.append_comp(node_id, lab, self.path_of[node_id] + ":Label")

    def add_button(self, node_id, sprite):
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
            "_normalSprite": uuid_ref(sprite["uuid"]),
            "_hoverSprite": uuid_ref(sprite["uuid"]),
            "_pressedSprite": uuid_ref(sprite["uuid"]),
            "_disabledSprite": uuid_ref(sprite["uuid"]),
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
        for prop, path in SHELL_NODES.items():
            comp[prop] = ref(self.id_of(path))
        return self.append_comp(node_id, comp, self.path_of[node_id] + ":Shell")

    def sprite_node(self, name, parent_id, x, y, w, h, sprite, button=False, active=True):
        nid = self.make_node(name, parent_id, x, y, w, h, active=active)
        self.add_sprite(nid, sprite)
        if button:
            self.add_button(nid, sprite)
        return nid

    def label_node(self, name, parent_id, x, y, w, h, text, font_size, col, outline=False, overflow=1):
        nid = self.make_node(name, parent_id, x, y, w, h)
        self.add_label(nid, text, font_size, col, outline=outline, overflow=overflow)
        return nid

    def id_of(self, path):
        for nid, node_path in self.path_of.items():
            if node_path == path:
                return nid
        raise SystemExit("missing node " + path)

    def node(self, path):
        return self.objs[self.id_of(path)]

    def screen(self, path):
        x = 0
        y = 0
        parts = path.split("/")
        acc = parts[0]
        node = self.node(acc)
        x += node["_lpos"]["x"]
        y += node["_lpos"]["y"]
        for part in parts[1:]:
            acc = acc + "/" + part
            node = self.node(acc)
            x += node["_lpos"]["x"]
            y += node["_lpos"]["y"]
        return x, y

    def transform(self, path):
        uit = self.objs[self.node(path)["_components"][0]["__id__"]]
        if uit.get("__type__") != "cc.UITransform":
            raise SystemExit("first component is not UITransform on " + path)
        return uit


def build(shell, sprites):
    b = Builder("CityChrome")
    root = b.make_node("CityChrome", None, 0, 0, 720, 1280)
    if root != 1:
        raise SystemExit("root id drifted")

    # Left monthly-card strip is only a hook. No art yet.
    b.make_node("MonthCard", root, -330, 300, 44, 168)

    act = b.make_node("ActGroup", root, 210, 424, 280, 116)
    row1 = [
        ("ActRecommend", "recommend", -112, 26),
        ("ActSevenDay", "seven", -56, 26),
        ("ActHeroArrive", "arrive", 0, 26),
        ("ActPrivilege", "privilege", 56, 26),
        ("ActWelfare", "welfare", 112, 26),
    ]
    for name, key, x, y in row1:
        b.sprite_node(name, act, x, y, 50, 50, sprites[key], button=True)
    b.sprite_node("BtnActExpand", act, 0, -30, 36, 28, sprites["down"], button=True)
    b.sprite_node("ActLimitGift", act, 56, -30, 50, 50, sprites["limit_gift"], button=True)
    b.sprite_node("ActLimitTime", act, 112, -30, 50, 50, sprites["limit_time"], button=True)

    utility = b.make_node("UtilityRow", root, 208, -468, 300, 52)
    utils = [
        ("BtnReplay", "replay", -112),
        ("BtnFriend", "friend", -56),
        ("BtnMail", "mail", 0),
        ("BtnRank", "rank", 56),
        ("BtnMore", "more", 112),
    ]
    for name, key, x in utils:
        b.sprite_node(name, utility, x, 0, 48, 48, sprites[key], button=True)

    # Inactive hooks. Same anchors as cityHubEntries CITY_SCREEN_ACTIVITY / MORE.
    # Page code still draws the red/blue rects. These stay off until that bind.
    for name, x in (("BtnActivity", -160), ("BtnMorePanel", 160)):
        nid = b.make_node(name, root, x, -470, 168, 48, active=False)
        b.add_button(nid, sprites["add"])

    bottom = b.make_node("BottomBar", root, 0, -575, 720, 140)
    b.add_block(bottom)
    b.sprite_node("Bg", bottom, 0, -0.5, 720, 129, sprites["bottom"])
    # 国服七格。战斗在正中，略大略高。坐标相对 BottomBar，和 cityBarSlot 的画面坐标一致。
    tabs = [
        ("TabCity", "city", "主城", -300, 13, 78, "plate"),
        ("TabHero", "hero", "英雄", -200, 13, 78, "plate"),
        ("TabBag", "bag", "背包", -100, 13, 78, "plate"),
        ("TabBattle", "battle", "战斗", 0, 27, 96, "plate_hot"),
        ("TabDungeon", "dungeon", "副本", 100, 13, 78, "plate"),
        ("TabClan", "clan", "公会", 200, 13, 78, "plate"),
        ("TabFetter", "fetter", "VIP", 300, 13, 78, "plate"),
    ]
    icon_box = {
        "city": (58, 56),
        "hero": (56, 56),
        "bag": (56, 56),
        "battle": (74, 70),
        "dungeon": (56, 56),
        "clan": (56, 56),
        "fetter": (56, 56),
    }
    for name, key, text, x, y, plate, plate_key in tabs:
        tab = b.make_node(name, bottom, x, y, plate, plate)
        b.add_sprite(tab, sprites[plate_key])
        b.add_button(tab, sprites[plate_key])
        iw, ih = icon_box[key]
        b.sprite_node("Icon", tab, 0, 2, iw, ih, sprites[key])
        label_y = -52 if plate == 78 else -62
        b.label_node("Label", tab, 0, label_y, 84, 22, text, 15, TAB_COLOR, outline=True)
        lock = b.sprite_node("Lock", tab, 28, 28, 30, 30, sprites["lock"], active=False)
        if b.node(b.path_of[lock])["_active"]:
            raise SystemExit("lock should start inactive")

    top = b.make_node("TopBar", root, 0, 568, 720, 160)
    b.add_block(top)
    b.sprite_node("Bg", top, 0, -1, 720, 146, sprites["top"])
    b.sprite_node("NameBg", top, -150, 34, 176, 34, sprites["name_bg"])
    b.label_node("LblName", top, -150, 34, 160, 28, "未登录", 20, NAME_COLOR, outline=True)
    b.label_node("LblSub", top, -150, 6, 200, 18, "请从 Boot 进入", 13, SUB_COLOR)

    power = b.make_node("PowerSlot", top, 22, 34, 112, 30)
    b.sprite_node("Bg", power, 0, 0, 112, 30, sprites["pill"])
    b.sprite_node("Icon", power, -36, 0, 40, 22, sprites["power"])
    b.label_node("Value", power, 16, 0, 52, 24, "0", 16, POWER_COLOR)

    gold = b.make_node("CurrencyGold", top, 154, 34, 136, 30)
    b.sprite_node("Bg", gold, 0, 0, 136, 30, sprites["pill"])
    b.sprite_node("Icon", gold, -48, 0, 24, 24, sprites["coin"])
    b.label_node("Value", gold, -4, 0, 68, 24, "金币 0", 14, GOLD_COLOR, overflow=2)
    b.sprite_node("BtnAddGold", gold, 52, 0, 24, 24, sprites["add"], button=True)

    gem = b.make_node("CurrencyGem", top, 292, 34, 124, 30)
    b.sprite_node("Bg", gem, 0, 0, 124, 30, sprites["pill"])
    b.sprite_node("Icon", gem, -42, 0, 22, 18, sprites["gem"])
    b.label_node("Value", gem, -2, 0, 62, 24, "钻石 0", 14, GEM_COLOR, overflow=2)
    b.sprite_node("BtnAddGem", gem, 48, 0, 22, 22, sprites["add"], button=True)

    b.sprite_node("Avatar", top, -304, 20, 104, 104, sprites["head"])
    b.sprite_node("LevelBg", top, -304, -22, 60, 22, sprites["level_bg"])
    b.label_node("LblLevel", top, -304, -22, 52, 20, "1", 14, LEVEL_COLOR, outline=True)

    b.add_shell(root, shell)
    return b


def check(b):
    root_box = b.transform("CityChrome")["_contentSize"]
    if root_box["width"] != 720 or root_box["height"] != 1280:
        raise SystemExit("root is not 720x1280")
    for prop, path in SHELL_NODES.items():
        b.id_of(path)
    if b.node("CityChrome/BtnActivity")["_active"] or b.node("CityChrome/BtnMorePanel")["_active"]:
        raise SystemExit("activity stubs must stay inactive")
    if b.node("CityChrome/BottomBar/TabBag/Lock")["_active"]:
        raise SystemExit("bag lock must start inactive")
    # Grouped activities stay on the right. A full-width strip would reach x < 0.
    xs = []
    for name in (
        "ActRecommend",
        "ActSevenDay",
        "ActHeroArrive",
        "ActPrivilege",
        "ActWelfare",
        "ActLimitGift",
        "ActLimitTime",
        "BtnActExpand",
    ):
        x, y = b.screen("CityChrome/ActGroup/" + name)
        xs.append(x)
        if x < 40 or y > 520 or y < 340:
            raise SystemExit("activity %s escaped the top-right cluster: %s,%s" % (name, x, y))
    if max(xs) - min(xs) > 280:
        raise SystemExit("activity cluster is too wide")
    battle_w = b.transform("CityChrome/BottomBar/TabBattle")["_contentSize"]["width"]
    city = b.transform("CityChrome/BottomBar/TabCity")["_contentSize"]["width"]
    if battle_w <= city:
        raise SystemExit("TabBattle should be the emphasized slot")
    battle = b.comp_sprite("CityChrome/BottomBar/TabBattle/Icon")
    if battle["rel"] != "ui/city/main-scene-lang_spr-battle.png":
        raise SystemExit("TabBattle icon is not the battle art")
    dungeon = b.comp_sprite("CityChrome/BottomBar/TabDungeon/Icon")
    if dungeon["rel"] != "ui/city/main-scene-lang_spr-skin.png":
        raise SystemExit("TabDungeon icon is not the cn dungeon art")
    fetter = b.comp_sprite("CityChrome/BottomBar/TabFetter/Icon")
    if fetter["rel"] != "ui/city/main-scene_spr-fetters-unlock.png":
        raise SystemExit("TabFetter icon is not the crown")
    names_expect = ["主城", "英雄", "背包", "战斗", "副本", "公会", "VIP"]
    tab_nodes = ["TabCity", "TabHero", "TabBag", "TabBattle", "TabDungeon", "TabClan", "TabFetter"]
    for i, tab_name in enumerate(tab_nodes):
        got = b.comp_label("CityChrome/BottomBar/" + tab_name + "/Label")["_string"]
        if got != names_expect[i]:
            raise SystemExit("%s text %s" % (tab_name, got))
    names = [b.objs[i]["_name"] for i in b.path_of]
    for banned in ("Tab_city", "Tab_hero", "Tab_summon", "Tab_smith", "Tab_plays"):
        if banned in names:
            raise SystemExit("old tab name still present: " + banned)
    text = json.dumps(b.objs, ensure_ascii=False)
    if ".png" in text or "resources/" in text or "USE_" in text or "lbl-" in text:
        raise SystemExit("prefab embedded a banned token")
    with open(BIND_TS, encoding="utf-8") as handle:
        binder = handle.read()
    for path in BIND_PATHS:
        if path not in binder:
            raise SystemExit("CityChrome.ts no longer binds " + path)
    # Five tabs, labels, and the live currency nodes exist.
    for path, text_expect in (
        ("CityChrome/TopBar/LblName", "未登录"),
        ("CityChrome/TopBar/LblLevel", "1"),
        ("CityChrome/TopBar/CurrencyGold/Value", "金币 0"),
        ("CityChrome/TopBar/CurrencyGem/Value", "钻石 0"),
        ("CityChrome/BottomBar/TabCity/Label", "主城"),
        ("CityChrome/BottomBar/TabBattle/Label", "战斗"),
        ("CityChrome/BottomBar/TabFetter/Label", "VIP"),
    ):
        got = b.comp_label(path)["_string"]
        if got != text_expect:
            raise SystemExit("%s text %s" % (path, got))
    screen_name = b.screen("CityChrome/TopBar/LblName")
    screen_gold = b.screen("CityChrome/TopBar/CurrencyGold")
    if screen_name[0] >= screen_gold[0]:
        raise SystemExit("name should sit left of the gold pill")
    if b.screen("CityChrome/TopBar/Bg")[1] < 500:
        raise SystemExit("top bar is not at the top")
    if b.screen("CityChrome/BottomBar/Bg")[1] > -500:
        raise SystemExit("bottom bar is not at the bottom")
    util_x = [b.screen("CityChrome/UtilityRow/" + name)[0] for name in (
        "BtnReplay", "BtnFriend", "BtnMail", "BtnRank", "BtnMore"
    )]
    if util_x != sorted(util_x) or util_x[0] < 40:
        raise SystemExit("utility row is not a right-side row: %s" % util_x)


def render_preview(b, sprites):
    canvas = Image.new("RGBA", (720, 1280), (120, 176, 214, 255))
    draw = ImageDraw.Draw(canvas)
    for y in range(1280):
        t = y / 1280.0
        shade = (
            int(150 - 40 * t),
            int(196 - 30 * t),
            int(220 - 20 * t),
            255,
        )
        draw.line([(0, y), (719, y)], fill=shade)
    by_uuid = {sprite["uuid"]: sprite["rel"] for sprite in sprites.values()}
    font_cache = {}

    def font_for(px):
        if px not in font_cache:
            font_cache[px] = ImageFont.truetype(FONT_FILE, px)
        return font_cache[px]

    def paint(path):
        node = b.node(path)
        if not node["_active"]:
            return
        sx, sy = b.screen(path)
        box = b.transform(path)["_contentSize"]
        for cref in node["_components"]:
            comp = b.objs[cref["__id__"]]
            if comp.get("__type__") == "cc.Sprite":
                rel = by_uuid.get(comp["_spriteFrame"]["__uuid__"])
                if not rel:
                    continue
                image = Image.open(os.path.join(RES, rel)).convert("RGBA")
                image = image.resize((int(box["width"]), int(box["height"])), Image.Resampling.LANCZOS)
                left = int(round(360 + sx - box["width"] / 2))
                top = int(round(640 - sy - box["height"] / 2))
                canvas.alpha_composite(image, (left, top))
            elif comp.get("__type__") == "cc.Label":
                face = font_for(comp["_fontSize"])
                text = comp["_string"]
                col = comp["_color"]
                fill = (col["r"], col["g"], col["b"], col["a"])
                tw = draw.textlength(text, font=face)
                left = 360 + sx - tw / 2
                top = 640 - sy - comp["_fontSize"] / 2
                if comp.get("_enableOutline"):
                    for ox, oy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                        draw.text((left + ox, top + oy), text, font=face, fill=(36, 22, 16, 220))
                draw.text((left, top), text, font=face, fill=fill)
        for cref in node["_children"]:
            child = b.objs[cref["__id__"]]
            paint(path + "/" + child["_name"])

    paint("CityChrome")
    canvas.save(PREVIEW)


def sprite_rel_of(b, path):
    return b.comp_sprite(path)["rel"]


def attach_comp_helpers(b, sprites):
    by_uuid = {sprite["uuid"]: sprite for sprite in sprites.values()}

    def comp_sprite(path):
        node = b.node(path)
        for cref in node["_components"]:
            comp = b.objs[cref["__id__"]]
            if comp.get("__type__") == "cc.Sprite":
                sprite = by_uuid.get(comp["_spriteFrame"]["__uuid__"])
                if not sprite:
                    raise SystemExit("unknown sprite on " + path)
                return sprite
        raise SystemExit("missing sprite on " + path)

    def comp_label(path):
        node = b.node(path)
        for cref in node["_components"]:
            comp = b.objs[cref["__id__"]]
            if comp.get("__type__") == "cc.Label":
                return comp
        raise SystemExit("missing label on " + path)

    b.comp_sprite = comp_sprite
    b.comp_label = comp_label


def main():
    before = snapshot_protected()
    zip_path = find_zip()
    if zip_path:
        installed = install_zip(zip_path, set(before))
        print("installed %d pngs from %s" % (len(installed), zip_path))
    else:
        print("chrome zip not found; building from resources already on disk")
    assert_protected_unchanged(before)

    sprite_files = {
        "top": "ui/city/main-scene_spr-up-bg.png",
        "bottom": "ui/city/main-scene_spr-bottom-bg.png",
        "head": "ui/city/main-scene_spr-head-frame-1.png",
        "name_bg": "ui/city/main-scene_spr-name-bg-1.png",
        "level_bg": "ui/city/main-scene_spr-level-bg.png",
        "pill": "ui/city/main-scene_spr-res-bg.png",
        "city": "ui/city/main-scene-lang_spr-city.png",
        "hero": "ui/city/main-scene-lang_spr-hero.png",
        "battle": "ui/city/main-scene-lang_spr-battle.png",
        "bag": "ui/city/main-scene-lang_spr-backpack.png",
        "dungeon": "ui/city/main-scene-lang_spr-skin.png",
        "clan": "ui/city/main-scene-lang_spr-clan.png",
        "fetter": "ui/city/main-scene_spr-fetters-unlock.png",
        "lock": "ui/city/main-scene_spr-lock.png",
        "power": "ui/common/other_spr-power.png",
        "coin": "ui/common/res-icon_res-1.png",
        "gem": "ui/common/res-icon_res-2.png",
        "add": "ui/common/button_btn-add-4.png",
        "plate": "ui/common/button_btn-circle-blue-1.png",
        "plate_hot": "ui/common/button_btn-circle-blue-2.png",
        "down": "ui/common/button_btn-down.png",
        "recommend": "ui/city/main-city_btn-hero-recommend-1.png",
        "seven": "ui/city/main-city_icon-act_sevent_day_target.png",
        "arrive": "ui/city/main-city_icon-act_hero_arrive.png",
        "privilege": "ui/city/main-city_icon-act_privilege.png",
        "welfare": "ui/city/main-city_icon-act_welfare.png",
        "limit_gift": "ui/city/main-city_icon-act_limit_gift.png",
        "limit_time": "ui/city/main-city_icon-act_limit_time_activity.png",
        "replay": "ui/city/main-city_btn-main-video-studio.png",
        "friend": "ui/city/main-city_btn-friend-1.png",
        "mail": "ui/city/main-city_btn-mail-1.png",
        "rank": "ui/city/main-city_btn-rank-1.png",
        "more": "ui/city/main-city_btn-unfold-1.png",
    }
    global FONT
    FONT = load_font_uuid()
    sprites = {key: load_sprite(rel) for key, rel in sprite_files.items()}
    shell = load_shell()
    builder = build(shell, sprites)
    attach_comp_helpers(builder, sprites)
    check(builder)
    text = json.dumps(builder.objs, ensure_ascii=False, indent=2) + "\n"
    type_needle = '"__type__": "%s"' % shell["type"]
    if text.count(type_needle) != 1 or len(shell["type"]) != 23:
        raise SystemExit("prefab is missing the 23-char shell __type__")
    with open(PREFAB_PATH, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)
    # Keep the existing prefab uuid. prefabLoad maps the path to it.
    meta_path = PREFAB_PATH + ".meta"
    with open(meta_path, encoding="utf-8") as handle:
        meta = json.load(handle)
    if meta.get("uuid") != "c97efb56-db67-4c93-84d5-e29436794e86":
        raise SystemExit("CityChrome.prefab.meta uuid drifted")
    if meta.get("userData", {}).get("syncNodeName") != "CityChrome":
        raise SystemExit("prefab meta syncNodeName drifted")
    assert_protected_unchanged(before)
    render_preview(builder, sprites)
    print("wrote", PREFAB_PATH)
    print("preview", PREVIEW)


if __name__ == "__main__":
    sys.exit(main())
