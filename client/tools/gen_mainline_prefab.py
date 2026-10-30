# -*- coding: utf-8 -*-
"""Generate Creator 3.8.8 Mainline prefabs (P1, not wired).

Writes:
  client/assets/prefabs/ui/mainline/MainlinePage.prefab
  client/assets/prefabs/ui/mainline/WireMainlinePage.prefab
and their .meta files, plus ui/mainline.meta if it is missing.

Mock MainlinePage is three panels (list / battle / settle).
WireMainlinePage is a separate readonly screen. They do not share a root.

SpriteFrame uuids come from client/assets/resources/**/*.meta (@f9941).
Does not touch Boot, MainApp, page scripts, or USE_*_PREFAB flags.
"""
import hashlib
import json
import os
import re
import uuid
import base64

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RES = os.path.join(ROOT, "client", "assets", "resources")
OUT_DIR = os.path.join(ROOT, "client", "assets", "prefabs", "ui", "mainline")
DIR_META = OUT_DIR + ".meta"
FONT_META = os.path.join(RES, "font", "FZCSJW-GB1-0.ttf.meta")

MAINLINE_TS = os.path.join(ROOT, "client", "assets", "scripts", "ui", "MainlinePage.ts")
WIRE_TS = os.path.join(ROOT, "client", "assets", "scripts", "ui", "WireMainlinePage.ts")
BATTLE_TS = os.path.join(ROOT, "client", "assets", "scripts", "module", "mainline", "battle.ts")
CHAPTER_TS = os.path.join(ROOT, "client", "assets", "scripts", "net", "protocol", "wireChapter.ts")

SPRITE_FILES = {
    "win_bg": "ui/common/win-bg_win-bg-12.png",
    "block": "ui/common/win-bg_block-bg-5.png",
    "msg_bg": "ui/common/win-bg_msg-bg.png",
    "num_bg": "ui/common/win-bg_num-bg.png",
    "btn_blue": "ui/common/button_btn-blue-big-1.png",
    "btn_blue_p": "ui/common/button_btn-blue-big-2.png",
    "btn_orange": "ui/common/button_btn-orange-big-1.png",
    "btn_orange_p": "ui/common/button_btn-orange-big-2.png",
}

LAYER_UI = 33554432
PAGE_W = 720
PAGE_H = 1280


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


