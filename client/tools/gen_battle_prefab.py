# -*- coding: utf-8 -*-
"""Generate Creator 3.8.8 battle presentation prefabs.

Writes:
  client/assets/prefabs/ui/battle/BattlePage.prefab
  client/assets/prefabs/ui/battle/WireBattlePage.prefab
and their .meta files, plus ui/battle.meta if it is missing.

BattlePage is the mainline battle shell: slot mounts, empty VFX anchors,
placeholder HP / skill bars, a fullscreen photo Bg, presentation
mounts (LayerFloat, SkillNameBanner, front-row HeadAnchor), and the
battle-ui2 shell mounts (LayerAppear / AppearLeft / AppearRight / VsBar).
WireBattlePage is the thinner swap target. They do not share a root.

SpriteFrame uuids are read from client/assets/resources/**/*.meta (@f9941).
No PNG is copied into prefabs/. No spine binary is embedded.

Does not touch Boot, page scripts, protocol TS, or USE_* flags.
Does not bind a shell script. A future shell __type__ must be the 23-char
packer id (compressUuid reserved head 5). This script rejects a 22-char
script id and rejects any non-cc component.

File ids are hashed from node paths, so the prefab body is stable.
An existing .meta uuid is kept, so a second run rewrites the same files.
"""
import base64
import hashlib
import json
import os
import uuid

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RES = os.path.join(ROOT, "client", "assets", "resources")
OUT_DIR = os.path.join(ROOT, "client", "assets", "prefabs", "ui", "battle")
DIR_META = OUT_DIR + ".meta"
FONT_META = os.path.join(RES, "font", "FZCSJW-GB1-0.ttf.meta")

LAYER_UI = 33554432
PAGE_W = 720
PAGE_H = 1280
SIMPLE = 0
SLICED = 1
# cc.Button.Transition.SCALE
TRANSITION_SCALE = 3
MIN_GAP = 8

# battleSlotPage: left enemy / right ally, three rows top to bottom.
# Front index 0..2 sits toward center. Back index 3..5 is the outer file.
# anchorXY fallbacks stay skill (0, 180), hit (0, 120). Read, not imported.
ROW_Y = (140, -36, -212)
ENEMY_FRONT_X = -158
ENEMY_BACK_X = -300
ALLY_FRONT_X = 158
ALLY_BACK_X = 300
SLOT_W = 108
SLOT_H = 120
HP_LIFT = 80
VFX_SKILL = (0, 180, 48, 48)
VFX_HIT = (0, 120, 48, 48)

TOP_Y = 592
TOP_H = 64
CLOSE_X = 308
HP_W = 160
HP_H = 24
HP_FILL_W = 112
HP_FILL_H = 14
SKILL_W = 180
SKILL_H = 36
SKILL_FILL_W = 72
SKILL_FILL_H = 16
SKILL_Y = -360
SKILL_X = (-220, 0, 220)
LOG_Y = -456
BTN_Y = -568

# Presentation mounts. Page origin is the root center.
# The two teams stand on the sand. The skill name and the preview floats
# sit in the open band above them, clear of the top bar.
BANNER_Y = 300
BANNER_W = 248
BANNER_H = 36
FLOAT_ROOT = (0, 450, 260, 110)
# Local to FloatDamageRoot. Page y = 140 + local y.
FLOATS = (
    (0, 28, 220, 36, "-12345", 34),
    (16, -8, 220, 40, "-439057", 32),
    (-12, -32, 180, 32, "-40604", 26),
    (6, 0, 190, 34, "-41418", 26),
)
CRIT = (-220, 470, 84, 36)
HEAD_Y = 48
HEAD_W = 104
HEAD_H = 22
LEVEL_X = -30
LEVEL_W = 40
LEVEL_H = 18
BUFF_ROW_X = 22
BUFF_ROW_W = 48
BUFF_ROW_H = 14
BUFF_X = (-16, 0, 16)
BUFF_SIZE = 12

# Hall photo. Same bytes as old hd/ccbi-res/map-bg-mission-1.jpg.
# battle-scene_spr-bg-1 is 112×64 corner chrome and must never be the page Bg.
BATTLE_HALL_BG = "ui/maps/map-bg-mission-1.jpg"
SPR_BG_CHROME = "ui/battle/battle-scene_spr-bg-1.png"
TINT_BG = "ui/common/win-bg_win-bg-12.png"
# Close stays the common button so BtnClose does not resize.
# Speed x1/x2/x3 and the prog bar do mount when those frames are on disk.
BATTLE_CLOSE_REL = "ui/battle/battle-scene_btn-close-1.png"
COMMON_CLOSE_REL = "ui/common/button_btn-close-1.png"
SPEED_REL = "ui/battle/battle-scene_btn-speed-1.png"
SPEED_PRESSED_REL = "ui/battle/battle-scene_btn-speed-2.png"
PROG_BG_REL = "ui/battle/battle-scene_prog-bg-1.png"
PROG_FILL_REL = "ui/battle/battle-scene_prog-1.png"
# battle-end_spr-vs. Appear wipes stay empty mounts; the frame lists are
# resources, not a single sprite on the prefab.
VS_REL = "ui/battle/battle-end_spr-vs.png"
# Open band above the front-row heads and below SkillNameBanner.
VS_Y = 240
APPEAR_HALF_W = 360

WIRE_TITLE = "战斗（真服接线占位）"
WIRE_STATUS = "未同步 · 等切 Prefab"
WIRE_HINT = (
    "站位与特效挂点见 BattlePage：Slot_E0 到 Slot_E5、Slot_A0 到 Slot_A5、VfxSkill、VfxHit、VfxScreen。"
    "另见 LayerFloat、SkillNameBanner、HeadAnchor。"
)


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


def sprite_type(user):
    borders = (
        int(user.get("borderTop") or 0),
        int(user.get("borderBottom") or 0),
        int(user.get("borderLeft") or 0),
        int(user.get("borderRight") or 0),
    )
    if any(edge > 0 for edge in borders):
        return SLICED
    return SIMPLE


def load_sprite(rel, require_slice=False):
    meta_path = os.path.join(RES, rel + ".meta")
    if not os.path.isfile(meta_path):
        raise SystemExit("missing sprite meta: " + rel)
    with open(meta_path, encoding="utf-8") as handle:
        data = json.load(handle)
    sub = data.get("subMetas", {}).get("f9941")
    if not sub or sub.get("importer") != "sprite-frame":
        raise SystemExit("missing sprite-frame f9941 in " + meta_path)
    value = sub.get("uuid") or ""
    if not value.endswith("@f9941"):
        raise SystemExit("spriteFrame uuid is not @f9941: " + meta_path)
    user = sub.get("userData") or {}
    typ = sprite_type(user)
    if require_slice and typ != SLICED:
        raise SystemExit("button is missing a nine-slice border: " + rel)
    return {"rel": rel, "uuid": value, "user": user, "type": typ}


