# -*- coding: utf-8 -*-
"""Generate the Creator 3.8.8 Summon prefab (not wired).

Writes:
  client/assets/prefabs/ui/summon/SummonPage.prefab
and its .meta, plus ui/summon.meta if it is missing.

SummonPage is the Mock page (SummonPage.ts / module/summon/pull.ts):
single pull and ten pull. There is no WireSummonPage in the repo, so this
script does not write a wire prefab.

SpriteFrame uuids come from client/assets/resources/**/*.meta (@f9941).
Does not touch Boot, MainApp, page scripts, protocol, or USE_*_PREFAB flags.
No summon atlas: page chrome is common win-bg and button art.
A second run keeps the existing prefab uuid so the files stay the same.
"""
import hashlib
import json
import os
import re
import uuid
import base64

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RES = os.path.join(ROOT, "client", "assets", "resources")
OUT_DIR = os.path.join(ROOT, "client", "assets", "prefabs", "ui", "summon")
DIR_META = OUT_DIR + ".meta"
FONT_META = os.path.join(RES, "font", "FZCSJW-GB1-0.ttf.meta")

SUMMON_TS = os.path.join(ROOT, "client", "assets", "scripts", "ui", "SummonPage.ts")
PULL_TS = os.path.join(ROOT, "client", "assets", "scripts", "module", "summon", "pull.ts")
SESSION_TS = os.path.join(ROOT, "client", "assets", "scripts", "net", "MockGameSession.ts")
WIRE_TS = os.path.join(ROOT, "client", "assets", "scripts", "ui", "WireSummonPage.ts")

SPRITE_FILES = {
    "win_bg": "ui/common/win-bg_win-bg-12.png",
    "block": "ui/common/win-bg_block-bg-5.png",
    "btn_blue": "ui/common/button_btn-blue-big-1.png",
    "btn_blue_p": "ui/common/button_btn-blue-big-2.png",
    "btn_orange": "ui/common/button_btn-orange-big-1.png",
    "btn_orange_p": "ui/common/button_btn-orange-big-2.png",
    "btn_green": "ui/common/button_btn-green-big-1.png",
    "btn_green_p": "ui/common/button_btn-green-big-2.png",
}

LAYER_UI = 33554432
PAGE_W = 720
PAGE_H = 1280
# Spec placeholder. Runtime overwrites this with ownedDiamondText(host.diamond()).
# MockGameSession.MOCK_STARTER_DIAMOND is a different number and is not baked in.
FRESH_DIAMOND = 0


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


def uuid_ref(u):
    return {"__uuid__": u}


def read_text(path):
    with open(path, encoding="utf-8") as handle:
        return handle.read()


def require_snippet(path, snippet):
    if snippet not in read_text(path):
        raise SystemExit("layout snippet missing from %s: %s" % (path, snippet))


def ts_int(path, name):
    match = re.search(r"(?:export )?const %s = (\d+);" % re.escape(name), read_text(path))
    if not match:
        raise SystemExit("missing const %s in %s" % (name, path))
    return int(match.group(1))


def single_button_text(cost):
    """Same concatenation as singleButtonText."""
    return "召唤一次（钻石 %d）" % cost


def ten_button_text(cost):
    """Same concatenation as tenButtonText."""
    return "召唤十次（钻石 %d）" % cost


def owned_diamond_text(diamond):
    """Same floor as ownedDiamondText."""
    value = diamond if isinstance(diamond, int) else 0
    if value < 0:
        value = 0
    return "持有钻石 %d" % value


def summon_result_text(drops):
    """Empty-list branch of summonResultText."""
    if not drops:
        return "还没有召唤。新英雄会进入英雄列表"
    raise SystemExit("summon prefab only bakes the empty result")