def load_copy():
    """Pull the strings and coordinates the prefabs are standing in for."""
    require_snippet(MAINLINE_TS, 'createLabel("主线关卡", 40, { color: TITLE }), this.body, 0, 470)')
    require_snippet(MAINLINE_TS, "320 - i * 68")
    require_snippet(MAINLINE_TS, "挑战当前关。战斗中可以跳过，撤退算失败")
    require_snippet(MAINLINE_TS, "createLabel(pushHint(), 16, { color: MUTED, width: 640 }), this.body, 0, -258)")
    require_snippet(MAINLINE_TS, 'createButton("返回主城", () => this.host.close(), 240, 52), this.body, 0, -330)')
    require_snippet(MAINLINE_TS, 'createButton(pushButtonText(), () => void this.pushToGoal(), 420, 52, DEBUG_FILL, 22)')
    require_snippet(MAINLINE_TS, "-200")
    require_snippet(MAINLINE_TS, 'createLabel("准备战斗", 22, { color: MUTED, width: 640 }), this.body, 0, 410)')
    require_snippet(MAINLINE_TS, 'createLabel("敌方", 18, { color: LOSE }), this.body, 0, 355)')
    require_snippet(MAINLINE_TS, 'createLabel("我方", 18, { color: ALLY_BAR }), this.body, 0, 165)')
    require_snippet(MAINLINE_TS, 'createRect("log-bg", 660, 110, new Color(10, 18, 32, 230)), this.body, 0, -80)')
    require_snippet(MAINLINE_TS, 'createButton("跳过", () => this.request("skip"), 200, 52), this.body, -140, -230)')
    require_snippet(MAINLINE_TS, 'createButton("撤退", () => this.request("retreat"), 200, 52, RETREAT_FILL), this.body, 140, -230)')
    require_snippet(MAINLINE_TS, 'const xs = [-220, 0, 220];')
    require_snippet(MAINLINE_TS, 'createLabel(win ? "胜利" : "失败", 56, { color: win ? WIN : LOSE }), this.body, 0, 430)')
    require_snippet(MAINLINE_TS, 'createButton("下一关", () => void this.begin(this.host.stageId()), 420, 64), this.body, 0, 10)')
    require_snippet(MAINLINE_TS, 'createButton("关卡列表", () => this.showList(), 240, 48, LIST_FILL), this.body, 0, -90)')
    require_snippet(MAINLINE_TS, 'createButton("返回主城", () => this.host.close(), 240, 48), this.body, 0, -170)')
    require_snippet(WIRE_TS, "createLabel(WIRE_MAINLINE_READONLY_TITLE, 40, { color: TITLE }), this.body, 0, 220)")
    require_snippet(WIRE_TS, "createLabel(this.nowText(), 28, { color: TITLE, width: 640 }), this.body, 0, 120)")
    require_snippet(WIRE_TS, "createLabel(this.maxText(), 28, { color: TITLE, width: 640 }), this.body, 0, 60)")
    require_snippet(WIRE_TS, "createLabel(WIRE_MAINLINE_READONLY_NOTE, 22, { color: MUTED, width: 640 }), this.body, 0, -20)")
    require_snippet(WIRE_TS, 'createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -140)')
    require_snippet(BATTLE_TS, 'return "推关到" + MAINLINE_PUSH_STAGE + "（调试）";')
    require_snippet(
        BATTLE_TS,
        'return "一关关仍可打。调试按钮连推到第" + MAINLINE_PUSH_STAGE + "关，每关金币 +" + STAGE_WIN_GOLD + "，不播战报";',
    )
    require_snippet(BATTLE_TS, 'const allyNames = [roleName, "护卫", "术士"];')
    require_snippet(BATTLE_TS, 'const enemyNames = ["前锋", "守卫", "术士"];')
    require_snippet(BATTLE_TS, '|| "勇者"')
    require_snippet(CHAPTER_TS, 'const name = kind === "now" ? "当前 idx" : "最高 idx";')
    require_snippet(CHAPTER_TS, 'if (idx === null) return name + " 未同步";')

    window = ts_int(BATTLE_TS, "WINDOW")
    push_stage = ts_int(BATTLE_TS, "MAINLINE_PUSH_STAGE")
    win_gold = ts_int(BATTLE_TS, "STAGE_WIN_GOLD")
    ally_hp = ts_int(BATTLE_TS, "ALLY_HP")
    enemy_hp = ts_int(BATTLE_TS, "ENEMY_HP")
    card_w = ts_int(MAINLINE_TS, "CARD_W")
    card_h = ts_int(MAINLINE_TS, "CARD_H")
    enemy_y = ts_int(MAINLINE_TS, "ENEMY_Y")
    ally_y = ts_int(MAINLINE_TS, "ALLY_Y")
    if window < 5:
        raise SystemExit("listStages window shrank below the spec minimum of 5")
    return {
        "window": window,
        "push_stage": push_stage,
        "push_label": "推到第%d关" % push_stage,
        "push_hint": "一关关仍可打。调试按钮连推到第%d关，每关金币 +%d，不播战报" % (push_stage, win_gold),
        "wire_title": ts_string(CHAPTER_TS, "WIRE_MAINLINE_READONLY_TITLE"),
        "wire_note": ts_string(CHAPTER_TS, "WIRE_MAINLINE_READONLY_NOTE"),
        "now": "当前 idx 未同步",
        "max": "最高 idx 未同步",
        "ally_hp": ally_hp,
        "enemy_hp": enemy_hp,
        "card_w": card_w,
        "card_h": card_h,
        "enemy_y": enemy_y,
        "ally_y": ally_y,
        "ally_names": ["勇者", "护卫", "术士"],
        "enemy_names": ["前锋", "守卫", "术士"],
        "unit_x": [-220, 0, 220],
    }


SF = {key: load_sprite_frame(rel) for key, rel in SPRITE_FILES.items()}
FONT = load_font_uuid()