def load_font_uuid():
    with open(FONT_META, encoding="utf-8") as handle:
        data = json.load(handle)
    value = data.get("uuid") or ""
    if data.get("importer") != "ttf-font" or len(value) < 32:
        raise SystemExit("font meta missing uuid: " + FONT_META)
    if "FZCSJW" not in os.path.basename(FONT_META):
        raise SystemExit("font is not FZCSJW")
    return value


def first_existing(rels):
    for rel in rels:
        if os.path.isfile(os.path.join(RES, rel + ".meta")):
            return rel
    return None


def battle_prog_rels():
    folder = os.path.join(RES, "ui", "battle")
    if not os.path.isdir(folder):
        return []
    found = []
    for name in sorted(os.listdir(folder)):
        if not name.startswith("battle-scene_prog"):
            continue
        if name.endswith(".png") or name.endswith(".jpg"):
            found.append("ui/battle/" + name)
    return found


def choose_art():
    """Pick Bg, speed, and prog frames that are actually in resources/.

    BtnClose stays on the common button. BtnSpeed and the hp/skill bars
    use ui/battle when those files are present.
    """
    bg_rel = BATTLE_HALL_BG
    placeholder = False
    if not os.path.isfile(os.path.join(RES, bg_rel + ".meta")):
        raise SystemExit("battle hall bg missing: " + bg_rel)
    close_rel = COMMON_CLOSE_REL
    if not os.path.isfile(os.path.join(RES, close_rel + ".meta")):
        raise SystemExit("no close button sprite in resources")
    speed_rel = SPEED_REL if os.path.isfile(os.path.join(RES, SPEED_REL + ".meta")) else None
    speed_pressed = speed_rel
    if speed_rel and os.path.isfile(os.path.join(RES, SPEED_PRESSED_REL + ".meta")):
        speed_pressed = SPEED_PRESSED_REL
    prog = []
    if os.path.isfile(os.path.join(RES, PROG_BG_REL + ".meta")) and os.path.isfile(
        os.path.join(RES, PROG_FILL_REL + ".meta")
    ):
        prog = [PROG_BG_REL, PROG_FILL_REL]
    art = {
        "bg": load_sprite(bg_rel),
        "bg_placeholder": placeholder,
        "close": load_sprite(close_rel),
        "speed": load_sprite(speed_rel) if speed_rel else None,
        "speed_pressed": load_sprite(speed_pressed) if speed_rel else None,
        "block": load_sprite("ui/common/win-bg_block-bg-5.png"),
        "num": load_sprite("ui/common/win-bg_num-bg.png"),
        "msg": load_sprite("ui/common/win-bg_msg-bg.png"),
        "btn_blue": load_sprite("ui/common/button_btn-blue-big-1.png", require_slice=True),
        "btn_blue_p": load_sprite("ui/common/button_btn-blue-big-2.png"),
        "btn_orange": load_sprite("ui/common/button_btn-orange-big-1.png", require_slice=True),
        "btn_orange_p": load_sprite("ui/common/button_btn-orange-big-2.png"),
        "vs": load_sprite(VS_REL) if os.path.isfile(os.path.join(RES, VS_REL + ".meta")) else None,
    }
    if prog:
        art["bar_track"] = load_sprite(prog[0])
        art["bar_fill"] = load_sprite(prog[1] if len(prog) > 1 else prog[0])
        art["bar_tinted"] = False
    else:
        art["bar_track"] = art["num"]
        art["bar_fill"] = art["num"]
        art["bar_tinted"] = True
    if art["bg"]["type"] != SIMPLE and not placeholder:
        raise SystemExit("photo bg has borders; refusing to nine-slice a map: " + bg_rel)
    if art["block"]["type"] != SIMPLE or art["num"]["type"] != SIMPLE or art["msg"]["type"] != SIMPLE:
        raise SystemExit("placeholder plate has unexpected borders")
    return art


ART = choose_art()
FONT = load_font_uuid()

