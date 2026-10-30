# -*- coding: utf-8 -*-
"""Generate the Creator 3.8.8 BuyGold prefab (Wire only, not wired).

Writes:
  client/assets/prefabs/ui/buygold/WireBuyGoldPage.prefab
and its .meta file, plus ui/buygold.meta if it is missing.

WireBuyGoldPage is the readonly real-server page. Layout matches
WireActivityController in WireActivityPage.ts and the copy in wireActivity.ts
(s2c 17000 / GResBuyGoldLog). The code root stays WireActivityPage; the prefab
root is WireBuyGoldPage so the file lives under buygold/.

There is no Mock BuyGold page. DailyGoldPage is the daily gold dungeon, not
this screen. This script does not invent a second prefab.

SpriteFrame uuids come from client/assets/resources/**/*.meta (@f9941).
Does not touch Boot, MainApp, page scripts, or USE_*_PREFAB flags.
No buygold atlas: page chrome is common win-bg and the blue button.

File ids are hashed from node paths, so the prefab body is stable.
An existing .meta uuid is kept, so a second run rewrites the same files.
"""
import hashlib
import json
import os
import re
import uuid
import base64

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RES = os.path.join(ROOT, "client", "assets", "resources")
OUT_DIR = os.path.join(ROOT, "client", "assets", "prefabs", "ui", "buygold")
DIR_META = OUT_DIR + ".meta"
FONT_META = os.path.join(RES, "font", "FZCSJW-GB1-0.ttf.meta")

WIRE_TS = os.path.join(ROOT, "client", "assets", "scripts", "ui", "WireActivityPage.ts")
WIRE_PROTO = os.path.join(ROOT, "client", "assets", "scripts", "net", "protocol", "wireActivity.ts")

SPRITE_FILES = {
    "win_bg": "ui/common/win-bg_win-bg-12.png",
    "btn_blue": "ui/common/button_btn-blue-big-1.png",
    "btn_blue_p": "ui/common/button_btn-blue-big-2.png",
}

LAYER_UI = 33554432
PAGE_W = 720
PAGE_H = 1280
# render(): unsynced label at y=280; synced content starts at top=320, step 44.
# A stamp, when present, occupies y=320 and then top drops by 44 before Empty
# and the rows. The prefab stores the no-stamp coordinates from the spec table
# (rows at 320 - i*44, Empty at 320). Default preview is the unsynced state.
TOP = 320
STEP = 44
UNSYNCED_Y = 280
BACK_Y = -460
# Hidden overflow placeholder. Runtime text is "还有 N 条".
MORE_TEXT = "还有 2 条"
# Hidden stamp sample: status is present, time is absent, so numText writes 无.
STAMP_STATUS = 1
STAMP_TIME = None


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


def ts_string(path, name):
    match = re.search(r'export const %s = "([^"]*)";' % re.escape(name), read_text(path))
    if not match:
        raise SystemExit("missing const %s in %s" % (name, path))
    return match.group(1)


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


def num_text(value):
    """Same word as numText. null stays 无 and is not written as 0."""
    if value is None:
        return "无"
    return str(int(value))


def format_wire_activity_line(idx, num):
    """Same concatenation as formatWireActivityLine."""
    return "idx=" + num_text(idx) + " / num=" + num_text(num)


def format_wire_activity_stamp(status, time_value):
    """Same concatenation as formatWireActivityStamp. Both missing returns None."""
    if status is None and time_value is None:
        return None
    return "status=" + num_text(status) + " / time=" + num_text(time_value)