WHITE = color(255, 255, 255, 255)
TITLE_COLOR = color(255, 228, 170, 255)
MUTED = color(190, 205, 225, 255)
PAGE_BG = color(8, 16, 32, 255)
LOSE = color(230, 120, 110, 255)
WIN_COLOR = color(255, 214, 120, 255)
ALLY_BG = color(28, 58, 96, 255)
ENEMY_BG = color(96, 40, 44, 255)
ALLY_BAR = color(88, 196, 120, 255)
ENEMY_BAR = color(220, 96, 96, 255)
LOG_COLOR = color(214, 224, 236, 255)
LOG_BG = color(10, 18, 32, 255)
NAME_COLOR = color(240, 240, 240, 255)


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

    def make_label_node(self, name, parent_id, x, y, w, h, text, font_size, col, h_align=1, v_align=1, wrap=False, outline=False):
        nid = self.make_node(name, parent_id, x, y, w, h)
        self.add_label(nid, text, font_size, col, h_align=h_align, v_align=v_align, wrap=wrap, outline=outline)
        return nid

    def make_sprite_node(self, name, parent_id, x, y, w, h, sf, col=None, grayscale=False):
        nid = self.make_node(name, parent_id, x, y, w, h)
        self.add_sprite(nid, sf, col=col, grayscale=grayscale)
        return nid

    def make_button(self, name, parent_id, x, y, w, h, text, font_size, bg, pressed, grayscale=False):
        nid = self.make_node(name, parent_id, x, y, w, h)
        self.add_sprite(nid, bg, grayscale=grayscale)
        self.add_button(nid, bg, pressed)
        self.make_label_node("Label", nid, 0, 0, w - 16, h - 8, text, font_size, WHITE, outline=True)
        return nid

    def id_of(self, path):
        for nid, node_path in self.path_of.items():
            if node_path == path:
                return nid
        raise SystemExit("missing node " + path)

    def label_of(self, path):
        node = self.objs[self.id_of(path)]
        for cref in node["_components"]:
            comp = self.objs[cref["__id__"]]
            if comp.get("__type__") == "cc.Label":
                return comp["_string"]
        for cref in node["_children"]:
            child = self.objs[cref["__id__"]]
            if child.get("_name") != "Label":
                continue
            for crefc in child["_components"]:
                comp = self.objs[crefc["__id__"]]
                if comp.get("__type__") == "cc.Label":
                    return comp["_string"]
        raise SystemExit("missing label on " + path)

    def size_of(self, path):
        node = self.objs[self.id_of(path)]
        uit = self.objs[node["_components"][0]["__id__"]]
        if uit.get("__type__") != "cc.UITransform":
            raise SystemExit("first component is not UITransform on " + path)
        box = uit["_contentSize"]
        return box["width"], box["height"]

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


def label_box(font_size, width):
    return width, font_size + 16