WHITE = color(255, 255, 255, 255)
TITLE_COLOR = color(255, 228, 170, 255)
MUTED = color(190, 205, 225, 255)
NAME_COLOR = color(240, 240, 240, 255)
LOG_COLOR = color(214, 224, 236, 255)
PAGE_TINT = color(8, 16, 32, 255)
ENEMY_PLACE = color(96, 40, 44, 168)
ALLY_PLACE = color(28, 58, 96, 168)
TRACK = color(16, 20, 28, 255)
ENEMY_BAR = color(220, 96, 96, 255)
ALLY_BAR = color(88, 196, 120, 255)
SKILL_FRAME = color(16, 28, 48, 230)
SKILL_FILL = color(255, 214, 120, 255)
LOG_BG = color(10, 18, 32, 230)
BANNER_TINT = color(28, 16, 48, 210)
SKILL_NAME_COLOR = color(255, 244, 214, 255)
DMG_ORANGE = color(255, 96, 40, 235)
DMG_CYAN = color(56, 220, 255, 235)
DMG_TEAL = color(72, 196, 214, 230)
CRIT_BG = color(196, 78, 24, 230)
CRIT_COLOR = color(255, 244, 220, 255)
LEVEL_COLOR = color(255, 236, 170, 255)
BUFF_TINTS = (
    color(88, 214, 120, 230),
    color(176, 104, 255, 230),
    color(255, 196, 72, 230),
)
FLOAT_COLORS = (DMG_ORANGE, DMG_CYAN, DMG_CYAN, DMG_TEAL)


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

    def add_label(self, node_id, text, font_size, col, overflow=1, h_align=1, v_align=1, wrap=False, outline=False):
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
            "_verticalAlign": v_align,
            "_actualFontSize": font_size,
            "_fontSize": font_size,
            "_fontFamily": "Arial",
            "_lineHeight": font_size + 8,
            "_overflow": overflow,
            "_enableWrapText": wrap,
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

    def make_label_node(
        self, name, parent_id, x, y, w, h, text, font_size, col,
        h_align=1, v_align=1, wrap=False, outline=False, overflow=1,
    ):
        nid = self.make_node(name, parent_id, x, y, w, h)
        self.add_label(
            nid, text, font_size, col,
            h_align=h_align, v_align=v_align, wrap=wrap, outline=outline, overflow=overflow,
        )
        return nid

    def make_sprite_node(self, name, parent_id, x, y, w, h, sprite, typ, col=None):
        nid = self.make_node(name, parent_id, x, y, w, h)
        self.add_sprite(nid, sprite, typ, col=col)
        return nid

    def make_button(self, name, parent_id, x, y, w, h, text, font_size, bg, pressed):
        nid = self.make_node(name, parent_id, x, y, w, h)
        self.add_sprite(nid, bg, SLICED, col=WHITE)
        self.add_button(nid, bg, pressed)
        self.make_label_node("Label", nid, 0, 0, w - 16, h - 8, text, font_size, WHITE, outline=True)
        return nid

    def make_icon_button(self, name, parent_id, x, y, w, h, sprite, pressed, typ):
        nid = self.make_node(name, parent_id, x, y, w, h)
        self.add_sprite(nid, sprite, typ, col=WHITE)
        self.add_button(nid, sprite, pressed)
        return nid

    def id_of(self, path):
        for nid, node_path in self.path_of.items():
            if node_path == path:
                return nid
        raise SystemExit("missing node " + path)

    def label_comp(self, path):
        node = self.objs[self.id_of(path)]
        for cref in node["_components"]:
            comp = self.objs[cref["__id__"]]
            if comp.get("__type__") == "cc.Label":
                return comp
        for cref in node["_children"]:
            child = self.objs[cref["__id__"]]
            if child.get("_name") != "Label":
                continue
            for crefc in child["_components"]:
                comp = self.objs[crefc["__id__"]]
                if comp.get("__type__") == "cc.Label":
                    return comp
        raise SystemExit("missing label on " + path)

    def label_of(self, path):
        return self.label_comp(path)["_string"]

    def size_of(self, path):
        node = self.objs[self.id_of(path)]
        uit = self.objs[node["_components"][0]["__id__"]]
        if uit.get("__type__") != "cc.UITransform":
            raise SystemExit("first component is not UITransform on " + path)
        box = uit["_contentSize"]
        return box["width"], box["height"]

    def sprite_of(self, path):
        node = self.objs[self.id_of(path)]
        for cref in node["_components"]:
            comp = self.objs[cref["__id__"]]
            if comp.get("__type__") == "cc.Sprite":
                return comp
        raise SystemExit("missing sprite on " + path)

    def button_of(self, path):
        node = self.objs[self.id_of(path)]
        for cref in node["_components"]:
            comp = self.objs[cref["__id__"]]
            if comp.get("__type__") == "cc.Button":
                return comp
        raise SystemExit("missing button on " + path)

    def child_names(self, path):
        node = self.objs[self.id_of(path)]
        return [self.objs[child["__id__"]]["_name"] for child in node["_children"]]

    def component_types(self, path):
        node = self.objs[self.id_of(path)]
        return [self.objs[cref["__id__"]]["__type__"] for cref in node["_components"]]

    def expect(self, path, x, y, w, h, text=None):
        node = self.objs[self.id_of(path)]
        pos = node["_lpos"]
        if pos["x"] != x or pos["y"] != y:
            raise SystemExit("%s position %s,%s != %s,%s" % (path, pos["x"], pos["y"], x, y))
        aw, ah = self.size_of(path)
        if aw != w or ah != h:
            raise SystemExit("%s size %s,%s != %s,%s" % (path, aw, ah, w, h))
        if not node["_active"]:
            raise SystemExit("%s inactive" % path)
        if text is not None and self.label_of(path) != text:
            raise SystemExit("%s text %r" % (path, self.label_of(path)))

    def expect_sprite(self, path, sprite, typ, tint=None):
        spr = self.sprite_of(path)
        if spr["_spriteFrame"]["__uuid__"] != sprite["uuid"]:
            raise SystemExit("%s sprite %s" % (path, spr["_spriteFrame"]))
        if spr["_type"] != typ or spr["_sizeMode"] != 0:
            raise SystemExit("%s sprite type %s sizeMode %s" % (path, spr["_type"], spr["_sizeMode"]))
        if tint is not None:
            got = spr["_color"]
            if (got["r"], got["g"], got["b"], got["a"]) != (tint["r"], tint["g"], tint["b"], tint["a"]):
                raise SystemExit("%s tint %s" % (path, got))

    def expect_button(self, path, normal, pressed):
        btn = self.button_of(path)
        if btn["clickEvents"] != [] or btn["_transition"] != TRANSITION_SCALE:
            raise SystemExit("%s button is not an empty scale transition" % path)
        if btn["_zoomScale"] != 1.05:
            raise SystemExit("%s zoom" % path)
        if btn["_normalSprite"]["__uuid__"] != normal["uuid"]:
            raise SystemExit("%s normal sprite" % path)
        if btn["_pressedSprite"]["__uuid__"] != pressed["uuid"]:
            raise SystemExit("%s pressed sprite" % path)

    def expect_font(self, path, font_size):
        lab = self.label_comp(path)
        if lab["_fontSize"] != font_size or lab["_font"]["__uuid__"] != FONT or lab["_isSystemFontUsed"]:
            raise SystemExit("%s font" % path)

    def expect_label_color(self, path, col):
        got = self.label_comp(path)["_color"]
        if (got["r"], got["g"], got["b"], got["a"]) != (col["r"], col["g"], col["b"], col["a"]):
            raise SystemExit("%s label color %s" % (path, got))

    def expect_empty(self, path):
        types = self.component_types(path)
        if types != ["cc.UITransform"]:
            raise SystemExit("%s is not an empty mount: %s" % (path, types))
        if self.child_names(path):
            raise SystemExit("%s mount has children" % path)


def page_rect(builder, path):
    x = 0
    y = 0
    nid = builder.id_of(path)
    while nid is not None:
        node = builder.objs[nid]
        x += node["_lpos"]["x"]
        y += node["_lpos"]["y"]
        parent = node.get("_parent")
        nid = None if parent is None else parent["__id__"]
    w, h = builder.size_of(path)
    return (x - w / 2.0, y - h / 2.0, x + w / 2.0, y + h / 2.0)


def separated(a, b, min_gap):
    ax0, ay0, ax1, ay1 = a
    bx0, by0, bx1, by1 = b
    x_gap = max(bx0 - ax1, ax0 - bx1)
    y_gap = max(by0 - ay1, ay0 - by1)
    if x_gap >= 0 and y_gap >= 0:
        return True
    if x_gap >= 0:
        return x_gap >= min_gap
    if y_gap >= 0:
        return y_gap >= min_gap
    return False


def assert_gaps(builder, paths):
    rects = [(path, page_rect(builder, path)) for path in paths]
    for i in range(len(rects)):
        for j in range(i + 1, len(rects)):
            if separated(rects[i][1], rects[j][1], MIN_GAP):
                continue
            raise SystemExit("gap < %s between %s and %s" % (MIN_GAP, rects[i][0], rects[j][0]))


def assert_cross(builder, left, right):
    for a in left:
        for b in right:
            if a == b:
                continue
            if separated(page_rect(builder, a), page_rect(builder, b), MIN_GAP):
                continue
            raise SystemExit("gap < %s between %s and %s" % (MIN_GAP, a, b))


def make_head(builder, slot):
    """Level + three buff chips above the slot center. Front row only."""
    head = builder.make_node("HeadAnchor", slot, 0, HEAD_Y, HEAD_W, HEAD_H)
    builder.make_label_node(
        "LevelLabel", head, LEVEL_X, 0, LEVEL_W, LEVEL_H, "Lv.1", 12, LEVEL_COLOR, outline=True,
    )
    row = builder.make_node("BuffRow", head, BUFF_ROW_X, 0, BUFF_ROW_W, BUFF_ROW_H)
    for i, tint in enumerate(BUFF_TINTS):
        builder.make_sprite_node(
            "Buff_%d" % i, row, BUFF_X[i], 0, BUFF_SIZE, BUFF_SIZE, ART["block"], SIMPLE, col=tint,
        )
    return head


