# -*- coding: utf-8 -*-
"""Generate the Creator 3.8.8 Wish prefab (Mock only, not wired).

Writes:
  client/assets/prefabs/ui/wish/WishPage.prefab
and its .meta file, plus ui/wish.meta if it is missing.

There is no WireWish in the repo. This script does not invent one.

WishPage is the Mock low pool (WishPage.ts / module/wish/pool.ts).
SpriteFrame uuids come from client/assets/resources/**/*.meta (@f9941).
Does not touch Boot, MainApp, page scripts, protocol, or USE_*_PREFAB flags.
No wish atlas: page chrome is common win-bg and button art.

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
OUT_DIR = os.path.join(ROOT, "client", "assets", "prefabs", "ui", "wish")
DIR_META = OUT_DIR + ".meta"
FONT_META = os.path.join(RES, "font", "FZCSJW-GB1-0.ttf.meta")

WISH_TS = os.path.join(ROOT, "client", "assets", "scripts", "ui", "WishPage.ts")
POOL_TS = os.path.join(ROOT, "client", "assets", "scripts", "module", "wish", "pool.ts")
ITEMS_TS = os.path.join(ROOT, "client", "assets", "scripts", "module", "bag", "items.ts")
IDLE_TS = os.path.join(ROOT, "client", "assets", "scripts", "module", "idle", "rewards.ts")
WIRE_TS = os.path.join(ROOT, "client", "assets", "scripts", "ui", "WireWishPage.ts")

SPRITE_FILES = {
    "win_bg": "ui/common/win-bg_win-bg-12.png",
    "btn_blue": "ui/common/button_btn-blue-big-1.png",
    "btn_blue_p": "ui/common/button_btn-blue-big-2.png",
}

LAYER_UI = 33554432
PAGE_W = 720
PAGE_H = 1280
# Sample before any draw: cursor 0, nothing spent, empty wallet.
# Not the constructor placeholders ("读取中…" / "" / short button labels).
SAMPLE_USED = 0
SAMPLE_GOLD = 0
SAMPLE_DIAMOND = 0
SAMPLE_TOKENS = 0
SAMPLE_CURSOR = 0


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


def function_return_string(path, name):
    """First double-quoted return of a no-arg function. wishPoolLine is one of these."""
    text = read_text(path)
    match = re.search(
        r'export function %s\(\)(?::\s*string)?\s*\{\s*return "([^"]*)";' % re.escape(name),
        text,
    )
    if not match:
        raise SystemExit("missing return string %s in %s" % (name, path))
    return match.group(1)


def finite(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return 0
    if value != value or value == float("inf") or value == float("-inf"):
        return 0
    return int(value)


def chances_left(used, limit):
    """Same rule as chancesLeft."""
    left = finite(limit) - finite(used)
    if left < 0:
        return 0
    return left


def wish_attempts_line(used, limit):
    """Same concatenation as wishAttemptsLine."""
    return "今日剩余 %d/%d" % (chances_left(used, limit), finite(limit))


def wish_wallet_line(gold, diamond, tokens, token_name):
    """Same concatenation as wishWalletLine. The item name is WISH_TOKEN_NAME."""
    return "持有金币 %d · 钻石 %d · %s ×%d" % (
        finite(gold),
        finite(diamond),
        token_name,
        finite(tokens),
    )


def wish_drop_text(kind, name, count):
    """Same concatenation as wishDropText."""
    if kind == "gold" or kind == "diamond":
        return "%s %d" % (name, finite(count))
    return "%s ×%d" % (name, finite(count))


def wish_next_line(kind, name, count):
    """wishNextLine for a known drop. Cursor 0 is the first pool row."""
    return "下一次：" + wish_drop_text(kind, name, count)


def wish_pay_button(pay, used, limit, token_name, gold_cost, diamond_cost, item_cost):
    """Same words as wishPayButton."""
    if chances_left(used, limit) <= 0:
        return "今日已用完"
    if pay == "item":
        return "%s许愿（×%d）" % (token_name, finite(item_cost))
    if pay == "diamond":
        return "钻石许愿（%d）" % finite(diamond_cost)
    return "金币许愿（%d）" % finite(gold_cost)


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
    """Pull the strings and coordinates the prefab is standing in for."""
    if os.path.exists(WIRE_TS):
        raise SystemExit("WireWishPage.ts appeared; this generator still only writes Mock")

    require_snippet(WISH_TS, "const PAGE_BG = new Color(18, 16, 36, 255);")
    require_snippet(WISH_TS, "const TITLE = new Color(220, 196, 255, 255);")
    require_snippet(WISH_TS, "const MUTED = new Color(196, 186, 220, 255);")
    require_snippet(WISH_TS, "const STAT = new Color(255, 228, 170, 255);")
    require_snippet(WISH_TS, "const GOLD_FILL = new Color(168, 112, 36, 255);")
    require_snippet(WISH_TS, "const ITEM_FILL = new Color(96, 72, 168, 255);")
    require_snippet(WISH_TS, "const DIAMOND_FILL = new Color(46, 110, 190, 255);")
    require_snippet(WISH_TS, "const BACK_FILL = new Color(36, 72, 120, 255);")
    require_snippet(WISH_TS, 'this.node = uiNode("WishPage");')
    require_snippet(WISH_TS, 'place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);')
    require_snippet(
        WISH_TS,
        'place(createLabel("许愿池 · 低级", 40, { color: TITLE }), this.body, 0, 460);',
    )
    require_snippet(
        WISH_TS,
        'place(createLabel("主线 Lv10 开启。每天 5 次，三种方式任选", 18, { color: MUTED, width: 640 }), this.body, 0, 408);',
    )
    require_snippet(
        WISH_TS,
        'this.attemptsLabel = place(createLabel("读取中…", 26, { color: STAT, width: 640 }), this.body, 0, 352);',
    )
    require_snippet(
        WISH_TS,
        'this.walletLabel = place(createLabel("", 22, { color: MUTED, width: 640 }), this.body, 0, 304);',
    )
    require_snippet(
        WISH_TS,
        'this.nextLabel = place(createLabel("", 22, { color: STAT, width: 640 }), this.body, 0, 256);',
    )
    require_snippet(
        WISH_TS,
        "place(createLabel(wishPoolLine(), 18, { color: MUTED, width: 640 }), this.body, 0, 208);",
    )
    require_snippet(
        WISH_TS,
        'createButton("金币许愿", () => void this.draw("gold"), 560, 56, GOLD_FILL, 22),',
    )
    require_snippet(WISH_TS, "0,\n      120")
    require_snippet(
        WISH_TS,
        'createButton("许愿符许愿", () => void this.draw("item"), 560, 56, ITEM_FILL, 22),',
    )
    require_snippet(WISH_TS, "0,\n      48")
    require_snippet(
        WISH_TS,
        'createButton("钻石许愿", () => void this.draw("diamond"), 560, 56, DIAMOND_FILL, 22),',
    )
    require_snippet(WISH_TS, "0,\n      -24")
    require_snippet(
        WISH_TS,
        "createLabel(this.lastReport, 18, { color: MUTED, width: 640, height: 72 }),",
    )
    require_snippet(WISH_TS, "0,\n      -120")
    require_snippet(
        WISH_TS,
        'place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -210);',
    )
    require_snippet(
        WISH_TS,
        'private lastReport = "选一种方式许愿一次。次数用完、货币或许愿符不够都会提示";',
    )
    require_snippet(WISH_TS, 'return button.getChildByName("Label");')

    require_snippet(POOL_TS, 'import { ITEM_EXP_POTION, ITEM_WISH_TOKEN, WISH_TOKEN_NAME } from "../bag/items";')
    require_snippet(POOL_TS, 'return "今日剩余 " + chancesLeft(used, limit) + "/" + finite(limit);')
    require_snippet(
        POOL_TS,
        'return "持有金币 " + finite(gold) + " · 钻石 " + finite(diamond) + " · " + WISH_TOKEN_NAME + " ×" + finite(tokens);',
    )
    require_snippet(POOL_TS, 'return "下一次：" + wishDropText(dropAt(cursor));')
    require_snippet(POOL_TS, 'if (drop.kind === "gold" || drop.kind === "diamond") return drop.name + " " + finite(drop.count);')
    require_snippet(POOL_TS, 'if (chancesLeft(used, limit) <= 0) return "今日已用完";')
    require_snippet(POOL_TS, 'if (pay === "item") return WISH_TOKEN_NAME + "许愿（×" + WISH_ITEM_COST + "）";')
    require_snippet(POOL_TS, 'if (pay === "diamond") return "钻石许愿（" + WISH_DIAMOND_COST + "）";')
    require_snippet(POOL_TS, 'return "金币许愿（" + WISH_GOLD_COST + "）";')
    require_snippet(POOL_TS, '{ kind: "gold", name: "金币", count: 40, itemId: 0 },')
    require_snippet(ITEMS_TS, 'export const WISH_TOKEN_NAME = "许愿符";')

    limit = ts_int(POOL_TS, "WISH_DAILY_LIMIT")
    gold_cost = ts_int(POOL_TS, "WISH_GOLD_COST")
    diamond_cost = ts_int(POOL_TS, "WISH_DIAMOND_COST")
    item_cost = ts_int(POOL_TS, "WISH_ITEM_COST")
    token_name = ts_string(ITEMS_TS, "WISH_TOKEN_NAME")
    stone_name = ts_string(IDLE_TS, "IDLE_ITEM_NAME")
    pool_line = function_return_string(POOL_TS, "wishPoolLine")
    if not token_name:
        raise SystemExit("WISH_TOKEN_NAME is empty")
    if limit != 5 or gold_cost != 30 or diamond_cost != 5 or item_cost != 1:
        raise SystemExit(
            "wish costs drifted: limit %s gold %s diamond %s item %s"
            % (limit, gold_cost, diamond_cost, item_cost)
        )
    if token_name != "许愿符":
        raise SystemExit("WISH_TOKEN_NAME drifted: " + token_name)
    if stone_name not in pool_line:
        raise SystemExit("wishPoolLine no longer names the stone: " + pool_line)

    # WISH_DROPS[0] is the cursor-0 prize. Require it to stay the first row.
    drops_head = re.search(
        r"export const WISH_DROPS[\s\S]*?\[\s*\{\s*kind:\s*\"gold\",\s*name:\s*\"金币\",\s*count:\s*40",
        read_text(POOL_TS),
    )
    if not drops_head:
        raise SystemExit("first wish drop is no longer 金币 40")

    attempts = wish_attempts_line(SAMPLE_USED, limit)
    wallet = wish_wallet_line(SAMPLE_GOLD, SAMPLE_DIAMOND, SAMPLE_TOKENS, token_name)
    nxt = wish_next_line("gold", "金币", 40)
    gold_btn = wish_pay_button("gold", SAMPLE_USED, limit, token_name, gold_cost, diamond_cost, item_cost)
    item_btn = wish_pay_button("item", SAMPLE_USED, limit, token_name, gold_cost, diamond_cost, item_cost)
    diamond_btn = wish_pay_button(
        "diamond", SAMPLE_USED, limit, token_name, gold_cost, diamond_cost, item_cost
    )
    if attempts != "今日剩余 5/5":
        raise SystemExit("attempts line drifted: " + attempts)
    if wallet != "持有金币 0 · 钻石 0 · %s ×0" % token_name:
        raise SystemExit("wallet line drifted: " + wallet)
    if nxt != "下一次：金币 40":
        raise SystemExit("next line drifted: " + nxt)
    if gold_btn != "金币许愿（30）":
        raise SystemExit("gold button drifted: " + gold_btn)
    if item_btn != "%s许愿（×1）" % token_name:
        raise SystemExit("item button drifted: " + item_btn)
    if diamond_btn != "钻石许愿（5）":
        raise SystemExit("diamond button drifted: " + diamond_btn)
    if pool_line != "奖池固定循环 10 次：金币、%s、经验药水，第 10 次是钻石" % stone_name:
        raise SystemExit("pool line drifted: " + pool_line)

    return {
        "title": "许愿池 · 低级",
        "subtitle": "主线 Lv10 开启。每天 5 次，三种方式任选",
        "attempts": attempts,
        "wallet": wallet,
        "next": nxt,
        "pool": pool_line,
        "gold": gold_btn,
        "item": item_btn,
        "diamond": diamond_btn,
        "result": "选一种方式许愿一次。次数用完、货币或许愿符不够都会提示",
        "back": "返回",
        "token_name": token_name,
        "stone_name": stone_name,
    }


SF = {key: load_sprite_frame(rel) for key, rel in SPRITE_FILES.items()}
FONT = load_font_uuid()

WHITE = color(255, 255, 255, 255)
TITLE = color(220, 196, 255, 255)
MUTED = color(196, 186, 220, 255)
STAT = color(255, 228, 170, 255)
PAGE_BG = color(18, 16, 36, 255)
GOLD_FILL = color(168, 112, 36, 255)
ITEM_FILL = color(96, 72, 168, 255)
DIAMOND_FILL = color(46, 110, 190, 255)
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


def build_wish(copy):
    b = Builder("WishPage")
    root = b.make_node("WishPage", None, 0, 0, PAGE_W, PAGE_H)
    if root != 1:
        raise SystemExit("root id drifted")

    # Code paints a Graphics rect on the page root. The prefab tints common
    # win-bg and keeps Bg beside the copy, same as Shop / Summon. No body node.
    b.make_sprite_node("Bg", root, 0, 0, PAGE_W, PAGE_H, SF["win_bg"], col=PAGE_BG)
    # Title width is createLabel's default (680). Height 40+16 matches the spec.
    b.make_label_node("Title", root, 0, 460, 680, 56, copy["title"], 40, TITLE, outline=True)
    # Remaining copy boxes are the manager table, not fontSize+16.
    b.make_label_node("Subtitle", root, 0, 408, 640, 32, copy["subtitle"], 18, MUTED)
    b.make_label_node("Attempts", root, 0, 352, 640, 36, copy["attempts"], 26, STAT)
    b.make_label_node("Wallet", root, 0, 304, 640, 32, copy["wallet"], 22, MUTED)
    b.make_label_node("Next", root, 0, 256, 640, 32, copy["next"], 22, STAT)
    b.make_label_node("Pool", root, 0, 208, 640, 36, copy["pool"], 18, MUTED)
    # One blue sheet. Gold / item / diamond / back are the four fills from WishPage.ts.
    # There is no purple button art; ITEM_FILL supplies that color.
    b.make_button(
        "BtnGold", root, 0, 120, 560, 56, copy["gold"], 22,
        SF["btn_blue"], SF["btn_blue_p"], col=GOLD_FILL,
    )
    b.make_button(
        "BtnItem", root, 0, 48, 560, 56, copy["item"], 22,
        SF["btn_blue"], SF["btn_blue_p"], col=ITEM_FILL,
    )
    b.make_button(
        "BtnDiamond", root, 0, -24, 560, 56, copy["diamond"], 22,
        SF["btn_blue"], SF["btn_blue_p"], col=DIAMOND_FILL,
    )
    # lastReport passes height 72, so createLabel tops the text and it can wrap.
    b.make_label_node(
        "Result", root, 0, -120, 640, 72, copy["result"], 18, MUTED,
        v_align=0, wrap=True,
    )
    # Back uses createButton's default font size (24). Pay buttons pass 22.
    b.make_button(
        "BtnBack", root, 0, -210, 240, 48, copy["back"], 24,
        SF["btn_blue"], SF["btn_blue_p"], col=BACK_FILL,
    )
    check_wish(b, copy)
    return b


def check_wish(b, copy):
    b.expect("WishPage", 0, 0, PAGE_W, PAGE_H)
    b.expect("WishPage/Bg", 0, 0, PAGE_W, PAGE_H)
    b.expect_tint("WishPage/Bg", PAGE_BG)
    b.expect_sprite("WishPage/Bg", SF["win_bg"])
    b.expect("WishPage/Title", 0, 460, 680, 56, copy["title"])
    b.expect_font("WishPage/Title", 40)
    b.expect_label_color("WishPage/Title", TITLE)
    b.expect("WishPage/Subtitle", 0, 408, 640, 32, copy["subtitle"])
    b.expect_font("WishPage/Subtitle", 18)
    b.expect_label_color("WishPage/Subtitle", MUTED)
    b.expect("WishPage/Attempts", 0, 352, 640, 36, copy["attempts"])
    b.expect_font("WishPage/Attempts", 26)
    b.expect_label_color("WishPage/Attempts", STAT)
    b.expect("WishPage/Wallet", 0, 304, 640, 32, copy["wallet"])
    b.expect_font("WishPage/Wallet", 22)
    b.expect_label_color("WishPage/Wallet", MUTED)
    b.expect("WishPage/Next", 0, 256, 640, 32, copy["next"])
    b.expect_font("WishPage/Next", 22)
    b.expect_label_color("WishPage/Next", STAT)
    b.expect("WishPage/Pool", 0, 208, 640, 36, copy["pool"])
    b.expect_font("WishPage/Pool", 18)
    b.expect_label_color("WishPage/Pool", MUTED)
    b.expect("WishPage/BtnGold", 0, 120, 560, 56, copy["gold"])
    b.expect_font("WishPage/BtnGold", 22)
    b.expect_sprite("WishPage/BtnGold", SF["btn_blue"])
    b.expect_tint("WishPage/BtnGold", GOLD_FILL)
    b.expect_label_color("WishPage/BtnGold", WHITE)
    b.expect("WishPage/BtnItem", 0, 48, 560, 56, copy["item"])
    b.expect_font("WishPage/BtnItem", 22)
    b.expect_sprite("WishPage/BtnItem", SF["btn_blue"])
    b.expect_tint("WishPage/BtnItem", ITEM_FILL)
    b.expect("WishPage/BtnDiamond", 0, -24, 560, 56, copy["diamond"])
    b.expect_font("WishPage/BtnDiamond", 22)
    b.expect_sprite("WishPage/BtnDiamond", SF["btn_blue"])
    b.expect_tint("WishPage/BtnDiamond", DIAMOND_FILL)
    b.expect("WishPage/Result", 0, -120, 640, 72, copy["result"])
    b.expect_font("WishPage/Result", 18)
    b.expect_label_color("WishPage/Result", MUTED)
    b.expect_align("WishPage/Result", 1, 0)
    b.expect_wrap("WishPage/Result", True)
    b.expect("WishPage/BtnBack", 0, -210, 240, 48, copy["back"])
    b.expect_font("WishPage/BtnBack", 24)
    b.expect_sprite("WishPage/BtnBack", SF["btn_blue"])
    b.expect_tint("WishPage/BtnBack", BACK_FILL)
    b.expect_label_color("WishPage/BtnBack", WHITE)
    for path in ("WishPage/BtnGold", "WishPage/BtnItem", "WishPage/BtnDiamond", "WishPage/BtnBack"):
        b.expect_grayscale(path, False)
        button = b.button_of(path)
        if button["clickEvents"] != []:
            raise SystemExit(path + " clickEvents must stay empty")
        if button["_transition"] != 3:
            raise SystemExit(path + " transition is not scale")
        if button["_pressedSprite"]["__uuid__"] != SF["btn_blue_p"]:
            raise SystemExit(path + " pressed sprite drifted")
        if b.child_names(path) != ["Label"]:
            raise SystemExit(path + " label is not the only child")
    names = b.child_names("WishPage")
    expected = [
        "Bg", "Title", "Subtitle", "Attempts", "Wallet", "Next", "Pool",
        "BtnGold", "BtnItem", "BtnDiamond", "Result", "BtnBack",
    ]
    if names != expected:
        raise SystemExit("wish children %s" % names)
    for banned in ("body", "Wire", "WireWish", "Top", "Bottom", "ListHost", "RowsHost", "PanelList"):
        if banned in names:
            raise SystemExit("wish page picked up " + banned)
    if copy["token_name"] not in copy["wallet"] or copy["token_name"] not in copy["item"]:
        raise SystemExit("token name missing from wallet or item button")
    if copy["stone_name"] not in copy["pool"]:
        raise SystemExit("stone name missing from pool line")
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
    if "WireWish" in text or "WireWishPage" in text:
        raise SystemExit("prefab invented a wire page")
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
    wire_prefab = os.path.join(OUT_DIR, "WireWishPage.prefab")
    if os.path.exists(wire_prefab):
        raise SystemExit("wire prefab must not be written: " + wire_prefab)


def main():
    copy = load_copy()
    page = build_wish(copy)
    write_dir_meta()
    write_prefab(page)
    reject_png()
    print("OK")
    print("ATTEMPTS", copy["attempts"])
    print("WALLET", copy["wallet"])
    print("NEXT", copy["next"])
    print("POOL", copy["pool"])
    print("GOLD", copy["gold"])
    print("ITEM", copy["item"])
    print("DIAMOND", copy["diamond"])
    print("TOKEN", copy["token_name"])


if __name__ == "__main__":
    main()