def build_mainline(copy):
    b = Builder("MainlinePage")
    root = b.make_node("MainlinePage", None, 0, 0, PAGE_W, PAGE_H)
    if root != 1:
        raise SystemExit("root id drifted")

    # Page background stays up while the three phases swap, same as the code
    # rect painted on the page root (not inside the cleared body).
    b.make_sprite_node("Bg", root, 0, 0, PAGE_W, PAGE_H, SF["win_bg"], col=PAGE_BG)

    panel_list = b.make_node("PanelList", root, 0, 0, PAGE_W, PAGE_H, active=True)
    title_w, title_h = label_box(40, 680)
    b.make_label_node("Title", panel_list, 0, 470, title_w, title_h, "主线关卡", 40, TITLE_COLOR, outline=True)
    prog_w, prog_h = label_box(20, 640)
    b.make_label_node(
        "Progress", panel_list, 0, 410, prog_w, prog_h,
        "已通关 0 关 · 当前第 1 关 · Lv1", 20, MUTED,
    )
    # Fresh session: stage 1, listStages window. Row 0 is the open stage.
    for i in range(copy["window"]):
        stage_id = 1 + i
        opened = i == 0
        suffix = "挑战" if opened else "未开启"
        b.make_button(
            "StageRow_%d" % i, panel_list, 0, 320 - i * 68, 560, 52,
            "第%d关    %s" % (stage_id, suffix), 22,
            SF["btn_blue"], SF["btn_blue_p"], grayscale=not opened,
        )
    hint_w, hint_h = label_box(18, 640)
    b.make_label_node(
        "Hint", panel_list, 0, -130, hint_w, hint_h,
        "挑战当前关。战斗中可以跳过，撤退算失败", 18, MUTED,
    )
    b.make_button(
        "BtnPush", panel_list, 0, -200, 420, 52, copy["push_label"], 22,
        SF["btn_orange"], SF["btn_orange_p"],
    )
    push_w, push_h = label_box(16, 640)
    b.make_label_node("PushHint", panel_list, 0, -258, push_w, push_h, copy["push_hint"], 16, MUTED)
    b.make_button(
        "BtnBack", panel_list, 0, -330, 240, 52, "返回主城", 24,
        SF["btn_blue"], SF["btn_blue_p"],
    )

    panel_battle = b.make_node("PanelBattle", root, 0, 0, PAGE_W, PAGE_H, active=False)
    b.make_label_node("Title", panel_battle, 0, 470, title_w, title_h, "第1关", 40, TITLE_COLOR, outline=True)
    round_w, round_h = label_box(22, 640)
    b.make_label_node("Round", panel_battle, 0, 410, round_w, round_h, "准备战斗", 22, MUTED)
    side_w, side_h = label_box(18, 680)
    b.make_label_node("EnemyLabel", panel_battle, 0, 355, side_w, side_h, "敌方", 18, LOSE)
    enemy_row = b.make_node("EnemyRow", panel_battle, 0, copy["enemy_y"], 660, copy["card_h"])
    add_units(b, enemy_row, copy["enemy_names"], copy["enemy_hp"], ENEMY_BG, ENEMY_BAR, copy)
    b.make_label_node("AllyLabel", panel_battle, 0, 165, side_w, side_h, "我方", 18, ALLY_BAR)
    ally_row = b.make_node("AllyRow", panel_battle, 0, copy["ally_y"], 660, copy["card_h"])
    add_units(b, ally_row, copy["ally_names"], copy["ally_hp"], ALLY_BG, ALLY_BAR, copy)
    b.make_sprite_node("LogBg", panel_battle, 0, -80, 660, 110, SF["msg_bg"], col=LOG_BG)
    b.make_label_node(
        "Log", panel_battle, 0, -80, 620, 96,
        "第1回合 · 我方突进\n第2回合 · 集火前排",
        18, LOG_COLOR, h_align=0, v_align=0, wrap=True,
    )
    b.make_button(
        "BtnSkip", panel_battle, -140, -230, 200, 52, "跳过", 24,
        SF["btn_blue"], SF["btn_blue_p"],
    )
    b.make_button(
        "BtnRetreat", panel_battle, 140, -230, 200, 52, "撤退", 24,
        SF["btn_orange"], SF["btn_orange_p"],
    )

    panel_settle = b.make_node("PanelSettle", root, 0, 0, PAGE_W, PAGE_H, active=False)
    result_w, result_h = label_box(56, 680)
    b.make_label_node("Result", panel_settle, 0, 430, result_w, result_h, "胜利", 56, WIN_COLOR, outline=True)
    sub_w, sub_h = label_box(22, 640)
    b.make_label_node("Sub", panel_settle, 0, 350, sub_w, sub_h, "第1关 · 通关", 22, MUTED)
    reward_w, reward_h = label_box(28, 640)
    b.make_label_node("Rewards", panel_settle, 0, 270, reward_w, reward_h, "金币 +0", 28, TITLE_COLOR)
    meta_w, meta_h = label_box(20, 640)
    b.make_label_node(
        "Meta", panel_settle, 0, 120, meta_w, meta_h,
        "Lv1 · 下一关 2 · 金币 0 · 钻石 0", 20, MUTED,
    )
    b.make_button(
        "BtnNext", panel_settle, 0, 10, 420, 64, "下一关", 24,
        SF["btn_blue"], SF["btn_blue_p"],
    )
    b.make_button(
        "BtnList", panel_settle, 0, -90, 240, 48, "关卡列表", 24,
        SF["btn_blue"], SF["btn_blue_p"],
    )
    b.make_button(
        "BtnBack", panel_settle, 0, -170, 240, 48, "返回主城", 24,
        SF["btn_blue"], SF["btn_blue_p"],
    )

    check_mainline(b, copy)
    return b