def make_slot(builder, parent, name, x, y, tint, head=False):
    slot = builder.make_node(name, parent, x, y, SLOT_W, SLOT_H)
    builder.make_sprite_node(
        "Placeholder", slot, 0, 0, SLOT_W, SLOT_H, ART["block"], SIMPLE, col=tint,
    )
    builder.make_label_node(
        "Label", slot, 0, 0, SLOT_W - 12, 36, name.split("_", 1)[1], 22, NAME_COLOR, outline=True,
    )
    if head:
        make_head(builder, slot)
    return slot


def make_hp(builder, parent, name, x, y, fill_color, text):
    bar = builder.make_node(name, parent, x, y, HP_W, HP_H)
    track_tint = TRACK if ART["bar_tinted"] else WHITE
    fill_tint = fill_color if ART["bar_tinted"] else WHITE
    builder.add_sprite(bar, ART["bar_track"], ART["bar_track"]["type"], col=track_tint)
    fill_x = (HP_FILL_W - HP_W) // 2
    fill = builder.make_node("Fill", bar, fill_x, 0, HP_FILL_W, HP_FILL_H)
    builder.add_sprite(fill, ART["bar_fill"], ART["bar_fill"]["type"], col=fill_tint)
    builder.make_label_node("Label", bar, 0, 0, HP_W - 8, HP_H, text, 14, WHITE, outline=True)
    return bar


def make_skill(builder, parent, name, x):
    bar = builder.make_node(name, parent, x, SKILL_Y, SKILL_W, SKILL_H)
    frame_tint = SKILL_FRAME if ART["bar_tinted"] else WHITE
    fill_tint = SKILL_FILL if ART["bar_tinted"] else WHITE
    builder.add_sprite(bar, ART["bar_track"], ART["bar_track"]["type"], col=frame_tint)
    fill_x = (SKILL_FILL_W - SKILL_W) // 2
    fill = builder.make_node("Fill", bar, fill_x, 0, SKILL_FILL_W, SKILL_FILL_H)
    builder.add_sprite(fill, ART["bar_fill"], ART["bar_fill"]["type"], col=fill_tint)
    builder.make_label_node("Label", bar, 0, 0, SKILL_W - 12, 28, "", 16, WHITE)
    return bar