def load_copy():
    """Pull the strings and coordinates the prefab is standing in for."""
    require_snippet(WIRE_TS, "const PAGE_BG = new Color(8, 16, 32, 255);")
    require_snippet(WIRE_TS, "const TITLE = new Color(255, 228, 170, 255);")
    require_snippet(WIRE_TS, "const MUTED = new Color(190, 205, 225, 255);")
    require_snippet(WIRE_TS, "const BACK_FILL = new Color(36, 72, 120, 255);")
    require_snippet(WIRE_TS, "const VISIBLE_ROWS = 10;")
    require_snippet(WIRE_TS, 'this.node = uiNode("WireActivityPage");')
    require_snippet(WIRE_TS, 'place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);')
    require_snippet(WIRE_TS, 'this.listHost = place(uiNode("list-host"), this.body, 0, 0);')
    require_snippet(
        WIRE_TS,
        "place(createLabel(WIRE_ACTIVITY_READONLY_TITLE, 40, { color: TITLE }), this.body, 0, 470);",
    )
    require_snippet(
        WIRE_TS,
        "place(createLabel(WIRE_ACTIVITY_READONLY_NOTE, 22, { color: MUTED, width: 640 }), this.body, 0, 420);",
    )
    require_snippet(
        WIRE_TS,
        "place(createLabel(WIRE_ACTIVITY_FIELD_NOTE, 20, { color: MUTED, width: 640 }), this.body, 0, 380);",
    )
    require_snippet(
        WIRE_TS,
        'place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -460);',
    )
    require_snippet(WIRE_TS, 'const rows = uiNode("rows");')
    require_snippet(WIRE_TS, "rows.parent = this.listHost;")
    require_snippet(
        WIRE_TS,
        "place(createLabel(WIRE_ACTIVITY_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 280);",
    )
    require_snippet(WIRE_TS, "const stamp = formatWireActivityStamp(snap);")
    require_snippet(WIRE_TS, "let top = 320;")
    require_snippet(
        WIRE_TS,
        "place(createLabel(stamp, 22, { color: MUTED, width: 640 }), rows, 0, top);",
    )
    require_snippet(WIRE_TS, "top -= 44;")
    require_snippet(
        WIRE_TS,
        "place(createLabel(WIRE_ACTIVITY_EMPTY, 28, { color: TITLE, width: 640 }), rows, 0, top);",
    )
    require_snippet(WIRE_TS, "const visible = Math.min(snap.rows.length, VISIBLE_ROWS);")
    require_snippet(WIRE_TS, "align: \"left\",")
    require_snippet(WIRE_TS, "top - i * 44")
    require_snippet(
        WIRE_TS,
        '"还有 " + (snap.rows.length - visible) + " 条"',
    )

    require_snippet(WIRE_PROTO, 'export const WIRE_ACTIVITY_CMD = "wire.17000";')
    require_snippet(WIRE_PROTO, 'return "idx=" + numText(row.idx) + " / num=" + numText(row.num);')
    require_snippet(
        WIRE_PROTO,
        'return "status=" + numText(snap.status) + " / time=" + numText(snap.time);',
    )
    require_snippet(WIRE_PROTO, 'return value === null ? "无" : String(value);')
    require_snippet(WIRE_PROTO, "idx 为 1 / 2 / 3，num 都是 0。")
    require_snippet(WIRE_PROTO, "s2c 是 GResBuyGoldLog")

    visible = ts_int(WIRE_TS, "VISIBLE_ROWS")
    if visible != 10:
        raise SystemExit("VISIBLE_ROWS drifted to %s" % visible)

    title = ts_string(WIRE_PROTO, "WIRE_ACTIVITY_READONLY_TITLE")
    note = ts_string(WIRE_PROTO, "WIRE_ACTIVITY_READONLY_NOTE")
    status = ts_string(WIRE_PROTO, "WIRE_ACTIVITY_FIELD_NOTE")
    empty = ts_string(WIRE_PROTO, "WIRE_ACTIVITY_EMPTY")
    unsynced = ts_string(WIRE_PROTO, "WIRE_ACTIVITY_UNSYNCED_TOAST")
    if title != "点金（真服只读）":
        raise SystemExit("wire title drifted: " + title)
    if note != "只读。不点金，不写金币":
        raise SystemExit("wire note drifted: " + note)
    if status != "status、time 写原数。行上写 idx / num":
        raise SystemExit("wire field note drifted: " + status)
    if empty != "已同步空表":
        raise SystemExit("wire empty drifted: " + empty)
    if unsynced != "真服未同步":
        raise SystemExit("wire unsynced drifted: " + unsynced)

    stamp = format_wire_activity_stamp(STAMP_STATUS, STAMP_TIME)
    if stamp != "status=1 / time=无":
        raise SystemExit("stamp sample drifted: " + str(stamp))
    if format_wire_activity_stamp(None, None) is not None:
        raise SystemExit("missing stamp must stay empty")

    rows = []
    for i in range(visible):
        rows.append(format_wire_activity_line(i + 1, 0))
    expected_head = ("idx=1 / num=0", "idx=2 / num=0", "idx=3 / num=0")
    if tuple(rows[:3]) != expected_head:
        raise SystemExit("log row shape drifted: %s" % rows[:3])
    if rows[-1] != "idx=10 / num=0":
        raise SystemExit("last row drifted: " + rows[-1])

    return {
        "visible": visible,
        "title": title,
        "note": note,
        "status": status,
        "empty": empty,
        "unsynced": unsynced,
        "stamp": stamp,
        "rows": rows,
        "more": MORE_TEXT,
    }


SF = {key: load_sprite_frame(rel) for key, rel in SPRITE_FILES.items()}
FONT = load_font_uuid()