def add_units(builder, row_id, names, hp, bg_color, bar_color, copy):
    name_w, name_h = label_box(18, copy["card_w"] - 12)
    hp_w, hp_h = label_box(16, copy["card_w"] - 12)
    for i, unit_name in enumerate(names):
        unit = builder.make_node(
            "Unit_%d" % i, row_id, copy["unit_x"][i], 0, copy["card_w"], copy["card_h"]
        )
        builder.add_sprite(unit, SF["block"], col=bg_color)
        builder.make_label_node("Name", unit, 0, 28, name_w, name_h, unit_name, 18, NAME_COLOR)
        builder.make_label_node("Hp", unit, 0, 2, hp_w, hp_h, "%d/%d" % (hp, hp), 16, MUTED)
        builder.make_sprite_node("Bar", unit, 0, -32, 150, 10, SF["num_bg"], col=bar_color)


def build_wire(copy):
    b = Builder("WireMainlinePage")
    root = b.make_node("WireMainlinePage", None, 0, 0, PAGE_W, PAGE_H)
    if root != 1:
        raise SystemExit("root id drifted")
    b.make_sprite_node("Bg", root, 0, 0, PAGE_W, PAGE_H, SF["win_bg"], col=PAGE_BG)
    title_w, title_h = label_box(40, 680)
    b.make_label_node("Title", root, 0, 220, title_w, title_h, copy["wire_title"], 40, TITLE_COLOR, outline=True)
    now_w, now_h = label_box(28, 640)
    b.make_label_node("Now", root, 0, 120, now_w, now_h, copy["now"], 28, TITLE_COLOR)
    b.make_label_node("Max", root, 0, 60, now_w, now_h, copy["max"], 28, TITLE_COLOR)
    note_w, note_h = label_box(22, 640)
    b.make_label_node("Note", root, 0, -20, note_w, note_h, copy["wire_note"], 22, MUTED)
    b.make_button(
        "BtnBack", root, 0, -140, 240, 48, "返回", 24,
        SF["btn_blue"], SF["btn_blue_p"],
    )
    check_wire(b, copy)
    return b


def check_mainline(b, copy):
    b.expect("MainlinePage", 0, 0, PAGE_W, PAGE_H)
    b.expect("MainlinePage/Bg", 0, 0, PAGE_W, PAGE_H)
    b.expect("MainlinePage/PanelList", 0, 0, PAGE_W, PAGE_H, active=True)
    b.expect("MainlinePage/PanelBattle", 0, 0, PAGE_W, PAGE_H, active=False)
    b.expect("MainlinePage/PanelSettle", 0, 0, PAGE_W, PAGE_H, active=False)
    b.expect("MainlinePage/PanelList/Title", 0, 470, 680, 56, "主线关卡")
    b.expect("MainlinePage/PanelList/Progress", 0, 410, 640, 36, "已通关 0 关 · 当前第 1 关 · Lv1")
    for i in range(copy["window"]):
        suffix = "挑战" if i == 0 else "未开启"
        b.expect(
            "MainlinePage/PanelList/StageRow_%d" % i,
            0, 320 - i * 68, 560, 52,
            "第%d关    %s" % (1 + i, suffix),
        )
    b.expect("MainlinePage/PanelList/Hint", 0, -130, 640, 34, "挑战当前关。战斗中可以跳过，撤退算失败")
    b.expect("MainlinePage/PanelList/BtnPush", 0, -200, 420, 52, copy["push_label"])
    b.expect("MainlinePage/PanelList/PushHint", 0, -258, 640, 32, copy["push_hint"])
    b.expect("MainlinePage/PanelList/BtnBack", 0, -330, 240, 52, "返回主城")

    b.expect("MainlinePage/PanelBattle/Title", 0, 470, 680, 56, "第1关")
    b.expect("MainlinePage/PanelBattle/Round", 0, 410, 640, 38, "准备战斗")
    b.expect("MainlinePage/PanelBattle/EnemyLabel", 0, 355, 680, 34, "敌方")
    b.expect("MainlinePage/PanelBattle/EnemyRow", 0, copy["enemy_y"], 660, copy["card_h"])
    b.expect("MainlinePage/PanelBattle/AllyLabel", 0, 165, 680, 34, "我方")
    b.expect("MainlinePage/PanelBattle/AllyRow", 0, copy["ally_y"], 660, copy["card_h"])
    b.expect("MainlinePage/PanelBattle/LogBg", 0, -80, 660, 110)
    b.expect("MainlinePage/PanelBattle/Log", 0, -80, 620, 96, "第1回合 · 我方突进\n第2回合 · 集火前排")
    b.expect("MainlinePage/PanelBattle/BtnSkip", -140, -230, 200, 52, "跳过")
    b.expect("MainlinePage/PanelBattle/BtnRetreat", 140, -230, 200, 52, "撤退")

    for side, names, hp in (
        ("EnemyRow", copy["enemy_names"], copy["enemy_hp"]),
        ("AllyRow", copy["ally_names"], copy["ally_hp"]),
    ):
        for i, unit_name in enumerate(names):
            base = "MainlinePage/PanelBattle/%s/Unit_%d" % (side, i)
            b.expect(base, copy["unit_x"][i], 0, copy["card_w"], copy["card_h"])
            b.expect(base + "/Name", 0, 28, copy["card_w"] - 12, 34, unit_name)
            b.expect(base + "/Hp", 0, 2, copy["card_w"] - 12, 32, "%d/%d" % (hp, hp))
            b.expect(base + "/Bar", 0, -32, 150, 10)

    b.expect("MainlinePage/PanelSettle/Result", 0, 430, 680, 72, "胜利")
    b.expect("MainlinePage/PanelSettle/Sub", 0, 350, 640, 38, "第1关 · 通关")
    b.expect("MainlinePage/PanelSettle/Rewards", 0, 270, 640, 44, "金币 +0")
    b.expect("MainlinePage/PanelSettle/Meta", 0, 120, 640, 36, "Lv1 · 下一关 2 · 金币 0 · 钻石 0")
    b.expect("MainlinePage/PanelSettle/BtnNext", 0, 10, 420, 64, "下一关")
    b.expect("MainlinePage/PanelSettle/BtnList", 0, -90, 240, 48, "关卡列表")
    b.expect("MainlinePage/PanelSettle/BtnBack", 0, -170, 240, 48, "返回主城")
    check_common(b)