def load_copy():
    """Pull the strings and coordinates the prefab is standing in for."""
    if os.path.exists(WIRE_TS):
        raise SystemExit("WireSummonPage.ts appeared; this generator still only writes Mock")

    require_snippet(SUMMON_TS, "const PAGE_BG = new Color(8, 16, 32, 255);")
    require_snippet(SUMMON_TS, "const TITLE = new Color(255, 228, 170, 255);")
    require_snippet(SUMMON_TS, "const MUTED = new Color(190, 205, 225, 255);")
    require_snippet(SUMMON_TS, "const RESULT = new Color(214, 224, 236, 255);")
    require_snippet(SUMMON_TS, "const SINGLE_FILL = new Color(168, 116, 42, 255);")
    require_snippet(SUMMON_TS, "const TEN_FILL = new Color(120, 72, 168, 255);")
    require_snippet(SUMMON_TS, "const BACK_FILL = new Color(36, 72, 120, 255);")
    require_snippet(SUMMON_TS, 'place(createLabel("召唤", 40, { color: TITLE }), this.body, 0, 470);')
    require_snippet(
        SUMMON_TS,
        'createLabel("单抽 10 钻石，十连 90 钻石。重复英雄转为碎片", 20, { color: MUTED, width: 640 }),',
    )
    require_snippet(SUMMON_TS, "0,\n      410")
    require_snippet(
        SUMMON_TS,
        "createLabel(ownedDiamondText(this.host.diamond()), 24, { color: TITLE, width: 640 }),",
    )
    require_snippet(SUMMON_TS, "0,\n      350")
    require_snippet(
        SUMMON_TS,
        "createButton(singleButtonText(), () => void this.pull(1), 460, 68, SINGLE_FILL),",
    )
    require_snippet(SUMMON_TS, "0,\n      260")
    require_snippet(
        SUMMON_TS,
        "createButton(tenButtonText(), () => void this.pull(10), 460, 68, TEN_FILL),",
    )
    require_snippet(SUMMON_TS, "0,\n      170")
    require_snippet(SUMMON_TS, 'place(createLabel("本次结果", 22, { color: MUTED }), this.body, 0, 90);')
    require_snippet(
        SUMMON_TS,
        'place(createRect("result-bg", 640, 300, new Color(16, 28, 48, 255)), this.body, 0, -90);',
    )
    require_snippet(SUMMON_TS, "createLabel(summonResultText([]), 18, {")
    require_snippet(SUMMON_TS, "color: RESULT,")
    require_snippet(SUMMON_TS, "width: 600,")
    require_snippet(SUMMON_TS, "height: 270,")
    require_snippet(SUMMON_TS, 'align: "left",')
    require_snippet(SUMMON_TS, "0,\n      -90")
    require_snippet(
        SUMMON_TS,
        'createLabel("新英雄出现在底栏「英雄」。碎片可在背包查看", 18, { color: MUTED, width: 640 }),',
    )
    require_snippet(SUMMON_TS, "0,\n      -280")
    require_snippet(
        SUMMON_TS,
        'place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -360);',
    )

    require_snippet(PULL_TS, "export const SUMMON_SINGLE_COST = 10;")
    require_snippet(PULL_TS, "export const SUMMON_TEN_COST = 90;")
    require_snippet(PULL_TS, 'return "召唤一次（钻石 " + SUMMON_SINGLE_COST + "）";')
    require_snippet(PULL_TS, 'return "召唤十次（钻石 " + SUMMON_TEN_COST + "）";')
    require_snippet(PULL_TS, 'return "持有钻石 " + value;')
    require_snippet(PULL_TS, 'if (!drops || drops.length === 0) return "还没有召唤。新英雄会进入英雄列表";')
    require_snippet(SESSION_TS, "export const MOCK_STARTER_DIAMOND = 20;")

    single_cost = ts_int(PULL_TS, "SUMMON_SINGLE_COST")
    ten_cost = ts_int(PULL_TS, "SUMMON_TEN_COST")
    starter = ts_int(SESSION_TS, "MOCK_STARTER_DIAMOND")
    if single_cost != 10 or ten_cost != 90:
        raise SystemExit("summon costs drifted: %s %s" % (single_cost, ten_cost))
    if starter == FRESH_DIAMOND:
        raise SystemExit("starter diamond collapsed onto the prefab placeholder")

    single = single_button_text(single_cost)
    ten = ten_button_text(ten_cost)
    diamond = owned_diamond_text(FRESH_DIAMOND)
    result = summon_result_text([])
    hint = "单抽 10 钻石，十连 90 钻石。重复英雄转为碎片"
    footer = "新英雄出现在底栏「英雄」。碎片可在背包查看"
    if single != "召唤一次（钻石 10）":
        raise SystemExit("single label drifted: " + single)
    if ten != "召唤十次（钻石 90）":
        raise SystemExit("ten label drifted: " + ten)
    if diamond != "持有钻石 0":
        raise SystemExit("diamond placeholder drifted: " + diamond)
    if result != "还没有召唤。新英雄会进入英雄列表":
        raise SystemExit("empty result drifted: " + result)
    if "10" not in hint or "90" not in hint:
        raise SystemExit("hint does not name both costs")
    return {
        "hint": hint,
        "diamond": diamond,
        "single": single,
        "ten": ten,
        "result_title": "本次结果",
        "result": result,
        "footer": footer,
        "starter_diamond": starter,
    }