def build_battle_page():
    b = Builder("BattlePage")
    root = b.make_node("BattlePage", None, 0, 0, PAGE_W, PAGE_H)
    if root != 1:
        raise SystemExit("root id drifted")

    bg_tint = PAGE_TINT if ART["bg_placeholder"] else WHITE
    b.make_sprite_node("Bg", root, 0, 0, PAGE_W, PAGE_H, ART["bg"], ART["bg"]["type"], col=bg_tint)

    field = b.make_node("LayerField", root, 0, 0, PAGE_W, PAGE_H)
    enemies = b.make_node("EnemySlots", field, 0, 0, PAGE_W, PAGE_H)
    allies = b.make_node("AllySlots", field, 0, 0, PAGE_W, PAGE_H)
    for i, y in enumerate(ROW_Y):
        make_slot(b, enemies, "Slot_E%d" % i, ENEMY_FRONT_X, y, ENEMY_PLACE, head=True)
    for i, y in enumerate(ROW_Y):
        make_slot(b, enemies, "Slot_E%d" % (i + 3), ENEMY_BACK_X, y, ENEMY_PLACE)
    for i, y in enumerate(ROW_Y):
        make_slot(b, allies, "Slot_A%d" % i, ALLY_FRONT_X, y, ALLY_PLACE, head=True)
    for i, y in enumerate(ROW_Y):
        make_slot(b, allies, "Slot_A%d" % (i + 3), ALLY_BACK_X, y, ALLY_PLACE)

    vfx = b.make_node("LayerVfx", root, 0, 0, PAGE_W, PAGE_H)
    b.make_node("VfxSkill", vfx, VFX_SKILL[0], VFX_SKILL[1], VFX_SKILL[2], VFX_SKILL[3])
    b.make_node("VfxHit", vfx, VFX_HIT[0], VFX_HIT[1], VFX_HIT[2], VFX_HIT[3])
    b.make_node("VfxScreen", vfx, 0, 0, PAGE_W, PAGE_H)

    # Start wipe + VS. Left/right stay empty so the 15-frame sequences are
    # not baked into one sprite. VsBar uses battle-end_spr-vs when that
    # meta is present. No script, no Boot, no protocol.
    appear = b.make_node("LayerAppear", root, 0, 0, PAGE_W, PAGE_H)
    b.make_node("AppearLeft", appear, -APPEAR_HALF_W // 2, 0, APPEAR_HALF_W, PAGE_H)
    b.make_node("AppearRight", appear, APPEAR_HALF_W // 2, 0, APPEAR_HALF_W, PAGE_H)
    if ART["vs"]:
        vs_user = ART["vs"]["user"]
        vs_w = int(vs_user.get("width") or 0)
        vs_h = int(vs_user.get("height") or 0)
        if vs_w <= 0 or vs_h <= 0:
            raise SystemExit("VsBar sprite is missing a trim size")
        b.make_sprite_node(
            "VsBar", appear, 0, VS_Y, vs_w, vs_h, ART["vs"], ART["vs"]["type"], col=WHITE,
        )
    else:
        b.make_node("VsBar", appear, 0, VS_Y, 80, 46)

    banner = b.make_node("SkillNameBanner", root, 0, BANNER_Y, BANNER_W, BANNER_H)
    b.make_sprite_node(
        "BannerBg", banner, 0, 0, BANNER_W, BANNER_H, ART["msg"], SIMPLE, col=BANNER_TINT,
    )
    b.make_label_node(
        "SkillNameLabel", banner, 0, 0, BANNER_W - 24, BANNER_H - 6,
        "圣光打击", 20, SKILL_NAME_COLOR, outline=True,
    )

    hud = b.make_node("LayerHud", root, 0, 0, PAGE_W, PAGE_H)
    top = b.make_node("TopBar", hud, 0, TOP_Y, PAGE_W, TOP_H)
    b.make_label_node("RoundLabel", top, 0, 0, 400, 40, "第1回合", 28, TITLE_COLOR, outline=True)
    if ART["speed"]:
        user = ART["speed"]["user"]
        speed_w = int(user.get("width") or 0)
        speed_h = int(user.get("height") or 0)
        if speed_w <= 0 or speed_h <= 0:
            raise SystemExit("speed button is missing a trim size")
        b.make_icon_button(
            "BtnSpeed", top, -CLOSE_X, 0, speed_w, speed_h,
            ART["speed"], ART["speed_pressed"], ART["speed"]["type"],
        )
    close_user = ART["close"]["user"]
    close_w = int(close_user.get("width") or 0)
    close_h = int(close_user.get("height") or 0)
    if close_w <= 0 or close_h <= 0:
        raise SystemExit("close button is missing a trim size")
    b.make_icon_button(
        "BtnClose", top, CLOSE_X, 0, close_w, close_h,
        ART["close"], ART["close"], ART["close"]["type"],
    )

    bars = b.make_node("HpBars", hud, 0, 0, PAGE_W, PAGE_H)
    for i, y in enumerate(ROW_Y):
        make_hp(b, bars, "EnemyHp_%d" % i, ENEMY_FRONT_X, y + HP_LIFT, ENEMY_BAR, "120/120")
    for i, y in enumerate(ROW_Y):
        make_hp(b, bars, "AllyHp_%d" % i, ALLY_FRONT_X, y + HP_LIFT, ALLY_BAR, "100/100")

    skills = b.make_node("SkillBars", hud, 0, 0, PAGE_W, PAGE_H)
    for i, x in enumerate(SKILL_X):
        make_skill(b, skills, "SkillBar_%d" % i, x)

    b.make_sprite_node("LogBg", hud, 0, LOG_Y, 660, 64, ART["msg"], SIMPLE, col=LOG_BG)
    b.make_label_node(
        "Log", hud, 0, LOG_Y, 620, 48, "第1回合 · 我方突进", 18, LOG_COLOR, h_align=0,
    )
    b.make_button(
        "BtnSkip", hud, -140, BTN_Y, 200, 52, "跳过", 24,
        ART["btn_blue"], ART["btn_blue_p"],
    )
    b.make_button(
        "BtnRetreat", hud, 140, BTN_Y, 200, 52, "撤退", 24,
        ART["btn_orange"], ART["btn_orange_p"],
    )

    floats = b.make_node("LayerFloat", root, 0, 0, PAGE_W, PAGE_H)
    damage = b.make_node(
        "FloatDamageRoot", floats, FLOAT_ROOT[0], FLOAT_ROOT[1], FLOAT_ROOT[2], FLOAT_ROOT[3],
    )
    for i, spec in enumerate(FLOATS):
        x, y, w, h, text, font_size = spec
        b.make_label_node(
            "FloatDmg_%d" % i, damage, x, y, w, h, text, font_size, FLOAT_COLORS[i],
            outline=True, overflow=2,
        )
    crit = b.make_node("FloatCrit", floats, CRIT[0], CRIT[1], CRIT[2], CRIT[3])
    b.add_sprite(crit, ART["block"], SIMPLE, col=CRIT_BG)
    b.add_label(crit, "暴击", 20, CRIT_COLOR, outline=True)
    check_battle(b)
    return b


def build_wire():
    b = Builder("WireBattlePage")
    root = b.make_node("WireBattlePage", None, 0, 0, PAGE_W, PAGE_H)
    if root != 1:
        raise SystemExit("root id drifted")
    bg_tint = PAGE_TINT if ART["bg_placeholder"] else WHITE
    b.make_sprite_node("Bg", root, 0, 0, PAGE_W, PAGE_H, ART["bg"], ART["bg"]["type"], col=bg_tint)
    b.make_label_node("Title", root, 0, 260, 680, 52, WIRE_TITLE, 36, TITLE_COLOR, outline=True)
    b.make_label_node("Status", root, 0, 170, 640, 38, WIRE_STATUS, 22, TITLE_COLOR)
    b.make_label_node(
        "FieldHint", root, 0, 40, 640, 112, WIRE_HINT, 20, MUTED, v_align=0, wrap=True,
    )
    b.make_button(
        "BtnBack", root, 0, -160, 240, 48, "返回", 24,
        ART["btn_blue"], ART["btn_blue_p"],
    )
    check_wire(b)
    return b


def expect_head(builder, slot):
    head = slot + "/HeadAnchor"
    if builder.child_names(slot) != ["Placeholder", "Label", "HeadAnchor"]:
        raise SystemExit("front slot children drifted: %s" % builder.child_names(slot))
    builder.expect(head, 0, HEAD_Y, HEAD_W, HEAD_H)
    builder.expect(head + "/LevelLabel", LEVEL_X, 0, LEVEL_W, LEVEL_H, "Lv.1")
    builder.expect_font(head + "/LevelLabel", 12)
    builder.expect_label_color(head + "/LevelLabel", LEVEL_COLOR)
    row = head + "/BuffRow"
    builder.expect(row, BUFF_ROW_X, 0, BUFF_ROW_W, BUFF_ROW_H)
    if builder.child_names(head) != ["LevelLabel", "BuffRow"]:
        raise SystemExit("head children drifted")
    if builder.child_names(row) != ["Buff_0", "Buff_1", "Buff_2"]:
        raise SystemExit("buff row drifted")
    for i, tint in enumerate(BUFF_TINTS):
        path = "%s/Buff_%d" % (row, i)
        builder.expect(path, BUFF_X[i], 0, BUFF_SIZE, BUFF_SIZE)
        builder.expect_sprite(path, ART["block"], SIMPLE, tint)


def expect_presentation(builder, gap_paths, head_paths):
    banner = "BattlePage/SkillNameBanner"
    builder.expect(banner, 0, BANNER_Y, BANNER_W, BANNER_H)
    builder.expect(banner + "/BannerBg", 0, 0, BANNER_W, BANNER_H)
    builder.expect_sprite(banner + "/BannerBg", ART["msg"], SIMPLE, BANNER_TINT)
    label = banner + "/SkillNameLabel"
    builder.expect(label, 0, 0, BANNER_W - 24, BANNER_H - 6, "圣光打击")
    builder.expect_font(label, 20)
    builder.expect_label_color(label, SKILL_NAME_COLOR)
    if builder.child_names(banner) != ["BannerBg", "SkillNameLabel"]:
        raise SystemExit("skill banner children drifted")

    layer = "BattlePage/LayerFloat"
    builder.expect(layer, 0, 0, PAGE_W, PAGE_H)
    if builder.component_types(layer) != ["cc.UITransform"]:
        raise SystemExit("LayerFloat should stay an empty layer")
    root = layer + "/FloatDamageRoot"
    builder.expect(root, FLOAT_ROOT[0], FLOAT_ROOT[1], FLOAT_ROOT[2], FLOAT_ROOT[3])
    if builder.component_types(root) != ["cc.UITransform"]:
        raise SystemExit("FloatDamageRoot should stay an empty mount")
    float_paths = []
    for i, spec in enumerate(FLOATS):
        x, y, w, h, text, font_size = spec
        path = "%s/FloatDmg_%d" % (root, i)
        float_paths.append(path)
        builder.expect(path, x, y, w, h, text)
        builder.expect_font(path, font_size)
        builder.expect_label_color(path, FLOAT_COLORS[i])
        lab = builder.label_comp(path)
        if lab["_overflow"] != 2:
            raise SystemExit("%s should shrink to the sample width" % path)
    if builder.child_names(root) != ["FloatDmg_%d" % i for i in range(len(FLOATS))]:
        raise SystemExit("float children drifted")
    crit = layer + "/FloatCrit"
    builder.expect(crit, CRIT[0], CRIT[1], CRIT[2], CRIT[3], "暴击")
    builder.expect_font(crit, 20)
    builder.expect_label_color(crit, CRIT_COLOR)
    builder.expect_sprite(crit, ART["block"], SIMPLE, CRIT_BG)
    if builder.child_names(layer) != ["FloatDamageRoot", "FloatCrit"]:
        raise SystemExit("float layer children drifted")
    if builder.child_names(crit):
        raise SystemExit("FloatCrit text stays on the node")

    # Skill name and preview floats sit above the two files. VFX anchors
    # stay at the old page origins so local offsets do not move.
    field = [path for path in gap_paths if "/LayerVfx/" not in path]
    assert_cross(builder, [banner, crit], field)
    assert_cross(builder, float_paths, field + [banner, crit])
    for head in head_paths:
        owner = head[: -len("/HeadAnchor")]
        others = [path for path in gap_paths if path != owner]
        others.extend((banner, crit))
        others.extend(float_paths)
        others.extend(path for path in head_paths if path != head)
        assert_cross(builder, [head], others)


def check_battle(b):
    b.expect("BattlePage", 0, 0, PAGE_W, PAGE_H)
    b.expect("BattlePage/Bg", 0, 0, PAGE_W, PAGE_H)
    bg_tint = PAGE_TINT if ART["bg_placeholder"] else WHITE
    b.expect_sprite("BattlePage/Bg", ART["bg"], ART["bg"]["type"], bg_tint)
    b.expect("BattlePage/LayerField", 0, 0, PAGE_W, PAGE_H)
    b.expect("BattlePage/LayerField/EnemySlots", 0, 0, PAGE_W, PAGE_H)
    b.expect("BattlePage/LayerField/AllySlots", 0, 0, PAGE_W, PAGE_H)
    if b.child_names("BattlePage") != [
        "Bg", "LayerField", "LayerVfx", "LayerAppear", "SkillNameBanner", "LayerHud", "LayerFloat",
    ]:
        raise SystemExit("BattlePage child order drifted: %s" % b.child_names("BattlePage"))
    if b.child_names("BattlePage/LayerField") != ["EnemySlots", "AllySlots"]:
        raise SystemExit("field layers drifted")

    enemy_names = ["Slot_E%d" % i for i in range(6)]
    ally_names = ["Slot_A%d" % i for i in range(6)]
    gap_paths = []
    head_paths = []
    for i, y in enumerate(ROW_Y):
        front = "BattlePage/LayerField/EnemySlots/Slot_E%d" % i
        back = "BattlePage/LayerField/EnemySlots/Slot_E%d" % (i + 3)
        a_front = "BattlePage/LayerField/AllySlots/Slot_A%d" % i
        a_back = "BattlePage/LayerField/AllySlots/Slot_A%d" % (i + 3)
        b.expect(front, ENEMY_FRONT_X, y, SLOT_W, SLOT_H, "E%d" % i)
        b.expect(back, ENEMY_BACK_X, y, SLOT_W, SLOT_H, "E%d" % (i + 3))
        b.expect(a_front, ALLY_FRONT_X, y, SLOT_W, SLOT_H, "A%d" % i)
        b.expect(a_back, ALLY_BACK_X, y, SLOT_W, SLOT_H, "A%d" % (i + 3))
        b.expect_sprite(front + "/Placeholder", ART["block"], SIMPLE, ENEMY_PLACE)
        b.expect_sprite(back + "/Placeholder", ART["block"], SIMPLE, ENEMY_PLACE)
        b.expect_sprite(a_front + "/Placeholder", ART["block"], SIMPLE, ALLY_PLACE)
        b.expect_sprite(a_back + "/Placeholder", ART["block"], SIMPLE, ALLY_PLACE)
        for slot in (front, a_front):
            expect_head(b, slot)
            head_paths.append(slot + "/HeadAnchor")
        for slot in (back, a_back):
            if b.child_names(slot) != ["Placeholder", "Label"]:
                raise SystemExit("back slot grew children: %s %s" % (slot, b.child_names(slot)))
        gap_paths.extend((front, back, a_front, a_back))
    if b.child_names("BattlePage/LayerField/EnemySlots") != enemy_names:
        raise SystemExit("enemy slot order drifted: %s" % b.child_names("BattlePage/LayerField/EnemySlots"))
    if b.child_names("BattlePage/LayerField/AllySlots") != ally_names:
        raise SystemExit("ally slot order drifted")

    b.expect("BattlePage/LayerVfx/VfxSkill", VFX_SKILL[0], VFX_SKILL[1], VFX_SKILL[2], VFX_SKILL[3])
    b.expect("BattlePage/LayerVfx/VfxHit", VFX_HIT[0], VFX_HIT[1], VFX_HIT[2], VFX_HIT[3])
    b.expect("BattlePage/LayerVfx/VfxScreen", 0, 0, PAGE_W, PAGE_H)
    for name in ("VfxSkill", "VfxHit", "VfxScreen"):
        b.expect_empty("BattlePage/LayerVfx/" + name)
    if b.child_names("BattlePage/LayerVfx") != ["VfxSkill", "VfxHit", "VfxScreen"]:
        raise SystemExit("vfx order drifted")

    appear = "BattlePage/LayerAppear"
    b.expect(appear, 0, 0, PAGE_W, PAGE_H)
    if b.component_types(appear) != ["cc.UITransform"]:
        raise SystemExit("LayerAppear should stay an empty layer")
    if b.child_names(appear) != ["AppearLeft", "AppearRight", "VsBar"]:
        raise SystemExit("appear children drifted: %s" % b.child_names(appear))
    b.expect(appear + "/AppearLeft", -APPEAR_HALF_W // 2, 0, APPEAR_HALF_W, PAGE_H)
    b.expect(appear + "/AppearRight", APPEAR_HALF_W // 2, 0, APPEAR_HALF_W, PAGE_H)
    b.expect_empty(appear + "/AppearLeft")
    b.expect_empty(appear + "/AppearRight")
    if ART["vs"]:
        vs_w = int(ART["vs"]["user"]["width"])
        vs_h = int(ART["vs"]["user"]["height"])
        b.expect(appear + "/VsBar", 0, VS_Y, vs_w, vs_h)
        b.expect_sprite(appear + "/VsBar", ART["vs"], ART["vs"]["type"], WHITE)
    else:
        b.expect_empty(appear + "/VsBar")
        b.expect(appear + "/VsBar", 0, VS_Y, 80, 46)

    hud_names = ["TopBar", "HpBars", "SkillBars", "LogBg", "Log", "BtnSkip", "BtnRetreat"]
    if b.child_names("BattlePage/LayerHud") != hud_names:
        raise SystemExit("hud order drifted: %s" % b.child_names("BattlePage/LayerHud"))
    b.expect("BattlePage/LayerHud/TopBar", 0, TOP_Y, PAGE_W, TOP_H)
    b.expect("BattlePage/LayerHud/TopBar/RoundLabel", 0, 0, 400, 40, "第1回合")
    b.expect_font("BattlePage/LayerHud/TopBar/RoundLabel", 28)
    close_w = int(ART["close"]["user"]["width"])
    close_h = int(ART["close"]["user"]["height"])
    b.expect("BattlePage/LayerHud/TopBar/BtnClose", CLOSE_X, 0, close_w, close_h)
    b.expect_sprite("BattlePage/LayerHud/TopBar/BtnClose", ART["close"], ART["close"]["type"], WHITE)
    b.expect_button("BattlePage/LayerHud/TopBar/BtnClose", ART["close"], ART["close"])
    top_children = ["RoundLabel"]
    if ART["speed"]:
        top_children.append("BtnSpeed")
        b.expect_button(
            "BattlePage/LayerHud/TopBar/BtnSpeed", ART["speed"], ART["speed_pressed"],
        )
    else:
        if "BtnSpeed" in b.child_names("BattlePage/LayerHud/TopBar"):
            raise SystemExit("BtnSpeed without speed art")
    top_children.append("BtnClose")
    if b.child_names("BattlePage/LayerHud/TopBar") != top_children:
        raise SystemExit("top bar children drifted")

    hp_names = ["EnemyHp_%d" % i for i in range(3)] + ["AllyHp_%d" % i for i in range(3)]
    for i, y in enumerate(ROW_Y):
        enemy = "BattlePage/LayerHud/HpBars/EnemyHp_%d" % i
        ally = "BattlePage/LayerHud/HpBars/AllyHp_%d" % i
        b.expect(enemy, ENEMY_FRONT_X, y + HP_LIFT, HP_W, HP_H, "120/120")
        b.expect(ally, ALLY_FRONT_X, y + HP_LIFT, HP_W, HP_H, "100/100")
        fill_x = (HP_FILL_W - HP_W) // 2
        b.expect(enemy + "/Fill", fill_x, 0, HP_FILL_W, HP_FILL_H)
        b.expect(ally + "/Fill", fill_x, 0, HP_FILL_W, HP_FILL_H)
        gap_paths.extend((enemy, ally))
    # Child order follows creation: E0, A0, E1, A1, E2, A2.
    if b.child_names("BattlePage/LayerHud/HpBars") != hp_names:
        raise SystemExit("hp bar order drifted: %s" % b.child_names("BattlePage/LayerHud/HpBars"))

    skill_names = []
    for i, x in enumerate(SKILL_X):
        path = "BattlePage/LayerHud/SkillBars/SkillBar_%d" % i
        skill_names.append("SkillBar_%d" % i)
        b.expect(path, x, SKILL_Y, SKILL_W, SKILL_H, "")
        b.expect(path + "/Fill", (SKILL_FILL_W - SKILL_W) // 2, 0, SKILL_FILL_W, SKILL_FILL_H)
        gap_paths.append(path)
    if b.child_names("BattlePage/LayerHud/SkillBars") != skill_names:
        raise SystemExit("skill bar order drifted")

    b.expect("BattlePage/LayerHud/LogBg", 0, LOG_Y, 660, 64)
    b.expect_sprite("BattlePage/LayerHud/LogBg", ART["msg"], SIMPLE, LOG_BG)
    b.expect("BattlePage/LayerHud/Log", 0, LOG_Y, 620, 48, "第1回合 · 我方突进")
    b.expect("BattlePage/LayerHud/BtnSkip", -140, BTN_Y, 200, 52, "跳过")
    b.expect("BattlePage/LayerHud/BtnRetreat", 140, BTN_Y, 200, 52, "撤退")
    b.expect_sprite("BattlePage/LayerHud/BtnSkip", ART["btn_blue"], SLICED, WHITE)
    b.expect_sprite("BattlePage/LayerHud/BtnRetreat", ART["btn_orange"], SLICED, WHITE)
    b.expect_button("BattlePage/LayerHud/BtnSkip", ART["btn_blue"], ART["btn_blue_p"])
    b.expect_button("BattlePage/LayerHud/BtnRetreat", ART["btn_orange"], ART["btn_orange_p"])
    gap_paths.extend((
        "BattlePage/LayerHud/TopBar",
        "BattlePage/LayerHud/LogBg",
        "BattlePage/LayerHud/BtnSkip",
        "BattlePage/LayerHud/BtnRetreat",
        "BattlePage/LayerVfx/VfxSkill",
        "BattlePage/LayerVfx/VfxHit",
        "BattlePage/LayerAppear/VsBar",
    ))
    assert_gaps(b, gap_paths)
    expect_presentation(b, gap_paths, head_paths)
    assert_tree(b)


def check_wire(b):
    b.expect("WireBattlePage", 0, 0, PAGE_W, PAGE_H)
    b.expect("WireBattlePage/Bg", 0, 0, PAGE_W, PAGE_H)
    bg_tint = PAGE_TINT if ART["bg_placeholder"] else WHITE
    b.expect_sprite("WireBattlePage/Bg", ART["bg"], ART["bg"]["type"], bg_tint)
    b.expect("WireBattlePage/Title", 0, 260, 680, 52, WIRE_TITLE)
    b.expect_font("WireBattlePage/Title", 36)
    b.expect("WireBattlePage/Status", 0, 170, 640, 38, WIRE_STATUS)
    b.expect("WireBattlePage/FieldHint", 0, 40, 640, 112, WIRE_HINT)
    hint = b.label_comp("WireBattlePage/FieldHint")
    if not hint["_enableWrapText"] or hint["_verticalAlign"] != 0:
        raise SystemExit("FieldHint should wrap from the top")
    b.expect("WireBattlePage/BtnBack", 0, -160, 240, 48, "返回")
    b.expect_button("WireBattlePage/BtnBack", ART["btn_blue"], ART["btn_blue_p"])
    if b.child_names("WireBattlePage") != ["Bg", "Title", "Status", "FieldHint", "BtnBack"]:
        raise SystemExit("wire child order drifted")
    assert_gaps(b, [
        "WireBattlePage/Title",
        "WireBattlePage/Status",
        "WireBattlePage/FieldHint",
        "WireBattlePage/BtnBack",
    ])
    assert_tree(b)


def assert_tree(b):
    file_ids = []
    node_ids = []
    known = {FONT}
    for sprite in (
        ART["bg"], ART["close"], ART["block"], ART["num"], ART["msg"],
        ART["btn_blue"], ART["btn_blue_p"], ART["btn_orange"], ART["btn_orange_p"],
        ART["bar_track"], ART["bar_fill"],
    ):
        known.add(sprite["uuid"])
    if ART["speed"]:
        known.add(ART["speed"]["uuid"])
        known.add(ART["speed_pressed"]["uuid"])
    if ART["vs"]:
        known.add(ART["vs"]["uuid"])
    for index, obj in enumerate(b.objs):
        type_name = obj.get("__type__")
        if not isinstance(type_name, str) or not type_name.startswith("cc."):
            if isinstance(type_name, str) and len(type_name) == 22:
                raise SystemExit("22-char script __type__ is not the packer id")
            raise SystemExit("refusing non-cc component %r" % type_name)
        if type_name == "cc.Graphics":
            raise SystemExit("prefab must not embed Graphics")
        if type_name == "cc.Button":
            if obj.get("clickEvents") != [] or obj.get("_transition") != TRANSITION_SCALE:
                raise SystemExit("button clickEvents must stay empty")
        if type_name == "cc.Label":
            font = obj.get("_font") or {}
            if font.get("__uuid__") != FONT or obj.get("_isSystemFontUsed"):
                raise SystemExit("label is not FZCSJW")
        if "fileId" in obj:
            file_id = obj["fileId"]
            if not isinstance(file_id, str) or len(file_id) != 22:
                raise SystemExit("fileId is not the 22-char hash form")
            file_ids.append(file_id)
        if type_name == "cc.Node":
            node_ids.append(index)
            if obj["_name"] == "Node":
                raise SystemExit("default node name")
            for cref in obj["_components"]:
                comp = b.objs[cref["__id__"]]
                if comp.get("node", {}).get("__id__") != index:
                    raise SystemExit("component node mismatch on " + obj["_name"])
            if obj["_parent"] is not None:
                parent = b.objs[obj["_parent"]["__id__"]]
                child_ids = [child["__id__"] for child in parent["_children"]]
                if index not in child_ids:
                    raise SystemExit("parent missing child " + obj["_name"])
        for key in ("_spriteFrame", "_font", "_normalSprite", "_hoverSprite", "_pressedSprite", "_disabledSprite"):
            val = obj.get(key)
            if isinstance(val, dict) and "__uuid__" in val:
                if val["__uuid__"] not in known:
                    raise SystemExit("unknown uuid " + val["__uuid__"])
                if key != "_font" and not val["__uuid__"].endswith("@f9941"):
                    raise SystemExit("sprite uuid is not @f9941")
    if b.objs[0].get("__type__") != "cc.Prefab" or b.objs[0]["data"]["__id__"] != 1:
        raise SystemExit("prefab data is not the root node")
    if b.objs[1].get("_parent") is not None:
        raise SystemExit("root has a parent")
    if len(file_ids) != len(set(file_ids)):
        raise SystemExit("duplicate fileId in " + b.prefab_name)
    if len(node_ids) != len(b.path_of):
        raise SystemExit("node index drift")
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
        raise SystemExit("existing meta uuid is unusable: " + meta_path)
    return value


def fresh_uuid(taken):
    for _ in range(8):
        value = str(uuid.uuid4())
        if value not in taken:
            taken.add(value)
            return value
    raise SystemExit("uuid collision")


def collect_uuids():
    taken = set()
    assets = os.path.join(ROOT, "client", "assets")
    for dirpath, _dirs, files in os.walk(assets):
        for name in files:
            if not name.endswith(".meta"):
                continue
            path = os.path.join(dirpath, name)
            with open(path, encoding="utf-8-sig") as handle:
                data = json.load(handle)
            value = data.get("uuid")
            if isinstance(value, str) and value:
                taken.add(value)
    return taken


def write_prefab(builder, taken):
    path = os.path.join(OUT_DIR, builder.prefab_name + ".prefab")
    meta_path = path + ".meta"
    os.makedirs(OUT_DIR, exist_ok=True)
    text = json.dumps(builder.objs, ensure_ascii=False, indent=2) + "\n"
    for banned in (".png", ".jpg", "resources/", "USE_", "Boot", "spine"):
        if banned in text:
            raise SystemExit("prefab embedded %s" % banned)
    with open(path, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)
    prefab_uuid = existing_uuid(meta_path) or fresh_uuid(taken)
    taken.add(prefab_uuid)
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
    print("Objects", len(builder.objs))
    return prefab_uuid


def write_dir_meta(taken):
    if os.path.exists(DIR_META):
        print("Keep", DIR_META)
        return
    meta = {
        "ver": "1.2.0",
        "importer": "directory",
        "imported": True,
        "uuid": fresh_uuid(taken),
        "files": [],
        "subMetas": {},
        "userData": {},
    }
    with open(DIR_META, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(meta, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print("Wrote", DIR_META)


def reject_extras():
    allowed = {
        "BattlePage.prefab",
        "BattlePage.prefab.meta",
        "WireBattlePage.prefab",
        "WireBattlePage.prefab.meta",
    }
    for dirpath, _dirs, files in os.walk(OUT_DIR):
        for name in files:
            lower = name.lower()
            if lower.endswith(".png") or lower.endswith(".jpg"):
                raise SystemExit("image under prefabs: " + os.path.join(dirpath, name))
            if name not in allowed:
                raise SystemExit("unexpected file under battle prefabs: " + name)


def assert_current_repo_choice():
    """Lock the art this tree can actually see."""
    if ART["bg_placeholder"] or ART["bg"]["rel"] != BATTLE_HALL_BG:
        raise SystemExit("Bg must be ui/maps/map-bg-mission-1.jpg, got " + ART["bg"]["rel"])
    if os.path.isfile(os.path.join(RES, SPR_BG_CHROME + ".meta")):
        if ART["bg"]["uuid"] == load_sprite(SPR_BG_CHROME)["uuid"]:
            raise SystemExit("spr-bg-1 is 112x64 chrome and must not be the page Bg")
    if not ART["bg"]["uuid"].endswith("@f9941"):
        raise SystemExit("bg uuid")
    if ART["close"]["rel"] != COMMON_CLOSE_REL:
        raise SystemExit("expected common close button")
    if os.path.isfile(os.path.join(RES, BATTLE_CLOSE_REL + ".meta")):
        if ART["close"]["uuid"] == load_sprite(BATTLE_CLOSE_REL)["uuid"]:
            raise SystemExit("battle close button must stay off BtnClose")
    speed_on_disk = os.path.isfile(os.path.join(RES, SPEED_REL + ".meta"))
    prog_on_disk = os.path.isfile(os.path.join(RES, PROG_BG_REL + ".meta")) and os.path.isfile(
        os.path.join(RES, PROG_FILL_REL + ".meta")
    )
    if speed_on_disk:
        if ART["speed"] is None or ART["speed"]["rel"] != SPEED_REL:
            raise SystemExit("BtnSpeed should use battle-scene_btn-speed-1")
    elif ART["speed"] is not None:
        raise SystemExit("BtnSpeed without speed art")
    if prog_on_disk:
        if ART["bar_tinted"] or ART["bar_track"]["rel"] != PROG_BG_REL or ART["bar_fill"]["rel"] != PROG_FILL_REL:
            raise SystemExit("hp bars should use battle-scene prog bg and fill")
    else:
        if not ART["bar_tinted"] or ART["bar_track"]["rel"] != "ui/common/win-bg_num-bg.png":
            raise SystemExit("hp placeholder should be win-bg_num-bg")


def main():
    assert_current_repo_choice()
    battle = build_battle_page()
    wire = build_wire()
    taken = collect_uuids()
    write_dir_meta(taken)
    write_prefab(battle, taken)
    write_prefab(wire, taken)
    reject_extras()
    print("BG", ART["bg"]["rel"], ART["bg"]["uuid"])
    print("BG_PLACEHOLDER", "yes" if ART["bg_placeholder"] else "no")
    print("CLOSE", ART["close"]["rel"], ART["close"]["uuid"])
    print("BAR", ART["bar_track"]["rel"])
    print("SPEED", "yes" if ART["speed"] else "no")
    print("VS", ART["vs"]["rel"] if ART["vs"] else "empty")
    print("OK")


if __name__ == "__main__":
    main()