def check_wire(b, copy):
    b.expect("WireMainlinePage", 0, 0, PAGE_W, PAGE_H)
    b.expect("WireMainlinePage/Bg", 0, 0, PAGE_W, PAGE_H)
    b.expect("WireMainlinePage/Title", 0, 220, 680, 56, copy["wire_title"])
    b.expect("WireMainlinePage/Now", 0, 120, 640, 44, copy["now"])
    b.expect("WireMainlinePage/Max", 0, 60, 640, 44, copy["max"])
    b.expect("WireMainlinePage/Note", 0, -20, 640, 38, copy["wire_note"])
    b.expect("WireMainlinePage/BtnBack", 0, -140, 240, 48, "返回")
    names = [b.objs[i]["_name"] for i in b.path_of]
    for banned in ("PanelList", "PanelBattle", "PanelSettle", "Top", "Bottom"):
        if banned in names:
            raise SystemExit("wire page picked up " + banned)
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
        for key in ("_spriteFrame", "_font", "_normalSprite", "_hoverSprite", "_pressedSprite", "_disabledSprite"):
            val = obj.get(key)
            if isinstance(val, dict) and "__uuid__" in val:
                if val["__uuid__"] not in known:
                    raise SystemExit("unknown uuid " + val["__uuid__"])
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


def write_prefab(builder):
    path = os.path.join(OUT_DIR, builder.prefab_name + ".prefab")
    meta_path = path + ".meta"
    os.makedirs(OUT_DIR, exist_ok=True)
    text = json.dumps(builder.objs, ensure_ascii=False, indent=2) + "\n"
    if ".png" in text or "resources/" in text:
        raise SystemExit("prefab embedded a file path")
    with open(path, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)
    prefab_uuid = str(uuid.uuid4())
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
    if copy["wire_title"] != "主线（真服只读）":
        raise SystemExit("wire title drifted: " + copy["wire_title"])
    if copy["wire_note"] != "本轮不发进关协议，不挑战":
        raise SystemExit("wire note drifted: " + copy["wire_note"])
    if copy["push_stage"] != 70:
        raise SystemExit("push stage drifted")
    mainline = build_mainline(copy)
    wire = build_wire(copy)
    write_dir_meta()
    write_prefab(mainline)
    write_prefab(wire)
    print("OK")
    print("PUSH_LABEL", copy["push_label"])
    print("PUSH_HINT", copy["push_hint"])
    print("WINDOW", copy["window"])


if __name__ == "__main__":
    main()