def load_sprite_frame(rel):
    meta_path = os.path.join(RES, rel + ".meta")
    with open(meta_path, encoding="utf-8") as handle:
        data = json.load(handle)
    sub = data.get("subMetas", {}).get("f9941")
    if not sub or sub.get("importer") != "sprite-frame":
        raise SystemExit("missing sprite-frame f9941 in " + meta_path)
    value = sub.get("uuid") or ""
    if not value.endswith("@f9941"):
        raise SystemExit("spriteFrame uuid is not @f9941: " + meta_path)
    return value


def load_font_uuid():
    with open(FONT_META, encoding="utf-8") as handle:
        data = json.load(handle)
    value = data.get("uuid") or ""
    if data.get("importer") != "ttf-font" or len(value) < 32:
        raise SystemExit("font meta missing uuid: " + FONT_META)
    return value


SF = {key: load_sprite_frame(rel) for key, rel in SPRITE_FILES.items()}
FONT = load_font_uuid()

WHITE = color(255, 255, 255, 255)
TITLE_COLOR = color(255, 228, 170, 255)
MUTED = color(190, 205, 225, 255)
RESULT = color(214, 224, 236, 255)
PAGE_BG = color(8, 16, 32, 255)
CARD_BG = color(16, 28, 48, 255)
SINGLE_FILL = color(168, 116, 42, 255)
TEN_FILL = color(120, 72, 168, 255)
BACK_FILL = color(36, 72, 120, 255)


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

    def add_sprite(self, node_id, sf_uuid, typ=1, size_mode=0, col=None, grayscale=False):
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
            "_spriteFrame": uuid_ref(sf_uuid),
            "_type": typ,
            "_fillType": 0,
            "_sizeMode": size_mode,
            "_fillCenter": vec2(0, 0),
            "_fillStart": 0,
            "_fillRange": 0,
            "_isTrimmedMode": True,
            "_useGrayscale": grayscale,
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

    def add_button(self, node_id, normal_sf, pressed_sf):
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
            "_transition": 3,
            "_normalColor": WHITE,
            "_hoverColor": color(211, 211, 211, 255),
            "_pressedColor": color(200, 200, 200, 255),
            "_disabledColor": color(124, 124, 124, 255),
            "_normalSprite": uuid_ref(normal_sf),
            "_hoverSprite": uuid_ref(normal_sf),
            "_pressedSprite": uuid_ref(pressed_sf),
            "_disabledSprite": uuid_ref(normal_sf),
            "_duration": 0.1,
            "_zoomScale": 1.05,
            "_target": ref(node_id),
            "_id": "",
        }
        return self.append_comp(node_id, btn, self.path_of[node_id] + ":Button")

    def make_label_node(
        self, name, parent_id, x, y, w, h, text, font_size, col,
        h_align=1, v_align=1, wrap=False, outline=False, active=True,
    ):
        nid = self.make_node(name, parent_id, x, y, w, h, active=active)
        self.add_label(
            nid, text, font_size, col,
            h_align=h_align, v_align=v_align, wrap=wrap, outline=outline,
        )
        return nid

    def make_sprite_node(self, name, parent_id, x, y, w, h, sf, col=None, grayscale=False):
        nid = self.make_node(name, parent_id, x, y, w, h)
        self.add_sprite(nid, sf, col=col, grayscale=grayscale)
        return nid

    def make_button(self, name, parent_id, x, y, w, h, text, font_size, bg, pressed, grayscale=False, col=None):
        nid = self.make_node(name, parent_id, x, y, w, h)
        self.add_sprite(nid, bg, col=col, grayscale=grayscale)
        self.add_button(nid, bg, pressed)
        self.make_label_node("Label", nid, 0, 0, w - 16, h - 8, text, font_size, WHITE, outline=True)
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

    def child_names(self, path):
        node = self.objs[self.id_of(path)]
        return [self.objs[child["__id__"]]["_name"] for child in node["_children"]]

    def expect(self, path, x, y, w, h, text=None, active=True):
        node = self.objs[self.id_of(path)]
        pos = node["_lpos"]
        if pos["x"] != x or pos["y"] != y:
            raise SystemExit("%s position %s,%s != %s,%s" % (path, pos["x"], pos["y"], x, y))
        aw, ah = self.size_of(path)
        if aw != w or ah != h:
            raise SystemExit("%s size %s,%s != %s,%s" % (path, aw, ah, w, h))
        if bool(node["_active"]) != bool(active):
            raise SystemExit("%s active=%s" % (path, node["_active"]))
        if text is not None and self.label_of(path) != text:
            raise SystemExit("%s text %r" % (path, self.label_of(path)))

    def expect_align(self, path, h_align, v_align=1):
        lab = self.label_comp(path)
        if lab["_horizontalAlign"] != h_align or lab["_verticalAlign"] != v_align:
            raise SystemExit(
                "%s align %s,%s" % (path, lab["_horizontalAlign"], lab["_verticalAlign"])
            )

    def expect_wrap(self, path, enabled):
        lab = self.label_comp(path)
        if bool(lab["_enableWrapText"]) != bool(enabled):
            raise SystemExit("%s wrap=%s" % (path, lab["_enableWrapText"]))

    def expect_font(self, path, font_size):
        lab = self.label_comp(path)
        if lab["_fontSize"] != font_size:
            raise SystemExit("%s font %s" % (path, lab["_fontSize"]))

    def expect_label_color(self, path, tint):
        got = self.label_comp(path)["_color"]
        if (got["r"], got["g"], got["b"], got["a"]) != (tint["r"], tint["g"], tint["b"], tint["a"]):
            raise SystemExit("%s label color %s" % (path, got))

    def expect_tint(self, path, tint):
        got = self.sprite_of(path)["_color"]
        if (got["r"], got["g"], got["b"], got["a"]) != (tint["r"], tint["g"], tint["b"], tint["a"]):
            raise SystemExit("%s tint %s" % (path, got))

    def expect_sprite(self, path, sf_uuid):
        got = self.sprite_of(path)["_spriteFrame"]["__uuid__"]
        if got != sf_uuid:
            raise SystemExit("%s sprite %s" % (path, got))

    def expect_grayscale(self, path, enabled):
        got = self.sprite_of(path)["_useGrayscale"]
        if bool(got) != bool(enabled):
            raise SystemExit("%s grayscale=%s" % (path, got))


