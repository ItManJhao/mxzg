# -*- coding: utf-8 -*-
"""Generate the Creator 3.8.8 Shop prefab (Mock only, not wired).

Writes:
  client/assets/prefabs/ui/shop/ShopPage.prefab
and its .meta file, plus ui/shop.meta if it is missing.

There is no WireShopPage in the repo. This script does not invent one.

ShopPage is the Mock page (ShopPage.ts / module/shop/catalog.ts).
SpriteFrame uuids come from client/assets/resources/**/*.meta (@f9941).
Does not touch Boot, MainApp, page scripts, or USE_*_PREFAB flags.
No shop atlas: page chrome is common win-bg and button art.

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
OUT_DIR = os.path.join(ROOT, "client", "assets", "prefabs", "ui", "shop")
DIR_META = OUT_DIR + ".meta"
FONT_META = os.path.join(RES, "font", "FZCSJW-GB1-0.ttf.meta")

SHOP_TS = os.path.join(ROOT, "client", "assets", "scripts", "ui", "ShopPage.ts")
CATALOG_TS = os.path.join(ROOT, "client", "assets", "scripts", "module", "shop", "catalog.ts")
IDLE_TS = os.path.join(ROOT, "client", "assets", "scripts", "module", "idle", "rewards.ts")
SESSION_TS = os.path.join(ROOT, "client", "assets", "scripts", "net", "MockGameSession.ts")

SPRITE_FILES = {
    "win_bg": "ui/common/win-bg_win-bg-12.png",
    "btn_blue": "ui/common/button_btn-blue-big-1.png",
    "btn_blue_p": "ui/common/button_btn-blue-big-2.png",
    "btn_orange": "ui/common/button_btn-orange-big-1.png",
    "btn_orange_p": "ui/common/button_btn-orange-big-2.png",
}

LAYER_UI = 33554432
PAGE_W = 720
PAGE_H = 1280
# render(): top = 210, step = 120, buy button at y - 48.
TOP = 210
STEP = 120
BUTTON_DY = 48
# Clean shelf preview: day 1, nothing bought, bag counts left at 0.
# Wallet numbers are read from MOCK_STARTER_GOLD / MOCK_STARTER_DIAMOND.
OPEN_DAY = 1
BOUGHT = 0
OWNED = 0

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


def finite(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return 0
    if value != value or value == float("inf") or value == float("-inf"):
        return 0
    return int(value)


def pay_name(currency):
    """Same word as payName in catalog.ts."""
    if currency == "diamond":
        return "钻石"
    return "金币"


def shop_stock_text(bought, limit):
    """Same concatenation as shopStockText."""
    return "今日 %d/%d" % (finite(bought), finite(limit))


def shop_refresh_line(open_day):
    """Same concatenation as shopRefreshLine."""
    return "限购随开服天刷新 · 当前开服第 %d 天" % finite(open_day)


def shop_wallet_line(gold, diamond):
    """Same concatenation as shopWalletLine."""
    return "持有金币 %d · 钻石 %d" % (finite(gold), finite(diamond))


def shop_sku_line(name, count, currency, price, bought, limit, owned):
    """Same concatenation as shopSkuLine."""
    bundle = (name or "商品") + " ×%d" % finite(count)
    stock = shop_stock_text(bought, limit)
    return "%s · %s %d · %s · 背包 ×%d" % (
        bundle,
        pay_name(currency),
        finite(price),
        stock,
        finite(owned),
    )


def shop_sold_out(bought, limit):
    """Same rule as shopSoldOut."""
    return finite(limit) > 0 and finite(bought) >= finite(limit)


def shop_buy_button(bought, limit):
    """Same words as shopBuyButton."""
    if shop_sold_out(bought, limit):
        return "已售罄"
    return "购买"


def load_copy():
    """Pull the strings and coordinates the prefab is standing in for."""
    require_snippet(SHOP_TS, "const PAGE_BG = new Color(22, 16, 10, 255);")
    require_snippet(SHOP_TS, "const TITLE = new Color(255, 214, 140, 255);")
    require_snippet(SHOP_TS, "const MUTED = new Color(214, 196, 168, 255);")
    require_snippet(SHOP_TS, "const STAT = new Color(255, 228, 170, 255);")
    require_snippet(SHOP_TS, "const BUY_FILL = new Color(168, 112, 36, 255);")
    require_snippet(SHOP_TS, "const SOLD_FILL = new Color(78, 84, 98, 255);")
    require_snippet(SHOP_TS, "const BACK_FILL = new Color(36, 72, 120, 255);")
    require_snippet(SHOP_TS, 'place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);')
    require_snippet(SHOP_TS, 'place(createLabel("基础商店", 40, { color: TITLE }), this.body, 0, 460);')
    require_snippet(
        SHOP_TS,
        'createLabel("新号可买。召唤仍直接花钻石", 18, { color: MUTED, width: 640 }),\n'
        "      this.body,\n"
        "      0,\n"
        "      408",
    )
    require_snippet(
        SHOP_TS,
        'place(createLabel("读取中…", 22, { color: STAT, width: 640 }), this.body, 0, 352);',
    )
    require_snippet(
        SHOP_TS,
        'this.walletLabel = place(createLabel("", 22, { color: MUTED, width: 640 }), this.body, 0, 308);',
    )
    require_snippet(SHOP_TS, 'this.rowsHost = place(uiNode("rows-host"), this.body, 0, 0);')
    require_snippet(
        SHOP_TS,
        'createLabel(this.lastReport, 18, { color: MUTED, width: 640, height: 56 }),\n'
        "      this.body,\n"
        "      0,\n"
        "      -250",
    )
    require_snippet(
        SHOP_TS,
        'place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -330);',
    )
    require_snippet(SHOP_TS, 'private lastReport = "点购买。金币或钻石不够、今日卖完都会提示";')
    require_snippet(SHOP_TS, 'const rows = uiNode("rows");')
    require_snippet(SHOP_TS, "rows.parent = this.rowsHost;")
    require_snippet(
        SHOP_TS,
        'place(createLabel("商店暂时没有商品", 22, { color: MUTED, width: 640 }), rows, 0, 180);',
    )
    require_snippet(SHOP_TS, "const top = 210;")
    require_snippet(SHOP_TS, "const step = 120;")
    require_snippet(SHOP_TS, "const y = top - i * step;")
    require_snippet(
        SHOP_TS,
        "place(createLabel(shopSkuLine(sku), 20, { color: STAT, width: 640 }), rows, 0, y);",
    )
    require_snippet(
        SHOP_TS,
        "createButton(shopBuyButton(sku), () => void this.buy(sku.id), 280, 48, "
        "shopSoldOut(sku) ? SOLD_FILL : BUY_FILL, 22),\n"
        "        rows,\n"
        "        0,\n"
        "        y - 48",
    )

    require_snippet(CATALOG_TS, "name: IDLE_ITEM_NAME,")
    require_snippet(CATALOG_TS, 'name: "小金币袋",')
    require_snippet(CATALOG_TS, 'name: "经验药水",')
    require_snippet(CATALOG_TS, "count: SHOP_STONE_COUNT,")
    require_snippet(CATALOG_TS, 'currency: "gold",\n    price: SHOP_STONE_PRICE,')
    require_snippet(CATALOG_TS, 'currency: "diamond",\n    price: SHOP_BAG_PRICE,')
    require_snippet(CATALOG_TS, 'currency: "gold",\n    price: SHOP_POTION_PRICE,')
    require_snippet(
        CATALOG_TS,
        'return "限购随开服天刷新 · 当前开服第 " + finite(openDay) + " 天";',
    )
    require_snippet(
        CATALOG_TS,
        'return "持有金币 " + finite(gold) + " · 钻石 " + finite(diamond);',
    )
    require_snippet(
        CATALOG_TS,
        'return bundle + " · " + payName(sku.currency) + " " + finite(sku.price) + " · " + stock + " · 背包 ×" + finite(sku.owned);',
    )
    require_snippet(CATALOG_TS, 'if (shopSoldOut(sku)) return "已售罄";')
    require_snippet(CATALOG_TS, 'return "购买";')
    require_snippet(CATALOG_TS, 'return "今日 " + finite(sku.bought) + "/" + finite(sku.limit);')
    require_snippet(CATALOG_TS, 'if (currency === "diamond") return "钻石";')
    require_snippet(CATALOG_TS, 'return "金币";')

    stone_name = ts_string(IDLE_TS, "IDLE_ITEM_NAME")
    if stone_name != "强化石":
        raise SystemExit("IDLE_ITEM_NAME drifted: " + stone_name)
    gold = ts_int(SESSION_TS, "MOCK_STARTER_GOLD")
    diamond = ts_int(SESSION_TS, "MOCK_STARTER_DIAMOND")
    if gold != 100 or diamond != 20:
        raise SystemExit(
            "starter wallet drifted to %d/%d; shopWalletLine must be rebaked and the Shop section updated"
            % (gold, diamond)
        )

    stone_count = ts_int(CATALOG_TS, "SHOP_STONE_COUNT")
    stone_price = ts_int(CATALOG_TS, "SHOP_STONE_PRICE")
    stone_limit = ts_int(CATALOG_TS, "SHOP_STONE_LIMIT")
    bag_price = ts_int(CATALOG_TS, "SHOP_BAG_PRICE")
    bag_limit = ts_int(CATALOG_TS, "SHOP_BAG_LIMIT")
    potion_price = ts_int(CATALOG_TS, "SHOP_POTION_PRICE")
    potion_limit = ts_int(CATALOG_TS, "SHOP_POTION_LIMIT")

    offers = (
        {
            "name": stone_name,
            "count": stone_count,
            "currency": "gold",
            "price": stone_price,
            "limit": stone_limit,
        },
        {
            "name": "小金币袋",
            "count": 1,
            "currency": "diamond",
            "price": bag_price,
            "limit": bag_limit,
        },
        {
            "name": "经验药水",
            "count": 1,
            "currency": "gold",
            "price": potion_price,
            "limit": potion_limit,
        },
    )
    rows = []
    for offer in offers:
        line = shop_sku_line(
            offer["name"],
            offer["count"],
            offer["currency"],
            offer["price"],
            BOUGHT,
            offer["limit"],
            OWNED,
        )
        button = shop_buy_button(BOUGHT, offer["limit"])
        rows.append({"line": line, "button": button, "offer": offer})

    expected = (
        "强化石 ×5 · 金币 40 · 今日 0/3 · 背包 ×0",
        "小金币袋 ×1 · 钻石 8 · 今日 0/2 · 背包 ×0",
        "经验药水 ×1 · 金币 50 · 今日 0/2 · 背包 ×0",
    )
    if tuple(row["line"] for row in rows) != expected:
        raise SystemExit("sku lines drifted: %s" % [row["line"] for row in rows])
    if any(row["button"] != "购买" for row in rows):
        raise SystemExit("buy buttons drifted")
    if shop_buy_button(3, 3) != "已售罄":
        raise SystemExit("sold-out label drifted")

    refresh = shop_refresh_line(OPEN_DAY)
    wallet = shop_wallet_line(gold, diamond)
    if refresh != "限购随开服天刷新 · 当前开服第 1 天":
        raise SystemExit("refresh line drifted: " + refresh)
    if wallet != "持有金币 100 · 钻石 20":
        raise SystemExit("wallet line drifted: " + wallet)

    return {
        "refresh": refresh,
        "wallet": wallet,
        "rows": rows,
        "gold": gold,
        "diamond": diamond,
        "result": "点购买。金币或钻石不够、今日卖完都会提示",
    }


SF = {key: load_sprite_frame(rel) for key, rel in SPRITE_FILES.items()}
FONT = load_font_uuid()

WHITE = color(255, 255, 255, 255)
TITLE_COLOR = color(255, 214, 140, 255)
MUTED = color(214, 196, 168, 255)
STAT = color(255, 228, 170, 255)
PAGE_BG = color(22, 16, 10, 255)


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


def build_shop(copy):
    b = Builder("ShopPage")
    root = b.make_node("ShopPage", None, 0, 0, PAGE_W, PAGE_H)
    if root != 1:
        raise SystemExit("root id drifted")

    # Warm-brown page fill. The code paints a rect on the page root;
    # the prefab tints common win-bg. Content sits beside Bg, not under body.
    b.make_sprite_node("Bg", root, 0, 0, PAGE_W, PAGE_H, SF["win_bg"], col=PAGE_BG)
    title_w, title_h = label_box(40, 680)
    b.make_label_node("Title", root, 0, 460, title_w, title_h, "基础商店", 40, TITLE_COLOR, outline=True)
    hint_w, hint_h = label_box(18, 640)
    b.make_label_node(
        "Hint", root, 0, 408, hint_w, hint_h, "新号可买。召唤仍直接花钻石", 18, MUTED,
    )
    refresh_w, refresh_h = label_box(22, 640)
    b.make_label_node("Refresh", root, 0, 352, refresh_w, refresh_h, copy["refresh"], 22, STAT)
    wallet_w, wallet_h = label_box(22, 640)
    b.make_label_node("Wallet", root, 0, 308, wallet_w, wallet_h, copy["wallet"], 22, MUTED)

    # Hosts sit at the page origin so Line / BtnBuy y matches place() in render().
    # Runtime render() destroys and rebuilds rows; these three rows are a preview.
    rows_host = b.make_node("RowsHost", root, 0, 0, PAGE_W, PAGE_H)
    rows = b.make_node("Rows", rows_host, 0, 0, PAGE_W, PAGE_H)
    line_w, line_h = label_box(20, 640)
    for i, row in enumerate(copy["rows"]):
        y = TOP - i * STEP
        row_node = b.make_node("Row_%d" % i, rows, 0, 0, PAGE_W, PAGE_H)
        b.make_label_node("Line", row_node, 0, y, line_w, line_h, row["line"], 20, STAT)
        b.make_button(
            "BtnBuy", row_node, 0, y - BUTTON_DY, 280, 48, row["button"], 22,
            SF["btn_orange"], SF["btn_orange_p"],
        )

    # lastReport is given an explicit height, so createLabel tops the text.
    b.make_label_node(
        "Result", root, 0, -250, 640, 56, copy["result"], 18, MUTED,
        v_align=0, wrap=True,
    )
    # Back uses createButton's default font size (24). Buy passes 22.
    b.make_button(
        "BtnBack", root, 0, -330, 240, 48, "返回", 24,
        SF["btn_blue"], SF["btn_blue_p"],
    )
    check_shop(b, copy)
    return b


def check_shop(b, copy):
    b.expect("ShopPage", 0, 0, PAGE_W, PAGE_H)
    b.expect("ShopPage/Bg", 0, 0, PAGE_W, PAGE_H)
    b.expect_tint("ShopPage/Bg", PAGE_BG)
    b.expect_sprite("ShopPage/Bg", SF["win_bg"])
    b.expect("ShopPage/Title", 0, 460, 680, 56, "基础商店")
    b.expect_font("ShopPage/Title", 40)
    b.expect("ShopPage/Hint", 0, 408, 640, 34, "新号可买。召唤仍直接花钻石")
    b.expect_font("ShopPage/Hint", 18)
    b.expect("ShopPage/Refresh", 0, 352, 640, 38, copy["refresh"])
    b.expect_font("ShopPage/Refresh", 22)
    b.expect("ShopPage/Wallet", 0, 308, 640, 38, copy["wallet"])
    b.expect_font("ShopPage/Wallet", 22)
    b.expect("ShopPage/RowsHost", 0, 0, PAGE_W, PAGE_H)
    b.expect("ShopPage/RowsHost/Rows", 0, 0, PAGE_W, PAGE_H)
    for i, row in enumerate(copy["rows"]):
        y = TOP - i * STEP
        base = "ShopPage/RowsHost/Rows/Row_%d" % i
        b.expect(base, 0, 0, PAGE_W, PAGE_H)
        b.expect(base + "/Line", 0, y, 640, 36, row["line"])
        b.expect_font(base + "/Line", 20)
        b.expect(base + "/BtnBuy", 0, y - BUTTON_DY, 280, 48, row["button"])
        b.expect_font(base + "/BtnBuy", 22)
        b.expect_sprite(base + "/BtnBuy", SF["btn_orange"])
        b.expect_tint(base + "/BtnBuy", WHITE)
        button = b.button_of(base + "/BtnBuy")
        if button["_pressedSprite"]["__uuid__"] != SF["btn_orange_p"]:
            raise SystemExit("buy pressed sprite drifted")
    b.expect("ShopPage/Result", 0, -250, 640, 56, copy["result"])
    b.expect_font("ShopPage/Result", 18)
    b.expect_align("ShopPage/Result", 1, 0)
    b.expect("ShopPage/BtnBack", 0, -330, 240, 48, "返回")
    b.expect_font("ShopPage/BtnBack", 24)
    b.expect_sprite("ShopPage/BtnBack", SF["btn_blue"])
    b.expect_tint("ShopPage/BtnBack", WHITE)
    back = b.button_of("ShopPage/BtnBack")
    if back["_pressedSprite"]["__uuid__"] != SF["btn_blue_p"]:
        raise SystemExit("back pressed sprite drifted")
    names = [b.objs[i]["_name"] for i in b.path_of]
    for banned in ("body", "WireShopPage", "ListHost", "Empty", "Unsynced", "Top", "Bottom", "Detail"):
        if banned in names:
            raise SystemExit("shop page picked up " + banned)
    if names.count("Row_0") != 1 or names.count("Row_1") != 1 or names.count("Row_2") != 1:
        raise SystemExit("expected exactly three sku rows")
    if "Row_3" in names:
        raise SystemExit("sold-out preview row was not requested")
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
    if "WireShop" in text:
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


def main():
    copy = load_copy()
    shop = build_shop(copy)
    write_dir_meta()
    write_prefab(shop)
    print("OK")
    print("REFRESH", copy["refresh"])
    print("WALLET", copy["wallet"], "gold", copy["gold"], "diamond", copy["diamond"])
    print("ROWS", " | ".join(row["line"] for row in copy["rows"]))


if __name__ == "__main__":
    main()