WHITE = color(255, 255, 255, 255)
TITLE_COLOR = color(255, 228, 170, 255)
MUTED = color(190, 205, 225, 255)
PAGE_BG = color(8, 16, 32, 255)


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

    def add_sprite(self, node_id, sf_uuid, typ=1, size_mode=0, col=None):
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

    def make_sprite_node(self, name, parent_id, x, y, w, h, sf, col=None):
        nid = self.make_node(name, parent_id, x, y, w, h)
        self.add_sprite(nid, sf, col=col)
        return nid

    def make_button(self, name, parent_id, x, y, w, h, text, font_size, bg, pressed):
        nid = self.make_node(name, parent_id, x, y, w, h)
        self.add_sprite(nid, bg)
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

    def button_of(self, path):
        node = self.objs[self.id_of(path)]
        for cref in node["_components"]:
            comp = self.objs[cref["__id__"]]
            if comp.get("__type__") == "cc.Button":
                return comp
        raise SystemExit("missing button on " + path)

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


def label_box(font_size, width):
    return width, font_size + 16


def build_wire(copy):
    b = Builder("WireBuyGoldPage")
    root = b.make_node("WireBuyGoldPage", None, 0, 0, PAGE_W, PAGE_H)
    if root != 1:
        raise SystemExit("root id drifted")

    # Deep-blue page fill. The code paints a rect on the page root;
    # the prefab tints common win-bg. Content sits beside Bg, not under body.
    b.make_sprite_node("Bg", root, 0, 0, PAGE_W, PAGE_H, SF["win_bg"], col=PAGE_BG)
    title_w, title_h = label_box(40, 680)
    b.make_label_node(
        "Title", root, 0, 470, title_w, title_h, copy["title"], 40, TITLE_COLOR, outline=True,
    )
    note_w, note_h = label_box(22, 640)
    b.make_label_node("Note", root, 0, 420, note_w, note_h, copy["note"], 22, MUTED)
    status_w, status_h = label_box(20, 640)
    b.make_label_node("Status", root, 0, 380, status_w, status_h, copy["status"], 20, MUTED)

    # Hosts sit at the page origin so child y matches place() on the code page.
    # Runtime render() destroys and rebuilds rows; these children are a preview.
    # Default is unsynced: only Unsynced is active.
    list_host = b.make_node("ListHost", root, 0, 0, PAGE_W, PAGE_H)
    rows = b.make_node("Rows", list_host, 0, 0, PAGE_W, PAGE_H)
    state_w, state_h = label_box(28, 640)
    b.make_label_node(
        "Unsynced", rows, 0, UNSYNCED_Y, state_w, state_h, copy["unsynced"], 28, TITLE_COLOR, active=True,
    )
    stamp_w, stamp_h = label_box(22, 640)
    b.make_label_node(
        "Stamp", rows, 0, TOP, stamp_w, stamp_h, copy["stamp"], 22, MUTED, active=False,
    )
    b.make_label_node(
        "Empty", rows, 0, TOP, state_w, state_h, copy["empty"], 28, TITLE_COLOR, active=False,
    )
    row_w, row_h = label_box(22, 640)
    for i, text in enumerate(copy["rows"]):
        b.make_label_node(
            "Row_%d" % i, rows, 0, TOP - i * STEP, row_w, row_h, text, 22, TITLE_COLOR,
            h_align=0, active=False,
        )
    more_w, more_h = label_box(20, 640)
    b.make_label_node(
        "More", rows, 0, TOP - copy["visible"] * STEP, more_w, more_h, copy["more"], 20, MUTED, active=False,
    )
    # Back uses createButton's default font size (24) and the blue button art.
    b.make_button(
        "BtnBack", root, 0, BACK_Y, 240, 48, "返回", 24,
        SF["btn_blue"], SF["btn_blue_p"],
    )
    check_wire(b, copy)
    return b