def label_box(font_size, width):
    """createLabel default: width argument or 680, height = fontSize + 16."""
    return width, font_size + 16


def build_summon(copy):
    b = Builder("SummonPage")
    root = b.make_node("SummonPage", None, 0, 0, PAGE_W, PAGE_H)
    if root != 1:
        raise SystemExit("root id drifted")

    # Deep-blue page fill. The code paints a rect on the page root; the prefab
    # tints common win-bg and keeps Bg beside the content, same as Idle.
    b.make_sprite_node("Bg", root, 0, 0, PAGE_W, PAGE_H, SF["win_bg"], col=PAGE_BG)
    title_w, title_h = label_box(40, 680)
    b.make_label_node("Title", root, 0, 470, title_w, title_h, "召唤", 40, TITLE_COLOR, outline=True)
    hint_w, hint_h = label_box(20, 640)
    b.make_label_node("Hint", root, 0, 410, hint_w, hint_h, copy["hint"], 20, MUTED)
    diamond_w, diamond_h = label_box(24, 640)
    b.make_label_node("Diamond", root, 0, 350, diamond_w, diamond_h, copy["diamond"], 24, TITLE_COLOR)
    b.make_button(
        "BtnSingle", root, 0, 260, 460, 68, copy["single"], 24,
        SF["btn_orange"], SF["btn_orange_p"],
    )
    # TEN_FILL is purple. There is no purple button art. Blue is the first
    # substitute in the spec; tint it so it does not read as the back button.
    # Green stays in the sprite table and is unused on this page.
    b.make_button(
        "BtnTen", root, 0, 170, 460, 68, copy["ten"], 24,
        SF["btn_blue"], SF["btn_blue_p"], col=TEN_FILL,
    )
    # No width in createLabel, so this is the 680 default, height 22 + 16.
    result_title_w, result_title_h = label_box(22, 680)
    b.make_label_node(
        "ResultTitle", root, 0, 90, result_title_w, result_title_h, copy["result_title"], 22, MUTED,
    )
    b.make_sprite_node("ResultCard", root, 0, -90, 640, 300, SF["block"], col=CARD_BG)
    b.make_label_node(
        "Result", root, 0, -90, 600, 270, copy["result"], 18, RESULT,
        h_align=0, v_align=0, wrap=True,
    )
    footer_w, footer_h = label_box(18, 640)
    b.make_label_node("Footer", root, 0, -280, footer_w, footer_h, copy["footer"], 18, MUTED)
    b.make_button(
        "BtnBack", root, 0, -360, 240, 48, "返回", 24,
        SF["btn_blue"], SF["btn_blue_p"],
    )
    check_summon(b, copy)
    return b