def check_wire(b, copy):
    root = "WireBuyGoldPage"
    b.expect(root, 0, 0, PAGE_W, PAGE_H)
    b.expect(root + "/Bg", 0, 0, PAGE_W, PAGE_H)
    b.expect_tint(root + "/Bg", PAGE_BG)
    b.expect_sprite(root + "/Bg", SF["win_bg"])
    b.expect(root + "/Title", 0, 470, 680, 56, copy["title"])
    b.expect_font(root + "/Title", 40)
    b.expect_label_color(root + "/Title", TITLE_COLOR)
    b.expect(root + "/Note", 0, 420, 640, 38, copy["note"])
    b.expect_font(root + "/Note", 22)
    b.expect_label_color(root + "/Note", MUTED)
    b.expect(root + "/Status", 0, 380, 640, 36, copy["status"])
    b.expect_font(root + "/Status", 20)
    b.expect_label_color(root + "/Status", MUTED)
    b.expect(root + "/ListHost", 0, 0, PAGE_W, PAGE_H)
    b.expect(root + "/ListHost/Rows", 0, 0, PAGE_W, PAGE_H)
    b.expect(
        root + "/ListHost/Rows/Unsynced", 0, UNSYNCED_Y, 640, 44, copy["unsynced"], active=True,
    )
    b.expect_font(root + "/ListHost/Rows/Unsynced", 28)
    b.expect_label_color(root + "/ListHost/Rows/Unsynced", TITLE_COLOR)
    b.expect(
        root + "/ListHost/Rows/Stamp", 0, TOP, 640, 38, copy["stamp"], active=False,
    )
    b.expect_font(root + "/ListHost/Rows/Stamp", 22)
    b.expect_label_color(root + "/ListHost/Rows/Stamp", MUTED)
    b.expect(
        root + "/ListHost/Rows/Empty", 0, TOP, 640, 44, copy["empty"], active=False,
    )
    b.expect_font(root + "/ListHost/Rows/Empty", 28)
    b.expect_label_color(root + "/ListHost/Rows/Empty", TITLE_COLOR)
    if len(copy["rows"]) != copy["visible"]:
        raise SystemExit("row count drifted")
    for i, text in enumerate(copy["rows"]):
        path = root + "/ListHost/Rows/Row_%d" % i
        b.expect(path, 0, TOP - i * STEP, 640, 38, text, active=False)
        b.expect_font(path, 22)
        b.expect_align(path, 0, 1)
        b.expect_label_color(path, TITLE_COLOR)
    more_y = TOP - copy["visible"] * STEP
    if more_y != -120:
        raise SystemExit("more y drifted to %s" % more_y)
    b.expect(
        root + "/ListHost/Rows/More", 0, more_y, 640, 36, copy["more"], active=False,
    )
    b.expect_font(root + "/ListHost/Rows/More", 20)
    b.expect_label_color(root + "/ListHost/Rows/More", MUTED)
    b.expect(root + "/BtnBack", 0, BACK_Y, 240, 48, "返回")
    b.expect_font(root + "/BtnBack", 24)
    b.expect_sprite(root + "/BtnBack", SF["btn_blue"])
    b.expect_tint(root + "/BtnBack", WHITE)
    back = b.button_of(root + "/BtnBack")
    if back["_pressedSprite"]["__uuid__"] != SF["btn_blue_p"]:
        raise SystemExit("back pressed sprite drifted")
    if back.get("clickEvents") != [] or back.get("_transition") != 3:
        raise SystemExit("back button is not a scale button with empty clickEvents")
    label_node = None
    back_node = b.objs[b.id_of(root + "/BtnBack")]
    for cref in back_node["_children"]:
        child = b.objs[cref["__id__"]]
        if child.get("_name") == "Label":
            label_node = child
    if label_node is None:
        raise SystemExit("back button is missing its child Label")
    names = [b.objs[i]["_name"] for i in b.path_of]
    for banned in (
        "body",
        "DailyGold",
        "DailyGoldPage",
        "MockBuyGold",
        "WireActivityPage",
        "PanelList",
        "RowsHost",
        "DetailHost",
        "Top",
        "Bottom",
        "BtnClaim",
        "BtnBuy",
    ):
        if banned in names:
            raise SystemExit("buygold page picked up " + banned)
    if names.count("Row_0") != 1 or names.count("Row_9") != 1 or "Row_10" in names:
        raise SystemExit("expected Row_0 through Row_9 and no Row_10")
    child_names = [b.objs[c["__id__"]]["_name"] for c in b.objs[b.id_of(root + "/ListHost/Rows")]["_children"]]
    expected_children = ["Unsynced", "Stamp", "Empty"] + ["Row_%d" % i for i in range(copy["visible"])] + ["More"]
    if child_names != expected_children:
        raise SystemExit("rows child order drifted: %s" % child_names)
    active_rows = [
        b.objs[c["__id__"]]["_name"]
        for c in b.objs[b.id_of(root + "/ListHost/Rows")]["_children"]
        if b.objs[c["__id__"]]["_active"]
    ]
    if active_rows != ["Unsynced"]:
        raise SystemExit("default preview must show only Unsynced, got %s" % active_rows)
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
    for banned in ("DailyGold", "MockBuyGold", "WireActivityPage"):
        if banned in text:
            raise SystemExit("prefab invented " + banned)
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


def main():
    copy = load_copy()
    page = build_wire(copy)
    write_dir_meta()
    write_prefab(page)
    print("OK")
    print("TITLE", copy["title"])
    print("NOTE", copy["note"])
    print("STATUS", copy["status"])
    print("UNSYNCED", copy["unsynced"])
    print("STAMP", copy["stamp"])
    print("EMPTY", copy["empty"])
    print("ROWS", " | ".join(copy["rows"]))
    print("MORE", copy["more"])


if __name__ == "__main__":
    main()