def check_summon(b, copy):
    b.expect("SummonPage", 0, 0, PAGE_W, PAGE_H)
    b.expect("SummonPage/Bg", 0, 0, PAGE_W, PAGE_H)
    b.expect_tint("SummonPage/Bg", PAGE_BG)
    b.expect_sprite("SummonPage/Bg", SF["win_bg"])
    b.expect("SummonPage/Title", 0, 470, 680, 56, "召唤")
    b.expect_font("SummonPage/Title", 40)
    b.expect_label_color("SummonPage/Title", TITLE_COLOR)
    b.expect("SummonPage/Hint", 0, 410, 640, 36, copy["hint"])
    b.expect_font("SummonPage/Hint", 20)
    b.expect_label_color("SummonPage/Hint", MUTED)
    b.expect("SummonPage/Diamond", 0, 350, 640, 40, copy["diamond"])
    b.expect_font("SummonPage/Diamond", 24)
    b.expect_label_color("SummonPage/Diamond", TITLE_COLOR)
    b.expect("SummonPage/BtnSingle", 0, 260, 460, 68, copy["single"])
    b.expect_sprite("SummonPage/BtnSingle", SF["btn_orange"])
    b.expect_tint("SummonPage/BtnSingle", WHITE)
    b.expect_font("SummonPage/BtnSingle", 24)
    b.expect_grayscale("SummonPage/BtnSingle", False)
    b.expect("SummonPage/BtnTen", 0, 170, 460, 68, copy["ten"])
    b.expect_sprite("SummonPage/BtnTen", SF["btn_blue"])
    b.expect_tint("SummonPage/BtnTen", TEN_FILL)
    b.expect_font("SummonPage/BtnTen", 24)
    b.expect_grayscale("SummonPage/BtnTen", False)
    b.expect("SummonPage/ResultTitle", 0, 90, 680, 38, copy["result_title"])
    b.expect_font("SummonPage/ResultTitle", 22)
    b.expect_label_color("SummonPage/ResultTitle", MUTED)
    b.expect("SummonPage/ResultCard", 0, -90, 640, 300)
    b.expect_tint("SummonPage/ResultCard", CARD_BG)
    b.expect_sprite("SummonPage/ResultCard", SF["block"])
    b.expect("SummonPage/Result", 0, -90, 600, 270, copy["result"])
    b.expect_font("SummonPage/Result", 18)
    b.expect_label_color("SummonPage/Result", RESULT)
    b.expect_align("SummonPage/Result", 0, 0)
    b.expect_wrap("SummonPage/Result", True)
    b.expect("SummonPage/Footer", 0, -280, 640, 34, copy["footer"])
    b.expect_font("SummonPage/Footer", 18)
    b.expect_label_color("SummonPage/Footer", MUTED)
    b.expect("SummonPage/BtnBack", 0, -360, 240, 48, "返回")
    b.expect_sprite("SummonPage/BtnBack", SF["btn_blue"])
    b.expect_tint("SummonPage/BtnBack", WHITE)
    b.expect_font("SummonPage/BtnBack", 24)
    names = b.child_names("SummonPage")
    expected = [
        "Bg", "Title", "Hint", "Diamond", "BtnSingle", "BtnTen",
        "ResultTitle", "ResultCard", "Result", "Footer", "BtnBack",
    ]
    if names != expected:
        raise SystemExit("summon children %s" % names)
    for banned in ("Wire", "Top", "Bottom", "PanelList", "BtnClaim", "BtnQuick", "ListHost", "RowsHost"):
        if banned in names:
            raise SystemExit("summon page picked up " + banned)
    if b.child_names("SummonPage/BtnSingle") != ["Label"]:
        raise SystemExit("single button label is not a child")
    if b.child_names("SummonPage/BtnTen") != ["Label"]:
        raise SystemExit("ten button label is not a child")
    if b.child_names("SummonPage/BtnBack") != ["Label"]:
        raise SystemExit("back button label is not a child")
    if copy["diamond"] != "持有钻石 0":
        raise SystemExit("diamond placeholder drifted: " + copy["diamond"])
    if copy["result"] != "还没有召唤。新英雄会进入英雄列表":
        raise SystemExit("empty result drifted: " + copy["result"])
    if copy["single"] != "召唤一次（钻石 10）" or copy["ten"] != "召唤十次（钻石 90）":
        raise SystemExit("button copy drifted")
    # Orange and blue art already carry SINGLE_FILL / BACK_FILL. Only the
    # purple ten-pull has no matching sheet, so only BtnTen is tinted.
    if (SINGLE_FILL["r"], SINGLE_FILL["g"], SINGLE_FILL["b"], SINGLE_FILL["a"]) != (168, 116, 42, 255):
        raise SystemExit("single fill drifted")
    if (BACK_FILL["r"], BACK_FILL["g"], BACK_FILL["b"], BACK_FILL["a"]) != (36, 72, 120, 255):
        raise SystemExit("back fill drifted")
    check_common(b)


def check_common(b):
    file_ids = []
    known = set(SF.values()) | {FONT}
    for obj in b.objs:
        if "fileId" in obj:
            file_ids.append(obj["fileId"])
            if len(obj["fileId"]) != 22:
                raise SystemExit("bad fileId " + obj["fileId"])
        if obj.get("__type__") == "cc.Button":
            if obj.get("clickEvents") != []:
                raise SystemExit("button clickEvents must stay empty")
            if obj.get("_transition") != 3:
                raise SystemExit("button transition is not scale")
        if obj.get("__type__") == "cc.Graphics":
            raise SystemExit("prefab must not embed Graphics; use a spriteFrame")
        for key in ("_spriteFrame", "_font", "_normalSprite", "_hoverSprite", "_pressedSprite", "_disabledSprite"):
            val = obj.get(key)
            if isinstance(val, dict) and "__uuid__" in val:
                if val["__uuid__"] not in known:
                    raise SystemExit("unknown uuid " + val["__uuid__"])
                if key != "_font" and not val["__uuid__"].endswith("@f9941"):
                    raise SystemExit("sprite uuid is not @f9941: " + val["__uuid__"])
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


def write_prefab(builder):
    path = os.path.join(OUT_DIR, builder.prefab_name + ".prefab")
    meta_path = path + ".meta"
    os.makedirs(OUT_DIR, exist_ok=True)
    text = json.dumps(builder.objs, ensure_ascii=False, indent=2) + "\n"
    if ".png" in text or "resources/" in text or "USE_" in text:
        raise SystemExit("prefab embedded a file path or a load flag")
    if "WireSummon" in text:
        raise SystemExit("mock prefab embedded a wire name")
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
    print("Objects", len(builder.objs))
    print("NODE_TREE_START")
    walk(builder, 1, 0)
    print("NODE_TREE_END")
    return prefab_uuid


def walk(builder, nid, indent):
    node = builder.objs[nid]
    flag = "" if node.get("_active", True) else " [inactive]"
    print("  " * indent + node["_name"] + flag)
    for child in node["_children"]:
        walk(builder, child["__id__"], indent + 1)


def write_dir_meta():
    if os.path.exists(DIR_META):
        print("Keep", DIR_META)
        return
    meta = {
        "ver": "1.2.0",
        "importer": "directory",
        "imported": True,
        "uuid": str(uuid.uuid4()),
        "files": [],
        "subMetas": {},
        "userData": {},
    }
    with open(DIR_META, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(meta, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print("Wrote", DIR_META)


def reject_png():
    for dirpath, _dirs, files in os.walk(OUT_DIR):
        for name in files:
            if name.lower().endswith(".png"):
                raise SystemExit("png under prefabs: " + os.path.join(dirpath, name))
    wire_prefab = os.path.join(OUT_DIR, "WireSummonPage.prefab")
    if os.path.exists(wire_prefab):
        raise SystemExit("wire prefab must not be written: " + wire_prefab)


def main():
    copy = load_copy()
    if copy["result"] != "还没有召唤。新英雄会进入英雄列表":
        raise SystemExit("empty result drifted: " + copy["result"])
    if copy["diamond"] != "持有钻石 0":
        raise SystemExit("diamond placeholder drifted: " + copy["diamond"])
    if copy["starter_diamond"] != 20:
        raise SystemExit("starter diamond drifted: %s" % copy["starter_diamond"])
    page = build_summon(copy)
    write_dir_meta()
    write_prefab(page)
    reject_png()
    print("OK")
    print("DIAMOND", copy["diamond"])
    print("SINGLE", copy["single"])
    print("TEN", copy["ten"])
    print("RESULT", copy["result"])


if __name__ == "__main__":
    main()
